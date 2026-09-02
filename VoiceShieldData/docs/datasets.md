# VoiceShield Dataset Audit & Leakage Protection

## 1. Audited Datasets on Disk

| Dataset | Total Audio Files | Bona-Fide Count | Spoof Count | Speakers | Audio Formats | Sample Rate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ASVspoof 2019 LA** | 121,461 | 12,483 | 108,978 | 107 | `.flac` | 16,000 Hz |
| **ASVspoof 2019 PA** | 218,430 | 28,890 | 189,540 | 107 | `.flac` | 16,000 Hz |
| **In-The-Wild** | 31,779 | 19,963 | 11,816 | 54 | `.wav` | 16,000 Hz |
| **Total** | **371,670** | **61,336** | **310,334** | **268** | — | — |

---

## 2. Strict Speaker-Disjoint Split Protocol

To prevent optimistic evaluation bias caused by **speaker leakage**, all splits are strictly partitioned by speaker ID:

- **Train Split (ASVspoof LA/PA)**: Speakers 1–20 (Zero overlap with Dev or Eval)
- **Dev Split (Validation)**: Speakers 21–40 (Zero overlap with Train or Eval)
- **Eval Split (In-Domain Test)**: Speakers 41–107 (Zero overlap with Train or Dev)
- **In-The-Wild**: Reserved entirely as an **Out-of-Domain Generalization Benchmark** to measure zero-shot transfer against real-world deepfakes in uncontrolled acoustic environments.

Verification logs are saved in [reports/speaker_leakage_report.json](file:///f:/VoiceShieldData/reports/speaker_leakage_report.json).
