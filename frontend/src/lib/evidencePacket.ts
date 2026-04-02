"use client";

export type EvidenceDraft = {
  sourceUrl: string;
  hash: string;
  title: string;
  summary: string;
};

export type EvidencePacket = {
  version: 1;
  title?: string;
  summary?: string;
  sourceUrl?: string;
  contentHash?: string;
  role: "worker" | "creator";
  reason?: string;
  capturedAt: string;
};

export const EMPTY_EVIDENCE_DRAFT: EvidenceDraft = {
  sourceUrl: "",
  hash: "",
  title: "",
  summary: "",
};

export const decodeEvidencePacket = (value: string): EvidencePacket | null => {
  if (!value.startsWith("data:application/json,")) return null;
  try {
    const payload = decodeURIComponent(value.slice("data:application/json,".length));
    return JSON.parse(payload) as EvidencePacket;
  } catch {
    return null;
  }
};

export const buildEvidenceReference = (
  draft: EvidenceDraft,
  role: EvidencePacket["role"],
  reason: string
) => {
  const sourceUrl = draft.sourceUrl.trim();
  const hash = draft.hash.trim();
  const title = draft.title.trim();
  const summary = draft.summary.trim();
  const normalizedReason = reason.trim();

  if (!sourceUrl && !hash && !title && !summary && !normalizedReason) return "";
  if (sourceUrl && !hash && !title && !summary && !normalizedReason) return sourceUrl;

  const packet: EvidencePacket = {
    version: 1,
    role,
    capturedAt: new Date().toISOString(),
  };

  if (sourceUrl) packet.sourceUrl = sourceUrl;
  if (hash) packet.contentHash = hash;
  if (title) packet.title = title;
  if (summary) packet.summary = summary;
  if (normalizedReason) packet.reason = normalizedReason;

  return `data:application/json,${encodeURIComponent(JSON.stringify(packet))}`;
};
