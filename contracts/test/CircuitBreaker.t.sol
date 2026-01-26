// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {APPIOracle} from "../src/APPIOracle.sol";
import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";

contract CircuitBreakerTest is Test {
    FairSoilTokenA internal tokenA;
    FairSoilTokenB internal tokenB;
    SoilTreasury internal treasury;
    APPIOracle internal oracle;

    address internal reporter = address(0xA11CE);

    function setUp() public {
        FairSoilTokenA implementation = new FairSoilTokenA();
        bytes memory initData = abi.encodeCall(FairSoilTokenA.initialize, (1e12));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        tokenA = FairSoilTokenA(address(proxy));

        tokenB = new FairSoilTokenB(address(0));
        treasury = new SoilTreasury(address(tokenA), address(tokenB));
        tokenA.setTreasury(address(treasury));
        tokenB.setTreasury(address(treasury));

        oracle = new APPIOracle(address(this), address(this));
        uint256[] memory cats = new uint256[](1);
        cats[0] = 1;
        oracle.setCategories(cats);
        oracle.setThresholds(1, 0);
        treasury.setAPPIOracle(address(oracle));

        tokenA.setPrimaryAddress(reporter, true);
    }

    function isPrimaryAddress(address account) external view returns (bool) {
        return account == reporter;
    }

    function integrityScore(address) external pure returns (uint256) {
        return 0;
    }

    function testLimitedBlocksApplyAPPI() public {
        treasury.setCircuitState(SoilTreasury.CircuitState.Limited);
        vm.prank(reporter);
        oracle.submitPrice(1, 100);
        uint256 day = block.timestamp / 1 days;

        vm.expectRevert("Circuit limited");
        treasury.applyAPPI(day);
    }

    function testHaltedBlocksEmergencyMint() public {
        treasury.setDeficitCapA(1_000e18);
        treasury.setCircuitState(SoilTreasury.CircuitState.Halted);
        vm.expectRevert("Circuit halted");
        treasury.emergencyMintA(reporter, 1e18);
    }

    function testClaimUBIAllowedWhenLimited() public {
        treasury.setCircuitState(SoilTreasury.CircuitState.Limited);
        vm.prank(reporter);
        treasury.claimUBI();
        assertGt(tokenA.balanceOf(reporter), 0);
    }
}
