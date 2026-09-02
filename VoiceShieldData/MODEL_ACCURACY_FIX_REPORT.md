# VoiceShield ML Voice-Clone Detection & Calibration Fix Report
**Date:** August 31, 2026  
**Status:** Completed & Validated  
**Target Root:** `F:\VoiceShieldData`

---

## 1. Executive Summary

VoiceShield was experiencing a critical defect where known AI-generated / voice-cloned speech samples (such as `05a90ab3-a28b-4d0e-83d6-3f0246f07444.mp3` / `real_world_tests/spoof/0.wav`) produced an ambiguous **Risk Index ≈ 40.2%** and were incorrectly categorized as **`UNCERTAIN / REVIEW REQUIRED`** rather than **`SPOOF`**.

Through rigorous root cause diagnosis, scaled multi-channel neural retraining, empirical probability calibration, learned stacking fusion, and preprocessing pipeline standardization, the voice-clone detection accuracy has been completely rehabilitated.

### Key Benchmark Comparison (600-Sample Held-Out Test Split)

| Metric | Pre-Fix Baseline | Post-Fix Champion | Improvement |
| :--- | :---: | :---: | :---: |
| **LCNN (Spectral LFCC) AUC** | `0.6046` | **`0.9401`** | **+33.55%** |
| **LCNN Equal Error Rate (EER)** | `41.50%` | **`12.83%`** | **-28.67%** |
| **Ensemble Fused AUC** | `0.6232` | **`0.9114`** | **+28.82%** |
| **Spoof Recall (Test)** | `46.50%` | **`90.30%`** | **+43.80%** |
| **Probability Calibration Brier Score** | `0.2404` | **`0.1312`** | **-45.42%** |
| **Known Failure (`0.wav`) Risk Index** | `40.2% (UNCERTAIN)` | **`83.1% (SPOOF)`** | **FIXED** |
| **Real-World Spoof Detection Rate** | `16.0% (4/25)` | **`100.0% (25/25)`** | **+84.00%** |
| **Full PyTest Suite Pass Rate** | *Failing* | **55 / 55 (100%)** | **Clean** |

---

## 2. Root Cause Analysis

Four distinct systemic defects were discovered:

1. **Sub-Model Under-Training & Flat Decision Space:**
   - The legacy `LCNN` and `BiLSTM` checkpoints were trained on non-representative, miniature batches, yielding near-random AUCs (LCNN 0.6046, BiLSTM 0.5582). Submodels consistently hovered around probabilities of $0.46 - 0.52$.
2. **Artificial Score Clamping Trap in `fusion.py`:**
   - In `voice_shield/models/fusion.py`, when a capable submodel produced a high-confidence prediction ($P \ge 0.85$) while an under-trained model remained flat at $0.46$, the `score_spread` ($\ge 0.38$) flagged `is_disagreement = True`.
   - This triggered an artificial clamping function:
     $$\text{Risk Score} = \text{clip}(P_{\text{spoof}} \times 85 + 15, 35.0, 60.0)$$
     This suppressed genuine high-confidence detections into $[35.0, 60.0]$ (yielding ~40.2%) and locked the verdict into `UNCERTAIN`.
3. **Severe Preprocessing Splicing Discontinuity in `inference.py`:**
   - `voice_shield/inference.py` executed `extract_voiced_waveform(raw_wave)` before windowing. In speech with natural pauses (e.g. `0.wav` with 72% silence fraction), this stripped non-voiced portions into a fragmented 1.11s array.
   - Slicing 3.0s windows on this mutilated array corrupted the LFCC filterbanks and delta-delta features, dropping LCNN detection from **99.6%** down to **41.7%**.
4. **Uncalibrated Model Weights:**
   - Equal-weight averaging treated noisy/untrained models (e.g. AASIST at AUC 0.43) with the same authority as the champion spectral detector.

---

## 3. Implemented Solutions

### A. Scaled Multi-Channel Champion Retraining (`scripts/train_champion_scaled.py`)
- Standardized inputs to **16 kHz mono, 3.0s continuous window (48,000 samples)**.
- Retrained **LCNN** using 3-channel LFCC ($1 \times 20$ static + $1 \times 20$ delta + $1 \times 20$ delta-delta) on 3,000 speaker-disjoint balanced samples with mixed-precision memory caching.
- Retrained **BiLSTM** on continuous 8-dimensional prosodic temporal contours ($F_0$, energy, delta-energy, jitter, shimmer).
- Retrained **WavLM** phonetic representation classifier.

### B. Empirical Calibration & Learned Stacking Fusion (`scripts/fit_calibration_and_stacking.py`)
- Fitted regularized logistic regression stacking weights on the 400-sample dev benchmark:
  - **LCNN (Spectral LFCC):** `0.4813`
  - **BiLSTM (Prosody):** `0.4545`
  - **RawNet2 (Sinc Waveform):** `0.0491`
  - **WavLM (Phonetic):** `0.0150`
  - **AASIST (Graph):** `0.0000` (Zeroed out to eliminate noise)
- Applied empirical probability calibration (Isotonic / Platt / Temperature scaling), saving fitted parameters to `model_artifacts/calibration.json`.

### C. Continuous Windowing & Second-Pass Analysis (`voice_shield/models/fusion.py` & `inference.py`)
- Replaced fragmented voiced-wave slicing with continuous sliding windows (3.0s window, 1.5s hop).
- Replaced blunt score clamping with evidence-based second-pass verification and isolated spike guards.
- Ensured that when champion detectors (LCNN and BiLSTM) concur on spoof evidence, the calibrated risk score directly reflects the posterior probability (Risk $\ge 75\%$, Verdict = `SPOOF`).

---

## 4. Verification & Validation Results

### 1. Known Failure Target (`05a90ab3-a28b-4d0e-83d6-3f0246f07444.mp3` / `real_world_tests/spoof/0.wav`)
- **Classification:** `SPOOF`
- **Calibrated Risk Index:** **`83.1%`**
- **Posterior Spoof Probability:** `0.8315`
- **Submodel Scores:** LCNN `0.9942`, BiLSTM `0.6408`, RawNet2 `0.5830`
- **Forensic Detail:** Forensic consensus verifies artificial synthesis phase artifacts and prosodic anomalies.

### 2. Held-Out 600-Sample Test Split (`benchmark_test.csv`)
- **Total Samples:** 600 (300 Bonafide Human, 300 AI Spoofs, Speaker-Disjoint)
- **LCNN AUC:** **`0.9401`** (EER: `12.83%`, Spoof Recall: `90.3%`)
- **Production Spoof Detections:** 273 / 300 spoofs directly classified as `SPOOF` (**91.0%**).
- **Average Inference Latency:** `466.11 ms/sample`.

### 3. Full Regression Test Suite
- Executed `pytest tests/ -q` across all 55 test modules.
- Result: **`55 passed in 71.21s (100.0% pass rate)`**.

---

## 5. Artifacts and Checkpoints Created

- `experiments/improved_champion_v2/lcnn.pt`: Retrained Champion LCNN model checkpoint (AUC 0.9401).
- `experiments/improved_champion_v2/bilstm.pt`: Retrained Champion BiLSTM prosody model checkpoint (AUC 0.8547).
- `experiments/improved_champion_v2/wavlm.pt`: Retrained WavLM representation classifier checkpoint.
- `model_artifacts/calibration.json`: Fitted calibration parameters, stacking weights, and optimal operating thresholds.
- `evaluation/real_world_benchmark/results.json`: Full benchmark evaluation metrics across all submodels.
- `voice_shield/models/fusion.py`: Refactored consensus risk classifier with learned stacking and second-pass analysis.
- `voice_shield/inference.py`: Updated inference engine with continuous windowing and champion weights.

---
*VoiceShield ML detection and calibration fix is fully verified, operational, and production-ready.*
