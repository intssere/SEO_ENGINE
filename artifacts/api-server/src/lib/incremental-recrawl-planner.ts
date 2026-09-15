import { createHash } from "node:crypto";
import {
  assertCrawlHistoryComparisonIntegrity,
  compareFullSiteCrawlHistory,
  CRAWL_HISTORY_UNAVAILABLE_PER_URL_DIMENSIONS,
  type CrawlHistoryComparison,
  type CrawlHistorySource,
  type CrawlHistoryUnavailablePerUrlDimension,
} from "./crawl-history-comparison.js";

export const INCREMENTAL_RECRAWL_ABSOLUTE_LIMITS = Object.freeze({
  urls: 25_000,
  batchSize: 500,
} as const);

export const INCREMENTAL_RECRAWL_TRUSTED_SIGNALS = Object.freeze([
  "high_value",
  "stale",
  "unresolved_issue",
  "gsc_opportunity",
  "recent_execution",
] as const);

export const INCREMENTAL_RECRAWL_REASONS = Object.freeze([
  "inventory_added",
  "sitemap_lastmod_changed",
  "unresolved_issue",
  "recent_execution",
  "gsc_opportunity",
  "high_value",
  "stale",
] as const);

export type IncrementalRecrawlTrustedSignal = typeof INCREMENTAL_RECRAWL_TRUSTED_SIGNALS[number];
export type IncrementalRecrawlReason = typeof INCREMENTAL_RECRAWL_REASONS[number];
export type IncrementalRecrawlPriority = "p0_change" | "p1_actionable" | "p2_maintenance";

export type IncrementalRecrawlTrustedCandidate = {
  canonicalUrl: string;
  signals: IncrementalRecrawlTrustedSignal[];
};

export type IncrementalRecrawlPolicy = {
  maxPlanUrls: number;
  batchSize: number;
};

export type IncrementalRecrawlPlanItem = {
  canonicalUrl: string;
  priority: IncrementalRecrawlPriority;
  reasons: IncrementalRecrawlReason[];
};

export type IncrementalRecrawlExcludedItem = {
  canonicalUrl: string;
  reason: "removed_from_current_inventory" | "trusted_candidate_not_in_current_inventory";
};

export type IncrementalRecrawlAuthorization = {
  networkExecutionEnabled: false;
  crawlExecutionAuthorized: false;
  sitemapNetworkFetchingEnabled: false;
  persistenceAuthorized: false;
  schedulerEnabled: false;
  batchExecutorEnabled: false;
  autonomousWorkerEnabled: false;
  retryLoopEnabled: false;
  competitorCollectionAuthorized: false;
  competitorPersistenceAuthorized: false;
  providerWrites: false;
  publicSiteWrites: false;
};

export type IncrementalRecrawlPlan = {
  version: "first_party_incremental_recrawl_plan_v1";
  siteId: string;
  canonicalOrigin: string;
  source: {
    comparisonFingerprint: string;
    beforeInventoryFingerprint: string;
    beforeCertificationFingerprint: string;
    afterInventoryFingerprint: string;
    afterCertificationFingerprint: string;
    afterExecutionPlanFingerprint: string;
    afterCheckpointFingerprint: string;
  };
  limits: {
    pageHardLimit: number;
    absolutePageCeiling: number;
    maxPlanUrls: number;
    batchSize: number;
  };
  items: IncrementalRecrawlPlanItem[];
  batches: Array<{
    batchId: string;
    sequence: number;
    urls: string[];
  }>;
  deferred: IncrementalRecrawlPlanItem[];
  excluded: IncrementalRecrawlExcludedItem[];
  accounting: {
    candidateUrls: number;
    selectedUrls: number;
    deferredUrls: number;
    excludedUrls: number;
  };
  fallback: {
    fullReconciliationRecommended: boolean;
    reason:
      | "none"
      | "aggregate_regression_without_url_level_evidence"
      | "lineage_change_without_url_level_evidence";
  };
  capabilities: {
    targetedSignals: IncrementalRecrawlReason[];
    unavailablePerUrlDimensions: CrawlHistoryUnavailablePerUrlDimension[];
    perUrlOutcomeComparisonAvailable: false;
    reason: "upstream_p2_1_to_p2_5_do_not_retain_per_url_fetch_or_content_outcomes";
  };
  authorization: IncrementalRecrawlAuthorization;
  fingerprint: string;
};

const REASON_RANK = new Map<IncrementalRecrawlReason, number>(
  INCREMENTAL_RECRAWL_REASONS.map((reason, index) => [reason, index]),
);

const SIGNAL_TO_REASON: Record<IncrementalRecrawlTrustedSignal, IncrementalRecrawlReason> = {
  high_value: "high_value",
  stale: "stale",
  unresolved_issue: "unresolved_issue",
  gsc_opportunity: "gsc_opportunity",
  recent_execution: "recent_execution",
};

function stableSerialize(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function requireSha256(value: string, code: string): string {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error(code);
  return value;
}

function requirePositiveInteger(value: number, maximum: number, code: string): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1 || value > maximum) throw new Error(code);
  return value;
}

function allFalse(value: Record<string, boolean>): boolean {
  return Object.values(value).every((flag) => flag === false);
}

function authorizationBoundary(): IncrementalRecrawlAuthorization {
  return {
    networkExecutionEnabled: false,
    crawlExecutionAuthorized: false,
    sitemapNetworkFetchingEnabled: false,
    persistenceAuthorized: false,
    schedulerEnabled: false,
    batchExecutorEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    competitorCollectionAuthorized: false,
    competitorPersistenceAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
  };
}

function normalizeCanonicalCandidate(value: string, canonicalOrigin: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("incremental_recrawl_candidate_url_invalid");
  }
  if (parsed.protocol !== "https:") throw new Error("incremental_recrawl_candidate_scheme_invalid");
  if (parsed.username || parsed.password) throw new Error("incremental_recrawl_candidate_credentials_denied");
  if (parsed.origin !== canonicalOrigin) throw new Error("incremental_recrawl_candidate_cross_origin_denied");
  if (parsed.search || parsed.hash) throw new Error("incremental_recrawl_candidate_query_or_fragment_denied");
  parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/");
  const normalized = parsed.toString().replace(/\/$/, "") || canonicalOrigin;
  return normalized === canonicalOrigin.replace(/\/$/, "") ? canonicalOrigin : normalized;
}

function sortedReasons(reasons: Iterable<IncrementalRecrawlReason>): IncrementalRecrawlReason[] {
  return [...new Set(reasons)].sort((a, b) => (REASON_RANK.get(a) ?? 999) - (REASON_RANK.get(b) ?? 999));
}

function priorityForReasons(reasons: readonly IncrementalRecrawlReason[]): IncrementalRecrawlPriority {
  if (reasons.includes("inventory_added") || reasons.includes("sitemap_lastmod_changed")) return "p0_change";
  if (
    reasons.includes("unresolved_issue") ||
    reasons.includes("recent_execution") ||
    reasons.includes("gsc_opportunity") ||
    reasons.includes("high_value")
  ) return "p1_actionable";
  return "p2_maintenance";
}

function priorityRank(priority: IncrementalRecrawlPriority): number {
  if (priority === "p0_change") return 0;
  if (priority === "p1_actionable") return 1;
  return 2;
}

function sortItems(items: IncrementalRecrawlPlanItem[]): IncrementalRecrawlPlanItem[] {
  return [...items].sort(
    (a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.canonicalUrl.localeCompare(b.canonicalUrl),
  );
}

function validatePolicy(
  policy: IncrementalRecrawlPolicy,
  comparison: CrawlHistoryComparison,
): IncrementalRecrawlPolicy {
  const maxPlanUrls = requirePositiveInteger(
    policy.maxPlanUrls,
    INCREMENTAL_RECRAWL_ABSOLUTE_LIMITS.urls,
    "incremental_recrawl_max_plan_urls_invalid",
  );
  const batchSize = requirePositiveInteger(
    policy.batchSize,
    INCREMENTAL_RECRAWL_ABSOLUTE_LIMITS.batchSize,
    "incremental_recrawl_batch_size_invalid",
  );
  const pageHardLimit = comparison.lineageChanges.pageHardLimit.after;
  const absolutePageCeiling = comparison.lineageChanges.absolutePageCeiling.after;
  if (maxPlanUrls > pageHardLimit || maxPlanUrls > absolutePageCeiling) {
    throw new Error("incremental_recrawl_plan_limit_exceeds_upstream_ceiling");
  }
  if (batchSize > maxPlanUrls) throw new Error("incremental_recrawl_batch_size_exceeds_plan_limit");
  return { maxPlanUrls, batchSize };
}

function assertTrustedSignals(signals: readonly IncrementalRecrawlTrustedSignal[]): void {
  if (signals.length === 0) throw new Error("incremental_recrawl_trusted_candidate_signals_required");
  if (new Set(signals).size !== signals.length) throw new Error("incremental_recrawl_trusted_candidate_signal_duplicate");
  for (const signal of signals) {
    if (!INCREMENTAL_RECRAWL_TRUSTED_SIGNALS.includes(signal)) {
      throw new Error("incremental_recrawl_trusted_candidate_signal_invalid");
    }
  }
}

function fallbackFor(comparison: CrawlHistoryComparison): IncrementalRecrawlPlan["fallback"] {
  const aggregateRegression =
    comparison.ledgerDeltas.failed > 0 ||
    comparison.ledgerDeltas.pending > 0 ||
    comparison.ledgerDeltas.coveragePercent < 0 ||
    (comparison.certificationTransition.beforeCertified && !comparison.certificationTransition.afterCertified) ||
    comparison.certificationTransition.blockersAdded.length > 0;
  if (aggregateRegression) {
    return {
      fullReconciliationRecommended: true,
      reason: "aggregate_regression_without_url_level_evidence",
    };
  }
  if (
    comparison.summary.lineageConfigurationChanged &&
    !comparison.summary.inventoryMembershipChanged &&
    !comparison.summary.sitemapLastmodChanged
  ) {
    return {
      fullReconciliationRecommended: true,
      reason: "lineage_change_without_url_level_evidence",
    };
  }
  return { fullReconciliationRecommended: false, reason: "none" };
}

function reconstructComparison(input: {
  comparison: CrawlHistoryComparison;
  before: CrawlHistorySource;
  after: CrawlHistorySource;
}): CrawlHistoryComparison {
  assertCrawlHistoryComparisonIntegrity(input.comparison);
  const rebuilt = compareFullSiteCrawlHistory({ before: input.before, after: input.after });
  if (rebuilt.fingerprint !== input.comparison.fingerprint) {
    throw new Error("incremental_recrawl_comparison_lineage_mismatch");
  }
  return rebuilt;
}

export function buildIncrementalRecrawlPlan(input: {
  comparison: CrawlHistoryComparison;
  before: CrawlHistorySource;
  after: CrawlHistorySource;
  policy: IncrementalRecrawlPolicy;
  trustedCandidates?: IncrementalRecrawlTrustedCandidate[];
}): IncrementalRecrawlPlan {
  const comparison = reconstructComparison(input);
  const policy = validatePolicy(input.policy, comparison);
  const currentInventory = input.after.inventory;
  if (!currentInventory.completeness.complete || currentInventory.completeness.hardLimitReached) {
    throw new Error("incremental_recrawl_current_inventory_must_be_complete");
  }
  if (currentInventory.fingerprint !== comparison.source.after.inventoryFingerprint) {
    throw new Error("incremental_recrawl_current_inventory_fingerprint_mismatch");
  }
  if (
    currentInventory.siteId !== comparison.siteId ||
    currentInventory.canonicalOrigin !== comparison.canonicalOrigin
  ) throw new Error("incremental_recrawl_current_inventory_identity_mismatch");

  const currentUrls = new Set(currentInventory.inventory.entries.map((entry) => entry.canonicalUrl));
  const candidates = new Map<string, Set<IncrementalRecrawlReason>>();
  const excluded: IncrementalRecrawlExcludedItem[] = [];

  const addReason = (canonicalUrl: string, reason: IncrementalRecrawlReason) => {
    const reasons = candidates.get(canonicalUrl) ?? new Set<IncrementalRecrawlReason>();
    reasons.add(reason);
    candidates.set(canonicalUrl, reasons);
  };

  for (const entry of comparison.inventoryChanges.added) {
    if (!currentUrls.has(entry.canonicalUrl)) throw new Error("incremental_recrawl_added_url_missing_from_current_inventory");
    addReason(entry.canonicalUrl, "inventory_added");
  }
  for (const entry of comparison.inventoryChanges.lastmodChanged) {
    if (!currentUrls.has(entry.canonicalUrl)) throw new Error("incremental_recrawl_lastmod_url_missing_from_current_inventory");
    addReason(entry.canonicalUrl, "sitemap_lastmod_changed");
  }
  for (const entry of comparison.inventoryChanges.removed) {
    excluded.push({ canonicalUrl: entry.canonicalUrl, reason: "removed_from_current_inventory" });
  }

  for (const candidate of input.trustedCandidates ?? []) {
    assertTrustedSignals(candidate.signals);
    const canonicalUrl = normalizeCanonicalCandidate(candidate.canonicalUrl, comparison.canonicalOrigin);
    if (!currentUrls.has(canonicalUrl)) {
      excluded.push({ canonicalUrl, reason: "trusted_candidate_not_in_current_inventory" });
      continue;
    }
    for (const signal of candidate.signals) addReason(canonicalUrl, SIGNAL_TO_REASON[signal]);
  }

  const allItems = sortItems(
    [...candidates.entries()].map(([canonicalUrl, reasons]) => {
      const orderedReasons = sortedReasons(reasons);
      return {
        canonicalUrl,
        priority: priorityForReasons(orderedReasons),
        reasons: orderedReasons,
      };
    }),
  );
  const items = allItems.slice(0, policy.maxPlanUrls);
  const deferred = allItems.slice(policy.maxPlanUrls);
  const batches = Array.from({ length: Math.ceil(items.length / policy.batchSize) }, (_, index) => {
    const urls = items.slice(index * policy.batchSize, (index + 1) * policy.batchSize).map((item) => item.canonicalUrl);
    return {
      batchId: `incremental-${String(index + 1).padStart(4, "0")}`,
      sequence: index,
      urls,
    };
  });
  const sortedExcluded = [...excluded].sort(
    (a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl) || a.reason.localeCompare(b.reason),
  );

  const withoutFingerprint: Omit<IncrementalRecrawlPlan, "fingerprint"> = {
    version: "first_party_incremental_recrawl_plan_v1",
    siteId: comparison.siteId,
    canonicalOrigin: comparison.canonicalOrigin,
    source: {
      comparisonFingerprint: comparison.fingerprint,
      beforeInventoryFingerprint: comparison.source.before.inventoryFingerprint,
      beforeCertificationFingerprint: comparison.source.before.certificationFingerprint,
      afterInventoryFingerprint: comparison.source.after.inventoryFingerprint,
      afterCertificationFingerprint: comparison.source.after.certificationFingerprint,
      afterExecutionPlanFingerprint: comparison.source.after.executionPlanFingerprint,
      afterCheckpointFingerprint: comparison.source.after.checkpointFingerprint,
    },
    limits: {
      pageHardLimit: comparison.lineageChanges.pageHardLimit.after,
      absolutePageCeiling: comparison.lineageChanges.absolutePageCeiling.after,
      maxPlanUrls: policy.maxPlanUrls,
      batchSize: policy.batchSize,
    },
    items,
    batches,
    deferred,
    excluded: sortedExcluded,
    accounting: {
      candidateUrls: allItems.length,
      selectedUrls: items.length,
      deferredUrls: deferred.length,
      excludedUrls: sortedExcluded.length,
    },
    fallback: fallbackFor(comparison),
    capabilities: {
      targetedSignals: [...INCREMENTAL_RECRAWL_REASONS],
      unavailablePerUrlDimensions: [...CRAWL_HISTORY_UNAVAILABLE_PER_URL_DIMENSIONS],
      perUrlOutcomeComparisonAvailable: false,
      reason: "upstream_p2_1_to_p2_5_do_not_retain_per_url_fetch_or_content_outcomes",
    },
    authorization: authorizationBoundary(),
  };
  return { ...withoutFingerprint, fingerprint: sha256(withoutFingerprint) };
}

export function assertIncrementalRecrawlPlanIntegrity(plan: IncrementalRecrawlPlan): void {
  if (plan.version !== "first_party_incremental_recrawl_plan_v1") {
    throw new Error("incremental_recrawl_plan_version_invalid");
  }
  if (!plan.siteId.trim()) throw new Error("incremental_recrawl_plan_site_id_invalid");
  const origin = normalizeCanonicalCandidate(plan.canonicalOrigin, plan.canonicalOrigin);
  if (origin !== plan.canonicalOrigin) throw new Error("incremental_recrawl_plan_origin_invalid");
  for (const value of [
    plan.source.comparisonFingerprint,
    plan.source.beforeInventoryFingerprint,
    plan.source.beforeCertificationFingerprint,
    plan.source.afterInventoryFingerprint,
    plan.source.afterCertificationFingerprint,
    plan.source.afterExecutionPlanFingerprint,
    plan.source.afterCheckpointFingerprint,
    plan.fingerprint,
  ]) requireSha256(value, "incremental_recrawl_plan_fingerprint_invalid");
  if (!allFalse(plan.authorization as unknown as Record<string, boolean>)) {
    throw new Error("incremental_recrawl_plan_authorization_must_be_closed");
  }
  if (plan.capabilities.perUrlOutcomeComparisonAvailable !== false) {
    throw new Error("incremental_recrawl_plan_per_url_capability_invalid");
  }
  if (
    stableSerialize(plan.capabilities.targetedSignals) !== stableSerialize([...INCREMENTAL_RECRAWL_REASONS]) ||
    stableSerialize(plan.capabilities.unavailablePerUrlDimensions) !==
      stableSerialize([...CRAWL_HISTORY_UNAVAILABLE_PER_URL_DIMENSIONS])
  ) throw new Error("incremental_recrawl_plan_capabilities_invalid");

  const maxPlanUrls = requirePositiveInteger(
    plan.limits.maxPlanUrls,
    INCREMENTAL_RECRAWL_ABSOLUTE_LIMITS.urls,
    "incremental_recrawl_plan_max_urls_invalid",
  );
  const batchSize = requirePositiveInteger(
    plan.limits.batchSize,
    INCREMENTAL_RECRAWL_ABSOLUTE_LIMITS.batchSize,
    "incremental_recrawl_plan_batch_size_invalid",
  );
  if (
    maxPlanUrls > plan.limits.pageHardLimit ||
    maxPlanUrls > plan.limits.absolutePageCeiling ||
    batchSize > maxPlanUrls
  ) throw new Error("incremental_recrawl_plan_limit_invariant_invalid");

  const assertItemList = (items: IncrementalRecrawlPlanItem[], code: string) => {
    const urls = items.map((item) => item.canonicalUrl);
    if (new Set(urls).size !== urls.length) throw new Error(`${code}_duplicate_url`);
    for (const item of items) {
      if (normalizeCanonicalCandidate(item.canonicalUrl, plan.canonicalOrigin) !== item.canonicalUrl) {
        throw new Error(`${code}_url_not_canonical`);
      }
      const reasons = sortedReasons(item.reasons);
      if (stableSerialize(reasons) !== stableSerialize(item.reasons)) throw new Error(`${code}_reasons_invalid`);
      if (priorityForReasons(item.reasons) !== item.priority) throw new Error(`${code}_priority_invalid`);
    }
    const sorted = sortItems(items);
    if (stableSerialize(sorted) !== stableSerialize(items)) throw new Error(`${code}_order_invalid`);
  };
  assertItemList(plan.items, "incremental_recrawl_plan_items");
  assertItemList(plan.deferred, "incremental_recrawl_plan_deferred");

  const combinedUrls = [...plan.items, ...plan.deferred].map((item) => item.canonicalUrl);
  if (new Set(combinedUrls).size !== combinedUrls.length) {
    throw new Error("incremental_recrawl_plan_selected_deferred_overlap");
  }
  if (plan.items.length > maxPlanUrls) throw new Error("incremental_recrawl_plan_selected_count_exceeds_limit");
  if (
    plan.accounting.candidateUrls !== plan.items.length + plan.deferred.length ||
    plan.accounting.selectedUrls !== plan.items.length ||
    plan.accounting.deferredUrls !== plan.deferred.length ||
    plan.accounting.excludedUrls !== plan.excluded.length
  ) throw new Error("incremental_recrawl_plan_accounting_mismatch");

  const expectedBatches = Array.from({ length: Math.ceil(plan.items.length / batchSize) }, (_, index) => ({
    batchId: `incremental-${String(index + 1).padStart(4, "0")}`,
    sequence: index,
    urls: plan.items.slice(index * batchSize, (index + 1) * batchSize).map((item) => item.canonicalUrl),
  }));
  if (stableSerialize(expectedBatches) !== stableSerialize(plan.batches)) {
    throw new Error("incremental_recrawl_plan_batches_invalid");
  }

  const excludedSorted = [...plan.excluded].sort(
    (a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl) || a.reason.localeCompare(b.reason),
  );
  if (stableSerialize(excludedSorted) !== stableSerialize(plan.excluded)) {
    throw new Error("incremental_recrawl_plan_excluded_order_invalid");
  }
  for (const item of plan.excluded) normalizeCanonicalCandidate(item.canonicalUrl, plan.canonicalOrigin);

  if (
    (plan.fallback.fullReconciliationRecommended && plan.fallback.reason === "none") ||
    (!plan.fallback.fullReconciliationRecommended && plan.fallback.reason !== "none")
  ) throw new Error("incremental_recrawl_plan_fallback_invalid");

  const { fingerprint: actual, ...withoutFingerprint } = plan;
  if (actual !== sha256(withoutFingerprint)) throw new Error("incremental_recrawl_plan_fingerprint_mismatch");
}
