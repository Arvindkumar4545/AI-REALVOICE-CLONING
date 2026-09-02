import shutil
from pathlib import Path
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent.parent
meta_path = ROOT_DIR / "datasets" / "in_the_wild" / "EXTRACTED" / "release_in_the_wild" / "meta.csv"
audio_dir = meta_path.parent

human_dir = ROOT_DIR / "real_world_tests" / "human"
spoof_dir = ROOT_DIR / "real_world_tests" / "spoof"

human_dir.mkdir(parents=True, exist_ok=True)
spoof_dir.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(meta_path)
human_df = df[df["label"].str.lower().str.contains("bona")].head(25)
spoof_df = df[df["label"].str.lower().str.contains("spoof")].head(25)

for _, r in human_df.iterrows():
    src = audio_dir / r["file"]
    if src.exists():
        shutil.copy(src, human_dir / r["file"])

for _, r in spoof_df.iterrows():
    src = audio_dir / r["file"]
    if src.exists():
        shutil.copy(src, spoof_dir / r["file"])

print(f"Created real_world_tests: {len(list(human_dir.glob('*.wav')))} human samples, {len(list(spoof_dir.glob('*.wav')))} spoof samples.")
