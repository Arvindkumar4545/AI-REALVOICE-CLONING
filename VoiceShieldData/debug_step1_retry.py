import sys
import time
sys.path.insert(0, r"F:\VoiceShieldData")

from voice_shield.train import train_model

print("Starting minimal training (5 train, 5 dev, 1 epoch)...")
print("=" * 60)

start = time.time()
try:
    result = train_model(max_train_samples=5, max_dev_samples=5, epochs=1)
    elapsed = time.time() - start
    
    print("=" * 60)
    print(f"Training completed in {elapsed:.2f} seconds")
    print()
    print("Result:")
    print(result)
    
except Exception as e:
    elapsed = time.time() - start
    print(f"ERROR after {elapsed:.2f} seconds:")
    print(f"Exception: {type(e).__name__}")
    print(f"Message: {e}")
    print()
    import traceback
    traceback.print_exc()
