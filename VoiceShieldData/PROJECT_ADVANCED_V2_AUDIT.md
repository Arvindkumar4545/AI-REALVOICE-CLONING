# VoiceShield AI — Advanced V2 Architecture & Implementation Audit
**Document:** `PROJECT_ADVANCED_V2_AUDIT.md`  
**Date:** September 2026  
**Status:** Audit & Architecture Baseline  
**Scope:** Transformation of existing VoiceShield AI into an Advanced Real-Time Voice Fraud Defense, Investigation, and Evidence Intelligence Platform.

---

## 1. Executive Summary & Audit Baseline
VoiceShield AI is an established multi-tier platform consisting of:
- **Frontend:** React 18 + Vite + Tailwind CSS + Three.js 3D visualizations + Lucide icons.
- **Backend:** Node.js + Express (TypeScript), BullMQ / in-memory task queue, JWT + Session auth with fallback in-memory persistent store or PostgreSQL, WebSocket telemetry.
- **ML Engine:** Python 3.10+ / PyTorch + FastAPI microservice with a multi-model consensus architecture (`LCNN`, `RawNet2`, `AASIST`, `WavLM`, `BiLSTM Prosody`, `ECAPA-TDNN`).

### Strict Architectural Principles:
1. **Never fabricate ML results, scores, coordinates, or government data.**
2. **Never claim 100% accuracy.** All outputs use calibrated confidence, uncertainty intervals, ECE, EER, and statistical metrics.
3. **No covert surveillance or spyware:** All client-side capture (microphone, camera, GPS) is strictly user-consented with browser permission gates. Suspect device attribution is strictly model- or authorized-provider-based.
4. **Preserve working features:** Do not discard existing working UI, routes, or functional ML checkpoints.

---

## 2. Detailed Subsystem Audit

### 1. Current Architecture
- **Web App / Client:** Browser SPA on Vite, communicates with Node backend (`http://localhost:4000/api/v1`) and streaming WebSocket.
- **API Gateway:** Express backend handles authentication, rate limiting, request validation, PostgreSQL / Fallback database operations, audit logging, and proxies ML jobs.
- **Inference Service:** FastAPI service (`http://localhost:8000`), wraps PyTorch ensemble with VAD (Voice Activity Detection), LFCC extraction, prosodic extraction, sliding window segmentation (3.0s window, 1.5s hop), and calibrated logistic stacker.

### 2. Current Frontend Architecture
- **Framework:** React 18, TypeScript, Vite, React Router DOM v6.
- **Styling:** Tailwind CSS + custom cyber-grid design tokens.
- **Key Existing Pages:**
  - `/` LandingPage
  - `/detect` Unified Forensic Detection & File / Mic Analysis
  - `/calls` Live Call Inspection Log & Operations Monitoring
  - `/threats` Threat Map & Geospatial Hotspot Aggregation
  - `/dashboard` Telemetry Dashboard (recharts, threat metrics)
  - `/report` Consented Incident & Scam Reporting with File Hash Attachment
  - `/investigation` Law Enforcement & SOC Case Dossier List
  - `/investigation/:id` Case Details, Network Attribution, Legal Escalation & Chain of Custody PDF
  - `/models` Model architecture specifications and benchmark displays
  - `/audit-log` SHA-256 Audit Trail & System Events
  - `/security` Zero-Retention & Cryptographic Security Architecture

### 3. Current Backend Architecture
- **Express App:** `backend/src/app.ts` & `server.ts`.
- **Routes:**
  - `/auth` (signup, signin, refresh, OTP verification)
  - `/detection` (upload, validate-audio, async status polling, job queue)
  - `/investigation` (cases, case details, location request, evidence request, PDF generation, bank escalation, cybercrime escalation)
  - `/reports` (submit scam report with network attribution and evidence)
  - `/statistics` & `/admin` (telemetry, audit logs)
  - `/location` (heatmaps, threat points)
- **Middleware:** `authenticate`, `optionalAuth`, `requireAdmin`, `requireInvestigator` (permissive in development/testing mode), Zod request validators.

### 4. Current ML Architecture & Model Inventory
Existing multi-model ensemble in `voice_shield/models/`:
1. **LCNN (`lcnn.py`):** 3-channel Linear Frequency Cepstral Coefficients (LFCC + Delta + Delta-Delta), Max-Feature-Map (MFM) activations (244,625 params). Detects spectral filterbank & phase artifacts.
2. **RawNet2 (`rawnet2.py`):** Sinc-convolution bandpass filterbanks on raw 1D waveform (660,945 params). Detects raw waveform vocoder synthesis signatures.
3. **AASIST (`aasist.py`):** Graph Attention Network (GAT) with Max-Graph Operation (MGO) analyzing spectral-temporal graphs (208,323 params).
4. **WavLM Head (`wavlm_head.py`):** Temporal convolutional representation encoder + attentive statistics pooling (414,274 params). Detects phonetic context discontinuities.
5. **BiLSTM Prosody (`bilstm_prosody.py`):** 8-feature acoustic dynamics extractor (F0 autocorrelation, jitter, shimmer, spectral flux, centroid, rolloff) (185,474 params). Detects prosodic flatlining and pitch micro-tremor absence.
6. **ECAPA-TDNN (`ecapa.py`):** 192-dim speaker biometric embedding extractor. Compares incoming voice against enrolled user reference.

### 5. Current Fusion & Calibration Logic
- **Module:** `voice_shield/models/fusion.py` (`VoiceShieldRiskClassifier`).
- **Stacking Weights:** Loaded from `model_artifacts/calibration.json`:
  - LCNN: 0.4813
  - BiLSTM: 0.4545
  - RawNet2: 0.0491
  - WavLM: 0.0150
  - AASIST: 0.0000
- **Calibration Methods Supported:** Temperature scaling (`T=0.8814`), Platt scaling (`intercept=-0.3623, coef=1.2859`), and Isotonic regression.
- **Tiers:** `BONAFIDE` (0 - 35 risk score), `UNCERTAIN` (35 - 65 risk score), `SPOOF` (65 - 100 risk score).
- **Disagreement Guard:** Evaluates spread between models. If spread $\ge 0.50$ or isolated spike occurs, flags `is_disagreement: true`, sets classification to `UNCERTAIN`, and bounds risk score between 35-60%.

### 6. Current Database Schema & Persistence
- PostgreSQL schema in `database/schema/schema.sql`.
- In-memory `FallbackStore` in `backend/src/database/index.ts` ensuring offline testing parity.
- Core Entities:
  - `users`
  - `sessions`
  - `detection_requests`
  - `detection_results` (stores forensics JSON & explainability JSON)
  - `audio_metadata`
  - `scam_reports` (enhanced with `evidence_files`, `consent_given`, `network_metadata`, `escalation_status`, `law_enforcement_ref`)
  - `location_events`
  - `api_usage`
  - `audit_logs`
  - `investigation_cases`
  - `evidence`
  - `chain_of_custody`

### 7. Current Real-Time & Streaming Capability
- FastAPI WebSocket endpoint at `/api/v1/stream/socket` with `StreamingDetectionEngine`.
- Supports continuous chunking (1.5s windows, 16kHz PCM), fast-path chunk scoring, and slow-path consensus updating every 5 chunks.
- Frontend hook `useStreamingDetection.ts` and `useAudioWorklet.ts` powering `StreamingDetectionExample.tsx`.

### 8. Existing Weaknesses & Gaps vs. Target Features
1. **6-Class Fine-Grained Categorization:** Currently outputs 3 states (`BONA_FIDE`, `UNCERTAIN`, `SPOOF`). Does not explicitly isolate `AI_TTS`, `VOICE_CLONE`, `REPLAY_ATTACK`, and `AUDIO_MANIPULATION` with specific acoustic evidence.
2. **Replay Attack Detection:** Lacks dedicated room-impulse response, repeated background signature, and high-frequency decay features.
3. **Voice Continuity & Temporal Change Detection:** Sliding windows are currently aggregated with max-weighted mean, but segment-by-segment speaker continuity tracking and transition alerts (e.g. voice change at 00:08) are not exposed as a structured timeline.
4. **Real-Time Fraud Copilot & Conversation Storyline Graph:** Currently focuses purely on acoustic anti-spoofing; lacks conversational NLP/keyword intent scoring (urgency, OTP demand, KYC threats, authority claim) with multilingual support (Hindi, Hinglish, English) and interactive attack-chain graph.
5. **Challenge-Response Liveness Mode:** Has placeholder text in UI, but no active phrase-latency, acoustic verification, or liveness challenge engine.
6. **Campaign Intelligence & Fraud Network Graph:** Cases exist individually; cross-incident pattern correlation (shared phone, attack pattern, carrier) is not visualized as an interactive campaign graph.
7. **Red Team Lab & Model Performance Center:** Real benchmarks exist in `model_comparison.json` and `experiments/`, but interactive controlled evaluation UI with ROC-AUC, EER, and FPR is not exposed directly inside the app.

---

## 3. Implementation Order & Plan (36-Feature Transformation)

| Milestone | Key Tasks & Deliverables |
|---|---|
| **Phase 1: ML Core Enhancement** | Implement 6-class classification engine (`Genuine Human`, `AI Generated / TTS`, `Voice Clone`, `Replay Attack`, `Audio Manipulation`, `Uncertain`). Implement dedicated acoustic Replay detection indicators and Voice Continuity window analyzer in `voice_shield/`. |
| **Phase 2: Real-Time Fraud Copilot & Storyline Engine** | Build conversational NLP intent detector for high-risk social engineering (OTP, KYC, Urgency, Authority) in English/Hindi/Hinglish. Build interactive Scam Storyline Graph and real-time risk accumulator. |
| **Phase 3: Investigation Center & Evidence Vault Upgrade** | Expand case dossier with SHA-256 evidence verification, interactive Chain of Custody, and Authorized Law Enforcement provider architecture (`/integrations`). Add Campaign Intelligence graph connecting related incident patterns. |
| **Phase 4: Red Team Lab & Model Performance UI** | Build the VoiceShield Red Team Lab and Model Performance Center pages exposing real ROC-AUC, EER, and model consensus metrics. |
| **Phase 5: Regression Testing & Verification** | Run unit, API, and E2E regression tests verifying all existing and new features without breaking existing authentication or dashboards. |
