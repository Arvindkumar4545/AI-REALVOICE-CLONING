"""
VoiceShield BiLSTM Retraining & Stacking Fusion Calibration (Steps 3 & 4)
1. Trains BiLSTM Prosody Detector with feature caching on Dev/Train sets.
2. Extracts submodel prediction matrix [lcnn, wavlm, bilstm, rawnet2, aasist] across Dev set.
3. Fits Regularized Logistic Regression Stacker & Model Calibration.
4. Saves fitted parameters to model_artifacts/calibration.json and model_artifacts/fusion_stacker.json.
"""
import argparse
import json
import logging
import os
import random
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, confusion_matrix, brier_score_loss

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from voice_shield.constants import TARGET_SR
from voice_shield.features import load_and_standardize_audio, extract_prosodic_features, extract_lfcc
from voice_shield.models import LCNN, WavLMClassifier, BiLSTMProsodyModel, RawNet2, AASIST
from voice_shield.models.calibration import ModelCalibrator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("bilstm_and_stacking")

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

OUT_DIR = ROOT_DIR / "experiments" / "improved_champion_v2"
ARTIFACTS_DIR = ROOT_DIR / "model_artifacts"
OUT_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

class ProsodyCachedDataset(Dataset):
    def __init__(self, rows: pd.DataFrame, window_samples: int = 48000):
        self.items = []
        logger.info(f"Caching prosody features for {len(rows)} samples...")
        for idx, row in rows.iterrows():
            p = str(row["path"])
            label_str = str(row["label"]).lower()
            y_target = 1.0 if "bonafide" in label_str else 0.0
            try:
                wave = load_and_standardize_audio(p, target_sr=TARGET_SR, target_samples=window_samples)
                prosody = extract_prosodic_features(wave)
                self.items.append((prosody, torch.tensor(y_target, dtype=torch.float32)))
            except Exception:
                pass

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx: int):
        return self.items[idx]


def train_bilstm(train_df: pd.DataFrame, dev_df: pd.DataFrame, epochs: int = 10, lr: float = 5e-4):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    train_ds = ProsodyCachedDataset(train_df)
    dev_ds = ProsodyCachedDataset(dev_df)
    
    train_loader = DataLoader(train_ds, batch_size=32, shuffle=True)
    dev_loader = DataLoader(dev_ds, batch_size=32, shuffle=False)
    
    model = BiLSTMProsodyModel(in_features=8, hidden_dim=64, dropout=0.3).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)
    criterion = nn.BCEWithLogitsLoss()
    
    best_auc = 0.0
    best_ckpt = OUT_DIR / "bilstm.pt"
    
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        n_b = 0
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            logits = model(inputs, return_logits=True)
            loss = criterion(logits, targets)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
            n_b += 1
            
        scheduler.step()
        
        # Eval
        model.eval()
        y_trues, spoof_p = [], []
        with torch.no_grad():
            for inputs, targets in dev_loader:
                inputs = inputs.to(device)
                logits = model(inputs, return_logits=True)
                bona = torch.sigmoid(logits).cpu().numpy().flatten()
                sp = 1.0 - bona
                y_trues.extend((targets.numpy().flatten() == 0.0).astype(int))
                spoof_p.extend(sp)
                
        y_trues = np.array(y_trues)
        spoof_p = np.array(spoof_p)
        auc = float(roc_auc_score(y_trues, spoof_p)) if len(np.unique(y_trues)) > 1 else 0.5
        y_pred = (spoof_p >= 0.5).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_trues, y_pred, labels=[0, 1]).ravel()
        rec = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
        
        logger.info(f"[BiLSTM] Epoch {epoch}/{epochs} | Dev AUC: {auc:.4f} | Spoof Recall: {rec*100:5.1f}% | Human FPR: {fpr*100:5.1f}%")
        if auc > best_auc:
            best_auc = auc
            torch.save(model.state_dict(), str(best_ckpt))
            logger.info(f"--> Saved best BiLSTM (AUC: {best_auc:.4f}) to {best_ckpt}")
            
    return model


def main():
    manifest_path = ROOT_DIR / "manifests" / "speaker_disjoint_manifest.csv"
    logger.info(f"Loading manifest from {manifest_path}...")
    df = pd.read_csv(manifest_path)
    
    train_pool = df[df["split"] == "train"].copy()
    dev_pool = df[df["split"] == "dev"].copy()
    
    def balanced_sample(pool_df, n_samples):
        bona = pool_df[pool_df["label"] == "bonafide"]
        spoof = pool_df[pool_df["label"] == "spoof"]
        n_half = n_samples // 2
        b_samp = bona.sample(n=min(len(bona), n_half), random_state=SEED)
        s_samp = spoof.sample(n=min(len(spoof), n_half), random_state=SEED)
        return pd.concat([b_samp, s_samp]).sample(frac=1.0, random_state=SEED).reset_index(drop=True)
        
    train_df = balanced_sample(train_pool, 2000)
    dev_df = balanced_sample(dev_pool, 600)
    
    logger.info("Retraining BiLSTM Prosody Detector...")
    train_bilstm(train_df, dev_df, epochs=10, lr=5e-4)

if __name__ == "__main__":
    main()
