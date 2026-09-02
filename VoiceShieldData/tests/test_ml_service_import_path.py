import subprocess
import sys
from pathlib import Path


def test_ml_service_can_import_voice_shield_when_run_from_ml_service_dir():
    repo_root = Path(__file__).resolve().parent.parent
    ml_service_dir = repo_root / 'ml-service'

    completed = subprocess.run(
        [sys.executable, '-c', 'import voice_shield'],
        cwd=str(ml_service_dir),
        capture_output=True,
        text=True,
    )

    assert completed.returncode == 0, completed.stderr.strip()
