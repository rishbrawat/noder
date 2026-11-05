# noder/api/index.py
# Clean, schema-driven Flask API for Noder utilizing Google GenAI SDK with structured output.
# Uses Pydantic response_schema to guarantee valid Unreal Engine 5 Blueprint JSON without bloated few-shot prompt engineering.

import os
import json
import logging
import time
from typing import Optional, List, Any, Dict
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.middleware.proxy_fix import ProxyFix
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

# High-Performance Blueprint Caching & Schema Pruning Engine
try:
    from api.canonical_templates import match_canonical_template
    from api.cache_layer import blueprint_cache
    from api.ue_catalog import extract_top_k_canonical_nodes
except ImportError:
    from canonical_templates import match_canonical_template
    from cache_layer import blueprint_cache
    from ue_catalog import extract_top_k_canonical_nodes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(override=True)

# --- Pydantic Schema Definitions for Structured Blueprint Generation ---

class PinModel(BaseModel):
    name: str = Field(description="Name of the pin (e.g. Execute, Then, Target, Condition, True, False, etc.)")
    type: str = Field(description="Pin data type: exec, bool, float, int, string, vector, rotator, transform, object, class")
    value: Optional[Any] = Field(default=None, description="Optional default literal value for inputs when unconnected")

class NodeModel(BaseModel):
    id: str = Field(description="Unique node identifier (e.g. node_0, node_1)")
    title: str = Field(description="Standard Unreal Engine 5 node title (e.g. InputAction IA_Jump, Set Max Walk Speed, Branch, LineTraceByChannel)")
    nodeType: str = Field(default="function", description="Category: event, function, variable, macro")
    description: Optional[str] = Field(default="", description="Brief description of what this node does")
    inputs: List[PinModel] = Field(default_factory=list, description="Input pins")
    outputs: List[PinModel] = Field(default_factory=list, description="Output pins")

class ConnectionModel(BaseModel):
    sourceNodeId: str = Field(description="ID of the source node")
    sourcePinName: str = Field(description="Output pin name on source node")
    targetNodeId: str = Field(description="ID of the target node")
    targetPinName: str = Field(description="Input pin name on target node")

class BlueprintGraphResponse(BaseModel):
    architecturePlan: str = Field(
        description=(
            "Mandatory Step-by-Step Logic Planning:\n"
            "1. User Intent Analysis: What specific mechanic or trigger is requested?\n"
            "2. Minimal Required Nodes: List the exact minimal UE5 nodes needed (and ONLY what was requested, no unrelated fluff).\n"
            "3. Continuous Execution Path: Trace the signal from the input/trigger event through to the final action.\n"
            "4. Pin Wire Connections: Specify which exact source pin connects to which target pin."
        )
    )
    blueprintName: str = Field(description="Descriptive name for the Blueprint asset (e.g. BP_ShiftToJump)")
    blueprintDescription: str = Field(description="Technical summary of the gameplay mechanic and logic flow")
    targetClass: str = Field(default="Character", description="Parent class: Character, Actor, Pawn, PlayerController")
    nodes: List[NodeModel] = Field(description="All Blueprint nodes in the graph")
    connections: List[ConnectionModel] = Field(description="Pin connections linking the nodes")

class BlueprintDeltaPatchResponse(BaseModel):
    architecturePlan: str = Field(
        description=(
            "Reasoning plan for incremental modifications:\n"
            "1. Planned Changes: What is being added, modified, or removed?\n"
            "2. Linkage to Existing Nodes: How new nodes attach to existing node IDs.\n"
            "3. Pin Integrity: Verify all new and remaining connections are valid."
        )
    )
    mode: str = Field(default="patch", description="'patch' for incremental graph modifications")
    summary: str = Field(description="Concise description of the modifications made")
    nodes: List[NodeModel] = Field(description="Nodes added or modified. To modify an existing node, preserve its original ID from the current graph IR. To add new nodes, use fresh IDs like new_1, new_2.")
    connections: List[ConnectionModel] = Field(description="New or updated connections linking the nodes")
    removedNodeIds: List[str] = Field(default_factory=list, description="IDs of existing nodes that should be deleted")
    removedConnections: List[ConnectionModel] = Field(default_factory=list, description="Existing connections to disconnect")

# --- High-Level Architecture Instructions ---
SYSTEM_INSTRUCTION = """You are an expert Unreal Engine 5 Gameplay Systems Architect.
Generate an authentic, complete, minimal, and fully-connected Unreal Engine 5 Blueprint graph for the requested mechanic.

CRITICAL RULES:
1. REASONING FIRST: Always populate architecturePlan first. Analyze user intent, select the minimal required UE5 nodes, trace the continuous signal flow, and verify pin connections.
2. STRICT SCOPE: Only implement what was requested. If the user asks for 'shift to jump', connect the Shift input directly to the Jump action. Never add unrelated mechanics (such as walk speed changes, health, stamina, sprint, or UI) unless explicitly requested.
3. CONTINUOUS EXECUTION FLOW: The primary input trigger MUST connect its execution wire (Started, Triggered, Pressed) to the logic action. Never emit disconnected nodes or parallel unrelated event chains.
4. AUTHENTIC PINS: Execution pins (exec) connect to execution pins (Execute, Then, True, False). Data pins connect to matching types."""

SYSTEM_INSTRUCTION_PATCH = """You are an expert Unreal Engine 5 Gameplay Systems Architect.
You are incrementally extending, adding new mechanics to, or modifying an active Unreal Engine 5 Blueprint graph.
You are provided with the CURRENT GRAPH in minified IR format.

CRITICAL RULES:
1. REASONING FIRST: Populate architecturePlan first explaining what mechanic is being added or edited, and how pins connect.
2. ALWAYS GENERATE NEW MECHANICS: If the user is requesting a new mechanic, trigger, or action (e.g. 'shift to jump', 'health regen', 'crouch on ctrl'), you MUST generate all the new nodes required for that mechanic with new descriptive IDs (e.g. new_input_1, new_jump_1) and full pin connections. Never return an empty nodes list!
3. PRESERVE EXISTING NODES: Keep existing nodes intact unless the user explicitly requested to remove them. If connecting to existing nodes, use their exact IDs from the current graph IR.
4. CONTINUOUS EXECUTION FLOW: Every new event MUST have an execution wire connecting to its action. No dangling wires."""

# Configure Flask App
app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Gemini-Api-Key", "Accept"]
    }
})

app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# Configure Multi-Key Pool & Model Cascades
RAW_KEYS = os.getenv("GEMINI_API_KEYS", "") or os.getenv("GEMINI_API_KEY", "")
CONFIGURED_KEYS = [k.strip() for k in RAW_KEYS.split(",") if k.strip()]
PRIMARY_MODEL = os.getenv("GEMINI_MODEL", "gemini-4-argon")
FALLBACK_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-flash-latest"
]

class KeyPool:
    def __init__(self, keys: List[str]):
        self.keys = keys
        self.quarantined: Dict[str, float] = {}
        self.client_cache: Dict[str, Any] = {}
        self.index = 0

    def get_candidate_keys(self, client_byok: Optional[str] = None) -> List[str]:
        candidates: List[str] = []
        if client_byok and client_byok.strip():
            candidates.append(client_byok.strip())

        now = time.time()
        active = [k for k in self.keys if self.quarantined.get(k, 0) < now]
        if active:
            # Round-robin rotate
            rotated = active[self.index % len(active):] + active[:self.index % len(active)]
            self.index = (self.index + 1) % len(active)
            for k in rotated:
                if k not in candidates:
                    candidates.append(k)
        elif self.keys:
            # If all quarantined, try them anyway
            for k in self.keys:
                if k not in candidates:
                    candidates.append(k)
        return candidates

    def get_client(self, api_key: str) -> Optional[Any]:
        if api_key not in self.client_cache:
            try:
                self.client_cache[api_key] = genai.Client(
                    api_key=api_key,
                    http_options=types.HttpOptions(timeout=25000)
                )
            except Exception as e:
                logger.error(f"Failed to create GenAI client for key ending in '...{api_key[-6:] if len(api_key)>=6 else '***'}': {e}")
                return None
        return self.client_cache[api_key]

    def quarantine(self, api_key: str, duration: float = 600.0):
        snippet = f"...{api_key[-6:]}" if len(api_key) >= 6 else "***"
        logger.warning(f"Key {snippet} quarantined for {duration}s due to quota exhaustion (429).")
        self.quarantined[api_key] = time.time() + duration

key_pool = KeyPool(CONFIGURED_KEYS)
QUARANTINED_MODELS: Dict[str, float] = {}
ai_executor = ThreadPoolExecutor(max_workers=6)

logger.info(f"Initialized KeyPool with {len(CONFIGURED_KEYS)} server key(s). Primary model: {PRIMARY_MODEL}")

@app.route('/api/generateBlueprint', methods=['POST'])
def generate_blueprint_handler():
    client_byok = request.headers.get("X-Gemini-Api-Key")
    auth_header = request.headers.get("Authorization")
    if auth_header:
        # Trace authorized request
        logger.info(f"Authorized request received with token prefix: {auth_header[:15]}...")

    if not request.is_json:
        return jsonify({"error": "Request body must be JSON"}), 400

    data = request.get_json()
    query_text = data.get('query')
    target_class = data.get('targetClass', 'Character')
    current_graph_ir = data.get('currentGraphIR')
    scoped_node_ids = data.get('scopedNodeIds')

    if not query_text or not isinstance(query_text, str) or not query_text.strip():
        return jsonify({"error": "Missing or empty 'query' in request body."}), 400

    is_patch = bool(current_graph_ir)
    ir_payload = ""
    if is_patch:
        ir_payload = json.dumps(current_graph_ir, indent=2) if isinstance(current_graph_ir, (dict, list)) else str(current_graph_ir)

    # Exact cache check (serves exact repeated queries without burning tokens)
    cached_graph = blueprint_cache.get(query_text, target_class, is_patch, ir_summary=ir_payload[:120])
    if cached_graph:
        src = cached_graph.get('_meta', {}).get('source', 'cache')
        logger.info(f"[Cache Hit] Serving cached graph for query '{query_text[:50]}' (source: {src}, 0 tokens burned)")
        return jsonify(cached_graph), 200

    # Verify keys are available for LLM generation
    keys_to_try = key_pool.get_candidate_keys(client_byok)
    if not keys_to_try:
        return jsonify({"error": "No Gemini API keys configured. Set GEMINI_API_KEYS or supply X-Gemini-Api-Key header."}), 500

    # Optional UE5 Pin Signature Reference (only if relevant literal node names match)
    selected_canonical_nodes, compact_ir = extract_top_k_canonical_nodes(query_text, top_k=5)
    ref_block = f"\n\n{compact_ir}" if compact_ir else ""

    if is_patch:
        user_prompt = f"Target Class: {target_class}\nFeature / Edit Request: {query_text.strip()}\n\nCURRENT GRAPH MINIFIED IR:\n{ir_payload}{ref_block}"
        if scoped_node_ids and isinstance(scoped_node_ids, list):
            user_prompt += f"\n\nSCOPED TARGET NODES: Focus modifications directly around these nodes: {', '.join(scoped_node_ids)}"
        
        system_instr = SYSTEM_INSTRUCTION_PATCH
        resp_schema = BlueprintDeltaPatchResponse
        logger.info(f"Initiating Iterative Blueprint Patch for query: {query_text[:50]}... (IR length: {len(ir_payload)} chars)")
    else:
        user_prompt = f"Target Class: {target_class}\nFeature Request: {query_text.strip()}{ref_block}"
        system_instr = SYSTEM_INSTRUCTION
        resp_schema = BlueprintGraphResponse
        logger.info(f"Initiating Full Blueprint Generation with Architecture Reasoning for query: {query_text[:50]}...")

    # Use Gemini's first-class structured output with Pydantic response_schema
    config = types.GenerateContentConfig(
        system_instruction=system_instr,
        response_mime_type="application/json",
        response_schema=resp_schema,
        temperature=0.2,
    )

    now = time.time()
    all_candidates = list(dict.fromkeys([PRIMARY_MODEL] + FALLBACK_MODELS))
    # Filter out quarantined models (circuit breaker)
    models_to_try = [m for m in all_candidates if QUARANTINED_MODELS.get(m, 0) < now]
    if not models_to_try:
        models_to_try = all_candidates

    last_error = None
    response_text = None
    used_model = None

    # Multi-Key Rotation + Model Cascade Failover
    for current_key in keys_to_try:
        genai_client = key_pool.get_client(current_key)
        if not genai_client:
            continue

        key_failed_429 = False
        key_snippet = f"...{current_key[-6:]}" if len(current_key) >= 6 else "***"

        for model_candidate in models_to_try:
            try:
                logger.info(f"Generating with model '{model_candidate}' using key {key_snippet} for query: {query_text[:60]}...")
                
                # Execute with 25-second timeout to allow rich reasoning generation
                def run_generation():
                    return genai_client.models.generate_content(
                        model=model_candidate,
                        contents=user_prompt,
                        config=config,
                    )

                future = ai_executor.submit(run_generation)
                response = future.result(timeout=25.0)

                if response.text and response.text.strip():
                    response_text = response.text.strip()
                    used_model = model_candidate
                    break
            except FuturesTimeoutError:
                logger.warning(f"Model '{model_candidate}' timed out after 10s. Quarantining model for 5 min...")
                QUARANTINED_MODELS[model_candidate] = time.time() + 300
                last_error = TimeoutError(f"Model '{model_candidate}' timed out")
            except Exception as model_err:
                err_str = str(model_err)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    logger.warning(f"Model '{model_candidate}' hit quota or free-tier gate (429). Quarantining model '{model_candidate}' for 30m and cascading down to next model...")
                    QUARANTINED_MODELS[model_candidate] = time.time() + 1800
                    last_error = model_err
                    continue # Continue to next fallback model in the cascade!
                elif "503" in err_str or "UNAVAILABLE" in err_str or "404" in err_str:
                    logger.warning(f"Model '{model_candidate}' unavailable or deprecated ({err_str[:60]}). Cascading to next model...")
                    QUARANTINED_MODELS[model_candidate] = time.time() + 300
                    last_error = model_err
                    continue
                else:
                    logger.warning(f"Model '{model_candidate}' failed: {model_err}. Proceeding to fallback model...")
                    last_error = model_err
                    continue

        if response_text:
            break

    if not response_text:
        logger.error(f"All model candidates failed. Last error: {last_error}")
        return jsonify({"error": f"AI Generation failed: {str(last_error)}"}), 500

    try:
        blueprint_json = json.loads(response_text)
        blueprint_json['_meta'] = {
            'model': used_model,
            'mode': 'patch' if is_patch else 'full',
            'source': 'llm_generation',
            'canonical_nodes_pruned': len(selected_canonical_nodes)
        }
        
        # Save validated generation to cache for zero-token future retrievals
        blueprint_cache.set(query_text, target_class, is_patch, blueprint_json, ir_summary=ir_payload[:120])

        logger.info(f"Successfully processed blueprint with '{used_model}' (mode: {'patch' if is_patch else 'full'}): {blueprint_json.get('summary', blueprint_json.get('blueprintName', 'Untitled'))} ({len(blueprint_json.get('nodes', []))} nodes, {len(blueprint_json.get('connections', []))} connections)")
        return jsonify(blueprint_json), 200

    except json.JSONDecodeError as json_err:
        logger.error(f"JSON Decode Error: {json_err} - Raw response: {response_text[:300]}")
        return jsonify({"error": "Failed to parse generated blueprint JSON.", "details": str(json_err)}), 500
    except Exception as e:
        logger.error(f"Error processing response: {e}")
        return jsonify({"error": f"Server processing error: {str(e)}"}), 500

# In-memory payload for Unreal Engine 5 Live Remote Execution Bridge
latest_live_script = """# Noder Live Remote Execution Bridge for Unreal Engine 5
import unreal

unreal.log("[Noder Live Bridge] Handshake verified with Noder Studio.")
"""

@app.route('/api/ue5/live_script', methods=['GET', 'POST'])
def ue5_live_script_handler():
    global latest_live_script
    if request.method == 'POST':
        if not request.is_json:
            return jsonify({"error": "Expected JSON payload"}), 400
        data = request.get_json()
        script = data.get('script')
        if script:
            latest_live_script = script
            logger.info("Updated live script payload for Unreal Engine remote execution bridge.")
            return jsonify({"status": "SUCCESS", "message": "Live script synced for UE5 execution."}), 200
        return jsonify({"error": "No script provided in payload"}), 400
    else:
        return latest_live_script, 200, {'Content-Type': 'text/plain; charset=utf-8'}

@app.route('/api/cache/stats', methods=['GET'])
def cache_stats_handler():
    return jsonify(blueprint_cache.get_stats()), 200

@app.route('/api/health', methods=['GET'])
def health_check_handler():
    candidate_keys = key_pool.get_candidate_keys()
    cache_stats = blueprint_cache.get_stats()
    return jsonify({
        "status": "OK" if candidate_keys else "CONFIG_REQUIRED",
        "primaryModel": PRIMARY_MODEL,
        "fallbackModels": FALLBACK_MODELS,
        "activeKeyCount": len(candidate_keys),
        "quarantinedKeys": len(key_pool.quarantined),
        "cache": cache_stats
    }), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
