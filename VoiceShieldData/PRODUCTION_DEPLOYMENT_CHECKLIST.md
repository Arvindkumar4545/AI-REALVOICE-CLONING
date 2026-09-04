# VoiceShield Production Deployment Checklist

This checklist is for the real production setup using:

- GitHub for the frontend deployment
- Render for the backend and ML services
- UptimeRobot for the 5-minute wake-up pings

---

## 1. GitHub Frontend Setup

### 1.1 Confirm GitHub Pages is enabled
1. Open your GitHub repository.
2. Go to Settings > Pages.
3. Set Source to GitHub Actions.
4. Save the setting.

### 1.2 Add frontend deployment secrets
1. Open GitHub repository Settings > Secrets and variables > Actions.
2. Add these repository secrets:
   - `VITE_API_URL`
   - `VITE_ML_API_URL`
3. Set values to the production Render service URLs, for example:
   - `VITE_API_URL=https://voiceshield-backend.onrender.com/api/v1`
   - `VITE_ML_API_URL=https://voiceshield-ml.onrender.com`

### 1.3 Confirm workflow is active
1. Go to the Actions tab.
2. Make sure the workflow in `.github/workflows/deploy.yml` is enabled.
3. Push to the `main` branch or run the workflow manually.
4. Verify the GitHub Pages deployment completes successfully.

### 1.4 Expected result
The frontend should publish successfully to GitHub Pages and load without broken API URLs.

---

## 2. Render Backend and ML Service Setup

### 2.1 Connect the repo to Render
1. Sign in to Render.
2. Click New > Blueprint.
3. Connect the GitHub repository: `AI-REALVOICE-CLONING`.
4. Select the repo and confirm the blueprint is detected from `render.yaml`.

### 2.2 Confirm the services are created
Render should create these two web services:

- `voiceshield-ml`
- `voiceshield-backend`

### 2.3 Check backend environment variables
In the Render dashboard for the backend service, verify these values:

- `ML_SERVICE_URL` = the live Render URL for the ML service
- `DATABASE_URL` = the production database URL
- `JWT_SECRET` = a secure production secret
- `NODE_ENV` = `production`

Example:

```text
ML_SERVICE_URL=https://voiceshield-ml.onrender.com
DATABASE_URL=postgresql://...
JWT_SECRET=your_secure_secret
NODE_ENV=production
```

### 2.4 Check ML service environment variables
In the Render dashboard for the ML service, verify:

- `PYTHON_VERSION=3.12.0`
- any model path or required runtime variables

### 2.5 Deploy and verify
1. Trigger the Render deploy.
2. Wait for both services to become live.
3. Open the health endpoints.

Expected URLs:

```text
https://voiceshield-backend.onrender.com/api/v1/health
https://voiceshield-backend.onrender.com/api/v1/health/live
https://voiceshield-ml.onrender.com/health
https://voiceshield-ml.onrender.com/live
```

Expected behavior:
- backend responds with HTTP 200 or 503 depending on dependency state
- ML responds with a healthy status or readiness response

---

## 3. UptimeRobot Keep-Awake Setup

### 3.1 Create the backend monitor
1. Open UptimeRobot.
2. Click Add New Monitor.
3. Select Monitor Type: HTTP(s).
4. Set the URL to the backend health endpoint:

```text
https://voiceshield-backend.onrender.com/api/v1/health
```

5. Set interval to 5 minutes.
6. Use the value `300` seconds.
7. Save the monitor.

### 3.2 Create the ML monitor
1. Create a second monitor.
2. Set URL to:

```text
https://voiceshield-ml.onrender.com/health
```

3. Set interval to 5 minutes.
4. Save the monitor.

### 3.3 Recommended alert settings
- Enable alerting for downtime
- Add email or SMS notification
- Keep the monitor status active

This ensures Render web services are pinged every 5 minutes and do not go to sleep during idle periods.

---

## 4. Final Production Verification

### 4.1 Frontend check
Open the GitHub Pages URL and confirm the app loads.

### 4.2 Backend check
Request:

```bash
curl https://voiceshield-backend.onrender.com/api/v1/health
```

Expected:
- valid JSON response
- status should be `healthy`, `degraded`, or `unhealthy`

### 4.3 ML check
Request:

```bash
curl https://voiceshield-ml.onrender.com/health
```

Expected:
- JSON health payload or 200 OK response

### 4.4 UptimeRobot check
In the UptimeRobot dashboard, verify both monitors are online and have recent successful pings.

---

## 5. Production Deployment Summary

The final production flow is:

```text
GitHub frontend deploys to GitHub Pages
    -> front-end loads from static public hosting

Render backend service handles API traffic
    -> backend connects to ML through ML_SERVICE_URL

Render ML service runs inference model
    -> FastAPI health endpoint is exposed

UptimeRobot pings both Render URLs every 5 minutes
    -> backend and ML stay awake
    -> frontend remains functional without cold-start sleep issues
```

---

## 6. Final Sign-Off

Before launch, confirm all boxes are checked:

- [ ] GitHub Pages enabled
- [ ] Frontend secrets configured
- [ ] Render blueprint connected
- [ ] Backend deployed successfully
- [ ] ML service deployed successfully
- [ ] ML_SERVICE_URL set correctly
- [ ] DATABASE_URL set correctly
- [ ] JWT_SECRET set correctly
- [ ] UptimeRobot backend monitor added with 300-second interval
- [ ] UptimeRobot ML monitor added with 300-second interval
- [ ] Frontend loads from GitHub Pages
- [ ] Backend health endpoint responds
- [ ] ML health endpoint responds
- [ ] UptimeRobot shows both monitors online

Once all are complete, the project is ready for live production use.
