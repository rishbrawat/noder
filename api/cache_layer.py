# api/cache_layer.py
# High-Efficiency Multi-Tier Caching Architecture for Noder Blueprint Generation
# Supports Redis, In-Memory LRU, and Persistent Disk Storage.
# Eliminates token burn on repeated and semantically identical queries across server restarts.

import os
import json
import time
import hashlib
import re
import threading
from collections import OrderedDict
from typing import Optional, Dict, Any, Tuple

# Try importing redis
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    REDIS_AVAILABLE = False

REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", 60 * 60 * 24 * 7)) # 7 days
MAX_IN_MEMORY_ENTRIES = 500
DISK_CACHE_DIR = os.path.join(os.path.dirname(__file__), ".cache")
DISK_CACHE_FILE = os.path.join(DISK_CACHE_DIR, "blueprint_cache.json")

def normalize_text(text: str) -> str:
    cleaned = re.sub(r'[^a-z0-9\s]', ' ', text.lower())
    return " ".join(cleaned.split())

def hash_request(query: str, target_class: str, is_patch: bool, ir_summary: str = "") -> str:
    norm_q = normalize_text(query)
    raw = f"{norm_q}:{target_class.lower()}:{is_patch}:{ir_summary}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

class HybridBlueprintCache:
    def __init__(self):
        self.lock = threading.Lock()
        self.redis_client = None
        self.use_redis = False
        
        # In-memory LRU store: hash -> (timestamp, data, raw_query)
        self.in_memory_store: OrderedDict[str, Tuple[float, Dict[str, Any], str]] = OrderedDict()
        
        # Telemetry stats
        self.stats = {
            "exact_hits": 0,
            "semantic_hits": 0,
            "template_hits": 0,
            "disk_hits": 0,
            "misses": 0,
            "saved_tokens_estimate": 0,
            "backend": "in-memory"
        }

        self._init_redis()
        self._load_disk_cache()

    def _init_redis(self):
        if not REDIS_AVAILABLE:
            self.stats["backend"] = "in-memory + disk"
            return

        try:
            client = redis.Redis.from_url(REDIS_URL, socket_timeout=1.5, socket_connect_timeout=1.5)
            client.ping()
            self.redis_client = client
            self.use_redis = True
            self.stats["backend"] = f"redis ({REDIS_URL}) + disk"
        except Exception:
            self.redis_client = None
            self.use_redis = False
            self.stats["backend"] = "in-memory + disk (redis offline)"

    def _load_disk_cache(self):
        """Loads persistently cached blueprints from disk on boot."""
        try:
            if os.path.exists(DISK_CACHE_FILE):
                with open(DISK_CACHE_FILE, 'r', encoding='utf-8') as f:
                    entries = json.load(f)
                    now = time.time()
                    loaded = 0
                    for k, val in entries.items():
                        ts = val.get("timestamp", now)
                        if now - ts < CACHE_TTL_SECONDS:
                            self.in_memory_store[k] = (ts, val.get("data", {}), val.get("query", ""))
                            loaded += 1
                    if loaded > 0:
                        self.stats["disk_hits"] += loaded
        except Exception:
            pass # Fail gracefully if corrupted or unreadable

    def _save_disk_cache_async(self):
        """Asynchronously writes in-memory cache to disk without blocking the response."""
        def write_worker():
            try:
                os.makedirs(DISK_CACHE_DIR, exist_ok=True)
                with self.lock:
                    dumpable = {}
                    for k, (ts, data, query) in self.in_memory_store.items():
                        dumpable[k] = {
                            "timestamp": ts,
                            "query": query,
                            "data": data
                        }
                temp_file = f"{DISK_CACHE_FILE}.tmp"
                with open(temp_file, 'w', encoding='utf-8') as f:
                    json.dump(dumpable, f, indent=2)
                if os.path.exists(temp_file):
                    os.replace(temp_file, DISK_CACHE_FILE)
            except Exception:
                pass

        thread = threading.Thread(target=write_worker, daemon=True)
        thread.start()

    def get(self, query: str, target_class: str = "Character", is_patch: bool = False, ir_summary: str = "") -> Optional[Dict[str, Any]]:
        cache_key = hash_request(query, target_class, is_patch, ir_summary)
        
        # 1. Exact Match via Redis
        if self.use_redis and self.redis_client:
            try:
                cached_bytes = self.redis_client.get(f"noder:exact:{cache_key}")
                if cached_bytes:
                    data = json.loads(cached_bytes.decode('utf-8'))
                    data.setdefault("_meta", {})
                    data["_meta"]["source"] = "redis_exact_cache"
                    data["_meta"]["tokens_burned"] = 0
                    with self.lock:
                        self.stats["exact_hits"] += 1
                        self.stats["saved_tokens_estimate"] += 1200
                    return data
            except Exception:
                pass

        # 2. Exact Match via In-Memory LRU / Disk-backed Store
        with self.lock:
            if cache_key in self.in_memory_store:
                ts, data, stored_q = self.in_memory_store[cache_key]
                if time.time() - ts < CACHE_TTL_SECONDS:
                    self.in_memory_store.move_to_end(cache_key)
                    import copy
                    ret = copy.deepcopy(data)
                    ret.setdefault("_meta", {})
                    ret["_meta"]["source"] = "persistent_cache"
                    ret["_meta"]["tokens_burned"] = 0
                    self.stats["exact_hits"] += 1
                    self.stats["saved_tokens_estimate"] += 1200
                    return ret
                else:
                    del self.in_memory_store[cache_key]

        # 3. Semantic / Token Jaccard Match (Only for non-patch mode)
        if not is_patch:
            semantic_hit = self._find_semantic_match(query, target_class)
            if semantic_hit:
                with self.lock:
                    self.stats["semantic_hits"] += 1
                    self.stats["saved_tokens_estimate"] += 1200
                return semantic_hit

        with self.lock:
            self.stats["misses"] += 1
        return None

    def _find_semantic_match(self, query: str, target_class: str) -> Optional[Dict[str, Any]]:
        norm_q = normalize_text(query)
        q_tokens = set(norm_q.split())
        if len(q_tokens) < 2:
            return None

        with self.lock:
            for key, (ts, data, stored_q) in list(self.in_memory_store.items()):
                if time.time() - ts > CACHE_TTL_SECONDS:
                    continue
                stored_tokens = set(normalize_text(stored_q).split())
                if not stored_tokens:
                    continue
                
                intersection = len(q_tokens & stored_tokens)
                union = len(q_tokens | stored_tokens)
                jaccard = intersection / max(1, union)

                # 75% token overlap is an identical semantic gameplay query
                if jaccard >= 0.75:
                    import copy
                    ret = copy.deepcopy(data)
                    ret.setdefault("_meta", {})
                    ret["_meta"]["source"] = "semantic_cache"
                    ret["_meta"]["similarity"] = round(jaccard, 2)
                    ret["_meta"]["tokens_burned"] = 0
                    return ret

        return None

    def set(self, query: str, target_class: str, is_patch: bool, data: Dict[str, Any], ir_summary: str = ""):
        cache_key = hash_request(query, target_class, is_patch, ir_summary)
        clean_data = dict(data)

        # Store in Redis if connected
        if self.use_redis and self.redis_client:
            try:
                serialized = json.dumps(clean_data)
                self.redis_client.setex(f"noder:exact:{cache_key}", CACHE_TTL_SECONDS, serialized)
            except Exception:
                pass

        # Store in In-Memory LRU
        with self.lock:
            if len(self.in_memory_store) >= MAX_IN_MEMORY_ENTRIES:
                self.in_memory_store.popitem(last=False)
            self.in_memory_store[cache_key] = (time.time(), clean_data, query)

        # Persist to disk asynchronously
        self._save_disk_cache_async()

    def record_template_hit(self):
        with self.lock:
            self.stats["template_hits"] += 1
            self.stats["saved_tokens_estimate"] += 1200

    def get_stats(self) -> Dict[str, Any]:
        with self.lock:
            s = dict(self.stats)
            s["in_memory_entries"] = len(self.in_memory_store)
            total_requests = s["exact_hits"] + s["semantic_hits"] + s["template_hits"] + s["misses"]
            s["hit_rate"] = round((s["exact_hits"] + s["semantic_hits"] + s["template_hits"]) / max(1, total_requests) * 100, 1)
            return s

# Global singleton
blueprint_cache = HybridBlueprintCache()
