# Phase1 Identity Integration

This note explains how FairSoil Phase1 handles identity today: what is implemented, what is mock-based, and what gets swapped when a real verifier is available.

## Current Phase1 implementation

The Phase1 frontend exposes three routes from `Step 1: Verify this wallet`:

1. World ID
2. ZK-NFC
3. temporary operator mock verification

All three routes converge on `setPrimaryAddress(address,true)`.  
In other words, the current Phase1 identity model is: an external or mock verifier returns success, then the owner/operator updates the primary address.

The current UI also exposes:

- `Active route`
- `World ID mode`
- `ZK-NFC mode`

This keeps local mock, staging-style, and production-style configuration visible without reading environment files.

## Frontend flow

1. The user clicks `Verify this wallet`
2. The frontend POSTs to a same-origin API route
3. That route either returns mock success or relays to an external verifier endpoint
4. On `verified: true`, the frontend sends `setPrimaryAddress`
5. `Verification status` becomes `Verified` in the UI

## Current routes

- World ID: `frontend/src/app/api/worldid/verify/route.ts`
- ZK-NFC: `frontend/src/app/api/zknfc/verify/route.ts`

## Environment variables

### Local mock mode

```env
NEXT_PUBLIC_WORLD_ID_MOCK=true
NEXT_PUBLIC_ZKNFC_MOCK=true
```

Recommended for a fully local demo:

```env
NEXT_PUBLIC_WORLD_ID_ENVIRONMENT=staging
NEXT_PUBLIC_WORLD_ID_MOCK=true
NEXT_PUBLIC_ZKNFC_MOCK=true
```

### Remote verifier mode

```env
NEXT_PUBLIC_WORLD_ID_APP_ID=...
NEXT_PUBLIC_WORLD_ID_ACTION_ID=...
WORLD_ID_VERIFY_URL=https://...
NEXT_PUBLIC_ZKNFC_VERIFIER_URL=https://...
```

Notes:
- `WORLD_ID_VERIFY_URL` is preferred for server-side relay
- `NEXT_PUBLIC_WORLD_ID_VERIFY_URL` is still accepted as a fallback
- ZK-NFC currently relays through `NEXT_PUBLIC_ZKNFC_VERIFIER_URL`
- `NEXT_PUBLIC_WORLD_ID_ENVIRONMENT` controls the visible World ID mode label in the UI (`staging` or `production`)

## Requirements for real verifier integration

### World ID

At minimum, the route should be able to pass these values to a verifier:

- wallet address
- app id
- action id
- proof
- signal
- nullifier hash

The current UI does not yet implement proof collection via the official SDK.  
So the current route is best understood as the server-side bridge, not the full production World ID flow.

### ZK-NFC

At minimum, the route should pass:

- wallet address
- proof payload or signed attestation if required by the verifier

Again, the current Phase1 implementation focuses on same-origin routing first, not a full proof-generation UX.

## What is enough for Phase1

Phase1 is in a good state if:

- mock verification reaches primary address registration
- a real verifier can be swapped in without changing the page-level UX
- the UI clearly shows `Verified / Not verified yet`
- the UI clearly shows which identity route is active
- the user can continue into UBI claim after verification

## Not implemented yet

- full World ID SDK proof collection UI
- ZK-NFC proof generation UI
- real Tier 1 / Tier 2 / Tier 3 permission differences
- nullifier separation in production flows
- device binding / re-bind flows
- fully production-confirmed World ID live verification against the final deployment target

## Direction

Phase1 should optimize for one coherent minimum flow:

- press verify in the UI
- switch the backend route between mock and remote verifier
- update the primary address

rather than pretending the full identity stack is already finished.
