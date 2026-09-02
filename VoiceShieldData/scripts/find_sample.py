import os
from pathlib import Path

print("=== CHECKING ALL FILES IN F:\\VoiceShieldData\\backend\\uploads ===")
p = Path("backend/uploads")
if p.exists():
    for f in p.iterdir():
        print(f"  {f.name} ({f.stat().st_size} bytes)")

print("\n=== CHECKING IF 05a90ab3 IS IN C:\\Users\\ak761 OR TEMP OR ANYWHERE ===")
for base in [Path("C:/Users/ak761/Downloads"), Path("C:/Users/ak761/Desktop"), Path("C:/Users/ak761/AppData/Local/Temp")]:
    if base.exists():
        for f in base.glob("*05a90ab3*"):
            print(f"  FOUND in {base}: {f}")
