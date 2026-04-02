"use client";

import { useCallback, useEffect } from "react";
import { type Abi, type PublicClient, parseUnits, zeroAddress } from "viem";
import { covenantAbi, tokenBAbi, treasuryAbi } from "./abi";
import { EMPTY_EVIDENCE_DRAFT, buildEvidenceReference } from "./evidencePacket";
import type { DisputeFormState } from "./useDisputeFormState";

type CovenantItem = {
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
  templateId: bigint;
  paymentToken: number;
  paymentMode: number;
  status: number;
};

export function useCovenantActions(params: {
  covenantAddress?: `0x${string}`;
  tokenBAddress?: `0x${string}`;
  covenantAddr: `0x${string}`;
  tokenBAddr: `0x${string}`;
  treasuryAddr: `0x${string}`;
  publicClient: PublicClient | null | undefined;
  covenants: CovenantItem[];
  disputeState: Pick<
    DisputeFormState,
    | "issueClaims"
    | "issueReasons"
    | "issueEvidenceDrafts"
    | "issueDepositEstimates"
    | "setIssueDepositEstimates"
    | "disputeReasons"
    | "disputeEvidenceDrafts"
    | "resolveClaims"
    | "resolveIntegrity"
    | "resolveSlashing"
    | "resolveClaimSummaries"
    | "resolveRequesterResponses"
    | "resolveMissingEvidenceNotes"
    | "resolveEvidenceUris"
  >;
  hasDefenseQuota: boolean;
  getDepositBreakdown: (deposit: bigint) => { tokenBPart: bigint; integrityPoints: bigint };
  runTransaction: (action: string, fn: () => Promise<`0x${string}`>) => Promise<unknown>;
  writeContractAsync: (variables: {
    address: `0x${string}`;
    abi: Abi | readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }) => Promise<`0x${string}`>;
  postTransactionSync: () => Promise<void>;
  setTxError: (value: string | null) => void;
  setTxSuccess: (value: string | null) => void;
  setTxStatus: (value: "idle" | "signing" | "confirming") => void;
  setTxAction: (value: string | null) => void;
  showSuccess: (message: string) => void;
  formatTxError: (error: unknown) => string;
}) {
  const {
    covenantAddress,
    tokenBAddress,
    covenantAddr,
    tokenBAddr,
    treasuryAddr,
    publicClient,
    covenants,
    disputeState,
    hasDefenseQuota,
    getDepositBreakdown,
    runTransaction,
    writeContractAsync,
    postTransactionSync,
    setTxError,
    setTxSuccess,
    setTxStatus,
    setTxAction,
    showSuccess,
    formatTxError,
  } = params;

  const {
    issueClaims,
    issueReasons,
    issueEvidenceDrafts,
    setIssueDepositEstimates,
    disputeReasons,
    disputeEvidenceDrafts,
    resolveClaims,
    resolveIntegrity,
    resolveSlashing,
    resolveClaimSummaries,
    resolveRequesterResponses,
    resolveMissingEvidenceNotes,
    resolveEvidenceUris,
  } = disputeState;

  const getIssueDeposit = useCallback(
    async (item?: CovenantItem) => {
      if (!item || !publicClient || treasuryAddr === zeroAddress) return 0n;
      let base = item.tokenBReward;
      if (item.paymentToken === 1) {
        try {
          base = (await publicClient.readContract({
            address: treasuryAddr,
            abi: treasuryAbi,
            functionName: "previewCrystallization",
            args: [item.tokenBReward],
          })) as bigint;
        } catch {
          return 0n;
        }
      }
      return (base * 500n) / 10_000n;
    },
    [publicClient, treasuryAddr]
  );

  useEffect(() => {
    if (!publicClient || treasuryAddr === zeroAddress) {
      setIssueDepositEstimates({});
      return;
    }
    let cancelled = false;
    const loadDeposits = async () => {
      const entries = await Promise.all(
        covenants.map(async (item) => {
          let base = item.tokenBReward;
          if (item.paymentToken === 1) {
            try {
              base = (await publicClient.readContract({
                address: treasuryAddr,
                abi: treasuryAbi,
                functionName: "previewCrystallization",
                args: [item.tokenBReward],
              })) as bigint;
            } catch {
              base = 0n;
            }
          }
          const deposit = (base * 500n) / 10_000n;
          return [item.id, deposit] as const;
        })
      );
      if (cancelled) return;
      const next: Record<number, bigint> = {};
      entries.forEach(([id, amount]) => {
        if (amount > 0n) next[id] = amount;
      });
      setIssueDepositEstimates(next);
    };
    void loadDeposits();
    return () => {
      cancelled = true;
    };
  }, [covenants, publicClient, setIssueDepositEstimates, treasuryAddr]);

  const runSimpleCovenantAction = useCallback(
    async (actionKey: string, functionName: string, covenantId: number) => {
      if (!covenantAddress) return;
      try {
        await runTransaction(actionKey, () =>
          writeContractAsync({
            address: covenantAddr,
            abi: covenantAbi,
            functionName,
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
    },
    [
      covenantAddr,
      covenantAddress,
      formatTxError,
      postTransactionSync,
      runTransaction,
      setTxAction,
      setTxError,
      setTxStatus,
      setTxSuccess,
      showSuccess,
      writeContractAsync,
    ]
  );

  const handleSubmitWork = useCallback(
    async (covenantId: number) => runSimpleCovenantAction(`submit-${covenantId}`, "submitWork", covenantId),
    [runSimpleCovenantAction]
  );
  const handleApproveWork = useCallback(
    async (covenantId: number) => runSimpleCovenantAction(`approve-${covenantId}`, "approveWork", covenantId),
    [runSimpleCovenantAction]
  );
  const handleRejectWork = useCallback(
    async (covenantId: number) => runSimpleCovenantAction(`reject-${covenantId}`, "rejectWork", covenantId),
    [runSimpleCovenantAction]
  );
  const handleCancelCovenant = useCallback(
    async (covenantId: number) => runSimpleCovenantAction(`cancel-${covenantId}`, "cancel", covenantId),
    [runSimpleCovenantAction]
  );
  const handleAcceptIssue = useCallback(
    async (covenantId: number) => runSimpleCovenantAction(`accept-issue-${covenantId}`, "acceptIssue", covenantId),
    [runSimpleCovenantAction]
  );
  const handleFinalizeResolution = useCallback(
    async (covenantId: number) => runSimpleCovenantAction(`finalize-${covenantId}`, "finalizeResolution", covenantId),
    [runSimpleCovenantAction]
  );

  const handleReportIssue = useCallback(
    async (covenantId: number) => {
      if (!covenantAddress || !tokenBAddress) return;
      const claim = issueClaims[covenantId] ?? "";
      const reason = issueReasons[covenantId] ?? "";
      const evidenceUri = buildEvidenceReference(
        issueEvidenceDrafts[covenantId] ?? EMPTY_EVIDENCE_DRAFT,
        "worker",
        reason
      );
      if (!claim.trim()) return;
      const parsedClaim = Number(claim);
      if (Number.isNaN(parsedClaim)) return;
      const claimBps = Math.min(100, Math.max(0, parsedClaim));
      const confirmationMessage =
        claimBps === 0
          ? "You are claiming 0% (forfeiting the entire reward). Is this intended?"
          : `You are claiming ${claimBps}% of the reward. Proceed?`;
      if (!window.confirm(confirmationMessage)) return;
      const actionKey = `report-issue-${covenantId}`;
      try {
        const covenantItem = covenants.find((entry) => entry.id === covenantId);
        const deposit = await getIssueDeposit(covenantItem);
        if (deposit > 0n && !hasDefenseQuota) {
          const breakdown = getDepositBreakdown(deposit);
          if (breakdown.tokenBPart > 0n) {
            await runTransaction(`approve-issue-${covenantId}`, () =>
              writeContractAsync({
                address: tokenBAddr,
                abi: tokenBAbi,
                functionName: "approve",
                args: [covenantAddr, breakdown.tokenBPart],
              })
            );
          }
        }
        await runTransaction(actionKey, () =>
          writeContractAsync({
            address: covenantAddr,
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
    },
    [
      covenantAddr,
      covenantAddress,
      covenants,
      formatTxError,
      getDepositBreakdown,
      getIssueDeposit,
      hasDefenseQuota,
      issueClaims,
      issueEvidenceDrafts,
      issueReasons,
      postTransactionSync,
      runTransaction,
      setTxAction,
      setTxError,
      setTxStatus,
      setTxSuccess,
      showSuccess,
      tokenBAddr,
      tokenBAddress,
      writeContractAsync,
    ]
  );

  const handleDisputeIssue = useCallback(
    async (covenantId: number) => {
      if (!covenantAddress || !tokenBAddress) return;
      const reason = disputeReasons[covenantId] ?? "";
      const evidenceUri = buildEvidenceReference(
        disputeEvidenceDrafts[covenantId] ?? EMPTY_EVIDENCE_DRAFT,
        "creator",
        reason
      );
      const actionKey = `dispute-${covenantId}`;
      try {
        const covenantItem = covenants.find((entry) => entry.id === covenantId);
        const deposit = await getIssueDeposit(covenantItem);
        if (deposit > 0n && !hasDefenseQuota) {
          const breakdown = getDepositBreakdown(deposit);
          if (breakdown.tokenBPart > 0n) {
            await runTransaction(`approve-dispute-${covenantId}`, () =>
              writeContractAsync({
                address: tokenBAddr,
                abi: tokenBAbi,
                functionName: "approve",
                args: [covenantAddr, breakdown.tokenBPart],
              })
            );
          }
        }
        await runTransaction(actionKey, () =>
          writeContractAsync({
            address: covenantAddr,
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
    },
    [
      covenantAddr,
      covenantAddress,
      covenants,
      disputeEvidenceDrafts,
      disputeReasons,
      formatTxError,
      getDepositBreakdown,
      getIssueDeposit,
      hasDefenseQuota,
      postTransactionSync,
      runTransaction,
      setTxAction,
      setTxError,
      setTxStatus,
      setTxSuccess,
      showSuccess,
      tokenBAddr,
      tokenBAddress,
      writeContractAsync,
    ]
  );

  const handleResolveDispute = useCallback(
    async (covenantId: number) => {
      if (!covenantAddress) return;
      const payout = resolveClaims[covenantId] ?? "0";
      const payoutPct = Math.min(100, Math.max(0, Number(payout)));
      const integrity = Number.parseInt(resolveIntegrity[covenantId] ?? "0", 10);
      const slashingAmount = resolveSlashing[covenantId] ?? "0";
      const note = JSON.stringify({
        claimSummary: resolveClaimSummaries[covenantId] ?? "",
        requesterResponse: resolveRequesterResponses[covenantId] ?? "",
        missingEvidence: resolveMissingEvidenceNotes[covenantId] ?? "",
        recommendedPayoutPct: payoutPct,
      });
      const evidenceUri = resolveEvidenceUris[covenantId] ?? "";
      const slashingPenalty = parseUnits(slashingAmount, 18);
      const actionKey = `resolve-${covenantId}`;
      try {
        if (note.trim() || evidenceUri.trim()) {
          await runTransaction(`resolve-record-${covenantId}`, () =>
            writeContractAsync({
              address: covenantAddr,
              abi: covenantAbi,
              functionName: "setResolutionRecord",
              args: [BigInt(covenantId), note, evidenceUri],
            })
          );
        }
        await runTransaction(actionKey, () =>
          writeContractAsync({
            address: covenantAddr,
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
    },
    [
      covenantAddr,
      covenantAddress,
      formatTxError,
      postTransactionSync,
      resolveClaimSummaries,
      resolveClaims,
      resolveEvidenceUris,
      resolveIntegrity,
      resolveMissingEvidenceNotes,
      resolveRequesterResponses,
      resolveSlashing,
      runTransaction,
      setTxAction,
      setTxError,
      setTxStatus,
      setTxSuccess,
      showSuccess,
      writeContractAsync,
    ]
  );

  return {
    handleSubmitWork,
    handleApproveWork,
    handleRejectWork,
    handleCancelCovenant,
    handleReportIssue,
    handleAcceptIssue,
    handleDisputeIssue,
    handleResolveDispute,
    handleFinalizeResolution,
  };
}
