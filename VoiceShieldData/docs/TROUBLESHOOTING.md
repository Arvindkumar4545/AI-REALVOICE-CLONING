# VoiceShield Operational Troubleshooting Guide

This guide details resolutions for common environment, runtime, audio format, and connectivity issues.

---

## 1. Audio Upload & Microphone Issues

### Issue: `Unsupported audio format: .webm` or `AUDIO_DECODE_FAILED`
* **Root Cause**: Browser microphone records in WebM/Opus container format which requires container demuxing.
* **Resolution**:
  1. VoiceShield embeds PyAV (`av`) container decoding in `voice_shield/audio.py` and `backend/main.py`.
  2. Ensure `av` is installed in the virtual environment:
     ```powershell
     & f:\VoiceShieldData\.venv\Scripts\python.exe -m pip install av soundfile librosa
     ```

### Issue: `INSUFFICIENT_AUDIO` / `Audio too short`
* **Root Cause**: The uploaded recording has active speech under 0.50 seconds or is pure silence (> 95% silence ratio).
* **Resolution**: Record or provide at least 2–5 seconds of continuous natural speech.

---

## 2. API Gateway & Network Connectivity

### Issue: `Request failed with status code 400`
* **Root Cause**: Previously caused by unhandled validation exceptions.
* **Resolution**: The gateway returns structured JSON error responses:
  ```json
  {
    "success": false,
    "error": {
      "code": "UNSUPPORTED_AUDIO",
      "message": "File format not supported. Please upload WAV, MP3, FLAC, OGG, M4A, or WEBM.",
      "details": "Invalid magic bytes"
    }
  }
  ```

### Issue: `There was a network issue connecting to the server`
* **Root Cause**: FastAPI ML Service (Port 8000) or Node.js Gateway (Port 5000) is not running.
* **Resolution**:
  1. Verify service health:
     * ML Service: `http://127.0.0.1:8000/health`
     * Backend Gateway: `http://127.0.0.1:5000/health`
  2. Start all services using the commands in `PROJECT_STATUS.md`.

---

## 3. Database Connectivity & Resilient Fallback

### Issue: `PostgreSQL connection unavailable`
* **Behavior**: If PostgreSQL is not active locally, the Node.js API Gateway automatically activates the embedded resilient in-memory store so detection, user sessions, and reports continue functioning seamlessly without crashing.
* **To start PostgreSQL**:
  ```powershell
  docker compose up -d postgres redis
  ```
