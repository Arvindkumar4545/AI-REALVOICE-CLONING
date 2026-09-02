"""
VoiceShield Model 2: RawNet2 (End-to-End Raw Waveform Anti-Spoofing Network)
Implements SincConv learnable filterbanks, Residual Blocks with Feature Map Scaling (FMS),
and GRU temporal aggregation.
"""
from __future__ import annotations

import math
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

class SincConv(nn.Module):
    """
    Sinc-based convolution layer directly processing raw audio waveforms.
    Learns band-pass filters parameterized by low and high cutoff frequencies.
    """
    def __init__(
        self,
        out_channels: int = 64,
        kernel_size: int = 129,
        sample_rate: int = 16000,
        min_low_hz: float = 50.0,
        min_band_hz: float = 50.0,
    ):
        super().__init__()
        if kernel_size % 2 == 0:
            kernel_size += 1
        self.kernel_size = kernel_size
        self.out_channels = out_channels
        self.sample_rate = sample_rate
        self.min_low_hz = min_low_hz
        self.min_band_hz = min_band_hz

        # Initialize filterbanks using Mel-scale distribution
        low_hz = 30.0
        high_hz = sample_rate / 2.0 - (min_low_hz + min_band_hz)
        mel = np.linspace(
            2595 * np.log10(1 + low_hz / 700),
            2595 * np.log10(1 + high_hz / 700),
            out_channels + 1,
        )
        hz = 700 * (10 ** (mel / 2595) - 1)

        self.low_hz_ = nn.Parameter(torch.Tensor(hz[:-1]).view(-1, 1))
        self.band_hz_ = nn.Parameter(torch.Tensor(np.diff(hz)).view(-1, 1))

        # Half-window time axis
        n_lin = torch.linspace(0, (self.kernel_size / 2) - 1, steps=int((self.kernel_size / 2)))
        self.window_ = 0.54 - 0.46 * torch.cos(2 * math.pi * n_lin / self.kernel_size)
        n = (self.kernel_size - 1) / 2.0
        self.n_ = 2 * math.pi * torch.arange(-n, 0).view(1, -1) / self.sample_rate

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, 1, T] or [B, T]
        if x.ndim == 2:
            x = x.unsqueeze(1)

        low = self.min_low_hz + torch.abs(self.low_hz_)
        high = torch.clamp(low + self.min_band_hz + torch.abs(self.band_hz_), self.min_low_hz, self.sample_rate / 2.0)
        band = (high - low)[:, 0]

        n = self.n_.to(x.device)
        window = self.window_.to(x.device)

        f_times_t_low = torch.matmul(low, n)
        f_times_t_high = torch.matmul(high, n)

        band_pass_left = ((torch.sin(f_times_t_high) - torch.sin(f_times_t_low)) / (n / 2)) * window
        band_pass_center = 2 * band.view(-1, 1)
        band_pass_right = torch.flip(band_pass_left, dims=[-1])

        band_pass = torch.cat([band_pass_left, band_pass_center, band_pass_right], dim=1)
        band_pass = band_pass / (2 * band[:, None] + 1e-8)
        filters = band_pass.view(self.out_channels, 1, self.kernel_size)

        return F.conv1d(x, filters, stride=3, padding=self.kernel_size // 2)


class FeatureMapScaling(nn.Module):
    """Channel-wise Feature Map Scaling (FMS / Squeeze-and-Excitation)."""
    def __init__(self, channels: int):
        super().__init__()
        self.fc = nn.Sequential(
            nn.AdaptiveAvgPool1d(1),
            nn.Flatten(),
            nn.Linear(channels, channels // 4),
            nn.LeakyReLU(0.1),
            nn.Linear(channels // 4, channels),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        scale = self.fc(x).unsqueeze(-1)  # [B, C, 1]
        return x * scale + x


class RawNet2ResBlock(nn.Module):
    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.bn1 = nn.BatchNorm1d(in_channels)
        self.act1 = nn.LeakyReLU(0.1)
        self.conv1 = nn.Conv1d(in_channels, out_channels, kernel_size=3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm1d(out_channels)
        self.act2 = nn.LeakyReLU(0.1)
        self.conv2 = nn.Conv1d(out_channels, out_channels, kernel_size=3, padding=1, bias=False)
        self.fms = FeatureMapScaling(out_channels)
        self.pool = nn.MaxPool1d(kernel_size=3, stride=3)

        if in_channels != out_channels:
            self.shortcut = nn.Conv1d(in_channels, out_channels, kernel_size=1, bias=False)
        else:
            self.shortcut = nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        res = self.shortcut(x)
        out = self.act1(self.bn1(x))
        out = self.conv1(out)
        out = self.act2(self.bn2(out))
        out = self.conv2(out)
        out = self.fms(out)
        out = out + res
        return self.pool(out)


class RawNet2(nn.Module):
    """
    RawNet2 end-to-end raw waveform anti-spoofing detector.
    Input: [B, T] or [B, 1, T] raw waveform
    Output: Raw unscaled logits [B]
    """
    def __init__(self, sinc_channels: int = 64, sinc_kernel: int = 129, num_classes: int = 1):
        super().__init__()
        self.sinc_conv = SincConv(out_channels=sinc_channels, kernel_size=sinc_kernel)
        self.bn_sinc = nn.BatchNorm1d(sinc_channels)
        self.act_sinc = nn.LeakyReLU(0.1)
        self.pool_sinc = nn.MaxPool1d(kernel_size=3, stride=3)

        # ResBlocks
        self.block1 = RawNet2ResBlock(sinc_channels, 64)
        self.block2 = RawNet2ResBlock(64, 128)
        self.block3 = RawNet2ResBlock(128, 128)
        self.block4 = RawNet2ResBlock(128, 256)

        # Dual statistical pooling
        self.avg_pool = nn.AdaptiveAvgPool1d(1)
        self.max_pool = nn.AdaptiveMaxPool1d(1)

        # Classification Head
        self.classifier = nn.Sequential(
            nn.Linear(256 * 2, 128),
            nn.BatchNorm1d(128),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.LeakyReLU(0.1),
            nn.Linear(64, num_classes),
        )

    def forward(self, x: torch.Tensor, return_logits: bool = True) -> torch.Tensor:
        # x: [B, T]
        x = self.pool_sinc(self.act_sinc(self.bn_sinc(self.sinc_conv(x))))
        x = self.block1(x)
        x = self.block2(x)
        x = self.block3(x)
        x = self.block4(x)

        avg_f = self.avg_pool(x).flatten(1)
        max_f = self.max_pool(x).flatten(1)
        feat = torch.cat([avg_f, max_f], dim=1)  # [B, 512]

        logits = self.classifier(feat).squeeze(-1)
        if return_logits:
            return logits
        return torch.sigmoid(logits)
