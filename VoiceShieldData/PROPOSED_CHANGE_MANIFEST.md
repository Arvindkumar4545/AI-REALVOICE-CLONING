# VoiceShield AI — Proposed Change Manifest

**Date:** September 4, 2026  
**Status:** PROPOSED & APPROVAL-GATED — NO CODE MODIFIED  
**Rule:** Strict Read-Only Mode Maintained until User Explicitly Approves a Specific Scope.

---

## Change Manifest by Architectural Category

### Group A: Frontend Only
*(Applies only if user approves: `FRONTEND ONLY` or `FULL STACK`)*

1. **FILE:** `frontend/src/pages/CallsPage.tsx`
   - **WHY IT MUST CHANGE:** Connect table rows to real-time audio playback preview and display active trunk metadata cleanly in the light dashboard style.
   - **RISK:** Very Low (UI presentation only).
   - **DEPENDENCIES:** Existing React components.
   - **REVERSIBILITY:** High (Simple Git rollback).

2. **FILE:** `frontend/src/components/VoiceContinuityTimeline.tsx`
   - **WHY IT MUST CHANGE:** Connect timeline to actual streaming detection chunk sequence instead of static mock intervals.
   - **RISK:** Low.
   - **DEPENDENCIES:** Streaming session state.
   - **REVERSIBILITY:** High.

3. **FILE:** `frontend/src/pages/CaseDetailsPage.tsx`
   - **WHY IT MUST CHANGE:** Enhance PDF dossier export layout with verified SHA-256 seal and official chain of custody timeline.
   - **RISK:** Low.
   - **DEPENDENCIES:** `jspdf`.
   - **REVERSIBILITY:** High.

---

### Group B: Backend (Express Gateway)
*(Applies only if user approves: `FRONTEND + BACKEND` or `FULL STACK`)*

1. **FILE:** `backend/src/controllers/detectionController.ts`
   - **WHY IT MUST CHANGE:** Ensure audio file hashes (SHA-256) are calculated synchronously before disk writing and propagate stream metadata to websocket subscribers.
   - **RISK:** Low.
   - **DEPENDENCIES:** `crypto`.
   - **REVERSIBILITY:** High.

2. **FILE:** `backend/src/routes/investigation.routes.ts` & `investigation.controller.ts`
   - **WHY IT MUST CHANGE:** Add server-side dossier verification endpoint and audit log emission on evidence download.
   - **RISK:** Low.
   - **DEPENDENCIES:** `InvestigationRepository`.
   - **REVERSIBILITY:** High.

---

### Group C: Machine Learning Tier
*(Applies only if user approves: `FULL STACK` with explicit ML approval)*

1. **FILE:** `ml-service/app/streaming.py`
   - **WHY IT MUST CHANGE:** Optimize chunk ring-buffer handling to support prolonged calls (>10 minutes) without memory ballooning.
   - **RISK:** Moderate (Streaming session state).
   - **DEPENDENCIES:** `numpy`.
   - **REVERSIBILITY:** High (Unit test guarded).

---

### Group D: Database Tier
*(Applies only if user approves: `FULL STACK` with explicit DB approval)*

1. **FILE:** `database/schema/schema.sql` & `database/migrations/002_telephony_trunks.sql`
   - **WHY IT MUST CHANGE:** Add optional `telephony_trunks` table to record PBX/SBC connector endpoints and SIP trunk health.
   - **RISK:** Low (Additive migration; does not drop or alter existing columns).
   - **DEPENDENCIES:** PostgreSQL.
   - **REVERSIBILITY:** High (`DROP TABLE telephony_trunks`).

---

### Group E: Infrastructure & Telephony Connector
*(Applies only if user approves: `TELEPHONY` or `FULL STACK`)*

1. **FILE:** `VoiceShieldData/telephony-connector/` (NEW Directory & Service)
   - **WHY IT MUST CHANGE:** Provide a decoupled Node.js / Python connector accepting Asterisk / FreeSWITCH / SIPREC audio forks and bridging to `/api/v1/stream/socket`.
   - **RISK:** Low to Core (Runs as an independent isolated service; does not touch core backend/ML).
   - **DEPENDENCIES:** `ws`, audio transcoding utilities.
   - **REVERSIBILITY:** High (Isolated directory).

---

### Group G: Documentation & Audit Records
*(Created during this inspection)*

1. `CURRENT_VOICESHIELD_ARCHITECTURE.md` (Created)
2. `CURRENT_API_CONTRACT_AUDIT.md` (Created)
3. `TELEPHONY_INTEGRATION_FEASIBILITY.md` (Created)
4. `VOICESHIELD_PRODUCT_EVOLUTION_PLAN.md` (Created)
5. `GOVERNMENT_READINESS_GAP_ANALYSIS.md` (Created)
6. `VOICESHIELD_TARGET_ARCHITECTURE.md` (Created)
7. `PROPOSED_CHANGE_MANIFEST.md` (Created)
