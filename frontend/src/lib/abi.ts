export const tokenAAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const tokenBAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const treasuryAbi = [
  {
    type: "event",
    name: "UBIClaimed",
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "TaskCompleted",
    inputs: [
      { indexed: true, name: "worker", type: "address" },
      { indexed: false, name: "tokenBReward", type: "uint256" },
      { indexed: false, name: "integrityPoints", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "CovenantSet",
    inputs: [{ indexed: true, name: "covenant", type: "address" }],
  },
  {
    type: "function",
    name: "claimUBI",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "reportTaskCompleted",
    stateMutability: "nonpayable",
    inputs: [
      { name: "worker", type: "address" },
      { name: "tokenBReward", type: "uint256" },
      { name: "integrityPoints", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "integrityScore",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "isEligibleForGovernance",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const covenantAbi = [
  {
    type: "event",
    name: "CovenantCreated",
    inputs: [
      { indexed: true, name: "covenantId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: true, name: "worker", type: "address" },
      { indexed: false, name: "tokenBReward", type: "uint256" },
      { indexed: false, name: "integrityPoints", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "CovenantSubmitted",
    inputs: [
      { indexed: true, name: "covenantId", type: "uint256" },
      { indexed: true, name: "worker", type: "address" },
    ],
  },
  {
    type: "event",
    name: "CovenantApproved",
    inputs: [
      { indexed: true, name: "covenantId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
    ],
  },
  {
    type: "event",
    name: "CovenantRejected",
    inputs: [
      { indexed: true, name: "covenantId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
    ],
  },
  {
    type: "event",
    name: "CovenantCancelled",
    inputs: [
      { indexed: true, name: "covenantId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
    ],
  },
  {
    type: "event",
    name: "IssueReported",
    inputs: [
      { indexed: true, name: "covenantId", type: "uint256" },
      { indexed: true, name: "worker", type: "address" },
      { indexed: false, name: "claimBps", type: "uint256" },
      { indexed: false, name: "reason", type: "string" },
    ],
  },
  {
    type: "event",
    name: "IssueAccepted",
    inputs: [
      { indexed: true, name: "covenantId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "claimBps", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "IssueDisputed",
    inputs: [
      { indexed: true, name: "covenantId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
    ],
  },
  {
    type: "event",
    name: "DisputeResolverSet",
    inputs: [{ indexed: true, name: "resolver", type: "address" }],
  },
  {
    type: "event",
    name: "MaliceSlashed",
    inputs: [
      { indexed: true, name: "covenantId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: true, name: "worker", type: "address" },
      { indexed: false, name: "penalty", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "DisputeResolved",
    inputs: [
      { indexed: true, name: "covenantId", type: "uint256" },
      { indexed: false, name: "workerPayoutBps", type: "uint256" },
      { indexed: false, name: "integrityPoints", type: "uint256" },
      { indexed: false, name: "slashingPenalty", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "createCovenant",
    stateMutability: "nonpayable",
    inputs: [
      { name: "worker", type: "address" },
      { name: "tokenBReward", type: "uint256" },
      { name: "integrityPoints", type: "uint256" },
    ],
    outputs: [{ name: "covenantId", type: "uint256" }],
  },
  {
    type: "function",
    name: "nextId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "covenants",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "creator", type: "address" },
      { name: "worker", type: "address" },
      { name: "tokenBReward", type: "uint256" },
      { name: "integrityPoints", type: "uint256" },
      { name: "issueClaimBps", type: "uint256" },
      { name: "milestoneProgress", type: "uint256" },
      { name: "status", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "submitWork",
    stateMutability: "nonpayable",
    inputs: [{ name: "covenantId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "approveWork",
    stateMutability: "nonpayable",
    inputs: [{ name: "covenantId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "rejectWork",
    stateMutability: "nonpayable",
    inputs: [{ name: "covenantId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "reportIssue",
    stateMutability: "nonpayable",
    inputs: [
      { name: "covenantId", type: "uint256" },
      { name: "claimBps", type: "uint256" },
      { name: "reason", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "acceptIssue",
    stateMutability: "nonpayable",
    inputs: [{ name: "covenantId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "disputeIssue",
    stateMutability: "nonpayable",
    inputs: [{ name: "covenantId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "resolveDispute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "covenantId", type: "uint256" },
      { name: "workerPayoutBps", type: "uint256" },
      { name: "integrityPoints", type: "uint256" },
      { name: "slashingPenalty", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "disputeResolver",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;
