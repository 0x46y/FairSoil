// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";
import {Covenant} from "../src/Covenant.sol";

contract ScoreRoutingTest is Test {
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

    function testRejectPenalizesPayAndProcess() public {
        _seedScores();
        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 100e18, 0, false);

        vm.prank(worker);
        covenant.submitWork(covenantId);

        uint256 payBefore = treasury.payScore(creator);
        uint256 processBefore = treasury.processScore(worker);

        vm.prank(creator);
        covenant.rejectWork(covenantId);

        assertEq(treasury.payScore(creator), payBefore - 10);
        assertEq(treasury.processScore(worker), processBefore - 5);
    }

    function testCancelPenalizesPayAndProcess() public {
        _seedScores();
        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 100e18, 0, false);

        uint256 payBefore = treasury.payScore(creator);
        uint256 processBefore = treasury.processScore(worker);

        vm.prank(creator);
        covenant.cancel(covenantId);

        assertEq(treasury.payScore(creator), payBefore - 5);
        assertEq(treasury.processScore(worker), processBefore - 2);
    }

    function testApproveAddsPayScore() public {
        _seedScores();
        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 100e18, 0, false);

        vm.prank(worker);
        covenant.submitWork(covenantId);

        uint256 payBefore = treasury.payScore(creator);
        vm.prank(creator);
        covenant.approveWork(covenantId);
        assertGt(treasury.payScore(creator), payBefore);
    }

    function _seedScores() internal {
        treasury.addPayScore(creator, 20);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 1e18, 5, false);
        vm.prank(worker);
        covenant.submitWork(covenantId);
        vm.prank(creator);
        covenant.approveWork(covenantId);
        assertGt(treasury.processScore(worker), 0);
    }
}
