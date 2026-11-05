# Noder Unreal Engine 5 Bridge

Seamless, non-blocking bidirectional bridge connecting **Noder** with a running **Unreal Engine 5** editor session.

---

## 🚀 Quick Setup (2 Minutes)

### Option 1: Run on-demand inside Unreal Engine 5
1. Launch your Unreal Engine project (UE 5.0, 5.1, 5.2, 5.3, 5.4, or 5.5).
2. Open the **Output Log** window (`Window -> Output Log` or press the backtick/tilde `` ` `` key).
3. Ensure the prompt dropdown is set to **Python** (or Cmd).
4. Run:
   ```python
   py "path/to/noder/unreal/NoderBridge.py"
   ```
5. You will see:
   ```text
   LogPython: [NoderBridge] Live listening on http://127.0.0.1:8080. Ready to receive Noder graphs!
   ```
6. In Noder, open **Bridges -> Live Remote Bridge**, and you'll see a green **Connected to Unreal Engine 5** indicator. Click **Push to Unreal Engine (Port 8080)** and press `Ctrl+V` in your Blueprint Event Graph!

---

### Option 2: Auto-start on Unreal Engine launch
To have NoderBridge automatically launch every time you open your Unreal project:
1. Locate your Unreal project directory: `YourProject/Content/Python/`
2. Create or edit `init_unreal.py`:
   ```python
   import sys
   sys.path.append(r"C:\path\to\noder\unreal")  # Adjust path to your noder/unreal directory
   import NoderBridge
   NoderBridge.start_server()
   ```
Unreal Engine executes `init_unreal.py` on startup in a background daemon thread without slowing down editor launch.

---

### Option 3: Standalone Sidecar (Terminal Mode)
If you are developing outside the UE editor or testing clipboard sync:
```bash
python unreal/NoderBridge.py
```
This runs a standalone HTTP server on `http://127.0.0.1:8080` that syncs incoming graphs directly into your OS system clipboard (`clip` on Windows, `pbcopy` on macOS, `xclip` on Linux).

---

## 📡 Endpoints
- `GET /status`: Returns JSON diagnostics, engine version, and connection status.
- `GET /ping`: Lightweight healthcheck endpoint.
- `POST /sync`: Receives `{ "t3d": "...", "name": "..." }`, injects into Unreal Engine's native clipboard, and confirms transfer.

