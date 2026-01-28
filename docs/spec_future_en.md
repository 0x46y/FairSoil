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
