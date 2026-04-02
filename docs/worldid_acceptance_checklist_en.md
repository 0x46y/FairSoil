# World ID Acceptance Checklist

Use this checklist on the day a real World ID verifier becomes available. The goal is to confirm the current Phase1 bridge works end-to-end without changing the page-level UX.

## Preconditions

- `NEXT_PUBLIC_WORLD_ID_APP_ID` is set
- `NEXT_PUBLIC_WORLD_ID_ACTION_ID` is set
- `NEXT_PUBLIC_WORLD_ID_ENVIRONMENT` matches the target (`staging` or `production`)
- `NEXT_PUBLIC_WORLD_ID_MOCK=false`
- `WORLD_ID_VERIFY_URL` points to the intended verifier relay
- the wallet used for verification is connected in the UI
- the operator account that can call `setPrimaryAddress` is available

## UI checks before submit

- `Active route` shows `World ID (...)`
- `World ID mode` matches the target environment label
- `ZK-NFC mode` shows the expected fallback state
- the World ID button is enabled for a connected wallet
- the identity card does not show `Config missing`

## Happy path

1. Start from an address that is not yet marked as primary
2. Click `Verify with World ID`
3. Complete the World ID proof collection flow
4. Confirm the app relays the verifier result through `/api/worldid/verify`
5. Confirm the frontend continues into `setPrimaryAddress(address,true)`
6. Confirm the UI moves to `Verified`
7. Confirm `Primary address registered` appears without a fallback-only message

## Negative path

- invalid or rejected proof shows `Verification failed`
- unreachable verifier shows `Verifier unreachable`
- missing env or app/action ids shows `Config missing`
- retry buttons remain visible after failure
- fallback actions are still available when intended for the environment

## Audit and follow-up

- the wallet is shown as verified in the identity card
- downstream gated actions become available without a page reload issue
- recent activity / timeline still renders role-aware text correctly
- operator fallback was not required on the happy path
- screenshots or logs for the successful run are attached to the run record

## Out of scope

This checklist does not validate:

- nullifier policy hardening
- multi-device re-bind flows
- Tier 1 / Tier 2 / Tier 3 production permissions
- long-term IdentityRegistry design
