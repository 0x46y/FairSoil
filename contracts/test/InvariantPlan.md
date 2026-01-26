# Invariant Test Plan (R1–R7)

This document lists the minimal invariants to test for FairSoil Phase 2. It maps the README rules (R1–R7) to concrete invariant checks that should always hold.

## Core Invariants (R1–R7)

### R1 – Accounting Uniqueness
Any payout must be classified as one of:
- Mint(A/B)
- Treasury Out (A/B)
- Existing balance transfer

**Invariant idea**
- For any settlement event, emitted events must be mutually consistent (no “silent” payouts without Mint/Out/Transfer/Unlock).

### R2 – Treasury Funding Constraint
Treasury can only pay from:
- actual Reserves
- explicit Seigniorage (A)

**Invariant**
- `Treasury_Out_A <= Treasury_In + Seigniorage_A + Reserves_A`
- `Treasury_Out_B <= Reserves_B`

### R3 – No A Burn → B Mint
A burn must not result in B mint outside crystallization.

**Invariant**
- Any B mint must only come from approved paths (e.g., Covenant approval/crystallization).

### R4 – No Double Payout
Same resolution must not pay twice (A + B) unless explicitly capped.

**Invariant**
- For any resolved covenant, `payoutA` and `payoutB` must follow the explicit rule (exclusive or capped).

### R5 – Locked Supply Separation
Locked B should not be counted as circulating supply.

**Invariant**
- `circulatingB == totalB - lockedB` always holds.

### R6 – Future Liability Caps
Advances and deficits must stay within caps.

**Invariant**
- `EA_t <= AdvanceCap_B`
- `DeficitCap_A` constraints enforced

### R7 – Audit Log Completeness
All accounting-critical fields must be observable.

**Invariant**
- `Reserves_A/B`, `Treasury_In`, `Treasury_Out_A/B`, `Seigniorage_A`, `Liabilities` have event-backed updates.

## Extra High-Value Invariants

### Unclaimed UBI Decay
- Claiming partial ranges must not avoid decay.

### Resolve State Machine
- Finalized cannot be reverted.
- Reopen can happen only once.

### Primary ID Guard
- Survival Buffer applies only to the primary address.

## Notes
- Start with correctness-first (even if gas heavy), then optimize.
- Use Foundry fuzz + invariant tests once interfaces stabilize.
