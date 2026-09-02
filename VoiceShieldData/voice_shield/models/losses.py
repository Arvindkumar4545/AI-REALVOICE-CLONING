"""
VoiceShield Loss Functions
Implements:
1. Focal Loss for class imbalance mitigation
2. Weighted Binary Cross-Entropy with Logits
3. Standard Binary Cross-Entropy with Logits
"""
from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F

class FocalLoss(nn.Module):
    """
    Focal Loss for binary classification with severe class imbalance.
    FL(p_t) = -alpha_t * (1 - p_t)^gamma * log(p_t)
    """
    def __init__(self, alpha: float = 0.25, gamma: float = 2.0, reduction: str = "mean") -> None:
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        """
        logits: unscaled logit outputs [B]
        targets: binary targets (0 or 1) [B]
        """
        bce_loss = F.binary_cross_entropy_with_logits(logits, targets, reduction="none")
        probs = torch.sigmoid(logits)
        p_t = targets * probs + (1 - targets) * (1 - probs)
        alpha_t = targets * self.alpha + (1 - targets) * (1 - self.alpha)
        focal_weight = alpha_t * ((1 - p_t) ** self.gamma)
        loss = focal_weight * bce_loss

        if self.reduction == "mean":
            return loss.mean()
        elif self.reduction == "sum":
            return loss.sum()
        return loss


def get_loss_function(
    loss_type: str = "weighted_bce",
    pos_weight: float | None = None,
    focal_alpha: float = 0.25,
    focal_gamma: float = 2.0,
    device: torch.device = torch.device("cpu"),
) -> nn.Module:
    """
    Factory function returning configured loss function:
    - 'weighted_bce': BCEWithLogitsLoss with pos_weight
    - 'focal': FocalLoss with alpha and gamma
    - 'bce': Standard BCEWithLogitsLoss
    """
    loss_type = loss_type.lower().strip()
    if loss_type in ("weighted_bce", "weighted"):
        pw_tensor = torch.tensor([pos_weight], device=device) if pos_weight is not None else None
        return nn.BCEWithLogitsLoss(pos_weight=pw_tensor)
    elif loss_type in ("focal", "focal_loss"):
        return FocalLoss(alpha=focal_alpha, gamma=focal_gamma).to(device)
    elif loss_type in ("bce", "standard_bce"):
        return nn.BCEWithLogitsLoss().to(device)
    else:
        raise ValueError(f"Unknown loss type: {loss_type}. Supported: 'weighted_bce', 'focal', 'bce'")
