from pathlib import Path


def test_workspace_model_paths_resolve_to_repo_root():
    repo_root = Path(__file__).resolve().parents[1]

    expected_lcnn = repo_root / 'experiments' / 'improved_champion_v2' / 'lcnn.pt'
    expected_wavlm = repo_root / 'experiments' / 'improved_champion_v2' / 'wavlm.pt'
    expected_bilstm = repo_root / 'experiments' / 'improved_champion_v2' / 'bilstm.pt'

    assert expected_lcnn.exists(), 'LCNN checkpoint should exist under the repo workspace.'
    assert expected_wavlm.exists(), 'WavLM checkpoint should exist under the repo workspace.'
    assert expected_bilstm.exists(), 'BiLSTM checkpoint should exist under the repo workspace.'
