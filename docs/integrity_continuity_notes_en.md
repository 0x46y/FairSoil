# Integrity Continuity Notes

This note captures how FairSoil may evolve Integrity from an address-based score toward continuity tied to ongoing personhood.

## Background

In Phase1, Integrity is mostly accumulated on addresses.  
That is simple for an MVP, but creates long-term issues:

- changing addresses can break continuity
- rebinding the primary address makes score policy ambiguous
- personhood continuity and privacy are hard to balance

## Core problem

The system wants to support both:

- continuity for the same honest person over time
- limited linkability across addresses

## Phase1 status

- score is address-centered
- primary address is the main verified gate
- person-level continuity is not yet implemented

## Future directions

### 1. primary-centered continuity

The simplest next step is to anchor score continuity to the primary address.  
After re-verification and rebinding, some or all of that continuity can move to the new address.

### 2. subjectHash-centered continuity

A more advanced design would track continuity against a personhood subject hash, then project it onto the current active address.

### 3. privacy-preserving attestation

In the long run, continuity should ideally be proven with ZKP / attestation techniques without exposing unnecessary cross-address linkage.

## Things to decide

- the score policy during rebinding
- whether address score and person-level score should remain separate
- which continuity model governance / disputes / UBI should rely on

## What not to do

- do not treat every new address as a completely new person forever
- do not strongly link all addresses by default and destroy privacy
- do not treat Integrity as the sole source of truth
