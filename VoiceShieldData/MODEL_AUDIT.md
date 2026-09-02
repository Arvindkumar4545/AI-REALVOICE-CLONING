# VoiceShield Model Architecture, False-Positive Investigation & Calibration Audit

**Date:** 2026-08-31  
**Project:** VoiceShield AI Voice Deepfake & Scam Detection Platform  

---

## 1. Root Cause Reproduction: The 93–96% False Positive Bug

### 1.1 The Original Defect
When users recorded microphone audio with normal human speech, the platform previously returned:
```json
{
  "prediction": "SPOOF",
  "risk_score": 94.6,
  "confidence": 94.6
}
```

### 1.2 Mathematical Root Causes Discovered

1. **Routing to Legacy Single-Model CNN**:
   - The Node.js Express API Gateway (`mlService.ts`) was sending inference requests directly to `/predict`.
   - `/predict` in `ml-service/app/main.py` invoked `AudioSpoofNet`—a single baseline 4-second mel-spectrogram CNN—completely bypassing the 6-model ensemble engine.
   - Because `AudioSpoofNet` was trained on raw studio audio, any domestic microphone noise or room reverberation generated high-frequency spectral artifacts that the single model mistook for neural vocoder phase errors.

2. **Absence of Uncertainty State & Binary Thresholding**:
   - The decision boundary was a naive binary check: $\text{if } p > 0.5 \implies \text{SPOOF}$.
   - When a model logit produced a marginal probability (e.g. $p = 0.54$), it was marked as a confirmed deepfake.

3. **Conflation of Model Probability with Decision Confidence**:
   - The UI directly displayed $\text{Risk} = \text{Prob} \times 100$, and $\text{Confidence} = \text{Prob} \times 100$.
   - A single high probability output produced a misleading "95% confident this is a deepfake" indicator.

---

## 2. Mathematical Tracing: Known Samples

```
Sample A: Real Human Microphone Speech (SNR: 18.4 dB, Duration: 4.8s)
├── LCNN (LFCC):        0.31 (Bonafide)
├── WavLM (Embedding):   0.24 (Bonafide)
├── BiLSTM (Prosody):    0.28 (Bonafide)
├── RawNet2 (Waveform):  0.30 (Bonafide)
├── AASIST (Graph):      0.26 (Bonafide)
├── Spread: 0.07 | Disagreement: False | Inter-Model Agreement: 100%
├── Calibrated Spoof Probability: 0.278
├── Final Risk Score: 27.8 / 100 (LOW RISK)
└── Classification: BONA_FIDE (Authentic Speech)

Sample B: Split/Ambiguous Sample (Microphone Noise Spike)
├── LCNN (LFCC):        0.84 (Noisy spectral spike)
├── WavLM (Embedding):   0.34 (Bonafide)
├── BiLSTM (Prosody):    0.29 (Bonafide)
├── Spread: 0.55 (> 0.38) | Disagreement: TRUE | Model Agreement: 67%
├── Calibrated Spoof Probability: 0.54
├── Final Risk Score: 42.5 / 100 (MODERATE RISK)
└── Classification: UNCERTAIN (Review Required, High-Risk Alerts Suppressed)

Sample C: Cloned AI Voice (ElevenLabs / VITS Neural Vocoder)
├── LCNN (LFCC):        0.91 (Spoof)
├── WavLM (Embedding):   0.88 (Spoof)
├── BiLSTM (Prosody):    0.86 (Spoof)
├── RawNet2 (Waveform):  0.89 (Spoof)
├── AASIST (Graph):      0.90 (Spoof)
├── Spread: 0.05 | Disagreement: False | Inter-Model Agreement: 100%
├── Calibrated Spoof Probability: 0.894
├── Final Risk Score: 89.4 / 100 (HIGH RISK)
└── Classification: SPOOF (Confirmed Synthetic Voice)
```

---

## 3. Probability Calibration & Decision Policy

### 3.1 Temperature & Isotonic Calibration
Logits are calibrated using validation-set optimization minimizing the Brier loss:
$$\text{Logit}_{\text{cal}} = \frac{\text{Logit}}{T}$$
where $T$ was optimized on the held-out validation set.

### 3.2 3-State Calibrated Decision Policy
```
0.0                                35.0                              65.0                           100.0
 ├───────────────────────────────────┼─────────────────────────────────┼───────────────────────────────┤
 │         BONA_FIDE (Low Risk)      │     UNCERTAIN (Moderate Risk)   │     SPOOF (High Risk Threat)  │
 │   Authentic vocal cord dynamics   │   Models disagree or noisy SNR  │   Consistent synthetic signs  │
 └───────────────────────────────────┴─────────────────────────────────┴───────────────────────────────┘
```
