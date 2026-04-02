# Manual Wallet E2E Runbook

This runbook covers the real MetaMask-backed flow that Playwright does not fully automate in this repo.

## Why this is manual

The current automated Playwright suite checks the participant/operator dashboard flow without a wallet.  
Real MetaMask signing still needs a human because the browser test runner does not share the extension session you use in your normal browser profile.

## Accounts used in local Anvil

- Requester / temporary operator: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Worker: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`

Use MetaMask on `Anvil Local` (`http://127.0.0.1:8545`, chain `31337`).

## One-time prep

Before testing the real World ID route, make sure `frontend/.env.local` contains:

```env
NEXT_PUBLIC_WORLD_ID_APP_ID=app_...
NEXT_PUBLIC_WORLD_ID_ENVIRONMENT=production
NEXT_PUBLIC_WORLD_ID_ACTION_ID=verify-fairsoil
NEXT_PUBLIC_WORLD_ID_MOCK=false
WORLD_ID_RP_ID=rp_...
RP_SIGNING_KEY=0x...
```

`RP_SIGNING_KEY` must be the raw private key string from the downloaded World ID credentials, not the whole JSON body.

If you want to debug the proof flow before using the production World App, use `e2e/worldid_simulator_runbook.md` first and keep production testing for the last step.

Make sure the worker wallet is verified, because agreements require a verified worker.

```bash
cd /home/a1217018/work/MyNextJs/FairSoil/contracts
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 \
  "setPrimaryAddress(address,bool)" \
  0x70997970C51812dc3A010C7d01b50e0d17dc79C8 true \
  --rpc-url http://127.0.0.1:8545 \
  --private-key $PRIVATE_KEY
```

If you redeployed and addresses changed, use the current `frontend/.env.local` values instead.

## Run order

1. Start Anvil.
2. Start or restart the frontend with `npm run dev`.
3. Open `http://localhost:3000`.
4. Connect the requester / operator wallet.

## Participant flow

### A. Verify wallet

1. Click `Connect wallet`.
2. In MetaMask, connect the requester wallet.
3. Open `Step 1: Verify this wallet`.
4. Check `Verification status` and `Verification route`.
5. Use one of these:
   - `Verify (mock)` for the local Phase1 mock route
   - `Verify with World ID` when a World ID verifier is configured
   - `Verify with ZK-NFC` when a ZK-NFC verifier is configured
6. If using World ID, complete the widget flow in the modal and return to the app.
7. Approve the wallet transaction if the flow reaches `setPrimaryAddress`.

Expected result:
- `Action completed` appears.
- `Verification status` changes to `Verified`.
- The card text changes from `not verified yet` to `verified`.

### B. Claim bonus

1. Keep the requester wallet connected.
3. Click `Claim today's bonus`.

Expected result:
- `Action completed` appears.
- `Daily bonus (Token A)` increases or refreshes.

### C. Create agreement

1. In `Step 3: Create a work agreement`, enter worker wallet `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`.
2. Keep `Reward type = Token B`.
3. Set a small reward such as `25`.
4. Open optional details only if needed.
5. Click `Create Agreement (approve + lock)`.
6. Approve both MetaMask confirmations.

Expected result:
- `Action completed` appears.
- A new row appears in `Work agreements`.
- The new row says the worker should submit the work next.

### D. Worker submits

1. Switch MetaMask to the worker wallet.
2. Refresh the page.
3. In the new agreement row, click `Submit work`.
4. Approve the transaction.

Expected result:
- `Action completed` appears.
- Agreement status changes to owner review.
- The next-step note says the requester should review.

### E. Requester approves

1. Switch MetaMask back to the requester wallet.
2. Refresh the page.
3. Click `Approve work`.
4. Approve the transaction.

Expected result:
- `Action completed` appears.
- Worker reward is paid.
- `Recent activity` shows a work approval update.
- Worker-side `Token B` or `Integrity` increases after refresh.

## Operator flow

1. Open `Run FairSoil`.
2. Expand `Manual reward report`.
3. Enter the worker wallet.
4. Set a small manual reward such as `10` Token B and `3` Integrity.
5. Click `Add verified reward`.

Expected result:
- `Action completed` appears.
- `Recent activity` shows a treasury / reward update.
- Worker balance or Integrity changes after refresh.

## Optional dispute smoke

1. Create another agreement.
2. Switch to the worker wallet and use `Ask for help`.
3. Switch back to the requester wallet and use `Challenge claim`.
4. If you are using the resolver wallet, fill:
   - `Claim summary`
   - `Requester response`
   - `Missing evidence / gaps`
   - `Payout %`
5. Optionally add `Arbiter evidence URL`.
6. Propose and finalize a resolution.

Expected result:
- The dispute track moves from `Help asked` to `Challenged` to `Resolver plan` to `Finished`.
- Guidance text keeps referring to evidence and timeline, not wallet size.
- The arbiter card shows separate `Worker / Requester / Arbiter` records.
- The arbiter record shows the structured fields instead of a single vague note.
- If evidence is still missing or the quote looks unusual, review-priority tags appear before a human ruling is trusted.

## Identity troubleshooting

- `Verification config missing`
  - env is incomplete for the selected route; check the World ID app/action ids and relay URL
- `Verifier unreachable`
  - the relay or verifier endpoint is down or not reachable from the frontend
- `Verification failed`
  - the verifier rejected the proof or route payload; inspect the dev server logs before retrying
- `Verified` never appears after wallet confirmation
  - confirm the `setPrimaryAddress(address,true)` transaction succeeded on-chain

For the formal happy-path gate on rollout day, also use `docs/worldid_acceptance_checklist_en.md`.
