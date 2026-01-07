// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IFairSoilTokenA {
    function mint(address to, uint256 amount) external;
    function isPrimaryAddress(address account) external view returns (bool);
}

// Soil Treasury: manages UBI distribution for Token A.
contract SoilTreasury is Ownable {
    IFairSoilTokenA public immutable tokenA;
    uint256 public dailyUBIAmount = 100 * 1e18;

    mapping(address => uint256) public lastClaimTimestamp;

    constructor(address tokenAAddress) Ownable(msg.sender) {
        tokenA = IFairSoilTokenA(tokenAAddress);
    }

    function setDailyUBIAmount(uint256 newAmount) external onlyOwner {
        dailyUBIAmount = newAmount;
    }

    function claimUBI() external {
        require(tokenA.isPrimaryAddress(msg.sender), "Not World ID verified");
        uint256 lastClaim = lastClaimTimestamp[msg.sender];
        require(
            lastClaim == 0 || block.timestamp >= lastClaim + 1 days,
            "Already claimed today"
        );

        lastClaimTimestamp[msg.sender] = block.timestamp;
        tokenA.mint(msg.sender, dailyUBIAmount);
    }
}
