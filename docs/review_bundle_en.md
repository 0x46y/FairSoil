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
- Phase2 migration map: `docs/phase2_migration_map_en.md`
- Phase2 parameter catalog: `docs/phase2_parameter_catalog_en.md`
- Token A calibration note: `docs/token_a_calibration_notes_en.md`
- Phase1 threat model: `docs/phase1_threat_model_en.md`
- Market vocabulary: `docs/market_vocabulary_en.md`
- Phase1 identity integration note: `docs/phase1_identity_integration_en.md`
- Phase1 dispute fairness note: `docs/phase1_dispute_fairness_en.md`
- Identity nullifier scope note: `docs/identity_nullifier_scope_en.md`
- Identity registry note: `docs/identity_registry_notes_en.md`
- Integrity continuity note: `docs/integrity_continuity_notes_en.md`
- Grants one-pager: `docs/grants_onepager_en.md`
- 3-minute demo runbook: `docs/demo_runbook_en.md`
- Grants use of funds: `docs/grants_use_of_funds_en.md`
- Review bundle (full consolidated master): `docs/review_bundle_en.md`
  - Regenerate: `python scripts/build_review_bundle_en.py`

## Environment Variables
```
NEXT_PUBLIC_TOKENA_ADDRESS=0x...
NEXT_PUBLIC_TOKENB_ADDRESS=0x...
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_COVENANT_ADDRESS=0x...
NEXT_PUBLIC_RESOURCE_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_COVENANT_LIBRARY_ADDRESS=0x...
NEXT_PUBLIC_WORLD_ID_APP_ID=...
NEXT_PUBLIC_WORLD_ID_ACTION_ID=...
NEXT_PUBLIC_WORLD_ID_ENVIRONMENT=staging
NEXT_PUBLIC_WORLD_ID_MOCK=true
NEXT_PUBLIC_ZKNFC_VERIFIER_URL=https://...
NEXT_PUBLIC_ZKNFC_MOCK=true
NEXT_PUBLIC_AUDIT_DISPUTE_THRESHOLD=5
NEXT_PUBLIC_AUDIT_TREASURY_THRESHOLD=20
NEXT_PUBLIC_AUDIT_RESERVE_A_THRESHOLD=100
NEXT_PUBLIC_AUDIT_RESERVE_B_THRESHOLD=100
NEXT_PUBLIC_AUDIT_WINDOW_HOURS=24
```

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

## Phase1 Roles (Temporary)
- **Temporary Operator:** in Phase1, a temporary operator updates Treasury, APPI, and other system settings.
- **Reward Operator:** `reportTaskCompleted` can be delegated from the treasury owner to approved reward operators.
- **Dispute Resolver / Finalizer:** dispute proposal and dispute finalization are intentionally split into separate temporary roles during Phase1.
- **Identity Operator:** identity routes still converge on `setPrimaryAddress`, which remains a temporary operator step in the current Phase1 model.
- **Positioning:** this is not final DAO governance; it is guarded MVP operation.
- **Future direction:** in Phase2, the temporary operator is expected to move toward timelock + governance, and the dispute resolver/finalizer path toward external adjudication or elected models.

## What Phase1 Already Does
- distributes Token A to verified addresses and supports batched claim flow
- supports Token B escrowed work agreements, submission, approval, rejection, and cancellation
- supports the minimum issue / dispute / proposed / finalized flow
- tracks Treasury reserves, liabilities, and treasury in/out events
- exposes MVP modules such as APPI, Resource Registry, and Template Library

## What Token A Means Right Now
- The current initial value is `100 Token A / day`, with issuance happening on a daily basis.
- This is **a Phase1 starting parameter for validating system behavior**, not a production value already calibrated to real-world subsistence costs.
- Claiming does not have to happen every day; weekly or monthly batching is still valid.
- Over time, `APPI` and `Survival Buffer` are expected to move this closer to real living-cost intuition.
- Details: `docs/token_a_calibration_notes_en.md`

## Phase1 identity integration (minimum)
- `Verify this wallet` currently supports World ID, ZK-NFC, and mock verification routes.
- The UI now surfaces `Active route`, `World ID mode`, and `ZK-NFC mode` so local/mock/staging/production behavior is visible at a glance.
- When a real World ID verifier is available, validate the rollout with `docs/worldid_acceptance_checklist_en.md`.
- The minimum current model is: the route returns success, then the frontend sends `setPrimaryAddress`.
- In local development, `NEXT_PUBLIC_WORLD_ID_MOCK=true` and `NEXT_PUBLIC_ZKNFC_MOCK=true` are enough to test the flow.
- The recommended env patterns are now `local mock`, `staging-like`, and `production-like`.
- Details: `docs/phase1_identity_integration_en.md`

## What Phase1 Does Not Yet Do
- full DAO governance
- production-grade external adjudication
- production identity operations and legal/compliance flow
- multi-village factory rollout

## Current Testing Position
- Foundry coverage exists for the main Phase1 areas, including `FairSoilMVP`, `Covenant`, `CovenantEscrowFlow`, `CircuitBreaker`, `SoilTreasuryUnclaimedUBI`, `ResourceRegistry`, `CovenantLibrary`, `APPIIntegration`, and invariants.
- The current priority is not widening the vision, but proving that one guarded village can run without breaking.
- Frontend work is also focused on participant/operator separation, plain-language guidance, and main-flow clarity.
- A simulation plan exists in `docs/phase1_simulation_plan_ja.md`, with runnable scripts for coarse scenario checks.

## Phase1 Weaknesses Identified So Far
- Coarse simulations do not currently show strong evidence of immediate UBI-driven inflation collapse.
- A more important current risk is **dispute bias against low-balance users**.
- Lowering deposits alone does not seem sufficient; adjudication independence and external adjudication paths appear more promising.
- Phase1 therefore treats the dispute arbiter as a temporary manual role that should prioritize evidence and context over wallet size, with Phase2 expected to move toward external arbiter / jury models.
- These findings are still simulation-level and should continue to be updated with tests and real usage.
- Another major risk area is **hidden markup, market opacity, and collusive reputation farming**. Details: `docs/phase1_threat_model_en.md`
- To keep price comparisons stable, Phase1 now uses fixed vocabulary for scope / material / urgency / hours band. Details: `docs/market_vocabulary_en.md`
- The operator UI now shows **reputation-ring heuristic warnings** such as repeated creator-worker pairs, reciprocal role pairs, and concentrated template-author usage. These are review signals only, not proof.
- The operator UI also shows **review-priority tags** for missing evidence, missing arbiter summaries, and major quote / market mismatches.
- The operator UI includes a **Needs my action** queue and role-aware controls for requester / worker / reward operator / resolver / finalizer actions.
- Dispute and treasury activity now show **Executed by ... as ...** labels in the audit trail to make temporary Phase1 authority visible.

## Phase1 dispute fairness policy
- rulings should be driven by evidence, timeline, and procedure, not wallet size
- integrity is a supporting signal, not stronger than direct evidence
- defense quota improves access to dispute, not automatic winning odds
- before proposing an outcome, the arbiter should leave `Claim summary / Requester response / Missing evidence / gaps / Recommended payout`
- Details: `docs/phase1_dispute_fairness_en.md`

## Identity (experimental core, adoption-friendly entry)
- **Tier 1:** Email / social login for read‑only onboarding
- **Tier 2:** Passkey (device biometrics) for limited access
- **Tier 3:** World ID or ZK‑NFC (government ID NFC proof, e.g., passport IC / My Number) for full benefits
- **Nullifier separation:** distinct nullifiers for UBI / voting / analytics
- **Device binding:** theft resistance with re‑bind on device change
- **Re‑auth conditions:** only on device change, primary address re‑bind, or high‑risk actions (e.g., expanding advance limits)

## Open identity questions
- nullifier scope should be separated by UBI / voting / analytics use case. Details: `docs/identity_nullifier_scope_en.md`
- a future IdentityRegistry-style layer will likely be needed to unify World ID / ZK-NFC / mock routes. Details: `docs/identity_registry_notes_en.md`
- Integrity is still address-centered today; person-level continuity remains unfinished. Details: `docs/integrity_continuity_notes_en.md`

## Operational Notes (Draft)
- Evidence is stored off-chain; on-chain only keeps **evidenceHash**.
- report/dispute records include **evidenceHash** and a short statement; evidenceUri stays off-chain.
- AI summaries are off-chain, used for issue framing only (not decisions).
- Resolve uses two-step finalization and one-time appeal to reduce mistakes.
- **External adjudication plugin:** keep `disputeResolver` as a socket for external services (e.g., Kleros). Start with minimal local operation (single address/limited role) and route high-value disputes to external adjudication.
- **Adjudication principle:** dispute outcomes should be driven by evidence, procedure, and context, not by which side has more money. Economic conditions may still matter for anti-spam rules, but not as a direct basis for favoring one side.
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
  - **ZK‑NFC verifier API (minimal):**  
    - **POST** `ZKNFC_VERIFIER_URL`  
    - **Input (JSON):** `{ "address": "0x..." }`  
    - **Response (JSON):** `{ "verified": true }` or `{ "verified": false, "message": "..." }`  
    - **Note:** on success, call `setPrimaryAddress(address,true)` on-chain

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

Related:
- Phase2 migration map: `docs/phase2_migration_map_en.md`
- Phase2 parameter catalog: `docs/phase2_parameter_catalog_en.md`

## Phase2+ Ideas (Outline)
- APPI confidence weighting (anti-manipulation).
- Additional governance/incentive modules (QF/RPGF, forecasting, etc.).
- Extended UX/AI assist features (off-chain only).

## Phase2+ Ideas (Expanded, English)
### 0) External Arbiter / Jury Socket
- **Goal:** reduce the structural bias that can disadvantage low-balance users in disputes and decouple adjudication from village wealth hierarchies.
- **Background:** coarse Phase1 simulations suggest that reducing deposits alone is not enough; adjudication independence matters more.
- **Direction:** keep `disputeResolver` as a socket that can later route to external adjudication contracts or jury systems.
- **Adjudication principle:** decisions should prioritize evidence, procedural consistency, timeline, and malicious behavior history, not wallet size itself.
- **Minimal interface sketch:**
  - `requestExternalResolution(covenantId, evidenceRoot, metadataUri)`
  - `finalizeExternalResolution(covenantId, workerPayoutBps, integrityPoints, slashingPenalty, rulingHash)`
- **Rollout path:**
  1) Phase1 manual arbiter
  2) Phase2 route only higher-value disputes externally
  3) later expand toward jury / elected arbiter / external protocols
- **Caution:** do not hard-code “poor side always gets a bonus” logic on-chain; that is too easy to game.

### 1) APPI Confidence Weighting
- Add confidence to APPI contributions (e.g., minimum unique reporters, diversity, recency).
- Downweight clustered or correlated reports to reduce price manipulation.
  - **Minimal implementation:** add confidenceBps (0-100%) and maxReportsPerCategory, apply weight to median.

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

### 6) Resource Tax (Harberger) Minimal MVP
- **Goal:** minimal on-chain version of anti-hoarding tax for scarce resources.
- **Minimal spec:** ResourceRegistry registers resource IDs, self-valuation, and tax rate. Owners pay recurring Token B tax via pull-based settlement.
- **Buyout stub:** `buyResource` allows on-chain ownership change at/above valuation (physical enforcement deferred).

### 7) CovenantLibrary (Templates + Royalty)
- **Goal:** share and reuse high-quality covenant templates while rewarding originators.
- **Minimal spec:** template registration (metadataUri/royaltyBps), activation toggle, and royalty calculation.
- **Note:** payout distribution is deferred; record usage via events only.
  - **Ops note:** record template usage via `recordUse` to feed future royalty distribution.
  - **Integration design (minimal auto-distribution):**
    1) At Covenant settlement (`approve`/`resolveDispute`), make payout amount and `templateId` available.
    2) Add a `RoyaltyRouter`-style contract later; Covenant calls `notifyPayout(covenantId, templateId, amountB)`.
    3) Router reads `royaltyBps` from `CovenantLibrary`, computes royalty, and transfers `TokenB` to template creator.
    4) Prevent double payments with `royaltyPaid[covenantId]`.
    5) As a fallback, operators can aggregate events and call `settleRoyalty` manually in early phases.

### 8) Education Support Template (Covenant-based)
- **Goal:** offer deferred-payment education support via Covenant templates.
- **Minimal spec:** provide an education template (metadataUri) and record usage by passing templateId + `recordUse`.
- **Ops:** outcomes/repayment rules start off-chain and can be brought on-chain later.
  - **Ops flow (minimal):**
    1) Register an education template (metadataUri includes scope/term/criteria/repayment rules).
    2) Learner creates a Covenant and passes templateId (`recordUse`).
    3) Progress/outcomes are verified off-chain (submissions/tests/third-party review).
    4) On success, confirm payout/repayment via Covenant settlement.
    5) Repayment automation is added in later phases.

---
