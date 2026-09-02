import sys
import time
sys.path.insert(0, r"F:\VoiceShieldData")

from voice_shield.train import train_model

test_configs = [
    {"name": "Minimal", "train": 5, "dev": 5, "epochs": 1},
    {"name": "Small", "train": 20, "dev": 10, "epochs": 1},
    {"name": "Medium", "train": 100, "dev": 50, "epochs": 1},
]

print("=" * 70)
print("REGRESSION TESTS")
print("=" * 70)
print()

results = []
for config in test_configs:
    print(f"Test: {config['name']} ({config['train']} train, {config['dev']} dev, {config['epochs']} epochs)")
    print("-" * 70)
    
    start = time.time()
    try:
        result = train_model(
            max_train_samples=config['train'],
            max_dev_samples=config['dev'],
            epochs=config['epochs']
        )
        elapsed = time.time() - start
        
        status = "PASS"
        error = None
        print(f"  Status: {status}")
        print(f"  Time: {elapsed:.2f}s")
        print(f"  Best F1: {result['best_f1']:.4f}")
        print(f"  Model saved to: {result['model_path']}")
        
        results.append({
            "config": config['name'],
            "status": status,
            "time": elapsed,
            "f1": result['best_f1']
        })
        
    except Exception as e:
        elapsed = time.time() - start
        status = "FAIL"
        error = f"{type(e).__name__}: {str(e)[:50]}"
        print(f"  Status: {status}")
        print(f"  Error: {error}")
        print(f"  Time: {elapsed:.2f}s")
        
        results.append({
            "config": config['name'],
            "status": status,
            "time": elapsed,
            "error": error
        })
    
    print()

print("=" * 70)
print("REGRESSION TEST SUMMARY")
print("=" * 70)
print()

pass_count = sum(1 for r in results if r["status"] == "PASS")
fail_count = sum(1 for r in results if r["status"] == "FAIL")

print(f"PASSED: {pass_count}/{len(results)}")
print(f"FAILED: {fail_count}/{len(results)}")
print()

for r in results:
    status_symbol = "PASS" if r["status"] == "PASS" else "FAIL"
    print(f"  {r['config']:10s}: {status_symbol:4s} ({r['time']:.2f}s)")

if fail_count == 0:
    print()
    print("All regression tests passed!")
else:
    print()
    print("Some tests failed - see details above")
