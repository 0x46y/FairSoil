// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {APPIOracle} from "../src/APPIOracle.sol";

contract APPIOracleTest is Test {
    APPIOracle internal oracle;

    address internal primary = address(0xA11CE);
    address internal nonPrimary = address(0xBEEF);

    uint256 internal integrityScoreValue = 10;

    function setUp() public {
        oracle = new APPIOracle(address(this), address(this));
        oracle.setCategories(_categories());
        oracle.setThresholds(2, integrityScoreValue);
    }

    function isPrimaryAddress(address account) external view returns (bool) {
        return account == primary;
    }

    function integrityScore(address account) external view returns (uint256) {
        if (account == primary) {
            return integrityScoreValue;
        }
        return 0;
    }

    function testNonPrimaryCannotReport() public {
        vm.prank(nonPrimary);
        vm.expectRevert("Not verified");
        oracle.submitPrice(1, 100);
    }

    function testInsufficientIntegrityCannotReport() public {
        oracle.setThresholds(1, integrityScoreValue + 1);
        vm.prank(primary);
        vm.expectRevert("Low integrity");
        oracle.submitPrice(1, 100);
    }

    function testMedianRequiresUniqueThreshold() public {
        vm.prank(primary);
        oracle.submitPrice(1, 100);

        uint256 day = block.timestamp / 1 days;
        assertEq(oracle.medianPrice(day, 1), 0);
    }

    function testMedianPriceAndDailyIndex() public {
        address secondary = address(0xC0FFEE);
        // Make secondary primary and with integrity by using vm.mockCall on oracle's own selectors.
        vm.mockCall(
            address(this),
            abi.encodeWithSelector(this.isPrimaryAddress.selector, secondary),
            abi.encode(true)
        );
        vm.mockCall(
            address(this),
            abi.encodeWithSelector(this.integrityScore.selector, secondary),
            abi.encode(integrityScoreValue)
        );

        vm.prank(primary);
        oracle.submitPrice(1, 100);
        vm.prank(secondary);
        oracle.submitPrice(1, 200);

        uint256 day = block.timestamp / 1 days;
        assertEq(oracle.medianPrice(day, 1), 150);
        assertEq(oracle.dailyIndex(day), 150);

        oracle.setConfidence(5_000, 50);
        assertEq(oracle.medianPrice(day, 1), 75);
        assertEq(oracle.dailyIndex(day), 75);
    }

    function testRejectDuplicateReport() public {
        vm.prank(primary);
        oracle.submitPrice(1, 100);
        vm.prank(primary);
        vm.expectRevert("Already reported");
        oracle.submitPrice(1, 110);
    }

    function _categories() internal pure returns (uint256[] memory) {
        uint256[] memory cats = new uint256[](1);
        cats[0] = 1;
        return cats;
    }
}
