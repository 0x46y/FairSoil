# Adjudication Antipatterns to Avoid (EN)

This note lists the institutional failure modes FairSoil should avoid in dispute and adjudication design.  
The goal is not just to reach correct outcomes, but to avoid procedures that reward deference, delay, or exhaustion tactics.

## Core framing

FairSoil should avoid systems where:

- it is rational to rule in ways that please a superior power rather than the actual parties
- even the correct side loses by having to spend too much time, money, or life opportunity to contest a case
- writing skill, internal politics, or wallet size matter more than evidence

Phase1 therefore prioritizes a **minimum procedure that does not crush the weaker side by delay alone**, not a perfect automated justice machine.

## Antipatterns

### 1. Party and judge are effectively the same

- the dispute party and the adjudicator/finalizer are effectively the same role
- the operator adjudicates cases where it has direct stake

Phase1 already separates resolver and finalizer, but **party/adjudicator separation** remains the highest-priority rule.

### 2. Centralized control over adjudicator roles

- one powerful admin can freely appoint and replace resolver/finalizer roles
- adjudicators feel they will be removed if they rule against “the top”

That breaks neutrality even if the UI still looks formal.

### 3. Outcome without reasons

- a result is issued without leaving what evidence, timeline, or procedure was reviewed
- later reviewers cannot reconstruct why the ruling happened

At minimum, FairSoil should retain evidence references, timeline context, and a short reason in the audit trail.

### 4. Delay becomes a source of leverage

- deadlines are vague
- non-response and stalling become negotiation power

Response, proposal, and finalize windows should be bounded so time is not the strongest weapon.

### 5. Dispute is too expensive to use

- even the correct side is better off surrendering than contesting
- small disputes require heavyweight process

Small cases should remain light. Larger or riskier cases can bear heavier review.

### 6. Writing skill dominates the result

- long-form legalistic drafting gives strong advantage
- “who can write better” matters more than evidence

FairSoil should not recreate courtroom-grade writing contests.  
`short reason + evidence URL/hash + timeline` is enough for Phase1.

### 7. Wallet size becomes justice

- deposits and stake requirements remove low-balance users’ voice
- who has more assets affects the ruling itself

Balance can affect anti-spam logic, but not the substance of the ruling.

### 8. Hidden black-box discretion

- no one can tell why one outcome happened instead of another
- similar cases drift with no way to detect it

FairSoil should prefer visible auditability over opaque sophistication.

### 9. Fake third-party neutrality

- the system claims “random” or “jury” review, but in practice keeps selecting the same cluster of people
- the participant pool is tiny but the system pretends to be neutral

When the candidate pool is small, **conflict exclusion and visible logs** can matter more than nominal randomness.

### 10. Too many exceptions, everything becomes discretion

- rules are overshadowed by one-off judgment
- operator discretion overrides transparent procedure

Simple, explicit procedure is usually safer than over-modeling “perfect fairness.”

### 11. Endless appeals and overwrite loops

- a settled case can be reopened repeatedly
- the losing side can keep exhausting the other side

Appeals and rehearing paths need narrow limits and clear end conditions.

### 12. Small and large disputes treated with equal weight

- every case becomes full adjudication
- low-value cases still demand expensive process

FairSoil should not become a “litigate everything” protocol.

## Minimum Phase1 principles

For Phase1, the following are enough:

- rulings are based on `evidence / timeline / procedure`, not wallet size
- resolver and finalizer are split
- reasons and logs are retained
- deadlines exist
- small disputes do not become disproportionately expensive

Phase1 is not a complete independent justice system.  
It is a **minimum defensive layer against one-sided non-payment and procedural abuse**.

## Phase2 and beyond

These matter, but are not required for Phase1:

- external arbiter / jury routing
- elected resolvers
- formal resolver/finalizer selection systems
- timelock / governance migration of role control
- high-value dispute routing

## Bottom line

FairSoil does not need to automate perfect justice first.  
It needs to preserve three things first:

1. parties and adjudicators should not blur together too much  
2. delay alone should not crush the weaker side  
3. later reviewers should be able to see why the outcome happened  
