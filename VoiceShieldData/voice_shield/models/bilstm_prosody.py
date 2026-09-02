"""
VoiceShield Model 5: BiLSTM + Self-Attention for Prosodic & Temporal Acoustic Artifact Detection
Captures pitch (F0), jitter, shimmer, energy dynamics, and unnatural vocal tremor anomalies.
"""
from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F

class TemporalAttention(nn.Module):
    """Computes learned attention weights over time frames."""
    def __init__(self, hidden_dim: int):
        super().__init__()
        self.attn = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.Tanh(),
            nn.Linear(64, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, T, hidden_dim]
        scores = self.attn(x)  # [B, T, 1]
        weights = F.softmax(scores, dim=1)  # [B, T, 1]
        context = torch.sum(weights * x, dim=1)  # [B, hidden_dim]
        return context


class BiLSTMProsodyModel(nn.Module):
    """
    Bidirectional LSTM with Attention for Temporal Prosodic cues.
    Input: [B, T, 8] (Prosody feature sequence)
    Output: Raw unscaled logits [B]
    """
    def __init__(
        self,
        in_features: int = 8,
        hidden_dim: int = 64,
        num_layers: int = 2,
        num_classes: int = 1,
        dropout: float = 0.3,
    ):
        super().__init__()
        self.input_projection = nn.Sequential(
            nn.Linear(in_features, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.LeakyReLU(0.1),
        )

        self.lstm = nn.LSTM(
            input_size=hidden_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            bidirectional=True,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )

        self.attention = TemporalAttention(hidden_dim * 2)

        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, 64),
            nn.BatchNorm1d(64),
            nn.LeakyReLU(0.1),
            nn.Dropout(dropout),
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.LeakyReLU(0.1),
            nn.Linear(32, num_classes),
        )

    def forward(self, x: torch.Tensor, return_logits: bool = True) -> torch.Tensor:
        # Accept [B, T, 8] or [B, 8, T]
        if x.ndim == 3 and x.shape[-1] != 8 and x.shape[1] == 8:
            x = x.permute(0, 2, 1)
        elif x.ndim == 2:
            x = x.unsqueeze(0)
            if x.shape[-1] != 8 and x.shape[1] == 8:
                x = x.permute(0, 2, 1)

        proj = self.input_projection(x)          # [B, T, hidden_dim]
        lstm_out, _ = self.lstm(proj)            # [B, T, hidden_dim * 2]
        context = self.attention(lstm_out)       # [B, hidden_dim * 2]
        logits = self.classifier(context).squeeze(-1)

        if return_logits:
            return logits
        return torch.sigmoid(logits)
