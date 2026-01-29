// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Minimal Covenant template registry with royalty hints.
/// @dev Phase2 MVP: registry only, no automatic payouts.
contract CovenantLibrary is Ownable {
    struct Template {
        address creator;
        uint256 royaltyBps;
        string metadataUri;
        bool active;
    }

    uint256 public constant BPS = 10_000;
    uint256 public nextTemplateId = 1;
    uint256 public maxRoyaltyBps = 1_000;
    uint256 public maxRoyaltyAmount = 50 * 1e18;

    mapping(uint256 => Template) public templates;

    event TemplateRegistered(uint256 indexed templateId, address indexed creator, uint256 royaltyBps, string metadataUri);
    event TemplateUpdated(uint256 indexed templateId, uint256 royaltyBps, string metadataUri);
    event TemplateActivation(uint256 indexed templateId, bool active);
    event TemplateUsed(uint256 indexed templateId, uint256 indexed covenantId, uint256 rewardAmount);
    event RoyaltyCapsUpdated(uint256 maxRoyaltyBps, uint256 maxRoyaltyAmount);

    constructor() Ownable(msg.sender) {}

    function setRoyaltyCaps(uint256 newMaxRoyaltyBps, uint256 newMaxRoyaltyAmount) external onlyOwner {
        require(newMaxRoyaltyBps <= BPS, "Invalid max bps");
        maxRoyaltyBps = newMaxRoyaltyBps;
        maxRoyaltyAmount = newMaxRoyaltyAmount;
        emit RoyaltyCapsUpdated(newMaxRoyaltyBps, newMaxRoyaltyAmount);
    }

    function registerTemplate(uint256 royaltyBps, string calldata metadataUri) external returns (uint256 id) {
        require(royaltyBps <= maxRoyaltyBps, "Invalid royalty");
        id = nextTemplateId++;
        templates[id] = Template({
            creator: msg.sender,
            royaltyBps: royaltyBps,
            metadataUri: metadataUri,
            active: true
        });
        emit TemplateRegistered(id, msg.sender, royaltyBps, metadataUri);
    }

    function updateTemplate(uint256 templateId, uint256 royaltyBps, string calldata metadataUri) external {
        Template storage template = templates[templateId];
        require(template.creator != address(0), "Unknown template");
        require(template.creator == msg.sender, "Creator only");
        require(royaltyBps <= maxRoyaltyBps, "Invalid royalty");
        template.royaltyBps = royaltyBps;
        template.metadataUri = metadataUri;
        emit TemplateUpdated(templateId, royaltyBps, metadataUri);
    }

    function setActive(uint256 templateId, bool active) external {
        Template storage template = templates[templateId];
        require(template.creator != address(0), "Unknown template");
        require(template.creator == msg.sender, "Creator only");
        template.active = active;
        emit TemplateActivation(templateId, active);
    }

    function calculateRoyalty(uint256 templateId, uint256 rewardAmount) external view returns (uint256) {
        Template storage template = templates[templateId];
        require(template.creator != address(0), "Unknown template");
        uint256 cappedBps = template.royaltyBps;
        if (cappedBps > maxRoyaltyBps) {
            cappedBps = maxRoyaltyBps;
        }
        if (cappedBps == 0 || rewardAmount == 0) {
            return 0;
        }
        uint256 royaltyAmount = (rewardAmount * cappedBps) / BPS;
        if (maxRoyaltyAmount > 0 && royaltyAmount > maxRoyaltyAmount) {
            return maxRoyaltyAmount;
        }
        return royaltyAmount;
    }

    /// @notice Optional usage signal for off-chain accounting.
    function recordUse(uint256 templateId, uint256 covenantId, uint256 rewardAmount) external {
        Template storage template = templates[templateId];
        require(template.creator != address(0), "Unknown template");
        emit TemplateUsed(templateId, covenantId, rewardAmount);
    }
}
