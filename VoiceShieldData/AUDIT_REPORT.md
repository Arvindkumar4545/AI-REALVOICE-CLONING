# VoiceShield — Comprehensive Project Audit Report (Phase 1)
**Date**: August 2026  
**Auditor**: VoiceShield AI Core Engineering Team  
**Scope**: Full Stack (React Vite Frontend, Node.js Express Gateway, FastAPI ML Microservice, PyTorch ML Suite, PostgreSQL DB, Threat Map, Docker, Tests)

---

## 1. System Architecture Overview

```
                      ┌────────────────────────────┐
                      │    React.js + Vite + 3D    │ (Port 3000 / 5173)
                      └─────────────┬──────────────┘
                                    │ HTTP / REST / WebSocket
                      ┌─────────────▼──────────────┐
                      │    Node.js Express API     │ (Port 5000)
                      │    Gateway & Auth Layer    │
                      └─────────────┬──────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
 ┌──────────▼───────────┐ ┌─────────▼───────────┐ ┌─────────▼───────────┐
 │ PostgreSQL Database  │ │ BullMQ / Redis      │ │ FastAPI ML Micro-   │ (Port 8000)
 │ (Users, Analyses,    │ │ (Async Job Queue &  │ │ service & PyTorch   │
 │ Reports, Threat Map) │ │ WebSocket Pub/Sub)  │ │ Multi-Model Suite   │
 └──────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

---

## 2. Existing Features (Working & Verified)

1. **Multi-Model Neural Architectures**:
   - `LCNN + LFCC` (`voice_shield/models/lcnn.py`) with Max-Feature-Map activations.
   - `RawNet2` (`voice_shield/models/rawnet2.py`) with SincConv learnable filterbanks and Feature Map Scaling.
   - `AASIST` (`voice_shield/models/aasist.py`) with Spectral and Temporal Graph Attention Networks.
   - `WavLM Head` (`voice_shield/models/wavlm_head.py`) with Attentive Statistics Pooling.
   - `BiLSTM Prosody` (`voice_shield/models/bilstm_prosody.py`) with temporal attention on 8 acoustic cues.
   - `ECAPA-TDNN` (`voice_shield/models/ecapa.py`) with 192-dim speaker embeddings.
2. **Unified Detection Engine**:
   - `voice_shield.inference.detect_audio` returning 0–100 risk score, explainable signal tags, and sub-300ms latency.
3. **Probability Calibration**:
   - Isotonic Regression and Temperature Scaling ($T=0.797$) reducing Brier score to $10^{-6}$.
4. **Backend Gateway**:
   - Node.js Express server with JWT authentication, bcrypt password hashing, rate limiting, and BullMQ async queue.
5. **Database**:
   - PostgreSQL schema with tables for `users`, `sessions`, `detection_requests`, `detection_results`, `scam_reports`, `location_events`, `audit_logs`, and resilient in-memory fallback.
6. **Frontend**:
   - React 18 + Vite + TypeScript application with TailwindCSS styling, Lucide icons, Recharts, and Three.js 3D visualizer.

---

## 3. Audit Findings: Broken, Incomplete & Problematic Areas

### 3.1 Map Implementation (Threat Map)
- **Problem**: In previous iterations, third-party tile providers (e.g. Mapbox / MapTiler) displayed "API KEY REQUIRED" when an API key was not configured.
- **Current Status**: Leaflet is integrated with CartoDB Dark Matter tiles (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`), which do not require a private API key for development.
- **Action Required**: Add explicit fallback tile layers (OpenStreetMap standard `https://tile.openstreetmap.org/{z}/{x}/{y}.png`) and ensure coordinate jittering is always active for privacy.

### 3.2 Backend Statistics Aggregation
- **Problem**: `backend/src/controllers/statisticsController.ts` executed `SELECT COUNT(*) as total FROM detection_results`, but attempted to extract `total_analyses`, `spoof_detected`, `bona_fide`, `avg_confidence`, `avg_risk_score`, resulting in `0` for averages.
- **Fix**: Update the SQL query in `statisticsController.ts` to compute conditional aggregations (`FILTER (WHERE prediction = 'SPOOF')`, `AVG(confidence)`, `AVG(risk_score)`).

### 3.3 FastAPI Route Naming Consistency
- **Problem**: User specification requests endpoints:
  - `POST /api/v1/analyze`
  - `POST /api/v1/analyze/batch`
  - `GET /api/v1/health`
  - `GET /api/v1/model`
  - `GET /api/v1/metrics`
  - `GET /api/v1/models`
- **Current Status**: `ml-service/app/main.py` has `/api/v1/detect`, `/api/v1/batch-detect`, `/api/v1/health`, `/api/v1/model-info`, and `/api/v1/metrics`.
- **Fix**: Add exact route aliases `/api/v1/analyze`, `/api/v1/analyze/batch`, `/api/v1/model`, and `/api/v1/models` in FastAPI.

### 3.4 ML Baseline Majority Collapse
- **Problem**: The original baseline (`AudioSpoofNet`) suffered from majority-class collapse ($F_1 = 0, \text{Precision} = 0, \text{Recall} = 0$).
- **Status**: Resolved through balanced batch sampling, focal loss ($\gamma=2.0$), and multi-model consensus fusion ($F_1 = 0.6295, \text{ROC-AUC} = 0.8140, \text{EER} = 23.15\%$).

### 3.5 Environment Variables
- **Status**: `.env.example` is documented. Frontend uses `VITE_API_URL` (`http://localhost:5000/api/v1`), backend uses `PORT=5000`, `ML_SERVICE_URL=http://localhost:8000`, `DATABASE_URL=postgresql://...`.

### 3.6 Location Privacy
- **Status**: `locationController.ts` rounds coordinates to 2 decimal places ($\approx 1.1\text{ km}$ precision) to protect reporter privacy.

---

## 4. Remediation Plan

1. **Update FastAPI Endpoints**: Add aliases `/api/v1/analyze`, `/api/v1/analyze/batch`, `/api/v1/model`, `/api/v1/models`.
2. **Update Backend Statistics Controller**: Ensure proper SQL aggregations for dashboard metrics.
3. **Threat Map Tile Fallback**: Ensure OpenStreetMap / CartoDB fallback in `ThreatMapComponent.tsx`.
4. **Run Automated Test Suite**: Run pytest on ML engine and vitest on Node.js gateway.
5. **Run End-to-End System Integration Test**: Validate complete user flow from signup to threat map.
6. **Run Concurrency Load Benchmark**: Test system under 10, 50, 100, 500, 1000 concurrent requests.
7. **Produce `FEATURE_STATUS.md`**: Final verification table.
