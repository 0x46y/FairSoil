// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IFairSoilTokenA is IERC20 {
    function isPrimaryAddress(address account) external view returns (bool);
    function burnFromCovenant(address account, uint256 amount) external;
    function applyEscrowDecay(uint256 amount, uint256 escrowStart) external returns (uint256);
}

interface ISoilTreasury {
    function addIntegrityFromCovenant(address worker, uint256 integrityPoints) external;
    function mintBByCrystallization(address worker, uint256 burnedA) external returns (uint256);
    function penalizePayScoreWithReason(address account, uint256 points, string calldata reason) external;
    function addPayScore(address account, uint256 points) external;
    function penalizeProcessScore(address account, uint256 points, string calldata reason) external;
    function adjustLiabilities(int256 deltaA, int256 deltaB, bytes32 reason) external;
    function REASON_COV_CREATE() external view returns (bytes32);
    function REASON_COV_SETTLE() external view returns (bytes32);
}

// Covenant: escrowed Token B rewards released on approval after worker submission.
contract Covenant is Ownable {
    using SafeERC20 for IERC20;
    using SafeERC20 for IFairSoilTokenA;

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

    enum PaymentToken {
        TokenB,
        TokenA
    }

    enum PaymentMode {
        Immediate,
        Escrow,
        Delayed
    }

    struct CovenantData {
        address creator;
        address worker;
        uint256 tokenBReward;
        uint256 integrityPoints;
        uint256 issueClaimBps;
        uint256 escrowStart;
        uint256 milestoneProgress;
        uint256 proposedWorkerPayoutBps;
        uint256 proposedIntegrityPoints;
        uint256 proposedSlashingPenalty;
        PaymentToken paymentToken;
        PaymentMode paymentMode;
        Status status;
        bool settled;
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
    event EscrowLocked(uint256 indexed covenantId, PaymentToken paymentToken, uint256 amount);
    event EscrowReleased(
        uint256 indexed covenantId,
        PaymentToken paymentToken,
        uint256 releasedToWorker,
        uint256 releasedToCreator,
        uint256 burnedAmount
    );
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
    event LiabilityTagged(uint256 indexed covenantId, int256 deltaA, int256 deltaB, bytes32 reason);

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
        uint256 integrityPoints,
        bool payInTokenA
    ) external returns (uint256 covenantId) {
        return createCovenantWithMode(worker, tokenBReward, integrityPoints, payInTokenA, PaymentMode.Escrow);
    }

    function createCovenantWithMode(
        address worker,
        uint256 tokenBReward,
        uint256 integrityPoints,
        bool payInTokenA,
        PaymentMode paymentMode
    ) public returns (uint256 covenantId) {
        require(worker != address(0), "Worker required");
        require(msg.sender != worker, "Self-dealing not allowed");
        require(tokenBReward > 0, "Reward required");
        require(tokenA.isPrimaryAddress(worker), "Worker not verified");

        covenantId = nextId++;
        covenants[covenantId] = CovenantData({
            creator: msg.sender,
            worker: worker,
            tokenBReward: tokenBReward,
            integrityPoints: integrityPoints,
            issueClaimBps: 0,
            escrowStart: block.timestamp,
            milestoneProgress: 0,
            proposedWorkerPayoutBps: 0,
            proposedIntegrityPoints: 0,
            proposedSlashingPenalty: 0,
            paymentToken: payInTokenA ? PaymentToken.TokenA : PaymentToken.TokenB,
            paymentMode: paymentMode,
            status: Status.Open,
            settled: false
        });

        _tagLiability(covenantId, 0, int256(tokenBReward), treasury.REASON_COV_CREATE());

        if (payInTokenA) {
            tokenA.safeTransferFrom(msg.sender, address(this), tokenBReward);
        } else {
            tokenB.safeTransferFrom(msg.sender, address(this), tokenBReward);
        }

        emit CovenantCreated(covenantId, msg.sender, worker, tokenBReward, integrityPoints);
        emit EscrowLocked(covenantId, covenants[covenantId].paymentToken, tokenBReward);
    }

    function submitWork(uint256 covenantId) external {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(msg.sender == data.worker, "Worker only");
        require(data.status == Status.Open, "Not open");

        data.status = Status.Submitted;
        if (data.paymentMode == PaymentMode.Immediate && !data.settled) {
            _releaseEscrow(covenantId, data.tokenBReward, 0);
            data.settled = true;
        }
        emit CovenantSubmitted(covenantId, msg.sender);
    }

    function approveWork(uint256 covenantId) external {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(msg.sender == data.creator, "Creator only");
        require(data.status == Status.Submitted, "Not submitted");

        data.status = Status.Approved;
        if (!data.settled && data.paymentMode == PaymentMode.Escrow) {
            _releaseEscrow(covenantId, data.tokenBReward, 0);
            data.settled = true;
        }
        if (data.integrityPoints > 0) {
            treasury.addIntegrityFromCovenant(data.worker, data.integrityPoints);
        }
        treasury.addPayScore(data.creator, 2);

        emit CovenantApproved(covenantId, msg.sender);
    }

    function rejectWork(uint256 covenantId) external {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(msg.sender == data.creator, "Creator only");
        require(data.status == Status.Submitted, "Not submitted");
        require(!data.settled, "Already settled");

        data.status = Status.Rejected;
        _tagLiability(covenantId, 0, -int256(data.tokenBReward), treasury.REASON_COV_SETTLE());
        if (data.paymentToken == PaymentToken.TokenA) {
            uint256 refund = tokenA.applyEscrowDecay(data.tokenBReward, data.escrowStart);
            if (refund > 0) {
                tokenA.safeTransfer(data.creator, refund);
            }
            emit EscrowReleased(
                covenantId,
                data.paymentToken,
                0,
                refund,
                data.tokenBReward - refund
            );
        } else {
            tokenB.safeTransfer(data.creator, data.tokenBReward);
            emit EscrowReleased(
                covenantId,
                data.paymentToken,
                0,
                data.tokenBReward,
                0
            );
        }
        treasury.penalizePayScoreWithReason(data.creator, 10, "Rejected after submission");
        treasury.penalizeProcessScore(data.worker, 5, "Rejected work");

        emit CovenantRejected(covenantId, msg.sender);
    }

    function cancel(uint256 covenantId) external {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(msg.sender == data.creator, "Creator only");
        require(data.status == Status.Open, "Not open");
        require(!data.settled, "Already settled");

        data.status = Status.Cancelled;
        _tagLiability(covenantId, 0, -int256(data.tokenBReward), treasury.REASON_COV_SETTLE());
        if (data.paymentToken == PaymentToken.TokenA) {
            uint256 refund = tokenA.applyEscrowDecay(data.tokenBReward, data.escrowStart);
            if (refund > 0) {
                tokenA.safeTransfer(data.creator, refund);
            }
            emit EscrowReleased(
                covenantId,
                data.paymentToken,
                0,
                refund,
                data.tokenBReward - refund
            );
        } else {
            tokenB.safeTransfer(data.creator, data.tokenBReward);
            emit EscrowReleased(
                covenantId,
                data.paymentToken,
                0,
                data.tokenBReward,
                0
            );
        }
        treasury.penalizePayScoreWithReason(data.creator, 5, "Cancelled covenant");
        treasury.penalizeProcessScore(data.worker, 2, "Cancelled before completion");

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
        require(!data.settled, "Already settled");
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
        _releaseEscrow(covenantId, workerShare, creatorShare);
        data.settled = true;
        _tagLiability(covenantId, 0, -int256(data.tokenBReward), treasury.REASON_COV_SETTLE());
        treasury.addIntegrityFromCovenant(data.worker, ISSUE_INTEGRITY_POINTS);
        treasury.addPayScore(data.creator, 1);

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
        _releaseEscrow(covenantId, workerShare, creatorShare);
        data.settled = true;
        _tagLiability(covenantId, 0, -int256(data.tokenBReward), treasury.REASON_COV_SETTLE());
        if (data.proposedIntegrityPoints > 0) {
            treasury.addIntegrityFromCovenant(data.worker, data.proposedIntegrityPoints);
        }
        treasury.addPayScore(data.creator, 1);
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

    function _releaseEscrow(
        uint256 covenantId,
        uint256 workerShare,
        uint256 creatorShare
    ) internal {
        CovenantData storage data = covenants[covenantId];
        if (data.paymentMode == PaymentMode.Immediate) {
            _tagLiability(covenantId, 0, -int256(workerShare + creatorShare), treasury.REASON_COV_SETTLE());
        }
        if (data.paymentToken == PaymentToken.TokenA) {
            uint256 refunded = 0;
            if (workerShare > 0) {
                tokenA.burnFromCovenant(address(this), workerShare);
                treasury.mintBByCrystallization(data.worker, workerShare);
            }
            if (creatorShare > 0) {
                uint256 refund = tokenA.applyEscrowDecay(creatorShare, data.escrowStart);
                if (refund > 0) {
                    tokenA.safeTransfer(data.creator, refund);
                }
                refunded = refund;
            }
            emit EscrowReleased(
                covenantId,
                data.paymentToken,
                0,
                refunded,
                workerShare + (creatorShare - refunded)
            );
        } else {
            if (workerShare > 0) {
                tokenB.safeTransfer(data.worker, workerShare);
            }
            if (creatorShare > 0) {
                tokenB.safeTransfer(data.creator, creatorShare);
            }
            emit EscrowReleased(
                covenantId,
                data.paymentToken,
                workerShare,
                creatorShare,
                0
            );
        }
    }

    function _tagLiability(
        uint256 covenantId,
        int256 deltaA,
        int256 deltaB,
        bytes32 reason
    ) internal {
        treasury.adjustLiabilities(deltaA, deltaB, reason);
        emit LiabilityTagged(covenantId, deltaA, deltaB, reason);
    }
}
