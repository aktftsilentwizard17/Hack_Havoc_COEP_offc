import os
import sys
import uvicorn

# Ensure repository root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"[Server] Starting OceanEmbed Backend on 0.0.0.0:{port} ...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, log_level="info", access_log=True)

