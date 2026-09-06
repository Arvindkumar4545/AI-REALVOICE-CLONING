"""
VoiceShield AI - Local Deployment Verification & Integration Test Suite
Executes comprehensive end-to-end deployment testing across Frontend, Backend, and ML services.
"""
import sys
import os
import time
import json
import socket
import urllib.request
import urllib.error

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def check_port(host: str, port: int, timeout: float = 2.0) -> bool:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception:
        return False

def http_get(url: str, timeout: float = 5.0):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "VoiceShield-TestHarness/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status = response.status
            body = response.read().decode("utf-8")
            try:
                data = json.loads(body)
            except Exception:
                data = body
            return status, data
    except urllib.error.HTTPError as e:
        return e.code, str(e)
    except Exception as e:
        return 0, str(e)

def upload_audio_multipart(url: str, filepath: str, field_name: str = "audio", timeout: float = 10.0):
    boundary = "----WebKitFormBoundaryVoiceShieldTest"
    filename = os.path.basename(filepath)
    with open(filepath, "rb") as f:
        file_bytes = f.read()

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'
        f"Content-Type: audio/wav\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
            "User-Agent": "VoiceShield-TestHarness/1.0",
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, err_body
    except Exception as e:
        return 0, str(e)

def run_all_tests():
    print("=" * 65)
    print("VOICESHIELD AI — DEPLOYMENT VERIFICATION TEST SUITE")
    print("=" * 65)
    print(f"Target Root: {ROOT_DIR}")
    print(f"Timestamp:   {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 65)

    passed = 0
    failed = 0

    def assert_check(name: str, condition: bool, details: str = ""):
        nonlocal passed, failed
        if condition:
            print(f"  [PASS] {name} {details}")
            passed += 1
        else:
            print(f"  [FAIL] {name} {details}")
            failed += 1

    # 1. Artifact Verification
    print("\n[Stage 1] Build Artifacts Verification:")
    fe_dist = os.path.join(ROOT_DIR, "frontend", "dist", "index.html")
    be_dist = os.path.join(ROOT_DIR, "backend", "dist", "src", "server.js")
    ml_best = os.path.join(ROOT_DIR, "models", "voiceshield_best", "model.pt")
    calib = os.path.join(ROOT_DIR, "model_artifacts", "calibration.json")

    assert_check("Frontend Production Bundle", os.path.exists(fe_dist), f"({fe_dist})")
    assert_check("Backend TypeScript Dist", os.path.exists(be_dist), f"({be_dist})")
    assert_check("ML Champion Checkpoint", os.path.exists(ml_best), f"({ml_best})")
    assert_check("Calibration Artifacts", os.path.exists(calib), f"({calib})")

    # 2. Port Liveness
    print("\n[Stage 2] Service Port Liveness Verification:")
    ml_port = check_port("127.0.0.1", 8000)
    be_port = check_port("localhost", 4000)
    fe_port = check_port("localhost", 3000)

    assert_check("ML Service Port 8000", ml_port, "-> Listening")
    assert_check("Backend Gateway Port 4000", be_port, "-> Listening")
    assert_check("Frontend Dev Server Port 3000", fe_port, "-> Listening")

    # 3. HTTP Endpoints
    print("\n[Stage 3] Service Endpoint Health & Contract Verification:")
    if fe_port:
        st_fe, _ = http_get("http://localhost:3000")
        assert_check("Frontend Web App UI", st_fe == 200, f"(HTTP {st_fe})")

    if be_port:
        st_be_health, data_be_health = http_get("http://localhost:4000/health")
        assert_check("Backend /health", st_be_health == 200, f"(Status: {data_be_health.get('status', 'N/A')}, DB: {data_be_health.get('database', 'N/A')})")

        st_stats, data_stats = http_get("http://localhost:4000/api/v1/statistics")
        scans = data_stats.get("data", {}).get("totalScans", 0) if isinstance(data_stats, dict) else 0
        assert_check("Backend /api/v1/statistics", st_stats == 200, f"(Total Scans: {scans})")

        st_threats, data_threats = http_get("http://localhost:4000/api/v1/location/threats")
        assert_check("Backend /api/v1/location/threats", st_threats == 200, f"({len(data_threats) if isinstance(data_threats, list) else 0} locations)")

    if ml_port:
        st_ml_health, data_ml_health = http_get("http://127.0.0.1:8000/health")
        loaded = data_ml_health.get("model_loaded", False) if isinstance(data_ml_health, dict) else False
        assert_check("ML Service /health", st_ml_health == 200 and loaded, f"(Model Loaded: {loaded}, Device: {data_ml_health.get('device', 'cpu')})")

        st_ready, _ = http_get("http://127.0.0.1:8000/ready")
        assert_check("ML Readiness Probe /ready", st_ready == 200, f"(HTTP {st_ready})")

        st_models, data_models = http_get("http://127.0.0.1:8000/api/v1/models")
        sub_count = len(data_models.get("models", [])) if isinstance(data_models, dict) else 0
        assert_check("ML Sub-models Catalog", st_models == 200 and sub_count == 6, f"(Sub-models: {sub_count}/6 active)")

    # 4. End-to-End Live Audio Inference Pipeline
    print("\n[Stage 4] End-to-End Audio Inspection Inference Pipeline:")
    sample_wav = os.path.join(ROOT_DIR, "temp_test.wav")
    if not os.path.exists(sample_wav):
        sample_wav = os.path.join(os.path.dirname(ROOT_DIR), "temp_test.wav")

    if os.path.exists(sample_wav):
        print(f"  Using test audio: {sample_wav}")
        # Test ML direct inference
        st_pred, data_pred = upload_audio_multipart("http://127.0.0.1:8000/predict", sample_wav, field_name="file")
        pred_label = data_pred.get("prediction", "UNKNOWN") if isinstance(data_pred, dict) else "ERROR"
        risk = data_pred.get("risk_score", 0.0) if isinstance(data_pred, dict) else 0.0
        time_ms = data_pred.get("processing_time_ms", 0.0) if isinstance(data_pred, dict) else 0.0
        assert_check("ML Direct /predict", st_pred == 200, f"(Verdict: {pred_label}, Risk: {risk}%, Latency: {time_ms}ms)")

        # Test Backend Gateway /api/v1/detection?sync=true
        st_gate, data_gate = upload_audio_multipart("http://localhost:4000/api/v1/detection?sync=true", sample_wav, field_name="audio")
        gate_success = data_gate.get("success", False) if isinstance(data_gate, dict) else False
        gate_res = data_gate.get("data", {}) if isinstance(data_gate, dict) else {}
        gate_pred = gate_res.get("prediction", "N/A")
        assert_check("Backend Gateway /api/v1/detection", st_gate == 200 and gate_success, f"(Verdict: {gate_pred}, RequestId: {gate_res.get('requestId', 'N/A')[:18]}...)")
    else:
        print("  [WARN] Test audio sample temp_test.wav not found; skipping binary upload test.")

    # 5. Summary
    print("\n" + "=" * 65)
    print(f"DEPLOYMENT TEST SUMMARY: {passed} PASSED | {failed} FAILED")
    print("=" * 65)

    if failed == 0:
        print("RESULT: ALL DEPLOYMENT CHECKS PASSED SUCCESSFULLY. SYSTEM IS OPERATIONAL.")
        return 0
    else:
        print(f"RESULT: {failed} CHECKS FAILED. INVESTIGATE LOGS.")
        return 1

if __name__ == "__main__":
    sys.exit(run_all_tests())
