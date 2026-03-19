# FairSoil Pre-Demo Checklist

Use this before a demo, grant recording, or milestone review.  
This checklist assumes:

- Anvil is running on `http://127.0.0.1:8545`
- the frontend is running on `http://localhost:3000`
- MetaMask is connected to `Anvil Local (31337)`

Accounts used in local demo:

- Requester / temporary operator: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Worker: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`

## 0. Environment

| Check | Result | Notes |
| --- | --- | --- |
| `anvil` is running | ☐ Pass / ☐ Fail |  |
| contracts are redeployed after latest restart | ☐ Pass / ☐ Fail |  |
| `frontend/.env.local` matches the current deployment | ☐ Pass / ☐ Fail |  |
| `http://localhost:3000` opens | ☐ Pass / ☐ Fail |  |
| MetaMask is on chain `31337` | ☐ Pass / ☐ Fail |  |
| requester wallet is available in MetaMask | ☐ Pass / ☐ Fail |  |
| worker wallet is available in MetaMask | ☐ Pass / ☐ Fail |  |

## 1. Automated UI smoke

Run:

```bash
cd /home/a1217018/work/MyNextJs/FairSoil/frontend
npm run e2e
```

| Check | Result | Notes |
| --- | --- | --- |
| participant dashboard test passes | ☐ Pass / ☐ Fail |  |
| operator dashboard test passes | ☐ Pass / ☐ Fail |  |

## 2. Wallet setup

Run if needed:

```bash
cd /home/a1217018/work/MyNextJs/FairSoil/frontend
npm run e2e:wallet:guide
```

| Check | Result | Notes |
| --- | --- | --- |
| worker wallet is verified | ☐ Pass / ☐ Fail |  |
| requester wallet has enough Token B / Integrity | ☐ Pass / ☐ Fail |  |

## 3. Participant flow

### A. Verify wallet

| Check | Result | Notes |
| --- | --- | --- |
| requester wallet connects successfully | ☐ Pass / ☐ Fail |  |
| verification action succeeds | ☐ Pass / ☐ Fail |  |
| `Action completed` appears after verification | ☐ Pass / ☐ Fail |  |
| verification status changes to `Verified` | ☐ Pass / ☐ Fail |  |

### B. Bonus claim

| Check | Result | Notes |
| --- | --- | --- |
| `Claim today's bonus` succeeds | ☐ Pass / ☐ Fail |  |
| `Action completed` appears | ☐ Pass / ☐ Fail |  |
| Token A view refreshes after claim | ☐ Pass / ☐ Fail |  |

### C. Create agreement

| Check | Result | Notes |
| --- | --- | --- |
| worker address can be entered | ☐ Pass / ☐ Fail |  |
| `Open optional details` enables after worker entry | ☐ Pass / ☐ Fail |  |
| agreement creation succeeds | ☐ Pass / ☐ Fail |  |
| agreement row appears in `Work agreements` | ☐ Pass / ☐ Fail |  |
| row shows worker should submit next | ☐ Pass / ☐ Fail |  |

### D. Worker submit

| Check | Result | Notes |
| --- | --- | --- |
| worker wallet connects successfully | ☐ Pass / ☐ Fail |  |
| `Submit work` succeeds | ☐ Pass / ☐ Fail |  |
| row changes to requester review state | ☐ Pass / ☐ Fail |  |

### E. Requester approve

| Check | Result | Notes |
| --- | --- | --- |
| requester wallet can resume control | ☐ Pass / ☐ Fail |  |
| `Approve work` succeeds | ☐ Pass / ☐ Fail |  |
| `Recent activity` shows approval update | ☐ Pass / ☐ Fail |  |
| worker reward / Integrity changes after refresh | ☐ Pass / ☐ Fail |  |

## 4. Operator flow

| Check | Result | Notes |
| --- | --- | --- |
| `Run FairSoil` tab opens correctly | ☐ Pass / ☐ Fail |  |
| `Manual reward report` opens correctly | ☐ Pass / ☐ Fail |  |
| manual reward report succeeds | ☐ Pass / ☐ Fail |  |
| `Recent activity` shows treasury / reward update | ☐ Pass / ☐ Fail |  |

## 5. Optional dispute smoke

| Check | Result | Notes |
| --- | --- | --- |
| worker can `Ask for help` | ☐ Pass / ☐ Fail |  |
| requester can `Challenge claim` | ☐ Pass / ☐ Fail |  |
| dispute status track advances | ☐ Pass / ☐ Fail |  |
| evidence-first guidance is visible | ☐ Pass / ☐ Fail |  |
| arbiter fields `Claim summary / Requester response / Missing evidence / gaps` can be filled | ☐ Pass / ☐ Fail |  |
| review card shows separate `Worker / Requester / Arbiter` records | ☐ Pass / ☐ Fail |  |
| review-priority tags appear when evidence is missing or price looks unusual | ☐ Pass / ☐ Fail |  |

## 6. Demo-ready summary

| Item | Result | Notes |
| --- | --- | --- |
| Core flow is demo-ready | ☐ Pass / ☐ Fail |  |
| Operator flow is demo-ready | ☐ Pass / ☐ Fail |  |
| Dispute flow is demo-ready | ☐ Pass / ☐ Fail |  |
| Known caveats are documented | ☐ Pass / ☐ Fail |  |

## Known caveats to mention if needed

- Phase 1 still uses a temporary operator and manual dispute arbiter.
- Wallet-backed flow requires MetaMask approvals.
- External arbiter / jury routing is a Phase 2 direction, not a finished Phase 1 feature.
