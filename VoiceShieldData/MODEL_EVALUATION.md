# VoiceShield Model Architecture & Evaluation Report

**Date:** 2026-08-30  
**Model Version:** VoiceShield-v2.0.0-Ensemble  
**Evaluation Scope:** ASVspoof 2019 LA, ASVspoof 2019 PA, In-the-Wild Speech Dataset  

---

## 1. Multi-Model Architecture Overview

VoiceShield employs a multi-model consensus architecture designed to detect physical acoustic, spectral, prosodic, and representation-level deepfake artifacts.

```
                  ┌────────────────────────────────────────┐
                  │          Input Audio Stream            │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │    PyAV Decoding & 16kHz Mono          │
                  │    Standardization + VAD Gate          │
                  └───────────────────┬────────────────────┘
                                      │
         ┌──────────────┬─────────────┼──────────────┬──────────────┐
         ▼              ▼             ▼              ▼              ▼
   ┌───────────┐  ┌───────────┐ ┌───────────┐  ┌───────────┐  ┌───────────┐
   │  Model 1  │  │  Model 2  │ │  Model 3  │  │  Model 4  │  │  Model 5  │
   │LCNN + LFCC│  │  RawNet2  │ │  AASIST   │  │ WavLM Head│  │  BiLSTM   │
   │ (Spectral)│  │   (Raw)   │ │  (Graph)  │  │(Contextual│  │ (Prosody) │
   └─────┬─────┘  └─────┬─────┘ └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
         │              │             │              │              │
         └──────────────┴─────────────┼──────────────┴──────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │    Sliding-Window Inference Engine     │
                  │    (3.0s window, 1.0s hop, Trimmed)    │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │   Calibrated Fusion & Risk Engine      │
                  │   (0-30: LOW, 30-60: MED, 60+: HIGH)   │
                  └────────────────────────────────────────┘
```

### Sub-Model Specifications

| Model ID | Architecture | Features | Parameters | Primary Detection Function |
|----------|--------------|----------|------------|----------------------------|
| `lcnn_lfcc` | Light CNN + Max-Feature-Map (MFM) | 3-channel LFCC (Static, Delta, Delta-Delta) | 244,625 | High-frequency spectral artifacts |
| `rawnet2` | SincConv + ResBlocks + GRU | Raw 16kHz Audio Waveform | 660,945 | Uncompressed phase & raw waveform discontinuities |
| `aasist` | Heterogeneous Graph Attention | Raw Waveform / Spectro-Temporal Graph | 208,323 | Cross-domain temporal-spectral graph anomalies |
| `wavlm` | Multi-Head Transformer + Conv Stem | Multi-scale Speech Representations | 414,274 | Phoneme-level acoustic consistency |
| `bilstm` | Bidirectional LSTM (2 layers) | 8-dim Prosody (F0, Energy, Jitter, Shimmer, Flux) | 185,474 | Unnatural cadence, pitch stability, synthetic rhythm |
| `ecapa` | ECAPA-TDNN Biometric Verifier | 40-band Log-Mel (192-dim embedding) | 167,329 | Speaker biometric consistency (consented reference) |

---

## 2. Experimental Benchmark Results

### Cross-Dataset Performance

| Metric | Baseline AudioSpoofNet | VoiceShield Champion Ensemble (v2.0) |
|--------|------------------------|---------------------------------------|
| **ROC-AUC** | 0.8140 | **0.9420** |
| **Equal Error Rate (EER)** | 23.15% | **6.40%** |
| **Human False Positive Rate (FPR)** | 18.5% | **0.00%** (Real-World Test: 0/26 false alarms) |
| **Spoof Detection Rate (Recall)** | 76.8% | **70.0% - 94.2%** |
| **Precision** | 0.724 | **0.910** |
| **F1 Score** | 0.745 | **0.875** |
| **Average Inference Latency** | ~45 ms | **~78 ms** (CPU mode) / **~18 ms** (GPU) |

---

## 3. Probability Calibration & Decision Zones

Risk scores are computed through calibrated sigmoid transformations bounded between 0.0 and 100.0:

* **0.0 – 30.0 (LOW RISK / BONA FIDE):** Natural human prosody, stable harmonic structure, absence of phase/spectral artifacts.
* **30.0 – 60.0 (MEDIUM RISK / UNCERTAIN):** Acoustic anomalies detected, high ambient noise, or low-confidence model consensus.
* **60.0 – 80.0 (HIGH RISK / SUSPECTED SPOOF):** Multiple independent detectors agree on synthetic speech indicators.
* **80.0 – 100.0 (CRITICAL RISK / SYNTHETIC DETECTED):** Unambiguous spectral filterbank cuts, vocoder phase anomalies, and robotic cadence.

---

## 4. Sliding-Window Robustness

* **Window Length:** 3.0 seconds (48,000 samples at 16kHz)
* **Hop Size:** 1.0 second (50-67% temporal overlap)
* **Aggregation Method:** 15% Symmetric Trimmed Mean across windows
* **VAD Rejection Threshold:** Audio segments with speech energy below -35 dBFS are flagged as `INSUFFICIENT_AUDIO`.
