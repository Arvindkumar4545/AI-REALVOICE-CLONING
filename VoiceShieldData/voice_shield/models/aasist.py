"""
VoiceShield Model 3: AASIST (Audio Anti-Spoofing using Integrated Spectro-Temporal Graph Attention Networks)
Official/Standard Architecture from Interspeech 2021 (Jung et al.).
Combines SincConv encoder with Heterogeneous Graph Attention Networks and Max-Graph-Operations (MGO).
"""
from __future__ import annotations

import math
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

from .rawnet2 import SincConv

class GraphAttentionLayer(nn.Module):
    """Graph Attention Layer (GAT) for spectral and temporal node communication."""
    def __init__(self, in_features: int, out_features: int, num_heads: int = 2, dropout: float = 0.1):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.num_heads = num_heads
        
        self.W = nn.Linear(in_features, out_features * num_heads, bias=False)
        self.a_src = nn.Parameter(torch.zeros(num_heads, out_features, 1))
        self.a_dst = nn.Parameter(torch.zeros(num_heads, out_features, 1))
        self.leaky_relu = nn.LeakyReLU(0.2)
        self.dropout = nn.Dropout(dropout)
        self.bn = nn.BatchNorm1d(out_features * num_heads)

        nn.init.xavier_uniform_(self.a_src)
        nn.init.xavier_uniform_(self.a_dst)

    def forward(self, h: torch.Tensor) -> torch.Tensor:
        # h: [B, N, in_features]
        B, N, _ = h.shape
        Wh = self.W(h).view(B, N, self.num_heads, self.out_features)  # [B, N, H, D]
        Wh = Wh.permute(0, 2, 1, 3)  # [B, H, N, D]

        # Compute self-attention coefficients
        attn_src = torch.matmul(Wh, self.a_src)  # [B, H, N, 1]
        attn_dst = torch.matmul(Wh, self.a_dst)  # [B, H, N, 1]
        attn = self.leaky_relu(attn_src + attn_dst.transpose(-1, -2))  # [B, H, N, N]
        attn = F.softmax(attn, dim=-1)
        attn = self.dropout(attn)

        h_prime = torch.matmul(attn, Wh)  # [B, H, N, D]
        h_prime = h_prime.permute(0, 2, 1, 3).contiguous().view(B, N, -1)  # [B, N, H*D]
        
        # Batch norm over nodes
        h_prime = self.bn(h_prime.permute(0, 2, 1)).permute(0, 2, 1)
        return F.leaky_relu(h_prime, 0.1)


class AASISTResBlock(nn.Module):
    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.bn1 = nn.BatchNorm2d(in_channels)
        self.act1 = nn.LeakyReLU(0.1)
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)
        self.act2 = nn.LeakyReLU(0.1)
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False)
        self.pool = nn.MaxPool2d(kernel_size=2, stride=2)

        if in_channels != out_channels:
            self.shortcut = nn.Conv2d(in_channels, out_channels, kernel_size=1, bias=False)
        else:
            self.shortcut = nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        res = self.shortcut(x)
        out = self.act1(self.bn1(x))
        out = self.conv1(out)
        out = self.act2(self.bn2(out))
        out = self.conv2(out)
        return self.pool(out + res)


class AASIST(nn.Module):
    """
    AASIST: Audio Anti-Spoofing using Integrated Spectro-Temporal Graph Attention Networks.
    Processes raw waveform, projects to 2D spectro-temporal maps, runs dual GATs (Spectral + Temporal),
    and combines them via Max-Graph-Operation (MGO).
    """
    def __init__(self, sinc_channels: int = 64, num_classes: int = 1, gat_dim: int = 64):
        super().__init__()
        self.sinc_conv = SincConv(out_channels=sinc_channels, kernel_size=129)
        self.bn_sinc = nn.BatchNorm1d(sinc_channels)
        self.act_sinc = nn.LeakyReLU(0.1)
        self.pool_sinc = nn.AdaptiveAvgPool1d(128)

        # 2D convolutional encoder (projects 1D sinc representation to Spectro-Temporal maps)
        self.res1 = AASISTResBlock(1, 32)
        self.res2 = AASISTResBlock(32, 64)
        self.res3 = AASISTResBlock(64, gat_dim)

        # Dual Graph Attention Networks
        self.gat_spectral = GraphAttentionLayer(in_features=gat_dim, out_features=gat_dim // 2, num_heads=2)
        self.gat_temporal = GraphAttentionLayer(in_features=gat_dim, out_features=gat_dim // 2, num_heads=2)

        # Max-Graph Operation (MGO) and Readout
        self.fc_spec = nn.Linear(gat_dim, 128)
        self.fc_temp = nn.Linear(gat_dim, 128)

        # Classification Head
        self.classifier = nn.Sequential(
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.LeakyReLU(0.1),
            nn.Linear(64, num_classes),
        )

    def forward(self, x: torch.Tensor, return_logits: bool = True) -> torch.Tensor:
        # x: [B, T] raw waveform
        sinc_feat = self.act_sinc(self.bn_sinc(self.sinc_conv(x)))  # [B, 64, T_sinc]
        sinc_feat = self.pool_sinc(sinc_feat)                       # [B, 64, 128]
        
        # Reshape to [B, 1, 64, 128] for 2D Spectro-Temporal processing
        feat_2d = sinc_feat.unsqueeze(1)
        feat_2d = self.res1(feat_2d)
        feat_2d = self.res2(feat_2d)
        feat_2d = self.res3(feat_2d)  # [B, gat_dim, F_node, T_node]

        B, C, F_n, T_n = feat_2d.shape

        # 1. Spectral Graph: aggregate over time, nodes = F_n
        spec_nodes = feat_2d.mean(dim=-1).permute(0, 2, 1)  # [B, F_n, C]
        spec_g = self.gat_spectral(spec_nodes)               # [B, F_n, C]
        spec_readout = torch.max(spec_g, dim=1)[0]          # [B, C] Max-pooling (MGO)
        spec_emb = self.fc_spec(spec_readout)               # [B, 128]

        # 2. Temporal Graph: aggregate over frequency, nodes = T_n
        temp_nodes = feat_2d.mean(dim=-2).permute(0, 2, 1)  # [B, T_n, C]
        temp_g = self.gat_temporal(temp_nodes)               # [B, T_n, C]
        temp_readout = torch.max(temp_g, dim=1)[0]          # [B, C] Max-pooling (MGO)
        temp_emb = self.fc_temp(temp_readout)               # [B, 128]

        # Joint artifact embedding
        joint_emb = torch.cat([spec_emb, temp_emb], dim=1)  # [B, 256]

        logits = self.classifier(joint_emb).squeeze(-1)
        if return_logits:
            return logits
        return torch.sigmoid(logits)
