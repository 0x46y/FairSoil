# FairSoil Review Bundle (EN)

This file bundles the core documents for external review.  
Note: This is a generated bundle (do not edit). Apply changes to README.md / docs/spec_en.md / docs/vision_en.md / docs/spec_future_en.md.

---

## Source: README.md

# FairSoil

FairSoil is a decentralized Universal Basic Income (UBI) protocol designed to cultivate a "fair soil" where integrity and honesty are rewarded, rather than short-term exploitation or cost externalization.
The full Japanese version of this README is in `README_ja.md`.

## Documents
- Detailed spec (EN): `docs/spec_en.md`
- Vision details: `docs/vision_en.md`
- Phase2+ ideas: `docs/spec_future_en.md`
- Review bundle (full consolidated master): `docs/review_bundle_en.md`
  - Regenerate: `python scripts/build_review_bundle_en.py`

## Spec Links
- Detailed spec (TOC): `docs/spec_en.md`
- Accounting rules (Section 0): `docs/spec_en.md`
- Audit events: `docs/spec_en.md`

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

## Identity (experimental core, adoption-friendly entry)
- **Tier 1:** Email / social login for read‑only onboarding
- **Tier 2:** Passkey (device biometrics) for limited access
- **Tier 3:** World ID or ZK‑NFC (government ID NFC proof, e.g., passport IC / My Number) for full benefits
- **Nullifier separation:** distinct nullifiers for UBI / voting / analytics
- **Device binding:** theft resistance with re‑bind on device change
- **Re‑auth conditions:** only on device change, primary address re‑bind, or high‑risk actions (e.g., expanding advance limits)

## Operational Notes (Draft)
- Evidence is stored off-chain; on-chain only keeps **evidenceHash**.
- report/dispute records include **evidenceHash** and a short statement; evidenceUri stays off-chain.
- AI summaries are off-chain, used for issue framing only (not decisions).
- Resolve uses two-step finalization and one-time appeal to reduce mistakes.
- **External adjudication plugin:** keep `disputeResolver` as a socket for external services (e.g., Kleros). Start with minimal local operation (single address/limited role) and route high-value disputes to external adjudication.
- **Adoption strategy (lightweight entry):** allow “view/try” before verification,
  then unlock benefits by identity tier. Start with practical pain points
  (e.g., attendance proof, local volunteering, anti‑scalping tickets).

## Where the details live
- Event lists, audit events, unclaimed UBI reference, and on/off-chain boundaries are in `docs/spec_en.md`.

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
  - UI note (implementation-aligned): show recent unclaimed days and guide users through
    `accrueUBI` then `claimUnclaimed` for batch claims.
- **Token B (Asset):** Non‑decaying asset rewarded for verified contributions and integrity.
  - **Locking (implementation-aligned):** Covenant escrow calls Treasury `lockB`; locked B cannot transfer
    and is excluded from circulating supply until `unlockB`.

Gas optimization (implementation-aligned): long-running accrual/claim can be chunked via
`accrueUBIBatched` / `claimUnclaimedBatched`.

### Treasury (SoilTreasury)
- Manages UBI distribution, reward issuance, caps, liabilities, reserves, and audit logs.
- Circuit breaker guards issuance in abnormal conditions.
- APPI oracle hooks for internal purchasing power updates (Phase1 scope).

### Circuit Breaker (Minimal, Implementation-aligned)
- **Normal:** UBI accrue/claim, APPI apply, crystallization, rewards operate.
- **Limited:** Stop UBI (claim/accrue/unclaimed) and crystallization; viewing continues.
- **Halted:** Stop UBI, crystallization, and emergency issuance; viewing only.

### Sybil Resistance (Identity)
- **Initial:** World ID for unique human verification.
- **Modularity:** ID verification is pluggable across providers.
- **Tiered identity (implementation direction):**
  - Tier1: Email/social for read‑only onboarding
  - Tier2: Passkey (device biometrics) for limited access
  - Tier3: World ID or ZK‑NFC (government ID NFC proof, e.g., passport IC / My Number) for full benefits
  - **Nullifier separation:** distinct nullifiers for UBI / voting / analytics
  - **Device binding:** theft resistance with re‑bind on device change
  - **Re‑auth conditions:** only on device change, primary address re‑bind, or high‑risk actions (e.g., expanding advance limits)

### Covenant (Escrowed Work)
- Payment modes: Immediate / Escrow / Delayed.
- Issue -> Dispute -> Resolve (two‑step finalize).
- Evidence is off‑chain; on‑chain uses evidence hash only.
  - UX note (implementation-aligned): UI should show the dispute steps
    (Reported → Disputed → Proposed → Resolved) and surface evidence URLs as links.

### Dispute Abuse Mitigation (Implementation Direction)
Prevent post‑delivery “chargeback‑style” abuse without adding heavy user friction.
- **Scope:** applies to Immediate/Escrow. Delayed settlement uses pre‑payment gates instead of holds.
- **Auto‑hold, no instant refund:** when a dispute is opened, auto‑hold **20%–40%** of payout.
- **Short response window:** if no short explanation is provided within **48 hours**, auto‑reject.
- **Auto‑release:** if seller is unresponsive for **48 hours**, auto‑refund part of hold (e.g., **20%**) and release the rest.
- **Evidence is optional but rewarded:** higher refund caps with evidence; lower caps without.
- **Low‑value cap:** small tickets have a **max refund ratio ~30%** to remove full‑refund abuse.
- **History‑aware tuning:** frequent disputers face higher hold / lower caps; repeat‑offender sellers invert the bias.
- **External adjudication plugin:** keep `disputeResolver` as a socket for external services (e.g., Kleros). Start with minimal local operation (single address/limited role) and route high‑value disputes to external adjudication.
- **External adjudication rule (minimal):** route only high‑value disputes to external adjudication; keep low‑value disputes in the internal flow (auto‑hold + refund caps) to control fees.
- **Operational flow (minimal):**  
  1) apply auto‑hold and log reason/evidence presence  
  2) auto‑reject if no added info within **48 hours**  
  3) auto‑refund part of hold if seller is unresponsive for **48 hours**  
  4) route only high‑value disputes to external adjudication  
  5) tighten hold/caps automatically if abuse patterns are detected

### UI/UX Wording Abstraction (Implementation Direction)
To reduce psychological friction, the frontend should use friendly labels while
keeping formal terms for auditability.
- Decay → Expiry / bonus deadline
- Unclaimed Balance → Saved bonus
- Dispute → Support request (Dispute)
- Slashing → Integrity penalty (Slashing)
- Covenant → Work agreement (Covenant)

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
Implementation note: `lockedBalance`, `totalLocked`, and `unlockedBalanceOf` are available on Token B.
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

## Known Limits & Mitigations (Explicit)
These are **not fully solvable**; the goal is to reduce harm, not eliminate it.
- **Oracle problem (real‑world truth):** Full detection is impossible.  
  **Mitigation:** confidence scoring, third‑party corroboration, public audit logs, risk‑based audit priority, and additional evidence for high‑impact cases. The aim is **higher fraud cost**, not perfect justice.
- **Merchant sell pressure:** Incentive to cash out remains.  
  **Mitigation:** phased adoption in closed loops, caps/fees/dynamic tuning on crystallization, and **hold incentives** (B rewards / long‑term royalties).
- **Privacy vs transparency:** More transparency increases surveillance risk.  
  **Mitigation:** ZKP, data minimization/pruning, nullifier separation, evidenceHash‑only on chain, and off‑chain evidence references to reduce long‑term tracking.
- **Dispute cost/latency:** Human adjudication does not scale.  
  **Mitigation:** auto‑resolve for low‑risk cases, escalation only when needed, two‑step finalize, single re‑open window, and standardized acceptance templates to **reduce total adjudications**.

## Sell‑Pressure Mitigation (Concrete Ideas)
Assume merchants want to cash out immediately; design to avoid making that the dominant action.
- **Phase1 scope:** policy/ops guidance only; on‑chain hard rules are limited to crystallization caps/fees/dynamic tuning.
- **Immediate utility:** fee discounts, listing/visibility boosts, or limited credit lines for holders.
- **Delayed rewards:** rewards that increase with holding time (maintenance rewards / durability royalties).
- **Crystallization cost design:** keep A->B conversion non‑profitable vs natural decay, with caps/fees/dynamic tuning.
- **Cool‑downs:** soft limits to avoid concentrated sell waves (exception modes for market stress).
- **Closed‑loop wins:** prioritize use‑cases where fiat settlement is not required at first.

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

## Mimicry Strategy (Strict Kernel, Friendly Shell)
FairSoil keeps strict economic rules in the smart‑contract kernel, while the frontend
uses familiar concepts (points, coupons, support) as an abstraction layer.  
This keeps the core logic uncompromised while letting users experience honest outcomes
through intuitive, everyday interactions.

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
