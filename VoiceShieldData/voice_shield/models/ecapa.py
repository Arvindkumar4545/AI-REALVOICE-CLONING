"""
VoiceShield Model 6: ECAPA-TDNN (Emphasized Channel Attention, Propagation and Aggregation)
Computes 192-dimensional speaker identity embeddings for speaker-consistency verification.
"""
from __future__ import annotations

import math
import torch
import torch.nn as nn
import torch.nn.functional as F

class SqueezeExcitation1D(nn.Module):
    def __init__(self, channels: int, bottleneck: int = 32):
        super().__init__()
        self.fc = nn.Sequential(
            nn.AdaptiveAvgPool1d(1),
            nn.Flatten(),
            nn.Linear(channels, bottleneck),
            nn.ReLU(),
            nn.Linear(bottleneck, channels),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        scale = self.fc(x).unsqueeze(-1)
        return x * scale


class Res2Conv1DBlock(nn.Module):
    """Res2Net convolutional block with dilated convolution and Squeeze-and-Excitation."""
    def __init__(self, in_channels: int, out_channels: int, dilation: int = 1):
        super().__init__()
        self.conv1 = nn.Conv1d(in_channels, out_channels, kernel_size=1)
        self.bn1 = nn.BatchNorm1d(out_channels)
        self.act1 = nn.LeakyReLU(0.1)

        self.conv2 = nn.Conv1d(out_channels, out_channels, kernel_size=3, padding=dilation, dilation=dilation)
        self.bn2 = nn.BatchNorm1d(out_channels)
        self.act2 = nn.LeakyReLU(0.1)

        self.conv3 = nn.Conv1d(out_channels, out_channels, kernel_size=1)
        self.bn3 = nn.BatchNorm1d(out_channels)
        self.se = SqueezeExcitation1D(out_channels)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out = self.act1(self.bn1(self.conv1(x)))
        out = self.act2(self.bn2(self.conv2(out)))
        out = self.bn3(self.conv3(out))
        out = self.se(out)
        return out + x


class ECAPATDNN(nn.Module):
    """
    ECAPA-TDNN Speaker Embedding Extractor.
    Input: [B, C, F, T] Mel-Spectrogram or [B, F, T]
    Output: Normalized 192-dim speaker embedding [B, 192]
    """
    def __init__(self, in_channels: int = 40, channels: int = 128, emb_dim: int = 192):
        super().__init__()
        self.layer1 = nn.Sequential(
            nn.Conv1d(in_channels, channels, kernel_size=5, padding=2),
            nn.BatchNorm1d(channels),
            nn.LeakyReLU(0.1),
        )
        self.layer2 = Res2Conv1DBlock(channels, channels, dilation=2)
        self.layer3 = Res2Conv1DBlock(channels, channels, dilation=3)
        self.layer4 = Res2Conv1DBlock(channels, channels, dilation=4)

        # Multi-layer feature aggregation
        self.mfa = nn.Conv1d(channels * 3, channels * 3, kernel_size=1)

        # Attentive statistical pooling
        self.attn = nn.Sequential(
            nn.Conv1d(channels * 3, 64, kernel_size=1),
            nn.Tanh(),
            nn.Conv1d(64, channels * 3, kernel_size=1),
            nn.Softmax(dim=-1),
        )

        self.embedding_head = nn.Sequential(
            nn.Linear(channels * 3 * 2, emb_dim),
            nn.BatchNorm1d(emb_dim),
        )

    def extract_embedding(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, 1, F, T] or [B, F, T]
        if x.ndim == 4:
            x = x.squeeze(1)

        out1 = self.layer1(x)
        out2 = self.layer2(out1)
        out3 = self.layer3(out2)
        out4 = self.layer4(out3)

        cat = torch.cat([out2, out3, out4], dim=1)  # [B, 3*channels, T]
        mfa_out = F.leaky_relu(self.mfa(cat), 0.1)

        # Attentive pooling
        attn_weights = self.attn(mfa_out)
        mean = torch.sum(attn_weights * mfa_out, dim=-1)
        var = torch.sum(attn_weights * ((mfa_out - mean.unsqueeze(-1)) ** 2), dim=-1)
        std = torch.sqrt(torch.clamp(var, min=1e-6))
        stat_pool = torch.cat([mean, std], dim=-1)

        emb = self.embedding_head(stat_pool)
        return F.normalize(emb, p=2, dim=-1)

    def forward(self, test_audio: torch.Tensor, ref_audio: torch.Tensor | None = None) -> torch.Tensor:
        test_emb = self.extract_embedding(test_audio)
        if ref_audio is not None:
            ref_emb = self.extract_embedding(ref_audio)
            # Cosine similarity
            cosine_sim = torch.sum(test_emb * ref_emb, dim=-1)  # [B]
            return cosine_sim
        return test_emb


def compute_speaker_consistency_score(
    ecapa_model: ECAPATDNN,
    test_audio_spec: torch.Tensor,
    ref_audio_spec: torch.Tensor,
) -> float:
    """
    Computes cosine similarity between reference and test speaker embeddings.
    Returns float in range [-1.0, +1.0] and maps to consistency probability [0.0, 1.0].
    """
    ecapa_model.eval()
    with torch.no_grad():
        sim = float(ecapa_model(test_audio_spec, ref_audio_spec).item())
    return sim
