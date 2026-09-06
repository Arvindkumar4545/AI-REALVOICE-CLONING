# VoiceShield AI — Frontend Typography Redesign Plan
## Transition from Terminal/Monospace Aesthetic to Modern Enterprise AI Typography

---

### 1. Current Fonts Audit
- **Imported Fonts in `index.html`**:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  ```
- **CSS Family Directives**:
  - `index.html`: `<body class="font-['Outfit',sans-serif] ...">`
  - `index.css`: `body { font-family: 'Inter', 'Manrope', 'Segoe UI', system-ui, sans-serif; }`
  - `tailwind.config.js`: `fontFamily: { sans: ['Inter', 'Manrope', 'Segoe UI', 'system-ui', 'sans-serif'] }`
- **Monospace Mapping**:
  - `tailwind.config.js` does *not* declare `mono`, falling back to unstyled browser monospace (`Courier New` / `Consolas`).

---

### 2. Current Font Usage Analysis
- **Total `font-mono` Occurrences**: **382 instances** across 48 `.tsx` files in `frontend/src`.
- **Misuse of Monospace**:
  - Main Page Titles (e.g. `Fraud Prevention Impact`, `Red Team Simulation Lab`).
  - Navigation links (`VoiceShield AI`, navbar brand).
  - Normal body prose and introductory explanations.
  - Section titles, card headings, and interactive buttons.
  - Descriptions and paragraphs inside cards (e.g. "Forensic acoustic metrics computed on raw signal").
  - Form labels and filter inputs.

---

### 3. Current Problems & Visual Deficiencies
1. **"Developer Terminal / Typewriter" Aesthetic**: The excessive use of monospace font for body text and headers makes the platform look like an unpolished hacker CLI or student hobby project rather than an enterprise security product (e.g., Cloudflare, CrowdStrike, Okta, Datadog).
2. **Poor Prose Legibility**: Monospace fonts inherently possess uneven letter spacing for standard English words, causing high eye fatigue when reading long forensic explanations or compliance reports.
3. **Broken Font Cascade**: `Inter` is referenced in CSS and Tailwind config but was never imported in `index.html`, resulting in unintended system font fallbacks.
4. **All-Caps Monospace Overuse**: Heavy reliance on `uppercase tracking-wider font-mono` throughout headings obscures hierarchical visual priority.

---

### 4. Proposed Font System

#### A. Primary UI & Prose Font: **Inter**
- **Family**: `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Application**: 
  - All body text, descriptions, table cells, form inputs.
  - Navigation bar, menu links, modal headers.
  - Buttons, tooltips, cards, policy rules, and documentation.
- **Visual Feel**: Neutral, ultra-crisp, highly legible, modern enterprise standard.

#### B. Display & Heading Font: **Inter / Manrope**
- **Family**: `'Inter', 'Manrope', sans-serif`
- **Application**:
  - Page Hero titles, H1, H2, H3 headings.
  - Feature cards, KPI headline metrics.
- **Typographic Rules**:
  - Use **Title Case** or **Sentence case** instead of all-caps blocks.
  - Slight negative tracking: `tracking-tight` (`-0.015em` to `-0.025em`) for modern density.
  - Bold weights: 600 (Semibold) to 750 (Bold), avoiding distorted ultra-heavy weights.

#### C. Technical & Data Font: **JetBrains Mono** *(Selectively Scoped)*
- **Family**: `'JetBrains Mono', 'Fira Code', Consolas, monospace`
- **Permitted Uses Only**:
  - SHA-256 evidence hashes (`8e9c...a421`).
  - Session and Request IDs (`req_035d4b...`, `cas_eb7ed...`).
  - Telephony port and IP coordinates (`10.240.12.88:5060`).
  - Acoustic frequency & latency values (`16000Hz`, `452ms`).
  - Raw JSON/Code inspection snippets.
  - Status pill badges (`ACTIVE_INTERCEPT`, `RFC 7866`).

---

### 5. Typographic Scale & Hierarchy

| Role | Font Family | Size | Weight | Tracking | Line Height | Case |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Hero Title** | Inter | 44px - 56px | 800 (Black) | `-0.025em` | `1.1` | Title Case |
| **H1 (Page Titles)** | Inter | 28px - 34px | 700 (Bold) | `-0.02em` | `1.2` | Title Case |
| **H2 (Section Header)** | Inter | 20px - 24px | 700 (Bold) | `-0.015em` | `1.25` | Title Case |
| **H3 (Card Titles)** | Inter | 15px - 17px | 600 (Semibold) | `-0.01em` | `1.3` | Title Case |
| **Body (Prose/Desc)** | Inter | 14px - 15px | 400 - 500 | `0em` | `1.6` | Sentence case |
| **Navigation / CTA** | Inter | 13px - 14px | 500 - 600 | `0em` | `1.4` | Title Case |
| **Technical Data** | JetBrains Mono | 11px - 12px | 500 (Medium) | `+0.02em` | `1.4` | Preserved Case |

---

### 6. Pages & Components Affected

#### Core Pages:
1. `LandingPage.tsx`
2. `DetectPage.tsx`
3. `ImpactDashboardPage.tsx`
4. `TelephonyTrunksPage.tsx`
5. `CallsPage.tsx`
6. `CaseDetailsPage.tsx`
7. `InvestigationDashboardPage.tsx`
8. `RedTeamLabPage.tsx`
9. `ModelsPage.tsx`
10. `SecurityPage.tsx`
11. `FeaturesPage.tsx`
12. `HowItWorksPage.tsx`
13. `AboutPage.tsx`
14. `PoliciesPage.tsx`
15. `AuditLogPage.tsx`
16. `ThreatMapPage.tsx`
17. `VoiceprintsPage.tsx`
18. `DashboardPage.tsx`
19. `HistoryPage.tsx`
20. `PrivacyCenterPage.tsx`
21. `SignInPage.tsx` & `SignUpPage.tsx`

#### Core Components:
1. `Navbar.tsx` (Brand and links)
2. `CallGuardWidget.tsx`
3. `ForensicRadar.tsx`
4. `ExplainableAiCard.tsx`
5. `ModelConsensusCard.tsx`
6. `VoiceContinuityTimeline.tsx`
7. `RiskGauge3D.tsx`
8. `AudioWaveform.tsx`

---

### 7. Dependencies & Performance Impact
- **New NPM Packages**: **ZERO** (No packages to install).
- **Google Fonts Loading**:
  - Replace `Outfit` with `Inter` (weights: 400, 500, 600, 700) + `JetBrains Mono` (weights: 400, 500).
  - Add `display=swap` and `<link rel="preconnect">` for sub-50ms font render.
  - Overall font transfer size reduces from 340KB to ~85KB.

---

### 8. Accessibility & Quality Targets
- **Contrast**: Full compliance with WCAG 2.1 AA (minimum 4.5:1 ratio for body text, 3:1 for large headers).
- **Executive Readability**: Instant scanning by non-technical bank leaders, telecom executives, and investigators without terminal squinting.
- **Preserved Precision**: Hashes and technical coordinates retain clear monospace distinction for operational analysts.
