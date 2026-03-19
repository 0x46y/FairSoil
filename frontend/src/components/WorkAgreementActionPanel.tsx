"use client";

import type { ReactNode } from "react";
import { formatUnits } from "viem";
import styles from "../app/page.module.css";
import type { StringMapSetter, WorkAgreementItem } from "./WorkAgreementRow";

export function WorkAgreementActionPanel(props: {
  item: WorkAgreementItem;
  accountAddress?: string;
  isDisputeResolver: boolean;
  isBusy: boolean;
  issueClaims: Record<number, string>;
  setIssueClaims: StringMapSetter;
  issueReasons: Record<number, string>;
  setIssueReasons: StringMapSetter;
  issueEvidenceUris: Record<number, string>;
  setIssueEvidenceUris: StringMapSetter;
  issueDepositEstimates: Record<number, bigint>;
  disputeReasons: Record<number, string>;
  setDisputeReasons: StringMapSetter;
  disputeEvidenceUris: Record<number, string>;
  setDisputeEvidenceUris: StringMapSetter;
  resolveClaims: Record<number, string>;
  setResolveClaims: StringMapSetter;
  resolveIntegrity: Record<number, string>;
  setResolveIntegrity: StringMapSetter;
  resolveSlashing: Record<number, string>;
  setResolveSlashing: StringMapSetter;
  resolveClaimSummaries: Record<number, string>;
  setResolveClaimSummaries: StringMapSetter;
  resolveRequesterResponses: Record<number, string>;
  setResolveRequesterResponses: StringMapSetter;
  resolveMissingEvidenceNotes: Record<number, string>;
  setResolveMissingEvidenceNotes: StringMapSetter;
  resolveEvidenceUris: Record<number, string>;
  setResolveEvidenceUris: StringMapSetter;
  formatEvidenceLink: (value: unknown) => ReactNode;
  renderDepositBreakdown: (deposit: bigint, isActor: boolean) => ReactNode;
  isSelf: (target: string) => boolean;
  actionLabel: (key: string, label: string) => string;
  handleCancelCovenant: (covenantId: number) => void;
  handleSubmitWork: (covenantId: number) => void;
  handleReportIssue: (covenantId: number) => void;
  handleApproveWork: (covenantId: number) => void;
  handleRejectWork: (covenantId: number) => void;
  handleAcceptIssue: (covenantId: number) => void;
  handleDisputeIssue: (covenantId: number) => void;
  handleResolveDispute: (covenantId: number) => void;
  handleFinalizeResolution: (covenantId: number) => void;
}) {
  const {
    item,
    accountAddress,
    isDisputeResolver,
    isBusy,
    issueClaims,
    setIssueClaims,
    issueReasons,
    setIssueReasons,
    issueEvidenceUris,
    setIssueEvidenceUris,
    issueDepositEstimates,
    disputeReasons,
    setDisputeReasons,
    disputeEvidenceUris,
    setDisputeEvidenceUris,
    resolveClaims,
    setResolveClaims,
    resolveIntegrity,
    setResolveIntegrity,
    resolveSlashing,
    setResolveSlashing,
    resolveClaimSummaries,
    setResolveClaimSummaries,
    resolveRequesterResponses,
    setResolveRequesterResponses,
    resolveMissingEvidenceNotes,
    setResolveMissingEvidenceNotes,
    resolveEvidenceUris,
    setResolveEvidenceUris,
    formatEvidenceLink,
    renderDepositBreakdown,
    isSelf,
    actionLabel,
    handleCancelCovenant,
    handleSubmitWork,
    handleReportIssue,
    handleApproveWork,
    handleRejectWork,
    handleAcceptIssue,
    handleDisputeIssue,
    handleResolveDispute,
    handleFinalizeResolution,
  } = props;

  return (
    <>
      {item.status === 0 && accountAddress && item.creator.toLowerCase() === accountAddress.toLowerCase() ? (
        <button
          className={`${styles.secondaryButton} ${styles.covenantActionPrimary}`}
          onClick={() => handleCancelCovenant(item.id)}
          disabled={isBusy}
        >
          {actionLabel(`cancel-${item.id}`, "Cancel and refund")}
        </button>
      ) : null}
      {item.status === 0 && accountAddress && item.worker.toLowerCase() === accountAddress.toLowerCase() ? (
        <button
          className={`${styles.ghostButton} ${styles.covenantActionPrimary}`}
          onClick={() => handleSubmitWork(item.id)}
          disabled={isBusy}
        >
          {actionLabel(`submit-${item.id}`, "Submit work")}
        </button>
      ) : null}
      {(item.status === 0 || item.status === 1 || item.status === 5) &&
      accountAddress &&
      item.worker.toLowerCase() === accountAddress.toLowerCase() ? (
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
            <span className={styles.issueHelp}>Percent of the reward the worker says should still be paid.</span>
            {issueDepositEstimates[item.id] ? (
              <>
                <span className={styles.issueHelp}>
                  Issue deposit: {Number(formatUnits(issueDepositEstimates[item.id], 18)).toFixed(2)} SOILB (5%)
                </span>
                {renderDepositBreakdown(issueDepositEstimates[item.id], isSelf(item.worker))}
              </>
            ) : null}
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
              placeholder="Explain what problem happened"
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
              placeholder="https://…"
            />
            {formatEvidenceLink(issueEvidenceUris[item.id]) ? (
              <div className={styles.issuePreview}>{formatEvidenceLink(issueEvidenceUris[item.id])}</div>
            ) : null}
          </label>
          <button
            className={styles.secondaryButton}
            onClick={() => handleReportIssue(item.id)}
            disabled={isBusy || (issueClaims[item.id] ?? "").trim() === ""}
          >
            {actionLabel(`report-issue-${item.id}`, item.status === 5 ? "Update help request" : "Ask for help")}
          </button>
        </div>
      ) : null}
      {item.status === 1 && accountAddress && item.creator.toLowerCase() === accountAddress.toLowerCase() ? (
        <>
          <button
            className={`${styles.primaryButton} ${styles.covenantActionPrimary}`}
            onClick={() => handleApproveWork(item.id)}
            disabled={isBusy}
          >
            {actionLabel(`approve-${item.id}`, "Approve work")}
          </button>
          <button
            className={styles.secondaryButton}
            onClick={() => handleRejectWork(item.id)}
            disabled={isBusy}
          >
            {actionLabel(`reject-${item.id}`, "Reject work")}
          </button>
        </>
      ) : null}
      {(item.status === 5 || item.status === 6) &&
      accountAddress &&
      item.creator.toLowerCase() === accountAddress.toLowerCase() ? (
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
              placeholder="Explain why you disagree with the worker claim"
            />
            <span className={styles.issueHelp}>
              Opening a dispute temporarily holds part of the payout. Missing details may fail after 48h.
            </span>
            <span className={styles.issueHelp}>
              The goal is to review the evidence fairly. A larger wallet should not decide the outcome.
            </span>
            {issueDepositEstimates[item.id] ? (
              <>
                <span className={styles.issueHelp}>
                  Dispute deposit: {Number(formatUnits(issueDepositEstimates[item.id], 18)).toFixed(2)} SOILB (5%)
                </span>
                {renderDepositBreakdown(issueDepositEstimates[item.id], isSelf(item.creator))}
              </>
            ) : null}
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
              placeholder="https://…"
            />
            {formatEvidenceLink(disputeEvidenceUris[item.id]) ? (
              <div className={styles.issuePreview}>{formatEvidenceLink(disputeEvidenceUris[item.id])}</div>
            ) : null}
            <span className={styles.issueHelp}>
              Evidence is optional, but it can increase the maximum refundable amount.
            </span>
            <span className={styles.issueHelp}>
              Add the clearest evidence you have. The dispute arbiter is expected to judge the record, not the wallet size.
            </span>
          </label>
          {item.status === 5 ? (
            <button
              className={`${styles.primaryButton} ${styles.covenantActionPrimary}`}
              onClick={() => handleAcceptIssue(item.id)}
              disabled={isBusy}
            >
              {actionLabel(`accept-issue-${item.id}`, "Accept worker claim")}
            </button>
          ) : null}
          <button
            className={styles.secondaryButton}
            onClick={() => handleDisputeIssue(item.id)}
            disabled={isBusy}
          >
            {actionLabel(`dispute-${item.id}`, item.status === 6 ? "Update dispute" : "Challenge claim")}
          </button>
        </>
      ) : null}
      {(item.status === 6 || item.status === 7) && accountAddress && isDisputeResolver ? (
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
            <span className={styles.issueHelp}>Percent of the reward that should go to the worker.</span>
          </label>
          <label className={styles.issueField}>
            <span className={styles.issueLabel}>Trust score</span>
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
            <span className={styles.issueLabel}>Penalty in Token B</span>
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
          <label className={styles.issueField}>
            <span className={styles.issueLabel}>Claim summary</span>
            <textarea
              className={styles.issueTextarea}
              value={resolveClaimSummaries[item.id] ?? ""}
              onChange={(event) =>
                setResolveClaimSummaries((prev) => ({
                  ...prev,
                  [item.id]: event.target.value,
                }))
              }
              placeholder="Summarize what the worker is asking for"
            />
            <span className={styles.issueHelp}>This becomes part of the on-chain arbiter note.</span>
          </label>
          <label className={styles.issueField}>
            <span className={styles.issueLabel}>Requester response</span>
            <textarea
              className={styles.issueTextarea}
              value={resolveRequesterResponses[item.id] ?? ""}
              onChange={(event) =>
                setResolveRequesterResponses((prev) => ({
                  ...prev,
                  [item.id]: event.target.value,
                }))
              }
              placeholder="Summarize the requester response and strongest counterpoint"
            />
          </label>
          <label className={styles.issueField}>
            <span className={styles.issueLabel}>Missing evidence / gaps</span>
            <textarea
              className={styles.issueTextarea}
              value={resolveMissingEvidenceNotes[item.id] ?? ""}
              onChange={(event) =>
                setResolveMissingEvidenceNotes((prev) => ({
                  ...prev,
                  [item.id]: event.target.value,
                }))
              }
              placeholder="What is still missing, unclear, or contradictory?"
            />
          </label>
          <label className={styles.issueField}>
            <span className={styles.issueLabel}>Arbiter evidence URL</span>
            <input
              className={`${styles.issueInput} ${styles.issueInputWide}`}
              value={resolveEvidenceUris[item.id] ?? ""}
              onChange={(event) =>
                setResolveEvidenceUris((prev) => ({
                  ...prev,
                  [item.id]: event.target.value,
                }))
              }
              placeholder="https://…"
            />
            {formatEvidenceLink(resolveEvidenceUris[item.id]) ? (
              <div className={styles.issuePreview}>{formatEvidenceLink(resolveEvidenceUris[item.id])}</div>
            ) : null}
          </label>
          <button
            className={`${styles.primaryButton} ${styles.covenantActionPrimary}`}
            onClick={() => handleResolveDispute(item.id)}
            disabled={isBusy}
          >
            {actionLabel(`resolve-${item.id}`, item.status === 7 ? "Update proposal" : "Propose outcome")}
          </button>
          {item.status === 7 ? (
            <button
              className={styles.secondaryButton}
              onClick={() => handleFinalizeResolution(item.id)}
              disabled={isBusy}
            >
              {actionLabel(`finalize-${item.id}`, "Finalize outcome")}
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
