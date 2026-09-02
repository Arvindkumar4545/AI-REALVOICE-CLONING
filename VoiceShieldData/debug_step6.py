import sys
import torch
sys.path.insert(0, r"F:\VoiceShieldData")

from voice_shield.model import AudioSpoofNet

print("=" * 60)
print("MODEL ARCHITECTURE")
print("=" * 60)

model = AudioSpoofNet()
print(model)
print()

# Count parameters
total_params = sum(p.numel() for p in model.parameters())
trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
print(f"Total parameters: {total_params:,}")
print(f"Trainable parameters: {trainable_params:,}")
print()

# Test forward pass
print("=" * 60)
print("FORWARD PASS TEST")
print("=" * 60)
print()

x = torch.randn(2, 1, 40, 96)
print(f"Input shape: {x.shape}")
print(f"Input dtype: {x.dtype}")
print()

try:
    y = model(x)
    print(f"Output shape: {y.shape}")
    print(f"Output dtype: {y.dtype}")
    print(f"Output min: {y.min():.6f}")
    print(f"Output max: {y.max():.6f}")
    print()
    
    # Test loss
    criterion = torch.nn.BCELoss()
    labels = torch.tensor([0.0, 1.0], dtype=torch.float32)
    loss = criterion(y, labels)
    print(f"Loss: {loss.item():.6f}")
    print()
    
    # Test backward pass
    loss.backward()
    print("Backward pass: SUCCESS")
    print()
    
    # Check gradients
    grads_exist = False
    for name, param in model.named_parameters():
        if param.grad is not None:
            grads_exist = True
            break
    print(f"Gradients computed: {grads_exist}")
    
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
