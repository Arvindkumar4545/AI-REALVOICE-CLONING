"""CNN plus bidirectional self-attention model for audio anti-spoofing."""
from __future__ import annotations

import torch
from torch import nn


class ConvResidualBlock(nn.Module):
    """Residual 2D convolution block for local time-frequency patterns."""
    def __init__(self, in_channels: int, out_channels: int, stride: tuple[int, int]) -> None:
        super().__init__()
        self.main = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 3, stride=stride, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.GELU(),
            nn.Conv2d(out_channels, out_channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
        )
        self.skip = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 1, stride=stride, bias=False),
            nn.BatchNorm2d(out_channels),
        ) if in_channels != out_channels or stride != (1, 1) else nn.Identity()
        self.activation = nn.GELU()

    def forward(self, inputs: torch.Tensor) -> torch.Tensor:
        return self.activation(self.main(inputs) + self.skip(inputs))


class SpectroTemporalAntiSpoofNet(nn.Module):
    """Local CNN features followed by bidirectional Transformer time modeling."""
    def __init__(self, input_channels: int = 1, embed_dim: int = 192, heads: int = 6, layers: int = 4, dropout: float = 0.1) -> None:
        super().__init__()
        self.backbone = nn.Sequential(
            ConvResidualBlock(input_channels, 32, (2, 2)),
            ConvResidualBlock(32, 64, (2, 2)),
            ConvResidualBlock(64, 128, (2, 1)),
            ConvResidualBlock(128, embed_dim, (2, 1)),
        )
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim,
            nhead=heads,
            dim_feedforward=embed_dim * 4,
            dropout=dropout,
            activation="gelu",
            batch_first=True,
            norm_first=True,
        )
        self.temporal_encoder = nn.TransformerEncoder(encoder_layer, num_layers=layers)
        self.norm = nn.LayerNorm(embed_dim)
        self.classifier = nn.Linear(embed_dim, 2)
        self.softmax = nn.Softmax(dim=-1)

    def forward_features(self, inputs: torch.Tensor) -> torch.Tensor:
        if inputs.ndim == 3:
            inputs = inputs.unsqueeze(1)
        if inputs.ndim != 4:
            raise ValueError("Expected input with shape [B, F, T] or [B, C, F, T].")
        local_features = self.backbone(inputs)
        sequence = local_features.mean(dim=2).transpose(1, 2)
        return self.temporal_encoder(sequence)

    def forward(self, inputs: torch.Tensor, return_probabilities: bool = False) -> torch.Tensor:
        temporal_features = self.forward_features(inputs)
        pooled = self.norm(temporal_features.mean(dim=1))
        logits = self.classifier(pooled)
        return self.softmax(logits) if return_probabilities else logits

    def predict_proba(self, inputs: torch.Tensor) -> torch.Tensor:
        """Return [real, deepfake] probabilities."""
        return self.forward(inputs, return_probabilities=True)

    def predict_logit(self, inputs: torch.Tensor) -> torch.Tensor:
        """Return the scalar deepfake-vs-real logit for binary decisions."""
        logits = self.forward(inputs)
        return logits[:, 1] - logits[:, 0]


__all__ = ["SpectroTemporalAntiSpoofNet"]
