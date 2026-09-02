# VoiceShield Comprehensive Project Audit Report

**Date:** 2026-08-30  
**Auditor:** Senior ML + Audio DSP + Backend + Frontend + QA Engineering Team  
**Scope:** Full codebase audit covering ML inference, audio processing, backend gateway, FastAPI, React frontend, database, threat map, authentication, testing, and concurrency architecture.

---

## Executive Summary

VoiceShield is an AI-powered voice deepfake and scam detection platform. An exhaustive audit of all components was performed to identify root causes of previous HTTP 400 errors, NaN/Infinity values in UI displays, audio format rejections (WebM/Opus), label semantics, ML model calibration, database persistence, and threat map functionality.

---

## Audit Findings by Severity

```
┌────────────────────────────────────────────────────────┐
│ Severity Distribution                                  │
│ CRITICAL: 4  │  HIGH: 5  │  MEDIUM: 6  │  LOW: 4       │
└────────────────────────────────────────────────────────┘
```

### 1. CRITICAL SEVERITY

#### 1.1 WebM / Opus Audio Decoding & HTTP 400 Rejections
* **Location:** `backend/main.py` (L47, L207), `backend/src/middleware/upload.ts` (L46-48), `ml-service/app/preprocessing.py`
* **Root Cause:** 
  1. `backend/main.py` explicitly limited extensions to `{".wav", ".flac", ".mp3", ".ogg", ".m4a"}` and omitted `".webm"`.
  2. In `upload.ts`, when the browser's `MediaRecorder` uploads audio blobs without an explicit file extension or with MIME type `audio/webm;codecs=opus`, `path.extname(file.originalname)` was empty (`""`), triggering an immediate unhandled `400 Bad Request` or Multer error.
  3. Standard `scipy.io.wavfile` or `soundfile` without libsndfile WebM plugins cannot decode raw WebM containers natively.
* **Resolution Strategy:**
  - Standardize on `PyAV` (FFmpeg C-bindings) for container decoding directly from in-memory stream to 16kHz mono float32.
  - Add MIME-type inspection fallback when extension is absent or ambiguous.
  - Return structured error JSON `{ "success": false, "error": { "code": "UNSUPPORTED_AUDIO", ... } }` instead of generic 400.

#### 1.2 NaN / Infinity Invalidation & Formatting Glitches
* **Location:** `frontend/src/components/AudioWaveform.tsx`, `frontend/src/components/RiskGauge.tsx`, `ml-service/app/inference.py`
* **Root Cause:**
  1. WebM/Opus streaming recordings in Chromium-based browsers report `audio.duration = Infinity` or `NaN` until all frames are decoded.
  2. Direct mathematical operations `currentTime / duration` or `(secs / 60)` resulted in string outputs `"Infinity:NaN"` in the waveform HUD.
  3. Division by zero in spectral entropy or pitch autocorrelation when encountering silence frames.
* **Resolution Strategy:**
  - Decode WebM audio buffers using WebAudio `AudioContext.decodeAudioData` to retrieve exact finite duration.
  - Sanitize all audio arrays with `np.nan_to_num(y, nan=0.0, posinf=0.0, neginf=0.0)`.
  - Guard all React display formatters with `Number.isFinite()` and fallback to `00:00` or `0.0%`.

#### 1.3 Machine Learning Label Semantics Verification
* **Location:** `voice_shield/constants.py`, `voice_shield/inference.py`, `voice_shield/models/lcnn.py`, `voice_shield/models/fusion.py`
* **Verification:**
  - `CLASS_BONAFIDE = "bonafide"` (Ground Truth: Genuine Human Speech, Model Logit Target: 1.0)
  - `CLASS_SPOOF = "spoof"` (Ground Truth: Synthetic / Cloned / Replay, Model Logit Target: 0.0)
  - Spoof probability calculated as `1.0 - sigmoid(logit)`.
  - Confirmed: Labels are correctly aligned and not inverted.

#### 1.4 Broken Map "API Key Required" Bug
* **Location:** `frontend/src/components/ThreatMapComponent.tsx`
* **Root Cause:** Third-party commercial map tile providers (Mapbox/Google Maps) fail and display "API KEY REQUIRED" if frontend env tokens are missing.
* **Resolution Strategy:**
  - Implemented OpenStreetMap standard open tile layer (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) using `react-leaflet`.
  - Privacy-preserving coordinate rounding to 2 decimal places (~1.1 km precision) to protect reporter anonymity.

---

### 2. HIGH SEVERITY

#### 2.1 Sliding Window Aggregation & Spike Rejection
* **Location:** `voice_shield/inference.py`
* **Finding:** Single-window inference on long files causes false positives due to isolated breath or microphone pop artifacts.
* **Resolution:** 3.0s sliding window with 1.0s hop and 15% trimmed-mean aggregation across windows.

#### 2.2 VAD Audio Quality Gating
* **Location:** `voice_shield/vad.py`
* **Finding:** Pure silence or sub-second audio snippets should not be classified as spoof or bonafide.
* **Resolution:** Energy & spectral centroid based VAD gating returning `INSUFFICIENT_AUDIO` status.

#### 2.3 Multi-Model Fusion Calibration
* **Location:** `voice_shield/models/fusion.py`
* **Finding:** Arbitrary linear combinations of sub-model logits led to miscalibrated risk scores.
* **Resolution:** Calibrated Platt scaling / temperature scaling with weighted ensemble scoring and bounded risk tiers (0-30 LOW, 30-60 MEDIUM, 60-80 HIGH, 80-100 CRITICAL).

#### 2.4 End-to-End Test Suite Completeness
* **Location:** `scripts/e2e_test.py`
* **Finding:** Need end-to-end integration test validating signup, login, WAV upload, WebM upload, detection, history, scam report, threat map, and logout.

#### 2.5 Node.js Gateway & FastAPI ML Service Contract
* **Location:** `backend/src/services/mlService.ts`, `ml-service/app/main.py`
* **Finding:** Multipart form streaming between Express gateway and FastAPI ML service requires consistent timeouts, correlation IDs, and error wrapping.

---

### 3. MEDIUM SEVERITY

* **3.1 Database In-Memory Fallback Persistence:** Implemented resilient in-memory SQLite/relational fallback store in `backend/src/database/index.ts` so the system works with zero-config in dev/test.
* **3.2 Rate Limiting and DoS Protection:** Configured Express rate limiters for auth, detection, and global requests.
* **3.3 Phone Number Masking in Scam Reports:** Sensitive caller numbers masked to `+91-98****3210` in public feeds.
* **3.4 Forensic Signal Indicators:** Added 8 acoustic indicators (prosody, F0 variability, spectral flux, jitter, shimmer) to explain verdicts.
* **3.5 Dashboard Telemetry Real Data Binding:** Dashboard charts bound to actual DB records with clean empty state when 0 records exist.
* **3.6 Model Versioning:** Every inference returns `model_version`, `model_name`, and `checkpoint_hash`.

---

### 4. LOW SEVERITY

* **4.1 Console Logging Cleanliness:** Replaced ad-hoc debug console logs with structured logger.
* **4.2 Responsive UI Layout Adjustments:** Mobile-friendly layouts for 3D shield, radar charts, and map controls.
* **4.3 Clean Temporary File Disposal:** Automated background task cleanup for uploaded audio files.
* **4.4 Fast Startup Warmup:** PyTorch model warmup forward pass on service boot.

---

## Conclusion & Action Plan

The core components (ML inference, PyAV audio decoding, Express gateway, React UI, Leaflet map) have been audited. Next, we will run and record complete verification benchmarks, evaluate real-world human vs spoof datasets, execute end-to-end integration tests, and finalize all reports.
