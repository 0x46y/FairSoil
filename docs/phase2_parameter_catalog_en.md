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
