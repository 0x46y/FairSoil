// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {ResourceRegistry} from "../src/ResourceRegistry.sol";

contract ResourceRegistryTest is Test {
    FairSoilTokenB private tokenB;
    ResourceRegistry private registry;

    address private treasury = address(0xBEEF);
    address private owner = address(0xCAFE);
    address private buyer = address(0xD00D);

    function setUp() public {
        vm.prank(owner);
        tokenB = new FairSoilTokenB(treasury);

        vm.prank(treasury);
        tokenB.setTreasury(treasury);

        registry = new ResourceRegistry(address(tokenB), treasury);
        vm.prank(owner);
        registry.transferOwnership(owner);

        // Fund owner and buyer with B for tax/payment.
        vm.prank(treasury);
        tokenB.mint(owner, 1_000_000 ether);
        vm.prank(treasury);
        tokenB.mint(buyer, 1_000_000 ether);

        vm.prank(owner);
        tokenB.approve(address(registry), type(uint256).max);
        vm.prank(buyer);
        tokenB.approve(address(registry), type(uint256).max);
    }

    function testRegisterUpdateAndTax() public {
        bytes32 resourceId = keccak256("land:alpha");
        vm.prank(owner);
        registry.registerResource(resourceId, 1000 ether, 500); // 5% annual

        (uint256 dueBefore, ) = registry.pendingTax(resourceId);
        assertEq(dueBefore, 0);

        vm.warp(block.timestamp + 30 days);
        (uint256 due, ) = registry.pendingTax(resourceId);
        assertGt(due, 0);

        uint256 treasuryBefore = tokenB.balanceOf(treasury);
        vm.prank(owner);
        registry.payTax(resourceId);
        uint256 treasuryAfter = tokenB.balanceOf(treasury);
        assertGt(treasuryAfter, treasuryBefore);

        vm.prank(owner);
        registry.updateValuation(resourceId, 2000 ether);
        (uint256 dueAfter, ) = registry.pendingTax(resourceId);
        assertEq(dueAfter, 0);
    }

    function testBuyResource() public {
        bytes32 resourceId = keccak256("server:01");
        vm.prank(owner);
        registry.registerResource(resourceId, 500 ether, 100);

        vm.prank(buyer);
        registry.buyResource(resourceId, 600 ether);

        (address newOwner, uint256 valuation, , , ) = registry.resources(resourceId);
        assertEq(newOwner, buyer);
        assertEq(valuation, 600 ether);
    }
}
