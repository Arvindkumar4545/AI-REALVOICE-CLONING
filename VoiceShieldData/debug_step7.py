import torch
import sys

print("=" * 60)
print("GPU / CUDA STATUS")
print("=" * 60)
print()

print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    print(f"CUDA version: {torch.version.cuda}")
    print(f"GPU name: {torch.cuda.get_device_name(0)}")
    print(f"GPU count: {torch.cuda.device_count()}")
    print(f"Device: cuda:{torch.cuda.current_device()}")
else:
    print()
    print("⚠️  WARNING: CUDA IS NOT AVAILABLE")
    print("CPU TRAINING ONLY")
    print()
    print("Device being used: CPU")
