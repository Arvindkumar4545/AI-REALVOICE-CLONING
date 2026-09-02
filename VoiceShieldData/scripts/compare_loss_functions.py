"""
Loss Function & Sampling Strategy Benchmark (Step 3)
Empirically compares:
1. Standard BCE Loss
2. Class-Weighted BCE Loss (pos_weight)
3. Focal Loss (gamma=2.0)
4. Balanced Mini-Batch Sampling (WeightedRandomSampler + BCE)

Measures and outputs the comparative table on the speaker-disjoint validation set.
"""
from __future__ import annotations

import json
import logging
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    roc_curve,
    confusion_matrix,
)

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from voice_shield.constants import LABEL_BONAFIDE, LABEL_SPOOF, TARGET_SR
from voice_shield.features import load_and_standardize_audio, extract_lfcc
from voice_shield.models import LCNN, FocalLoss

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("voiceshield.loss_comparison")


class FastAudioDataset(Dataset):
    def __init__(self, df: pd.DataFrame, cache_size: int = 1000):
        self.df = df.reset_index(drop=True)
        self.cache: Dict[int, Tuple[torch.Tensor, float]] = {}
        self.cache_size = cache_size

    def __len__(self) -> int:
        return len(self.df)

    def get_sample_weights(self) -> torch.Tensor:
        labels = [1 if "bona" in str(r["label"]).lower() else 0 for _, r in self.df.iterrows()]
        num_bonafide = max(1, sum(labels))
        num_spoof = max(1, len(labels) - num_bonafide)
        w_bona = 1.0 / num_bonafide
        w_spoof = 1.0 / num_spoof
        weights = [w_bona if l == 1 else w_spoof for l in labels]
        return torch.tensor(weights, dtype=torch.float32)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        if idx in self.cache:
            feat, target = self.cache[idx]
            return feat, torch.tensor(target, dtype=torch.float32)

        row = self.df.iloc[idx]
        target = LABEL_BONAFIDE if "bona" in str(row["label"]).lower() else LABEL_SPOOF
        raw_wave = load_and_standardize_audio(row["path"])
        feat = extract_lfcc(raw_wave)

        if len(self.cache) < self.cache_size:
            self.cache[idx] = (feat, target)

        return feat, torch.tensor(target, dtype=torch.float32)


def evaluate_model(model: nn.Module, val_loader: DataLoader, device: str) -> Dict[str, float]:
    model.eval()
    y_true = []
    y_scores = []
    with torch.no_grad():
        for x, y in val_loader:
            x = x.to(device)
            logits = model(x, return_logits=True)
            probs = torch.sigmoid(logits).cpu().numpy()
            y_scores.extend(probs)
            y_true.extend(y.numpy())

    y_true = np.array(y_true).astype(int)
    y_scores = np.array(y_scores)
    y_pred = (y_scores >= 0.50).astype(int)

    acc = float(accuracy_score(y_true, y_pred))
    bal_acc = float(balanced_accuracy_score(y_true, y_pred))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    
    try:
        auc = float(roc_auc_score(y_true, y_scores))
    except Exception:
        auc = 0.5

    try:
        fpr, tpr, _ = roc_curve(y_true, y_scores, pos_label=1)
        fnr = 1.0 - tpr
        eer_idx = np.nanargmin(np.abs(fpr - fnr))
        eer = float(fpr[eer_idx])
    except Exception:
        eer = 0.5

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
    fpr_rate = float(fp / max(1, fp + tn))  # False positive rate (bona-fide missed or spoof false alert)
    human_fpr = float(fn / max(1, fn + tp)) # Human false positive rate (Human predicted as spoof)

    return {
        "accuracy": round(acc, 4),
        "balanced_accuracy": round(bal_acc, 4),
        "f1": round(f1, 4),
        "roc_auc": round(auc, 4),
        "eer": round(eer, 4),
        "human_fpr": round(human_fpr, 4),
    }


def train_single_strategy(
    strategy_name: str,
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    loss_fn: nn.Module,
    use_sampler: bool = False,
    epochs: int = 3,
    device: str = "cpu",
) -> Dict[str, float]:
    logger.info(f"--- Training Strategy: {strategy_name} ---")
    train_ds = FastAudioDataset(train_df)
    val_ds = FastAudioDataset(val_df)

    if use_sampler:
        weights = train_ds.get_sample_weights()
        sampler = WeightedRandomSampler(weights, num_samples=len(weights), replacement=True)
        train_loader = DataLoader(train_ds, batch_size=32, sampler=sampler, num_workers=0)
    else:
        train_loader = DataLoader(train_ds, batch_size=32, shuffle=True, num_workers=0)

    val_loader = DataLoader(val_ds, batch_size=32, shuffle=False, num_workers=0)

    model = LCNN(in_channels=3, num_classes=1).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)

    for epoch in range(1, epochs + 1):
        model.train()
        for x, y in train_loader:
            x = x.to(device)
            y = y.to(device)
            optimizer.zero_grad()
            logits = model(x, return_logits=True)
            loss = loss_fn(logits, y)
            loss.backward()
            optimizer.step()

    metrics = evaluate_model(model, val_loader, device)
    logger.info(f"[{strategy_name}] Result -> Bal Acc: {metrics['balanced_accuracy']:.4f} | AUC: {metrics['roc_auc']:.4f} | EER: {metrics['eer']:.4f} | Human FPR: {metrics['human_fpr']:.4f}")
    return metrics


def main():
    manifest_path = ROOT_DIR / "manifests" / "speaker_disjoint_manifest.csv"
    if not manifest_path.exists():
        logger.error(f"Manifest not found: {manifest_path}")
        return

    df = pd.read_csv(manifest_path)
    train_df = df[df["split"] == "train"].sample(min(800, len(df[df["split"] == "train"])), random_state=42)
    val_df = df[df["split"] == "dev"].sample(min(400, len(df[df["split"] == "dev"])), random_state=42)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Executing loss function comparison on {device.upper()}...")

    results = {}
    # Strategy 1: Standard BCE
    results["Standard BCE"] = train_single_strategy(
        "Standard BCE", train_df, val_df, nn.BCEWithLogitsLoss(), use_sampler=False, epochs=3, device=device
    )

    # Strategy 2: Class-Weighted BCE
    results["Class-Weighted BCE"] = train_single_strategy(
        "Class-Weighted BCE", train_df, val_df, nn.BCEWithLogitsLoss(pos_weight=torch.tensor([2.5]).to(device)), use_sampler=False, epochs=3, device=device
    )

    # Strategy 3: Focal Loss (gamma=2.0)
    results["Focal Loss (gamma=2.0)"] = train_single_strategy(
        "Focal Loss (gamma=2.0)", train_df, val_df, FocalLoss(gamma=2.0, alpha=0.5), use_sampler=False, epochs=3, device=device
    )

    # Strategy 4: Balanced WeightedRandomSampler + BCE
    results["Balanced Sampler + Focal Loss"] = train_single_strategy(
        "Balanced Sampler + Focal Loss", train_df, val_df, nn.BCEWithLogitsLoss(pos_weight=torch.tensor([1.2]).to(device)), use_sampler=True, epochs=3, device=device
    )

    print("\n" + "=" * 85)
    print(f"{'STRATEGY':<35} | {'BAL ACC':<9} | {'ROC-AUC':<9} | {'EER':<9} | {'HUMAN FPR':<9}")
    print("=" * 85)
    for name, m in results.items():
        print(f"{name:<35} | {m['balanced_accuracy']:<9.4f} | {m['roc_auc']:<9.4f} | {m['eer']:<9.4f} | {m['human_fpr']:<9.4f}")
    print("=" * 85 + "\n")

    out_file = ROOT_DIR / "experiments" / "loss_comparison_results.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    main()
