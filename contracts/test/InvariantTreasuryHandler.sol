// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SoilTreasury} from "../src/SoilTreasury.sol";
import {APPIOracle} from "../src/APPIOracle.sol";

contract InvariantTreasuryHandler {
    SoilTreasury public treasury;
    APPIOracle public oracle;

    constructor(address treasuryAddress, address oracleAddress) {
        treasury = SoilTreasury(treasuryAddress);
        oracle = APPIOracle(oracleAddress);
    }

    function claimUBI() external {
        uint256 lastClaim = treasury.lastClaimTimestamp(address(this));
        if (lastClaim != 0 && block.timestamp < lastClaim + 1 days) {
            return;
        }
        treasury.claimUBI();
    }

    function accrueUBI() external {
        treasury.accrueUBI();
    }

    function claimUnclaimed(uint256 offset) external {
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay == 0) {
            return;
        }
        uint256 range = 1 + (offset % 7);
        uint256 fromDay = currentDay > range ? currentDay - range : 0;
        uint256 toDay = currentDay;
        bool hasAmount;
        for (uint256 day = fromDay; day <= toDay; day++) {
            if (treasury.unclaimed(address(this), day) > 0) {
                hasAmount = true;
                break;
            }
            if (day == toDay) {
                break;
            }
        }
        if (!hasAmount) {
            return;
        }
        treasury.claimUnclaimed(fromDay, toDay);
    }

    function submitPrice(uint256 price) external {
        uint256 normalized = 1e18 + (price % 1e18);
        oracle.submitPrice(1, normalized);
    }

    function applyAPPI(uint256 dayOffset) external {
        if (treasury.circuitState() != SoilTreasury.CircuitState.Normal) {
            return;
        }
        uint256 currentDay = block.timestamp / 1 days;
        uint256 day = currentDay > dayOffset ? currentDay - (dayOffset % (currentDay + 1)) : currentDay;
        if (oracle.dailyIndex(day) == 0) {
            return;
        }
        treasury.applyAPPI(day);
    }

    function setCircuitState(uint8 state) external {
        SoilTreasury.CircuitState newState = SoilTreasury.CircuitState(state % 3);
        treasury.setCircuitState(newState);
    }

    function snapshotReserves() external {
        treasury.snapshotReserves();
    }

    function settleAdvanceB(uint256 amount) external {
        uint256 normalized = 1 + (amount % 1e18);
        treasury.settleAdvanceB(address(this), normalized);
    }

    function recordTreasuryIn(uint256 amount, uint8 reasonType) external {
        uint256 normalized = 1 + (amount % 1e18);
        uint8 bucket = reasonType % 4;
        if (bucket == 0) {
            treasury.recordFee(address(this), normalized);
        } else if (bucket == 1) {
            treasury.recordTax(address(this), normalized);
        } else if (bucket == 2) {
            treasury.recordSlashing(address(this), normalized);
        } else {
            treasury.recordExternalIn(address(this), normalized);
        }
    }
}
