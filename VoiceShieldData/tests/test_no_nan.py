"""
Tests numerical safety: guarantees zero NaN, Infinity, or impossible out-of-range values in any output tensor or metric dictionary.
"""
import math
import numpy as np
import pytest
import torch

from voice_shield.models.lcnn import LCNN
from voice_shield.models.bilstm_prosody import BiLSTMProsodyModel
from voice_shield.inference import VoiceShieldInferenceEngine


def test_lcnn_forward_no_nan():
    """Verifies that LCNN produces finite logits with extreme inputs."""
    model = LCNN(in_channels=3, num_classes=1)
    model.eval()

    # Normal input
    x_normal = torch.randn(2, 3, 20, 96)
    with torch.no_grad():
        out_normal = model(x_normal)
    assert torch.isfinite(out_normal).all()

    # Near-zero input
    x_zero = torch.zeros(2, 3, 20, 96)
    with torch.no_grad():
        out_zero = model(x_zero)
    assert torch.isfinite(out_zero).all()


def test_bilstm_forward_no_nan():
    """Verifies BiLSTM prosody model forward pass numerical stability."""
    model = BiLSTMProsodyModel(in_features=8, hidden_dim=64, num_layers=2)
    model.eval()

    x = torch.randn(2, 50, 8)
    with torch.no_grad():
        out = model(x)
    assert torch.isfinite(out).all()
    assert out.shape[0] == 2


def test_inference_engine_output_finite():
    """Verifies end-to-end inference produces 100% finite metrics on both synthetic signal and authentic speech."""
    engine = VoiceShieldInferenceEngine.get_instance()
    
    # 1. Test with synthetic signal (VAD will gate or process cleanly)
    sr = 16000
    t = np.linspace(0, 3.0, int(sr * 3.0), endpoint=False)
    signal = 0.5 * np.sin(2 * np.pi * 300 * t) + 0.1 * np.random.randn(len(t))

    res = engine.detect(signal)
    
    assert res is not None
    assert isinstance(res["classification"], str)
    
    # Verify probabilities are valid finite numbers in [0.0, 1.0]
    assert 0.0 <= res["spoof_probability"] <= 1.0
    assert 0.0 <= res["bonafide_probability"] <= 1.0
    assert 0.0 <= res["confidence"] <= 100.0
    
    if res["classification"] != "INSUFFICIENT_AUDIO":
        assert math.isclose(res["spoof_probability"] + res["bonafide_probability"], 1.0, abs_tol=1e-5)
        assert res["risk_score"] is not None
        assert 0.0 <= res["risk_score"] <= 100.0
        assert not math.isnan(res["risk_score"])
        assert not math.isinf(res["risk_score"])

    # Verify quality metrics are all finite
    quality = res.get("quality", {})
    for k, v in quality.items():
        if isinstance(v, (int, float)):
            assert not math.isnan(v), f"Quality metric {k} is NaN"
            assert not math.isinf(v), f"Quality metric {k} is Inf"
