"""
VoiceShield Model 1: LCNN (Light CNN with Max-Feature-Map) for LFCC Spectral Artifact Detection
Standard ASVspoof competitive baseline architecture.
"""
from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F

class MaxFeatureMap2D(nn.Module):
    """
    Max-Feature-Map (MFM) operation for 2D convolutions.
    Splits channel dimension in two and takes elementwise maximum:
    MFM(x) = max(x_{0:C/2}, x_{C/2:C})
    """
    def __init__(self, in_channels: int, out_channels: int, kernel_size: int = 3, stride: int = 1, padding: int = 1):
        super().__init__()
        self.conv = nn.Conv2d(in_channels, out_channels * 2, kernel_size=kernel_size, stride=stride, padding=padding)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.conv(x)
        out1, out2 = torch.chunk(x, 2, dim=1)
        return torch.max(out1, out2)


class MaxFeatureMap1D(nn.Module):
    """Max-Feature-Map for linear layers."""
    def __init__(self, in_features: int, out_features: int):
        super().__init__()
        self.fc = nn.Linear(in_features, out_features * 2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.fc(x)
        out1, out2 = torch.chunk(x, 2, dim=-1)
        return torch.max(out1, out2)


class LCNN(nn.Module):
    """
    Light CNN-9 / CNN-29 anti-spoofing architecture for LFCC features.
    Input: [B, 3, 20, T] (LFCC + Delta + Delta-Delta) or [B, 1, F, T]
    Output: Raw unscaled logits [B] (Bona-fide = positive, Spoof = negative)
    """
    def __init__(self, in_channels: int = 3, num_classes: int = 1, dropout: float = 0.3):
        super().__init__()
        self.block1 = nn.Sequential(
            MaxFeatureMap2D(in_channels, 16, kernel_size=5, stride=1, padding=2),
            nn.MaxPool2d(kernel_size=2, stride=2),
        )
        self.block2 = nn.Sequential(
            MaxFeatureMap2D(16, 24, kernel_size=1, stride=1, padding=0),
            MaxFeatureMap2D(24, 32, kernel_size=3, stride=1, padding=1),
            nn.MaxPool2d(kernel_size=2, stride=2),
            nn.BatchNorm2d(32),
        )
        self.block3 = nn.Sequential(
            MaxFeatureMap2D(32, 48, kernel_size=1, stride=1, padding=0),
            MaxFeatureMap2D(48, 64, kernel_size=3, stride=1, padding=1),
            nn.MaxPool2d(kernel_size=2, stride=2),
        )
        self.block4 = nn.Sequential(
            MaxFeatureMap2D(64, 64, kernel_size=1, stride=1, padding=0),
            MaxFeatureMap2D(64, 96, kernel_size=3, stride=1, padding=1),
            nn.MaxPool2d(kernel_size=2, stride=2),
            nn.BatchNorm2d(96),
        )
        
        # Dual statistical pooling (Avg + Max = 96 * 2 = 192)
        self.avg_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.max_pool = nn.AdaptiveMaxPool2d((1, 1))
        
        self.fc1 = MaxFeatureMap1D(192, 128)
        self.dropout = nn.Dropout(dropout)
        self.fc2 = nn.Linear(128, num_classes)

    def forward(self, x: torch.Tensor, return_logits: bool = True) -> torch.Tensor:
        # x: [B, C, F, T]
        x = self.block1(x)
        x = self.block2(x)
        x = self.block3(x)
        x = self.block4(x)
        
        avg_f = self.avg_pool(x).flatten(1)
        max_f = self.max_pool(x).flatten(1)
        feat = torch.cat([avg_f, max_f], dim=1)  # [B, 192]
        
        out = self.fc1(feat)                     # [B, 128]
        out = self.dropout(out)
        logits = self.fc2(out).squeeze(-1)       # [B]
        
        if return_logits:
            return logits
        return torch.sigmoid(logits)
