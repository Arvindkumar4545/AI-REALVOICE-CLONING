# VoiceShield Deployment Audit & Operations Guide

## 1. Deployment Architecture Summary

VoiceShield uses a distributed 3-tier deployment model:

```
[ Clients / Browsers ]
       │
       ▼
[ GitHub Pages ]  ── (Frontend SPA: React + Vite + Tailwind/Lucide)
       │
       ├── API calls (/api/v1/...) ──► [ Render: Backend API Gateway (Node.js/Express) ]
       │                                       │                     │
       │                                       ▼                     ▼
       │                          [ Render: PostgreSQL ]   [ Render: ML Service (FastAPI) ]
       │
       ▼
[ UptimeRobot (Keep-Awake Cron) ]
       ├── Pings Backend /api/v1/health/live every 5m
       └── Pings ML Service /live every 5m
```

1. **Frontend**: Hosted on **GitHub Pages** via automated GitHub Actions CI/CD.
2. **Backend API Gateway**: Hosted on **Render** as a Node.js web service.
3. **ML Inference Service**: Hosted on **Render** as a Python 3.12 FastAPI service.
4. **Database**: Managed PostgreSQL hosted on **Render** (free tier).
5. **Keep-Awake Monitoring**: Periodic HTTP checks via **UptimeRobot** (every 300 seconds) to prevent Render free-tier sleep.

---

## 2. Component Mapping & Repository Evidence

| Layer | Platform | Service Name | Path in Repo | Evidence |
|---|---|---|---|---|
| **Frontend** | GitHub Pages | Static Web App | `VoiceShieldData/frontend` | `.github/workflows/deploy.yml` |
| **Backend API** | Render Web Service | `voiceshield-backend` | `VoiceShieldData/backend` | `render.yaml` |
| **ML Engine** | Render Web Service | `voiceshield-ml` | `VoiceShieldData/ml-service` | `render.yaml` |
| **Database** | Render Managed DB | `voiceshield-db` | N/A (Managed Postgres) | `render.yaml` |
| **Keep-Awake** | UptimeRobot | Ping Monitors (300s) | Root | `setup_deployment.py` |

---

## 3. Frontend Deployment (GitHub Pages)

### 3.1 CI/CD Workflow
- **File:** [deploy.yml](file:///.github/workflows/deploy.yml)
- **Triggers:** Push to `main` branch with changes under `VoiceShieldData/frontend/**`, or manual dispatch (`workflow_dispatch`).
- **Build Environment:** Node.js 20 on `ubuntu-latest`.
- **Artifact:** Uploads `VoiceShieldData/frontend/dist` directly to GitHub Pages.

### 3.2 Environment Variables & Gotchas
The workflow injects environment variables during Vite's production build:
- `VITE_API_URL`: Backend API base URL.
- `VITE_ML_API_URL`: ML service base URL.

> [!IMPORTANT]
> **API Path Suffix Requirement:**
> The frontend client (`services/api.ts`) expects `VITE_API_URL` to end with `/api/v1`.
> 
> - **Correct:** `https://<backend-domain>.onrender.com/api/v1`
> - **Incorrect:** `https://<backend-domain>.onrender.com` (will cause 404 on API calls)

---

## 4. Backend and ML Deployment (Render Blueprint)

### 4.1 Blueprint Specification
The entire backend stack is orchestrated via [render.yaml](file:///render.yaml):

1. **`voiceshield-ml` (Python Web Service)**
   - Runtime: Python 3.12.0
   - Build: `cd VoiceShieldData/ml-service && pip install -r requirements.txt`
   - Start: `cd VoiceShieldData/ml-service && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Auto-deploy: Enabled on repository push.

2. **`voiceshield-backend` (Node.js Web Service)**
   - Runtime: Node 20
   - Build: `cd VoiceShieldData/backend && npm install && npm run build`
   - Start: `cd VoiceShieldData/backend && npm start`
   - Inter-service link: Auto-wires `ML_SERVICE_URL` from `voiceshield-ml:RENDER_EXTERNAL_URL`.
   - Database link: Auto-wires `DATABASE_URL` from `voiceshield-db`.
   - Security: Automatically provisions cryptographically secure `JWT_SECRET`.

3. **`voiceshield-db` (PostgreSQL Database)**
   - Plan: Free tier managed database.
   - DB Name: `voiceshield`

---

## 5. Health Checks & Keep-Awake Strategy

### 5.1 Service Health Endpoints

#### Backend Gateway (`VoiceShieldData/backend/src/routes/health.routes.ts`)
- `GET /api/v1/health` (Full dependency check: Postgres, Redis, ML Service, and Queue). Returns `503` if ML service is unreachable.
- `GET /api/v1/health/ready` (Readiness check: validates database pool).
- `GET /api/v1/health/live` (Liveness check: returns static `200 {"status":"alive"}`).

#### ML Inference Service (`VoiceShieldData/ml-service/app/main.py`)
- `GET /health` or `GET /api/v1/health` (Full system telemetry, GPU/CPU usage, model statuses).
- `GET /live` (Liveness check: returns `200 {"status":"alive"}`).
- `GET /ready` (Readiness check: confirms model manager initialization).

### 5.2 UptimeRobot Keep-Awake Configuration
To prevent Render's free tier from spinning down after 15 minutes of inactivity, [setup_deployment.py](file:///setup_deployment.py) automates monitor creation:

| Monitor Name | URL Endpoint | Interval | Purpose |
|---|---|---|---|
| **VoiceShield Backend (Keep-Alive)** | `https://<backend-url>/api/v1/health/live` | 300s (5m) | Wakes Render Node.js instance |
| **VoiceShield ML (Keep-Alive)** | `https://<ml-url>/live` | 300s (5m) | Wakes Render Python ML instance |

> [!TIP]
> Targeting `/live` instead of deep `/health` prevents cascading 503 alerts while ML models or database connections are warming up during cold starts.

---

## 6. Pre-Production Setup Checklist

### Step 1: Deploy to Render
1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Blueprint**.
3. Connect repository `Arvindkumar4545/AI-REALVOICE-CLONING`.
4. Render will detect [render.yaml](file:///render.yaml) and automatically provision:
   - `voiceshield-ml`
   - `voiceshield-backend`
   - `voiceshield-db`
5. Note the generated external URLs (e.g. `https://voiceshield-backend.onrender.com` or `https://ai-realvoice-cloning.onrender.com`).

### Step 2: Configure GitHub Repository
1. In your GitHub repo, go to **Settings** -> **Secrets and variables** -> **Actions**.
2. Add secrets:
   - `VITE_API_URL` = `https://<your-backend-app>.onrender.com/api/v1`
   - `VITE_ML_API_URL` = `https://<your-ml-app>.onrender.com`
3. Go to **Settings** -> **Pages**:
   - Source: **GitHub Actions**.
4. Push to `main` or manually trigger the **Deploy Frontend to GitHub Pages** workflow.

### Step 3: Run Keep-Awake Automation
Execute the automated provisioning script with your API credentials:

```bash
export RENDER_API_KEY="your_render_api_key"
export UPTIMEROBOT_API_KEY="your_uptimerobot_api_key"
export BACKEND_URL="https://<your-backend-url>/api/v1/health/live"
export ML_URL="https://<your-ml-url>/live"

python setup_deployment.py
```
