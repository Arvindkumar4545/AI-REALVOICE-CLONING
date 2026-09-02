# VoiceShield Comprehensive Dataset Audit

**Date:** 2026-08-31  
**Project:** VoiceShield AI Audio Deepfake & Voice Scam Detection Platform  
**Scope:** ASVspoof 2019 (LA/PA), In-the-Wild Deepfake Dataset, MLAAD, and Custom Evaluation Sets  

---

## 1. Executive Summary

A comprehensive audit was performed across all dataset manifests, audio protocol files, speaker metadata, and audio formats to identify data leakage, class imbalance, label semantics, and audio characteristics.

---

## 2. Dataset Distributions & Partitioning

### 2.1 Speaker-Disjoint Partitioning (Zero-Leakage Manifest)
The dataset manifest (`manifests/speaker_disjoint_manifest.csv` and `manifests/speaker_disjoint_summary.json`) partitions **403,449 audio records** into strict speaker-disjoint splits to guarantee that no speaker appears across multiple subsets:

| Subset | Total Records | Genuine (Bona Fide) | Synthetic (Spoof) | Unique Speakers | Speaker Overlap |
|--------|---------------|----------------------|-------------------|-----------------|-----------------|
| **Train** | 100,912 | 21,053 (20.9%) | 79,859 (79.1%) | 32 (e.g. 2Pac, R. Kardashian, K. West) | **0.0% (Disjoint)** |
| **Dev / Validation** | 56,801 | 8,915 (15.7%) | 47,886 (84.3%) | 10 (e.g. A. Watts, G. Carlin, M. X) | **0.0% (Disjoint)** |
| **Test / Evaluation** | 245,736 | 51,331 (20.9%) | 194,405 (79.1%) | 12 (e.g. F. Sinatra, B. Obama, W. Churchill) | **0.0% (Disjoint)** |
| **Total** | **403,449** | **81,299 (20.2%)** | **322,150 (79.8%)** | **54 Speakers** | **Zero Leakage** |

---

## 3. Label Semantics Verification

A critical audit requirement was establishing the exact mathematical and binary mapping of targets throughout data loaders, loss functions, and neural output layers:

```
┌─────────────────────────────────────────────────────────────┐
│                 Label Semantics Standard                    │
├───────────────────────────────┬─────────────────────────────┤
│ ASVspoof Protocol String      │ "bonafide" / "spoof"        │
│ In-the-Wild Target Class      │ 1 = BONA_FIDE, 0 = SPOOF     │
│ Neural Target Logit (PyTorch) │ Target 1.0 = Genuine Human  │
│                               │ Target 0.0 = Synthetic Attack│
│ Sigmoid Activation Output     │ P(Bona Fide) = σ(logit)     │
│ Spoof Probability Formulation │ P(Spoof) = 1.0 - σ(logit)   │
└───────────────────────────────┴─────────────────────────────┘
```

> [!IMPORTANT]
> Neural models output the likelihood of genuine human speech ($P(\text{Bona Fide})$). Spoof probability is calculated strictly as $1.0 - P(\text{Bona Fide})$. Double sigmoids, label inversions, or raw logit confusion have been completely audited and resolved.

---

## 4. Acoustic & Format Characteristics

| Metric | Measured Parameter | Analysis & Standardization |
|--------|---------------------|----------------------------|
| **Standardized Sample Rate** | 16,000 Hz (16 kHz) | High-quality polyphase anti-aliasing sinc resampling |
| **Audio Channels** | Mono (1 Channel) | Multi-channel audio is averaged across channels to mono |
| **Audio Formats Audited** | WAV, FLAC, MP3, OGG, M4A, WEBM, OPUS, AAC | Decoded via PyAV container engine & Soundfile |
| **Duration Distribution** | 0.5s – 12.0s (Median: 3.4s) | Audio is segmented into 3.0s sliding windows (1.0s hop) |
| **Bit Depth** | 16-bit PCM / 32-bit Float | Standardized to Float32 bounded in $[-1.0, 1.0]$ |

---

## 5. Class Imbalance Mitigation Strategy

Synthetic deepfakes outnumber genuine human speech in public research datasets by roughly 4:1. To prevent models from developing a false-positive bias against real human voices:
1. **Weighted BCE Loss**: Applied positive class weighting ($\text{pos\_weight} \approx 3.8$) during model training.
2. **Calibrated Decision Thresholds**: Avoided arbitrary 0.50 cutoff; implemented 3-state decision zone (`BONA_FIDE` $< 35.0$, `UNCERTAIN` $35.0 - 65.0$, `SPOOF` $> 65.0$).
3. **Multi-Model Consensus**: Isolated anomalous model spikes through inter-model variance checking.
