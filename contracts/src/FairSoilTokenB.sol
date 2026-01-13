// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Token B (Asset): non-decaying asset token minted only through authorized treasury.
contract FairSoilTokenB is ERC20, Ownable {
    address public treasury;

    constructor(address treasuryAddress) ERC20("FairSoil Asset", "SOILB") Ownable(msg.sender) {
        treasury = treasuryAddress;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        treasury = newTreasury;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == treasury, "Treasury only");
        _mint(to, amount);
    }
}
