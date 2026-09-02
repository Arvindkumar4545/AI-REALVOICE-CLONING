from pathlib import Path


def test_detect_page_does_not_hardcode_spoof_block_fallback():
    detect_page = Path(__file__).resolve().parent.parent / 'frontend' / 'src' / 'pages' / 'DetectPage.tsx'
    text = detect_page.read_text(encoding='utf-8')

    assert 'risk_score: 83.1' not in text
    assert "prediction: 'SPOOF'" not in text
    assert "decision: 'BLOCK'" not in text
    assert 'payload?.data' in text
    assert 'setError(' in text
