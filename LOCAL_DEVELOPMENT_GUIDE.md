# VoiceShield Local Development & Operations Guide

This guide describes how to run, configure, test, and troubleshoot the VoiceShield AI platform on a local workstation.

---

## 1. System Architecture

```
                 LOCAL WORKSTATION

        ┌──────────────────────────┐
        │       React/Vite         │
        │     Frontend App         │
        │    localhost:3000        │
        └────────────┬─────────────┘
                     │ HTTP / WS
                     ▼
        ┌──────────────────────────┐
        │      Node/Express        │
        │      Backend API         │
        │    localhost:4000        │
        └────────────┬─────────────┘
                     │ HTTP API
                     ▼
        ┌──────────────────────────┐
        │      FastAPI / PyTorch   │
        │      VoiceShield ML      │
        │    localhost:8000        │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │       Database           │
        │    PostgreSQL:5432       │
        │ (or Resilient Fallback)  │
        └──────────────────────────┘
```

---

## 2. Port Allocation & Configuration

| Service | Runtime | Local Address | Health Check | Description |
|---|---|---|---|---|
| **Frontend** | Node 20 / Vite | `http://localhost:3000` | N/A | React SPA UI |
| **Backend API** | Node 20 / Express | `http://localhost:4000` | `http://localhost:4000/api/v1/health` | API gateway & auth |
| **ML Service** | Python 3.12 / FastAPI | `http://127.0.0.1:8000` | `http://127.0.0.1:8000/health` | AudioSpoofNet inference |
| **Database** | PostgreSQL | `localhost:5432` | Via Backend `/api/v1/health` | Relational data store |

---

## 3. Environment Variables

### Frontend (`VoiceShieldData/frontend/.env.local`)
```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_APP_NAME=VoiceShield AI
VITE_APP_VERSION=1.0.0
```

### Backend (`VoiceShieldData/backend/.env`)
Create `VoiceShieldData/backend/.env` from the provided template:
```env
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
CORS_ORIGIN=*

# JWT Authentication
JWT_SECRET=local-development-secret-key-change-me
JWT_REFRESH_SECRET=local-development-refresh-secret-key

# Database (PostgreSQL - Optional)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/voiceshield
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis (Optional)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false

# ML Inference Microservice
ML_SERVICE_URL=http://127.0.0.1:8000
ML_TIMEOUT_MS=30000

# File Upload Storage
UPLOAD_DIR=uploads
MAX_FILE_SIZE=52428800
```

> [!NOTE]
> **Zero-Dependency Database Resilience:**
> If you do not have PostgreSQL running locally, the backend automatically activates an embedded in-memory resilient store. No manual setup or database installation is required to start developing immediately.

---

## 4. Starting the Services

### Option A: Automated One-Command Startup
On Windows PowerShell:
```powershell
.\start-local.ps1
```

### Option B: Manual Multi-Terminal Startup

#### 1. ML Inference Service
```bash
cd VoiceShieldData/ml-service
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

#### 2. Backend API Gateway
```bash
cd VoiceShieldData/backend
npm install
npm run dev
```

#### 3. Frontend Web App
```bash
cd VoiceShieldData/frontend
npm install
npm run dev
```

Open your browser at **`http://localhost:3000`**.

---

## 5. Health Verification Endpoints

Verify all components are active:

```bash
# ML Service Liveness
curl http://127.0.0.1:8000/live

# ML Service Full System Health
curl http://127.0.0.1:8000/health

# Backend API Gateway Liveness
curl http://localhost:4000/api/v1/health/live

# Backend API Gateway Full Dependency Health
curl http://localhost:4000/api/v1/health
```

---

## 6. Testing

### Run Backend Tests
```bash
cd VoiceShieldData/backend
npm run test
```

### Run Frontend Typecheck & Build
```bash
cd VoiceShieldData/frontend
npm run build
```

### Run ML Inference Service Tests
```bash
cd VoiceShieldData/ml-service
pytest
```

### Run Audio Detection Integration Test
```bash
python -c "
import requests
url = 'http://127.0.0.1:4000/api/v1/detection?sync=true'
with open('temp_test.wav', 'rb') as f:
    r = requests.post(url, files={'audio': ('test.wav', f, 'audio/wav')})
    print(r.status_code, r.json())
"
```

---

## 7. Troubleshooting

### Port Conflicts
If port 3000, 4000, or 8000 is occupied:
- Find the process using PowerShell:
  ```powershell
  Get-NetTCPConnection -LocalPort 3000, 4000, 8000
  ```
- Terminate the conflicting PID:
  ```powershell
  Stop-Process -Id <PID> -Force
  ```

### ML Service Model Weight Not Found
- Ensure the model checkpoint exists at `VoiceShieldData/models/voiceshield_best/model.pt`.
- The ML service automatically falls back to initialized baseline weights if the checkpoint is absent, allowing development without crashing.

### CORS Errors in Browser Console
- The backend defaults `CORS_ORIGIN=*` in development mode.
- Ensure the frontend sends requests to `http://localhost:4000/api/v1`.
