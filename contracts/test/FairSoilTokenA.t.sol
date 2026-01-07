// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";

contract FairSoilTokenATest is Test {
    FairSoilTokenA internal tokenA;
    SoilTreasury internal treasury;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    function setUp() public {
        FairSoilTokenA implementation = new FairSoilTokenA();
        bytes memory initData = abi.encodeCall(
            FairSoilTokenA.initialize,
            (1e16) // 1% per second, exaggerated for tests
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        tokenA = FairSoilTokenA(address(proxy));

        treasury = new SoilTreasury(address(tokenA));
        tokenA.setTreasury(address(treasury));

        tokenA.setPrimaryAddress(alice, true);
        tokenA.setPrimaryAddress(bob, false);
    }

    function testSurvivalBufferProtectedForPrimary() public {
        treasury.setDailyUBIAmount(600e18);

        vm.prank(alice);
        treasury.claimUBI();

        vm.warp(block.timestamp + 1 days);
        vm.prank(alice);
        treasury.claimUBI();

        uint256 raw = tokenA.balanceOf(alice);
        assertGt(raw, 1000e18);

        vm.warp(block.timestamp + 1 days);
        uint256 decayed = tokenA.balanceOf(alice);

        // Survival buffer should remain at least 1000 tokens.
        assertGe(decayed, 1000e18);
    }

    function testNonPrimaryDecaysEntireBalance() public {
        vm.prank(bob);
        vm.expectRevert("Not World ID verified");
        treasury.claimUBI();

        // Mint manually via treasury for test control.
        tokenA.setPrimaryAddress(bob, true);
        vm.prank(bob);
        treasury.claimUBI();
        tokenA.setPrimaryAddress(bob, false);

        uint256 beforeBalance = tokenA.balanceOf(bob);
        vm.warp(block.timestamp + 1 days);
        uint256 afterBalance = tokenA.balanceOf(bob);

        assertLt(afterBalance, beforeBalance);
    }
}
