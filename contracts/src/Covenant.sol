// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IFairSoilTokenA {
    function isPrimaryAddress(address account) external view returns (bool);
}

interface ISoilTreasury {
    function addIntegrityFromCovenant(address worker, uint256 integrityPoints) external;
}

// Covenant: escrowed Token B rewards released on approval after worker submission.
contract Covenant is Ownable {
    using SafeERC20 for IERC20;

    enum Status {
        Open,
        Submitted,
        Approved,
        Rejected,
        Cancelled,
        IssueReported,
        Disputed,
        ResolutionProposed,
        IssueResolved
    }

    struct CovenantData {
        address creator;
        address worker;
        uint256 tokenBReward;
        uint256 integrityPoints;
        uint256 issueClaimBps;
        uint256 milestoneProgress;
        uint256 proposedWorkerPayoutBps;
        uint256 proposedIntegrityPoints;
        uint256 proposedSlashingPenalty;
        Status status;
    }

    IERC20 public immutable tokenB;
    IFairSoilTokenA public immutable tokenA;
    ISoilTreasury public immutable treasury;
    uint256 public nextId;
    uint256 public constant ISSUE_BPS_DENOMINATOR = 10_000;
    uint256 public constant ISSUE_INTEGRITY_POINTS = 20;
    address public disputeResolver;

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
    event IssueReported(
        uint256 indexed covenantId,
        address indexed worker,
        uint256 claimBps,
        string reason,
        string evidenceUri
    );
    event IssueAccepted(uint256 indexed covenantId, address indexed creator, uint256 claimBps);
    event IssueDisputed(
        uint256 indexed covenantId,
        address indexed creator,
        string reason,
        string evidenceUri
    );
    event ResolutionProposed(
        uint256 indexed covenantId,
        uint256 workerPayoutBps,
        uint256 integrityPoints,
        uint256 slashingPenalty
    );
    event DisputeResolverSet(address indexed resolver);
    event MaliceSlashed(
        uint256 indexed covenantId,
        address indexed creator,
        address indexed worker,
        uint256 penalty
    );
    event DisputeResolved(
        uint256 indexed covenantId,
        uint256 workerPayoutBps,
        uint256 integrityPoints,
        uint256 slashingPenalty
    );

    constructor(address tokenBAddress, address tokenAAddress, address treasuryAddress)
        Ownable(msg.sender)
    {
        tokenB = IERC20(tokenBAddress);
        tokenA = IFairSoilTokenA(tokenAAddress);
        treasury = ISoilTreasury(treasuryAddress);
        disputeResolver = msg.sender;
    }

    modifier onlyDisputeResolver() {
        require(msg.sender == disputeResolver, "Resolver only");
        _;
    }

    function setDisputeResolver(address resolver) external onlyOwner {
        disputeResolver = resolver;
        emit DisputeResolverSet(resolver);
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
            issueClaimBps: 0,
            milestoneProgress: 0,
            proposedWorkerPayoutBps: 0,
            proposedIntegrityPoints: 0,
            proposedSlashingPenalty: 0,
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

    function reportIssue(
        uint256 covenantId,
        uint256 claimBps,
        string calldata reason,
        string calldata evidenceUri
    ) external {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(msg.sender == data.worker, "Worker only");
        require(
            data.status == Status.Open ||
                data.status == Status.Submitted ||
                data.status == Status.IssueReported,
            "Not active"
        );
        require(claimBps <= ISSUE_BPS_DENOMINATOR, "Invalid claim");

        data.status = Status.IssueReported;
        data.issueClaimBps = claimBps;
        emit IssueReported(covenantId, msg.sender, claimBps, reason, evidenceUri);
    }

    function acceptIssue(uint256 covenantId) external {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(msg.sender == data.creator, "Creator only");
        require(data.status == Status.IssueReported, "Not reported");

        data.status = Status.IssueResolved;
        uint256 workerShare = (data.tokenBReward * data.issueClaimBps) / ISSUE_BPS_DENOMINATOR;
        uint256 creatorShare = data.tokenBReward - workerShare;
        if (workerShare > 0) {
            tokenB.safeTransfer(data.worker, workerShare);
        }
        if (creatorShare > 0) {
            tokenB.safeTransfer(data.creator, creatorShare);
        }
        treasury.addIntegrityFromCovenant(data.worker, ISSUE_INTEGRITY_POINTS);

        emit IssueAccepted(covenantId, msg.sender, data.issueClaimBps);
    }

    function disputeIssue(
        uint256 covenantId,
        string calldata reason,
        string calldata evidenceUri
    ) external {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(msg.sender == data.creator, "Creator only");
        require(
            data.status == Status.IssueReported || data.status == Status.Disputed,
            "Not reported"
        );

        data.status = Status.Disputed;
        emit IssueDisputed(covenantId, msg.sender, reason, evidenceUri);
    }

    function resolveDispute(
        uint256 covenantId,
        uint256 workerPayoutBps,
        uint256 integrityPoints,
        uint256 slashingPenalty
    ) external onlyDisputeResolver {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(
            data.status == Status.Disputed || data.status == Status.ResolutionProposed,
            "Not disputed"
        );
        require(workerPayoutBps <= ISSUE_BPS_DENOMINATOR, "Invalid claim");

        data.status = Status.ResolutionProposed;
        data.proposedWorkerPayoutBps = workerPayoutBps;
        data.proposedIntegrityPoints = integrityPoints;
        data.proposedSlashingPenalty = slashingPenalty;

        emit ResolutionProposed(covenantId, workerPayoutBps, integrityPoints, slashingPenalty);
    }

    function finalizeResolution(uint256 covenantId) external onlyDisputeResolver {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(data.status == Status.ResolutionProposed, "Not proposed");

        data.status = Status.IssueResolved;
        uint256 workerShare =
            (data.tokenBReward * data.proposedWorkerPayoutBps) / ISSUE_BPS_DENOMINATOR;
        uint256 creatorShare = data.tokenBReward - workerShare;
        if (workerShare > 0) {
            tokenB.safeTransfer(data.worker, workerShare);
        }
        if (creatorShare > 0) {
            tokenB.safeTransfer(data.creator, creatorShare);
        }
        if (data.proposedIntegrityPoints > 0) {
            treasury.addIntegrityFromCovenant(data.worker, data.proposedIntegrityPoints);
        }
        if (data.proposedSlashingPenalty > 0) {
            emit MaliceSlashed(
                covenantId,
                data.creator,
                data.worker,
                data.proposedSlashingPenalty
            );
        }
        emit DisputeResolved(
            covenantId,
            data.proposedWorkerPayoutBps,
            data.proposedIntegrityPoints,
            data.proposedSlashingPenalty
        );
    }
}
