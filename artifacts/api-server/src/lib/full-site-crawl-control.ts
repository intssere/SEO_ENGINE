import { createHash } from "node:crypto";
import type { CrawlControllerPlan } from "./crawl-controller.js";
import type { SitemapInventoryResult } from "./sitemap-inventory.js";

export const FULL_SITE_EXECUTION_ABSOLUTE_LIMITS = Object.freeze({
  batchSize: 250,
  concurrency: 8,
  requestsPerMinute: 120,
  requestTimeoutMs: 30_000,
  redirectsPerRequest: 5,
  attemptsPerUrl: 3,
  retryBaseDelayMs: 60_000,
  retryMaxDelayMs: 120_000,
  urlLength: 2_048,
  pathSegments: 64,
  repeatedPathSegmentRun: 4,
} as const);

export type FullSiteExecutionPolicy = {
  batchSize: number;
  concurrency: number;
  requestsPerMinute: number;
  requestTimeoutMs: number;
  maxRedirectsPerRequest: number;
  maxAttemptsPerUrl: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  maxUrlLength: number;
  maxPathSegments: number;
  maxRepeatedPathSegmentRun: number;
};

export const EXECUTION_URL_REJECTION_REASONS = Object.freeze([
  "invalid_url",
  "url_too_long",
  "control_character",
  "unsupported_scheme",
  "credentials_not_allowed",
  "cross_origin",
  "fragment_not_allowed",
  "query_not_allowed",
  "backslash_not_allowed",
  "encoded_path_separator_not_allowed",
  "excluded_path",
  "path_depth_exceeded",
  "invalid_path_encoding",
  "repeated_path_segment_run_exceeded",
] as const);

export type ExecutionUrlRejectionReason = typeof EXECUTION_URL_REJECTION_REASONS[number];

export type ExecutionUrlEvaluation =
  | { safe: true; normalizedUrl: string }
  | { safe: false; reason: ExecutionUrlRejectionReason };

export type CrawlExecutionBatch = {
  index: number;
  batchId: string;
  canonicalUrls: string[];
  fingerprint: string;
};

export type FullSiteCrawlExecutionPlan = {
  version: "first_party_full_site_crawl_control_v1";
  siteId: string;
  canonicalOrigin: string;
  source: {
    crawlPlanVersion: "first_party_crawl_controller_v1";
    pageHardLimit: number;
    absolutePageCeiling: number;
    inventoryFingerprint: string;
    inventoryUniqueUrls: number;
  };
  policy: FullSiteExecutionPolicy;
  requestControls: {
    method: "GET";
    sameOriginOnly: true;
    robotsRequired: true;
    minimumRequestStartIntervalMs: number;
    redirectRevalidationRequired: true;
    queryPolicy: "reject_all";
    responseBodyPersistence: false;
  };
  batches: CrawlExecutionBatch[];
  authorization: CrawlExecutionAuthorization;
  fingerprint: string;
};

export type CrawlExecutionAuthorization = {
  networkExecutionEnabled: false;
  crawlExecutionAuthorized: false;
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

export type CrawlRetrySignal =
  | { kind: "network_timeout" | "connection_reset" | "transport_unavailable" }
  | { kind: "http_status"; httpStatus: number }
  | { kind: "policy_rejection" };

export type CrawlRetryDecision = {
  retryable: boolean;
  reason: "transient_transport" | "transient_http" | "permanent_http" | "policy_rejection" | "attempts_exhausted";
  nextAttempt: number | null;
  delayMs: number | null;
};

export type SuppliedCrawlUrlOutcome =
  | { canonicalUrl: string; kind: "success" }
  | { canonicalUrl: string; kind: "noindex" }
  | { canonicalUrl: string; kind: "robots_excluded" }
  | { canonicalUrl: string; kind: "redirect"; redirectTarget: string; redirectCount: number }
  | { canonicalUrl: string; kind: "failure"; signal: CrawlRetrySignal };

export type SuppliedCrawlBatchAttempt = {
  expectedCheckpointFingerprint: string;
  batchId: string;
  attempt: number;
  outcomes: SuppliedCrawlUrlOutcome[];
};

export type CrawlCheckpointCounters = {
  attemptsRecorded: number;
  fetchedSuccessful: number;
  redirects: number;
  robotsExcluded: number;
  noindex: number;
  terminalFailures: number;
  retryScheduled: number;
};

export type FullSiteCrawlCheckpoint = {
  version: "first_party_full_site_crawl_checkpoint_v1";
  planFingerprint: string;
  inventoryFingerprint: string;
  siteId: string;
  canonicalOrigin: string;
  sequence: number;
  status: "pending" | "completed";
  activeBatchIndex: number | null;
  activeBatchId: string | null;
  nextAttempt: number | null;
  pendingCanonicalUrls: string[];
  completedBatchIds: string[];
  counters: CrawlCheckpointCounters;
  progress: {
    totalUrls: number;
    finalizedUrls: number;
    pendingUrls: number;
    completedBatches: number;
    totalBatches: number;
    wholeSiteCertified: false;
  };
  authorization: CrawlExecutionAuthorization;
  fingerprint: string;
};

export type CrawlResumeWork = {
  status: "pending" | "completed";
  batchId: string | null;
  attempt: number | null;
  canonicalUrls: string[];
  method: "GET";
  concurrency: number;
  requestsPerMinute: number;
  minimumRequestStartIntervalMs: number;
  requestTimeoutMs: number;
  maxRedirectsPerRequest: number;
  executionEnabled: false;
};

const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const EXCLUDED_PATH = /^\/(?:cart|checkout|account|apps|search)(?:\/|$)/i;

function stableSerialize(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(",")}}`;
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function authorizationBoundary(): CrawlExecutionAuthorization {
  return {
    networkExecutionEnabled: false,
    crawlExecutionAuthorized: false,
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

function requireInteger(value: number, minimum: number, maximum: number, code: string): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < minimum || value > maximum) throw new Error(code);
  return value;
}

function validateExecutionPolicy(policy: FullSiteExecutionPolicy, crawlPlan: CrawlControllerPlan): FullSiteExecutionPolicy {
  const normalized: FullSiteExecutionPolicy = {
    batchSize: requireInteger(policy.batchSize, 1, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.batchSize, "crawl_execution_batch_size_invalid"),
    concurrency: requireInteger(policy.concurrency, 1, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.concurrency, "crawl_execution_concurrency_invalid"),
    requestsPerMinute: requireInteger(policy.requestsPerMinute, 1, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.requestsPerMinute, "crawl_execution_rate_invalid"),
    requestTimeoutMs: requireInteger(policy.requestTimeoutMs, 1, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.requestTimeoutMs, "crawl_execution_timeout_invalid"),
    maxRedirectsPerRequest: requireInteger(policy.maxRedirectsPerRequest, 0, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.redirectsPerRequest, "crawl_execution_redirect_limit_invalid"),
    maxAttemptsPerUrl: requireInteger(policy.maxAttemptsPerUrl, 1, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.attemptsPerUrl, "crawl_execution_attempt_limit_invalid"),
    retryBaseDelayMs: requireInteger(policy.retryBaseDelayMs, 1, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.retryBaseDelayMs, "crawl_execution_retry_base_delay_invalid"),
    retryMaxDelayMs: requireInteger(policy.retryMaxDelayMs, 1, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.retryMaxDelayMs, "crawl_execution_retry_max_delay_invalid"),
    maxUrlLength: requireInteger(policy.maxUrlLength, 1, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.urlLength, "crawl_execution_url_length_invalid"),
    maxPathSegments: requireInteger(policy.maxPathSegments, 1, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.pathSegments, "crawl_execution_path_segments_invalid"),
    maxRepeatedPathSegmentRun: requireInteger(policy.maxRepeatedPathSegmentRun, 1, FULL_SITE_EXECUTION_ABSOLUTE_LIMITS.repeatedPathSegmentRun, "crawl_execution_repeated_segment_invalid"),
  };
  if (normalized.batchSize > crawlPlan.limits.pageHardLimit) throw new Error("crawl_execution_batch_size_exceeds_page_fuse");
  if (normalized.concurrency > normalized.batchSize) throw new Error("crawl_execution_concurrency_exceeds_batch_size");
  if (normalized.retryMaxDelayMs < normalized.retryBaseDelayMs) throw new Error("crawl_execution_retry_delay_order_invalid");
  return normalized;
}

function allFalse(value: Record<string, boolean>): boolean {
  return Object.values(value).every((flag) => flag === false);
}

function validateLineage(crawlPlan: CrawlControllerPlan, inventory: SitemapInventoryResult): void {
  if (crawlPlan.version !== "first_party_crawl_controller_v1" || crawlPlan.mode !== "full_site") throw new Error("crawl_execution_full_site_plan_required");
  if (crawlPlan.target.targetClass !== "first_party" || !crawlPlan.target.siteId.trim()) throw new Error("crawl_execution_first_party_plan_required");
  if (crawlPlan.inventory.strategy !== "sitemap_first" || crawlPlan.controls.canonicalDeduplication !== "required_before_execution") throw new Error("crawl_execution_plan_controls_required");
  if (!allFalse(crawlPlan.authorization as unknown as Record<string, boolean>)) throw new Error("crawl_execution_plan_authorization_must_be_closed");

  if (inventory.version !== "first_party_sitemap_inventory_v1") throw new Error("crawl_execution_inventory_version_invalid");
  if (inventory.siteId !== crawlPlan.target.siteId || inventory.canonicalOrigin !== crawlPlan.target.canonicalOrigin) throw new Error("crawl_execution_inventory_identity_mismatch");
  if (!inventory.completeness.complete || inventory.completeness.hardLimitReached) throw new Error("crawl_execution_complete_inventory_required");
  if (!allFalse(inventory.authorization as unknown as Record<string, boolean>)) throw new Error("crawl_execution_inventory_authorization_must_be_closed");
  if (!/^[a-f0-9]{64}$/.test(inventory.fingerprint)) throw new Error("crawl_execution_inventory_fingerprint_invalid");
  if (inventory.inventory.uniqueUrls !== inventory.inventory.entries.length) throw new Error("crawl_execution_inventory_count_mismatch");
  if (inventory.inventory.uniqueUrls > crawlPlan.limits.pageHardLimit) throw new Error("crawl_execution_inventory_exceeds_page_fuse");
  if (inventory.policy.maxInventoryUrls > crawlPlan.limits.pageHardLimit) throw new Error("crawl_execution_inventory_policy_exceeds_page_fuse");
}

function decodedSegments(pathname: string): string[] | null {
  try {
    return pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment).normalize("NFKC"));
  } catch {
    return null;
  }
}

function maxRepeatedRun(segments: string[]): number {
  let max = 0;
  let run = 0;
  let previous: string | null = null;
  for (const segment of segments) {
    const normalized = segment.toLowerCase();
    if (normalized === previous) run += 1;
    else run = 1;
    previous = normalized;
    if (run > max) max = run;
  }
  return max;
}

export function evaluateFullSiteExecutionUrl(
  value: string,
  canonicalOrigin: string,
  policy: Pick<FullSiteExecutionPolicy, "maxUrlLength" | "maxPathSegments" | "maxRepeatedPathSegmentRun">,
): ExecutionUrlEvaluation {
  const raw = value.trim();
  if (!raw) return { safe: false, reason: "invalid_url" };
  if (raw.length > policy.maxUrlLength) return { safe: false, reason: "url_too_long" };
  if (/[\u0000-\u001f\u007f]/.test(raw)) return { safe: false, reason: "control_character" };
  if (raw.includes("\\")) return { safe: false, reason: "backslash_not_allowed" };
  if (/%(?:2f|5c)/i.test(raw)) return { safe: false, reason: "encoded_path_separator_not_allowed" };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { safe: false, reason: "invalid_url" };
  }
  if (url.protocol !== "https:") return { safe: false, reason: "unsupported_scheme" };
  if (url.username || url.password) return { safe: false, reason: "credentials_not_allowed" };
  if (url.origin !== canonicalOrigin) return { safe: false, reason: "cross_origin" };
  if (url.hash) return { safe: false, reason: "fragment_not_allowed" };
  if (url.search) return { safe: false, reason: "query_not_allowed" };
  if (EXCLUDED_PATH.test(url.pathname)) return { safe: false, reason: "excluded_path" };

  const segments = decodedSegments(url.pathname);
  if (!segments) return { safe: false, reason: "invalid_path_encoding" };
  if (segments.length > policy.maxPathSegments) return { safe: false, reason: "path_depth_exceeded" };
  if (maxRepeatedRun(segments) > policy.maxRepeatedPathSegmentRun) return { safe: false, reason: "repeated_path_segment_run_exceeded" };

  const normalizedPath = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
  const normalizedUrl = normalizedPath === "/" ? canonicalOrigin : `${canonicalOrigin}${normalizedPath}`;
  if (normalizedUrl.length > policy.maxUrlLength) return { safe: false, reason: "url_too_long" };
  return { safe: true, normalizedUrl };
}

function batchFingerprint(index: number, urls: string[], inventoryFingerprint: string): string {
  return fingerprint({ index, urls, inventoryFingerprint });
}

function planWithoutFingerprint(plan: Omit<FullSiteCrawlExecutionPlan, "fingerprint">): Omit<FullSiteCrawlExecutionPlan, "fingerprint"> {
  return plan;
}

function checkpointWithoutFingerprint(checkpoint: Omit<FullSiteCrawlCheckpoint, "fingerprint">): Omit<FullSiteCrawlCheckpoint, "fingerprint"> {
  return checkpoint;
}

export function planFullSiteCrawlExecution(
  crawlPlan: CrawlControllerPlan,
  inventory: SitemapInventoryResult,
  policyInput: FullSiteExecutionPolicy,
): FullSiteCrawlExecutionPlan {
  validateLineage(crawlPlan, inventory);
  const policy = validateExecutionPolicy(policyInput, crawlPlan);

  const canonicalUrls = inventory.inventory.entries.map((entry) => entry.canonicalUrl);
  if (new Set(canonicalUrls).size !== canonicalUrls.length) throw new Error("crawl_execution_inventory_duplicate_url");
  const sortedUrls = [...canonicalUrls].sort();
  for (let index = 0; index < sortedUrls.length; index += 1) {
    const evaluation = evaluateFullSiteExecutionUrl(sortedUrls[index]!, crawlPlan.target.canonicalOrigin, policy);
    if (!evaluation.safe) throw new Error(`crawl_execution_inventory_url_rejected:${evaluation.reason}`);
    if (evaluation.normalizedUrl !== sortedUrls[index]) throw new Error("crawl_execution_inventory_url_not_canonical");
  }

  const batches: CrawlExecutionBatch[] = [];
  for (let start = 0, index = 0; start < sortedUrls.length; start += policy.batchSize, index += 1) {
    const urls = sortedUrls.slice(start, start + policy.batchSize);
    const value = batchFingerprint(index, urls, inventory.fingerprint);
    batches.push({
      index,
      batchId: `batch-${String(index + 1).padStart(6, "0")}-${value.slice(0, 16)}`,
      canonicalUrls: urls,
      fingerprint: value,
    });
  }

  const withoutFingerprint: Omit<FullSiteCrawlExecutionPlan, "fingerprint"> = {
    version: "first_party_full_site_crawl_control_v1",
    siteId: crawlPlan.target.siteId,
    canonicalOrigin: crawlPlan.target.canonicalOrigin,
    source: {
      crawlPlanVersion: "first_party_crawl_controller_v1",
      pageHardLimit: crawlPlan.limits.pageHardLimit,
      absolutePageCeiling: crawlPlan.limits.absolutePageCeiling,
      inventoryFingerprint: inventory.fingerprint,
      inventoryUniqueUrls: inventory.inventory.uniqueUrls,
    },
    policy,
    requestControls: {
      method: "GET",
      sameOriginOnly: true,
      robotsRequired: true,
      minimumRequestStartIntervalMs: Math.ceil(60_000 / policy.requestsPerMinute),
      redirectRevalidationRequired: true,
      queryPolicy: "reject_all",
      responseBodyPersistence: false,
    },
    batches,
    authorization: authorizationBoundary(),
  };
  return { ...withoutFingerprint, fingerprint: fingerprint(planWithoutFingerprint(withoutFingerprint)) };
}

function assertPlanIntegrity(plan: FullSiteCrawlExecutionPlan): void {
  if (plan.version !== "first_party_full_site_crawl_control_v1") throw new Error("crawl_execution_plan_version_invalid");
  if (!allFalse(plan.authorization as unknown as Record<string, boolean>)) throw new Error("crawl_execution_authorization_must_be_closed");
  if (plan.requestControls.method !== "GET" || !plan.requestControls.sameOriginOnly || !plan.requestControls.redirectRevalidationRequired || plan.requestControls.responseBodyPersistence !== false) throw new Error("crawl_execution_request_controls_invalid");
  const { fingerprint: actual, ...withoutFingerprint } = plan;
  if (actual !== fingerprint(withoutFingerprint)) throw new Error("crawl_execution_plan_fingerprint_mismatch");
  for (let index = 0; index < plan.batches.length; index += 1) {
    const batch = plan.batches[index]!;
    if (batch.index !== index) throw new Error("crawl_execution_batch_index_invalid");
    const expected = batchFingerprint(index, batch.canonicalUrls, plan.source.inventoryFingerprint);
    if (batch.fingerprint !== expected || batch.batchId !== `batch-${String(index + 1).padStart(6, "0")}-${expected.slice(0, 16)}`) throw new Error("crawl_execution_batch_fingerprint_mismatch");
    if (!batch.canonicalUrls.length || batch.canonicalUrls.length > plan.policy.batchSize) throw new Error("crawl_execution_batch_size_integrity_error");
  }
  const urls = plan.batches.flatMap((batch) => batch.canonicalUrls);
  if (urls.length !== plan.source.inventoryUniqueUrls || new Set(urls).size !== urls.length) throw new Error("crawl_execution_plan_inventory_integrity_error");
}

function checkpointProgress(plan: FullSiteCrawlExecutionPlan, checkpoint: Pick<FullSiteCrawlCheckpoint, "completedBatchIds" | "counters">) {
  const finalizedUrls = checkpoint.counters.fetchedSuccessful + checkpoint.counters.redirects + checkpoint.counters.robotsExcluded + checkpoint.counters.terminalFailures;
  return {
    totalUrls: plan.source.inventoryUniqueUrls,
    finalizedUrls,
    pendingUrls: Math.max(0, plan.source.inventoryUniqueUrls - finalizedUrls),
    completedBatches: checkpoint.completedBatchIds.length,
    totalBatches: plan.batches.length,
    wholeSiteCertified: false as const,
  };
}

function buildCheckpoint(
  plan: FullSiteCrawlExecutionPlan,
  values: Omit<FullSiteCrawlCheckpoint, "version" | "siteId" | "canonicalOrigin" | "planFingerprint" | "inventoryFingerprint" | "authorization" | "progress" | "fingerprint">,
): FullSiteCrawlCheckpoint {
  const partial = {
    version: "first_party_full_site_crawl_checkpoint_v1" as const,
    planFingerprint: plan.fingerprint,
    inventoryFingerprint: plan.source.inventoryFingerprint,
    siteId: plan.siteId,
    canonicalOrigin: plan.canonicalOrigin,
    ...values,
    progress: {
      totalUrls: 0,
      finalizedUrls: 0,
      pendingUrls: 0,
      completedBatches: 0,
      totalBatches: 0,
      wholeSiteCertified: false as const,
    },
    authorization: authorizationBoundary(),
  };
  partial.progress = checkpointProgress(plan, partial);
  const withoutFingerprint: Omit<FullSiteCrawlCheckpoint, "fingerprint"> = partial;
  return { ...withoutFingerprint, fingerprint: fingerprint(checkpointWithoutFingerprint(withoutFingerprint)) };
}

export function createInitialCrawlCheckpoint(plan: FullSiteCrawlExecutionPlan): FullSiteCrawlCheckpoint {
  assertPlanIntegrity(plan);
  const first = plan.batches[0] ?? null;
  return buildCheckpoint(plan, {
    sequence: 0,
    status: first ? "pending" : "completed",
    activeBatchIndex: first?.index ?? null,
    activeBatchId: first?.batchId ?? null,
    nextAttempt: first ? 1 : null,
    pendingCanonicalUrls: first ? [...first.canonicalUrls] : [],
    completedBatchIds: [],
    counters: {
      attemptsRecorded: 0,
      fetchedSuccessful: 0,
      redirects: 0,
      robotsExcluded: 0,
      noindex: 0,
      terminalFailures: 0,
      retryScheduled: 0,
    },
  });
}

function assertCheckpointIntegrity(plan: FullSiteCrawlExecutionPlan, checkpoint: FullSiteCrawlCheckpoint): void {
  assertPlanIntegrity(plan);
  if (checkpoint.version !== "first_party_full_site_crawl_checkpoint_v1") throw new Error("crawl_checkpoint_version_invalid");
  if (checkpoint.planFingerprint !== plan.fingerprint || checkpoint.inventoryFingerprint !== plan.source.inventoryFingerprint || checkpoint.siteId !== plan.siteId || checkpoint.canonicalOrigin !== plan.canonicalOrigin) throw new Error("crawl_checkpoint_lineage_mismatch");
  if (!allFalse(checkpoint.authorization as unknown as Record<string, boolean>)) throw new Error("crawl_checkpoint_authorization_must_be_closed");
  const { fingerprint: actual, ...withoutFingerprint } = checkpoint;
  if (actual !== fingerprint(withoutFingerprint)) throw new Error("crawl_checkpoint_fingerprint_mismatch");
  const expectedProgress = checkpointProgress(plan, checkpoint);
  if (stableSerialize(checkpoint.progress) !== stableSerialize(expectedProgress)) throw new Error("crawl_checkpoint_progress_mismatch");

  if (checkpoint.status === "completed") {
    if (checkpoint.activeBatchIndex !== null || checkpoint.activeBatchId !== null || checkpoint.nextAttempt !== null || checkpoint.pendingCanonicalUrls.length) throw new Error("crawl_checkpoint_completed_state_invalid");
    if (checkpoint.completedBatchIds.length !== plan.batches.length) throw new Error("crawl_checkpoint_completed_batches_invalid");
    return;
  }

  if (checkpoint.activeBatchIndex === null || checkpoint.activeBatchId === null || checkpoint.nextAttempt === null) throw new Error("crawl_checkpoint_pending_state_invalid");
  const active = plan.batches[checkpoint.activeBatchIndex];
  if (!active || active.batchId !== checkpoint.activeBatchId) throw new Error("crawl_checkpoint_active_batch_invalid");
  if (checkpoint.completedBatchIds.length !== checkpoint.activeBatchIndex) throw new Error("crawl_checkpoint_completed_order_invalid");
  for (let index = 0; index < checkpoint.completedBatchIds.length; index += 1) {
    if (checkpoint.completedBatchIds[index] !== plan.batches[index]?.batchId) throw new Error("crawl_checkpoint_completed_order_invalid");
  }
  if (!Number.isInteger(checkpoint.nextAttempt) || checkpoint.nextAttempt < 1 || checkpoint.nextAttempt > plan.policy.maxAttemptsPerUrl) throw new Error("crawl_checkpoint_attempt_invalid");
  if (!checkpoint.pendingCanonicalUrls.length || new Set(checkpoint.pendingCanonicalUrls).size !== checkpoint.pendingCanonicalUrls.length) throw new Error("crawl_checkpoint_pending_urls_invalid");
  const allowed = new Set(active.canonicalUrls);
  if (checkpoint.pendingCanonicalUrls.some((url) => !allowed.has(url))) throw new Error("crawl_checkpoint_pending_url_foreign");
}

function retryDelayMs(attempt: number, policy: FullSiteExecutionPolicy): number {
  const multiplier = 2 ** Math.max(0, attempt - 1);
  return Math.min(policy.retryMaxDelayMs, policy.retryBaseDelayMs * multiplier);
}

export function classifyCrawlRetry(
  signal: CrawlRetrySignal,
  currentAttempt: number,
  policy: Pick<FullSiteExecutionPolicy, "maxAttemptsPerUrl" | "retryBaseDelayMs" | "retryMaxDelayMs">,
): CrawlRetryDecision {
  if (!Number.isInteger(currentAttempt) || currentAttempt < 1 || currentAttempt > policy.maxAttemptsPerUrl) throw new Error("crawl_retry_attempt_invalid");
  if (signal.kind === "http_status" && (!Number.isInteger(signal.httpStatus) || signal.httpStatus < 100 || signal.httpStatus > 599)) throw new Error("crawl_retry_http_status_invalid");

  const transientTransport = signal.kind === "network_timeout" || signal.kind === "connection_reset" || signal.kind === "transport_unavailable";
  const transientHttp = signal.kind === "http_status" && RETRYABLE_HTTP_STATUSES.has(signal.httpStatus);
  const couldRetry = transientTransport || transientHttp;
  if (!couldRetry) {
    return {
      retryable: false,
      reason: signal.kind === "policy_rejection" ? "policy_rejection" : "permanent_http",
      nextAttempt: null,
      delayMs: null,
    };
  }
  if (currentAttempt >= policy.maxAttemptsPerUrl) {
    return { retryable: false, reason: "attempts_exhausted", nextAttempt: null, delayMs: null };
  }
  return {
    retryable: true,
    reason: transientTransport ? "transient_transport" : "transient_http",
    nextAttempt: currentAttempt + 1,
    delayMs: retryDelayMs(currentAttempt, policy as FullSiteExecutionPolicy),
  };
}

function validateOutcomeSet(checkpoint: FullSiteCrawlCheckpoint, attempt: SuppliedCrawlBatchAttempt): Map<string, SuppliedCrawlUrlOutcome> {
  if (attempt.expectedCheckpointFingerprint !== checkpoint.fingerprint) throw new Error("crawl_checkpoint_stale_fingerprint");
  if (checkpoint.status !== "pending") throw new Error("crawl_checkpoint_already_completed");
  if (attempt.batchId !== checkpoint.activeBatchId) throw new Error("crawl_checkpoint_batch_out_of_order");
  if (attempt.attempt !== checkpoint.nextAttempt) throw new Error("crawl_checkpoint_attempt_out_of_order");
  if (attempt.outcomes.length !== checkpoint.pendingCanonicalUrls.length) throw new Error("crawl_checkpoint_outcome_count_mismatch");

  const expected = new Set(checkpoint.pendingCanonicalUrls);
  const byUrl = new Map<string, SuppliedCrawlUrlOutcome>();
  for (const outcome of attempt.outcomes) {
    const url = outcome.canonicalUrl.trim();
    if (!expected.has(url)) throw new Error("crawl_checkpoint_outcome_foreign_url");
    if (byUrl.has(url)) throw new Error("crawl_checkpoint_outcome_duplicate_url");
    byUrl.set(url, outcome);
  }
  for (const url of checkpoint.pendingCanonicalUrls) if (!byUrl.has(url)) throw new Error("crawl_checkpoint_outcome_missing_url");
  return byUrl;
}

export function advanceCrawlCheckpoint(
  plan: FullSiteCrawlExecutionPlan,
  checkpoint: FullSiteCrawlCheckpoint,
  attemptInput: SuppliedCrawlBatchAttempt,
): FullSiteCrawlCheckpoint {
  assertCheckpointIntegrity(plan, checkpoint);
  const outcomes = validateOutcomeSet(checkpoint, attemptInput);
  const currentAttempt = checkpoint.nextAttempt!;
  const counters: CrawlCheckpointCounters = { ...checkpoint.counters };
  const retryUrls: string[] = [];

  for (const canonicalUrl of [...checkpoint.pendingCanonicalUrls].sort()) {
    const outcome = outcomes.get(canonicalUrl)!;
    const urlEvaluation = evaluateFullSiteExecutionUrl(canonicalUrl, plan.canonicalOrigin, plan.policy);
    if (!urlEvaluation.safe || urlEvaluation.normalizedUrl !== canonicalUrl) throw new Error("crawl_checkpoint_outcome_url_not_canonical");
    counters.attemptsRecorded += 1;

    if (outcome.kind === "success") {
      counters.fetchedSuccessful += 1;
      continue;
    }
    if (outcome.kind === "noindex") {
      counters.fetchedSuccessful += 1;
      counters.noindex += 1;
      continue;
    }
    if (outcome.kind === "robots_excluded") {
      counters.robotsExcluded += 1;
      continue;
    }
    if (outcome.kind === "redirect") {
      if (!Number.isInteger(outcome.redirectCount) || outcome.redirectCount < 1 || outcome.redirectCount > plan.policy.maxRedirectsPerRequest) throw new Error("crawl_redirect_count_invalid");
      const redirect = evaluateFullSiteExecutionUrl(outcome.redirectTarget, plan.canonicalOrigin, plan.policy);
      if (!redirect.safe) throw new Error(`crawl_redirect_target_rejected:${redirect.reason}`);
      counters.redirects += 1;
      continue;
    }

    const retry = classifyCrawlRetry(outcome.signal, currentAttempt, plan.policy);
    if (retry.retryable) {
      retryUrls.push(canonicalUrl);
      counters.retryScheduled += 1;
    } else {
      counters.terminalFailures += 1;
    }
  }

  if (retryUrls.length) {
    return buildCheckpoint(plan, {
      sequence: checkpoint.sequence + 1,
      status: "pending",
      activeBatchIndex: checkpoint.activeBatchIndex,
      activeBatchId: checkpoint.activeBatchId,
      nextAttempt: currentAttempt + 1,
      pendingCanonicalUrls: retryUrls.sort(),
      completedBatchIds: [...checkpoint.completedBatchIds],
      counters,
    });
  }

  const completedBatchIds = [...checkpoint.completedBatchIds, checkpoint.activeBatchId!];
  const nextBatchIndex = checkpoint.activeBatchIndex! + 1;
  const next = plan.batches[nextBatchIndex] ?? null;
  return buildCheckpoint(plan, {
    sequence: checkpoint.sequence + 1,
    status: next ? "pending" : "completed",
    activeBatchIndex: next?.index ?? null,
    activeBatchId: next?.batchId ?? null,
    nextAttempt: next ? 1 : null,
    pendingCanonicalUrls: next ? [...next.canonicalUrls] : [],
    completedBatchIds,
    counters,
  });
}

export function describeCrawlResumeWork(plan: FullSiteCrawlExecutionPlan, checkpoint: FullSiteCrawlCheckpoint): CrawlResumeWork {
  assertCheckpointIntegrity(plan, checkpoint);
  return {
    status: checkpoint.status,
    batchId: checkpoint.activeBatchId,
    attempt: checkpoint.nextAttempt,
    canonicalUrls: [...checkpoint.pendingCanonicalUrls],
    method: "GET",
    concurrency: plan.policy.concurrency,
    requestsPerMinute: plan.policy.requestsPerMinute,
    minimumRequestStartIntervalMs: plan.requestControls.minimumRequestStartIntervalMs,
    requestTimeoutMs: plan.policy.requestTimeoutMs,
    maxRedirectsPerRequest: plan.policy.maxRedirectsPerRequest,
    executionEnabled: false,
  };
}
