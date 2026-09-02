from __future__ import annotations

from pathlib import Path
from typing import Iterable, List

import pandas as pd
import soundfile as sf

BASE_DIR = Path(__file__).resolve().parents[1]
DATASET_ROOT = BASE_DIR / "datasets"


def _normalize_label(label: str) -> str:
    label = str(label).strip().lower().replace("bona-fide", "bonafide")
    if label not in {"bonafide", "spoof"}:
        raise ValueError(f"Unsupported label: {label!r}")
    return label


def _is_valid_audio_file(path: Path) -> bool:
    try:
        return path.exists() and path.stat().st_size > 44
    except Exception:
        return False


def parse_asvspoof_protocol(protocol_path: Path, audio_dir: Path) -> List[dict]:
    rows: List[dict] = []
    with open(protocol_path, "r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            tokens = line.split()
            if len(tokens) < 5:
                continue
            speaker_id, audio_name, *_rest, key = tokens
            audio_path = (audio_dir / f"{audio_name}.flac").resolve()
            if not _is_valid_audio_file(audio_path):
                continue
            rows.append(
                {
                    "speaker": speaker_id,
                    "file": audio_name,
                    "label": _normalize_label(key),
                    "path": str(audio_path),
                    "source": "asvspoof",
                }
            )
    return rows


def _parse_in_the_wild(base_dir: Path) -> List[dict]:
    meta_path = base_dir / "datasets" / "in_the_wild" / "EXTRACTED" / "release_in_the_wild" / "meta.csv"
    df = pd.read_csv(meta_path)
    rows: List[dict] = []
    for _, row in df.iterrows():
        label = _normalize_label(str(row["label"]).replace("bona-fide", "bonafide"))
        file_name = str(row["file"]).strip()
        audio_path = (base_dir / "datasets" / "in_the_wild" / "EXTRACTED" / "release_in_the_wild" / file_name).resolve()
        if not _is_valid_audio_file(audio_path):
            continue
        rows.append(
            {
                "speaker": str(row["speaker"]).strip(),
                "file": file_name,
                "label": label,
                "path": str(audio_path),
                "source": "in_the_wild",
            }
        )
    return rows


def build_dataset_manifest(base_dir: Path = BASE_DIR, use_cache: bool = True) -> pd.DataFrame:
    manifest_path = base_dir / "manifests" / "dataset_manifest.csv"
    if use_cache and manifest_path.exists():
        return pd.read_csv(manifest_path)

    records: List[dict] = []
    dataset_roots = [
        (
            "LA",
            base_dir / "datasets" / "asvspoof2019" / "LA" / "LA" / "ASVspoof2019_LA_cm_protocols",
            {
                "train": base_dir / "datasets" / "asvspoof2019" / "LA" / "LA" / "ASVspoof2019_LA_train" / "flac",
                "dev": base_dir / "datasets" / "asvspoof2019" / "LA" / "LA" / "ASVspoof2019_LA_dev" / "flac",
                "eval": base_dir / "datasets" / "asvspoof2019" / "LA" / "LA" / "ASVspoof2019_LA_eval" / "flac",
            },
        ),
        (
            "PA",
            base_dir / "datasets" / "asvspoof2019" / "PA" / "PA" / "ASVspoof2019_PA_cm_protocols",
            {
                "train": base_dir / "datasets" / "asvspoof2019" / "PA" / "PA" / "ASVspoof2019_PA_train" / "flac",
                "dev": base_dir / "datasets" / "asvspoof2019" / "PA" / "PA" / "ASVspoof2019_PA_dev" / "flac",
                "eval": base_dir / "datasets" / "asvspoof2019" / "PA" / "PA" / "ASVspoof2019_PA_eval" / "flac",
            },
        ),
    ]

    for dataset_name, protocol_dir, audio_dirs in dataset_roots:
        protocol_map = {
            "train": protocol_dir / f"ASVspoof2019.{dataset_name}.cm.train.trn.txt",
            "dev": protocol_dir / f"ASVspoof2019.{dataset_name}.cm.dev.trl.txt",
            "eval": protocol_dir / f"ASVspoof2019.{dataset_name}.cm.eval.trl.txt",
        }
        for split_name, protocol_path in protocol_map.items():
            if not protocol_path.exists():
                continue
            audio_dir = audio_dirs.get(split_name)
            if audio_dir is None or not audio_dir.exists():
                continue
            for row in parse_asvspoof_protocol(protocol_path, audio_dir):
                records.append(
                    {
                        "source": dataset_name.lower(),
                        "dataset": dataset_name,
                        "speaker": row["speaker"],
                        "label": row["label"],
                        "path": row["path"],
                        "split": split_name,
                        "file": row["file"],
                    }
                )

    for row in _parse_in_the_wild(base_dir):
        records.append(
            {
                "source": "in_the_wild",
                "dataset": "in_the_wild",
                "speaker": row["speaker"],
                "label": row["label"],
                "path": row["path"],
                "split": "eval",
                "file": row["file"],
            }
        )

    manifest = pd.DataFrame(records)
    if manifest.empty:
        raise ValueError("No rows found in dataset manifest.")

    output_dir = base_dir / "manifests"
    output_dir.mkdir(exist_ok=True)
    manifest.to_csv(output_dir / "dataset_manifest.csv", index=False)
    return manifest


def iter_rows_by_split(manifest: pd.DataFrame) -> dict:
    return {
        "train": manifest[manifest["split"] == "train"].reset_index(drop=True),
        "dev": manifest[manifest["split"] == "dev"].reset_index(drop=True),
        "eval": manifest[manifest["split"] == "eval"].reset_index(drop=True),
    }
