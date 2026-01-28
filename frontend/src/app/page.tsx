"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatUnits, parseUnits, zeroAddress } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { injected } from "wagmi/connectors";
import styles from "./page.module.css";
import { appiOracleAbi, covenantAbi, tokenAAbi, tokenBAbi, treasuryAbi } from "../lib/abi";
import {
  covenantAddress,
  missingEnv,
  tokenAAddress,
  tokenBAddress,
  treasuryAddress,
} from "../lib/contracts";

const MAX_TRAIL_ITEMS = 12;

type TrailItem = {
  id: string;
  timestamp: number;
  title: string;
  body?: ReactNode;
};

const shortAddress = (value: string) => `${value.slice(0, 6)}...${value.slice(-4)}`;
const safeAddress = (value?: string) => (value ? shortAddress(value) : "Unknown");

const formatTokenB = (amount: bigint) =>
  `${Number(formatUnits(amount, 18)).toFixed(2)} SOILB`;
const formatTokenA = (amount: bigint) =>
  `${Number(formatUnits(amount, 18)).toFixed(2)} SOILA`;

const formatIntegrity = (points: bigint) => `+${points.toString()} integrity`;

const formatPercent = (bps: bigint) => {
  const percent = Number(bps) / 100;
  return Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(1);
};

const disputeSteps = ["Requested", "Disputed", "Proposed", "Resolved"] as const;

const disputeStatusLabel = (status: number) => {
  if (status === STATUS_RESOLVED) return "Resolved";
  if (status >= STATUS_PROPOSED) return "Proposal submitted";
  if (status >= STATUS_DISPUTED) return "Awaiting resolver decision";
  return "Support requested";
};

const STATUS_DISPUTED = 6;
const STATUS_PROPOSED = 7;
const STATUS_RESOLVED = 8;

const formatReason = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("0x") && trimmed.length > 10) {
    return `${trimmed.slice(0, 10)}...`;
  }
  return trimmed;
};

const formatEvidenceLink = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return (
    <a className={styles.timelineLink} href={trimmed} target="_blank" rel="noreferrer">
      Evidence URL
    </a>
  );
};

const safeParseUnits = (value: string, decimals: number) => {
  try {
    return parseUnits(value || "0", decimals);
  } catch {
    return 0n;
  }
};

const normalizeErrorMessage = (error: unknown) => {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const anyError = error as { shortMessage?: string; message?: string; cause?: { message?: string } };
    return anyError.shortMessage || anyError.message || anyError.cause?.message || "Unknown error";
  }
  return String(error);
};

  const formatTxError = (error: unknown) => {
  const message = normalizeErrorMessage(error);
  const lower = message.toLowerCase();
  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request")
  ) {
    return "Transaction rejected by user.";
  }
  return `Transaction failed: ${message}`;
};

const formatRelativeTime = (timestamp: number, nowMs: number) => {
  const diffSeconds = Math.max(0, Math.floor(nowMs / 1000 - timestamp));
  if (diffSeconds < 60) return "Just now";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getDisputeStage = (status: number) => {
  const isReported = status >= 5;
  const isDisputed = status >= STATUS_DISPUTED;
  const isProposed = status >= STATUS_PROPOSED;
  const isResolved = status === STATUS_RESOLVED;
  return [isReported, isDisputed, isProposed, isResolved];
};

export default function Home() {
  const account = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();

  const address = account.address ?? zeroAddress;
  const [taskWorker, setTaskWorker] = useState("");
  const [taskTokenBAmount, setTaskTokenBAmount] = useState("500");
  const [taskIntegrityPoints, setTaskIntegrityPoints] = useState("100");
  const [covenantWorker, setCovenantWorker] = useState("");
  const [covenantRewardAmount, setCovenantRewardAmount] = useState("250");
  const [covenantIntegrityPoints, setCovenantIntegrityPoints] = useState("50");
  const [covenantPayInTokenA, setCovenantPayInTokenA] = useState(false);
  const [covenantStep, setCovenantStep] = useState<0 | 1 | 2>(0);
  const [covenants, setCovenants] = useState<
    {
      id: number;
      creator: string;
      worker: string;
      tokenBReward: bigint;
      integrityPoints: bigint;
      issueClaimBps: bigint;
      escrowStart: bigint;
      milestoneProgress: bigint;
      proposedWorkerPayoutBps: bigint;
      proposedIntegrityPoints: bigint;
      proposedSlashingPenalty: bigint;
      paymentToken: number;
      status: number;
    }[]
  >([]);
  const [isLoadingCovenants, setIsLoadingCovenants] = useState(false);
  const [issueClaims, setIssueClaims] = useState<Record<number, string>>({});
  const [issueReasons, setIssueReasons] = useState<Record<number, string>>({});
  const [issueEvidenceUris, setIssueEvidenceUris] = useState<Record<number, string>>({});
  const [disputeReasons, setDisputeReasons] = useState<Record<number, string>>({});
  const [disputeEvidenceUris, setDisputeEvidenceUris] = useState<Record<number, string>>({});
  const [resolveClaims, setResolveClaims] = useState<Record<number, string>>({});
  const [resolveIntegrity, setResolveIntegrity] = useState<Record<number, string>>({});
  const [resolveSlashing, setResolveSlashing] = useState<Record<number, string>>({});
  const [appiOracleInput, setAppiOracleInput] = useState("");
  const [appiCategoryInput, setAppiCategoryInput] = useState("");
  const [appiPriceInput, setAppiPriceInput] = useState("");
  const [appiDayInput, setAppiDayInput] = useState("");
  const [unclaimedDays, setUnclaimedDays] = useState<{ day: number; amount: bigint }[]>([]);
  const [unclaimedFromDay, setUnclaimedFromDay] = useState("");
  const [unclaimedToDay, setUnclaimedToDay] = useState("");
  const [currentDayIndex, setCurrentDayIndex] = useState<number | null>(null);
  const [trailItems, setTrailItems] = useState<TrailItem[]>([]);
  const [trailNow, setTrailNow] = useState(() => Date.now());
  const trailIds = useRef(new Set<string>());
  const [txStatus, setTxStatus] = useState<"idle" | "signing" | "confirming">("idle");
  const [txAction, setTxAction] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tokenAAddr = tokenAAddress ?? zeroAddress;
  const tokenBAddr = tokenBAddress ?? zeroAddress;
  const treasuryAddr = treasuryAddress ?? zeroAddress;
  const covenantAddr = covenantAddress ?? zeroAddress;

  const { data: tokenABalance, refetch: refetchTokenA } = useReadContract({
    address: tokenAAddr,
    abi: tokenAAbi,
    functionName: "balanceOf",
    args: [address],
    query: {
      enabled: Boolean(tokenAAddress && account.address),
    },
  });

  const { data: tokenAOwner } = useReadContract({
    address: tokenAAddr,
    abi: tokenAAbi,
    functionName: "owner",
    query: {
      enabled: Boolean(tokenAAddress),
    },
  });

  const { data: isPrimaryAddress, refetch: refetchPrimary } = useReadContract({
    address: tokenAAddr,
    abi: tokenAAbi,
    functionName: "isPrimaryAddress",
    args: [address],
    query: {
      enabled: Boolean(tokenAAddress && account.address),
    },
  });

  const { data: tokenBBalance, refetch: refetchTokenB } = useReadContract({
    address: tokenBAddr,
    abi: tokenBAbi,
    functionName: "balanceOf",
    args: [address],
    query: {
      enabled: Boolean(tokenBAddress && account.address),
    },
  });

  const { data: tokenBLocked, refetch: refetchTokenBLocked } = useReadContract({
    address: tokenBAddr,
    abi: tokenBAbi,
    functionName: "lockedBalance",
    args: [address],
    query: {
      enabled: Boolean(tokenBAddress && account.address),
    },
  });

  const { data: tokenBUnlocked, refetch: refetchTokenBUnlocked } = useReadContract({
    address: tokenBAddr,
    abi: tokenBAbi,
    functionName: "unlockedBalanceOf",
    args: [address],
    query: {
      enabled: Boolean(tokenBAddress && account.address),
    },
  });

  const { data: integrityScore, refetch: refetchIntegrity } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "integrityScore",
    args: [address],
    query: {
      enabled: Boolean(treasuryAddress && account.address),
    },
  });

  const { data: governanceEligible, refetch: refetchEligibility } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "isEligibleForGovernance",
    args: [address],
    query: {
      enabled: Boolean(treasuryAddress && account.address),
    },
  });

  const { data: crystallizationRateBps } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "crystallizationRateBps",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: crystallizationFeeBps } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "crystallizationFeeBps",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: treasuryOwner } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "owner",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: appiOracleAddr } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "appiOracle",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: lastAPPI } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "lastAPPI",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: dailyUBIAmount } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "dailyUBIAmount",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: treasuryInTotal } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "treasuryInTotal",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: treasuryOutATotal } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "treasuryOutATotal",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: treasuryOutBTotal } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "treasuryOutBTotal",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: lastReservesA } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "lastReservesA",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: lastReservesB } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "lastReservesB",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: disputeResolver } = useReadContract({
    address: covenantAddr,
    abi: covenantAbi,
    functionName: "disputeResolver",
    query: {
      enabled: Boolean(covenantAddress),
    },
  });

  const isDisputeResolver = useMemo(() => {
    if (!account.address || !disputeResolver) return false;
    return (disputeResolver as string).toLowerCase() === account.address.toLowerCase();
  }, [account.address, disputeResolver]);

  const formattedTokenA = useMemo(() => {
    if (tokenABalance === undefined) return "--";
    return Number(formatUnits(tokenABalance, 18)).toFixed(2);
  }, [tokenABalance]);

  const formattedTokenB = useMemo(() => {
    if (tokenBBalance === undefined) return "--";
    return Number(formatUnits(tokenBBalance, 18)).toFixed(2);
  }, [tokenBBalance]);

  const formattedTokenBLocked = useMemo(() => {
    if (tokenBLocked === undefined) return "--";
    return Number(formatUnits(tokenBLocked, 18)).toFixed(2);
  }, [tokenBLocked]);

  const formattedTokenBUnlocked = useMemo(() => {
    if (tokenBUnlocked === undefined) return "--";
    return Number(formatUnits(tokenBUnlocked, 18)).toFixed(2);
  }, [tokenBUnlocked]);

  const formattedTreasuryIn = useMemo(() => {
    if (treasuryInTotal === undefined) return "--";
    return Number(formatUnits(treasuryInTotal as bigint, 18)).toFixed(2);
  }, [treasuryInTotal]);

  const formattedTreasuryOutA = useMemo(() => {
    if (treasuryOutATotal === undefined) return "--";
    return Number(formatUnits(treasuryOutATotal as bigint, 18)).toFixed(2);
  }, [treasuryOutATotal]);

  const formattedTreasuryOutB = useMemo(() => {
    if (treasuryOutBTotal === undefined) return "--";
    return Number(formatUnits(treasuryOutBTotal as bigint, 18)).toFixed(2);
  }, [treasuryOutBTotal]);

  const formattedReservesA = useMemo(() => {
    if (lastReservesA === undefined) return "--";
    return Number(formatUnits(lastReservesA as bigint, 18)).toFixed(2);
  }, [lastReservesA]);

  const formattedReservesB = useMemo(() => {
    if (lastReservesB === undefined) return "--";
    return Number(formatUnits(lastReservesB as bigint, 18)).toFixed(2);
  }, [lastReservesB]);

  const isTokenAOwner = useMemo(() => {
    if (!account.address || !tokenAOwner) return false;
    return (tokenAOwner as string).toLowerCase() === account.address.toLowerCase();
  }, [account.address, tokenAOwner]);

  const isTreasuryOwner = useMemo(() => {
    if (!account.address || !treasuryOwner) return false;
    return (treasuryOwner as string).toLowerCase() === account.address.toLowerCase();
  }, [account.address, treasuryOwner]);

  const formattedLastAPPI = useMemo(() => {
    if (lastAPPI === undefined) return "--";
    return Number(formatUnits(lastAPPI as bigint, 18)).toFixed(2);
  }, [lastAPPI]);

  const formattedDailyUBI = useMemo(() => {
    if (dailyUBIAmount === undefined) return "--";
    return Number(formatUnits(dailyUBIAmount as bigint, 18)).toFixed(2);
  }, [dailyUBIAmount]);

  const totalUnclaimed = useMemo(() => {
    return unclaimedDays.reduce((sum, entry) => sum + entry.amount, 0n);
  }, [unclaimedDays]);

  const formattedIntegrity = useMemo(() => {
    if (integrityScore === undefined) return "--";
    return integrityScore.toString();
  }, [integrityScore]);

  const showSuccess = useCallback((message: string) => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    setTxSuccess(message);
    successTimeoutRef.current = setTimeout(() => {
      setTxSuccess(null);
      successTimeoutRef.current = null;
    }, 5000);
  }, []);

  const covenantReward = useMemo(
    () => safeParseUnits(covenantRewardAmount, 18),
    [covenantRewardAmount]
  );

  const estimatedCrystallizedReward = useMemo(() => {
    if (!covenantPayInTokenA) return null;
    if (crystallizationRateBps === undefined || crystallizationFeeBps === undefined) {
      return null;
    }
    const rate = BigInt(crystallizationRateBps);
    const fee = BigInt(crystallizationFeeBps);
    const minted = (covenantReward * rate) / 10_000n;
    const afterFee = (minted * (10_000n - fee)) / 10_000n;
    return afterFee;
  }, [covenantPayInTokenA, crystallizationRateBps, crystallizationFeeBps, covenantReward]);

  const hasInsufficientBalance = useMemo(() => {
    const balance = covenantPayInTokenA ? tokenABalance : tokenBUnlocked;
    if (balance === undefined) return false;
    return covenantReward > balance;
  }, [covenantPayInTokenA, covenantReward, tokenABalance, tokenBUnlocked]);

  const buildTrailItemFromLog = useCallback((log: any, timestamp: number): TrailItem | null => {
    if (!log?.eventName) return null;
    const id = `${log.transactionHash ?? "0x"}-${log.logIndex ?? 0}`;
    const eventName = log.eventName as string;
    const args = log.args ?? {};

    switch (eventName) {
      case "CovenantCreated": {
        const covenantId = Number(args.covenantId ?? 0);
        const tokenBReward = (args.tokenBReward ?? 0n) as bigint;
        const integrityPoints = (args.integrityPoints ?? 0n) as bigint;
        const parts: string[] = [];
        if (tokenBReward > 0n) parts.push(formatTokenB(tokenBReward));
        if (integrityPoints > 0n) parts.push(formatIntegrity(integrityPoints));
        return {
          id,
          timestamp,
          title: `Work agreement #${covenantId} created`,
          body: `Creator ${safeAddress(args.creator as string | undefined)} · Worker ${safeAddress(
            args.worker as string | undefined
          )}${parts.length ? ` · ${parts.join(" · ")}` : ""}`,
        };
      }
      case "CovenantSubmitted": {
        const covenantId = Number(args.covenantId ?? 0);
        return {
          id,
          timestamp,
          title: `Work agreement #${covenantId} submitted`,
          body: `Submitted by ${safeAddress(args.worker as string | undefined)}`,
        };
      }
      case "CovenantApproved": {
        const covenantId = Number(args.covenantId ?? 0);
        return {
          id,
          timestamp,
          title: `Work agreement #${covenantId} approved`,
          body: `Approved by ${safeAddress(args.creator as string | undefined)} · Reward released`,
        };
      }
      case "CovenantRejected": {
        const covenantId = Number(args.covenantId ?? 0);
        return {
          id,
          timestamp,
          title: `Work agreement #${covenantId} rejected`,
          body: `Rejected by ${safeAddress(args.creator as string | undefined)}`,
        };
      }
      case "CovenantCancelled": {
        const covenantId = Number(args.covenantId ?? 0);
        return {
          id,
          timestamp,
          title: `Work agreement #${covenantId} cancelled`,
          body: `Cancelled by ${safeAddress(args.creator as string | undefined)}`,
        };
      }
      case "IssueReported": {
        const covenantId = Number(args.covenantId ?? 0);
        const claimPct = formatPercent((args.claimBps ?? 0n) as bigint);
        const reason =
          typeof args.reason === "string" && args.reason.trim().length > 0
            ? `Reason: ${args.reason.trim()}`
            : "Reason not provided";
        const evidenceLink = formatEvidenceLink(args.evidenceUri);
        return {
          id,
          timestamp,
          title: `Support requested for agreement #${covenantId}`,
          body: (
            <>
              Reported by {safeAddress(args.worker as string | undefined)} · Claim {claimPct}% ·{" "}
              {reason}
              {evidenceLink ? <> · {evidenceLink}</> : null}
            </>
          ),
        };
      }
      case "IssueAccepted": {
        const covenantId = Number(args.covenantId ?? 0);
        const claimPct = formatPercent((args.claimBps ?? 0n) as bigint);
        return {
          id,
          timestamp,
          title: `Support accepted on agreement #${covenantId}`,
          body: `Accepted by ${safeAddress(args.creator as string | undefined)} · Claim ${claimPct}%`,
        };
      }
      case "IssueDisputed": {
        const covenantId = Number(args.covenantId ?? 0);
        const reason =
          typeof args.reason === "string" && args.reason.trim().length > 0
            ? `Reason: ${args.reason.trim()}`
            : "Reason not provided";
        const evidenceLink = formatEvidenceLink(args.evidenceUri);
        return {
          id,
          timestamp,
          title: `Support disputed on agreement #${covenantId}`,
          body: (
            <>
              Disputed by {safeAddress(args.creator as string | undefined)} · {reason}
              {evidenceLink ? <> · {evidenceLink}</> : null}
            </>
          ),
        };
      }
      case "DisputeResolverSet": {
        return {
          id,
          timestamp,
          title: "Support resolver updated",
          body: `Resolver ${safeAddress(args.resolver as string | undefined)}`,
        };
      }
      case "ResolutionProposed": {
        const covenantId = Number(args.covenantId ?? 0);
        const payoutBps = (args.workerPayoutBps ?? 0n) as bigint;
        const integrityPoints = (args.integrityPoints ?? 0n) as bigint;
        return {
          id,
          timestamp,
          title: `Support proposal for agreement #${covenantId}`,
          body: `${formatPercent(payoutBps)}% payout to worker · +${integrityPoints.toString()} points`,
        };
      }
      case "MaliceSlashed": {
        const covenantId = Number(args.covenantId ?? 0);
        const penalty = (args.penalty ?? 0n) as bigint;
        return {
          id,
          timestamp,
          title: `Integrity penalty on agreement #${covenantId}`,
          body: `Creator ${safeAddress(args.creator as string | undefined)} · Worker ${safeAddress(
            args.worker as string | undefined
          )} · Penalty ${formatTokenB(penalty)}`,
        };
      }
      case "DisputeResolved": {
        const covenantId = Number(args.covenantId ?? 0);
        const payoutBps = (args.workerPayoutBps ?? 0n) as bigint;
        const integrityPoints = (args.integrityPoints ?? 0n) as bigint;
        return {
          id,
          timestamp,
          title: `Support resolved: agreement #${covenantId}`,
          body: `${formatPercent(payoutBps)}% payout to worker · +${integrityPoints.toString()} points`,
        };
      }
      case "TaskCompleted": {
        const tokenBReward = (args.tokenBReward ?? 0n) as bigint;
        const integrityPoints = (args.integrityPoints ?? 0n) as bigint;
        const parts: string[] = [];
        if (tokenBReward > 0n) parts.push(`+${formatTokenB(tokenBReward)}`);
        if (integrityPoints > 0n) parts.push(formatIntegrity(integrityPoints));
        return {
          id,
          timestamp,
          title: "Task completed",
          body: `Worker ${safeAddress(args.worker as string | undefined)}${
            parts.length ? ` · ${parts.join(" · ")}` : ""
          }`,
        };
      }
      case "UBIClaimed": {
        const amount = (args.amount ?? 0n) as bigint;
        return {
          id,
          timestamp,
          title: "Bonus claimed",
          body: `User ${safeAddress(args.user as string | undefined)} · +${formatTokenA(amount)}`,
        };
      }
      case "CovenantSet": {
        return {
          id,
          timestamp,
          title: "Agreement contract linked to treasury",
          body: `Contract ${safeAddress(args.covenant as string | undefined)}`,
        };
      }
      case "TreasuryIn": {
        const amount = (args.amount ?? 0n) as bigint;
        const reason = formatReason(args.reason, "IN");
        return {
          id,
          timestamp,
          title: "Treasury inflow",
          body: `From ${safeAddress(args.from as string | undefined)} · +${formatTokenA(
            amount
          )} · ${reason}`,
        };
      }
      case "TreasuryOutA": {
        const amount = (args.amount ?? 0n) as bigint;
        const reason = formatReason(args.reason, "OUT_A");
        return {
          id,
          timestamp,
          title: "Treasury outflow (A)",
          body: `To ${safeAddress(args.to as string | undefined)} · -${formatTokenA(
            amount
          )} · ${reason}`,
        };
      }
      case "TreasuryOutB": {
        const amount = (args.amount ?? 0n) as bigint;
        const reason = formatReason(args.reason, "OUT_B");
        return {
          id,
          timestamp,
          title: "Treasury outflow (B)",
          body: `To ${safeAddress(args.to as string | undefined)} · -${formatTokenB(
            amount
          )} · ${reason}`,
        };
      }
      case "ReserveSnapshot": {
        const reservesA = (args.reservesA ?? 0n) as bigint;
        const reservesB = (args.reservesB ?? 0n) as bigint;
        return {
          id,
          timestamp,
          title: "Treasury reserve snapshot",
          body: `A ${formatTokenA(reservesA)} · B ${formatTokenB(reservesB)}`,
        };
      }
      case "LiabilityChanged": {
        const deltaA = (args.deltaA ?? 0n) as bigint;
        const deltaB = (args.deltaB ?? 0n) as bigint;
        const reason = formatReason(args.reason, "LIAB");
        return {
          id,
          timestamp,
          title: "Liability updated",
          body: `ΔA ${deltaA.toString()} · ΔB ${deltaB.toString()} · ${reason}`,
        };
      }
      default:
        return null;
    }
  }, []);

  const addTrailItems = useCallback((items: TrailItem[]) => {
    setTrailItems((prev) => {
      const next = [...prev];
      for (const item of items) {
        if (trailIds.current.has(item.id)) continue;
        trailIds.current.add(item.id);
        next.push(item);
      }
      next.sort((a, b) => b.timestamp - a.timestamp);
      return next.slice(0, MAX_TRAIL_ITEMS);
    });
  }, []);

  const loadHistoricalTrail = useCallback(async () => {
    if (!publicClient || !covenantAddress || !treasuryAddress) return;
    const toBlock = await publicClient.getBlockNumber();
    const [covenantLogs, treasuryLogs] = await Promise.all([
      publicClient.getContractEvents({
        address: covenantAddress,
        abi: covenantAbi,
        fromBlock: 0n,
        toBlock,
      }),
      publicClient.getContractEvents({
        address: treasuryAddress,
        abi: treasuryAbi,
        fromBlock: 0n,
        toBlock,
      }),
    ]);

    const logs = [...covenantLogs, ...treasuryLogs];
    const blockMap = new Map<bigint, number>();
    const uniqueBlocks = Array.from(new Set(logs.map((log) => log.blockNumber)));
    await Promise.all(
      uniqueBlocks.map(async (blockNumber) => {
        const block = await publicClient.getBlock({ blockNumber });
        blockMap.set(blockNumber, Number(block.timestamp));
      })
    );

    const items = logs
      .map((log) => buildTrailItemFromLog(log, blockMap.get(log.blockNumber) ?? 0))
      .filter((item): item is TrailItem => item !== null)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_TRAIL_ITEMS);

    trailIds.current = new Set(items.map((item) => item.id));
    setTrailItems(items);
  }, [publicClient, covenantAddress, treasuryAddress, buildTrailItemFromLog]);

  const handleLiveLogs = useCallback(
    async (logs: any[]) => {
      if (!publicClient || logs.length === 0) return;
      const blockMap = new Map<bigint, number>();
      const items = await Promise.all(
        logs.map(async (log) => {
          const blockNumber = log.blockNumber as bigint;
          let timestamp = blockMap.get(blockNumber);
          if (timestamp === undefined) {
            const block = await publicClient.getBlock({ blockNumber });
            timestamp = Number(block.timestamp);
            blockMap.set(blockNumber, timestamp);
          }
          return buildTrailItemFromLog(log, timestamp);
        })
      );
      addTrailItems(items.filter((item): item is TrailItem => item !== null));
    },
    [publicClient, buildTrailItemFromLog, addTrailItems]
  );

  const refreshCovenants = useCallback(async () => {
    if (!publicClient || !covenantAddress) return;
    setIsLoadingCovenants(true);
    try {
      const nextId = await publicClient.readContract({
        address: covenantAddress,
        abi: covenantAbi,
        functionName: "nextId",
      });
      const total = Number(nextId);
      const items = await Promise.all(
        Array.from({ length: total }, async (_, index) => {
          const data = await publicClient.readContract({
            address: covenantAddress,
            abi: covenantAbi,
            functionName: "covenants",
            args: [BigInt(index)],
          });
          return {
            id: index,
            creator: data[0] as string,
            worker: data[1] as string,
            tokenBReward: data[2] as bigint,
            integrityPoints: data[3] as bigint,
            issueClaimBps: data[4] as bigint,
            escrowStart: data[5] as bigint,
            milestoneProgress: data[6] as bigint,
            proposedWorkerPayoutBps: data[7] as bigint,
            proposedIntegrityPoints: data[8] as bigint,
            proposedSlashingPenalty: data[9] as bigint,
            paymentToken: Number(data[10]),
            status: Number(data[11]),
          };
        })
      );
      setCovenants(items);
    } finally {
      setIsLoadingCovenants(false);
    }
  }, [publicClient, covenantAddress]);

  const loadUnclaimed = useCallback(async () => {
    if (!publicClient || !treasuryAddress || !account.address) return;
    const block = await publicClient.getBlock();
    const day = Number(block.timestamp / 86400n);
    setCurrentDayIndex(day);
    const lookback = 6;
    const entries: { day: number; amount: bigint }[] = [];
    for (let offset = 0; offset <= lookback; offset += 1) {
      const targetDay = day - offset;
      if (targetDay < 0) continue;
      const amount = (await publicClient.readContract({
        address: treasuryAddress,
        abi: treasuryAbi,
        functionName: "unclaimed",
        args: [account.address, BigInt(targetDay)],
      })) as bigint;
      entries.push({ day: targetDay, amount });
    }
    setUnclaimedDays(entries);
    if (!unclaimedFromDay) {
      setUnclaimedFromDay(String(Math.max(day - lookback, 0)));
    }
    if (!unclaimedToDay) {
      setUnclaimedToDay(String(day));
    }
  }, [account.address, publicClient, treasuryAddress, unclaimedFromDay, unclaimedToDay]);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      refetchTokenA(),
      refetchTokenB(),
      refetchTokenBLocked(),
      refetchTokenBUnlocked(),
      refetchIntegrity(),
      refetchEligibility(),
      refreshCovenants(),
      loadUnclaimed(),
    ]);
  }, [
    refetchEligibility,
    refetchIntegrity,
    refetchTokenA,
    refetchTokenB,
    refetchTokenBLocked,
    refetchTokenBUnlocked,
    refreshCovenants,
    loadUnclaimed,
  ]);

  const postTransactionSync = useCallback(async () => {
    await refreshAll();
    await wait(500);
    await loadHistoricalTrail();
  }, [loadHistoricalTrail, refreshAll]);

  const runTransaction = useCallback(
    async (actionKey: string, request: () => Promise<`0x${string}`>) => {
      if (!publicClient) {
        throw new Error("Public client unavailable.");
      }
      setTxError(null);
      setTxAction(actionKey);
      setTxStatus("signing");
      const hash = await request();
      setTxStatus("confirming");
      await publicClient.waitForTransactionReceipt({ hash });
    },
    [publicClient]
  );

  const actionLabel = useCallback(
    (actionKey: string, defaultLabel: string) => {
      if (txAction !== actionKey) return defaultLabel;
      return txStatus === "confirming" ? "Confirming..." : "Processing...";
    },
    [txAction, txStatus]
  );

  const isBusy = isWriting || txStatus !== "idle";

  useEffect(() => {
    if (!taskWorker && account.address) {
      setTaskWorker(account.address);
    }
  }, [account.address, taskWorker]);

  useEffect(() => {
    if (!covenantWorker && account.address) {
      setCovenantWorker(account.address);
    }
  }, [account.address, covenantWorker]);

  useEffect(() => {
    void refreshCovenants();
  }, [refreshCovenants]);

  useEffect(() => {
    void loadHistoricalTrail();
  }, [loadHistoricalTrail]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrailNow(Date.now());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    void loadUnclaimed();
  }, [loadUnclaimed]);

  useEffect(() => {
    if (!publicClient || !covenantAddress || !treasuryAddress) return;
    const unwatchCovenant = publicClient.watchContractEvent({
      address: covenantAddress,
      abi: covenantAbi,
      onLogs: (logs) => void handleLiveLogs(logs),
    });
    const unwatchTreasury = publicClient.watchContractEvent({
      address: treasuryAddress,
      abi: treasuryAbi,
      onLogs: (logs) => void handleLiveLogs(logs),
    });
    return () => {
      unwatchCovenant();
      unwatchTreasury();
    };
  }, [publicClient, covenantAddress, treasuryAddress, handleLiveLogs]);

  const handleClaim = async () => {
    if (!treasuryAddress) return;
    try {
      await runTransaction("claimUBI", () =>
        writeContractAsync({
          address: treasuryAddress,
          abi: treasuryAbi,
          functionName: "claimUBI",
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleSetAppiOracle = async () => {
    if (!treasuryAddress) return;
    const target = appiOracleInput.trim();
    if (!target) {
      setTxError("Enter APPI oracle address.");
      setTxSuccess(null);
      return;
    }
    try {
      await runTransaction("setAPPIOracle", () =>
        writeContractAsync({
          address: treasuryAddress,
          abi: treasuryAbi,
          functionName: "setAPPIOracle",
          args: [target],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("APPI oracle updated.");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleSetAppiCategories = async () => {
    if (!appiOracleAddr || appiOracleAddr === zeroAddress) {
      setTxError("APPI oracle not set.");
      setTxSuccess(null);
      return;
    }
    const raw = appiCategoryInput.trim();
    if (!raw) {
      setTxError("Enter category ids (comma separated).");
      setTxSuccess(null);
      return;
    }
    const values = raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value) && value >= 0);
    if (values.length === 0) {
      setTxError("Invalid category list.");
      setTxSuccess(null);
      return;
    }
    try {
      await runTransaction("setAPPIcategories", () =>
        writeContractAsync({
          address: appiOracleAddr as `0x${string}`,
          abi: appiOracleAbi,
          functionName: "setCategories",
          args: [values.map((value) => BigInt(value))],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("APPI categories updated.");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleSubmitAppiPrice = async () => {
    if (!appiOracleAddr || appiOracleAddr === zeroAddress) {
      setTxError("APPI oracle not set.");
      setTxSuccess(null);
      return;
    }
    const category = Number.parseInt(appiCategoryInput || "", 10);
    const price = safeParseUnits(appiPriceInput || "0", 18);
    if (!Number.isFinite(category) || category < 0) {
      setTxError("Invalid category id.");
      setTxSuccess(null);
      return;
    }
    if (price <= 0n) {
      setTxError("Price must be positive.");
      setTxSuccess(null);
      return;
    }
    try {
      await runTransaction("submitAPPI", () =>
        writeContractAsync({
          address: appiOracleAddr as `0x${string}`,
          abi: appiOracleAbi,
          functionName: "submitPrice",
          args: [BigInt(category), price],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("APPI price submitted.");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleApplyAppi = async () => {
    if (!treasuryAddress) return;
    const dayInput =
      appiDayInput.trim() ||
      (currentDayIndex !== null ? currentDayIndex.toString() : "");
    const day = Number.parseInt(dayInput, 10);
    if (!Number.isFinite(day) || day < 0) {
      setTxError("Invalid day index.");
      setTxSuccess(null);
      return;
    }
    try {
      await runTransaction("applyAPPI", () =>
        writeContractAsync({
          address: treasuryAddress,
          abi: treasuryAbi,
          functionName: "applyAPPI",
          args: [BigInt(day)],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("APPI applied.");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleSetPrimary = async () => {
    if (!tokenAAddress || !account.address) return;
    try {
      await runTransaction("setPrimary", () =>
        writeContractAsync({
          address: tokenAAddr,
          abi: tokenAAbi,
          functionName: "setPrimaryAddress",
          args: [account.address, true],
        })
      );
      await postTransactionSync();
      await refetchPrimary?.();
      setTxError(null);
      showSuccess("Primary verification updated.");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleAccrueUnclaimed = async () => {
    if (!treasuryAddress) return;
    try {
      await runTransaction("accrueUBI", () =>
        writeContractAsync({
          address: treasuryAddress,
          abi: treasuryAbi,
          functionName: "accrueUBI",
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Accrued bonus.");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleClaimUnclaimed = async () => {
    if (!treasuryAddress) return;
    const fromDay = Number.parseInt(unclaimedFromDay || "", 10);
    const toDay = Number.parseInt(unclaimedToDay || "", 10);
    if (!Number.isFinite(fromDay) || !Number.isFinite(toDay) || fromDay < 0 || toDay < fromDay) {
      setTxError("Invalid day range for saved bonuses.");
      setTxSuccess(null);
      return;
    }
    try {
      await runTransaction("claimUnclaimed", () =>
        writeContractAsync({
          address: treasuryAddress,
          abi: treasuryAbi,
          functionName: "claimUnclaimed",
          args: [BigInt(fromDay), BigInt(toDay)],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Saved bonus claimed.");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleUseRecentDays = () => {
    if (currentDayIndex === null) return;
    const lookback = 6;
    setUnclaimedFromDay(String(Math.max(currentDayIndex - lookback, 0)));
    setUnclaimedToDay(String(currentDayIndex));
  };

  const handleReport = async () => {
    if (!treasuryAddress || !taskWorker) return;
    const amount = parseUnits(taskTokenBAmount || "0", 18);
    const points = Number.parseInt(taskIntegrityPoints || "0", 10);
    try {
      await runTransaction("reportTaskCompleted", () =>
        writeContractAsync({
          address: treasuryAddress,
          abi: treasuryAbi,
          functionName: "reportTaskCompleted",
          args: [taskWorker, amount, points],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleCreateCovenant = async () => {
    if (!covenantAddress || !covenantWorker) return;
    const paymentTokenAddress = covenantPayInTokenA ? tokenAAddress : tokenBAddress;
    const paymentTokenAbi = covenantPayInTokenA ? tokenAAbi : tokenBAbi;
    if (!paymentTokenAddress) return;
    const reward = covenantReward;
    const points = Number.parseInt(covenantIntegrityPoints || "0", 10);
    try {
      setCovenantStep(1);
      await runTransaction("createCovenant", () =>
        writeContractAsync({
          address: paymentTokenAddress,
          abi: paymentTokenAbi,
          functionName: "approve",
          args: [covenantAddress, reward],
        })
      );
      setCovenantStep(2);
      await runTransaction("createCovenant", () =>
        writeContractAsync({
          address: covenantAddress,
          abi: covenantAbi,
          functionName: "createCovenant",
          args: [covenantWorker, reward, points, covenantPayInTokenA],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
      setCovenantStep(0);
    }
  };

  const handleSubmitWork = async (covenantId: number) => {
    if (!covenantAddress) return;
    const actionKey = `submit-${covenantId}`;
    try {
      await runTransaction(actionKey, () =>
        writeContractAsync({
          address: covenantAddress,
          abi: covenantAbi,
          functionName: "submitWork",
          args: [BigInt(covenantId)],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleApproveWork = async (covenantId: number) => {
    if (!covenantAddress) return;
    const actionKey = `approve-${covenantId}`;
    try {
      await runTransaction(actionKey, () =>
        writeContractAsync({
          address: covenantAddress,
          abi: covenantAbi,
          functionName: "approveWork",
          args: [BigInt(covenantId)],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleRejectWork = async (covenantId: number) => {
    if (!covenantAddress) return;
    const actionKey = `reject-${covenantId}`;
    try {
      await runTransaction(actionKey, () =>
        writeContractAsync({
          address: covenantAddress,
          abi: covenantAbi,
          functionName: "rejectWork",
          args: [BigInt(covenantId)],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleCancelCovenant = async (covenantId: number) => {
    if (!covenantAddress) return;
    const actionKey = `cancel-${covenantId}`;
    try {
      await runTransaction(actionKey, () =>
        writeContractAsync({
          address: covenantAddress,
          abi: covenantAbi,
          functionName: "cancel",
          args: [BigInt(covenantId)],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleReportIssue = async (covenantId: number) => {
    if (!covenantAddress) return;
    const claim = issueClaims[covenantId] ?? "";
    const reason = issueReasons[covenantId] ?? "";
    const evidenceUri = issueEvidenceUris[covenantId] ?? "";
    if (!claim.trim()) return;
    const parsedClaim = Number(claim);
    if (Number.isNaN(parsedClaim)) return;
    const claimBps = Math.min(100, Math.max(0, parsedClaim));
    const confirmationMessage =
      claimBps === 0
        ? "You are claiming 0% (forfeiting the entire reward). Is this intended?"
        : `You are claiming ${claimBps}% of the reward. Proceed?`;
    const confirmed = window.confirm(confirmationMessage);
    if (!confirmed) return;
    const actionKey = `report-issue-${covenantId}`;
    try {
      await runTransaction(actionKey, () =>
        writeContractAsync({
          address: covenantAddress,
          abi: covenantAbi,
          functionName: "reportIssue",
          args: [BigInt(covenantId), BigInt(claimBps * 100), reason, evidenceUri],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleAcceptIssue = async (covenantId: number) => {
    if (!covenantAddress) return;
    const actionKey = `accept-issue-${covenantId}`;
    try {
      await runTransaction(actionKey, () =>
        writeContractAsync({
          address: covenantAddress,
          abi: covenantAbi,
          functionName: "acceptIssue",
          args: [BigInt(covenantId)],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleDisputeIssue = async (covenantId: number) => {
    if (!covenantAddress) return;
    const reason = disputeReasons[covenantId] ?? "";
    const evidenceUri = disputeEvidenceUris[covenantId] ?? "";
    const actionKey = `dispute-${covenantId}`;
    try {
      await runTransaction(actionKey, () =>
        writeContractAsync({
          address: covenantAddress,
          abi: covenantAbi,
          functionName: "disputeIssue",
          args: [BigInt(covenantId), reason, evidenceUri],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleResolveDispute = async (covenantId: number) => {
    if (!covenantAddress) return;
    const payout = resolveClaims[covenantId] ?? "0";
    const payoutPct = Math.min(100, Math.max(0, Number(payout)));
    const integrity = Number.parseInt(resolveIntegrity[covenantId] ?? "0", 10);
    const slashingAmount = resolveSlashing[covenantId] ?? "0";
    const slashingPenalty = parseUnits(slashingAmount, 18);
    const actionKey = `resolve-${covenantId}`;
    try {
      await runTransaction(actionKey, () =>
        writeContractAsync({
          address: covenantAddress,
          abi: covenantAbi,
          functionName: "resolveDispute",
          args: [BigInt(covenantId), BigInt(payoutPct * 100), BigInt(integrity), slashingPenalty],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleFinalizeResolution = async (covenantId: number) => {
    if (!covenantAddress) return;
    const actionKey = `finalize-${covenantId}`;
    try {
      await runTransaction(actionKey, () =>
        writeContractAsync({
          address: covenantAddress,
          abi: covenantAbi,
          functionName: "finalizeResolution",
          args: [BigInt(covenantId)],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const covenantStatusLabels = [
    "Open",
    "Submitted",
    "Approved",
    "Rejected",
    "Cancelled",
    "Support requested",
    "Disputed",
    "Support proposed",
    "Support resolved",
  ];

  return (
    <div className={styles.page}>
      <div className={styles.backgroundGlow} aria-hidden="true" />
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.mark} />
            <div>
              <p className={styles.kicker}>FairSoil</p>
              <p className={styles.caption}>Integrity-first economy</p>
            </div>
          </div>
          <nav className={styles.nav}>
            <span>Prototype</span>
            <span className={styles.statusDot}>Live</span>
          </nav>
        </header>

        {txError ? (
          <section className={styles.messageError} role="alert">
            <p>{txError}</p>
          </section>
        ) : null}
        {txSuccess ? (
          <section className={styles.messageSuccess} role="status" aria-live="polite">
            <p>{txSuccess}</p>
          </section>
        ) : null}

        {missingEnv ? (
          <section className={styles.warning}>
            <h2>Missing contract addresses</h2>
            <p>
              Set NEXT_PUBLIC_TOKENA_ADDRESS, NEXT_PUBLIC_TOKENB_ADDRESS, and
              NEXT_PUBLIC_TREASURY_ADDRESS, and NEXT_PUBLIC_COVENANT_ADDRESS in
              frontend/.env.local.
            </p>
          </section>
        ) : null}

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.badge}>MVP dashboard</p>
            <h1>
              Reward honesty, protect survival, and turn contributions into
              lasting value.
            </h1>
            <p className={styles.heroText}>
              This interface mirrors the current smart contracts: Token A decay,
              Token B rewards, and integrity score eligibility for governance.
            </p>
            <div className={styles.heroActions}>
              <button
                className={styles.primaryButton}
                onClick={handleClaim}
                disabled={!account.address || missingEnv || isBusy}
              >
                {actionLabel("claimUBI", "Claim Bonus")}
              </button>
              {account.address ? (
                <button className={styles.secondaryButton} onClick={() => disconnect()}>
                  Disconnect
                </button>
              ) : (
                <button
                  className={styles.secondaryButton}
                  onClick={() => connect({ connector: injected() })}
                >
                  Connect Wallet
                </button>
              )}
            </div>
            <div className={styles.heroMeta}>
              <span>Network: Local Anvil (31337)</span>
              <span>
                Wallet: {account.address ? account.address.slice(0, 10) : "Not connected"}
              </span>
            </div>
          </div>

          <div className={styles.heroPanel}>
            <div className={styles.metric}>
              <p className={styles.metricLabel}>Token A balance</p>
              <p className={styles.metricValue}>{formattedTokenA}</p>
              <p className={styles.metricFootnote}>Expires gradually on-chain</p>
            </div>
            <div className={styles.metric}>
              <p className={styles.metricLabel}>Token B assets</p>
              <p className={styles.metricValue}>{formattedTokenB}</p>
              <div className={styles.metricBreakdown}>
                <span>Unlocked: {formattedTokenBUnlocked}</span>
                <span>Locked: {formattedTokenBLocked}</span>
              </div>
              <p className={styles.metricFootnote}>Locked balance cannot be transferred.</p>
            </div>
            <div className={styles.metric}>
              <p className={styles.metricLabel}>Integrity score</p>
              <p className={styles.metricValue}>{formattedIntegrity}</p>
              <p className={styles.metricFootnote}>
                {governanceEligible ? "Governance eligible" : "Not eligible yet"}
              </p>
            </div>
          </div>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h3>Governance readiness</h3>
            <p>
              You qualify via Token B holdings or integrity score threshold.
              Next draw in 12 hours.
            </p>
            <div className={styles.cardFooter}>
              <span>Min Token B: 1</span>
              <span>Min Integrity: 100</span>
            </div>
          </article>
          <article className={styles.card}>
            <h3>Primary verification</h3>
            <p>
              {isPrimaryAddress === undefined
                ? "Check your verification status."
                : isPrimaryAddress
                ? "Primary address verified (mock)."
                : "Not verified yet. Owner can verify for MVP testing."}
            </p>
            <div className={styles.cardFooter}>
              <span>Tier 3 required for UBI claim</span>
              <span>{isTokenAOwner ? "Owner connected" : "Owner required"}</span>
            </div>
            <div className={styles.cardActions}>
              <button
                className={styles.secondaryButton}
                onClick={handleSetPrimary}
                disabled={!account.address || !isTokenAOwner || isBusy}
              >
                {actionLabel("setPrimary", "Verify (mock)")}
              </button>
            </div>
          </article>
          <article className={styles.card}>
            <h3>Treasury snapshot</h3>
            <p>Current reserves and cumulative flows (latest snapshot).</p>
            <div className={styles.metricBreakdown}>
              <span>Reserves A: {formattedReservesA}</span>
              <span>Reserves B: {formattedReservesB}</span>
            </div>
            <div className={styles.metricBreakdown}>
              <span>In total: {formattedTreasuryIn}</span>
              <span>Out A: {formattedTreasuryOutA}</span>
              <span>Out B: {formattedTreasuryOutB}</span>
            </div>
          </article>
          <article className={styles.card}>
            <h3>APPI control</h3>
            <p>Minimal oracle loop for Phase1 validation.</p>
            <div className={styles.metricBreakdown}>
              <span>Oracle: {safeAddress(appiOracleAddr as string | undefined)}</span>
              <span>Last APPI: {formattedLastAPPI}</span>
              <span>Daily UBI: {formattedDailyUBI}</span>
            </div>
            <div className={styles.taskForm}>
              <label className={styles.taskField}>
                Oracle address
                <input
                  className={styles.taskInput}
                  value={appiOracleInput}
                  onChange={(event) => setAppiOracleInput(event.target.value)}
                  placeholder="0x..."
                />
              </label>
              <label className={styles.taskField}>
                Category ids
                <input
                  className={styles.taskInput}
                  value={appiCategoryInput}
                  onChange={(event) => setAppiCategoryInput(event.target.value)}
                  placeholder="e.g. 1,2,3"
                />
              </label>
              <label className={styles.taskField}>
                Price (18 decimals)
                <input
                  className={styles.taskInput}
                  value={appiPriceInput}
                  onChange={(event) => setAppiPriceInput(event.target.value)}
                  placeholder="e.g. 100"
                />
              </label>
              <label className={styles.taskField}>
                Day index
                <input
                  className={styles.taskInput}
                  value={appiDayInput}
                  onChange={(event) => setAppiDayInput(event.target.value)}
                  placeholder={currentDayIndex !== null ? currentDayIndex.toString() : "e.g. 12345"}
                />
              </label>
            </div>
            <div className={styles.cardActions}>
              <button
                className={styles.secondaryButton}
                onClick={handleSetAppiOracle}
                disabled={!account.address || !isTreasuryOwner || isBusy}
              >
                {actionLabel("setAPPIOracle", "Set oracle")}
              </button>
              <button
                className={styles.secondaryButton}
                onClick={handleSetAppiCategories}
                disabled={!account.address || !isTreasuryOwner || isBusy}
              >
                {actionLabel("setAPPIcategories", "Set categories")}
              </button>
              <button
                className={styles.secondaryButton}
                onClick={handleSubmitAppiPrice}
                disabled={!account.address || isBusy}
              >
                {actionLabel("submitAPPI", "Submit price")}
              </button>
              <button
                className={styles.secondaryButton}
                onClick={handleApplyAppi}
                disabled={!account.address || !isTreasuryOwner || isBusy}
              >
                {actionLabel("applyAPPI", "Apply APPI")}
              </button>
            </div>
            <p className={styles.taskHint}>
              Owner sets oracle/categories, verified reporters submit prices, owner applies APPI.
            </p>
          </article>
          <article className={styles.card}>
            <h3>Saved bonuses</h3>
            <p>
              Accrue daily bonuses, then claim in batches. Amounts older than 30 days
              expire at the Token A rate.
            </p>
            <div className={styles.unclaimedSummary}>
              <span>Current day: {currentDayIndex ?? "--"}</span>
              <span>Total (last 7 days): {formatTokenA(totalUnclaimed)}</span>
            </div>
            <div className={styles.unclaimedList}>
              {unclaimedDays.map((entry) => (
                <div key={entry.day} className={styles.unclaimedRow}>
                  <span>Day {entry.day}</span>
                  <span>{formatTokenA(entry.amount)}</span>
                </div>
              ))}
            </div>
            <div className={styles.taskForm}>
              <div className={styles.taskRow}>
                <label className={styles.taskField}>
                  From day
                  <input
                    className={styles.taskInput}
                    value={unclaimedFromDay}
                    onChange={(event) => setUnclaimedFromDay(event.target.value)}
                    placeholder="e.g. 12345"
                  />
                </label>
                <label className={styles.taskField}>
                  To day
                  <input
                    className={styles.taskInput}
                    value={unclaimedToDay}
                    onChange={(event) => setUnclaimedToDay(event.target.value)}
                    placeholder="e.g. 12350"
                  />
                </label>
              </div>
              <div className={styles.unclaimedActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={handleUseRecentDays}
                  disabled={!account.address || missingEnv || isBusy}
                >
                  Use last 7 days
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={handleAccrueUnclaimed}
                  disabled={!account.address || missingEnv || isBusy}
                >
                  {actionLabel("accrueUBI", "Accrue Bonus")}
                </button>
                <button
                  className={styles.primaryButton}
                  onClick={handleClaimUnclaimed}
                  disabled={!account.address || missingEnv || isBusy}
                >
                  {actionLabel("claimUnclaimed", "Claim Bonus")}
                </button>
              </div>
              <p className={styles.taskHint}>
                Day index = block timestamp / 86,400. Claiming resets those days.
              </p>
            </div>
          </article>
          <article className={styles.card}>
            <h3>Verified contributions</h3>
            <p>
              Report verified outcomes. Support requests can still earn partial
              rewards.
            </p>
            <div className={styles.taskForm}>
              <label className={styles.taskField}>
                Worker address
                <input
                  className={styles.taskInput}
                  value={taskWorker}
                  onChange={(event) => setTaskWorker(event.target.value)}
                  placeholder="0x..."
                />
                <span className={styles.fieldHint}>
                  Address of the worker who completed the task (must be verified).
                </span>
              </label>
              <div className={styles.taskRow}>
                <label className={styles.taskField}>
                  Token B bonus
                  <input
                    className={styles.taskInput}
                    value={taskTokenBAmount}
                    onChange={(event) => setTaskTokenBAmount(event.target.value)}
                    placeholder="500"
                  />
                  <span className={styles.fieldHint}>Bonus amount minted to the worker.</span>
                </label>
                <label className={styles.taskField}>
                  Integrity
                  <input
                    className={styles.taskInput}
                    value={taskIntegrityPoints}
                    onChange={(event) => setTaskIntegrityPoints(event.target.value)}
                    placeholder="100"
                  />
                  <span className={styles.fieldHint}>
                    Integrity points added to the worker’s score.
                  </span>
                </label>
              </div>
            </div>
            <button
              className={styles.ghostButton}
              onClick={handleReport}
              disabled={!account.address || missingEnv || isBusy || !taskWorker}
            >
              {actionLabel("reportTaskCompleted", "Report Contribution (admin)")}
            </button>
            <p className={styles.taskHint}>
              Requires the owner wallet and a verified primary address.
            </p>
          </article>
          <article className={styles.card}>
            <h3>Soil Treasury</h3>
            <p>
              Daily bonus set at 100 SOILA. Claims reset at 00:00 UTC.
            </p>
            <div className={styles.cardFooter}>
              <span>Next claim window: 03:12</span>
            </div>
          </article>
          <article className={styles.card}>
            <h3>Create work agreement</h3>
            <p>
              Lock Token B rewards upfront so a worker can submit and get
              approved.
            </p>
            <div className={styles.taskForm}>
              <label className={styles.taskField}>
                Worker address
                <input
                  className={styles.taskInput}
                  value={covenantWorker}
                  onChange={(event) => setCovenantWorker(event.target.value)}
                  placeholder="0x..."
                />
                <span className={styles.fieldHint}>
                  The worker who will submit and receive the reward.
                </span>
              </label>
              <label className={styles.taskField}>
                Payment asset
                <select
                  className={styles.taskInput}
                  value={covenantPayInTokenA ? "tokenA" : "tokenB"}
                  onChange={(event) => setCovenantPayInTokenA(event.target.value === "tokenA")}
                >
                  <option value="tokenB">Token B (Asset)</option>
                  <option value="tokenA">Token A (Flow)</option>
                </select>
                <span className={styles.fieldHint}>
                  Token A crystallizes into Token B with a fee.
                </span>
              </label>
              <div className={styles.taskRow}>
                <label className={styles.taskField}>
                  {covenantPayInTokenA ? "Token A" : "Token B"}
                  <input
                    className={styles.taskInput}
                    value={covenantRewardAmount}
                    onChange={(event) => setCovenantRewardAmount(event.target.value)}
                    placeholder="250"
                  />
                  <span className={styles.fieldHint}>Amount to lock in escrow.</span>
                </label>
                <label className={styles.taskField}>
                  Integrity
                  <input
                    className={styles.taskInput}
                    value={covenantIntegrityPoints}
                    onChange={(event) => setCovenantIntegrityPoints(event.target.value)}
                    placeholder="50"
                  />
                  <span className={styles.fieldHint}>
                    Integrity points awarded upon approval.
                  </span>
                </label>
              </div>
            </div>
            <button
              className={styles.ghostButton}
              onClick={handleCreateCovenant}
              disabled={
                !account.address ||
                missingEnv ||
                isBusy ||
                !covenantWorker ||
                hasInsufficientBalance
              }
            >
                {hasInsufficientBalance
                ? "Insufficient Balance"
                : actionLabel("createCovenant", "Create Agreement (approve + lock)")}
            </button>
            <div className={styles.stepNote}>
              <span className={styles.stepPill}>
                {covenantStep === 1
                  ? "Step 1/2: Approve token allowance"
                  : covenantStep === 2
                  ? "Step 2/2: Lock funds into escrow"
                  : "Two-step wallet flow"}
              </span>
              <span>
                ERC-20 requires permission (approve) before escrow can lock funds.
              </span>
            </div>
            <p className={styles.taskHint}>
              {covenantPayInTokenA
                ? "Approves Token A, then escrows it in the covenant contract."
                : "Approves Token B, then escrows it in the covenant contract."}
            </p>
            {covenantPayInTokenA ? (
              <p className={styles.taskHint}>
                {estimatedCrystallizedReward !== null
                  ? `Estimated receive: ${Number(
                      formatUnits(estimatedCrystallizedReward, 18)
                    ).toFixed(2)} SOILB after crystallization fee.`
                  : "Estimated receive: --"}
              </p>
            ) : null}
          </article>
        </section>

        <section className={styles.timeline}>
          <div>
            <h2>Audit trail</h2>
            <p>Covenant + Treasury events (rewards, reserves, and dispute updates).</p>
          </div>
          <div className={styles.timelineList}>
            {trailItems.length === 0 ? (
              <div className={styles.timelineItem}>
                <span className={styles.timelineTime}>--</span>
                <div>
                  <p className={styles.timelineTitle}>No activity yet</p>
                  <p className={styles.timelineBody}>
                    Agreement and treasury events will appear here.
                  </p>
                </div>
              </div>
            ) : (
              trailItems.map((item) => (
                <div className={styles.timelineItem} key={item.id}>
                  <span className={styles.timelineTime}>
                    {formatRelativeTime(item.timestamp, trailNow)}
                  </span>
                  <div>
                    <p className={styles.timelineTitle}>{item.title}</p>
                    {item.body ? (
                      <p className={styles.timelineBody}>{item.body}</p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className={styles.covenantSection}>
          <div className={styles.covenantHeader}>
            <div>
              <h2>Active agreements</h2>
              <p>Track escrowed work agreements created on this chain.</p>
            </div>
            <button
              className={styles.secondaryButton}
              onClick={refreshCovenants}
              disabled={missingEnv || isLoadingCovenants}
            >
              Refresh
            </button>
          </div>
          <div className={styles.covenantTable}>
            <div className={styles.covenantRowHeader}>
              <span>ID</span>
              <span>Worker</span>
              <span>Reward</span>
              <span>Integrity</span>
              <span>Claim</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {covenants.length === 0 ? (
              <div className={styles.covenantRowEmpty}>
                {isLoadingCovenants ? "Loading agreements..." : "No agreements yet."}
              </div>
            ) : (
              covenants.map((item) => (
                <div className={styles.covenantRow} key={`covenant-${item.id}`}>
                  <span>#{item.id}</span>
                  <span>{item.worker.slice(0, 10)}...</span>
                  <span>
                    {Number(formatUnits(item.tokenBReward, 18)).toFixed(2)}{" "}
                    {item.paymentToken === 1 ? "SOILA" : "SOILB"}
                  </span>
                  <span>{item.integrityPoints.toString()}</span>
                  <span>{Number(item.issueClaimBps) / 100}%</span>
                  <span>{covenantStatusLabels[item.status] ?? "Unknown"}</span>
                  <div className={styles.covenantActions}>
                    {item.status >= 5 ? (
                      <div className={styles.disputeTrack}>
                        {disputeSteps.map((label, index) => {
                          const stage = getDisputeStage(item.status);
                          const active = stage[index];
                          return (
                            <span
                              key={`${item.id}-${label}`}
                              className={`${styles.disputeStep} ${
                                active ? styles.disputeStepActive : ""
                              }`}
                            >
                              {label}
                            </span>
                          );
                        })}
                        <p className={styles.disputeHint}>
                          {disputeStatusLabel(item.status)}
                          <span className={styles.disputeSubhint}>
                            Resolver proposes, then finalizes. High-value disputes can route to
                            external adjudication.
                          </span>
                          {!isDisputeResolver ? (
                            <span className={styles.disputeSubhint}>
                              If this is high value, resolution may be delayed until external
                              adjudication returns.
                            </span>
                          ) : null}
                        </p>
                      </div>
                    ) : null}
                    {item.status === 0 &&
                    account.address &&
                    item.creator.toLowerCase() === account.address.toLowerCase() ? (
                      <button
                        className={styles.secondaryButton}
                        onClick={() => handleCancelCovenant(item.id)}
                        disabled={isBusy}
                      >
                        {actionLabel(`cancel-${item.id}`, "Cancel (refund)")}
                      </button>
                    ) : null}
                    {item.status === 0 &&
                    account.address &&
                    item.worker.toLowerCase() === account.address.toLowerCase() ? (
                      <button
                        className={styles.ghostButton}
                        onClick={() => handleSubmitWork(item.id)}
                        disabled={isBusy}
                      >
                        {actionLabel(`submit-${item.id}`, "Submit")}
                      </button>
                    ) : null}
                    {(item.status === 0 || item.status === 1 || item.status === 5) &&
                    account.address &&
                    item.worker.toLowerCase() === account.address.toLowerCase() ? (
                      <div className={styles.issueActions}>
                        <label className={styles.issueField}>
                  <span className={styles.issueLabel}>Claim %</span>
                          <input
                            className={styles.issueInput}
                            value={issueClaims[item.id] ?? ""}
                            onChange={(event) =>
                              setIssueClaims((prev) => ({
                                ...prev,
                                [item.id]: event.target.value,
                              }))
                            }
                            placeholder="0"
                          />
                          <span className={styles.issueHelp}>
                            % of reward to keep if there is a problem.
                          </span>
                        </label>
                        <label className={styles.issueField}>
                          <span className={styles.issueLabel}>Support reason</span>
                          <textarea
                            className={styles.issueTextarea}
                            value={issueReasons[item.id] ?? ""}
                            onChange={(event) =>
                              setIssueReasons((prev) => ({
                                ...prev,
                                [item.id]: event.target.value,
                              }))
                            }
                            placeholder="Describe what went wrong"
                          />
                        </label>
                        <label className={styles.issueField}>
                          <span className={styles.issueLabel}>Evidence URL</span>
                          <input
                            className={`${styles.issueInput} ${styles.issueInputWide}`}
                            value={issueEvidenceUris[item.id] ?? ""}
                            onChange={(event) =>
                              setIssueEvidenceUris((prev) => ({
                                ...prev,
                                [item.id]: event.target.value,
                              }))
                            }
                            placeholder="https://..."
                          />
                          {formatEvidenceLink(issueEvidenceUris[item.id]) ? (
                            <div className={styles.issuePreview}>
                              {formatEvidenceLink(issueEvidenceUris[item.id])}
                            </div>
                          ) : null}
                        </label>
                        <button
                          className={styles.secondaryButton}
                          onClick={() => handleReportIssue(item.id)}
                          disabled={isBusy || (issueClaims[item.id] ?? "").trim() === ""}
                        >
                          {actionLabel(
                            `report-issue-${item.id}`,
                            item.status === 5 ? "Update Request" : "Request Support"
                          )}
                        </button>
                      </div>
                    ) : null}
                    {item.status === 1 &&
                    account.address &&
                    item.creator.toLowerCase() === account.address.toLowerCase() ? (
                      <>
                        <button
                          className={styles.primaryButton}
                          onClick={() => handleApproveWork(item.id)}
                          disabled={isBusy}
                        >
                          {actionLabel(`approve-${item.id}`, "Approve")}
                        </button>
                        <button
                          className={styles.secondaryButton}
                          onClick={() => handleRejectWork(item.id)}
                          disabled={isBusy}
                        >
                          {actionLabel(`reject-${item.id}`, "Reject")}
                        </button>
                      </>
                    ) : null}
                    {(item.status === 5 || item.status === 6) &&
                    account.address &&
                    item.creator.toLowerCase() === account.address.toLowerCase() ? (
                      <>
                        <label className={styles.issueField}>
                          <span className={styles.issueLabel}>Support reason</span>
                          <textarea
                            className={styles.issueTextarea}
                            value={disputeReasons[item.id] ?? ""}
                            onChange={(event) =>
                              setDisputeReasons((prev) => ({
                                ...prev,
                                [item.id]: event.target.value,
                              }))
                            }
                            placeholder="Explain why you dispute the claim"
                          />
                          <span className={styles.issueHelp}>
                            Disputes auto-hold part of the payout. Missing details may auto-reject after 48h.
                          </span>
                        </label>
                        <label className={styles.issueField}>
                          <span className={styles.issueLabel}>Evidence URL</span>
                          <input
                            className={`${styles.issueInput} ${styles.issueInputWide}`}
                            value={disputeEvidenceUris[item.id] ?? ""}
                            onChange={(event) =>
                              setDisputeEvidenceUris((prev) => ({
                                ...prev,
                                [item.id]: event.target.value,
                              }))
                            }
                            placeholder="https://..."
                          />
                          {formatEvidenceLink(disputeEvidenceUris[item.id]) ? (
                            <div className={styles.issuePreview}>
                              {formatEvidenceLink(disputeEvidenceUris[item.id])}
                            </div>
                          ) : null}
                          <span className={styles.issueHelp}>
                            Evidence is optional but increases refund caps. Small tickets have a lower cap.
                          </span>
                        </label>
                        {item.status === 5 ? (
                          <button
                            className={styles.primaryButton}
                            onClick={() => handleAcceptIssue(item.id)}
                            disabled={isBusy}
                          >
                          {actionLabel(`accept-issue-${item.id}`, "Accept Claim")}
                          </button>
                        ) : null}
                        <button
                          className={styles.secondaryButton}
                          onClick={() => handleDisputeIssue(item.id)}
                          disabled={isBusy}
                        >
                          {actionLabel(
                            `dispute-${item.id}`,
                            item.status === 6 ? "Update Dispute" : "Dispute"
                          )}
                        </button>
                      </>
                    ) : null}
                    {(item.status === 6 || item.status === 7) &&
                    account.address &&
                    isDisputeResolver ? (
                      <div className={styles.resolveActions}>
                        <label className={styles.issueField}>
                          <span className={styles.issueLabel}>Payout %</span>
                          <input
                            className={styles.issueInput}
                            value={resolveClaims[item.id] ?? ""}
                            onChange={(event) =>
                              setResolveClaims((prev) => ({
                                ...prev,
                                [item.id]: event.target.value,
                              }))
                            }
                            placeholder="50"
                          />
                          <span className={styles.issueHelp}>
                            % of reward paid to worker.
                          </span>
                        </label>
                        <label className={styles.issueField}>
                          <span className={styles.issueLabel}>Integrity</span>
                          <input
                            className={styles.issueInput}
                            value={resolveIntegrity[item.id] ?? ""}
                            onChange={(event) =>
                              setResolveIntegrity((prev) => ({
                                ...prev,
                                [item.id]: event.target.value,
                              }))
                            }
                            placeholder="10"
                          />
                        </label>
                        <label className={styles.issueField}>
                          <span className={styles.issueLabel}>Penalty (B)</span>
                          <input
                            className={styles.issueInput}
                            value={resolveSlashing[item.id] ?? ""}
                            onChange={(event) =>
                              setResolveSlashing((prev) => ({
                                ...prev,
                                [item.id]: event.target.value,
                              }))
                            }
                            placeholder="0"
                          />
                        </label>
                        <button
                          className={styles.primaryButton}
                          onClick={() => handleResolveDispute(item.id)}
                          disabled={isBusy}
                        >
                          {actionLabel(
                            `resolve-${item.id}`,
                            item.status === 7 ? "Update Proposal" : "Propose Support"
                          )}
                        </button>
                        {item.status === 7 ? (
                          <button
                            className={styles.secondaryButton}
                            onClick={() => handleFinalizeResolution(item.id)}
                            disabled={isBusy}
                          >
                            {actionLabel(`finalize-${item.id}`, "Finalize Support")}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
