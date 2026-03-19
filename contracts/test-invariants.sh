#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

forge test --match-contract FairSoilInvariants
