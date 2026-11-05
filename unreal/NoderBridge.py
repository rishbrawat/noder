#!/usr/bin/env python3
"""
NoderBridge - Unreal Engine 5 Live Execution & Clipboard Bridge
---------------------------------------------------------------
Runs a lightweight, non-blocking HTTP bridge inside Unreal Engine 5 (or as a standalone sidecar)
enabling 1-click graph transfer from Noder directly into the running Unreal Engine 5 editor.

Usage inside Unreal Engine 5:
  1. Open Unreal Engine 5 (5.0 - 5.5).
  2. Open Window -> Output Log.
  3. Ensure dropdown is set to "Python" or "Cmd".
  4. Run:
     py "path/to/noder/unreal/NoderBridge.py"
  5. The bridge starts immediately in the background on http://127.0.0.1:8080.
  6. In Noder, click "Push to Unreal Engine". Paste (Ctrl+V) directly into your Blueprint graph!

Auto-start on Unreal Engine launch:
  Copy this script or import it inside your project's Content/Python/init_unreal.py:
  import NoderBridge
  NoderBridge.start_server()
"""

import os
import sys
import json
import logging
import platform
import subprocess
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

# Configure Logging
logging.basicConfig(level=logging.INFO, format='[NoderBridge] %(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("NoderBridge")

# Unreal Engine Python Environment Detection
try:
    import unreal
    HAS_UNREAL = True
    ENGINE_VERSION = "5.x"
    try:
        ENGINE_VERSION = f"{unreal.SystemLibrary.get_engine_version()}"
    except Exception:
        pass
    logger.info(f"Unreal Engine environment detected! Engine version: {ENGINE_VERSION}")
except ImportError:
    HAS_UNREAL = False
    ENGINE_VERSION = "Standalone Sidecar (Mock UE5)"
    logger.info("Running in standalone bridge mode (Unreal Engine Python API not detected).")

DEFAULT_PORT = 8080
_server_instance = None
_server_thread = None

def ue_log(msg: str):
    """Safely log to Unreal Output Log if available, and standard logger."""
    if HAS_UNREAL:
        try:
            if hasattr(unreal, 'log'):
                unreal.log(msg)
            elif hasattr(unreal, 'log_warning'):
                unreal.log_warning(msg)
        except Exception:
            pass
    logger.info(msg)

def set_system_clipboard(text: str) -> bool:
    """Sets system clipboard across Windows, macOS, and Linux as fallback."""
    try:
        if sys.platform == 'win32':
            proc = subprocess.Popen(['clip'], stdin=subprocess.PIPE, shell=True)
            proc.communicate(text.encode('utf-8'))
            return True
        elif sys.platform == 'darwin':
            proc = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE)
            proc.communicate(text.encode('utf-8'))
            return True
        elif sys.platform.startswith('linux'):
            for clip_tool in [['xclip', '-selection', 'clipboard'], ['xsel', '--clipboard', '--input']]:
                try:
                    proc = subprocess.Popen(clip_tool, stdin=subprocess.PIPE)
                    proc.communicate(text.encode('utf-8'))
                    return True
                except FileNotFoundError:
                    continue
    except Exception as e:
        logger.error(f"Failed to copy to OS clipboard: {e}")
    return False

def inject_to_unreal_engine(t3d_text: str, name: str = "Blueprint") -> bool:
    """Injects T3D ASCII graph into Unreal Engine 5's clipboard buffer."""
    copied = False
    if HAS_UNREAL:
        try:
            if hasattr(unreal, 'SystemLibrary') and hasattr(unreal.SystemLibrary, 'set_clipboard_content'):
                unreal.SystemLibrary.set_clipboard_content(t3d_text)
                ue_log(f"[NoderBridge] Successfully injected graph '{name}' into Unreal Engine clipboard buffer.")
                copied = True
        except Exception as e:
            logger.warning(f"unreal.SystemLibrary.set_clipboard_content failed: {e}. Trying system clipboard fallback.")

    # Also sync system OS clipboard so Ctrl+V in editor graph viewport always catches it
    fallback_copied = set_system_clipboard(t3d_text)
    return copied or fallback_copied

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Threaded HTTP Server for non-blocking concurrent requests."""
    daemon_threads = True
    allow_reuse_address = True

class NoderBridgeRequestHandler(BaseHTTPRequestHandler):
    """HTTP Request Handler handling CORS, health checks, and T3D graph synchronization."""

    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path in ['/', '/status', '/api/status']:
            response = {
                "status": "connected",
                "bridge": "NoderBridge v1.0.0",
                "engine": "Unreal Engine" if HAS_UNREAL else "Noder Live Sidecar",
                "version": ENGINE_VERSION,
                "unrealDetected": HAS_UNREAL,
                "platform": platform.platform(),
                "port": DEFAULT_PORT
            }
            body = json.dumps(response).encode('utf-8')
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == '/ping':
            body = b'{"pong": true}'
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

    def do_POST(self):
        if self.path in ['/sync', '/api/sync']:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_response(400)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Empty payload"}).encode('utf-8'))
                return

            try:
                raw_data = self.rfile.read(content_length).decode('utf-8')
                payload = json.loads(raw_data)
                t3d_text = payload.get('t3d', '')
                blueprint_name = payload.get('name', 'NoderGraph')

                if not t3d_text:
                    self.send_response(400)
                    self._send_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Missing 't3d' field in payload"}).encode('utf-8'))
                    return

                success = inject_to_unreal_engine(t3d_text, blueprint_name)
                logger.info(f"Received sync for graph '{blueprint_name}' ({len(t3d_text)} characters). Injected={success}")

                response_payload = {
                    "status": "SUCCESS" if success else "WARNING",
                    "message": f"Graph '{blueprint_name}' synced to Unreal Engine clipboard! Press Ctrl+V in your Event Graph.",
                    "nodeCount": t3d_text.count("Begin Object"),
                    "length": len(t3d_text),
                    "unrealDetected": HAS_UNREAL
                }

                body = json.dumps(response_payload).encode('utf-8')
                self.send_response(200)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            except Exception as e:
                logger.error(f"Error processing /sync: {e}")
                err_body = json.dumps({"error": str(e)}).encode('utf-8')
                self.send_response(500)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(err_body)))
                self.end_headers()
                self.wfile.write(err_body)
        elif self.path in ['/execute', '/api/execute']:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_response(400)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Empty payload"}).encode('utf-8'))
                return

            try:
                raw_data = self.rfile.read(content_length).decode('utf-8')
                payload = json.loads(raw_data)
                code = payload.get('code', '')

                if not code:
                    self.send_response(400)
                    self._send_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Missing 'code' field in payload"}).encode('utf-8'))
                    return

                logger.info(f"Received execution request ({len(code)} characters).")
                exec_globals = {"__name__": "__main__"}
                if HAS_UNREAL:
                    exec_globals["unreal"] = unreal

                try:
                    exec(code, exec_globals)
                    response_payload = {
                        "status": "SUCCESS",
                        "output": "Executed in UE5 Python environment" if HAS_UNREAL else "Executed in standalone Python environment",
                        "engine": ENGINE_VERSION,
                        "unrealDetected": HAS_UNREAL
                    }
                    status_code = 200
                except Exception as ex:
                    logger.error(f"Execution error: {ex}")
                    response_payload = {
                        "status": "ERROR",
                        "error": str(ex),
                        "engine": ENGINE_VERSION
                    }
                    status_code = 500

                body = json.dumps(response_payload).encode('utf-8')
                self.send_response(status_code)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            except Exception as e:
                logger.error(f"Error processing /execute: {e}")
                err_body = json.dumps({"error": str(e)}).encode('utf-8')
                self.send_response(500)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(err_body)))
                self.end_headers()
                self.wfile.write(err_body)
        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

    def log_message(self, format, *args):
        # Override to suppress default noisy stdout logging
        pass

def start_server(port: int = DEFAULT_PORT) -> ThreadedHTTPServer:
    """Starts the NoderBridge HTTP server in a background daemon thread."""
    global _server_instance, _server_thread
    if _server_instance is not None:
        logger.info(f"NoderBridge already running on http://127.0.0.1:{port}")
        return _server_instance

    try:
        _server_instance = ThreadedHTTPServer(('127.0.0.1', port), NoderBridgeRequestHandler)
        _server_thread = threading.Thread(target=_server_instance.serve_forever, daemon=True)
        _server_thread.start()
        logger.info(f"NoderBridge started successfully on http://127.0.0.1:{port}")
        ue_log(f"[NoderBridge] Live listening on http://127.0.0.1:{port}. Ready to receive Noder graphs!")
        return _server_instance
    except Exception as e:
        logger.error(f"Failed to bind NoderBridge on port {port}: {e}")
        return None

def stop_server():
    """Stops the running bridge server."""
    global _server_instance
    if _server_instance:
        logger.info("Stopping NoderBridge...")
        _server_instance.shutdown()
        _server_instance = None

if __name__ == '__main__':
    server = start_server(DEFAULT_PORT)
    if server:
        print(f"\n=======================================================")
        print(f"  ⚡ NODER LIVE UNREAL ENGINE 5 BRIDGE LISTENING")
        print(f"  URL: http://127.0.0.1:{DEFAULT_PORT}")
        print(f"  Unreal Engine Detected: {HAS_UNREAL}")
        print(f"  Engine Version: {ENGINE_VERSION}")
        print(f"  Press Ctrl+C to terminate.")
        print(f"=======================================================\n")
        try:
            # Keep main thread alive when executed directly in terminal
            if not HAS_UNREAL:
                import time
                while True:
                    time.sleep(1)
        except KeyboardInterrupt:
            stop_server()
            print("\nNoderBridge terminated cleanly.")
