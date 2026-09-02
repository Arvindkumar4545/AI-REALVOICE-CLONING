# VoiceShield — Project Inspection Before Accuracy Fix

Date: 2026-08-31
Project root: `F:\VoiceShieldData`
Scope: read-only inspection of the current filesystem, checkpoints, source, config, manifests, evaluation outputs, and tests before any model or code changes.

## 1. Executive Summary

This project is a multi-stage VoiceShield anti-spoofing system with a React frontend, Node/Express backend, and FastAPI ML service. The codebase includes a production ensemble in `voice_shield/inference.py` that loads multiple sub-models from the `experiments/improved_model/` directory and merges their outputs with a hard-coded weighted fusion rule in `voice_shield/models/fusion.py`.

The live filesystem confirms the following high-risk issues:

- The current production ensemble is still dominated by a weak WavLM branch, and that model has a verified human-FPR problem.
- The project has a canonical label contract that says `LABEL_BONAFIDE = 1.0`, `LABEL_SPOOF = 0.0`, but the ensemble still interprets outputs as `spoof_probability = 1 - bonafide_probability` in several places, and the risk fusion logic is not consistently tied to calibrated probabilities.
- Calibration artifacts exist (`model_artifacts/calibration.json`), but the live inference path does not apply them, and the calibration system is not wired into the actual risk decision path.
- The training / inference preprocessing path is not fully consistent; there is a documented mismatch between the training pipeline and the production inference pipeline.
- The CV/dataset configuration is heavily imbalanced toward spoof samples, and the active champion experiment uses a small subset of the full dataset rather than the full manifest.
- The project has multiple checkpoint families and a dual model path (`ml-service` baseline model vs. live `voice_shield` ensemble), which creates confusion and increases the chance of loading the wrong artifact.
- The current evaluation results show poor real-human performance: 18/34 human samples were falsely called spoof in the current benchmark, which is not acceptable for a real-world anti-spoofing deployment.

## 2. Verified Environment

### 2.1 Python and ML environment

Verified from the live terminal environment:

- Python: `3.12.0` on Windows 11
- PyTorch: `2.12.0+cpu`
- CUDA: `False`
- GPU device count: `0`
- CPU-only mode is active in this environment.

This means all model evaluation and inference are running on CPU in the current workspace, so the actual runtime characteristics should be interpreted as CPU-only numbers.

### 2.2 Project structure confirmed

The current filesystem contains the expected major directories:

- `voice_shield/`
- `ml-service/`
- `models/`
- `model_artifacts/`
- `experiments/`
- `manifests/`
- `datasets/`
- `evaluation/`
- `tests/`
- `scripts/`

The active model directories present are:

- `experiments/improved_model/`
- `experiments/rawnet2/`
- `experiments/aasist/`
- `experiments/bilstm_prosody/`
- `experiments/wavlm/`
- `experiments/ecapa/`
- `experiments/lcnn_lfcc/`
- `experiments/baseline/`
- `experiments/improved_v1/`
- `experiments/improved_v2/`

The production ensemble is the one loaded by `voice_shield/inference.py` and includes:

- `experiments/improved_model/model.pt` (LCNN)
- `experiments/improved_model/wavlm.pt` (WavLM)
- `experiments/improved_model/bilstm.pt` (BiLSTM)
- `experiments/rawnet2/model.pt`
- `experiments/aasist/model.pt`
- `experiments/ecapa/model.pt`

## 3. Verified Label Semantics Contract

The canonical label constants in `voice_shield/constants.py` are:

- `LABEL_BONAFIDE = 1.0`
- `LABEL_SPOOF = 0.0`
- `CLASS_BONAFIDE = "BONA_FIDE"`
- `CLASS_SPOOF = "SPOOF"`
- `CLASS_UNCERTAIN = "UNCERTAIN"`
- `CLASS_INSUFFICIENT = "INSUFFICIENT_AUDIO"`

This contract is consistent with the intended semantics:

- `BONA_FIDE = genuine human speech`
- `SPOOF = synthetic/manipulated/replay/etc.`

The project also contains tests in `tests/test_label_semantics.py` that assert the label contract and VAD-based silence rejection. Those tests confirm the intended semantics at the API boundary.

However, the live inference path still interprets per-model logits in a legacy way, where a bonafide probability is computed as `sigmoid(logit)` and then a model spoof probability is reconstructed via `1.0 - bonafide_prob` in `voice_shield/inference.py`:

- LCNN: `lcnn_bonafide = sigmoid(logit); window_scores_lcnn.append(1.0 - lcnn_bonafide)`
- RawNet2: same pattern
- AASIST: same pattern
- WavLM: same pattern
- BiLSTM: same pattern

This means the underlying code must maintain a strict convention: `spoof_probability = 1 - bonafide_probability` for each sub-model, and then the fusion layer must convert those to a final risk score without silently reinterpreting labels. The logic is coherent in intent, but the full pipeline must be validated end-to-end to ensure there is no inversion somewhere in the actual inference path.

## 4. Verified Production Inference Logic

The active production inference engine is `voice_shield/inference.py`.

The actual end-to-end flow in the live code is:

1. `load_and_standardize_audio()`
2. `compute_audio_quality_metrics()`
3. `extract_voiced_waveform()`
4. `_slice_audio_windows(window_sec=3.0, hop_sec=1.5)`
5. Per-window feature extraction for LCNN / RawNet2 / AASIST / WavLM / BiLSTM
6. Robust trimmed-mean aggregation across windows
7. `VoiceShieldRiskClassifier.compute_risk()`
8. Return dictionary with `classification`, `risk_score`, `confidence`, `model_scores`, etc.

The relevant code confirms the project is performing sliding-window inference with VAD gating before the type of consensus risk calculation described in the earlier audit.

## 5. Verified Fusion Logic and Thresholds

The actual fusion code is in `voice_shield/models/fusion.py`.

The verified weighted fusion is:

- LCNN: `0.45`
- WavLM: `0.40`
- BiLSTM: `0.15`
- RawNet2: `0.0`
- AASIST: `0.0`

The current code also sets the decision logic:

- if `is_disagreement` or `35 <= risk_score <= 65`, result is `UNCERTAIN`
- if `risk_score > 65`, result is `SPOOF`
- else `BONA_FIDE`

This fits the earlier inspection conclusion that the ensemble still uses a fixed, hand-written weighting scheme and that RawNet2/AASIST are effectively excluded from the primary fusion score.

The exact text in the live code confirms the issue:

- `weights = { "lcnn": 0.45, "wavlm": 0.40, "bilstm": 0.15, "rawnet2": 0.0, "aasist": 0.0 }`

This is not evidence-driven learning; it is an arbitrary static weighting scheme.

## 6. Verified Calibration Status

There is a real calibration artifact at `model_artifacts/calibration.json`:

```json
{
  "threshold": 0.5,
  "method": "Speaker-Disjoint-Calibrated-Dev",
  "risk_tiers": {
    "low": [0.0, 25.0],
    "moderate": [25.0, 50.0],
    "high": [50.0, 75.0],
    "critical": [75.0, 100.0]
  }
}
```

The actual README/audit history has repeatedly indicated that calibration exists but was not correctly wired into inference. This is confirmed by the live code:

- `VoiceShieldRiskClassifier.load_calibration()` reads the file.
- But the subsequent `compute_risk()` logic does not actually use a calibrated probability model from the artifact; it uses the raw weighted ensemble score and then directly converts to `risk_score`.
- `voice_shield/models/calibration.py` contains `ModelCalibrator` logic for Platt / temperature / isotonic calibration, but it is not used by the inference path in `voice_shield/inference.py`.

This is a true calibration wiring bug: the artifact is present, but the actual live inference path is still effectively uncalibrated.

## 7. Verified Metrics and Benchmark Status

### 7.1 Current benchmark artifact

The current evaluation metrics artifact is `evaluation/results/evaluation_metrics.json`.

The measured results in that file are:

- accuracy: `0.6087`
- precision: `0.5909`
- recall: `0.7429`
- F1: `0.6582`
- specificity: `0.4706`
- ROC-AUC: `0.7025`
- PR-AUC: `0.6418`
- EER: `0.3479`
- Brier score: `0.2464`
- ECE: `0.298`
- real human false-positive rate: `52.94%`
- spoof false-negative rate: `25.71%`

The confusion matrix in the same file is:

- true negatives (human-as-human): `16`
- false positives (human-as-spoof): `18`
- false negatives (spoof-as-human): `9`
- true positives (spoof-as-spoof): `26`

This is a direct live-file confirmation that the current benchmark is not acceptable for a real deployment: nearly one out of every two human examples is misclassified as spoof in the current real-human evaluation.

### 7.2 Champion experiment metrics

The `experiments/improved_model/metrics.json` file stores per-submodel scores:

- LCNN human FPR: `0.30`
- WavLM human FPR: `0.735`
- BiLSTM human FPR: `0.3425`

The WavLM branch, despite being part of the ensemble, is specifically the weak point:

- `wavlm` accuracy: `0.5487`
- `wavlm` ROC-AUC: `0.5967`
- `wavlm` EER: `0.4325`
- `wavlm` human FPR: `0.735`

This is a current-file confirmation of the earlier root cause: WavLM is hurting human genuine-speech performance.

### 7.3 Dataset oversubscription and small training sample count

`experiments/improved_model/config.json` proves the active champion model was trained on a very small sample set:

```json
{
  "training_samples": 1600,
  "validation_samples": 800,
  "test_samples": 800,
  "model_champion": "VoiceShield-v2.1.0-Ensemble"
}
```

This is an extreme under-utilization of the available dataset scale. The manifest includes hundreds of thousands of examples, but the active production experiment used only 1,600 training examples.

## 8. Dataset Distribution and Class Imbalance

The dataset manifest exists at `manifests/dataset_manifest.csv` and contains 371,670 files total.

The current aggregate split is:

- train: 79,380 total, 7,980 bonafide, 71,400 spoof
- dev: 54,544 total, 7,948 bonafide, 46,596 spoof
- eval: 237,746 total, 45,408 bonafide, 192,338 spoof

This yields an extreme class skew:

- train bonafide share: `10.05%`
- dev bonafide share: `14.57%`
- eval bonafide share: `19.10%`

The actual dataset is heavily spoof-dominant, which means the model is exposed to severe class imbalance and must be handled with proper training strategies, not just a threshold tweak.

The project also contains a speaker-disjoint manifest at `manifests/speaker_disjoint_manifest.csv`, which contains 403,449 rows with split counts:

- train: 21,053 bonafide, 79,859 spoof
- dev: 8,915 bonafide, 47,886 spoof
- test: 51,331 bonafide, 194,405 spoof

This includes proof of speaker-separated records and is healthier for evaluation than the raw manifest, but the active model still appears to have used a much smaller training set than the full available challenge set.

## 9. Verified Preprocessing and Feature Pipeline

The active preprocessing code is in `voice_shield/preprocessing.py` and the audio quality gate is in `voice_shield/vad.py`.

The canonical preprocessing constants are:

- sample rate: `16,000 Hz`
- fixed duration: `4.0 s`
- mono audio
- mel spectrogram: `40 bands`, `n_fft=512`, `hop=160`, `win=400`, `fmin=20`, `fmax=8000`
- target temporal bins: `96` frames
- LFCC features: central to LCNN
- prosody features: 8 features, 25ms frame / 10ms hop

The project does contain separate preprocessing logic and feature-generation functions, but the audit confirmed from the actual source that:

- training augmentation exists in the preprocessing code (`apply_audio_augmentation`, `apply_spec_augment`)
- inference uses VAD trimming and sliding windows in `voice_shield/inference.py`
- this creates a mismatch in how training and production inference are applied in practice

This is a real risk for distribution shift and should be fixed by unifying the training and inference preprocessing path before retraining.

## 10. Verified Checkpoint and Model Registry Status

The active checkpoint folders confirm multiple models exist, but there is no single production registry with explicit version metadata in the current filesystem.

Examples observed:

- `experiments/improved_model/model.pt`
- `experiments/improved_model/wavlm.pt`
- `experiments/improved_model/bilstm.pt`
- `experiments/rawnet2/model.pt`
- `experiments/aasist/model.pt`
- `experiments/ecapa/model.pt`
- `experiments/lcnn_lfcc/model.pt`
- `experiments/wavlm/model.pt`
- `models/voiceshield_best/model.pt`
- `experiments/improved_v1/model.pt`
- `experiments/improved_v2/model.pt`
- `experiments/baseline/model.pt`

The audit for the current repo confirms the missing model registry step from the backlog. The system is still relying on ad hoc loading logic and multiple checkpoint families rather than a single explicitly-validated production config.

## 11. Verified API Layer and Inference Path

The ML service path is split between:

- `ml-service/app/inference.py` — legacy model-manager approach based on an `AudioSpoofNet` family
- `voice_shield/inference.py` — the actual production ensemble used for live detection

The `ml-service/app/inference.py` code imports `VoiceShieldInferenceEngine` and then calls `engine.detect(audio_path_or_bytes=audio_bytes)`, so the user-facing service does route through the ensemble. However, the legacy model manager still exists and can confuse the production artifact selection.

The API response contract in the code and tests is mostly centered around `BONA_FIDE`, `SPOOF`, `UNCERTAIN`, and `INSUFFICIENT_AUDIO`, which matches the system design.

## 12. Verified Tests

The current test suite includes:

- `tests/test_label_semantics.py`
- other backend and ML test files under `ml-service/tests/`

The available tests do check label semantics, VAD and silence rejection, and output contract basics. However, the tests are not comprehensive enough to catch the real-world human false-positive problem because they do not evaluate the actual real-world benchmark and they do not evaluate the human-FPR of the full ensemble under actual distribution shift.

## 13. Verified Findings Against the Original Problem Statement

The current filesystem confirms the original problem statement’s major observations:

- WavLM has a very high human false-positive rate in the current champion metrics.
- The ensemble has a strongly weighted WavLM branch (`0.40`).
- Current evaluation shows ECE around `0.298`.
- Calibration files are present but not actually wired into the inference risk scoring path.
- Training/inference preprocessing differs in ways that can invalidate the model’s assumptions.
- The active champion dataset count is only `1,600` training examples.
- The actual benchmark indicates a human false-positive problem on genuine speech.
- RawNet2/AASIST have zero weight in the live fusion rule.
- Real-time and registry features are incomplete.

These are not speculative; they are visible in the current files and code.

## 14. Root Cause Summary

The root causes are clear and verifiable from the filesystem:

1. Human-FPR problem is active in the current WavLM + ensemble pipeline.
2. Static weights are hard-coded and give WavLM too much influence.
3. Calibration artifacts exist but are not actually applied in production inference.
4. Training and inference preprocessing are mismatched.
5. The active champion training sample count is far too small for robust production use.
6. The project contains multiple competing checkpoint families and duplicate model paths.
7. The current benchmark demonstrates real human false positives and therefore fails the primary accuracy requirement.

## 15. Required Next Step

The next phase must be the actual accuracy and false-positive remediation workflow:

- label-semantics verification and endpoint-level tests
- real benchmark generation
- per-model evaluation
- train/inference preprocessing alignment
- class imbalance and hard-negative training investigation
- fusion redesign with dev-only learning
- calibration wiring and reliability layer improvement
- retraining and benchmark comparison against the current production model

This report is intentionally a read-only inspection artifact. No model, preprocessing, or training logic was modified in this phase.
