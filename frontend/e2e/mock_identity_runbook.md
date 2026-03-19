# Mock Identity Runbook

Use this when you do not yet have a real World ID or ZK-NFC proof, but want to validate the full Phase1 identity flow locally.

## 1. Enable mock mode

Edit [frontend/.env.local](/home/a1217018/work/MyNextJs/FairSoil/frontend/.env.local) and make sure these flags exist:

```env
NEXT_PUBLIC_WORLD_ID_MOCK=true
NEXT_PUBLIC_ZKNFC_MOCK=true
```

If you want the World ID button to stay visible, also keep:

```env
NEXT_PUBLIC_WORLD_ID_APP_ID=app_placeholder
NEXT_PUBLIC_WORLD_ID_ACTION_ID=verify-fairsoil
```

The placeholder values are enough for mock mode because the real widget is not used when `NEXT_PUBLIC_WORLD_ID_MOCK=true`.

## 2. Restart the frontend

```bash
cd /home/a1217018/work/MyNextJs/FairSoil/frontend
npm run dev
```

## 3. Open the app

- Visit `http://localhost:3000`
- Connect the requester / temporary operator wallet in MetaMask

Recommended local account:

- `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

## 4. Verify the wallet

In `Step 1: Verify this wallet`:

1. Click `Verify (mock)`
2. Approve the transaction in MetaMask

Expected result:

- `Action completed` appears
- `Verification status` changes to `Verified`
- the verification copy changes from `not verified yet` to `verified`

## 5. Claim the bonus

1. Click `Claim today's bonus`
2. Approve the transaction

Expected result:

- `Action completed` appears
- `Daily bonus (Token A)` refreshes

## 6. Continue into the rest of the flow

After mock verification you can continue with:

- create a work agreement
- worker submits
- requester approves
- operator manual reward report

This validates the current Phase1 identity gate even without a real verifier.
