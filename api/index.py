# noder/api/index.py
# Clean, schema-driven Flask API for Noder utilizing Google GenAI SDK with structured output.
# Uses Pydantic response_schema to guarantee valid Unreal Engine 5 Blueprint JSON without bloated few-shot prompt engineering.

import os
import json
import logging
from typing import Optional, List, Any
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.middleware.proxy_fix import ProxyFix
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

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
    blueprintName: str = Field(description="Descriptive name for the Blueprint asset (e.g. BP_GrapplingHook)")
    blueprintDescription: str = Field(description="Technical summary of the gameplay mechanic and logic flow")
    targetClass: str = Field(default="Character", description="Parent class: Character, Actor, Pawn, PlayerController")
    nodes: List[NodeModel] = Field(description="All Blueprint nodes in the graph")
    connections: List[ConnectionModel] = Field(description="Pin connections linking the nodes")

# --- High-Level Architecture Instruction (Zero Few-Shot or Hardcoded Pixel Prompt Engineering) ---
SYSTEM_INSTRUCTION = """You are an expert Unreal Engine 5 Gameplay Systems Architect.
Generate an authentic, complete, and game-ready Unreal Engine 5 Blueprint graph for the requested mechanic or system.
Ensure all nodes use standard Unreal Engine 5 naming, correct execution and data pin signatures, and valid connections forming a continuous gameplay logic flow. All outputs must strictly adhere to the structured BlueprintGraphResponse schema."""

# Configure Flask App
app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# Configure Gemini Client
API_KEY = os.getenv("GEMINI_API_KEY")
PRIMARY_MODEL = os.getenv("GEMINI_MODEL", "gemini-4-argon")
FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash"]

client = None
if API_KEY:
    try:
        client = genai.Client(api_key=API_KEY)
        logger.info(f"Initialized Google GenAI Client with primary model: {PRIMARY_MODEL}")
    except Exception as e:
        logger.error(f"Failed to initialize GenAI client: {e}")
else:
    logger.warning("GEMINI_API_KEY environment variable is not set.")

@app.route('/api/generateBlueprint', methods=['POST'])
def generate_blueprint_handler():
    if not client:
        return jsonify({"error": "Gemini API key is not configured. Please set GEMINI_API_KEY in your environment."}), 500

    if not request.is_json:
        return jsonify({"error": "Request body must be JSON"}), 400

    data = request.get_json()
    query_text = data.get('query')
    target_class = data.get('targetClass', 'Character')

    if not query_text or not isinstance(query_text, str) or not query_text.strip():
        return jsonify({"error": "Missing or empty 'query' in request body."}), 400

    user_prompt = f"Target Class: {target_class}\nFeature Request: {query_text.strip()}"

    # Use Gemini's first-class structured output with Pydantic response_schema
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        response_mime_type="application/json",
        response_schema=BlueprintGraphResponse,
        temperature=0.2,
    )

    models_to_try = list(dict.fromkeys([PRIMARY_MODEL] + FALLBACK_MODELS))
    last_error = None
    response_text = None
    used_model = None

    for model_candidate in models_to_try:
        try:
            logger.info(f"Generating blueprint with model '{model_candidate}' for query: {query_text[:60]}...")
            response = client.models.generate_content(
                model=model_candidate,
                contents=user_prompt,
                config=config,
            )
            if response.text and response.text.strip():
                response_text = response.text.strip()
                used_model = model_candidate
                break
        except Exception as model_err:
            last_error = model_err
            logger.warning(f"Model '{model_candidate}' failed: {model_err}. Proceeding to fallback...")

    if not response_text:
        logger.error(f"All model candidates failed. Last error: {last_error}")
        return jsonify({"error": f"AI Generation failed: {str(last_error)}"}), 500

    try:
        blueprint_json = json.loads(response_text)
        blueprint_json['_meta'] = {'model': used_model}
        logger.info(f"Successfully generated blueprint with '{used_model}': {blueprint_json.get('blueprintName', 'Untitled')} ({len(blueprint_json.get('nodes', []))} nodes, {len(blueprint_json.get('connections', []))} connections)")
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

@app.route('/api/health', methods=['GET'])
def health_check_handler():
    return jsonify({
        "status": "OK" if client else "DEGRADED",
        "primaryModel": PRIMARY_MODEL,
        "fallbackModels": FALLBACK_MODELS,
        "hasKey": bool(API_KEY)
    }), 200 if client else 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
