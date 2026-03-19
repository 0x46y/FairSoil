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
