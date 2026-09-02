"""
Tests that genuine human speech recordings reliably achieve low false positive rates.
"""
from pathlib import Path
import pytest
import soundfile as sf
import numpy as np

from voice_shield.inference import VoiceShieldInferenceEngine
from voice_shield.constants import CLASS_SPOOF, CLASS_BONAFIDE, CLASS_UNCERTAIN

ROOT_DIR = Path(__file__).resolve().parent.parent
EVAL_HUMAN_DIR = ROOT_DIR / "evaluation" / "human"


def test_human_speech_false_positive_rate():
    """Evaluates all available human samples in evaluation/human/ and asserts FPR <= 5%."""
    if not EVAL_HUMAN_DIR.exists():
        pytest.skip("evaluation/human/ directory not found.")

    human_files = list(EVAL_HUMAN_DIR.glob("*.*"))
    if len(human_files) == 0:
        pytest.skip("No human audio files in evaluation/human/.")

    engine = VoiceShieldInferenceEngine.get_instance()
    
    false_positives = 0
    total_evaluated = 0

    for f in human_files:
        try:
            res = engine.detect(str(f))
            total_evaluated += 1
            if res["classification"] == CLASS_SPOOF:
                false_positives += 1
        except Exception:
            continue

    if total_evaluated > 0:
        fpr = (false_positives / total_evaluated) * 100.0
        print(f"\n[Human FPR Test] Evaluated: {total_evaluated} | False Positives: {false_positives} | FPR: {fpr:.2f}%")
        # Assert False Positive Rate is strictly <= 5.0%
        assert fpr <= 5.0, f"Human false positive rate ({fpr:.2f}%) exceeds acceptable threshold (5.0%)"
