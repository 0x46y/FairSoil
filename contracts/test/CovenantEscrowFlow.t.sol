// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";
import {Covenant} from "../src/Covenant.sol";

contract CovenantEscrowFlowTest is Test {
    FairSoilTokenA internal tokenA;
    FairSoilTokenB internal tokenB;
    SoilTreasury internal treasury;
    Covenant internal covenant;

    address internal creator = address(0xC0FFEE);
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
        tokenA.setCovenant(address(covenant));
        treasury.setCovenant(address(covenant));

        tokenA.setPrimaryAddress(worker, true);
        tokenA.setPrimaryAddress(creator, true);

        treasury.setDeficitCapA(1_000_000e18);
        treasury.emergencyMintA(creator, 1_000e18);
        treasury.reportTaskCompleted(creator, 1_000e18, 0);

        vm.prank(creator);
        tokenA.approve(address(covenant), 1_000e18);
        vm.prank(creator);
        tokenB.approve(address(covenant), 1_000e18);
    }

    function testApproveWorkEmitsEscrowReleaseA() public {
        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 100e18, 0, true);

        vm.prank(worker);
        covenant.submitWork(covenantId);

        vm.expectEmit(true, true, true, true);
        emit Covenant.EscrowReleased(covenantId, Covenant.PaymentToken.TokenA, 0, 0, 100e18);
        vm.prank(creator);
        covenant.approveWork(covenantId);
    }

    function testRejectWorkEmitsEscrowReleaseA() public {
        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 100e18, 0, true);

        vm.prank(worker);
        covenant.submitWork(covenantId);

        vm.expectEmit(true, true, true, true);
        emit Covenant.EscrowReleased(covenantId, Covenant.PaymentToken.TokenA, 0, 100e18, 0);
        vm.prank(creator);
        covenant.rejectWork(covenantId);
    }

    function testApproveWorkEmitsEscrowReleaseB() public {
        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 100e18, 0, false);

        vm.prank(worker);
        covenant.submitWork(covenantId);

        vm.expectEmit(true, true, true, true);
        emit Covenant.EscrowReleased(covenantId, Covenant.PaymentToken.TokenB, 100e18, 0, 0);
        vm.prank(creator);
        covenant.approveWork(covenantId);
    }

    function testRejectWorkEmitsEscrowReleaseB() public {
        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 100e18, 0, false);

        vm.prank(worker);
        covenant.submitWork(covenantId);

        vm.expectEmit(true, true, true, true);
        emit Covenant.EscrowReleased(covenantId, Covenant.PaymentToken.TokenB, 0, 100e18, 0);
        vm.prank(creator);
        covenant.rejectWork(covenantId);
    }

    function testIssueAcceptEmitsEscrowReleaseB() public {
        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 100e18, 0, false);

        vm.prank(worker);
        covenant.reportIssue(covenantId, 5_000, "issue", "evidence");

        vm.expectEmit(true, true, true, true);
        emit Covenant.EscrowReleased(covenantId, Covenant.PaymentToken.TokenB, 50e18, 50e18, 0);
        vm.prank(creator);
        covenant.acceptIssue(covenantId);
    }

    function testDisputeFinalizeEmitsEscrowReleaseB() public {
        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 100e18, 0, false);

        vm.prank(worker);
        covenant.reportIssue(covenantId, 5_000, "issue", "evidence");
        vm.prank(creator);
        covenant.disputeIssue(covenantId, "dispute", "evidence");

        covenant.resolveDispute(covenantId, 7_000, 0, 0);

        vm.expectEmit(true, true, true, true);
        emit Covenant.EscrowReleased(covenantId, Covenant.PaymentToken.TokenB, 70e18, 30e18, 0);
        covenant.finalizeResolution(covenantId);
    }
}

    function testIssueAcceptEmitsEscrowReleaseA() public {
        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 100e18, 0, true);

        vm.prank(worker);
        covenant.reportIssue(covenantId, 5_000, "issue", "evidence");

        vm.expectEmit(true, true, true, true);
        emit Covenant.EscrowReleased(covenantId, Covenant.PaymentToken.TokenA, 0, 50e18, 50e18);
        vm.prank(creator);
        covenant.acceptIssue(covenantId);
    }

    function testDisputeFinalizeEmitsEscrowReleaseA() public {
        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 100e18, 0, true);

        vm.prank(worker);
        covenant.reportIssue(covenantId, 5_000, "issue", "evidence");
        vm.prank(creator);
        covenant.disputeIssue(covenantId, "dispute", "evidence");

        covenant.resolveDispute(covenantId, 7_000, 0, 0);

        vm.expectEmit(true, true, true, true);
        emit Covenant.EscrowReleased(covenantId, Covenant.PaymentToken.TokenA, 0, 30e18, 70e18);
        covenant.finalizeResolution(covenantId);
    }
}

contract CovenantEscrowDecayTest is Test {
    FairSoilTokenA internal tokenA;
    FairSoilTokenB internal tokenB;
    SoilTreasury internal treasury;
    Covenant internal covenant;

    address internal creator = address(0xCAFE);
    address internal worker = address(0xB0B);

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
        tokenA.setCovenant(address(covenant));
        treasury.setCovenant(address(covenant));

        tokenA.setPrimaryAddress(worker, true);
        tokenA.setPrimaryAddress(creator, true);

        treasury.setDeficitCapA(1_000_000e18);
        treasury.emergencyMintA(creator, 1_000e18);

        vm.prank(creator);
        tokenA.approve(address(covenant), 1_000e18);
    }

    function testRejectWorkAppliesDecayToRefund() public {
        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 100e18, 0, true);

        vm.prank(worker);
        covenant.submitWork(covenantId);

        vm.warp(block.timestamp + 10 days);

        uint256 balanceBefore = tokenA.balanceOf(creator);
        vm.prank(creator);
        covenant.rejectWork(covenantId);
        uint256 balanceAfter = tokenA.balanceOf(creator);

        assertLt(balanceAfter - balanceBefore, 100e18);
    }
}
