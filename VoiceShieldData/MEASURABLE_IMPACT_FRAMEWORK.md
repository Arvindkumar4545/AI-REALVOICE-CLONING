# VoiceShield AI — Measurable Impact Evaluation Framework
## Scientific Protocol for Validating Real-World Fraud Reduction

---

### Executive Principle
**Never claim unsubstantiated fraud reduction statistics** (e.g. *"Reduces fraud by 95%"*) without empirical measurements obtained from controlled, ethical deployment trials. VoiceShield establishes a rigorous measurement methodology for enterprises, financial institutions, and telecom operators.

---

### 1. Controlled Deployment Trial Design (A/B Pilot)

To measure the true efficacy of VoiceShield in preventing voice impersonation and social-engineering fraud, deployments should execute a parallel-cohort trial:

```
                      Incoming Voice Calls (Enterprise / Bank)
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
             Cohort A (Control)                      Cohort B (VoiceShield)
             Existing Security                       VoiceShield AI Layer
                    │                                       │
                    ▼                                       ▼
            Standard Handling                     Real-Time Call Guard
                    │                             (Early Warnings & Policy)
                    ▼                                       ▼
            Incident Tracking                       Incident Tracking
```

- **Cohort A (Control)**: Inbound calls handled according to existing business procedures (standard IVR + human operator intuition).
- **Cohort B (VoiceShield Assisted)**: Inbound calls analyzed concurrently by VoiceShield, providing real-time Trust Scores and progressive Early Warning banners to operators.

---

### 2. Core Quantitative Metrics

| Metric ID | Metric Name | Definition & Formula | Objective |
| :--- | :--- | :--- | :--- |
| **M-1** | **Suspicious Call Detection Rate (SCDR)** | `(Flagged Suspicious Calls / Total Calls Analyzed) * 100` | Triage efficiency baseline |
| **M-2** | **Time-to-Early-Warning (TtW)** | Time in seconds from call commencement to the first warning alert (`URGENCY` or `AUTHORITY`) | Target: < 45 seconds |
| **M-3** | **Intervention Success Rate (ISR)** | `(Prevented Fraud Incidents / Total Flagged Suspicious Calls) * 100` | Measures proactive containment |
| **M-4** | **Operator Verification Escalation Rate** | `(Calls Routed to Step-Up Auth / Total Calls) * 100` | Measures policy adherence |
| **M-5** | **False Positive Rate (FPR)** | `(Legitimate Calls Incorrectly Flagged as Fraud / Total Legitimate Calls) * 100` | Must remain < 3.0% to avoid user friction |
| **M-6** | **False Negative Rate (FNR)** | `(Missed Fraudulent Calls / Total Confirmed Fraud Calls) * 100` | Safety critical: Target < 1.0% |
| **M-7** | **Prevented Loss Value (PLV)** | Total financial exposure associated with transactions halted due to VoiceShield alerts | Direct enterprise ROI |

---

### 3. Data Integrity & Ethical Safeguards
1. **No Defamatory Labeling**: Callers are never labeled "criminals" in logs or UI. Language strictly adheres to: `SUSPICIOUS_ANOMALY`, `HIGH_RISK_INDICATOR`, `INDEPENDENT_VERIFICATION_RECOMMENDED`.
2. **Zero PII Leakage**: Transcripts and evidence logs must strip OTP codes, debit card numbers, and banking PINs before archival.
3. **Reproducible Telemetry**: All impact dashboard metrics must be directly computable from backend database tables (`detection_requests`, `investigation_cases`, `audit_logs`).
