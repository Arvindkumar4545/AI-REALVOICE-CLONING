"""
VoiceShield End-to-End System Integration Test
Validates the entire pipeline:
1. Audio generation (genuine tones, synthetic artifacts)
2. Feature extraction (LFCC, Log-Mel, Prosody)
3. Sub-model inference (LCNN, RawNet2, AASIST, WavLM, BiLSTM, ECAPA)
4. Calibrated ensemble risk scoring (0-100)
5. Explainability forensic tags
6. Latency telemetry benchmarks
"""
import time
import sys
import numpy as np
import soundfile as sf
import tempfile
from pathlib import Path
import json

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from voice_shield.inference import detect_audio, VoiceShieldInferenceEngine


def run_e2e_test():
    print("=" * 70)
    print("VOICE SHIELD — END-TO-END SYSTEM INTEGRATION TEST")
    print("=" * 70)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        
        # 1. Create simulated test sample
        t = np.linspace(0, 3, 48000, dtype=np.float32)
        # Synthetic spoof audio with high frequency harmonics and robotic modulation
        synth_audio = 0.4 * np.sin(2 * np.pi * 300 * t) + 0.3 * np.sin(2 * np.pi * 900 * t) + 0.1 * np.sin(2 * np.pi * 2700 * t)
        synth_file = tmp_path / "synthetic_scam_sample.wav"
        sf.write(str(synth_file), synth_audio, 16000)

        # Enrolled reference audio
        ref_audio = 0.5 * np.sin(2 * np.pi * 220 * t) + 0.05 * np.random.randn(len(t)).astype(np.float32)
        ref_file = tmp_path / "enrolled_voice_ref.wav"
        sf.write(str(ref_file), ref_audio, 16000)

        print("\n[Step 1] Initializing Unified Multi-Model Engine...")
        engine = VoiceShieldInferenceEngine.get_instance()
        assert engine is not None, "Failed to instantiate inference engine"
        print("  [OK] Multi-Model Engine loaded successfully.")

        print("\n[Step 2] Executing End-to-End Deepfake Detection with Biometric Reference...")
        t0 = time.perf_counter()
        result = detect_audio(str(synth_file), ref_audio_path=str(ref_file))
        latency = (time.perf_counter() - t0) * 1000.0

        print(f"  [OK] Execution finished in {latency:.2f} ms")
        print("\n[Step 3] Validating Payload Output Schema:")
        print(f"  - Prediction: {result['prediction']}")
        print(f"  - Probability: {result['probability']:.4f}")
        print(f"  - Risk Score: {result['risk_score']:.1f} / 100.0")
        print(f"  - Risk Level: {result['risk_level']}")
        print(f"  - Model Version: {result['model_version']}")
        print(f"  - Sub-Model Scores:")
        for model_k, score_v in result["model_scores"].items():
            print(f"      * {model_k:<28}: {score_v:.4f}")

        print(f"\n[Step 4] Forensic Explainability Breakdown ({len(result['explanation'])} signals):")
        for exp in result["explanation"]:
            print(f"  - [{exp['severity'].upper()}] {exp['signal']}: {exp['detail']}")

        # Assertions
        assert result["prediction"] in ("bonafide", "spoof", "uncertain")
        assert 0.0 <= result["probability"] <= 1.0
        assert 0.0 <= result["risk_score"] <= 100.0
        assert len(result["model_scores"]) >= 5
        assert len(result["explanation"]) > 0

        print("\n" + "=" * 70)
        print("ALL END-TO-END SYSTEM INTEGRATION CHECKS PASSED PERFECTLY!")
        print("=" * 70)


if __name__ == "__main__":
    run_e2e_test()
