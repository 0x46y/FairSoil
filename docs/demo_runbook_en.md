# FairSoil 3-Minute Demo Runbook

This is the shortest reliable demo path for hackathons, grant calls, or technical walkthroughs.

## 0. Preconditions

- local Anvil running
- contracts deployed
- `frontend/.env.local` updated
- `npm run dev` already running
- MetaMask connected to the local Anvil wallet

## 1. 30 seconds: what FairSoil is

Say:

- FairSoil is trying to make honesty less costly than exploitation
- `Token A` is the daily bonus / flow token
- `Token B` is the work reward / asset token
- `Covenant` handles agreements, escrow, and disputes

Show:

- hero section
- daily bonus / work rewards / trust score cards

## 2. 45 seconds: participant flow

Say:

- the default view is for everyday participants
- the simple flow is verify -> claim bonus -> create work agreement

Show:

- `Use FairSoil` tab
- claim button
- agreement form

## 3. 45 seconds: agreement settlement

Say:

- the requester escrows the reward
- the worker submits
- the requester approves
- the worker receives `Token B` and integrity

Show:

- `Work agreements`
- submit / approve actions

## 4. 45 seconds: dispute flow

Say:

- work disagreements can become issues, then disputes
- resolution is two-step in Phase1
- Phase1 uses a manual arbiter, Phase2 is expected to support external adjudication
- the intended basis is evidence and timeline, not wallet size

Show:

- dispute track
- evidence URL fields
- recent activity entries

## 5. 30 seconds: transparency and self-disclosure

Say:

- the UI exposes treasury, agreement, and dispute activity
- the team ran coarse simulations
- the current main concern is dispute fairness, not immediate UBI inflation collapse

Show:

- `Recent activity`
- MVP note in the hero

## 6. 30 seconds: what funding would support

Say:

- external arbiter / jury routing
- identity flow hardening
- APPI confidence improvements
- governance / factory / parameter-set migration

## Closing line

> FairSoil is not just a UBI app.  
> It is an attempt to combine survival support, transparent work agreements, and fairer dispute handling in one Phase1 protocol kernel.
