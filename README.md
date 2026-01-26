# FairSoil

FairSoil is a decentralized Universal Basic Income (UBI) protocol designed to cultivate a "fair soil" where integrity and honesty are rewarded, rather than short-term exploitation or cost externalization.
The full Japanese version of this README is in `README_ja.md`.

## Documents
- Detailed spec (EN): `docs/spec_en.md`
- Vision details: `docs/vision_en.md`
- Phase2+ ideas: `docs/spec_future_en.md`
- Review bundle (full consolidated master): `docs/review_bundle_en.md`
  - Regenerate: `python scripts/build_review_bundle_en.py`

## Spec Links (By Section)
- Core mechanisms: `docs/spec_en.md#core-mechanisms`
- Accounting rules (Section 0): `docs/spec_en.md#0-2-ledger-classification`
- Consistency rules (R1–R7): `docs/spec_en.md#0-3-consistency-rules-r1r7`
- Treasury income/outflow: `docs/spec_en.md#treasury-income--outflow-reasons`
- Reserves & liabilities: `docs/spec_en.md#reserves--liabilities`
- Evidence handling: `docs/spec_en.md#evidence-handling-policy`
- Audit events: `docs/spec_en.md#audit-events-r7-minimal`
- Scope: `docs/spec_en.md#scope`

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
