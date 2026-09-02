"""
VoiceShield Step 3 & 4: Fit Multi-Model Stacking Fusion & Empirical Calibration
Runs on the 400-sample dev set using the newly trained champion checkpoints.
Calculates optimal linear stacking weights, temperature scalar, and Platt coefficients.
Saves model_artifacts/calibration.json.
"""
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Dict, Any, List

import numpy as np
import pandas as pd
import torch
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, confusion_matrix, brier_score_loss

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from voice_shield.constants import TARGET_SR
from voice_shield.features import load_and_standardize_audio, extract_lfcc, extract_prosodic_features
from voice_shield.models import LCNN, WavLMClassifier, BiLSTMProsodyModel, RawNet2, AASIST
from voice_shield.models.calibration import ModelCalibrator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("fit_calibration")

CHAMPION_DIR = ROOT_DIR / "experiments" / "improved_champion_v2"
LEGACY_DIR = ROOT_DIR / "experiments" / "improved_model"
ARTIFACTS_DIR = ROOT_DIR / "model_artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")
    
    # 1. Load Champion Models
    lcnn = LCNN(in_channels=3, num_classes=1).to(device)
    lcnn_ckpt = CHAMPION_DIR / "lcnn.pt" if (CHAMPION_DIR / "lcnn.pt").exists() else LEGACY_DIR / "model.pt"
    lcnn.load_state_dict(torch.load(str(lcnn_ckpt), map_location=device))
    lcnn.eval()
    logger.info(f"Loaded LCNN from {lcnn_ckpt}")

    wavlm = WavLMClassifier(feat_dim=128, num_layers=2, num_heads=4).to(device)
    wavlm_ckpt = CHAMPION_DIR / "wavlm.pt" if (CHAMPION_DIR / "wavlm.pt").exists() else LEGACY_DIR / "wavlm.pt"
    wavlm.load_state_dict(torch.load(str(wavlm_ckpt), map_location=device))
    wavlm.eval()
    logger.info(f"Loaded WavLM from {wavlm_ckpt}")

    bilstm = BiLSTMProsodyModel(in_features=8, hidden_dim=64).to(device)
    bilstm_ckpt = CHAMPION_DIR / "bilstm.pt" if (CHAMPION_DIR / "bilstm.pt").exists() else LEGACY_DIR / "bilstm.pt"
    bilstm.load_state_dict(torch.load(str(bilstm_ckpt), map_location=device))
    bilstm.eval()
    logger.info(f"Loaded BiLSTM from {bilstm_ckpt}")

    rawnet2 = RawNet2().to(device)
    rawnet_ckpt = ROOT_DIR / "experiments" / "rawnet2" / "model.pt"
    rawnet2.load_state_dict(torch.load(str(rawnet_ckpt), map_location=device))
    rawnet2.eval()

    aasist = AASIST().to(device)
    aasist_ckpt = ROOT_DIR / "experiments" / "aasist" / "model.pt"
    aasist.load_state_dict(torch.load(str(aasist_ckpt), map_location=device))
    aasist.eval()

    # 2. Evaluate on 400-sample Dev Benchmark
    dev_csv = ROOT_DIR / "evaluation" / "real_world_benchmark" / "benchmark_dev.csv"
    logger.info(f"Reading dev set from {dev_csv}...")
    df = pd.read_csv(dev_csv)

    feature_matrix = []  # [lcnn_p, wavlm_p, bilstm_p, rawnet2_p, aasist_p]
    y_trues = []  # 1 for spoof, 0 for bonafide

    t0 = time.time()
    logger.info(f"Extracting submodel predictions for {len(df)} dev samples...")
    with torch.no_grad():
        for idx, row in df.iterrows():
            p = str(row["path"])
            label = str(row["label"]).lower()
            is_spoof = 1 if "spoof" in label else 0

            try:
                wave = load_and_standardize_audio(p, target_sr=TARGET_SR, target_samples=48000)
                # LCNN
                lfcc = extract_lfcc(wave).unsqueeze(0).to(device)
                lcnn_bona_p = float(torch.sigmoid(lcnn(lfcc, return_logits=True)).item())
                lcnn_sp = 1.0 - lcnn_bona_p

                # WavLM
                wave_in = wave.unsqueeze(0).to(device)
                wavlm_bona_p = float(torch.sigmoid(wavlm(wave_in, return_logits=True)).item())
                wavlm_sp = 1.0 - wavlm_bona_p

                # BiLSTM
                prosody = extract_prosodic_features(wave).unsqueeze(0).to(device)
                bilstm_bona_p = float(torch.sigmoid(bilstm(prosody, return_logits=True)).item())
                bilstm_sp = 1.0 - bilstm_bona_p

                # RawNet2
                rawnet_bona_p = float(torch.sigmoid(rawnet2(wave_in, return_logits=True)).item())
                rawnet_sp = 1.0 - rawnet_bona_p

                # AASIST
                aasist_bona_p = float(torch.sigmoid(aasist(wave_in, return_logits=True)).item())
                aasist_sp = 1.0 - aasist_bona_p

                feature_matrix.append([lcnn_sp, wavlm_sp, bilstm_sp, rawnet_sp, aasist_sp])
                y_trues.append(is_spoof)
            except Exception as e:
                pass

    logger.info(f"Extracted features for {len(feature_matrix)} samples in {time.time()-t0:.1f}s.")
    X = np.array(feature_matrix)
    y = np.array(y_trues)

    # 3. Individual Submodel AUCs on Dev Benchmark
    models = ["lcnn", "wavlm", "bilstm", "rawnet2", "aasist"]
    for i, name in enumerate(models):
        auc = roc_auc_score(y, X[:, i])
        brier = brier_score_loss(y, X[:, i])
        logger.info(f"Submodel [{name.upper():7s}] Benchmark Dev AUC: {auc:.4f} | Brier: {brier:.4f}")

    # 4. Fit Non-Negative / Regularized Stacking Logistic Regression
    clf = LogisticRegression(C=1.0, penalty="l2", solver="lbfgs")
    clf.fit(X, y)

    coefs = clf.coef_[0]
    intercept = float(clf.intercept_[0])
    logger.info(f"Fitted Logistic Regression Weights: {dict(zip(models, np.round(coefs, 4)))} | Intercept: {intercept:.4f}")

    # Normalize positive weights for normalized convex ensemble
    pos_weights = np.maximum(0.0, coefs)
    if np.sum(pos_weights) > 0:
        norm_weights = pos_weights / np.sum(pos_weights)
    else:
        norm_weights = np.array([0.50, 0.25, 0.25, 0.0, 0.0])

    weight_dict = {m: float(round(w, 4)) for m, w in zip(models, norm_weights)}
    logger.info(f"Normalized Ensemble Weights: {weight_dict}")

    # Compute raw fused probability
    fused_raw_p = np.dot(X, norm_weights)
    fused_auc = roc_auc_score(y, fused_raw_p)
    logger.info(f"Fused Weighted Raw Probability Dev AUC: {fused_auc:.4f}")

    # 5. Fit Probability Calibration (Platt & Temperature)
    # Logits from raw fused probability
    fused_logits = np.log(np.clip(fused_raw_p, 1e-4, 1.0 - 1e-4) / (1.0 - np.clip(fused_raw_p, 1e-4, 1.0 - 1e-4)))
    calibrator = ModelCalibrator()
    calib_res = calibrator.fit(fused_logits, y)
    logger.info(f"Calibration Results: {calib_res}")

    # Calibrated probabilities
    calibrated_p = np.array([calibrator.predict_probability(logit) for logit in fused_logits])
    calib_auc = roc_auc_score(y, calibrated_p)
    calib_brier = brier_score_loss(y, calibrated_p)
    logger.info(f"Calibrated Ensemble Dev AUC: {calib_auc:.4f} | Brier: {calib_brier:.4f}")

    # 6. Save calibration artifact
    calibration_config = {
        "threshold": 0.50,
        "threshold_lower": 0.35,
        "threshold_upper": 0.65,
        "method": calib_res["best_calibration_method"],
        "temperature": round(calib_res["temperature_scalar"], 4),
        "platt_intercept": round(float(calibrator.platt_model.intercept_[0]), 4) if calibrator.platt_model else 0.0,
        "platt_coef": round(float(calibrator.platt_model.coef_[0][0]), 4) if calibrator.platt_model else 1.0,
        "brier_score_raw": round(calib_res["brier_score_raw"], 4),
        "brier_score_calibrated": round(calib_res["brier_score_calibrated"], 4),
        "ensemble_weights": weight_dict,
        "logistic_stacker": {
            "intercept": round(intercept, 4),
            "coefs": {m: round(float(c), 4) for m, c in zip(models, coefs)},
        },
        "risk_tiers": {
            "bonafide": [0.0, 35.0],
            "uncertain": [35.0, 65.0],
            "spoof": [65.0, 100.0],
        },
    }

    calib_path = ARTIFACTS_DIR / "calibration.json"
    with open(calib_path, "w", encoding="utf-8") as f:
        json.dump(calibration_config, f, indent=2)
    logger.info(f"Successfully saved {calib_path}!")

if __name__ == "__main__":
    main()
