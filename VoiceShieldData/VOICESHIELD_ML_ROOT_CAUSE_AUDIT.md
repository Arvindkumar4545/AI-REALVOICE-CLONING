# VoiceShield ML Root Cause Audit

**Date:** 2026-08-31  
**Scope:** Read-only technical audit (Phases 1–9). No source code, checkpoints, or training were modified.  
**Primary symptom:** Genuine human speech is frequently classified as SPOOF with very high displayed confidence/risk (e.g., 90–96%).

---

## A. Executive Summary

VoiceShield is a **6-model PyTorch ensemble** (LCNN, RawNet2, AASIST, WavLM, BiLSTM, ECAPA) wrapped in a FastAPI ML service and Node.js backend with a React frontend. Production inference is executed by `voice_shield.inference.VoiceShieldInferenceEngine`, **not** by the legacy `AudioSpoofNet` checkpoint loaded in `ml-service/app/inference.py`.

The false-positive problem is **real and reproducible**, but its severity depends on audio domain:

| Test set | Hard `SPOOF` on genuine human | High risk (>65) on genuine human | Notes |
|----------|------------------------------|----------------------------------|-------|
| In-The-Wild bonafide (20 samples, live test) | 0/20 | 0/20 | Mostly `BONA_FIDE` or `UNCERTAIN` |
| ASVspoof 2019 LA bonafide eval (15 samples, live test) | **4/15 (27%)** | **4/15 (27%)** | Risk 66–76%, WavLM often >0.67 |
| Formal eval (`evaluation/results/evaluation_metrics.json`, n=69) | 0 hard SPOOF | **52.94% binary FPR** at risk≥35% | ECE=0.298, AUC=0.70 |

**Root cause (concise):** The ensemble is **under-trained, domain-mismatched, and miscalibrated**. The WavLM head has **73.5% human false-positive rate** on held-out test but receives **40% fusion weight**. Training uses fixed 4-second clips without VAD; inference applies VAD trimming + 3-second sliding windows. Confidence and risk scores are **heuristic transforms of uncalibrated sigmoid outputs**, not validated probabilities. Marketing reports (`REAL_WORLD_TEST_REPORT.md`) undercount false positives by only counting hard `SPOOF` labels and ignoring `UNCERTAIN` with elevated risk.

The microphone pipeline is **not fundamentally broken** (WebM/Opus decodes via PyAV), but **codec + truncation + VAD** introduce a distribution shift versus FLAC ASVspoof training data that worsens false positives on live recordings.

---

## B. Current Architecture

### Repository layout (ML-relevant)

```
VoiceShieldData/
├── voice_shield/          # Core ML library (models, inference, preprocessing, training)
├── ml-service/            # FastAPI inference microservice (port 8000)
├── backend/               # Node.js API gateway (port 5000)
├── frontend/              # React UI
├── datasets/              # ASVspoof2019, In-The-Wild, mlaad (empty), additional (empty)
├── manifests/             # dataset_manifest.csv, speaker_disjoint_manifest.csv
├── experiments/           # Active checkpoints (improved_model/, lcnn_lfcc/, wavlm/, etc.)
├── models/voiceshield_best/  # Legacy AudioSpoofNetV2 (loaded for metadata only)
├── model_artifacts/       # calibration.json
├── evaluation/            # Formal evaluation scripts + results
├── scripts/               # Training orchestrators
├── artifacts/baseline/    # Collapsed baseline experiment (F1=0)
└── checkpoints/           # EMPTY
```

### Runtime model stack

| Component | File | Role at runtime |
|-----------|------|-----------------|
| Ensemble engine | `voice_shield/inference.py` | **Production inference** |
| Fusion / risk | `voice_shield/models/fusion.py` | Weighted spoof probability → risk score → 3-state class |
| Feature extraction | `voice_shield/features.py` | LFCC, prosody, waveform loading |
| Audio decode | `voice_shield/preprocessing.py` | PyAV → soundfile → librosa fallback |
| VAD / quality | `voice_shield/vad.py` | Gating, voiced-segment extraction |
| ML service wrapper | `ml-service/app/inference.py` | Validates audio, calls ensemble, adds forensics |
| Legacy CNN | `ml-service/app/model.py` | Loaded for warmup/`/model/info` only — **not used in `/predict`** |

### Sub-model architectures

| Model | File | Parameters | Input | Output |
|-------|------|------------|-------|--------|
| LCNN | `voice_shield/models/lcnn.py` | ~245K | `[B, 3, 20, T]` LFCC+deltas | sigmoid → bonafide prob |
| RawNet2 | `voice_shield/models/rawnet2.py` | ~661K | `[B, T]` waveform | sigmoid logit |
| AASIST | `voice_shield/models/aasist.py` | ~208K | `[B, T]` waveform | sigmoid logit |
| WavLM head | `voice_shield/models/wavlm_head.py` | ~414K | `[B, T]` waveform | **Custom conv+Transformer, NOT pretrained WavLM** |
| BiLSTM | `voice_shield/models/bilstm_prosody.py` | ~185K | `[B, T, 8]` prosody | sigmoid logit |
| ECAPA-TDNN | `voice_shield/models/ecapa.py` | ~225K | mel `[1, 40, 96]` | speaker embedding (optional) |

**Label convention:** `LABEL_BONAFIDE = 1.0`, `LABEL_SPOOF = 0.0`. Inference computes `spoof_prob = 1 - sigmoid(logit)`.

---

## C. Actual Inference Pipeline

### End-to-end trace (microphone or file upload)

```
MICROPHONE / FILE
  └─ frontend/src/components/AudioRecorder.tsx
       MediaRecorder: audio/webm (Opus) | audio/mp4 | audio/wav
       Chunks every 200ms, auto-stop at 10s
       ↓
BROWSER RECORDING → Blob/File (mic_recording_*.webm)
       ↓
UPLOAD/API
  └─ frontend/src/services/api.ts → POST /api/v1/detection?sync=true
       FormData field: "audio"
       ↓
BACKEND
  └─ backend/src/middleware/upload.ts (multer, saves to disk)
  └─ backend/src/controllers/detectionController.ts
  └─ backend/src/queue/index.ts → processDetectionJob()
  └─ backend/src/services/mlService.ts
       FormData field: "file" (streamed bytes, no transcoding)
       POST http://localhost:8000/predict
       ↓
ML SERVICE
  └─ ml-service/app/main.py → predict_single_audio()
  └─ ml-service/app/inference.py → ModelManager.predict()
       ↓
AUDIO DECODING
  └─ ml-service/app/preprocessing.py → validate_audio_file()
  └─ voice_shield/preprocessing.py → load_audio_safe() / decode_with_pyav()
       PyAV resample → mono float32 @ 16 kHz
       **Truncate/pad to first 4.0 seconds (64,000 samples)**
       ↓
RESAMPLING / MONO
  └─ Handled inside PyAV resampler or librosa (target 16 kHz mono)
       ↓
VAD / QUALITY GATING
  └─ voice_shield/vad.py → compute_audio_quality_metrics()
       Rejects if duration < 0.5s, >95% silence, near-zero energy
       ↓
VOICED TRIMMING
  └─ voice_shield/vad.py → extract_voiced_waveform()
       Energy threshold = 2% of max frame energy
       ↓
SLIDING WINDOWS
  └─ voice_shield/inference.py → _slice_audio_windows()
       Window: 3.0s, hop: 1.5s (on VAD-trimmed audio, max 4s total)
       ↓
FEATURE EXTRACTION (per window)
  └─ voice_shield/features.py
       LCNN: extract_lfcc() — n_fft=512, hop=160, win=400, 20 LFCC + deltas
       BiLSTM: extract_prosodic_features() — 8 features, 25ms frame / 10ms hop
       RawNet2/AASIST/WavLM: raw waveform tensor
       ↓
MODEL (torch.no_grad(), model.eval())
  └─ voice_shield/inference.py — 5 models scored per window
       sigmoid(logit) → bonafide_prob → spoof_prob = 1 - bonafide_prob
       ↓
WINDOW AGGREGATION
  └─ 15% trimmed mean across windows (per sub-model)
       ↓
FUSION
  └─ voice_shield/models/fusion.py → VoiceShieldRiskClassifier.compute_risk()
       Weighted spoof prob: LCNN×0.45 + WavLM×0.40 + BiLSTM×0.15
       RawNet2/AASIST weights = **0.0** (computed but discarded)
       ↓
LOGITS → PROBABILITIES
  └─ Sigmoid per sub-model; fusion produces calibrated_spoof_prob ∈ [0.01, 0.99]
       ↓
CALIBRATION
  └─ **No Platt/temperature scaling applied at inference**
       model_artifacts/calibration.json loaded but threshold unused in decisions
       ↓
DECISION (3-state)
  └─ risk_score = spoof_prob × 100 (unless disagreement → capped 35–60)
       risk ≤ 35 → BONA_FIDE
       35 < risk ≤ 65 OR model disagreement → UNCERTAIN
       risk > 65 → SPOOF
       ↓
CONFIDENCE / RISK SCORE
  └─ confidence = clip(margin × agreement × quality × (1-uncertainty), **0.35**, 0.98)
       ml-service scales confidence × 100 for API response
       ↓
BACKEND RESPONSE → stored in DB → FRONTEND
  └─ frontend/src/components/RiskGauge.tsx displays risk_score and confidence as %
```

### Answers to pipeline checklist (items 1–36)

| # | Question | Answer |
|---|----------|--------|
| 1 | Model architecture | `voice_shield/models/*.py` (ensemble); legacy `ml-service/app/model.py` |
| 2 | Checkpoint loading | `voice_shield/inference.py:load_checkpoints()` |
| 3 | Audio preprocessing | `voice_shield/preprocessing.py`, `voice_shield/features.py`, `voice_shield/vad.py` |
| 4 | Audio → features | LFCC (`features.py`), raw waveform, prosody (`features.py`), mel for ECAPA only |
| 5 | Sample rate | **16,000 Hz** |
| 6 | Channels | **Mono** |
| 7 | Normalization | Per-utterance z-score on log-mel (training); waveform amplitude in [-1,1] after decode |
| 8 | Duration/window | Train: **4.0s** fixed; Infer: **4.0s load** → VAD trim → **3.0s windows**, 1.5s hop |
| 9 | FFT | n_fft=**512**, win=**400**, hop=**160** |
| 10 | Mel | n_mels=**40**, fmin=**20**, fmax=**8000**, frames=**96** |
| 11 | Padding/truncation | Pad with zeros or truncate to 64,000 samples at load |
| 12 | VAD | Energy-based, 30ms frames, threshold=2% max energy — **inference only** |
| 13 | Architecture used | 6-model ensemble; fusion uses 3 models |
| 14 | Checkpoint at runtime | `experiments/improved_model/{model.pt,wavlm.pt,bilstm.pt}` (fallback chains exist) |
| 15 | Classes | `BONA_FIDE`, `SPOOF`, `UNCERTAIN`, `INSUFFICIENT_AUDIO` |
| 16 | SPOOF meaning | Synthetic/fake/deepfake/replay attack (trained on ASVspoof spoof + ITW spoof) |
| 17 | REAL/HUMAN meaning | Bonafide human speech (LABEL=1.0 in training) |
| 18 | Probability | `1 - sigmoid(logit)` per model; weighted fusion in `fusion.py` |
| 19 | Confidence | Heuristic: `abs(spoof_prob-0.5)*2 × agreement × quality × (1-uncertainty)`, floor **0.35** |
| 20 | Risk score | `spoof_prob × 100` (or disagreement-capped 35–60) |
| 21 | Threshold | 3-state: **35/65** on risk_score; `calibration.json` threshold **unused** |
| 22 | Sigmoid/softmax | **Sigmoid** (binary, per model) |
| 23 | Eval mode | **Yes** — `model.eval()` in `load_checkpoints()` |
| 24 | Gradients disabled | **Yes** — `torch.no_grad()` in `detect()` |
| 25 | Device | CUDA if available, else CPU |
| 26 | Frontend → ML | Frontend → Node :5000 → ML :8000 `/predict` ✓ |
| 27 | Backend forwarding | Raw file bytes via `fs.createReadStream` — no modification |
| 28 | MIME/format | WebM, WAV, FLAC, MP3, OGG, M4A accepted |
| 29 | ffmpeg | **Not used** |
| 30 | Conversion changing signal | PyAV decode+resample alters phase/bandwidth; Opus lossy for mic |
| 31 | Mic format compatible | Yes, if PyAV installed; **distribution differs from training FLAC** |
| 32 | Upload vs mic | Same pipeline; upload tab rejects `.webm` in UI but mic sends `.webm` |
| 33 | Resampling bug | No obvious bug; consistent 16 kHz target |
| 34 | Stereo→mono | Mean across channels (soundfile) or PyAV `layout="mono"` |
| 35 | Normalization duplicated/missing | Mel z-score in training; **waveform not z-scored** at inference for raw models |
| 36 | Train/infer preprocessing match | **NO** — see Preprocessing Audit |

---

## D. Model Audit

### Training configuration (champion pipeline)

**Script:** `scripts/train_improved_champion.py`

| Parameter | Value |
|-----------|-------|
| Optimizer | AdamW, weight_decay=1e-4 |
| Learning rate | LCNN/BiLSTM: 1e-3; WavLM: 5e-4 |
| Scheduler | CosineAnnealingLR |
| Loss | BCEWithLogitsLoss, pos_weight=1.2 |
| Batch size | 32 (WavLM: 16) |
| Epochs | LCNN: 5; WavLM/BiLSTM: 4 |
| Sampling | WeightedRandomSampler (class-balanced) |
| Augmentation | Gain, shift, noise, telephony (train only) |
| Early stopping | Best checkpoint by validation F1 |
| Train data | 1600 samples (800 bonafide + 800 spoof subsample) |
| Manifest | `speaker_disjoint_manifest.csv` |
| Random seed | 42 (partial — not all libs seeded) |

### Held-out test metrics (`experiments/improved_model/metrics.json`, n=800)

| Model | Balanced Acc | ROC-AUC | EER | **Human FPR** |
|-------|-------------|---------|-----|---------------|
| LCNN | 59.8% | 0.646 | 35.3% | **30.0%** |
| WavLM | 54.9% | 0.597 | 43.3% | **73.5%** |
| BiLSTM | 65.1% | 0.679 | 33.5% | **34.3%** |

### Baseline collapse (`artifacts/baseline/metrics.json`)

- 3 epochs, 3000 train / 800 val samples, BCELoss
- **val precision/recall/F1 = 0.0** (predicted all spoof)
- 87.9% accuracy from majority-class guessing

### Architecture appropriateness

The **model families are appropriate** for spoof detection (LCNN/LFCC and raw-waveform CNNs are standard in ASVspoof). However:

1. **WavLMClassifier is misnamed** — it is a small custom Transformer, not a pretrained self-supervised WavLM/Wav2Vec2 model.
2. **RawNet2 and AASIST are trained** (~2.6M and ~208K params) but given **zero fusion weight**.
3. **Ensemble is not trained end-to-end** — fusion weights are hand-set (0.45/0.40/0.15).
4. **Checkpoint selection optimizes F1**, which on imbalanced data can still tolerate high human FPR.

---

## E. Dataset Audit

### Scale and balance

| Manifest | Total | Bonafide | Spoof | % Bonafide |
|----------|-------|----------|-------|------------|
| `dataset_manifest.csv` | 371,670 | 61,336 | 310,334 | **16.5%** |
| `speaker_disjoint_manifest.csv` | 403,449 | 81,299 | 322,150 | **20.2%** |

### Sources

- **ASVspoof 2019 LA + PA:** 339,891 FLAC files, 16 kHz, speaker-disjoint splits verified
- **In-The-Wild:** 31,779 WAV, celebrity speakers, used as OOD benchmark
- **mlaad/, additional/:** Empty placeholders

### Training subsampling problem

Champion training uses only **1,600 balanced samples** from a 400K+ manifest — severe under-utilization of available data.

### Leakage

- ASVspoof LA/PA: **speaker-disjoint** across train/dev/eval (verified in `reports/dataset_audit.json`)
- `speaker_disjoint_manifest.csv`: explicit zero speaker leakage for ITW celebrities
- Champion train subsample is random within split — low leakage risk but high variance

### Domain coverage gaps for live microphone use

| Condition | In training data? | In eval? |
|-----------|-------------------|----------|
| ASVspoof FLAC bonafide/spoof | Yes | Yes |
| In-The-Wild celebrity WAV | Partial (eval) | Yes |
| Browser WebM/Opus mic | **No** | Minimal (`tests/test_webm_upload.py` only) |
| Phone-quality / WhatsApp | Augmented (telephony sim) | Not systematically |
| Modern TTS (ElevenLabs, etc.) | Limited in ITW | Partial |
| User's own voice (non-celebrity) | **Not represented** | **No** |

---

## F. Training Audit

### Two training eras coexist

1. **Legacy baseline:** `baseline_train.py` / `voice_shield/train.py` — single AudioSpoofNet on log-mel, collapsed model
2. **Production ensemble:** `scripts/train_improved_champion.py`, `scripts/train_all_research_models.py`

### Critical train/inference mismatches

| Aspect | Training | Inference |
|--------|----------|-----------|
| Clip length | 4.0s full clip | 4.0s load → VAD trim → 3.0s windows |
| VAD | None | Energy-based trim |
| Augmentation | Yes (champion) | None |
| Window aggregation | Single forward pass | Trimmed mean over windows |
| RawNet2/AASIST | Trained | **Weight 0 in fusion** |

### Class weighting

- WeightedRandomSampler + pos_weight=1.2 mitigates imbalance during training
- Does not fix WavLM's 73.5% human FPR on test

---

## G. Preprocessing Audit

### Shared constants (`voice_shield/preprocessing.py`)

```
SAMPLE_RATE = 16000
DURATION = 4.0s → 64000 samples
N_MELS = 40, N_FFT = 512, HOP = 160, WIN = 400
FMIN = 20, FMAX = 8000, TARGET_FRAMES = 96
Mel norm: per-utterance z-score
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| PRE-1 | **HIGH** | 10s mic recording truncated to **first 4 seconds** — user speech after 4s ignored |
| PRE-2 | **HIGH** | VAD removes silence/non-speech at inference but not during training |
| PRE-3 | **MEDIUM** | Opus/WebM codec artifacts not in ASVspoof training distribution |
| PRE-4 | **MEDIUM** | Failed decode returns **zeros** (`load_audio_safe` except block) — silent audio may pass VAD gate edge cases |
| PRE-5 | **LOW** | `ModelManager.predict()` calls `load_audio_array()` for forensics then passes **raw bytes** to ensemble (consistent, but double decode) |

---

## H. Microphone Pipeline Audit

| Stage | Setting | Risk |
|-------|---------|------|
| `getUserMedia` | `{ audio: true }` only | No echo cancellation / noise suppression control |
| MediaRecorder MIME | `audio/webm` preferred | Opus compression |
| Chunk interval | 200ms | Standard |
| Max duration | 10s auto-stop | Only first 4s analyzed |
| Backend accept | `.webm` allowed | OK |
| Frontend upload UI | `.webm` **rejected** | Inconsistent UX |
| `audio/wav` fallback | Likely invalid in most browsers | Decode failure risk |
| Decode | PyAV → 16 kHz mono | OK if `av` installed |
| ffmpeg | Not used | Dependency on PyAV for WebM |

**Verdict:** Pipeline is **functional but domain-shifted**. Not "broken" in the sense of wrong bytes or wrong endpoint, but **not validated** for browser microphone recordings.

---

## I. Evaluation Audit

### Metrics currently computed

| Metric | Implemented? | Location |
|--------|-------------|----------|
| Accuracy | Yes | `evaluation/evaluate_model.py` |
| Precision/Recall/F1 | Yes | Same |
| ROC-AUC | Yes | Same |
| PR-AUC | Yes | Same |
| FAR/FRR | Partial (as FPR/FNR) | Same |
| EER | Yes | Same |
| Confusion matrix | Yes | Same |
| Brier score | Yes | Same |
| ECE | Yes | Same (ECE=**0.298** — poor calibration) |
| Temperature scaling | **No** | — |
| Per-domain eval (mic vs file) | **No** | — |
| Speaker-independent test | Partial | speaker_disjoint manifest exists |

### Report inconsistencies (CRITICAL)

| Report | Claim | Reality |
|--------|-------|---------|
| `REAL_WORLD_TEST_REPORT.md` | 0% human FPR | Counts only `prediction=="spoof"`, ignores UNCERTAIN + high risk |
| `REAL_WORLD_TEST_REPORT.md` | EER 6.4%, AUC 0.94 | Contradicts `evaluation_metrics.json` (EER 34.8%, AUC 0.70) on ITW |
| `experiments/improved_model/comprehensive_evaluation.json` | 0% human FPR on ITW | 0 hard SPOOF but **18 humans → UNCERTAIN**, 0 spoof detected as SPOOF |
| `reports/model_evaluation.json` | 0% FPR, AUC 0.98 | n=76, likely cherry-picked / different threshold |

### Live verification (this audit)

**ASVspoof LA bonafide eval — sample results:**

```
LA_E_4581379.flac  → SPOOF  risk=76.1  WavLM=0.849  LCNN=0.707
LA_E_3757378.flac  → SPOOF  risk=67.9  WavLM=0.668
LA_E_7824929.flac  → SPOOF  risk=66.8  WavLM=0.717
LA_E_6154503.flac  → SPOOF  risk=67.3  WavLM=0.871
```

This matches the user's reported **high-confidence false spoof** pattern.

---

## J. Confidence / Calibration Audit

### What the UI shows

- **Risk Index** = `risk_score` (0–100), displayed as `XX%`
- **Model Confidence** = `confidence` from API (already ×100 in `ml-service/app/inference.py:155`)

### How confidence is computed (`fusion.py:176-179`)

```python
raw_margin = abs(calibrated_spoof_prob - 0.50) * 2.0
confidence = clip(raw_margin * model_agreement * quality_factor * (1 - uncertainty*0.5), 0.35, 0.98)
```

### Problems

| ID | Severity | Issue |
|----|----------|-------|
| CAL-1 | **CRITICAL** | Confidence is **not** a calibrated probability — minimum floor **35%** even when uncertain |
| CAL-2 | **CRITICAL** | `risk_score ≈ spoof_probability × 100` — displayed as "% threat" without calibration evidence |
| CAL-3 | **HIGH** | ECE = **0.298** (target < 0.05 for production calibration) |
| CAL-4 | **HIGH** | `calibration.json` threshold loaded into `self.threshold` but **never used** in `compute_risk()` |
| CAL-5 | **MEDIUM** | Schema docstring says "calibrated model confidence percentage" — **misleading** |
| CAL-6 | **MEDIUM** | No temperature scaling / Platt scaling / isotonic regression deployed |

**Verdict:** Confidence is **misleading**. The system can show 76% risk and 40%+ confidence on genuine ASVspoof bonafide speech.

---

## K. False Positive Analysis

### Mechanism

1. **WavLM head** fires high spoof probability on genuine speech (73.5% FPR on test; observed 0.67–0.87 on LA bonafide in live test).
2. Fusion gives WavLM **40% weight**, pulling fused spoof_prob above 0.65.
3. When LCNN agrees (also elevated on LA bonafide), `model_agreement` is high → classification = **SPOOF**, risk > 65.
4. UI displays risk and confidence as percentages → user sees **"SPOOF 76%"**.

### Why ITW celebrities fare better

In-The-Wild bonafide clips are **closer to the champion training distribution** (same dataset family). ASVspoof LA bonafide and **live microphone speech** are more out-of-domain.

### Why older baseline made it worse

`AudioSpoofNet` baseline predicted **all spoof** (F1=0). If any code path still used it, humans would always be SPOOF. Current `/predict` uses ensemble, but `models/voiceshield_best/model.pt` remains the **documented** checkpoint hash in API metadata — confusing for operators.

---

## L. Bugs Found

| ID | Severity | File | Function/Class | Problem | Evidence |
|----|----------|------|----------------|---------|----------|
| BUG-1 | **CRITICAL** | `voice_shield/models/fusion.py` | `compute_risk()` | WavLM weight 0.40 despite 73.5% human FPR | `experiments/improved_model/metrics.json` |
| BUG-2 | **CRITICAL** | `voice_shield/models/fusion.py` | `compute_risk()` | `self.threshold` from calibration.json unused | `load_calibration()` vs decision logic |
| BUG-3 | **HIGH** | `ml-service/app/inference.py` | `ModelManager.predict()` | Loads AudioSpoofNet but never runs it; misleading `checkpoint_hash` | Lines 75-88 vs 141-144 |
| BUG-4 | **HIGH** | `voice_shield/inference.py` | `detect()` | RawNet2/AASIST computed every window, weight 0 | Wasted; incoherent architecture story |
| BUG-5 | **HIGH** | `voice_shield/preprocessing.py` | `load_audio_safe()` | Returns zeros on decode failure | Line 99-101 |
| BUG-6 | **HIGH** | `REAL_WORLD_TEST_REPORT.md` | — | Claims 0% FPR, AUC 0.94 — contradicted by formal eval | vs `evaluation_metrics.json` |
| BUG-7 | **MEDIUM** | `voice_shield/inference.py` | `BASE_DIR` | Hardcoded `F:\VoiceShieldData` | Line 45 — breaks on other machines |
| BUG-8 | **MEDIUM** | `ml-service/app/main.py` | `api_v1_metrics()` | Missing `Path`/`json` imports | Would crash if called |
| BUG-9 | **MEDIUM** | `frontend` | `FileUploadZone` vs `AudioRecorder` | WebM accepted on mic, rejected on upload | Inconsistent validation |
| BUG-10 | **LOW** | `AudioRecorder.tsx` | MIME fallback | `audio/wav` MediaRecorder often invalid | Lines 69-73 |

---

## M. Risky Assumptions

1. **Softmax/sigmoid output = real-world probability** — not validated (ECE 0.298).
2. **"WavLM" implies pretrained self-supervised features** — it is a small custom model.
3. **0% FPR in marketing reports** — an artifact of 3-state labeling and metric definitions.
4. **4 seconds of audio is representative** — mic recordings up to 10s are silently truncated.
5. **Ensemble agreement implies correctness** — correlated errors across under-trained models.
6. **ASVspoof-trained models generalize to live mic** — not demonstrated.
7. **checkpoints/ directory** — empty; operators may look in wrong place.

---

## N. Recommended Fixes

### Priority 1 — CRITICAL (before any UI work)

1. **Re-weight or remove WavLM from fusion** until human FPR < 10% on bonafide validation.
2. **Implement proper calibration** (temperature scaling on validation set) and separate **display confidence** from **spoof probability**.
3. **Raise SPOOF threshold** or require multi-model consensus (e.g., ≥2 of 3 primary models > 0.65) before hard SPOOF.
4. **Align train/inference preprocessing** — add VAD + sliding windows to training, or remove VAD from inference.
5. **Run honest evaluation** on: ASVspoof bonafide, ITW bonafide, synthetic mic recordings (WebM round-trip), with **hard SPOOF + UNCERTAIN@risk>50** as secondary metrics.

### Priority 2 — HIGH

6. Retrain WavLM head (or replace with actual pretrained Wav2Vec2 frozen frontend) with **human FPR as early-stopping metric**.
7. Increase training data beyond 1,600 samples; use full speaker_disjoint train split.
8. Integrate RawNet2/AASIST with learned fusion weights (or remove from inference to save latency).
9. Fix `calibration.json` to drive decisions or remove dead code.
10. Add microphone-specific eval suite (record → WebM → decode → score).

### Priority 3 — MEDIUM

11. Remove hardcoded `BASE_DIR`; use environment variable or repo-relative paths.
12. Analyze full 10s recording (or warn user only first 4s used).
13. Unify WebM acceptance in frontend upload zone.
14. Clean up misleading reports; archive inflated metrics.

### Priority 4 — LOW

15. Fix `api_v1_metrics` imports.
16. Remove unused AudioSpoofNet load from hot path (or clearly separate legacy endpoint).

---

## O. Priority Summary Table

| Priority | Count | Focus |
|----------|-------|-------|
| CRITICAL | 6 | WavLM fusion weight, calibration, misleading confidence, evaluation honesty |
| HIGH | 9 | Train/infer mismatch, retraining, mic domain eval |
| MEDIUM | 7 | Path hardcoding, truncation, UI consistency |
| LOW | 3 | Minor code hygiene |

---

# Post-Audit Answers (Required Deliverables)

## 1. ROOT CAUSE

**Primary:** The production fusion over-weights a **WavLM head that misclassifies 73.5% of genuine human test samples**, combined with **no probability calibration** and a **risk score that is a linear scaling of uncalibrated spoof probability**. Secondary: **train/inference preprocessing mismatch** (VAD, sliding windows, codec) causes additional domain shift for microphone and ASVspoof bonafide audio.

## 2. TOP 5 PROBLEMS

1. **WavLM sub-model high human FPR (73.5%) with 40% fusion weight** — `fusion.py`, `experiments/improved_model/metrics.json`
2. **Uncalibrated sigmoid outputs displayed as calibrated confidence/risk %** — `fusion.py`, `ml-service/app/inference.py`, ECE=0.298
3. **Training/inference preprocessing mismatch** (4s clip vs VAD + 3s windows) — `train_improved_champion.py` vs `inference.py`
4. **Severe under-training** (1,600 samples, 4–5 epochs) on 400K+ dataset — `train_improved_champion.py`
5. **Misleading evaluation reports** that hide false positives behind `UNCERTAIN` label and narrow metric definitions — `REAL_WORLD_TEST_REPORT.md`

## 3. EXACT FILES THAT MUST CHANGE

| File | Why |
|------|-----|
| `voice_shield/models/fusion.py` | Fusion weights, thresholds, confidence formula, use calibration |
| `voice_shield/inference.py` | Window policy, optional model gating, path config |
| `voice_shield/preprocessing.py` | Truncation policy, decode failure handling |
| `voice_shield/vad.py` | Align VAD with training or add train-time VAD |
| `voice_shield/features.py` | Feature parity with training |
| `scripts/train_improved_champion.py` | Retrain with matched preprocessing, human-FPR metric |
| `scripts/train_all_research_models.py` | Fusion weight learning, more data |
| `evaluation/evaluate_model.py` | Honest FPR including UNCERTAIN-high-risk |
| `ml-service/app/inference.py` | Confidence scaling, remove misleading checkpoint metadata |
| `ml-service/app/schemas.py` | Correct confidence semantics in docs |
| `frontend/src/components/RiskGauge.tsx` | Distinguish probability vs confidence vs inconclusive |
| `frontend/src/components/AudioRecorder.tsx` | Duration/truncation warning |
| `model_artifacts/calibration.json` | Proper fitted calibration parameters |
| `REAL_WORLD_TEST_REPORT.md` | Correct metrics or deprecate |

## 4. EXACT CHANGES REQUIRED

1. **Fusion:** Reduce WavLM weight to ≤0.15 or gate: require `wavlm_p > 0.65 AND lcnn_p > 0.65` for SPOOF. Add `INCONCLUSIVE` when `max(spoof_prob, 1-spoof_prob) < 0.6`.
2. **Calibration:** Fit temperature scaler on speaker-disjoint dev set; apply before risk_score; report ECE < 0.10 target.
3. **Confidence:** Replace heuristic with calibrated `max(p, 1-p)` or ensemble vote margin; **remove 0.35 floor** for insufficient-evidence cases.
4. **Training:** Train with identical VAD + 3s window pipeline; use ≥10K samples; early-stop on **human FPR**, not F1 alone.
5. **Evaluation:** Report: hard FPR, soft FPR (risk≥50), UNCERTAIN rate on humans, ECE, Brier, per-domain breakdown.
6. **Mic pipeline:** Add WebM round-trip eval; extend analysis beyond first 4s or warn user.
7. **Dead code:** Either wire RawNet2/AASIST into fusion with learned weights or remove from inference loop.

## 5. WHETHER RETRAINING IS REQUIRED

**Yes.** Checkpoint quality is insufficient (WavLM human FPR 73.5%, LCNN 30%, ensemble EER ~35%). Fusion weight changes alone help but **cannot fix** a model that systematically scores humans as spoof. Minimum: retrain WavLM + recalibrate fusion; recommended: full ensemble retrain with matched preprocessing.

## 6. WHETHER THE CURRENT DATASET IS SUFFICIENT

**Partially.** ASVspoof + In-The-Wild provide **adequate volume** (370K+ files) but:
- Champion training uses **<0.4%** of available data
- **Missing:** browser WebM/Opus mic recordings, diverse non-celebrity speakers, modern TTS at scale
- **Action:** Use existing manifests fully; **add** a small targeted set of genuine mic recordings for validation (not necessarily for training)

## 7. WHETHER THE CURRENT MODEL ARCHITECTURE IS SUFFICIENT

**The architecture family is sound; the implementation is not sufficient for production.**
- LCNN + raw-waveform + prosody is a valid ensemble design
- Custom "WavLM" head underperforms and is misleadingly named
- Fusion weights are hand-tuned, not learned
- RawNet2/AASIST trained but unused

## 8. WHETHER THE MICROPHONE PIPELINE IS BROKEN

**No — but it is unvalidated and domain-shifted.**
- Bytes flow correctly: Mic → Node → ML → PyAV decode → ensemble
- WebM/Opus is decoded (PyAV present in `.venv`)
- **Risks:** 4s truncation, Opus artifacts, no mic-specific eval, `audio/wav` fallback hazard

## 9. WHETHER CONFIDENCE IS MISLEADING

**Yes, conclusively.**
- Confidence is a heuristic with a **35% floor**, not a calibrated probability
- Risk score is approximately `spoof_prob × 100` without calibration (ECE 0.298)
- UI presents both as percentages implying scientific certainty

## 10. STEP-BY-STEP IMPLEMENTATION PLAN

### Phase A — Measurement (no model changes, 1–2 days)
1. Run standardized eval harness on: ASVspoof LA bonafide, ITW bonafide, mic-simulated WebM, spoof set.
2. Log per-model scores, risk, class — produce confusion matrices for **hard SPOOF** and **risk≥50**.
3. Archive results as `evaluation/results/baseline_pre_fix.json`.

### Phase B — Emergency mitigation (fusion-only, 1 day)
4. Lower WavLM fusion weight to 0.10–0.15; require 2-model agreement for SPOOF.
5. Widen UNCERTAIN band (e.g., 30–70 risk) until recalibration.
6. Remove confidence floor; show `INCONCLUSIVE` when evidence weak.
7. Re-run Phase A eval; confirm human hard-FPR drops.

### Phase C — Preprocessing alignment (2–3 days)
8. Add VAD + sliding-window extraction to `ChampionDataset` in training scripts.
9. Match truncation policy between train and infer (or analyze full clip).
10. Add decode-failure explicit error instead of zero-padding.

### Phase D — Retraining (3–7 days)
11. Retrain LCNN, WavLM (or Wav2Vec2-head), BiLSTM on ≥20K speaker-disjoint samples.
12. Early-stop on **human FPR @ 5% FNR operating point**.
13. Fit temperature scaler on dev set; save to `model_artifacts/calibration.json`.
14. Optionally train learned fusion (logistic regression on dev set sub-model scores).

### Phase E — Validation (2 days)
15. Full eval suite: EER, AUC, FPR, FNR, ECE, Brier, per-domain.
16. Target: human hard-FPR < 5%, human soft-FPR (risk≥50) < 15%, spoof FNR < 25% (tune per product requirements).
17. Mic recording manual test protocol (10+ speakers).

### Phase F — Integration (1–2 days)
18. Update ML service response semantics and frontend labels.
19. Add "only first 4s analyzed" notice for mic recordings.
20. Deprecate inflated reports; publish honest `evaluation/results/post_fix.json`.

### Phase G — Approval gate
21. **Stop for user approval** before deploying retrained checkpoints to production.

---

*End of audit. No project files were modified except creation of this report.*
