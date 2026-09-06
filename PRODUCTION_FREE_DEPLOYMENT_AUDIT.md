# 🌐 VoiceShield AI — Alternative 100% Free Production Deployment Blueprint

> **Zero-Cost ($0 / ₹0) Deployment Without Render & Railway**  
> Complete guide to deploying VoiceShield AI using **Koyeb**, **Hugging Face Spaces**, **Vercel**, **Oracle Cloud Always Free (24GB RAM)**, and **Cloudflare Zero Trust** with zero domain or server purchase costs.

---

## 🏆 Top Recommended Free Cloud Platforms (No Render / No Railway)

```mermaid
flowchart TB
    User[🌍 Global Users / Judges] -->|HTTPS :443| Vercel[Frontend on Vercel\nvoiceshield.vercel.app\nFree Global CDN & SSL]
    Vercel -->|REST & WebSockets| Koyeb[Backend Gateway on Koyeb / Fly.io\nvoiceshield-api.koyeb.app\nFree Micro Instance & Global Edge]
    Koyeb -->|Internal AI REST| HF_ML[ML Microservice on Hugging Face Spaces\nvoiceshield-ml.hf.space\nFree 2 vCPU + 16GB RAM Container]
    Koyeb -->|TLS 5432| NeonDB[(PostgreSQL on Neon.tech / Supabase\nServerless Postgres 0.5GB Free)]
```

---

## 📊 Platform Comparison & Resource Allocation

| Layer | Provider | Free Specs & Limits | Why It Is Better |
|---|---|---|---|
| **Frontend Workstation** | **Vercel** / **Cloudflare Pages** | Unlimited builds, Free SSL, Global Edge CDN | Instant deployments, 100% reliable uptime |
| **Backend API Gateway** | **Koyeb** | Free nano/micro container, Global Edge, WebSockets | No 15-minute sleep like Render, fast boot |
| **ML Inference Service** | **Hugging Face Spaces** | **2 vCPU, 16 GB RAM**, Docker, Zero Sleep | Handles PyTorch models with massive free memory |
| **Relational Database** | **Neon.tech** / **Supabase** | 0.5 GB Serverless PostgreSQL 16, pooled connection | Direct PostgreSQL 5432 with SSL |
| **Full-Stack Powerhouse VPS** | **Oracle Cloud Always Free** | **4 Core CPU, 24 GB RAM, 200 GB Disk** | Run ALL 3 services on 1 free VPS forever |

---

## 🚀 Architecture 1: The Modern Trio (Vercel + Koyeb + Hugging Face)

---

### 🔹 STEP 1: Deploy Database on Neon.tech (PostgreSQL)

1. Sign up for free at **[https://neon.tech](https://neon.tech)** with your GitHub.
2. Click **Create Project** → Name: `voiceshield` → Select Region `Asia Pacific (Singapore)` or `US East`.
3. Copy your pooled Connection String:
   ```text
   postgresql://voiceshield_owner:xyz123@ep-cool-snowflake-123456.ap-southeast-1.aws.neon.tech/voiceshield?sslmode=require
   ```
4. Click **SQL Editor** in Neon, paste the contents of [`VoiceShieldData/database/schema/schema.sql`](file:///f:/AI-REALVOICE-CLONING/VoiceShieldData/database/schema/schema.sql), and click **Run**.

---

### 🔹 STEP 2: Deploy ML Microservice on Hugging Face Spaces (FREE 16GB RAM)

Hugging Face Spaces is the premier free host for PyTorch and AI models because it offers **16 GB RAM for free** with no sleep timeouts.

1. Go to **[https://huggingface.co/spaces](https://huggingface.co/spaces)** and click **Create new Space**.
2. Settings:
   - **Space Name**: `voiceshield-ml-service`
   - **SDK**: **Docker** (Blank)
   - **Hardware**: **CPU Basic (Free - 2 vCPU · 16 GB RAM)**
   - **Visibility**: `Public`
3. Add a `Dockerfile` in the Space repository:
   ```dockerfile
   FROM python:3.10-slim

   WORKDIR /app

   RUN apt-get update && apt-get install -y --no-install-recommends \
       build-essential \
       libsndfile1 \
       ffmpeg \
       && rm -rf /var/lib/apt/lists/*

   COPY VoiceShieldData/ml-service/requirements.txt /app/requirements.txt
   RUN pip install --no-cache-dir -r requirements.txt

   COPY VoiceShieldData/ml-service /app/ml-service
   COPY VoiceShieldData/models /app/models
   COPY VoiceShieldData/experiments /app/experiments

   WORKDIR /app/ml-service
   EXPOSE 7860

   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
   ```
4. Your ML Microservice is immediately live at:
   ```text
   https://YOUR_USERNAME-voiceshield-ml-service.hf.space
   ```

---

### 🔹 STEP 3: Deploy Backend Gateway on Koyeb (Free Container Hosting)

**[Koyeb](https://www.koyeb.com)** is a high-performance alternative to Render with global edge routing and native WebSocket support.

1. Sign up at **[https://www.koyeb.com](https://www.koyeb.com)** using GitHub.
2. Click **Create App** → **GitHub**.
3. Select your repository: `Arvindkumar4545/AI-REALVOICE-CLONING`.
4. Configure Build & Deployment Settings:
   - **Work Directory**: `VoiceShieldData/backend`
   - **Build Command**: `npm install && npm run build`
   - **Run Command**: `npm start`
   - **Instance Size**: `Free Nano` (or `Micro`)
   - **Port**: `4000` (Protocol: `HTTP`)
5. Add Environment Variables:
   ```env
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=postgresql://voiceshield_owner:xyz123@ep-cool-snowflake-123456.ap-southeast-1.aws.neon.tech/voiceshield?sslmode=require
   ML_SERVICE_URL=https://YOUR_USERNAME-voiceshield-ml-service.hf.space
   JWT_SECRET=super_secret_voiceshield_production_2026
   CORS_ORIGIN=*
   ```
6. Click **Deploy**. Koyeb will give you a live domain:
   ```text
   https://voiceshield-backend-yourname.koyeb.app
   ```

---

### 🔹 STEP 4: Deploy Frontend on Vercel

1. Go to **[https://vercel.com](https://vercel.com)** and click **Add New Project**.
2. Select your repository: `Arvindkumar4545/AI-REALVOICE-CLONING`.
3. Configure settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `VoiceShieldData/frontend`
4. Add Environment Variables:
   ```env
   VITE_API_URL=https://voiceshield-backend-yourname.koyeb.app/api/v1
   VITE_WS_URL=wss://voiceshield-backend-yourname.koyeb.app/ws
   ```
5. Click **Deploy**. Your frontend is live with free global CDN:
   ```text
   https://ai-realvoice-cloning.vercel.app
   ```

---

## 🏛️ Architecture 2: Oracle Cloud "Always Free" (24GB RAM Dedicated Server)

If you want a **real dedicated Linux cloud server for $0 forever**:

* **Oracle Cloud Always Free Tier** gives:
  - **4 ARM Ampere Cores**
  - **24 GB RAM**
  - **200 GB Storage**
  - **10 TB Free Bandwidth / Month**
  - **Public Static IPv4 Address**

### How to Deploy the Entire Project with 1 Command on Oracle Cloud:
1. Create a free account at **[https://www.oracle.com/cloud/free/](https://www.oracle.com/cloud/free/)**.
2. Spin up an **Ubuntu 24.04 ARM Compute Instance** (Select `VM.Standard.A1.Flex` with 4 OCPU, 24GB RAM - $0.00/month).
3. SSH into your server:
   ```bash
   ssh ubuntu@YOUR_ORACLE_PUBLIC_IP
   ```
4. Clone and start with Docker Compose:
   ```bash
   git clone https://github.com/Arvindkumar4545/AI-REALVOICE-CLONING.git
   cd AI-REALVOICE-CLONING/VoiceShieldData
   docker compose -f docker-compose.prod.yml up -d
   ```
5. Everything (Frontend on `:3000`, Backend on `:4000`, ML Service on `:8000`, and Postgres on `:5432`) is online on your public IP with 24GB RAM and 0 limits!

---

## ⚡ Architecture 3: Instant 60-Second Live Public Tunnel (Cloudflare Zero Trust)

To share your working project with judges in 1 minute directly from your PC without uploading any code to cloud hosts:

1. Install Cloudflare Tunnel:
   ```powershell
   winget install Cloudflare.cloudflared
   ```
2. Start the tunnel:
   ```powershell
   cloudflared tunnel --url http://localhost:3000
   ```
3. Cloudflare prints your instant live global HTTPS link:
   ```text
   https://your-custom-session.trycloudflare.com
   ```
