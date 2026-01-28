// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {CovenantLibrary} from "../src/CovenantLibrary.sol";

contract CovenantLibraryTest is Test {
    CovenantLibrary private lib;
    address private creator = address(0xCAFE);

    function setUp() public {
        lib = new CovenantLibrary();
    }

    function testRegisterUpdateAndRoyalty() public {
        vm.prank(creator);
        uint256 id = lib.registerTemplate(500, "ipfs://template");

        uint256 royalty = lib.calculateRoyalty(id, 1000 ether);
        assertEq(royalty, 50 ether);

        vm.prank(creator);
        lib.updateTemplate(id, 800, "ipfs://v2");
        uint256 royalty2 = lib.calculateRoyalty(id, 1000 ether);
        assertEq(royalty2, 80 ether);
    }

    function testActivateDeactivate() public {
        vm.prank(creator);
        uint256 id = lib.registerTemplate(100, "ipfs://template");

        vm.prank(creator);
        lib.setActive(id, false);
        (,, , bool active) = lib.templates(id);
        assertEq(active, false);
    }
}
