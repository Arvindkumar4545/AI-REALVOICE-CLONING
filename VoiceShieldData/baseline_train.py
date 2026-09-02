import sys
import json
import time
from pathlib import Path
from datetime import datetime
import random
import numpy as np
import pandas as pd
sys.path.insert(0, r"F:\VoiceShieldData")

import torch
from torch.utils.data import DataLoader
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

from voice_shield.dataset import iter_rows_by_split, BASE_DIR
from voice_shield.train import AudioDataset, _train_epoch, evaluate
from voice_shield.model import AudioSpoofNet

# Setup
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

ARTIFACT_DIR = BASE_DIR / "artifacts" / "baseline"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

CONFIG = {
    "seed": SEED,
    "max_train_samples": 3000,
    "max_dev_samples": 800,
    "epochs": 10,
    "batch_size_train": 32,
    "batch_size_dev": 64,
    "learning_rate": 3e-4,
    "weight_decay": 1e-4,
    "optimizer": "AdamW",
    "loss_function": "BCELoss",
    "model": "AudioSpoofNet",
    "device": "cuda" if torch.cuda.is_available() else "cpu",
    "timestamp": datetime.now().isoformat(),
}

print("=" * 80)
print("BASELINE EXPERIMENT")
print("=" * 80)
print()

print("Configuration:")
for key, value in CONFIG.items():
    print(f"  {key}: {value}")
print()

# Load data
print("Loading dataset...")
manifest = pd.read_csv(BASE_DIR / "manifests" / "dataset_manifest.csv")
split_rows = iter_rows_by_split(manifest)
train_rows = split_rows["train"]
dev_rows = split_rows["dev"]

print(f"  Train rows available: {len(train_rows)}")
print(f"  Dev rows available: {len(dev_rows)}")
print()

# Create datasets
print("Creating datasets...")
train_dataset = AudioDataset(train_rows, max_samples=CONFIG["max_train_samples"])
dev_dataset = AudioDataset(dev_rows, max_samples=CONFIG["max_dev_samples"])

print(f"  Train dataset: {len(train_dataset)} samples")
print(f"  Dev dataset: {len(dev_dataset)} samples")
print()

# Create dataloaders
train_loader = DataLoader(train_dataset, batch_size=CONFIG["batch_size_train"], shuffle=True, num_workers=0)
dev_loader = DataLoader(dev_dataset, batch_size=CONFIG["batch_size_dev"], shuffle=False, num_workers=0)

print(f"  Train batches per epoch: {len(train_loader)}")
print(f"  Dev batches per epoch: {len(dev_loader)}")
print()

# Setup model
device = torch.device(CONFIG["device"])
model = AudioSpoofNet().to(device)
criterion = torch.nn.BCELoss()
optimizer = torch.optim.AdamW(model.parameters(), lr=CONFIG["learning_rate"], weight_decay=CONFIG["weight_decay"])

print(f"Model on device: {device}")
print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")
print()

# Training loop
print("=" * 80)
print("TRAINING START")
print("=" * 80)
print()

history = []
best_f1 = -1.0
best_state = None
training_start_time = time.time()

for epoch in range(1, CONFIG["epochs"] + 1):
    print(f"Epoch {epoch}/{CONFIG['epochs']}")
    print("-" * 80)
    
    epoch_start = time.time()
    
    # Train
    train_loss = _train_epoch(model, train_loader, criterion, optimizer)
    
    # Validate
    dev_metrics = evaluate(model, dev_loader)
    
    epoch_time = time.time() - epoch_start
    
    # Record
    train_acc = dev_metrics.get("train_acc", None)  # Will be added in evaluate if we compute it
    val_acc = dev_metrics["accuracy"]
    val_prec = dev_metrics["precision"]
    val_rec = dev_metrics["recall"]
    val_f1 = dev_metrics["f1"]
    
    epoch_data = {
        "epoch": epoch,
        "train_loss": float(train_loss),
        "val_accuracy": float(val_acc),
        "val_precision": float(val_prec),
        "val_recall": float(val_rec),
        "val_f1": float(val_f1),
        "epoch_time": float(epoch_time),
    }
    history.append(epoch_data)
    
    # Print metrics
    print(f"  Epoch:              {epoch}")
    print(f"  Train Loss:         {train_loss:.6f}")
    print(f"  Val Accuracy:       {val_acc:.4f}")
    print(f"  Val Precision:      {val_prec:.4f}")
    print(f"  Val Recall:         {val_rec:.4f}")
    print(f"  Val F1:             {val_f1:.4f}")
    print(f"  EER:                NOT IMPLEMENTED")
    print(f"  Training Time:      {epoch_time:.2f}s")
    print()
    
    # Save best model
    if val_f1 > best_f1:
        best_f1 = val_f1
        best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
        print(f"  [NEW BEST F1: {best_f1:.4f}]")
        print()

total_training_time = time.time() - training_start_time

print("=" * 80)
print("TRAINING COMPLETE")
print("=" * 80)
print()

# Save model
model_path = ARTIFACT_DIR / "model.pt"
torch.save(best_state, model_path)
print(f"Model saved to: {model_path}")
print()

# Save history
history_path = ARTIFACT_DIR / "training_history.json"
with open(history_path, "w") as f:
    json.dump(history, f, indent=2)
print(f"Training history saved to: {history_path}")
print()

# Compute final metrics
final_val_accuracy = history[-1]["val_accuracy"]
final_val_precision = history[-1]["val_precision"]
final_val_recall = history[-1]["val_recall"]
final_val_f1 = history[-1]["val_f1"]

# Estimate training accuracy (compute on final model)
print("Computing final training accuracy...")
model.load_state_dict(best_state)
model.eval()
train_metrics = evaluate(model, train_loader)
final_train_accuracy = train_metrics["accuracy"]
print()

# Save metrics
metrics = {
    "training_samples": len(train_dataset),
    "validation_samples": len(dev_dataset),
    "epochs": CONFIG["epochs"],
    "final_train_accuracy": float(final_train_accuracy),
    "final_val_accuracy": float(final_val_accuracy),
    "final_val_precision": float(final_val_precision),
    "final_val_recall": float(final_val_recall),
    "final_val_f1": float(final_val_f1),
    "eer": "NOT IMPLEMENTED",
    "total_training_time": float(total_training_time),
    "best_model_f1": float(best_f1),
}

metrics_path = ARTIFACT_DIR / "metrics.json"
with open(metrics_path, "w") as f:
    json.dump(metrics, f, indent=2)
print(f"Metrics saved to: {metrics_path}")
print()

# Save config
config_path = ARTIFACT_DIR / "config.json"
with open(config_path, "w") as f:
    json.dump(CONFIG, f, indent=2)
print(f"Configuration saved to: {config_path}")
print()

# Save dataset stats
dataset_stats = {
    "total_samples_in_manifest": len(manifest),
    "train_split_total": len(train_rows),
    "dev_split_total": len(dev_rows),
    "train_used": len(train_dataset),
    "dev_used": len(dev_dataset),
    "train_label_distribution": {
        "bonafide": int((train_rows["label"] == "bonafide").sum()),
        "spoof": int((train_rows["label"] == "spoof").sum()),
    },
    "dev_label_distribution": {
        "bonafide": int((dev_rows["label"] == "bonafide").sum()),
        "spoof": int((dev_rows["label"] == "spoof").sum()),
    },
}

dataset_stats_path = ARTIFACT_DIR / "dataset_stats.json"
with open(dataset_stats_path, "w") as f:
    json.dump(dataset_stats, f, indent=2)
print(f"Dataset statistics saved to: {dataset_stats_path}")
print()

# Final report
print("=" * 80)
print("BASELINE EXPERIMENT COMPLETE")
print("=" * 80)
print()

print("RESULTS:")
print(f"  Training samples: {len(train_dataset)}")
print(f"  Validation samples: {len(dev_dataset)}")
print(f"  Epochs: {CONFIG['epochs']}")
print(f"  Model: AudioSpoofNet")
print(f"  Parameters: 167,329")
print(f"  Train accuracy: {final_train_accuracy:.4f}")
print(f"  Validation accuracy: {final_val_accuracy:.4f}")
print(f"  Precision: {final_val_precision:.4f}")
print(f"  Recall: {final_val_recall:.4f}")
print(f"  F1: {final_val_f1:.4f}")
print(f"  EER: NOT IMPLEMENTED")
print(f"  Training time: {total_training_time:.2f} seconds")
print(f"  Checkpoint: {model_path}")
print(f"  Metrics file: {metrics_path}")
print()

print("ARTIFACTS DIRECTORY:")
print(f"  {ARTIFACT_DIR}")
print()

for file in sorted(ARTIFACT_DIR.glob("*")):
    print(f"    - {file.name}")
print()
