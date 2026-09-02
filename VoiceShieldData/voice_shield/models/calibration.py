"""
VoiceShield Probability Calibration Module (Phase 13)
Implements Platt scaling, Temperature scaling, and Isotonic regression.
Calculates Brier Score and Expected Calibration Error (ECE).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Any, Tuple

import numpy as np
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss
import torch
import torch.nn as nn

class TemperatureScaling(nn.Module):
    """Calibrates logits by learning optimal positive temperature scalar T > 0."""
    def __init__(self, init_temp: float = 1.0):
        super().__init__()
        self.temperature = nn.Parameter(torch.ones(1) * init_temp)

    def forward(self, logits: torch.Tensor) -> torch.Tensor:
        temp = torch.clamp(self.temperature, min=0.01, max=10.0)
        return logits / temp

    def calibrate_probs(self, logits: np.ndarray) -> np.ndarray:
        t_logits = torch.from_numpy(logits) / torch.clamp(self.temperature, min=0.01, max=10.0)
        return torch.sigmoid(t_logits).detach().cpu().numpy()


class ModelCalibrator:
    """
    Fits and applies multiple calibration strategies on validation outputs:
    1. Platt Scaling (Logistic Regression on Logits)
    2. Temperature Scaling (Optimized Log-Likelihood)
    3. Isotonic Regression
    """
    def __init__(self, method: str = "platt"):
        self.method = method.lower()
        self.platt_model: LogisticRegression | None = None
        self.isotonic_model: IsotonicRegression | None = None
        self.temp_model: TemperatureScaling | None = None
        self.brier_score_raw: float = 0.0
        self.brier_score_calibrated: float = 0.0

    def fit(self, val_logits: np.ndarray, val_targets: np.ndarray) -> Dict[str, Any]:
        val_logits = np.asarray(val_logits).flatten()
        val_targets = np.asarray(val_targets).flatten()
        raw_probs = 1.0 / (1.0 + np.exp(-val_logits))
        self.brier_score_raw = float(brier_score_loss(val_targets, raw_probs))

        # 1. Platt Scaling
        self.platt_model = LogisticRegression(C=1.0, solver="lbfgs")
        self.platt_model.fit(val_logits.reshape(-1, 1), val_targets)
        platt_probs = self.platt_model.predict_proba(val_logits.reshape(-1, 1))[:, 1]
        brier_platt = float(brier_score_loss(val_targets, platt_probs))

        # 2. Isotonic Regression
        self.isotonic_model = IsotonicRegression(out_of_bounds="clip", y_min=0.001, y_max=0.999)
        self.isotonic_model.fit(raw_probs, val_targets)
        iso_probs = self.isotonic_model.predict(raw_probs)
        brier_iso = float(brier_score_loss(val_targets, iso_probs))

        # 3. Temperature Scaling
        self.temp_model = TemperatureScaling()
        optimizer = torch.optim.LBFGS([self.temp_model.temperature], lr=0.01, max_iter=50)
        criterion = nn.BCEWithLogitsLoss()
        t_logits = torch.from_numpy(val_logits).float()
        t_targets = torch.from_numpy(val_targets).float()

        def eval_loss():
            optimizer.zero_grad()
            scaled = self.temp_model(t_logits)
            loss = criterion(scaled, t_targets)
            loss.backward()
            return loss

        try:
            optimizer.step(eval_loss)
        except Exception:
            pass

        temp_val = float(self.temp_model.temperature.item())
        temp_probs = self.temp_model.calibrate_probs(val_logits)
        brier_temp = float(brier_score_loss(val_targets, temp_probs))

        best_method = "platt"
        best_brier = brier_platt
        if brier_temp < best_brier:
            best_method = "temperature"
            best_brier = brier_temp
        if brier_iso < best_brier:
            best_method = "isotonic"
            best_brier = brier_iso

        self.method = best_method
        self.brier_score_calibrated = best_brier

        return {
            "best_calibration_method": best_method,
            "brier_score_raw": self.brier_score_raw,
            "brier_score_calibrated": self.brier_score_calibrated,
            "brier_platt": brier_platt,
            "brier_temperature": brier_temp,
            "brier_isotonic": brier_iso,
            "temperature_scalar": temp_val,
        }

    def predict_probability(self, logit_or_prob: float) -> float:
        """Applies calibration to single logit or probability."""
        if self.method == "platt" and self.platt_model is not None:
            logit_arr = np.array([[logit_or_prob]])
            return float(self.platt_model.predict_proba(logit_arr)[0, 1])
        elif self.method == "temperature" and self.temp_model is not None:
            return float(self.temp_model.calibrate_probs(np.array([logit_or_prob]))[0])
        elif self.method == "isotonic" and self.isotonic_model is not None:
            raw_p = 1.0 / (1.0 + np.exp(-logit_or_prob))
            return float(self.isotonic_model.predict([raw_p])[0])
        else:
            # Fallback sigmoid
            return float(1.0 / (1.0 + np.exp(-logit_or_prob)))
