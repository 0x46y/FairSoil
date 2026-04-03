# FairSoil Review Bundle (EN)

This file bundles the core documents for external review.  
Note: This is a generated bundle (do not edit). Apply changes to the source documents instead.

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
- Phase1 minimal dispute spec: `docs/phase1_minimal_dispute_spec_en.md`
- Phase1 requester protection spec: `docs/phase1_requester_protection_spec_en.md`
- Phase1 minimal scope cut list: `docs/phase1_minimal_scope_cutlist_en.md`
- Adjudication antipatterns: `docs/adjudication_antipatterns_en.md`
- Dispute record publication note: `docs/dispute_record_publication_en.md`
- External explanation note: `docs/external_explanation_notes_en.md`
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

## Source: docs/phase2_migration_map_en.md

# FairSoil Phase2 Migration Map

This document explains how FairSoil is expected to grow from the current Phase1 guarded village into later phases without throwing away the core kernel.

## 1. Core idea

The risk is not “building too much in Phase1.”  
The real risk is hard-coding Phase1 assumptions into the core.

The main assumptions to avoid freezing in place are:

- a single `Temporary Operator`
- a single `Dispute Arbiter`
- a single-village deployment topology

At the same time, FairSoil already has a useful split that supports later migration:

- `Token A / Token B` are separate
- `SoilTreasury` is separate
- `Covenant` is separate
- `APPIOracle` is separate
- `ResourceRegistry` and `CovenantLibrary` are separate
- `disputeResolver` is already a swappable role

## 2. What should carry forward

These are strong candidates for reuse in Phase2:

- `FairSoilTokenA`
- `FairSoilTokenB`
- `SoilTreasury`
- `Covenant`
- `CovenantLibrary`
- `ResourceRegistry`

The goal is to keep these as the shared kernel, while moving governance, adjudication, and village creation into replaceable layers.

## 3. What should be replaced

### 3-1. Temporary Operator -> timelock / governance

Phase1:
- a single owner wallet controls system settings

Phase2:
- move ownership to `timelock + governance`
- treat proposals, votes, queue, and execution as a separate layer

### 3-2. Dispute Arbiter -> external arbiter / jury

Phase1:
- a single dispute role handles `resolve / finalize`

Phase2:
- route high-value disputes to external adjudication, jury, or elected resolver models

The important point is to keep the Covenant state machine and replace the adjudication source.

### 3-3. Single village -> factory-based villages

Phase1:
- one Treasury / one APPI / one Covenant stack

Phase2:
- multiple villages with different parameter sets
- factory-based deployment and registration

## 4. What needs to be added in Phase2

- `VillageFactory`
- village metadata / registry
- village-specific parameter sets
- governance layer
- external arbiter layer

## 5. How this connects to broader goals

Longer-term goals such as:

- multiple villages
- opt-in economic rules
- migration between systems
- negative consumption tax / redistributive treasury logic

do not require discarding Phase1.  
They require moving parameter and authority control out of the single-village bootstrap assumptions.

## 6. Practical rule

Phase1 should be treated as one safe experimental village.  
Phase2 should preserve the kernel while swapping:

- operator -> governance
- arbiter -> external adjudication
- single village -> factory villages

That is the migration path that keeps current work useful instead of disposable.

---

## Source: docs/phase2_parameter_catalog_en.md

# FairSoil Phase2 Parameter Catalog

This document lists the values that should eventually become village-level parameters instead of being treated as one global setup.

## 1. Why this exists

If FairSoil is expected to support multiple villages later, the system needs to distinguish:

- shared kernel logic
- village-specific parameter sets
- governance / operations that can update those parameters

Phase1 still mixes some of these concerns. This catalog is meant to make the future split explicit.

## 2. Parameters already suitable for village-level configuration

### Token A / UBI / APPI

- `DECAY_RATE_PER_SECOND`
- `dailyUBIAmount`
- `maxUbiIncreaseBps`
- `maxUbiDecreaseBps`
- APPI thresholds
- APPI confidence / max reports

### Treasury / governance / crystallization

- `governanceMinTokenB`
- `governanceMinIntegrity`
- `crystallizationRateBps`
- `crystallizationFeeBps`
- `deficitCapA`
- `advanceCapB`

### Covenant / dispute routing

- `disputeResolver`
- `royaltyRouter`

### Library / royalty

- `maxRoyaltyBps`
- `maxRoyaltyAmount`

These are the first parameters that should be treated as village initialization inputs.

## 3. Important constants that may become parameters later

The following are still constants today, but may need to become configurable later:

- `SURVIVAL_BUFFER`
- `ISSUE_INTEGRITY_POINTS`
- `ISSUE_DEPOSIT_BPS`
- `COOLDOWN_DURATION`
- `DEFENSE_QUOTA_MIN_INTEGRITY`
- `DEFENSE_QUOTA_PER_MONTH`
- `SPAM_GUARD_MAX_EXPONENT`
- `JURY_SIZE`
- `JURY_EXPERT_SLOTS`
- `JURY_EXPERT_MIN_INTEGRITY`
- `ROYALTY_DECAY_DURATION`

These do not need to become mutable immediately in Phase1, but they should be tracked as future village-level candidates.

## 4. Deployment direction

The recommended shape is:

1. deploy contracts
2. initialize the village parameter set

This lets the system evolve from:

- `redeploy.sh` + one local village

into:

- `VillageFactory.createVillage(params)` + many villages

without changing the kernel more than necessary.

---

## Source: docs/token_a_calibration_notes_en.md

# Token A Calibration Note (Phase1)

This note explains how to interpret the current `Token A` daily amount and how FairSoil may later calibrate it toward real-world living-cost intuition.

## What it means right now

- The current initial `dailyUBIAmount` is `100 Token A / day`.
- This is a **Phase1 starting parameter for testing the system's behavior**, not a value already calibrated to real minimum living costs.
- Issuance is daily, but claiming can still happen in weekly or monthly batches.

## Why it is not yet tied to real prices

Phase1 is primarily trying to verify that:

- UBI issuance and decay do not break the system quickly
- Treasury and Covenant accounting remain consistent
- disputes do not become structurally unfair to weaker users
- participants can understand the UI and main flows

So the current approach is to **validate the mechanism first and calibrate the absolute amount later**.

## Future calibration direction

Over time, `Token A` is expected to move closer to real living-cost intuition through:

1. `APPI`
   an internal purchasing-power index that adjusts daily distribution levels
2. `Survival Buffer`
   a floor that preserves minimum living space even under decay
3. `Village-specific baseline`
   parameterized starting levels for different villages or local conditions

## What the next stage would need

To calibrate `Token A` more realistically, the project will likely need:

- a minimum food basket
- a minimum housing-burden proxy
- baseline communication and mobility costs
- region-sensitive APPI baselines

## Bottom line

- `100 Token A / day` is not yet a real-world subsistence guarantee.
- It is a Phase1 starting value used to test whether the mechanism behaves safely.
- More realistic price calibration is expected later through `APPI` and `Survival Buffer`.

---

## Source: docs/phase1_threat_model_en.md

# Phase1 Threat Model (EN)

This note explains which kinds of malicious behavior FairSoil Phase1 handles relatively well, and which ones remain weak points.

## 1. Context

Phase1 FairSoil is a guarded MVP with the following properties:

- on-chain payments and escrow are relatively transparent
- Treasury reserves and liabilities are observable
- Covenant payout, royalty, and status transitions are auditable
- but **price fairness** and **off-chain collusion** are not automatically guaranteed

So the main Phase1 threat model is less about simple tampering and more about **market opacity, collusion, and evidence framing**.

## 2. Areas where the system is relatively strong

### 2-1. Simple accounting tampering

It is easier to audit:

- who was paid
- how much was escrowed
- how reserves and liabilities moved
- what royalty split was used

This is stronger than a fully opaque off-chain ledger.

### 2-2. Obvious non-payment or double-payment

If flows go through Covenant and Treasury, the following are easier to detect:

- work was approved but not paid
- a finalized amount was paid twice
- status and actual payout diverge

## 3. Areas where the system is still weak

### 3-1. Hidden markup and kickback pricing

Example:

- an intermediary is secretly aligned with a contractor
- hidden referral fees or kickbacks are embedded in the total price
- the user lacks market intuition and cannot detect overpricing

FairSoil helps with transparency of payment flows, but not yet with **whether the quoted price was fair**.

### 3-2. Collusion and reputation rings

Example:

- a group routes work through each other
- low-value transactions are used to farm Integrity
- reputation is inflated through coordinated behavior

This can create the appearance of honest history without genuine public trust.

### 3-3. Evidence framing attacks

Example:

- only selective evidence is presented
- the written explanation shapes the arbiter's perception
- evidence URIs are technically present but hard to interpret

Even with hashes on-chain, **the framing of evidence** still depends heavily on human review.

### 3-4. Market-opacity exploitation

Example:

- ordinary users do not know the fair market range
- nearby providers share the same gray-market practice
- multiple quotes still converge on inflated norms

In such cases, transparency alone does not remove exploitation.

### 3-5. Dependence on temporary operators

Because Phase1 still uses a `Temporary Operator` and `Dispute Arbiter`, it depends on:

- quality of adjudication
- quality of parameter tuning
- quality of emergency intervention

## 4. Typical malicious patterns

### Pattern A: Kickback pricing

- requester and vendor are secretly linked
- the total quote includes undisclosed referral rent
- the user sees only the top-line number

### Pattern B: Reputation ring

- a cluster creates Covenants for each other
- submits and approves looped work
- Integrity is farmed before approaching real users

### Pattern C: Evidence framing attack

- the hash is real, but the story is manipulated
- order, selection, and presentation distort the arbiter's judgment

### Pattern D: Market opacity

- no clear reference range exists
- users cannot compare similar jobs
- overpricing hides behind ambiguity

## 5. What Phase1 should do about it

### 5-1. Add market transparency, not only accounting transparency

Future UI / protocol work should prioritize:

- structured quote breakdowns
- comparable price ranges for similar jobs
- explicit royalty / referral / fee disclosure
- relationship disclosure among requester / creator / template author

### 5-2. Keep dispute focused on evidence, not price intuition

- disputes should not be resolved purely by "too expensive / too cheap"
- the first question should be what the parties actually agreed to
- price fairness should become a separate audit layer

### 5-3. Do not over-trust Integrity

- Integrity should remain a supporting signal
- it should never outrank evidence and timeline
- reputation-ring warnings should never be treated as proof on their own

### 5-4. Heuristic warnings already implemented in Phase1

The Phase1 operator UI now surfaces **review warnings** for the following concentration patterns:

- the same `creator -> worker` pair appears 3 or more times
- the same two addresses appear repeatedly with reversed `creator / worker` roles
- the same requester repeatedly uses templates from the same template author
- the requester is also the template author

These are not proof of collusion. They are heuristics for review priority only.
Legitimate repeat work and small communities can trigger them, so they must be read together with evidence, price ranges, and related-party disclosures.

### 5-5. Review priority tags already implemented in Phase1

The operator UI also auto-generates review-priority tags from arbiter notes and market checks:

- `Insufficient evidence noted by arbiter.`
- `Resolver plan has no claim summary.`
- `Resolver plan has no requester response summary.`
- `Visible quote total is far from the locked reward.`
- `Reward is well above / below the observed median for this work profile.`

These are not automatic rulings. They are **triage tags** for which records should be reviewed first.
Operationally, the intended review order is:

1. check whether evidence or summaries are missing
2. compare the worker / requester / arbiter records for contradiction
3. see whether price mismatch or market outlier signals are explained by related-party disclosure or market context

## 6. Next design tasks

- add price-range references to the Resource Registry
- add expected effort / breakdown / useful-life metadata to Templates
- show warnings for abnormal profit margins or referral rates
- make related-party disclosure and reputation-ring warnings more structured
- build dispute flows that help arbiters focus on evidence instead of wallet size

## 7. Bottom line

- FairSoil is relatively strong at **making money flows visible**.
- It is still weaker at **making price fairness visible** and **detecting collusion**.
- The main Phase1 risks are not simple bookkeeping fraud, but market opacity, evidence framing, and related-party coordination.

---

## Source: docs/market_vocabulary_en.md

# Market Vocabulary (EN)

This note defines the comparison vocabulary used by Phase1 `Template`, `Covenant`, and `Resource Registry` flows.

The goal is to prevent price baselines from fragmenting due to free-form labels, and to keep range warnings consistent.

## 1. Why this exists

If scope and urgency stay free-form, the same class of work can fragment into labels like:

- `repair`
- `plumbing repair`
- `urgent plumbing`
- `fix pipe`

That breaks comparable ranges.

Phase1 therefore prefers **fixed vocabulary first**, with aliases normalized into standard categories.

## 2. Scope vocabulary

Current standard scopes:

- `general`
- `repair`
- `delivery`
- `audit`
- `tutoring`
- `education-support`
- `care-support`
- `emergency-support`
- `field-ops`

### Operational rule

- Use UI choices first
- Add new scopes only deliberately
- Normalize synonyms into existing scopes when possible

## 3. Material class vocabulary

Current standard material classes:

- `standard`
- `light`
- `specialized`
- `scarce`

### Interpretation

- `standard`
  common tools, consumables, ordinary parts
- `light`
  jobs with unusually low material cost
- `specialized`
  jobs needing specialized parts or equipment
- `scarce`
  regulated, rare, or supply-constrained materials

## 4. Urgency vocabulary

Current standard urgency levels:

- `normal`
- `soon`
- `same-day`
- `emergency`

### Interpretation

- `normal`
  ordinary scheduled work
- `soon`
  accelerated but not critical
- `same-day`
  must be handled on the same day
- `emergency`
  immediate response with high cost of delay

## 5. Hours band

Comparison uses banded time instead of raw hours:

- `0-2h`
- `2-8h`
- `8-24h`
- `24h+`
- `unspecified`

This avoids over-fragmenting the market on tiny differences.

## 6. Current comparison key

Phase1 market baselines are grouped by:

- `scope`
- `urgency`
- `material class`
- `hours band`

So the effective key is:

`scope + urgency + material class + hours band`

## 7. Future extensions

Possible Phase2 dimensions:

- geography / region
- certification level
- equipment class
- regulatory burden
- seasonality

But Phase1 should stay conservative and preserve enough sample size per category.

## 8. Operational guidance

- prefer fixed vocabulary over free text
- handle synonyms through normalization
- use the same table in UI and docs
- avoid adding categories faster than the market can populate them

## 9. Bottom line

- Phase1 prioritizes comparability over expressive labeling
- scope / material / urgency / hours band should stay standardized
- market-baseline quality depends on this shared vocabulary

---

## Source: docs/phase1_identity_integration_en.md

# Phase1 Identity Integration

This note explains how FairSoil Phase1 handles identity today: what is implemented, what is mock-based, and what gets swapped when a real verifier is available.

## Current Phase1 implementation

The Phase1 frontend exposes three routes from `Step 1: Verify this wallet`:

1. World ID
2. ZK-NFC
3. temporary operator mock verification

All three routes converge on `setPrimaryAddress(address,true)`.  
In other words, the current Phase1 identity model is: an external or mock verifier returns success, then the owner/operator updates the primary address.

The current UI also exposes:

- `Active route`
- `World ID mode`
- `ZK-NFC mode`

This keeps local mock, staging-style, and production-style configuration visible without reading environment files.

## Frontend flow

1. The user clicks `Verify this wallet`
2. The frontend POSTs to a same-origin API route
3. That route either returns mock success or relays to an external verifier endpoint
4. On `verified: true`, the frontend sends `setPrimaryAddress`
5. `Verification status` becomes `Verified` in the UI

## Current routes

- World ID: `frontend/src/app/api/worldid/verify/route.ts`
- ZK-NFC: `frontend/src/app/api/zknfc/verify/route.ts`

## Environment variables

### Recommended env patterns

| Pattern | Purpose | World ID mode | ZK-NFC mode | Active route in UI |
| --- | --- | --- | --- | --- |
| local mock | fully local demo / recovery | `mock` | `mock` | `World ID (mock)` |
| staging-like | connect a non-production World ID style flow | `staging` | `disabled` or `remote` | `World ID (staging)` or fallback to ZK-NFC |
| production-like | production-shaped config review | `production` | `disabled` or `remote` | `World ID (production)` or fallback to ZK-NFC |

### 1. Local mock

```env
NEXT_PUBLIC_WORLD_ID_ENVIRONMENT=staging
NEXT_PUBLIC_WORLD_ID_MOCK=true
NEXT_PUBLIC_ZKNFC_MOCK=true
```

This is the simplest setup when:

- you only want to prove the UI flow
- you want `Verify this wallet` to finish without a remote verifier
- you still want the UI to show a stable route label

### 2. Staging-like

```env
NEXT_PUBLIC_WORLD_ID_APP_ID=...
NEXT_PUBLIC_WORLD_ID_ACTION_ID=...
NEXT_PUBLIC_WORLD_ID_ENVIRONMENT=staging
NEXT_PUBLIC_WORLD_ID_MOCK=false
NEXT_PUBLIC_ZKNFC_MOCK=false
WORLD_ID_VERIFY_URL=https://...
NEXT_PUBLIC_ZKNFC_VERIFIER_URL=
```

Use this when:

- you want the UI and route logic to behave like a real World ID integration
- production World ID is not the target yet
- you may still want ZK-NFC disabled for a cleaner test surface

### 3. Production-like

```env
NEXT_PUBLIC_WORLD_ID_APP_ID=...
NEXT_PUBLIC_WORLD_ID_ACTION_ID=...
NEXT_PUBLIC_WORLD_ID_ENVIRONMENT=production
NEXT_PUBLIC_WORLD_ID_MOCK=false
NEXT_PUBLIC_ZKNFC_VERIFIER_URL=https://...
NEXT_PUBLIC_ZKNFC_MOCK=false
WORLD_ID_VERIFY_URL=https://...
```

Notes:
- `WORLD_ID_VERIFY_URL` is preferred for server-side relay
- `NEXT_PUBLIC_WORLD_ID_VERIFY_URL` is still accepted as a fallback
- ZK-NFC currently relays through `NEXT_PUBLIC_ZKNFC_VERIFIER_URL`
- `NEXT_PUBLIC_WORLD_ID_ENVIRONMENT` controls the visible World ID mode label in the UI (`staging` or `production`)
- when `NEXT_PUBLIC_WORLD_ID_APP_ID` and `NEXT_PUBLIC_WORLD_ID_ACTION_ID` are missing, World ID is treated as disabled
- when `NEXT_PUBLIC_ZKNFC_VERIFIER_URL` is empty and `NEXT_PUBLIC_ZKNFC_MOCK=false`, ZK-NFC is treated as disabled
- if both remote routes are disabled, the UI falls back to temporary operator mock verification

## Requirements for real verifier integration

### World ID

At minimum, the route should be able to pass these values to a verifier:

- wallet address
- app id
- action id
- proof
- signal
- nullifier hash

The current UI does not yet implement proof collection via the official SDK.  
So the current route is best understood as the server-side bridge, not the full production World ID flow.

### ZK-NFC

At minimum, the route should pass:

- wallet address
- proof payload or signed attestation if required by the verifier

Again, the current Phase1 implementation focuses on same-origin routing first, not a full proof-generation UX.

## What is enough for Phase1

Phase1 is in a good state if:

- mock verification reaches primary address registration
- a real verifier can be swapped in without changing the page-level UX
- the UI clearly shows `Verified / Not verified yet`
- the UI clearly shows which identity route is active
- the user can continue into UBI claim after verification

When a real verifier becomes available, use `docs/worldid_acceptance_checklist_en.md` to confirm the World ID path end-to-end before changing broader docs or runbooks.

## Not implemented yet

- full World ID SDK proof collection UI
- ZK-NFC proof generation UI
- real Tier 1 / Tier 2 / Tier 3 permission differences
- nullifier separation in production flows
- device binding / re-bind flows
- fully production-confirmed World ID live verification against the final deployment target

## Direction

Phase1 should optimize for one coherent minimum flow:

- press verify in the UI
- switch the backend route between mock and remote verifier
- update the primary address

rather than pretending the full identity stack is already finished.

---

## Source: docs/phase1_dispute_fairness_en.md

# Phase1 Dispute Fairness

This note captures the dispute fairness policy for FairSoil Phase1, especially around the risk that low-balance users may be disadvantaged in disputes.

## Background

The coarse Phase1 simulations suggest:

- no strong evidence yet of immediate UBI-driven inflation collapse
- a more important risk is dispute bias against low-balance participants
- reducing deposits alone is not enough
- adjudication independence and external arbiter direction appear more effective

## Core Phase1 principles

### 1. Wallet size should not directly determine the ruling

Dispute outcomes should not be decided by which side has more Token B.  
Economic conditions may still be used for anti-spam rules and deposit logic, but not as the direct basis for who wins.

### 2. Evidence and timeline come first

The intended review order is:

1. evidence / evidenceUri / evidenceHash
2. procedural consistency
3. timeline
4. malicious history or cooldown state
5. integrity (supporting signal only)

### 3. Integrity is a supporting signal, not absolute truth

Integrity can help, but it is not immune to collusion or reciprocal score inflation.  
Phase1 arbiters should therefore not treat integrity as stronger than direct evidence.

### 4. Defense quota helps access, not automatic winning

Defense quota and virtual stake are meant to let lower-balance users participate in disputes at all.  
They are not meant to auto-bias the final ruling in favor of one side.

## Operational rules for Phase1

- the arbiter should not cite wallet size as the reason for a ruling
- the arbiter should treat evidence and timeline as first-class inputs
- higher-value disputes should route externally when possible
- the UI should keep stating that the review is based on evidence and timeline, not wallet size

### Minimum arbiter review record

Before proposing an outcome, the Phase1 arbiter should leave at least these four fields:

1. `Claim summary`
   What the worker is asking for, including the core payout claim.
2. `Requester response`
   The requester's main counterpoint or procedural response.
3. `Missing evidence / gaps`
   What is still unclear, contradictory, or unsupported.
4. `Recommended payout`
   The proposed worker payout percentage.

This is not meant to be a vague free-text opinion. It is the minimum record needed so that a later reviewer can understand why the proposal was made.

## Phase2 direction

The Phase1 manual arbiter is temporary.  
The intended future direction is:

- external arbiter / jury
- elected arbiter
- routing only higher-value disputes externally first

## What not to do

- do not hard-code a permanent “poor side bonus” on-chain
- do not assume that lower deposits alone make the system fair

## What is good enough for Phase1

- the adjudication principle is visible in the UI
- operators/arbiters have a written review rule
- simulations continue to monitor dispute bias
- the external adjudication socket remains intact

---

## Source: docs/phase1_minimal_dispute_spec_en.md

# Phase1 Minimal Dispute Spec (EN)

This note defines the smallest dispute model that still makes sense for FairSoil Phase1.  
The goal is not to recreate a full legal system, but to reduce non-payment, procedural delay, and low-balance users being forced to surrender.

Related:

- requester-side protection: `docs/phase1_requester_protection_spec_en.md`
- scope cuts: `docs/phase1_minimal_scope_cutlist_en.md`
- dispute record publication: `docs/dispute_record_publication_en.md`

## 1. Positioning

Phase1 dispute is not the center of FairSoil. It supports three core pieces:

- Token A as minimum survival / refusal capacity
- Token B as accumulated work reward
- escrow-backed work agreements

Dispute should therefore remain an **exception path for cases escrow alone cannot absorb**, not an attempt to automate perfect justice.

## 2. What Phase1 should keep

Phase1 only needs these dispute features:

1. the worker can raise an issue  
2. the requester can accept or challenge  
3. a third party can propose an outcome  
4. a separate role can finalize  
5. evidence URL/hash and a short reason can be stored  
6. the audit trail shows who acted, in which role, and what happened  

That is enough to avoid “there is no recourse at all.”

Phase1 should treat requester-side challenge as a **limited misconduct report**, not a full symmetrical counter-claim system.  
See `docs/phase1_requester_protection_spec_en.md`.

## 3. What Phase1 should postpone

### 3-1. Adjudication sophistication

- real external arbiter / jury integration
- elected resolver systems
- complex resolver pool selection
- DAO adjudication

### 3-2. Over-structured dispute UI

- long arbiter review forms
- mandatory multi-field summaries and gaps forms
- heavy review checklists even for small-value cases

### 3-3. Over-automated fairness correction

- permanent on-chain “poor-side bias”
- complex reputation formulas that alter victory odds
- trying to fully compute “who is vulnerable” from on-chain arithmetic

Phase1 works better with **simple procedure + role split + evidence-first review**.

## 4. Minimum inputs

### Worker side

- claim %
- short reason
- evidence URL or hash

### Requester side

- accept or challenge
- if challenging: short reason
- optional evidence URL

### Resolver / finalizer side

- recommended payout %
- short final note

Long-form legal drafting should not be required.

## 5. Deadline rules

Phase1 dispute should not let time become the main weapon.

At minimum:

1. worker issue deadline  
2. requester response deadline  
3. resolver proposal deadline  
4. finalizer confirmation deadline  

If a deadline passes, a default outcome should exist rather than indefinite hanging.

Examples:

- requester does not respond in time  
  -> auto-accept within worker claim range, or auto-escalate to resolver review
- resolver does not act  
  -> temporary split/refund fallback
- finalizer does not act  
  -> auto-confirm proposal or escalate to higher path

## 6. Separate small and large disputes

Small cases:

- short reason
- fewer fields
- shorter deadlines
- lighter hold

Large cases:

- more evidence
- more review
- future routing to external adjudication

Without this split, even winning small disputes can become irrationally expensive.

## 7. Minimum protections against “winning at a loss”

Phase1 dispute should care not only about correctness, but also about **cost ceilings**.

### 7-1. Keep the entry burden low

- no mandatory long-form writing
- short reason + URL should be enough to start

### 7-2. Limit rehearing and repetition

- cap appeals or rehearing to one round
- do not allow endless re-submission of the same conflict

### 7-3. Let challenge carry some cost

- but not so much that low-balance users are shut out
- defense quota and relief paths can remain

### 7-4. Avoid needless long escrow freezes

- dispute should not freeze everything indefinitely
- hold range and duration should be explicit

## 8. Adjudication basis

Phase1 should rank inputs in this order:

1. evidence  
2. procedural consistency  
3. timeline  
4. clear malicious history  
5. integrity as supporting signal  

`wallet size` should not be used as the reason for the result.

## 9. Minimum third-party conditions

Phase1 does not need a full jury system yet.  
But it should still ensure:

1. resolver and finalizer are split  
2. obvious conflicts of interest are avoided where possible  
3. role execution appears in the audit trail  
4. a short reason survives with the ruling  

Third-party legitimacy starts with visible separation and traceability, not branding alone.

## 10. Bottom line

The minimum Phase1 dispute can be summarized like this:

> a party can raise an evidence-backed objection, the other side can respond, and a role-split third party can close the case with a short reason.

That is enough for Phase1. The first goals are:

1. prevent one-sided non-payment  
2. reduce the incentive to stall  
3. avoid crushing the correct side just for disputing

---

## Source: docs/phase1_requester_protection_spec_en.md

# Phase1 Requester Protection Spec (EN)

This note defines the smallest requester-side protection model that fits Phase1 without turning FairSoil into a symmetrical dispute weapon system.

The key idea is:

- keep worker issue as the main remedy path
- give the requester a narrower **misconduct report**
- avoid making both sides equally strong in ways that let the stronger side weaponize procedure

## 1. Core direction

Worker-side issue should remain the main tool for:

- non-payment
- unfair rejection
- agreement breach
- unilateral changes to agreed terms

Requester-side protection should exist too, but not as a full mirror-image counter-suit system.

## 2. What requester protection should cover

The requester-side path should be limited to cases like:

1. `No-show`  
   the worker does not submit by the expected deadline

2. `False submission`  
   the worker claims work was done when it clearly was not

3. `Materially incomplete work`  
   major agreed deliverables are missing, not just subjective dissatisfaction

4. `Procedural failure`  
   repeated failure to respond to required correction or process steps

## 3. What it should not cover

- “I just do not like the result”
- subjective taste differences
- personality judgments
- weakness, slowness, or lack of polish by itself
- vague quality complaints without a procedural or evidence-backed basis

FairSoil should judge **agreement breach and evidence-backed conduct**, not human worth or talent.

## 4. Minimum inputs

Requester-side reporting should stay light:

- `report type`
  - no-show
  - false submission
  - materially incomplete
  - procedural failure
- `short reason`
- `evidence URL` or `evidence hash`
- `requested outcome`
  - refund
  - integrity penalty review
  - cooldown review

## 5. Effects in Phase1

Phase1 should not make this an automatic heavy punishment engine.

Possible outcomes:

1. `Refund`
2. `No reward`
3. `Integrity penalty review`
4. `Cooldown review`

What Phase1 should avoid:

- instant heavy punishment
- one-click bans
- direct punishment for “low skill”
- vague auto-penalties based on subjective disappointment

## 6. Where it sits in the flow

The intended sequence is:

1. worker submits  
2. requester reviews  
3. requester chooses:
   - approve
   - reject
   - challenge / report misconduct
4. only then does third-party review begin if needed
5. resolver / finalizer close the case

So requester protection should remain an **exception path when reject alone is not enough**.

## 7. Why not make it fully symmetrical

Because full symmetry can easily become abusive:

- the requester often controls funding and initiation
- giving both sides equally broad dispute weapons can chill worker participation
- a stronger side can turn procedure itself into pressure

So the better Phase1 model is:

- worker issue for remedy
- requester misconduct report for narrow, evidence-backed protection

## 8. Minimum safety conditions

If requester protection exists at all, Phase1 should keep these constraints:

1. report categories stay narrow  
2. subjective quality claims do not count by themselves  
3. short reason + evidence are required  
4. resolver / finalizer still make the final call  
5. the system does not auto-punish heavily  

## 9. Bottom line

The cleanest Phase1 version is:

> keep worker issue intact, add a narrow requester misconduct report, and restrict it to no-show, false submission, materially incomplete work, and procedural failure.

That gives the requester some protection without turning the protocol into a broad anti-worker pressure system.

---

## Source: docs/phase1_minimal_scope_cutlist_en.md

# Phase1 Minimal Scope Cut List (EN)

This note turns `docs/phase1_minimal_dispute_spec_en.md` into concrete UI/feature cuts for Phase1.  
The goal is to keep FairSoil focused on **decaying money + escrow-backed work + minimal dispute**, instead of letting every future idea leak into the Phase1 surface.

## 0. Core Phase1 priority

Phase1 only needs three things:

1. users can verify and receive UBI  
2. users can create escrow-backed work agreements and complete `create -> submit -> approve`  
3. if something breaks, a minimal `issue / challenge / resolve / finalize` path exists  

Everything beyond that may be useful, but is not a Phase1 survival condition.

## 1. UI areas to de-emphasize now

### 1-1. Full Template Library workflow

Target:

- `frontend/src/app/page.tsx`

Candidates to move deeper:

- `Template ID (optional)`
- `Save template`
- `Record template use`
- `Creator share (bps)`
- template-author royalty detail

Why:

- not required to complete the work agreement lifecycle
- makes first-time creation harder to parse
- repeatedly distracts from the core flow in manual testing

Phase1 treatment:

- keep behind an expandable section or move to operator/dev-only context
- keep in docs, but not as part of the main participant flow

### 1-2. Strong market comparison and pricing analysis in the main flow

Target:

- `frontend/src/app/page.tsx`
- `frontend/src/lib/useCovenantReview.ts`

Candidates to soften:

- comparable agreement warnings
- front-facing market baseline blocks
- large explanations around `scope + urgency + material class + hours band`
- price-heavy review priority tags

Why:

- important as an integrity concern, but not required for create/submit/approve
- too much pricing emphasis can shift disputes toward vague impression rather than evidence

Phase1 treatment:

- keep as operator assistance
- do not let it dominate participant-facing flow

### 1-3. Front-facing external adjudication path

Target:

- `frontend/src/components/WorkAgreementRow.tsx`

Candidates to soften:

- `Open external adjudication`
- strong wording that implies real high-value routing is already live

Why:

- front-loads expectation around functionality that is not yet connected
- users should primarily understand what they can do now

Phase1 treatment:

- keep in docs
- reduce to a note or hide from the main path

## 2. Dispute inputs to simplify

### 2-1. Resolver review form depth

Target:

- `frontend/src/components/WorkAgreementActionPanel.tsx`
- `frontend/src/lib/useDisputeFormState.ts`

Candidates to simplify:

- `Claim summary`
- `Requester response`
- `Missing evidence / gaps`
- `Arbiter evidence URL`
- heavily structured arbiter note forms

Why:

- useful for auditability, but expensive for Phase1 operators
- can turn adjudication quality into a test of who writes longer notes

Phase1 treatment:

- shrink to `recommended payout + short final note`
- keep extra fields optional

### 2-2. Heavy evidence-packet input for every user

Target:

- `frontend/src/components/WorkAgreementActionPanel.tsx`
- `frontend/src/lib/evidencePacket.ts`

Candidates to soften:

- title
- hash
- summary
- context
- requestedOutcome

Why:

- structured packets help, but requiring every field raises procedural cost
- Phase1 should let users start from `reason + sourceUrl`

Phase1 treatment:

- make `reason + sourceUrl` the main entry
- move additional fields behind “add more detail”

## 3. Audit/operator features to push back

### 3-1. Heavy review heuristics

Target:

- `frontend/src/lib/useCovenantReview.ts`
- `frontend/src/app/page.tsx`

Candidates to reduce:

- strong missing-summary warnings
- market anomaly front-facing warnings
- repeated-pair / ring heuristics in prominent locations
- highly composite priority tags

Why:

- useful operationally, but not more important than showing the next required action
- too many heuristics make the system feel discretionary

Phase1 treatment:

- keep:
  - `Needs my action`
  - role labels
  - audit trail

That is enough.

### 3-2. KPI/dashboard analysis surfaces

Target:

- `frontend/src/app/page.tsx`

Candidates to reduce:

- detailed dispute volume warnings
- grouped scope analytics
- market baselines by scope

Why:

- useful for demos and operator analysis
- not essential for user comprehension of “what do I do next?”

## 4. Keep in docs, but do not rush to build

### 4-1. External arbiter / jury / elected resolver

Docs:

- `docs/spec_future_en.md`
- `docs/phase2_migration_map_en.md`

Why:

- strategically important
- not required for Phase1 core operation

### 4-2. Governance / timelock migration

Docs:

- `docs/spec_future_en.md`
- `docs/phase2_migration_map_en.md`

Why:

- important later
- but today, auditable temporary operation matters more

## 5. What Phase1 should definitely keep

### Participant flow

- verify
- claim
- create agreement
- submit work
- approve / reject / cancel

### Dispute flow

- worker issue
- requester accept / challenge
- resolver proposal
- finalizer confirmation

### Supporting UX

- role-aware controls
- `Needs my action`
- `Executed by ... as ...`
- short evidence reference
- short reason

## 6. Implementation priority

### P0

1. de-emphasize template / royalty UI in agreement creation  
2. simplify worker/requester/resolver dispute forms toward `short reason + url + final note`  
3. move external adjudication out of the main UI path  

### P1

4. demote market baseline / comparable agreement features to operator assistance  
5. reduce review priority tags to a small Phase1 set such as `missing evidence` and `needs response`  

### P2

6. split docs more clearly between `core flow` and `future structure`  
7. keep external arbiter / jury / governance primarily in docs until the core flow is stable  

## 7. Bottom line

FairSoil already contains a lot.  
But some future-leaning ideas are beginning to bleed into the Phase1 surface.

So the natural shape is:

- **keep:** decaying money, escrow, minimal dispute, audit trail  
- **de-emphasize:** template / royalty / market analysis / advanced review forms  
- **push back:** external adjudication / jury / governance as live user-facing features

---

## Source: docs/adjudication_antipatterns_en.md

# Adjudication Antipatterns to Avoid (EN)

This note lists the institutional failure modes FairSoil should avoid in dispute and adjudication design.  
The goal is not just to reach correct outcomes, but to avoid procedures that reward deference, delay, or exhaustion tactics.

## Core framing

FairSoil should avoid systems where:

- it is rational to rule in ways that please a superior power rather than the actual parties
- even the correct side loses by having to spend too much time, money, or life opportunity to contest a case
- writing skill, internal politics, or wallet size matter more than evidence

Phase1 therefore prioritizes a **minimum procedure that does not crush the weaker side by delay alone**, not a perfect automated justice machine.

## Antipatterns

### 1. Party and judge are effectively the same

- the dispute party and the adjudicator/finalizer are effectively the same role
- the operator adjudicates cases where it has direct stake

Phase1 already separates resolver and finalizer, but **party/adjudicator separation** remains the highest-priority rule.

### 2. Centralized control over adjudicator roles

- one powerful admin can freely appoint and replace resolver/finalizer roles
- adjudicators feel they will be removed if they rule against “the top”

That breaks neutrality even if the UI still looks formal.

### 3. Outcome without reasons

- a result is issued without leaving what evidence, timeline, or procedure was reviewed
- later reviewers cannot reconstruct why the ruling happened

At minimum, FairSoil should retain evidence references, timeline context, and a short reason in the audit trail.

### 4. Delay becomes a source of leverage

- deadlines are vague
- non-response and stalling become negotiation power

Response, proposal, and finalize windows should be bounded so time is not the strongest weapon.

### 5. Dispute is too expensive to use

- even the correct side is better off surrendering than contesting
- small disputes require heavyweight process

Small cases should remain light. Larger or riskier cases can bear heavier review.

### 6. Writing skill dominates the result

- long-form legalistic drafting gives strong advantage
- “who can write better” matters more than evidence

FairSoil should not recreate courtroom-grade writing contests.  
`short reason + evidence URL/hash + timeline` is enough for Phase1.

### 7. Wallet size becomes justice

- deposits and stake requirements remove low-balance users’ voice
- who has more assets affects the ruling itself

Balance can affect anti-spam logic, but not the substance of the ruling.

### 8. Hidden black-box discretion

- no one can tell why one outcome happened instead of another
- similar cases drift with no way to detect it

FairSoil should prefer visible auditability over opaque sophistication.

### 9. Fake third-party neutrality

- the system claims “random” or “jury” review, but in practice keeps selecting the same cluster of people
- the participant pool is tiny but the system pretends to be neutral

When the candidate pool is small, **conflict exclusion and visible logs** can matter more than nominal randomness.

### 10. Too many exceptions, everything becomes discretion

- rules are overshadowed by one-off judgment
- operator discretion overrides transparent procedure

Simple, explicit procedure is usually safer than over-modeling “perfect fairness.”

### 11. Endless appeals and overwrite loops

- a settled case can be reopened repeatedly
- the losing side can keep exhausting the other side

Appeals and rehearing paths need narrow limits and clear end conditions.

### 12. Small and large disputes treated with equal weight

- every case becomes full adjudication
- low-value cases still demand expensive process

FairSoil should not become a “litigate everything” protocol.

## Minimum Phase1 principles

For Phase1, the following are enough:

- rulings are based on `evidence / timeline / procedure`, not wallet size
- resolver and finalizer are split
- reasons and logs are retained
- deadlines exist
- small disputes do not become disproportionately expensive

Phase1 is not a complete independent justice system.  
It is a **minimum defensive layer against one-sided non-payment and procedural abuse**.

## Phase2 and beyond

These matter, but are not required for Phase1:

- external arbiter / jury routing
- elected resolvers
- formal resolver/finalizer selection systems
- timelock / governance migration of role control
- high-value dispute routing

## Bottom line

FairSoil does not need to automate perfect justice first.  
It needs to preserve three things first:

1. parties and adjudicators should not blur together too much  
2. delay alone should not crush the weaker side  
3. later reviewers should be able to see why the outcome happened

---

## Source: docs/dispute_record_publication_en.md

# Dispute Record Publication Design (EN)

This note explains how FairSoil should design dispute records for publication and export.  
The goal is not to turn FairSoil into a final court, but to make disputes harder to hide, harder to rewrite later, and easier to carry into outside systems when necessary.

## 1. Core framing

FairSoil disputes should not be fully sealed inside a black box.  
At the same time, they should not default to always-on public shaming.

The key properties are:

1. verifiable  
2. portable  
3. traceable over time  

In other words, FairSoil should function as a **record layer**, not just as a decision button.

## 2. Why publication design matters

Real disputes and legal conflicts often fail because:

- records are scattered
- it is hard to reconstruct who said what
- narratives are edited later
- one side controls communication, media access, or organizational leverage

If FairSoil makes dispute records easier to structure and export, it can weaken one-sided information control.

## 3. Minimum record fields

Each dispute should retain at least:

- `timestamp`
- `actor`
- `role`
- `action`
  - issue
  - accept
  - challenge / misconduct report
  - proposal
  - finalize
- `short reason`
- `evidence reference`
  - URL
  - hash
  - packet
- `outcome`
  - payout
  - refund
  - penalty candidate
  - finalized status

## 4. Use layered visibility, not instant full publicity

FairSoil should use staged visibility:

### Level 1: detailed party view

- full detail for the parties and adjudicators

### Level 2: public-safe summary

- a shareable short summary
- strip unnecessary personal or sensitive data

### Level 3: export packet

- suitable for:
  - real courts
  - legal consultation
  - external adjudication
  - audit/review

## 5. What matters for social sharing

The value is not outrage.  
The value is being able to show:

- what happened
- when it happened
- what evidence was submitted
- how the other side responded
- which role decided what

That means shareable timeline summaries and evidence lists matter more than emotionally optimized copy.

## 6. UI priorities inside FairSoil

To support this design, the product should prioritize:

1. a timeline that reads in plain order  
2. visible role labels  
3. evidence preview (URL / title / hash / summary)  
4. export paths (CSV / markdown / packet)  
5. a public-safe summary format  

## 7. Expected benefits

This can help:

- reduce one-sided suppression of information
- reduce “I said / you said” ambiguity
- improve the quality of later third-party review
- make real-court or outside escalation easier
- weaken the advantage of the side with stronger publicity channels

## 8. Risks to avoid

Publication should not become:

- a shaming culture
- careless exposure of sensitive personal data
- additional pressure that exhausts the weaker side
- a replacement of adjudication by social-media outrage

FairSoil should be a **verification-friendly record device**, not an outrage amplifier.

## 9. Bottom line

FairSoil dispute design is stronger when framed as:

> a system that organizes evidence and sequence, makes suppression harder, and allows escalation outward when needed

rather than:

> a system that fully automates justice

For Phase1, this is already enough:

1. actions can be traced  
2. evidence references survive  
3. roles and outcomes remain visible  
4. records can be exported when necessary

---

## Source: docs/external_explanation_notes_en.md

# External Explanation Notes (EN)

This note lists the points most likely to be misunderstood when explaining FairSoil to outsiders, and suggests language that better matches the current design.

FairSoil is not just a decaying-money experiment, not a full automated court, and not best explained as a political-ideology vehicle.  
At this stage it is better understood as an experimental base layer that combines **minimum refusal power through money design** with **lightweight procedures against one-sided non-payment and information suppression**.

## 1. “Is FairSoil trying to replace courts?”

Misleading version:

- “everything can be judged inside FairSoil”
- “on-chain logic can determine justice by itself”

Better current phrasing:

- FairSoil is a **first-layer dispute and record system**
- heavy or high-stakes cases should still be portable into **real courts, legal advice, or external adjudication**
- it is better framed as a **portable procedure and record base**, not a final court

## 2. “If we add third-party adjudication, is fairness solved?”

Misleading version:

- “third parties are neutral by default”
- “random selection or juries automatically fix the problem”

Better current phrasing:

- third-party review matters, but it does **not** automatically guarantee fairness
- people can forget to respond, make shallow decisions, follow bias, or favor familiar actors
- the real protections are deadlines, visible reasons, conflict exclusion, and auditable records

## 3. “Does Token A already mean real-world subsistence?”

Misleading version:

- “the current UBI already equals a real living minimum”
- “100 Token A / day is a real subsistence guarantee”

Better current phrasing:

- current Token A values are **Phase1 behavioral calibration parameters**
- the present meaning is closer to **partial refusal capacity** than to a finished living-income promise
- realistic living-cost calibration requires later work on funding, prices, supply conditions, and local context

## 4. “Will this just sound ideologically ‘red’ or redistribution-first?”

Misleading version:

- “FairSoil is primarily a political redistribution doctrine”
- “the main point is ideology”

Better current phrasing:

- FairSoil is better explained as a **practical safety layer against one-sided exploitation**
- the point is not value imposition, but preserving **the conditions for honest exchange**
- UBI and dispute mechanisms are practical guardrails, not declarations of a finished utopian society

## 5. “Is FairSoil only about hiring relationships?”

Misleading version:

- “Covenant is enough for all value transfer”
- “FairSoil only needs work agreements”

Better current phrasing:

- Phase1 centers on work agreements because they are high-friction and high-dispute
- longer term, FairSoil also needs lighter value-transfer patterns such as:
  - simple transfer
  - gift
  - reimbursement / shared expense
  - ordinary neighborhood-scale payments

## 6. “If records are easy to share, is this just a shaming system?”

Misleading version:

- “make everything public immediately”
- “social-media exposure is the answer”

Better current phrasing:

- FairSoil should act as a **verification-friendly record device**, not an outrage engine
- publication should be staged:
  - detailed party view
  - public-safe summary
  - export packet
- the value is not emotional escalation, but making later review and outside escalation possible

## 7. A short external description that fits today

One practical summary is:

> FairSoil combines a decaying survival currency, escrow-backed work agreements, and lightweight dispute records to reduce one-sided non-payment and information suppression. It is not a full court replacement; it is a portable procedure and record layer that can connect to outside systems when needed.

## 8. Bottom line

Good external explanation should:

- avoid over-claiming
- stay honest about what is not finished
- still say clearly what present problems the system is trying to reduce

At the current stage, four points matter most:

1. FairSoil is not a court replacement, but a lightweight protective and record layer  
2. Token A is not yet a finished living-income promise  
3. FairSoil is better explained as a practical anti-exploitation guardrail than as a political label  
4. Work agreements are only one transaction type; ordinary transfers and reimbursements are still needed later

---

## Source: docs/identity_nullifier_scope_en.md

# Identity Nullifier Scope

This note defines how FairSoil should scope identity nullifiers: **what each nullifier is unique for**.

## Background

With World ID and future ZK-NFC-style proofs, the system must separate:

- personhood proof
- per-use uniqueness

If nullifier scope is not separated correctly, then:

- claiming UBI once could accidentally block unrelated actions
- voting uniqueness and claim uniqueness get mixed
- unnecessary linkability appears across features

## Core policy

Nullifiers should be separated by **feature / action / epoch**.

## Recommended scopes

### 1. UBI claim nullifier

- Goal: prevent double-claiming within the same claim window
- Example scope:
  - `ubi:day:<dayIndex>`
  - `ubi:epoch:<epochId>`

### 2. Governance vote nullifier

- Goal: ensure one person, one vote per proposal
- Example scope:
  - `vote:proposal:<proposalId>`

### 3. Analytics / attendance / participation nullifier

- Goal: uniqueness for attendance or analytics only
- Example scope:
  - `attendance:event:<eventId>`
  - `analytics:campaign:<campaignId>`

## Phase1 status

Current FairSoil does **not** yet store strict per-feature nullifier scopes on-chain.  
Phase1 is centered on verified primary-address gating, while full nullifier-scope design remains a Phase2 concern.

## Phase2 direction

- define explicit nullifier domains by use case
- separate UBI / voting / analytics actions
- add replay protection via registry or attestation layer if needed

## What not to do

- do not reuse one nullifier domain for both UBI and voting
- do not reuse one personhood proof instance across unrelated policy domains
- do not store cross-purpose linkable data unless strictly necessary

---

## Source: docs/identity_registry_notes_en.md

# Identity Registry Notes

This note outlines the future `IdentityRegistry` / attestation-router style layer that FairSoil will likely need after Phase1.

## Background

Phase1 already routes:

- World ID
- ZK-NFC
- mock verification

through one UI path.  
But today, the flow still collapses directly into `setPrimaryAddress`, without a generalized on-chain record of **which verification route was used**.

## Why it matters

As identity routes grow, the system risks:

- hard-coding verifier-specific logic into UI and operator flows
- blurring which route grants which permissions
- making expiry / revoke / attestation upgrades harder to manage

## Responsibilities

A future registry layer should minimally:

- record which verifier route attested a given address
- store verification level / strength / credential type
- manage expiry and revocation
- provide the basis for primary-address updates

## Minimal interface sketch

- `attestIdentity(address user, bytes32 routeId, bytes32 subjectHash, uint64 expiresAt, bytes metadata)`
- `revokeIdentity(address user, bytes32 routeId, bytes32 reason)`
- `isVerified(address user) -> bool`
- `verificationLevel(address user) -> uint8`
- `verificationRoute(address user) -> bytes32`

## Example route IDs

- `WORLD_ID`
- `ZK_NFC_PASSPORT`
- `ZK_NFC_MNC`
- `MOCK_OPERATOR`

## Relationship to Phase1

Phase1 does not need to implement this registry yet.  
But the frontend and verification routes should avoid blocking this future shape.

The current same-origin verification routes are a good starting point in that sense.

## Phase2 direction

- move from direct `setPrimaryAddress` updates toward registry / attestation-mediated updates
- centralize route-specific policy in one layer
- handle revoke / expiry / upgrade paths in the same place

---

## Source: docs/integrity_continuity_notes_en.md

# Integrity Continuity Notes

This note captures how FairSoil may evolve Integrity from an address-based score toward continuity tied to ongoing personhood.

## Background

In Phase1, Integrity is mostly accumulated on addresses.  
That is simple for an MVP, but creates long-term issues:

- changing addresses can break continuity
- rebinding the primary address makes score policy ambiguous
- personhood continuity and privacy are hard to balance

## Core problem

The system wants to support both:

- continuity for the same honest person over time
- limited linkability across addresses

## Phase1 status

- score is address-centered
- primary address is the main verified gate
- person-level continuity is not yet implemented

## Future directions

### 1. primary-centered continuity

The simplest next step is to anchor score continuity to the primary address.  
After re-verification and rebinding, some or all of that continuity can move to the new address.

### 2. subjectHash-centered continuity

A more advanced design would track continuity against a personhood subject hash, then project it onto the current active address.

### 3. privacy-preserving attestation

In the long run, continuity should ideally be proven with ZKP / attestation techniques without exposing unnecessary cross-address linkage.

## Things to decide

- the score policy during rebinding
- whether address score and person-level score should remain separate
- which continuity model governance / disputes / UBI should rely on

## What not to do

- do not treat every new address as a completely new person forever
- do not strongly link all addresses by default and destroy privacy
- do not treat Integrity as the sole source of truth

---

## Source: docs/grants_onepager_en.md

# FairSoil Grants One-Pager

## What it is

FairSoil is a Phase1 MVP for a fairer economic base:

- `Token A`: a decaying flow token for everyday support and UBI
- `Token B`: a non-decaying asset token for work rewards and value retention
- `SoilTreasury`: reserve / liability / payout logic
- `Covenant`: work agreement, escrow, issue, dispute, and resolution flow

The goal is not just to distribute money.  
It is to support refusal rights, transparent work agreements, and dispute handling that does not collapse into pure wealth advantage.

## What is new

- UBI is modeled through a decaying flow token instead of a plain asset airdrop
- value storage is separated into a different asset layer
- work agreements and dispute handling share one state machine
- the project openly documents its current weakness: low-balance users can still be disadvantaged in disputes

## What already exists

Phase1 already includes:

- Token A / Token B / Treasury / Covenant integration
- UBI claim flow
- escrowed work agreements
- issue / dispute / two-step resolve
- APPI integration
- Resource Registry / Template Library / Royalty Router MVPs
- frontend separation for participant vs operator flows
- Foundry tests, integrated tests, and coarse economic simulations

## What we are validating

Current work is focused on proving that one guarded village can run without breaking:

- reserve coverage
- liabilities vs payouts
- newcomer re-entry
- dispute fairness
- APPI shock handling

## Why grants help

The next highest-value work is:

1. dispute fairness and external arbiter routing
2. production-grade identity flow
3. APPI confidence / oracle hardening
4. governance and Phase2 migration prep

## Why this fits the public goods / grants space

FairSoil is aligned with:

- anti-extraction design
- fair labor coordination
- programmable public support
- reusable public-goods-adjacent primitives

It is not positioned as “finished.”  
It is positioned as an honest, testable Phase1 kernel for a fairer economic coordination layer.

---

## Source: docs/demo_runbook_en.md

# FairSoil 3-Minute Demo Runbook

This is the shortest reliable demo path for hackathons, grant calls, or technical walkthroughs.

## 0. Preconditions

- local Anvil running
- contracts deployed
- `frontend/.env.local` updated
- `npm run dev` already running
- MetaMask connected to the local Anvil wallet
- if you are demoing the real World ID route, keep `docs/worldid_acceptance_checklist_en.md` and `frontend/e2e/manual_wallet_runbook.md` open beside the app

## 1. 30 seconds: what FairSoil is

Say:

- FairSoil is trying to make honesty less costly than exploitation
- `Token A` is the daily bonus / flow token
- `Token B` is the work reward / asset token
- `Covenant` handles agreements, escrow, and disputes

Show:

- hero section
- daily bonus / work rewards / trust score cards

## 2. 45 seconds: participant flow

Say:

- the default view is for everyday participants
- the simple flow is verify -> claim bonus -> create work agreement

Show:

- `Use FairSoil` tab
- claim button
- agreement form

## 3. 45 seconds: agreement settlement

Say:

- the requester escrows the reward
- the worker submits
- the requester approves
- the worker receives `Token B` and integrity

Show:

- `Work agreements`
- submit / approve actions

## 4. 45 seconds: dispute flow

Say:

- work disagreements can become issues, then disputes
- resolution is two-step in Phase1
- Phase1 uses temporary resolver and finalizer roles, Phase2 is expected to support external adjudication
- the intended basis is evidence and timeline, not wallet size

Show:

- dispute track
- structured evidence fields
- recent activity entries

## 5. 30 seconds: transparency and self-disclosure

Say:

- the UI exposes treasury, agreement, and dispute activity
- the audit trail shows who executed an action and under which temporary role
- the team ran coarse simulations
- the current main concern is dispute fairness, not immediate UBI inflation collapse

Show:

- `Recent activity`
- MVP note in the hero

## 6. 30 seconds: what funding would support

Say:

- external arbiter / jury routing
- identity flow hardening
- APPI confidence improvements
- governance / factory / parameter-set migration

## Closing line

> FairSoil is not just a UBI app.  
> It is an attempt to combine survival support, transparent work agreements, and fairer dispute handling in one Phase1 protocol kernel.

## If the demo uses the real World ID path

- confirm the env matches the target route before the call
- use `docs/worldid_acceptance_checklist_en.md` for the happy-path acceptance sequence
- use `frontend/e2e/manual_wallet_runbook.md` for the MetaMask-backed local flow
- use `frontend/e2e/worldid_production_cutover_checklist.md` if you are switching from staging or mock assumptions to production credentials

---

## Source: docs/grants_use_of_funds_en.md

# FairSoil Grants Use of Funds

This note is for grant applications that ask how funding would be used.

## Priority 1. Dispute fairness / external arbiter

Goal:
- reduce the structural bias that can disadvantage low-balance users in disputes

Funding use:
- external arbiter / jury routing design
- resolver socket implementation
- dispute UI and evidence-flow improvements
- tests and simulation updates around fairness

## Priority 2. Identity / Sybil resistance

Goal:
- move primary address registration from manual owner action to actual identity flow

Funding use:
- World ID integration hardening
- ZK-NFC / verifier flow
- staged identity UX

## Priority 3. APPI confidence / oracle hardening

Goal:
- strengthen APPI quality and manipulation resistance

Funding use:
- reporter diversity / freshness / confidence logic
- shock testing and fallback logic
- clearer ops guidance for oracle degradation

## Priority 4. Governance / Phase2 migration prep

Goal:
- reduce dependence on a single temporary operator

Funding use:
- parameter-set organization
- timelock / governance migration path
- deploy / init prep for future village factory patterns

## Not the immediate priority

Even with funding, these are not the first targets:

- full multi-village rollout
- full DAO migration all at once
- major cosmetic UX overhauls
- speculative tokenomics expansion

## One-line version

> Funding would be used to improve fairness, identity, APPI hardening, and Phase2 migration readiness, not to inflate the scope of Phase1 prematurely.

---
