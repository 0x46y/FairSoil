// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {Covenant} from "../src/Covenant.sol";
import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";

contract DisputeResolutionBoundariesTest is Test {
    FairSoilTokenA internal tokenA;
    FairSoilTokenB internal tokenB;
    SoilTreasury internal treasury;
    Covenant internal covenant;

    address internal creator = address(0xCAFE);
    address internal worker = address(0xBEEF);

    function setUp() public {
        FairSoilTokenA implementation = new FairSoilTokenA();
        bytes memory initData = abi.encodeCall(FairSoilTokenA.initialize, (1e16));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        tokenA = FairSoilTokenA(address(proxy));

        tokenB = new FairSoilTokenB(address(0));
        treasury = new SoilTreasury(address(tokenA), address(tokenB));
        tokenA.setTreasury(address(treasury));
        tokenB.setTreasury(address(treasury));

        covenant = new Covenant(address(tokenB), address(tokenA), address(treasury));
        treasury.setCovenant(address(covenant));
        tokenA.setCovenant(address(covenant));

        tokenA.setPrimaryAddress(creator, true);
        tokenA.setPrimaryAddress(worker, true);

        vm.prank(address(treasury));
        tokenB.mint(address(treasury), 10_000e18);

        treasury.reportTaskCompleted(creator, 1000e18, 0);
        treasury.reportTaskCompleted(worker, 1000e18, 0);
    }

    function _createDisputedCovenant(uint256 reward) internal returns (uint256 covenantId, uint256 deposit) {
        vm.prank(creator);
        tokenB.approve(address(covenant), reward);

        vm.prank(creator);
        covenantId = covenant.createCovenant(worker, reward, 0, false);

        deposit = (reward * 500) / 10_000;
        vm.prank(worker);
        tokenB.approve(address(covenant), deposit);
        vm.prank(worker);
        covenant.reportIssue(covenantId, 2500, "Worker issue", "ipfs://worker");

        vm.prank(creator);
        tokenB.approve(address(covenant), deposit);
        vm.prank(creator);
        covenant.disputeIssue(covenantId, "Creator dispute", "ipfs://creator");
    }

    function testResolveDisputeRequiresDisputedStatus() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 200e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 200e18, 0, false);

        vm.expectRevert("Not disputed");
        covenant.resolveDispute(covenantId, 5000, 10, 0);
    }

    function testFinalizeRequiresProposalStatus() public {
        (uint256 covenantId,) = _createDisputedCovenant(300e18);

        vm.expectRevert("Not proposed");
        covenant.finalizeResolution(covenantId);
    }

    function testFinalizeCannotRunTwice() public {
        (uint256 covenantId,) = _createDisputedCovenant(300e18);

        covenant.resolveDispute(covenantId, 5000, 10, 0);
        covenant.finalizeResolution(covenantId);

        vm.expectRevert("Not proposed");
        covenant.finalizeResolution(covenantId);
    }

    function testResolveCanUpdateProposalBeforeFinalize() public {
        (uint256 covenantId, uint256 deposit) = _createDisputedCovenant(400e18);

        uint256 workerBefore = tokenB.balanceOf(worker);
        uint256 creatorBefore = tokenB.balanceOf(creator);

        covenant.resolveDispute(covenantId, 2500, 10, 0);
        covenant.resolveDispute(covenantId, 7500, 30, 0);
        covenant.finalizeResolution(covenantId);

        assertEq(covenant.issueDeposits(covenantId), 0);
        assertEq(covenant.disputeDeposits(covenantId), 0);
        assertEq(tokenB.balanceOf(worker), workerBefore + 300e18 + deposit);
        assertEq(tokenB.balanceOf(creator), creatorBefore + 100e18 + deposit);
        assertEq(treasury.integrityScore(worker), 30);
    }
}
