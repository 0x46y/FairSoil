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
] as const;

export const treasuryAbi = [
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
