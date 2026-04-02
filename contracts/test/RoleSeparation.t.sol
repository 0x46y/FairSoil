// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {APPIOracle} from "../src/APPIOracle.sol";
import {Covenant} from "../src/Covenant.sol";
import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";

contract RoleSeparationTest is Test {
    FairSoilTokenA internal tokenA;
    FairSoilTokenB internal tokenB;
    SoilTreasury internal treasury;
    Covenant internal covenant;
    APPIOracle internal oracle;

    address internal creator = address(0xCAFE);
    address internal worker = address(0xBEEF);
    address internal arbiter = address(0xAB1A);
    address internal finalizer = address(0xF1A1);
    address internal rewardOperator = address(0xA03);
    address internal outsider = address(0x0BAD);

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

        oracle = new APPIOracle(address(this), address(this));

        tokenA.setPrimaryAddress(creator, true);
        tokenA.setPrimaryAddress(worker, true);

        vm.prank(address(treasury));
        tokenB.mint(address(treasury), 10_000e18);

        treasury.reportTaskCompleted(creator, 1000e18, 0);
        treasury.reportTaskCompleted(worker, 1000e18, 0);
    }

    function testOnlyTemporaryOperatorCanManageTreasuryControls() public {
        vm.prank(outsider);
        vm.expectRevert();
        treasury.setAPPIOracle(address(oracle));

        vm.prank(outsider);
        vm.expectRevert();
        treasury.setDailyUBIAmount(123e18);

        vm.prank(outsider);
        vm.expectRevert();
        treasury.reportTaskCompleted(worker, 10e18, 5);

        treasury.setAPPIOracle(address(oracle));
        treasury.setDailyUBIAmount(123e18);
        treasury.setRewardOperator(rewardOperator, true);

        assertEq(address(treasury.appiOracle()), address(oracle));
        assertEq(treasury.dailyUBIAmount(), 123e18);
        assertTrue(treasury.rewardOperators(rewardOperator));
    }

    function testRewardOperatorCanReportVerifiedRewards() public {
        treasury.setRewardOperator(rewardOperator, true);

        vm.prank(rewardOperator);
        treasury.reportTaskCompleted(worker, 10e18, 5);

        assertEq(tokenB.balanceOf(worker), 1010e18);
        assertEq(treasury.integrityScore(worker), 5);
    }

    function testOnlyTemporaryOperatorCanChangeDisputeArbiter() public {
        vm.prank(outsider);
        vm.expectRevert();
        covenant.setDisputeResolver(arbiter);

        vm.prank(outsider);
        vm.expectRevert();
        covenant.setDisputeFinalizer(finalizer);

        covenant.setDisputeResolver(arbiter);
        covenant.setDisputeFinalizer(finalizer);

        assertEq(covenant.disputeResolver(), arbiter);
        assertEq(covenant.disputeFinalizer(), finalizer);
    }

    function testOnlyDisputeArbiterCanResolveAndFinalizeDisputes() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 300e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 300e18, 0, false);

        uint256 deposit = (300e18 * 500) / 10_000;
        vm.prank(worker);
        tokenB.approve(address(covenant), deposit);
        vm.prank(worker);
        covenant.reportIssue(covenantId, 2500, "Missing assets", "ipfs://worker-evidence");

        vm.prank(creator);
        tokenB.approve(address(covenant), deposit);
        vm.prank(creator);
        covenant.disputeIssue(covenantId, "Counter claim", "ipfs://creator-evidence");

        covenant.setDisputeResolver(arbiter);
        covenant.setDisputeFinalizer(finalizer);

        vm.expectRevert("Resolver only");
        covenant.resolveDispute(covenantId, 5000, 10, 0);

        vm.prank(worker);
        vm.expectRevert("Resolver only");
        covenant.resolveDispute(covenantId, 5000, 10, 0);

        vm.prank(arbiter);
        covenant.resolveDispute(covenantId, 5000, 10, 0);

        vm.prank(creator);
        vm.expectRevert("Finalizer only");
        covenant.finalizeResolution(covenantId);

        vm.prank(arbiter);
        vm.expectRevert("Finalizer only");
        covenant.finalizeResolution(covenantId);

        vm.prank(finalizer);
        covenant.finalizeResolution(covenantId);

        (, , , , , , , , , , , , , Covenant.Status status, bool settled) =
            covenant.covenants(covenantId);
        assertEq(uint256(status), uint256(Covenant.Status.IssueResolved));
        assertTrue(settled);
    }
}
