import os
import sys
import pandas as pd
from pathlib import Path

print("=== DATASET & AUDIO INSPECTION ===")

datasets_dir = Path("F:/VoiceShieldData/datasets")
for item in datasets_dir.iterdir():
    if item.is_dir():
        # count files in item
        file_count = sum(1 for _ in item.rglob("*") if _.is_file())
        print(f"Directory: {item.name}, files: {file_count}")
        # print sample files
        sample_files = [str(f.relative_to(datasets_dir)) for f in list(item.rglob("*")) if f.is_file()][:5]
        print(f"  Sample files: {sample_files}")

print("\n=== SEARCHING FOR 05a90ab3 ===")
found_target = list(Path("F:/VoiceShieldData").rglob("*05a90ab3*"))
print(f"Found target matching files: {found_target}")

print("\n=== CHECKING ALL MP3/WAV/FLAC IN NON-VENV FOLDERS ===")
audio_exts = {".mp3", ".wav", ".flac", ".webm", ".m4a", ".ogg"}
audio_files = []
for p in Path("F:/VoiceShieldData").iterdir():
    if p.name == ".venv" or p.name == "node_modules" or p.name == ".git":
        continue
    if p.is_dir():
        for f in p.rglob("*"):
            if f.is_file() and f.suffix.lower() in audio_exts:
                audio_files.append(f)
    elif p.is_file() and p.suffix.lower() in audio_exts:
        audio_files.append(p)

print(f"Total audio files found in project: {len(audio_files)}")
print("Sample audio files:")
for f in audio_files[:15]:
    print(f"  {f.relative_to(Path('F:/VoiceShieldData'))} ({f.stat().st_size} bytes)")

print("\n=== MANIFEST INSPECTION ===")
for m_path in [Path("manifests/dataset_manifest.csv"), Path("manifests/speaker_disjoint_manifest.csv")]:
    if m_path.exists():
        print(f"\nManifest: {m_path.name}")
        df = pd.read_csv(m_path, nrows=5)
        print(f"  Columns: {list(df.columns)}")
        print(f"  First 2 rows:\n{df.head(2).to_dict(orient='records')}")
