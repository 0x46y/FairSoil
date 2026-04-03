"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { formatUnits } from "viem";
import styles from "../app/page.module.css";
import {
  EMPTY_EVIDENCE_DRAFT,
  buildEvidenceReference,
  type EvidenceDraft,
} from "../lib/evidencePacket";
import type { DisputeFormState } from "../lib/useDisputeFormState";
import type { WorkAgreementItem } from "./WorkAgreementRow";

export function WorkAgreementActionPanel(props: {
  item: WorkAgreementItem;
  accountAddress?: string;
  isDisputeResolver: boolean;
  isDisputeFinalizer: boolean;
  isBusy: boolean;
  disputeState: Pick<
    DisputeFormState,
    | "issueClaims"
    | "setIssueClaims"
    | "issueReasons"
    | "setIssueReasons"
    | "issueEvidenceDrafts"
    | "setIssueEvidenceDrafts"
    | "issueDepositEstimates"
    | "disputeReasons"
    | "setDisputeReasons"
    | "disputeReportTypes"
    | "setDisputeReportTypes"
    | "disputeEvidenceDrafts"
    | "setDisputeEvidenceDrafts"
    | "resolveClaims"
    | "setResolveClaims"
    | "resolveIntegrity"
    | "setResolveIntegrity"
    | "resolveSlashing"
    | "setResolveSlashing"
    | "resolveClaimSummaries"
    | "setResolveClaimSummaries"
    | "resolveRequesterResponses"
    | "setResolveRequesterResponses"
    | "resolveMissingEvidenceNotes"
    | "setResolveMissingEvidenceNotes"
    | "resolveEvidenceUris"
    | "setResolveEvidenceUris"
  >;
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
    isDisputeFinalizer,
    isBusy,
    disputeState,
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
  const {
    issueClaims,
    setIssueClaims,
    issueReasons,
    setIssueReasons,
    issueEvidenceDrafts,
    setIssueEvidenceDrafts,
    issueDepositEstimates,
    disputeReasons,
    setDisputeReasons,
    disputeReportTypes,
    setDisputeReportTypes,
    disputeEvidenceDrafts,
    setDisputeEvidenceDrafts,
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
  } = disputeState;

  const updateEvidenceDraft = (
    setter: Dispatch<SetStateAction<Record<number, EvidenceDraft>>>,
    covenantId: number,
    field: keyof EvidenceDraft,
    value: string
  ) => {
    setter((prev) => ({
      ...prev,
      [covenantId]: {
        ...(prev[covenantId] ?? EMPTY_EVIDENCE_DRAFT),
        [field]: value,
      },
    }));
  };

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
              value={(issueEvidenceDrafts[item.id] ?? EMPTY_EVIDENCE_DRAFT).sourceUrl}
              onChange={(event) =>
                updateEvidenceDraft(setIssueEvidenceDrafts, item.id, "sourceUrl", event.target.value)
              }
              placeholder="https://…"
            />
          </label>
          <label className={styles.issueField}>
            <span className={styles.issueLabel}>Evidence title</span>
            <input
              className={styles.issueInput}
              value={(issueEvidenceDrafts[item.id] ?? EMPTY_EVIDENCE_DRAFT).title}
              onChange={(event) =>
                updateEvidenceDraft(setIssueEvidenceDrafts, item.id, "title", event.target.value)
              }
              placeholder="Photo set / invoice / log bundle"
            />
          </label>
          <label className={styles.issueField}>
            <span className={styles.issueLabel}>Content hash</span>
            <input
              className={styles.issueInput}
              value={(issueEvidenceDrafts[item.id] ?? EMPTY_EVIDENCE_DRAFT).hash}
              onChange={(event) =>
                updateEvidenceDraft(setIssueEvidenceDrafts, item.id, "hash", event.target.value)
              }
              placeholder="bafy… / sha256:…"
            />
          </label>
          <label className={styles.issueField}>
            <span className={styles.issueLabel}>Evidence summary</span>
            <textarea
              className={styles.issueTextarea}
              value={(issueEvidenceDrafts[item.id] ?? EMPTY_EVIDENCE_DRAFT).summary}
              onChange={(event) =>
                updateEvidenceDraft(setIssueEvidenceDrafts, item.id, "summary", event.target.value)
              }
              placeholder="What does this evidence prove?"
            />
            {formatEvidenceLink(
              buildEvidenceReference(
                issueEvidenceDrafts[item.id] ?? EMPTY_EVIDENCE_DRAFT,
                "worker",
                issueReasons[item.id] ?? ""
              )
            ) ? (
              <div className={styles.issuePreview}>
                {formatEvidenceLink(
                  buildEvidenceReference(
                    issueEvidenceDrafts[item.id] ?? EMPTY_EVIDENCE_DRAFT,
                    "worker",
                    issueReasons[item.id] ?? ""
                  )
                )}
              </div>
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
            <span className={styles.issueLabel}>Requester report type</span>
            <select
              className={styles.issueInput}
              value={disputeReportTypes[item.id] ?? "materially-incomplete"}
              onChange={(event) =>
                setDisputeReportTypes((prev) => ({
                  ...prev,
                  [item.id]: event.target.value,
                }))
              }
            >
              <option value="materially-incomplete">Materially incomplete work</option>
              <option value="no-show">No-show</option>
              <option value="false-submission">False submission</option>
              <option value="procedural-failure">Procedural failure</option>
            </select>
            <span className={styles.issueHelp}>
              Use this only for no-show, false submission, materially incomplete work, or repeated procedural failure.
            </span>
            <span className={styles.issueHelp}>
              Do not use this for subjective quality complaints or to punish weak performance on its own.
            </span>
          </label>
          <label className={styles.issueField}>
            <span className={styles.issueLabel}>Misconduct report reason</span>
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
              Opening this report temporarily holds part of the payout. Missing details may fail after 48h.
            </span>
            <span className={styles.issueHelp}>
              The goal is to review documented misconduct fairly. A larger wallet should not decide the outcome.
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
              value={(disputeEvidenceDrafts[item.id] ?? EMPTY_EVIDENCE_DRAFT).sourceUrl}
              onChange={(event) =>
                updateEvidenceDraft(setDisputeEvidenceDrafts, item.id, "sourceUrl", event.target.value)
              }
              placeholder="https://…"
            />
          </label>
          <label className={styles.issueField}>
            <span className={styles.issueLabel}>Evidence title</span>
            <input
              className={styles.issueInput}
              value={(disputeEvidenceDrafts[item.id] ?? EMPTY_EVIDENCE_DRAFT).title}
              onChange={(event) =>
                updateEvidenceDraft(setDisputeEvidenceDrafts, item.id, "title", event.target.value)
              }
              placeholder="Counter evidence bundle"
            />
          </label>
          <label className={styles.issueField}>
            <span className={styles.issueLabel}>Content hash</span>
            <input
              className={styles.issueInput}
              value={(disputeEvidenceDrafts[item.id] ?? EMPTY_EVIDENCE_DRAFT).hash}
              onChange={(event) =>
                updateEvidenceDraft(setDisputeEvidenceDrafts, item.id, "hash", event.target.value)
              }
              placeholder="bafy… / sha256:…"
            />
          </label>
          <label className={styles.issueField}>
            <span className={styles.issueLabel}>Evidence summary</span>
            <textarea
              className={styles.issueTextarea}
              value={(disputeEvidenceDrafts[item.id] ?? EMPTY_EVIDENCE_DRAFT).summary}
              onChange={(event) =>
                updateEvidenceDraft(setDisputeEvidenceDrafts, item.id, "summary", event.target.value)
              }
              placeholder="Why does this evidence change the payout or integrity outcome?"
            />
            {formatEvidenceLink(
              buildEvidenceReference(
                disputeEvidenceDrafts[item.id] ?? EMPTY_EVIDENCE_DRAFT,
                "creator",
                disputeReasons[item.id] ?? ""
              )
            ) ? (
              <div className={styles.issuePreview}>
                {formatEvidenceLink(
                  buildEvidenceReference(
                    disputeEvidenceDrafts[item.id] ?? EMPTY_EVIDENCE_DRAFT,
                    "creator",
                    disputeReasons[item.id] ?? ""
                  )
                )}
              </div>
            ) : null}
            <span className={styles.issueHelp}>
              Evidence is optional, but it can strengthen a refund or penalty review.
            </span>
            <span className={styles.issueHelp}>
              Add the clearest evidence you have. This flow is for documented misconduct, not subjective dissatisfaction.
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
            {actionLabel(
              `dispute-${item.id}`,
              item.status === 6 ? "Update misconduct report" : "Challenge / report misconduct"
            )}
          </button>
        </>
      ) : null}
      {(item.status === 6 || item.status === 7) &&
      accountAddress &&
      (isDisputeResolver || isDisputeFinalizer) ? (
        <div className={styles.resolveActions}>
          {isDisputeResolver ? (
            <>
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
                <span className={styles.issueLabel}>Claim summary (optional)</span>
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
                <span className={styles.issueHelp}>Optional note for the audit record.</span>
              </label>
              <label className={styles.issueField}>
                <span className={styles.issueLabel}>Requester response (optional)</span>
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
                <span className={styles.issueLabel}>Missing evidence / gaps (optional)</span>
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
                <span className={styles.issueLabel}>Arbiter evidence URL (optional)</span>
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
            </>
          ) : null}
          {item.status === 7 ? (
            <button
              className={styles.secondaryButton}
              onClick={() => handleFinalizeResolution(item.id)}
              disabled={isBusy || !isDisputeFinalizer}
            >
              {actionLabel(`finalize-${item.id}`, isDisputeFinalizer ? "Finalize outcome" : "Waiting for finalizer")}
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
