# FairSoil

FairSoil is a decentralized Universal Basic Income (UBI) protocol designed to cultivate a "fair soil" where integrity and honesty are rewarded, rather than short-term exploitation or cost externalization.

## Documents
- Detailed spec (JA): `docs/spec_ja.md`
- Detailed spec (EN): `docs/spec_en.md`
- Vision details: `docs/vision_en.md`
- Phase2+ ideas: `docs/spec_future_en.md`
- Review bundle (full consolidated master): `docs/review_bundle_en.md`
  - Regenerate: `python scripts/build_review_bundle_en.py`

## MVP Milestone (Phase 1)
- Date: 2026/01/14
- Completed: End-to-end tests across Token A (decay), Token B (asset), SoilTreasury, and Covenant.
- Verified result: Covenant approvals automatically trigger reward payout and integrity score updates.

## Scope (Phase1 / Phase2+)
**✅ Phase1(MVP) scope (implemented)**
- SoilTreasury (caps, circuit breaker, oracle hooks, UBI ledger, liabilities/reserves)
- TokenA/TokenB (decay/lock/circulating)
- Covenant (payment modes, 2-step resolve)

**🟡 Phase2+ ideas (not implemented)**
- APPI confidence weighting, governance/incentive modules (QF/RPGF/forecasting)
- Additional UX/AI support (off-chain)

## On-chain minimal events (User/Dispute)
- `UBIAccrued(user, day, amountA)`
- `Claimed(user, fromDay, toDay, grossA, decayedA)`
- `DecayApplied(scope, amountA)`
- `CovenantCreated(id, templateHash, parties)`
- `IssueReported(covenantId, issueId, evidenceHash)`
- `Resolved(covenantId, issueId, stage, payoutA, payoutB, integrityDelta, finalizedAt)`

## Accounting audit events (R7 minimal)
- `TreasuryIn(from, amount, reason)`
- `TreasuryOutA(to, amount, reason)`
- `TreasuryOutB(to, amount, reason)`
- `LiabilityChanged(deltaA, deltaB, reason)`
- `ReserveSnapshot(reservesA, reservesB)`

## Vision (Summary)
FairSoil aims to build an economy where honesty is rewarded and exploitation is costly.  
UBI guarantees the freedom to refuse unfair work.  
Details: `docs/vision_en.md`

## Evidence Handling (Policy)
- Evidence is stored off-chain; on-chain only keeps **evidenceHash**.
- evidenceUri is reference-only and kept off-chain to avoid link rot/privacy risk.

## Core Mechanisms

### 1. Dual Token System
- **Token A (Flow):** A "decaying" currency for daily transactions.
  - Distributed daily to all verified humans.
  - Automatically loses value/amount over time (e.g., 30-day half-life) to encourage circulation.
  - **Claim model:** Accrues daily into an unclaimed balance; users can claim in daily/weekly/monthly batches.
  - **Unclaimed decay:** No decay for the first 30 days; normal decay applies from day 31 to discourage long-term hoarding.
  - **Self-limits:** Users can set withdrawal frequency and caps.
  - **Delegated profile:** Allowed only with time limits, user revocation rights, and audit logs.
    - **Guardrails:** Maximum validity window (e.g., 90 days) with automatic expiry.
    - **Guardrails:** The user can revoke or change delegation immediately; veto power always remains with the user.
    - **Guardrails:** Delegated changes are recorded in audit logs and are third-party verifiable.
    - **Guardrails:** Delegation is limited to claim frequency/caps; destination changes and asset transfers are disallowed.
    - **Guardrails:** Granting or renewing delegation requires explicit user consent and re-confirmation.
- **Token B (Asset):** A permanent value store.
  - Earned through high-integrity actions and socially essential contributions.
  - Cannot be obtained through simple hoarding of Token A.

### 2. Integrity-Based Evaluation
- Rewards are based on "integrity" (not just "doing good," but "not cheating").
- Penalizes "cost externalization" (pushing risks/costs onto others).
- Uses Proof of Process to verify that safety and procedural standards were met.

### 3. Sybil Resistance
- Integrated with **World ID** to ensure each participant is a unique human being.

### 4. Dynamic Incentives for Essential Tasks
- Automated reward scaling for emergency, high-risk, or essential tasks (e.g., disaster relief, healthcare) where supply is low.

## Phase2+ Drafts
Detailed draft specs and future ideas live in `docs/spec_future_en.md`.
