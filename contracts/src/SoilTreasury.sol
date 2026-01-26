// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IFairSoilTokenA {
    function mint(address to, uint256 amount) external;
    function isPrimaryAddress(address account) external view returns (bool);
    function decayRatePerSecond() external view returns (uint256);
}

interface IFairSoilTokenB {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

interface IAPPIOracle {
    function dailyIndex(uint256 day) external view returns (uint256);
}

// Soil Treasury: manages UBI distribution for Token A.
contract SoilTreasury is Ownable {
    enum CircuitState {
        Normal,
        Limited,
        Halted
    }

    IFairSoilTokenA public immutable tokenA;
    IFairSoilTokenB public immutable tokenB;
    uint256 public dailyUBIAmount = 100 * 1e18;
    IAPPIOracle public appiOracle;
    uint256 public lastAPPI;
    uint256 public maxUbiIncreaseBps = 500; // 5% per update
    uint256 public maxUbiDecreaseBps = 200; // 2% per update
    CircuitState public circuitState = CircuitState.Normal;

    mapping(address => uint256) public lastClaimTimestamp;
    mapping(address => uint256) public integrityScore;
    mapping(address => uint256) public payScore;
    mapping(address => uint256) public processScore;
    mapping(address => uint256) public civicsScore;
    mapping(address => uint256) public lastAccruedDay;
    mapping(address => mapping(uint256 => uint256)) public unclaimed;

    uint256 public governanceMinTokenB = 1 * 1e18;
    uint256 public governanceMinIntegrity = 100;
    uint256 public crystallizationRateBps = 10_000;
    uint256 public crystallizationFeeBps = 2000;
    address public covenant;
    uint256 public deficitCapA;
    uint256 public advanceCapB;
    uint256 public deficitAOutstanding;
    uint256 public advanceBOutstanding;

    event UBIClaimed(address indexed user, uint256 amount);
    event TaskCompleted(address indexed worker, uint256 tokenBReward, uint256 integrityPoints);
    event ScoreUpdated(address indexed account, uint256 pay, uint256 process, uint256 civics);
    event PayPenaltyApplied(address indexed account, uint256 points, string reason);
    event CovenantSet(address indexed covenant);
    event CrystallizationRateSet(uint256 rateBps);
    event CrystallizationFeeSet(uint256 feeBps);
    event CrystallizationMinted(address indexed worker, uint256 tokenBAmount, uint256 burnedA);
    event DeficitCapASet(uint256 capA);
    event AdvanceCapBSet(uint256 capB);
    event DeficitAIssued(address indexed to, uint256 amount);
    event AdvanceBIssued(address indexed to, uint256 amount);
    event UBIAccrued(address indexed user, uint256 day, uint256 amountA);
    event Claimed(address indexed user, uint256 fromDay, uint256 toDay, uint256 grossA, uint256 decayedA);
    event DecayApplied(address indexed user, uint256 amountA);
    event TreasuryOutA(address indexed to, uint256 amount, bytes32 reason);
    event TreasuryOutB(address indexed to, uint256 amount, bytes32 reason);
    event TreasuryIn(address indexed from, uint256 amount, bytes32 reason);
    event APPIOracleSet(address indexed oracle);
    event APPIApplied(uint256 indexed day, uint256 appiValue, uint256 newDailyUBI);
    event APPIChangeLimitsSet(uint256 maxIncreaseBps, uint256 maxDecreaseBps);
    event CircuitStateSet(CircuitState state);

    bytes32 private constant REASON_UBI = "UBI";
    bytes32 private constant REASON_UBI_CLAIM = "UBI_CLAIM";
    bytes32 private constant REASON_DEFICIT = "DEFICIT";
    bytes32 private constant REASON_ADVANCE = "ADVANCE";
    bytes32 private constant REASON_TASK = "TASK";
    bytes32 private constant REASON_CRYSTAL = "CRYSTAL";

    constructor(address tokenAAddress, address tokenBAddress) Ownable(msg.sender) {
        tokenA = IFairSoilTokenA(tokenAAddress);
        tokenB = IFairSoilTokenB(tokenBAddress);
    }

    modifier onlyOwnerOrCovenant() {
        require(msg.sender == owner() || msg.sender == covenant, "Owner or covenant only");
        _;
    }

    function setDailyUBIAmount(uint256 newAmount) external onlyOwner {
        require(circuitState == CircuitState.Normal, "Circuit limited");
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

    function setAPPIOracle(address newOracle) external onlyOwner {
        appiOracle = IAPPIOracle(newOracle);
        emit APPIOracleSet(newOracle);
    }

    function setAPPIChangeLimits(uint256 newMaxIncreaseBps, uint256 newMaxDecreaseBps) external onlyOwner {
        require(newMaxIncreaseBps <= 10_000, "Invalid increase");
        require(newMaxDecreaseBps <= 10_000, "Invalid decrease");
        maxUbiIncreaseBps = newMaxIncreaseBps;
        maxUbiDecreaseBps = newMaxDecreaseBps;
        emit APPIChangeLimitsSet(newMaxIncreaseBps, newMaxDecreaseBps);
    }

    function applyAPPI(uint256 day) external onlyOwner {
        require(circuitState == CircuitState.Normal, "Circuit limited");
        require(address(appiOracle) != address(0), "APPI oracle not set");
        uint256 value = appiOracle.dailyIndex(day);
        require(value > 0, "APPI unavailable");
        lastAPPI = value;
        if (dailyUBIAmount == 0) {
            dailyUBIAmount = value;
        } else {
            uint256 maxUp = dailyUBIAmount + (dailyUBIAmount * maxUbiIncreaseBps) / 10_000;
            uint256 maxDown = dailyUBIAmount - (dailyUBIAmount * maxUbiDecreaseBps) / 10_000;
            if (value > maxUp) {
                dailyUBIAmount = maxUp;
            } else if (value < maxDown) {
                dailyUBIAmount = maxDown;
            } else {
                dailyUBIAmount = value;
            }
        }
        emit APPIApplied(day, value, dailyUBIAmount);
    }

    function setCircuitState(CircuitState newState) external onlyOwner {
        circuitState = newState;
        emit CircuitStateSet(newState);
    }

    function setDeficitCapA(uint256 newCapA) external onlyOwner {
        deficitCapA = newCapA;
        emit DeficitCapASet(newCapA);
    }

    function setAdvanceCapB(uint256 newCapB) external onlyOwner {
        advanceCapB = newCapB;
        emit AdvanceCapBSet(newCapB);
    }

    function claimUBI() external {
        require(tokenA.isPrimaryAddress(msg.sender), "Not World ID verified");
        uint256 lastClaim = lastClaimTimestamp[msg.sender];
        require(
            lastClaim == 0 || block.timestamp >= lastClaim + 1 days,
            "Already claimed today"
        );

        uint256 currentDay = block.timestamp / 1 days;
        lastAccruedDay[msg.sender] = currentDay;
        lastClaimTimestamp[msg.sender] = block.timestamp;
        tokenA.mint(msg.sender, dailyUBIAmount);
        emit TreasuryOutA(msg.sender, dailyUBIAmount, REASON_UBI);
        emit UBIClaimed(msg.sender, dailyUBIAmount);
    }

    function accrueUBI() external {
        require(tokenA.isPrimaryAddress(msg.sender), "Not World ID verified");
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastDay = lastAccruedDay[msg.sender];
        if (lastDay == 0) {
            lastAccruedDay[msg.sender] = currentDay;
            unclaimed[msg.sender][currentDay] += dailyUBIAmount;
            emit UBIAccrued(msg.sender, currentDay, dailyUBIAmount);
            return;
        }
        if (currentDay <= lastDay) {
            return;
        }
        for (uint256 day = lastDay + 1; day <= currentDay; day++) {
            unclaimed[msg.sender][day] += dailyUBIAmount;
            emit UBIAccrued(msg.sender, day, dailyUBIAmount);
        }
        lastAccruedDay[msg.sender] = currentDay;
    }

    function claimUnclaimed(uint256 fromDay, uint256 toDay) external {
        require(tokenA.isPrimaryAddress(msg.sender), "Not World ID verified");
        require(fromDay <= toDay, "Invalid range");
        uint256 currentDay = block.timestamp / 1 days;
        require(toDay <= currentDay, "Future day");

        uint256 gross;
        uint256 decayed;
        uint256 decayRate = tokenA.decayRatePerSecond();
        for (uint256 day = fromDay; day <= toDay; day++) {
            uint256 amount = unclaimed[msg.sender][day];
            if (amount == 0) {
                continue;
            }
            gross += amount;
            uint256 ageDays = currentDay - day;
            if (ageDays <= 30) {
                decayed += amount;
            } else {
                uint256 elapsed = (ageDays - 30) * 1 days;
                uint256 decay = decayRate * elapsed;
                if (decay >= 1e18) {
                    // fully decayed
                } else {
                    decayed += (amount * (1e18 - decay)) / 1e18;
                }
            }
            delete unclaimed[msg.sender][day];
        }
        require(gross > 0, "Nothing to claim");
        if (decayed < gross) {
            emit DecayApplied(msg.sender, gross - decayed);
        }
        tokenA.mint(msg.sender, decayed);
        emit TreasuryOutA(msg.sender, decayed, REASON_UBI_CLAIM);
        lastClaimTimestamp[msg.sender] = block.timestamp;
        emit Claimed(msg.sender, fromDay, toDay, gross, decayed);
    }

    function emergencyMintA(address to, uint256 amount) external onlyOwner {
        require(circuitState != CircuitState.Halted, "Circuit halted");
        require(amount > 0, "Amount required");
        require(deficitAOutstanding + amount <= deficitCapA, "Deficit cap");
        deficitAOutstanding += amount;
        tokenA.mint(to, amount);
        emit TreasuryOutA(to, amount, REASON_DEFICIT);
        emit DeficitAIssued(to, amount);
    }

    function emergencyAdvanceB(address to, uint256 amount) external onlyOwner {
        require(circuitState != CircuitState.Halted, "Circuit halted");
        require(amount > 0, "Amount required");
        require(advanceBOutstanding + amount <= advanceCapB, "Advance cap");
        advanceBOutstanding += amount;
        tokenB.mint(to, amount);
        emit TreasuryOutB(to, amount, REASON_ADVANCE);
        emit AdvanceBIssued(to, amount);
    }

    function reportTaskCompleted(
        address worker,
        uint256 tokenBReward,
        uint256 integrityPoints
    ) external onlyOwner {
        require(circuitState == CircuitState.Normal, "Circuit limited");
        require(tokenA.isPrimaryAddress(worker), "Worker not verified");
        if (tokenBReward > 0) {
            tokenB.mint(worker, tokenBReward);
            emit TreasuryOutB(worker, tokenBReward, REASON_TASK);
        }
        if (integrityPoints > 0) {
            integrityScore[worker] += integrityPoints;
            civicsScore[worker] += integrityPoints;
        }
        emit ScoreUpdated(worker, payScore[worker], processScore[worker], civicsScore[worker]);
        emit TaskCompleted(worker, tokenBReward, integrityPoints);
    }

    function addIntegrityFromCovenant(address worker, uint256 integrityPoints) external {
        require(msg.sender == covenant, "Covenant only");
        require(tokenA.isPrimaryAddress(worker), "Worker not verified");
        if (integrityPoints > 0) {
            integrityScore[worker] += integrityPoints;
            processScore[worker] += integrityPoints;
        }
        emit ScoreUpdated(worker, payScore[worker], processScore[worker], civicsScore[worker]);
        emit TaskCompleted(worker, 0, integrityPoints);
    }

    function penalizeProcessScore(
        address account,
        uint256 points,
        string calldata reason
    ) external onlyOwnerOrCovenant {
        uint256 current = processScore[account];
        if (points >= current) {
            processScore[account] = 0;
        } else {
            processScore[account] = current - points;
        }
        emit ScoreUpdated(account, payScore[account], processScore[account], civicsScore[account]);
        emit PayPenaltyApplied(account, points, reason);
    }

    function addPayScore(address account, uint256 points) external onlyOwnerOrCovenant {
        payScore[account] += points;
        emit ScoreUpdated(account, payScore[account], processScore[account], civicsScore[account]);
    }

    function penalizePayScore(address account, uint256 points) external onlyOwnerOrCovenant {
        uint256 current = payScore[account];
        if (points >= current) {
            payScore[account] = 0;
        } else {
            payScore[account] = current - points;
        }
        emit ScoreUpdated(account, payScore[account], processScore[account], civicsScore[account]);
    }

    function penalizePayScoreWithReason(
        address account,
        uint256 points,
        string calldata reason
    ) external onlyOwnerOrCovenant {
        penalizePayScore(account, points);
        emit PayPenaltyApplied(account, points, reason);
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
            emit TreasuryOutB(worker, minted, REASON_CRYSTAL);
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
