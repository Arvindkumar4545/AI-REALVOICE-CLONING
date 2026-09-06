# VoiceShield AI — Proposed Change Manifest
## Approval-Gated Scope & Impact Assessment

> [!IMPORTANT]
> **Status**: PROPOSED / PENDING APPROVAL.
> None of the files listed below will be edited until the user grants explicit approval for the selected phase/scope.

---

### 1. FRONTEND SCOPE

#### [PROPOSED] `VoiceShieldData/frontend/src/pages/DetectPage.tsx`
- **Change**: Introduce explicit Trust & Assurance Score Card displaying separated `Voice Authenticity` (0-100%), `Conversation Risk` (0-100%), and `Signal Quality` metrics alongside existing 3D visualizations.
- **Reason**: Fulfills Outcome 2 by ensuring human voice callers attempting social engineering are visibly flagged as HIGH RISK without misleading the user that "human = safe".
- **Dependencies**: `detectionStatus.ts`, `Card.tsx`, `Badge.tsx`.
- **Risk**: Very Low (Purely presentation and state mapping).
- **Reversibility**: High (100% reversible git checkout).
- **Scope**: Frontend (P0).

#### [PROPOSED] `VoiceShieldData/frontend/src/components/CallGuardWidget.tsx` [NEW]
- **Change**: Create live `VoiceShield Call Guard` overlay widget showing real-time caller status, progressive risk indicators (Authority, Urgency, Financial Request, OTP), and recommended action badge.
- **Reason**: Fulfills Outcome 3 for real-time operator warning and progressive early threat response.
- **Dependencies**: React 18, Lucide icons.
- **Risk**: Very Low (Self-contained new component).
- **Reversibility**: High (Can delete file without impacting core routes).
- **Scope**: Frontend (P0 / P1).

#### [PROPOSED] `VoiceShieldData/frontend/src/pages/ImpactDashboardPage.tsx` [NEW]
- **Change**: Create dedicated "Fraud Prevention Impact" dashboard displaying real metrics: Calls Analyzed, Suspicious Calls Flagged, Early Warnings Triggered, Average Time-to-Warning, and Operator Interventions.
- **Reason**: Fulfills Outcome 1 measurement requirement without fabricating false percentage reduction claims.
- **Dependencies**: React Router, recharts or existing SVG chart components, `/api/v1/statistics`.
- **Risk**: Very Low (Isolated new view).
- **Reversibility**: High (Delete file and remove route).
- **Scope**: Frontend (P0).

#### [PROPOSED] `VoiceShieldData/frontend/src/pages/TelephonyTrunksPage.tsx` [NEW]
- **Change**: Create PBX / EPABX trunk connector management page showing active SIP trunk statuses (Asterisk, FreePBX, Cisco, 3CX), codec negotiation, and real-time media ingestion health.
- **Reason**: Fulfills Outcome 4 by providing an enterprise interface for telephony administrators.
- **Dependencies**: `/api/v1/investigation/trunks` API.
- **Risk**: Very Low.
- **Reversibility**: High.
- **Scope**: Frontend (P0 / P1).

---

### 2. BACKEND SCOPE

#### [PROPOSED] `VoiceShieldData/backend/src/controllers/detectionController.ts`
- **Change**: Update `processDetectionJob` to evaluate and return structured dual-risk scores (`voiceAuthenticity` vs `conversationRisk`) and progressive early warning sequence metadata.
- **Reason**: Provides contract support for Disaggregated Trust & Assurance without breaking existing frontend types.
- **Dependencies**: `mlService.ts`.
- **Risk**: Low (Maintains backward compatibility by preserving all existing fields in `result`).
- **Reversibility**: High.
- **Scope**: Backend (P0).

#### [PROPOSED] `VoiceShieldData/backend/src/controllers/policyController.ts` [NEW]
- **Change**: Implement policy evaluation endpoint (`/api/v1/policies/evaluate`) matching incoming call risk profiles against organization templates (Bank, Call Center, Telecom, Government).
- **Reason**: Fulfills Outcome 3 & 4 policy-driven containment layer.
- **Dependencies**: Express router, auth middleware.
- **Risk**: Low (New endpoint, does not modify existing routing).
- **Reversibility**: High.
- **Scope**: Backend (P1).

#### [PROPOSED] `VoiceShieldData/backend/src/routes/policy.routes.ts` [NEW]
- **Change**: Mount `/api/v1/policies` in `app.ts`.
- **Reason**: Route handler for organizational policy evaluation.
- **Dependencies**: `policyController.ts`.
- **Risk**: Low.
- **Reversibility**: High.
- **Scope**: Backend (P1).

---

### 3. ML SERVICE SCOPE

#### [PROPOSED] `VoiceShieldData/ml-service/app/asr_engine.py` [NEW]
- **Change**: Add optional, lightweight local speech-to-text adapter (using Vosk or ONNX Whisper-tiny) to transcribe incoming PCM audio buffers into partial text tokens.
- **Reason**: Fulfills Outcome 3 for progressive conversational intent analysis.
- **Dependencies**: Python `vosk` or `faster-whisper` (approval-gated).
- **Risk**: Medium (CPU/RAM overhead during live transcription; must run asynchronously).
- **Reversibility**: High (Self-contained module; ML core audio forensics remain 100% untouched).
- **Scope**: ML Service (P1).

#### [PROPOSED] `VoiceShieldData/ml-service/app/intent_classifier.py` [NEW]
- **Change**: Add linguistic pattern analyzer detecting social engineering markers (Authority claim, Urgency, Coercion, OTP/Financial harvesting).
- **Reason**: Fulfills Outcome 1 & 3.
- **Dependencies**: Python standard library / regex & token matching / lightweight embedding.
- **Risk**: Low.
- **Reversibility**: High.
- **Scope**: ML Service (P1).

> [!NOTE]
> **Strict ML Protection**: No changes to model checkpoints (`models/voiceshield_best/model.pt`), weights, calibration curves (`model_artifacts/calibration.json`), or existing acoustic models (LCNN, BiLSTM, RawNet2, WavLM) are proposed.

---

### 4. DATABASE SCOPE

#### [PROPOSED] `VoiceShieldData/database/migrations/003_policy_profiles.sql` [NEW]
- **Change**: Create `policy_profiles` table storing organization response rules:
  ```sql
  CREATE TABLE IF NOT EXISTS policy_profiles (
    id VARCHAR(64) PRIMARY KEY,
    organization_type VARCHAR(32) NOT NULL, -- 'BANK', 'CALL_CENTER', 'TELECOM', 'GOVERNMENT'
    name VARCHAR(128) NOT NULL,
    rules_json JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```
- **Reason**: Backs dynamic organizational response rules without hardcoding.
- **Dependencies**: PostgreSQL / Resilient in-memory store.
- **Risk**: Very Low (Additive table only; no existing tables modified).
- **Reversibility**: High (`DROP TABLE IF EXISTS policy_profiles;`).
- **Scope**: Database (P1).

---

### 5. TELEPHONY & ADAPTER SCOPE

#### [PROPOSED] `VoiceShieldData/telephony/adapters/sip_bridge_spec.md` [NEW]
- **Change**: Technical integration architecture document detailing PBX/EPABX bridge options:
  - Mode 1: SIPREC Passive Media Forking (Enterprise SBC / Cisco CUBE / Sonus).
  - Mode 2: Asterisk / FreePBX AudioSocket Daemon.
  - Mode 3: WebRTC In-Browser Telephony Bridge.
- **Reason**: Guides real-world telecom deployment without making false universal compatibility claims.
- **Dependencies**: None (Design specification).
- **Risk**: Zero (Documentation only).
- **Reversibility**: High.
- **Scope**: Telephony / Architecture (P0).

---

### 6. DOCUMENTATION & BENCHMARKS

#### [PROPOSED] `VoiceShieldData/MEASURABLE_IMPACT_FRAMEWORK.md` [NEW]
- **Change**: Evaluation methodology detailing pilot A/B testing protocols (Control Group vs VoiceShield Assisted Group) to scientifically measure fraud reduction rate, warning latency, and intervention success.
- **Reason**: Prevents premature or unsubstantiated marketing claims while establishing scientific rigor.
- **Dependencies**: None.
- **Risk**: Zero.
- **Reversibility**: High.
- **Scope**: Documentation (P0).
