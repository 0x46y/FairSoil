# Phase1 Dispute Fairness

This note captures the dispute fairness policy for FairSoil Phase1, especially around the risk that low-balance users may be disadvantaged in disputes.

## Background

The coarse Phase1 simulations suggest:

- no strong evidence yet of immediate UBI-driven inflation collapse
- a more important risk is dispute bias against low-balance participants
- reducing deposits alone is not enough
- adjudication independence and external arbiter direction appear more effective

## Core Phase1 principles

### 1. Wallet size should not directly determine the ruling

Dispute outcomes should not be decided by which side has more Token B.  
Economic conditions may still be used for anti-spam rules and deposit logic, but not as the direct basis for who wins.

### 2. Evidence and timeline come first

The intended review order is:

1. evidence / evidenceUri / evidenceHash
2. procedural consistency
3. timeline
4. malicious history or cooldown state
5. integrity (supporting signal only)

### 3. Integrity is a supporting signal, not absolute truth

Integrity can help, but it is not immune to collusion or reciprocal score inflation.  
Phase1 arbiters should therefore not treat integrity as stronger than direct evidence.

### 4. Defense quota helps access, not automatic winning

Defense quota and virtual stake are meant to let lower-balance users participate in disputes at all.  
They are not meant to auto-bias the final ruling in favor of one side.

## Operational rules for Phase1

- the arbiter should not cite wallet size as the reason for a ruling
- the arbiter should treat evidence and timeline as first-class inputs
- higher-value disputes should route externally when possible
- the UI should keep stating that the review is based on evidence and timeline, not wallet size

## Phase2 direction

The Phase1 manual arbiter is temporary.  
The intended future direction is:

- external arbiter / jury
- elected arbiter
- routing only higher-value disputes externally first

## What not to do

- do not hard-code a permanent “poor side bonus” on-chain
- do not assume that lower deposits alone make the system fair

## What is good enough for Phase1

- the adjudication principle is visible in the UI
- operators/arbiters have a written review rule
- simulations continue to monitor dispute bias
- the external adjudication socket remains intact
