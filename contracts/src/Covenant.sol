// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IFairSoilTokenA {
    function isPrimaryAddress(address account) external view returns (bool);
}

interface ISoilTreasury {
    function addIntegrityFromCovenant(address worker, uint256 integrityPoints) external;
}

// Covenant: escrowed Token B rewards released on approval after worker submission.
contract Covenant {
    using SafeERC20 for IERC20;

    enum Status {
        Open,
        Submitted,
        Approved,
        Rejected,
        Cancelled
    }

    struct CovenantData {
        address creator;
        address worker;
        uint256 tokenBReward;
        uint256 integrityPoints;
        Status status;
    }

    IERC20 public immutable tokenB;
    IFairSoilTokenA public immutable tokenA;
    ISoilTreasury public immutable treasury;
    uint256 public nextId;

    mapping(uint256 => CovenantData) public covenants;

    event CovenantCreated(
        uint256 indexed covenantId,
        address indexed creator,
        address indexed worker,
        uint256 tokenBReward,
        uint256 integrityPoints
    );
    event CovenantSubmitted(uint256 indexed covenantId, address indexed worker);
    event CovenantApproved(uint256 indexed covenantId, address indexed creator);
    event CovenantRejected(uint256 indexed covenantId, address indexed creator);
    event CovenantCancelled(uint256 indexed covenantId, address indexed creator);

    constructor(address tokenBAddress, address tokenAAddress, address treasuryAddress) {
        tokenB = IERC20(tokenBAddress);
        tokenA = IFairSoilTokenA(tokenAAddress);
        treasury = ISoilTreasury(treasuryAddress);
    }

    function createCovenant(
        address worker,
        uint256 tokenBReward,
        uint256 integrityPoints
    ) external returns (uint256 covenantId) {
        require(worker != address(0), "Worker required");
        require(tokenBReward > 0, "Reward required");
        require(tokenA.isPrimaryAddress(worker), "Worker not verified");

        covenantId = nextId++;
        covenants[covenantId] = CovenantData({
            creator: msg.sender,
            worker: worker,
            tokenBReward: tokenBReward,
            integrityPoints: integrityPoints,
            status: Status.Open
        });

        tokenB.safeTransferFrom(msg.sender, address(this), tokenBReward);

        emit CovenantCreated(covenantId, msg.sender, worker, tokenBReward, integrityPoints);
    }

    function submitWork(uint256 covenantId) external {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(msg.sender == data.worker, "Worker only");
        require(data.status == Status.Open, "Not open");

        data.status = Status.Submitted;
        emit CovenantSubmitted(covenantId, msg.sender);
    }

    function approveWork(uint256 covenantId) external {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(msg.sender == data.creator, "Creator only");
        require(data.status == Status.Submitted, "Not submitted");

        data.status = Status.Approved;
        tokenB.safeTransfer(data.worker, data.tokenBReward);
        if (data.integrityPoints > 0) {
            treasury.addIntegrityFromCovenant(data.worker, data.integrityPoints);
        }

        emit CovenantApproved(covenantId, msg.sender);
    }

    function rejectWork(uint256 covenantId) external {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(msg.sender == data.creator, "Creator only");
        require(data.status == Status.Submitted, "Not submitted");

        data.status = Status.Rejected;
        tokenB.safeTransfer(data.creator, data.tokenBReward);

        emit CovenantRejected(covenantId, msg.sender);
    }

    function cancel(uint256 covenantId) external {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(msg.sender == data.creator, "Creator only");
        require(data.status == Status.Open, "Not open");

        data.status = Status.Cancelled;
        tokenB.safeTransfer(data.creator, data.tokenBReward);

        emit CovenantCancelled(covenantId, msg.sender);
    }
}
