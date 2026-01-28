// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IPrimaryRegistry {
    function isPrimaryAddress(address account) external view returns (bool);
}

interface IIntegrityScore {
    function integrityScore(address account) external view returns (uint256);
}

// APPI Oracle: internal purchasing power index based on on-chain reports.
// Minimal constraints: primary identity + integrity threshold + unique reporters per day.
contract APPIOracle is Ownable {
    struct Report {
        address reporter;
        uint256 price;
    }

    IPrimaryRegistry public immutable primaryRegistry;
    IIntegrityScore public immutable integritySource;

    uint256 public minUniqueReporters = 5;
    uint256 public minIntegrityScore = 0;
    uint256 public maxReportsPerCategory = 50;
    uint256 public confidenceBps = 10_000;

    uint256[] public categories;

    // day => category => reports
    mapping(uint256 => mapping(uint256 => Report[])) private reports;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasReported;
    mapping(uint256 => mapping(uint256 => uint256)) public uniqueCount;

    event CategorySet(uint256[] categories);
    event ThresholdsSet(uint256 minUniqueReporters, uint256 minIntegrityScore);
    event ConfidenceSet(uint256 confidenceBps, uint256 maxReportsPerCategory);
    event PriceReported(uint256 indexed day, uint256 indexed category, address indexed reporter, uint256 price);

    constructor(address primaryRegistryAddress, address integritySourceAddress) Ownable(msg.sender) {
        primaryRegistry = IPrimaryRegistry(primaryRegistryAddress);
        integritySource = IIntegrityScore(integritySourceAddress);
    }

    function setCategories(uint256[] calldata newCategories) external onlyOwner {
        categories = newCategories;
        emit CategorySet(newCategories);
    }

    function setThresholds(uint256 newMinUnique, uint256 newMinIntegrity) external onlyOwner {
        minUniqueReporters = newMinUnique;
        minIntegrityScore = newMinIntegrity;
        emit ThresholdsSet(newMinUnique, newMinIntegrity);
    }

    function setConfidence(uint256 newConfidenceBps, uint256 newMaxReports) external onlyOwner {
        require(newConfidenceBps <= 10_000, "Invalid confidence");
        require(newMaxReports > 0, "Invalid max reports");
        confidenceBps = newConfidenceBps;
        maxReportsPerCategory = newMaxReports;
        emit ConfidenceSet(newConfidenceBps, newMaxReports);
    }

    function submitPrice(uint256 category, uint256 price) external {
        require(price > 0, "Price required");
        require(primaryRegistry.isPrimaryAddress(msg.sender), "Not verified");
        require(integritySource.integrityScore(msg.sender) >= minIntegrityScore, "Low integrity");

        uint256 day = block.timestamp / 1 days;
        require(!hasReported[day][category][msg.sender], "Already reported");
        hasReported[day][category][msg.sender] = true;
        uniqueCount[day][category] += 1;

        reports[day][category].push(Report({reporter: msg.sender, price: price}));
        emit PriceReported(day, category, msg.sender, price);
    }

    function getReports(uint256 day, uint256 category) external view returns (Report[] memory) {
        return reports[day][category];
    }

    function medianPrice(uint256 day, uint256 category) public view returns (uint256) {
        if (uniqueCount[day][category] < minUniqueReporters) {
            return 0;
        }
        Report[] memory reps = reports[day][category];
        uint256 len = reps.length;
        if (len == 0) {
            return 0;
        }
        if (len > maxReportsPerCategory) {
            len = maxReportsPerCategory;
        }
        uint256[] memory prices = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            prices[i] = reps[i].price;
        }
        _sort(prices);
        if (len % 2 == 1) {
            return (prices[len / 2] * confidenceBps) / 10_000;
        }
        uint256 upper = prices[len / 2];
        uint256 lower = prices[(len / 2) - 1];
        return ((upper + lower) / 2) * confidenceBps / 10_000;
    }

    function dailyIndex(uint256 day) external view returns (uint256) {
        uint256 len = categories.length;
        require(len > 0, "No categories");
        uint256 sum;
        uint256 count;
        for (uint256 i = 0; i < len; i++) {
            uint256 median = medianPrice(day, categories[i]);
            if (median > 0) {
                sum += median;
                count += 1;
            }
        }
        if (count == 0) {
            return 0;
        }
        return sum / count;
    }

    function _sort(uint256[] memory arr) internal pure {
        uint256 n = arr.length;
        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = i + 1; j < n; j++) {
                if (arr[j] < arr[i]) {
                    uint256 tmp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = tmp;
                }
            }
        }
    }
}
