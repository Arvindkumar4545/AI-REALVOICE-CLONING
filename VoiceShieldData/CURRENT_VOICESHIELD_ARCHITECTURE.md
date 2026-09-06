# Current VoiceShield AI Architecture Documentation

**Date:** September 4, 2026  
**Audited Location:** `F:\VoiceShieldData`  
**System Status:** Working Prototype / Local Development & Staging  

---

## 1. System Topology Overview

The existing VoiceShield AI platform is structured as a modular, three-tier microservice architecture running in local development mode:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Client Browser Tier                               │
│  React 18 + Vite 5 + TypeScript + TailwindCSS + Lucide Icons + Three.js     │
│  (Port 3000 / Single Page Application with 28 Routes)                       │
└───────────────────────┬─────────────────────────────────┬───────────────────┘
                        │ HTTP / REST                     │ WebSocket (ws://)
                        │ (JSON / Multipart Audio)        │ Audio Chunk PCM
                        ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Backend API Gateway                               │
│  Node.js (v20+) + Express + TypeScript + ws (WebSocket Server)             │
│  (Port 4000 / API Routing, Auth, Rate Limiting, Audit Logs, Case Dossiers)  │
└───────────────────────┬─────────────────────────────────┬───────────────────┘
                        │ HTTP Multi-Model Forwarding     │ SQL Queries
                        │ (POST /api/v1/detect, analyze)  │ (pg Pool / Fallback)
                        ▼                                 ▼
┌──────────────────────────────────────────────┐  ┌───────────────────────────┐
│              ML Inference Tier               │  │       Database Tier       │
│  Python 3.10+ + FastAPI + PyTorch + Uvicorn │  │  PostgreSQL 15+           │
│  (Port 8000 / Multi-Model Anti-Spoofing,     │  │  (Fallback In-Memory Store│
│   Fast/Slow Path Streaming Engine)           │  │   for Zero-Config Local)  │
└──────────────────────────────────────────────┘  └───────────────────────────┘
```

---

## 2. Tier-by-Tier Component Breakdown

### A. Frontend Tier (`VoiceShieldData/frontend`)
* **Framework:** React 18.3.1 bundled with Vite 5.4.14 in TypeScript.
* **Styling & Theme:** TailwindCSS 3.4.17 configured with a clean modern light dashboard design system (slate/blue accents, white cards, subtle borders, high contrast dark typography).
* **3D Visualizations:** Three.js 0.160.0 & React Three Fiber (`@react-three/fiber`, `@react-three/drei`):
  - `VoiceprintVisualizer3D.tsx`: 3D t-SNE / PCA point cloud manifold for 192-D ECAPA-TDNN embeddings.
  - `RiskGauge3D.tsx`: Calibrated dynamic biometric risk meter.
  - `Pipeline3DVisualizer.tsx`: 6-step deep forensic pipeline diagram.
  - `ThreatGlobe3D.tsx`: Interactive geospatial threat globe.
  - `CyberSecurityShield3D.tsx` & `LiveShield3D.tsx`: Interactive security shields.
* **State Management:** React Context (`AuthContext.tsx`, `AlertContext.tsx`).
* **Routing:** `react-router-dom` 6.29.0 exposing 28 functional routes.
* **Audio Capture:** HTML5 Web Audio API (`navigator.mediaDevices.getUserMedia`) with live Canvas waveform visualizer (`AudioRecorder.tsx`).

### B. Backend API Gateway (`VoiceShieldData/backend`)
* **Runtime:** Node.js (ES Modules, TypeScript) running on Express.
* **Security & Auth:**
  - JWT access tokens (15m expiry) + refresh token rotation (7d expiry) stored in HTTP-only cookies or bearer headers.
  - BCrypt password hashing (10 salt rounds).
  - Role-Based Access Control (RBAC): `user`, `analyst`/`investigator`, `admin`.
  - Rate limiting via `express-rate-limit` (custom limits for auth vs. detection).
* **Realtime WebSocket Server:**
  - Integrated `ws` server on path `/ws`.
  - Client subscription to async detection requests (`SUBSCRIBE_REQUEST`) and broadcast alerts.
* **Resilient Database Layer:**
  - Dual-mode data persistence: PostgreSQL pool (`pg`) with automatic transparent fallback to an in-memory transactional store (`FallbackStore`) when PostgreSQL is offline.
* **Third-Party Law Enforcement Integration:**
  - Pluggable `AuthorizedInvestigationProvider` interface with `MockAuthorizedProvider` implementing authorized subpoena/warrant validation, metadata unmasking, and SHA-256 evidence chain verification.

### C. ML Inference Service (`VoiceShieldData/ml-service` & `voice_shield`)
* **Engine:** Python FastAPI with Uvicorn worker.
* **Multi-Model Consensus Architecture:**
  1. **LCNN (Light CNN + LFCC):** 244,625 parameters; detects high-frequency spectral synthesis cuts and filterbank discontinuities.
  2. **RawNet2:** 660,945 parameters; learnable SincConv bandpass filters operating on raw 16 kHz uncompressed waveform to expose vocoder phase errors.
  3. **AASIST:** 208,323 parameters; heterogeneous graph attention network modeling spectral-temporal graph anomalies.
  4. **WavLM Head:** 414,274 parameters; Transformer-based phonetic representation consistency classifier.
  5. **BiLSTM Prosody:** 185,474 parameters; analyzes 8-dimensional temporal prosody ($F_0$, energy, jitter, shimmer, spectral flux) to flag synthetic cadence.
  6. **ECAPA-TDNN:** 167,329 parameters; 192-dimensional speaker biometric verifier for enrolled authorized identities.
* **Probability Calibration & Stacking Fusion:**
  - Stacking logistic regression weights: LCNN (0.4813), BiLSTM (0.4545), RawNet2 (0.0491), WavLM (0.0150), AASIST (0.0000).
  - Empirical Isotonic / Platt temperature scaling calibrated to Brier Score `0.1312`.
* **Streaming Engine (`ml-service/app/streaming.py`):**
  - Fast-Path: Sub-50ms LCNN scoring on incoming 1.5s PCM audio chunks.
  - Slow-Path: Periodic (every 5 chunks) full consensus across all models with temporal smoothing.

### D. Database Schema (`VoiceShieldData/database`)
* Relational PostgreSQL schema (`schema.sql`):
  - `users`: User identity, hashed credentials, roles, API keys, quota counters.
  - `sessions`: Refresh token rotation tracking.
  - `detection_requests`: Audio upload metadata, SHA-256 hash, lifecycle status (`queued`, `processing`, `completed`, `failed`).
  - `detection_results`: Calibrated risk score ($0-100$), multi-model confidence, `forensics_json`, `explainability_json`.
  - `audio_metadata`: Sample rate, duration, channels, storage paths.
  - `scam_reports`: User-submitted fraud reports with geolocation and carrier telemetry.
  - `location_events`: Geospatial coordinates for threat heatmap aggregation.
  - `audit_logs`: Immutable security audit events with SHA-256 verification.
  - `investigation_cases`: Law-enforcement dossiers, incident IDs, campaign IDs, warrant references.
  - `evidence` & `chain_of_custody`: Cryptographic evidence custody logs.

---

## 3. Core Data & Execution Flows

### A. Synchronous Audio Inspection Flow
```
User (Browser)
   │ 1. Selects or records audio file (.wav, .mp3, .m4a)
   ▼
Frontend (`DetectPage.tsx`)
   │ 2. HTTP POST /api/v1/detect (Multipart/form-data)
   ▼
Backend (`DetectionController.createDetection`)
   │ 3. Generates request_id, calculates SHA-256 file hash
   │ 4. Persists 'queued' record in database
   │ 5. Forwards audio stream to ML Service: POST http://127.0.0.1:8000/api/v1/detect
   ▼
ML Service (`app/main.py` -> `inference.py`)
   │ 6. Validates audio format, decodes via PyAV/Soundfile to 16kHz mono PCM
   │ 7. Applies VAD energy gate (-35 dBFS rejection)
   │ 8. Slices continuous 3.0s sliding windows (1.5s overlap)
   │ 9. Runs parallel sub-model inference: LCNN, RawNet2, WavLM, BiLSTM
   │ 10. Computes calibrated probability via stacking weights in calibration.json
   │ 11. Generates forensic signal indicators (pitch, jitter, phase, spectral flux)
   ▼
Backend (`DetectionController`)
   │ 12. Persists detection_results and audio_metadata in DB
   │ 13. Emits WebSocket event `DETECTION_COMPLETED`
   ▼
Frontend (`DetectPage.tsx`)
   │ 14. Displays Risk Gauge, Model Consensus, Explainable AI Signals, and Fraud Copilot
```

### B. Real-Time Streaming Detection Flow
```
Client Audio Stream (Microphone / Telephony Bridge)
   │ 1. Client creates streaming session: POST /api/v1/stream/session
   │ 2. Obtains sessionId and WebSocket endpoint: ws://127.0.0.1:8000/api/v1/stream/socket?sessionId={id}
   ▼
WebSocket Stream Gateway (`ml-service/app/streaming.py`)
   │ 3. Client transmits Base64-encoded PCM float32 chunks (seq, sampleRate, pcmDataBase64)
   │ 4. Fast-Path: LCNN runs instantly on chunk -> returns {type: "chunk_score", riskScore, latencyMs}
   │ 5. Slow-Path (every 5 chunks): Full consensus runs on rolling buffer -> returns {type: "consensus_update"}
   │ 6. End-of-Call: Client sends {type: "end_session"} -> receives {type: "session_ended", finalVerdict, summary}
```

### C. Forensic Investigation & Evidence Custody Flow
```
Security Analyst / Investigator
   │ 1. Authenticates as Investigator role
   │ 2. Navigates to `/investigation` -> Views open cases, threat campaigns
   ▼
Case Details (`CaseDetailsPage.tsx`)
   │ 3. Inspects intercepted audio, waveform, spectral anomalies, and SIP headers
   │ 4. Enters legal warrant authorization reference
   │ 5. POST /api/v1/investigations/location & /evidence -> Unmasks redacted telemetry
   │ 6. Verifies SHA-256 evidence integrity against original audio recording
   │ 7. Exports official cryptographic PDF Evidence Dossier via client-side jsPDF
```

---

## 4. Current Deployment & Process Architecture
* **Local Process Topology:**
  - Port 8000: FastAPI ML Service (`uvicorn app.main:app --host 127.0.0.1 --port 8000`)
  - Port 4000: Express Backend Gateway (`tsx watch src/server.ts`)
  - Port 3000: Vite Frontend Dev Server (`vite --port 3000 --host`)
* **Environment Configuration:**
  - Frontend: `.env.local` / `.env.production` -> `VITE_API_URL=http://localhost:4000/api/v1`, `VITE_WS_URL=ws://localhost:4000/ws`
  - Backend: `.env` -> `PORT=4000`, `ML_SERVICE_URL=http://localhost:8000`, `JWT_SECRET=...`
  - ML Service: Autonomous standalone service with automatic GPU/CPU detection.
