# Current VoiceShield AI API Contract Audit

**Date:** September 4, 2026  
**Scope:** Backend Express API (`http://localhost:4000/api/v1`) and ML FastAPI Service (`http://localhost:8000`)  
**Audit Purpose:** Strict baseline contract documentation. No endpoints or contracts modified.

---

## 1. Backend Express API Contracts (`/api/v1`)

### Authentication (`/api/v1/auth`)

| Endpoint | Method | Purpose | Request Body / Params | Response Structure | Auth Required | Frontend Consumer |
|---|---|---|---|---|---|---|
| `/auth/signup` | POST | Register new user account | `{ email, password, full_name }` | `{ success: true, user: { id, email, full_name, role }, accessToken }` | No (Rate-limited) | `SignUpPage.tsx` |
| `/auth/signin` | POST | Authenticate user credentials | `{ email, password }` | `{ success: true, user: { id, email, full_name, role }, accessToken }` | No (Rate-limited) | `SignInPage.tsx` |
| `/auth/refresh` | POST | Rotate refresh token | Cookie / `{ refreshToken }` | `{ success: true, accessToken }` | Refresh Token | `api.ts` Axios Interceptor |
| `/auth/forgot-password` | POST | Request password reset email | `{ email }` | `{ success: true, message: string }` | No | `ForgotPasswordPage.tsx` |
| `/auth/reset-password` | POST | Reset password with token | `{ token, newPassword }` | `{ success: true, message: string }` | No | `ResetPasswordPage.tsx` |
| `/auth/verify-email` | GET | Verify user email address | Query: `?token=...` | `{ success: true, message: string }` | No | `VerifyEmailPage.tsx` |
| `/auth/me` | GET | Fetch authenticated profile | None | `{ success: true, user: { id, email, full_name, role, ... } }` | Yes (Bearer JWT) | `AuthContext.tsx`, `ProfilePage.tsx` |

---

### Detection & Audio Ingest (`/api/v1/detect`)

| Endpoint | Method | Purpose | Request Body / Headers | Response Structure | Auth Required | Frontend Consumer |
|---|---|---|---|---|---|---|
| `/detect` | POST | Upload and inspect audio file | `multipart/form-data`: `audio` file, Optional: `speakerReference` | `{ success: true, data: { requestId, prediction, confidence, riskScore, fraudRisk, forensics, explainability, processingTimeMs } }` | Optional | `DetectPage.tsx` |
| `/detect/analyze` | POST | Alias for `/detect` | `multipart/form-data`: `audio` file | Same as `/detect` | Optional | `DetectPage.tsx` |
| `/detect/:id` | GET | Poll detection job status | Path: `:id` (request_id) | `{ success: true, data: { status, result?: DetectionResult } }` | No | `DetectPage.tsx`, WebSocket fallback |
| `/detect/validate` | POST | Validate audio format/headers | `multipart/form-data`: `audio` file | `{ valid: boolean, format, sampleRate, durationSeconds, error? }` | No | `FileUploadZone.tsx` |
| `/detect/model/info` | GET | Retrieve active model metadata | None | `{ modelName, version, totalParameters, checkpointHash, ... }` | No | `ModelsPage.tsx` |

---

### Forensic Investigations & Law Enforcement (`/api/v1/investigations`)

| Endpoint | Method | Purpose | Request Body / Params | Response Structure | Auth Required | Frontend Consumer |
|---|---|---|---|---|---|---|
| `/investigations` | GET | List investigation dossiers | Query: `?limit=50&offset=0` | `{ cases: InvestigationCase[], total: number }` | Yes (`investigator` / `admin`) | `InvestigationDashboardPage.tsx` |
| `/investigations/campaigns` | GET | Correlate fraud campaigns | None | `{ campaigns: CampaignGraphItem[], totalCampaigns: number }` | Yes (`investigator` / `admin`) | `InvestigationDashboardPage.tsx` |
| `/investigations/:id` | GET | Retrieve full case dossier | Path: `:id` (case_id) | `{ success: true, case: InvestigationCase, evidence: Evidence[] }` | Yes (`investigator` / `admin`) | `CaseDetailsPage.tsx` |
| `/investigations/location` | POST | Unmask geolocation with legal warrant | `{ caseId, warrantReference, jurisdiction }` | `{ success: true, authorized: boolean, location: { lat, lng, city, carrier } }` | Yes (`investigator` / `admin`) | `CaseDetailsPage.tsx` |
| `/investigations/evidence` | POST | Retrieve unredacted evidence files | `{ caseId, evidenceId, warrantReference }` | `{ success: true, evidence: Evidence, downloadUrl: string }` | Yes (`investigator` / `admin`) | `CaseDetailsPage.tsx` |
| `/investigations/:id/report` | POST | Generate official police report | Path: `:id`, Body: `{ caseId, legalRef }` | `{ success: true, reportId: string, downloadUrl: string }` | Yes (`investigator` / `admin`) | `CaseDetailsPage.tsx` |
| `/investigations/:id/escalate/bank` | POST | Escalate frozen funds to banking partner | Path: `:id`, Body: `{ caseId, bankName, reason }` | `{ success: true, escalationRef: string, status: 'NOTIFIED' }` | Yes (`investigator` / `admin`) | `CaseDetailsPage.tsx` |
| `/investigations/:id/escalate/le` | POST | Escalate dossier to cybercrime portal | Path: `:id`, Body: `{ caseId, agencyCode }` | `{ success: true, cybercrimeDossierRef: string, status: 'ESCALATED' }` | Yes (`investigator` / `admin`) | `CaseDetailsPage.tsx` |
| `/investigations/:id/verify-evidence` | POST | Verify SHA-256 evidence chain | Path: `:id`, Body: `{ evidenceId }` | `{ verified: boolean, hashMatched: boolean, currentHash, recordedHash }` | Yes (`investigator` / `admin`) | `CaseDetailsPage.tsx` |

---

### Threat Intelligence & Scam Reports (`/api/v1/reports`, `/api/v1/location`)

| Endpoint | Method | Purpose | Request Body / Params | Response Structure | Auth Required | Frontend Consumer |
|---|---|---|---|---|---|---|
| `/reports` | POST | Submit community scam incident | `{ category, description, phoneNumber, threatSeverity, latitude, longitude, ... }` | `{ success: true, reportId: string }` | Optional | `ReportScamPage.tsx` |
| `/reports` | GET | List public anonymized scam incidents | Query: `?category=...&limit=20` | `{ reports: ScamReport[] }` | No | `ReportScamPage.tsx` |
| `/location/threats` | GET | Fetch threat coordinates for map | None | `Array<{ id, lat, lng, threatLevel, category, city }>` | No | `ThreatMapPage.tsx` |
| `/history` | GET | Fetch user detection history | Query: `?limit=50` | `{ results: DetectionResult[], total: number }` | Optional | `HistoryPage.tsx` |
| `/statistics` | GET | Fetch platform-wide metrics | None | `{ totalScans, totalThreatsBlocked, averageRiskScore, activeVoiceprints }` | No | `DashboardPage.tsx`, `LandingPage.tsx` |
| `/admin/audit-logs` | GET | Retrieve tamper-evident audit logs | Query: `?limit=100` | `{ logs: AuditLogEntry[], chainVerified: boolean }` | Yes (`admin`) | `AuditLogPage.tsx` |

---

## 2. ML Inference Service API Contracts (`http://localhost:8000`)

### Observability & Telemetry

| Endpoint | Method | Purpose | Response Structure |
|---|---|---|---|
| `/health` | GET | Liveness and component telemetry | `{ status: "ok", model_loaded: boolean, device: string, uptime_seconds: number, memory_used_mb: number }` |
| `/ready` | GET | Orchestrator readiness probe | `{ status: "ready" }` (HTTP 200) or `{ status: "not_ready" }` (HTTP 503) |
| `/live` | GET | Orchestrator liveness probe | `{ status: "alive" }` (HTTP 200) |
| `/api/v1/models` | GET | Metadata for all 6 submodels | `{ status: "success", ensemble_champion: string, models: Array<{ id, name, type, features, parameters }> }` |
| `/api/v1/metrics` | GET | Multi-model benchmark metrics | `{ status: "success", models_evaluated: 6, datasets: string[], metrics: { eer, roc_auc, ... } }` |

---

### Core Inference & Biometrics

| Endpoint | Method | Purpose | Request Input | Response Structure |
|---|---|---|---|---|
| `/predict` | POST | Single audio inference (AudioSpoofNet) | `multipart/form-data`: `file` | `PredictResponse: { request_id, prediction, confidence, risk_score, processing_time_ms, forensics, ... }` |
| `/batch-predict` | POST | Batch audio processing | `multipart/form-data`: `files` (List) | `BatchPredictResponse: { success, total_processed, results: BatchPredictItem[], total_processing_time_ms }` |
| `/validate-audio` | POST | Inspect audio header without ML pass | `multipart/form-data`: `file` | `AudioValidationResponse: { valid, filename, file_size_bytes, duration_seconds, sample_rate, channels, format }` |
| `/api/v1/detect` | POST | Full Multi-Model Consensus pass | `multipart/form-data`: `file`, optional `ref_file` | `MultiModelDetectResponse: { request_id, prediction, risk_score, confidence, submodels: { lcnn, rawnet2, aasist, wavlm, bilstm }, biometrics: { similarity, verification_status } }` |
| `/api/v1/copilot/analyze`| POST | Conversation fraud intent analysis | JSON: `{ transcript: string, base_ai_risk: number }` | `{ success: true, copilot: { intent, urgencyScore, scamCategory, recommendedAction } }` |

---

### Real-Time Streaming (WebSocket)

| Endpoint | Protocol | Purpose | Client Message Format | Server Response Format |
|---|---|---|---|---|
| `/api/v1/stream/session` | HTTP POST | Initialize streaming session | Header: `X-Request-ID` | `{ sessionId: string, webSocketUrl: string, wsUrl: string, createdAt: number }` |
| `/api/v1/stream/socket` | WebSocket | Live bidirectional stream | `{"type": "audio_chunk", "seq": int, "sampleRate": 16000, "pcmDataBase64": "..."}` | Fast-Path: `{"type": "chunk_score", "seq": int, "riskScore": float, "latencyMs": float}`<br>Slow-Path: `{"type": "consensus_update", "riskScore": float, "classification": string}`<br>End: `{"type": "session_ended", "finalVerdict": string, "summary": {...}}` |
