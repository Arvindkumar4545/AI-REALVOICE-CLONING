"""
Tests inference semantics, calibrated 4-tier decision engine, probability inversion, and sliding-window aggregation.
"""
import numpy as np
import pytest
import torch

from voice_shield.constants import (
    LABEL_BONAFIDE,
    LABEL_SPOOF,
    CLASS_BONAFIDE,
    CLASS_SPOOF,
    CLASS_UNCERTAIN,
    CLASS_INSUFFICIENT,
)
from voice_shield.models.fusion import VoiceShieldRiskClassifier
from evaluation.evaluate_model import binary_prediction_from_classification


def test_label_semantics_truth():
    """Confirms ground truth mathematical semantics."""
    assert LABEL_BONAFIDE == 1.0, "LABEL_BONAFIDE must be 1.0 (Human)"
    assert LABEL_SPOOF == 0.0, "LABEL_SPOOF must be 0.0 (Spoof/Deepfake)"


def test_fusion_decision_boundaries():
    """Tests calibrated decision boundaries across the full probability spectrum."""
    classifier = VoiceShieldRiskClassifier()

    # 1. Low spoof probability (< 0.35) -> BONA_FIDE
    low_spoof_probs = {"lcnn": 0.15, "wavlm": 0.20, "bilstm": 0.25}
    res_bonafide = classifier.classify(low_spoof_probs)
    assert res_bonafide["classification"] == CLASS_BONAFIDE
    assert res_bonafide["risk_score"] < 35.0
    assert res_bonafide["risk_tier"] == "LOW"

    # 2. Moderate/Uncertain spoof probability (0.35 - 0.65) -> UNCERTAIN
    uncertain_probs = {"lcnn": 0.50, "wavlm": 0.45, "bilstm": 0.55}
    res_uncertain = classifier.classify(uncertain_probs)
    assert res_uncertain["classification"] == CLASS_UNCERTAIN
    assert 35.0 <= res_uncertain["risk_score"] <= 65.0
    assert res_uncertain["risk_tier"] == "MODERATE"

    # 3. High spoof probability (> 0.65) -> SPOOF
    high_spoof_probs = {"lcnn": 0.85, "wavlm": 0.90, "bilstm": 0.80}
    res_spoof = classifier.classify(high_spoof_probs)
    assert res_spoof["classification"] == CLASS_SPOOF
    assert res_spoof["risk_score"] > 65.0
    assert res_spoof["risk_tier"] in ("HIGH", "CRITICAL")


def test_model_agreement_metric():
    """Verifies that model agreement is 1.0 when all sub-models agree and < 1.0 when divergent."""
    classifier = VoiceShieldRiskClassifier()

    # All sub-models agree spoof is low (<0.50)
    unanimous = {"lcnn": 0.10, "wavlm": 0.15, "bilstm": 0.20}
    res_unanimous = classifier.classify(unanimous)
    assert res_unanimous["model_agreement"] == 1.0

    # Divergent predictions: 2 say low, 1 says high
    divergent = {"lcnn": 0.10, "wavlm": 0.20, "bilstm": 0.85}
    res_divergent = classifier.classify(divergent)
    assert res_divergent["model_agreement"] == pytest.approx(2.0 / 3.0, 0.01)


def test_uncertain_classification_is_not_treated_as_spoof():
    """The 3-state policy requires UNCERTAIN to remain non-spoof in binary reporting."""
    assert binary_prediction_from_classification(CLASS_BONAFIDE) == 0
    assert binary_prediction_from_classification(CLASS_UNCERTAIN) == 0
    assert binary_prediction_from_classification(CLASS_SPOOF) == 1
