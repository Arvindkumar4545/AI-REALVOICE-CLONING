#!/usr/bin/env python3
"""
PHASE 1 - VOICESHIELD FALSE POSITIVE INVESTIGATION
Complete Inference Pipeline Trace & Diagnostic Report

This script traces a known REAL human voice through the complete inference pipeline
and prints the value at every stage to identify where the false positive originates.

CRITICAL: Do NOT modify thresholds or train. Only diagnose.
"""
from __future__ import annotations

import sys
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

import numpy as np
import torch
import librosa
import soundfile as sf

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("voiceshield.diagnostic")

# Add paths
BASE_DIR = Path(r"F:\VoiceShieldData")
sys.path.insert(0, str(BASE_DIR))

from voice_shield.constants import (
    TARGET_SR,
    CLASS_BONAFIDE,
    CLASS_SPOOF,
    CLASS_UNCERTAIN,
    LABEL_BONAFIDE,
    LABEL_SPOOF,
)
from voice_shield.features import load_and_standardize_audio, extract_lfcc, extract_prosodic_features
from voice_shield.preprocessing import extract_log_mel_spectrogram
from voice_shield.vad import compute_audio_quality_metrics
from voice_shield.models import (
    LCNN, RawNet2, AASIST, WavLMClassifier, BiLSTMProsodyModel, ECAPATDNN,
)


class InferencePipelineTracer:
    """Traces inference pipeline stage by stage with detailed logging."""
    
    def __init__(self, device: str = "cuda" if torch.cuda.is_available() else "cpu"):
        self.device = torch.device(device)
        self.report = {
            "pipeline_trace": [],
            "label_semantics": {},
            "model_outputs": {},
            "stage_values": {},
        }
        logger.info(f"✓ Initialized InferencePipelineTracer on device: {self.device}")
    
    def log_stage(self, stage_name: str, value: Any, description: str = ""):
        """Logs a pipeline stage value."""
        log_entry = {
            "stage": stage_name,
            "value": value,
            "description": description,
            "value_type": type(value).__name__,
        }
        self.report["pipeline_trace"].append(log_entry)
        logger.info(f"[STAGE] {stage_name:50s} = {str(value)[:100]:100s} | {description}")
    
    def trace_label_semantics(self):
        """PHASE 2: Verify label semantics across the system."""
        logger.info("\n" + "="*120)
        logger.info("PHASE 2 - LABEL SEMANTICS VERIFICATION")
        logger.info("="*120)
        
        semantics = {
            "LABEL_BONAFIDE": LABEL_BONAFIDE,
            "LABEL_SPOOF": LABEL_SPOOF,
            "CLASS_BONAFIDE": CLASS_BONAFIDE,
            "CLASS_SPOOF": CLASS_SPOOF,
        }
        
        logger.info("\nCONSTANTS.PY DEFINITIONS:")
        for key, val in semantics.items():
            logger.info(f"  {key:30s} = {val}")
            self.report["label_semantics"][key] = val
        
        logger.info("\nINTERPRETATION:")
        logger.info(f"  Training target for BONAFIDE voice    = {LABEL_BONAFIDE}")
        logger.info(f"  Training target for SPOOF/FAKE voice  = {LABEL_SPOOF}")
        logger.info(f"  String classification for bonafide    = {CLASS_BONAFIDE}")
        logger.info(f"  String classification for spoof       = {CLASS_SPOOF}")
        
        logger.info("\nMODEL OUTPUT INTERPRETATION:")
        logger.info("  For binary classification with BCE loss:")
        logger.info("    - Model trained with target 1.0 = class BONAFIDE")
        logger.info("    - Model trained with target 0.0 = class SPOOF")
        logger.info("    - Raw logit > 0 after sigmoid → probability > 0.5 = BONAFIDE")
        logger.info("    - Raw logit < 0 after sigmoid → probability < 0.5 = SPOOF")
        logger.info("    - In inference: spoof_prob = 1.0 - sigmoid(logit) when target=1 means bonafide")
        
        return semantics
    
    def trace_audio_loading(self, audio_path_or_bytes: str | Path | bytes) -> tuple[np.ndarray, int]:
        """PHASE 1a: Trace audio loading and resampling."""
        logger.info("\n" + "="*120)
        logger.info("PHASE 1a - AUDIO LOADING & RESAMPLING")
        logger.info("="*120)
        
        if isinstance(audio_path_or_bytes, bytes):
            self.log_stage("Input Type", "bytes", f"Audio provided as raw bytes ({len(audio_path_or_bytes)} bytes)")
        else:
            audio_path = Path(audio_path_or_bytes)
            self.log_stage("Input Path", str(audio_path), f"File exists: {audio_path.exists()}")
            if audio_path.exists():
                file_size = audio_path.stat().st_size
                self.log_stage("File Size", f"{file_size} bytes", f"{file_size / 1024 / 1024:.2f} MB")
        
        try:
            # Standardize audio (this function handles multiple formats)
            y = load_and_standardize_audio(audio_path_or_bytes).cpu().numpy()
            
            self.log_stage("Output Shape", y.shape, "1D numpy array after standardization")
            self.log_stage("Output SR", TARGET_SR, "Resampled to 16kHz")
            self.log_stage("Duration", f"{len(y) / TARGET_SR:.2f}s", f"{len(y)} samples at {TARGET_SR} Hz")
            self.log_stage("Min Value", f"{y.min():.6f}", "Minimum sample value")
            self.log_stage("Max Value", f"{y.max():.6f}", "Maximum sample value")
            self.log_stage("Mean", f"{y.mean():.6f}", "Mean sample value")
            self.log_stage("RMS", f"{np.sqrt(np.mean(y**2)):.6f}", "Root mean square energy")
            
            return y, TARGET_SR
        except Exception as e:
            logger.error(f"✗ Failed to load audio: {e}", exc_info=True)
            raise
    
    def trace_vad_quality(self, y: np.ndarray, sr: int):
        """PHASE 1b: Trace VAD and audio quality."""
        logger.info("\n" + "="*120)
        logger.info("PHASE 1b - VOICE ACTIVITY DETECTION & AUDIO QUALITY")
        logger.info("="*120)
        
        quality_metrics = compute_audio_quality_metrics(y, sr=sr)
        
        self.log_stage("is_sufficient", quality_metrics.get("is_sufficient"), "Is audio sufficient for analysis?")
        self.log_stage("SNR (dB)", f"{quality_metrics.get('snr_db', 'N/A')}", "Signal-to-noise ratio")
        self.log_stage("Speech Ratio", f"{quality_metrics.get('speech_ratio', 'N/A')}", "Fraction of active speech")
        self.log_stage("Speech Duration", f"{quality_metrics.get('speech_duration_seconds', 'N/A')}s", "Active speech seconds")
        self.log_stage("Message", quality_metrics.get("message", "N/A"), "Quality assessment message")
        
        self.report["stage_values"]["audio_quality"] = quality_metrics
        return quality_metrics
    
    def trace_feature_extraction(self, y: torch.Tensor) -> Dict[str, torch.Tensor]:
        """PHASE 1c: Trace feature extraction for each model."""
        logger.info("\n" + "="*120)
        logger.info("PHASE 1c - FEATURE EXTRACTION")
        logger.info("="*120)
        
        y_device = y.to(self.device)
        
        # LFCC features (for LCNN)
        lfcc = extract_lfcc(y_device).unsqueeze(0)
        self.log_stage("LFCC Shape", lfcc.shape, "LFCC features with delta and delta-delta")
        self.log_stage("LFCC Min", f"{lfcc.min():.4f}", "Minimum LFCC value")
        self.log_stage("LFCC Max", f"{lfcc.max():.4f}", "Maximum LFCC value")
        self.log_stage("LFCC Mean", f"{lfcc.mean():.4f}", "Mean LFCC value")
        
        # Mel spectrogram (for RawNet2, AASIST, WavLM)
        mel = extract_log_mel_spectrogram(y_device, augment=False).unsqueeze(0)
        self.log_stage("Mel Spectrogram Shape", mel.shape, "Log mel spectrogram")
        self.log_stage("Mel Min", f"{mel.min():.4f}", "Minimum mel value")
        self.log_stage("Mel Max", f"{mel.max():.4f}", "Maximum mel value")
        
        # Prosodic features (for BiLSTM)
        prosody = extract_prosodic_features(y_device).unsqueeze(0)
        self.log_stage("Prosody Shape", prosody.shape, "F0, jitter, shimmer, energy, etc.")
        self.log_stage("Prosody Min", f"{prosody.min():.4f}", "Minimum prosody value")
        self.log_stage("Prosody Max", f"{prosody.max():.4f}", "Maximum prosody value")
        
        return {
            "lfcc": lfcc.to(self.device),
            "mel": mel.to(self.device),
            "raw": y_device.unsqueeze(0),
            "prosody": prosody.to(self.device),
        }
    
    def trace_model_inference(self, features: Dict[str, torch.Tensor]) -> Dict[str, Dict[str, float]]:
        """PHASE 1d: Trace raw model outputs."""
        logger.info("\n" + "="*120)
        logger.info("PHASE 1d - INDIVIDUAL MODEL INFERENCE")
        logger.info("="*120)
        
        model_outputs = {}
        
        # Initialize models
        lcnn = LCNN(in_channels=3, num_classes=1).to(self.device).eval()
        rawnet2 = RawNet2(sinc_channels=64, num_classes=1).to(self.device).eval()
        aasist = AASIST(sinc_channels=64, num_classes=1).to(self.device).eval()
        wavlm = WavLMClassifier(feat_dim=128, num_layers=2, num_heads=4).to(self.device).eval()
        bilstm = BiLSTMProsodyModel(in_features=8, hidden_dim=64).to(self.device).eval()
        
        with torch.no_grad():
            # LCNN
            logger.info("\n[MODEL] LCNN (LFCC + Delta + Delta-Delta)")
            lcnn_logit = lcnn(features["lfcc"], return_logits=True)
            lcnn_sigmoid = torch.sigmoid(lcnn_logit).item()
            lcnn_spoof_prob = 1.0 - lcnn_sigmoid
            
            self.log_stage("LCNN Raw Logit", f"{lcnn_logit.item():.6f}", "Unscaled output")
            self.log_stage("LCNN Sigmoid", f"{lcnn_sigmoid:.6f}", "sigmoid(logit) = bonafide probability")
            self.log_stage("LCNN Spoof Prob", f"{lcnn_spoof_prob:.6f}", "1.0 - sigmoid = spoof probability")
            
            model_outputs["lcnn"] = {
                "logit": float(lcnn_logit.item()),
                "sigmoid": lcnn_sigmoid,
                "spoof_prob": lcnn_spoof_prob,
            }
            
            # RawNet2
            logger.info("\n[MODEL] RawNet2 (Raw Waveform)")
            rawnet_logit = rawnet2(features["raw"], return_logits=True)
            rawnet_sigmoid = torch.sigmoid(rawnet_logit).item()
            rawnet_spoof_prob = 1.0 - rawnet_sigmoid
            
            self.log_stage("RawNet2 Raw Logit", f"{rawnet_logit.item():.6f}", "Unscaled output")
            self.log_stage("RawNet2 Sigmoid", f"{rawnet_sigmoid:.6f}", "sigmoid(logit) = bonafide probability")
            self.log_stage("RawNet2 Spoof Prob", f"{rawnet_spoof_prob:.6f}", "1.0 - sigmoid = spoof probability")
            
            model_outputs["rawnet2"] = {
                "logit": float(rawnet_logit.item()),
                "sigmoid": rawnet_sigmoid,
                "spoof_prob": rawnet_spoof_prob,
            }
            
            # AASIST
            logger.info("\n[MODEL] AASIST (Graph Attention)")
            aasist_logit = aasist(features["raw"], return_logits=True)
            aasist_sigmoid = torch.sigmoid(aasist_logit).item()
            aasist_spoof_prob = 1.0 - aasist_sigmoid
            
            self.log_stage("AASIST Raw Logit", f"{aasist_logit.item():.6f}", "Unscaled output")
            self.log_stage("AASIST Sigmoid", f"{aasist_sigmoid:.6f}", "sigmoid(logit) = bonafide probability")
            self.log_stage("AASIST Spoof Prob", f"{aasist_spoof_prob:.6f}", "1.0 - sigmoid = spoof probability")
            
            model_outputs["aasist"] = {
                "logit": float(aasist_logit.item()),
                "sigmoid": aasist_sigmoid,
                "spoof_prob": aasist_spoof_prob,
            }
            
            # WavLM
            logger.info("\n[MODEL] WavLM (Contextual Transformer)")
            wavlm_logit = wavlm(features["raw"], return_logits=True)
            wavlm_sigmoid = torch.sigmoid(wavlm_logit).item()
            wavlm_spoof_prob = 1.0 - wavlm_sigmoid
            
            self.log_stage("WavLM Raw Logit", f"{wavlm_logit.item():.6f}", "Unscaled output")
            self.log_stage("WavLM Sigmoid", f"{wavlm_sigmoid:.6f}", "sigmoid(logit) = bonafide probability")
            self.log_stage("WavLM Spoof Prob", f"{wavlm_spoof_prob:.6f}", "1.0 - sigmoid = spoof probability")
            
            model_outputs["wavlm"] = {
                "logit": float(wavlm_logit.item()),
                "sigmoid": wavlm_sigmoid,
                "spoof_prob": wavlm_spoof_prob,
            }
            
            # BiLSTM Prosody
            logger.info("\n[MODEL] BiLSTM Prosody (Pitch, Jitter, Shimmer, Energy)")
            bilstm_logit = bilstm(features["prosody"], return_logits=True)
            bilstm_sigmoid = torch.sigmoid(bilstm_logit).item()
            bilstm_spoof_prob = 1.0 - bilstm_sigmoid
            
            self.log_stage("BiLSTM Raw Logit", f"{bilstm_logit.item():.6f}", "Unscaled output")
            self.log_stage("BiLSTM Sigmoid", f"{bilstm_sigmoid:.6f}", "sigmoid(logit) = bonafide probability")
            self.log_stage("BiLSTM Spoof Prob", f"{bilstm_spoof_prob:.6f}", "1.0 - sigmoid = spoof probability")
            
            model_outputs["bilstm"] = {
                "logit": float(bilstm_logit.item()),
                "sigmoid": bilstm_sigmoid,
                "spoof_prob": bilstm_spoof_prob,
            }
        
        self.report["model_outputs"] = model_outputs
        return model_outputs
    
    def trace_consensus(self, model_outputs: Dict[str, Dict[str, float]]):
        """PHASE 1e: Trace consensus calculation."""
        logger.info("\n" + "="*120)
        logger.info("PHASE 1e - CONSENSUS & RISK CALCULATION")
        logger.info("="*120)
        
        spoof_probs = {k: v["spoof_prob"] for k, v in model_outputs.items()}
        
        # Default weights (from fusion.py)
        weights = {
            "lcnn": 0.48,
            "bilstm": 0.45,
            "rawnet2": 0.05,
            "wavlm": 0.02,
            "aasist": 0.00,
        }
        
        logger.info("\n[WEIGHTS] Ensemble Fusion Weights:")
        total_w = sum(weights.values())
        for model, w in weights.items():
            logger.info(f"  {model:20s} = {w:.2f} ({w/total_w*100:.1f}%)")
        
        logger.info("\n[CALCULATION] Weighted Ensemble:")
        weighted_sum = 0.0
        for model, w in weights.items():
            prob = spoof_probs.get(model, 0.50)
            contribution = prob * w
            weighted_sum += contribution
            logger.info(f"  {model:20s}: {prob:.6f} × {w:.2f} = {contribution:.6f}")
        
        weighted_avg = weighted_sum / total_w
        self.log_stage("Weighted Average Spoof Prob", f"{weighted_avg:.6f}", "Before calibration")
        
        logger.info("\n[CALCULATION] Model Agreement:")
        primary_scores = [
            spoof_probs.get("lcnn", 0.50),
            spoof_probs.get("bilstm", 0.50),
            spoof_probs.get("wavlm", 0.50),
        ]
        submodel_preds = [1 if p > 0.50 else 0 for p in primary_scores]
        spoof_votes = sum(submodel_preds)
        agreement = spoof_votes / len(submodel_preds)
        
        logger.info(f"  Primary models: {[f'{p:.3f}' for p in primary_scores]}")
        logger.info(f"  Spoof predictions: {submodel_preds}")
        logger.info(f"  Spoof votes: {spoof_votes}/{len(submodel_preds)}")
        logger.info(f"  Model agreement: {agreement:.2f}")
        
        # Risk score
        risk_score = weighted_avg * 100.0
        self.log_stage("Risk Score", f"{risk_score:.1f}%", "calibrated_spoof_prob * 100")
        
        # Classification logic
        logger.info("\n[CLASSIFICATION] Decision Logic:")
        if risk_score >= 65.0:
            classification = CLASS_SPOOF
            logger.info(f"  Risk score {risk_score:.1f}% >= 65% → Classification: {classification}")
        elif risk_score <= 35.0:
            classification = CLASS_BONAFIDE
            logger.info(f"  Risk score {risk_score:.1f}% <= 35% → Classification: {classification}")
        else:
            classification = CLASS_UNCERTAIN
            logger.info(f"  Risk score {risk_score:.1f}% in [35%, 65%] → Classification: {classification}")
        
        self.log_stage("Final Classification", classification, "BONA_FIDE / SPOOF / UNCERTAIN")
        
        return {
            "weighted_spoof_prob": weighted_avg,
            "risk_score": risk_score,
            "classification": classification,
            "model_agreement": agreement,
        }
    
    def generate_report(self) -> Dict[str, Any]:
        """Generates comprehensive diagnostic report."""
        return self.report


def main():
    """Main entry point."""
    logger.info("="*120)
    logger.info("VOICESHIELD FALSE POSITIVE ROOT CAUSE INVESTIGATION")
    logger.info("="*120)
    
    # For testing, we need an actual audio file
    # Let's look for test audio files in the datasets
    test_audio_paths = [
        BASE_DIR / "datasets" / "additional" / "real" / "*.wav",
        BASE_DIR / "datasets" / "in_the_wild" / "*.wav",
        BASE_DIR / "real_world_tests" / "*.wav",
        BASE_DIR / "evaluation" / "human" / "*.wav",
    ]
    
    audio_file = None
    for pattern in test_audio_paths:
        matches = list(Path(pattern.parent).glob(pattern.name))
        if matches:
            audio_file = matches[0]
            break
    
    if audio_file is None:
        logger.error("✗ No test audio files found in datasets directory.")
        logger.info("\nPlease provide a known REAL human voice audio file.")
        logger.info("Looking in:")
        for path in test_audio_paths:
            logger.info(f"  {path.parent}")
        sys.exit(1)
    
    logger.info(f"\n✓ Found test audio: {audio_file}")
    
    # Run trace
    tracer = InferencePipelineTracer()
    
    # Phase 2: Label semantics
    tracer.trace_label_semantics()
    
    # Phase 1: Full trace
    y, sr = tracer.trace_audio_loading(audio_file)
    quality = tracer.trace_vad_quality(y, sr)
    
    if not quality.get("is_sufficient", False):
        logger.error("✗ Audio insufficient for analysis")
        sys.exit(1)
    
    y_tensor = torch.from_numpy(y).float()
    features = tracer.trace_feature_extraction(y_tensor)
    model_outputs = tracer.trace_model_inference(features)
    consensus = tracer.trace_consensus(model_outputs)
    
    # Save report
    report_path = BASE_DIR / "DIAGNOSTIC_REPORT.json"
    with open(report_path, "w") as f:
        json.dump(tracer.generate_report(), f, indent=2, default=str)
    
    logger.info(f"\n✓ Report saved to: {report_path}")
    logger.info("\n" + "="*120)
    logger.info("DIAGNOSIS SUMMARY")
    logger.info("="*120)
    logger.info(f"Audio: {audio_file.name}")
    logger.info(f"Duration: {len(y) / sr:.2f}s")
    logger.info(f"Sample Rate: {sr} Hz")
    logger.info(f"\nFinal Risk Score: {consensus['risk_score']:.1f}%")
    logger.info(f"Classification: {consensus['classification']}")
    logger.info(f"Model Agreement: {consensus['model_agreement']:.2f}")
    logger.info("\n" + "="*120)


if __name__ == "__main__":
    main()
