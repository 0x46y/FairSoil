import { parseUnits } from "viem";

export type QuoteBreakdownInput = {
  labor: string;
  materials: string;
  referral: string;
  warranty: string;
  other: string;
};

export type ParsedTemplateMetadata = {
  sourceUri: string;
  scopeLabel: string;
  estimatedHours: number;
  materialClass: string;
  urgency: string;
  expectedMin: bigint;
  expectedMax: bigint;
  marketNote: string;
  referralDisclosure: boolean;
  breakdown: QuoteBreakdownInput;
};

export type CovenantTransparencyNote = {
  scopeLabel: string;
  estimatedHours: number;
  materialClass: string;
  urgency: string;
  relatedPartyDisclosure: string;
  marketContext: string;
  breakdown: QuoteBreakdownInput;
};

export type DisputeReviewRecord = {
  workerReason: string;
  workerEvidenceUri: string;
  requesterReason: string;
  requesterEvidenceUri: string;
  arbiterNote: string;
  arbiterEvidenceUri: string;
};

export type ParsedArbiterResolutionNote = {
  claimSummary: string;
  requesterResponse: string;
  missingEvidence: string;
  recommendedPayoutPct: number | null;
  legacyText: string;
};

export const scopeVocabulary = [
  { value: "general", label: "General" },
  { value: "repair", label: "Repair" },
  { value: "delivery", label: "Delivery" },
  { value: "audit", label: "Audit" },
  { value: "tutoring", label: "Tutoring" },
  { value: "education-support", label: "Education support" },
  { value: "care-support", label: "Care support" },
  { value: "emergency-support", label: "Emergency support" },
  { value: "field-ops", label: "Field ops" },
] as const;

export const materialVocabulary = [
  { value: "standard", label: "Standard" },
  { value: "light", label: "Light materials" },
  { value: "specialized", label: "Specialized parts" },
  { value: "scarce", label: "Scarce / regulated" },
] as const;

export const urgencyVocabulary = [
  { value: "normal", label: "Normal" },
  { value: "soon", label: "Soon" },
  { value: "same-day", label: "Same day" },
  { value: "emergency", label: "Emergency" },
] as const;

const safeParseUnits = (value: string, decimals: number) => {
  try {
    return parseUnits(value || "0", decimals);
  } catch {
    return 0n;
  }
};

export const emptyQuoteBreakdown = (): QuoteBreakdownInput => ({
  labor: "",
  materials: "",
  referral: "",
  warranty: "",
  other: "",
});

export const emptyDisputeReviewRecord = (): DisputeReviewRecord => ({
  workerReason: "",
  workerEvidenceUri: "",
  requesterReason: "",
  requesterEvidenceUri: "",
  arbiterNote: "",
  arbiterEvidenceUri: "",
});

export const parseArbiterResolutionNote = (raw: string | null): ParsedArbiterResolutionNote => {
  if (!raw) {
    return {
      claimSummary: "",
      requesterResponse: "",
      missingEvidence: "",
      recommendedPayoutPct: null,
      legacyText: "",
    };
  }
  try {
    const parsed = JSON.parse(raw) as {
      claimSummary?: unknown;
      requesterResponse?: unknown;
      missingEvidence?: unknown;
      recommendedPayoutPct?: unknown;
    };
    return {
      claimSummary: typeof parsed.claimSummary === "string" ? parsed.claimSummary : "",
      requesterResponse: typeof parsed.requesterResponse === "string" ? parsed.requesterResponse : "",
      missingEvidence: typeof parsed.missingEvidence === "string" ? parsed.missingEvidence : "",
      recommendedPayoutPct:
        typeof parsed.recommendedPayoutPct === "number" ? parsed.recommendedPayoutPct : null,
      legacyText: "",
    };
  } catch {
    return {
      claimSummary: "",
      requesterResponse: "",
      missingEvidence: "",
      recommendedPayoutPct: null,
      legacyText: raw,
    };
  }
};

export const normalizeBand = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "unspecified";
  if (value <= 2) return "0-2h";
  if (value <= 8) return "2-8h";
  if (value <= 24) return "8-24h";
  return "24h+";
};

export const normalizeScope = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  const direct = scopeVocabulary.find((entry) => entry.value === normalized);
  if (direct) return direct.value;
  if (normalized.includes("repair") || normalized.includes("plumb") || normalized.includes("fix")) {
    return "repair";
  }
  if (normalized.includes("deliver")) return "delivery";
  if (normalized.includes("audit")) return "audit";
  if (normalized.includes("tutor") || normalized.includes("teach")) return "tutoring";
  if (normalized.includes("education")) return "education-support";
  if (normalized.includes("care")) return "care-support";
  if (normalized.includes("emergency") || normalized.includes("urgent")) return "emergency-support";
  if (normalized.includes("field")) return "field-ops";
  return "general";
};

export const normalizeMaterialClass = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return materialVocabulary.find((entry) => entry.value === normalized)?.value || "standard";
};

export const normalizeUrgency = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return urgencyVocabulary.find((entry) => entry.value === normalized)?.value || "normal";
};

export const scopeLabelFor = (value: string) =>
  scopeVocabulary.find((entry) => entry.value === normalizeScope(value))?.label || "General";

export const materialLabelFor = (value: string) =>
  materialVocabulary.find((entry) => entry.value === normalizeMaterialClass(value))?.label || "Standard";

export const urgencyLabelFor = (value: string) =>
  urgencyVocabulary.find((entry) => entry.value === normalizeUrgency(value))?.label || "Normal";

export const buildMarketKey = (input: {
  scopeLabel: string;
  estimatedHours: number;
  materialClass: string;
  urgency: string;
}) => {
  const scope = normalizeScope(input.scopeLabel);
  if (!scope) return "";
  const urgency = normalizeUrgency(input.urgency);
  const materialClass = normalizeMaterialClass(input.materialClass);
  return `${scope} | ${urgency} | ${materialClass} | ${normalizeBand(input.estimatedHours)}`;
};

export const toQuoteTotal = (value: QuoteBreakdownInput) =>
  safeParseUnits(value.labor, 18) +
  safeParseUnits(value.materials, 18) +
  safeParseUnits(value.referral, 18) +
  safeParseUnits(value.warranty, 18) +
  safeParseUnits(value.other, 18);

export const buildTemplateMetadataValue = (input: {
  sourceUri: string;
  scopeLabel: string;
  estimatedHours: string;
  materialClass: string;
  urgency: string;
  expectedMin: string;
  expectedMax: string;
  marketNote: string;
  referralDisclosure: boolean;
  breakdown: QuoteBreakdownInput;
}) => {
  const hasStructuredFields =
    input.scopeLabel.trim() ||
    input.estimatedHours.trim() ||
    input.materialClass.trim() ||
    input.urgency.trim() ||
    input.marketNote.trim() ||
    input.expectedMin.trim() ||
    input.expectedMax.trim() ||
    Object.values(input.breakdown).some((entry) => entry.trim()) ||
    input.referralDisclosure;

  if (!hasStructuredFields) {
    return input.sourceUri.trim();
  }

  return JSON.stringify({
    version: 1,
    sourceUri: input.sourceUri.trim(),
    scopeLabel: input.scopeLabel.trim(),
    estimatedHours: input.estimatedHours.trim(),
    materialClass: input.materialClass.trim(),
    urgency: input.urgency.trim(),
    expectedMin: input.expectedMin.trim(),
    expectedMax: input.expectedMax.trim(),
    marketNote: input.marketNote.trim(),
    referralDisclosure: input.referralDisclosure,
    breakdown: {
      labor: input.breakdown.labor.trim(),
      materials: input.breakdown.materials.trim(),
      referral: input.breakdown.referral.trim(),
      warranty: input.breakdown.warranty.trim(),
      other: input.breakdown.other.trim(),
    },
  });
};

export const parseTemplateMetadata = (raw: string): ParsedTemplateMetadata => {
  const fallback: ParsedTemplateMetadata = {
    sourceUri: raw,
    scopeLabel: "",
    estimatedHours: 0,
    materialClass: "",
    urgency: "",
    expectedMin: 0n,
    expectedMax: 0n,
    marketNote: "",
    referralDisclosure: false,
    breakdown: emptyQuoteBreakdown(),
  };

  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return fallback;

  try {
    const parsed = JSON.parse(trimmed) as {
      sourceUri?: string;
      scopeLabel?: string;
      estimatedHours?: string | number;
      materialClass?: string;
      urgency?: string;
      expectedMin?: string;
      expectedMax?: string;
      marketNote?: string;
      referralDisclosure?: boolean;
      breakdown?: Partial<QuoteBreakdownInput>;
    };
    return {
      sourceUri: parsed.sourceUri?.trim() || "",
      scopeLabel: normalizeScope(parsed.scopeLabel?.trim() || ""),
      estimatedHours:
        typeof parsed.estimatedHours === "number"
          ? parsed.estimatedHours
          : Number.parseFloat(parsed.estimatedHours || "0") || 0,
      materialClass: normalizeMaterialClass(parsed.materialClass?.trim() || ""),
      urgency: normalizeUrgency(parsed.urgency?.trim() || ""),
      expectedMin: safeParseUnits(parsed.expectedMin || "0", 18),
      expectedMax: safeParseUnits(parsed.expectedMax || "0", 18),
      marketNote: parsed.marketNote?.trim() || "",
      referralDisclosure: Boolean(parsed.referralDisclosure),
      breakdown: {
        labor: parsed.breakdown?.labor?.trim() || "",
        materials: parsed.breakdown?.materials?.trim() || "",
        referral: parsed.breakdown?.referral?.trim() || "",
        warranty: parsed.breakdown?.warranty?.trim() || "",
        other: parsed.breakdown?.other?.trim() || "",
      },
    };
  } catch {
    return fallback;
  }
};

export const emptyTransparencyNote = (): CovenantTransparencyNote => ({
  scopeLabel: "",
  estimatedHours: 0,
  materialClass: "",
  urgency: "",
  relatedPartyDisclosure: "",
  marketContext: "",
  breakdown: emptyQuoteBreakdown(),
});

export const parseTransparencyNote = (raw: string | null): CovenantTransparencyNote => {
  if (!raw) return emptyTransparencyNote();
  try {
    const parsed = JSON.parse(raw) as Partial<CovenantTransparencyNote>;
    return {
      scopeLabel: normalizeScope(parsed.scopeLabel?.trim() || ""),
      estimatedHours:
        typeof (parsed as { estimatedHours?: string | number }).estimatedHours === "number"
          ? ((parsed as { estimatedHours?: number }).estimatedHours ?? 0)
          : Number.parseFloat((parsed as { estimatedHours?: string }).estimatedHours || "0") || 0,
      materialClass: normalizeMaterialClass(
        (parsed as { materialClass?: string }).materialClass?.trim() || ""
      ),
      urgency: normalizeUrgency((parsed as { urgency?: string }).urgency?.trim() || ""),
      relatedPartyDisclosure: parsed.relatedPartyDisclosure?.trim() || "",
      marketContext: parsed.marketContext?.trim() || "",
      breakdown: {
        labor: parsed.breakdown?.labor?.trim() || "",
        materials: parsed.breakdown?.materials?.trim() || "",
        referral: parsed.breakdown?.referral?.trim() || "",
        warranty: parsed.breakdown?.warranty?.trim() || "",
        other: parsed.breakdown?.other?.trim() || "",
      },
    };
  } catch {
    return emptyTransparencyNote();
  }
};
