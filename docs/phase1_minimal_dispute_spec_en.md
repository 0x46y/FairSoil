# Phase1 Minimal Dispute Spec (EN)

This note defines the smallest dispute model that still makes sense for FairSoil Phase1.  
The goal is not to recreate a full legal system, but to reduce non-payment, procedural delay, and low-balance users being forced to surrender.

Related:

- requester-side protection: `docs/phase1_requester_protection_spec_en.md`
- scope cuts: `docs/phase1_minimal_scope_cutlist_en.md`
- dispute record publication: `docs/dispute_record_publication_en.md`

## 1. Positioning

Phase1 dispute is not the center of FairSoil. It supports three core pieces:

- Token A as minimum survival / refusal capacity
- Token B as accumulated work reward
- escrow-backed work agreements

Dispute should therefore remain an **exception path for cases escrow alone cannot absorb**, not an attempt to automate perfect justice.

## 2. What Phase1 should keep

Phase1 only needs these dispute features:

1. the worker can raise an issue  
2. the requester can accept or challenge  
3. a third party can propose an outcome  
4. a separate role can finalize  
5. evidence URL/hash and a short reason can be stored  
6. the audit trail shows who acted, in which role, and what happened  

That is enough to avoid “there is no recourse at all.”

Phase1 should treat requester-side challenge as a **limited misconduct report**, not a full symmetrical counter-claim system.  
See `docs/phase1_requester_protection_spec_en.md`.

## 3. What Phase1 should postpone

### 3-1. Adjudication sophistication

- real external arbiter / jury integration
- elected resolver systems
- complex resolver pool selection
- DAO adjudication

### 3-2. Over-structured dispute UI

- long arbiter review forms
- mandatory multi-field summaries and gaps forms
- heavy review checklists even for small-value cases

### 3-3. Over-automated fairness correction

- permanent on-chain “poor-side bias”
- complex reputation formulas that alter victory odds
- trying to fully compute “who is vulnerable” from on-chain arithmetic

Phase1 works better with **simple procedure + role split + evidence-first review**.

## 4. Minimum inputs

### Worker side

- claim %
- short reason
- evidence URL or hash

### Requester side

- accept or challenge
- if challenging: short reason
- optional evidence URL

### Resolver / finalizer side

- recommended payout %
- short final note

Long-form legal drafting should not be required.

## 5. Deadline rules

Phase1 dispute should not let time become the main weapon.

At minimum:

1. worker issue deadline  
2. requester response deadline  
3. resolver proposal deadline  
4. finalizer confirmation deadline  

If a deadline passes, a default outcome should exist rather than indefinite hanging.

Examples:

- requester does not respond in time  
  -> auto-accept within worker claim range, or auto-escalate to resolver review
- resolver does not act  
  -> temporary split/refund fallback
- finalizer does not act  
  -> auto-confirm proposal or escalate to higher path

## 6. Separate small and large disputes

Small cases:

- short reason
- fewer fields
- shorter deadlines
- lighter hold

Large cases:

- more evidence
- more review
- future routing to external adjudication

Without this split, even winning small disputes can become irrationally expensive.

## 7. Minimum protections against “winning at a loss”

Phase1 dispute should care not only about correctness, but also about **cost ceilings**.

### 7-1. Keep the entry burden low

- no mandatory long-form writing
- short reason + URL should be enough to start

### 7-2. Limit rehearing and repetition

- cap appeals or rehearing to one round
- do not allow endless re-submission of the same conflict

### 7-3. Let challenge carry some cost

- but not so much that low-balance users are shut out
- defense quota and relief paths can remain

### 7-4. Avoid needless long escrow freezes

- dispute should not freeze everything indefinitely
- hold range and duration should be explicit

## 8. Adjudication basis

Phase1 should rank inputs in this order:

1. evidence  
2. procedural consistency  
3. timeline  
4. clear malicious history  
5. integrity as supporting signal  

`wallet size` should not be used as the reason for the result.

## 9. Minimum third-party conditions

Phase1 does not need a full jury system yet.  
But it should still ensure:

1. resolver and finalizer are split  
2. obvious conflicts of interest are avoided where possible  
3. role execution appears in the audit trail  
4. a short reason survives with the ruling  

Third-party legitimacy starts with visible separation and traceability, not branding alone.

## 10. Bottom line

The minimum Phase1 dispute can be summarized like this:

> a party can raise an evidence-backed objection, the other side can respond, and a role-split third party can close the case with a short reason.

That is enough for Phase1. The first goals are:

1. prevent one-sided non-payment  
2. reduce the incentive to stall  
3. avoid crushing the correct side just for disputing  
