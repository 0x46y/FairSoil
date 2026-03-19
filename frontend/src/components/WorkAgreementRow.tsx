"use client";

import type { ReactNode } from "react";
import { formatUnits } from "viem";
import styles from "../app/page.module.css";
import {
  type CovenantTransparencyNote,
  type DisputeReviewRecord,
  emptyDisputeReviewRecord,
  emptyTransparencyNote,
  parseArbiterResolutionNote,
} from "../lib/marketVocabulary";
import type { DisputeFormState } from "../lib/useDisputeFormState";
import { WorkAgreementActionPanel } from "./WorkAgreementActionPanel";

export type WorkAgreementTemplateItem = {
  id: number;
  creator: string;
  royaltyBps: bigint;
  metadataUri: string;
  active: boolean;
  createdAt: bigint;
  effectiveRoyaltyBps: bigint;
};

export type WorkAgreementItem = {
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

export type WorkAgreementTrailItem = {
  id: string;
  timestamp: number;
  title: string;
  body?: ReactNode;
};

export function WorkAgreementRow(props: {
  item: WorkAgreementItem;
  accountAddress?: string;
  isDisputeResolver: boolean;
  externalAdjudicationUrl?: string;
  templateById: Map<number, WorkAgreementTemplateItem>;
  covenantStatusLabels: string[];
  covenantTagMap: Record<string, string>;
  covenantTransparencyMap: Record<string, CovenantTransparencyNote>;
  disputeReviewRecords: Record<number, DisputeReviewRecord>;
  reputationRingNotes: Record<number, string[]>;
  reviewPriorityNotes: Record<number, string[]>;
  trailItems: WorkAgreementTrailItem[];
  trailNow: number;
  locale: string;
  disputeSteps: readonly string[];
  isBusy: boolean;
  disputeState: Pick<
    DisputeFormState,
    | "issueClaims"
    | "setIssueClaims"
    | "issueReasons"
    | "setIssueReasons"
    | "issueEvidenceUris"
    | "setIssueEvidenceUris"
    | "issueDepositEstimates"
    | "disputeReasons"
    | "setDisputeReasons"
    | "disputeEvidenceUris"
    | "setDisputeEvidenceUris"
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
  formatPercent: (bps: bigint) => string;
  nextStepForCovenant: (item: WorkAgreementItem, account: string | undefined, isDisputeResolver: boolean) => string;
  getDisputeStage: (status: number) => boolean[];
  disputeStatusLabel: (status: number) => string;
  buildExternalAdjudicationLink: (base: string | undefined, covenantId: number) => string | null;
  formatEvidenceLink: (value: unknown) => ReactNode;
  formatRelativeTime: (timestamp: number, now: number, locale: string) => string;
  disputeReviewLabel: (title: string) => string;
  simplifyAuditTitle: (title: string) => string;
  auditCategoryForTitle: (title: string) => string;
  trailMatchesCovenant: (item: WorkAgreementTrailItem, covenantId: number) => boolean;
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
  STATUS_DISPUTED: number;
}) {
  const {
    item,
    accountAddress,
    isDisputeResolver,
    externalAdjudicationUrl,
    templateById,
    covenantStatusLabels,
    covenantTagMap,
    covenantTransparencyMap,
    disputeReviewRecords,
    reputationRingNotes,
    reviewPriorityNotes,
    trailItems,
    trailNow,
    locale,
    disputeSteps,
    isBusy,
    disputeState,
    formatPercent,
    nextStepForCovenant,
    getDisputeStage,
    disputeStatusLabel,
    buildExternalAdjudicationLink,
    formatEvidenceLink,
    formatRelativeTime,
    disputeReviewLabel,
    simplifyAuditTitle,
    auditCategoryForTitle,
    trailMatchesCovenant,
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
    STATUS_DISPUTED,
  } = props;

  const transparencyNote = covenantTransparencyMap[String(item.id)] ?? emptyTransparencyNote();
  const disputeReviewRecord = disputeReviewRecords[item.id] ?? emptyDisputeReviewRecord();
  const parsedArbiterNote = parseArbiterResolutionNote(disputeReviewRecord.arbiterNote);
  const relationWarnings = reputationRingNotes[item.id] ?? [];
  const reviewPriorityWarnings = reviewPriorityNotes[item.id] ?? [];
  const disputeReviewTimeline = trailItems
    .filter((trailItem) => trailMatchesCovenant(trailItem, item.id))
    .filter((trailItem) => {
      const category = auditCategoryForTitle(trailItem.title);
      return category === "dispute" || category === "covenant";
    })
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-5);
  const reviewChecklist = [
    item.status >= 5
      ? "Check what the worker originally asked for, including payout % and the reason given."
      : "Confirm the work scope and expected payout before taking action.",
    item.status >= STATUS_DISPUTED
      ? "Compare the requester response against the worker evidence. Look for missing dates or gaps."
      : "Ask whether the requester has answered the help request yet.",
    relationWarnings.length > 0
      ? "Review repeated-pair or related-party warnings before trusting reputation at face value."
      : "Use integrity only as a supporting signal after reading the evidence.",
    transparencyNote.marketContext
      ? "Check whether the market note actually explains the quoted price difference."
      : "If the quote looks unusual, ask for market context and a visible cost breakdown.",
  ];

  return (
    <div className={styles.covenantRow} key={`covenant-${item.id}`}>
      <div className={styles.covenantCell}>
        <span className={styles.covenantCellLabel}>Agreement</span>
        <span className={styles.covenantCellValue}>#{item.id}</span>
        {transparencyNote.scopeLabel ? (
          <span className={styles.covenantTags}>{transparencyNote.scopeLabel}</span>
        ) : null}
      </div>
      <div className={styles.covenantCell}>
        <span className={styles.covenantCellLabel}>Worker</span>
        <span className={`${styles.covenantCellValue} ${styles.covenantWorkerValue}`}>
          {item.worker.slice(0, 10)}…
        </span>
      </div>
      <div className={styles.covenantCell}>
        <span className={styles.covenantCellLabel}>Reward</span>
        <span className={styles.covenantCellValue}>
          {Number(formatUnits(item.tokenBReward, 18)).toFixed(2)} {item.paymentToken === 1 ? "SOILA" : "SOILB"}
        </span>
      </div>
      <div className={styles.covenantCell}>
        <span className={styles.covenantCellLabel}>Royalty</span>
        <span className={styles.covenantCellValue}>
          {item.templateId > 0n
            ? (() => {
                const template = templateById.get(Number(item.templateId));
                if (!template) return "--";
                return `${formatPercent(template.royaltyBps)}% → ${formatPercent(template.effectiveRoyaltyBps)}%`;
              })()
            : "--"}
        </span>
      </div>
      <div className={styles.covenantCell}>
        <span className={styles.covenantCellLabel}>Integrity</span>
        <span className={styles.covenantCellValue}>{item.integrityPoints.toString()}</span>
      </div>
      <div className={styles.covenantCell}>
        <span className={styles.covenantCellLabel}>Claim</span>
        <span className={styles.covenantCellValue}>{Number(item.issueClaimBps) / 100}%</span>
      </div>
      <div className={styles.covenantCell}>
        <span className={styles.covenantCellLabel}>Status</span>
        <span>
          <span className={styles.statusBadge}>{covenantStatusLabels[item.status] ?? "Unknown"}</span>
          <span className={styles.statusNote}>
            {nextStepForCovenant(item, accountAddress, isDisputeResolver)}
          </span>
          {covenantTagMap[String(item.id)] ? (
            <span className={styles.covenantTags}>{covenantTagMap[String(item.id)]}</span>
          ) : null}
          {transparencyNote.relatedPartyDisclosure ? (
            <span className={styles.statusNote}>
              Related parties: {transparencyNote.relatedPartyDisclosure}
            </span>
          ) : null}
          {transparencyNote.marketContext ? (
            <span className={styles.statusNote}>Market note: {transparencyNote.marketContext}</span>
          ) : null}
          {relationWarnings.length > 0 ? (
            <span className={styles.warningInlineGroup}>
              {relationWarnings.map((warning) => (
                <span key={`${item.id}-${warning}`} className={styles.warningPill}>
                  {warning}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      </div>
      <div className={styles.covenantActions}>
        {item.status >= 5 ? (
          <div className={styles.disputeTrack}>
            {disputeSteps.map((label, index) => {
              const stage = getDisputeStage(item.status);
              const active = stage[index];
              return (
                <span
                  key={`${item.id}-${label}`}
                  className={`${styles.disputeStep} ${active ? styles.disputeStepActive : ""}`}
                >
                  {label}
                </span>
              );
            })}
            <p className={styles.disputeHint}>
              {disputeStatusLabel(item.status)}
              <span className={styles.disputeSubhint}>
                The dispute arbiter first proposes an outcome, then finalizes it. High-value cases can
                still route to outside adjudication.
              </span>
              <span className={styles.disputeSubhintStrong}>
                The arbiter should review the evidence and timeline, not the wallet size.
              </span>
              {externalAdjudicationUrl ? (
                <span className={styles.disputeSubhint}>
                  <a
                    className={styles.timelineLink}
                    href={buildExternalAdjudicationLink(externalAdjudicationUrl, item.id) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open external adjudication
                  </a>
                </span>
              ) : null}
              {!isDisputeResolver ? (
                <span className={styles.disputeSubhint}>
                  If this is a high-value case, the final answer may wait for the outside review.
                </span>
              ) : null}
            </p>
            <div className={styles.disputeReviewGrid}>
              <div className={styles.disputeReviewCard}>
                <p className={styles.disputeReviewKicker}>Recent dispute record</p>
                <div className={styles.disputeEvidenceGrid}>
                  <div className={styles.disputeEvidenceCard}>
                    <span className={styles.inlinePill}>Worker</span>
                    <p className={styles.disputeEvidenceText}>
                      {disputeReviewRecord.workerReason || "No worker note saved yet."}
                    </p>
                    {formatEvidenceLink(disputeReviewRecord.workerEvidenceUri) ? (
                      <div className={styles.issuePreview}>
                        {formatEvidenceLink(disputeReviewRecord.workerEvidenceUri)}
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.disputeEvidenceCard}>
                    <span className={styles.inlinePill}>Requester</span>
                    <p className={styles.disputeEvidenceText}>
                      {disputeReviewRecord.requesterReason || "No requester challenge saved yet."}
                    </p>
                    {formatEvidenceLink(disputeReviewRecord.requesterEvidenceUri) ? (
                      <div className={styles.issuePreview}>
                        {formatEvidenceLink(disputeReviewRecord.requesterEvidenceUri)}
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.disputeEvidenceCard}>
                    <span className={styles.inlinePill}>Arbiter</span>
                    {parsedArbiterNote.legacyText ? (
                      <p className={styles.disputeEvidenceText}>{parsedArbiterNote.legacyText}</p>
                    ) : (
                      <div className={styles.disputeStructuredNote}>
                        <p className={styles.disputeEvidenceText}>
                          <strong>Claim summary:</strong> {parsedArbiterNote.claimSummary || "Not filled yet."}
                        </p>
                        <p className={styles.disputeEvidenceText}>
                          <strong>Requester response:</strong> {parsedArbiterNote.requesterResponse || "Not filled yet."}
                        </p>
                        <p className={styles.disputeEvidenceText}>
                          <strong>Missing evidence:</strong> {parsedArbiterNote.missingEvidence || "Not filled yet."}
                        </p>
                        <p className={styles.disputeEvidenceText}>
                          <strong>Recommended payout:</strong> {parsedArbiterNote.recommendedPayoutPct ?? "Not set yet"}%
                        </p>
                      </div>
                    )}
                    {formatEvidenceLink(disputeReviewRecord.arbiterEvidenceUri) ? (
                      <div className={styles.issuePreview}>
                        {formatEvidenceLink(disputeReviewRecord.arbiterEvidenceUri)}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className={styles.disputeReviewList}>
                  {disputeReviewTimeline.length === 0 ? (
                    <div className={styles.disputeReviewItem}>
                      <div>
                        <p className={styles.disputeReviewTitle}>No dispute record yet</p>
                        <p className={styles.disputeReviewBody}>
                          Once a help request, challenge, or proposal is logged, it will appear here in plain order.
                        </p>
                      </div>
                    </div>
                  ) : (
                    disputeReviewTimeline.map((trailItem) => (
                      <div key={`review-${item.id}-${trailItem.id}`} className={styles.disputeReviewItem}>
                        <span className={styles.disputeReviewTime}>
                          {formatRelativeTime(trailItem.timestamp, trailNow, locale)}
                        </span>
                        <div>
                          <p className={styles.disputeReviewTitle}>{disputeReviewLabel(trailItem.title)}</p>
                          <p className={styles.disputeReviewBody}>
                            {trailItem.body || simplifyAuditTitle(trailItem.title)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className={styles.disputeReviewCard}>
                <p className={styles.disputeReviewKicker}>What to review next</p>
                <div className={styles.disputeChecklist}>
                  {reviewChecklist.map((note) => (
                    <p key={`${item.id}-${note}`} className={styles.disputeChecklistItem}>
                      {note}
                    </p>
                  ))}
                </div>
                {(item.status === 7 || item.status === 8) && (
                  <div className={styles.disputeOutcomeCard}>
                    <span className={styles.inlinePill}>Latest arbiter plan</span>
                    <p className={styles.disputeOutcomeText}>
                      Worker payout: {Number(item.proposedWorkerPayoutBps) / 100}% · Integrity:{" "}
                      {item.proposedIntegrityPoints.toString()} · Penalty:{" "}
                      {Number(formatUnits(item.proposedSlashingPenalty, 18)).toFixed(2)} SOILB
                    </p>
                  </div>
                )}
                {transparencyNote.relatedPartyDisclosure || transparencyNote.marketContext ? (
                  <div className={styles.disputeMetaBlock}>
                    {transparencyNote.relatedPartyDisclosure ? (
                      <p className={styles.disputeMetaLine}>
                        <strong>Related parties:</strong> {transparencyNote.relatedPartyDisclosure}
                      </p>
                    ) : null}
                    {transparencyNote.marketContext ? (
                      <p className={styles.disputeMetaLine}>
                        <strong>Market context:</strong> {transparencyNote.marketContext}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {relationWarnings.length > 0 ? (
                  <div className={styles.warningInlineGroup}>
                    {relationWarnings.map((warning) => (
                      <span key={`review-warning-${item.id}-${warning}`} className={styles.warningPill}>
                        {warning}
                      </span>
                    ))}
                  </div>
                ) : null}
                {reviewPriorityWarnings.length > 0 ? (
                  <div className={styles.warningInlineGroup}>
                    {reviewPriorityWarnings.map((warning) => (
                      <span key={`priority-warning-${item.id}-${warning}`} className={styles.warningPill}>
                        {warning}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        <WorkAgreementActionPanel
          item={item}
          accountAddress={accountAddress}
          isDisputeResolver={isDisputeResolver}
          isBusy={isBusy}
          disputeState={disputeState}
          formatEvidenceLink={formatEvidenceLink}
          renderDepositBreakdown={renderDepositBreakdown}
          isSelf={isSelf}
          actionLabel={actionLabel}
          handleCancelCovenant={handleCancelCovenant}
          handleSubmitWork={handleSubmitWork}
          handleReportIssue={handleReportIssue}
          handleApproveWork={handleApproveWork}
          handleRejectWork={handleRejectWork}
          handleAcceptIssue={handleAcceptIssue}
          handleDisputeIssue={handleDisputeIssue}
          handleResolveDispute={handleResolveDispute}
          handleFinalizeResolution={handleFinalizeResolution}
        />
      </div>
    </div>
  );
}
