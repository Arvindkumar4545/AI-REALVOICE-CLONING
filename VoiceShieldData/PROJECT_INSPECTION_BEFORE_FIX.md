# VoiceShield — Project Inspection Before Fix

**Date:** 2026-08-31  
**Project root:** `F:\VoiceShieldData`  
**Inspector role:** Read-only pre-fix audit (no source modifications in this phase)  
**Prior audit:** `VOICESHIELD_ML_ROOT_CAUSE_AUDIT.md` (checkpoint trace completed)

---

## 1. Executive Summary

VoiceShield is a multi-tier voice deepfake detection platform:

| Tier | Technology | Port | Status |
|------|------------|------|--------|
| Frontend | React 18 + Vite + TypeScript | 3000 (dev) / 80 (Docker) | Functional batch detection UI |
| Backend API | Node.js Express + PostgreSQL | 5000 | Functional REST + event WebSocket |
| ML Service | FastAPI + PyTorch ensemble | 8000 | Functional but **miscalibrated** |
| Legacy Python API | `backend/main.py` | 8000 (conflicts) | Alternate stack, not used by Node gateway |

**Primary defect:** Genuine human speech is misclassified as spoof or elevated-risk, driven by an under-trained ensemble (especially WavLM at 73.5% human FPR) with uncalibrated probabilities displayed as confidence/risk percentages.

**Tests:** 53/53 pytest pass, 15/15 backend Vitest pass — but tests use lenient metrics (hard SPOOF only for human FPR test) and do not catch domain-shift false positives on ASVspoof bonafide.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BROWSER (React SPA)                              │
│  DetectPage → AudioRecorder / FileUploadZone → POST /api/v1/detection  │
│  AlertContext → WebSocket /ws (event notifications only)               │
│  ReportScamPage → optional geolocation → POST /api/v1/reports          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTP / WS
┌───────────────────────────────▼─────────────────────────────────────────┐
│                    NODE EXPRESS GATEWAY (backend/src)                    │
│  Auth (JWT) │ Multer upload │ BullMQ/in-memory queue │ PostgreSQL        │
│  WebSocket /ws → DETECTION_COMPLETED, HIGH_RISK_DETECTED               │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ POST /predict (multipart file stream)
┌───────────────────────────────▼─────────────────────────────────────────┐
│                    FASTAPI ML SERVICE (ml-service/app)                   │
│  ModelManager (loads AudioSpoofNetV2 — metadata only)                   │
│  predict() → VoiceShieldInferenceEngine.detect()                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                    voice_shield/ (core ML library)                          │
│  load_checkpoints → 6 sub-models from experiments/                        │
│  VAD → sliding windows → per-model inference → fusion → risk/confidence   │
└───────────────────────────────────────────────────────────────────────────┘
```

### Key architectural split (critical)

| Component | Loaded checkpoint | Used in `/predict`? |
|-----------|-------------------|---------------------|
| `ModelManager` | `models/voiceshield_best/model.pt` (AudioSpoofNetV2, 1.59M params) | **NO** — warmup + `/model/info` hash only |
| `VoiceShieldInferenceEngine` | `experiments/improved_model/{model.pt,wavlm.pt,bilstm.pt}` + rawnet2/aasist/ecapa | **YES** — all predictions |

This dual-checkpoint design is a source of operator confusion and must be fixed via `model_artifacts/registry.json` (Phase 21).

---

## 3. Execution Flow (Production Detection)

```
1. User records (WebM/Opus) or uploads audio (WAV/FLAC/MP3/OGG/M4A/WEBM)
   → frontend/src/components/AudioRecorder.tsx | FileUploadZone.tsx

2. POST /api/v1/detection?sync=true
   → backend/src/controllers/detectionController.ts
   → backend/src/middleware/upload.ts (multer, field "audio")

3. processDetectionJob() OR inline sync
   → backend/src/queue/index.ts
   → backend/src/services/mlService.ts → POST http://localhost:8000/predict (field "file")

4. ml-service/app/main.py → predict_single_audio()
   → ml-service/app/inference.py → ModelManager.predict()

5. voice_shield/inference.py → VoiceShieldInferenceEngine.detect()
   a. load_and_standardize_audio() — 16kHz mono, truncate/pad to 4s
   b. compute_audio_quality_metrics() — reject if insufficient
   c. extract_voiced_waveform() — energy VAD trim
   d. _slice_audio_windows(3.0s, hop 1.5s)
   e. Per window: LCNN, RawNet2, AASIST, WavLM, BiLSTM forward passes
   f. robust_aggregate() — 15% trimmed mean per model
   g. VoiceShieldRiskClassifier.compute_risk() — fusion + decision

6. Response → DB → WebSocket notify → frontend RiskGauge
```

**Not in flow:** `ml-service/app/model.py` AudioSpoofNet forward pass, `voice_shield/models/calibration.py` ModelCalibrator, `experiments/fusion/fusion_config.json`.

---

## 4. Active Model Checkpoints (Production)

Loaded by `voice_shield/inference.py:load_checkpoints()` on this machine:

| Sub-model | Active path | SHA256[:16] | Params | Fusion weight |
|-----------|-------------|-------------|--------|---------------|
| LCNN | `experiments/improved_model/model.pt` | `6aeb832cb2da2e2c` | 244,625 | **0.45** |
| WavLM | `experiments/improved_model/wavlm.pt` | `a6594a4e1422a828` | 414,274 | **0.40** |
| BiLSTM | `experiments/improved_model/bilstm.pt` | `0fc9bdd300969edd` | 185,474 | **0.15** |
| RawNet2 | `experiments/rawnet2/model.pt` | `ed7a11d42fe637d6` | 660,945 | **0.00** |
| AASIST | `experiments/aasist/model.pt` | `034b0036354e76d4` | 208,323 | **0.00** |
| ECAPA | `experiments/ecapa/model.pt` | `1ac7c55e9a64866c` | 224,928 | N/A (speaker verify only) |

### Inactive / metadata-only checkpoints

| Path | Architecture | Params | Role |
|------|-------------|--------|------|
| `models/voiceshield_best/model.pt` | AudioSpoofNetV2 | 1,593,697 | ModelManager startup; **not used in predict** |
| `experiments/improved_v1/model.pt` | AudioSpoofNetV2 | 6,415,425 | Superseded experiment |
| `experiments/improved_v2/model.pt` | AudioSpoofNetV2 | 6,415,425 | Superseded experiment |
| `experiments/baseline/model.pt` | AudioSpoofNet | 679,085 | Collapsed baseline (F1=0) |
| `artifacts/baseline/model.pt` | AudioSpoofNet | 679,085 | Copy of baseline |
| `experiments/lcnn_lfcc/model.pt` | LCNN | 986,699 | Fallback (same size as improved_model) |
| `experiments/wavlm/model.pt` | WavLMClassifier | 1,675,809 | Fallback duplicate |
| `checkpoints/` | — | — | **Empty directory** |

---

## 5. Model Input / Output

| Model | Input | Output | Label semantics |
|-------|-------|--------|-----------------|
| LCNN | `[B, 3, 20, T]` LFCC+deltas | scalar logit | sigmoid → P(bonafide); spoof = 1 − P |
| WavLMClassifier | `[B, 48000]` waveform (3s window) | scalar logit | same |
| BiLSTMProsodyModel | `[B, T, 8]` prosody | scalar logit | same |
| RawNet2 | `[B, T]` waveform | scalar logit | computed, weight 0 |
| AASIST | `[B, T]` waveform | scalar logit | computed, weight 0 |
| ECAPA-TDNN | `[B, 1, 40, 96]` mel | embedding | optional speaker consistency |
| AudioSpoofNetV2 (unused) | `[B, 1, 40, 96]` log-mel | scalar | unused in predict |

**No 2-class softmax.** Single output neuron; `LABEL_BONAFIDE=1.0`, `LABEL_SPOOF=0.0`.

---

## 6. Preprocessing

### Canonical constants (`voice_shield/preprocessing.py`, `voice_shield/constants.py`)

| Parameter | Value |
|-----------|-------|
| Sample rate | 16,000 Hz |
| Channels | Mono |
| Load duration | 4.0 s (64,000 samples) — pad/truncate |
| Inference window | 3.0 s, hop 1.5 s (after VAD) |
| Mel (ECAPA only) | 40 bands, n_fft=512, hop=160, win=400, fmin=20, fmax=8000, 96 frames |
| LFCC (LCNN) | 20 coeffs + delta + delta-delta |
| Prosody (BiLSTM) | 8 features, 25ms frame / 10ms hop |
| Decode order | PyAV → soundfile → librosa |
| ffmpeg | Not used in Python path (present in Docker ML image only) |

### Train vs inference mismatch (confirmed)

| Step | Training (`train_improved_champion.py`) | Inference (`inference.py`) |
|------|------------------------------------------|---------------------------|
| VAD | None | Energy-based trim |
| Windowing | Full 4s clip | 3s sliding windows |
| Augmentation | Yes (train only) | None |
| RawNet2/AASIST | Trained | Weight 0 in fusion |

---

## 7. Fusion Weights & Thresholds

### Fusion (`voice_shield/models/fusion.py:VoiceShieldRiskClassifier.compute_risk`)

```python
weighted_spoof_prob = lcnn*0.45 + wavlm*0.40 + bilstm*0.15 + rawnet2*0 + aasist*0
risk_score = spoof_prob * 100  # unless disagreement → capped 35–60
```

### Decision thresholds (hardcoded)

| Condition | Classification |
|-----------|----------------|
| `risk_score > 65` AND no disagreement override | **SPOOF** |
| `35 ≤ risk_score ≤ 65` OR `is_disagreement` | **UNCERTAIN** |
| `risk_score < 35` | **BONA_FIDE** |
| VAD/quality fail | **INSUFFICIENT_AUDIO** |

### Sub-model vote threshold

`p > 0.50` → spoof vote (for model_agreement calculation).

### Disagreement rule

`score_spread >= 0.38` OR (`model_agreement < 0.80` AND `score_std > 0.18`).

---

## 8. Calibration

| Artifact | Location | Loaded? | Used at inference? |
|----------|----------|---------|-------------------|
| `model_artifacts/calibration.json` | threshold=0.5 | Yes (`load_calibration`) | **NO** — threshold never applied in `compute_risk()` |
| `voice_shield/models/calibration.py` | ModelCalibrator (Platt/temp/isotonic) | No | **NO** |
| `experiments/fusion/fusion_config.json` | Research isotonic results | No | **NO** |

### Confidence formula (not calibrated probability)

```python
confidence = clip(|spoof_prob - 0.5| * 2 * agreement * quality * (1 - uncertainty*0.5), 0.35, 0.98)
```

Scaled ×100 in `ml-service/app/inference.py:155` for API response.

### Measured calibration quality

- ECE = **0.298** (`evaluation/results/evaluation_metrics.json`) — poor
- Brier = **0.246**

---

## 9. Dataset Distribution

### `manifests/dataset_manifest.csv` (371,670 files)

| Split | Bonafide | Spoof | % Bonafide |
|-------|----------|-------|------------|
| train | 7,980 | 71,400 | 10.1% |
| dev | 7,948 | 46,596 | 14.6% |
| eval | 45,408 | 192,338 | 19.1% |

Sources: ASVspoof 2019 LA + PA (FLAC 16kHz), In-The-Wild (WAV, eval only).

### `manifests/speaker_disjoint_manifest.csv` (403,449 files)

| Split | Bonafide | Spoof | % Bonafide |
|-------|----------|-------|------------|
| train | 21,053 | 79,859 | 20.9% |
| dev | 8,915 | 47,886 | 15.7% |
| test | 51,331 | 194,405 | 20.9% |

Speaker-disjoint across 54 ITW celebrities; ASVspoof protocol splits verified speaker-disjoint.

### Evaluation samples on disk

| Directory | Count | Labels |
|-----------|-------|--------|
| `evaluation/human/` | 30 | bonafide |
| `evaluation/spoof/` | 30 | spoof |
| `evaluation/noise/` | 10 | noisy human |
| `evaluation/short/` | 10 | short clips |
| `evaluation/compressed/` | **0** | empty |
| `real_world_tests/human/` | 25 | bonafide (ITW) |
| `real_world_tests/spoof/` | 25 | spoof (ITW) |

**Missing:** `evaluation/real_world_benchmark/` (Phase 2 — not yet created).

### Champion training subsample

Only **1,600 samples** (800+800) used from 400K+ manifest — severe under-utilization.

---

## 10. Sub-Model Validation Metrics (Held-Out Test, n=800)

From `experiments/improved_model/metrics.json`:

| Model | Balanced Acc | ROC-AUC | EER | **Human FPR** |
|-------|-------------|---------|-----|---------------|
| LCNN | 59.8% | 0.646 | 35.3% | **30.0%** |
| WavLM | 54.9% | 0.597 | 43.3% | **73.5%** |
| BiLSTM | 65.1% | 0.679 | 33.5% | **34.3%** |

**Root statistical cause of false positives:** WavLM receives 40% fusion weight despite 73.5% human FPR. When LCNN and BiLSTM also score elevated (common on ASVspoof bonafide), `model_agreement=1.0` → hard SPOOF at risk > 65.

**Verified false positive example:** `LA_E_4581379.flac` (genuine) → SPOOF, risk=76.1%, WavLM spoof_p=0.849.

---

## 11. Formal Evaluation Results

`evaluation/results/evaluation_metrics.json` (69 ITW samples):

| Metric | Value |
|--------|-------|
| Accuracy | 60.9% |
| ROC-AUC | 0.703 |
| EER | 34.8% |
| Human FPR (risk ≥ 35%) | **52.94%** |
| Spoof FNR | 25.71% |
| ECE | 0.298 |

3-state distribution:
- Humans: 16 BONA_FIDE, 18 UNCERTAIN, **0 hard SPOOF**
- Spoofs: 0 hard SPOOF, 26 UNCERTAIN, 9 BONA_FIDE

`reports/real_world_evaluation.json` (30+30 ITW): 0% hard SPOOF on humans — misleading because UNCERTAIN + high risk not counted.

---

## 12. Current Tests

### Python pytest (53 tests — **all pass**)

| File | Focus |
|------|-------|
| `test_human_false_positive.py` | FPR ≤ 5% on `evaluation/human/` — **hard SPOOF only** |
| `test_fusion.py` | Disagreement → UNCERTAIN |
| `test_decision_thresholds.py` | 3-state boundaries |
| `test_calibration.py` | ModelCalibrator unit tests (not wired to inference) |
| `test_webm_upload.py` | WebM decode + `/predict` |
| `test_voiceshield_suite.py` | Feature extraction + model forward passes |
| `test_label_semantics.py` | Label contract |
| `test_short_audio.py` | VAD gating |
| `test_no_nan.py` | Numerical stability |
| `ml-service/tests/test_ml_service.py` | AudioSpoofNet stack (separate from ensemble) |

### Backend Vitest (15 tests — **all pass**)

`backend/tests/api.test.ts` — health, auth, detection upload (mock 44-byte WAV), reports, location, admin 403.

### Not tested

- Real-time audio streaming over WebSocket
- Camera / video
- Per-model FPR regression
- ASVspoof bonafide false positive suite
- Docker ensemble checkpoint loading
- Frontend (no test script)

---

## 13. Current Failures / Gaps (Functional, Not Test Suite)

| Issue | Severity | Evidence |
|-------|----------|----------|
| Human speech → SPOOF/high risk | **CRITICAL** | LA bonafide up to 83.6% risk; WavLM FPR 73.5% |
| Uncalibrated confidence displayed as % | **CRITICAL** | ECE 0.298; 35% confidence floor |
| Dual checkpoint confusion | **HIGH** | ModelManager vs VoiceShieldInferenceEngine |
| Train/infer preprocessing mismatch | **HIGH** | VAD + windows only at inference |
| WavLM 40% weight despite worst human FPR | **HIGH** | fusion.py + metrics.json |
| RawNet2/AASIST trained but fusion weight 0 | **MEDIUM** | Wasted compute; unevaluated in fusion |
| Docker missing experiments/ mount | **HIGH** | docker-compose.yml |
| Hardcoded `F:\VoiceShieldData` paths | **MEDIUM** | inference.py, fusion.py |
| `GET /detection/model/info` route ordering bug | **MEDIUM** | `/:id` before `/model/info` |
| `MODEL_PATH` env var unused | **MEDIUM** | .env.example vs code |
| Mic recording truncated to first 4s | **MEDIUM** | 10s record, 4s analyzed |
| Misleading marketing reports | **MEDIUM** | REAL_WORLD_TEST_REPORT 0% FPR |

---

## 14. Suspected Root Causes (Statistical / Model)

1. **Ensemble weighting ignores per-model human FPR** — WavLM dominates false positives.
2. **Severe under-training** — 1,600 samples, 4–5 epochs from 400K manifest.
3. **Domain shift** — ASVspoof FLAC training vs browser WebM/Opus mic; bonafide LA eval fails while ITW celebrity WAV passes.
4. **No probability calibration at inference** — sigmoid outputs treated as risk %.
5. **Preprocessing mismatch** — VAD/windowing at inference not seen in training.
6. **Class imbalance** (~80% spoof) — mitigated in training via sampler but WavLM still biased.
7. **Agreement metric treats correlated errors as confidence** — all weak models agree → high "confidence" SPOOF.
8. **Tests mask the problem** — pytest FPR test counts hard SPOOF only; 52.94% soft FPR undetected.

---

## 15. Component Inventory

### Frontend (`frontend/src/`)

| Area | Status |
|------|--------|
| Pages (16) | Detect, Dashboard, History, Report, Threat Map, Auth, Admin, etc. |
| Microphone | `AudioRecorder.tsx` — WebM/Opus, batch upload |
| Camera | **Not implemented** |
| Location | Opt-in geolocation on `ReportScamPage.tsx` only |
| WebSocket | Receive-only alerts (`websocket.ts`) |
| Real-time streaming | **Not implemented** |
| Fraud reporting | Basic form → `POST /reports` |

### Backend (`backend/src/`)

| Area | Status |
|------|--------|
| REST API | 40+ endpoints (auth, detection, history, reports, location, admin) |
| WebSocket | `/ws` — event push, no audio streaming |
| Queue | BullMQ + in-memory fallback |
| Auth | JWT + API key + bcrypt |
| Rate limiting | Global/auth/detection (in-memory) |
| ML client | `mlService.ts` → port 8000 |

### ML Service (`ml-service/app/`)

| Endpoint | Purpose |
|----------|---------|
| `GET /health`, `/ready`, `/live` | Health |
| `GET /model/info` | ModelManager metadata (misleading checkpoint) |
| `POST /predict` | Production detection |
| `POST /validate-audio` | Pre-validation |
| `POST /api/v1/detect` | Direct ensemble (no forensics) |
| `WS /ws/detect` | **Does not exist** |

### Database (`database/schema/schema.sql`)

Tables: `users`, `sessions` (unused), `detection_requests`, `detection_results`, `scam_reports`, `location_events`, `api_usage`, `audit_logs`.

### Docker (`docker-compose.yml`)

Services: postgres, redis, ml-service, backend, frontend.  
ML mounts: `./models`, `./artifacts` only — **not** `experiments/`, `voice_shield/`.

### Environment

| Variable | Documented | Actually used |
|----------|------------|---------------|
| `ML_SERVICE_URL` | Yes | Yes (backend) |
| `MODEL_PATH` | Yes | **No** (hardcoded paths) |
| `JWT_SECRET` | Yes | Yes |
| `REDIS_ENABLED` | Yes | Yes |

---

## 16. Phase Readiness Matrix

| Phase | Description | Current state | Blockers |
|-------|-------------|---------------|----------|
| 1 | Fix ML detection | Not started | This inspection |
| 2 | Real validation benchmark | Partial (`evaluation/` exists, no categorized benchmark) | Need `evaluation/real_world_benchmark/` + scripts |
| 3 | Proper calibration | Module exists, not wired | Wire ModelCalibrator; fit on dev only |
| 4 | Redesign fusion | Hand weights | Per-model eval + learned weights on dev |
| 5 | Reliability layer | Missing | Create `voice_shield/models/reliability.py` |
| 6 | Sliding windows | **Partial** (3s/1.5s exists) | Add per-window storage, temporal aggregation options |
| 7 | OOD detection | Partial (UNCERTAIN exists) | Dedicated OOD signals, no false certainty |
| 8 | Canonical preprocessing | Split across files | Unify train/infer pipeline |
| 9 | Training improvement | Scripts exist | Retrain with matched preprocessing, early stopping on human FPR |
| 10 | Augmentation | Exists in training | Compare baseline vs augmented on validation |
| 11 | Dataset bias analysis | Partial reports in `reports/` | Systematic per-domain report |
| 12 | Real-time audio WS | Missing | `WS /ws/detect` in ML + frontend sender |
| 13 | Camera CV | Missing | Consent-based `getUserMedia({video})` |
| 14 | Location safety | Partial | Consent UX, no inferred scammer location |
| 15 | Fraud reporting | Basic | Evidence download, status workflow |
| 16 | Real-time scam workflow | Missing | End-to-end streaming protection mode |
| 17 | FastAPI cleanup | Duplicate endpoints | Consolidate, add WS, no event-loop blocking |
| 18 | Scalability | Queue exists | Redis workers, GPU pool design |
| 19 | Database | Functional | Audio retention policy |
| 20 | Security | Partial | WS JWT, distributed rate limit |
| 21 | Model versioning | Missing | `model_artifacts/registry.json` |
| 22 | Testing | 68 automated tests pass | Add regression tests for human FPR, streaming |
| 23 | Acceptance test | Not formalized | 50+50 eval protocol |
| 24 | Anti-gaming rules | Documented | Enforce in CI metrics |
| 25 | Final verification | Not done | Benchmark + report |

---

## 17. Exact Files Requiring Modification (Planned)

### Phase 1 — ML correctness (priority)

| File | Change |
|------|--------|
| `voice_shield/models/fusion.py` | Data-driven weights, use calibration threshold, fix confidence |
| `voice_shield/inference.py` | Configurable paths, per-window metadata, registry integration |
| `voice_shield/preprocessing.py` | Canonical pipeline, decode-failure handling |
| `voice_shield/vad.py` | Align with training or document policy |
| `voice_shield/features.py` | Feature parity with training |
| `voice_shield/models/reliability.py` | **NEW** — genuine-speech protection layer |
| `voice_shield/models/calibration.py` | Wire into inference path |
| `model_artifacts/calibration.json` | Fit on dev set with metadata |
| `model_artifacts/registry.json` | **NEW** — production model manifest |
| `ml-service/app/inference.py` | Fix misleading checkpoint hash; expose true model version |
| `ml-service/app/schemas.py` | Honest confidence semantics |

### Phase 2 — Benchmark

| File | Change |
|------|--------|
| `evaluation/real_world_benchmark/` | **NEW** directory structure |
| `scripts/build_detection_benchmark.py` | **NEW** |
| `scripts/evaluate_detection_benchmark.py` | **NEW** |

### Phase 3–4 — Calibration + fusion optimization

| File | Change |
|------|--------|
| `scripts/calibrate_fusion_thresholds.py` | Extend for production calibration |
| `scripts/train_improved_champion.py` | Matched preprocessing, human-FPR early stop |
| `experiments/fusion/fusion_config.json` | Or replace with learned weights artifact |

### Phase 8 — Preprocessing unification

| File | Change |
|------|--------|
| `voice_shield/preprocessing.py` | Single canonical `AudioPipeline` |
| `scripts/train_*.py` | Use same pipeline as inference |

### Phase 12 — Real-time

| File | Change |
|------|--------|
| `ml-service/app/main.py` | **NEW** `WS /ws/detect` |
| `ml-service/app/streaming.py` | **NEW** chunk handler |
| `frontend/src/services/websocket.ts` | Audio chunk sender |
| `frontend/src/components/AudioRecorder.tsx` | Streaming mode |

### Phase 13–14 — Camera + location

| File | Change |
|------|--------|
| `frontend/src/components/CameraProtection.tsx` | **NEW** |
| `frontend/src/pages/DetectPage.tsx` | Protection mode orchestration |
| `frontend/src/pages/ReportScamPage.tsx` | Consent UX improvements |

### Phase 17–20 — Backend/infra

| File | Change |
|------|--------|
| `docker-compose.yml` | Mount `experiments/`, `voice_shield/` |
| `backend/src/routes/detection.routes.ts` | Fix route ordering |
| `backend/src/websocket/index.ts` | JWT auth, streaming protocol |
| `.env.example` | Align with actual config |

### Phase 22 — Tests

| File | Change |
|------|--------|
| `tests/test_human_false_positive.py` | Add soft-FPR, ASVspoof bonafide cases |
| `tests/test_fusion_weights.py` | **NEW** |
| `tests/test_streaming.py` | **NEW** |

---

## 18. What Will NOT Be Done Without Measurement

- Blindly changing `risk_score > 65` threshold
- Hardcoding human → BONA_FIDE
- Removing WavLM without measuring replacement
- Claiming accuracy without benchmark evidence
- Auto-starting long training jobs
- Deleting datasets or checkpoints
- UI polish before benchmark passes

---

## 19. Recommended Fix Order

1. **Build benchmark** (Phase 2) — establish ground-truth metrics before changes
2. **Per-model evaluation** (Phase 4) — measure all 5 models independently
3. **Fusion redesign** (Phase 4) — weights from dev-set optimization, down-weight WavLM
4. **Calibration** (Phase 3) — temperature/Platt on dev, wire to inference
5. **Reliability layer** (Phase 5) — OOD/LOW_QUALITY states
6. **Preprocessing alignment** (Phase 8) — then retrain (Phase 9)
7. **Model registry** (Phase 21) — eliminate dual-checkpoint confusion
8. **Real-time streaming** (Phase 12) — after offline benchmark passes
9. **Camera/location/reporting** (Phases 13–16) — after core ML reliable
10. **FINAL_ML_RELIABILITY_REPORT.md** (Phase 25) — with before/after evidence

---

## 20. Inspection Sign-Off

| Check | Status |
|-------|--------|
| Full project traversed | Yes |
| Dependency map built | Yes |
| Active vs inactive checkpoints identified | Yes |
| Execution flow documented | Yes |
| Test status captured (53 pytest + 15 vitest pass) | Yes |
| Known ML failure mode documented with evidence | Yes |
| Files for modification listed | Yes |
| No code modified in this phase | **Confirmed** |

**Next step:** Await approval to begin Phase 2 (benchmark infrastructure) and Phase 1 (fusion/calibration fixes) in that order.

---

*End of inspection. No project files were modified except creation of this document.*
