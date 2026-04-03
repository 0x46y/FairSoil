"use client";

import { useState } from "react";
import type { EvidenceDraft } from "./evidencePacket";
import type { DisputeReviewRecord } from "./marketVocabulary";

export function useDisputeFormState() {
  const [issueClaims, setIssueClaims] = useState<Record<number, string>>({});
  const [issueReasons, setIssueReasons] = useState<Record<number, string>>({});
  const [issueEvidenceDrafts, setIssueEvidenceDrafts] = useState<Record<number, EvidenceDraft>>({});
  const [issueDepositEstimates, setIssueDepositEstimates] = useState<Record<number, bigint>>({});
  const [disputeReasons, setDisputeReasons] = useState<Record<number, string>>({});
  const [disputeReportTypes, setDisputeReportTypes] = useState<Record<number, string>>({});
  const [disputeEvidenceDrafts, setDisputeEvidenceDrafts] = useState<Record<number, EvidenceDraft>>({});
  const [resolveClaims, setResolveClaims] = useState<Record<number, string>>({});
  const [resolveIntegrity, setResolveIntegrity] = useState<Record<number, string>>({});
  const [resolveSlashing, setResolveSlashing] = useState<Record<number, string>>({});
  const [resolveClaimSummaries, setResolveClaimSummaries] = useState<Record<number, string>>({});
  const [resolveRequesterResponses, setResolveRequesterResponses] = useState<Record<number, string>>({});
  const [resolveMissingEvidenceNotes, setResolveMissingEvidenceNotes] = useState<Record<number, string>>({});
  const [resolveEvidenceUris, setResolveEvidenceUris] = useState<Record<number, string>>({});
  const [disputeReviewRecords, setDisputeReviewRecords] = useState<Record<number, DisputeReviewRecord>>({});

  return {
    issueClaims,
    setIssueClaims,
    issueReasons,
    setIssueReasons,
    issueEvidenceDrafts,
    setIssueEvidenceDrafts,
    issueDepositEstimates,
    setIssueDepositEstimates,
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
    disputeReviewRecords,
    setDisputeReviewRecords,
  };
}

export type DisputeFormState = ReturnType<typeof useDisputeFormState>;
