# VoiceShield Continuation & Project Inspection Report

**Date:** 2026-08-31  
**Project Root:** `F:\VoiceShieldData`  
**Objective:** Resolve ML/DL AI voice-clone detection false negatives and UNCERTAIN misclassifications while preserving low human false positive rates.

---

## 1. Git State & Uncommitted Changes

- **Branch:** `main`
- **Commit History:** Fresh workspace (no previous commits; working tree contains project source, datasets, manifests, tests, audits, and debug scripts).
- **Status:** All files intact; previous diagnostic scripts (`STEP1_DIAGNOSIS.py`, `debug_step*.py`, `VOICESHIELD_ML_ROOT_CAUSE_AUDIT.md`, `evaluation/real_world_benchmark/*`) were preserved without modification.

---

## 2. Dataset & Manifest Verification

### A. Manifest Inventory
| Manifest | Total Rows | Bonafide Count | Spoof Count | Class Ratio (B:S) | Splits | Sources |
|---|---|---|---|---|---|---|
| `manifests/dataset_manifest.csv` | 371,670 | 61,336 (16.5%) | 310,334 (83.5%) | 1:5.06 | Train (79.4K), Dev (54.5K), Eval (237.7K) | PA (218.4K), LA (121.5K), In-The-Wild (31.8K) |
| `manifests/speaker_disjoint_manifest.csv` | 403,449 | 81,299 (20.2%) | 322,150 (79.8%) | 1:3.96 | Train (100.9K), Dev (56.8K), Test (245.7K) | ASVspoof2019 (371.7K), In-The-Wild (31.8K) |

### B. Physical Audio Files on Disk
- **ASVspoof 2019 (Logical Access - LA):** Located at `datasets/asvspoof2019/LA/LA/` containing train, dev, eval FLAC files and CM protocols.
- **ASVspoof 2019 (Physical Access - PA):** Located at `datasets/asvspoof2019/PA/PA/` containing train, dev, eval FLAC files and CM protocols.
- **In-The-Wild Deepfake Dataset:** Located at `datasets/in_the_wild/EXTRACTED/release_in_the_wild/` containing 31,779 WAV files and `meta.csv`.
- **Empty Placeholders:** `datasets/mlaad/` and `datasets/additional/` are empty.

### C. Known Failing Sample Investigation (`05a90ab3-a28b-4d0e-83d6-3f0246f07444.mp3`)
- **Filesystem Search:** Exhaustive recursive search across the workspace, backend uploads, temporary directories, and system paths confirmed that `05a90ab3-a28b-4d0e-83d6-3f0246f07444.mp3` is **outside the local manifest/repository** (it was an external test upload evaluated in prior live sessions).
- **Observed Behavior:** Cloned synthetic voice produced Risk Index ≈ 40.2% and classification `UNCERTAIN / REVIEW REQUIRED`.

---

## 3. Active Model Checkpoint Inventory

| Model Name | Primary Checkpoint Path | Architecture Type | Parameter Count | Training Basis |
|---|---|---|---|---|
| **LCNN** | `experiments/improved_model/model.pt` | Max-Feature-Map CNN (3x20 LFCC) | ~245K | 1,600 subsampled clips, 5 epochs |
| **WavLM Head** | `experiments/improved_model/wavlm.pt` | Custom Conv-Transformer on raw wave | ~414K | 1,600 subsampled clips, 4 epochs |
| **BiLSTM** | `experiments/improved_model/bilstm.pt` | 2-layer BiLSTM on 8 prosodic features | ~185K | 1,600 subsampled clips, 4 epochs |
| **RawNet2** | `experiments/rawnet2/model.pt` | Sinc-conv raw waveform network | ~661K | Trained on ASVspoof |
| **AASIST** | `experiments/aasist/model.pt` | Graph neural network on sinc-conv | ~208K | Trained on ASVspoof |
| **ECAPA-TDNN** | `experiments/ecapa/model.pt` | Time-delay neural network for embeddings | ~225K | Speaker verification reference |
| **Legacy AudioSpoofNet** | `models/voiceshield_best/model.pt` | Mel-spectrogram CNN baseline | ~1.2M | Collapsed baseline (precision=0) |

---

## 4. Production Inference & Decision Pipeline

```
Raw Audio (WAV / FLAC / MP3 / WebM)
   ↓
Audio Decoding (PyAV / soundfile / librosa) → 16 kHz Mono
   ↓
VAD & Quality Gating (voice_shield/vad.py)
   ↓
Voiced Waveform Segmentation (3.0s sliding windows, 1.5s hop)
   ↓
Per-Window Feature Extraction & Forward Pass:
   • LCNN (LFCC + deltas) → sigmoid logit
   • WavLM Head (raw wave) → sigmoid logit
   • BiLSTM (8 prosodic features) → sigmoid logit
   • RawNet2 (raw wave) → sigmoid logit
   • AASIST (raw wave) → sigmoid logit
   ↓
Window-Level Aggregation (15% Trimmed Mean across windows)
   ↓
Consensus Fusion (voice_shield/models/fusion.py):
   • Hand-tuned weights: LCNN (0.42), WavLM (0.25), BiLSTM (0.20), RawNet2 (0.08), AASIST (0.05)
   • Disagreement Heuristic: If score spread ≥ 0.38 → force risk_score into [35.0, 60.0]
   • 3-State Threshold Policy:
       risk ≤ 35.0 → BONA_FIDE
       35.0 < risk < 65.0 OR Disagreement → UNCERTAIN
       risk ≥ 65.0 AND Multi-Model Consensus → SPOOF
```

---

## 5. Confirmed Root Causes of Detection Failures

1. **The UNCERTAIN Trap in Fusion Decision Logic (`voice_shield/models/fusion.py`)**:
   - Because sub-models frequently diverge (e.g. LCNN=0.32, WavLM=0.74, BiLSTM=0.58), `score_spread` exceeds 0.38.
   - When disagreement is triggered, the fusion logic clamps `risk_score` into `[35.0, 60.0]` and forces `classification = CLASS_UNCERTAIN`.
   - On the held-out 400-sample dev benchmark, **167 out of 200 spoof samples (83.5%)** and **152 out of 200 human samples (76.0%)** get trapped in `UNCERTAIN`.
   - This directly explains why the known cloned sample produced `40.2% / UNCERTAIN`.

2. **Under-Trained Neural Sub-Models**:
   - Sub-models were trained on only 1,600 subsampled clips for 4–5 epochs despite having >400,000 samples available.
   - LCNN has only 46.5% recall on dev benchmark; WavLM has 41.5% human FPR; RawNet2 over-predicts spoof (89% human FPR); AASIST predicts near 0.

3. **Probability Calibration Disconnection**:
   - `model_artifacts/calibration.json` exists with static threshold values, but learned calibration scaling (Platt, Temperature, Isotonic) is not active in the forward path of `VoiceShieldInferenceEngine`.

4. **Training vs. Inference Preprocessing Mismatch**:
   - Training: Fixed 4.0-second full clips without VAD or windowing.
   - Inference: VAD silence stripping + 3.0s sliding windows + trimmed-mean aggregation.

---

## 6. Exact Point Where Previous Work Stopped

GitHub Copilot completed:
- Initial project audit and architecture discovery.
- Creation of `evaluation/real_world_benchmark/` (`prepare_benchmark.py`, `benchmark.py`, `benchmark_dev.csv` [400 samples], `benchmark_test.csv` [600 samples]).
- Diagnostic scripts (`STEP1_DIAGNOSIS.py`, `debug_step1` through `debug_step10`).

**Work stopped at Step 1 Diagnosis before implementing calibration, fusion optimization, preprocessing alignment, and retrained evaluation.**
