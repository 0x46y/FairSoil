# FairSoil agent notes

## Current status
- Contracts: Token A/B + SoilTreasury are working; Covenant.sol added for escrowed Token B rewards with create/submit/approve/reject/cancel.
- Frontend: Task completion form calls `reportTaskCompleted`, updates Token B and integrity score; new Covenant creation form added.
- Local chain: Anvil is used; redeploy after restart and update `.env.local` addresses (including Covenant).

## Key files
- contracts/src/Covenant.sol
- contracts/script/Deploy.s.sol (now returns covenant address)
- contracts/test/Covenant.t.sol
- frontend/src/app/page.tsx (Task completion + Covenant form)
- frontend/src/lib/abi.ts, frontend/src/lib/contracts.ts

## Environment variables
```
NEXT_PUBLIC_TOKENA_ADDRESS=0x...
NEXT_PUBLIC_TOKENB_ADDRESS=0x...
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_COVENANT_ADDRESS=0x...
```

## Notes
- `reportTaskCompleted` is `onlyOwner`, so MetaMask must use the deployer wallet.
- Covenant creation requires Token B approval first; UI does approve + create in sequence.
- Token A decay rate can be overridden at deploy with `DECAY_RATE_PER_SECOND`.
