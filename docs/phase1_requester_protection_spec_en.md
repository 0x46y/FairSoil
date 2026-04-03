# Phase1 Requester Protection Spec (EN)

This note defines the smallest requester-side protection model that fits Phase1 without turning FairSoil into a symmetrical dispute weapon system.

The key idea is:

- keep worker issue as the main remedy path
- give the requester a narrower **misconduct report**
- avoid making both sides equally strong in ways that let the stronger side weaponize procedure

## 1. Core direction

Worker-side issue should remain the main tool for:

- non-payment
- unfair rejection
- agreement breach
- unilateral changes to agreed terms

Requester-side protection should exist too, but not as a full mirror-image counter-suit system.

## 2. What requester protection should cover

The requester-side path should be limited to cases like:

1. `No-show`  
   the worker does not submit by the expected deadline

2. `False submission`  
   the worker claims work was done when it clearly was not

3. `Materially incomplete work`  
   major agreed deliverables are missing, not just subjective dissatisfaction

4. `Procedural failure`  
   repeated failure to respond to required correction or process steps

## 3. What it should not cover

- “I just do not like the result”
- subjective taste differences
- personality judgments
- weakness, slowness, or lack of polish by itself
- vague quality complaints without a procedural or evidence-backed basis

FairSoil should judge **agreement breach and evidence-backed conduct**, not human worth or talent.

## 4. Minimum inputs

Requester-side reporting should stay light:

- `report type`
  - no-show
  - false submission
  - materially incomplete
  - procedural failure
- `short reason`
- `evidence URL` or `evidence hash`
- `requested outcome`
  - refund
  - integrity penalty review
  - cooldown review

## 5. Effects in Phase1

Phase1 should not make this an automatic heavy punishment engine.

Possible outcomes:

1. `Refund`
2. `No reward`
3. `Integrity penalty review`
4. `Cooldown review`

What Phase1 should avoid:

- instant heavy punishment
- one-click bans
- direct punishment for “low skill”
- vague auto-penalties based on subjective disappointment

## 6. Where it sits in the flow

The intended sequence is:

1. worker submits  
2. requester reviews  
3. requester chooses:
   - approve
   - reject
   - challenge / report misconduct
4. only then does third-party review begin if needed
5. resolver / finalizer close the case

So requester protection should remain an **exception path when reject alone is not enough**.

## 7. Why not make it fully symmetrical

Because full symmetry can easily become abusive:

- the requester often controls funding and initiation
- giving both sides equally broad dispute weapons can chill worker participation
- a stronger side can turn procedure itself into pressure

So the better Phase1 model is:

- worker issue for remedy
- requester misconduct report for narrow, evidence-backed protection

## 8. Minimum safety conditions

If requester protection exists at all, Phase1 should keep these constraints:

1. report categories stay narrow  
2. subjective quality claims do not count by themselves  
3. short reason + evidence are required  
4. resolver / finalizer still make the final call  
5. the system does not auto-punish heavily  

## 9. Bottom line

The cleanest Phase1 version is:

> keep worker issue intact, add a narrow requester misconduct report, and restrict it to no-show, false submission, materially incomplete work, and procedural failure.

That gives the requester some protection without turning the protocol into a broad anti-worker pressure system.
