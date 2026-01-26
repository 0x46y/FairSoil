// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";
import {Covenant} from "../src/Covenant.sol";
import {APPIOracle} from "../src/APPIOracle.sol";
import {InvariantCreatorHandler} from "./InvariantCreatorHandler.sol";
import {InvariantWorkerHandler} from "./InvariantWorkerHandler.sol";
import {InvariantResolverHandler} from "./InvariantResolverHandler.sol";
import {InvariantTimeHandler} from "./InvariantTimeHandler.sol";
import {InvariantTreasuryHandler} from "./InvariantTreasuryHandler.sol";

// Invariant skeleton for Phase 2. Fill the TODOs as contracts stabilize.
contract FairSoilInvariants is StdInvariant, Test {
    FairSoilTokenA internal tokenA;
    FairSoilTokenB internal tokenB;
    SoilTreasury internal treasury;
    Covenant internal covenant;
    InvariantCreatorHandler internal creatorHandler;
    InvariantWorkerHandler internal workerHandler;
    InvariantResolverHandler internal resolverHandler;
    InvariantTimeHandler internal timeHandler;
    InvariantTreasuryHandler internal treasuryHandler;
    APPIOracle internal appiOracle;

    address internal alice = address(0xA11CE);
    uint256 internal escrowLockCount;
    uint256 internal escrowReleaseCount;
    uint256 internal escrowLockedAmount;
    uint256 internal escrowReleasedAmount;
    mapping(uint256 => uint256) internal escrowLockedAmountById;
    mapping(uint256 => bool) internal escrowLockedById;
    mapping(uint256 => bool) internal escrowReleasedById;
    mapping(uint256 => uint256) internal escrowReleasedAmountById;
    mapping(uint256 => uint256) internal escrowReleaseCountById;
    mapping(uint256 => uint256) internal escrowLockCountById;
    bool internal invalidEscrowReleasePayload;
    mapping(uint256 => bool) internal escrowReleaseMismatchById;
    mapping(uint256 => bool) internal escrowReleaseTokenARulesBroken;
    mapping(uint256 => bool) internal escrowReleaseTokenBRulesBroken;
    mapping(uint256 => bool) internal escrowReleaseLockedAmountMismatchById;
    mapping(uint256 => bool) internal approvedEventById;
    mapping(uint256 => bool) internal rejectedEventById;
    mapping(uint256 => bool) internal cancelledEventById;
    mapping(uint256 => bool) internal issueAcceptedEventById;
    mapping(uint256 => bool) internal disputeResolvedEventById;
    mapping(uint256 => bool) internal submittedEventById;
    mapping(uint256 => bool) internal issueReportedEventById;
    mapping(uint256 => bool) internal issueDisputedEventById;
    mapping(uint256 => bool) internal resolutionProposedEventById;
    uint256 internal treasuryOutAAmount;
    uint256 internal treasuryOutBAmount;
    bool internal unknownTreasuryReason;
    bool internal unknownTreasuryInReason;

    function setUp() public {
        FairSoilTokenA implementation = new FairSoilTokenA();
        bytes memory initData = abi.encodeCall(
            FairSoilTokenA.initialize,
            (1e16) // 1% per second for tests
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        tokenA = FairSoilTokenA(address(proxy));

        tokenB = new FairSoilTokenB(address(0));
        treasury = new SoilTreasury(address(tokenA), address(tokenB));
        tokenA.setTreasury(address(treasury));
        tokenB.setTreasury(address(treasury));

        tokenA.setPrimaryAddress(alice, true);
        tokenA.setPrimaryAddress(address(this), true);

        covenant = new Covenant(address(tokenB), address(tokenA), address(treasury));
        tokenA.setCovenant(address(covenant));
        treasury.setCovenant(address(covenant));

        appiOracle = new APPIOracle(address(tokenA), address(treasury));
        uint256[] memory categories = new uint256[](1);
        categories[0] = 1;
        appiOracle.setCategories(categories);
        appiOracle.setThresholds(1, 0);
        treasury.setAPPIOracle(address(appiOracle));

        treasury.claimUBI();
        tokenA.approve(address(covenant), 10e18);
        uint256 covenantId = covenant.createCovenant(alice, 10e18, 0, true);

        vm.prank(alice);
        covenant.reportIssue(covenantId, 5_000, "issue", "evidence");
        covenant.disputeIssue(covenantId, "dispute", "evidence");
        covenant.resolveDispute(covenantId, 5_000, 0, 0);
        covenant.finalizeResolution(covenantId);

        vm.recordLogs();

        creatorHandler = new InvariantCreatorHandler(
            address(treasury),
            address(covenant),
            address(tokenA),
            address(tokenB)
        );
        workerHandler = new InvariantWorkerHandler(
            address(treasury),
            address(covenant)
        );
        resolverHandler = new InvariantResolverHandler(address(covenant));
        timeHandler = new InvariantTimeHandler();
        treasuryHandler = new InvariantTreasuryHandler(address(treasury), address(appiOracle));

        tokenA.setPrimaryAddress(address(creatorHandler), true);
        tokenA.setPrimaryAddress(address(workerHandler), true);
        tokenA.setPrimaryAddress(address(treasuryHandler), true);

        treasury.setDeficitCapA(1_000_000e18);
        treasury.setAdvanceCapB(1_000_000e18);
        treasury.emergencyMintA(address(creatorHandler), 1_000e18);
        treasury.reportTaskCompleted(address(creatorHandler), 1_000e18, 0);

        treasury.transferOwnership(address(treasuryHandler));

        vm.prank(address(creatorHandler));
        tokenA.approve(address(covenant), 1_000e18);
        vm.prank(address(creatorHandler));
        tokenB.approve(address(covenant), 1_000e18);

        targetContract(address(creatorHandler));
        targetContract(address(workerHandler));
        targetContract(address(resolverHandler));
        targetContract(address(timeHandler));
        targetContract(address(treasuryHandler));
    }

    function _syncEscrowEvents() internal {
        Vm.Log[] memory entries = vm.getRecordedLogs();
        for (uint256 i = 0; i < entries.length; i++) {
            bytes32 topic0 = entries[i].topics[0];
            if (topic0 == keccak256("EscrowLocked(uint256,uint8,uint256)")) {
                escrowLockCount += 1;
                uint256 covenantId = uint256(entries[i].topics[1]);
                escrowLockedById[covenantId] = true;
                escrowLockCountById[covenantId] += 1;
                (, uint256 amount) = abi.decode(entries[i].data, (uint8, uint256));
                escrowLockedAmount += amount;
                escrowLockedAmountById[covenantId] += amount;
            } else if (topic0 == keccak256("CovenantApproved(uint256,address)")) {
                uint256 covenantId = uint256(entries[i].topics[1]);
                approvedEventById[covenantId] = true;
            } else if (topic0 == keccak256("CovenantSubmitted(uint256,address)")) {
                uint256 covenantId = uint256(entries[i].topics[1]);
                submittedEventById[covenantId] = true;
            } else if (topic0 == keccak256("CovenantRejected(uint256,address)")) {
                uint256 covenantId = uint256(entries[i].topics[1]);
                rejectedEventById[covenantId] = true;
            } else if (topic0 == keccak256("CovenantCancelled(uint256,address)")) {
                uint256 covenantId = uint256(entries[i].topics[1]);
                cancelledEventById[covenantId] = true;
            } else if (topic0 == keccak256("IssueAccepted(uint256,address,uint256)")) {
                uint256 covenantId = uint256(entries[i].topics[1]);
                issueAcceptedEventById[covenantId] = true;
            } else if (topic0 == keccak256("IssueReported(uint256,address,uint256,string,string)")) {
                uint256 covenantId = uint256(entries[i].topics[1]);
                issueReportedEventById[covenantId] = true;
            } else if (topic0 == keccak256("IssueDisputed(uint256,address,string,string)")) {
                uint256 covenantId = uint256(entries[i].topics[1]);
                issueDisputedEventById[covenantId] = true;
            } else if (topic0 == keccak256("ResolutionProposed(uint256,uint256,uint256,uint256)")) {
                uint256 covenantId = uint256(entries[i].topics[1]);
                resolutionProposedEventById[covenantId] = true;
            } else if (topic0 == keccak256("DisputeResolved(uint256,uint256,uint256,uint256)")) {
                uint256 covenantId = uint256(entries[i].topics[1]);
                disputeResolvedEventById[covenantId] = true;
            } else if (topic0 == keccak256("EscrowReleased(uint256,uint8,uint256,uint256,uint256)")) {
                escrowReleaseCount += 1;
                uint256 covenantId = uint256(entries[i].topics[1]);
                escrowReleasedById[covenantId] = true;
                escrowReleaseCountById[covenantId] += 1;
                (uint8 paymentToken, uint256 releasedToWorker, uint256 releasedToCreator, uint256 burnedAmount) =
                    abi.decode(entries[i].data, (uint8, uint256, uint256, uint256));
                uint256 releasedTotal = releasedToWorker + releasedToCreator + burnedAmount;
                escrowReleasedAmount += releasedTotal;
                escrowReleasedAmountById[covenantId] += releasedTotal;
                uint256 tokenBReward = covenantsRewardOrZero(covenantId);
                if (tokenBReward > 0 && releasedTotal != tokenBReward) {
                    escrowReleaseMismatchById[covenantId] = true;
                }
                if (paymentToken == 0) {
                    if (burnedAmount != 0) {
                        invalidEscrowReleasePayload = true;
                    }
                    if (releasedToWorker + releasedToCreator != tokenBReward) {
                        escrowReleaseTokenBRulesBroken[covenantId] = true;
                    }
                } else {
                    if (releasedToWorker != 0) {
                        invalidEscrowReleasePayload = true;
                    }
                    if (releasedToCreator > tokenBReward || burnedAmount > tokenBReward) {
                        escrowReleaseTokenARulesBroken[covenantId] = true;
                    }
                    if (releasedToCreator + burnedAmount != tokenBReward) {
                        escrowReleaseTokenARulesBroken[covenantId] = true;
                    }
                    if (escrowLockedById[covenantId]) {
                        uint256 lockedAmount = escrowLockedAmountById[covenantId];
                        if (releasedToCreator + burnedAmount != lockedAmount) {
                            escrowReleaseLockedAmountMismatchById[covenantId] = true;
                        }
                    }
                }
            } else if (topic0 == keccak256("TreasuryOutA(address,uint256,bytes32)")) {
                (, uint256 amount, bytes32 reason) = abi.decode(entries[i].data, (uint256, bytes32));
                treasuryOutAAmount += amount;
                if (!_isAllowedTreasuryReason(reason)) {
                    unknownTreasuryReason = true;
                }
            } else if (topic0 == keccak256("TreasuryOutB(address,uint256,bytes32)")) {
                (, uint256 amount, bytes32 reason) = abi.decode(entries[i].data, (uint256, bytes32));
                treasuryOutBAmount += amount;
                if (!_isAllowedTreasuryReason(reason)) {
                    unknownTreasuryReason = true;
                }
            } else if (topic0 == keccak256("TreasuryIn(address,uint256,bytes32)")) {
                (, uint256 amount, bytes32 reason) = abi.decode(entries[i].data, (uint256, bytes32));
                if (amount == 0) {
                    unknownTreasuryInReason = true;
                }
                if (!_isAllowedTreasuryInReason(reason)) {
                    unknownTreasuryInReason = true;
                }
            }
        }
        vm.recordLogs();
    }

    // R2 basic wiring sanity (Treasury pointers are consistent).
    function invariant_treasuryPointers() public view {
        assertEq(tokenA.treasury(), address(treasury));
        assertEq(tokenB.treasury(), address(treasury));
    }

    // R3: A Burn -> B Mint prohibition (crystallization-only path).
    function invariant_noBurnToMintB() public {
        uint256 supplyBefore = tokenB.totalSupply();
        vm.prank(address(0xBEEF));
        vm.expectRevert("Treasury only");
        tokenB.mint(address(0xBEEF), 1);
        assertEq(tokenB.totalSupply(), supplyBefore);

        vm.prank(address(0xBEEF));
        vm.expectRevert("Covenant only");
        treasury.mintBByCrystallization(address(0xBEEF), 1);
        assertEq(tokenB.totalSupply(), supplyBefore);

        if (treasury.circuitState() != SoilTreasury.CircuitState.Halted) {
            vm.prank(address(treasuryHandler));
            treasury.emergencyMintA(address(covenant), 10e18);
            vm.prank(address(covenant));
            tokenA.burnFromCovenant(address(covenant), 10e18);
            assertEq(tokenB.totalSupply(), supplyBefore);
        }
    }

    // R1 minimal: payouts must go through explicit mint/burn/transfer paths (access control enforced).
    function invariant_accountingPathsAreGated() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert("Treasury only");
        tokenA.mint(address(0xBEEF), 1);

        vm.prank(address(0xBEEF));
        vm.expectRevert("Treasury only");
        tokenB.mint(address(0xBEEF), 1);

        vm.prank(address(0xBEEF));
        vm.expectRevert("Treasury only");
        tokenB.lock(address(0xBEEF), 1);

        vm.prank(address(0xBEEF));
        vm.expectRevert("Covenant only");
        tokenA.burnFromCovenant(address(0xBEEF), 1);
    }

    // R5: Locked supply separation once B-locking is implemented.
    function invariant_circulatingBSupply() public view {
        uint256 total = tokenB.totalSupply();
        uint256 locked = tokenB.totalLocked();
        assertLe(locked, total);
        assertLe(tokenB.lockedBalance(address(treasury)), tokenB.balanceOf(address(treasury)));
        assertLe(tokenB.lockedBalance(alice), tokenB.balanceOf(alice));

        uint256 trackedLocked =
            tokenB.lockedBalance(address(treasury)) +
            tokenB.lockedBalance(address(covenant)) +
            tokenB.lockedBalance(address(creatorHandler)) +
            tokenB.lockedBalance(address(workerHandler)) +
            tokenB.lockedBalance(address(resolverHandler)) +
            tokenB.lockedBalance(address(treasuryHandler)) +
            tokenB.lockedBalance(address(this)) +
            tokenB.lockedBalance(alice);
        assertLe(trackedLocked, locked);
    }

    // R6: caps for DeficitCap_A and AdvanceCap_B.
    function invariant_capsRespected() public view {
        assertLe(treasury.deficitAOutstanding(), treasury.deficitCapA());
        assertLe(treasury.advanceBOutstanding(), treasury.advanceCapB());
    }

    // Resolve state machine irreversibility (Finalized is terminal).
    function invariant_resolveFinalizedIrreversible() public {
        (
            address creator,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            Covenant.Status status
        ) = covenant.covenants(0);
        if (creator != address(0) && status == Covenant.Status.IssueResolved) {
            vm.expectRevert("Not proposed");
            covenant.finalizeResolution(0);

            vm.expectRevert("Not disputed");
            covenant.resolveDispute(0, 5_000, 0, 0);

            vm.expectRevert("Not reported");
            covenant.acceptIssue(0);
        }
    }

    // R7: escrow events should be emitted and releases should never exceed locks.
    function invariant_escrowEventsBalanced() public {
        _syncEscrowEvents();
        assertGe(escrowLockCount, escrowReleaseCount);
        assertGe(escrowLockedAmount, escrowReleasedAmount);
    }

    // R7: TreasuryOut events should not exceed total supply for A/B.
    function invariant_treasuryOutNotExceedSupply() public {
        _syncEscrowEvents();
        assertLe(treasuryOutAAmount, tokenA.totalSupply());
        assertLe(treasuryOutBAmount, tokenB.totalSupply());
    }

    // R7: TreasuryOut reason allowlist.
    function invariant_treasuryOutReasonsAllowed() public {
        _syncEscrowEvents();
        assertFalse(unknownTreasuryReason);
    }

    // R7: TreasuryIn reason allowlist.
    function invariant_treasuryInReasonsAllowed() public {
        _syncEscrowEvents();
        assertFalse(unknownTreasuryInReason);
    }

    // Covenant payment mode invariants (Immediate/Escrow/Delayed).
    function invariant_paymentModeSettlementRules() public view {
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            (
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                Covenant.PaymentMode paymentMode,
                Covenant.Status status,
                bool settled
            ) = covenant.covenants(i);

            if (status == Covenant.Status.IssueResolved) {
                assertTrue(settled);
            }

            if (paymentMode == Covenant.PaymentMode.Immediate) {
                if (status == Covenant.Status.Submitted) {
                    assertTrue(settled);
                }
            } else if (paymentMode == Covenant.PaymentMode.Escrow) {
                if (status == Covenant.Status.Approved) {
                    assertTrue(settled);
                }
                if (status == Covenant.Status.Submitted) {
                    assertFalse(settled);
                }
            } else if (paymentMode == Covenant.PaymentMode.Delayed) {
                if (status == Covenant.Status.Approved || status == Covenant.Status.Submitted) {
                    assertFalse(settled);
                }
            }
        }
    }

    // EscrowReleased should not happen without settlement for finalized/approved flows.
    function invariant_escrowReleaseImpliesSettled() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!escrowReleasedById[i]) {
                continue;
            }
            (
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                Covenant.PaymentMode paymentMode,
                Covenant.Status status,
                bool settled
            ) = covenant.covenants(i);
            if (paymentMode == Covenant.PaymentMode.Delayed) {
                assertTrue(status == Covenant.Status.IssueResolved || status == Covenant.Status.Rejected || status == Covenant.Status.Cancelled);
            }
            if (status == Covenant.Status.Approved || status == Covenant.Status.IssueResolved) {
                assertTrue(settled);
            }
        }
    }

    // EscrowReleased must not happen in disallowed states per payment mode.
    function invariant_escrowReleaseStateAllowlist() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!escrowReleasedById[i]) {
                continue;
            }
            (
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                Covenant.PaymentMode paymentMode,
                Covenant.Status status,
                bool settled
            ) = covenant.covenants(i);

            if (paymentMode == Covenant.PaymentMode.Immediate) {
                assertTrue(
                    status == Covenant.Status.Submitted ||
                    status == Covenant.Status.Rejected ||
                    status == Covenant.Status.Cancelled ||
                    status == Covenant.Status.IssueResolved
                );
                if (status == Covenant.Status.Submitted) {
                    assertTrue(settled);
                }
            } else if (paymentMode == Covenant.PaymentMode.Escrow) {
                assertTrue(
                    status == Covenant.Status.Approved ||
                    status == Covenant.Status.Rejected ||
                    status == Covenant.Status.Cancelled ||
                    status == Covenant.Status.IssueResolved
                );
                if (status == Covenant.Status.Approved) {
                    assertTrue(settled);
                }
            } else {
                assertTrue(
                    status == Covenant.Status.Rejected ||
                    status == Covenant.Status.Cancelled ||
                    status == Covenant.Status.IssueResolved
                );
            }
        }
    }

    // EscrowReleased total per covenant must never exceed tokenBReward.
    function invariant_escrowReleasedNotExceedReward() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!escrowReleasedById[i]) {
                continue;
            }
            (
                ,
                ,
                uint256 tokenBReward,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,

            ) = covenant.covenants(i);
            assertLe(escrowReleasedAmountById[i], tokenBReward);
        }
    }

    // EscrowReleased payload must match payment token expectations.
    function invariant_escrowReleasePayloadValid() public {
        _syncEscrowEvents();
        assertFalse(invalidEscrowReleasePayload);
    }

    // EscrowLocked covenants must release when reaching a terminal state per payment mode.
    function invariant_terminalStatesReleaseEscrow() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!escrowLockedById[i]) {
                continue;
            }
            (
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                Covenant.PaymentMode paymentMode,
                Covenant.Status status,

            ) = covenant.covenants(i);

            if (paymentMode == Covenant.PaymentMode.Immediate) {
                if (
                    status == Covenant.Status.Submitted ||
                    status == Covenant.Status.Approved ||
                    status == Covenant.Status.Rejected ||
                    status == Covenant.Status.Cancelled ||
                    status == Covenant.Status.IssueResolved
                ) {
                    assertTrue(escrowReleasedById[i]);
                }
            } else if (paymentMode == Covenant.PaymentMode.Escrow) {
                if (
                    status == Covenant.Status.Approved ||
                    status == Covenant.Status.Rejected ||
                    status == Covenant.Status.Cancelled ||
                    status == Covenant.Status.IssueResolved
                ) {
                    assertTrue(escrowReleasedById[i]);
                }
            } else {
                if (
                    status == Covenant.Status.Rejected ||
                    status == Covenant.Status.Cancelled ||
                    status == Covenant.Status.IssueResolved
                ) {
                    assertTrue(escrowReleasedById[i]);
                }
            }
        }
    }

    // Terminal states should release full escrow amount (equals tokenBReward).
    function invariant_terminalReleaseEqualsReward() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!escrowLockedById[i]) {
                continue;
            }
            (
                ,
                ,
                uint256 tokenBReward,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                Covenant.PaymentMode paymentMode,
                Covenant.Status status,

            ) = covenant.covenants(i);

            bool terminal;
            if (paymentMode == Covenant.PaymentMode.Immediate) {
                terminal =
                    status == Covenant.Status.Submitted ||
                    status == Covenant.Status.Approved ||
                    status == Covenant.Status.Rejected ||
                    status == Covenant.Status.Cancelled ||
                    status == Covenant.Status.IssueResolved;
            } else if (paymentMode == Covenant.PaymentMode.Escrow) {
                terminal =
                    status == Covenant.Status.Approved ||
                    status == Covenant.Status.Rejected ||
                    status == Covenant.Status.Cancelled ||
                    status == Covenant.Status.IssueResolved;
            } else {
                terminal =
                    status == Covenant.Status.Rejected ||
                    status == Covenant.Status.Cancelled ||
                    status == Covenant.Status.IssueResolved;
            }

            if (terminal) {
                assertTrue(escrowReleasedById[i]);
                assertEq(escrowReleasedAmountById[i], tokenBReward);
            }
        }
    }

    // EscrowReleased should occur at most once per covenant.
    function invariant_escrowReleasedSingleEvent() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!escrowReleasedById[i]) {
                continue;
            }
            assertLe(escrowReleaseCountById[i], 1);
        }
    }

    // EscrowLocked should occur at most once per covenant.
    function invariant_escrowLockedSingleEvent() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!escrowLockedById[i]) {
                continue;
            }
            assertLe(escrowLockCountById[i], 1);
        }
    }

    // EscrowReleased must only happen after EscrowLocked for the same covenant.
    function invariant_escrowReleaseRequiresLock() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (escrowReleasedById[i]) {
                assertTrue(escrowLockedById[i]);
            }
        }
    }

    // EscrowLocked amount must not exceed tokenBReward, and should equal reward when locked.
    function invariant_escrowLockedMatchesReward() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!escrowLockedById[i]) {
                continue;
            }
            (
                ,
                ,
                uint256 tokenBReward,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,

            ) = covenant.covenants(i);
            assertLe(escrowLockedAmountById[i], tokenBReward);
            assertEq(escrowLockedAmountById[i], tokenBReward);
        }
    }

    // Explicit deny rules for EscrowReleased per mode/state.
    function invariant_escrowReleaseDeniedStates() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            (
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                Covenant.PaymentMode paymentMode,
                Covenant.Status status,
                bool settled
            ) = covenant.covenants(i);

            if (!escrowReleasedById[i]) {
                if (status == Covenant.Status.Open || status == Covenant.Status.IssueReported || status == Covenant.Status.Disputed || status == Covenant.Status.ResolutionProposed) {
                    continue;
                }
                continue;
            }

            if (paymentMode == Covenant.PaymentMode.Immediate) {
                assertTrue(status != Covenant.Status.Open);
            } else if (paymentMode == Covenant.PaymentMode.Escrow) {
                assertTrue(status != Covenant.Status.Submitted);
            } else {
                assertTrue(status != Covenant.Status.Submitted);
                assertTrue(status != Covenant.Status.Approved);
            }
        }
    }

    // Settled must align with payment mode and status when escrow is released.
    function invariant_escrowReleaseSettledConsistency() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!escrowReleasedById[i]) {
                continue;
            }
            (
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                Covenant.PaymentMode paymentMode,
                Covenant.Status status,
                bool settled
            ) = covenant.covenants(i);

            if (
                status == Covenant.Status.Rejected ||
                status == Covenant.Status.Cancelled ||
                status == Covenant.Status.IssueResolved
            ) {
                assertTrue(settled);
                continue;
            }

            if (paymentMode == Covenant.PaymentMode.Immediate && status == Covenant.Status.Submitted) {
                assertTrue(settled);
            }
            if (paymentMode == Covenant.PaymentMode.Escrow && status == Covenant.Status.Approved) {
                assertTrue(settled);
            }
        }
    }

    // Settled covenants must have an escrow release event.
    function invariant_settledRequiresRelease() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            (
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                bool settled
            ) = covenant.covenants(i);
            if (settled) {
                assertTrue(escrowReleasedById[i]);
            }
        }
    }

    // EscrowReleased should imply settled for allowed release states.
    function invariant_releaseImpliesSettled() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!escrowReleasedById[i]) {
                continue;
            }
            (
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                Covenant.Status status,
                bool settled
            ) = covenant.covenants(i);
            if (
                status == Covenant.Status.Rejected ||
                status == Covenant.Status.Cancelled ||
                status == Covenant.Status.IssueResolved ||
                status == Covenant.Status.Approved ||
                status == Covenant.Status.Submitted
            ) {
                assertTrue(settled);
            }
        }
    }

    // Settled implies terminal status or approved/submitted only where mode allows.
    function invariant_settledStatusConsistency() public {
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            (
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                Covenant.PaymentMode paymentMode,
                Covenant.Status status,
                bool settled
            ) = covenant.covenants(i);
            if (!settled) {
                continue;
            }
            if (
                status == Covenant.Status.Rejected ||
                status == Covenant.Status.Cancelled ||
                status == Covenant.Status.IssueResolved
            ) {
                continue;
            }
            if (paymentMode == Covenant.PaymentMode.Immediate && status == Covenant.Status.Submitted) {
                continue;
            }
            if (paymentMode == Covenant.PaymentMode.Escrow && status == Covenant.Status.Approved) {
                continue;
            }
            // Delayed should only settle on terminal states.
            assertFalse(paymentMode == Covenant.PaymentMode.Delayed);
            assertTrue(
                status == Covenant.Status.Rejected ||
                status == Covenant.Status.Cancelled ||
                status == Covenant.Status.IssueResolved ||
                status == Covenant.Status.Submitted ||
                status == Covenant.Status.Approved
            );
        }
    }

    // Non-terminal active states should never be settled or released.
    function invariant_activeStatesNotSettled() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            (
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                Covenant.Status status,
                bool settled
            ) = covenant.covenants(i);
            if (
                status == Covenant.Status.Open ||
                status == Covenant.Status.IssueReported ||
                status == Covenant.Status.Disputed ||
                status == Covenant.Status.ResolutionProposed
            ) {
                assertFalse(settled);
                assertFalse(escrowReleasedById[i]);
            }
        }
    }

    // Submitted/Approved release must follow payment mode rules strictly.
    function invariant_modeSpecificReleaseForSubmittedApproved() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            (
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                ,
                Covenant.PaymentMode paymentMode,
                Covenant.Status status,
                bool settled
            ) = covenant.covenants(i);

            if (status == Covenant.Status.Submitted) {
                if (paymentMode == Covenant.PaymentMode.Immediate) {
                    assertTrue(escrowReleasedById[i]);
                    assertTrue(settled);
                } else {
                    assertFalse(escrowReleasedById[i]);
                    assertFalse(settled);
                }
            }

            if (status == Covenant.Status.Approved) {
                if (paymentMode == Covenant.PaymentMode.Escrow) {
                    assertTrue(escrowReleasedById[i]);
                    assertTrue(settled);
                } else if (paymentMode == Covenant.PaymentMode.Immediate) {
                    assertTrue(escrowReleasedById[i]);
                    assertTrue(settled);
                } else {
                    assertFalse(escrowReleasedById[i]);
                    assertFalse(settled);
                }
            }
        }
    }

    // EscrowReleased must be tied to a known terminal decision event.
    function invariant_releaseHasDecisionEvent() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!escrowReleasedById[i]) {
                continue;
            }
            bool hasDecision =
                approvedEventById[i] ||
                rejectedEventById[i] ||
                cancelledEventById[i] ||
                issueAcceptedEventById[i] ||
                disputeResolvedEventById[i];
            assertTrue(hasDecision);
        }
    }

    // EscrowReleased must not occur when only non-terminal events exist.
    function invariant_releaseNotFromNonTerminalOnly() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!escrowReleasedById[i]) {
                continue;
            }
            bool hasTerminalDecision =
                approvedEventById[i] ||
                rejectedEventById[i] ||
                cancelledEventById[i] ||
                issueAcceptedEventById[i] ||
                disputeResolvedEventById[i];
            bool onlyNonTerminal =
                (submittedEventById[i] || issueReportedEventById[i]) &&
                !hasTerminalDecision;
            assertFalse(onlyNonTerminal);
        }
    }

    // DisputeResolved must correspond to IssueResolved status.
    function invariant_disputeResolvedImpliesIssueResolved() public view {
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!disputeResolvedEventById[i]) {
                continue;
            }
            (, , , , , , , , , , , , Covenant.Status status, ) = covenant.covenants(i);
            assertEq(status, Covenant.Status.IssueResolved);
        }
    }

    function invariant_issueAcceptedImpliesIssueResolved() public view {
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!issueAcceptedEventById[i]) {
                continue;
            }
            (, , , , , , , , , , , , Covenant.Status status, ) = covenant.covenants(i);
            assertEq(status, Covenant.Status.IssueResolved);
        }
    }

    function invariant_approvedNotIssueResolvedConflict() public view {
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!approvedEventById[i]) {
                continue;
            }
            (, , , , , , , , , , , , Covenant.Status status, ) = covenant.covenants(i);
            assertTrue(status == Covenant.Status.Approved || status == Covenant.Status.IssueResolved);
        }
    }

    function invariant_rejectedImpliesRejectedStatus() public view {
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!rejectedEventById[i]) {
                continue;
            }
            (, , , , , , , , , , , , Covenant.Status status, ) = covenant.covenants(i);
            assertEq(status, Covenant.Status.Rejected);
        }
    }

    function invariant_cancelledImpliesCancelledStatus() public view {
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!cancelledEventById[i]) {
                continue;
            }
            (, , , , , , , , , , , , Covenant.Status status, ) = covenant.covenants(i);
            assertEq(status, Covenant.Status.Cancelled);
        }
    }

    function invariant_submittedImpliesSubmittedOrBeyond() public view {
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!submittedEventById[i]) {
                continue;
            }
            (, , , , , , , , , , , , Covenant.Status status, ) = covenant.covenants(i);
            assertTrue(status != Covenant.Status.Open);
        }
    }

    function invariant_issueReportedImpliesIssueReportedStatus() public view {
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!issueReportedEventById[i]) {
                continue;
            }
            (, , , , , , , , , , , , Covenant.Status status, ) = covenant.covenants(i);
            assertTrue(
                status == Covenant.Status.IssueReported ||
                status == Covenant.Status.Disputed ||
                status == Covenant.Status.ResolutionProposed ||
                status == Covenant.Status.IssueResolved
            );
        }
    }

    function invariant_issueDisputedImpliesDisputedStatus() public view {
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!issueDisputedEventById[i]) {
                continue;
            }
            (, , , , , , , , , , , , Covenant.Status status, ) = covenant.covenants(i);
            assertTrue(
                status == Covenant.Status.Disputed ||
                status == Covenant.Status.ResolutionProposed ||
                status == Covenant.Status.IssueResolved
            );
        }
    }

    function invariant_resolutionProposedImpliesStatus() public view {
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!resolutionProposedEventById[i]) {
                continue;
            }
            (, , , , , , , , , , , , Covenant.Status status, ) = covenant.covenants(i);
            assertTrue(
                status == Covenant.Status.ResolutionProposed ||
                status == Covenant.Status.IssueResolved
            );
        }
    }

    function invariant_disputeResolvedHasResolutionProposed() public view {
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!disputeResolvedEventById[i]) {
                continue;
            }
            assertTrue(resolutionProposedEventById[i]);
        }
    }

    function invariant_issueResolvedHasDecisionEvent() public view {
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            (, , , , , , , , , , , , Covenant.Status status, ) = covenant.covenants(i);
            if (status != Covenant.Status.IssueResolved) {
                continue;
            }
            assertTrue(issueAcceptedEventById[i] || disputeResolvedEventById[i]);
        }
    }

    function invariant_terminalEventsNotConflicting() public view {
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (rejectedEventById[i] || cancelledEventById[i]) {
                assertFalse(approvedEventById[i]);
                assertFalse(issueAcceptedEventById[i]);
                assertFalse(disputeResolvedEventById[i]);
            }
        }
    }

    function invariant_resolutionProposedRequiresDispute() public view {
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!resolutionProposedEventById[i]) {
                continue;
            }
            assertTrue(issueDisputedEventById[i]);
        }
    }

    function invariant_approvedNotRejectedOrCancelled() public view {
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!approvedEventById[i]) {
                continue;
            }
            assertFalse(rejectedEventById[i]);
            assertFalse(cancelledEventById[i]);
        }
    }

    // EscrowReleased payload sum should match tokenBReward.
    function invariant_escrowReleaseMatchesReward() public {
        _syncEscrowEvents();
        uint256 count = covenant.nextId();
        uint256 limit = count > 10 ? 10 : count;
        for (uint256 i = 0; i < limit; i++) {
            if (!escrowReleasedById[i]) {
                continue;
            }
            assertFalse(escrowReleaseMismatchById[i]);
            assertFalse(escrowReleaseTokenARulesBroken[i]);
            assertFalse(escrowReleaseTokenBRulesBroken[i]);
            assertFalse(escrowReleaseLockedAmountMismatchById[i]);
        }
    }

    function covenantsRewardOrZero(uint256 covenantId) internal view returns (uint256) {
        if (covenantId >= covenant.nextId()) {
            return 0;
        }
        (
            ,
            ,
            uint256 tokenBReward,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,

        ) = covenant.covenants(covenantId);
        return tokenBReward;
    }

    function _isAllowedTreasuryReason(bytes32 reason) internal pure returns (bool) {
        return
            reason == bytes32("UBI") ||
            reason == bytes32("UBI_CLAIM") ||
            reason == bytes32("DEFICIT") ||
            reason == bytes32("ADVANCE") ||
            reason == bytes32("TASK") ||
            reason == bytes32("CRYSTAL");
    }

    function _isAllowedTreasuryInReason(bytes32 reason) internal pure returns (bool) {
        return
            reason == bytes32("FEE") ||
            reason == bytes32("TAX") ||
            reason == bytes32("SLASH") ||
            reason == bytes32("EXTERNAL");
    }
}
