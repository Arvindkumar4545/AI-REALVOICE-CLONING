# VoiceShield - Real-Time AI Voice Deepfake Detection & Defense

VoiceShield is an end-to-end platform for detecting synthetic audio, deepfakes, and voice clones in real-time and batch workflows. It provides an intuitive web interface, a robust API gateway, and high-performance machine learning inference models.

---

## 🏗 Architecture (Local-First)

VoiceShield is built on a clean, decoupled local-first service architecture:

```
                    LOCAL WORKSTATION
                    
┌───────────────────────────────────────────────────────┐
│                 React / Vite Frontend                 │
│                 http://localhost:3000                 │
└──────────────────────────┬────────────────────────────┘
                           │ API Requests & WebSocket
                           ▼
┌───────────────────────────────────────────────────────┐
│            Node.js / Express API Gateway              │
│                 http://localhost:4000                 │
└──────────────┬─────────────────────────┬──────────────┘
               │                         │
               ▼                         ▼
┌──────────────────────────────┐  ┌─────────────────────┐
│  Python / FastAPI ML Service │  │  Local PostgreSQL   │
│     http://127.0.0.1:8000    │  │ (or Embedded Store) │
└──────────────────────────────┘  └─────────────────────┘
```

1. **Frontend (`VoiceShieldData/frontend`)**:
   - Single Page Application built with React, Vite, TypeScript, Tailwind CSS, and Lucide icons.
   - Interactive forensic dashboards, live threat map, and audio analysis visualizers.
2. **Backend API Gateway (`VoiceShieldData/backend`)**:
   - Express & TypeScript service managing authentication, detection queues, telemetry, and forensic analysis.
   - Real-time WebSocket notifications and embedded resilient data storage fallback.
3. **ML Service (`VoiceShieldData/ml-service`)**:
   - High-performance Python 3.12 FastAPI microservice serving the AudioSpoofNet deepfake detection model and physical signal forensics.
4. **Database**:
   - Local PostgreSQL on port `5432` with automatic fallback to an embedded in-memory resilient store when PostgreSQL is offline.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- **Node.js**: v20 or higher
- **Python**: v3.12 or higher
- **Git**: For version control

### One-Command Local Startup (PowerShell)
```powershell
.\start-local.ps1
```

Or start the services individually across separate terminal windows:

### Terminal 1: ML Inference Service
```bash
cd VoiceShieldData/ml-service
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Terminal 2: Backend API Gateway
```bash
cd VoiceShieldData/backend
npm install
npm run dev
```

### Terminal 3: Frontend Web Application
```bash
cd VoiceShieldData/frontend
npm install
npm run dev
```

The application will be available at: **[http://localhost:3000](http://localhost:3000)**

---

## 🔍 Health & Diagnostics Endpoints

All services expose independent health endpoints for diagnostics:

- **Frontend**: `http://localhost:3000`
- **Backend API Live**: `http://localhost:4000/api/v1/health/live`
- **Backend API Full Health**: `http://localhost:4000/api/v1/health`
- **ML Service Live**: `http://127.0.0.1:8000/live`
- **ML Service System Health**: `http://127.0.0.1:8000/health`

For complete configuration instructions, testing guides, and environment variables, see [LOCAL_DEVELOPMENT_GUIDE.md](LOCAL_DEVELOPMENT_GUIDE.md).