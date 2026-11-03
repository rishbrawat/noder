import os
import json
import logging
from dotenv import load_dotenv
from google import genai
from google.genai import types

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

from index import SYSTEM_INSTRUCTION, BlueprintGraphResponse

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is missing.")

client = genai.Client(api_key=API_KEY)

def test_generation(query: str, target_class: str = "Character"):
    logger.info(f"Testing generation for query: '{query}' (Target: {target_class})")

    user_prompt = f"Target Class: {target_class}\nFeature Request: {query.strip()}"

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        response_mime_type="application/json",
        response_schema=BlueprintGraphResponse,
        temperature=0.2,
    )

    preferred_models = [os.getenv("GEMINI_MODEL", "gemini-4-argon"), "gemini-3.6-flash", "gemini-3.5-flash"]
    models_to_try = list(dict.fromkeys(m for m in preferred_models if m))

    for model_name in models_to_try:
        try:
            logger.info(f"Attempting model: {model_name}...")
            res = client.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config=config,
            )
            data = json.loads(res.text)
            logger.info(f"SUCCESS with {model_name}!")
            logger.info(f"Generated Blueprint Name: {data.get('blueprintName')}")
            logger.info(f"Node count: {len(data.get('nodes', []))}")
            logger.info(f"Connection count: {len(data.get('connections', []))}")
            return True
        except Exception as e:
            logger.warning(f"Model {model_name} failed: {e}")

    return False

if __name__ == "__main__":
    success = test_generation("Create a grappling hook mechanic that shoots a cable and pulls player to target location")
    print("\nTest Result:", "PASSED" if success else "FAILED")
