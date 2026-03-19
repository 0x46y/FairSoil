# Identity Nullifier Scope

This note defines how FairSoil should scope identity nullifiers: **what each nullifier is unique for**.

## Background

With World ID and future ZK-NFC-style proofs, the system must separate:

- personhood proof
- per-use uniqueness

If nullifier scope is not separated correctly, then:

- claiming UBI once could accidentally block unrelated actions
- voting uniqueness and claim uniqueness get mixed
- unnecessary linkability appears across features

## Core policy

Nullifiers should be separated by **feature / action / epoch**.

## Recommended scopes

### 1. UBI claim nullifier

- Goal: prevent double-claiming within the same claim window
- Example scope:
  - `ubi:day:<dayIndex>`
  - `ubi:epoch:<epochId>`

### 2. Governance vote nullifier

- Goal: ensure one person, one vote per proposal
- Example scope:
  - `vote:proposal:<proposalId>`

### 3. Analytics / attendance / participation nullifier

- Goal: uniqueness for attendance or analytics only
- Example scope:
  - `attendance:event:<eventId>`
  - `analytics:campaign:<campaignId>`

## Phase1 status

Current FairSoil does **not** yet store strict per-feature nullifier scopes on-chain.  
Phase1 is centered on verified primary-address gating, while full nullifier-scope design remains a Phase2 concern.

## Phase2 direction

- define explicit nullifier domains by use case
- separate UBI / voting / analytics actions
- add replay protection via registry or attestation layer if needed

## What not to do

- do not reuse one nullifier domain for both UBI and voting
- do not reuse one personhood proof instance across unrelated policy domains
- do not store cross-purpose linkable data unless strictly necessary
