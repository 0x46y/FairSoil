// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {FairSoilTokenA} from "../src/FairSoilTokenA.sol";
import {FairSoilTokenB} from "../src/FairSoilTokenB.sol";
import {SoilTreasury} from "../src/SoilTreasury.sol";
import {Covenant} from "../src/Covenant.sol";

contract Deploy is Script {
    function run()
        external
        returns (address tokenA, address tokenB, address treasury, address covenant)
    {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        uint256 decayRate = vm.envOr("DECAY_RATE_PER_SECOND", uint256(1e16));

        vm.startBroadcast(deployerKey);

        FairSoilTokenA implementation = new FairSoilTokenA();
        bytes memory initData = abi.encodeCall(FairSoilTokenA.initialize, (decayRate));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        tokenA = address(proxy);

        tokenB = address(new FairSoilTokenB(address(0)));
        treasury = address(new SoilTreasury(tokenA, tokenB));
        covenant = address(new Covenant(tokenB, tokenA, treasury));

        FairSoilTokenA(tokenA).setTreasury(treasury);
        FairSoilTokenB(tokenB).setTreasury(treasury);
        SoilTreasury(treasury).setCovenant(covenant);

        vm.stopBroadcast();
    }
}
