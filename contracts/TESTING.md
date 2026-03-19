# FairSoil Contract Testing

Phase1 では、毎回すべてのテストを長時間回すのではなく、目的ごとに分けて確認する。

## What Is Already Covered

| Area | Main file(s) | What is covered |
| --- | --- | --- |
| MVP happy path | `test/FairSoilMVP.t.sol` | Token A claim -> task report -> Token B / integrity update |
| Phase1 integrated loop | `test/Phase1IntegratedFlow.t.sol` | APPI apply -> daily UBI update -> UBI claim -> Covenant approval reward, Token A funded covenant -> crystallization -> template royalty split, delayed settle, dispute finalize settlement, issue acceptance -> appeal covenant replay |
| Covenant core flow | `test/Covenant.t.sol` | create / approve / reject / issue / dispute / resolve / slashing / virtual stake / defense quota |
| Dispute boundaries | `test/DisputeResolutionBoundaries.t.sol` | resolve/finalize state boundaries, double-finalize rejection, proposal update behavior |
| Escrow settlement | `test/CovenantEscrowFlow.t.sol` | A/B escrow release, reject/approve settlement, delayed vs immediate payment modes |
| Token A decay | `test/FairSoilTokenA.t.sol` | primary vs non-primary decay behavior |
| Unclaimed UBI | `test/SoilTreasuryUnclaimedUBI.t.sol` | accrue / claim / post-30-day decay / split-claim anti-bypass |
| APPI oracle + integration | `test/APPIOracle.t.sol`, `test/APPIIntegration.t.sol` | reporting eligibility, duplicate prevention, median, APPI clamp behavior |
| Circuit breaker | `test/CircuitBreaker.t.sol` | limited / halted behavior on APPI, emergency mint, UBI |
| Role separation | `test/RoleSeparation.t.sol` | temporary operator vs dispute arbiter vs participant authorization |
| Resource registry | `test/ResourceRegistry.t.sol` | register / update / tax / buy |
| Template / royalty | `test/CovenantLibrary.t.sol`, `test/RoyaltyRouter.t.sol` | template register/activate/deactivate and royalty routing |
| Score routing | `test/ScoreRouting.t.sol` | approve/reject/cancel score consequences |
| System invariants | `test/Invariant.t.sol` + handlers | accounting, liabilities, escrow balance, status irreversibility, caps, reason routing |

## Test Levels

### 1. Core smoke run

Use this when:
- you changed UI or docs only, but want quick contract confidence
- you changed one small contract flow
- you want a fast sanity check before commit

Recommended contracts:

```bash
cd contracts
forge test --match-contract "FairSoilMVPTest|CovenantTest|SoilTreasuryUnclaimedUBITest|CircuitBreakerTest"
```

### 2. Focused domain run

Use this when:
- you touched one subsystem only
- you want to avoid rerunning unrelated suites

Examples:

```bash
cd contracts
forge test --match-contract CovenantTest
forge test --match-contract CovenantEscrowFlowTest
forge test --match-contract APPIOracleTest
forge test --match-contract ResourceRegistryTest
forge test --match-contract CovenantLibraryTest
```

### 3. Invariant run

Use this when:
- you changed accounting
- you changed escrow or liability logic
- you changed status transitions or caps

```bash
cd contracts
forge test --match-contract FairSoilInvariants
```

This is the highest-value safety run, but also the slowest.

### 4. Full regression run

Use this when:
- you changed shared primitives
- you changed Treasury / Covenant state machine logic
- you are preparing a milestone or PR

```bash
cd contracts
forge test
```

### 5. Pre-merge run

Use this when:
- you touched contracts and want one repeatable command before merge
- you want a balanced run that is stronger than smoke, but more structured than manually remembering suites

```bash
cd contracts
./test-premerge.sh
```

## Suggested Routine

For normal work:

1. Run a focused test for the subsystem you changed.
2. Run the core smoke set.
3. Run invariants only when touching accounting / escrow / dispute logic.
4. Run full regression before milestone or release.

For merge/release candidates:

1. Run the focused suite for what changed.
2. Run `./test-premerge.sh`.
3. Run `forge test` only when shared accounting primitives changed or before milestone tagging.

## Current Priority Gaps

Existing tests are broad already. The next useful additions are:

- targeted UI/E2E scenarios that mirror the participant/operator split in the frontend
- a short frontend-side "pre-demo" command set that developers actually run every time
