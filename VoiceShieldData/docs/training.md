# VoiceShield Training & Research Pipeline

## 1. Overview
VoiceShield trains a diverse suite of neural anti-spoofing architectures to eliminate blind spots in deepfake voice detection.

---

## 2. Multi-Model Architecture Suite

| Model | Input Feature | Primary Detection Objective | Key Architectural Elements |
| :--- | :--- | :--- | :--- |
| **LCNN** | 60-dim LFCC (Static + $\Delta$ + $\Delta\Delta$) | Spectral artifacts, phase discontinuities | Max-Feature-Map (MFM) 2D convs, dual statistical pooling |
| **RawNet2** | Raw Waveform (16kHz, 64k samples) | End-to-end acoustic artifacts | Learnable SincConv filterbanks, ResBlocks with Feature Map Scaling (FMS) |
| **AASIST** | Raw Waveform | Spectro-temporal graph relational anomalies | Heterogeneous GATs (Spectral + Temporal), Max-Graph-Operation (MGO) |
| **WavLM** | Raw Waveform / Contextual frames | Synthetic phonetic and linguistic transitions | Self-Attention Transformer encoder, Attentive Statistics Pooling |
| **BiLSTM** | 8-dim Prosody (F0, Jitter, Shimmer, Energy, ZCR) | Pitch flatlining, lack of vocal micro-tremors | Bidirectional LSTM, Temporal Self-Attention aggregation |
| **ECAPA-TDNN** | 40-dim Log-Mel Spectrogram | Enrolled speaker consistency & verification | Res2Net dilated convs, Squeeze-and-Excitation, 192-dim embedding |

---

## 3. Loss Functions & Class Imbalance Mitigation

1. **Focal Loss**:
   $$\text{FL}(p_t) = -\alpha_t (1 - p_t)^\gamma \log(p_t)$$
   Down-weights easy majority examples ($\gamma = 2.0$), forcing gradients to focus on hard genuine speech instances.
2. **Weighted BCE with Logits**:
   $$\mathcal{L} = -\left[ w_{\text{pos}} y \log \sigma(z) + (1 - y) \log (1 - \sigma(z)) \right]$$
   where $w_{\text{pos}} = \frac{N_{\text{spoof}}}{N_{\text{bonafide}}}$.
3. **Inverse-Frequency `WeightedRandomSampler`**:
   Ensures uniform 50/50 mini-batch sampling across genuine and spoofed speech during training steps.

---

## 4. Training Procedure & Early Stopping

```bash
# Run full multi-model research training & evaluation
python scripts/train_all_research_models.py
```
- **Optimizer**: AdamW ($\beta_1 = 0.9, \beta_2 = 0.999$, weight decay $= 10^{-4}$)
- **Learning Rate Scheduler**: Cosine Annealing with warm restarts
- **Gradient Clipping**: Maximum norm $= 1.0$
- **Early Stopping**: Monitored on validation $F_1$ and EER with patience $= 10$ epochs
