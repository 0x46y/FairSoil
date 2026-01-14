// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IFairSoilTokenA {
    function mint(address to, uint256 amount) external;
    function isPrimaryAddress(address account) external view returns (bool);
}

interface IFairSoilTokenB {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

// Soil Treasury: manages UBI distribution for Token A.
contract SoilTreasury is Ownable {
    IFairSoilTokenA public immutable tokenA;
    IFairSoilTokenB public immutable tokenB;
    uint256 public dailyUBIAmount = 100 * 1e18;

    mapping(address => uint256) public lastClaimTimestamp;
    mapping(address => uint256) public integrityScore;

    uint256 public governanceMinTokenB = 1 * 1e18;
    uint256 public governanceMinIntegrity = 100;
    address public covenant;

    event TaskCompleted(address indexed worker, uint256 tokenBReward, uint256 integrityPoints);
    event CovenantSet(address indexed covenant);

    constructor(address tokenAAddress, address tokenBAddress) Ownable(msg.sender) {
        tokenA = IFairSoilTokenA(tokenAAddress);
        tokenB = IFairSoilTokenB(tokenBAddress);
    }

    function setDailyUBIAmount(uint256 newAmount) external onlyOwner {
        dailyUBIAmount = newAmount;
    }

    function setGovernanceThresholds(uint256 minTokenB, uint256 minIntegrity) external onlyOwner {
        governanceMinTokenB = minTokenB;
        governanceMinIntegrity = minIntegrity;
    }

    function setCovenant(address newCovenant) external onlyOwner {
        covenant = newCovenant;
        emit CovenantSet(newCovenant);
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

    function reportTaskCompleted(
        address worker,
        uint256 tokenBReward,
        uint256 integrityPoints
    ) external onlyOwner {
        require(tokenA.isPrimaryAddress(worker), "Worker not verified");
        if (tokenBReward > 0) {
            tokenB.mint(worker, tokenBReward);
        }
        if (integrityPoints > 0) {
            integrityScore[worker] += integrityPoints;
        }
        emit TaskCompleted(worker, tokenBReward, integrityPoints);
    }

    function addIntegrityFromCovenant(address worker, uint256 integrityPoints) external {
        require(msg.sender == covenant, "Covenant only");
        require(tokenA.isPrimaryAddress(worker), "Worker not verified");
        if (integrityPoints > 0) {
            integrityScore[worker] += integrityPoints;
        }
        emit TaskCompleted(worker, 0, integrityPoints);
    }

    function isEligibleForGovernance(address account) external view returns (bool) {
        return
            tokenB.balanceOf(account) >= governanceMinTokenB ||
            integrityScore[account] >= governanceMinIntegrity;
    }
}
