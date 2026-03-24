# World ID Production Cutover Checklist

Use this after staging / simulator validation is complete and before switching FairSoil back to the real World App path.

## 1. Replace staging values

Update `frontend/.env.local`:

```env
NEXT_PUBLIC_WORLD_ID_APP_ID=app_...
NEXT_PUBLIC_WORLD_ID_ENVIRONMENT=production
NEXT_PUBLIC_WORLD_ID_ACTION_ID=verify-fairsoil
NEXT_PUBLIC_WORLD_ID_MOCK=false
WORLD_ID_RP_ID=rp_...
RP_SIGNING_KEY=0x...
WORLD_ID_DEBUG=false
```

Checks:

- use the production `app_...`, not `app_staging_...`
- use the production RP ID and production signing key from the same app
- keep `verify-fairsoil` aligned with the action created in the dashboard

## 2. Rotate secrets before real use

Before production testing or demo sharing:

- reissue `RP_SIGNING_KEY` in the World developer dashboard
- replace the old key in `frontend/.env.local`
- confirm the old leaked / test key is no longer used anywhere

## 3. Dashboard review

In World developer dashboard, confirm:

1. The production app is selected.
2. The production action identifier is `verify-fairsoil`.
3. The RP ID belongs to that production app.
4. Any app URL / allowed origin / external app setting includes the correct production-facing origin you will test from.
5. You are no longer relying on staging simulator assumptions.

## 4. FairSoil local readiness

If you are still testing against local contracts:

1. Start Anvil with the code size override.
2. Redeploy contracts with `./contracts/redeploy.sh`.
3. Confirm `frontend/.env.local` still contains the World ID production values after redeploy.
4. Restart `npm run dev`.

Checks:

- `Verification route: World ID` appears in the UI
- `Verify with World ID` is enabled after wallet connection

## 5. Real World App smoke

1. Open `http://localhost:3000` or the target frontend origin.
2. Connect the requester wallet.
3. Click `Verify with World ID`.
4. Scan with the production World App.
5. Complete the proof flow.
6. Approve the MetaMask transaction for `setPrimaryAddress`.

Expected result:

- the Next.js server shows `rp-signature` and `verify` logs without 4xx / 5xx errors
- the UI shows `Action completed`
- `Verification status` changes to `Verified`

## 6. Logs to watch during cutover

Primary source: the `npm run dev` terminal.

Watch for:

- `[worldid/rp-signature] issuing RP signature`
- `[worldid/verify] verifying payload`
- `[worldid/verify] verifier response`

Healthy production pattern:

- verifier response is `200`
- payload is accepted with `success: true` or `verified: true`
- the remaining action is the wallet transaction

Escalate if:

- `rp-signature` fails with config / signing key errors
- `verify` fails with 4xx / 5xx
- the verifier reports app / action mismatch
- MetaMask succeeds but `Verification status` does not change

## 7. Post-cutover cleanup

- keep `WORLD_ID_DEBUG=false` unless you are actively debugging
- document the production app ID and RP ID location for the team
- decide whether to persist nullifiers server-side before broader rollout
- remove any stale staging values from notes or temporary files
