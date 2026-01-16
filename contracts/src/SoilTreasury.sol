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
    uint256 public crystallizationRateBps = 10_000;
    uint256 public crystallizationFeeBps = 2000;
    address public covenant;

    event UBIClaimed(address indexed user, uint256 amount);
    event TaskCompleted(address indexed worker, uint256 tokenBReward, uint256 integrityPoints);
    event CovenantSet(address indexed covenant);
    event CrystallizationRateSet(uint256 rateBps);
    event CrystallizationFeeSet(uint256 feeBps);
    event CrystallizationMinted(address indexed worker, uint256 tokenBAmount, uint256 burnedA);

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

    function setCrystallizationRateBps(uint256 newRateBps) external onlyOwner {
        require(newRateBps <= 10_000, "Invalid rate");
        crystallizationRateBps = newRateBps;
        emit CrystallizationRateSet(newRateBps);
    }

    function setCrystallizationFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 10_000, "Invalid fee");
        crystallizationFeeBps = newFeeBps;
        emit CrystallizationFeeSet(newFeeBps);
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
        emit UBIClaimed(msg.sender, dailyUBIAmount);
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

    function mintBByCrystallization(address worker, uint256 burnedA) external returns (uint256) {
        require(msg.sender == covenant, "Covenant only");
        if (burnedA == 0) {
            return 0;
        }
        uint256 minted = (burnedA * crystallizationRateBps) / 10_000;
        if (crystallizationFeeBps > 0) {
            minted = (minted * (10_000 - crystallizationFeeBps)) / 10_000;
        }
        if (minted > 0) {
            tokenB.mint(worker, minted);
        }
        emit CrystallizationMinted(worker, minted, burnedA);
        return minted;
    }

    function isEligibleForGovernance(address account) external view returns (bool) {
        return
            tokenB.balanceOf(account) >= governanceMinTokenB ||
            integrityScore[account] >= governanceMinIntegrity;
    }
}
