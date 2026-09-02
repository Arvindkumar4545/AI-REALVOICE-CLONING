# VoiceShield Real-World Benchmark Baseline Report (Step 2 Complete)

**Date:** 2026-08-31  
**Project:** VoiceShield AI Voice Deepfake / Voice Clone Detection  
**Evaluation Set:** 400 Stratified Speaker-Disjoint Development Samples (`benchmark_dev.csv`)  
**Output Results:** `evaluation/real_world_benchmark/results.json`  

---

## 1. Benchmark Architecture & Methodology

The real-world benchmark suite (`evaluation/real_world_benchmark/`) establishes an empirical, reproducible test harness evaluating submodel detectors, probability calibration, and ensemble fusion on held-out data with zero speaker leakage.

### Metrics Computed:
- **ROC-AUC & EER:** Discriminative ability across all possible operating thresholds.
- **Spoof Recall & FNR:** Probability of catching real-world AI voice clones.
- **Human FPR:** False alarms on genuine human speech.
- **Expected Calibration Error (ECE) & Brier Score:** Probability reliability.
- **Inference Latency:** Average processing time per sample.

---

## 2. Baseline Benchmark Results (Pre-Fix)

| Detector / Architecture | ROC-AUC | EER | Spoof Recall | Spoof FNR | Human FPR | Precision | F1-Score | Brier Loss | ECE |
|---|---|---|---|---|---|---|---|---|---|
| **LCNN (LFCC)** | 0.6046 | 0.4150 | 46.5% | 53.5% | 29.0% | 61.6% | 0.5299 | 0.2458 | 0.1609 |
| **WavLM Head** | 0.6494 | 0.4350 | 54.0% | 46.0% | 41.5% | 56.5% | 0.5524 | 0.2467 | 0.1842 |
| **BiLSTM Prosody** | 0.5582 | 0.4925 | 77.0% | 23.0% | 68.0% | 53.1% | 0.6286 | 0.2520 | 0.1399 |
| **RawNet2** | 0.5701 | 0.4650 | 96.0% | 4.0% | 89.0% | 51.9% | 0.6737 | 0.2608 | 0.0740 |
| **AASIST** | 0.4804 | 0.5175 | 0.0% | 100.0% | 0.0% | 0.0% | 0.0000 | 0.2505 | 0.0414 |
| **Production Ensemble (Pre-Fix)** | **0.6232** | **0.4550** | **50.5%** | **49.5%** | **41.5%** | **54.9%** | **0.5260** | **0.2404** | **0.1165** |

---

## 3. Production 3-State Decision Distribution (Pre-Fix)

- **Genuine Human Speech (n=200):**
  - `UNCERTAIN`: 152 samples (**76.0%**)
  - `BONAFIDE`: 21 samples (**10.5%**)
  - `SPOOF` (False Alarm): 20 samples (**10.0%**)
  - `INSUFFICIENT_AUDIO`: 7 samples (**3.5%**)
- **Cloned AI / Spoof Speech (n=200):**
  - `UNCERTAIN`: 167 samples (**83.5%**)
  - `SPOOF` (Correctly Flagged): 26 samples (**13.0%**)
  - `BONAFIDE` (Missed Deepfake): 7 samples (**3.5%**)

### Measured Inference Latency
- **Average Execution Latency:** **245.33 ms** per sample.

---

## 4. Key Takeaways

1. Over **83.5% of synthetic voices are trapped in the UNCERTAIN band**, receiving risk scores of ~40.2–45.5%.
2. Only **10.5% of genuine human voices are recognized as BONAFIDE**, with 76.0% marked as UNCERTAIN.
3. Remediation requires:
   - **Step 3:** Fitting empirical probability calibration.
   - **Step 4:** Deploying evidence-based learned fusion with second-pass verification for borderline audio.
   - **Step 5-7:** Retraining champion models on 10,000+ speaker-disjoint samples with preprocessing alignment.
