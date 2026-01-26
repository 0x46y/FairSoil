// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IFairSoilTokenA {
    function mint(address to, uint256 amount) external;
    function isPrimaryAddress(address account) external view returns (bool);
    function decayRatePerSecond() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

interface IFairSoilTokenB {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function lock(address account, uint256 amount) external;
    function unlock(address account, uint256 amount) external;
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
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
    uint256 public treasuryInTotal;
    uint256 public treasuryOutATotal;
    uint256 public treasuryOutBTotal;
    uint256 public advanceBSettledTotal;
    uint256 public liabilitiesA;
    uint256 public liabilitiesB;
    uint256 public lastReservesA;
    uint256 public lastReservesB;

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
    event ReserveSnapshot(uint256 reservesA, uint256 reservesB);
    event LiabilityChanged(int256 deltaA, int256 deltaB, bytes32 reason);
    event AdvanceBSettled(address indexed from, uint256 amount);

    bytes32 public constant REASON_UBI = "UBI";
    bytes32 public constant REASON_UBI_CLAIM = "UBI_CLAIM";
    bytes32 public constant REASON_DEFICIT = "DEFICIT";
    bytes32 public constant REASON_ADVANCE = "ADVANCE";
    bytes32 public constant REASON_TASK = "TASK";
    bytes32 public constant REASON_CRYSTAL = "CRYSTAL";
    bytes32 public constant REASON_FEE = "FEE";
    bytes32 public constant REASON_TAX = "TAX";
    bytes32 public constant REASON_SLASH = "SLASH";
    bytes32 public constant REASON_EXTERNAL = "EXTERNAL";
    bytes32 public constant REASON_ADVANCE_LIABILITY = "ADV_LIAB";
    bytes32 public constant REASON_ADVANCE_SETTLE = "ADV_SETTLE";
    bytes32 public constant REASON_COV_CREATE = "COV_CREATE";
    bytes32 public constant REASON_COV_SETTLE = "COV_SETTLE";

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

    function lockB(address account, uint256 amount) external onlyOwnerOrCovenant {
        require(amount > 0, "Amount required");
        tokenB.lock(account, amount);
    }

    function unlockB(address account, uint256 amount) external onlyOwnerOrCovenant {
        require(amount > 0, "Amount required");
        tokenB.unlock(account, amount);
    }

    function recordTreasuryIn(address from, uint256 amount, bytes32 reason) internal {
        require(amount > 0, "Amount required");
        require(_isAllowedTreasuryInReason(reason), "Invalid reason");
        treasuryInTotal += amount;
        emit TreasuryIn(from, amount, reason);
    }

    function recordFee(address from, uint256 amount) external onlyOwner {
        recordTreasuryIn(from, amount, REASON_FEE);
    }

    function recordTax(address from, uint256 amount) external onlyOwner {
        recordTreasuryIn(from, amount, REASON_TAX);
    }

    function recordSlashing(address from, uint256 amount) external onlyOwner {
        recordTreasuryIn(from, amount, REASON_SLASH);
    }

    function recordExternalIn(address from, uint256 amount) external onlyOwner {
        recordTreasuryIn(from, amount, REASON_EXTERNAL);
    }

    function _recordOutA(address to, uint256 amount, bytes32 reason) internal {
        require(_isAllowedTreasuryOutAReason(reason, to), "Invalid A out reason");
        treasuryOutATotal += amount;
        emit TreasuryOutA(to, amount, reason);
    }

    function _recordOutB(address to, uint256 amount, bytes32 reason) internal {
        require(_isAllowedTreasuryOutBReason(reason, to), "Invalid B out reason");
        treasuryOutBTotal += amount;
        emit TreasuryOutB(to, amount, reason);
    }

    function snapshotReserves() external onlyOwner {
        uint256 reservesA = tokenA.balanceOf(address(this));
        uint256 reservesB = tokenB.balanceOf(address(this));
        lastReservesA = reservesA;
        lastReservesB = reservesB;
        emit ReserveSnapshot(reservesA, reservesB);
    }

    function canPayOutA(uint256 amount) public view returns (bool) {
        uint256 reservesA = tokenA.balanceOf(address(this));
        return reservesA >= amount || deficitAOutstanding + amount <= deficitCapA;
    }

    function canPayOutB(uint256 amount) public view returns (bool) {
        uint256 reservesB = tokenB.balanceOf(address(this));
        return reservesB >= amount;
    }

    function adjustLiabilities(
        int256 deltaA,
        int256 deltaB,
        bytes32 reason
    ) external onlyOwnerOrCovenant {
        if (deltaA != 0) {
            if (deltaA > 0) {
                liabilitiesA += uint256(deltaA);
            } else {
                uint256 reduction = uint256(-deltaA);
                require(liabilitiesA >= reduction, "Liability A underflow");
                liabilitiesA -= reduction;
            }
        }
        if (deltaB != 0) {
            if (deltaB > 0) {
                liabilitiesB += uint256(deltaB);
            } else {
                uint256 reduction = uint256(-deltaB);
                require(liabilitiesB >= reduction, "Liability B underflow");
                liabilitiesB -= reduction;
            }
        }
        emit LiabilityChanged(deltaA, deltaB, reason);
    }

    function _isAllowedTreasuryInReason(bytes32 reason) internal pure returns (bool) {
        return
            reason == REASON_FEE ||
            reason == REASON_TAX ||
            reason == REASON_SLASH ||
            reason == REASON_EXTERNAL;
    }

    function _isAllowedTreasuryOutAReason(bytes32 reason, address to) internal pure returns (bool) {
        if (to == address(0)) {
            return false;
        }
        return
            reason == REASON_UBI ||
            reason == REASON_UBI_CLAIM ||
            reason == REASON_DEFICIT;
    }

    function _isAllowedTreasuryOutBReason(bytes32 reason, address to) internal pure returns (bool) {
        if (to == address(0)) {
            return false;
        }
        return
            reason == REASON_ADVANCE ||
            reason == REASON_TASK ||
            reason == REASON_CRYSTAL;
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
        require(canPayOutA(dailyUBIAmount), "Insufficient reserves");

        uint256 currentDay = block.timestamp / 1 days;
        lastAccruedDay[msg.sender] = currentDay;
        lastClaimTimestamp[msg.sender] = block.timestamp;
        tokenA.mint(msg.sender, dailyUBIAmount);
        _recordOutA(msg.sender, dailyUBIAmount, REASON_UBI);
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
        require(canPayOutA(decayed), "Insufficient reserves");
        if (decayed < gross) {
            emit DecayApplied(msg.sender, gross - decayed);
        }
        tokenA.mint(msg.sender, decayed);
        _recordOutA(msg.sender, decayed, REASON_UBI_CLAIM);
        lastClaimTimestamp[msg.sender] = block.timestamp;
        emit Claimed(msg.sender, fromDay, toDay, gross, decayed);
    }

    function emergencyMintA(address to, uint256 amount) external onlyOwner {
        require(circuitState != CircuitState.Halted, "Circuit halted");
        require(amount > 0, "Amount required");
        require(canPayOutA(amount), "Insufficient reserves");
        require(deficitAOutstanding + amount <= deficitCapA, "Deficit cap");
        deficitAOutstanding += amount;
        tokenA.mint(to, amount);
        _recordOutA(to, amount, REASON_DEFICIT);
        emit DeficitAIssued(to, amount);
    }

    function emergencyAdvanceB(address to, uint256 amount) external onlyOwner {
        require(circuitState != CircuitState.Halted, "Circuit halted");
        require(amount > 0, "Amount required");
        require(canPayOutB(amount), "Insufficient reserves");
        require(advanceBOutstanding + amount <= advanceCapB, "Advance cap");
        advanceBOutstanding += amount;
        tokenB.mint(to, amount);
        _recordOutB(to, amount, REASON_ADVANCE);
        adjustLiabilities(0, int256(amount), REASON_ADVANCE_LIABILITY);
        emit AdvanceBIssued(to, amount);
    }

    function settleAdvanceB(address from, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount required");
        require(advanceBOutstanding >= amount, "Advance underflow");
        if (from != address(0)) {
            require(tokenB.transferFrom(from, address(this), amount), "Transfer failed");
        }
        require(tokenB.balanceOf(address(this)) >= amount, "Insufficient reserves");
        advanceBOutstanding -= amount;
        advanceBSettledTotal += amount;
        adjustLiabilities(0, -int256(amount), REASON_ADVANCE_SETTLE);
        emit AdvanceBSettled(from, amount);
    }

    function reportTaskCompleted(
        address worker,
        uint256 tokenBReward,
        uint256 integrityPoints
    ) external onlyOwner {
        require(circuitState == CircuitState.Normal, "Circuit limited");
        require(tokenA.isPrimaryAddress(worker), "Worker not verified");
        if (tokenBReward > 0) {
            require(canPayOutB(tokenBReward), "Insufficient reserves");
            tokenB.mint(worker, tokenBReward);
            _recordOutB(worker, tokenBReward, REASON_TASK);
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
        require(circuitState == CircuitState.Normal, "Circuit limited");
        if (burnedA == 0) {
            return 0;
        }
        uint256 minted = (burnedA * crystallizationRateBps) / 10_000;
        if (crystallizationFeeBps > 0) {
            minted = (minted * (10_000 - crystallizationFeeBps)) / 10_000;
        }
        if (minted > 0) {
            require(canPayOutB(minted), "Insufficient reserves");
            tokenB.mint(worker, minted);
            _recordOutB(worker, minted, REASON_CRYSTAL);
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
