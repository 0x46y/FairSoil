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
- The minimum current model is: the route returns success, then the frontend sends `setPrimaryAddress`.
- In local development, `NEXT_PUBLIC_WORLD_ID_MOCK=true` and `NEXT_PUBLIC_ZKNFC_MOCK=true` are enough to test the flow.
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
