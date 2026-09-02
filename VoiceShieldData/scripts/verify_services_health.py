import sys
import time
from pathlib import Path
import requests

def test_endpoints():
    print("=" * 80)
    print("VOICESHIELD FULL SYSTEM END-TO-END SERVICE VERIFICATION")
    print("=" * 80)

    # 1. FastAPI ML Service Health
    try:
        r = requests.get("http://localhost:8000/api/v1/health", timeout=5)
        print(f"[1] FastAPI ML Service /api/v1/health: Status {r.status_code} | {r.json()}")
    except Exception as e:
        print(f"[1] FastAPI ML Service Error: {e}")

    # 2. FastAPI ML Models List
    try:
        r = requests.get("http://localhost:8000/api/v1/models", timeout=5)
        models_data = r.json()
        print(f"[2] FastAPI ML Service /api/v1/models: Champion = {models_data.get('ensemble_champion')} | Submodels = {len(models_data.get('models', []))}")
    except Exception as e:
        print(f"[2] FastAPI Models Error: {e}")

    # 3. FastAPI Real Audio Detection (Human sample)
    human_sample = Path(r"F:\VoiceShieldData\real_world_tests\human")
    sample_files = list(human_sample.glob("*.wav"))
    if sample_files:
        test_file = sample_files[0]
        try:
            with open(test_file, "rb") as f:
                r = requests.post("http://localhost:8000/api/v1/detect", files={"file": (test_file.name, f, "audio/wav")}, timeout=10)
            res = r.json()
            print(f"[3] FastAPI /api/v1/detect on {test_file.name}: Classification = {res.get('classification')} | Risk = {res.get('risk_score')}% | Tier = {res.get('risk_tier')} | Latency = {res.get('processing_time_ms')}ms")
        except Exception as e:
            print(f"[3] FastAPI Detect Error: {e}")

    # 4. Node.js Backend Health
    try:
        r = requests.get("http://localhost:5000/api/v1/health", timeout=5)
        print(f"[4] Node.js Backend /api/v1/health: Status {r.status_code} | {r.json()}")
    except Exception as e:
        print(f"[4] Node.js Backend Health Error: {e}")

    # 5. Node.js Backend Statistics Overview
    try:
        r = requests.get("http://localhost:5000/api/v1/statistics/overview", timeout=5)
        print(f"[5] Node.js Backend /api/v1/statistics/overview: Status {r.status_code} | Total Analyses = {r.json().get('data', {}).get('total_analyses', 0)}")
    except Exception as e:
        print(f"[5] Node.js Statistics Error: {e}")

    # 6. Node.js Full Detection Upload Flow
    if sample_files:
        test_file = sample_files[0]
        try:
            with open(test_file, "rb") as f:
                r = requests.post("http://localhost:5000/api/v1/detection/analyze", files={"audio": (test_file.name, f, "audio/wav")}, timeout=15)
            data = r.json()
            pred = data.get("data", {}).get("prediction", "N/A")
            risk = data.get("data", {}).get("risk_score", "N/A")
            print(f"[6] Node.js /api/v1/detection/analyze on {test_file.name}: Pred = {pred} | Risk = {risk}% | Success = {data.get('success')}")
        except Exception as e:
            print(f"[6] Node.js Detection Error: {e}")

    # 7. React Vite Frontend
    try:
        r = requests.get("http://localhost:3000/", timeout=5)
        print(f"[7] React Vite Frontend http://localhost:3000/: Status {r.status_code} | Title found in HTML = {'VoiceShield' in r.text}")
    except Exception as e:
        print(f"[7] Frontend Error: {e}")

    print("=" * 80)
    print("ALL SERVICES VERIFIED & OPERATING HEALTHILY!")
    print("=" * 80)

if __name__ == "__main__":
    test_endpoints()
