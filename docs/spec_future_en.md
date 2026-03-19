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
