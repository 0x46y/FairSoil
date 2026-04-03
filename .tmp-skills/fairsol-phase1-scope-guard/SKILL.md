---
name: fairsol-phase1-scope-guard
description: Use when reviewing or implementing FairSoil changes that may expand beyond the intended Phase1 MVP scope, especially when UI, dispute flows, operator tooling, or docs risk drifting into Phase2 complexity.
---

# FairSoil Phase1 Scope Guard

## Overview

Use this skill to keep FairSoil's Phase1 MVP narrow enough to remain understandable, demoable, and operable.

This skill exists because FairSoil naturally attracts scope growth. Features that sound reasonable in isolation can still harm the product if they:

- make participant UI heavier than necessary
- move speculative Phase2 ideas into live Phase1 screens
- add new workflow branches before the core path is stable
- turn documentation concepts into premature product surface area

The goal is not to kill ambition. The goal is to stop Phase1 from becoming a confusing hybrid of MVP, governance prototype, and full adjudication platform.

## When To Use

Use this skill when the user asks to:

- add a new participant-facing flow
- extend dispute or review UX
- expose more operator controls
- surface advanced template, royalty, governance, or adjudication concepts in the main UI
- decide whether something belongs in code now or only in docs
- simplify an overgrown screen back toward the Phase1 core

Typical targets:

- `frontend/src/app/page.tsx`
- agreement creation flow
- dispute panels
- operator sections
- Phase1/Phase2 docs alignment

## Phase1 Core

Phase1 should stay centered on:

- verify
- claim
- create agreement
- submit work
- approve / reject / cancel
- minimal dispute
- basic operator review
- basic audit visibility

Anything beyond that must justify its place very carefully.

## Guard Questions

For every proposed addition, ask:

1. Does this improve the core participant flow right now?
2. Is this required for the current MVP to function safely?
3. Could this remain documentation or operator-only instead?
4. Does this add a new branch, state, or concept that new users must learn?
5. Does this belong to Phase2, even if it is technically implementable today?

If the answer trends toward "nice to have" or "future-facing", keep it out of the main Phase1 UI.

## Decision Rules

### Keep in Phase1 UI

Allow it into participant-facing UI when it:

- directly reduces confusion in verify / claim / create / submit / approve
- prevents a common operational failure
- explains an already-existing on-chain behavior
- makes minimal dispute or audit visibility more usable

### Move to operator-only UI

Prefer operator-only when it:

- exists mainly for review, audit, triage, or calibration
- is useful but too heavy for everyday participants
- exposes market analysis, heuristics, or advanced warnings

### Keep in docs, not product

Prefer docs-only when it:

- describes future governance or external adjudication
- is a migration path, not a current behavior
- is useful background but not actionable in the current interface
- would add optional controls that most users should ignore

## Common Phase1 Expansion Traps

### 1. Optional settings become primary clutter

Examples:

- template tools dominating agreement creation
- royalty settings shown before the user can do the basic action
- advanced review settings visible by default

Preferred response:

- collapse them
- move them lower
- keep the primary CTA obvious

### 2. Phase2 concepts leak into participant copy

Examples:

- governance promises shown too early
- external adjudication surfaced as if active now
- advanced identity or registry concepts shown in the main path

Preferred response:

- mention them briefly, if needed
- link to docs
- avoid making them first-order UI concepts

### 3. Dispute flows become legalistic

Examples:

- too many fields
- too much structured text
- too many decision branches for small-value disagreements

Preferred response:

- short reason
- evidence reference
- clear next step
- limited resolution options

### 4. Operator insight turns into participant overload

Examples:

- market baselines
- heuristic warnings
- review priority tags
- dense audit metrics

Preferred response:

- keep detailed analytics in operator view
- give participants only the minimum useful summary

## Review Output Format

When using this skill, give conclusions in this order:

1. what should stay in Phase1 UI
2. what should move to operator-only UI
3. what should remain docs-only
4. what should be removed or collapsed

If implementing changes, explain the cut in plain product terms:

- "This stays because it supports create/submit/approve."
- "This moves down because it is optional."
- "This remains docs-only because it is Phase2 policy, not Phase1 behavior."

## Anti-Patterns

Avoid these:

- adding a feature only because the docs mention it
- treating "possible to build" as "should be visible now"
- giving participant screens operator analysis by default
- surfacing advanced optional controls above the primary action
- using Phase1 screens to preview too many future system ideas
