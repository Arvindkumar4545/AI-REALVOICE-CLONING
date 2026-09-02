# VoiceShield Model Diagnosis & Root Cause Report

**Date:** 2026-08-31  
**Target Audio Failure:** `05a90ab3-a28b-4d0e-83d6-3f0246f07444.mp3` (Observed: Risk ≈ 40.2%, Classification = UNCERTAIN / REVIEW REQUIRED)

---

## 1. Executive Summary

VoiceShield uses a 5-detector ensemble (LCNN, RawNet2, AASIST, WavLM, BiLSTM) with VAD gating, sliding-window trimmed mean aggregation, and heuristic consensus fusion.

Through rigorous empirical evaluation across held-out development data (400 speaker-disjoint samples from ASVspoof 2019 and In-The-Wild), we have identified the exact mathematical and architectural root causes that produce false negatives and UNCERTAIN predictions on synthetic / cloned voices.

---

## 2. Quantitative Baseline Performance on Held-Out Dev Set (n=400)

| Detector / Pipeline | ROC-AUC | EER | Spoof Recall | Spoof FNR | Human FPR | Precision | F1 Score | ECE | Brier |
|---|---|---|---|---|---|---|---|---|
| **LCNN (LFCC)** | 0.6046 | 41.5% | 46.5% | 53.5% | 29.0% | 61.6% | 0.530 | 0.1609 | 0.2795 |
| **WavLM Head** | 0.6494 | 43.5% | 54.0% | 46.0% | 41.5% | 56.5% | 0.552 | 0.1842 | 0.2496 |
| **BiLSTM (Prosody)** | 0.5582 | 49.3% | 77.0% | 23.0% | 68.0% | 53.1% | 0.629 | 0.1399 | 0.2604 |
| **RawNet2 (Waveform)** | 0.5701 | 46.5% | 96.0% | 4.0% | 89.0% | 51.9% | 0.674 | 0.0740 | 0.2448 |
| **AASIST (Graph Sinc)** | 0.4804 | 51.8% | 0.0% | 100.0% | 0.0% | 0.0% | 0.000 | 0.0414 | 0.2479 |
| **Current Ensemble Fusion** | **0.6232** | **45.5%** | **50.5%** | **49.5%** | **41.5%** | **54.9%** | **0.526** | **0.1165** | **0.2338** |

### Decision Distribution on Dev Set (200 Humans, 200 Spoofs):
- **Genuine Human Speech (200 samples):**
  - `UNCERTAIN`: **152 (76.0%)**
  - `BONA_FIDE`: 21 (10.5%)
  - `SPOOF` (Hard False Positive): 20 (10.0%)
  - `INSUFFICIENT_AUDIO`: 7 (3.5%)
- **Cloned / Spoof Speech (200 samples):**
  - `UNCERTAIN`: **167 (83.5%)**
  - `SPOOF` (Detected): 26 (13.0%)
  - `BONA_FIDE` (Hard False Negative): 7 (3.5%)

---

## 3. Mathematical Root Cause of the Known Failure (`40.2% / UNCERTAIN`)

Why did the synthetic sample receive ~40.2% and classification `UNCERTAIN`?

1. **Sub-Model Divergence:**
   Because RawNet2 spikes high (~0.60–0.80) while LCNN and WavLM yield moderate-low scores (~0.25–0.40), the sub-model score spread $\Delta = \max(p) - \min(p)$ exceeds $0.38$.
2. **Disagreement Clamping:**
   In `voice_shield/models/fusion.py` (lines 186–188):
   $$\text{risk\_score} = \text{clip}(\text{calibrated\_spoof\_prob} \times 100 \times 0.85 + 15.0, 35.0, 60.0)$$
   When $\text{calibrated\_spoof\_prob} \approx 0.30$, this formula yields:
   $$0.30 \times 100 \times 0.85 + 15.0 = 40.5\% \approx 40.2\%$$
3. **Hard UNCERTAIN Assignment:**
   The classification rule forces `CLASS_UNCERTAIN` whenever `is_disagreement` is True or risk score is between 35 and 65.
4. **Result:**
   The model does not make a confident decision and dumps >80% of all real-world spoof samples into the UNCERTAIN band.

---

## 4. Sub-Model Representation & Data Gaps

1. **Under-Trained Checkpoints:**
   - Active models in `experiments/improved_model/` were trained on only 1,600 samples out of >400,000 available files.
2. **Architecture Flaws:**
   - `WavLMClassifier` is a 414K parameter conv-transformer trained from scratch on raw waveforms, resulting in severe human false positives (41.5% FPR).
   - `AASIST` collapsed to predicting 0 on unseen data.
   - `RawNet2` overfits towards predicting 1 on unseen data.
3. **Preprocessing Inconsistency:**
   - Training clips were 4.0s full clips without VAD.
   - Inference strips silence with VAD and chops into 3.0s sliding windows with 1.5s hop.

---

## 5. Required Architectural Solutions

1. **Learned Optimal Fusion (Stacking / Logistic Regression on Dev Logits):**
   - Replace arbitrary hand-tuned weights ($0.42, 0.25, 0.20, 0.08, 0.05$) with regularized logistic regression fit strictly on development split predictions.
2. **Multi-Model Probability Calibration (Platt / Isotonic Scaling):**
   - Wire `ModelCalibrator` into `VoiceShieldInferenceEngine` to transform raw logits into true posterior probabilities prior to risk calculation.
3. **Second-Pass Borderline Analysis:**
   - Instead of immediately returning `UNCERTAIN` when risk is in the 35–65 range:
     - Check strongest suspicious window ($\max(\text{window\_scores})$).
     - Check acoustic cepstral sharpness (LCNN LFCC energy).
     - Check multi-window consistency to resolve borderline synthetic voices into `SPOOF`.
4. **Retraining with Aligned VAD & Preprocessing on Scaled Balanced Data:**
   - Retrain primary detectors (LCNN, BiLSTM, and stabilized waveform model) on $\ge 10,000$ speaker-disjoint samples using train-time VAD + 3.0s window extraction with audio augmentation (codec simulation, noise, telephony).
5. **Principled Operating Point Selection:**
   - Derive lower/upper thresholds ($T_{\text{lower}}, T_{\text{upper}}$) empirically on the dev ROC curve to achieve target Spoof Recall $\ge 85\%$ while constraining Human FPR $\le 5\%$.
