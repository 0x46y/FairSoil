# World ID Simulator Runbook

Use this when you want to validate the World ID proof flow in a browser-first staging setup before switching to the production World App path.

## 1. Pick the staging app in World Developer

Use a staging / development World ID app and copy the staging values into `frontend/.env.local`.

Expected values:

```env
NEXT_PUBLIC_WORLD_ID_APP_ID=app_staging_...
NEXT_PUBLIC_WORLD_ID_ENVIRONMENT=staging
NEXT_PUBLIC_WORLD_ID_ACTION_ID=verify-fairsoil
NEXT_PUBLIC_WORLD_ID_MOCK=false
WORLD_ID_RP_ID=rp_...
RP_SIGNING_KEY=0x...
WORLD_ID_DEBUG=true
```

Notes:

- Keep `NEXT_PUBLIC_WORLD_ID_ENVIRONMENT=staging` for simulator testing.
- `RP_SIGNING_KEY` must be the raw private key string, not the full downloaded JSON.
- `WORLD_ID_DEBUG=true` makes the Next.js server log the World ID request / verifier status without printing the proof itself.

## 2. Check the dashboard configuration

In the World developer dashboard, verify:

1. The app is the staging / development app, not the production app.
2. The action identifier matches `verify-fairsoil`.
3. The RP ID and signing key belong to the same staging app.
4. If your dashboard exposes an app URL / allowed origin field for the external app, include `http://localhost:3000`.

## 3. Start FairSoil locally

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

If `redeploy.sh` overwrote the World ID block before you updated the script, re-add the World ID lines to `frontend/.env.local`.

Terminal C:

```bash
cd /home/a1217018/work/MyNextJs/FairSoil/frontend
npm run dev
```

## 4. Run the simulator flow

1. Open `http://localhost:3000`.
2. Click `Connect wallet`.
3. In `Step 1: Verify this wallet`, confirm `Verification route: World ID`.
4. Click `Verify with World ID`.
5. Use the staging simulator flow exposed by the IDKit widget instead of scanning with the production World App.
6. Complete the simulated verification.

Expected result:

- the widget completes without `failed_by_host_app`
- the app sends a request to `/api/worldid/verify`
- if verifier acceptance succeeds, the wallet then reaches `setPrimaryAddress`

Observed FairSoil staging result:

- proof verification completed in staging and the wallet reached MetaMask signing for `setPrimaryAddress`
- the verifier returned success even when the same staging proof was retried, with the message `Proof verified successfully (nullifier reuse)`
- for FairSoil Phase1 this is acceptable as a staging validation result, but production should treat nullifiers as a real replay / uniqueness control surface

## 5. Read the Next.js server logs

Watch the terminal running `npm run dev`.

With `WORLD_ID_DEBUG=true`, these log lines are the key checkpoints:

- `[worldid/rp-signature] issuing RP signature`
- `[worldid/verify] verifying payload`
- `[worldid/verify] verifier response`

Interpretation:

- if only `rp-signature` appears, the widget opened but no proof came back to the host app
- if `verifying payload` appears but `verifier response` is an error, the proof reached FairSoil and the verifier rejected it
- if `verifier response` shows `success: true` or `verified: true`, the remaining step is the wallet transaction for `setPrimaryAddress`
- if the same proof is retried in staging, you may see `Proof verified successfully (nullifier reuse)`; that still indicates the verifier accepted the payload

## 6. Switching back to production

When staging is stable, switch these values back:

```env
NEXT_PUBLIC_WORLD_ID_APP_ID=app_...
NEXT_PUBLIC_WORLD_ID_ENVIRONMENT=production
NEXT_PUBLIC_WORLD_ID_ACTION_ID=verify-fairsoil
NEXT_PUBLIC_WORLD_ID_MOCK=false
WORLD_ID_RP_ID=rp_...
RP_SIGNING_KEY=0x...
WORLD_ID_DEBUG=false
```

Production validation should use the World App rather than the simulator.
