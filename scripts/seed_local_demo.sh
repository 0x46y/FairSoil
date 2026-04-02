#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_ENV="${FRONTEND_ENV:-$ROOT_DIR/frontend/.env.local}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

REQUESTER_ADDRESS="${REQUESTER_ADDRESS:-0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266}"
WORKER_ADDRESS="${WORKER_ADDRESS:-0x70997970C51812dc3A010C7d01b50e0d17dc79C8}"

TREASURY_SEED_A="${TREASURY_SEED_A:-10000000000000000000000}" # 10000 SOILA
TREASURY_SEED_B="${TREASURY_SEED_B:-10000000000000000000000}" # 10000 SOILB
REQUESTER_SEED_B="${REQUESTER_SEED_B:-100000000000000000000}" # 100 SOILB
WORKER_SEED_B="${WORKER_SEED_B:-50000000000000000000}" # 50 SOILB

if ! command -v cast >/dev/null 2>&1; then
  echo "cast not found. Install Foundry first." >&2
  exit 1
fi

if [[ ! -f "$FRONTEND_ENV" ]]; then
  echo "frontend env file not found: $FRONTEND_ENV" >&2
  exit 1
fi

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "PRIVATE_KEY is required. Export it before running this script." >&2
  exit 1
fi

read_env() {
  local key="$1"
  local value
  value="$(grep -m1 -E "^${key}=" "$FRONTEND_ENV" | cut -d= -f2- || true)"
  printf '%s' "$value"
}

TOKEN_A_ADDRESS="$(read_env NEXT_PUBLIC_TOKENA_ADDRESS)"
TOKEN_B_ADDRESS="$(read_env NEXT_PUBLIC_TOKENB_ADDRESS)"
TREASURY_ADDRESS="$(read_env NEXT_PUBLIC_TREASURY_ADDRESS)"

if [[ -z "$TOKEN_A_ADDRESS" || -z "$TOKEN_B_ADDRESS" || -z "$TREASURY_ADDRESS" ]]; then
  echo "Missing token/treasury addresses in $FRONTEND_ENV" >&2
  exit 1
fi

send_tx() {
  cast send "$@" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
}

call_contract() {
  cast call "$@" --rpc-url "$RPC_URL"
}

normalize_hex() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

big_lt() {
  python3 - "$1" "$2" <<'PY'
import sys
print("1" if int(sys.argv[1]) < int(sys.argv[2]) else "0")
PY
}

big_sub() {
  python3 - "$1" "$2" <<'PY'
import sys
a = int(sys.argv[1])
b = int(sys.argv[2])
print(max(0, a - b))
PY
}

ensure_primary() {
  local account="$1"
  local current
  current="$(call_contract "$TOKEN_A_ADDRESS" "isPrimaryAddress(address)(bool)" "$account" | tr -d '\n\r')"
  if [[ "$current" == "true" ]]; then
    echo "  - $account already verified"
    return
  fi
  send_tx "$TOKEN_A_ADDRESS" "setPrimaryAddress(address,bool)" "$account" true
}

ensure_token_treasury() {
  local token_address="$1"
  local target_treasury="$2"
  local current
  current="$(normalize_hex "$(call_contract "$token_address" "treasury()(address)" | tr -d '\n\r')")"
  if [[ "$current" == "$(normalize_hex "$target_treasury")" ]]; then
    return
  fi
  send_tx "$token_address" "setTreasury(address)" "$target_treasury"
}

mint_token_to_target() {
  local token_address="$1"
  local target_account="$2"
  local target_amount="$3"
  local current_balance
  local missing
  current_balance="$(call_contract "$token_address" "balanceOf(address)(uint256)" "$target_account" | tr -d '\n\r')"
  if [[ "$(big_lt "$current_balance" "$target_amount")" != "1" ]]; then
    echo "  - reserve already at or above target for $target_account"
    return
  fi
  missing="$(big_sub "$target_amount" "$current_balance")"
  send_tx "$token_address" "mint(address,uint256)" "$target_account" "$missing"
}

ensure_advance_cap_b() {
  local target_cap="$1"
  local current_cap
  current_cap="$(call_contract "$TREASURY_ADDRESS" "advanceCapB()(uint256)" | tr -d '\n\r')"
  if [[ "$(big_lt "$current_cap" "$target_cap")" != "1" ]]; then
    echo "  - advance cap already sufficient"
    return
  fi
  send_tx "$TREASURY_ADDRESS" "setAdvanceCapB(uint256)" "$target_cap"
}

seed_wallet_b_to_target() {
  local wallet="$1"
  local target_amount="$2"
  local current_balance
  local missing
  current_balance="$(call_contract "$TOKEN_B_ADDRESS" "balanceOf(address)(uint256)" "$wallet" | tr -d '\n\r')"
  if [[ "$(big_lt "$current_balance" "$target_amount")" != "1" ]]; then
    echo "  - wallet already at or above target: $wallet"
    return
  fi
  missing="$(big_sub "$target_amount" "$current_balance")"
  send_tx "$TREASURY_ADDRESS" "emergencyAdvanceB(address,uint256)" "$wallet" "$missing"
}

echo "Using:"
echo "  TOKEN_A_ADDRESS=$TOKEN_A_ADDRESS"
echo "  TOKEN_B_ADDRESS=$TOKEN_B_ADDRESS"
echo "  TREASURY_ADDRESS=$TREASURY_ADDRESS"
echo "  REQUESTER_ADDRESS=$REQUESTER_ADDRESS"
echo "  WORKER_ADDRESS=$WORKER_ADDRESS"
echo "  RPC_URL=$RPC_URL"
echo "  REQUESTER_SEED_B=$REQUESTER_SEED_B"
echo "  WORKER_SEED_B=$WORKER_SEED_B"

echo
echo "1/7 Set requester + worker as verified primary addresses"
ensure_primary "$REQUESTER_ADDRESS"
ensure_primary "$WORKER_ADDRESS"

echo
echo "2/7 Temporarily point Token A treasury permission to deployer"
ensure_token_treasury "$TOKEN_A_ADDRESS" "$REQUESTER_ADDRESS"

echo
echo "3/7 Mint Token A reserve into SoilTreasury"
mint_token_to_target "$TOKEN_A_ADDRESS" "$TREASURY_ADDRESS" "$TREASURY_SEED_A"

echo
echo "4/7 Restore Token A treasury permission"
ensure_token_treasury "$TOKEN_A_ADDRESS" "$TREASURY_ADDRESS"

echo
echo "5/7 Temporarily point Token B treasury permission to deployer"
ensure_token_treasury "$TOKEN_B_ADDRESS" "$REQUESTER_ADDRESS"

echo
echo "6/7 Mint Token B reserve into SoilTreasury and restore permission"
mint_token_to_target "$TOKEN_B_ADDRESS" "$TREASURY_ADDRESS" "$TREASURY_SEED_B"
ensure_token_treasury "$TOKEN_B_ADDRESS" "$TREASURY_ADDRESS"

echo
echo "7/7 Seed requester + worker with Token B from SoilTreasury"
ensure_advance_cap_b "$TREASURY_SEED_B"
if [[ "$REQUESTER_SEED_B" != "0" ]]; then
  seed_wallet_b_to_target "$REQUESTER_ADDRESS" "$REQUESTER_SEED_B"
fi
if [[ "$WORKER_SEED_B" != "0" ]]; then
  seed_wallet_b_to_target "$WORKER_ADDRESS" "$WORKER_SEED_B"
fi

echo
echo "Local demo seed complete."
echo "Requester and worker are verified."
echo "Treasury has test reserves for Token A and Token B at or above the configured targets."
echo "Requester and worker also have Token B balances at or above the configured starter targets."
