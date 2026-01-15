# Development Playbook (Codespaces restart)

Quick steps to bring the local chain + contracts + frontend back online after a restart.

## Step 0: Open three terminals
- Terminal A: Local chain (anvil)
- Terminal B: Deploy + setup
- Terminal C: Frontend

## Step 1: Local Chain (Terminal A)
```bash
anvil
```

## Step 2: Deploy (Terminal B)
Export the deployer key (the account you want as owner).
```bash
export PRIVATE_KEY=0xYOUR_PRIVATE_KEY
```

Optional: override Token A decay rate (1e18 = 100% per second).
```bash
export DECAY_RATE_PER_SECOND=10000000000000000
```

Deploy the contracts:
```bash
cd /workspaces/FairSoil/contracts
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast -vvv
```

Copy the addresses printed by the script into `frontend/.env.local`:
```
NEXT_PUBLIC_TOKENA_ADDRESS=0x...
NEXT_PUBLIC_TOKENB_ADDRESS=0x...
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_COVENANT_ADDRESS=0x...
```

### Optional: One-command redeploy
If you want the deploy + env sync in one step:
```bash
cd /workspaces/FairSoil
export PRIVATE_KEY=0xYOUR_PRIVATE_KEY
export WALLET_ADDRESS=0xYOUR_WALLET
./contracts/redeploy.sh
```

## Step 3: The Ritual (Terminal B)
1) Make your wallet a verified primary address (required for UBI).
```bash
cast send $NEXT_PUBLIC_TOKENA_ADDRESS \
  "setPrimaryAddress(address,bool)" 0xYOUR_WALLET true \
  --rpc-url http://127.0.0.1:8545 \
  --private-key $PRIVATE_KEY
```

2) Give yourself Token B (for testing covenants and governance eligibility).
```bash
cast send $NEXT_PUBLIC_TREASURY_ADDRESS \
  "reportTaskCompleted(address,uint256,uint256)" 0xYOUR_WALLET 1000000000000000000000 0 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key $PRIVATE_KEY
```

Notes:
- `reportTaskCompleted` is `onlyOwner`, so it must be sent by the deployer key.
- UBI claims now emit `UBIClaimed` and show up in the integrity trail.

## Step 4: Frontend (Terminal C)
```bash
cd /workspaces/FairSoil/frontend
npm install
npm run dev
```

## Step 5: MetaMask setup
- Make port `8545` public in Codespaces (Ports panel).
- Add a network in MetaMask:
  - RPC URL: `https://<your-codespace>-8545.app.github.dev`
  - Chain ID: `31337`
  - Currency symbol: `ETH`
- If balances/actions look stale, use MetaMask > Settings > Advanced > Reset account.

## When you ask "I restarted, how do I test again?"
Just follow Step 1 → Step 5 in this file. If a contract change was made, always redeploy and refresh `frontend/.env.local`.
