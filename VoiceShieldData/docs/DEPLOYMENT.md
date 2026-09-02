# VoiceShield Deployment & Production Operations

## 1. Quick Start via Docker Compose

```bash
# 1. Configure environment
cp .env.example .env

# 2. Build and launch all services
docker compose up -d --build

# 3. Verify health
docker compose ps
curl http://localhost:8000/api/v1/health
curl http://localhost:5000/health
```

---

## 2. Service Port Allocations

| Service | Container Name | Port | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | `voiceshield-frontend` | `3000:80` | React + Three.js 3D Web UI |
| **API Gateway** | `voiceshield-backend` | `5000:5000` | Node.js Express Gateway & Auth |
| **ML Service** | `voiceshield-ml` | `8000:8000` | FastAPI PyTorch Multi-Model Ensemble |
| **Database** | `voiceshield-postgres` | `5432:5432` | PostgreSQL persistence & audit store |
| **Cache & Queue** | `voiceshield-redis` | `6379:6379` | Redis session store & async queue |
