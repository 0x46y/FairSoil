#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "[1/4] Core smoke"
forge test --match-contract "FairSoilMVPTest|CovenantTest|SoilTreasuryUnclaimedUBITest|CircuitBreakerTest"

echo "[2/4] Phase1 integrated flows"
forge test --match-contract "Phase1IntegratedFlowTest|DisputeResolutionBoundariesTest|RoleSeparationTest"

echo "[3/4] APPI and template/resource domains"
forge test --match-contract "APPIOracleTest|APPIIntegrationTest|ResourceRegistryTest|CovenantLibraryTest|RoyaltyRouterTest"

echo "[4/4] Invariants"
forge test --match-contract FairSoilInvariants
