import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def main():
    print("=" * 80)
    print("VOICE SHIELD — FULL DATASET & MANIFEST AUDIT (STEP 2)")
    print("=" * 80)

    manifest_path = ROOT / "manifests" / "dataset_manifest.csv"
    if manifest_path.exists():
        df = pd.read_csv(manifest_path)
        print(f"\n[ASVspoof Manifest] Total Records: {len(df)}")
        print("\nSplit Distribution:")
        print(df["split"].value_counts())
        print("\nSplit by Label:")
        print(df.groupby(["split", "label"]).size())
        if "speaker" in df.columns:
            print(f"\nUnique Speakers: {df['speaker'].nunique()}")

    itw_path = ROOT / "datasets" / "in_the_wild" / "EXTRACTED" / "release_in_the_wild" / "meta.csv"
    if itw_path.exists():
        df_itw = pd.read_csv(itw_path)
        print(f"\n[In-The-Wild Dataset] Total Records: {len(df_itw)}")
        print("\nLabel Distribution:")
        print(df_itw["label"].value_counts())
        print(f"\nUnique Speakers in In-The-Wild: {df_itw['speaker'].nunique()}")
        print("\nTop 10 Speakers in In-The-Wild:")
        print(df_itw["speaker"].value_counts().head(10))

    additional_dir = ROOT / "datasets" / "additional"
    if additional_dir.exists():
        print(f"\n[Additional Dataset Dir] Exists: {additional_dir}")

    mlaad_dir = ROOT / "datasets" / "mlaad"
    if mlaad_dir.exists():
        print(f"\n[MLAAD Dataset Dir] Exists: {mlaad_dir}")

if __name__ == "__main__":
    main()
