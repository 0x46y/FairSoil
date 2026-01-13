// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";

contract FairSoilMVPTest is Test {
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

    function testMvpFlow() public {
        vm.prank(alice);
        treasury.claimUBI();
        assertGt(tokenA.balanceOf(alice), 0);

        treasury.reportTaskCompleted(alice, 1e18, 100);

        assertEq(tokenB.balanceOf(alice), 1e18);
        assertEq(treasury.integrityScore(alice), 100);
        assertTrue(treasury.isEligibleForGovernance(alice));
    }
}
