// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Minimal Harberger-style resource registry.
/// @dev This is a Phase2 MVP: on-chain tax accrual + voluntary settlement only.
contract ResourceRegistry is Ownable {
    struct Resource {
        address owner;
        uint256 valuation;
        uint256 taxRateBps;
        uint256 lastTaxTimestamp;
        bool exists;
    }

    IERC20 public immutable tokenB;
    address public immutable treasury;

    uint256 public constant BPS = 10_000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    mapping(bytes32 => Resource) public resources;

    event ResourceRegistered(bytes32 indexed resourceId, address indexed owner, uint256 valuation, uint256 taxRateBps);
    event ValuationUpdated(bytes32 indexed resourceId, uint256 valuation);
    event TaxRateUpdated(bytes32 indexed resourceId, uint256 taxRateBps);
    event TaxPaid(bytes32 indexed resourceId, address indexed payer, uint256 amount, uint256 periodSeconds);
    event ResourcePurchased(bytes32 indexed resourceId, address indexed from, address indexed to, uint256 price);

    constructor(address tokenBAddress, address treasuryAddress) Ownable(msg.sender) {
        require(tokenBAddress != address(0), "TokenB required");
        require(treasuryAddress != address(0), "Treasury required");
        tokenB = IERC20(tokenBAddress);
        treasury = treasuryAddress;
    }

    function registerResource(bytes32 resourceId, uint256 valuation, uint256 taxRateBps) external {
        require(resourceId != bytes32(0), "Invalid id");
        require(!resources[resourceId].exists, "Already registered");
        require(taxRateBps <= BPS, "Invalid tax rate");
        resources[resourceId] = Resource({
            owner: msg.sender,
            valuation: valuation,
            taxRateBps: taxRateBps,
            lastTaxTimestamp: block.timestamp,
            exists: true
        });
        emit ResourceRegistered(resourceId, msg.sender, valuation, taxRateBps);
    }

    function registerResourceFor(
        bytes32 resourceId,
        address owner,
        uint256 valuation,
        uint256 taxRateBps
    ) external onlyOwner {
        require(owner != address(0), "Owner required");
        require(resourceId != bytes32(0), "Invalid id");
        require(!resources[resourceId].exists, "Already registered");
        require(taxRateBps <= BPS, "Invalid tax rate");
        resources[resourceId] = Resource({
            owner: owner,
            valuation: valuation,
            taxRateBps: taxRateBps,
            lastTaxTimestamp: block.timestamp,
            exists: true
        });
        emit ResourceRegistered(resourceId, owner, valuation, taxRateBps);
    }

    function updateValuation(bytes32 resourceId, uint256 valuation) external {
        Resource storage resource = resources[resourceId];
        require(resource.exists, "Unknown resource");
        require(msg.sender == resource.owner, "Owner only");
        _settleTax(resourceId);
        resource.valuation = valuation;
        emit ValuationUpdated(resourceId, valuation);
    }

    function updateTaxRate(bytes32 resourceId, uint256 taxRateBps) external onlyOwner {
        Resource storage resource = resources[resourceId];
        require(resource.exists, "Unknown resource");
        require(taxRateBps <= BPS, "Invalid tax rate");
        _settleTax(resourceId);
        resource.taxRateBps = taxRateBps;
        emit TaxRateUpdated(resourceId, taxRateBps);
    }

    function pendingTax(bytes32 resourceId) public view returns (uint256 due, uint256 elapsedSeconds) {
        Resource storage resource = resources[resourceId];
        if (!resource.exists) {
            return (0, 0);
        }
        if (resource.taxRateBps == 0 || resource.valuation == 0) {
            return (0, block.timestamp - resource.lastTaxTimestamp);
        }
        elapsedSeconds = block.timestamp - resource.lastTaxTimestamp;
        uint256 annualTax = (resource.valuation * resource.taxRateBps) / BPS;
        due = (annualTax * elapsedSeconds) / SECONDS_PER_YEAR;
    }

    function payTax(bytes32 resourceId) external {
        Resource storage resource = resources[resourceId];
        require(resource.exists, "Unknown resource");
        require(msg.sender == resource.owner, "Owner only");
        _settleTax(resourceId);
    }

    function settleTax(bytes32 resourceId) external {
        _settleTax(resourceId);
    }

    function _settleTax(bytes32 resourceId) internal {
        Resource storage resource = resources[resourceId];
        require(resource.exists, "Unknown resource");
        (uint256 due, uint256 elapsed) = pendingTax(resourceId);
        resource.lastTaxTimestamp = block.timestamp;
        if (due == 0) {
            emit TaxPaid(resourceId, resource.owner, 0, elapsed);
            return;
        }
        require(tokenB.transferFrom(resource.owner, treasury, due), "Tax transfer failed");
        emit TaxPaid(resourceId, resource.owner, due, elapsed);
    }

    /// @notice Minimal purchase flow. No physical enforcement; purely on-chain state change.
    function buyResource(bytes32 resourceId, uint256 price) external {
        Resource storage resource = resources[resourceId];
        require(resource.exists, "Unknown resource");
        require(price >= resource.valuation, "Below valuation");
        _settleTax(resourceId);
        require(tokenB.transferFrom(msg.sender, resource.owner, price), "Payment failed");
        address previousOwner = resource.owner;
        resource.owner = msg.sender;
        resource.valuation = price;
        resource.lastTaxTimestamp = block.timestamp;
        emit ResourcePurchased(resourceId, previousOwner, msg.sender, price);
    }
}
