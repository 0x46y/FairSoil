# Identity Registry Notes

This note outlines the future `IdentityRegistry` / attestation-router style layer that FairSoil will likely need after Phase1.

## Background

Phase1 already routes:

- World ID
- ZK-NFC
- mock verification

through one UI path.  
But today, the flow still collapses directly into `setPrimaryAddress`, without a generalized on-chain record of **which verification route was used**.

## Why it matters

As identity routes grow, the system risks:

- hard-coding verifier-specific logic into UI and operator flows
- blurring which route grants which permissions
- making expiry / revoke / attestation upgrades harder to manage

## Responsibilities

A future registry layer should minimally:

- record which verifier route attested a given address
- store verification level / strength / credential type
- manage expiry and revocation
- provide the basis for primary-address updates

## Minimal interface sketch

- `attestIdentity(address user, bytes32 routeId, bytes32 subjectHash, uint64 expiresAt, bytes metadata)`
- `revokeIdentity(address user, bytes32 routeId, bytes32 reason)`
- `isVerified(address user) -> bool`
- `verificationLevel(address user) -> uint8`
- `verificationRoute(address user) -> bytes32`

## Example route IDs

- `WORLD_ID`
- `ZK_NFC_PASSPORT`
- `ZK_NFC_MNC`
- `MOCK_OPERATOR`

## Relationship to Phase1

Phase1 does not need to implement this registry yet.  
But the frontend and verification routes should avoid blocking this future shape.

The current same-origin verification routes are a good starting point in that sense.

## Phase2 direction

- move from direct `setPrimaryAddress` updates toward registry / attestation-mediated updates
- centralize route-specific policy in one layer
- handle revoke / expiry / upgrade paths in the same place
