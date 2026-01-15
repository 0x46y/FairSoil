"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { covenantAbi, tokenAAbi, tokenBAbi, treasuryAbi } from "../lib/abi";
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
  body?: string;
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
  const [covenantTokenBAmount, setCovenantTokenBAmount] = useState("250");
  const [covenantIntegrityPoints, setCovenantIntegrityPoints] = useState("50");
  const [covenants, setCovenants] = useState<
    {
      id: number;
      creator: string;
      worker: string;
      tokenBReward: bigint;
      integrityPoints: bigint;
      issueClaimBps: bigint;
      milestoneProgress: bigint;
      status: number;
    }[]
  >([]);
  const [isLoadingCovenants, setIsLoadingCovenants] = useState(false);
  const [issueClaims, setIssueClaims] = useState<Record<number, string>>({});
  const [issueReasons, setIssueReasons] = useState<Record<number, string>>({});
  const [resolveClaims, setResolveClaims] = useState<Record<number, string>>({});
  const [resolveIntegrity, setResolveIntegrity] = useState<Record<number, string>>({});
  const [resolveSlashing, setResolveSlashing] = useState<Record<number, string>>({});
  const [trailItems, setTrailItems] = useState<TrailItem[]>([]);
  const [trailNow, setTrailNow] = useState(() => Date.now());
  const trailIds = useRef(new Set<string>());

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

  const { data: tokenBBalance, refetch: refetchTokenB } = useReadContract({
    address: tokenBAddr,
    abi: tokenBAbi,
    functionName: "balanceOf",
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

  const { data: disputeResolver } = useReadContract({
    address: covenantAddr,
    abi: covenantAbi,
    functionName: "disputeResolver",
    query: {
      enabled: Boolean(covenantAddress),
    },
  });

  const formattedTokenA = useMemo(() => {
    if (tokenABalance === undefined) return "--";
    return Number(formatUnits(tokenABalance, 18)).toFixed(2);
  }, [tokenABalance]);

  const formattedTokenB = useMemo(() => {
    if (tokenBBalance === undefined) return "--";
    return Number(formatUnits(tokenBBalance, 18)).toFixed(2);
  }, [tokenBBalance]);

  const formattedIntegrity = useMemo(() => {
    if (integrityScore === undefined) return "--";
    return integrityScore.toString();
  }, [integrityScore]);

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
          title: `Covenant #${covenantId} created`,
          body: parts.length ? parts.join(" · ") : "Escrow created",
        };
      }
      case "CovenantSubmitted": {
        const covenantId = Number(args.covenantId ?? 0);
        return {
          id,
          timestamp,
          title: `Covenant #${covenantId} submitted`,
          body: `Worker ${safeAddress(args.worker as string | undefined)}`,
        };
      }
      case "CovenantApproved": {
        const covenantId = Number(args.covenantId ?? 0);
        return {
          id,
          timestamp,
          title: `Covenant #${covenantId} approved`,
          body: `Creator ${safeAddress(args.creator as string | undefined)}`,
        };
      }
      case "CovenantRejected": {
        const covenantId = Number(args.covenantId ?? 0);
        return {
          id,
          timestamp,
          title: `Covenant #${covenantId} rejected`,
          body: `Creator ${safeAddress(args.creator as string | undefined)}`,
        };
      }
      case "CovenantCancelled": {
        const covenantId = Number(args.covenantId ?? 0);
        return {
          id,
          timestamp,
          title: `Covenant #${covenantId} cancelled`,
          body: `Creator ${safeAddress(args.creator as string | undefined)}`,
        };
      }
      case "IssueReported": {
        const covenantId = Number(args.covenantId ?? 0);
        const claimPct = formatPercent((args.claimBps ?? 0n) as bigint);
        const reason =
          typeof args.reason === "string" && args.reason.trim().length > 0
            ? `Reason: ${args.reason.trim()}`
            : "Reason not provided";
        return {
          id,
          timestamp,
          title: `Issue reported on covenant #${covenantId}`,
          body: `Worker ${safeAddress(
            args.worker as string | undefined
          )} · Claim ${claimPct}% · ${reason}`,
        };
      }
      case "IssueAccepted": {
        const covenantId = Number(args.covenantId ?? 0);
        const claimPct = formatPercent((args.claimBps ?? 0n) as bigint);
        return {
          id,
          timestamp,
          title: `Issue accepted on covenant #${covenantId}`,
          body: `Claim ${claimPct}% · Creator ${safeAddress(args.creator as string | undefined)}`,
        };
      }
      case "IssueDisputed": {
        const covenantId = Number(args.covenantId ?? 0);
        return {
          id,
          timestamp,
          title: `Issue disputed on covenant #${covenantId}`,
          body: `Creator ${safeAddress(args.creator as string | undefined)}`,
        };
      }
      case "DisputeResolverSet": {
        return {
          id,
          timestamp,
          title: "Dispute resolver updated",
          body: `Resolver ${safeAddress(args.resolver as string | undefined)}`,
        };
      }
      case "MaliceSlashed": {
        const covenantId = Number(args.covenantId ?? 0);
        const penalty = (args.penalty ?? 0n) as bigint;
        return {
          id,
          timestamp,
          title: `Malice slashed on covenant #${covenantId}`,
          body: `Penalty ${formatTokenB(penalty)}`,
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
          body: parts.length ? parts.join(" · ") : "Integrity updated",
        };
      }
      case "UBIClaimed": {
        const amount = (args.amount ?? 0n) as bigint;
        return {
          id,
          timestamp,
          title: "UBI claimed",
          body: `+${formatTokenA(amount)}`,
        };
      }
      case "CovenantSet": {
        return {
          id,
          timestamp,
          title: "Covenant linked to treasury",
          body: `Contract ${safeAddress(args.covenant as string | undefined)}`,
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
            milestoneProgress: data[5] as bigint,
            status: Number(data[6]),
          };
        })
      );
      setCovenants(items);
    } finally {
      setIsLoadingCovenants(false);
    }
  }, [publicClient, covenantAddress]);

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
    await writeContractAsync({
      address: treasuryAddress,
      abi: treasuryAbi,
      functionName: "claimUBI",
    });
    await refetchTokenA();
  };

  const handleReport = async () => {
    if (!treasuryAddress || !taskWorker) return;
    const amount = parseUnits(taskTokenBAmount || "0", 18);
    const points = Number.parseInt(taskIntegrityPoints || "0", 10);
    await writeContractAsync({
      address: treasuryAddress,
      abi: treasuryAbi,
      functionName: "reportTaskCompleted",
      args: [taskWorker, amount, points],
    });
    await Promise.all([refetchTokenB(), refetchIntegrity(), refetchEligibility()]);
  };

  const handleCreateCovenant = async () => {
    if (!covenantAddress || !tokenBAddress || !covenantWorker) return;
    const reward = parseUnits(covenantTokenBAmount || "0", 18);
    const points = Number.parseInt(covenantIntegrityPoints || "0", 10);

    await writeContractAsync({
      address: tokenBAddress,
      abi: tokenBAbi,
      functionName: "approve",
      args: [covenantAddress, reward],
    });

    await writeContractAsync({
      address: covenantAddress,
      abi: covenantAbi,
      functionName: "createCovenant",
      args: [covenantWorker, reward, points],
    });

    await Promise.all([refetchTokenB(), refreshCovenants()]);
  };

  const handleSubmitWork = async (covenantId: number) => {
    if (!covenantAddress) return;
    await writeContractAsync({
      address: covenantAddress,
      abi: covenantAbi,
      functionName: "submitWork",
      args: [BigInt(covenantId)],
    });
    await refreshCovenants();
  };

  const handleApproveWork = async (covenantId: number) => {
    if (!covenantAddress) return;
    await writeContractAsync({
      address: covenantAddress,
      abi: covenantAbi,
      functionName: "approveWork",
      args: [BigInt(covenantId)],
    });
    await Promise.all([refreshCovenants(), refetchTokenB(), refetchIntegrity(), refetchEligibility()]);
  };

  const handleRejectWork = async (covenantId: number) => {
    if (!covenantAddress) return;
    await writeContractAsync({
      address: covenantAddress,
      abi: covenantAbi,
      functionName: "rejectWork",
      args: [BigInt(covenantId)],
    });
    await Promise.all([refreshCovenants(), refetchTokenB()]);
  };

  const handleReportIssue = async (covenantId: number) => {
    if (!covenantAddress) return;
    const claim = issueClaims[covenantId] ?? "0";
    const reason = issueReasons[covenantId] ?? "";
    const claimBps = Math.min(100, Math.max(0, Number(claim)));
    await writeContractAsync({
      address: covenantAddress,
      abi: covenantAbi,
      functionName: "reportIssue",
      args: [BigInt(covenantId), BigInt(claimBps * 100), reason],
    });
    await refreshCovenants();
  };

  const handleAcceptIssue = async (covenantId: number) => {
    if (!covenantAddress) return;
    await writeContractAsync({
      address: covenantAddress,
      abi: covenantAbi,
      functionName: "acceptIssue",
      args: [BigInt(covenantId)],
    });
    await Promise.all([refreshCovenants(), refetchTokenB(), refetchIntegrity(), refetchEligibility()]);
  };

  const handleDisputeIssue = async (covenantId: number) => {
    if (!covenantAddress) return;
    await writeContractAsync({
      address: covenantAddress,
      abi: covenantAbi,
      functionName: "disputeIssue",
      args: [BigInt(covenantId)],
    });
    await refreshCovenants();
  };

  const handleResolveDispute = async (covenantId: number) => {
    if (!covenantAddress) return;
    const payout = resolveClaims[covenantId] ?? "0";
    const payoutPct = Math.min(100, Math.max(0, Number(payout)));
    const integrity = Number.parseInt(resolveIntegrity[covenantId] ?? "0", 10);
    const slashingAmount = resolveSlashing[covenantId] ?? "0";
    const slashingPenalty = parseUnits(slashingAmount, 18);
    await writeContractAsync({
      address: covenantAddress,
      abi: covenantAbi,
      functionName: "resolveDispute",
      args: [BigInt(covenantId), BigInt(payoutPct * 100), BigInt(integrity), slashingPenalty],
    });
    await Promise.all([refreshCovenants(), refetchTokenB(), refetchIntegrity(), refetchEligibility()]);
  };

  const covenantStatusLabels = [
    "Open",
    "Submitted",
    "Approved",
    "Rejected",
    "Cancelled",
    "Issue reported",
    "Issue resolved",
    "Disputed",
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
                disabled={!account.address || missingEnv || isWriting}
              >
                Claim UBI
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
              <p className={styles.metricFootnote}>Decay applies on-chain</p>
            </div>
            <div className={styles.metric}>
              <p className={styles.metricLabel}>Token B assets</p>
              <p className={styles.metricValue}>{formattedTokenB}</p>
              <p className={styles.metricFootnote}>Minted by Treasury</p>
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
            <h3>Task completion</h3>
            <p>
              Report honest outcomes. Early issue reports still earn partial
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
              </label>
              <div className={styles.taskRow}>
                <label className={styles.taskField}>
                  Token B
                  <input
                    className={styles.taskInput}
                    value={taskTokenBAmount}
                    onChange={(event) => setTaskTokenBAmount(event.target.value)}
                    placeholder="500"
                  />
                </label>
                <label className={styles.taskField}>
                  Integrity
                  <input
                    className={styles.taskInput}
                    value={taskIntegrityPoints}
                    onChange={(event) => setTaskIntegrityPoints(event.target.value)}
                    placeholder="100"
                  />
                </label>
              </div>
            </div>
            <button
              className={styles.ghostButton}
              onClick={handleReport}
              disabled={!account.address || missingEnv || isWriting || !taskWorker}
            >
              Report Task (admin)
            </button>
            <p className={styles.taskHint}>
              Requires the owner wallet and a verified primary address.
            </p>
          </article>
          <article className={styles.card}>
            <h3>Soil Treasury</h3>
            <p>
              Daily UBI set at 100 SOILA. Claims reset at 00:00 UTC.
            </p>
            <div className={styles.cardFooter}>
              <span>Next claim window: 03:12</span>
            </div>
          </article>
          <article className={styles.card}>
            <h3>Create covenant</h3>
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
              </label>
              <div className={styles.taskRow}>
                <label className={styles.taskField}>
                  Token B
                  <input
                    className={styles.taskInput}
                    value={covenantTokenBAmount}
                    onChange={(event) => setCovenantTokenBAmount(event.target.value)}
                    placeholder="250"
                  />
                </label>
                <label className={styles.taskField}>
                  Integrity
                  <input
                    className={styles.taskInput}
                    value={covenantIntegrityPoints}
                    onChange={(event) => setCovenantIntegrityPoints(event.target.value)}
                    placeholder="50"
                  />
                </label>
              </div>
            </div>
            <button
              className={styles.ghostButton}
              onClick={handleCreateCovenant}
              disabled={!account.address || missingEnv || isWriting || !covenantWorker}
            >
              Create Covenant (approve + lock)
            </button>
            <p className={styles.taskHint}>
              Approves Token B, then escrows it in the covenant contract.
            </p>
          </article>
        </section>

        <section className={styles.timeline}>
          <div>
            <h2>Recent integrity trail</h2>
            <p>Snapshots of proofs and rewards, summarized for privacy.</p>
          </div>
          <div className={styles.timelineList}>
            {trailItems.length === 0 ? (
              <div className={styles.timelineItem}>
                <span className={styles.timelineTime}>--</span>
                <div>
                  <p className={styles.timelineTitle}>No activity yet</p>
                  <p className={styles.timelineBody}>
                    Covenant and treasury events will appear here.
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
              <h2>Active covenants</h2>
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
              <span>Token B</span>
              <span>Integrity</span>
              <span>Claim</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {covenants.length === 0 ? (
              <div className={styles.covenantRowEmpty}>
                {isLoadingCovenants ? "Loading covenants..." : "No covenants yet."}
              </div>
            ) : (
              covenants.map((item) => (
                <div className={styles.covenantRow} key={`covenant-${item.id}`}>
                  <span>#{item.id}</span>
                  <span>{item.worker.slice(0, 10)}...</span>
                  <span>{Number(formatUnits(item.tokenBReward, 18)).toFixed(2)}</span>
                  <span>{item.integrityPoints.toString()}</span>
                  <span>{Number(item.issueClaimBps) / 100}%</span>
                  <span>{covenantStatusLabels[item.status] ?? "Unknown"}</span>
                  <div className={styles.covenantActions}>
                    {item.status === 0 &&
                    account.address &&
                    item.worker.toLowerCase() === account.address.toLowerCase() ? (
                      <button
                        className={styles.ghostButton}
                        onClick={() => handleSubmitWork(item.id)}
                        disabled={isWriting}
                      >
                        Submit
                      </button>
                    ) : null}
                    {(item.status === 0 || item.status === 1) &&
                    account.address &&
                    item.worker.toLowerCase() === account.address.toLowerCase() ? (
                      <div className={styles.issueActions}>
                        <input
                          className={styles.issueInput}
                          value={issueClaims[item.id] ?? ""}
                          onChange={(event) =>
                            setIssueClaims((prev) => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }))
                          }
                          placeholder="Claim %"
                        />
                        <input
                          className={styles.issueInput}
                          value={issueReasons[item.id] ?? ""}
                          onChange={(event) =>
                            setIssueReasons((prev) => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }))
                          }
                          placeholder="Reason"
                        />
                        <button
                          className={styles.secondaryButton}
                          onClick={() => handleReportIssue(item.id)}
                          disabled={isWriting}
                        >
                          Report Issue
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
                          disabled={isWriting}
                        >
                          Approve
                        </button>
                        <button
                          className={styles.secondaryButton}
                          onClick={() => handleRejectWork(item.id)}
                          disabled={isWriting}
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                    {item.status === 5 &&
                    account.address &&
                    item.creator.toLowerCase() === account.address.toLowerCase() ? (
                      <>
                        <button
                          className={styles.primaryButton}
                          onClick={() => handleAcceptIssue(item.id)}
                          disabled={isWriting}
                        >
                          Accept Issue
                        </button>
                        <button
                          className={styles.secondaryButton}
                          onClick={() => handleDisputeIssue(item.id)}
                          disabled={isWriting}
                        >
                          Dispute
                        </button>
                      </>
                    ) : null}
    {item.status === 7 &&
    account.address &&
    disputeResolver &&
    (disputeResolver as string).toLowerCase() === account.address.toLowerCase() ? (
                      <div className={styles.resolveActions}>
                        <input
                          className={styles.issueInput}
                          value={resolveClaims[item.id] ?? ""}
                          onChange={(event) =>
                            setResolveClaims((prev) => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }))
                          }
                          placeholder="Payout %"
                        />
                        <input
                          className={styles.issueInput}
                          value={resolveIntegrity[item.id] ?? ""}
                          onChange={(event) =>
                            setResolveIntegrity((prev) => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }))
                          }
                          placeholder="Integrity"
                        />
                        <input
                          className={styles.issueInput}
                          value={resolveSlashing[item.id] ?? ""}
                          onChange={(event) =>
                            setResolveSlashing((prev) => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }))
                          }
                          placeholder="Slash B"
                        />
                        <button
                          className={styles.primaryButton}
                          onClick={() => handleResolveDispute(item.id)}
                          disabled={isWriting}
                        >
                          Resolve
                        </button>
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
