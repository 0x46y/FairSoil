// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";

// Invariant skeleton for Phase 2. Fill the TODOs as contracts stabilize.
contract FairSoilInvariants is StdInvariant, Test {
    FairSoilTokenA internal tokenA;
    FairSoilTokenB internal tokenB;
    SoilTreasury internal treasury;

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
        // Placeholder: implement when locking is introduced.
        assertTrue(true);
    }

    // TODO: R6 caps for DeficitCap_A and AdvanceCap_B once tracked on-chain.
    function invariant_capsRespected() public view {
        assertLe(treasury.deficitAOutstanding(), treasury.deficitCapA());
        assertLe(treasury.advanceBOutstanding(), treasury.advanceCapB());
    }

    // TODO: Resolve state machine irreversibility.
    function invariant_resolveFinalizedIrreversible() public view {
        // Placeholder: implement when dispute flow is finalized.
        assertTrue(true);
    }
}
