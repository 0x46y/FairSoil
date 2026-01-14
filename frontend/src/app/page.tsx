"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
      status: number;
    }[]
  >([]);
  const [isLoadingCovenants, setIsLoadingCovenants] = useState(false);

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
            status: Number(data[4]),
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

  const covenantStatusLabels = ["Open", "Submitted", "Approved", "Rejected", "Cancelled"];

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
            <div className={styles.timelineItem}>
              <span className={styles.timelineTime}>Now</span>
              <div>
                <p className={styles.timelineTitle}>UBI claimed</p>
                <p className={styles.timelineBody}>+100 SOILA · proof logged</p>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <span className={styles.timelineTime}>2h ago</span>
              <div>
                <p className={styles.timelineTitle}>Task completed</p>
                <p className={styles.timelineBody}>+1 SOILB · +40 integrity</p>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <span className={styles.timelineTime}>Yesterday</span>
              <div>
                <p className={styles.timelineTitle}>Issue reported</p>
                <p className={styles.timelineBody}>
                  Partial reward issued · process verified
                </p>
              </div>
            </div>
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
