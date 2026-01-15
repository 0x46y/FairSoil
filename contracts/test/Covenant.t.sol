// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";
import {Covenant} from "../src/Covenant.sol";

contract CovenantTest is Test {
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

        tokenA.setPrimaryAddress(creator, true);
        tokenA.setPrimaryAddress(worker, true);

        treasury.reportTaskCompleted(creator, 1000e18, 0);
    }

    function testCovenantHappyPath() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 500e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 500e18, 100);

        vm.prank(worker);
        covenant.submitWork(covenantId);

        vm.prank(creator);
        covenant.approveWork(covenantId);

        assertEq(tokenB.balanceOf(worker), 500e18);
        assertEq(treasury.integrityScore(worker), 100);
    }

    function testCovenantRejectReturnsFunds() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 200e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 200e18, 50);

        vm.prank(worker);
        covenant.submitWork(covenantId);

        uint256 creatorBefore = tokenB.balanceOf(creator);
        vm.prank(creator);
        covenant.rejectWork(covenantId);

        assertEq(tokenB.balanceOf(creator), creatorBefore + 200e18);
    }

    function testCovenantRequiresPrimaryWorker() public {
        address unverified = address(0xD00D);
        vm.prank(creator);
        tokenB.approve(address(covenant), 100e18);

        vm.prank(creator);
        vm.expectRevert("Worker not verified");
        covenant.createCovenant(unverified, 100e18, 0);
    }

    function testIssueFlowAcceptsSplitAndIntegrity() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 300e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 300e18, 0);

        vm.prank(worker);
        covenant.reportIssue(covenantId, 2000, "Scope change");

        uint256 creatorBefore = tokenB.balanceOf(creator);
        vm.prank(creator);
        covenant.acceptIssue(covenantId);

        assertEq(tokenB.balanceOf(worker), 60e18);
        assertEq(tokenB.balanceOf(creator), creatorBefore + 240e18);
        assertEq(treasury.integrityScore(worker), 20);
    }
}
