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
