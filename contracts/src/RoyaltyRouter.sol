// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICovenantLibrary {
    function templates(uint256 templateId)
        external
        view
        returns (address creator, uint256 royaltyBps, string memory metadataUri, bool active);
}

/// @notice Minimal royalty payout router for Covenant template usage.
/// @dev Phase2 MVP: single Covenant caller, simple one-time payout per covenant.
contract RoyaltyRouter {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;

    IERC20 public immutable tokenB;
    ICovenantLibrary public immutable covenantLibrary;
    address public immutable covenant;

    mapping(uint256 => bool) public royaltyPaid;

    event RoyaltyPaid(
        uint256 indexed covenantId,
        uint256 indexed templateId,
        address indexed receiver,
        uint256 amount
    );

    constructor(address tokenBAddress, address covenantAddress, address covenantLibraryAddress) {
        require(tokenBAddress != address(0), "TokenB required");
        require(covenantAddress != address(0), "Covenant required");
        require(covenantLibraryAddress != address(0), "Library required");
        tokenB = IERC20(tokenBAddress);
        covenant = covenantAddress;
        covenantLibrary = ICovenantLibrary(covenantLibraryAddress);
    }

    function previewRoyalty(uint256 templateId, uint256 amountB)
        public
        view
        returns (address receiver, uint256 royaltyAmount)
    {
        if (templateId == 0 || amountB == 0) {
            return (address(0), 0);
        }
        (address creator, uint256 royaltyBps, , bool active) = covenantLibrary.templates(templateId);
        if (creator == address(0) || !active || royaltyBps == 0) {
            return (address(0), 0);
        }
        royaltyAmount = (amountB * royaltyBps) / BPS;
        receiver = creator;
    }

    function notifyPayout(uint256 covenantId, uint256 templateId, uint256 amountB)
        external
        returns (uint256 royaltyAmount)
    {
        require(msg.sender == covenant, "Covenant only");
        require(!royaltyPaid[covenantId], "Royalty already paid");

        (address receiver, uint256 previewAmount) = previewRoyalty(templateId, amountB);
        royaltyPaid[covenantId] = true;

        if (previewAmount == 0 || receiver == address(0)) {
            return 0;
        }

        royaltyAmount = previewAmount;
        tokenB.safeTransferFrom(covenant, receiver, royaltyAmount);

        emit RoyaltyPaid(covenantId, templateId, receiver, royaltyAmount);
    }
}
