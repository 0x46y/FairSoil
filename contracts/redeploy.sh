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
read -r TOKEN_A TOKEN_B TREASURY COVENANT RESOURCE_REGISTRY COVENANT_LIBRARY <<<"$(python3 - <<'PY'
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
resource_registry = last_address("ResourceRegistry")
covenant_library = last_address("CovenantLibrary")

if not token_a:
  # Fallback if proxy name is missing.
  token_a = last_address("FairSoilTokenA")

if not all([token_a, token_b, treasury, covenant, resource_registry, covenant_library]):
  print("", file=sys.stderr)
  print("Unable to parse deploy addresses from broadcast JSON.", file=sys.stderr)
  print(
    " ".join(
      [
        f"tokenA={token_a}",
        f"tokenB={token_b}",
        f"treasury={treasury}",
        f"covenant={covenant}",
        f"resourceRegistry={resource_registry}",
        f"covenantLibrary={covenant_library}",
      ]
    ),
    file=sys.stderr,
  )
  sys.exit(1)

print(token_a, token_b, treasury, covenant, resource_registry, covenant_library)
PY
)"

if [[ -n "${NEXT_PUBLIC_RPC_URL:-}" ]]; then
  PUBLIC_RPC_URL="$NEXT_PUBLIC_RPC_URL"
elif [[ -n "${CODESPACE_NAME:-}" ]]; then
  PUBLIC_RPC_URL="https://${CODESPACE_NAME}-8545.app.github.dev/"
else
  PUBLIC_RPC_URL="$RPC_URL"
fi

existing_env_line() {
  local key="$1"
  if [[ ! -f "$FRONTEND_ENV" ]]; then
    return 1
  fi
  grep -m1 -E "^${key}=" "$FRONTEND_ENV" || true
}

append_env_line_or_comment() {
  local key="$1"
  local fallback="$2"
  local line
  line="$(existing_env_line "$key")"
  if [[ -n "$line" ]]; then
    printf '%s\n' "$line"
  else
    printf '%s\n' "$fallback"
  fi
}

{
cat <<EOF
NEXT_PUBLIC_TOKENA_ADDRESS=$TOKEN_A
NEXT_PUBLIC_TOKENB_ADDRESS=$TOKEN_B
NEXT_PUBLIC_TREASURY_ADDRESS=$TREASURY
NEXT_PUBLIC_COVENANT_ADDRESS=$COVENANT
NEXT_PUBLIC_RESOURCE_REGISTRY_ADDRESS=$RESOURCE_REGISTRY
NEXT_PUBLIC_COVENANT_LIBRARY_ADDRESS=$COVENANT_LIBRARY
NEXT_PUBLIC_RPC_URL=$PUBLIC_RPC_URL

NEXT_PUBLIC_AUDIT_DISPUTE_THRESHOLD=5
NEXT_PUBLIC_AUDIT_TREASURY_THRESHOLD=20
NEXT_PUBLIC_AUDIT_RESERVE_A_THRESHOLD=100
NEXT_PUBLIC_AUDIT_RESERVE_B_THRESHOLD=100
NEXT_PUBLIC_AUDIT_WINDOW_HOURS=24
EOF

echo
echo "# World ID (real widget flow)"
append_env_line_or_comment "NEXT_PUBLIC_WORLD_ID_APP_ID" "# NEXT_PUBLIC_WORLD_ID_APP_ID=app_..."
append_env_line_or_comment "NEXT_PUBLIC_WORLD_ID_ENVIRONMENT" "# NEXT_PUBLIC_WORLD_ID_ENVIRONMENT=production"
append_env_line_or_comment "NEXT_PUBLIC_WORLD_ID_ACTION_ID" "# NEXT_PUBLIC_WORLD_ID_ACTION_ID=verify-fairsoil"
append_env_line_or_comment "NEXT_PUBLIC_WORLD_ID_MOCK" "# NEXT_PUBLIC_WORLD_ID_MOCK=false"
append_env_line_or_comment "WORLD_ID_RP_ID" "# WORLD_ID_RP_ID=rp_..."
append_env_line_or_comment "RP_SIGNING_KEY" "# RP_SIGNING_KEY=0x..."
echo "# Optional: when unset, the app falls back to https://developer.world.org/api/v4/verify/\${WORLD_ID_RP_ID}"
append_env_line_or_comment "WORLD_ID_VERIFY_URL" "# WORLD_ID_VERIFY_URL="
append_env_line_or_comment "NEXT_PUBLIC_WORLD_ID_VERIFY_URL" "# NEXT_PUBLIC_WORLD_ID_VERIFY_URL="
append_env_line_or_comment "WORLD_ID_DEBUG" "# WORLD_ID_DEBUG=false"

echo
echo "# Optional integrations"
append_env_line_or_comment "NEXT_PUBLIC_ZKNFC_VERIFIER_URL" "# NEXT_PUBLIC_ZKNFC_VERIFIER_URL="
append_env_line_or_comment "NEXT_PUBLIC_ZKNFC_MOCK" "# NEXT_PUBLIC_ZKNFC_MOCK=true"
append_env_line_or_comment "NEXT_PUBLIC_EXTERNAL_ADJ_URL" "# NEXT_PUBLIC_EXTERNAL_ADJ_URL="
} > "$FRONTEND_ENV"

echo "Updated $FRONTEND_ENV"
echo "TOKEN_A=$TOKEN_A"
echo "TOKEN_B=$TOKEN_B"
echo "TREASURY=$TREASURY"
echo "COVENANT=$COVENANT"
echo "RESOURCE_REGISTRY=$RESOURCE_REGISTRY"
echo "COVENANT_LIBRARY=$COVENANT_LIBRARY"
echo "RPC_URL=$PUBLIC_RPC_URL"

if [[ -n "${DAILY_UBI_AMOUNT:-}" ]]; then
  cast send "$TREASURY" \
    "setDailyUBIAmount(uint256)" "$DAILY_UBI_AMOUNT" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY"
  echo "Applied DAILY_UBI_AMOUNT=$DAILY_UBI_AMOUNT"
fi

if [[ -n "${GOVERNANCE_MIN_TOKEN_B:-}" || -n "${GOVERNANCE_MIN_INTEGRITY:-}" ]]; then
  cast send "$TREASURY" \
    "setGovernanceThresholds(uint256,uint256)" \
    "${GOVERNANCE_MIN_TOKEN_B:-1000000000000000000}" \
    "${GOVERNANCE_MIN_INTEGRITY:-100}" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY"
  echo "Applied governance thresholds"
fi

if [[ -n "${CRYSTALLIZATION_RATE_BPS:-}" ]]; then
  cast send "$TREASURY" \
    "setCrystallizationRateBps(uint256)" "$CRYSTALLIZATION_RATE_BPS" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY"
  echo "Applied CRYSTALLIZATION_RATE_BPS=$CRYSTALLIZATION_RATE_BPS"
fi

if [[ -n "${CRYSTALLIZATION_FEE_BPS:-}" ]]; then
  cast send "$TREASURY" \
    "setCrystallizationFeeBps(uint256)" "$CRYSTALLIZATION_FEE_BPS" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY"
  echo "Applied CRYSTALLIZATION_FEE_BPS=$CRYSTALLIZATION_FEE_BPS"
fi

if [[ -n "${APPI_MAX_INCREASE_BPS:-}" || -n "${APPI_MAX_DECREASE_BPS:-}" ]]; then
  cast send "$TREASURY" \
    "setAPPIChangeLimits(uint256,uint256)" \
    "${APPI_MAX_INCREASE_BPS:-500}" \
    "${APPI_MAX_DECREASE_BPS:-200}" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY"
  echo "Applied APPI change limits"
fi

if [[ -n "${DEFICIT_CAP_A:-}" ]]; then
  cast send "$TREASURY" \
    "setDeficitCapA(uint256)" "$DEFICIT_CAP_A" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY"
  echo "Applied DEFICIT_CAP_A=$DEFICIT_CAP_A"
fi

if [[ -n "${ADVANCE_CAP_B:-}" ]]; then
  cast send "$TREASURY" \
    "setAdvanceCapB(uint256)" "$ADVANCE_CAP_B" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY"
  echo "Applied ADVANCE_CAP_B=$ADVANCE_CAP_B"
fi

if [[ -n "${DISPUTE_RESOLVER:-}" ]]; then
  cast send "$COVENANT" \
    "setDisputeResolver(address)" "$DISPUTE_RESOLVER" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY"
  echo "Applied DISPUTE_RESOLVER=$DISPUTE_RESOLVER"
fi

if [[ -n "${APPI_MIN_UNIQUE_REPORTERS:-}" || -n "${APPI_MIN_INTEGRITY_SCORE:-}" ]]; then
  APPI_ORACLE_ADDRESS="$(cast call "$TREASURY" "appiOracle()(address)" --rpc-url "$RPC_URL")"
  if [[ "$APPI_ORACLE_ADDRESS" != "0x0000000000000000000000000000000000000000" ]]; then
    cast send "$APPI_ORACLE_ADDRESS" \
      "setThresholds(uint256,uint256)" \
      "${APPI_MIN_UNIQUE_REPORTERS:-5}" \
      "${APPI_MIN_INTEGRITY_SCORE:-0}" \
      --rpc-url "$RPC_URL" \
      --private-key "$PRIVATE_KEY"
    echo "Applied APPI thresholds"
  else
    echo "Skipping APPI threshold overrides because appiOracle is not set."
  fi
fi

if [[ -n "${APPI_CONFIDENCE_BPS:-}" || -n "${APPI_MAX_REPORTS:-}" ]]; then
  APPI_ORACLE_ADDRESS="${APPI_ORACLE_ADDRESS:-$(cast call "$TREASURY" "appiOracle()(address)" --rpc-url "$RPC_URL")}"
  if [[ "$APPI_ORACLE_ADDRESS" != "0x0000000000000000000000000000000000000000" ]]; then
    cast send "$APPI_ORACLE_ADDRESS" \
      "setConfidence(uint256,uint256)" \
      "${APPI_CONFIDENCE_BPS:-10000}" \
      "${APPI_MAX_REPORTS:-50}" \
      --rpc-url "$RPC_URL" \
      --private-key "$PRIVATE_KEY"
    echo "Applied APPI confidence settings"
  else
    echo "Skipping APPI confidence overrides because appiOracle is not set."
  fi
fi

if [[ -n "${ROYALTY_MAX_BPS:-}" || -n "${ROYALTY_MAX_AMOUNT:-}" ]]; then
  cast send "$COVENANT_LIBRARY" \
    "setRoyaltyCaps(uint256,uint256)" \
    "${ROYALTY_MAX_BPS:-1000}" \
    "${ROYALTY_MAX_AMOUNT:-50000000000000000000}" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY"
  echo "Applied royalty caps"
fi

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
