"""
VoiceShield Champion Scaled Retraining Pipeline (Optimized with Feature Caching)
Trains high-performance, calibrated anti-spoofing detectors on speaker-disjoint data:
1. LCNN (LFCC 3-Channel)
2. WavLM / 1D Conv + Contextual Attention
3. BiLSTM Prosody Model
Saves versioned models to experiments/improved_champion_v2/
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
from sklearn.metrics import roc_auc_score, confusion_matrix

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from voice_shield.constants import TARGET_SR
from voice_shield.features import load_and_standardize_audio, extract_lfcc, extract_prosodic_features
from voice_shield.models import LCNN, WavLMClassifier, BiLSTMProsodyModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_champion")

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

OUT_DIR = ROOT_DIR / "experiments" / "improved_champion_v2"
OUT_DIR.mkdir(parents=True, exist_ok=True)


class FastCachedDataset(Dataset):
    """Preloads and caches features in RAM for ultra-fast training."""
    def __init__(self, rows: pd.DataFrame, model_type: str, is_train: bool = True, window_samples: int = 48000):
        self.items = []
        logger.info(f"Loading and caching {len(rows)} samples for {model_type.upper()} ({'Train' if is_train else 'Dev'})...")
        
        t0 = time.time()
        for idx, row in rows.iterrows():
            p = str(row["path"])
            label_str = str(row["label"]).lower()
            # 1.0 = Bonafide, 0.0 = Spoof
            y_target = 1.0 if "bonafide" in label_str else 0.0
            
            try:
                wave = load_and_standardize_audio(p, target_sr=TARGET_SR, target_samples=window_samples)
                if model_type == "lcnn":
                    feat = extract_lfcc(wave)  # [3, 20, T]
                elif model_type == "wavlm":
                    feat = wave  # [48000]
                elif model_type == "bilstm":
                    feat = extract_prosodic_features(wave)  # [T, 8]
                else:
                    feat = wave
                    
                self.items.append((feat, torch.tensor(y_target, dtype=torch.float32)))
            except Exception as e:
                pass
                
        elapsed = time.time() - t0
        logger.info(f"Cached {len(self.items)} samples in {elapsed:.1f}s.")

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx: int):
        feat, target = self.items[idx]
        return feat, target


def train_single_model(model_type: str, train_df: pd.DataFrame, dev_df: pd.DataFrame, epochs: int, lr: float, batch_size: int, device: torch.device):
    logger.info(f"\n=======================================================")
    logger.info(f"TRAINING {model_type.upper()} DETECTOR (Epochs: {epochs}, LR: {lr})")
    logger.info(f"=======================================================")
    
    train_ds = FastCachedDataset(train_df, model_type=model_type, is_train=True)
    dev_ds = FastCachedDataset(dev_df, model_type=model_type, is_train=False)
    
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    dev_loader = DataLoader(dev_ds, batch_size=batch_size, shuffle=False)
    
    if model_type == "lcnn":
        model = LCNN(in_channels=3, num_classes=1, dropout=0.3).to(device)
    elif model_type == "wavlm":
        model = WavLMClassifier(feat_dim=128, num_layers=2, num_heads=4).to(device)
    elif model_type == "bilstm":
        model = BiLSTMProsodyModel(in_features=8, hidden_dim=64, dropout=0.3).to(device)
    else:
        raise ValueError(f"Unknown model type: {model_type}")
        
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)
    criterion = nn.BCEWithLogitsLoss()
    
    best_val_auc = 0.0
    best_val_metrics = {}
    best_ckpt_path = OUT_DIR / f"{model_type}.pt"
    
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        n_batches = 0
        
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            logits = model(inputs, return_logits=True)
            loss = criterion(logits, targets)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=2.0)
            optimizer.step()
            train_loss += loss.item()
            n_batches += 1
            
        scheduler.step()
        avg_train_loss = train_loss / max(1, n_batches)
        
        # Validation
        model.eval()
        y_trues, spoof_probs = [], []
        with torch.no_grad():
            for inputs, targets in dev_loader:
                inputs = inputs.to(device)
                logits = model(inputs, return_logits=True)
                bona_p = torch.sigmoid(logits).cpu().numpy().flatten()
                spoof_p = 1.0 - bona_p
                y_spoof_true = (targets.numpy().flatten() == 0.0).astype(int)
                
                y_trues.extend(y_spoof_true)
                spoof_probs.extend(spoof_p)
                
        y_trues = np.array(y_trues)
        spoof_probs = np.array(spoof_probs)
        
        auc = float(roc_auc_score(y_trues, spoof_probs)) if len(np.unique(y_trues)) > 1 else 0.5
        y_pred = (spoof_probs >= 0.5).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_trues, y_pred, labels=[0, 1]).ravel()
        
        spoof_recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        human_fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
        prec = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        f1 = float(2 * prec * spoof_recall / (prec + spoof_recall)) if (prec + spoof_recall) > 0 else 0.0
        
        logger.info(
            f"[{model_type.upper()}] Epoch {epoch}/{epochs} | "
            f"Loss: {avg_train_loss:.4f} | "
            f"Dev AUC: {auc:.4f} | "
            f"Spoof Recall: {spoof_recall*100:5.1f}% | "
            f"Human FPR: {human_fpr*100:5.1f}% | "
            f"F1: {f1:.4f}"
        )
        
        if auc > best_val_auc:
            best_val_auc = auc
            best_val_metrics = {
                "epoch": epoch,
                "auc": auc,
                "spoof_recall": spoof_recall,
                "human_fpr": human_fpr,
                "f1": f1,
            }
            torch.save(model.state_dict(), str(best_ckpt_path))
            logger.info(f"--> Saved best checkpoint to {best_ckpt_path} (AUC: {best_val_auc:.4f})")
            
    logger.info(f"Best {model_type.upper()} validation metrics: {best_val_metrics}")
    return best_val_metrics


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--n-train", type=int, default=4000)
    parser.add_argument("--n-dev", type=int, default=800)
    args = parser.parse_args()
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using compute device: {device}")
    
    manifest_path = ROOT_DIR / "manifests" / "speaker_disjoint_manifest.csv"
    logger.info(f"Loading manifest from {manifest_path}...")
    df = pd.read_csv(manifest_path)
    
    train_pool = df[df["split"] == "train"].copy()
    dev_pool = df[df["split"] == "dev"].copy()
    
    # Balanced train split (equal bonafide and spoof across sources)
    def balanced_sample(pool_df, n_samples):
        bona = pool_df[pool_df["label"] == "bonafide"]
        spoof = pool_df[pool_df["label"] == "spoof"]
        n_half = n_samples // 2
        b_samp = bona.sample(n=min(len(bona), n_half), random_state=SEED)
        s_samp = spoof.sample(n=min(len(spoof), n_half), random_state=SEED)
        return pd.concat([b_samp, s_samp]).sample(frac=1.0, random_state=SEED).reset_index(drop=True)
        
    train_df = balanced_sample(train_pool, args.n_train)
    dev_df = balanced_sample(dev_pool, args.n_dev)
    
    logger.info(f"Training Pool: {len(train_df)} samples | Dev Pool: {len(dev_df)} samples")
    
    results = {}
    
    # 1. Train LCNN (LFCC)
    lcnn_metrics = train_single_model("lcnn", train_df, dev_df, epochs=args.epochs, lr=2e-4, batch_size=args.batch_size, device=device)
    results["lcnn"] = lcnn_metrics
    
    # 2. Train WavLM (Waveform)
    wavlm_metrics = train_single_model("wavlm", train_df, dev_df, epochs=args.epochs, lr=3e-4, batch_size=args.batch_size, device=device)
    results["wavlm"] = wavlm_metrics
    
    # 3. Train BiLSTM (Prosody)
    bilstm_metrics = train_single_model("bilstm", train_df, dev_df, epochs=args.epochs, lr=4e-4, batch_size=args.batch_size, device=device)
    results["bilstm"] = bilstm_metrics
    
    summary_path = OUT_DIR / "training_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    logger.info(f"Retraining complete! Summary saved to {summary_path}")

if __name__ == "__main__":
    main()
