// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {APPIOracle} from "../src/APPIOracle.sol";
import {Covenant} from "../src/Covenant.sol";
import {CovenantLibrary} from "../src/CovenantLibrary.sol";
import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {RoyaltyRouter} from "../src/RoyaltyRouter.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";

contract Phase1IntegratedFlowTest is Test {
    APPIOracle internal oracle;
    FairSoilTokenA internal tokenA;
    FairSoilTokenB internal tokenB;
    SoilTreasury internal treasury;
    Covenant internal covenant;
    CovenantLibrary internal covenantLibrary;
    RoyaltyRouter internal royaltyRouter;

    address internal creator = address(0xCAFE);
    address internal worker = address(0xBEEF);
    address internal reporter1 = address(0xA11CE);
    address internal reporter2 = address(0xD00D);
    address internal templateCreator = address(0xABCD);

    uint256 internal constant INTEGRITY_THRESHOLD = 10;

    function setUp() public {
        oracle = new APPIOracle(address(this), address(this));
        oracle.setCategories(_categories());
        oracle.setThresholds(2, INTEGRITY_THRESHOLD);

        FairSoilTokenA implementation = new FairSoilTokenA();
        bytes memory initData = abi.encodeCall(FairSoilTokenA.initialize, (1e12));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        tokenA = FairSoilTokenA(address(proxy));

        tokenB = new FairSoilTokenB(address(0));
        treasury = new SoilTreasury(address(tokenA), address(tokenB));
        tokenA.setTreasury(address(treasury));
        tokenB.setTreasury(address(treasury));

        covenant = new Covenant(address(tokenB), address(tokenA), address(treasury));
        treasury.setCovenant(address(covenant));
        tokenA.setCovenant(address(covenant));
        treasury.setAPPIOracle(address(oracle));

        covenantLibrary = new CovenantLibrary();
        royaltyRouter = new RoyaltyRouter(address(tokenB), address(covenant), address(covenantLibrary));
        covenant.setRoyaltyRouter(address(royaltyRouter));

        tokenA.setPrimaryAddress(creator, true);
        tokenA.setPrimaryAddress(worker, true);

        vm.prank(address(treasury));
        tokenA.mint(address(treasury), 10_000e18);
        vm.prank(address(treasury));
        tokenB.mint(address(treasury), 10_000e18);

        treasury.reportTaskCompleted(creator, 1000e18, 0);
        treasury.reportTaskCompleted(worker, 1000e18, 0);
    }

    function isPrimaryAddress(address account) external view returns (bool) {
        return
            account == reporter1 ||
            account == reporter2 ||
            account == creator ||
            account == worker;
    }

    function integrityScore(address account) external pure returns (uint256) {
        if (account == address(0)) {
            return 0;
        }
        return 10;
    }

    function testPhase1LoopFromAPPIToUBIToCovenantReward() public {
        treasury.setDailyUBIAmount(0);

        vm.prank(reporter1);
        oracle.submitPrice(1, 100);
        vm.prank(reporter2);
        oracle.submitPrice(1, 200);

        uint256 day = block.timestamp / 1 days;
        treasury.applyAPPI(day);

        assertEq(treasury.dailyUBIAmount(), 150);

        vm.prank(worker);
        treasury.claimUBI();
        assertEq(tokenA.balanceOf(worker), 150);

        vm.prank(creator);
        tokenB.approve(address(covenant), 300e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 300e18, 25, false);

        uint256 workerTokenBBefore = tokenB.balanceOf(worker);
        uint256 workerIntegrityBefore = treasury.integrityScore(worker);

        vm.prank(worker);
        covenant.submitWork(covenantId);

        vm.prank(creator);
        covenant.approveWork(covenantId);

        assertEq(tokenB.balanceOf(worker), workerTokenBBefore + 300e18);
        assertEq(treasury.integrityScore(worker), workerIntegrityBefore + 25);
    }

    function testPhase1TokenAFundedCovenantCrystallizesWithRoyaltySplit() public {
        vm.prank(templateCreator);
        uint256 templateId = covenantLibrary.registerTemplate(1000, "ipfs://field-guide");

        vm.prank(address(treasury));
        tokenA.mint(creator, 500e18);

        vm.prank(creator);
        tokenA.approve(address(covenant), 500e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenantWithTemplate(
            worker,
            500e18,
            30,
            true,
            Covenant.PaymentMode.Escrow,
            templateId
        );

        uint256 workerTokenBBefore = tokenB.balanceOf(worker);
        uint256 templateTokenBBefore = tokenB.balanceOf(templateCreator);
        uint256 workerIntegrityBefore = treasury.integrityScore(worker);
        uint256 totalCrystallizedABefore = treasury.totalCrystallizedA();
        uint256 totalCrystallizedBBefore = treasury.totalCrystallizedB();

        vm.prank(worker);
        covenant.submitWork(covenantId);

        vm.prank(creator);
        covenant.approveWork(covenantId);

        assertEq(tokenA.balanceOf(address(covenant)), 0);
        assertEq(tokenB.balanceOf(worker), workerTokenBBefore + 360e18);
        assertEq(tokenB.balanceOf(templateCreator), templateTokenBBefore + 40e18);
        assertEq(treasury.integrityScore(worker), workerIntegrityBefore + 30);
        assertEq(treasury.totalCrystallizedA(), totalCrystallizedABefore + 500e18);
        assertEq(treasury.totalCrystallizedB(), totalCrystallizedBBefore + 400e18);
    }

    function testDelayedModePaysOnlyOnFinalizeApproved() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 400e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenantWithMode(
            worker,
            400e18,
            15,
            false,
            Covenant.PaymentMode.Delayed
        );

        uint256 workerTokenBBefore = tokenB.balanceOf(worker);
        uint256 workerIntegrityBefore = treasury.integrityScore(worker);

        vm.prank(worker);
        covenant.submitWork(covenantId);

        vm.prank(creator);
        covenant.approveWork(covenantId);

        assertEq(tokenB.balanceOf(worker), workerTokenBBefore);
        assertEq(treasury.integrityScore(worker), workerIntegrityBefore + 15);

        vm.prank(creator);
        covenant.finalizeApproved(covenantId);

        assertEq(tokenB.balanceOf(worker), workerTokenBBefore + 400e18);
    }

    function testDisputeFinalizeSettlesLatestProposedPayout() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 500e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 500e18, 0, false);

        uint256 workerTokenBBefore = tokenB.balanceOf(worker);
        uint256 creatorTokenBBefore = tokenB.balanceOf(creator);
        uint256 workerIntegrityBefore = treasury.integrityScore(worker);

        vm.prank(worker);
        tokenB.approve(address(covenant), 25e18);
        vm.prank(worker);
        covenant.reportIssue(covenantId, 3000, "Need partial payout", "ipfs://worker-evidence");

        vm.prank(creator);
        tokenB.approve(address(covenant), 25e18);
        vm.prank(creator);
        covenant.disputeIssue(covenantId, "Counter evidence", "ipfs://creator-evidence");

        covenant.resolveDispute(covenantId, 6000, 12, 0);
        covenant.finalizeResolution(covenantId);

        assertEq(tokenB.balanceOf(worker), workerTokenBBefore + 300e18);
        assertEq(tokenB.balanceOf(creator), creatorTokenBBefore + 200e18);
        assertEq(treasury.integrityScore(worker), workerIntegrityBefore + 12);
    }

    function testIssueAcceptanceCanSpawnAndSettleAppealCovenant() public {
        vm.prank(creator);
        tokenB.approve(address(covenant), 400e18);

        vm.prank(creator);
        uint256 originalId = covenant.createCovenant(worker, 400e18, 0, false);

        uint256 issueDeposit = (400e18 * 500) / 10_000;
        uint256 creatorBeforeOriginal = tokenB.balanceOf(creator);
        uint256 workerBeforeOriginal = tokenB.balanceOf(worker);

        vm.prank(worker);
        tokenB.approve(address(covenant), issueDeposit);
        vm.prank(worker);
        covenant.reportIssue(originalId, 2_500, "Partial work accepted", "ipfs://worker-issue");

        vm.prank(creator);
        covenant.acceptIssue(originalId);

        assertEq(tokenB.balanceOf(worker), workerBeforeOriginal + 100e18);
        assertEq(tokenB.balanceOf(creator), creatorBeforeOriginal + 300e18);

        vm.prank(creator);
        tokenB.approve(address(covenant), 150e18);

        vm.prank(creator);
        uint256 appealId = covenant.createAppealCovenant(
            originalId,
            150e18,
            8,
            false,
            Covenant.PaymentMode.Escrow
        );

        assertEq(covenant.appealCovenantOf(originalId), appealId);
        assertEq(covenant.originalCovenantOf(appealId), originalId);

        uint256 workerBeforeAppeal = tokenB.balanceOf(worker);
        uint256 workerIntegrityBeforeAppeal = treasury.integrityScore(worker);

        vm.prank(worker);
        covenant.submitWork(appealId);

        vm.prank(creator);
        covenant.approveWork(appealId);

        assertEq(tokenB.balanceOf(worker), workerBeforeAppeal + 150e18);
        assertEq(treasury.integrityScore(worker), workerIntegrityBeforeAppeal + 8);
    }

    function _categories() internal pure returns (uint256[] memory cats) {
        cats = new uint256[](1);
        cats[0] = 1;
    }
}
