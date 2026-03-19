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
        tokenA.setCovenant(address(covenant));

        tokenA.setPrimaryAddress(creator, true);
        tokenA.setPrimaryAddress(worker, true);

        vm.prank(address(treasury));
        tokenB.mint(address(treasury), 10_000e18);

        treasury.reportTaskCompleted(creator, 1000e18, 0);
        treasury.reportTaskCompleted(worker, 1000e18, 0);
    }

    function _deposit(uint256 reward) internal pure returns (uint256) {
        return (reward * 500) / 10_000;
    }

    function testCovenantHappyPath() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 500e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 500e18, 100, false);

        uint256 workerBefore = tokenB.balanceOf(worker);
        vm.prank(worker);
        covenant.submitWork(covenantId);

        vm.prank(creator);
        covenant.approveWork(covenantId);

        assertEq(tokenB.balanceOf(worker), workerBefore + 500e18);
        assertEq(treasury.integrityScore(worker), 100);
    }

    function testCovenantRejectReturnsFunds() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 200e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 200e18, 50, false);

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
        covenant.createCovenant(unverified, 100e18, 0, false);
    }

    function testCreatorCanSetTransparencyNote() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 100e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 100e18, 0, false);

        bytes32 digest = keccak256(bytes("{\"scope\":\"repair\"}"));
        vm.prank(creator);
        covenant.setTransparencyNote(covenantId, "{\"scope\":\"repair\"}", digest);

        assertEq(covenant.transparencyNotes(covenantId), "{\"scope\":\"repair\"}");
        assertEq(covenant.transparencyDigests(covenantId), digest);
    }

    function testOnlyCreatorCanSetTransparencyNote() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 100e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 100e18, 0, false);

        vm.prank(worker);
        vm.expectRevert("Creator only");
        covenant.setTransparencyNote(covenantId, "note", keccak256(bytes("note")));
    }

    function testIssueFlowAcceptsSplitAndIntegrity() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 300e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 300e18, 0, false);

        uint256 workerBefore = tokenB.balanceOf(worker);
        uint256 creatorBefore = tokenB.balanceOf(creator);
        uint256 deposit = _deposit(300e18);
        vm.prank(worker);
        tokenB.approve(address(covenant), deposit);
        vm.prank(worker);
        covenant.reportIssue(covenantId, 2000, "Scope change", "ipfs://evidence");

        vm.prank(creator);
        covenant.acceptIssue(covenantId);

        assertEq(tokenB.balanceOf(worker), workerBefore + 60e18);
        assertEq(tokenB.balanceOf(creator), creatorBefore + 240e18);
        assertEq(treasury.integrityScore(worker), 20);
        assertEq(covenant.workerIssueReason(covenantId), "Scope change");
        assertEq(covenant.workerIssueEvidenceUri(covenantId), "ipfs://evidence");
    }

    function testDisputeRecordsRequesterEvidence() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 300e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 300e18, 0, false);

        uint256 deposit = _deposit(300e18);
        vm.prank(worker);
        tokenB.approve(address(covenant), deposit);
        vm.prank(worker);
        covenant.reportIssue(covenantId, 3000, "Worker note", "ipfs://worker");

        vm.prank(creator);
        tokenB.approve(address(covenant), deposit);
        vm.prank(creator);
        covenant.disputeIssue(covenantId, "Requester note", "ipfs://requester");

        assertEq(covenant.requesterDisputeReason(covenantId), "Requester note");
        assertEq(covenant.requesterDisputeEvidenceUri(covenantId), "ipfs://requester");
    }

    function testDisputeResolutionRequiresFinalize() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 400e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 400e18, 0, false);

        uint256 workerBefore = tokenB.balanceOf(worker);
        uint256 creatorBefore = tokenB.balanceOf(creator);
        assertEq(workerBefore, 1000e18);
        uint256 deposit = _deposit(400e18);
        vm.prank(worker);
        tokenB.approve(address(covenant), deposit);
        vm.prank(worker);
        covenant.reportIssue(covenantId, 2500, "Missing assets", "ipfs://evidence");
        assertEq(covenant.issueDeposits(covenantId), deposit);
        assertEq(tokenB.balanceOf(worker), workerBefore - deposit);

        vm.prank(creator);
        tokenB.approve(address(covenant), deposit);
        vm.prank(creator);
        covenant.disputeIssue(covenantId, "Counter claim", "ipfs://counter");
        assertEq(covenant.disputeDeposits(covenantId), deposit);
        assertEq(tokenB.balanceOf(creator), creatorBefore - deposit);

        covenant.resolveDispute(covenantId, 5000, 10, 0);

        (, , , , , , , , , , , , , Covenant.Status status,) =
            covenant.covenants(covenantId);
        assertEq(uint256(status), uint256(Covenant.Status.ResolutionProposed));
        assertEq(tokenB.balanceOf(creator), creatorBefore - deposit);
        assertEq(tokenB.balanceOf(worker), workerBefore - deposit);

        covenant.finalizeResolution(covenantId);

        assertEq(covenant.issueDeposits(covenantId), 0);
        assertEq(covenant.disputeDeposits(covenantId), 0);
        assertEq(tokenB.balanceOf(worker), workerBefore + 200e18);
        assertEq(tokenB.balanceOf(creator), creatorBefore + 200e18);
        assertEq(treasury.integrityScore(worker), 10);
    }

    function testResolverCanPersistResolutionRecord() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 200e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 200e18, 0, false);

        uint256 deposit = _deposit(200e18);
        vm.prank(worker);
        tokenB.approve(address(covenant), deposit);
        vm.prank(worker);
        covenant.reportIssue(covenantId, 5000, "Worker note", "ipfs://worker");

        vm.prank(creator);
        tokenB.approve(address(covenant), deposit);
        vm.prank(creator);
        covenant.disputeIssue(covenantId, "Requester note", "ipfs://requester");

        covenant.setResolutionRecord(covenantId, "Arbiter note", "ipfs://arbiter");

        assertEq(covenant.arbiterResolutionNote(covenantId), "Arbiter note");
        assertEq(covenant.arbiterResolutionEvidenceUri(covenantId), "ipfs://arbiter");
    }

    function testMaliceSlashesDepositAndCooldown() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 200e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 200e18, 0, false);

        uint256 deposit = _deposit(200e18);
        vm.prank(worker);
        tokenB.approve(address(covenant), deposit);
        vm.prank(worker);
        covenant.reportIssue(covenantId, 1000, "Fraud", "ipfs://evidence");

        vm.prank(creator);
        tokenB.approve(address(covenant), deposit);
        vm.prank(creator);
        covenant.disputeIssue(covenantId, "Dispute", "ipfs://counter");

        uint256 treasuryBefore = tokenB.balanceOf(address(treasury));
        covenant.resolveDispute(covenantId, 0, 0, 1e18);
        covenant.finalizeResolution(covenantId);

        assertEq(tokenB.balanceOf(address(treasury)), treasuryBefore + deposit);
        assertGt(covenant.cooldownUntil(worker), block.timestamp);

        vm.prank(worker);
        tokenB.approve(address(covenant), 50e18);
        assertEq(tokenB.allowance(worker, address(covenant)), 50e18);
        vm.expectRevert("Creator cooldown");
        vm.prank(worker);
        covenant.createCovenant(creator, 50e18, 0, false);
    }

    function testCrystallizesTokenAOnApproval() public {
        vm.prank(address(treasury));
        tokenA.mint(creator, 1000e18);

        vm.prank(creator);
        tokenA.approve(address(covenant), 1000e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 1000e18, 25, true);

        vm.prank(worker);
        covenant.submitWork(covenantId);

        uint256 workerBefore = tokenB.balanceOf(worker);

        vm.prank(creator);
        covenant.approveWork(covenantId);

        assertEq(tokenA.balanceOf(address(covenant)), 0);
        assertEq(tokenB.balanceOf(worker), workerBefore + 800e18);
        assertEq(treasury.integrityScore(worker), 25);
    }

    function testVirtualStakeUsesIntegrityWhenInsufficient() public {
        treasury.reportTaskCompleted(worker, 0, 20);

        uint256 workerBalance = tokenB.balanceOf(worker);
        vm.prank(worker);
        tokenB.transfer(creator, workerBalance);

        vm.prank(creator);
        tokenB.approve(address(covenant), 200e18);
        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 200e18, 0, false);

        uint256 deposit = _deposit(200e18);
        uint256 depositPoints = (deposit + 1e18 - 1) / 1e18;
        vm.prank(worker);
        covenant.reportIssue(covenantId, 1000, "Shortfall", "ipfs://evidence");

        assertEq(covenant.issueDeposits(covenantId), 0);
        assertEq(covenant.issueLockedIntegrity(covenantId), depositPoints);
        assertEq(treasury.lockedIntegrity(worker), depositPoints);

        vm.prank(creator);
        covenant.acceptIssue(covenantId);

        assertEq(covenant.issueLockedIntegrity(covenantId), 0);
        assertEq(treasury.lockedIntegrity(worker), 0);
    }

    function testDefenseQuotaSkipsDeposits() public {
        treasury.reportTaskCompleted(worker, 0, 150);

        vm.prank(creator);
        tokenB.approve(address(covenant), 100e18);
        vm.prank(creator);
        uint256 covenantId1 = covenant.createCovenant(worker, 100e18, 0, false);

        vm.prank(worker);
        covenant.reportIssue(covenantId1, 1000, "Issue1", "ipfs://evidence1");

        assertEq(covenant.issueDeposits(covenantId1), 0);
        assertEq(covenant.issueLockedIntegrity(covenantId1), 0);
        assertEq(covenant.defenseQuotaUsed(worker), 1);

        vm.prank(creator);
        tokenB.approve(address(covenant), 100e18);
        vm.prank(creator);
        uint256 covenantId2 = covenant.createCovenant(worker, 100e18, 0, false);

        vm.prank(worker);
        covenant.reportIssue(covenantId2, 1000, "Issue2", "ipfs://evidence2");

        assertEq(covenant.issueDeposits(covenantId2), 0);
        assertEq(covenant.issueLockedIntegrity(covenantId2), 0);
        assertEq(covenant.defenseQuotaUsed(worker), 2);

        vm.prank(creator);
        tokenB.approve(address(covenant), 100e18);
        vm.prank(creator);
        uint256 covenantId3 = covenant.createCovenant(worker, 100e18, 0, false);

        uint256 deposit = _deposit(100e18);
        vm.prank(worker);
        tokenB.approve(address(covenant), deposit);
        vm.prank(worker);
        covenant.reportIssue(covenantId3, 1000, "Issue3", "ipfs://evidence3");

        assertEq(covenant.issueDeposits(covenantId3), deposit);
        assertEq(covenant.issueLockedIntegrity(covenantId3), 0);
    }

    function testSpamGuardIncreasesDepositAfterMalice() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 100e18);
        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 100e18, 0, false);

        uint256 deposit = _deposit(100e18);
        vm.prank(worker);
        tokenB.approve(address(covenant), deposit);
        vm.prank(worker);
        covenant.reportIssue(covenantId, 1000, "Bad faith", "ipfs://evidence");

        vm.prank(creator);
        tokenB.approve(address(covenant), deposit);
        vm.prank(creator);
        covenant.disputeIssue(covenantId, "Dispute", "ipfs://counter");

        covenant.resolveDispute(covenantId, 0, 0, 1e18);
        covenant.finalizeResolution(covenantId);

        vm.warp(block.timestamp + 8 days);

        vm.prank(creator);
        tokenB.approve(address(covenant), 100e18);
        vm.prank(creator);
        uint256 covenantId2 = covenant.createCovenant(worker, 100e18, 0, false);

        uint256 doubledDeposit = deposit * 2;
        vm.prank(worker);
        tokenB.approve(address(covenant), doubledDeposit);
        vm.prank(worker);
        covenant.reportIssue(covenantId2, 1000, "Follow-up", "ipfs://evidence2");

        assertEq(covenant.issueDeposits(covenantId2), doubledDeposit);
    }

    function testJurySelectionPrefersExperts() public {
        address e1 = address(0x1111);
        address e2 = address(0x1112);
        address e3 = address(0x1113);
        address g1 = address(0x2221);
        address g2 = address(0x2222);
        address g3 = address(0x2223);
        address g4 = address(0x2224);
        address g5 = address(0x2225);
        address g6 = address(0x2226);

        tokenA.setPrimaryAddress(e1, true);
        tokenA.setPrimaryAddress(e2, true);
        tokenA.setPrimaryAddress(e3, true);
        tokenA.setPrimaryAddress(g1, true);
        tokenA.setPrimaryAddress(g2, true);
        tokenA.setPrimaryAddress(g3, true);
        tokenA.setPrimaryAddress(g4, true);
        tokenA.setPrimaryAddress(g5, true);
        tokenA.setPrimaryAddress(g6, true);

        treasury.reportTaskCompleted(e1, 0, 250);
        treasury.reportTaskCompleted(e2, 0, 220);
        treasury.reportTaskCompleted(e3, 0, 210);

        vm.prank(e1);
        covenant.registerJuryCandidate();
        vm.prank(e2);
        covenant.registerJuryCandidate();
        vm.prank(e3);
        covenant.registerJuryCandidate();
        vm.prank(g1);
        covenant.registerJuryCandidate();
        vm.prank(g2);
        covenant.registerJuryCandidate();
        vm.prank(g3);
        covenant.registerJuryCandidate();
        vm.prank(g4);
        covenant.registerJuryCandidate();
        vm.prank(g5);
        covenant.registerJuryCandidate();
        vm.prank(g6);
        covenant.registerJuryCandidate();

        vm.prank(creator);
        tokenB.approve(address(covenant), 100e18);
        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 100e18, 0, false);

        uint256 deposit = _deposit(100e18);
        vm.prank(worker);
        tokenB.approve(address(covenant), deposit);
        vm.prank(worker);
        covenant.reportIssue(covenantId, 1000, "Issue", "ipfs://evidence");

        vm.prank(creator);
        tokenB.approve(address(covenant), deposit);
        vm.prank(creator);
        covenant.disputeIssue(covenantId, "Dispute", "ipfs://counter");

        address[] memory jurors = covenant.getJuryMembers(covenantId);
        assertEq(jurors.length, 9);

        uint256 expertCount = 0;
        for (uint256 i = 0; i < jurors.length; i++) {
            if (treasury.integrityScore(jurors[i]) >= 200) {
                expertCount++;
            }
        }
        assertEq(expertCount, 3);
    }
}
