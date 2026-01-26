// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {SoilTreasury} from "../src/SoilTreasury.sol";
import {Covenant} from "../src/Covenant.sol";

contract InvariantCreatorHandler {
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

    function createCovenantWithMode(
        address worker,
        uint256 reward,
        uint256 integrity,
        bool payInTokenA,
        uint8 mode
    ) external returns (uint256) {
        Covenant.PaymentMode paymentMode = Covenant.PaymentMode(mode % 3);
        return covenant.createCovenantWithMode(worker, reward, integrity, payInTokenA, paymentMode);
    }

    function approveWork(uint256 covenantId) external {
        covenant.approveWork(covenantId);
    }

    function rejectWork(uint256 covenantId) external {
        covenant.rejectWork(covenantId);
    }

    function cancel(uint256 covenantId) external {
        covenant.cancel(covenantId);
    }

    function acceptIssue(uint256 covenantId) external {
        covenant.acceptIssue(covenantId);
    }

    function disputeIssue(uint256 covenantId) external {
        covenant.disputeIssue(covenantId, "dispute", "evidence");
    }
}
