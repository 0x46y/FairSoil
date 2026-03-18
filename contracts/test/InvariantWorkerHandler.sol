// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SoilTreasury} from "../src/SoilTreasury.sol";
import {Covenant} from "../src/Covenant.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract InvariantWorkerHandler {
    SoilTreasury public treasury;
    Covenant public covenant;
    IERC20 public tokenB;

    constructor(address treasuryAddress, address covenantAddress, address tokenBAddress) {
        treasury = SoilTreasury(treasuryAddress);
        covenant = Covenant(covenantAddress);
        tokenB = IERC20(tokenBAddress);
        tokenB.approve(address(covenant), type(uint256).max);
    }

    function submitWork(uint256 covenantId) external {
        covenant.submitWork(covenantId);
    }

    function reportIssue(uint256 covenantId, uint256 claimBps) external {
        covenant.reportIssue(covenantId, claimBps, "issue", "evidence");
    }
}
