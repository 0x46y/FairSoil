"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IDKitRequestWidget,
  orbLegacy,
} from "@worldcoin/idkit";
import {
  formatUnits,
  isAddress,
  parseUnits,
  zeroAddress,
  keccak256,
  stringToBytes,
  parseEventLogs,
} from "viem";
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
import {
  appiOracleAbi,
  covenantAbi,
  covenantLibraryAbi,
  resourceRegistryAbi,
  tokenAAbi,
  tokenBAbi,
  treasuryAbi,
} from "../lib/abi";
import {
  type CovenantTransparencyNote,
  type DisputeReviewRecord,
  type QuoteBreakdownInput,
  buildMarketKey,
  buildTemplateMetadataValue,
  emptyQuoteBreakdown,
  emptyTransparencyNote,
  materialLabelFor,
  materialVocabulary,
  normalizeBand,
  parseTemplateMetadata,
  parseTransparencyNote,
  scopeLabelFor,
  scopeVocabulary,
  toQuoteTotal,
  urgencyLabelFor,
  urgencyVocabulary,
} from "../lib/marketVocabulary";
import { decodeEvidencePacket } from "../lib/evidencePacket";
import { useCovenantReview } from "../lib/useCovenantReview";
import { useDisputeFormState } from "../lib/useDisputeFormState";
import { useCovenantActions } from "../lib/useCovenantActions";
import { useIdentityFlow } from "../lib/useIdentityFlow";
import { WorkAgreementsSection } from "../components/WorkAgreementsSection";
import { WorkAgreementRow } from "../components/WorkAgreementRow";
import {
  activeIdentityRoute,
  covenantAddress,
  missingEnv,
  covenantLibraryAddress,
  resourceRegistryAddress,
  tokenAAddress,
  hasWorldIdConfig,
  hasZkNfcConfig,
  tokenBAddress,
  treasuryAddress,
  externalAdjudicationUrl,
  auditDisputeThreshold,
  auditTreasuryThreshold,
  auditReserveThresholdA,
  auditReserveThresholdB,
  auditWindowHours,
  worldIdActionId,
  worldIdEnvironment,
  worldIdAppId,
  worldIdMode,
  worldIdMock,
  zknfcMode,
  zknfcMock,
  zknfcVerifierUrl,
} from "../lib/contracts";

const MAX_TRAIL_ITEMS = 12;

type TrailItem = {
  id: string;
  timestamp: number;
  title: string;
  body?: ReactNode;
  actorSummary?: string;
  actorRoleLabel?: string;
};

type TrailLog = {
  eventName?: string;
  transactionHash?: string;
  logIndex?: number;
  blockNumber: bigint;
  args?: Record<string, unknown>;
};

type TrailActorContext = {
  actorAddress?: string;
  actorRoles: string[];
};

type DashboardView = "participant" | "operator";

const shortAddress = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;
const safeAddress = (value?: string) => (value ? shortAddress(value) : "Unknown");
const sameAddress = (left?: string, right?: string) =>
  Boolean(left && right && left.toLowerCase() === right.toLowerCase());

const uniq = (items: string[]) => Array.from(new Set(items));

const formatActorWithRoles = (context: TrailActorContext) => {
  if (!context.actorAddress) return null;
  const roleLabel = context.actorRoles.length > 0 ? context.actorRoles.join(", ") : "participant";
  return (
    <>
      Executed by {safeAddress(context.actorAddress)} as {roleLabel}
    </>
  );
};

const formatDate = (timestamp: bigint, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(Number(timestamp) * 1000));

const formatTokenB = (amount: bigint) =>
  `${Number(formatUnits(amount, 18)).toFixed(2)} SOILB`;
const formatTokenA = (amount: bigint) =>
  `${Number(formatUnits(amount, 18)).toFixed(2)} SOILA`;

const formatIntegrity = (points: bigint) => `+${points.toString()} integrity`;
const toIntegrityPoints = (amountWei: bigint) =>
  (amountWei + 1_000_000_000_000_000_000n - 1n) / 1_000_000_000_000_000_000n;
const MONTH_SECONDS = 30 * 24 * 60 * 60;

const formatPercent = (bps: bigint) => {
  const percent = Number(bps) / 100;
  return Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(1);
};

const disputeSteps = ["Help asked", "Challenged", "Resolver plan", "Finished"] as const;

const auditFilters = [
  { value: "all", label: "All events" },
  { value: "treasury", label: "Treasury" },
  { value: "covenant", label: "Agreements" },
  { value: "dispute", label: "Disputes" },
  { value: "ubi", label: "UBI" },
] as const;

const disputeStatusLabel = (status: number) => {
  if (status === STATUS_RESOLVED) return "The dispute is finished.";
  if (status >= STATUS_PROPOSED) return "The dispute arbiter has proposed an outcome.";
  if (status >= STATUS_DISPUTED) return "The dispute is waiting for the arbiter.";
  return "The worker has asked for help on this agreement.";
};

const auditCategoryForTitle = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes("treasury") || lower.includes("reserve") || lower.includes("liability")) {
    return "treasury";
  }
  if (lower.includes("agreement") || lower.includes("covenant") || lower.includes("work")) {
    return "covenant";
  }
  if (lower.includes("support") || lower.includes("dispute") || lower.includes("proposal")) {
    return "dispute";
  }
  if (lower.includes("bonus") || lower.includes("ubi")) {
    return "ubi";
  }
  return "other";
};

const STATUS_DISPUTED = 6;
const STATUS_PROPOSED = 7;
const STATUS_RESOLVED = 8;

const formatReason = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("0x") && trimmed.length > 10) {
    return `${trimmed.slice(0, 10)}…`;
  }
  return trimmed;
};

const simplifyAuditTitle = (title: string) => {
  if (title.startsWith("Support requested for agreement #")) {
    return title.replace("Support requested for agreement #", "Worker asked for help on agreement #");
  }
  if (title.startsWith("Support accepted on agreement #")) {
    return title.replace("Support accepted on agreement #", "Requester accepted the worker claim on agreement #");
  }
  if (title.startsWith("Support disputed on agreement #")) {
    return title.replace("Support disputed on agreement #", "Requester challenged the worker claim on agreement #");
  }
  if (title.startsWith("Support proposal for agreement #")) {
    return title.replace("Support proposal for agreement #", "Dispute arbiter proposed an outcome for agreement #");
  }
  if (title.startsWith("Support resolved: agreement #")) {
    return title.replace("Support resolved: agreement #", "Dispute finished for agreement #");
  }
  if (title === "Support resolver updated") return "Dispute arbiter updated";
  return title;
};

const nextStepForCovenant = (
  item: { status: number; creator: string; worker: string },
  account: string | undefined,
  isDisputeResolver: boolean,
  isDisputeFinalizer: boolean
) => {
  const lower = account?.toLowerCase();
  const isCreator = !!lower && item.creator.toLowerCase() === lower;
  const isWorker = !!lower && item.worker.toLowerCase() === lower;

  if (item.status === 0) {
    if (isWorker) return "Next: the worker should submit the work.";
    if (isCreator) return "Next: wait for the worker, or cancel and refund.";
    return "Next: wait for the worker to submit the work.";
  }
  if (item.status === 1) {
    if (isCreator) return "Next: the requester should approve or reject the submitted work.";
    if (isWorker) return "Next: wait for the requester review.";
    return "Next: waiting for the requester review.";
  }
  if (item.status === 2) return "Finished: reward and trust score were released.";
  if (item.status === 3) return "Stopped: the requester rejected this submission.";
  if (item.status === 4) return "Stopped: this agreement was cancelled and refunded.";
  if (item.status === 5) {
    if (isCreator) return "Next: accept the worker claim or challenge it.";
    if (isWorker) return "Next: wait for the requester response to your help request.";
    return "Next: the requester must respond to the worker claim.";
  }
  if (item.status === 6) {
    if (isDisputeResolver) return "Next: the dispute arbiter should propose an outcome.";
    return "Next: waiting for the dispute arbiter to review the dispute.";
  }
  if (item.status === 7) {
    if (isDisputeFinalizer) return "Next: the finalizer should confirm the proposed outcome.";
    if (isDisputeResolver) return "Next: wait for the finalizer to confirm the proposed outcome.";
    return "Next: waiting for the finalizer to confirm the outcome.";
  }
  if (item.status === 8) return "Finished: the dispute outcome has been finalized.";
  return "Next step unavailable.";
};

const explainDisabledAction = (options: {
  walletConnected?: boolean;
  missingEnv?: boolean;
  busy?: boolean;
  ownerRequired?: boolean;
  workerRequired?: boolean;
  libraryRequired?: boolean;
  registryRequired?: boolean;
  insufficientBalance?: boolean;
  label?: string;
}) => {
  if (options.busy) return "Please wait until the current wallet action finishes.";
  if (options.missingEnv) return "Contract addresses are missing in frontend/.env.local.";
  if (options.walletConnected === false) return "Connect a wallet first.";
  if (options.ownerRequired) return "Switch to the temporary operator wallet for this action.";
  if (options.workerRequired) return "Enter the worker wallet first.";
  if (options.libraryRequired) return "Template library is not connected in this environment.";
  if (options.registryRequired) return "Resource registry is not connected in this environment.";
  if (options.insufficientBalance) return "This wallet does not have enough balance for that reward.";
  return options.label ?? null;
};

const buildExternalAdjudicationLink = (base: string | undefined, covenantId: number) => {
  if (!base) return null;
  try {
    const url = new URL(base);
    url.searchParams.set("covenantId", String(covenantId));
    return url.toString();
  } catch {
    return null;
  }
};

const formatEvidenceLink = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const packet = decodeEvidencePacket(trimmed);
  if (packet?.sourceUrl) {
    return (
      <a className={styles.timelineLink} href={packet.sourceUrl} target="_blank" rel="noreferrer">
        {packet.title?.trim() || "Evidence packet"}
      </a>
    );
  }
  if (packet) {
    return <span className={styles.timelineMeta}>Evidence packet attached</span>;
  }
  return (
    <a className={styles.timelineLink} href={trimmed} target="_blank" rel="noreferrer">
      Evidence URL
    </a>
  );
};

const safeParseUnits = (value: string, decimals: number) => {
  try {
    return parseUnits(value || "0", decimals);
  } catch {
    return 0n;
  }
};

const formatCountdown = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "now";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const normalizeErrorMessage = (error: unknown) => {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const anyError = error as { shortMessage?: string; message?: string; cause?: { message?: string } };
    return anyError.shortMessage || anyError.message || anyError.cause?.message || "Unknown error";
  }
  return String(error);
};

const formatTxError = (error: unknown) => {
  const message = normalizeErrorMessage(error);
  const lower = message.toLowerCase();
  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request")
  ) {
    return "Wallet confirmation was cancelled. Nothing changed.";
  }
  if (lower.includes("insufficient reserves")) {
    return "This action cannot finish yet because the treasury does not have enough reserves.";
  }
  if (lower.includes("insufficient balance") || lower.includes("exceeds balance")) {
    return "This wallet does not have enough balance for that action.";
  }
  if (lower.includes("owner")) {
    return "This action needs the temporary operator wallet.";
  }
  if (lower.includes("reward operator")) {
    return "This action needs the treasury owner or an approved reward operator wallet.";
  }
  if (lower.includes("finalizer")) {
    return "This action needs the configured dispute finalizer wallet.";
  }
  return `This transaction failed. Check the connected wallet, balances, and contract setup. Details: ${message}`;
};

const classifyIdentityError = (message: string | null) => {
  const lower = message?.toLowerCase() ?? "";
  if (!message) return "none" as const;
  if (lower.includes("unreachable") || lower.includes("network error")) return "unreachable" as const;
  if (lower.includes("config missing") || lower.includes("verifier url missing")) return "config" as const;
  if (lower.includes("not verified") || lower.includes("failed")) return "failed" as const;
  return "other" as const;
};

const formatRelativeTime = (timestamp: number, nowMs: number, locale: string) => {
  const diffSeconds = Math.max(0, Math.floor(nowMs / 1000 - timestamp));
  if (diffSeconds < 60) return "Just now";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  const date = new Date(timestamp * 1000);
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(date);
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getDisputeStage = (status: number) => {
  const isReported = status >= 5;
  const isDisputed = status >= STATUS_DISPUTED;
  const isProposed = status >= STATUS_PROPOSED;
  const isResolved = status === STATUS_RESOLVED;
  return [isReported, isDisputed, isProposed, isResolved];
};

const trailMatchesCovenant = (item: TrailItem, covenantId: number) => {
  const needle = `agreement #${covenantId}`;
  const body = typeof item.body === "string" ? item.body : "";
  return item.title.toLowerCase().includes(needle) || body.toLowerCase().includes(needle);
};

const disputeReviewLabel = (title: string) => {
  if (title.startsWith("Support requested for agreement #")) return "Worker request";
  if (title.startsWith("Support accepted on agreement #")) return "Requester accepted";
  if (title.startsWith("Support disputed on agreement #")) return "Requester challenge";
  if (title.startsWith("Support proposal for agreement #")) return "Arbiter proposal";
  if (title.startsWith("Support resolved: agreement #")) return "Final outcome";
  return "Record";
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
  const [covenantTemplate, setCovenantTemplate] = useState("general");
  const [covenantTags, setCovenantTags] = useState("general");
  const [covenantTagFilter, setCovenantTagFilter] = useState("");
  const [onlyFlaggedAgreements, setOnlyFlaggedAgreements] = useState(false);
  const [queueFilter, setQueueFilter] = useState<
    "all" | "mine" | "creator" | "worker" | "resolver" | "finalizer"
  >("all");
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const [covenantTagMap, setCovenantTagMap] = useState<Record<string, string>>({});
  const [covenantTransparencyMap, setCovenantTransparencyMap] = useState<Record<string, CovenantTransparencyNote>>(
    {}
  );
  const [covenantTemplateId, setCovenantTemplateId] = useState("0");
  const [covenantTemplateUri, setCovenantTemplateUri] = useState("");
  const [covenantRoyaltyBps, setCovenantRoyaltyBps] = useState("500");
  const [quoteBreakdown, setQuoteBreakdown] = useState<QuoteBreakdownInput>(() => emptyQuoteBreakdown());
  const [templateExpectedMin, setTemplateExpectedMin] = useState("");
  const [templateExpectedMax, setTemplateExpectedMax] = useState("");
  const [templateScopeLabel, setTemplateScopeLabel] = useState("");
  const [templateEstimatedHours, setTemplateEstimatedHours] = useState("");
  const [templateMaterialClass, setTemplateMaterialClass] = useState("standard");
  const [templateUrgency, setTemplateUrgency] = useState("normal");
  const [templateMarketNote, setTemplateMarketNote] = useState("");
  const [templateReferralDisclosure, setTemplateReferralDisclosure] = useState(false);
  const [relatedPartyDisclosure, setRelatedPartyDisclosure] = useState("");
  const [marketContextNote, setMarketContextNote] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [templateList, setTemplateList] = useState<
    {
      id: number;
      creator: string;
      royaltyBps: bigint;
      metadataUri: string;
      active: boolean;
      createdAt: bigint;
      effectiveRoyaltyBps: bigint;
    }[]
  >([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [templateUseCovenantId, setTemplateUseCovenantId] = useState("");
  const [templateUseAmount, setTemplateUseAmount] = useState("0");
  const [templateActiveMap, setTemplateActiveMap] = useState<Record<number, boolean>>({});
  const [covenantRewardAmount, setCovenantRewardAmount] = useState("250");
  const [covenantIntegrityPoints, setCovenantIntegrityPoints] = useState("50");
  const [covenantPayInTokenA, setCovenantPayInTokenA] = useState(false);
  const [covenantStep, setCovenantStep] = useState<0 | 1 | 2>(0);
  const [covenantFormStage, setCovenantFormStage] = useState<1 | 2>(1);
  const [covenants, setCovenants] = useState<
    {
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
    }[]
  >([]);
  const [isLoadingCovenants, setIsLoadingCovenants] = useState(false);
  const disputeFormState = useDisputeFormState();
  const {
    disputeReviewRecords,
    setDisputeReviewRecords,
  } = disputeFormState;
  const [appiOracleInput, setAppiOracleInput] = useState("");
  const [appiCategoryInput, setAppiCategoryInput] = useState("");
  const [appiPriceInput, setAppiPriceInput] = useState("");
  const [appiDayInput, setAppiDayInput] = useState("");
  const [trailQuery, setTrailQuery] = useState("");
  const [trailFilter, setTrailFilter] = useState<(typeof auditFilters)[number]["value"]>("all");
  const [dashboardView, setDashboardView] = useState<DashboardView>("participant");
  const [appiStats, setAppiStats] = useState<
    { category: number; reports: number; unique: number }[]
  >([]);
  const [appiDiversity, setAppiDiversity] = useState<string>("--");
  const [appiConfidenceBps, setAppiConfidenceBps] = useState("10000");
  const [appiMaxReports, setAppiMaxReports] = useState("50");
  const [resourceIdInput, setResourceIdInput] = useState("");
  const [resourceValuationInput, setResourceValuationInput] = useState("1000");
  const [resourceTaxRateInput, setResourceTaxRateInput] = useState("500");
  const [resourceBuyPriceInput, setResourceBuyPriceInput] = useState("1000");
  const [resourceMetadataNoteInput, setResourceMetadataNoteInput] = useState("");
  const [resourceRelatedPartyInput, setResourceRelatedPartyInput] = useState("");
  const [resourceInfo, setResourceInfo] = useState<{
    owner: string;
    valuation: bigint;
    taxRateBps: bigint;
    lastTaxTimestamp: bigint;
    exists: boolean;
    due: bigint;
    elapsed: bigint;
  } | null>(null);
  const [resourceMetadataNote, setResourceMetadataNote] = useState<string>("");
  const [unclaimedDays, setUnclaimedDays] = useState<{ day: number; amount: bigint }[]>([]);
  const [unclaimedFromDay, setUnclaimedFromDay] = useState("");
  const [unclaimedToDay, setUnclaimedToDay] = useState("");
  const [currentDayIndex, setCurrentDayIndex] = useState<number | null>(null);
  const [trailItems, setTrailItems] = useState<TrailItem[]>([]);
  const [trailNow, setTrailNow] = useState(() => Date.now());
  const [locale, setLocale] = useState("en-US");
  const trailIds = useRef(new Set<string>());
  const [txStatus, setTxStatus] = useState<"idle" | "signing" | "confirming">("idle");
  const [txAction, setTxAction] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tokenAAddr = tokenAAddress ?? zeroAddress;
  const tokenBAddr = tokenBAddress ?? zeroAddress;
  const treasuryAddr = treasuryAddress ?? zeroAddress;
  const covenantAddr = covenantAddress ?? zeroAddress;
  const registryAddr = resourceRegistryAddress ?? zeroAddress;
  const libraryAddr = covenantLibraryAddress ?? zeroAddress;

  const { data: tokenABalance, refetch: refetchTokenA } = useReadContract({
    address: tokenAAddr,
    abi: tokenAAbi,
    functionName: "balanceOf",
    args: [address],
    query: {
      enabled: Boolean(tokenAAddress && account.address),
    },
  });

  const { data: tokenAOwner } = useReadContract({
    address: tokenAAddr,
    abi: tokenAAbi,
    functionName: "owner",
    query: {
      enabled: Boolean(tokenAAddress),
    },
  });

  const { data: isPrimaryAddress, refetch: refetchPrimary } = useReadContract({
    address: tokenAAddr,
    abi: tokenAAbi,
    functionName: "isPrimaryAddress",
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

  const { data: tokenBLocked, refetch: refetchTokenBLocked } = useReadContract({
    address: tokenBAddr,
    abi: tokenBAbi,
    functionName: "lockedBalance",
    args: [address],
    query: {
      enabled: Boolean(tokenBAddress && account.address),
    },
  });

  const { data: tokenBUnlocked, refetch: refetchTokenBUnlocked } = useReadContract({
    address: tokenBAddr,
    abi: tokenBAbi,
    functionName: "unlockedBalanceOf",
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

  const { data: lockedIntegrity, refetch: refetchLockedIntegrity } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "lockedIntegrity",
    args: [address],
    query: {
      enabled: Boolean(treasuryAddress && account.address),
    },
  });

  const { data: availableIntegrity, refetch: refetchAvailableIntegrity } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "availableIntegrity",
    args: [address],
    query: {
      enabled: Boolean(treasuryAddress && account.address),
    },
  });

  const { data: defenseQuotaUsed, refetch: refetchDefenseQuotaUsed } = useReadContract({
    address: covenantAddr,
    abi: covenantAbi,
    functionName: "defenseQuotaUsed",
    args: [address],
    query: {
      enabled: Boolean(covenantAddress && account.address),
    },
  });

  const { data: defenseQuotaMonth, refetch: refetchDefenseQuotaMonth } = useReadContract({
    address: covenantAddr,
    abi: covenantAbi,
    functionName: "defenseQuotaMonth",
    args: [address],
    query: {
      enabled: Boolean(covenantAddress && account.address),
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

  const { data: treasuryOwner } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "owner",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: appiOracleAddr } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "appiOracle",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: appiConfidenceBpsOnchain } = useReadContract({
    address: appiOracleAddr as `0x${string}` | undefined,
    abi: appiOracleAbi,
    functionName: "confidenceBps",
    query: {
      enabled: Boolean(appiOracleAddr && appiOracleAddr !== zeroAddress),
    },
  });

  const { data: appiMaxReportsOnchain } = useReadContract({
    address: appiOracleAddr as `0x${string}` | undefined,
    abi: appiOracleAbi,
    functionName: "maxReportsPerCategory",
    query: {
      enabled: Boolean(appiOracleAddr && appiOracleAddr !== zeroAddress),
    },
  });

  const appiDayForRead = useMemo(() => {
    const raw = appiDayInput.trim();
    if (raw.length === 0) {
      return currentDayIndex ?? null;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
  }, [appiDayInput, currentDayIndex]);

  const { data: appiDailyIndex } = useReadContract({
    address: appiOracleAddr as `0x${string}` | undefined,
    abi: appiOracleAbi,
    functionName: "dailyIndex",
    args: appiDayForRead !== null ? [BigInt(appiDayForRead)] : undefined,
    query: {
      enabled: Boolean(appiOracleAddr && appiOracleAddr !== zeroAddress && appiDayForRead !== null),
    },
  });

  const { data: lastAPPI } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "lastAPPI",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: dailyUBIAmount } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "dailyUBIAmount",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: treasuryInTotal } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "treasuryInTotal",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: treasuryOutATotal } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "treasuryOutATotal",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: treasuryOutBTotal } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "treasuryOutBTotal",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: lastReservesA } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "lastReservesA",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: lastReservesB } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "lastReservesB",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: liabilitiesA } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "liabilitiesA",
    query: {
      enabled: Boolean(treasuryAddress),
    },
  });

  const { data: liabilitiesB } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "liabilitiesB",
    query: {
      enabled: Boolean(treasuryAddress),
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

  const { data: disputeFinalizer } = useReadContract({
    address: covenantAddr,
    abi: covenantAbi,
    functionName: "disputeFinalizer",
    query: {
      enabled: Boolean(covenantAddress),
    },
  });

  const { data: isRewardOperator } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "rewardOperators",
    args: [address],
    query: {
      enabled: Boolean(treasuryAddress && account.address),
    },
  });

  const isDisputeResolver = useMemo(() => {
    if (!account.address || !disputeResolver) return false;
    return (disputeResolver as string).toLowerCase() === account.address.toLowerCase();
  }, [account.address, disputeResolver]);

  const isDisputeFinalizer = useMemo(() => {
    if (!account.address || !disputeFinalizer) return false;
    return (disputeFinalizer as string).toLowerCase() === account.address.toLowerCase();
  }, [account.address, disputeFinalizer]);

  const formattedTokenA = useMemo(() => {
    if (tokenABalance === undefined) return "--";
    return Number(formatUnits(tokenABalance, 18)).toFixed(2);
  }, [tokenABalance]);

  const formattedTokenB = useMemo(() => {
    if (tokenBBalance === undefined) return "--";
    return Number(formatUnits(tokenBBalance, 18)).toFixed(2);
  }, [tokenBBalance]);

  const formattedTokenBLocked = useMemo(() => {
    if (tokenBLocked === undefined) return "--";
    return Number(formatUnits(tokenBLocked, 18)).toFixed(2);
  }, [tokenBLocked]);

  const formattedTokenBUnlocked = useMemo(() => {
    if (tokenBUnlocked === undefined) return "--";
    return Number(formatUnits(tokenBUnlocked, 18)).toFixed(2);
  }, [tokenBUnlocked]);

  const formattedTreasuryIn = useMemo(() => {
    if (treasuryInTotal === undefined) return "--";
    return Number(formatUnits(treasuryInTotal as bigint, 18)).toFixed(2);
  }, [treasuryInTotal]);

  const formattedTreasuryOutA = useMemo(() => {
    if (treasuryOutATotal === undefined) return "--";
    return Number(formatUnits(treasuryOutATotal as bigint, 18)).toFixed(2);
  }, [treasuryOutATotal]);

  const formattedTreasuryOutB = useMemo(() => {
    if (treasuryOutBTotal === undefined) return "--";
    return Number(formatUnits(treasuryOutBTotal as bigint, 18)).toFixed(2);
  }, [treasuryOutBTotal]);

  const formattedReservesA = useMemo(() => {
    if (lastReservesA === undefined) return "--";
    return Number(formatUnits(lastReservesA as bigint, 18)).toFixed(2);
  }, [lastReservesA]);

  const formattedReservesB = useMemo(() => {
    if (lastReservesB === undefined) return "--";
    return Number(formatUnits(lastReservesB as bigint, 18)).toFixed(2);
  }, [lastReservesB]);

  const formattedLiabilitiesA = useMemo(() => {
    if (liabilitiesA === undefined) return "--";
    return Number(formatUnits(liabilitiesA as bigint, 18)).toFixed(2);
  }, [liabilitiesA]);

  const formattedLiabilitiesB = useMemo(() => {
    if (liabilitiesB === undefined) return "--";
    return Number(formatUnits(liabilitiesB as bigint, 18)).toFixed(2);
  }, [liabilitiesB]);

  const isTokenAOwner = useMemo(() => {
    if (!account.address || !tokenAOwner) return false;
    return (tokenAOwner as string).toLowerCase() === account.address.toLowerCase();
  }, [account.address, tokenAOwner]);

  const isTreasuryOwner = useMemo(() => {
    if (!account.address || !treasuryOwner) return false;
    return (treasuryOwner as string).toLowerCase() === account.address.toLowerCase();
  }, [account.address, treasuryOwner]);

  const canReportTaskCompleted = isTreasuryOwner || Boolean(isRewardOperator);

  const formattedLastAPPI = useMemo(() => {
    if (lastAPPI === undefined) return "--";
    return Number(formatUnits(lastAPPI as bigint, 18)).toFixed(2);
  }, [lastAPPI]);

  const formattedDailyUBI = useMemo(() => {
    if (dailyUBIAmount === undefined) return "--";
    return Number(formatUnits(dailyUBIAmount as bigint, 18)).toFixed(2);
  }, [dailyUBIAmount]);

  const formattedAppiDailyIndex = useMemo(() => {
    if (appiDailyIndex === undefined) return "--";
    return Number(formatUnits(appiDailyIndex as bigint, 18)).toFixed(2);
  }, [appiDailyIndex]);

  const formattedAppiConfidence = useMemo(() => {
    if (appiConfidenceBpsOnchain === undefined) return "--";
    return `${(Number(appiConfidenceBpsOnchain) / 100).toFixed(0)}%`;
  }, [appiConfidenceBpsOnchain]);

  const formattedAppiMaxReports = useMemo(() => {
    if (appiMaxReportsOnchain === undefined) return "--";
    return appiMaxReportsOnchain.toString();
  }, [appiMaxReportsOnchain]);

  const filteredTrailItems = useMemo(() => {
    const query = trailQuery.trim().toLowerCase();
    return trailItems.filter((item) => {
      const category = auditCategoryForTitle(item.title);
      if (trailFilter !== "all" && category !== trailFilter) {
        return false;
      }
      if (!query) return true;
      const tagMatches = Object.values(covenantTagMap).some((value) =>
        value.toLowerCase().includes(query)
      );
      if (tagMatches) return true;
      const bodyText = typeof item.body === "string" ? item.body : "";
      const haystack = `${item.title} ${bodyText}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [trailItems, trailQuery, trailFilter, covenantTagMap]);

  const auditKpis = useMemo(() => {
    const windowSeconds = auditWindowHours * 3600;
    const cutoff = Math.floor(Date.now() / 1000) - windowSeconds;
    const recentTrail = trailItems.filter((item) => item.timestamp >= cutoff);
    const summary = {
      covenantCount: covenants.length,
      disputeCount: 0,
      treasuryEvents: 0,
      totalPayoutA: treasuryOutATotal ?? 0n,
      totalPayoutB: treasuryOutBTotal ?? 0n,
      lastReserveA: formattedReservesA,
      lastReserveB: formattedReservesB,
    };
    recentTrail.forEach((item) => {
      const cat = auditCategoryForTitle(item.title);
      if (cat === "dispute") summary.disputeCount += 1;
      if (cat === "treasury") summary.treasuryEvents += 1;
    });
    return summary;
  }, [
    trailItems,
    formattedReservesA,
    formattedReservesB,
    covenants.length,
    treasuryOutATotal,
    treasuryOutBTotal,
  ]);

  const auditAlerts = useMemo(() => {
    const alerts: string[] = [];
    if (auditKpis.disputeCount > auditDisputeThreshold) {
      alerts.push("High dispute volume detected.");
    }
    if (auditKpis.treasuryEvents > auditTreasuryThreshold) {
      alerts.push("Treasury activity spike.");
    }
    if (formattedReservesA !== "--" && Number(formattedReservesA) < auditReserveThresholdA) {
      alerts.push("Low A reserves.");
    }
    if (formattedReservesB !== "--" && Number(formattedReservesB) < auditReserveThresholdB) {
      alerts.push("Low B reserves.");
    }
    return alerts;
  }, [
    auditKpis,
    formattedReservesA,
    formattedReservesB,
  ]);

  const covenantOverview = useMemo(() => {
    let active = 0;
    let disputed = 0;
    let awaitingAction = 0;
    covenants.forEach((item) => {
      if (item.status < STATUS_RESOLVED) active += 1;
      if (item.status >= 5 && item.status < STATUS_RESOLVED) disputed += 1;
      if (item.status === 0 || item.status === 1 || item.status === 5 || item.status === 6) {
        awaitingAction += 1;
      }
    });
    return { total: covenants.length, active, disputed, awaitingAction };
  }, [covenants]);

  const {
    templateById,
    reputationRingSignals,
    scopeBaselines,
    reviewPrioritySignals,
    visibleCovenants,
  } = useCovenantReview({
    covenants,
    templateList,
    covenantTagFilter,
    covenantTagMap,
    dashboardView,
    onlyFlaggedAgreements,
    covenantTransparencyMap,
    disputeReviewRecords,
  });

  const covenantQueue = useMemo(() => {
    const normalizedAccount = account.address?.toLowerCase();
    const items = visibleCovenants.map((item) => {
      const isCreator = Boolean(normalizedAccount && item.creator.toLowerCase() === normalizedAccount);
      const isWorker = Boolean(normalizedAccount && item.worker.toLowerCase() === normalizedAccount);
      const creatorActionable = isCreator && (item.status === 1 || item.status === 5 || item.status === 6);
      const workerActionable = isWorker && (item.status === 0 || item.status === 1 || item.status === 5);
      const resolverActionable = isDisputeResolver && (item.status === 6 || item.status === 7);
      const finalizerActionable = isDisputeFinalizer && item.status === 7;

      return {
        ...item,
        creatorActionable,
        workerActionable,
        resolverActionable,
        finalizerActionable,
        mineActionable:
          creatorActionable || workerActionable || resolverActionable || finalizerActionable,
      };
    });

    const counts = {
      creator: items.filter((item) => item.creatorActionable).length,
      worker: items.filter((item) => item.workerActionable).length,
      resolver: items.filter((item) => item.resolverActionable).length,
      finalizer: items.filter((item) => item.finalizerActionable).length,
      mine: items.filter((item) => item.mineActionable).length,
    };

    const filteredItems = items.filter((item) => {
      switch (queueFilter) {
        case "mine":
          return item.mineActionable;
        case "creator":
          return item.creatorActionable;
        case "worker":
          return item.workerActionable;
        case "resolver":
          return item.resolverActionable;
        case "finalizer":
          return item.finalizerActionable;
        default:
          return true;
      }
    });

    return { items: filteredItems, counts };
  }, [account.address, isDisputeFinalizer, isDisputeResolver, queueFilter, visibleCovenants]);

  const handleExportAudit = () => {
    const rows = filteredTrailItems.map((item) => {
      const bodyText = typeof item.body === "string" ? item.body : "";
      const date = new Date(item.timestamp * 1000).toISOString();
      return [date, item.title, bodyText];
    });
    const header = ["timestamp", "title", "body"];
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const safe = String(cell ?? "").replace(/"/g, '""');
            return `"${safe}"`;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-trail-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalUnclaimed = useMemo(() => {
    return unclaimedDays.reduce((sum, entry) => sum + entry.amount, 0n);
  }, [unclaimedDays]);

  const formattedIntegrity = useMemo(() => {
    if (integrityScore === undefined) return "--";
    return integrityScore.toString();
  }, [integrityScore]);

  const formattedLockedIntegrity = useMemo(() => {
    if (lockedIntegrity === undefined) return "--";
    return lockedIntegrity.toString();
  }, [lockedIntegrity]);

  const formattedAvailableIntegrity = useMemo(() => {
    if (availableIntegrity === undefined) return "--";
    return availableIntegrity.toString();
  }, [availableIntegrity]);

  const defenseQuotaRemaining = useMemo(() => {
    if (integrityScore === undefined || defenseQuotaUsed === undefined) return null;
    if (integrityScore < 100n) return 0;
    const used = Number(defenseQuotaUsed);
    return Math.max(0, 2 - used);
  }, [defenseQuotaUsed, integrityScore]);

  const defenseQuotaResetInfo = useMemo(() => {
    if (defenseQuotaMonth === undefined) return null;
    const currentMonth = Math.floor(nowSec / MONTH_SECONDS);
    const nextResetAt = (currentMonth + 1) * MONTH_SECONDS;
    const remainingSeconds = Math.max(0, nextResetAt - nowSec);
    return {
      nextResetAt,
      remainingSeconds,
      label: formatCountdown(remainingSeconds),
    };
  }, [defenseQuotaMonth, nowSec]);

  const tokenBAvailable = useMemo(() => {
    if (tokenBUnlocked !== undefined) return tokenBUnlocked;
    if (tokenBBalance !== undefined) return tokenBBalance;
    return 0n;
  }, [tokenBBalance, tokenBUnlocked]);

  const getDepositBreakdown = useCallback(
    (deposit: bigint) => {
      if (deposit <= 0n) {
        return { tokenBPart: 0n, integrityPoints: 0n };
      }
      const tokenBPart = tokenBAvailable < deposit ? tokenBAvailable : deposit;
      const integrityPartWei = deposit - tokenBPart;
      const integrityPoints = toIntegrityPoints(integrityPartWei);
      return { tokenBPart, integrityPoints };
    },
    [tokenBAvailable]
  );

  const isSelf = useCallback(
    (target: string) =>
      Boolean(account.address && target.toLowerCase() === account.address.toLowerCase()),
    [account.address]
  );

  const hasDefenseQuota = useMemo(() => {
    if (integrityScore === undefined || defenseQuotaRemaining === null) return false;
    return integrityScore >= 100n && defenseQuotaRemaining > 0;
  }, [defenseQuotaRemaining, integrityScore]);

  const renderDepositBreakdown = useCallback(
    (deposit: bigint, isActor: boolean) => {
      if (!isActor || deposit <= 0n) return null;
      if (hasDefenseQuota) {
        return (
          <span className={styles.issueHelp}>
            Defense quota available: deposit waived ({defenseQuotaRemaining ?? 0}/2 remaining).
          </span>
        );
      }
      const breakdown = getDepositBreakdown(deposit);
      const parts: string[] = [];
      if (breakdown.tokenBPart > 0n) {
        parts.push(`Token B: ${formatTokenB(breakdown.tokenBPart)}`);
      }
      if (breakdown.integrityPoints > 0n) {
        parts.push(`Integrity: ${breakdown.integrityPoints.toString()} pts`);
      }
      const label =
        parts.length > 0 ? `Deposit breakdown — ${parts.join(" + ")}` : "Deposit required.";
      const insufficientIntegrity =
        breakdown.integrityPoints > 0n &&
        (availableIntegrity ?? 0n) < breakdown.integrityPoints;
      return (
        <>
          <span className={styles.issueHelp}>{label}</span>
          {insufficientIntegrity ? (
            <span className={styles.issueHelp}>
              Not enough integrity: need {breakdown.integrityPoints.toString()} pts, available{" "}
              {(availableIntegrity ?? 0n).toString()} pts.
            </span>
          ) : null}
        </>
      );
    },
    [availableIntegrity, defenseQuotaRemaining, getDepositBreakdown, hasDefenseQuota]
  );

  const showSuccess = useCallback((message: string) => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    setTxSuccess(message);
    successTimeoutRef.current = setTimeout(() => {
      setTxSuccess(null);
      successTimeoutRef.current = null;
    }, 5000);
  }, []);

  const covenantReward = useMemo(
    () => safeParseUnits(covenantRewardAmount, 18),
    [covenantRewardAmount]
  );
  const quoteBreakdownTotal = useMemo(() => toQuoteTotal(quoteBreakdown), [quoteBreakdown]);
  const quoteBreakdownParts = useMemo(
    () => ({
      labor: safeParseUnits(quoteBreakdown.labor, 18),
      materials: safeParseUnits(quoteBreakdown.materials, 18),
      referral: safeParseUnits(quoteBreakdown.referral, 18),
      warranty: safeParseUnits(quoteBreakdown.warranty, 18),
      other: safeParseUnits(quoteBreakdown.other, 18),
    }),
    [quoteBreakdown]
  );

  const templateIdValue = useMemo(() => {
    const parsed = Number.parseInt(covenantTemplateId || "0", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return BigInt(parsed);
  }, [covenantTemplateId]);

  const { data: selectedTemplateData } = useReadContract({
    address: libraryAddr,
    abi: covenantLibraryAbi,
    functionName: "templates",
    args: templateIdValue ? [templateIdValue] : undefined,
    query: {
      enabled: Boolean(covenantLibraryAddress && templateIdValue),
    },
  });

  const { data: selectedEffectiveRoyaltyBps } = useReadContract({
    address: libraryAddr,
    abi: covenantLibraryAbi,
    functionName: "effectiveRoyaltyBps",
    args: templateIdValue ? [templateIdValue] : undefined,
    query: {
      enabled: Boolean(covenantLibraryAddress && templateIdValue),
    },
  });

  const selectedTemplate = useMemo(() => {
    if (!templateIdValue || !selectedTemplateData) return null;
    const data = selectedTemplateData as [string, bigint, string, boolean, bigint];
    return {
      id: Number(templateIdValue),
      creator: data[0],
      royaltyBps: data[1],
      metadataUri: data[2],
      active: data[3],
      createdAt: data[4],
    };
  }, [templateIdValue, selectedTemplateData]);

  const selectedTemplateMeta = useMemo(
    () => parseTemplateMetadata(selectedTemplate?.metadataUri ?? ""),
    [selectedTemplate?.metadataUri]
  );

  const selectedScopeBaseline = useMemo(() => {
    const selectedKey = buildMarketKey(selectedTemplateMeta);
    if (!selectedKey) return null;
    return scopeBaselines.find((entry) => entry.scopeKey === selectedKey) ?? null;
  }, [scopeBaselines, selectedTemplateMeta]);

  const handleExportReviewCsv = () => {
    const rows = visibleCovenants.map((item) => {
      const reviewTags = (reviewPrioritySignals.notesByCovenant[item.id] ?? []).join(" | ");
      const relationTags = (reputationRingSignals.notesByCovenant[item.id] ?? []).join(" | ");
      const transparencyNote =
        covenantTransparencyMap[String(item.id)] ?? emptyTransparencyNote();
      return [
        item.id,
        item.creator,
        item.worker,
        covenantStatusLabels[item.status] ?? "Unknown",
        Number(formatUnits(item.tokenBReward, 18)).toFixed(2),
        transparencyNote.scopeLabel,
        reviewTags,
        relationTags,
      ];
    });
    const header = [
      "agreement_id",
      "creator",
      "worker",
      "status",
      "reward",
      "scope",
      "review_tags",
      "relationship_warnings",
    ];
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const safe = String(cell ?? "").replace(/"/g, '""');
            return `"${safe}"`;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agreement-review-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const comparableRewards = useMemo(() => {
    const selectedKey = buildMarketKey(selectedTemplateMeta);
    const source = covenants
      .filter((item) => {
        if (selectedKey) {
          const template = templateById.get(Number(item.templateId));
          if (!template) return false;
          return buildMarketKey(parseTemplateMetadata(template.metadataUri)) === selectedKey;
        }
        if (templateIdValue !== null) {
          return item.templateId === templateIdValue;
        }
        return true;
      })
      .map((item) => item.tokenBReward);
    return source.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }, [covenants, selectedTemplateMeta, templateById, templateIdValue]);

  const comparableRewardStats = useMemo(() => {
    if (comparableRewards.length === 0) return null;
    const min = comparableRewards[0];
    const max = comparableRewards[comparableRewards.length - 1];
    const median = comparableRewards[Math.floor(comparableRewards.length / 2)];
    return { min, max, median, count: comparableRewards.length };
  }, [comparableRewards]);

  const priceIntegrityWarning = useMemo(() => {
    const warnings: string[] = [];
    if (quoteBreakdownTotal > 0n && covenantReward !== quoteBreakdownTotal) {
      warnings.push("The reward amount does not match the visible quote breakdown.");
    }
    if (quoteBreakdownParts.referral > 0n && quoteBreakdownTotal > 0n) {
      const referralShareBps = Number((quoteBreakdownParts.referral * 10_000n) / quoteBreakdownTotal);
      if (referralShareBps >= 1000) {
        warnings.push("Referral / intermediary share is above 10% of the quote.");
      }
    }
    if (selectedTemplateMeta.expectedMax > 0n && covenantReward > selectedTemplateMeta.expectedMax) {
      warnings.push("This reward is above the range suggested by the selected template.");
    }
    if (selectedTemplateMeta.expectedMin > 0n && covenantReward < selectedTemplateMeta.expectedMin) {
      warnings.push("This reward is below the range suggested by the selected template.");
    }
    if (
      comparableRewardStats &&
      comparableRewardStats.count >= 3 &&
      covenantReward > comparableRewardStats.median * 2n
    ) {
      warnings.push("This reward is more than 2x the median of comparable agreements.");
    }
    return warnings;
  }, [comparableRewardStats, covenantReward, quoteBreakdownParts.referral, quoteBreakdownTotal, selectedTemplateMeta]);

  const treasuryNetB = useMemo(() => {
    if (lastReservesB === undefined || liabilitiesB === undefined) return null;
    return (lastReservesB as bigint) - (liabilitiesB as bigint);
  }, [lastReservesB, liabilitiesB]);

  const treasuryNetA = useMemo(() => {
    if (lastReservesA === undefined || liabilitiesA === undefined) return null;
    return (lastReservesA as bigint) - (liabilitiesA as bigint);
  }, [lastReservesA, liabilitiesA]);

  const resourcePriceWarning = useMemo(() => {
    if (!resourceInfo) return null;
    const proposedBuyPrice = safeParseUnits(resourceBuyPriceInput || "0", 18);
    if (proposedBuyPrice <= 0n || resourceInfo.valuation <= 0n) return null;
    const resourceScope = parseTransparencyNote(resourceMetadataNote).scopeLabel.trim().toLowerCase();
    const baseline = resourceScope
      ? scopeBaselines.find((entry) => entry.scope === resourceScope) ?? null
      : null;
    if (proposedBuyPrice > resourceInfo.valuation * 125n / 100n) {
      return "Buy price is more than 25% above the current public valuation.";
    }
    if (proposedBuyPrice < resourceInfo.valuation) {
      return "Buy price is below the public valuation and will fail on-chain.";
    }
    if (baseline && baseline.observedMedian > 0n && resourceInfo.valuation > baseline.observedMedian * 3n / 2n) {
      return `Public valuation is above the current ${baseline.scope} median by more than 50%.`;
    }
    return null;
  }, [resourceBuyPriceInput, resourceInfo, resourceMetadataNote, scopeBaselines]);

  const { data: crystallizedPreview } = useReadContract({
    address: treasuryAddr,
    abi: treasuryAbi,
    functionName: "previewCrystallization",
    args: [covenantReward],
    query: {
      enabled: Boolean(treasuryAddress && covenantPayInTokenA && covenantReward > 0n),
    },
  });

  const estimatedCrystallizedReward = useMemo(() => {
    if (!covenantPayInTokenA) return null;
    if (crystallizedPreview === undefined) return null;
    return crystallizedPreview as bigint;
  }, [covenantPayInTokenA, crystallizedPreview]);

  const baseValueForRoyalty = useMemo(() => {
    if (!templateIdValue) return null;
    if (covenantPayInTokenA) {
      return estimatedCrystallizedReward ?? null;
    }
    return covenantReward;
  }, [templateIdValue, covenantPayInTokenA, estimatedCrystallizedReward, covenantReward]);

  const { data: templateRoyaltyPreview } = useReadContract({
    address: libraryAddr,
    abi: covenantLibraryAbi,
    functionName: "calculateRoyalty",
    args: templateIdValue && baseValueForRoyalty ? [templateIdValue, baseValueForRoyalty] : undefined,
    query: {
      enabled: Boolean(
        covenantLibraryAddress && templateIdValue && baseValueForRoyalty && baseValueForRoyalty > 0n
      ),
    },
  });

  const royaltyBreakdown = useMemo(() => {
    if (!templateIdValue || baseValueForRoyalty === null) return null;
    if (templateRoyaltyPreview === undefined) return null;
    const base = baseValueForRoyalty;
    const author = (templateRoyaltyPreview as bigint) > base ? base : (templateRoyaltyPreview as bigint);
    const worker = base - author;
    return { base, worker, author };
  }, [templateIdValue, baseValueForRoyalty, templateRoyaltyPreview]);

  const hasInsufficientBalance = useMemo(() => {
    const balance = covenantPayInTokenA ? tokenABalance : tokenBUnlocked;
    if (balance === undefined) return false;
    return covenantReward > balance;
  }, [covenantPayInTokenA, covenantReward, tokenABalance, tokenBUnlocked]);

  const getTrailActorContext = useCallback(
    (
      eventName: string,
      args: Record<string, unknown>,
      actorAddress?: string,
      actorIsRewardOperator?: boolean
    ): TrailActorContext => {
      if (!actorAddress) return { actorAddress: undefined, actorRoles: [] };

      const roles: string[] = [];
      if (sameAddress(actorAddress, args.creator as string | undefined)) roles.push("requester");
      if (sameAddress(actorAddress, args.worker as string | undefined)) roles.push("worker");
      if (sameAddress(actorAddress, treasuryOwner as string | undefined)) roles.push("treasury owner");
      if (actorIsRewardOperator && !sameAddress(actorAddress, treasuryOwner as string | undefined)) {
        roles.push("reward operator");
      }
      if (sameAddress(actorAddress, disputeResolver as string | undefined)) roles.push("dispute resolver");
      if (sameAddress(actorAddress, disputeFinalizer as string | undefined)) roles.push("dispute finalizer");
      if (sameAddress(actorAddress, tokenAOwner as string | undefined)) roles.push("identity operator");

      if (eventName === "ResolutionProposed" && roles.length === 0) roles.push("dispute resolver");
      if (eventName === "DisputeResolved" && roles.length === 0) roles.push("dispute finalizer");
      if (eventName === "TaskCompleted" && roles.length === 0) roles.push("reward operator");

      return { actorAddress, actorRoles: uniq(roles) };
    },
    [disputeFinalizer, disputeResolver, tokenAOwner, treasuryOwner]
  );

  const buildTrailItemFromLog = useCallback((
    log: TrailLog,
    timestamp: number,
    actorContext: TrailActorContext
  ): TrailItem | null => {
    if (!log?.eventName) return null;
    const id = `${log.transactionHash ?? "0x"}-${log.logIndex ?? 0}`;
    const eventName = log.eventName as string;
    const args = log.args ?? {};
    const actorMeta = formatActorWithRoles(actorContext);
    const actorSummary =
      actorContext.actorAddress && actorContext.actorRoles.length > 0
        ? `${safeAddress(actorContext.actorAddress)} as ${actorContext.actorRoles.join(", ")}`
        : actorContext.actorAddress
        ? `${safeAddress(actorContext.actorAddress)} as participant`
        : undefined;
    const actorRoleLabel =
      actorContext.actorRoles.length > 0 ? actorContext.actorRoles.join(" / ") : undefined;
    const withActor = (item: Omit<TrailItem, "actorSummary" | "actorRoleLabel">): TrailItem => ({
      ...item,
      actorSummary,
      actorRoleLabel,
    });

    switch (eventName) {
      case "CovenantCreated": {
        const covenantId = Number(args.covenantId ?? 0);
        const tokenBReward = (args.tokenBReward ?? 0n) as bigint;
        const integrityPoints = (args.integrityPoints ?? 0n) as bigint;
        const parts: string[] = [];
        if (tokenBReward > 0n) parts.push(formatTokenB(tokenBReward));
        if (integrityPoints > 0n) parts.push(formatIntegrity(integrityPoints));
        return withActor({
          id,
          timestamp,
          title: `Work agreement #${covenantId} created`,
          body: (
            <>
              Creator {safeAddress(args.creator as string | undefined)} · Worker{" "}
              {safeAddress(args.worker as string | undefined)}
              {parts.length ? <> · {parts.join(" · ")}</> : null}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "CovenantSubmitted": {
        const covenantId = Number(args.covenantId ?? 0);
        return withActor({
          id,
          timestamp,
          title: `Work agreement #${covenantId} submitted`,
          body: (
            <>
              Submitted by {safeAddress(args.worker as string | undefined)}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "CovenantApproved": {
        const covenantId = Number(args.covenantId ?? 0);
        return withActor({
          id,
          timestamp,
          title: `Work agreement #${covenantId} approved`,
          body: (
            <>
              Approved by {safeAddress(args.creator as string | undefined)} · Reward released
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "CovenantRejected": {
        const covenantId = Number(args.covenantId ?? 0);
        return withActor({
          id,
          timestamp,
          title: `Work agreement #${covenantId} rejected`,
          body: (
            <>
              Rejected by {safeAddress(args.creator as string | undefined)}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "CovenantCancelled": {
        const covenantId = Number(args.covenantId ?? 0);
        return withActor({
          id,
          timestamp,
          title: `Work agreement #${covenantId} cancelled`,
          body: (
            <>
              Cancelled by {safeAddress(args.creator as string | undefined)}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "IssueReported": {
        const covenantId = Number(args.covenantId ?? 0);
        const claimPct = formatPercent((args.claimBps ?? 0n) as bigint);
        const reason =
          typeof args.reason === "string" && args.reason.trim().length > 0
            ? `Reason: ${args.reason.trim()}`
            : "Reason not provided";
        const packet =
          typeof args.evidenceUri === "string" ? decodeEvidencePacket(args.evidenceUri) : null;
        const evidenceLink = formatEvidenceLink(args.evidenceUri);
        return withActor({
          id,
          timestamp,
          title: `Support requested for agreement #${covenantId}`,
          body: (
            <>
              Reported by {safeAddress(args.worker as string | undefined)} · Claim {claimPct}% ·{" "}
              {reason}
              {packet?.summary ? <> · Summary: {packet.summary}</> : null}
              {evidenceLink ? <> · {evidenceLink}</> : null}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "IssueAccepted": {
        const covenantId = Number(args.covenantId ?? 0);
        const claimPct = formatPercent((args.claimBps ?? 0n) as bigint);
        return withActor({
          id,
          timestamp,
          title: `Support accepted on agreement #${covenantId}`,
          body: (
            <>
              Accepted by {safeAddress(args.creator as string | undefined)} · Claim {claimPct}%
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "IssueDisputed": {
        const covenantId = Number(args.covenantId ?? 0);
        const reason =
          typeof args.reason === "string" && args.reason.trim().length > 0
            ? `Reason: ${args.reason.trim()}`
            : "Reason not provided";
        const packet =
          typeof args.evidenceUri === "string" ? decodeEvidencePacket(args.evidenceUri) : null;
        const evidenceLink = formatEvidenceLink(args.evidenceUri);
        return withActor({
          id,
          timestamp,
          title: `Support disputed on agreement #${covenantId}`,
          body: (
            <>
              Disputed by {safeAddress(args.creator as string | undefined)} · {reason}
              {packet?.summary ? <> · Summary: {packet.summary}</> : null}
              {evidenceLink ? <> · {evidenceLink}</> : null}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "DisputeResolverSet": {
        return withActor({
          id,
          timestamp,
          title: "Support resolver updated",
          body: (
            <>
              Dispute arbiter {safeAddress(args.resolver as string | undefined)}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "DisputeFinalizerSet": {
        return withActor({
          id,
          timestamp,
          title: "Support finalizer updated",
          body: (
            <>
              Dispute finalizer {safeAddress(args.finalizer as string | undefined)}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "ResolutionProposed": {
        const covenantId = Number(args.covenantId ?? 0);
        const payoutBps = (args.workerPayoutBps ?? 0n) as bigint;
        const integrityPoints = (args.integrityPoints ?? 0n) as bigint;
        return withActor({
          id,
          timestamp,
          title: `Support proposal for agreement #${covenantId}`,
          body: (
            <>
              {formatPercent(payoutBps)}% payout to worker · +{integrityPoints.toString()} points
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "MaliceSlashed": {
        const covenantId = Number(args.covenantId ?? 0);
        const penalty = (args.penalty ?? 0n) as bigint;
        return withActor({
          id,
          timestamp,
          title: `Integrity penalty on agreement #${covenantId}`,
          body: (
            <>
              Creator {safeAddress(args.creator as string | undefined)} · Worker{" "}
              {safeAddress(args.worker as string | undefined)} · Penalty {formatTokenB(penalty)}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "DisputeResolved": {
        const covenantId = Number(args.covenantId ?? 0);
        const payoutBps = (args.workerPayoutBps ?? 0n) as bigint;
        const integrityPoints = (args.integrityPoints ?? 0n) as bigint;
        return withActor({
          id,
          timestamp,
          title: `Support resolved: agreement #${covenantId}`,
          body: (
            <>
              {formatPercent(payoutBps)}% payout to worker · +{integrityPoints.toString()} points
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "TaskCompleted": {
        const tokenBReward = (args.tokenBReward ?? 0n) as bigint;
        const integrityPoints = (args.integrityPoints ?? 0n) as bigint;
        const parts: string[] = [];
        if (tokenBReward > 0n) parts.push(`+${formatTokenB(tokenBReward)}`);
        if (integrityPoints > 0n) parts.push(formatIntegrity(integrityPoints));
        return withActor({
          id,
          timestamp,
          title: "Task completed",
          body: (
            <>
              Worker {safeAddress(args.worker as string | undefined)}
              {parts.length ? <> · {parts.join(" · ")}</> : null}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "UBIClaimed": {
        const amount = (args.amount ?? 0n) as bigint;
        return withActor({
          id,
          timestamp,
          title: "Bonus claimed",
          body: (
            <>
              User {safeAddress(args.user as string | undefined)} · +{formatTokenA(amount)}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "CovenantSet": {
        return withActor({
          id,
          timestamp,
          title: "Agreement contract linked to treasury",
          body: (
            <>
              Contract {safeAddress(args.covenant as string | undefined)}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "RewardOperatorSet": {
        return withActor({
          id,
          timestamp,
          title: `Reward operator ${args.approved ? "approved" : "removed"}`,
          body: (
            <>
              Operator {safeAddress(args.operator as string | undefined)}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "TreasuryIn": {
        const amount = (args.amount ?? 0n) as bigint;
        const reason = formatReason(args.reason, "IN");
        return withActor({
          id,
          timestamp,
          title: "Treasury inflow",
          body: (
            <>
              From {safeAddress(args.from as string | undefined)} · +{formatTokenA(amount)} · {reason}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "TreasuryOutA": {
        const amount = (args.amount ?? 0n) as bigint;
        const reason = formatReason(args.reason, "OUT_A");
        return withActor({
          id,
          timestamp,
          title: "Treasury outflow (A)",
          body: (
            <>
              To {safeAddress(args.to as string | undefined)} · -{formatTokenA(amount)} · {reason}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "TreasuryOutB": {
        const amount = (args.amount ?? 0n) as bigint;
        const reason = formatReason(args.reason, "OUT_B");
        return withActor({
          id,
          timestamp,
          title: "Treasury outflow (B)",
          body: (
            <>
              To {safeAddress(args.to as string | undefined)} · -{formatTokenB(amount)} · {reason}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "ReserveSnapshot": {
        const reservesA = (args.reservesA ?? 0n) as bigint;
        const reservesB = (args.reservesB ?? 0n) as bigint;
        return withActor({
          id,
          timestamp,
          title: "Treasury reserve snapshot",
          body: (
            <>
              A {formatTokenA(reservesA)} · B {formatTokenB(reservesB)}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
      }
      case "LiabilityChanged": {
        const deltaA = (args.deltaA ?? 0n) as bigint;
        const deltaB = (args.deltaB ?? 0n) as bigint;
        const reason = formatReason(args.reason, "LIAB");
        return withActor({
          id,
          timestamp,
          title: "Liability updated",
          body: (
            <>
              ΔA {deltaA.toString()} · ΔB {deltaB.toString()} · {reason}
              {actorMeta ? <> · {actorMeta}</> : null}
            </>
          ),
        });
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

  const loadTrailActorContexts = useCallback(
    async (logs: TrailLog[]) => {
      if (!publicClient || logs.length === 0) return new Map<string, TrailActorContext>();

      const uniqueHashes = Array.from(
        new Set(
          logs
            .map((log) => log.transactionHash)
            .filter((hash): hash is `0x${string}` => typeof hash === "string" && hash.startsWith("0x"))
        )
      );

      const transactions = await Promise.all(
        uniqueHashes.map(async (hash) => {
          const tx = await publicClient.getTransaction({ hash });
          return [hash, tx.from] as const;
        })
      );

      const uniqueActors = Array.from(new Set(transactions.map(([, from]) => from.toLowerCase())));
      const rewardOperatorEntries = await Promise.all(
        uniqueActors.map(async (actorLower) => {
          const actorAddress = transactions.find(([, from]) => from.toLowerCase() === actorLower)?.[1];
          if (!actorAddress || treasuryAddr === zeroAddress) return [actorLower, false] as const;
          if (sameAddress(actorAddress, treasuryOwner as string | undefined)) {
            return [actorLower, false] as const;
          }
          try {
            const approved = (await publicClient.readContract({
              address: treasuryAddr,
              abi: treasuryAbi,
              functionName: "rewardOperators",
              args: [actorAddress],
            })) as boolean;
            return [actorLower, approved] as const;
          } catch {
            return [actorLower, false] as const;
          }
        })
      );

      const rewardOperatorMap = new Map<string, boolean>(rewardOperatorEntries);

      return new Map(
        logs.map((log) => {
          const id = `${log.transactionHash ?? "0x"}-${log.logIndex ?? 0}`;
          const actorAddress =
            typeof log.transactionHash === "string"
              ? transactions.find(([hash]) => hash === log.transactionHash)?.[1]
              : undefined;
          const actorIsRewardOperator = actorAddress
            ? rewardOperatorMap.get(actorAddress.toLowerCase()) ?? false
            : false;
          return [
            id,
            getTrailActorContext(log.eventName ?? "", log.args ?? {}, actorAddress, actorIsRewardOperator),
          ] as const;
        })
      );
    },
    [getTrailActorContext, publicClient, treasuryAddr, treasuryOwner]
  );

  const loadHistoricalTrail = useCallback(async () => {
    if (!publicClient || covenantAddr === zeroAddress || treasuryAddr === zeroAddress) return;
    const toBlock = await publicClient.getBlockNumber();
    const [covenantLogs, treasuryLogs] = await Promise.all([
      publicClient.getContractEvents({
        address: covenantAddr,
        abi: covenantAbi,
        fromBlock: 0n,
        toBlock,
      }),
      publicClient.getContractEvents({
        address: treasuryAddr,
        abi: treasuryAbi,
        fromBlock: 0n,
        toBlock,
      }),
    ]);

    const logs = [...covenantLogs, ...treasuryLogs];
    const actorContextMap = await loadTrailActorContexts(logs);
    const blockMap = new Map<bigint, number>();
    const uniqueBlocks = Array.from(new Set(logs.map((log) => log.blockNumber)));
    await Promise.all(
      uniqueBlocks.map(async (blockNumber) => {
        const block = await publicClient.getBlock({ blockNumber });
        blockMap.set(blockNumber, Number(block.timestamp));
      })
    );

    const items = logs
      .map((log) =>
        buildTrailItemFromLog(
          log,
          blockMap.get(log.blockNumber) ?? 0,
          actorContextMap.get(`${log.transactionHash ?? "0x"}-${log.logIndex ?? 0}`) ?? {
            actorAddress: undefined,
            actorRoles: [],
          }
        )
      )
      .filter((item): item is TrailItem => item !== null)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_TRAIL_ITEMS);

    trailIds.current = new Set(items.map((item) => item.id));
    setTrailItems(items);
  }, [publicClient, covenantAddr, treasuryAddr, buildTrailItemFromLog, loadTrailActorContexts]);

  const handleLiveLogs = useCallback(
    async (logs: TrailLog[]) => {
      if (!publicClient || logs.length === 0) return;
      const blockMap = new Map<bigint, number>();
      const actorContextMap = await loadTrailActorContexts(logs);
      const items = await Promise.all(
        logs.map(async (log) => {
          const blockNumber = log.blockNumber as bigint;
          let timestamp = blockMap.get(blockNumber);
          if (timestamp === undefined) {
            const block = await publicClient.getBlock({ blockNumber });
            timestamp = Number(block.timestamp);
            blockMap.set(blockNumber, timestamp);
          }
          return buildTrailItemFromLog(
            log,
            timestamp,
            actorContextMap.get(`${log.transactionHash ?? "0x"}-${log.logIndex ?? 0}`) ?? {
              actorAddress: undefined,
              actorRoles: [],
            }
          );
        })
      );
      addTrailItems(items.filter((item): item is TrailItem => item !== null));
    },
    [publicClient, buildTrailItemFromLog, addTrailItems, loadTrailActorContexts]
  );

  const refreshCovenants = useCallback(async () => {
    if (!publicClient || covenantAddr === zeroAddress) return;
    setIsLoadingCovenants(true);
    try {
      const nextId = await publicClient.readContract({
        address: covenantAddr,
        abi: covenantAbi,
        functionName: "nextId",
      });
      const total = Number(nextId);
      const items = await Promise.all(
        Array.from({ length: total }, async (_, index) => {
          const data = await publicClient.readContract({
            address: covenantAddr,
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
            escrowStart: data[5] as bigint,
            milestoneProgress: data[6] as bigint,
            proposedWorkerPayoutBps: data[7] as bigint,
            proposedIntegrityPoints: data[8] as bigint,
            proposedSlashingPenalty: data[9] as bigint,
            templateId: data[10] as bigint,
            paymentToken: Number(data[11]),
            paymentMode: Number(data[12]),
            status: Number(data[13]),
          };
        })
      );
      setCovenants(items);
      const reviewEntries = await Promise.all(
        items.map(async (item) => {
          const [
            workerReason,
            workerEvidenceUri,
            requesterReason,
            requesterEvidenceUri,
            arbiterNote,
            arbiterEvidenceUri,
          ] = await Promise.all([
            publicClient.readContract({
              address: covenantAddr,
              abi: covenantAbi,
              functionName: "workerIssueReason",
              args: [BigInt(item.id)],
            }) as Promise<string>,
            publicClient.readContract({
              address: covenantAddr,
              abi: covenantAbi,
              functionName: "workerIssueEvidenceUri",
              args: [BigInt(item.id)],
            }) as Promise<string>,
            publicClient.readContract({
              address: covenantAddr,
              abi: covenantAbi,
              functionName: "requesterDisputeReason",
              args: [BigInt(item.id)],
            }) as Promise<string>,
            publicClient.readContract({
              address: covenantAddr,
              abi: covenantAbi,
              functionName: "requesterDisputeEvidenceUri",
              args: [BigInt(item.id)],
            }) as Promise<string>,
            publicClient.readContract({
              address: covenantAddr,
              abi: covenantAbi,
              functionName: "arbiterResolutionNote",
              args: [BigInt(item.id)],
            }) as Promise<string>,
            publicClient.readContract({
              address: covenantAddr,
              abi: covenantAbi,
              functionName: "arbiterResolutionEvidenceUri",
              args: [BigInt(item.id)],
            }) as Promise<string>,
          ]);
          return [
            item.id,
            {
              workerReason,
              workerEvidenceUri,
              requesterReason,
              requesterEvidenceUri,
              arbiterNote,
              arbiterEvidenceUri,
            } satisfies DisputeReviewRecord,
          ] as const;
        })
      );
      setDisputeReviewRecords(Object.fromEntries(reviewEntries));
      if (typeof window !== "undefined") {
        for (const item of items) {
          const key = `covenant-tags:pending-${item.id}`;
          if (localStorage.getItem(key)) {
            localStorage.setItem(`covenant-tags:${item.id}`, localStorage.getItem(key) || "");
            localStorage.removeItem(key);
          }
        }
        const nextMap: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i += 1) {
          const storageKey = localStorage.key(i);
          if (!storageKey || !storageKey.startsWith("covenant-tags:")) continue;
          const id = storageKey.replace("covenant-tags:", "");
          const value = localStorage.getItem(storageKey);
          if (value) {
            nextMap[id] = value;
          }
        }
        const transparencyEntries = await Promise.all(
          items.map(async (item) => {
            const note = (await publicClient.readContract({
              address: covenantAddr,
              abi: covenantAbi,
              functionName: "transparencyNotes",
              args: [BigInt(item.id)],
            })) as string;
            return [String(item.id), parseTransparencyNote(note)] as const;
          })
        );
        setCovenantTagMap(nextMap);
        setCovenantTransparencyMap(Object.fromEntries(transparencyEntries));
      }
    } finally {
      setIsLoadingCovenants(false);
    }
  }, [publicClient, covenantAddr, setDisputeReviewRecords]);

  const loadUnclaimed = useCallback(async () => {
    if (!publicClient || treasuryAddr === zeroAddress || !account.address) return;
    const block = await publicClient.getBlock();
    const day = Number(block.timestamp / 86400n);
    setCurrentDayIndex(day);
    const lookback = 6;
    const entries: { day: number; amount: bigint }[] = [];
    for (let offset = 0; offset <= lookback; offset += 1) {
      const targetDay = day - offset;
      if (targetDay < 0) continue;
      const amount = (await publicClient.readContract({
        address: treasuryAddr,
        abi: treasuryAbi,
        functionName: "unclaimed",
        args: [account.address, BigInt(targetDay)],
      })) as bigint;
      entries.push({ day: targetDay, amount });
    }
    setUnclaimedDays(entries);
    if (!unclaimedFromDay) {
      setUnclaimedFromDay(String(Math.max(day - lookback, 0)));
    }
    if (!unclaimedToDay) {
      setUnclaimedToDay(String(day));
    }
  }, [account.address, publicClient, treasuryAddr, unclaimedFromDay, unclaimedToDay]);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      refetchTokenA(),
      refetchTokenB(),
      refetchTokenBLocked(),
      refetchTokenBUnlocked(),
      refetchIntegrity(),
      refetchLockedIntegrity(),
      refetchAvailableIntegrity(),
      refetchEligibility(),
      refetchDefenseQuotaUsed(),
      refetchDefenseQuotaMonth(),
      refreshCovenants(),
      loadUnclaimed(),
    ]);
  }, [
    refetchEligibility,
    refetchIntegrity,
    refetchLockedIntegrity,
    refetchAvailableIntegrity,
    refetchTokenA,
    refetchTokenB,
    refetchTokenBLocked,
    refetchTokenBUnlocked,
    refetchDefenseQuotaUsed,
    refetchDefenseQuotaMonth,
    refreshCovenants,
    loadUnclaimed,
  ]);

  const postTransactionSync = useCallback(async () => {
    await refreshAll();
    await wait(500);
    await loadHistoricalTrail();
    setRefreshKey((value) => value + 1);
  }, [loadHistoricalTrail, refreshAll]);

  const runTransaction = useCallback(
    async (actionKey: string, request: () => Promise<`0x${string}`>) => {
      if (!publicClient) {
        throw new Error("Public client unavailable.");
      }
      setTxError(null);
      setTxAction(actionKey);
      setTxStatus("signing");
      const hash = await request();
      setTxStatus("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      return receipt;
    },
    [publicClient]
  );

  const actionLabel = useCallback(
    (actionKey: string, defaultLabel: string) => {
      if (txAction !== actionKey) return defaultLabel;
      return txStatus === "confirming" ? "Confirming…" : "Processing…";
    },
    [txAction, txStatus]
  );

  const isBusy = isWriting || txStatus !== "idle";

  const {
    handleSubmitWork,
    handleApproveWork,
    handleRejectWork,
    handleCancelCovenant,
    handleReportIssue,
    handleAcceptIssue,
    handleDisputeIssue,
    handleResolveDispute,
    handleFinalizeResolution,
  } = useCovenantActions({
    covenantAddress,
    tokenBAddress,
    covenantAddr,
    tokenBAddr,
    treasuryAddr,
    publicClient,
    covenants,
    disputeState: disputeFormState,
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
  });

  useEffect(() => {
    if (!taskWorker && account.address) {
      setTaskWorker(account.address);
    }
  }, [account.address, taskWorker]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setLocale(navigator.languages?.[0] ?? navigator.language ?? "en-US");
  }, []);

  useEffect(() => {
    if (!covenantWorker && account.address) {
      setCovenantWorker(account.address);
    }
  }, [account.address, covenantWorker]);

  useEffect(() => {
    const loadTemplates = async () => {
      if (!publicClient || libraryAddr === zeroAddress) {
        setTemplateList([]);
        return;
      }
      const total = (await publicClient.readContract({
        address: libraryAddr,
        abi: covenantLibraryAbi,
        functionName: "nextTemplateId",
      })) as bigint;
      const maxId = Math.min(Number(total) - 1, 25);
      if (maxId < 1) {
        setTemplateList([]);
        setTemplateActiveMap({});
        return;
      }
      const items = await Promise.all(
        Array.from({ length: maxId }, async (_, index) => {
          const templateId = BigInt(index + 1);
          const data = (await publicClient.readContract({
            address: libraryAddr,
            abi: covenantLibraryAbi,
            functionName: "templates",
            args: [templateId],
          })) as [string, bigint, string, boolean, bigint];
          const effective = (await publicClient.readContract({
            address: libraryAddr,
            abi: covenantLibraryAbi,
            functionName: "effectiveRoyaltyBps",
            args: [templateId],
          })) as bigint;
          return {
            id: index + 1,
            creator: data[0],
            royaltyBps: data[1],
            metadataUri: data[2],
            active: data[3],
            createdAt: data[4],
            effectiveRoyaltyBps: effective,
          };
        })
      );
      setTemplateList(items);
      const actives: Record<number, boolean> = {};
      items.forEach((item) => {
        actives[item.id] = item.active;
      });
      setTemplateActiveMap(actives);
    };
    void loadTemplates();
  }, [publicClient, libraryAddr, refreshKey]);

  useEffect(() => {
    switch (covenantTemplate) {
      case "micro":
        setCovenantRewardAmount("50");
        setCovenantIntegrityPoints("10");
        setCovenantPayInTokenA(false);
        break;
      case "delivery":
        setCovenantRewardAmount("200");
        setCovenantIntegrityPoints("40");
        setCovenantPayInTokenA(false);
        break;
      case "audit":
        setCovenantRewardAmount("300");
        setCovenantIntegrityPoints("80");
        setCovenantPayInTokenA(false);
        break;
      case "urgent":
        setCovenantRewardAmount("400");
        setCovenantIntegrityPoints("120");
        setCovenantPayInTokenA(true);
        break;
      case "education":
        setCovenantRewardAmount("500");
        setCovenantIntegrityPoints("150");
        setCovenantPayInTokenA(false);
        setCovenantTags("education, upskill");
        setCovenantTemplateUri((current) => current || "ipfs://education-template");
        break;
      default:
        break;
    }
  }, [covenantTemplate]);

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
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    void loadUnclaimed();
  }, [loadUnclaimed]);

  useEffect(() => {
    if (!publicClient || covenantAddr === zeroAddress || treasuryAddr === zeroAddress) return;
    const unwatchCovenant = publicClient.watchContractEvent({
      address: covenantAddr,
      abi: covenantAbi,
      onLogs: (logs) => void handleLiveLogs(logs),
    });
    const unwatchTreasury = publicClient.watchContractEvent({
      address: treasuryAddr,
      abi: treasuryAbi,
      onLogs: (logs) => void handleLiveLogs(logs),
    });
    return () => {
      unwatchCovenant();
      unwatchTreasury();
    };
  }, [publicClient, covenantAddr, treasuryAddr, handleLiveLogs]);

  useEffect(() => {
    if (!publicClient || libraryAddr === zeroAddress) return;
    const unwatchLibrary = publicClient.watchContractEvent({
      address: libraryAddr,
      abi: covenantLibraryAbi,
      onLogs: () => setRefreshKey((value) => value + 1),
    });
    return () => {
      unwatchLibrary();
    };
  }, [publicClient, libraryAddr]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextMap: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("covenant-tags:")) continue;
      const id = key.replace("covenant-tags:", "");
      const value = localStorage.getItem(key);
      if (value) {
        nextMap[id] = value;
      }
    }
    setCovenantTagMap(nextMap);
  }, []);

  useEffect(() => {
    const loadAppiStats = async () => {
      if (!publicClient || !appiOracleAddr || appiOracleAddr === zeroAddress) {
        setAppiStats([]);
        setAppiDiversity("--");
        return;
      }
      if (appiDayForRead === null) {
        setAppiStats([]);
        setAppiDiversity("--");
        return;
      }
      const raw = appiCategoryInput.trim();
      if (!raw) {
        setAppiStats([]);
        setAppiDiversity("--");
        return;
      }
      const categories = raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isFinite(value) && value >= 0);
      if (categories.length === 0) {
        setAppiStats([]);
        setAppiDiversity("--");
        return;
      }
      const results = await Promise.all(
        categories.map(async (category) => {
          const reports = (await publicClient.readContract({
            address: appiOracleAddr as `0x${string}`,
            abi: appiOracleAbi,
            functionName: "getReports",
            args: [BigInt(appiDayForRead), BigInt(category)],
          })) as { reporter: string; price: bigint }[];
          const unique = new Set(reports.map((report) => report.reporter.toLowerCase())).size;
          return { category, reports: reports.length, unique };
        })
      );
      const active = results.filter((entry) => entry.reports > 0).length;
      const diversity =
        results.length === 0 ? "--" : `${Math.round((active / results.length) * 100)}%`;
      setAppiStats(results);
      setAppiDiversity(diversity);
    };
    void loadAppiStats();
  }, [publicClient, appiOracleAddr, appiDayForRead, appiCategoryInput]);

  const handleClaim = async () => {
    if (!treasuryAddress) return;
    try {
      await runTransaction("claimUBI", () =>
        writeContractAsync({
          address: treasuryAddr,
          abi: treasuryAbi,
          functionName: "claimUBI",
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
  };

  const handleSetAppiOracle = async () => {
    if (!treasuryAddress) return;
    const target = appiOracleInput.trim();
    if (!target) {
      setTxError("Enter APPI oracle address.");
      setTxSuccess(null);
      return;
    }
    if (!isAddress(target)) {
      setTxError("Enter a valid APPI oracle address.");
      setTxSuccess(null);
      return;
    }
    try {
      await runTransaction("setAPPIOracle", () =>
        writeContractAsync({
          address: treasuryAddr,
          abi: treasuryAbi,
          functionName: "setAPPIOracle",
          args: [target],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("APPI oracle updated.");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleSetAppiCategories = async () => {
    if (!appiOracleAddr || appiOracleAddr === zeroAddress) {
      setTxError("APPI oracle not set.");
      setTxSuccess(null);
      return;
    }
    const raw = appiCategoryInput.trim();
    if (!raw) {
      setTxError("Enter category ids (comma separated).");
      setTxSuccess(null);
      return;
    }
    const values = raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value) && value >= 0);
    if (values.length === 0) {
      setTxError("Invalid category list.");
      setTxSuccess(null);
      return;
    }
    try {
      await runTransaction("setAPPIcategories", () =>
        writeContractAsync({
          address: appiOracleAddr as `0x${string}`,
          abi: appiOracleAbi,
          functionName: "setCategories",
          args: [values.map((value) => BigInt(value))],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("APPI categories updated.");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleSubmitAppiPrice = async () => {
    if (!appiOracleAddr || appiOracleAddr === zeroAddress) {
      setTxError("APPI oracle not set.");
      setTxSuccess(null);
      return;
    }
    const category = Number.parseInt(appiCategoryInput || "", 10);
    const price = safeParseUnits(appiPriceInput || "0", 18);
    if (!Number.isFinite(category) || category < 0) {
      setTxError("Invalid category id.");
      setTxSuccess(null);
      return;
    }
    if (price <= 0n) {
      setTxError("Price must be positive.");
      setTxSuccess(null);
      return;
    }
    try {
      await runTransaction("submitAPPI", () =>
        writeContractAsync({
          address: appiOracleAddr as `0x${string}`,
          abi: appiOracleAbi,
          functionName: "submitPrice",
          args: [BigInt(category), price],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("APPI price submitted.");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleApplyAppi = async () => {
    if (!treasuryAddress) return;
    const dayInput =
      appiDayInput.trim() ||
      (currentDayIndex !== null ? currentDayIndex.toString() : "");
    const day = Number.parseInt(dayInput, 10);
    if (!Number.isFinite(day) || day < 0) {
      setTxError("Invalid day index.");
      setTxSuccess(null);
      return;
    }
    try {
      await runTransaction("applyAPPI", () =>
        writeContractAsync({
          address: treasuryAddr,
          abi: treasuryAbi,
          functionName: "applyAPPI",
          args: [BigInt(day)],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("APPI applied.");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleSetAppiConfidence = async () => {
    if (!appiOracleAddr || appiOracleAddr === zeroAddress) {
      setTxError("APPI oracle not set.");
      setTxSuccess(null);
      return;
    }
    const bps = Number.parseInt(appiConfidenceBps || "0", 10);
    const maxReports = Number.parseInt(appiMaxReports || "0", 10);
    if (!Number.isFinite(bps) || bps < 0 || bps > 10_000) {
      setTxError("Confidence must be between 0 and 10000.");
      return;
    }
    if (!Number.isFinite(maxReports) || maxReports <= 0) {
      setTxError("Max reports must be > 0.");
      return;
    }
    try {
      await runTransaction("setAPPIConfidence", () =>
        writeContractAsync({
          address: appiOracleAddr as `0x${string}`,
          abi: appiOracleAbi,
          functionName: "setConfidence",
          args: [BigInt(bps), BigInt(maxReports)],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("APPI confidence updated.");
    } catch (error) {
      setTxError(formatTxError(error));
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleSetPrimary = useCallback(async () => {
    const accountAddress = account.address;
    if (!tokenAAddress || !accountAddress) return;
    try {
      await runTransaction("setPrimary", () =>
        writeContractAsync({
          address: tokenAAddr,
          abi: tokenAAbi,
          functionName: "setPrimaryAddress",
          args: [accountAddress, true],
        })
      );
      await postTransactionSync();
      await refetchPrimary?.();
      setTxError(null);
      showSuccess("Primary verification updated.");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  }, [
    tokenAAddr,
    account.address,
    writeContractAsync,
    postTransactionSync,
    refetchPrimary,
    runTransaction,
    showSuccess,
  ]);

  const {
    worldIdOpen,
    setWorldIdOpen,
    worldIdRpContext,
    handleWorldIdHostVerify,
    handleWorldIdWidgetSuccess,
    handleWorldIdWidgetError,
    handleWorldIdVerify,
    handleZkNfcVerify,
  } = useIdentityFlow({
    accountAddress: account.address,
    worldIdAppId,
    worldIdActionId,
    worldIdEnvironment,
    worldIdMock,
    zknfcMock,
    zknfcVerifierUrl,
    handleSetPrimary,
    showSuccess,
    setTxError,
    setTxSuccess,
    setTxStatus,
    setTxAction,
    normalizeErrorMessage,
  });

  const identityErrorKind = useMemo(() => classifyIdentityError(txError), [txError]);

  const verificationStatusLabel = useMemo(() => {
    if (!account.address) return "Connect wallet";
    if (isPrimaryAddress === undefined) return "Checking current status…";
    if (isPrimaryAddress) return "Verified";
    if (txAction === "worldIdVerify") return "Preparing World ID verification…";
    if (txAction === "zknfcVerify") return "Preparing ZK-NFC verification…";
    if (txAction === "setPrimary") {
      return txStatus === "confirming" ? "Registering verified wallet…" : "Awaiting wallet confirmation…";
    }
    if (worldIdOpen) return "Complete the World ID widget to continue.";
    if (identityErrorKind === "unreachable") return "Verifier unreachable";
    if (identityErrorKind === "config") return "Verification config missing";
    if (identityErrorKind === "failed") return "Verification failed";
    return "Not verified yet";
  }, [account.address, identityErrorKind, isPrimaryAddress, txAction, txStatus, worldIdOpen]);

  const verificationStatusDetail = useMemo(() => {
    if (!account.address) return "Connect a wallet first to see which verification routes are usable.";
    if (isPrimaryAddress === undefined) return "The frontend is checking whether this address is already primary.";
    if (isPrimaryAddress) return "This address can use the full daily bonus flow and identity-gated actions.";
    if (txAction === "worldIdVerify") {
      return worldIdMock
        ? "Mock mode will skip the remote verifier and move directly to primary-address registration."
        : "The app is requesting RP context before opening the World ID widget.";
    }
    if (txAction === "zknfcVerify") {
      return zknfcMock
        ? "Mock mode will skip the remote verifier and move directly to primary-address registration."
        : "The app is sending this wallet to the ZK-NFC verifier route.";
    }
    if (txAction === "setPrimary") {
      return "The operator step is writing setPrimaryAddress on-chain. Confirm in the wallet if prompted.";
    }
    if (worldIdOpen) return "The widget is open. Complete or cancel it there, then return here.";
    if (identityErrorKind === "unreachable") {
      return "Retry the same route, switch to another configured route, or use operator mock verification for local testing.";
    }
    if (identityErrorKind === "config") {
      return "Check the env values for the selected route, or fall back to another enabled route.";
    }
    if (identityErrorKind === "failed") {
      return txError ?? "The verifier rejected this attempt. Re-check the proof route and try again.";
    }
    if (hasWorldIdConfig) return "World ID is the active route here. If it is unavailable, ZK-NFC or operator fallback can still be used.";
    if (hasZkNfcConfig) return "World ID is disabled in this env, but ZK-NFC is available as the active route.";
    return "No remote verifier is active in this env, so local testing depends on the temporary operator wallet.";
  }, [account.address, identityErrorKind, isPrimaryAddress, txAction, txError, worldIdOpen]);

  const worldIdButtonHint = useMemo(() => {
    if (!hasWorldIdConfig) return "World ID is disabled in this environment.";
    if (!account.address) return "Connect a wallet to start World ID verification.";
    if (isPrimaryAddress) return "This wallet is already verified.";
    if (isBusy && txAction !== "worldIdVerify") return "Another transaction is already in progress.";
    if (worldIdMock) return "Mock mode: this will skip the remote verifier and write the primary address directly.";
    return "Recommended when you want the normal World ID path for this environment.";
  }, [account.address, isBusy, isPrimaryAddress, txAction]);

  const zknfcButtonHint = useMemo(() => {
    if (!hasZkNfcConfig) return "ZK-NFC is disabled in this environment.";
    if (!account.address) return "Connect a wallet to start ZK-NFC verification.";
    if (isPrimaryAddress) return "This wallet is already verified.";
    if (isBusy && txAction !== "zknfcVerify") return "Another transaction is already in progress.";
    if (zknfcMock) return "Mock mode: this will skip the remote verifier and write the primary address directly.";
    return "Use this when World ID is unavailable here or when you want to test the NFC route.";
  }, [account.address, isBusy, isPrimaryAddress, txAction]);

  const operatorVerifyHint = useMemo(() => {
    if (!account.address) return "Connect a wallet first.";
    if (isPrimaryAddress) return "This wallet is already verified.";
    if (!isTokenAOwner) return "Switch to the temporary operator wallet to use the direct mock registration path.";
    if (isBusy && txAction !== "setPrimary") return "Another transaction is already in progress.";
    return "Operator fallback: writes setPrimaryAddress directly for local or recovery testing.";
  }, [account.address, isBusy, isPrimaryAddress, isTokenAOwner, txAction]);

  const identityNextStep = useMemo(() => {
    if (!account.address) return "Connect a wallet, then choose the route that matches this environment.";
    if (isPrimaryAddress) return "Verification is complete. Continue to Step 2 and collect or accrue your daily bonus.";
    if (txAction === "worldIdVerify" || worldIdOpen) {
      return "Finish the World ID flow, then wait for the primary-address registration step.";
    }
    if (txAction === "zknfcVerify") {
      return "Wait for the verifier response, then confirm the primary-address registration step if prompted.";
    }
    if (txAction === "setPrimary") {
      return "Confirm the wallet transaction to register this address as primary.";
    }
    if (identityErrorKind === "unreachable") {
      return "Retry the same route if the verifier is back, or switch to another enabled route for local testing.";
    }
    if (identityErrorKind === "config") {
      return "Check the env setup for the intended route, or use another enabled route while the config is incomplete.";
    }
    if (identityErrorKind === "failed") {
      return "Retry after checking the proof source or use another available route to confirm the rest of the participant flow.";
    }
    if (hasWorldIdConfig) return "Start with World ID, then use ZK-NFC or operator fallback only if the route is unavailable.";
    if (hasZkNfcConfig) return "Start with ZK-NFC. If you only need a local demo, operator fallback is still available.";
    return "Use the operator fallback path for local testing in this environment.";
  }, [
    account.address,
    identityErrorKind,
    isPrimaryAddress,
    txAction,
    worldIdOpen,
  ]);

  const handleAccrueUnclaimed = async () => {
    if (!treasuryAddress) return;
    try {
      await runTransaction("accrueUBI", () =>
        writeContractAsync({
          address: treasuryAddr,
          abi: treasuryAbi,
          functionName: "accrueUBI",
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Accrued bonus.");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleClaimUnclaimed = async () => {
    if (!treasuryAddress) return;
    const fromDay = Number.parseInt(unclaimedFromDay || "", 10);
    const toDay = Number.parseInt(unclaimedToDay || "", 10);
    if (!Number.isFinite(fromDay) || !Number.isFinite(toDay) || fromDay < 0 || toDay < fromDay) {
      setTxError("Invalid day range for saved bonuses.");
      setTxSuccess(null);
      return;
    }
    try {
      await runTransaction("claimUnclaimed", () =>
        writeContractAsync({
          address: treasuryAddr,
          abi: treasuryAbi,
          functionName: "claimUnclaimed",
          args: [BigInt(fromDay), BigInt(toDay)],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Saved bonus claimed.");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleUseRecentDays = () => {
    if (currentDayIndex === null) return;
    const lookback = 6;
    setUnclaimedFromDay(String(Math.max(currentDayIndex - lookback, 0)));
    setUnclaimedToDay(String(currentDayIndex));
  };

  const handleReport = async () => {
    if (!treasuryAddress || !taskWorker) return;
    const workerAddress = taskWorker.trim();
    if (!isAddress(workerAddress)) {
      setTxError("Enter a valid worker address.");
      setTxSuccess(null);
      return;
    }
    const amount = parseUnits(taskTokenBAmount || "0", 18);
    const points = BigInt(taskIntegrityPoints || "0");
    try {
      await runTransaction("reportTaskCompleted", () =>
        writeContractAsync({
          address: treasuryAddr,
          abi: treasuryAbi,
          functionName: "reportTaskCompleted",
          args: [workerAddress, amount, points],
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
  };

  const handleCreateCovenant = async () => {
    if (!covenantAddress || !covenantWorker) return;
    const workerAddress = covenantWorker.trim();
    if (!isAddress(workerAddress)) {
      setTxError("Enter a valid worker address.");
      setTxSuccess(null);
      return;
    }
    const paymentTokenAddress = covenantPayInTokenA ? tokenAAddress : tokenBAddress;
    const paymentTokenAbi = covenantPayInTokenA ? tokenAAbi : tokenBAbi;
    if (!paymentTokenAddress) return;
    const reward = covenantReward;
    const points = BigInt(covenantIntegrityPoints || "0");
    const transparencyValue = JSON.stringify({
      scopeLabel: templateScopeLabel.trim(),
      estimatedHours: Number.parseFloat(templateEstimatedHours || "0") || 0,
      materialClass: templateMaterialClass,
      urgency: templateUrgency,
      relatedPartyDisclosure: relatedPartyDisclosure.trim(),
      marketContext: marketContextNote.trim(),
      breakdown: quoteBreakdown,
    });
    if (typeof window !== "undefined" && covenantTags.trim()) {
      try {
        const tagKey = `covenant-tags:pending-${Date.now()}`;
        localStorage.setItem(tagKey, covenantTags.trim());
        setCovenantTagMap((prev) => ({
          ...prev,
          [tagKey.replace("covenant-tags:", "")]: covenantTags.trim(),
        }));
      } catch {
        // ignore localStorage failures
      }
    }
    try {
      setCovenantStep(1);
      await runTransaction("createCovenant", () =>
        writeContractAsync({
          address: paymentTokenAddress,
          abi: paymentTokenAbi,
          functionName: "approve",
            args: [covenantAddr, reward],
        })
      );
      setCovenantStep(2);
      const receipt = await runTransaction("createCovenant", () =>
        writeContractAsync({
          address: covenantAddr,
          abi: covenantAbi,
          functionName: "createCovenant",
          args: [workerAddress, reward, points, covenantPayInTokenA],
        })
      );
      let createdId: bigint | null = null;
      if (receipt) {
        const parsed = parseEventLogs({
          abi: covenantAbi,
          logs: receipt.logs,
        });
        const created = parsed.find((log) => log.eventName === "CovenantCreated");
        if (created?.args && "covenantId" in created.args) {
          createdId = created.args.covenantId as bigint;
        }
      }
      if (covenantLibraryAddress && Number(covenantTemplateId) > 0 && createdId !== null) {
        await runTransaction("recordTemplateUse", () =>
          writeContractAsync({
            address: libraryAddr,
            abi: covenantLibraryAbi,
            functionName: "recordUse",
            args: [BigInt(covenantTemplateId), createdId, reward],
          })
        );
      }
      if (createdId !== null) {
        await runTransaction("setTransparencyNote", () =>
          writeContractAsync({
            address: covenantAddr,
            abi: covenantAbi,
            functionName: "setTransparencyNote",
            args: [createdId, transparencyValue, keccak256(stringToBytes(transparencyValue))],
          })
        );
        setCovenantTransparencyMap((prev) => ({
          ...prev,
          [createdId.toString()]: parseTransparencyNote(transparencyValue),
        }));
      }
      await postTransactionSync();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
      setCovenantStep(0);
    }
  };

  const handleRegisterTemplate = async () => {
    if (!covenantLibraryAddress) return;
    const bps = Number.parseInt(covenantRoyaltyBps || "0", 10);
    if (!Number.isFinite(bps) || bps < 0) {
      setTxError("Invalid royalty BPS.");
      return;
    }
    const metadataValue = buildTemplateMetadataValue({
      sourceUri: covenantTemplateUri,
      scopeLabel: templateScopeLabel,
      estimatedHours: templateEstimatedHours,
      materialClass: templateMaterialClass,
      urgency: templateUrgency,
      expectedMin: templateExpectedMin,
      expectedMax: templateExpectedMax,
      marketNote: templateMarketNote,
      referralDisclosure: templateReferralDisclosure,
      breakdown: quoteBreakdown,
    });
    try {
      await runTransaction("registerTemplate", () =>
        writeContractAsync({
          address: libraryAddr,
          abi: covenantLibraryAbi,
          functionName: "registerTemplate",
          args: [BigInt(bps), metadataValue],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Template registered.");
    } catch (error) {
      setTxError(formatTxError(error));
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleToggleTemplate = async (templateId: number, active: boolean) => {
    if (!covenantLibraryAddress) return;
    try {
      await runTransaction("toggleTemplate", () =>
        writeContractAsync({
          address: libraryAddr,
          abi: covenantLibraryAbi,
          functionName: "setActive",
          args: [BigInt(templateId), active],
        })
      );
      await postTransactionSync();
      setTemplateActiveMap((prev) => ({ ...prev, [templateId]: active }));
      setTxError(null);
      showSuccess("Template status updated.");
    } catch (error) {
      setTxError(formatTxError(error));
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleRecordTemplateUse = async () => {
    if (!covenantLibraryAddress) return;
    const templateId = Number.parseInt(covenantTemplateId || "0", 10);
    const covenantId = Number.parseInt(templateUseCovenantId || "0", 10);
    if (!Number.isFinite(templateId) || templateId <= 0) {
      setTxError("Template ID must be > 0.");
      return;
    }
    if (!Number.isFinite(covenantId) || covenantId < 0) {
      setTxError("Invalid covenant ID.");
      return;
    }
    const amount = safeParseUnits(templateUseAmount || "0", 18);
    try {
      await runTransaction("recordTemplateUse", () =>
        writeContractAsync({
          address: libraryAddr,
          abi: covenantLibraryAbi,
          functionName: "recordUse",
          args: [BigInt(templateId), BigInt(covenantId), amount],
        })
      );
      await postTransactionSync();
      setTxError(null);
      showSuccess("Template usage recorded.");
    } catch (error) {
      setTxError(formatTxError(error));
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };



  const resourceIdBytes = useMemo(() => {
    const trimmed = resourceIdInput.trim();
    if (!trimmed) return null;
    return keccak256(stringToBytes(trimmed));
  }, [resourceIdInput]);

  const handleLoadResource = async () => {
    if (!publicClient || !resourceIdBytes || !resourceRegistryAddress) return;
    const data = (await publicClient.readContract({
      address: registryAddr,
      abi: resourceRegistryAbi,
      functionName: "resources",
      args: [resourceIdBytes],
    })) as [string, bigint, bigint, bigint, boolean];
    const pending = (await publicClient.readContract({
      address: registryAddr,
      abi: resourceRegistryAbi,
      functionName: "pendingTax",
      args: [resourceIdBytes],
    })) as [bigint, bigint];
    const note = (await publicClient.readContract({
      address: registryAddr,
      abi: resourceRegistryAbi,
      functionName: "resourceMetadataNotes",
      args: [resourceIdBytes],
    })) as string;
    setResourceInfo({
      owner: data[0],
      valuation: data[1],
      taxRateBps: data[2],
      lastTaxTimestamp: data[3],
      exists: data[4],
      due: pending[0],
      elapsed: pending[1],
    });
    setResourceMetadataNote(note);
  };

  const persistResourceMetadata = async () => {
    if (!resourceRegistryAddress || !resourceIdBytes) return;
    const note = JSON.stringify({
      scopeLabel: resourceIdInput.trim(),
      relatedPartyDisclosure: resourceRelatedPartyInput.trim(),
      marketContext: resourceMetadataNoteInput.trim(),
      breakdown: emptyQuoteBreakdown(),
    });
    await runTransaction("setResourceMetadata", () =>
      writeContractAsync({
        address: registryAddr,
        abi: resourceRegistryAbi,
        functionName: "setResourceMetadata",
        args: [resourceIdBytes, note, keccak256(stringToBytes(note))],
      })
    );
    setResourceMetadataNote(note);
  };

  const handleRegisterResource = async () => {
    if (!resourceRegistryAddress || !resourceIdBytes) return;
    const valuation = safeParseUnits(resourceValuationInput || "0", 18);
    const rate = Number.parseInt(resourceTaxRateInput || "0", 10);
    if (!Number.isFinite(rate) || rate < 0) {
      setTxError("Invalid tax rate.");
      return;
    }
    try {
      await runTransaction("registerResource", () =>
        writeContractAsync({
          address: registryAddr,
          abi: resourceRegistryAbi,
          functionName: "registerResource",
          args: [resourceIdBytes, valuation, BigInt(rate)],
        })
      );
      if (resourceMetadataNoteInput.trim() || resourceRelatedPartyInput.trim()) {
        await persistResourceMetadata();
      }
      await postTransactionSync();
      await handleLoadResource();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleUpdateValuation = async () => {
    if (!resourceRegistryAddress || !resourceIdBytes) return;
    const valuation = safeParseUnits(resourceValuationInput || "0", 18);
    try {
      await runTransaction("updateValuation", () =>
        writeContractAsync({
          address: registryAddr,
          abi: resourceRegistryAbi,
          functionName: "updateValuation",
          args: [resourceIdBytes, valuation],
        })
      );
      if (resourceMetadataNoteInput.trim() || resourceRelatedPartyInput.trim()) {
        await persistResourceMetadata();
      }
      await postTransactionSync();
      await handleLoadResource();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handlePayResourceTax = async () => {
    if (!resourceRegistryAddress || !resourceIdBytes) return;
    try {
      await runTransaction("payTax", () =>
        writeContractAsync({
          address: registryAddr,
          abi: resourceRegistryAbi,
          functionName: "payTax",
          args: [resourceIdBytes],
        })
      );
      await postTransactionSync();
      await handleLoadResource();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const handleBuyResource = async () => {
    if (!resourceRegistryAddress || !resourceIdBytes) return;
    const price = safeParseUnits(resourceBuyPriceInput || "0", 18);
    try {
      await runTransaction("buyResource", () =>
        writeContractAsync({
          address: registryAddr,
          abi: resourceRegistryAbi,
          functionName: "buyResource",
          args: [resourceIdBytes, price],
        })
      );
      await postTransactionSync();
      await handleLoadResource();
      setTxError(null);
      showSuccess("Transaction successful!");
    } catch (error) {
      setTxError(formatTxError(error));
      setTxSuccess(null);
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  };

  const covenantStatusLabels = [
    "Waiting for worker",
    "Waiting for owner review",
    "Completed",
    "Rejected",
    "Cancelled",
    "Worker asked for help",
    "Owner challenged claim",
    "Resolver proposed outcome",
    "Resolved",
  ];

  return (
    <div className={styles.page}>
      <div className={styles.backgroundGlow} aria-hidden="true" />
      <main id="main-content" className={styles.main}>
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

        {txError ? (
          <section className={styles.messageError} role="alert">
            <strong>Action could not finish</strong>
            <p>{txError}</p>
          </section>
        ) : null}
        {txSuccess ? (
          <section className={styles.messageSuccess} role="status" aria-live="polite">
            <strong>Action completed</strong>
            <p>{txSuccess}</p>
          </section>
        ) : null}

        {missingEnv ? (
          <section className={styles.warning}>
            <h2>Setup is incomplete</h2>
            <p>
              This page cannot send transactions yet because contract addresses
              are missing. Set NEXT_PUBLIC_TOKENA_ADDRESS,
              NEXT_PUBLIC_TOKENB_ADDRESS, NEXT_PUBLIC_TREASURY_ADDRESS, and
              NEXT_PUBLIC_COVENANT_ADDRESS in frontend/.env.local.
            </p>
          </section>
        ) : null}

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.badge}>Phase 1 MVP</p>
            <h1>Connect your wallet, verify it, and begin using FairSoil.</h1>
            <p className={styles.heroText}>
              This page is a working prototype. In plain terms: Token A is your
              daily bonus, Token B is your work reward, and Integrity is your
              trust score.
            </p>
            <div className={styles.phaseNote}>
              <strong>What this MVP already does:</strong> daily bonus, reward escrow,
              approval, dispute flow, manual operator review, and basic treasury checks.
              <br />
              <strong>What is still not finished:</strong> full DAO governance,
              production identity flow, and external dispute arbitration.
              <br />
              <strong>What we are still testing:</strong> dispute fairness for low-balance
              users. Phase 1 keeps a manual arbiter, while Phase 2 is expected to move
              high-value cases to outside adjudication.
            </div>
            <div className={styles.heroActions}>
              <button
                className={styles.primaryButton}
                onClick={handleClaim}
                disabled={!account.address || missingEnv || isBusy}
              >
                {actionLabel("claimUBI", "Claim today's bonus")}
              </button>
              {account.address ? (
                <button className={styles.secondaryButton} onClick={() => disconnect()}>
                  Disconnect wallet
                </button>
              ) : (
                <button
                  className={styles.secondaryButton}
                  onClick={() => connect({ connector: injected() })}
                >
                  Connect wallet
                </button>
              )}
            </div>
            {!account.address || missingEnv || isBusy ? (
              <p className={styles.helperNote}>
                {explainDisabledAction({
                  walletConnected: Boolean(account.address),
                  missingEnv,
                  busy: isBusy,
                  label: "Connect a wallet, then you can claim today's bonus here.",
                })}
              </p>
            ) : null}
            <div className={styles.heroMeta}>
              <span>Network: Local Anvil (31337)</span>
              <span>
                Wallet: {account.address ? account.address.slice(0, 10) : "Not connected"}
              </span>
            </div>
          </div>

          <div className={styles.heroPanel}>
            <div className={styles.metric}>
              <p className={styles.metricLabel}>Daily bonus (Token A)</p>
              <p className={styles.metricValue}>{formattedTokenA}</p>
              <p className={styles.metricFootnote}>
                This slowly expires over time, so it is meant for near-term use.
              </p>
            </div>
            <div className={styles.metric}>
              <p className={styles.metricLabel}>Work rewards (Token B)</p>
              <p className={styles.metricValue}>{formattedTokenB}</p>
              <div className={styles.metricBreakdown}>
                <span>Unlocked: {formattedTokenBUnlocked}</span>
                <span>Locked: {formattedTokenBLocked}</span>
              </div>
              <p className={styles.metricFootnote}>
                Locked rewards are already reserved inside agreements.
              </p>
            </div>
            <div className={styles.metric}>
              <p className={styles.metricLabel}>Trust score (Integrity)</p>
              <p className={styles.metricValue}>{formattedIntegrity}</p>
              <div className={styles.metricBreakdown}>
                <span>Available: {formattedAvailableIntegrity}</span>
                <span>Locked: {formattedLockedIntegrity}</span>
              </div>
              <p className={styles.metricFootnote}>
                {governanceEligible
                  ? "You can join governance decisions."
                  : "You have not reached the governance threshold yet."}
              </p>
              {defenseQuotaRemaining !== null ? (
                <p className={styles.metricFootnote}>
                  Defense quota: {defenseQuotaRemaining}/2 remaining
                  {defenseQuotaResetInfo ? ` · resets in ${defenseQuotaResetInfo.label}` : ""}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className={styles.viewTabs} aria-label="Dashboard sections">
          <div className={styles.tabList} role="tablist" aria-label="Choose dashboard view">
            <button
              type="button"
              role="tab"
              aria-selected={dashboardView === "participant"}
              className={`${styles.tabButton} ${
                dashboardView === "participant" ? styles.tabButtonActive : ""
              }`}
              onClick={() => setDashboardView("participant")}
            >
              Use FairSoil
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={dashboardView === "operator"}
              className={`${styles.tabButton} ${
                dashboardView === "operator" ? styles.tabButtonActive : ""
              }`}
              onClick={() => setDashboardView("operator")}
            >
              Run FairSoil
            </button>
          </div>
          <p className={styles.tabDescription}>
            {dashboardView === "participant"
              ? "Participant view is the default. It shows the everyday flow: verify, collect bonuses, and create agreements."
              : "Operator view is for the temporary operator wallet, manual reviewers, and the dispute arbiter."}
          </p>
        </section>

        {dashboardView === "participant" ? (
        <section className={`${styles.dashboardSection} ${styles.participantSection}`}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionEyebrow}>For everyday use</span>
              <h2>Start using FairSoil</h2>
            </div>
            <p>
              If you are new, go from left to right: check what you qualify for,
              verify this wallet, collect your bonus, then create a work agreement.
            </p>
          </div>
          <div className={styles.startStrip}>
            <div className={styles.startCard}>
              <span className={styles.startNumber}>1</span>
              <div>
                <strong>Verify your wallet</strong>
                <p>Unlock daily bonus and identity-based features.</p>
              </div>
            </div>
            <div className={styles.startCard}>
              <span className={styles.startNumber}>2</span>
              <div>
                <strong>Collect your bonus</strong>
                <p>Check recent days, then accrue or claim Token A.</p>
              </div>
            </div>
            <div className={styles.startCard}>
              <span className={styles.startNumber}>3</span>
              <div>
                <strong>Create work agreements</strong>
                <p>Lock a reward first so the worker can submit safely.</p>
              </div>
            </div>
            <div className={styles.startCard}>
              <span className={styles.startNumber}>4</span>
              <div>
                <strong>Watch your progress</strong>
                <p>Token B and Integrity go up after approved work.</p>
              </div>
            </div>
          </div>
          <div className={styles.participantGrid}>
            <div className={styles.participantStack}>
              <article className={styles.card}>
                <h3>Can I join voting?</h3>
                <p>
                  You can join governance once you hold enough Token B or reach
                  the Integrity threshold. Next draw in 12 hours.
                </p>
                <div className={styles.cardFooter}>
                  <span>Min Token B: 1</span>
                  <span>Min Integrity: 100</span>
                </div>
              </article>
              <article className={styles.card}>
                <h3>Step 1: Verify this wallet</h3>
                <p>
                  {verificationStatusDetail}
                </p>
                <div className={styles.metricBreakdown} aria-live="polite">
                  <span>Verification status: {verificationStatusLabel}</span>
                  <span>Active route: {activeIdentityRoute}</span>
                  <span>World ID mode: {worldIdMode}</span>
                  <span>ZK-NFC mode: {zknfcMode}</span>
                  <span>
                    Operator fallback: {hasWorldIdConfig || hasZkNfcConfig ? "Available" : "Primary path"}
                  </span>
                </div>
                <div className={styles.cardFooter}>
                  <span>Verification is needed for the full bonus flow</span>
                  <span>
                    {isTokenAOwner
                      ? "Temporary operator wallet connected"
                      : "Temporary operator wallet required"}
                  </span>
                </div>
                <div className={styles.cardActions}>
                  {hasWorldIdConfig ? (
                    <div className={styles.identityRouteBlock}>
                      <button
                        className={styles.secondaryButton}
                        onClick={handleWorldIdVerify}
                        disabled={!account.address || isBusy || Boolean(isPrimaryAddress)}
                      >
                        {actionLabel("worldIdVerify", worldIdMock ? "Verify (mock)" : "Verify with World ID")}
                      </button>
                      <p className={styles.identityRouteHint}>{worldIdButtonHint}</p>
                      {!worldIdMock && worldIdRpContext ? (
                        <IDKitRequestWidget
                          open={worldIdOpen}
                          onOpenChange={setWorldIdOpen}
                          app_id={worldIdAppId as `app_${string}`}
                          action={worldIdActionId!}
                          environment={worldIdEnvironment}
                          rp_context={worldIdRpContext}
                          allow_legacy_proofs={true}
                          preset={orbLegacy({ signal: account.address ?? "" })}
                          handleVerify={handleWorldIdHostVerify}
                          onSuccess={handleWorldIdWidgetSuccess}
                          onError={handleWorldIdWidgetError}
                        />
                      ) : null}
                    </div>
                  ) : null}
                  {hasZkNfcConfig ? (
                    <div className={styles.identityRouteBlock}>
                      <button
                        className={styles.secondaryButton}
                        onClick={handleZkNfcVerify}
                        disabled={!account.address || isBusy || Boolean(isPrimaryAddress)}
                      >
                        {actionLabel("zknfcVerify", zknfcMock ? "Verify (mock)" : "Verify with ZK-NFC")}
                      </button>
                      <p className={styles.identityRouteHint}>{zknfcButtonHint}</p>
                    </div>
                  ) : null}
                  <div className={styles.identityRouteBlock}>
                    <button
                      className={styles.secondaryButton}
                      onClick={handleSetPrimary}
                      disabled={!account.address || !isTokenAOwner || isBusy || Boolean(isPrimaryAddress)}
                    >
                      {actionLabel("setPrimary", "Operator verify (mock)")}
                    </button>
                    <p className={styles.identityRouteHint}>{operatorVerifyHint}</p>
                  </div>
                </div>
                <div className={styles.identityNextStepPanel} aria-live="polite">
                  <strong>Suggested next step</strong>
                  <p>{identityNextStep}</p>
                </div>
                {identityErrorKind !== "none" && !isPrimaryAddress ? (
                  <div className={styles.identityRetryPanel} aria-live="polite">
                    <strong>Retry or fallback</strong>
                    <div className={styles.cardActions}>
                      {hasWorldIdConfig ? (
                        <button
                          className={styles.secondaryButton}
                          onClick={handleWorldIdVerify}
                          disabled={!account.address || isBusy}
                        >
                          Retry World ID
                        </button>
                      ) : null}
                      {hasZkNfcConfig ? (
                        <button
                          className={styles.secondaryButton}
                          onClick={handleZkNfcVerify}
                          disabled={!account.address || isBusy}
                        >
                          Retry ZK-NFC
                        </button>
                      ) : null}
                      <button
                        className={styles.secondaryButton}
                        onClick={handleSetPrimary}
                        disabled={!account.address || !isTokenAOwner || isBusy}
                      >
                        Use operator fallback
                      </button>
                    </div>
                  </div>
                ) : null}
                {!account.address || !isTokenAOwner || isBusy || txAction === "worldIdVerify" || txAction === "zknfcVerify" ? (
                  <p className={styles.helperNote}>
                    {explainDisabledAction({
                      walletConnected: Boolean(account.address),
                      ownerRequired: !isTokenAOwner,
                      busy: isBusy,
                    })}
                  </p>
                ) : null}
              </article>
              <article className={`${styles.card} ${styles.participantStackWide}`}>
                <h3>Daily bonus rules</h3>
                <p>
                  The daily bonus is 100 Token A. The claim window resets at
                  00:00 UTC each day.
                </p>
                <div className={styles.cardFooter}>
                  <span>Next claim window: 03:12</span>
                </div>
              </article>
            </div>
            <article className={styles.card}>
            <h3>Step 2: Collect your daily bonus</h3>
            <p>
              First load the days you want, then move them into your claimable
              balance, then claim. Older Token A slowly expires.
            </p>
            <div className={styles.unclaimedSummary}>
              <span>Current day: {currentDayIndex ?? "--"}</span>
              <span>Total (last 7 days): {formatTokenA(totalUnclaimed)}</span>
            </div>
            <div className={styles.unclaimedList}>
              {unclaimedDays.map((entry) => (
                <div key={entry.day} className={styles.unclaimedRow}>
                  <span>Day {entry.day}</span>
                  <span>{formatTokenA(entry.amount)}</span>
                </div>
              ))}
            </div>
            <div className={styles.taskForm}>
              <div className={styles.taskRow}>
                <label className={styles.taskField}>
                  From day
                  <input
                    className={styles.taskInput}
                    value={unclaimedFromDay}
                    onChange={(event) => setUnclaimedFromDay(event.target.value)}
                    placeholder="e.g. 12345"
                  />
                </label>
                <label className={styles.taskField}>
                  To day
                  <input
                    className={styles.taskInput}
                    value={unclaimedToDay}
                    onChange={(event) => setUnclaimedToDay(event.target.value)}
                    placeholder="e.g. 12350"
                  />
                </label>
              </div>
              <div className={styles.unclaimedActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={handleUseRecentDays}
                  disabled={!account.address || missingEnv || isBusy}
                >
                  Load last 7 days
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={handleAccrueUnclaimed}
                  disabled={!account.address || missingEnv || isBusy}
                >
                  {actionLabel("accrueUBI", "Move into claimable balance")}
                </button>
                <button
                  className={styles.primaryButton}
                  onClick={handleClaimUnclaimed}
                  disabled={!account.address || missingEnv || isBusy}
                >
                  {actionLabel("claimUnclaimed", "Claim selected bonus")}
                </button>
              </div>
              <p className={styles.taskHint}>
                Day number is based on blockchain time. Claiming clears the days you used.
              </p>
              {!account.address || missingEnv || isBusy ? (
                <p className={styles.helperNote}>
                  {explainDisabledAction({
                    walletConnected: Boolean(account.address),
                    missingEnv,
                    busy: isBusy,
                  })}
                </p>
              ) : null}
            </div>
            </article>
          </div>
          <div className={styles.grid}>
            <article className={`${styles.card} ${styles.cardFull}`}>
            <h3>Step 3: Create a work agreement</h3>
            <p>
              Set the worker, set the reward, and lock the funds first. That
              lets both sides see the reward is ready before the work starts.
            </p>
            <div className={styles.stepSummary}>
              <span className={styles.stepChip}>Main details</span>
              <span className={styles.stepChip}>Optional template settings</span>
            </div>
            {covenantFormStage === 1 ? (
              <div className={styles.stepPanel}>
                <div className={styles.taskForm}>
                  <label className={styles.taskField}>
                    Task type
                    <select
                      className={styles.taskInput}
                      value={covenantTemplate}
                      onChange={(event) => setCovenantTemplate(event.target.value)}
                    >
                      <option value="general">General</option>
                      <option value="micro">Micro task</option>
                      <option value="delivery">Delivery</option>
                      <option value="audit">Audit</option>
                      <option value="urgent">Urgent response</option>
                      <option value="education">Education support</option>
                    </select>
                    <span className={styles.fieldHint}>
                      A preset can fill common defaults for this kind of work.
                    </span>
                  </label>
                  <label className={styles.taskField}>
                    Who will do the work?
                    <input
                      className={styles.taskInput}
                      value={covenantWorker}
                      onChange={(event) => setCovenantWorker(event.target.value)}
                      placeholder="0x…"
                      name="covenantWorkerAddress"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <span className={styles.fieldHint}>
                      Wallet address of the worker who will submit the work and receive the reward.
                    </span>
                  </label>
                  <label className={styles.taskField}>
                    Reward type
                    <select
                      className={styles.taskInput}
                      value={covenantPayInTokenA ? "tokenA" : "tokenB"}
                      onChange={(event) => setCovenantPayInTokenA(event.target.value === "tokenA")}
                    >
                      <option value="tokenB">Token B (Asset)</option>
                      <option value="tokenA">Token A (Flow)</option>
                    </select>
                    <span className={styles.fieldHint}>
                      Token A can be converted into Token B with a fee when the agreement is created.
                    </span>
                  </label>
                  <div className={styles.taskRow}>
                    <label className={styles.taskField}>
                      {covenantPayInTokenA ? "Reward amount in Token A" : "Reward amount in Token B"}
                      <input
                        className={styles.taskInput}
                        value={covenantRewardAmount}
                        onChange={(event) => setCovenantRewardAmount(event.target.value)}
                        placeholder="250"
                      />
                      <span className={styles.fieldHint}>This amount is locked when the agreement is created.</span>
                    </label>
                    <label className={styles.taskField}>
                      Trust score reward
                      <input
                        className={styles.taskInput}
                        value={covenantIntegrityPoints}
                        onChange={(event) => setCovenantIntegrityPoints(event.target.value)}
                        placeholder="50"
                      />
                      <span className={styles.fieldHint}>
                        Integrity points the worker will receive after approval.
                      </span>
                    </label>
                  </div>
                  <div className={styles.quotePanel}>
                    <div className={styles.quoteHeader}>
                      <strong>Visible quote breakdown</strong>
                      <span>Use this to make labor, materials, and referral costs explicit.</span>
                    </div>
                    <div className={styles.taskForm}>
                      <div className={styles.taskRow}>
                        <label className={styles.taskField}>
                          Labor
                          <input
                            className={styles.taskInput}
                            value={quoteBreakdown.labor}
                            onChange={(event) =>
                              setQuoteBreakdown((current) => ({ ...current, labor: event.target.value }))
                            }
                            placeholder="150"
                          />
                        </label>
                        <label className={styles.taskField}>
                          Materials
                          <input
                            className={styles.taskInput}
                            value={quoteBreakdown.materials}
                            onChange={(event) =>
                              setQuoteBreakdown((current) => ({ ...current, materials: event.target.value }))
                            }
                            placeholder="70"
                          />
                        </label>
                      </div>
                      <div className={styles.taskRow}>
                        <label className={styles.taskField}>
                          Referral / intermediary
                          <input
                            className={styles.taskInput}
                            value={quoteBreakdown.referral}
                            onChange={(event) =>
                              setQuoteBreakdown((current) => ({ ...current, referral: event.target.value }))
                            }
                            placeholder="0"
                          />
                        </label>
                        <label className={styles.taskField}>
                          Warranty / risk buffer
                          <input
                            className={styles.taskInput}
                            value={quoteBreakdown.warranty}
                            onChange={(event) =>
                              setQuoteBreakdown((current) => ({ ...current, warranty: event.target.value }))
                            }
                            placeholder="0"
                          />
                        </label>
                      </div>
                      <label className={styles.taskField}>
                        Other
                        <input
                          className={styles.taskInput}
                          value={quoteBreakdown.other}
                          onChange={(event) =>
                            setQuoteBreakdown((current) => ({ ...current, other: event.target.value }))
                          }
                          placeholder="0"
                        />
                      </label>
                    </div>
                    <div className={styles.metricBreakdown}>
                      <span>
                        Visible total: {Number(formatUnits(quoteBreakdownTotal, 18)).toFixed(2)}{" "}
                        {covenantPayInTokenA ? "SOILA" : "SOILB"}
                      </span>
                      <span>
                        Reward field: {Number(formatUnits(covenantReward, 18)).toFixed(2)}{" "}
                        {covenantPayInTokenA ? "SOILA" : "SOILB"}
                      </span>
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        className={styles.secondaryButton}
                        type="button"
                        onClick={() =>
                          setCovenantRewardAmount(Number(formatUnits(quoteBreakdownTotal, 18)).toString())
                        }
                        disabled={quoteBreakdownTotal <= 0n}
                      >
                        Use visible total as reward
                      </button>
                    </div>
                    <p className={styles.fieldHint}>
                      If a referral amount is hidden here or left undocumented, the worker and requester cannot
                      compare the quote structure later.
                    </p>
                    {priceIntegrityWarning.length > 0 ? (
                      <div className={styles.warningList}>
                        {priceIntegrityWarning.map((warning) => (
                          <span key={warning} className={styles.warningPill}>
                            {warning}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {comparableRewardStats ? (
                      <p className={styles.fieldHint}>
                        Comparable agreements: median {Number(formatUnits(comparableRewardStats.median, 18)).toFixed(2)}
                        , range {Number(formatUnits(comparableRewardStats.min, 18)).toFixed(2)}-
                        {Number(formatUnits(comparableRewardStats.max, 18)).toFixed(2)} SOILB across{" "}
                        {comparableRewardStats.count} agreements.
                      </p>
                    ) : null}
                    {selectedScopeBaseline ? (
                      <p className={styles.fieldHint}>
                        Market baseline for <strong>{selectedScopeBaseline.scope}</strong> ·{" "}
                        {urgencyLabelFor(selectedScopeBaseline.urgency)} ·{" "}
                        {materialLabelFor(selectedScopeBaseline.materialClass)} ·{" "}
                        {selectedScopeBaseline.hoursBand}: observed median{" "}
                        {Number(formatUnits(selectedScopeBaseline.observedMedian, 18)).toFixed(2)} SOILB, template
                        median range {Number(formatUnits(selectedScopeBaseline.templateMedianMin, 18)).toFixed(2)}-
                        {Number(formatUnits(selectedScopeBaseline.templateMedianMax, 18)).toFixed(2)} SOILB.
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className={styles.stepActions}>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => setCovenantFormStage(2)}
                    disabled={!covenantWorker}
                  >
                    Open optional details
                  </button>
                  <span className={styles.taskHint}>
                    You can create the agreement from this first step alone. The next step is optional.
                  </span>
                </div>
                {!covenantWorker ? (
                  <p className={styles.helperNote}>
                    {explainDisabledAction({ workerRequired: true })}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className={styles.stepPanel}>
                <div className={styles.taskForm}>
                  <label className={styles.taskField}>
                    Search tags
                    <input
                      className={styles.taskInput}
                      value={covenantTags}
                      onChange={(event) => setCovenantTags(event.target.value)}
                      placeholder="e.g. repair, urgent, onsite"
                    />
                    <span className={styles.fieldHint}>
                      Optional labels for filtering and analytics. These are not part of the on-chain reward logic.
                    </span>
                  </label>
                  <label className={styles.taskField}>
                    Work scope label
                    <select
                      className={styles.taskInput}
                      value={templateScopeLabel}
                      onChange={(event) => setTemplateScopeLabel(event.target.value)}
                    >
                      {scopeVocabulary.map((entry) => (
                        <option key={`scope-${entry.value}`} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                    <span className={styles.fieldHint}>
                      Standard scope vocabulary used for future comparisons and template discovery.
                    </span>
                  </label>
                  <div className={styles.taskRow}>
                    <label className={styles.taskField}>
                      Estimated hours
                      <input
                        className={styles.taskInput}
                        value={templateEstimatedHours}
                        onChange={(event) => setTemplateEstimatedHours(event.target.value)}
                        placeholder="2"
                      />
                    </label>
                    <label className={styles.taskField}>
                      Material class
                      <select
                        className={styles.taskInput}
                        value={templateMaterialClass}
                        onChange={(event) => setTemplateMaterialClass(event.target.value)}
                      >
                        {materialVocabulary.map((entry) => (
                          <option key={`material-${entry.value}`} value={entry.value}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.taskField}>
                      Urgency
                      <select
                        className={styles.taskInput}
                        value={templateUrgency}
                        onChange={(event) => setTemplateUrgency(event.target.value)}
                      >
                        {urgencyVocabulary.map((entry) => (
                          <option key={`urgency-${entry.value}`} value={entry.value}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className={styles.taskField}>
                    Related party disclosure
                    <input
                      className={styles.taskInput}
                      value={relatedPartyDisclosure}
                      onChange={(event) => setRelatedPartyDisclosure(event.target.value)}
                      placeholder="e.g. requester and vendor share an operator, none, friend referral"
                    />
                    <span className={styles.fieldHint}>
                      Say if the requester, worker, template author, or intermediary know each other or share a fee.
                    </span>
                  </label>
                  <label className={styles.taskField}>
                    Market context note
                    <input
                      className={styles.taskInput}
                      value={marketContextNote}
                      onChange={(event) => setMarketContextNote(event.target.value)}
                      placeholder="e.g. urgent same-day visit, remote delivery, unusual parts cost"
                    />
                    <span className={styles.fieldHint}>
                      Explain why this price may differ from normal market ranges.
                    </span>
                  </label>
                  <p className={styles.fieldHint}>
                    Market comparison now uses <strong>scope + urgency + material class + hours band</strong>, not
                    scope alone.
                  </p>
                </div>
            <button
              className={styles.ghostButton}
              onClick={handleCreateCovenant}
              disabled={
                !account.address ||
                missingEnv ||
                isBusy ||
                !covenantWorker ||
                hasInsufficientBalance
              }
            >
                {hasInsufficientBalance
                  ? "Insufficient Balance"
                  : actionLabel("createCovenant", "Create Agreement (approve + lock)")}
            </button>
            <div className={styles.stepNote}>
              <span className={styles.stepPill}>
                {covenantStep === 1
                  ? "Step 1/2: Allow token use"
                  : covenantStep === 2
                  ? "Step 2/2: Lock reward"
                  : "Two wallet confirmations"}
              </span>
              <span>
                Your wallet first allows token use, then confirms the reward lock.
              </span>
            </div>
            <p className={styles.taskHint}>
              {covenantPayInTokenA
                ? "This uses Token A first, then locks the converted value into the agreement."
                : "This uses Token B directly, then locks it into the agreement."}
            </p>
            {!account.address || missingEnv || isBusy || !covenantWorker || hasInsufficientBalance ? (
              <p className={styles.helperNote}>
                {explainDisabledAction({
                  walletConnected: Boolean(account.address),
                  missingEnv,
                  busy: isBusy,
                  workerRequired: !covenantWorker,
                  insufficientBalance: hasInsufficientBalance,
                })}
              </p>
            ) : null}
            {covenantPayInTokenA ? (
              royaltyBreakdown ? (
                <div className={styles.metricBreakdown}>
                  <span>
                    Base Value:{" "}
                    {Number(formatUnits(royaltyBreakdown.base, 18)).toFixed(2)} SOILB
                  </span>
                  {selectedTemplate && selectedEffectiveRoyaltyBps !== undefined ? (
                    <span>
                      Royalty: {formatPercent(selectedTemplate.royaltyBps)}% (Original) →{" "}
                      {formatPercent(selectedEffectiveRoyaltyBps as bigint)}% (Current)
                    </span>
                  ) : null}
                  <span>
                    Worker will receive:{" "}
                    {Number(formatUnits(royaltyBreakdown.worker, 18)).toFixed(2)} SOILB
                  </span>
                  <span>
                    Author will receive:{" "}
                    {Number(formatUnits(royaltyBreakdown.author, 18)).toFixed(2)} SOILB
                  </span>
                  {selectedTemplate ? (
                    <span className={styles.fieldHint}>
                      Author: {safeAddress(selectedTemplate.creator)}
                    </span>
                  ) : null}
                  {selectedTemplate ? (
                    <span className={styles.fieldHint}>
                      Created at: {formatDate(selectedTemplate.createdAt, locale)} · Public domain on:{" "}
                      {formatDate(selectedTemplate.createdAt + 730n * 24n * 60n * 60n, locale)}
                    </span>
                  ) : null}
                  <span className={styles.fieldHint}>
                    Crystallized B (B換算後の価値) を基準にロイヤリティを算出します。
                  </span>
                  <span className={styles.fieldHint}>
                    Base Value = Token A (after fee) converted into SOILB.
                  </span>
                </div>
              ) : (
                <p className={styles.taskHint}>
                  {estimatedCrystallizedReward !== null
                    ? `Estimated receive: ${Number(
                        formatUnits(estimatedCrystallizedReward, 18)
                      ).toFixed(2)} SOILB after crystallization fee.`
                    : "Estimated receive: --"}
                </p>
              )
            ) : royaltyBreakdown ? (
              <div className={styles.metricBreakdown}>
                <span>
                  Base Value:{" "}
                  {Number(formatUnits(royaltyBreakdown.base, 18)).toFixed(2)} SOILB
                </span>
                {selectedTemplate && selectedEffectiveRoyaltyBps !== undefined ? (
                  <span>
                    Royalty: {formatPercent(selectedTemplate.royaltyBps)}% (Original) →{" "}
                    {formatPercent(selectedEffectiveRoyaltyBps as bigint)}% (Current)
                  </span>
                ) : null}
                <span>
                  Worker will receive:{" "}
                  {Number(formatUnits(royaltyBreakdown.worker, 18)).toFixed(2)} SOILB
                </span>
                <span>
                  Author will receive:{" "}
                  {Number(formatUnits(royaltyBreakdown.author, 18)).toFixed(2)} SOILB
                </span>
                {selectedTemplate ? (
                  <span className={styles.fieldHint}>
                    Author: {safeAddress(selectedTemplate.creator)}
                  </span>
                ) : null}
                {selectedTemplate ? (
                  <span className={styles.fieldHint}>
                    Created at: {formatDate(selectedTemplate.createdAt, locale)} · Public domain on:{" "}
                    {formatDate(selectedTemplate.createdAt + 730n * 24n * 60n * 60n, locale)}
                  </span>
                ) : null}
                <span className={styles.fieldHint}>
                  Royalty is calculated from the Token B reward value.
                </span>
                <span className={styles.fieldHint}>
                  Base Value = Token B reward amount (no crystallization).
                </span>
              </div>
            ) : null}
            {!templateIdValue ? (
              <p className={styles.taskHint}>
                Add a Template ID only if you want to reuse a saved template.
              </p>
            ) : null}
                <div className={styles.taskForm}>
                  <label className={styles.taskField}>
                    Template ID (optional)
                    <input
                      className={styles.taskInput}
                      value={covenantTemplateId}
                      onChange={(event) => setCovenantTemplateId(event.target.value)}
                      placeholder="0"
                    />
                    <span className={styles.fieldHint}>
                      If set, usage is also recorded in the template library.
                    </span>
                  </label>
                  <label className={styles.taskField}>
                    Save a new template (URI)
                    <input
                      className={styles.taskInput}
                      value={covenantTemplateUri}
                      onChange={(event) => setCovenantTemplateUri(event.target.value)}
                      placeholder="ipfs://…"
                      name="covenantTemplateUri"
                      autoComplete="off"
                    />
                    <span className={styles.fieldHint}>
                      You can still save a normal URI. If you add quote metadata below, it will be wrapped into the
                      template record.
                    </span>
                  </label>
                  <label className={styles.taskField}>
                    Creator share (bps)
                    <input
                      className={styles.taskInput}
                      value={covenantRoyaltyBps}
                      onChange={(event) => setCovenantRoyaltyBps(event.target.value)}
                      placeholder="500"
                    />
                  </label>
                  <div className={styles.taskRow}>
                    <label className={styles.taskField}>
                      Expected low end (Token B)
                      <input
                        className={styles.taskInput}
                        value={templateExpectedMin}
                        onChange={(event) => setTemplateExpectedMin(event.target.value)}
                        placeholder="180"
                      />
                    </label>
                    <label className={styles.taskField}>
                      Expected high end (Token B)
                      <input
                        className={styles.taskInput}
                        value={templateExpectedMax}
                        onChange={(event) => setTemplateExpectedMax(event.target.value)}
                        placeholder="280"
                      />
                    </label>
                  </div>
                  <div className={styles.taskRow}>
                    <label className={styles.taskField}>
                      Estimated hours
                      <input
                        className={styles.taskInput}
                        value={templateEstimatedHours}
                        onChange={(event) => setTemplateEstimatedHours(event.target.value)}
                        placeholder="2"
                      />
                    </label>
                    <label className={styles.taskField}>
                      Material class
                      <select
                        className={styles.taskInput}
                        value={templateMaterialClass}
                        onChange={(event) => setTemplateMaterialClass(event.target.value)}
                      >
                        {materialVocabulary.map((entry) => (
                          <option key={`template-material-${entry.value}`} value={entry.value}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.taskField}>
                      Urgency
                      <select
                        className={styles.taskInput}
                        value={templateUrgency}
                        onChange={(event) => setTemplateUrgency(event.target.value)}
                      >
                        {urgencyVocabulary.map((entry) => (
                          <option key={`template-urgency-${entry.value}`} value={entry.value}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className={styles.taskField}>
                    Market note
                    <input
                      className={styles.taskInput}
                      value={templateMarketNote}
                      onChange={(event) => setTemplateMarketNote(event.target.value)}
                      placeholder="Price assumes urgent on-site work and same-day parts pickup."
                    />
                  </label>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={templateReferralDisclosure}
                      onChange={(event) => setTemplateReferralDisclosure(event.target.checked)}
                    />
                    <span>Template includes an explicit intermediary / referral disclosure.</span>
                  </label>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.secondaryButton}
                    onClick={handleRegisterTemplate}
                    disabled={!account.address || !covenantLibraryAddress || isBusy}
                  >
                    {actionLabel("registerTemplate", "Save template")}
                  </button>
                </div>
                {!account.address || !covenantLibraryAddress || isBusy ? (
                  <p className={styles.helperNote}>
                    {explainDisabledAction({
                      walletConnected: Boolean(account.address),
                      libraryRequired: !covenantLibraryAddress,
                      busy: isBusy,
                    })}
                  </p>
                ) : null}
                <div className={styles.taskForm}>
                  <label className={styles.taskField}>
                    Record use: Agreement ID
                    <input
                      className={styles.taskInput}
                      value={templateUseCovenantId}
                      onChange={(event) => setTemplateUseCovenantId(event.target.value)}
                      placeholder="0"
                    />
                  </label>
                  <label className={styles.taskField}>
                    Record use: Reward amount
                    <input
                      className={styles.taskInput}
                      value={templateUseAmount}
                      onChange={(event) => setTemplateUseAmount(event.target.value)}
                      placeholder="0"
                    />
                  </label>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.secondaryButton}
                    onClick={handleRecordTemplateUse}
                    disabled={!account.address || !covenantLibraryAddress || isBusy}
                  >
                    {actionLabel("recordTemplateUse", "Record template use")}
                  </button>
                </div>
                <div className={styles.stepActions}>
                  <button className={styles.secondaryButton} onClick={() => setCovenantFormStage(1)}>
                    Back to main details
                  </button>
                  <span className={styles.taskHint}>
                    This step is optional. It is only for template reuse and creator-share settings.
                  </span>
                </div>
              </div>
            )}
            {templateList.length > 0 ? (
              <>
                <div className={styles.templateHeader}>
                  <span>Templates</span>
                  <input
                    className={styles.templateSearch}
                    value={templateFilter}
                    onChange={(event) => setTemplateFilter(event.target.value)}
                    placeholder="Filter by URI or creator"
                    aria-label="Filter templates by URI or creator"
                    name="templateFilter"
                    autoComplete="off"
                  />
                </div>
                <div className={styles.templateList}>
                  {templateList
                    .filter((item) => {
                      if (!templateFilter.trim()) return true;
                      const q = templateFilter.trim().toLowerCase();
                      return (
                        item.metadataUri.toLowerCase().includes(q) ||
                        item.creator.toLowerCase().includes(q)
                      );
                    })
                    .map((item) => {
                      const metadata = parseTemplateMetadata(item.metadataUri);
                      return (
                      <div key={`template-${item.id}`} className={styles.templateRow}>
                        <div>
                          <strong>#{item.id}</strong>{" "}
                          <span>{formatPercent(item.royaltyBps)}% (Original)</span>{" "}
                          <span>{formatPercent(item.effectiveRoyaltyBps)}% (Current)</span>{" "}
                          {!templateActiveMap[item.id] ? <span>(inactive)</span> : null}
                          {metadata.scopeLabel ? (
                            <span className={styles.inlinePill}>{scopeLabelFor(metadata.scopeLabel)}</span>
                          ) : null}
                          <div className={styles.templateMeta}>
                            <span>Author: {safeAddress(item.creator)}</span>
                            <span>
                              Created at: {formatDate(item.createdAt, locale)} · Public domain on:{" "}
                              {formatDate(item.createdAt + 730n * 24n * 60n * 60n, locale)}
                            </span>
                            {metadata.sourceUri || item.metadataUri}
                            {metadata.expectedMin > 0n || metadata.expectedMax > 0n ? (
                              <span>
                                Expected range:{" "}
                                {Number(formatUnits(metadata.expectedMin, 18)).toFixed(2)}-
                                {Number(formatUnits(metadata.expectedMax, 18)).toFixed(2)}{" "}
                                SOILB
                              </span>
                            ) : null}
                            {metadata.estimatedHours > 0 || metadata.materialClass || metadata.urgency ? (
                              <span>
                                Compare by: {urgencyLabelFor(metadata.urgency)} ·{" "}
                                {materialLabelFor(metadata.materialClass)} ·{" "}
                                {normalizeBand(metadata.estimatedHours)}
                              </span>
                            ) : null}
                            {toQuoteTotal(metadata.breakdown) > 0n ? (
                              <span>
                                Visible quote: labor {metadata.breakdown.labor || "0"}, materials{" "}
                                {metadata.breakdown.materials || "0"}, referral {metadata.breakdown.referral || "0"},
                                warranty {metadata.breakdown.warranty || "0"}, other {metadata.breakdown.other || "0"}
                              </span>
                            ) : null}
                            {metadata.referralDisclosure ? (
                              <span>Referral / intermediary share is explicitly disclosed.</span>
                            ) : null}
                            {metadata.marketNote ? (
                              <span>{metadata.marketNote}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className={styles.templateActions}>
                          <button
                            className={styles.secondaryButton}
                            onClick={() => setCovenantTemplateId(item.id.toString())}
                          >
                            Use template
                          </button>
                          <button
                            className={styles.ghostButton}
                            onClick={() => handleToggleTemplate(item.id, !templateActiveMap[item.id])}
                          >
                            {templateActiveMap[item.id] ? "Disable template" : "Enable template"}
                          </button>
                        </div>
                      </div>
                    )})}
                </div>
              </>
            ) : (
              <p className={styles.emptyState}>
                No saved templates yet. Create an agreement first, then save a reusable template here if needed.
              </p>
            )}
            </article>
          </div>
        </section>
        ) : null}

        {dashboardView === "operator" ? (
        <section className={`${styles.dashboardSection} ${styles.operatorSection}`}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionEyebrow}>For system operators</span>
              <h2>System setup and review tools</h2>
            </div>
            <p>
              These tools are for the temporary operator wallet, manual reviewers,
              and the dispute arbiter during the MVP phase.
            </p>
          </div>
          <div className={styles.operatorScope}>
            <span>Temporary operator: changes system settings and treasury rules</span>
            <span>Manual reviewer: adds verified rewards after work is checked</span>
            <span>Dispute arbiter: handles disagreements when agreement parties conflict</span>
          </div>
          <div className={styles.grid}>
            <article className={`${styles.card} ${styles.cardCompact}`}>
              <h3>System balances</h3>
              <p>
                Latest reserve snapshot. Use this to check what the treasury
                holds and owes right now.
              </p>
              <div className={styles.metricBreakdown}>
                <span>Reserves A: {formattedReservesA}</span>
                <span>Reserves B: {formattedReservesB}</span>
              </div>
              <div className={styles.metricBreakdown}>
                <span>Liabilities A: {formattedLiabilitiesA}</span>
                <span>Liabilities B: {formattedLiabilitiesB}</span>
              </div>
              <div className={styles.metricBreakdown}>
                <span>
                  Net A: {treasuryNetA !== null ? Number(formatUnits(treasuryNetA, 18)).toFixed(2) : "--"}
                </span>
                <span>
                  Net B: {treasuryNetB !== null ? Number(formatUnits(treasuryNetB, 18)).toFixed(2) : "--"}
                </span>
              </div>
              <div className={styles.metricBreakdown}>
                <span>In total: {formattedTreasuryIn}</span>
                <span>Out A: {formattedTreasuryOutA}</span>
                <span>Out B: {formattedTreasuryOutB}</span>
              </div>
              <p className={styles.fieldHint}>
                This is a compact balance-sheet view: reserves are current assets, liabilities are promised outflows,
                and net shows how much buffer remains right now.
              </p>
            </article>
            <article className={`${styles.card} ${styles.cardWide}`}>
              <h3>Market baselines by scope</h3>
              <p>Observed medians and template ranges grouped by work scope.</p>
              {scopeBaselines.length > 0 ? (
                <div className={styles.templateList}>
                  {scopeBaselines.slice(0, 6).map((entry) => (
                    <div key={`scope-${entry.scope}`} className={styles.templateRow}>
                      <div>
                        <strong>{scopeLabelFor(entry.scope)}</strong>
                        <div className={styles.templateMeta}>
                          <span>
                            Agreements: {entry.agreementCount} · Templates: {entry.templateCount}
                          </span>
                          <span>
                            Compare by: {urgencyLabelFor(entry.urgency)} · {materialLabelFor(entry.materialClass)} ·{" "}
                            {entry.hoursBand}
                          </span>
                          <span>
                            Observed median: {Number(formatUnits(entry.observedMedian, 18)).toFixed(2)} SOILB
                          </span>
                          <span>
                            Observed range: {Number(formatUnits(entry.observedMin, 18)).toFixed(2)}-
                            {Number(formatUnits(entry.observedMax, 18)).toFixed(2)} SOILB
                          </span>
                          <span>
                            Template median range: {Number(formatUnits(entry.templateMedianMin, 18)).toFixed(2)}-
                            {Number(formatUnits(entry.templateMedianMax, 18)).toFixed(2)} SOILB
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyState}>
                  No grouped scope data yet. Save templates with a scope label and create agreements to build a
                  reference market.
                </p>
              )}
            </article>
            <article className={`${styles.card} ${styles.cardCompact}`}>
              <h3>Relationship warnings</h3>
              <p>Heuristics for repeated pairs, reciprocal roles, and concentrated template reuse.</p>
              {reputationRingSignals.summary.length > 0 ? (
                <div className={styles.warningList}>
                  {reputationRingSignals.summary.map((entry) => (
                    <span key={entry} className={styles.warningPill}>
                      {entry}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyState}>
                  No obvious ring-style concentration detected from the current agreement graph.
                </p>
              )}
              <p className={styles.fieldHint}>
                These are heuristics, not proof. They help operators review possible collusion or reputation farming.
              </p>
            </article>
            <article className={`${styles.card} ${styles.cardCompact}`}>
              <h3>Review priority tags</h3>
              <p>Auto-tags from arbiter notes, quote mismatch, and market outlier checks.</p>
              {reviewPrioritySignals.summary.length > 0 ? (
                <div className={styles.warningList}>
                  {reviewPrioritySignals.summary.map((entry) => (
                    <span key={`${entry.label}-${entry.count}`} className={styles.warningPill}>
                      {entry.label}: {entry.count}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyState}>
                  No review-priority tags yet from the current dispute notes and quote checks.
                </p>
              )}
              <p className={styles.fieldHint}>
                These are operator review tags, not automatic rulings. Use them to find records that need human attention first.
              </p>
            </article>
            <article className={`${styles.card} ${styles.cardWide}`}>
              <details className={styles.collapsibleCard}>
                <summary>
                  <div className={styles.collapsibleTitle}>
                    <h3>Daily bonus index controls</h3>
                    <p>Set the oracle, accept reports, and update the daily bonus input.</p>
                  </div>
                  <span className={styles.collapsibleIndicator}>+</span>
                </summary>
                <div className={styles.collapsibleBody}>
              <div className={styles.metricBreakdown}>
                <span>Oracle: {safeAddress(appiOracleAddr as string | undefined)}</span>
                <span>Last APPI: {formattedLastAPPI}</span>
                <span>Daily UBI: {formattedDailyUBI}</span>
              </div>
              <div className={styles.metricBreakdown}>
                <span>
                  Daily index ({appiDayForRead ?? "--"}): {formattedAppiDailyIndex}
                </span>
                <span>
                  Current day: {currentDayIndex !== null ? currentDayIndex : "--"}
                </span>
              </div>
              <div className={styles.metricBreakdown}>
                <span>Reporter diversity: {appiDiversity}</span>
                <span>Confidence: {formattedAppiConfidence}</span>
                <span>Max reports: {formattedAppiMaxReports}</span>
              </div>
              <div className={styles.taskForm}>
                <label className={styles.taskField}>
                  Oracle wallet
                  <input
                    className={styles.taskInput}
                    value={appiOracleInput}
                    onChange={(event) => setAppiOracleInput(event.target.value)}
                    placeholder="0x…"
                    name="appiOracleAddress"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <label className={styles.taskField}>
                  Category IDs
                  <input
                    className={styles.taskInput}
                    value={appiCategoryInput}
                    onChange={(event) => setAppiCategoryInput(event.target.value)}
                    placeholder="e.g. 1,2,3"
                  />
                </label>
                <label className={styles.taskField}>
                  Reported value (18 decimals)
                  <input
                    className={styles.taskInput}
                    value={appiPriceInput}
                    onChange={(event) => setAppiPriceInput(event.target.value)}
                    placeholder="e.g. 100"
                  />
                </label>
                <label className={styles.taskField}>
                  Day number
                  <input
                    className={styles.taskInput}
                    value={appiDayInput}
                    onChange={(event) => setAppiDayInput(event.target.value)}
                    placeholder={currentDayIndex !== null ? currentDayIndex.toString() : "e.g. 12345"}
                  />
                </label>
                <label className={styles.taskField}>
                  Confidence (bps)
                  <input
                    className={styles.taskInput}
                    value={appiConfidenceBps}
                    onChange={(event) => setAppiConfidenceBps(event.target.value)}
                    placeholder="10000"
                  />
                </label>
                <label className={styles.taskField}>
                  Max reports per category
                  <input
                    className={styles.taskInput}
                    value={appiMaxReports}
                    onChange={(event) => setAppiMaxReports(event.target.value)}
                    placeholder="50"
                  />
                </label>
              </div>
              {appiStats.length > 0 ? (
                <div className={styles.metricBreakdown}>
                  {appiStats.map((entry) => (
                    <span key={`appi-${entry.category}`}>
                      Category {entry.category}: {entry.reports} reports ({entry.unique} unique)
                    </span>
                  ))}
                </div>
              ) : null}
              <div className={styles.cardActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={handleSetAppiOracle}
                  disabled={!account.address || !isTreasuryOwner || isBusy}
                >
                  {actionLabel("setAPPIOracle", "Set oracle wallet")}
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={handleSetAppiCategories}
                  disabled={!account.address || !isTreasuryOwner || isBusy}
                >
                  {actionLabel("setAPPIcategories", "Set categories")}
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={handleSubmitAppiPrice}
                  disabled={!account.address || isBusy}
                >
                  {actionLabel("submitAPPI", "Submit report")}
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={handleApplyAppi}
                  disabled={!account.address || !isTreasuryOwner || isBusy}
                >
                  {actionLabel("applyAPPI", "Update daily bonus input")}
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={handleSetAppiConfidence}
                  disabled={!account.address || !isTreasuryOwner || isBusy}
                >
                  {actionLabel("setAPPIConfidence", "Set confidence rule")}
                </button>
              </div>
              <p className={styles.taskHint}>
                In this MVP, the temporary operator wallet sets the rules, reporters submit values,
                and the temporary operator wallet applies the final update.
              </p>
              {!account.address || !isTreasuryOwner || isBusy ? (
                <p className={styles.helperNote}>
                  {explainDisabledAction({
                    walletConnected: Boolean(account.address),
                    ownerRequired: !isTreasuryOwner,
                    busy: isBusy,
                  })}
                </p>
              ) : null}
                </div>
              </details>
            </article>
            <article className={`${styles.card} ${styles.cardMedium}`}>
              <details className={styles.collapsibleCard}>
                <summary>
                  <div className={styles.collapsibleTitle}>
                    <h3>Shared resource market</h3>
                    <p>Register a shared resource, set a value, and manage recurring tax.</p>
                  </div>
                  <span className={styles.collapsibleIndicator}>+</span>
                </summary>
                <div className={styles.collapsibleBody}>
              <div className={styles.taskForm}>
                <label className={styles.taskField}>
                  Resource ID
                  <input
                    className={styles.taskInput}
                    value={resourceIdInput}
                    onChange={(event) => setResourceIdInput(event.target.value)}
                    placeholder="e.g. land:alpha"
                  />
                </label>
                <div className={styles.taskRow}>
                  <label className={styles.taskField}>
                    Value in Token B
                    <input
                      className={styles.taskInput}
                      value={resourceValuationInput}
                      onChange={(event) => setResourceValuationInput(event.target.value)}
                    />
                  </label>
                  <label className={styles.taskField}>
                    Tax rate (bps)
                    <input
                      className={styles.taskInput}
                      value={resourceTaxRateInput}
                      onChange={(event) => setResourceTaxRateInput(event.target.value)}
                      placeholder="500"
                    />
                  </label>
                </div>
                <label className={styles.taskField}>
                  Buy price in Token B
                  <input
                    className={styles.taskInput}
                    value={resourceBuyPriceInput}
                    onChange={(event) => setResourceBuyPriceInput(event.target.value)}
                  />
                </label>
                <label className={styles.taskField}>
                  Market note
                  <input
                    className={styles.taskInput}
                    value={resourceMetadataNoteInput}
                    onChange={(event) => setResourceMetadataNoteInput(event.target.value)}
                    placeholder="e.g. Includes transport, maintenance, or scarce access."
                  />
                </label>
                <label className={styles.taskField}>
                  Related party disclosure
                  <input
                    className={styles.taskInput}
                    value={resourceRelatedPartyInput}
                    onChange={(event) => setResourceRelatedPartyInput(event.target.value)}
                    placeholder="e.g. owner also operates the marketplace, none"
                  />
                </label>
              </div>
              <div className={styles.cardActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={handleRegisterResource}
                  disabled={!account.address || !resourceRegistryAddress || isBusy}
                >
                  {actionLabel("registerResource", "Register resource")}
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={handleUpdateValuation}
                  disabled={!account.address || !resourceRegistryAddress || isBusy}
                >
                  {actionLabel("updateValuation", "Update valuation")}
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={handlePayResourceTax}
                  disabled={!account.address || !resourceRegistryAddress || isBusy}
                >
                  {actionLabel("payTax", "Pay tax")}
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={handleBuyResource}
                  disabled={!account.address || !resourceRegistryAddress || isBusy}
                >
                  {actionLabel("buyResource", "Buy resource")}
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={handleLoadResource}
                  disabled={!resourceRegistryAddress || !resourceIdBytes || isBusy}
                >
                  {actionLabel("loadResource", "Load resource")}
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={persistResourceMetadata}
                  disabled={!account.address || !resourceRegistryAddress || !resourceIdBytes || isBusy}
                >
                  {actionLabel("setResourceMetadata", "Save market note")}
                </button>
              </div>
              {resourceInfo ? (
                <div className={styles.metricBreakdown}>
                  <span>Owner: {safeAddress(resourceInfo.owner)}</span>
                  <span>Valuation: {Number(formatUnits(resourceInfo.valuation, 18)).toFixed(2)}</span>
                  <span>Tax rate: {resourceInfo.taxRateBps.toString()} bps</span>
                  <span>Pending tax: {Number(formatUnits(resourceInfo.due, 18)).toFixed(4)}</span>
                  <span>Elapsed: {resourceInfo.elapsed.toString()}s</span>
                </div>
              ) : null}
              {resourceMetadataNote ? (
                <div className={styles.metricBreakdown}>
                  {parseTransparencyNote(resourceMetadataNote).marketContext ? (
                    <span>Market note: {parseTransparencyNote(resourceMetadataNote).marketContext}</span>
                  ) : null}
                  {parseTransparencyNote(resourceMetadataNote).relatedPartyDisclosure ? (
                    <span>
                      Related parties: {parseTransparencyNote(resourceMetadataNote).relatedPartyDisclosure}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {resourcePriceWarning ? (
                <div className={styles.warningList}>
                  <span className={styles.warningPill}>{resourcePriceWarning}</span>
                </div>
              ) : null}
              <p className={styles.taskHint}>
                The text ID is converted locally before the on-chain call, so you can work with readable names here.
                Keep the public valuation close to a real exit price, or buyers will not be able to tell whether a
                markup is fair.
              </p>
              {!account.address || !resourceRegistryAddress || isBusy ? (
                <p className={styles.helperNote}>
                  {explainDisabledAction({
                    walletConnected: Boolean(account.address),
                    registryRequired: !resourceRegistryAddress,
                    busy: isBusy,
                  })}
                </p>
              ) : null}
                </div>
              </details>
            </article>
            <article className={`${styles.card} ${styles.cardMedium}`}>
              <details className={styles.collapsibleCard}>
                <summary>
                  <div className={styles.collapsibleTitle}>
                    <h3>Manual reward report</h3>
                    <p>
                      Use this when an operator has confirmed that work was completed
                      and wants to add the reward manually.
                    </p>
                  </div>
                  <span className={styles.collapsibleIndicator}>+</span>
                </summary>
                <div className={styles.collapsibleBody}>
              <div className={styles.taskForm}>
                <label className={styles.taskField}>
                  Worker wallet
                  <input
                    className={styles.taskInput}
                    value={taskWorker}
                    onChange={(event) => setTaskWorker(event.target.value)}
                    placeholder="0x…"
                    name="taskWorkerAddress"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <span className={styles.fieldHint}>
                    Wallet of the worker who completed the task. This wallet must already be verified.
                  </span>
                </label>
                <div className={styles.taskRow}>
                  <label className={styles.taskField}>
                    Token B reward
                    <input
                      className={styles.taskInput}
                      value={taskTokenBAmount}
                      onChange={(event) => setTaskTokenBAmount(event.target.value)}
                      placeholder="500"
                    />
                    <span className={styles.fieldHint}>Reward amount sent to the worker.</span>
                  </label>
                  <label className={styles.taskField}>
                    Trust score reward
                    <input
                      className={styles.taskInput}
                      value={taskIntegrityPoints}
                      onChange={(event) => setTaskIntegrityPoints(event.target.value)}
                      placeholder="100"
                    />
                    <span className={styles.fieldHint}>
                      Integrity points added to the worker&apos;s score.
                    </span>
                  </label>
                </div>
              </div>
              <button
                className={styles.ghostButton}
                onClick={handleReport}
                disabled={!account.address || missingEnv || isBusy || !taskWorker || !canReportTaskCompleted}
              >
                {actionLabel("reportTaskCompleted", "Add verified reward")}
              </button>
              <p className={styles.taskHint}>
                In the current MVP, this needs the treasury owner or an approved reward operator wallet, plus a verified worker wallet.
              </p>
              {!account.address || missingEnv || isBusy || !taskWorker || !canReportTaskCompleted ? (
                <p className={styles.helperNote}>
                  {explainDisabledAction({
                    walletConnected: Boolean(account.address),
                    missingEnv,
                    busy: isBusy,
                    workerRequired: !taskWorker,
                    label: !canReportTaskCompleted
                      ? "Switch to the treasury owner wallet or an approved reward operator wallet."
                      : undefined,
                  })}
                </p>
              ) : null}
                </div>
              </details>
            </article>
          </div>
        </section>
        ) : null}

        <section className={styles.timeline}>
          <div className={styles.timelineHeader}>
            <div>
              <span className={styles.sectionEyebrow}>What just happened</span>
              <h2>Recent activity</h2>
              <p>Follow rewards, treasury changes, and dispute updates in plain order.</p>
            </div>
            <div className={styles.timelineControls}>
              <input
                className={styles.timelineSearch}
                value={trailQuery}
                onChange={(event) => setTrailQuery(event.target.value)}
                placeholder="Search activity…"
                aria-label="Search audit trail events"
                name="trailQuery"
                autoComplete="off"
              />
              <select
                className={styles.timelineSelect}
                value={trailFilter}
                onChange={(event) =>
                  setTrailFilter(event.target.value as typeof trailFilter)
                }
                aria-label="Filter audit trail events"
                name="trailFilter"
              >
                {auditFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
              <button
                className={styles.secondaryButton}
                onClick={handleExportAudit}
                disabled={filteredTrailItems.length === 0}
              >
                Export activity CSV
              </button>
            </div>
          </div>
          <div className={styles.timelineLead}>
            <span className={styles.timelineLeadValue}>{filteredTrailItems.length}</span>
            <span className={styles.timelineLeadText}>
              recent updates shown here
              {trailFilter !== "all" ? ` · filtered by ${trailFilter}` : ""}
            </span>
            {auditAlerts.length > 0 ? (
              <span className={styles.timelineLeadAlert}>{auditAlerts.length} items may need operator review</span>
            ) : null}
          </div>
          <div className={styles.auditSummary}>
            <div className={styles.auditCard}>
              <span className={styles.auditLabel}>Agreement updates</span>
              <span className={styles.auditValue}>{auditKpis.covenantCount}</span>
            </div>
            <div className={styles.auditCard}>
              <span className={styles.auditLabel}>Dispute updates</span>
              <span className={styles.auditValue}>{auditKpis.disputeCount}</span>
            </div>
            <div className={styles.auditCard}>
              <span className={styles.auditLabel}>Treasury changes</span>
              <span className={styles.auditValue}>{auditKpis.treasuryEvents}</span>
            </div>
            <div className={styles.auditCard}>
              <span className={styles.auditLabel}>Time window</span>
              <span className={styles.auditValue}>{auditWindowHours}</span>
            </div>
            <div className={styles.auditCard}>
              <span className={styles.auditLabel}>Latest reserves A/B</span>
              <span className={styles.auditValue}>
                {auditKpis.lastReserveA} / {auditKpis.lastReserveB}
              </span>
            </div>
          </div>
          {auditAlerts.length > 0 ? (
            <div className={styles.auditAlerts}>
              {auditAlerts.map((alert) => (
                <span key={alert} className={styles.auditAlert}>
                  {alert}
                </span>
              ))}
            </div>
          ) : null}
          <div className={styles.timelineList}>
            {filteredTrailItems.length === 0 ? (
              <div className={styles.timelineItem}>
                <span className={styles.timelineTime}>--</span>
                <div>
                  <p className={styles.timelineTitle}>No recent activity yet</p>
                  <p className={styles.timelineBody}>
                    Agreement updates and treasury changes will appear here.
                  </p>
                </div>
              </div>
            ) : (
              filteredTrailItems.map((item) => (
                <div className={styles.timelineItem} key={item.id}>
                  <span className={styles.timelineTime}>
                    {formatRelativeTime(item.timestamp, trailNow, locale)}
                  </span>
                  <div>
                    <span className={styles.timelinePill}>
                      {auditCategoryForTitle(item.title) === "covenant"
                        ? "Agreement"
                        : auditCategoryForTitle(item.title) === "treasury"
                        ? "Treasury"
                        : auditCategoryForTitle(item.title) === "dispute"
                        ? "Dispute"
                        : auditCategoryForTitle(item.title) === "ubi"
                        ? "UBI"
                        : "System"}
                    </span>
                    <p className={styles.timelineTitle}>{simplifyAuditTitle(item.title)}</p>
                    {item.body ? (
                      <p className={styles.timelineBody}>{item.body}</p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <WorkAgreementsSection
          covenantTagFilter={covenantTagFilter}
          onCovenantTagFilterChange={setCovenantTagFilter}
          onRefresh={refreshCovenants}
          missingEnv={missingEnv}
          isLoadingCovenants={isLoadingCovenants}
          dashboardView={dashboardView}
          onlyFlaggedAgreements={onlyFlaggedAgreements}
          onToggleOnlyFlagged={() => setOnlyFlaggedAgreements((current) => !current)}
          onExportReviewCsv={handleExportReviewCsv}
          visibleCount={covenantQueue.items.length}
          queueFilter={queueFilter}
          onQueueFilterChange={setQueueFilter}
          queueCounts={covenantQueue.counts}
          covenantOverview={covenantOverview}
          isEmpty={covenantQueue.items.length === 0}
          emptyMessage={
            isLoadingCovenants
              ? "Loading agreements…"
              : queueFilter === "all"
              ? "No agreements yet. Create one above to start the work flow."
              : "No agreements match this queue."
          }
        >
          {covenantQueue.items.map((item) => (
            <WorkAgreementRow
              key={`covenant-${item.id}`}
              item={item}
              accountAddress={account.address}
              isDisputeResolver={isDisputeResolver}
              isDisputeFinalizer={isDisputeFinalizer}
              externalAdjudicationUrl={externalAdjudicationUrl}
              templateById={templateById}
              covenantStatusLabels={covenantStatusLabels}
              covenantTagMap={covenantTagMap}
              covenantTransparencyMap={covenantTransparencyMap}
              disputeReviewRecords={disputeReviewRecords}
              reputationRingNotes={reputationRingSignals.notesByCovenant}
              reviewPriorityNotes={reviewPrioritySignals.notesByCovenant}
              trailItems={trailItems}
              trailNow={trailNow}
              locale={locale}
              disputeSteps={disputeSteps}
              isBusy={isBusy}
              disputeState={disputeFormState}
              formatPercent={formatPercent}
              nextStepForCovenant={nextStepForCovenant}
              getDisputeStage={getDisputeStage}
              disputeStatusLabel={disputeStatusLabel}
              buildExternalAdjudicationLink={buildExternalAdjudicationLink}
              formatEvidenceLink={formatEvidenceLink}
              formatRelativeTime={formatRelativeTime}
              disputeReviewLabel={disputeReviewLabel}
              simplifyAuditTitle={simplifyAuditTitle}
              auditCategoryForTitle={auditCategoryForTitle}
              trailMatchesCovenant={trailMatchesCovenant}
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
              STATUS_DISPUTED={STATUS_DISPUTED}
            />
          ))}
        </WorkAgreementsSection>
      </main>
    </div>
  );
}
