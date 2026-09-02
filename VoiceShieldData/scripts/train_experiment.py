"""
VoiceShield Real Anti-Spoofing Model Improvement & Comparative Experiments
Executes:
- Experiment A: Class-Weighted BCEWithLogitsLoss
- Experiment B: Balanced Sampling (WeightedRandomSampler)
- Threshold Optimization (0.01 to 0.99)
- Metrics: Accuracy, Balanced Accuracy, Precision, Recall, F1, ROC-AUC, EER, FAR, FRR
- Plot generation: confusion_matrix.png, roc_curve.png, training_curve.png
- Robustness evaluation under telephony degradation
"""
from __future__ import annotations

import argparse
import io
import json
import math
import os
import random
import sys
import time
from pathlib import Path
from typing import Dict, Any, Tuple, List

BASE_DIR = Path(r"F:\VoiceShieldData")
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import torch
from torch import nn
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
from scipy.optimize import brentq
from scipy.interpolate import interp1d

from voice_shield.model import AudioSpoofNet, AudioSpoofNetV2
from voice_shield.preprocessing import extract_log_mel_spectrogram, apply_audio_augmentation, load_audio_safe

BASE_DIR = Path(r"F:\VoiceShieldData")
EXPERIMENTS_DIR = BASE_DIR / "experiments"
MANIFEST_PATH = BASE_DIR / "manifests" / "dataset_manifest.csv"

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)


# ==============================================================================
# DATASET IMPLEMENTATION WITH ON-DEMAND PREPROCESSING
# ==============================================================================

class BalancedAudioDataset(Dataset):
    """
    Lazy audio dataset with fast sample indexing, on-demand spectrogram extraction,
    and configurable acoustic augmentations.
    """
    def __init__(
        self,
        df: pd.DataFrame,
        augment: bool = False,
        telephony_mode: bool = False,
        max_samples: int | None = None,
    ):
        self.df = df.copy().reset_index(drop=True)
        if max_samples is not None and len(self.df) > max_samples:
            # Stratified subsampling to preserve class ratio
            bonafide_subset = self.df[self.df["label"] == "bonafide"]
            spoof_subset = self.df[self.df["label"] == "spoof"]
            
            n_bonafide = min(len(bonafide_subset), int(max_samples * (len(bonafide_subset) / len(self.df))))
            n_spoof = max_samples - n_bonafide
            
            sampled_b = bonafide_subset.sample(n=n_bonafide, random_state=SEED) if n_bonafide > 0 else bonafide_subset
            sampled_s = spoof_subset.sample(n=min(len(spoof_subset), n_spoof), random_state=SEED)
            self.df = pd.concat([sampled_b, sampled_s]).sample(frac=1.0, random_state=SEED).reset_index(drop=True)

        self.augment = augment
        self.telephony_mode = telephony_mode
        self.labels = [1.0 if r["label"] == "bonafide" else 0.0 for _, r in self.df.iterrows()]

    def __len__(self) -> int:
        return len(self.df)

    def get_sample_weights(self) -> torch.Tensor:
        """
        Computes inverse class frequency weights for WeightedRandomSampler.
        """
        labels = np.array(self.labels)
        class_counts = np.bincount(labels.astype(int))
        class_weights = 1.0 / np.maximum(class_counts, 1)
        sample_weights = class_weights[labels.astype(int)]
        return torch.DoubleTensor(sample_weights)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        row = self.df.iloc[idx]
        file_path = str(row["path"])
        label = self.labels[idx]

        try:
            tensor = extract_log_mel_spectrogram(
                file_path,
                augment=self.augment,
                telephony_mode=self.telephony_mode,
            )
        except Exception:
            tensor = torch.zeros(1, 40, 96, dtype=torch.float32)

        return tensor, torch.tensor(label, dtype=torch.float32)


# ==============================================================================
# METRICS & EQUAL ERROR RATE (EER) CALCULATION
# ==============================================================================

def compute_anti_spoofing_metrics(
    labels: np.ndarray,
    probs: np.ndarray,
    threshold: float = 0.5,
) -> Dict[str, Any]:
    """
    Computes all standard anti-spoofing evaluation metrics:
    - Accuracy, Balanced Accuracy, Precision, Recall, F1
    - ROC-AUC, EER, FAR, FRR, Confusion Matrix
    Scores (probs) represent the probability of bona fide (genuine).
    """
    labels = np.asarray(labels).astype(int)
    probs = np.asarray(probs).astype(float)
    preds = (probs >= threshold).astype(int)

    # 1. EER Computation
    fpr, tpr, thresholds = roc_curve(labels, probs, pos_label=1)
    fnr = 1.0 - tpr
    try:
        eer = float(brentq(lambda x: 1.0 - x - interp1d(fpr, tpr, fill_value="extrapolate")(x), 0.0, 1.0))
    except Exception:
        # Fallback to closest point if interpolation fails
        idx = np.nanargmin(np.abs(fnr - fpr))
        eer = float((fpr[idx] + fnr[idx]) / 2.0)

    eer_idx = np.nanargmin(np.abs(fnr - fpr))
    eer_threshold = float(thresholds[eer_idx])
    far_at_eer = float(fpr[eer_idx])
    frr_at_eer = float(fnr[eer_idx])

    # 2. Threshold Search for Optimal F1
    best_f1 = -1.0
    optimal_f1_threshold = 0.5
    for t in np.linspace(0.01, 0.99, 99):
        p = (probs >= t).astype(int)
        score = f1_score(labels, p, zero_division=0)
        if score > best_f1:
            best_f1 = score
            optimal_f1_threshold = float(t)

    # 3. Standard classification metrics at specified threshold
    acc = float(accuracy_score(labels, preds))
    bal_acc = float(balanced_accuracy_score(labels, preds))
    prec = float(precision_score(labels, preds, zero_division=0))
    rec = float(recall_score(labels, preds, zero_division=0))
    f1 = float(f1_score(labels, preds, zero_division=0))
    roc_auc = float(roc_auc_score(labels, probs)) if len(np.unique(labels)) > 1 else 0.5
    cm = confusion_matrix(labels, preds).tolist()

    # Counts
    pred_bonafide_count = int(np.sum(preds == 1))
    pred_spoof_count = int(np.sum(preds == 0))

    return {
        "accuracy": round(acc, 4),
        "balanced_accuracy": round(bal_acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "eer": round(eer, 4),
        "eer_threshold": round(eer_threshold, 4),
        "far_at_eer": round(far_at_eer, 4),
        "frr_at_eer": round(frr_at_eer, 4),
        "optimal_f1": round(float(best_f1), 4),
        "optimal_f1_threshold": round(optimal_f1_threshold, 4),
        "threshold_used": round(threshold, 4),
        "confusion_matrix": cm,
        "predicted_bonafide": pred_bonafide_count,
        "predicted_spoof": pred_spoof_count,
        "total_samples": len(labels),
        "fpr_curve": fpr.tolist(),
        "tpr_curve": tpr.tolist(),
    }


# ==============================================================================
# PLOTTING FUNCTIONS
# ==============================================================================

def generate_evaluation_plots(
    output_dir: Path,
    history: List[Dict[str, Any]],
    metrics: Dict[str, Any],
    labels: np.ndarray,
    probs: np.ndarray,
):
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Training Curve
    plt.figure(figsize=(10, 4))
    epochs = [h["epoch"] for h in history]
    train_losses = [h["train_loss"] for h in history]
    val_f1s = [h["val_f1"] for h in history]
    val_eerrs = [h["val_eer"] for h in history]

    plt.subplot(1, 2, 1)
    plt.plot(epochs, train_losses, "o-", color="#3B82F6", label="Train Loss (BCE)")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.title("Training Loss Convergence")
    plt.grid(True, alpha=0.3)
    plt.legend()

    plt.subplot(1, 2, 2)
    plt.plot(epochs, val_f1s, "o-", color="#10B981", label="Val F1 Score")
    plt.plot(epochs, val_eerrs, "s--", color="#EF4444", label="Val EER")
    plt.xlabel("Epoch")
    plt.ylabel("Metric Score")
    plt.title("Validation F1 & EER Trajectory")
    plt.grid(True, alpha=0.3)
    plt.legend()

    plt.tight_layout()
    plt.savefig(output_dir / "training_curve.png", dpi=150)
    plt.close()

    # 2. Confusion Matrix
    cm = np.array(metrics["confusion_matrix"])
    plt.figure(figsize=(5, 4))
    plt.imshow(cm, interpolation="nearest", cmap="Blues")
    plt.title(f"Confusion Matrix (Thresh={metrics['threshold_used']})")
    plt.colorbar()
    tick_marks = np.arange(2)
    plt.xticks(tick_marks, ["Spoof", "Bona-Fide"])
    plt.yticks(tick_marks, ["Spoof", "Bona-Fide"])

    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(j, i, str(cm[i, j]), horizontalalignment="center", color="white" if cm[i, j] > cm.max() / 2 else "black")

    plt.ylabel("True Label")
    plt.xlabel("Predicted Label")
    plt.tight_layout()
    plt.savefig(output_dir / "confusion_matrix.png", dpi=150)
    plt.close()

    # 3. ROC Curve
    fpr = np.array(metrics["fpr_curve"])
    tpr = np.array(metrics["tpr_curve"])
    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, color="#06B6D4", lw=2, label=f"ROC Curve (AUC = {metrics['roc_auc']:.4f})")
    plt.plot([0, 1], [0, 1], color="#64748B", linestyle="--", label="Random Classifier (AUC = 0.50)")
    plt.scatter([metrics["far_at_eer"]], [1.0 - metrics["frr_at_eer"]], color="#EF4444", zorder=5, label=f"EER Operating Point ({metrics['eer']*100:.1f}%)")
    plt.xlabel("False Positive Rate (Spoof classified as Bona-fide)")
    plt.ylabel("True Positive Rate (Bona-fide correctly classified)")
    plt.title("Receiver Operating Characteristic (ROC)")
    plt.grid(True, alpha=0.3)
    plt.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(output_dir / "roc_curve.png", dpi=150)
    plt.close()


# ==============================================================================
# MAIN TRAINING PIPELINE
# ==============================================================================

def run_experiment(
    experiment_name: str = "improved_v1",
    imbalance_strategy: str = "balanced_sampler",  # "weighted_loss" or "balanced_sampler"
    max_train_samples: int = 10000,
    max_dev_samples: int = 2000,
    epochs: int = 5,
    batch_size: int = 32,
    lr: float = 4e-4,
) -> Dict[str, Any]:
    print("\n" + "=" * 65)
    print(f"  VOICE SHIELD TRAINING EXPERIMENT: {experiment_name.upper()}  ")
    print(f"  Imbalance Strategy: {imbalance_strategy} | Epochs: {epochs} | Batch: {batch_size}")
    print("=" * 65)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Device] Compute target: {device}")

    # 1. Load Dataset Splits
    df = pd.read_csv(MANIFEST_PATH)
    train_df = df[df["split"] == "train"].reset_index(drop=True)
    dev_df = df[df["split"] == "dev"].reset_index(drop=True)
    eval_df = df[df["split"] == "eval"].reset_index(drop=True)

    print(f"[Data] Train rows: {len(train_df)} | Dev rows: {len(dev_df)} | Eval rows: {len(eval_df)}")

    # 2. Build Datasets
    train_dataset = BalancedAudioDataset(
        train_df,
        augment=True,
        max_samples=max_train_samples,
    )
    dev_dataset = BalancedAudioDataset(
        dev_df,
        augment=False,
        max_samples=max_dev_samples,
    )

    bonafide_in_train = sum(train_dataset.labels)
    spoof_in_train = len(train_dataset.labels) - bonafide_in_train
    print(f"[Train Distribution] Bona-fide: {int(bonafide_in_train)} | Spoof: {int(spoof_in_train)} (Ratio: 1 : {spoof_in_train/max(1, bonafide_in_train):.2f})")

    # 3. Setup DataLoader based on imbalance strategy
    if imbalance_strategy == "balanced_sampler":
        sampler = WeightedRandomSampler(
            weights=train_dataset.get_sample_weights(),
            num_samples=len(train_dataset),
            replacement=True,
        )
        train_loader = DataLoader(train_dataset, batch_size=batch_size, sampler=sampler)
        criterion = nn.BCEWithLogitsLoss()
    else:  # "weighted_loss"
        pos_weight_val = spoof_in_train / max(1.0, bonafide_in_train)
        pos_weight = torch.tensor([pos_weight_val], dtype=torch.float32, device=device)
        print(f"[Weighted Loss] BCEWithLogitsLoss pos_weight = {pos_weight_val:.4f}")
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

    dev_loader = DataLoader(dev_dataset, batch_size=batch_size * 2, shuffle=False)

    # 4. Initialize Model, Optimizer, Scheduler
    model = AudioSpoofNetV2().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)

    best_val_f1 = -1.0
    best_state = None
    training_history = []
    start_time = time.time()

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0

        for features, batch_labels in train_loader:
            features = features.to(device)
            batch_labels = batch_labels.to(device)

            optimizer.zero_grad()
            logits = model(features, return_logits=True)
            loss = criterion(logits, batch_labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * len(batch_labels)

        scheduler.step()
        epoch_loss = total_loss / len(train_dataset)

        # Validation Step
        model.eval()
        val_probs = []
        val_labels = []

        with torch.no_grad():
            for features, batch_labels in dev_loader:
                features = features.to(device)
                logits = model(features, return_logits=True)
                probs = torch.sigmoid(logits).cpu().numpy().tolist()
                val_probs.extend(probs)
                val_labels.extend(batch_labels.cpu().numpy().tolist())

        val_probs = np.array(val_probs)
        val_labels = np.array(val_labels).astype(int)

        epoch_metrics = compute_anti_spoofing_metrics(val_labels, val_probs, threshold=0.5)

        epoch_record = {
            "epoch": epoch,
            "train_loss": round(epoch_loss, 4),
            "val_accuracy": epoch_metrics["accuracy"],
            "val_balanced_accuracy": epoch_metrics["balanced_accuracy"],
            "val_precision": epoch_metrics["precision"],
            "val_recall": epoch_metrics["recall"],
            "val_f1": epoch_metrics["f1"],
            "val_roc_auc": epoch_metrics["roc_auc"],
            "val_eer": epoch_metrics["eer"],
            "optimal_f1": epoch_metrics["optimal_f1"],
            "optimal_threshold": epoch_metrics["optimal_f1_threshold"],
        }
        training_history.append(epoch_record)

        print(
            f"Epoch {epoch:02d}/{epochs:02d} | Train Loss: {epoch_loss:.4f} | "
            f"Val Acc: {epoch_metrics['accuracy']:.4f} | Bal Acc: {epoch_metrics['balanced_accuracy']:.4f} | "
            f"Prec: {epoch_metrics['precision']:.4f} | Rec: {epoch_metrics['recall']:.4f} | "
            f"F1: {epoch_metrics['f1']:.4f} (Opt F1: {epoch_metrics['optimal_f1']:.4f}) | "
            f"EER: {epoch_metrics['eer']:.4f} | AUC: {epoch_metrics['roc_auc']:.4f}"
        )

        # Early stopping / checkpoint saving based on validation F1
        if epoch_metrics["optimal_f1"] > best_val_f1:
            best_val_f1 = epoch_metrics["optimal_f1"]
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

    total_training_time = time.time() - start_time

    # Load best checkpoint
    if best_state is not None:
        model.load_state_dict(best_state)
    model.eval()

    # Final Comprehensive Evaluation on Dev split
    final_dev_probs = []
    final_dev_labels = []
    with torch.no_grad():
        for features, batch_labels in dev_loader:
            features = features.to(device)
            logits = model(features, return_logits=True)
            probs = torch.sigmoid(logits).cpu().numpy().tolist()
            final_dev_probs.extend(probs)
            final_dev_labels.extend(batch_labels.cpu().numpy().tolist())

    final_dev_probs = np.array(final_dev_probs)
    final_dev_labels = np.array(final_dev_labels).astype(int)

    final_metrics = compute_anti_spoofing_metrics(final_dev_labels, final_dev_probs, threshold=0.5)
    best_threshold = final_metrics["optimal_f1_threshold"]

    # Re-evaluate at best threshold
    optimal_metrics = compute_anti_spoofing_metrics(final_dev_labels, final_dev_probs, threshold=best_threshold)

    # Robustness Test under Telephony Degradation
    telephony_dev_dataset = BalancedAudioDataset(dev_df, augment=False, telephony_mode=True, max_samples=max_dev_samples)
    telephony_loader = DataLoader(telephony_dev_dataset, batch_size=batch_size * 2, shuffle=False)
    tel_probs = []
    with torch.no_grad():
        for features, _ in telephony_loader:
            features = features.to(device)
            logits = model(features, return_logits=True)
            probs = torch.sigmoid(logits).cpu().numpy().tolist()
            tel_probs.extend(probs)
    tel_metrics = compute_anti_spoofing_metrics(final_dev_labels, np.array(tel_probs), threshold=best_threshold)

    # Measure Warm Inference Latency
    test_tensor = torch.randn(1, 1, 40, 96).to(device)
    for _ in range(10):
        _ = model(test_tensor, return_logits=True)
    latencies = []
    for _ in range(50):
        t0 = time.perf_counter()
        _ = model(test_tensor, return_logits=True)
        latencies.append((time.perf_counter() - t0) * 1000.0)
    avg_latency_ms = round(float(np.mean(latencies)), 2)

    # Save Experiment Artifacts
    exp_dir = EXPERIMENTS_DIR / experiment_name
    exp_dir.mkdir(parents=True, exist_ok=True)

    torch.save(model.state_dict(), exp_dir / "model.pt")

    model_config = {
        "model_architecture": "AudioSpoofNetV2",
        "parameters_count": sum(p.numel() for p in model.parameters() if p.requires_grad),
        "input_shape": [1, 40, 96],
        "sample_rate": 16000,
        "imbalance_strategy": imbalance_strategy,
        "selected_f1_threshold": best_threshold,
        "eer_threshold": optimal_metrics["eer_threshold"],
        "warm_inference_latency_ms": avg_latency_ms,
    }
    with open(exp_dir / "config.json", "w", encoding="utf-8") as f:
        json.dump(model_config, f, indent=2)

    with open(exp_dir / "training_history.json", "w", encoding="utf-8") as f:
        json.dump(training_history, f, indent=2)

    # Predictions CSV
    pred_df = pd.DataFrame({
        "true_label": ["bonafide" if l == 1 else "spoof" for l in final_dev_labels],
        "bonafide_prob": final_dev_probs,
        "spoof_prob": 1.0 - final_dev_probs,
        "predicted_label": ["bonafide" if p >= best_threshold else "spoof" for p in final_dev_probs],
    })
    pred_df.to_csv(exp_dir / "predictions.csv", index=False)

    # Generate visual plots
    generate_evaluation_plots(exp_dir, training_history, optimal_metrics, final_dev_labels, final_dev_probs)

    # Clean metrics output
    metrics_summary = {
        "experiment_name": experiment_name,
        "imbalance_strategy": imbalance_strategy,
        "training_samples": len(train_dataset),
        "validation_samples": len(dev_dataset),
        "epochs": epochs,
        "total_training_time_seconds": round(total_training_time, 2),
        "inference_latency_ms": avg_latency_ms,
        "parameters_count": model_config["parameters_count"],
        "default_threshold_0.5": {
            "accuracy": final_metrics["accuracy"],
            "balanced_accuracy": final_metrics["balanced_accuracy"],
            "precision": final_metrics["precision"],
            "recall": final_metrics["recall"],
            "f1": final_metrics["f1"],
            "predicted_bonafide": final_metrics["predicted_bonafide"],
            "predicted_spoof": final_metrics["predicted_spoof"],
        },
        "optimal_threshold": {
            "threshold": best_threshold,
            "accuracy": optimal_metrics["accuracy"],
            "balanced_accuracy": optimal_metrics["balanced_accuracy"],
            "precision": optimal_metrics["precision"],
            "recall": optimal_metrics["recall"],
            "f1": optimal_metrics["f1"],
            "roc_auc": optimal_metrics["roc_auc"],
            "eer": optimal_metrics["eer"],
            "far_at_eer": optimal_metrics["far_at_eer"],
            "frr_at_eer": optimal_metrics["frr_at_eer"],
            "confusion_matrix": optimal_metrics["confusion_matrix"],
            "predicted_bonafide": optimal_metrics["predicted_bonafide"],
            "predicted_spoof": optimal_metrics["predicted_spoof"],
        },
        "robustness_telephony_evaluation": {
            "clean_eer": optimal_metrics["eer"],
            "telephony_eer": tel_metrics["eer"],
            "generalization_gap_eer": round(tel_metrics["eer"] - optimal_metrics["eer"], 4),
            "telephony_f1": tel_metrics["f1"],
        },
    }

    with open(exp_dir / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics_summary, f, indent=2)

    return metrics_summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--experiment", type=str, default="improved_v1")
    parser.add_argument("--strategy", type=str, default="balanced_sampler")
    parser.add_argument("--max-train", type=int, default=3000)
    parser.add_argument("--max-dev", type=int, default=800)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=32)
    args = parser.parse_args()

    run_experiment(
        experiment_name=args.experiment,
        imbalance_strategy=args.strategy,
        max_train_samples=args.max_train,
        max_dev_samples=args.max_dev,
        epochs=args.epochs,
        batch_size=args.batch_size,
    )
