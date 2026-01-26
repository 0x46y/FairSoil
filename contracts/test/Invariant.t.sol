// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";
import {Covenant} from "../src/Covenant.sol";

// Invariant skeleton for Phase 2. Fill the TODOs as contracts stabilize.
contract FairSoilInvariants is StdInvariant, Test {
    FairSoilTokenA internal tokenA;
    FairSoilTokenB internal tokenB;
    SoilTreasury internal treasury;
    Covenant internal covenant;

    address internal alice = address(0xA11CE);

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
}
