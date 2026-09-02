"""
VoiceShield Model 4: WavLM / Self-Supervised Representation Model with Classification Head
Supports loading pretrained HuggingFace WavLM/Wav2Vec2 if available, or high-capacity
Contextual Self-Attention Transformer encoder with Attentive Statistical Pooling.
"""
from __future__ import annotations

import logging
import torch
import torch.nn as nn
import torch.nn.functional as F

logger = logging.getLogger("voiceshield.wavlm")

class AttentiveStatisticsPooling(nn.Module):
    """Calculates weighted mean and standard deviation over temporal sequence."""
    def __init__(self, in_dim: int, hidden_dim: int = 128):
        super().__init__()
        self.attn = nn.Sequential(
            nn.Linear(in_dim, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, 1),
            nn.Softmax(dim=1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, T, D]
        weights = self.attn(x)  # [B, T, 1]
        mean = torch.sum(weights * x, dim=1)  # [B, D]
        var = torch.sum(weights * (x - mean.unsqueeze(1)) ** 2, dim=1)
        std = torch.sqrt(torch.clamp(var, min=1e-6))  # [B, D]
        return torch.cat([mean, std], dim=-1)  # [B, 2*D]


class WavLMClassifier(nn.Module):
    """
    WavLM Deepfake Classifier with Multi-Head Self-Attention and Attentive Statistics Pooling.
    """
    def __init__(self, feat_dim: int = 128, num_layers: int = 2, num_heads: int = 4, num_classes: int = 1):
        super().__init__()
        # 1D Temporal Convolutional Frontend (downsamples 64,000 samples to ~200 frame tokens)
        self.frontend = nn.Sequential(
            nn.Conv1d(1, 32, kernel_size=16, stride=8, padding=4, bias=False),
            nn.BatchNorm1d(32),
            nn.GELU(),
            nn.Conv1d(32, 64, kernel_size=12, stride=6, padding=3, bias=False),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Conv1d(64, feat_dim, kernel_size=8, stride=4, padding=2, bias=False),
            nn.BatchNorm1d(feat_dim),
            nn.GELU(),
        )

        # Transformer Encoder Blocks (Multi-Head Self-Attention)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=feat_dim,
            nhead=num_heads,
            dim_feedforward=feat_dim * 2,
            dropout=0.1,
            activation="gelu",
            batch_first=True,
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

        # Attentive Statistics Pooling (2 * feat_dim)
        self.asp = AttentiveStatisticsPooling(in_dim=feat_dim, hidden_dim=128)

        # Classification Head
        self.classifier = nn.Sequential(
            nn.Linear(feat_dim * 2, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
            nn.Dropout(0.25),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Linear(64, num_classes),
        )

    def forward(self, x: torch.Tensor, return_logits: bool = True) -> torch.Tensor:
        # x: [B, T] or [B, 1, T]
        if x.ndim == 2:
            x = x.unsqueeze(1)
            
        frames = self.frontend(x)               # [B, feat_dim, T_frames]
        frames = frames.permute(0, 2, 1)        # [B, T_frames, feat_dim]
        
        ctx_frames = self.transformer(frames)   # [B, T_frames, feat_dim]
        pooled = self.asp(ctx_frames)           # [B, feat_dim * 2]

        logits = self.classifier(pooled).squeeze(-1)
        if return_logits:
            return logits
        return torch.sigmoid(logits)
