// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";

contract SoilTreasuryUnclaimedUBITest is Test {
    FairSoilTokenA internal tokenA;
    FairSoilTokenB internal tokenB;
    SoilTreasury internal treasury;

    address internal alice = address(0xA11CE);

    function setUp() public {
        FairSoilTokenA implementation = new FairSoilTokenA();
        // 1e12 = 0.000001% per second (slow enough for day-scale tests).
        bytes memory initData = abi.encodeCall(FairSoilTokenA.initialize, (1e12));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        tokenA = FairSoilTokenA(address(proxy));

        tokenB = new FairSoilTokenB(address(0));
        treasury = new SoilTreasury(address(tokenA), address(tokenB));
        tokenA.setTreasury(address(treasury));
        tokenB.setTreasury(address(treasury));

        tokenA.setPrimaryAddress(alice, true);

        treasury.setDeficitCapA(1_000_000e18);
        vm.prank(address(treasury));
        tokenA.mint(address(treasury), 10_000e18);
        vm.warp(1 days);
    }

    function testAccrueAndClaimNoDecayWithin30Days() public {
        vm.startPrank(alice);
        treasury.accrueUBI();
        vm.warp(block.timestamp + 5 days);
        treasury.accrueUBI();

        uint256 balanceBefore = tokenA.balanceOf(alice);
        treasury.claimUnclaimed(block.timestamp / 1 days - 5, block.timestamp / 1 days);
        uint256 balanceAfter = tokenA.balanceOf(alice);

        // 6 days accrued (day0 + days1..5)
        uint256 expectedGross = treasury.dailyUBIAmount() * 6;
        assertEq(balanceAfter - balanceBefore, expectedGross);
        vm.stopPrank();
    }

    function testClaimAfter31DaysDecays() public {
        vm.startPrank(alice);
        treasury.accrueUBI();
        uint256 day0 = block.timestamp / 1 days;

        vm.warp(block.timestamp + 40 days);
        treasury.accrueUBI();

        uint256 balanceBefore = tokenA.balanceOf(alice);
        treasury.claimUnclaimed(day0, day0);
        uint256 balanceAfter = tokenA.balanceOf(alice);

        uint256 amount = treasury.dailyUBIAmount();
        uint256 ageDays = (block.timestamp / 1 days) - day0; // 40
        uint256 elapsed = (ageDays - 30) * 1 days;
        uint256 decay = tokenA.decayRatePerSecond() * elapsed;
        uint256 expected;
        if (decay >= 1e18) {
            expected = 0;
        } else {
            expected = (amount * (1e18 - decay)) / 1e18;
        }
        assertEq(balanceAfter - balanceBefore, expected);
        vm.stopPrank();
    }

    function testSplitClaimsDoNotAvoidDecay() public {
        vm.startPrank(alice);
        treasury.accrueUBI();
        uint256 day0 = block.timestamp / 1 days;
        vm.warp(block.timestamp + 1 days);
        treasury.accrueUBI();
        uint256 day1 = block.timestamp / 1 days;

        vm.warp(block.timestamp + 40 days);

        uint256 balanceBefore = tokenA.balanceOf(alice);
        treasury.claimUnclaimed(day0, day0);
        treasury.claimUnclaimed(day1, day1);
        uint256 balanceAfter = tokenA.balanceOf(alice);

        uint256 amount = treasury.dailyUBIAmount();
        uint256 age0 = (block.timestamp / 1 days) - day0;
        uint256 age1 = (block.timestamp / 1 days) - day1;
        uint256 expected0 = _decayed(amount, age0);
        uint256 expected1 = _decayed(amount, age1);
        assertEq(balanceAfter - balanceBefore, expected0 + expected1);
        vm.stopPrank();
    }

    function _decayed(uint256 amount, uint256 ageDays) internal view returns (uint256) {
        if (ageDays <= 30) {
            return amount;
        }
        uint256 elapsed = (ageDays - 30) * 1 days;
        uint256 decay = tokenA.decayRatePerSecond() * elapsed;
        if (decay >= 1e18) {
            return 0;
        }
        return (amount * (1e18 - decay)) / 1e18;
    }
}
