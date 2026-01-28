// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";
import {Covenant} from "../src/Covenant.sol";
import {CovenantLibrary} from "../src/CovenantLibrary.sol";
import {RoyaltyRouter} from "../src/RoyaltyRouter.sol";

contract RoyaltyRouterTest is Test {
    FairSoilTokenA internal tokenA;
    FairSoilTokenB internal tokenB;
    SoilTreasury internal treasury;
    Covenant internal covenant;
    CovenantLibrary internal covenantLibrary;
    RoyaltyRouter internal royaltyRouter;

    address internal creator = address(0xCAFE);
    address internal worker = address(0xBEEF);
    address internal templateCreator = address(0xABCD);

    function setUp() public {
        FairSoilTokenA implementation = new FairSoilTokenA();
        bytes memory initData = abi.encodeCall(FairSoilTokenA.initialize, (1e16));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        tokenA = FairSoilTokenA(address(proxy));

        tokenB = new FairSoilTokenB(address(0));
        treasury = new SoilTreasury(address(tokenA), address(tokenB));
        tokenA.setTreasury(address(treasury));
        tokenB.setTreasury(address(treasury));

        covenant = new Covenant(address(tokenB), address(tokenA), address(treasury));
        treasury.setCovenant(address(covenant));
        tokenA.setCovenant(address(covenant));

        covenantLibrary = new CovenantLibrary();
        royaltyRouter = new RoyaltyRouter(address(tokenB), address(covenant), address(covenantLibrary));
        covenant.setRoyaltyRouter(address(royaltyRouter));

        tokenA.setPrimaryAddress(creator, true);
        tokenA.setPrimaryAddress(worker, true);

        vm.prank(address(treasury));
        tokenB.mint(address(treasury), 10_000e18);

        treasury.reportTaskCompleted(creator, 1000e18, 0);
    }

    function testRoyaltyPaidFromTokenBReward() public {
        vm.prank(templateCreator);
        uint256 templateId = covenantLibrary.registerTemplate(1000, "ipfs://edu-template");

        vm.prank(creator);
        tokenB.approve(address(covenant), 500e18);

        vm.prank(creator);
        uint256 covenantId = covenant.createCovenant(worker, 500e18, 0, false);

        vm.prank(creator);
        covenant.setCovenantTemplate(covenantId, templateId);

        vm.prank(worker);
        covenant.submitWork(covenantId);

        uint256 templateBefore = tokenB.balanceOf(templateCreator);
        uint256 workerBefore = tokenB.balanceOf(worker);

        vm.prank(creator);
        covenant.approveWork(covenantId);

        assertEq(tokenB.balanceOf(templateCreator), templateBefore + 50e18);
        assertEq(tokenB.balanceOf(worker), workerBefore + 450e18);
        assertTrue(royaltyRouter.royaltyPaid(covenantId));
    }
}
