# VoiceShield Deployment Audit

## 1. Deployment Architecture Summary

This project uses a 3-part deployment model:

1. Frontend: GitHub + GitHub Pages
2. Backend API: Render
3. ML service: Render
4. Wake-up monitoring: UptimeRobot pinging every 5 minutes

This architecture matches the repository setup:

- GitHub Actions workflow deploys the frontend from `VoiceShieldData/frontend` to GitHub Pages.
- `render.yaml` defines the backend and ML web services in Render.
- UptimeRobot is used to keep Render services from sleeping by sending periodic HTTP checks every 300 seconds.

---

## 2. Current Deployment Mapping

| Layer | Platform | Purpose | Evidence in repo |
|---|---|---|---|
| Frontend | GitHub Pages | Public UI and app shell | `.github/workflows/deploy.yml` |
| Backend API | Render | Node.js API gateway | `render.yaml` |
| ML Service | Render | Python FastAPI inference service | `render.yaml` |
| Health monitoring | UptimeRobot | Prevent Render free-tier sleep | `setup_deployment.py` |

---

## 3. Frontend Deployment: GitHub Pages

### 3.1 Deployment source
The frontend is deployed from the repository using GitHub Actions.

Workflow file:
- `.github/workflows/deploy.yml`

This workflow:
- triggers on pushes to `main`
- watches changes inside `VoiceShieldData/frontend/**`
- installs frontend dependencies
- builds the Vite app
- uploads the `dist` output to GitHub Pages
- deploys to the GitHub Pages environment

### 3.2 Frontend environment variables
The deployment workflow sets:

- `VITE_API_URL` = backend Render URL
- `VITE_ML_API_URL` = ML Render URL

Default values in the workflow are:

- Backend: `https://voiceshield-backend.onrender.com`
- ML Service: `https://voiceshield-ml.onrender.com`

This means the frontend will point to the Render services once they are live.

### 3.3 Frontend build command
From `VoiceShieldData/frontend/package.json`:

```bash
npm ci
npm run build
```

This is the production build that GitHub Pages serves.

---

## 4. Backend and ML Deployment: Render

### 4.1 Render blueprint
The project contains a Render blueprint in:

- `render.yaml`

This file defines two web services:

1. `voiceshield-ml`
   - Type: `web`
   - Runtime: Python
   - Build command:
     ```bash
     cd VoiceShieldData/ml-service && pip install -r requirements.txt
     ```
   - Start command:
     ```bash
     cd VoiceShieldData/ml-service && uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - Purpose: ML inference API and model hosting

2. `voiceshield-backend`
   - Type: `web`
   - Runtime: Node.js
   - Build command:
     ```bash
     cd VoiceShieldData/backend && npm install && npm run build
     ```
   - Start command:
     ```bash
     cd VoiceShieldData/backend && npm start
     ```
   - Purpose: API gateway, auth, detection endpoints, and calls to ML service

### 4.2 Render service connection
The backend service is configured to connect to the ML service via the environment variable:

```yaml
ML_SERVICE_URL
```

In the blueprint, this value is inherited from the `voiceshield-ml` service using Render's service variable linkage:

```yaml
- key: ML_SERVICE_URL
  fromService:
    type: web
    name: voiceshield-ml
    envVarKey: RENDER_EXTERNAL_URL
```

This means the Node backend will talk to the ML service URL exposed by Render.

---

## 5. Service Health Endpoints

### 5.1 Backend health
The backend exposes health checks from `VoiceShieldData/backend/src/routes/health.routes.ts`:

- `/api/v1/health`
- `/api/v1/health/ready`
- `/api/v1/health/live`

The route checks:

- database status
- queue depth
- ML service health
- Redis status if enabled

### 5.2 ML health
The ML service exposes health endpoints from `VoiceShieldData/ml-service/app/main.py`:

- `/health`
- `/ready`
- `/live`

These are the endpoints Render and UptimeRobot should monitor.

---

## 6. Why UptimeRobot Is Used

Render free-tier web services can sleep after inactivity. To prevent this, the project uses UptimeRobot to ping the deployed services every 5 minutes.

This is documented in:

- `setup_deployment.py`

The script creates UptimeRobot monitors with:

```python
interval = 300
```

This equals 300 seconds, or every 5 minutes.

### 6.1 Purpose
UptimeRobot sends an HTTP request to each Render service URL so that the Render instance stays awake. This keeps:

- the backend service active
- the ML service active
- the app responsive for browser API calls
- the app from losing cold starts during idle periods

### 6.2 Recommended monitor targets
Use the Render external URLs, for example:

- Backend health URL:
  ```text
  https://voiceshield-backend.onrender.com/api/v1/health
  ```

- ML health URL:
  ```text
  https://voiceshield-ml.onrender.com/health
  ```

### 6.3 UptimeRobot settings
Recommended settings:

| Monitor | Type | URL | Interval | Purpose |
|---|---|---|---|---|
| VoiceShield Backend | HTTP(S) | `https://voiceshield-backend.onrender.com/api/v1/health` | 300 sec | Keep backend awake |
| VoiceShield ML | HTTP(S) | `https://voiceshield-ml.onrender.com/health` | 300 sec | Keep ML service awake |

A good configuration is:

- Type: HTTP(s)
- Method: GET
- Interval: 5 minutes
- Alerting: enabled if the service fails
- Include a successful status check such as `200 OK`

---

## 7. Operational Audit Result

### 7.1 Architecture compliance
The project is correctly structured for the intended deployment architecture:

- Frontend is deployed via GitHub Pages from GitHub Actions.
- Backend and ML services are deployed to Render using the repo blueprint.
- UptimeRobot is configured to ping Render services every 5 minutes to prevent idle sleep.

### 7.2 What is required in production
Before the deployment is considered fully operational, the team must confirm these values in the GitHub and Render dashboards:

1. GitHub repository secrets:
   - `VITE_API_URL`
   - `VITE_ML_API_URL`

2. Render service environment variables:
   - `ML_SERVICE_URL`
   - `DATABASE_URL`
   - `JWT_SECRET`
   - any other required runtime variables

3. UptimeRobot monitors:
   - backend monitor added with 300-second interval
   - ML monitor added with 300-second interval

---

## 8. Deployment Flow

```text
Developer pushes frontend changes
    -> GitHub Actions builds frontend
    -> GitHub Pages publishes frontend

Render detects repo blueprint
    -> creates/deploys voiceshield-ml
    -> creates/deploys voiceshield-backend
    -> backend points to ML via ML_SERVICE_URL

UptimeRobot pings every 5 minutes
    -> backend URL wakes Render backend
    -> ML URL wakes Render ML service
    -> app remains available without sleeping
```

---

## 9. Audit Conclusion

This deployment pattern is valid and aligned with the repository configuration:

- GitHub hosts the frontend
- Render hosts the backend and ML services
- UptimeRobot keeps the Render services awake by sending data every 5 minutes

The deployment is not just a static site deployment; it is a multi-service app with a public frontend and two backend services kept alive by periodic HTTP checks.

The main operational requirement is to set the real live Render URLs in GitHub secrets and confirm the Render services are reachable at their final production domains.
