---
name: Demo readiness
about: Track the pre-demo checklist for a local FairSoil walkthrough, recording, or grant submission.
title: "[Demo] "
labels: ["demo", "checklist"]
assignees: []
---

## Context

- Demo date:
- Environment:
  - [ ] Anvil
  - [ ] Frontend
  - [ ] MetaMask
- Related branch / commit:

## 0. Environment

- [ ] `anvil` is running
- [ ] contracts are redeployed after the latest restart
- [ ] `frontend/.env.local` matches the current deployment
- [ ] `http://localhost:3000` opens
- [ ] MetaMask is on chain `31337`
- [ ] requester wallet is available
- [ ] worker wallet is available

## 1. Automated UI smoke

- [ ] `npm run e2e` passes

## 2. Wallet setup

- [ ] worker wallet is verified
- [ ] requester wallet has enough Token B / Integrity

## 3. Participant flow

- [ ] requester wallet connects successfully
- [ ] `Claim today's bonus` succeeds
- [ ] agreement creation succeeds
- [ ] agreement row appears in `Work agreements`
- [ ] worker can submit work
- [ ] requester can approve work
- [ ] `Recent activity` updates after approval

## 4. Operator flow

- [ ] `Run FairSoil` tab opens correctly
- [ ] `Manual reward report` succeeds
- [ ] treasury / reward activity is visible after operator action

## 5. Optional dispute smoke

- [ ] worker can `Ask for help`
- [ ] requester can `Challenge claim`
- [ ] dispute status track advances
- [ ] evidence-first guidance is visible

## Known caveats

- [ ] Temporary operator / manual arbiter caveat was reviewed
- [ ] Wallet approval caveat was reviewed
- [ ] Phase 2 external arbiter caveat was reviewed

## Notes

- Failures:
- Screenshots / trace links:
- Follow-up tasks:
