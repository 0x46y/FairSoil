# FairSoil Review Bundle (EN)

This file bundles the core documents for external review.  
Note: This is a generated bundle. The sources are README.md / docs/spec_en.md / docs/vision_en.md / docs/spec_future_en.md.

---

## Source: README.md

# FairSoil

FairSoil is a decentralized Universal Basic Income (UBI) protocol designed to cultivate a "fair soil" where integrity and honesty are rewarded, rather than short-term exploitation or cost externalization.

## Documents
- Detailed spec (JA): `docs/spec_ja.md`
- Detailed spec (EN): `docs/spec_en.md`
- Vision details: `docs/vision_en.md`
- Phase2+ ideas: `docs/spec_future_en.md`
- Review bundle (full consolidated master): `docs/review_bundle_en.md`
  - Regenerate: `python scripts/build_review_bundle_en.py`

## Spec Links (By Section)
- Core mechanisms: `docs/spec_en.md#core-mechanisms`
- Accounting rules (Section 0): `docs/spec_en.md#0-2-ledger-classification`
- Economy & distribution: `docs/spec_ja.md#経済分配`
- IP & contribution: `docs/spec_ja.md#知財貢献`
- Education & reskilling: `docs/spec_ja.md#教育再挑戦`
- Governance & audit: `docs/spec_ja.md#ガバナンス監査`
- Operations & safety: `docs/spec_ja.md#運用安全`
- Adoption path: `docs/spec_ja.md#導入戦略-adoption-path`
- Tech stack: `docs/spec_ja.md#技術スタック予定`
- Minimum requirements: `docs/spec_ja.md#最低要件予定`
- Dev environment: `docs/spec_ja.md#開発環境wsl2--foundry`

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

## Operational Notes (Draft)
- Evidence is stored off-chain; on-chain only keeps **evidenceHash**.
- report/dispute records include **evidenceHash** and a short statement; evidenceUri stays off-chain.
- AI summaries are off-chain, used for issue framing only (not decisions).
- Resolve uses two-step finalization and one-time appeal to reduce mistakes.

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

## Unclaimed UBI Reference (Correctness First)
- **Ledger model:** keep daily buckets `unclaimed[day] = amountA`.
- **Claim processing:** use `age = nowDay - day` and apply decay per day, then sum.
- **Anti-evasion:** decay is applied by issue date, not by split-claims (Spec 3).
- **Optimize later:** use checkpoints or compression only after correctness is proven.

## On-chain / Off-chain Boundary (Minimal)
**On-chain (minimal)**
- Covenant IDs, state transitions (Issue/Dispute/Resolve), payouts, lock/unlock, penalties, reference hashes.

**Off-chain but tamper-evident**
- evidenceUri, summaries, timeline notes, attachments (IPFS etc).

**Off-chain only**
- AI summary generation process, models, prompts (hashes only if needed).

## Vision (Summary)
FairSoil aims to build an economy where honesty is rewarded and exploitation is costly.  
UBI guarantees the freedom to refuse unfair work.  
Details: `docs/vision_en.md`

## Core Mechanisms (Details in docs/spec_en.md)
- This README is an entry point; detailed specs and formulas live in `docs/spec_en.md`.

---

## Source: docs/spec_en.md

# FairSoil Specification (EN)

This document is the English specification summary.  
Full detail currently lives in `docs/spec_ja.md`.

## Core Mechanisms
### Dual Tokens
- **Token A (Flow):** Decaying currency for daily exchange. UBI accrues daily and can be claimed in batches.
- **Token B (Asset):** Non‑decaying asset rewarded for verified contributions and integrity.

### Treasury (SoilTreasury)
- Manages UBI distribution, reward issuance, caps, liabilities, reserves, and audit logs.
- Circuit breaker guards issuance in abnormal conditions.
- APPI oracle hooks for internal purchasing power updates (Phase1 scope).

### Covenant (Escrowed Work)
- Payment modes: Immediate / Escrow / Delayed.
- Issue -> Dispute -> Resolve (two‑step finalize).
- Evidence is off‑chain; on‑chain uses evidence hash only.

## Accounting Rules (Minimal, Hard Constraints)
### 0-2. Ledger Classification
Every value transfer must be classified as Mint/Burn/Transfer/Lock/Unlock.  
**Burn is NOT Treasury income.** Treasury can pay only from:
1) actual reserves, or  
2) explicit Seigniorage (rule-based mint).

### 0-3. Consistency Rules (R1–R7)
R1: Unique accounting paths (no unclassified payouts).  
R2: Treasury outflow must be backed by reserves or explicit mint.  
R3: A burn must not mint B (A->B only via crystallization).  
R4: No double pay.  
R5: Locked B is excluded from circulating supply.  
R6: Deficit/Advance caps enforced.  
R7: Audit logs required (TreasuryIn/Out, Liabilities, Reserves).

## Treasury Income / Outflow Reasons
**Out A:** `UBI`, `UBI_CLAIM`, `DEFICIT`  
**Out B:** `ADVANCE`, `TASK`, `CRYSTAL`  
**In:** `FEE`, `TAX`, `SLASH`, `EXTERNAL`  
**Liabilities:** `ADV_LIAB`, `ADV_SETTLE`, `COV_CREATE`, `COV_SETTLE`

Reason constants are on-chain: `SoilTreasury.REASON_*`.

## Reserves & Liabilities
- **Reserves:** Snapshot via `snapshotReserves()` (weekly / critical events / emergencies).
- **Liabilities:** Updated via `adjustLiabilities(deltaA, deltaB)`.
- **Advance repayment:** `settleAdvanceB(from, amount)` reduces outstanding and liabilities;  
  if `from != 0`, Treasury collects B via `transferFrom`.

## Pre‑check Guards
- `canPayOutA(amount)` and `canPayOutB(amount)` gate UBI / mint / rewards to prevent overspending.

## Evidence Handling (Policy)
- Evidence is stored off‑chain; on‑chain keeps **evidenceHash** only.
- evidenceUri is off‑chain reference to avoid link‑rot/privacy risks.

## Audit Events (R7 Minimal)
- `TreasuryIn`, `TreasuryOutA`, `TreasuryOutB`
- `LiabilityChanged`
- `ReserveSnapshot`

## Scope
Phase1 scope is implemented (Treasury/TokenA/TokenB/Covenant + audit/invariant coverage).  
Phase2+ ideas live in `docs/spec_future_en.md`.

---

## Source: docs/vision_en.md

# FairSoil Vision (Expanded)

This document keeps the broader philosophy and long-term direction,
separated from the current implementation scope in README_ja.md.

Related:
- Japanese vision: `docs/vision_ja.md`
- Japanese spec (full detail): `docs/spec_ja.md`
- English spec (summary): `docs/spec_en.md`

## Guiding Principles
- Honesty and fairness should dominate short-term exploitation.
- Core safety rails must be encoded (accounting rules, auditability, reversibility limits).
- Real-world constraints (law, force, geopolitics) are acknowledged as boundaries.

## Vision Summary (from README_ja.md)
- FairSoil aims to build a base where honesty is rewarded and exploitation is costly.
- UBI provides the right to refuse unfair work without risking survival.
- Socially necessary but hard tasks should be fairly incentivized by dynamic rewards.

## Premises and Design Stance
- Premise: resources and good positions are finite; competition never drops to zero.
- Stance: “the worst people always win” is a rule-design problem, not a law of nature.
- Externalization, information asymmetry, and survival fear are reversed via transparency, cost internalization, and UBI.

## System vs. Law (Boundary)
- Role split: FairSoil records incentives, disputes, and UBI; physical enforcement and property rights remain in real-world institutions.
- Law as oracle: court outcomes can be imported to update scores or state.
  - Only final decisions are accepted; ongoing disputes are held.
  - Format and signature verification are required for ingestion.
- Outcome: avoid dystopian total automation while retaining compatibility with real-world systems.

## Applicability and Limits
- Effective where law and consent function.
- Weak in environments dominated by coercion or force.

---

## Source: docs/spec_future_en.md

# FairSoil Phase2+ Notes

This document captures ideas that are *not* part of the current on-chain scope.
It exists to avoid mixing implemented behavior with future concepts in README_ja.md.

## Phase2+ Ideas (Outline)
- APPI confidence weighting (anti-manipulation).
- Additional governance/incentive modules (QF/RPGF, forecasting, etc.).
- Extended UX/AI assist features (off-chain only).

## Phase2+ Ideas (Expanded, English)
### 1) APPI Confidence Weighting
- Add confidence to APPI contributions (e.g., minimum unique reporters, diversity, recency).
- Downweight clustered or correlated reports to reduce price manipulation.

### 2) Public Goods Funding Modules
- Quadratic Funding (QF) for broad participation.
- Retroactive Public Goods Funding (RPGF) for verified outcomes.

### 3) Forecasting & Early Warning
- Prediction markets or forecast staking for supply chain risks.
- Reward early warnings that later prove correct (not trading profits).

### 4) Insurance and Reinsurance Pools
- Community-level insurance pools for incident risk.
- Reinsurance layer for catastrophic events.

### 5) Compliance Modules (Optional)
- Pluggable compliance adapters for regional requirements.
- Opt-in at community level, not global hard dependency.

---
