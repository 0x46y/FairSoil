"use client";

import { useMemo } from "react";
import {
  type CovenantTransparencyNote,
  type DisputeReviewRecord,
  buildMarketKey,
  emptyDisputeReviewRecord,
  emptyTransparencyNote,
  normalizeBand,
  parseArbiterResolutionNote,
  parseTemplateMetadata,
  toQuoteTotal,
} from "./marketVocabulary";

type DashboardView = "participant" | "operator";

type TemplateItem = {
  id: number;
  creator: string;
  metadataUri: string;
};

type CovenantItem = {
  id: number;
  creator: string;
  worker: string;
  tokenBReward: bigint;
  templateId: bigint;
  status: number;
};

type ScopeBaseline = {
  scopeKey: string;
  scope: string;
  urgency: string;
  materialClass: string;
  hoursBand: string;
  templateCount: number;
  agreementCount: number;
  observedMedian: bigint;
  observedMin: bigint;
  observedMax: bigint;
  templateMedianMin: bigint;
  templateMedianMax: bigint;
};

export const STATUS_PROPOSED = 7;
export const STATUS_RESOLVED = 8;

export function useCovenantReview(params: {
  covenants: CovenantItem[];
  templateList: TemplateItem[];
  covenantTagFilter: string;
  covenantTagMap: Record<string, string>;
  dashboardView: DashboardView;
  onlyFlaggedAgreements: boolean;
  covenantTransparencyMap: Record<string, CovenantTransparencyNote>;
  disputeReviewRecords: Record<number, DisputeReviewRecord>;
}) {
  const {
    covenants,
    templateList,
    covenantTagFilter,
    covenantTagMap,
    dashboardView,
    onlyFlaggedAgreements,
    covenantTransparencyMap,
    disputeReviewRecords,
  } = params;

  const templateById = useMemo(() => {
    const map = new Map<number, TemplateItem>();
    templateList.forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [templateList]);

  const reputationRingSignals = useMemo(() => {
    const pairCounts = new Map<string, number>();
    const templateAuthorUsage = new Map<string, number>();
    const notesByCovenant: Record<number, string[]> = {};

    const addNote = (id: number, note: string) => {
      if (!notesByCovenant[id]) notesByCovenant[id] = [];
      if (!notesByCovenant[id].includes(note)) notesByCovenant[id].push(note);
    };

    covenants.forEach((item) => {
      const creator = item.creator.toLowerCase();
      const worker = item.worker.toLowerCase();
      const pairKey = `${creator}->${worker}`;
      pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1);

      const template = templateById.get(Number(item.templateId));
      if (template) {
        const templateAuthor = template.creator.toLowerCase();
        const usageKey = `${creator}|${templateAuthor}`;
        templateAuthorUsage.set(usageKey, (templateAuthorUsage.get(usageKey) ?? 0) + 1);
      }
    });

    covenants.forEach((item) => {
      const creator = item.creator.toLowerCase();
      const worker = item.worker.toLowerCase();
      const pairKey = `${creator}->${worker}`;
      const reverseKey = `${worker}->${creator}`;
      const pairCount = pairCounts.get(pairKey) ?? 0;
      const reverseCount = pairCounts.get(reverseKey) ?? 0;

      if (pairCount >= 3) {
        addNote(item.id, "Repeated creator-worker pair appears 3+ times.");
      }
      if (reverseCount >= 1) {
        addNote(item.id, "Creator and worker also appear in reversed roles.");
      }

      const template = templateById.get(Number(item.templateId));
      if (template) {
        const templateAuthor = template.creator.toLowerCase();
        const usageKey = `${creator}|${templateAuthor}`;
        const authorUsage = templateAuthorUsage.get(usageKey) ?? 0;
        if (authorUsage >= 3) {
          addNote(item.id, "Requester repeatedly uses templates from the same author.");
        }
        if (templateAuthor === creator) {
          addNote(item.id, "Requester is also the template author for this agreement.");
        }
      }
    });

    const repeatedPairs = Array.from(pairCounts.values()).filter((count) => count >= 3).length;
    const reciprocalPairs = Array.from(pairCounts.keys()).filter((key) => {
      const [creator, worker] = key.split("->");
      return Boolean(pairCounts.get(`${worker}->${creator}`));
    }).length;
    const concentratedTemplateLinks = Array.from(templateAuthorUsage.values()).filter((count) => count >= 3).length;

    const summary: string[] = [];
    if (repeatedPairs > 0) {
      summary.push(`${repeatedPairs} creator-worker pairs repeat 3+ times.`);
    }
    if (reciprocalPairs > 0) {
      summary.push(`${reciprocalPairs} address pairs appear in both directions.`);
    }
    if (concentratedTemplateLinks > 0) {
      summary.push(`${concentratedTemplateLinks} requester-template-author links look concentrated.`);
    }

    return { notesByCovenant, summary };
  }, [covenants, templateById]);

  const scopeBaselines = useMemo(() => {
    const buckets = new Map<
      string,
      {
        rewards: bigint[];
        templateMins: bigint[];
        templateMaxes: bigint[];
        templateCount: number;
        agreementCount: number;
        scope: string;
        urgency: string;
        materialClass: string;
        hoursBand: string;
      }
    >();

    const ensureBucket = (input: {
      scopeLabel: string;
      estimatedHours: number;
      materialClass: string;
      urgency: string;
    }) => {
      const normalized = buildMarketKey(input);
      if (!normalized) return null;
      const existing = buckets.get(normalized);
      if (existing) return existing;
      const created = {
        rewards: [],
        templateMins: [],
        templateMaxes: [],
        templateCount: 0,
        agreementCount: 0,
        scope: input.scopeLabel.trim().toLowerCase(),
        urgency: input.urgency.trim().toLowerCase() || "normal",
        materialClass: input.materialClass.trim().toLowerCase() || "standard",
        hoursBand: normalizeBand(input.estimatedHours),
      };
      buckets.set(normalized, created);
      return created;
    };

    templateList.forEach((template) => {
      const meta = parseTemplateMetadata(template.metadataUri);
      const bucket = ensureBucket(meta);
      if (!bucket) return;
      bucket.templateCount += 1;
      if (meta.expectedMin > 0n) bucket.templateMins.push(meta.expectedMin);
      if (meta.expectedMax > 0n) bucket.templateMaxes.push(meta.expectedMax);
    });

    covenants.forEach((item) => {
      const template = templateById.get(Number(item.templateId));
      const meta = template ? parseTemplateMetadata(template.metadataUri) : null;
      const bucket = ensureBucket(
        meta ?? {
          scopeLabel: "",
          estimatedHours: 0,
          materialClass: "",
          urgency: "",
        }
      );
      if (!bucket) return;
      bucket.rewards.push(item.tokenBReward);
      bucket.agreementCount += 1;
    });

    return Array.from(buckets.entries())
      .map(([scopeKey, bucket]) => {
        bucket.rewards.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        bucket.templateMins.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        bucket.templateMaxes.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        const pickMedian = (values: bigint[]) =>
          values.length > 0 ? values[Math.floor(values.length / 2)] : 0n;
        return {
          scopeKey,
          scope: bucket.scope,
          urgency: bucket.urgency,
          materialClass: bucket.materialClass,
          hoursBand: bucket.hoursBand,
          templateCount: bucket.templateCount,
          agreementCount: bucket.agreementCount,
          observedMedian: pickMedian(bucket.rewards),
          observedMin: bucket.rewards[0] ?? 0n,
          observedMax: bucket.rewards[bucket.rewards.length - 1] ?? 0n,
          templateMedianMin: pickMedian(bucket.templateMins),
          templateMedianMax: pickMedian(bucket.templateMaxes),
        } satisfies ScopeBaseline;
      })
      .sort((a, b) => b.agreementCount - a.agreementCount);
  }, [covenants, templateById, templateList]);

  const reviewPrioritySignals = useMemo(() => {
    const notesByCovenant: Record<number, string[]> = {};

    const addNote = (id: number, note: string) => {
      if (!notesByCovenant[id]) notesByCovenant[id] = [];
      if (!notesByCovenant[id].includes(note)) notesByCovenant[id].push(note);
    };

    covenants.forEach((item) => {
      const transparencyNote =
        covenantTransparencyMap[String(item.id)] ?? emptyTransparencyNote();
      const reviewRecord = disputeReviewRecords[item.id] ?? emptyDisputeReviewRecord();
      const parsedArbiter = parseArbiterResolutionNote(reviewRecord.arbiterNote);

      if (item.status >= 5) {
        if (parsedArbiter.missingEvidence.trim()) {
          addNote(item.id, "Insufficient evidence noted by arbiter.");
        }
        if (item.status >= STATUS_PROPOSED && !parsedArbiter.claimSummary.trim()) {
          addNote(item.id, "Resolver plan has no claim summary.");
        }
        if (item.status >= STATUS_PROPOSED && !parsedArbiter.requesterResponse.trim()) {
          addNote(item.id, "Resolver plan has no requester response summary.");
        }
      }

      const visibleTotal = toQuoteTotal(transparencyNote.breakdown);
      if (visibleTotal > 0n) {
        const reward = item.tokenBReward;
        const larger = visibleTotal > reward ? visibleTotal : reward;
        const smaller = visibleTotal > reward ? reward : visibleTotal;
        if (smaller * 100n < larger * 85n) {
          addNote(item.id, "Visible quote total is far from the locked reward.");
        }
      }

      if (transparencyNote.scopeLabel) {
        const key = buildMarketKey({
          scopeLabel: transparencyNote.scopeLabel,
          urgency: transparencyNote.urgency || "normal",
          materialClass: transparencyNote.materialClass || "standard",
          estimatedHours: transparencyNote.estimatedHours || 0,
        });
        const baseline = scopeBaselines.find((entry) => entry.scopeKey === key);
        if (baseline && baseline.observedMedian > 0n) {
          if (item.tokenBReward > (baseline.observedMedian * 3n) / 2n) {
            addNote(item.id, "Reward is well above the observed median for this work profile.");
          } else if (item.tokenBReward * 2n < baseline.observedMedian) {
            addNote(item.id, "Reward is well below the observed median for this work profile.");
          }
        }
      }
    });

    const allNotes = Object.values(notesByCovenant).flat();
    const summary = [
      {
        label: "Insufficient evidence",
        count: allNotes.filter((note) => note.includes("Insufficient evidence")).length,
      },
      {
        label: "Missing resolver summary",
        count: allNotes.filter((note) => note.includes("Resolver plan has no")).length,
      },
      {
        label: "Quote mismatch",
        count: allNotes.filter((note) => note.includes("Visible quote total")).length,
      },
      {
        label: "Median outlier",
        count: allNotes.filter((note) => note.includes("observed median")).length,
      },
    ].filter((entry) => entry.count > 0);

    return { notesByCovenant, summary };
  }, [covenants, covenantTransparencyMap, disputeReviewRecords, scopeBaselines]);

  const visibleCovenants = useMemo(() => {
    const filtered = covenants.filter((item) => {
      if (!covenantTagFilter.trim()) return true;
      const tagValue = covenantTagMap[String(item.id)] || "";
      return tagValue.toLowerCase().includes(covenantTagFilter.trim().toLowerCase());
    });

    const flaggedOnly = onlyFlaggedAgreements
      ? filtered.filter((item) => {
          const reviewCount = (reviewPrioritySignals.notesByCovenant[item.id] ?? []).length;
          const relationCount = (reputationRingSignals.notesByCovenant[item.id] ?? []).length;
          return reviewCount + relationCount > 0;
        })
      : filtered;

    const priorityScore = (item: CovenantItem) => {
      const reviewCount = (reviewPrioritySignals.notesByCovenant[item.id] ?? []).length;
      const relationCount = (reputationRingSignals.notesByCovenant[item.id] ?? []).length;
      let score = reviewCount * 10 + relationCount * 4;
      if (item.status >= 5 && item.status < STATUS_RESOLVED) score += 6;
      if (item.status === STATUS_PROPOSED) score += 3;
      return score;
    };

    return flaggedOnly.sort((a, b) => {
      if (dashboardView === "operator") {
        const diff = priorityScore(b) - priorityScore(a);
        if (diff !== 0) return diff;
      }
      return b.id - a.id;
    });
  }, [
    covenants,
    covenantTagFilter,
    covenantTagMap,
    dashboardView,
    onlyFlaggedAgreements,
    reviewPrioritySignals.notesByCovenant,
    reputationRingSignals.notesByCovenant,
  ]);

  return {
    templateById,
    reputationRingSignals,
    scopeBaselines,
    reviewPrioritySignals,
    visibleCovenants,
  };
}
