import { createHash } from "node:crypto";
import { planFirstPartyCrawl, type CrawlControllerPlan } from "./crawl-controller.js";
import {
  buildSitemapInventory,
  type SitemapInventoryPolicy,
  type SitemapInventoryResult,
  type SuppliedSitemapDocument,
} from "./sitemap-inventory.js";
import {
  advanceCrawlCheckpoint,
  assertFullSiteCrawlCheckpointIntegrity,
  assertFullSiteCrawlExecutionPlanIntegrity,
  classifyCrawlRetry,
  createInitialCrawlCheckpoint,
  describeCrawlResumeWork,
  evaluateFullSiteExecutionUrl,
  planFullSiteCrawlExecution,
  type CrawlRetrySignal,
  type FullSiteCrawlCheckpoint,
  type FullSiteCrawlExecutionPlan,
  type FullSiteExecutionPolicy,
  type SuppliedCrawlUrlOutcome,
} from "./full-site-crawl-control.js";
import {
  assertFullSiteCrawlCertificationIntegrity,
  buildFullSiteCrawlCertification,
  type FullSiteCrawlCertification,
} from "./full-site-crawl-certification.js";
import {
  assertCrawlHistoryComparisonIntegrity,
  compareFullSiteCrawlHistory,
  type CrawlHistoryComparison,
  type CrawlHistorySource,
} from "./crawl-history-comparison.js";
import {
  assertIncrementalRecrawlPlanIntegrity,
  type IncrementalRecrawlPlan,
} from "./incremental-recrawl-planner.js";

export const P12_2_CRAWL_BRIDGE_VERSION = "p12-2-first-party-crawl-bridge-v1" as const;
export const DIAMOND_SHELF_CANONICAL_ORIGIN = "https://diamondshelf.us" as const;
export const P12_2_ROBOTS_USER_AGENT = "SEO_ENGINE_P12_2_CERTIFIER" as const;

export type FirstPartyCrawlBridgeBinding = {
  siteId: string;
  canonicalOrigin: string;
  rootSitemapUrl: string;
};

export type SitemapAcquisitionRequest = {
  version: typeof P12_2_CRAWL_BRIDGE_VERSION;
  siteId: string;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  rootSitemapUrl: string;
  maxDocuments: number;
  maxDocumentBytes: number;
  maxDepth: number;
  maxUrlLength: number;
  sameOriginOnly: true;
  httpsOnly: true;
  queryAllowed: false;
  fragmentAllowed: false;
};

export interface FirstPartySitemapAcquirer {
  load(request: SitemapAcquisitionRequest): Promise<SuppliedSitemapDocument[]>;
}

export type RobotsEvaluationRequest = {
  version: typeof P12_2_CRAWL_BRIDGE_VERSION;
  siteId: string;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  canonicalUrl: string;
  userAgent: typeof P12_2_ROBOTS_USER_AGENT;
  method: "GET";
};

export interface FirstPartyRobotsEvaluator {
  evaluate(request: RobotsEvaluationRequest): Promise<{ allowed: boolean }>;
}

export type PageTransportRequest = {
  version: typeof P12_2_CRAWL_BRIDGE_VERSION;
  siteId: string;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  canonicalUrl: string;
  method: "GET";
  timeoutMs: number;
  maxRedirects: number;
  followRedirects: false;
  responseBodyPersistence: false;
};

export type PageTransportResult =
  | { kind: "success"; noindex?: boolean }
  | { kind: "redirect"; redirectTarget: string; redirectCount: number }
  | { kind: "failure"; signal: CrawlRetrySignal };

export interface FirstPartyPageTransport {
  get(request: PageTransportRequest): Promise<PageTransportResult>;
}

export interface FirstPartyCrawlClock {
  sleep(milliseconds: number): Promise<void>;
}

export type CrawlCheckpointPersistenceRecord = {
  version: typeof P12_2_CRAWL_BRIDGE_VERSION;
  runId: string;
  observedAt: string;
  siteId: string;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  executionPlanFingerprint: string;
  checkpoint: FullSiteCrawlCheckpoint;
  rawResponseBodyPersisted: false;
  rawSitemapXmlPersisted: false;
};

export type FullSiteCrawlBridgeSnapshot = {
  version: typeof P12_2_CRAWL_BRIDGE_VERSION;
  runId: string;
  observedAt: string;
  siteId: string;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  rootSitemapUrl: string;
  crawlPlan: CrawlControllerPlan;
  inventory: SitemapInventoryResult;
  executionPlan: FullSiteCrawlExecutionPlan;
  checkpoint: FullSiteCrawlCheckpoint;
  certification: FullSiteCrawlCertification;
  comparisonToPrevious: CrawlHistoryComparison | null;
  persistence: {
    rawResponseBodyPersisted: false;
    rawSitemapXmlPersisted: false;
    pageContentPersisted: false;
  };
  fingerprint: string;
};

export type IncrementalCrawlUrlReceipt = {
  canonicalUrl: string;
  attempts: number;
  outcome: SuppliedCrawlUrlOutcome;
};

export type IncrementalCrawlBridgeReceipt = {
  version: typeof P12_2_CRAWL_BRIDGE_VERSION;
  runId: string;
  observedAt: string;
  siteId: string;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  incrementalPlanFingerprint: string;
  executionPlanFingerprint: string;
  selectedUrls: number;
  urlReceipts: IncrementalCrawlUrlReceipt[];
  summary: {
    fetchedSuccessful: number;
    noindex: number;
    redirects: number;
    robotsExcluded: number;
    failures: number;
  };
  persistence: {
    rawResponseBodyPersisted: false;
    pageContentPersisted: false;
  };
  fingerprint: string;
};

export interface FirstPartyCrawlPersistence {
  loadCheckpoint(input: {
    version: typeof P12_2_CRAWL_BRIDGE_VERSION;
    runId: string;
    siteId: string;
    canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
    executionPlanFingerprint: string;
  }): Promise<FullSiteCrawlCheckpoint | null>;
  saveCheckpoint(record: CrawlCheckpointPersistenceRecord): Promise<void>;
  loadLatestCompleted(input: {
    version: typeof P12_2_CRAWL_BRIDGE_VERSION;
    siteId: string;
    canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  }): Promise<FullSiteCrawlBridgeSnapshot | null>;
  saveCompletedRun(snapshot: FullSiteCrawlBridgeSnapshot): Promise<void>;
  saveIncrementalRun(receipt: IncrementalCrawlBridgeReceipt): Promise<void>;
}

export type FirstPartyCrawlBridgeOptions = {
  sitemapAcquirer?: FirstPartySitemapAcquirer | null;
  robotsEvaluator?: FirstPartyRobotsEvaluator | null;
  pageTransport?: FirstPartyPageTransport | null;
  clock?: FirstPartyCrawlClock | null;
  persistence?: FirstPartyCrawlPersistence | null;
  networkReady?: boolean;
  liveExecutionAuthorized?: boolean;
  persistenceReady?: boolean;
  persistenceAuthorized?: boolean;
};

export type FirstPartyCrawlBridgeReadiness = {
  version: typeof P12_2_CRAWL_BRIDGE_VERSION;
  target: "diamond_shelf_first_party";
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  configured: boolean;
  networkReady: boolean;
  liveExecutionAuthorized: boolean;
  persistenceReady: boolean;
  persistenceAuthorized: boolean;
  firstPartyReadOnly: true;
  injectedTransportOnly: true;
  injectedPersistenceOnly: true;
  directNetworkClientBundled: false;
  directDatabaseClientBundled: false;
  responseBodyPersistence: false;
  rawSitemapXmlPersistence: false;
  schedulerEnabled: false;
  autonomousWorkerEnabled: false;
  providerWrites: false;
  publicSiteWrites: false;
  deploymentAuthorized: false;
  publicationAuthorized: false;
};

export type FullSiteCrawlBridgeRunInput = {
  runId: string;
  observedAt: string;
  binding: FirstPartyCrawlBridgeBinding;
  hardPageLimit: number;
  absolutePageCeiling: number;
  sitemapPolicy: SitemapInventoryPolicy;
  executionPolicy: FullSiteExecutionPolicy;
  resumeCheckpoint?: FullSiteCrawlCheckpoint | null;
  compareToPrevious?: boolean;
};

export type IncrementalCrawlBridgeRunInput = {
  runId: string;
  observedAt: string;
  plan: IncrementalRecrawlPlan;
  currentExecutionPlan: FullSiteCrawlExecutionPlan;
};

const HEX_64 = /^[0-9a-f]{64}$/;

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

function requireRunId(value: string): string {
  const normalized = value.normalize("NFKC").trim();
  if (!normalized || normalized.length > 128 || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error("crawl_bridge_run_id_invalid");
  }
  return normalized;
}

function requireObservedAt(value: string): string {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error("crawl_bridge_observed_at_invalid");
  }
  return value;
}

function normalizeBinding(binding: FirstPartyCrawlBridgeBinding): {
  siteId: string;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  rootSitemapUrl: string;
} {
  const siteId = binding.siteId.normalize("NFKC").trim();
  if (!siteId || siteId.length > 256 || /[\u0000-\u001f\u007f]/.test(siteId)) {
    throw new Error("crawl_bridge_site_id_invalid");
  }
  if (binding.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN) {
    throw new Error("crawl_bridge_diamond_shelf_origin_required");
  }

  let sitemap: URL;
  try {
    sitemap = new URL(binding.rootSitemapUrl);
  } catch {
    throw new Error("crawl_bridge_root_sitemap_invalid");
  }
  if (
    sitemap.protocol !== "https:" ||
    sitemap.origin !== DIAMOND_SHELF_CANONICAL_ORIGIN ||
    sitemap.username ||
    sitemap.password ||
    sitemap.search ||
    sitemap.hash
  ) {
    throw new Error("crawl_bridge_root_sitemap_invalid");
  }
  const rootSitemapUrl = sitemap.toString();
  return { siteId, canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN, rootSitemapUrl };
}

function adapterConfigured(options: FirstPartyCrawlBridgeOptions): boolean {
  return Boolean(
    options.sitemapAcquirer?.load &&
    options.robotsEvaluator?.evaluate &&
    options.pageTransport?.get &&
    options.clock?.sleep &&
    options.persistence?.loadCheckpoint &&
    options.persistence?.saveCheckpoint &&
    options.persistence?.loadLatestCompleted &&
    options.persistence?.saveCompletedRun &&
    options.persistence?.saveIncrementalRun
  );
}

export function firstPartyCrawlBridgeReadiness(
  options: FirstPartyCrawlBridgeOptions = {},
): FirstPartyCrawlBridgeReadiness {
  const configured = adapterConfigured(options);
  return Object.freeze({
    version: P12_2_CRAWL_BRIDGE_VERSION,
    target: "diamond_shelf_first_party",
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    configured,
    networkReady: configured && options.networkReady === true,
    liveExecutionAuthorized: configured && options.liveExecutionAuthorized === true,
    persistenceReady: configured && options.persistenceReady === true,
    persistenceAuthorized: configured && options.persistenceAuthorized === true,
    firstPartyReadOnly: true,
    injectedTransportOnly: true,
    injectedPersistenceOnly: true,
    directNetworkClientBundled: false,
    directDatabaseClientBundled: false,
    responseBodyPersistence: false,
    rawSitemapXmlPersistence: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    deploymentAuthorized: false,
    publicationAuthorized: false,
  });
}

function assertExecutable(options: FirstPartyCrawlBridgeOptions): asserts options is FirstPartyCrawlBridgeOptions & {
  sitemapAcquirer: FirstPartySitemapAcquirer;
  robotsEvaluator: FirstPartyRobotsEvaluator;
  pageTransport: FirstPartyPageTransport;
  clock: FirstPartyCrawlClock;
  persistence: FirstPartyCrawlPersistence;
} {
  const readiness = firstPartyCrawlBridgeReadiness(options);
  if (!readiness.configured) throw new Error("crawl_bridge_unconfigured");
  if (!readiness.networkReady) throw new Error("crawl_bridge_network_not_ready");
  if (!readiness.liveExecutionAuthorized) throw new Error("crawl_bridge_execution_not_authorized");
  if (!readiness.persistenceReady) throw new Error("crawl_bridge_persistence_not_ready");
  if (!readiness.persistenceAuthorized) throw new Error("crawl_bridge_persistence_not_authorized");
}

function retryDelayForAttempt(
  completedAttempt: number,
  policy: Pick<FullSiteExecutionPolicy, "retryBaseDelayMs" | "retryMaxDelayMs">,
): number {
  return Math.min(policy.retryMaxDelayMs, policy.retryBaseDelayMs * (2 ** Math.max(0, completedAttempt - 1)));
}

function assertSnapshotIntegrity(snapshot: FullSiteCrawlBridgeSnapshot): void {
  if (snapshot.version !== P12_2_CRAWL_BRIDGE_VERSION) throw new Error("crawl_bridge_snapshot_version_invalid");
  requireRunId(snapshot.runId);
  requireObservedAt(snapshot.observedAt);
  if (!snapshot.siteId.trim() || snapshot.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN) {
    throw new Error("crawl_bridge_snapshot_identity_invalid");
  }
  assertFullSiteCrawlExecutionPlanIntegrity(snapshot.executionPlan);
  assertFullSiteCrawlCheckpointIntegrity(snapshot.executionPlan, snapshot.checkpoint);
  assertFullSiteCrawlCertificationIntegrity(snapshot.certification);
  const rebuilt = buildFullSiteCrawlCertification({
    crawlPlan: snapshot.crawlPlan,
    inventory: snapshot.inventory,
    executionPlan: snapshot.executionPlan,
    checkpoint: snapshot.checkpoint,
  });
  if (rebuilt.fingerprint !== snapshot.certification.fingerprint) {
    throw new Error("crawl_bridge_snapshot_certification_lineage_mismatch");
  }
  if (
    snapshot.crawlPlan.target.siteId !== snapshot.siteId ||
    snapshot.inventory.siteId !== snapshot.siteId ||
    snapshot.executionPlan.siteId !== snapshot.siteId ||
    snapshot.certification.siteId !== snapshot.siteId ||
    snapshot.crawlPlan.target.canonicalOrigin !== snapshot.canonicalOrigin ||
    snapshot.inventory.canonicalOrigin !== snapshot.canonicalOrigin ||
    snapshot.executionPlan.canonicalOrigin !== snapshot.canonicalOrigin ||
    snapshot.certification.canonicalOrigin !== snapshot.canonicalOrigin
  ) {
    throw new Error("crawl_bridge_snapshot_identity_lineage_mismatch");
  }
  if (
    snapshot.persistence.rawResponseBodyPersisted !== false ||
    snapshot.persistence.rawSitemapXmlPersisted !== false ||
    snapshot.persistence.pageContentPersisted !== false
  ) {
    throw new Error("crawl_bridge_snapshot_raw_content_persistence_forbidden");
  }
  if (snapshot.comparisonToPrevious) {
    assertCrawlHistoryComparisonIntegrity(snapshot.comparisonToPrevious);
    if (
      snapshot.comparisonToPrevious.siteId !== snapshot.siteId ||
      snapshot.comparisonToPrevious.canonicalOrigin !== snapshot.canonicalOrigin
    ) throw new Error("crawl_bridge_snapshot_comparison_identity_mismatch");
  }
  if (!HEX_64.test(snapshot.fingerprint)) throw new Error("crawl_bridge_snapshot_fingerprint_invalid");
  const { fingerprint: actual, ...withoutFingerprint } = snapshot;
  if (actual !== fingerprint(withoutFingerprint)) throw new Error("crawl_bridge_snapshot_fingerprint_mismatch");
}

function pageTransportRequest(
  siteId: string,
  plan: FullSiteCrawlExecutionPlan,
  canonicalUrl: string,
): PageTransportRequest {
  const evaluation = evaluateFullSiteExecutionUrl(canonicalUrl, plan.canonicalOrigin, plan.policy);
  if (!evaluation.safe || evaluation.normalizedUrl !== canonicalUrl) {
    throw new Error("crawl_bridge_page_url_rejected");
  }
  return {
    version: P12_2_CRAWL_BRIDGE_VERSION,
    siteId,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    canonicalUrl,
    method: "GET",
    timeoutMs: plan.policy.requestTimeoutMs,
    maxRedirects: plan.policy.maxRedirectsPerRequest,
    followRedirects: false,
    responseBodyPersistence: false,
  };
}

function normalizeTransportResult(
  canonicalUrl: string,
  plan: FullSiteCrawlExecutionPlan,
  result: PageTransportResult,
): SuppliedCrawlUrlOutcome {
  if (result.kind === "success") {
    return result.noindex === true
      ? { canonicalUrl, kind: "noindex" }
      : { canonicalUrl, kind: "success" };
  }
  if (result.kind === "redirect") {
    if (
      !Number.isInteger(result.redirectCount) ||
      result.redirectCount < 1 ||
      result.redirectCount > plan.policy.maxRedirectsPerRequest
    ) throw new Error("crawl_bridge_redirect_count_invalid");
    const redirect = evaluateFullSiteExecutionUrl(result.redirectTarget, plan.canonicalOrigin, plan.policy);
    if (!redirect.safe) throw new Error(`crawl_bridge_redirect_target_rejected:${redirect.reason}`);
    if (redirect.normalizedUrl !== result.redirectTarget) throw new Error("crawl_bridge_redirect_target_not_canonical");
    return {
      canonicalUrl,
      kind: "redirect",
      redirectTarget: result.redirectTarget,
      redirectCount: result.redirectCount,
    };
  }
  return { canonicalUrl, kind: "failure", signal: result.signal };
}

async function executeCanonicalUrl(input: {
  siteId: string;
  plan: FullSiteCrawlExecutionPlan;
  canonicalUrl: string;
  options: Required<Pick<FirstPartyCrawlBridgeOptions, "robotsEvaluator" | "pageTransport" | "clock">>;
  requestState: { pageRequestsStarted: number };
}): Promise<SuppliedCrawlUrlOutcome> {
  let robotsAllowed: boolean;
  try {
    const robots = await input.options.robotsEvaluator.evaluate({
      version: P12_2_CRAWL_BRIDGE_VERSION,
      siteId: input.siteId,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
      canonicalUrl: input.canonicalUrl,
      userAgent: P12_2_ROBOTS_USER_AGENT,
      method: "GET",
    });
    if (!robots || typeof robots.allowed !== "boolean") throw new Error("crawl_bridge_robots_result_invalid");
    robotsAllowed = robots.allowed;
  } catch (error) {
    if (error instanceof Error && error.message === "crawl_bridge_robots_result_invalid") throw error;
    return { canonicalUrl: input.canonicalUrl, kind: "failure", signal: { kind: "policy_rejection" } };
  }
  if (!robotsAllowed) return { canonicalUrl: input.canonicalUrl, kind: "robots_excluded" };

  if (input.requestState.pageRequestsStarted > 0) {
    await input.options.clock.sleep(input.plan.requestControls.minimumRequestStartIntervalMs);
  }
  input.requestState.pageRequestsStarted += 1;

  let result: PageTransportResult;
  try {
    result = await input.options.pageTransport.get(pageTransportRequest(input.siteId, input.plan, input.canonicalUrl));
  } catch {
    result = { kind: "failure", signal: { kind: "transport_unavailable" } };
  }
  return normalizeTransportResult(input.canonicalUrl, input.plan, result);
}

async function checkpointOutcomes(input: {
  siteId: string;
  plan: FullSiteCrawlExecutionPlan;
  checkpoint: FullSiteCrawlCheckpoint;
  options: Required<Pick<FirstPartyCrawlBridgeOptions, "robotsEvaluator" | "pageTransport" | "clock">>;
  requestState: { pageRequestsStarted: number };
}): Promise<SuppliedCrawlUrlOutcome[]> {
  assertFullSiteCrawlCheckpointIntegrity(input.plan, input.checkpoint);
  const resume = describeCrawlResumeWork(input.plan, input.checkpoint);
  if (resume.status === "completed") return [];
  if (resume.executionEnabled !== false) throw new Error("crawl_bridge_upstream_execution_boundary_changed");

  if ((resume.attempt ?? 1) > 1) {
    await input.options.clock.sleep(retryDelayForAttempt((resume.attempt ?? 1) - 1, input.plan.policy));
  }

  const outcomes: SuppliedCrawlUrlOutcome[] = [];
  for (const canonicalUrl of resume.canonicalUrls) {
    outcomes.push(await executeCanonicalUrl({
      siteId: input.siteId,
      plan: input.plan,
      canonicalUrl,
      options: input.options,
      requestState: input.requestState,
    }));
  }
  return outcomes;
}

function checkpointRecord(input: {
  runId: string;
  observedAt: string;
  siteId: string;
  plan: FullSiteCrawlExecutionPlan;
  checkpoint: FullSiteCrawlCheckpoint;
}): CrawlCheckpointPersistenceRecord {
  return {
    version: P12_2_CRAWL_BRIDGE_VERSION,
    runId: input.runId,
    observedAt: input.observedAt,
    siteId: input.siteId,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: input.plan.fingerprint,
    checkpoint: input.checkpoint,
    rawResponseBodyPersisted: false,
    rawSitemapXmlPersisted: false,
  };
}

function historySource(snapshot: FullSiteCrawlBridgeSnapshot): CrawlHistorySource {
  return { inventory: snapshot.inventory, certification: snapshot.certification };
}

export async function runFullSiteCrawlBridge(
  input: FullSiteCrawlBridgeRunInput,
  options: FirstPartyCrawlBridgeOptions = {},
): Promise<FullSiteCrawlBridgeSnapshot> {
  const runId = requireRunId(input.runId);
  const observedAt = requireObservedAt(input.observedAt);
  const binding = normalizeBinding(input.binding);
  assertExecutable(options);

  const crawlPlan = planFirstPartyCrawl(
    {
      mode: "full_site",
      target: {
        targetClass: "first_party",
        siteId: binding.siteId,
        canonicalOrigin: binding.canonicalOrigin,
      },
      hardPageLimit: input.hardPageLimit,
    },
    { absolutePageCeiling: input.absolutePageCeiling },
  );

  const documents = await options.sitemapAcquirer.load({
    version: P12_2_CRAWL_BRIDGE_VERSION,
    siteId: binding.siteId,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    rootSitemapUrl: binding.rootSitemapUrl,
    maxDocuments: input.sitemapPolicy.maxDocuments,
    maxDocumentBytes: input.sitemapPolicy.maxDocumentBytes,
    maxDepth: input.sitemapPolicy.maxDepth,
    maxUrlLength: input.executionPolicy.maxUrlLength,
    sameOriginOnly: true,
    httpsOnly: true,
    queryAllowed: false,
    fragmentAllowed: false,
  });
  if (!Array.isArray(documents)) throw new Error("crawl_bridge_sitemap_documents_invalid");

  const inventory = buildSitemapInventory({
    plan: crawlPlan,
    rootSitemapUrl: binding.rootSitemapUrl,
    documents,
    policy: input.sitemapPolicy,
  });
  const executionPlan = planFullSiteCrawlExecution(crawlPlan, inventory, input.executionPolicy);
  assertFullSiteCrawlExecutionPlanIntegrity(executionPlan);

  const storedCheckpoint = input.resumeCheckpoint ?? await options.persistence.loadCheckpoint({
    version: P12_2_CRAWL_BRIDGE_VERSION,
    runId,
    siteId: binding.siteId,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: executionPlan.fingerprint,
  });
  let checkpoint = storedCheckpoint ?? createInitialCrawlCheckpoint(executionPlan);
  assertFullSiteCrawlCheckpointIntegrity(executionPlan, checkpoint);

  await options.persistence.saveCheckpoint(checkpointRecord({
    runId,
    observedAt,
    siteId: binding.siteId,
    plan: executionPlan,
    checkpoint,
  }));

  const requestState = { pageRequestsStarted: 0 };
  while (checkpoint.status !== "completed") {
    const outcomes = await checkpointOutcomes({
      siteId: binding.siteId,
      plan: executionPlan,
      checkpoint,
      options: {
        robotsEvaluator: options.robotsEvaluator,
        pageTransport: options.pageTransport,
        clock: options.clock,
      },
      requestState,
    });
    checkpoint = advanceCrawlCheckpoint(executionPlan, checkpoint, {
      expectedCheckpointFingerprint: checkpoint.fingerprint,
      batchId: checkpoint.activeBatchId!,
      attempt: checkpoint.nextAttempt!,
      outcomes,
    });
    await options.persistence.saveCheckpoint(checkpointRecord({
      runId,
      observedAt,
      siteId: binding.siteId,
      plan: executionPlan,
      checkpoint,
    }));
  }

  const certification = buildFullSiteCrawlCertification({
    crawlPlan,
    inventory,
    executionPlan,
    checkpoint,
  });
  assertFullSiteCrawlCertificationIntegrity(certification);

  let comparisonToPrevious: CrawlHistoryComparison | null = null;
  if (input.compareToPrevious !== false) {
    const previous = await options.persistence.loadLatestCompleted({
      version: P12_2_CRAWL_BRIDGE_VERSION,
      siteId: binding.siteId,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    });
    if (previous) {
      assertSnapshotIntegrity(previous);
      if (!previous.certification.certification.wholeSiteCertified) {
        throw new Error("crawl_bridge_previous_snapshot_not_certified");
      }
      comparisonToPrevious = compareFullSiteCrawlHistory({
        before: historySource(previous),
        after: { inventory, certification },
      });
      assertCrawlHistoryComparisonIntegrity(comparisonToPrevious);
    }
  }

  const withoutFingerprint: Omit<FullSiteCrawlBridgeSnapshot, "fingerprint"> = {
    version: P12_2_CRAWL_BRIDGE_VERSION,
    runId,
    observedAt,
    siteId: binding.siteId,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    rootSitemapUrl: binding.rootSitemapUrl,
    crawlPlan,
    inventory,
    executionPlan,
    checkpoint,
    certification,
    comparisonToPrevious,
    persistence: {
      rawResponseBodyPersisted: false,
      rawSitemapXmlPersisted: false,
      pageContentPersisted: false,
    },
  };
  const snapshot: FullSiteCrawlBridgeSnapshot = {
    ...withoutFingerprint,
    fingerprint: fingerprint(withoutFingerprint),
  };
  assertSnapshotIntegrity(snapshot);
  await options.persistence.saveCompletedRun(snapshot);
  return snapshot;
}

function assertIncrementalLineage(input: IncrementalCrawlBridgeRunInput): void {
  assertIncrementalRecrawlPlanIntegrity(input.plan);
  assertFullSiteCrawlExecutionPlanIntegrity(input.currentExecutionPlan);
  if (
    input.plan.siteId !== input.currentExecutionPlan.siteId ||
    input.plan.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN ||
    input.currentExecutionPlan.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN
  ) throw new Error("crawl_bridge_incremental_identity_mismatch");
  if (input.plan.source.afterExecutionPlanFingerprint !== input.currentExecutionPlan.fingerprint) {
    throw new Error("crawl_bridge_incremental_execution_lineage_mismatch");
  }
  if (
    input.plan.limits.pageHardLimit !== input.currentExecutionPlan.source.pageHardLimit ||
    input.plan.limits.absolutePageCeiling !== input.currentExecutionPlan.source.absolutePageCeiling
  ) throw new Error("crawl_bridge_incremental_limit_lineage_mismatch");
}

async function executeIncrementalUrl(input: {
  siteId: string;
  plan: FullSiteCrawlExecutionPlan;
  canonicalUrl: string;
  options: Required<Pick<FirstPartyCrawlBridgeOptions, "robotsEvaluator" | "pageTransport" | "clock">>;
  requestState: { pageRequestsStarted: number };
}): Promise<IncrementalCrawlUrlReceipt> {
  let attempt = 1;
  while (true) {
    const outcome = await executeCanonicalUrl({
      siteId: input.siteId,
      plan: input.plan,
      canonicalUrl: input.canonicalUrl,
      options: input.options,
      requestState: input.requestState,
    });
    if (outcome.kind !== "failure") return { canonicalUrl: input.canonicalUrl, attempts: attempt, outcome };

    const retry = classifyCrawlRetry(outcome.signal, attempt, input.plan.policy);
    if (!retry.retryable) return { canonicalUrl: input.canonicalUrl, attempts: attempt, outcome };
    await input.options.clock.sleep(retry.delayMs!);
    attempt = retry.nextAttempt!;
  }
}

function incrementalSummary(receipts: IncrementalCrawlUrlReceipt[]): IncrementalCrawlBridgeReceipt["summary"] {
  const summary = { fetchedSuccessful: 0, noindex: 0, redirects: 0, robotsExcluded: 0, failures: 0 };
  for (const receipt of receipts) {
    if (receipt.outcome.kind === "success") summary.fetchedSuccessful += 1;
    else if (receipt.outcome.kind === "noindex") {
      summary.fetchedSuccessful += 1;
      summary.noindex += 1;
    } else if (receipt.outcome.kind === "redirect") summary.redirects += 1;
    else if (receipt.outcome.kind === "robots_excluded") summary.robotsExcluded += 1;
    else summary.failures += 1;
  }
  return summary;
}

function assertIncrementalReceiptIntegrity(receipt: IncrementalCrawlBridgeReceipt): void {
  if (receipt.version !== P12_2_CRAWL_BRIDGE_VERSION) throw new Error("crawl_bridge_incremental_receipt_version_invalid");
  requireRunId(receipt.runId);
  requireObservedAt(receipt.observedAt);
  if (!receipt.siteId.trim() || receipt.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN) {
    throw new Error("crawl_bridge_incremental_receipt_identity_invalid");
  }
  if (!HEX_64.test(receipt.incrementalPlanFingerprint) || !HEX_64.test(receipt.executionPlanFingerprint)) {
    throw new Error("crawl_bridge_incremental_receipt_lineage_invalid");
  }
  if (receipt.selectedUrls !== receipt.urlReceipts.length) {
    throw new Error("crawl_bridge_incremental_receipt_count_mismatch");
  }
  if (new Set(receipt.urlReceipts.map((item) => item.canonicalUrl)).size !== receipt.urlReceipts.length) {
    throw new Error("crawl_bridge_incremental_receipt_duplicate_url");
  }
  for (const item of receipt.urlReceipts) {
    if (!Number.isInteger(item.attempts) || item.attempts < 1) {
      throw new Error("crawl_bridge_incremental_receipt_attempt_invalid");
    }
    if (item.outcome.canonicalUrl !== item.canonicalUrl) {
      throw new Error("crawl_bridge_incremental_receipt_outcome_identity_mismatch");
    }
  }
  if (stableSerialize(receipt.summary) !== stableSerialize(incrementalSummary(receipt.urlReceipts))) {
    throw new Error("crawl_bridge_incremental_receipt_summary_mismatch");
  }
  if (
    receipt.persistence.rawResponseBodyPersisted !== false ||
    receipt.persistence.pageContentPersisted !== false
  ) throw new Error("crawl_bridge_incremental_raw_content_persistence_forbidden");
  if (!HEX_64.test(receipt.fingerprint)) throw new Error("crawl_bridge_incremental_receipt_fingerprint_invalid");
  const { fingerprint: actual, ...withoutFingerprint } = receipt;
  if (actual !== fingerprint(withoutFingerprint)) throw new Error("crawl_bridge_incremental_receipt_fingerprint_mismatch");
}

export async function runIncrementalCrawlBridge(
  input: IncrementalCrawlBridgeRunInput,
  options: FirstPartyCrawlBridgeOptions = {},
): Promise<IncrementalCrawlBridgeReceipt> {
  const runId = requireRunId(input.runId);
  const observedAt = requireObservedAt(input.observedAt);
  assertExecutable(options);
  assertIncrementalLineage(input);

  const selectedUrls = input.plan.batches.flatMap((batch) => batch.urls);
  if (selectedUrls.length !== input.plan.accounting.selectedUrls) {
    throw new Error("crawl_bridge_incremental_selected_count_mismatch");
  }
  if (new Set(selectedUrls).size !== selectedUrls.length) {
    throw new Error("crawl_bridge_incremental_duplicate_url");
  }

  const requestState = { pageRequestsStarted: 0 };
  const urlReceipts: IncrementalCrawlUrlReceipt[] = [];
  for (const canonicalUrl of selectedUrls) {
    const evaluation = evaluateFullSiteExecutionUrl(
      canonicalUrl,
      input.currentExecutionPlan.canonicalOrigin,
      input.currentExecutionPlan.policy,
    );
    if (!evaluation.safe || evaluation.normalizedUrl !== canonicalUrl) {
      throw new Error("crawl_bridge_incremental_url_rejected");
    }
    urlReceipts.push(await executeIncrementalUrl({
      siteId: input.plan.siteId,
      plan: input.currentExecutionPlan,
      canonicalUrl,
      options: {
        robotsEvaluator: options.robotsEvaluator,
        pageTransport: options.pageTransport,
        clock: options.clock,
      },
      requestState,
    }));
  }

  const withoutFingerprint: Omit<IncrementalCrawlBridgeReceipt, "fingerprint"> = {
    version: P12_2_CRAWL_BRIDGE_VERSION,
    runId,
    observedAt,
    siteId: input.plan.siteId,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    incrementalPlanFingerprint: input.plan.fingerprint,
    executionPlanFingerprint: input.currentExecutionPlan.fingerprint,
    selectedUrls: selectedUrls.length,
    urlReceipts,
    summary: incrementalSummary(urlReceipts),
    persistence: {
      rawResponseBodyPersisted: false,
      pageContentPersisted: false,
    },
  };
  const receipt = { ...withoutFingerprint, fingerprint: fingerprint(withoutFingerprint) };
  assertIncrementalReceiptIntegrity(receipt);
  await options.persistence.saveIncrementalRun(receipt);
  return receipt;
}
