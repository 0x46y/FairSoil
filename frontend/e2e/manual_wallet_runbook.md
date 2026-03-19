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
2. Start the frontend with `npm run dev`.
3. Open `http://localhost:3000`.
4. Connect the requester / operator wallet.

## Participant flow

### A. Claim bonus

1. Click `Connect wallet`.
2. In MetaMask, connect the requester wallet.
3. Click `Claim today's bonus`.

Expected result:
- `Action completed` appears.
- `Daily bonus (Token A)` increases or refreshes.

### B. Create agreement

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

### C. Worker submits

1. Switch MetaMask to the worker wallet.
2. Refresh the page.
3. In the new agreement row, click `Submit work`.
4. Approve the transaction.

Expected result:
- `Action completed` appears.
- Agreement status changes to owner review.
- The next-step note says the requester should review.

### D. Requester approves

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
4. If you are using the resolver wallet, propose and finalize a resolution.

Expected result:
- The dispute track moves from `Help asked` to `Challenged` to `Resolver plan` to `Finished`.
- Guidance text keeps referring to evidence and timeline, not wallet size.
