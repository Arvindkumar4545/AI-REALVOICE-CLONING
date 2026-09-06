# 🌐 VoiceShield AI — 100% Free Production Deployment Blueprint

> **Zero-Cost ($0 / ₹0) Deployment Without Render, Railway, or Koyeb**  
> Complete guide to deploying VoiceShield AI using **Fly.io**, **Zeabur**, **Glitch**, **Hugging Face Spaces (Unified 16GB RAM Full-Stack)**, **Vercel**, and **Oracle Cloud Always Free (24GB RAM)** with zero domain or server purchase costs.

---

## 🏆 Top Recommended Free Cloud Platforms (No Render / No Railway / No Koyeb)

```mermaid
flowchart TB
    User[🌍 Global Users / Judges] -->|HTTPS :443| Vercel[Frontend on Vercel\nvoiceshield.vercel.app\nFree Global CDN & SSL]
    Vercel -->|REST & WebSockets| FlyIO[Backend Gateway on Fly.io / Zeabur\nvoiceshield-api.fly.dev\nFree Docker Container & WebSockets]
    FlyIO -->|Internal AI REST| HF_ML[ML Microservice on Hugging Face Spaces\nvoiceshield-ml.hf.space\nFree 2 vCPU + 16GB RAM Container]
    FlyIO -->|TLS 5432| NeonDB[(PostgreSQL on Neon.tech / Supabase\nServerless Postgres 0.5GB Free)]
```

---

## 📊 Platform Comparison & Free Tier Breakdown

| Layer | Provider | Free Specs & Limits | Why It Is Great |
|---|---|---|---|
| **Frontend Workstation** | **Vercel** / **Cloudflare Pages** | Unlimited builds, Free SSL, Global Edge CDN | Instant deployments, 100% reliable uptime |
| **Backend API Gateway** | **Fly.io** | 3 Free VMs, 512MB RAM, Global Anycast, WebSockets | Native Docker runtime, `*.fly.dev` free SSL domain |
| **Backend Alternative** | **Zeabur** / **Glitch** | 1-Click GitHub Deploy, Free Subdomain | Zero config, instant Node.js support |
| **ML Microservice** | **Hugging Face Spaces** | **2 vCPU, 16 GB RAM**, Docker, Zero Sleep | Handles PyTorch models with massive free memory |
| **All-in-One Full Stack** | **Hugging Face Unified** | **16 GB RAM Container** hosting Backend + ML together | Run both backend + ML in 1 free space! |
| **Relational Database** | **Neon.tech** / **Supabase** | 0.5 GB Serverless PostgreSQL 16, pooled connection | Direct PostgreSQL 5432 with SSL |
| **Dedicated Cloud VPS** | **Oracle Cloud Always Free** | **4 Core CPU, 24 GB RAM, 200 GB Disk** | Run ALL 3 services on 1 free VPS forever |

---

## 🚀 Deployment Option 1: Fly.io (Best Free Docker Container Hosting)

**[Fly.io](https://fly.io)** lets you deploy Docker containers close to your users on their global Anycast edge network with free HTTPS.

### 🔹 Step 1: Install Fly CLI & Login
In your PowerShell terminal:
```powershell
iwr https://fly.io/install.ps1 -useb | iex
fly auth login
```

### 🔹 Step 2: Deploy Backend to Fly.io
1. Navigate to your backend folder:
   ```bash
   cd VoiceShieldData/backend
   ```
2. Initialize Fly app:
   ```bash
   fly launch --name voiceshield-api --region sin --no-deploy
   ```
3. Set your environment variables:
   ```bash
   fly secrets set DATABASE_URL="postgresql://voiceshield_owner:xyz@ep-cool-123.ap-southeast-1.aws.neon.tech/voiceshield?sslmode=require"
   fly secrets set ML_SERVICE_URL="https://YOUR_USER-voiceshield-ml.hf.space"
   fly secrets set JWT_SECRET="super_secret_production_jwt_key_2026"
   fly secrets set CORS_ORIGIN="*"
   fly secrets set PORT="4000"
   ```
4. Deploy the backend:
   ```bash
   fly deploy
   ```
5. Your backend is live at:
   ```text
   https://voiceshield-api.fly.dev
   ```

---

## 🚀 Deployment Option 2: Zeabur (1-Click GitHub Node.js Deploy)

**[Zeabur](https://zeabur.com)** is a modern, zero-config cloud platform designed for developers.

1. Go to **[https://zeabur.com](https://zeabur.com)** and log in with GitHub.
2. Click **Create Project** → **Deploy New Service** → **Git**.
3. Select your repository: `Arvindkumar4545/AI-REALVOICE-CLONING`.
4. Set:
   - **Root Directory**: `VoiceShieldData/backend`
   - **Port**: `4000`
5. Add Environment Variables (`DATABASE_URL`, `ML_SERVICE_URL`, `JWT_SECRET`, `CORS_ORIGIN=*`).
6. Click **Networking** → **Generate Domain** → Gives you:
   ```text
   https://voiceshield-api.zeabur.app
   ```

---

## 🚀 Deployment Option 3: Unified Hugging Face Space (Run Backend + ML in 1 Free 16GB Container)

Since Hugging Face Spaces provides **16 GB RAM and 2 vCPUs for free with zero sleep timeouts**, you can run both the Node.js Express backend and the FastAPI ML service in a single container!

1. Create a Space on **[https://huggingface.co/spaces](https://huggingface.co/spaces)** → Select **Docker** (Blank) → **CPU Basic (Free - 16 GB RAM)**.
2. Create `start.sh`:
   ```bash
   #!/bin/bash
   # Start ML Microservice on port 8000
   cd /app/ml-service && uvicorn app.main:app --host 127.0.0.1 --port 8000 &
   # Start Backend Gateway on port 7860 (Hugging Face default)
   cd /app/backend && node dist/src/server.js
   ```
3. Commit and push. Everything runs in one powerful 16GB RAM container at:
   ```text
   https://YOUR_USERNAME-voiceshield.hf.space
   ```

---

## 🚀 Deployment Option 4: Oracle Cloud "Always Free" (24GB RAM Dedicated Server)

If you want your own **dedicated Linux cloud server for $0 forever**:

* **Oracle Cloud Always Free Tier** gives:
  - **4 ARM Ampere Cores**
  - **24 GB RAM**
  - **200 GB Storage**
  - **10 TB Free Bandwidth / Month**
  - **Public Static IPv4 Address**

### How to Deploy in 3 Steps:
1. Create a free account at **[https://www.oracle.com/cloud/free/](https://www.oracle.com/cloud/free/)**.
2. Spin up an **Ubuntu 24.04 ARM Compute Instance** (Select `VM.Standard.A1.Flex` with 4 OCPU, 24GB RAM - $0.00/month).
3. SSH into your server and start with Docker Compose:
   ```bash
   git clone https://github.com/Arvindkumar4545/AI-REALVOICE-CLONING.git
   cd AI-REALVOICE-CLONING/VoiceShieldData
   docker compose -f docker-compose.prod.yml up -d
   ```
4. Everything (Frontend on `:3000`, Backend on `:4000`, ML Service on `:8000`, and Postgres on `:5432`) is online on your public IP with 24GB RAM and 0 limits!

---

## 🎨 Frontend Deployment on Vercel

1. Go to **[https://vercel.com](https://vercel.com)** → Click **Add New Project**.
2. Select your repository: `Arvindkumar4545/AI-REALVOICE-CLONING`.
3. Configure settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `VoiceShieldData/frontend`
4. Add Environment Variables:
   - `VITE_API_URL`: `https://voiceshield-api.fly.dev/api/v1` (or your Zeabur / Hugging Face URL)
   - `VITE_WS_URL`: `wss://voiceshield-api.fly.dev/ws`
5. Click **Deploy**. Your frontend is live with free global CDN:
   ```text
   https://ai-realvoice-cloning.vercel.app
   ```
