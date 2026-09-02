from pathlib import Path

import pytest

from voice_shield.dataset import build_dataset_manifest, parse_asvspoof_protocol


def test_parse_asvspoof_protocol_reads_bonafide_and_spoof_rows():
    protocol = Path(r"F:\VoiceShieldData\datasets\asvspoof2019\LA\LA\ASVspoof2019_LA_cm_protocols\ASVspoof2019.LA.cm.train.trn.txt")
    rows = parse_asvspoof_protocol(protocol, Path(r"F:\VoiceShieldData\datasets\asvspoof2019\LA\LA\ASVspoof2019_LA_train\flac"))
    assert len(rows) > 0
    assert any(r["label"] == "bonafide" for r in rows)
    assert any(r["label"] == "spoof" for r in rows)


def test_build_dataset_manifest_creates_split_records():
    manifest = build_dataset_manifest()
    assert len(manifest) > 0
    assert {"source", "speaker", "label", "path"}.issubset(manifest.columns)


def test_invalid_audio_files_are_skipped(monkeypatch, tmp_path):
    protocol = tmp_path / "fake_protocol.txt"
    audio_dir = tmp_path / "audio"
    audio_dir.mkdir()
    valid_path = audio_dir / "good.flac"
    invalid_path = audio_dir / "bad.flac"
    valid_path.write_bytes(b"not-real-audio")
    invalid_path.write_bytes(b"bad-data")
    protocol.write_text("speaker1 good 1 1 bonafide\nspeaker2 bad 2 2 spoof\n", encoding="utf-8")

    real_checker = __import__("voice_shield.dataset", fromlist=["_is_valid_audio_file"])._is_valid_audio_file

    def fake_is_valid_audio_file(path):
        return str(path).endswith("good.flac")

    monkeypatch.setattr("voice_shield.dataset._is_valid_audio_file", fake_is_valid_audio_file)
    rows = parse_asvspoof_protocol(protocol, audio_dir)
    assert len(rows) == 1
    assert rows[0]["file"] == "good"
    assert rows[0]["label"] == "bonafide"
    monkeypatch.setattr("voice_shield.dataset._is_valid_audio_file", real_checker)
