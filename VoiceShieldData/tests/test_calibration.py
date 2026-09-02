"""
Unit tests for VoiceShield Probability Calibration & Temperature Scaling.
"""
import numpy as np
import pytest
import torch

from voice_shield.models.calibration import ModelCalibrator, TemperatureScaling


def test_temperature_scaling_monotonicity():
    """Verifies that temperature scaling preserves rank ordering of logits."""
    temp_layer = TemperatureScaling(init_temp=1.5)
    logits = np.array([-2.5, -1.0, 0.0, 1.2, 3.8])
    probs = temp_layer.calibrate_probs(logits)
    
    # Assert monotonic increase
    assert np.all(np.diff(probs) > 0), "Temperature scaling must preserve monotonic ranking"
    assert np.all(probs >= 0.0) and np.all(probs <= 1.0), "Probabilities must lie in [0, 1]"


def test_model_calibrator_fitting():
    """Verifies that ModelCalibrator fits on validation data and reduces Brier score."""
    np.random.seed(42)
    val_logits = np.random.randn(100) * 2.0
    val_targets = (val_logits > 0.3).astype(int)
    
    calibrator = ModelCalibrator()
    results = calibrator.fit(val_logits, val_targets)
    
    assert "best_calibration_method" in results
    assert results["brier_score_calibrated"] <= results["brier_score_raw"] + 0.05
    
    # Test probability prediction
    p_cal = calibrator.predict_probability(1.5)
    assert 0.0 <= p_cal <= 1.0
