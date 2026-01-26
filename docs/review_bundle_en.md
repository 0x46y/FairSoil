# FairSoil Review Bundle (EN)

This file bundles the core documents for external review.

---

## Source: README.md

# FairSoil

FairSoil is a decentralized Universal Basic Income (UBI) protocol designed to cultivate a "fair soil" where integrity and honesty are rewarded, rather than short-term exploitation or cost externalization.

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
Details: `docs/vision.md`

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
Detailed draft specs and future ideas live in `docs/spec_future.md`.

#### 14. Targeted Support for Integrity (Targeted Support for Integrity)
- **Spec:** Users with 30-day average asset balance below a threshold and integrity score above a threshold receive increased next-day distribution. Average balance uses Token A + Token B (Token B at market value). Token B is valued by a 30-day TWAP from decentralized oracles (e.g., Chainlink).
- **Smoothing:** Use moving averages to prevent flash-poverty attacks.
- **Opaque loss definition:** Exclude users who show concentrated, unexplained large transfers/burns outside contracts or verified payments.
- **Publicness determination:** Legitimate spending is unified under publicness scoring for rule templates, combining governance votes with on-chain metrics (usage, challenge rate, decentralization). Start with a minimal metric set and publish results in audit logs.
- **Minimal metric set example:** 30-day unique users, completion rate, dispute rate, rejection rate, top-5 concentration (HHI).
- **Appeal:** Appeals use ZKP evidence and DAO review to protect privacy.
- **Effect:** Avoids subsidizing waste while supporting honest people in hardship; replaces negative income tax/refunds with real-time, zero-admin processing.

#### 15. Investment over Interest (Investment over Interest)
- **Spec:** No passive deposit interest. Instead, stake Token B into specific tasks or R&D (first penguin) and receive outcome rewards or durability royalties.
- **Eligibility:** Only templates with evaluation hash above a minimum threshold and verified integrity history qualify.
- **Risk:** Violations or fraud result in slashing.
- **Effect:** Keeps assets circulating toward social value creation.

#### 16. Integrity-based Advance (Integrity-based Advance)
- **Spec:** Verified participants can receive interest-free advances from the Soil Treasury up to contracted task rewards. Limits scale with integrity score.
- **Tier example:** Initial 10% -> mid 30% -> high 50% -> top 80%.
- **Cap design:** Use a diminishing upper bound to prevent credit inflation.
- **Anti-absconding:** If tasks are not fulfilled, unpaid balances are deducted from future UBI (Token A). The Survival Buffer is exempt, and the deduction rate is dynamically adjusted by unpaid balance, integrity score, and macro indicators, with upper/lower bounds and smoothing.
- **Initial parameter example:** Deduction rate min 5% / max 30% of daily UBI, weekly adjustment, ±5% per week. Unpaid balance cap starts at 120% of contracted reward.
- **Restart limits:** New advances are locked until repayment; World ID prevents evasion.
- **Effect:** Provides baseline credit for newcomers while expanding opportunity based on track record.

#### 17. Resource Quota & Dynamic Pricing (Resource Quota & Dynamic Pricing)
- **Congestion pricing:** Raise return tax rates as demand concentrates for land, water, energy, and other physical resources.
- **Survival quota protection:** Guarantee low-cost minimum use; apply progressive Token B costs to excess.
- **Examples:** Land (minimum housing/farming space), water (basic life usage), energy (minimum lighting/cooking/climate control), communication (data needed for contract participation).
- **Extraction quota rules:** Set quotas based on resource stock and regeneration speed; quota overruns are slashable.
- **Cycle:** Adjust periods by resource type: water/power daily or weekly; fisheries/forestry by breeding/growth cycles, quarterly or yearly.
- **Regeneration incentives:** If maintenance/improvement is proven, reduce taxes or grant Token B rewards.
- **Effect:** Suppresses commons tragedies and "extract-first" behavior while ensuring sustainability.

#### 18. Reciprocal Reinvestment Buffer (Reciprocal Reinvestment Buffer)
- **Spec:** Social Reinvestment contributions are recorded as a persistent "rescue credit." Return rates are graded (discounts) by asset state (active use, staked in rules, long-idle) rather than blanket exemptions.
- **Rescue conditions:** When public criteria apply (healthcare, disasters, caregiving, re-entry), prioritize UBI top-ups or emergency support in proportion to rescue credit.
- **Initial parameter example:** Active use 70% discount, staked 50% discount, long-idle 0% discount. Monthly updates, ±10% per month.
- **Effect:** Reframes reinvestment from "confiscation" into a future backup buffer, strengthening recovery. Use bounds and smoothing to avoid liquidity droughts.

#### 19. Circulation-based Stability (Circulation-based Stability)
- **Spec:** Use circulating supply (unlocked velocity) as the primary stability indicator, not total Token B supply.
- **Separation:** Token B locked in covenants, long-term staking, or durability royalties is excluded from circulation.
- **Effect:** Allows total supply to grow with accumulated infrastructure and know-how while maintaining value stability.

#### 20. Guided Price Corridor (Guided Price Corridor)
- **Spec:** Prices remain free to negotiate, but the system presents a reference price range based on similar past rules and current monetary conditions.
- **Non-binding:** The reference range is informational only; no penalties for deviation.
- **Effect:** Avoids price controls while reducing extreme overpricing or exploitative underpricing.

#### 21. Rest & Disposable Buffer (Rest & Disposable Buffer)
- **Spec:** Contract reward design must include costs for rest, paid leave, and recovery, ensuring disposable buffer as a system assumption.
- **Purpose:** Treat rest as a legitimate cost of human maintenance, not laziness.
- **Effect:** Secures recovery slack without requiring "spend-to-convert" mechanics.

#### 22. Nutrient Return & Inheritance (Nutrient Return & Inheritance)
- **Spec:** Assets marked dormant after long inactivity are gradually returned to the Soil Treasury. Active or rule-locked assets receive discounted return rates; idle assets use the standard rate.
- **Initial parameter example:** Dormancy is 365 days of inactivity; return starts at 0.5% per month and steps up to a 2.0%/month cap.
- **Inheritance rules:** Pre-designated heirs, notifications, grace windows, and reactivation conditions are defined to reduce confiscation perception.
- **Effect:** Prevents dead storage from clogging circulation while preserving intergenerational continuity.

#### 23. Distributed Market Witness (Distributed Market Witness)
- **Spec:** Reward participants who report price/market data used for reference corridors once accuracy is verified.
- **Anti-abuse:** Require multi-source agreement, falsifiability, and mild penalties for bad data.
- **Effect:** Sustains reliable price signals without centralized control.

### Intellectual Property and Contribution
#### 1. First Penguin Protocol (Procedural IP)
- **Spec:** When someone publishes a new procedure (rule template), its evaluation hash rises as it is used successfully for "proper work."
- **Royalty:** When others reference the template in contracts, a portion of fees automatically flows to the originator.
- **Effect:** Creating safer, more efficient procedures becomes a lasting asset (Token B).

#### 2. Lineage & Recursive Royalty (Lineage & Recursive Royalty)
- **Spec:** All templates are checked for similarity at registration; those above a threshold are tagged as forks.
- **Fork return:** Revenue from forked templates automatically returns a portion to the originator.
- **Import return:** Using others' templates as components routes usage fees upstream.
- **Accuracy boost:** Use real usage evidence and evaluation hash in addition to similarity scores.
- **Effect:** Makes theft and wheel-reinvention economically pointless while promoting accumulation.

#### 3. Contributor Shares (Contributor Shares)
- **Spec:** Multi-author templates lock a revenue share distribution at registration.
- **Change rule:** Any change requires signatures from all existing share holders.
- **Effect:** Prevents late, unfair claims and guarantees contribution-based payouts.

#### 4. Anti-Troll & Public Domain (Anti-Troll & Public Domain)
- **Royalty staking:** Require Token B deposits to enable royalties; mass low-value templates become costly.
- **Public domain challenge:** DAO can declare trivial steps public domain. Challenges require staking to deter abuse.
- **Royalty decay:** Pioneer rewards decay over time and eventually return to public domain. Decay speed is governance-adjustable.
- **Distribution cap:** Cap total royalties per task and per template to prevent excessive take by trivial precursors.
- **Effect:** Costs out valueless claims and protects genuine contributions.

### Education and Reskilling
#### 1. Nurture & Reskilling (Nurture & Reskilling)
- **Eligibility:** Use objective signals (automation flags, demand shifts) to prioritize public support without restricting the freedom to try.
- **Outcome-linked funding:** Soil Treasury pre-funds high-cost training; repayment is a capped share of future earnings with exemption rules.
- **Knowledge commons rewards:** When shared procedures/materials lead to real-world success, creators receive ongoing royalties.
- **Effect:** Reduces opportunity loss from industry shifts and high education costs while sustaining re-entry pathways.

### Governance and Audit
#### 1. Rule Debugging Rights and Responsibility (Redefining Integrity)
- **Spec:** Workers can file Issues against employer-provided procedures (rules).
- **Force-execute penalty:** If employers ignore reports and force execution, they assume 100% liability (deposit slashing).
- **Philosophy:** Integrity means transparency, not blind obedience. Refusing unfair orders is counted as honest behavior.

#### 2. Trade-off Governance (Trade-off Governance)
- **Spec:** When proposing changes to minimum living costs or distribution, the system auto-displays simulations of required funding (higher decay) or tolerated inflation (FX impact). Approval requires agreement on the cost.
- **Effect:** Structurally blocks unfunded populist decisions.

#### 3. Continuous Auditability (Continuous Auditability)
- **Spec:** Publish audit logs of core contract state and rule application results.
- **Examples:** Soil Treasury inflows/outflows, Token A distribution, decay rate changes, total advance balances.
- **Auto-checks:** Trigger alerts on deviations or inconsistencies. Thresholds such as +/-20% from the last 30-day average are governance-adjustable.
- **Effect:** Detects implementation drift early and reduces operational risk.

#### 4. Multi-layer Upgradability (Multi-layer Upgradability)
- **Core proxy:** Use proxy pattern for core components (Soil Treasury, distribution logic) to allow logic replacement while preserving data.
- **Standard:** Adopt UUPS for lower execution cost and flexible upgrade rules.
- **Modularization:** Separate surrounding logic (rule validation, resource pricing) into modules for targeted improvements.
- **Timelock:** Require a 30-day waiting period before upgrade execution to allow review and exit.
- **Authority:** Upgrade authority is limited to multisig or DAO decisions by participants above an integrity threshold selected via random sampling.
- **Threshold:** Critical actions require 5 of 9 signatures from selected signers.
- **Selection:** Signers are chosen randomly; thresholds and sampling logic are governance-adjustable.
- **Transparency:** Selection and signatures are recorded in audit logs for public monitoring.
- **Design intent:** Avoid elite fixation and minority suppression, and allow participation beyond strict rational self-governance by using threshold + random sampling and revocable delegation.
- **Anti-collusion posture:** Not full prevention, but raise the cost of bribery/coercion. For high-risk decisions, apply additional defenses (e.g., anonymization, extra review) in stages.
- **Delegation safety:** Delegation is always revocable, and more complex mechanisms are introduced in phases after validation.
- **Threshold flexibility:** Adjust quorum and signer pool by risk level. Routine changes target ~2/3 (e.g., 7 of 11 or 14 of 21), major changes target 2/3-3/4 with longer timelocks, and emergency halts can use 5 of 9.
- **Non-response handling:** Treat non-response as abstention and use alternates to backfill.
- **Abstain and delegate:** Delegation is time-bounded and revocable; abstention is a valid choice.
- **Tiered participation:** Broad participation for high-impact decisions, representative flow plus audit logs for routine changes.
- **Reconsideration triggers:** Allow reconsideration only when new information or material harm is demonstrated.
- **Avoiding asset-only drift:** Prioritize livelihood security, integrity, and procedural legitimacy over pure token value optimization.
- **Participation health:** Treat delegate concentration and participation decline as risks; include decentralization health as a governance KPI.
- **Dynamic adjustment:** These numeric thresholds can be updated via the governance in Spec 2.
- **Migration criteria:** Allow migration only when proxy fixes are impossible (storage collision, base chain disappearance).
- **Migration method:** Publish procedures and enforce timelock and exit rights (Spec 4).
- **Effect:** Balances fixability and transparency for long-term operation.

#### 5. Merit as Rights, not Balances (Merit as Rights, not Balances)
- **Spec:** Even if Token B balances decrease, rights/benefits earned from honest contributions (soft perks such as priority access, discounts, listing order, review priority) are retained.
- **Rights cap:** Benefits are limited to mild priority and must not create exclusive control over decision-making or access.
- **Concentration guard:** Audit and cap excessive accumulation by a single entity; use expiry/decay or time bounds to prevent dominance.
- **Effect:** Preserves reward as trust history rather than raw balance, reducing "spend anxiety."

#### 6. Recency-weighted Authority (Recency-weighted Authority)
- **Spec:** Voting/judging power weights recent activity heavily; legacy score is honor/history with light influence.
- **Activity decay:** Inactivity automatically reduces authority; participation restores it.
- **Authority cap:** Apply upper bounds and cooldowns to avoid outsized influence by any single actor.
- **Effect:** Prevents fixed elites and keeps decisions aligned with current capacity and context.

#### 7. Delegated Claim Guardrails (Delegated Claim Guardrails)
- **Spec:** Delegated claim profiles for Token A must prioritize user rights and safety.
- **Validity:** Delegation has a maximum duration (e.g., 90 days) and expires automatically.
- **Revocation:** Users can revoke or change delegation immediately; veto power always remains with the user.
- **Auditability:** Delegated changes are recorded in audit logs and are third-party verifiable.
- **Scope:** Delegation is limited to claim frequency/caps; destination changes and asset transfers are disallowed.
- **Re-consent:** Granting or renewing delegation requires explicit user consent and re-confirmation.

### Operations and Safety
#### 1. "Sunlight (ZKP)" for Privacy and Deterrence
- **Technical approach:** Use zero-knowledge proofs to record only mathematical evidence that agreed steps A, B, C were followed, without revealing task details.
- **Psychological effect:** Not constant surveillance, but a shield to prove honest behavior when questioned.

#### 2. Circuit Breaker (Circuit Breaker)
- **Spec:** If oracles fail or critical bugs are detected, progressively stop distribution, minting, or recovery functions.
- **Trigger conditions:** Audit log deviation alerts, oracle spikes, or confirmed critical vulnerability reports.
- **Safe-mode operations:** Allow receiving and viewing; restrict high-risk actions like minting and large transfers.
- **Release conditions:** Require governance approval and audited fixes.
- **Effect:** Prevents damage amplification and ensures recovery.

#### 3. Red Team & Bounty (Red Team & Bounty)
- **Spec:** Pay bounties and award integrity score points to vulnerability reporters.
- **Sanctions:** Slash and restrict participants who abuse vulnerabilities.
- **Effect:** Turn attackers into allies and incentivize early discovery.

#### 4. Exit & Migration (Exit & Migration)
- **Spec:** Participants can request asset transfers or evaluation termination at any time.
- **Settlement rules:** Settle outstanding advances, staking, and royalties before allowing transfer of remaining assets.
- **Effect:** Avoids lock-in and supports transparent, healthy participation.

#### 5. Future-facing Transparency (Future-facing Transparency)
- **Spec:** Show forward-looking ranges for return rates, rescue buffers, and expected balances where feasible via dashboards.
- **Non-binding:** Treat projections as estimates with explicit assumptions and drivers.
- **Effect:** Reduces anxiety from "future worsening" and helps planning.

#### 6. Data Minimization and Long-term Privacy (Data Minimization)
- **Spec:** Store minimal permanent data and substitute ZKP proofs wherever possible.
- **Retention policy:** Limit retention for personal data and define deletion/expiration procedures.
- **Effect:** Reduces long-term privacy risks.

#### 7. Treasury Security (Treasury Security)
- **Spec:** Require multisig and timelocks for Soil Treasury authority; prohibit single-key control.
- **Ops rules:** Log critical permission changes; require hardware keys and distributed custody.
- **Effect:** Prevents single points of failure and internal abuse.

#### 8. Oracle Fail-safe (Oracle Fail-safe)
- **Spec:** If CPI/TWAP oracles stop or show anomalies, freeze distribution/minting and auto-switch to last-known or conservative values.
- **Recovery:** Resume only when multiple sources agree and audit logs stabilize.
- **Effect:** Prevents supply runaway from oracle failure.

#### 9. Data Pruning and State Compression (Data Pruning & State Compression)
- **Post-prune verifiability:** Discard raw data after a fixed period, but keep hash chains and summarized ZK proofs so procedural correctness remains verifiable.
- **Data lifecycle:** Keep raw logs short-term (e.g., 90 days), then retain only proof artifacts.
- **Archival role:** Regular users prune for light clients; rewarded indexer nodes (record keepers) retain long-term archives and provide retrieval on demand.
- **Effect:** Prevents unbounded storage growth while keeping devices within a few GB.

#### 10. Non-Interest Financial Loop (Non-Interest Financial Loop)
- **Risk sharing:** Funding projects trades upside distributions for shared slashing risk on failure or fraud.
- **Layered incentives:** Rewards include monetary upside, integrity score boosts (governance influence), and priority access to supported services.
- **Effect:** Eliminates passive interest while encouraging active, reviewed investment behavior.

#### 11. Data Persistence and Freezing (Data Persistence & Freezing)
- **Freeze flag:** Data tied to disputes, serious incidents, or historical value is exempted from automatic pruning.
- **Storage target:** Frozen raw data moves to decentralized long-term storage; hashes remain on-chain permanently.
- **Request and forced freeze:** Users can request preservation with staking; the DAO can force-freeze when concealment or severity is suspected.
- **Abuse controls:** Require minimum escrow and periodic review windows to prevent overuse.
- **Effect:** Preserves long-term evidentiary value for unresolved cases or context-heavy disputes.

## Adoption Path
- **Phased rollout:** Start as regional currency, points, or evaluation system rather than replacing fiat immediately.
- **Small wins:** Build track record in OSS development, cooperatives, disaster relief, and local pilots where transparency and trust matter most.
- **UX first:** Assume World ID and gasless operations to minimize onboarding friction.
- **Real-world integration:** Coordinate physical resources and enforcement through legal oracles and existing institutions.
- **Incumbent conversion:** Encourage participation through contribution-based investment and risk reduction rather than exclusion.

## Tech Stack (Planned)
- **Smart Contracts:** Solidity
- **Development Framework:** Foundry or Hardhat
- **Frontend:** Next.js (React)
- **Blockchain:** Ethereum L2 (Optimism / Polygon)
- **Identity:** World ID SDK

## Minimum Requirements (Planned)
### Users (Light Clients)
- **Device:** Smartphone or low-spec PC
- **Storage:** A few hundred MB to a few GB free space
- **Connectivity:** Intermittent sync-capable network access
- **Verification:** Environment that supports identity checks (e.g., World ID)

### Indexer Nodes (Record Keepers)
- **Uptime:** Always-on, continuously operated
- **Storage:** Capacity for long-term archives
- **Role:** Able to respond to audit and retrieval requests

## Dev Environment (WSL2 + Foundry)
### Prerequisites
- On Windows, use WSL2 (Ubuntu)
- Run commands inside WSL2

### Setup
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Test
```bash
cd /workspaces/FairSoil/contracts
forge test
```


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
Phase2+ ideas live in `docs/spec_future.md`.


---

## Source: docs/vision.md

# FairSoil Vision (Expanded)

This document keeps the broader philosophy and long-term direction,
separated from the current implementation scope in README_ja.md.

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

## Source: docs/spec_future.md

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
