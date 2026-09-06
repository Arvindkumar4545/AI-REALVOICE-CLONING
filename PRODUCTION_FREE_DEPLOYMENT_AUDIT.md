# 🌐 VoiceShield AI — 100% Free Tier Production Deployment Audit & Blueprint

> **Zero-Cost ($0 / ₹0) Global Deployment Architecture**  
> Deploy the entire VoiceShield AI Multi-Microservice Platform to live public URLs with free HTTPS, custom subdomains, serverless PostgreSQL, and zero domain or server purchase costs.

---

## 🏗️ 1. Free Cloud Infrastructure Topology

```mermaid
flowchart TB
    User[🌍 Global Users / Judges] -->|HTTPS :443| Vercel[Frontend on Vercel\nvoiceshield.vercel.app\nFree Global CDN & SSL]
    Vercel -->|REST API & WebSockets| RenderBackend[Backend on Render / Railway\nvoiceshield-api.onrender.com\nNode.js + Express Gateway]
    RenderBackend -->|Internal REST| HF_ML[ML Service on Hugging Face Spaces\nvoiceshield-ml.hf.space\nFastAPI + PyTorch CPU 16GB RAM]
    RenderBackend -->|TLS 5432| NeonDB[(PostgreSQL on Neon.tech\nServerless Postgres 0.5GB Free\npgcrypto & schema.sql)]
```

---

## 📊 2. Service Provider Matrix (100% Free Plan Breakdown)

| Component | Free Platform | Free Specs / Limits | Free Public URL Example |
|---|---|---|---|
| **Frontend UI** | **Vercel** | 100 GB Bandwidth/mo, Global Edge CDN, Free SSL | `https://voiceshield-ai.vercel.app` |
| **Backend Gateway** | **Render** | 750 free instance hours/mo, TLS, WebSockets | `https://voiceshield-api.onrender.com` |
| **ML Inference Service** | **Hugging Face Spaces** | **2 vCPU, 16 GB RAM**, Unlimited uptime, Docker | `https://username-voiceshield-ml.hf.space` |
| **Relational Database** | **Neon.tech** / **Supabase** | 0.5 GB Storage, Serverless Branching, TLS 5432 | `postgresql://user:pass@ep-xyz.neon.tech/voiceshield` |
| **Instant Hackathon Live Tunnel** | **Cloudflare Tunnel** | Unlimited bandwidth, instant HTTPS from local PC | `https://voiceshield-live.trycloudflare.com` |

---

## 🚀 3. Step-by-Step Deployment Instructions

---

### 🔹 STEP 1: Deploy Free PostgreSQL Database (Neon.tech)

1. Go to **[https://neon.tech](https://neon.tech)** and sign up for a free account (using your GitHub account).
2. Click **Create Project** → Name: `voiceshield-db` → Region: `Asia Pacific (Singapore)` or `AWS US East`.
3. Copy the generated **Connection String**:
   ```text
   postgresql://voiceshield_owner:xyz123@ep-cool-snowflake-123456.ap-southeast-1.aws.neon.tech/voiceshield?sslmode=require
   ```
4. **Push your Database Schema**:
   - In Neon Dashboard, click on **SQL Editor**.
   - Open [`VoiceShieldData/database/schema/schema.sql`](file:///f:/AI-REALVOICE-CLONING/VoiceShieldData/database/schema/schema.sql) in your editor.
   - Copy and paste the entire SQL content into the Neon SQL Editor and click **Run**.
   - All 13 tables (users, detection results, caller threat profiles, evidence vault) will be created instantly.

---

### 🔹 STEP 2: Deploy ML Inference Service (Hugging Face Spaces — FREE 16GB RAM)

Hugging Face Spaces gives you **2 vCPUs and 16 GB RAM for free** without spinning down, which is ideal for PyTorch inference!

1. Go to **[https://huggingface.co/spaces](https://huggingface.co/spaces)** and sign up / log in.
2. Click **Create new Space**:
   - **Space Name**: `voiceshield-ml-service`
   - **License**: `mit`
   - **Select SDK**: **Docker** (Blank)
   - **Space Hardware**: **CPU Basic (Free - 2 vCPU · 16 GB RAM)**
   - **Privacy**: `Public`
3. In the created Space, create a `Dockerfile` with the following content:
   ```dockerfile
   FROM python:3.10-slim

   WORKDIR /app

   # Install libsndfile for audio decoding
   RUN apt-get update && apt-get install -y --no-install-recommends \
       build-essential \
       libsndfile1 \
       ffmpeg \
       && rm -rf /var/lib/apt/lists/*

   COPY VoiceShieldData/ml-service/requirements.txt /app/requirements.txt
   RUN pip install --no-cache-dir --upgrade pip && \
       pip install --no-cache-dir -r requirements.txt

   COPY VoiceShieldData/ml-service /app/ml-service
   COPY VoiceShieldData/models /app/models
   COPY VoiceShieldData/experiments /app/experiments

   WORKDIR /app/ml-service
   EXPOSE 7860

   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
   ```
4. Commit and push. Your ML Service will be live at:
   ```text
   https://YOUR_HF_USERNAME-voiceshield-ml-service.hf.space
   ```
   *Swagger Docs will be live at: `https://YOUR_HF_USERNAME-voiceshield-ml-service.hf.space/docs`*

---

### 🔹 STEP 3: Deploy Backend API Gateway (Render.com)

1. Go to **[https://render.com](https://render.com)** and sign in with GitHub.
2. Click **New +** → **Web Service**.
3. Connect your GitHub Repository: `https://github.com/Arvindkumar4545/AI-REALVOICE-CLONING`.
4. Configure the settings:
   - **Name**: `voiceshield-api`
   - **Region**: `Singapore` or `Oregon`
   - **Root Directory**: `VoiceShieldData/backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Under **Environment Variables**, add:
   ```env
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=postgresql://voiceshield_owner:xyz123@ep-cool-snowflake-123456.ap-southeast-1.aws.neon.tech/voiceshield?sslmode=require
   ML_SERVICE_URL=https://YOUR_HF_USERNAME-voiceshield-ml-service.hf.space
   JWT_SECRET=super_secret_production_jwt_voiceshield_key_2026_xyz
   CORS_ORIGIN=*
   RATE_LIMIT_MAX=200
   ```
6. Click **Deploy Web Service**. Your backend will be live at:
   ```text
   https://voiceshield-api.onrender.com
   ```

---

### 🔹 STEP 4: Deploy Frontend Web Application (Vercel)

1. Go to **[https://vercel.com](https://vercel.com)** and sign in with GitHub.
2. Click **Add New...** → **Project**.
3. Import your GitHub repository: `Arvindkumar4545/AI-REALVOICE-CLONING`.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click `Edit` and select `VoiceShieldData/frontend`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Under **Environment Variables**, add:
   ```env
   VITE_API_URL=https://voiceshield-api.onrender.com/api/v1
   VITE_WS_URL=wss://voiceshield-api.onrender.com/ws
   VITE_APP_ENV=production
   ```
6. Click **Deploy**.
7. In under 60 seconds, Vercel will give you a live production URL:
   ```text
   https://ai-realvoice-cloning.vercel.app
   ```

---

## ⚡ 4. Instant 60-Second Live Share Alternative (Cloudflare Tunnel)

If you are presenting to judges in an interview/hackathon right now and want to make your local laptop services live to the whole world in 60 seconds for free:

1. Download the official Cloudflare tunnel binary (single `.exe`, zero install required):
   ```powershell
   winget install Cloudflare.cloudflared
   ```
2. Run a free instant HTTPS tunnel for port 3000:
   ```powershell
   cloudflared tunnel --url http://localhost:3000
   ```
3. Cloudflare will print an instant public HTTPS URL:
   ```text
   https://voiceshield-telecom-xyz.trycloudflare.com
   ```
   Anyone in the world can immediately open this link on their mobile or desktop to test your live app!

---

## 🔒 5. Production Environment Variables Reference Table

### Backend (`VoiceShieldData/backend/.env`)
| Variable | Value for Production |
|---|---|
| `PORT` | `10000` (Render default) |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon.tech PostgreSQL connection URI with `sslmode=require` |
| `ML_SERVICE_URL` | Hugging Face Spaces URL (e.g. `https://user-voiceshield-ml.hf.space`) |
| `JWT_SECRET` | 64-character random secure key |
| `CORS_ORIGIN` | `*` (or your Vercel URL `https://ai-realvoice-cloning.vercel.app`) |

### Frontend (`VoiceShieldData/frontend/.env.production`)
| Variable | Value for Production |
|---|---|
| `VITE_API_URL` | `https://voiceshield-api.onrender.com/api/v1` |
| `VITE_WS_URL` | `wss://voiceshield-api.onrender.com/ws` |

---

## 🧪 6. Post-Deployment Verification Checklist

Once your URLs are deployed, run this quick checklist:

- [ ] **Frontend HTTPS**: Visit `https://your-app.vercel.app` — verify UI loads with dark/light navbar and fonts.
- [ ] **Backend Probe**: Visit `https://voiceshield-api.onrender.com/health` — should return `{"status": "healthy"}`.
- [ ] **ML Swagger Probe**: Visit `https://your-ml-space.hf.space/docs` — verify PyTorch model endpoints respond.
- [ ] **End-to-End Deepfake Test**: Record a 3-second sample on `/detect` — verify real-time prediction and spectral graph render.
- [ ] **Arrest Shield & Police PDF**: Visit `/digital-arrest-shield` — upload a sample notice and verify 1-click Section 63 BSA PDF generation.
- [ ] **Caller Intel Lookup**: Visit `/caller-intelligence` — search any number and verify live carrier telemetry.
