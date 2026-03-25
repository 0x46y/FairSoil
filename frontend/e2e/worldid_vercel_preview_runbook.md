# World ID Vercel Preview Runbook

Use this when local tunnel tools are blocked and you still want to validate the production World App flow with a real HTTPS origin.

This repo can use Vercel for the frontend and Next.js API routes while still talking to local Anvil from the browser via `NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545`.

## 1. What this solves

Vercel preview gives you:

- a public `https://...vercel.app` origin
- hosted Next.js API routes for `/api/worldid/rp-signature` and `/api/worldid/verify`
- a production-like URL you can register in the World developer dashboard

This avoids local tunnel issues on restricted networks.

## 2. Keep Anvil local

Terminal A:

```bash
cd /home/a1217018/work/MyNextJs/FairSoil/contracts
anvil --code-size-limit 50000
```

Terminal B:

```bash
cd /home/a1217018/work/MyNextJs/FairSoil
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
./contracts/redeploy.sh
```

Why this still works:

- the browser connects MetaMask to your local Anvil
- the hosted Vercel app only handles the World ID routes and frontend rendering

## 3. Prepare `frontend/.env.local`

Use production World ID values:

```env
NEXT_PUBLIC_WORLD_ID_APP_ID=app_...
NEXT_PUBLIC_WORLD_ID_ENVIRONMENT=production
NEXT_PUBLIC_WORLD_ID_ACTION_ID=verify-fairsoil
NEXT_PUBLIC_WORLD_ID_MOCK=false
WORLD_ID_RP_ID=rp_...
RP_SIGNING_KEY=0x...
WORLD_ID_DEBUG=true
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

Notes:

- keep `NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545` if MetaMask and Anvil are on the same machine you use for the browser
- `WORLD_ID_DEBUG=true` is useful during the first production validation, then switch it back to `false`

## 4. Add the same env vars in Vercel

In the Vercel project, add these environment variables:

- `NEXT_PUBLIC_WORLD_ID_APP_ID`
- `NEXT_PUBLIC_WORLD_ID_ENVIRONMENT`
- `NEXT_PUBLIC_WORLD_ID_ACTION_ID`
- `NEXT_PUBLIC_WORLD_ID_MOCK`
- `WORLD_ID_RP_ID`
- `RP_SIGNING_KEY`
- `WORLD_ID_DEBUG`
- `NEXT_PUBLIC_RPC_URL`
- all deployed contract addresses used by the frontend

Use the same values as your validated local `.env.local`.

## 5. Deploy a preview

Simplest path:

1. Import `/home/a1217018/work/MyNextJs/FairSoil/frontend` into Vercel as a Next.js project.
2. Push a branch or trigger a preview deployment.
3. Wait for a preview URL such as `https://fairsoil-xyz.vercel.app`.

## 6. Update World Developer metadata

In the production World app dashboard, set the preview URL in:

- `App URL`
- `App Official Website`
- any external app / allowed origin field if present

Use the exact Vercel preview URL you will open in the browser.

## 7. Run the real World App flow

1. Open the Vercel preview URL in the browser on the same machine that has MetaMask and local Anvil.
2. Connect the requester wallet.
3. Click `Verify with World ID`.
4. Scan with the production World App.
5. Complete the proof flow.
6. Approve the MetaMask transaction for `setPrimaryAddress`.

Expected result:

- `/api/worldid/rp-signature` succeeds on Vercel
- `/api/worldid/verify` is reached
- verifier response is successful
- MetaMask signs `setPrimaryAddress`
- UI changes to `Verified`

## 8. Where to debug

Primary source:

- Vercel function logs for `/api/worldid/rp-signature`
- Vercel function logs for `/api/worldid/verify`

Secondary source:

- browser DevTools console for `[worldid/widget] error`

Interpretation:

- if `rp-signature` succeeds but `verify` is never hit, the issue is still in the World App / bridge / app metadata stage
- if `verify` is hit and returns 4xx / 5xx, the proof reached FairSoil and the issue is now visible in server logs
- if `verify` succeeds and MetaMask fails, the issue is on the on-chain side rather than World ID

## 9. After verification succeeds

When the production flow is confirmed:

- rotate `RP_SIGNING_KEY` again if you used a test-exposed key
- set `WORLD_ID_DEBUG=false`
- move from a preview URL to the final production URL in the World dashboard
