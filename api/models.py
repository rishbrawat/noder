from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is not set.")

client = genai.Client(api_key=api_key)

print("Available Gemini Models supporting generateContent:")
for m in client.models.list():
    if "generateContent" in m.supported_actions:
        print(f"- {m.name} ({m.display_name})")
