import { createHash } from "node:crypto";
import type { CrawlControllerPlan } from "./crawl-controller.js";
import {
  assertCrawlHistoryComparisonIntegrity,
  compareFullSiteCrawlHistory,
  type CrawlHistoryComparison,
  type CrawlHistorySource,
} from "./crawl-history-comparison.js";
import {
  assertFullSiteCrawlCertificationIntegrity,
  buildFullSiteCrawlCertification,
  type FullSiteCrawlCertification,
} from "./full-site-crawl-certification.js";
import type {
  FullSiteCrawlCheckpoint,
  FullSiteCrawlExecutionPlan,
} from "./full-site-crawl-control.js";
import {
  assertIncrementalRecrawlPlanIntegrity,
  buildIncrementalRecrawlPlan,
  type IncrementalRecrawlPlan,
  type IncrementalRecrawlPolicy,
  type IncrementalRecrawlTrustedCandidate,
} from "./incremental-recrawl-planner.js";
import type { SitemapInventoryResult } from "./sitemap-inventory.js";
import {
  READ_SCHEDULER_QUEUE_VERSION,
  evaluateReadSchedule,
  normalizeReadScheduleDefinition,
  readSchedulerQueueCapability,
  type ReadScheduleDefinition,
  type ReadScheduleEvaluation,
} from "./read-scheduler-queue.js";

export const SCHEDULED_CRAWL_POLICY_VERSION = "p9-3-scheduled-crawl-policy-v1" as const;
export const MAX_FULL_RECONCILIATION_INTERVAL_SLOTS = 720;

export type ScheduledCrawlPolicy = {
  fullReconciliationEverySlots: number;
};

export type CurrentFullSiteCrawlLineage = {
  crawlPlan: CrawlControllerPlan;
  inventory: SitemapInventoryResult;
  executionPlan: FullSiteCrawlExecutionPlan;
  checkpoint: FullSiteCrawlCheckpoint;
  certification: FullSiteCrawlCertification;
};

export type IncrementalCrawlEvidence = {
  before: CrawlHistorySource;
  after: CrawlHistorySource;
  comparison: CrawlHistoryComparison;
  policy: IncrementalRecrawlPolicy;
  trustedCandidates?: IncrementalRecrawlTrustedCandidate[];
  plan: IncrementalRecrawlPlan;
};

export type CrawlPolicySelection =
  | "full_reconciliation"
  | "incremental"
  | "no_work";

export type CrawlPolicyReason =
  | "scheduled_full_reconciliation"
  | "current_full_site_not_certified"
  | "incremental_evidence_unavailable"
  | "aggregate_regression_without_url_level_evidence"
  | "lineage_change_without_url_level_evidence"
  | "incremental_candidates_available"
  | "no_incremental_candidates";

export type ScheduledCrawlPolicyCandidate = {
  version: typeof SCHEDULED_CRAWL_POLICY_VERSION;
  candidateId: string;
  candidateFingerprint: string;
  lifecycle: "proposed_review";
  selection: CrawlPolicySelection;
  reason: CrawlPolicyReason;
  siteId: string;
  canonicalOrigin: string;
  scheduleId: string;
  scheduleFingerprint: string;
  intentId: string;
  intentFingerprint: string;
  slotAt: string;
  expiresAt: string;
  slotIndex: number;
  fullReconciliationEverySlots: number;
  current: {
    crawlPlanFingerprint: string;
    inventoryFingerprint: string;
    executionPlanFingerprint: string;
    checkpointFingerprint: string;
    certificationFingerprint: string;
    wholeSiteCertified: boolean;
  };
  incremental: {
    comparisonFingerprint: string | null;
    planFingerprint: string | null;
  };
  work: {
    selectedUrlCount: number;
    deferredUrlCount: number;
    batchCount: number;
    requiresWholeSiteCertification: boolean;
  };
  safety: ReturnType<typeof scheduledCrawlPolicyCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort((a, b) => a.localeCompare(b))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key])).join(",") + "}";
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function exactSafety(actual: unknown, expected: unknown, name: string): void {
  if (stableJson(actual) !== stableJson(expected)) throw new Error(name + "_mismatch");
}

function normalizePolicy(policy: ScheduledCrawlPolicy): ScheduledCrawlPolicy {
  if (
    !Number.isInteger(policy.fullReconciliationEverySlots)
    || policy.fullReconciliationEverySlots < 1
    || policy.fullReconciliationEverySlots > MAX_FULL_RECONCILIATION_INTERVAL_SLOTS
  ) {
    throw new Error("invalid_full_reconciliation_interval_slots");
  }
  return { fullReconciliationEverySlots: policy.fullReconciliationEverySlots };
}

function validateCurrentLineage(current: CurrentFullSiteCrawlLineage) {
  assertFullSiteCrawlCertificationIntegrity(current.certification);
  const rebuiltCertification = buildFullSiteCrawlCertification({
    crawlPlan: current.crawlPlan,
    inventory: current.inventory,
    executionPlan: current.executionPlan,
    checkpoint: current.checkpoint,
  });
  if (stableJson(rebuiltCertification) !== stableJson(current.certification)) {
    throw new Error("current_full_site_lineage_mismatch");
  }
  if (
    current.certification.siteId !== current.crawlPlan.target.siteId
    || current.certification.canonicalOrigin !== current.crawlPlan.target.canonicalOrigin
  ) {
    throw new Error("current_full_site_identity_mismatch");
  }
  return {
    ...current,
    crawlPlanFingerprint: stableHash({
      version: SCHEDULED_CRAWL_POLICY_VERSION,
      purpose: "current_crawl_plan",
      crawlPlan: current.crawlPlan,
    }),
  };
}

function validateIncrementalEvidence(
  current: ReturnType<typeof validateCurrentLineage>,
  incremental: IncrementalCrawlEvidence | null | undefined,
) {
  if (!incremental) return null;

  assertCrawlHistoryComparisonIntegrity(incremental.comparison);
  assertIncrementalRecrawlPlanIntegrity(incremental.plan);

  const rebuiltComparison = compareFullSiteCrawlHistory({
    before: incremental.before,
    after: incremental.after,
  });
  if (stableJson(rebuiltComparison) !== stableJson(incremental.comparison)) {
    throw new Error("incremental_comparison_lineage_mismatch");
  }

  const rebuiltPlan = buildIncrementalRecrawlPlan({
    comparison: incremental.comparison,
    before: incremental.before,
    after: incremental.after,
    policy: incremental.policy,
    trustedCandidates: incremental.trustedCandidates ?? [],
  });
  if (stableJson(rebuiltPlan) !== stableJson(incremental.plan)) {
    throw new Error("incremental_plan_lineage_mismatch");
  }

  if (
    stableJson(incremental.after.inventory) !== stableJson(current.inventory)
    || stableJson(incremental.after.certification) !== stableJson(current.certification)
  ) {
    throw new Error("incremental_current_lineage_mismatch");
  }
  if (
    incremental.plan.siteId !== current.certification.siteId
    || incremental.plan.canonicalOrigin !== current.certification.canonicalOrigin
  ) {
    throw new Error("incremental_current_identity_mismatch");
  }

  return incremental;
}

function lineageFingerprints(input: {
  current: ReturnType<typeof validateCurrentLineage>;
  incremental: IncrementalCrawlEvidence | null;
  policy: ScheduledCrawlPolicy;
}) {
  const scopeFingerprint = stableHash({
    version: SCHEDULED_CRAWL_POLICY_VERSION,
    purpose: "crawl_refresh_scope",
    siteId: input.current.certification.siteId,
    canonicalOrigin: input.current.certification.canonicalOrigin,
  });
  const upstreamLineageFingerprint = stableHash({
    version: SCHEDULED_CRAWL_POLICY_VERSION,
    purpose: "crawl_refresh_upstream_lineage",
    policy: input.policy,
    current: {
      crawlPlanFingerprint: input.current.crawlPlanFingerprint,
      inventoryFingerprint: input.current.inventory.fingerprint,
      executionPlanFingerprint: input.current.executionPlan.fingerprint,
      checkpointFingerprint: input.current.checkpoint.fingerprint,
      certificationFingerprint: input.current.certification.fingerprint,
    },
    incremental: input.incremental
      ? {
          comparisonFingerprint: input.incremental.comparison.fingerprint,
          planFingerprint: input.incremental.plan.fingerprint,
        }
      : null,
  });
  return { scopeFingerprint, upstreamLineageFingerprint };
}

export function buildScheduledCrawlRefreshSchedule(input: {
  key: string;
  current: CurrentFullSiteCrawlLineage;
  incremental?: IncrementalCrawlEvidence | null;
  policy: ScheduledCrawlPolicy;
  startAt: string;
  cadenceMinutes: number;
  dueWindowMinutes: number;
  paused?: boolean;
}): ReadScheduleDefinition {
  const current = validateCurrentLineage(input.current);
  const incremental = validateIncrementalEvidence(current, input.incremental);
  const policy = normalizePolicy(input.policy);
  const fingerprints = lineageFingerprints({ current, incremental, policy });

  return normalizeReadScheduleDefinition({
    key: input.key,
    workClass: "crawl_refresh",
    scopeFingerprint: fingerprints.scopeFingerprint,
    upstreamLineageFingerprint: fingerprints.upstreamLineageFingerprint,
    startAt: input.startAt,
    cadenceMinutes: input.cadenceMinutes,
    dueWindowMinutes: input.dueWindowMinutes,
    paused: input.paused,
  });
}

function exactBoundSchedule(input: {
  schedule: ReadScheduleDefinition;
  current: CurrentFullSiteCrawlLineage;
  incremental?: IncrementalCrawlEvidence | null;
  policy: ScheduledCrawlPolicy;
}) {
  const expected = buildScheduledCrawlRefreshSchedule({
    key: input.schedule.key,
    current: input.current,
    incremental: input.incremental,
    policy: input.policy,
    startAt: input.schedule.startAt,
    cadenceMinutes: input.schedule.cadenceMinutes,
    dueWindowMinutes: input.schedule.dueWindowMinutes,
    paused: input.schedule.paused,
  });
  if (stableJson(expected) !== stableJson(input.schedule)) {
    throw new Error("scheduled_crawl_schedule_lineage_mismatch");
  }
  exactSafety(input.schedule.safety, readSchedulerQueueCapability(), "read_schedule_safety");
  return expected;
}

function slotIndex(schedule: ReadScheduleDefinition, slotAt: string): number {
  const cadenceMs = schedule.cadenceMinutes * 60_000;
  const delta = Date.parse(slotAt) - Date.parse(schedule.startAt);
  if (delta < 0 || delta % cadenceMs !== 0) throw new Error("scheduled_crawl_slot_alignment_invalid");
  const value = delta / cadenceMs;
  if (!Number.isSafeInteger(value)) throw new Error("scheduled_crawl_slot_index_invalid");
  return value;
}

function choosePolicy(input: {
  slotIndex: number;
  policy: ScheduledCrawlPolicy;
  current: ReturnType<typeof validateCurrentLineage>;
  incremental: IncrementalCrawlEvidence | null;
}): { selection: CrawlPolicySelection; reason: CrawlPolicyReason } {
  if (input.slotIndex % input.policy.fullReconciliationEverySlots === 0) {
    return {
      selection: "full_reconciliation",
      reason: "scheduled_full_reconciliation",
    };
  }
  if (!input.current.certification.certification.wholeSiteCertified) {
    return {
      selection: "full_reconciliation",
      reason: "current_full_site_not_certified",
    };
  }
  if (!input.incremental) {
    return {
      selection: "full_reconciliation",
      reason: "incremental_evidence_unavailable",
    };
  }
  if (input.incremental.plan.fallback.fullReconciliationRecommended) {
    const reason = input.incremental.plan.fallback.reason;
    if (
      reason !== "aggregate_regression_without_url_level_evidence"
      && reason !== "lineage_change_without_url_level_evidence"
    ) {
      throw new Error("incremental_full_reconciliation_reason_invalid");
    }
    return { selection: "full_reconciliation", reason };
  }
  if (input.incremental.plan.items.length > 0) {
    return {
      selection: "incremental",
      reason: "incremental_candidates_available",
    };
  }
  return {
    selection: "no_work",
    reason: "no_incremental_candidates",
  };
}

function workShape(
  selection: CrawlPolicySelection,
  current: ReturnType<typeof validateCurrentLineage>,
  incremental: IncrementalCrawlEvidence | null,
) {
  if (selection === "full_reconciliation") {
    return {
      selectedUrlCount: current.inventory.inventory.uniqueUrls,
      deferredUrlCount: 0,
      batchCount: current.executionPlan.batches.length,
      requiresWholeSiteCertification: true as const,
    };
  }
  if (selection === "incremental") {
    if (!incremental) throw new Error("incremental_selection_requires_evidence");
    return {
      selectedUrlCount: incremental.plan.accounting.selectedUrls,
      deferredUrlCount: incremental.plan.accounting.deferredUrls,
      batchCount: incremental.plan.batches.length,
      requiresWholeSiteCertification: false as const,
    };
  }
  return {
    selectedUrlCount: 0,
    deferredUrlCount: 0,
    batchCount: 0,
    requiresWholeSiteCertification: false as const,
  };
}

export function projectScheduledCrawlPolicyReview(input: {
  schedule: ReadScheduleDefinition;
  current: CurrentFullSiteCrawlLineage;
  incremental?: IncrementalCrawlEvidence | null;
  policy: ScheduledCrawlPolicy;
  now: string;
  lastMaterializedSlotAt?: string | null;
}) {
  const current = validateCurrentLineage(input.current);
  const incremental = validateIncrementalEvidence(current, input.incremental);
  const policy = normalizePolicy(input.policy);
  const schedule = exactBoundSchedule(input);
  if (schedule.version !== READ_SCHEDULER_QUEUE_VERSION || schedule.workClass !== "crawl_refresh") {
    throw new Error("crawl_refresh_schedule_required");
  }

  const evaluation = evaluateReadSchedule({
    schedule,
    now: input.now,
    lastMaterializedSlotAt: input.lastMaterializedSlotAt,
  });
  const safety = scheduledCrawlPolicyCapability();

  let candidate: ScheduledCrawlPolicyCandidate | null = null;
  if (evaluation.status === "due") {
    if (!evaluation.intent) throw new Error("due_crawl_schedule_intent_missing");
    exactSafety(evaluation.intent.safety, readSchedulerQueueCapability(), "read_intent_safety");
    const index = slotIndex(schedule, evaluation.intent.slotAt);
    const decision = choosePolicy({
      slotIndex: index,
      policy,
      current,
      incremental,
    });
    const work = workShape(decision.selection, current, incremental);
    const identity = {
      lifecycle: "proposed_review" as const,
      selection: decision.selection,
      reason: decision.reason,
      siteId: current.certification.siteId,
      canonicalOrigin: current.certification.canonicalOrigin,
      scheduleId: schedule.scheduleId,
      scheduleFingerprint: schedule.scheduleFingerprint,
      intentId: evaluation.intent.intentId,
      intentFingerprint: evaluation.intent.intentFingerprint,
      slotAt: evaluation.intent.slotAt,
      expiresAt: evaluation.intent.expiresAt,
      slotIndex: index,
      fullReconciliationEverySlots: policy.fullReconciliationEverySlots,
      current: {
        crawlPlanFingerprint: current.crawlPlanFingerprint,
        inventoryFingerprint: current.inventory.fingerprint,
        executionPlanFingerprint: current.executionPlan.fingerprint,
        checkpointFingerprint: current.checkpoint.fingerprint,
        certificationFingerprint: current.certification.fingerprint,
        wholeSiteCertified: current.certification.certification.wholeSiteCertified,
      },
      incremental: {
        comparisonFingerprint: incremental?.comparison.fingerprint ?? null,
        planFingerprint: incremental?.plan.fingerprint ?? null,
      },
      work,
      safety,
    };
    const candidateFingerprint = stableHash({
      version: SCHEDULED_CRAWL_POLICY_VERSION,
      purpose: "scheduled_crawl_policy_review",
      ...identity,
    });
    candidate = {
      version: SCHEDULED_CRAWL_POLICY_VERSION,
      candidateId: "crp-" + candidateFingerprint.slice(0, 24),
      candidateFingerprint,
      ...identity,
    };
  }

  const projectionFingerprint = stableHash({
    version: SCHEDULED_CRAWL_POLICY_VERSION,
    evaluation,
    policy,
    current: {
      crawlPlanFingerprint: current.crawlPlanFingerprint,
      inventoryFingerprint: current.inventory.fingerprint,
      executionPlanFingerprint: current.executionPlan.fingerprint,
      checkpointFingerprint: current.checkpoint.fingerprint,
      certificationFingerprint: current.certification.fingerprint,
    },
    incremental: incremental
      ? {
          comparisonFingerprint: incremental.comparison.fingerprint,
          planFingerprint: incremental.plan.fingerprint,
        }
      : null,
    candidate,
    safety,
  });

  if (!HEX_64.test(projectionFingerprint)) throw new Error("scheduled_crawl_projection_fingerprint_invalid");

  return {
    version: SCHEDULED_CRAWL_POLICY_VERSION,
    projectionFingerprint,
    evaluation: evaluation as ReadScheduleEvaluation,
    policy,
    candidate,
    safety,
  };
}

export function scheduledCrawlPolicyCapability() {
  return Object.freeze({
    version: SCHEDULED_CRAWL_POLICY_VERSION,
    architectureOnly: true as const,
    deterministicProjectionOnly: true as const,
    firstPartyCrawlPolicyOnly: true as const,
    materializationReviewOnly: true as const,
    p2SafetyControlsRequired: true as const,
    fullReconciliationFallbackPreserved: true as const,
    orderingImpliesPriority: false as const,
    wallClockAccess: false as const,
    timerActivated: false as const,
    schedulerActivated: false as const,
    durableEnqueueAuthorized: false as const,
    queueReservationAuthorized: false as const,
    workerEnabled: false as const,
    batchExecutorEnabled: false as const,
    retryLoopEnabled: false as const,
    sitemapNetworkFetchingAuthorized: false as const,
    crawlNetworkReadAuthorized: false as const,
    crawlExecutionAuthorized: false as const,
    observationPersistenceAuthorized: false as const,
    evidencePersistenceAuthorized: false as const,
    productionDbReadAuthorized: false as const,
    productionDbWriteAuthorized: false as const,
    providerWrites: false as const,
    publicSiteWrites: false as const,
    task53ExecutionAuthorized: false as const,
    task54ExecutionAuthorized: false as const,
    automaticTransition: false as const,
    publicationAuthorized: false as const,
  });
}
