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
- Evidence/Chat: plan is off-chain storage (IPFS/Arweave/etc) + on-chain hash/URI references.
- Dispute UX: consider evidence URIs for both sides, AI summary (off-chain), and multi-step resolve to avoid mistakes.

## Milestones
- Covenant end-to-end flow confirmed: Create -> Submit -> Approve from UI updates Token B balance and adds integrity via Treasury.
- 2026/01/15: 紛争（Dispute）および最終裁定（Resolve）のフルフロー疎通を確認。100%の計算精度で資産とスコアが移動することを実証。
