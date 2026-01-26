// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SoilTreasury} from "../src/SoilTreasury.sol";
import {Covenant} from "../src/Covenant.sol";

contract InvariantWorkerHandler {
    SoilTreasury public treasury;
    Covenant public covenant;

    constructor(address treasuryAddress, address covenantAddress) {
        treasury = SoilTreasury(treasuryAddress);
        covenant = Covenant(covenantAddress);
    }

    function submitWork(uint256 covenantId) external {
        covenant.submitWork(covenantId);
    }

    function reportIssue(uint256 covenantId, uint256 claimBps) external {
        covenant.reportIssue(covenantId, claimBps, "issue", "evidence");
    }
}
