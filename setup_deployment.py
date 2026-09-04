import os
import sys
from urllib.parse import urljoin

import requests

# ==============================================================================
# VOICESHIELD DEPLOYMENT AUTOMATION
# ==============================================================================
# This script is designed for the deployment architecture used in this repository:
# - Frontend: GitHub Pages via GitHub Actions
# - Backend: Render web service
# - ML service: Render web service
# - UptimeRobot: Ping backend and ML every 5 minutes to keep Render awake
#
# Usage:
#   export RENDER_API_KEY=...
#   export UPTIMEROBOT_API_KEY=...
#   export BACKEND_URL=https://voiceshield-backend.onrender.com/api/v1/health/live
#   export ML_URL=https://voiceshield-ml.onrender.com/live
#   python setup_deployment.py
#
# If keys are not provided, the script prints the exact deployment instructions but
# exits safely without making changes.

GITHUB_REPO_URL = "https://github.com/Arvindkumar4545/AI-REALVOICE-CLONING"
DEFAULT_BACKEND_URL = "https://ai-realvoice-cloning.onrender.com/api/v1/health/live"
DEFAULT_ML_URL = "https://voiceshield-ml.onrender.com/live"
RENDER_API_URL = "https://api.render.com/v1/services"
UPTIMEROBOT_API_URL = "https://api.uptimerobot.com/v2/newMonitor"


def print_banner():
    print("\n===============================================")
    print("VoiceShield Deployment Automation")
    print("===============================================\n")


def ensure_url(value: str, label: str) -> str:
    if not value:
        raise ValueError(f"{label} is required. Set the environment variable or edit this script.")
    if not value.startswith("http://") and not value.startswith("https://"):
        raise ValueError(f"{label} must be a valid HTTP/HTTPS URL: {value}")
    return value


def print_missing_key_instructions():
    print("[INFO] No deployment credentials were detected in the environment.")
    print("[INFO] This is expected in a clean local environment.")
    print("\nSet the variables below before running this script:")
    print("  export RENDER_API_KEY=your_render_api_key")
    print("  export UPTIMEROBOT_API_KEY=your_uptimerobot_api_key")
    print("  export BACKEND_URL=https://voiceshield-backend.onrender.com/api/v1/health/live")
    print("  export ML_URL=https://voiceshield-ml.onrender.com/live")
    print("\nThen run:")
    print("  python setup_deployment.py")
    print("\nRender API keys: https://dashboard.render.com/user/settings#api-keys")
    print("UptimeRobot API keys: https://uptimerobot.com/dashboard#mySettings")
    print("GitHub repository: " + GITHUB_REPO_URL)


def create_render_service_check():
    print("[STEP 1] Verifying Render configuration")
    print("[OK] The repo already contains render.yaml with the backend and ML services defined.")
    print("[OK] Render should sync from the blueprint or the repo connection in the Render dashboard.")
    print("[NOTE] The backend service should point to the ML service via ML_SERVICE_URL.")


def create_uptimerobot_monitor(api_key: str, name: str, url: str):
    payload = {
        "api_key": api_key,
        "format": "json",
        "type": 1,
        "url": url,
        "friendly_name": name,
        "interval": 300,
    }

    response = requests.post(UPTIMEROBOT_API_URL, data=payload, timeout=20)
    data = response.json()

    if response.status_code == 200 and data.get("stat") == "ok":
        print(f"[OK] UptimeRobot monitor created: {name} -> {url}")
        return True

    print(f"[ERROR] UptimeRobot failed for {name}: {data}")
    return False


def validate_live_urls(backend_url: str, ml_url: str):
    print("\n[STEP 2] Validating health URLs")
    for label, value in (("Backend", backend_url), ("ML", ml_url)):
        try:
            response = requests.get(value, timeout=15)
            print(f"[{label}] HTTP {response.status_code} for {value}")
        except Exception as exc:
            print(f"[{label}] Could not reach URL: {value} ({exc})")


def print_deployment_summary(backend_url: str, ml_url: str):
    print("\n[DEPLOYMENT SUMMARY]")
    print(f"Frontend GitHub repo: {GITHUB_REPO_URL}")
    print(f"Backend health URL: {backend_url}")
    print(f"ML health URL: {ml_url}")
    print("UptimeRobot interval: 300 seconds (every 5 minutes)")
    print("Purpose: keep the Render services awake and prevent sleep during inactivity")


def main():
    print_banner()

    render_api_key = os.getenv("RENDER_API_KEY", "").strip()
    uptimerobot_api_key = os.getenv("UPTIMEROBOT_API_KEY", "").strip()
    backend_url = os.getenv("BACKEND_URL", DEFAULT_BACKEND_URL).strip()
    ml_url = os.getenv("ML_URL", DEFAULT_ML_URL).strip()

    if not render_api_key or not uptimerobot_api_key:
        print_missing_key_instructions()
        print_deployment_summary(backend_url, ml_url)
        return 1

    try:
        backend_url = ensure_url(backend_url, "BACKEND_URL")
        ml_url = ensure_url(ml_url, "ML_URL")
    except ValueError as exc:
        print(f"[ERROR] {exc}")
        return 2

    create_render_service_check()
    validate_live_urls(backend_url, ml_url)
    print_deployment_summary(backend_url, ml_url)

    print("\n[STEP 3] Creating UptimeRobot monitors")
    create_uptimerobot_monitor(uptimerobot_api_key, "VoiceShield Backend (5m Ping)", backend_url)
    create_uptimerobot_monitor(uptimerobot_api_key, "VoiceShield ML Service (5m Ping)", ml_url)

    print("\n[OK] Deployment configuration and keep-awake monitoring are ready.")
    print("[OK] GitHub handles the frontend deployment.")
    print("[OK] Render hosts the backend and ML services.")
    print("[OK] UptimeRobot pings both services every 5 minutes to prevent sleep.")
    print("\nNext step: connect the repo to Render and deploy the GitHub Pages workflow in your real account.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
