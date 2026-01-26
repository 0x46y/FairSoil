// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";
import {Covenant} from "../src/Covenant.sol";
import {InvariantCreatorHandler} from "./InvariantCreatorHandler.sol";
import {InvariantWorkerHandler} from "./InvariantWorkerHandler.sol";
import {InvariantResolverHandler} from "./InvariantResolverHandler.sol";
import {InvariantTimeHandler} from "./InvariantTimeHandler.sol";

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

    address internal alice = address(0xA11CE);
    uint256 internal escrowLockCount;
    uint256 internal escrowReleaseCount;
    uint256 internal escrowLockedAmount;
    uint256 internal escrowReleasedAmount;

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

        tokenA.setPrimaryAddress(address(creatorHandler), true);
        tokenA.setPrimaryAddress(address(workerHandler), true);

        treasury.setDeficitCapA(1_000_000e18);
        treasury.setAdvanceCapB(1_000_000e18);
        treasury.emergencyMintA(address(creatorHandler), 1_000e18);
        treasury.reportTaskCompleted(address(creatorHandler), 1_000e18, 0);

        vm.prank(address(creatorHandler));
        tokenA.approve(address(covenant), 1_000e18);
        vm.prank(address(creatorHandler));
        tokenB.approve(address(covenant), 1_000e18);

        targetContract(address(creatorHandler));
        targetContract(address(workerHandler));
        targetContract(address(resolverHandler));
        targetContract(address(timeHandler));
    }

    function _syncEscrowEvents() internal {
        Vm.Log[] memory entries = vm.getRecordedLogs();
        for (uint256 i = 0; i < entries.length; i++) {
            bytes32 topic0 = entries[i].topics[0];
            if (topic0 == keccak256("EscrowLocked(uint256,uint8,uint256)")) {
                escrowLockCount += 1;
                (, uint256 amount) = abi.decode(entries[i].data, (uint8, uint256));
                escrowLockedAmount += amount;
            } else if (topic0 == keccak256("EscrowReleased(uint256,uint8,uint256,uint256,uint256)")) {
                escrowReleaseCount += 1;
                (, uint256 releasedToWorker, uint256 releasedToCreator, uint256 burnedAmount) =
                    abi.decode(entries[i].data, (uint8, uint256, uint256, uint256));
                escrowReleasedAmount += releasedToWorker + releasedToCreator + burnedAmount;
            }
        }
        vm.recordLogs();
    }

    // R2 basic wiring sanity (Treasury pointers are consistent).
    function invariant_treasuryPointers() public view {
        assertEq(tokenA.treasury(), address(treasury));
        assertEq(tokenB.treasury(), address(treasury));
    }

    // TODO: R3 A Burn -> B Mint prohibition (crystallization-only path).
    function invariant_noBurnToMintB() public {
        uint256 supplyBefore = tokenB.totalSupply();
        vm.prank(address(0xBEEF));
        vm.expectRevert("Treasury only");
        tokenB.mint(address(0xBEEF), 1);
        assertEq(tokenB.totalSupply(), supplyBefore);
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

    // TODO: R5 Locked supply separation once B-locking is implemented.
    function invariant_circulatingBSupply() public view {
        uint256 total = tokenB.totalSupply();
        uint256 locked = tokenB.totalLocked();
        assertLe(locked, total);
        assertLe(tokenB.lockedBalance(address(treasury)), tokenB.balanceOf(address(treasury)));
        assertLe(tokenB.lockedBalance(alice), tokenB.balanceOf(alice));
    }

    // TODO: R6 caps for DeficitCap_A and AdvanceCap_B once tracked on-chain.
    function invariant_capsRespected() public view {
        assertLe(treasury.deficitAOutstanding(), treasury.deficitCapA());
        assertLe(treasury.advanceBOutstanding(), treasury.advanceCapB());
    }

    // TODO: Resolve state machine irreversibility.
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
        }
    }

    // R7: escrow events should be emitted and releases should never exceed locks.
    function invariant_escrowEventsBalanced() public {
        _syncEscrowEvents();
        assertGe(escrowLockCount, escrowReleaseCount);
        assertGe(escrowLockedAmount, escrowReleasedAmount);
    }
}
