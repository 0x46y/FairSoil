// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {APPIOracle} from "../src/APPIOracle.sol";
import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";

contract APPIIntegrationTest is Test {
    APPIOracle internal oracle;
    FairSoilTokenA internal tokenA;
    FairSoilTokenB internal tokenB;
    SoilTreasury internal treasury;

    address internal reporter1 = address(0xA11CE);
    address internal reporter2 = address(0xBEEF);

    uint256 internal integrityScoreValue = 10;

    function setUp() public {
        oracle = new APPIOracle(address(this), address(this));
        oracle.setCategories(_categories());
        oracle.setThresholds(2, integrityScoreValue);

        FairSoilTokenA implementation = new FairSoilTokenA();
        bytes memory initData = abi.encodeCall(FairSoilTokenA.initialize, (1e12));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        tokenA = FairSoilTokenA(address(proxy));

        tokenB = new FairSoilTokenB(address(0));
        treasury = new SoilTreasury(address(tokenA), address(tokenB));
        tokenA.setTreasury(address(treasury));
        tokenB.setTreasury(address(treasury));

        treasury.setAPPIOracle(address(oracle));
    }

    function isPrimaryAddress(address account) external view returns (bool) {
        return account == reporter1 || account == reporter2;
    }

    function integrityScore(address account) external view returns (uint256) {
        if (account == reporter1 || account == reporter2) {
            return integrityScoreValue;
        }
        return 0;
    }

    function testApplyAPPIClampsChanges() public {
        treasury.setDailyUBIAmount(0);
        vm.prank(reporter1);
        oracle.submitPrice(1, 100);
        vm.prank(reporter2);
        oracle.submitPrice(1, 200);
        uint256 day = block.timestamp / 1 days;

        treasury.applyAPPI(day);
        uint256 first = treasury.dailyUBIAmount();
        assertEq(first, 150);

        vm.warp(block.timestamp + 1 days);
        vm.prank(reporter1);
        oracle.submitPrice(1, 10_000);
        vm.prank(reporter2);
        oracle.submitPrice(1, 10_000);
        uint256 day2 = block.timestamp / 1 days;

        treasury.applyAPPI(day2);
        uint256 capped = treasury.dailyUBIAmount();
        // capped by +5%
        assertEq(capped, first + (first * treasury.maxUbiIncreaseBps()) / 10_000);
    }

    function _categories() internal pure returns (uint256[] memory) {
        uint256[] memory cats = new uint256[](1);
        cats[0] = 1;
        return cats;
    }
}
