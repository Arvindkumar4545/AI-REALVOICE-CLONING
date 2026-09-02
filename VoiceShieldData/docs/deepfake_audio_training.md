# Deepfake audio training pipeline

## Feature tensor

`voice_shield.advanced_features.extract_advanced_features` returns a fixed-size NumPy array with 106 channels and 401 frames for the default four-second clip. It combines linear-frequency cepstral coefficients, delta terms, modified group delay, spectral contrast, Chroma STFT, normalized F0, voiced rate, and frame jitter. Hann windowing plus fixed waveform padding/truncation makes batches shape-compatible.

```python
from voice_shield.advanced_features import extract_advanced_features
features = extract_advanced_features("sample.wav", flatten=False)  # [106, 401]
```

## Augmentation policy

`voice_shield.augmentations.augment_audio` samples G.711, AMR-NB, or 24 kbps MP3 compression, then adds babble/street/white noise at 5-20 dB SNR and applies independent 0.9-1.1 speed and +/-2 semitone pitch perturbation. FFmpeg is used for genuine codec round-trips when installed; deterministic band-limit and quantization fallbacks keep training portable.

Augmentations preserve the underlying spoof signal while varying channel conditions. This prevents the classifier from learning a shortcut such as “deepfake equals high-frequency silence,” because real and fake examples both appear with codecs, noise, and pitch/speed changes. Validation must include clean and augmented conditions separately.

## Hybrid classifier

`voice_shield.hybrid_model.SpectroTemporalAntiSpoofNet` accepts `[B, F, T]` or `[B, C, F, T]`. Residual convolutions learn local spectral artifacts; a batch-first Transformer encoder models relationships across time and prosody. The default output is two logits ordered `[real, deepfake]`; `predict_proba` applies Softmax for calibrated class probabilities. Train with `CrossEntropyLoss` and class weights or a balanced sampler when the manifest is imbalanced.

```python
import torch
from voice_shield.hybrid_model import SpectroTemporalAntiSpoofNet

model = SpectroTemporalAntiSpoofNet(input_channels=1)
logits = model(torch.randn(8, 1, 106, 401))
loss = torch.nn.CrossEntropyLoss()(logits, torch.randint(0, 2, (8,)))
```
