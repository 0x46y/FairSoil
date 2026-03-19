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
    function integrityScore(address account) external view returns (uint256);
    function availableIntegrity(address account) external view returns (uint256);
    function lockIntegrity(address account, uint256 amount) external;
    function unlockIntegrity(address account, uint256 amount) external;
    function slashIntegrity(address account, uint256 amount) external;
    function mintBByCrystallization(address worker, uint256 burnedA) external returns (uint256);
    function previewCrystallization(uint256 burnedA) external view returns (uint256);
    function mintBByCrystallizationSplit(
        address worker,
        address author,
        uint256 burnedA,
        uint256 royaltyAmount
    ) external returns (uint256);
    function penalizePayScoreWithReason(address account, uint256 points, string calldata reason) external;
    function addPayScore(address account, uint256 points) external;
    function penalizeProcessScore(address account, uint256 points, string calldata reason) external;
    function adjustLiabilities(int256 deltaA, int256 deltaB, bytes32 reason) external;
    function lockB(address account, uint256 amount) external;
    function unlockB(address account, uint256 amount) external;
    function REASON_COV_CREATE() external view returns (bytes32);
    function REASON_COV_SETTLE() external view returns (bytes32);
}

interface IRoyaltyRouter {
    function previewRoyalty(uint256 templateId, uint256 amountB)
        external
        view
        returns (address receiver, uint256 royaltyAmount);
    function notifyPayout(uint256 covenantId, uint256 templateId, uint256 amountB)
        external
        returns (uint256 royaltyAmount);
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
        uint256 templateId;
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
    uint256 public constant ISSUE_DEPOSIT_BPS = 500;
    uint256 public constant COOLDOWN_DURATION = 7 days;
    uint256 public constant DEFENSE_QUOTA_MIN_INTEGRITY = 100;
    uint256 public constant DEFENSE_QUOTA_PER_MONTH = 2;
    uint256 public constant MONTH_DURATION = 30 days;
    uint256 public constant SPAM_GUARD_MAX_EXPONENT = 8;
    uint256 public constant JURY_SIZE = 9;
    uint256 public constant JURY_EXPERT_SLOTS = 3;
    uint256 public constant JURY_EXPERT_MIN_INTEGRITY = 200;
    address public disputeResolver;
    IRoyaltyRouter public royaltyRouter;

    mapping(uint256 => CovenantData) public covenants;
    mapping(uint256 => uint256) public appealCovenantOf;
    mapping(uint256 => uint256) public originalCovenantOf;
    mapping(uint256 => uint256) public issueDeposits;
    mapping(uint256 => uint256) public disputeDeposits;
    mapping(uint256 => uint256) public issueLockedIntegrity;
    mapping(uint256 => uint256) public disputeLockedIntegrity;
    mapping(uint256 => string) public transparencyNotes;
    mapping(uint256 => bytes32) public transparencyDigests;
    mapping(address => uint256) public cooldownUntil;
    mapping(address => uint256) public defenseQuotaMonth;
    mapping(address => uint256) public defenseQuotaUsed;
    mapping(address => uint256) public maliceCount;
    mapping(address => bool) public juryCandidates;
    address[] public juryCandidateList;
    mapping(uint256 => address[]) private juryMembers;
    mapping(uint256 => mapping(address => bool)) public juryMemberLookup;
    mapping(uint256 => mapping(address => bool)) public juryVoted;
    mapping(uint256 => uint256) public jurySupportWorker;
    mapping(uint256 => uint256) public juryTotalVotes;

    event CovenantCreated(
        uint256 indexed covenantId,
        address indexed creator,
        address indexed worker,
        uint256 tokenBReward,
        uint256 integrityPoints
    );
    event CovenantSubmitted(uint256 indexed covenantId, address indexed worker);
    event CovenantApproved(uint256 indexed covenantId, address indexed creator);
    event CovenantApprovalFinalized(uint256 indexed covenantId, address indexed creator);
    event CovenantRejected(uint256 indexed covenantId, address indexed creator);
    event CovenantCancelled(uint256 indexed covenantId, address indexed creator);
    event AppealCovenantCreated(uint256 indexed originalId, uint256 indexed appealId);
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
    event RoyaltyRouterSet(address indexed router);
    event CovenantTemplateLinked(uint256 indexed covenantId, uint256 indexed templateId);
    event IssueDepositLocked(uint256 indexed covenantId, address indexed worker, uint256 amount);
    event DisputeDepositLocked(uint256 indexed covenantId, address indexed creator, uint256 amount);
    event DisputeDepositReturned(uint256 indexed covenantId, address indexed to, uint256 amount);
    event DisputeDepositSlashed(uint256 indexed covenantId, address indexed to, uint256 amount);
    event IntegrityDepositLocked(uint256 indexed covenantId, address indexed account, uint256 amount);
    event IntegrityDepositReturned(uint256 indexed covenantId, address indexed account, uint256 amount);
    event IntegrityDepositSlashed(uint256 indexed covenantId, address indexed account, uint256 amount);
    event DefenseQuotaUsed(uint256 indexed covenantId, address indexed account);
    event MaliceCountUpdated(address indexed account, uint256 count);
    event JuryCandidateRegistered(address indexed account);
    event JuryCandidateUnregistered(address indexed account);
    event JurySelected(uint256 indexed covenantId, address[] jurors);
    event JuryVoted(uint256 indexed covenantId, address indexed juror, bool supportWorker);
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
    event TransparencyNoteSet(uint256 indexed covenantId, bytes32 indexed digest, string note);

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

    function setRoyaltyRouter(address router) external onlyOwner {
        royaltyRouter = IRoyaltyRouter(router);
        emit RoyaltyRouterSet(router);
    }

    function registerJuryCandidate() external {
        require(!juryCandidates[msg.sender], "Already registered");
        juryCandidates[msg.sender] = true;
        juryCandidateList.push(msg.sender);
        emit JuryCandidateRegistered(msg.sender);
    }

    function unregisterJuryCandidate() external {
        require(juryCandidates[msg.sender], "Not registered");
        juryCandidates[msg.sender] = false;
        emit JuryCandidateUnregistered(msg.sender);
    }

    function getJuryMembers(uint256 covenantId) external view returns (address[] memory) {
        return juryMembers[covenantId];
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
        covenantId = _createCovenantInternal(
            msg.sender,
            worker,
            tokenBReward,
            integrityPoints,
            payInTokenA,
            paymentMode
        );
    }

    function createCovenantWithTemplate(
        address worker,
        uint256 tokenBReward,
        uint256 integrityPoints,
        bool payInTokenA,
        PaymentMode paymentMode,
        uint256 templateId
    ) external returns (uint256 covenantId) {
        covenantId = _createCovenantInternal(
            msg.sender,
            worker,
            tokenBReward,
            integrityPoints,
            payInTokenA,
            paymentMode
        );
        if (templateId > 0) {
            covenants[covenantId].templateId = templateId;
            emit CovenantTemplateLinked(covenantId, templateId);
        }
    }

    function createAppealCovenant(
        uint256 originalId,
        uint256 tokenBReward,
        uint256 integrityPoints,
        bool payInTokenA,
        PaymentMode paymentMode
    ) external returns (uint256 appealId) {
        CovenantData storage original = covenants[originalId];
        require(original.creator != address(0), "Unknown covenant");
        require(original.status == Status.IssueResolved, "Not resolved");
        require(msg.sender == original.creator, "Creator only");
        require(appealCovenantOf[originalId] == 0, "Appeal exists");

        appealId = _createCovenantInternal(
            msg.sender,
            original.worker,
            tokenBReward,
            integrityPoints,
            payInTokenA,
            paymentMode
        );
        appealCovenantOf[originalId] = appealId;
        originalCovenantOf[appealId] = originalId;
        emit AppealCovenantCreated(originalId, appealId);
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

    function finalizeApproved(uint256 covenantId) external {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(msg.sender == data.creator, "Creator only");
        require(data.paymentMode == PaymentMode.Delayed, "Not delayed");
        require(data.status == Status.Approved, "Not approved");
        require(!data.settled, "Already settled");

        data.status = Status.IssueResolved;
        _releaseEscrow(covenantId, data.tokenBReward, 0);
        data.settled = true;
        _tagLiability(covenantId, 0, -int256(data.tokenBReward), treasury.REASON_COV_SETTLE());

        emit CovenantApprovalFinalized(covenantId, msg.sender);
    }

    function _createCovenantInternal(
        address creator,
        address worker,
        uint256 tokenBReward,
        uint256 integrityPoints,
        bool payInTokenA,
        PaymentMode paymentMode
    ) internal returns (uint256 covenantId) {
        require(worker != address(0), "Worker required");
        require(creator != worker, "Self-dealing not allowed");
        require(tokenBReward > 0, "Reward required");
        require(tokenA.isPrimaryAddress(worker), "Worker not verified");
        require(block.timestamp >= cooldownUntil[creator], "Creator cooldown");
        require(block.timestamp >= cooldownUntil[worker], "Worker cooldown");

        covenantId = nextId++;
        covenants[covenantId] = CovenantData({
            creator: creator,
            worker: worker,
            tokenBReward: tokenBReward,
            integrityPoints: integrityPoints,
            issueClaimBps: 0,
            escrowStart: block.timestamp,
            milestoneProgress: 0,
            proposedWorkerPayoutBps: 0,
            proposedIntegrityPoints: 0,
            proposedSlashingPenalty: 0,
            templateId: 0,
            paymentToken: payInTokenA ? PaymentToken.TokenA : PaymentToken.TokenB,
            paymentMode: paymentMode,
            status: Status.Open,
            settled: false
        });

        _tagLiability(covenantId, 0, int256(tokenBReward), treasury.REASON_COV_CREATE());

        if (payInTokenA) {
            tokenA.safeTransferFrom(creator, address(this), tokenBReward);
        } else {
            tokenB.safeTransferFrom(creator, address(this), tokenBReward);
            treasury.lockB(address(this), tokenBReward);
        }

        emit CovenantCreated(covenantId, creator, worker, tokenBReward, integrityPoints);
        emit EscrowLocked(covenantId, covenants[covenantId].paymentToken, tokenBReward);
    }

    function setCovenantTemplate(uint256 covenantId, uint256 templateId) external {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(msg.sender == data.creator, "Creator only");
        require(!data.settled, "Already settled");
        require(
            data.status == Status.Open || data.status == Status.Submitted,
            "Not active"
        );
        require(templateId > 0, "Template required");

        data.templateId = templateId;
        emit CovenantTemplateLinked(covenantId, templateId);
    }

    function setTransparencyNote(uint256 covenantId, string calldata note, bytes32 digest) external {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(msg.sender == data.creator, "Creator only");
        transparencyNotes[covenantId] = note;
        transparencyDigests[covenantId] = digest;
        emit TransparencyNoteSet(covenantId, digest, note);
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
            treasury.unlockB(address(this), data.tokenBReward);
            tokenB.safeTransfer(data.creator, data.tokenBReward);
            emit EscrowReleased(
                covenantId,
                data.paymentToken,
                0,
                data.tokenBReward,
                0
            );
        }
        data.settled = true;
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
            treasury.unlockB(address(this), data.tokenBReward);
            tokenB.safeTransfer(data.creator, data.tokenBReward);
            emit EscrowReleased(
                covenantId,
                data.paymentToken,
                0,
                data.tokenBReward,
                0
            );
        }
        data.settled = true;
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
        _lockIssueDeposit(covenantId, data);
        emit IssueReported(covenantId, msg.sender, claimBps, reason, evidenceUri);
    }

    function acceptIssue(uint256 covenantId) external {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(msg.sender == data.creator, "Creator only");
        require(data.status == Status.IssueReported, "Not reported");

        data.status = Status.IssueResolved;
        _returnDeposit(issueDeposits, issueLockedIntegrity, covenantId, data.worker);
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
        _lockDisputeDeposit(covenantId, data);
        _selectJury(covenantId);
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
        _settleDisputeDeposits(covenantId, data);
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
                address author = address(0);
                uint256 royaltyAmount = 0;
                if (address(royaltyRouter) != address(0) && data.templateId > 0) {
                    uint256 mintedPreview = treasury.previewCrystallization(workerShare);
                    if (mintedPreview > 0) {
                        (author, royaltyAmount) =
                            royaltyRouter.previewRoyalty(data.templateId, mintedPreview);
                    }
                }
                treasury.mintBByCrystallizationSplit(
                    data.worker,
                    author,
                    workerShare,
                    royaltyAmount
                );
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
            uint256 grossShare = workerShare + creatorShare;
            if (grossShare > 0) {
                treasury.unlockB(address(this), grossShare);
            }
            if (address(royaltyRouter) != address(0) && data.templateId > 0 && grossShare > 0) {
                (, uint256 royaltyAmount) = royaltyRouter.previewRoyalty(data.templateId, grossShare);
                if (royaltyAmount > 0) {
                    uint256 remaining = royaltyAmount;
                    if (workerShare >= remaining) {
                        workerShare -= remaining;
                        remaining = 0;
                    } else {
                        remaining -= workerShare;
                        workerShare = 0;
                    }
                    if (remaining > 0) {
                        if (creatorShare >= remaining) {
                            creatorShare -= remaining;
                        } else {
                            creatorShare = 0;
                        }
                    }
                    tokenB.safeIncreaseAllowance(address(royaltyRouter), royaltyAmount);
                    royaltyRouter.notifyPayout(covenantId, data.templateId, grossShare);
                }
            }
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

    function _lockIssueDeposit(uint256 covenantId, CovenantData storage data) internal {
        if (issueDeposits[covenantId] > 0 || issueLockedIntegrity[covenantId] > 0) {
            return;
        }
        uint256 deposit = _issueDepositAmount(data, data.worker);
        if (deposit == 0) {
            return;
        }
        if (_tryUseDefenseQuota(covenantId, data.worker)) {
            return;
        }
        _collectDeposit(
            covenantId,
            data.worker,
            deposit,
            issueDeposits,
            issueLockedIntegrity,
            true
        );
    }

    function _lockDisputeDeposit(uint256 covenantId, CovenantData storage data) internal {
        if (disputeDeposits[covenantId] > 0 || disputeLockedIntegrity[covenantId] > 0) {
            return;
        }
        uint256 deposit = _issueDepositAmount(data, data.creator);
        if (deposit == 0) {
            return;
        }
        if (_tryUseDefenseQuota(covenantId, data.creator)) {
            return;
        }
        _collectDeposit(
            covenantId,
            data.creator,
            deposit,
            disputeDeposits,
            disputeLockedIntegrity,
            false
        );
    }

    function _issueDepositAmount(
        CovenantData storage data,
        address payer
    ) internal view returns (uint256) {
        uint256 base;
        if (data.paymentToken == PaymentToken.TokenB) {
            base = data.tokenBReward;
        } else {
            base = treasury.previewCrystallization(data.tokenBReward);
        }
        uint256 deposit = (base * ISSUE_DEPOSIT_BPS) / ISSUE_BPS_DENOMINATOR;
        return deposit * _spamMultiplier(payer);
    }

    function _collectDeposit(
        uint256 covenantId,
        address payer,
        uint256 amount,
        mapping(uint256 => uint256) storage deposits,
        mapping(uint256 => uint256) storage lockedIntegrity,
        bool isIssue
    ) internal {
        uint256 balance = tokenB.balanceOf(payer);
        uint256 tokenBPart = balance < amount ? balance : amount;
        uint256 integrityPartWei = amount - tokenBPart;
        if (tokenBPart > 0) {
            tokenB.safeTransferFrom(payer, address(this), tokenBPart);
            deposits[covenantId] = tokenBPart;
            if (isIssue) {
                emit IssueDepositLocked(covenantId, payer, tokenBPart);
            } else {
                emit DisputeDepositLocked(covenantId, payer, tokenBPart);
            }
        }
        if (integrityPartWei > 0) {
            uint256 integrityPoints = _toIntegrityPoints(integrityPartWei);
            require(treasury.availableIntegrity(payer) >= integrityPoints, "Insufficient integrity");
            treasury.lockIntegrity(payer, integrityPoints);
            lockedIntegrity[covenantId] = integrityPoints;
            emit IntegrityDepositLocked(covenantId, payer, integrityPoints);
        }
    }

    function _returnDeposit(
        mapping(uint256 => uint256) storage deposits,
        mapping(uint256 => uint256) storage lockedIntegrity,
        uint256 covenantId,
        address to
    ) internal {
        uint256 tokenBAmount = deposits[covenantId];
        if (tokenBAmount > 0) {
            deposits[covenantId] = 0;
            tokenB.safeTransfer(to, tokenBAmount);
            emit DisputeDepositReturned(covenantId, to, tokenBAmount);
        }
        uint256 integrityAmount = lockedIntegrity[covenantId];
        if (integrityAmount > 0) {
            lockedIntegrity[covenantId] = 0;
            treasury.unlockIntegrity(to, integrityAmount);
            emit IntegrityDepositReturned(covenantId, to, integrityAmount);
        }
    }

    function _slashDeposit(
        mapping(uint256 => uint256) storage deposits,
        mapping(uint256 => uint256) storage lockedIntegrity,
        uint256 covenantId,
        address to,
        address slashedAccount
    ) internal {
        uint256 tokenBAmount = deposits[covenantId];
        if (tokenBAmount > 0) {
            deposits[covenantId] = 0;
            tokenB.safeTransfer(to, tokenBAmount);
            emit DisputeDepositSlashed(covenantId, to, tokenBAmount);
        }
        uint256 integrityAmount = lockedIntegrity[covenantId];
        if (integrityAmount > 0) {
            lockedIntegrity[covenantId] = 0;
            treasury.slashIntegrity(slashedAccount, integrityAmount);
            emit IntegrityDepositSlashed(covenantId, slashedAccount, integrityAmount);
        }
    }

    function _settleDisputeDeposits(uint256 covenantId, CovenantData storage data) internal {
        if (data.proposedSlashingPenalty > 0) {
            _slashDeposit(
                issueDeposits,
                issueLockedIntegrity,
                covenantId,
                address(treasury),
                data.worker
            );
            maliceCount[data.worker] += 1;
            emit MaliceCountUpdated(data.worker, maliceCount[data.worker]);
            cooldownUntil[data.worker] = block.timestamp + COOLDOWN_DURATION;
        } else {
            _returnDeposit(issueDeposits, issueLockedIntegrity, covenantId, data.worker);
        }
        _returnDeposit(disputeDeposits, disputeLockedIntegrity, covenantId, data.creator);
    }

    function _currentMonth() internal view returns (uint256) {
        return block.timestamp / MONTH_DURATION;
    }

    function _spamMultiplier(address payer) internal view returns (uint256) {
        uint256 count = maliceCount[payer];
        if (count > SPAM_GUARD_MAX_EXPONENT) {
            count = SPAM_GUARD_MAX_EXPONENT;
        }
        return 1 << count;
    }

    function _selectJury(uint256 covenantId) internal {
        if (juryMembers[covenantId].length > 0) {
            return;
        }
        uint256 totalCandidates = juryCandidateList.length;
        if (totalCandidates == 0) {
            return;
        }

        address[] memory experts = new address[](totalCandidates);
        address[] memory generals = new address[](totalCandidates);
        uint256 expertCount = 0;
        uint256 generalCount = 0;

        for (uint256 i = 0; i < totalCandidates; i++) {
            address candidate = juryCandidateList[i];
            if (!juryCandidates[candidate]) {
                continue;
            }
            if (treasury.integrityScore(candidate) >= JURY_EXPERT_MIN_INTEGRITY) {
                experts[expertCount] = candidate;
                expertCount++;
            } else {
                generals[generalCount] = candidate;
                generalCount++;
            }
        }

        uint256 neededExperts = JURY_EXPERT_SLOTS;
        if (expertCount < neededExperts) {
            neededExperts = expertCount;
        }
        uint256 neededGenerals = JURY_SIZE - neededExperts;
        if (generalCount < neededGenerals) {
            neededGenerals = generalCount;
        }

        uint256 totalSelected = neededExperts + neededGenerals;
        if (totalSelected == 0) {
            return;
        }

        address[] storage selected = juryMembers[covenantId];
        bytes32 seed = keccak256(
            abi.encodePacked(blockhash(block.number - 1), covenantId, totalCandidates)
        );

        _pickFromPool(seed, experts, expertCount, neededExperts, covenantId, selected);
        _pickFromPool(
            keccak256(abi.encodePacked(seed, "GEN")),
            generals,
            generalCount,
            neededGenerals,
            covenantId,
            selected
        );

        emit JurySelected(covenantId, selected);
    }

    function _pickFromPool(
        bytes32 seed,
        address[] memory pool,
        uint256 poolSize,
        uint256 needed,
        uint256 covenantId,
        address[] storage selected
    ) internal {
        if (needed == 0 || poolSize == 0) {
            return;
        }
        bool[] memory used = new bool[](poolSize);
        uint256 picks = 0;
        uint256 attempts = 0;
        while (picks < needed && attempts < poolSize * 3) {
            uint256 index = uint256(keccak256(abi.encodePacked(seed, attempts))) % poolSize;
            attempts++;
            if (used[index]) {
                continue;
            }
            address candidate = pool[index];
            if (candidate == address(0)) {
                used[index] = true;
                continue;
            }
            used[index] = true;
            if (juryMemberLookup[covenantId][candidate]) {
                continue;
            }
            juryMemberLookup[covenantId][candidate] = true;
            selected.push(candidate);
            picks++;
        }
    }

    function juryVote(uint256 covenantId, bool supportWorker) external {
        CovenantData storage data = covenants[covenantId];
        require(data.creator != address(0), "Unknown covenant");
        require(data.status == Status.Disputed, "Not disputed");
        require(juryMemberLookup[covenantId][msg.sender], "Not juror");
        require(!juryVoted[covenantId][msg.sender], "Already voted");

        juryVoted[covenantId][msg.sender] = true;
        juryTotalVotes[covenantId] += 1;
        if (supportWorker) {
            jurySupportWorker[covenantId] += 1;
        }
        emit JuryVoted(covenantId, msg.sender, supportWorker);
    }

    function juryVerdict(uint256 covenantId)
        external
        view
        returns (bool resolved, bool supportWorker, uint256 supportVotes, uint256 totalVotes)
    {
        uint256 total = juryTotalVotes[covenantId];
        supportVotes = jurySupportWorker[covenantId];
        totalVotes = total;
        if (total == 0) {
            return (false, false, supportVotes, totalVotes);
        }
        supportWorker = supportVotes * 2 > total;
        resolved = total >= juryMembers[covenantId].length && total > 0;
    }

    function _toIntegrityPoints(uint256 amountWei) internal pure returns (uint256) {
        if (amountWei == 0) {
            return 0;
        }
        return (amountWei + 1e18 - 1) / 1e18;
    }

    function _tryUseDefenseQuota(uint256 covenantId, address account) internal returns (bool) {
        if (treasury.integrityScore(account) < DEFENSE_QUOTA_MIN_INTEGRITY) {
            return false;
        }
        uint256 monthId = _currentMonth();
        if (defenseQuotaMonth[account] != monthId) {
            defenseQuotaMonth[account] = monthId;
            defenseQuotaUsed[account] = 0;
        }
        if (defenseQuotaUsed[account] >= DEFENSE_QUOTA_PER_MONTH) {
            return false;
        }
        defenseQuotaUsed[account] += 1;
        emit DefenseQuotaUsed(covenantId, account);
        return true;
    }

    function getCovenant(uint256 covenantId) external view returns (CovenantData memory) {
        return covenants[covenantId];
    }
}
