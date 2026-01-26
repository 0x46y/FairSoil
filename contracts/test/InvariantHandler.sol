// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {SoilTreasury} from "../src/SoilTreasury.sol";
import {Covenant} from "../src/Covenant.sol";

// Minimal handler for invariant fuzzing.
// Extend with additional actions as new flows are stabilized.
contract InvariantHandler {
    SoilTreasury public treasury;
    Covenant public covenant;
    IERC20 public tokenA;
    IERC20 public tokenB;

    constructor(address treasuryAddress, address covenantAddress, address tokenAAddress, address tokenBAddress) {
        treasury = SoilTreasury(treasuryAddress);
        covenant = Covenant(covenantAddress);
        tokenA = IERC20(tokenAAddress);
        tokenB = IERC20(tokenBAddress);
    }

    function claimUBI() external {
        treasury.claimUBI();
    }

    function approveTokenA(uint256 amount) external {
        tokenA.approve(address(covenant), amount);
    }

    function approveTokenB(uint256 amount) external {
        tokenB.approve(address(covenant), amount);
    }

    function createCovenantA(address worker, uint256 reward, uint256 integrity) external returns (uint256) {
        return covenant.createCovenant(worker, reward, integrity, true);
    }

    function createCovenantB(address worker, uint256 reward, uint256 integrity) external returns (uint256) {
        return covenant.createCovenant(worker, reward, integrity, false);
    }
}
