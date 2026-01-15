#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
FRONTEND_ENV="$ROOT_DIR/frontend/.env.local"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
CHAIN_ID="${CHAIN_ID:-31337}"

if ! command -v forge >/dev/null 2>&1; then
  echo "forge not found. Install Foundry first." >&2
  exit 1
fi

if ! command -v cast >/dev/null 2>&1; then
  echo "cast not found. Install Foundry first." >&2
  exit 1
fi

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "PRIVATE_KEY is required (export PRIVATE_KEY=0x...)." >&2
  exit 1
fi

echo "Deploying contracts to $RPC_URL (chain $CHAIN_ID)..."
cd "$CONTRACTS_DIR"

forge script script/Deploy.s.sol \
  --rpc-url "$RPC_URL" \
  --broadcast \
  -vvv

BROADCAST_FILE="$CONTRACTS_DIR/broadcast/Deploy.s.sol/${CHAIN_ID}/run-latest.json"
if [[ ! -f "$BROADCAST_FILE" ]]; then
  echo "Broadcast file not found: $BROADCAST_FILE" >&2
  exit 1
fi

export BROADCAST_FILE
read -r TOKEN_A TOKEN_B TREASURY COVENANT <<<"$(python3 - <<'PY'
import json
import os
import sys
from pathlib import Path

path_value = os.environ.get("BROADCAST_FILE")
if not path_value:
  print("BROADCAST_FILE env not set.", file=sys.stderr)
  sys.exit(1)

path = Path(path_value)
data = json.loads(path.read_text())
txs = data.get("transactions", [])

def last_address(name):
  for tx in reversed(txs):
    if tx.get("contractName") == name and tx.get("contractAddress"):
      return tx["contractAddress"]
  return None

token_a = last_address("ERC1967Proxy")
token_b = last_address("FairSoilTokenB")
treasury = last_address("SoilTreasury")
covenant = last_address("Covenant")

if not token_a:
  # Fallback if proxy name is missing.
  token_a = last_address("FairSoilTokenA")

if not all([token_a, token_b, treasury, covenant]):
  print("", file=sys.stderr)
  print("Unable to parse deploy addresses from broadcast JSON.", file=sys.stderr)
  print(f"tokenA={token_a} tokenB={token_b} treasury={treasury} covenant={covenant}", file=sys.stderr)
  sys.exit(1)

print(token_a, token_b, treasury, covenant)
PY
)"

if [[ -n "${NEXT_PUBLIC_RPC_URL:-}" ]]; then
  PUBLIC_RPC_URL="$NEXT_PUBLIC_RPC_URL"
elif [[ -n "${CODESPACE_NAME:-}" ]]; then
  PUBLIC_RPC_URL="https://${CODESPACE_NAME}-8545.app.github.dev/"
else
  PUBLIC_RPC_URL="$RPC_URL"
fi

cat > "$FRONTEND_ENV" <<EOF
NEXT_PUBLIC_TOKENA_ADDRESS=$TOKEN_A
NEXT_PUBLIC_TOKENB_ADDRESS=$TOKEN_B
NEXT_PUBLIC_TREASURY_ADDRESS=$TREASURY
NEXT_PUBLIC_COVENANT_ADDRESS=$COVENANT
NEXT_PUBLIC_RPC_URL=$PUBLIC_RPC_URL
EOF

echo "Updated $FRONTEND_ENV"
echo "TOKEN_A=$TOKEN_A"
echo "TOKEN_B=$TOKEN_B"
echo "TREASURY=$TREASURY"
echo "COVENANT=$COVENANT"
echo "RPC_URL=$PUBLIC_RPC_URL"

if [[ -n "${WALLET_ADDRESS:-}" ]]; then
  echo "Setting primary address and minting Token B for $WALLET_ADDRESS..."
  cast send "$TOKEN_A" \
    "setPrimaryAddress(address,bool)" "$WALLET_ADDRESS" true \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY"

  cast send "$TREASURY" \
    "reportTaskCompleted(address,uint256,uint256)" "$WALLET_ADDRESS" 1000000000000000000000 0 \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY"
else
  echo "WALLET_ADDRESS not set; skipping primary address + Token B mint."
fi
