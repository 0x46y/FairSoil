# Dispute Record Publication Design (EN)

This note explains how FairSoil should design dispute records for publication and export.  
The goal is not to turn FairSoil into a final court, but to make disputes harder to hide, harder to rewrite later, and easier to carry into outside systems when necessary.

## 1. Core framing

FairSoil disputes should not be fully sealed inside a black box.  
At the same time, they should not default to always-on public shaming.

The key properties are:

1. verifiable  
2. portable  
3. traceable over time  

In other words, FairSoil should function as a **record layer**, not just as a decision button.

## 2. Why publication design matters

Real disputes and legal conflicts often fail because:

- records are scattered
- it is hard to reconstruct who said what
- narratives are edited later
- one side controls communication, media access, or organizational leverage

If FairSoil makes dispute records easier to structure and export, it can weaken one-sided information control.

## 3. Minimum record fields

Each dispute should retain at least:

- `timestamp`
- `actor`
- `role`
- `action`
  - issue
  - accept
  - challenge / misconduct report
  - proposal
  - finalize
- `short reason`
- `evidence reference`
  - URL
  - hash
  - packet
- `outcome`
  - payout
  - refund
  - penalty candidate
  - finalized status

## 4. Use layered visibility, not instant full publicity

FairSoil should use staged visibility:

### Level 1: detailed party view

- full detail for the parties and adjudicators

### Level 2: public-safe summary

- a shareable short summary
- strip unnecessary personal or sensitive data

### Level 3: export packet

- suitable for:
  - real courts
  - legal consultation
  - external adjudication
  - audit/review

## 5. What matters for social sharing

The value is not outrage.  
The value is being able to show:

- what happened
- when it happened
- what evidence was submitted
- how the other side responded
- which role decided what

That means shareable timeline summaries and evidence lists matter more than emotionally optimized copy.

## 6. UI priorities inside FairSoil

To support this design, the product should prioritize:

1. a timeline that reads in plain order  
2. visible role labels  
3. evidence preview (URL / title / hash / summary)  
4. export paths (CSV / markdown / packet)  
5. a public-safe summary format  

## 7. Expected benefits

This can help:

- reduce one-sided suppression of information
- reduce “I said / you said” ambiguity
- improve the quality of later third-party review
- make real-court or outside escalation easier
- weaken the advantage of the side with stronger publicity channels

## 8. Risks to avoid

Publication should not become:

- a shaming culture
- careless exposure of sensitive personal data
- additional pressure that exhausts the weaker side
- a replacement of adjudication by social-media outrage

FairSoil should be a **verification-friendly record device**, not an outrage amplifier.

## 9. Bottom line

FairSoil dispute design is stronger when framed as:

> a system that organizes evidence and sequence, makes suppression harder, and allows escalation outward when needed

rather than:

> a system that fully automates justice

For Phase1, this is already enough:

1. actions can be traced  
2. evidence references survive  
3. roles and outcomes remain visible  
4. records can be exported when necessary  
