# VoiceShield - Real-Time AI Voice Deepfake Detection & Cloning Defense

VoiceShield is an end-to-end platform for detecting synthetic audio, deepfakes, and voice clones in real-time and batch workflows. It provides an intuitive web interface, a robust API gateway, and high-performance ML inference models.

---

## 🏗 Architecture Overview

The system is deployed using a modular 3-tier architecture:

```
[ Frontend: GitHub Pages ]  ──►  [ Backend API Gateway: Render ]  ──►  [ ML Inference: Render ]
                                                │
                                                ▼
                                    [ Managed PostgreSQL: Render ]
```

1. **Frontend (`VoiceShieldData/frontend`)**:
   - Modern Single Page Application built with React, Vite, TypeScript, and Tailwind CSS.
   - Continuous deployment via GitHub Actions to GitHub Pages.
2. **Backend API Gateway (`VoiceShieldData/backend`)**:
   - Express & TypeScript API gateway managing authentication, history, telemetry, and request orchestration.
   - Deployed on Render with automated database connections.
3. **ML Service (`VoiceShieldData/ml-service`)**:
   - Python 3.12 FastAPI microservice serving deepfake detection models, feature extractors, and streaming forensics.
4. **Resilience & Keep-Awake**:
   - Automated periodic monitoring via UptimeRobot to keep free-tier instances warm.

For an in-depth breakdown of the deployment topology and configuration, see [DEPLOYMENT_AUDIT.md](DEPLOYMENT_AUDIT.md).

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Python 3.12+
- PostgreSQL (optional, embedded fallback mode supported)

### 1. ML Service
```bash
cd VoiceShieldData/ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Backend API
```bash
cd VoiceShieldData/backend
npm install
npm run dev
```

### 3. Frontend App
```bash
cd VoiceShieldData/frontend
npm install
npm run dev
```

---

## 🌐 Production Deployment

- **Blueprint Deployment**: Deploy the backend, ML service, and database in one click using Render's Blueprint with [`render.yaml`](render.yaml).
- **Frontend Deployment**: Automatic deployment via GitHub Actions defined in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
- **Keep-Awake Setup**: Run [`setup_deployment.py`](setup_deployment.py) to automatically provision UptimeRobot pings.

Detailed operations and secrets configuration: [DEPLOYMENT_AUDIT.md](DEPLOYMENT_AUDIT.md).