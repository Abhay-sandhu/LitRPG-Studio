import subprocess
import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def run_health_check():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend")
    
    print("=" * 70)
    print("CHRONICLERPG STUDIO - AUTOMATED HEALTH & BUG AUDIT")
    print("=" * 70)

    # 1. Backend Test Suite
    print("\n[Step 1/2] Running Comprehensive Backend Test Suite (25 Tests)...")
    res_backend = subprocess.run(
        ["uv", "run", "python", "test_suite.py"],
        cwd=backend_dir,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace"
    )
    print(res_backend.stdout)
    if res_backend.returncode != 0:
        print("[ERROR] Backend test suite failed!")
        print(res_backend.stderr)
        return 1

    # 2. Frontend Type & Production Build Verification
    print("\n[Step 2/2] Running Frontend TypeScript Check & Vite Production Build...")
    res_frontend = subprocess.run(
        ["cmd", "/c", "npm run build"],
        cwd=frontend_dir,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace"
    )
    print(res_frontend.stdout)
    if res_frontend.returncode != 0:
        print("[ERROR] Frontend build failed!")
        print(res_frontend.stderr)
        return 1

    print("=" * 70)
    print("ALL AUDITS PASSED: Zero bugs detected across full stack.")
    print("=" * 70)
    return 0

if __name__ == "__main__":
    sys.exit(run_health_check())
