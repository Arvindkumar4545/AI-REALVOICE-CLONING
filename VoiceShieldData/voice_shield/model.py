"""
VoiceShield Model Architectures
Includes:
- AudioSpoofNet: Original 4-layer baseline CNN
- AudioSpoofNetV2: Improved Deep Residual CNN with BatchNorm, Dropout & Adaptive Pooling
"""
from __future__ import annotations

import torch
from torch import nn
import torch.nn.functional as F


class AudioSpoofNet(nn.Module):
    """
    Baseline 4-layer CNN (AudioSpoofNet v1.0).
    Preserved for backward reproducibility and baseline benchmarking.
    """
    def __init__(self, input_channels: int = 1, n_mels: int = 40, n_frames: int = 96) -> None:
        super().__init__()
        self.cnn = nn.Sequential(
            nn.Conv2d(input_channels, 16, kernel_size=3, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2),
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2),
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2),
            nn.Conv2d(64, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(kernel_size=2),
        )
        feature_dim = (n_mels // 16) * (n_frames // 16) * 64
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(feature_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.cnn(x)
        logits = self.classifier(x)
        return torch.sigmoid(logits).squeeze(-1)


class ResidualBlock2D(nn.Module):
    """
    2D Residual Block with double convolution, BatchNorm, and shortcut projection.
    """
    def __init__(self, in_channels: int, out_channels: int, stride: int = 1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3, stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.act1 = nn.LeakyReLU(0.1, inplace=True)
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, stride=1, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)
        self.act2 = nn.LeakyReLU(0.1, inplace=True)

        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm2d(out_channels),
            )
        else:
            self.shortcut = nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = self.shortcut(x)
        out = self.act1(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out = self.act2(out + residual)
        return out


class AudioSpoofNetV2(nn.Module):
    """
    Improved Deep Residual CNN for Voice Anti-Spoofing & Deepfake Detection.
    Outputs raw unscaled logits internally for numerically stable BCEWithLogitsLoss.
    """
    def __init__(self, input_channels: int = 1, n_mels: int = 40, n_frames: int = 96) -> None:
        super().__init__()
        # Initial stem
        self.stem = nn.Sequential(
            nn.Conv2d(input_channels, 32, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.LeakyReLU(0.1, inplace=True),
        )

        # Residual stages
        self.stage1 = ResidualBlock2D(32, 64, stride=2)    # -> [B, 64, 20, 48]
        self.stage2 = ResidualBlock2D(64, 128, stride=2)   # -> [B, 128, 10, 24]
        self.stage3 = ResidualBlock2D(128, 128, stride=2)  # -> [B, 128, 5, 12]
        self.stage4 = ResidualBlock2D(128, 256, stride=1)  # -> [B, 256, 5, 12]

        # Statistical adaptive pooling (Avg + Max pooling combined = 256 * 2 = 512 dim)
        self.avg_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.max_pool = nn.AdaptiveMaxPool2d((1, 1))

        # Classification Head
        self.dropout = nn.Dropout(0.3)
        self.classifier = nn.Sequential(
            nn.Linear(512, 128),
            nn.BatchNorm1d(128),
            nn.LeakyReLU(0.1, inplace=True),
            nn.Dropout(0.25),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.LeakyReLU(0.1, inplace=True),
            nn.Linear(64, 1),
        )

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        x = self.stem(x)
        x = self.stage1(x)
        x = self.stage2(x)
        x = self.stage3(x)
        x = self.stage4(x)
        avg_f = self.avg_pool(x).flatten(1)
        max_f = self.max_pool(x).flatten(1)
        return torch.cat([avg_f, max_f], dim=1)

    def forward(self, x: torch.Tensor, return_logits: bool = True) -> torch.Tensor:
        features = self.extract_features(x)
        features = self.dropout(features)
        logits = self.classifier(features).squeeze(-1)
        if return_logits:
            return logits
        return torch.sigmoid(logits)


if __name__ == "__main__":
    v1 = AudioSpoofNet()
    v2 = AudioSpoofNetV2()
    x = torch.randn(2, 1, 40, 96)
    y1 = v1(x)
    y2_logits = v2(x, return_logits=True)
    y2_prob = v2(x, return_logits=False)
    print("V1 Output shape:", y1.shape)
    print("V2 Logits shape:", y2_logits.shape, "Prob shape:", y2_prob.shape)
    print("V2 Parameters count:", sum(p.numel() for p in v2.parameters() if p.requires_grad))
