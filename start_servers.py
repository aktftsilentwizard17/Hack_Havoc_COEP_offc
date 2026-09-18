import subprocess
import sys
import os
import time
import signal

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")

    print("=" * 65)
    print("  OceanEmbed | SIH26066 - Ministry of Earth Sciences")
    print("  3D Ocean Subsurface Temperature AI Reconstruction Platform")
    print("=" * 65)

    # 1. Start Backend FastAPI Server
    backend_cmd = [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    print(f"\n[1/2] Starting FastAPI Backend on http://localhost:8000 ...")
    backend_proc = subprocess.Popen(backend_cmd, cwd=root_dir)

    # 2. Start Vite Frontend Server
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_cmd = [npm_cmd, "run", "dev"]
    print(f"[2/2] Starting Vite React Frontend on http://localhost:5173 ...\n")
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=frontend_dir)

    print("-" * 65)
    print("  Platform running!")
    print("  - Frontend UI: http://localhost:5173")
    print("  - Backend API: http://localhost:8000")
    print("  - Swagger Docs: http://localhost:8000/docs")
    print("  Press Ctrl+C to terminate both servers.")
    print("-" * 65)

    def shutdown(sig, frame):
        print("\nShutting down servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown(None, None)

if __name__ == "__main__":
    main()

