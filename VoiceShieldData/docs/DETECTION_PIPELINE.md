# VoiceShield Audio & ML Detection Pipeline

**Version:** 2.0.0-Calibrated  
**Module:** `voice_shield/`  

---

## 1. High-Level Pipeline Flow

```
[Browser / Microphone / Audio File]
               │
               ▼ (WebM/Opus, WAV, MP3, FLAC, OGG, M4A)
┌───────────────────────────────────────────────────────────┐
│ 1. INGESTION & DECODING (PyAV / Soundfile / Librosa)      │
│    • Resample to 16,000 Hz Mono Float32                   │
│    • Peak normalize & remove DC offset                    │
└──────────────────────────────┬────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────┐
│ 2. VAD & QUALITY GATE (voice_shield/vad.py)               │
│    • < 0.5s: Reject as INSUFFICIENT_AUDIO                 │
│    • 0.5s–2.0s: LOW_INFORMATION (capped confidence)       │
│    • Silence fraction > 95%: Reject                       │
│    • SNR Quality Check                                    │
└──────────────────────────────┬────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────┐
│ 3. SLIDING-WINDOW SEGMENTATION (voice_shield/inference.py)│
│    • 3.0s Windows with 1.0s Hop                           │
│    • 15% Trimmed-Mean Temporal Aggregation                │
└──────────────────────────────┬────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────┐
│ 4. MULTI-MODEL FEATURE EXTRACTION & NEURAL PASS           │
│    • LCNN: 60-dim LFCC Filterbanks                        │
│    • RawNet2: Raw Acoustic Sinc Convolutions              │
│    • AASIST: Graph Spectral Attention                     │
│    • WavLM: Contextual Phonetic Transformer               │
│    • BiLSTM: Prosody, F0 Pitch, Jitter, Shimmer           │
│    • ECAPA-TDNN: Speaker Biometric Embeddings             │
└──────────────────────────────┬────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────┐
│ 5. PROBABILITY CALIBRATION & DISAGREEMENT CHECK           │
│    • Temperature Scaling (Brier-loss optimized)           │
│    • Score Spread & Inter-Model Std Dev Check             │
│    • Spread > 0.38 ➔ Strict UNCERTAIN Override            │
└──────────────────────────────┬────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────┐
│ 6. 3-STATE DECISION POLICY (voice_shield/models/fusion.py)│
│    • BONA_FIDE (Risk < 35.0): Authentic Human Speech      │
│    • UNCERTAIN (Risk 35.0–65.0 or Disagreement): Review   │
│    • SPOOF (Risk > 65.0 with Consensus): Deepfake Attack  │
└──────────────────────────────┬────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────┐
│ 7. SEPARATE CONVERSATION SCAM INTENT ANALYSIS             │
│    • Independent semantic analysis (OTP, Urgency, Bank)   │
│    • Separates voice authenticity from scam behavior      │
└───────────────────────────────────────────────────────────┘
```

---

## 2. Audio Validation & Ingestion Parameters

| Parameter | Value / Constraint | Action on Failure |
|---|---|---|
| **Sample Rate** | Standardized to `16,000 Hz` | Polyphase sinc anti-aliasing resampling |
| **Channels** | Mono (`1 Channel`) | Multi-channel averaged to mono |
| **Minimum Duration** | `0.50 seconds` | Gated as `INSUFFICIENT_AUDIO` |
| **Short Duration Zone** | `0.50s – 2.00s` | Processed as `LOW_INFORMATION` with max confidence 50% |
| **Maximum Silence Ratio** | `95.0%` | Gated as `INSUFFICIENT_AUDIO` |
| **Peak Amplitude** | Normalized to $[-1.0, 1.0]$ | Safe scaling without clipping |

---

## 3. Neural Architecture Specifications

1. **LCNN (Light CNN)**:
   - Input: 60-dimensional Linear Frequency Cepstral Coefficients (LFCC).
   - Target: High-frequency spectral artifacts and phase discontinuities typical of vocoder synthesis.
2. **RawNet2**:
   - Input: Raw time-domain waveforms.
   - Target: Sinc-filter temporal boundaries and waveform-level anomalies.
3. **AASIST (Audio Anti-Spoofing Integrated Spectro-Temporal Graph)**:
   - Input: Raw waveform graph representation.
   - Target: Graph attention over spectro-temporal nodes.
4. **WavLM**:
   - Input: Transformer contextual speech embeddings.
   - Target: Phonetic transition abnormalities and speech synthesis artifacts.
5. **BiLSTM Prosody Forensics**:
   - Input: Pitch F0, energy dynamics, jitter, and shimmer.
   - Target: Robotic pitch flatlining and unnatural inflection cadences.

---

## 4. 3-State Calibrated Decision Boundaries

```
0.0                                35.0                              65.0                           100.0
 ├───────────────────────────────────┼─────────────────────────────────┼───────────────────────────────┤
 │         BONA_FIDE (Low Risk)      │     UNCERTAIN (Moderate Risk)   │     SPOOF (High Risk Threat)  │
 │   Authentic vocal cord dynamics   │   Models disagree or noisy SNR  │   Consistent synthetic signs  │
 └───────────────────────────────────┴─────────────────────────────────┴───────────────────────────────┘
```
