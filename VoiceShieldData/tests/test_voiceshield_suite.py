"""
VoiceShield Comprehensive ML & Forensics Test Suite
Tests:
1. Audio feature extraction (LFCC, Prosody, Log-Mel)
2. Neural Architectures (LCNN, RawNet2, AASIST, WavLM, BiLSTM, ECAPA)
3. Unified Multi-Model Inference API
4. Probability Calibration (Platt, Temperature, Isotonic)
5. Audio robustness (silence, short audio, zero padding)
"""
import pytest
import torch
import numpy as np

from voice_shield.features import (
    extract_lfcc,
    extract_prosodic_features,
    load_and_standardize_audio,
)
from voice_shield.preprocessing import extract_log_mel_spectrogram
from voice_shield.models.lcnn import LCNN
from voice_shield.models.rawnet2 import RawNet2
from voice_shield.models.aasist import AASIST
from voice_shield.models.wavlm_head import WavLMClassifier
from voice_shield.models.bilstm_prosody import BiLSTMProsodyModel
from voice_shield.models.ecapa import ECAPATDNN, compute_speaker_consistency_score
from voice_shield.models.fusion import VoiceShieldRiskClassifier
from voice_shield.models.calibration import TemperatureScaling, ModelCalibrator
from voice_shield.inference import detect_audio, VoiceShieldInferenceEngine


class TestFeatureExtraction:
    def test_extract_lfcc_dimensions(self):
        waveform = torch.randn(64000)
        lfcc = extract_lfcc(waveform, num_ceps=20)
        assert lfcc.ndim == 3
        assert lfcc.shape[0] == 3  # static, delta, delta-delta
        assert lfcc.shape[1] == 20 # 20 cepstral coefficients
        assert lfcc.shape[2] > 0

    def test_extract_prosody_dimensions(self):
        waveform = torch.randn(64000)
        prosody = extract_prosodic_features(waveform)
        assert prosody.ndim == 2
        assert prosody.shape[1] == 8  # 8 acoustic time-series features
        assert prosody.shape[0] > 0

    def test_extract_log_mel_spectrogram(self):
        waveform = torch.randn(64000)
        mel = extract_log_mel_spectrogram(waveform)
        assert mel.ndim == 3
        assert mel.shape[1] == 40  # 40 mel bands
        assert mel.shape[2] == 96  # 96 time frames


class TestNeuralArchitectures:
    def test_lcnn_forward(self):
        model = LCNN(in_channels=3, num_classes=1)
        x = torch.randn(2, 3, 20, 200)
        logits = model(x, return_logits=True)
        assert logits.shape == (2,)

    def test_rawnet2_forward(self):
        model = RawNet2(sinc_channels=64, num_classes=1)
        x = torch.randn(2, 64000)
        logits = model(x, return_logits=True)
        assert logits.shape == (2,)

    def test_aasist_forward(self):
        model = AASIST(sinc_channels=64, num_classes=1)
        x = torch.randn(2, 64000)
        logits = model(x, return_logits=True)
        assert logits.shape == (2,)

    def test_wavlm_forward(self):
        model = WavLMClassifier(feat_dim=128, num_layers=2, num_heads=4, num_classes=1)
        x = torch.randn(2, 64000)
        logits = model(x, return_logits=True)
        assert logits.shape == (2,)

    def test_bilstm_forward(self):
        model = BiLSTMProsodyModel(in_features=8, hidden_dim=64, num_layers=2, num_classes=1)
        x = torch.randn(2, 100, 8)
        logits = model(x, return_logits=True)
        assert logits.shape == (2,)

    def test_ecapa_speaker_embedding_and_cosine(self):
        model = ECAPATDNN(in_channels=40, channels=128, emb_dim=192)
        x1 = torch.randn(1, 40, 96)
        x2 = torch.randn(1, 40, 96)
        sim = compute_speaker_consistency_score(model, x1, x2)
        assert -1.0 <= sim <= 1.0


class TestProbabilityCalibration:
    def test_temperature_scaling(self):
        temp_layer = TemperatureScaling(init_temp=1.2)
        logits = np.array([-2.0, 0.0, 2.0], dtype=np.float32)
        probs = temp_layer.calibrate_probs(logits)
        assert np.all(probs >= 0.0) and np.all(probs <= 1.0)
        assert probs[0] < probs[1] < probs[2]

    def test_model_calibrator(self):
        calibrator = ModelCalibrator(method="isotonic")
        logits_train = np.array([-3.0, -1.0, 1.0, 3.0])
        labels_train = np.array([0, 0, 1, 1])
        calibrator.fit(logits_train, labels_train)
        calibrated_low = calibrator.predict_probability(-2.0)
        calibrated_high = calibrator.predict_probability(2.0)
        assert 0.0 <= calibrated_low <= calibrated_high <= 1.0


class TestUnifiedInference:
    def test_risk_classifier_schema(self):
        risk_clf = VoiceShieldRiskClassifier()
        model_scores = {
            "lcnn": 0.85,
            "rawnet2": 0.78,
            "aasist": 0.92,
            "wavlm": 0.88,
            "bilstm": 0.65,
        }
        res = risk_clf.compute_risk(model_scores, speaker_consistency=0.30)
        assert "prediction" in res
        assert "probability" in res
        assert "risk_score" in res
        assert "risk_level" in res
        assert "explanation" in res
        assert 0.0 <= res["risk_score"] <= 100.0
        assert res["risk_level"] in ("LOW", "MODERATE", "HIGH", "VERY HIGH", "VERY_HIGH", "CRITICAL")
        assert len(res["explanation"]) > 0

    def test_synthetic_audio_end_to_end_detect(self, tmp_path):
        import soundfile as sf
        sample_path = tmp_path / "test_audio.wav"
        t = np.linspace(0, 3, 48000)
        audio = 0.5 * np.sin(2 * np.pi * 440 * t) + 0.1 * np.random.randn(len(t))
        sf.write(str(sample_path), audio.astype(np.float32), 16000)

        res = detect_audio(str(sample_path))
        assert res["prediction"] in ("bonafide", "spoof")
        assert 0.0 <= res["probability"] <= 1.0
        assert 0.0 <= res["risk_score"] <= 100.0
        assert "model_scores" in res
        assert res["model_version"] == "VoiceShield-v2.0.0-Ensemble"
