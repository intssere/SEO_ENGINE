import { createHash } from "node:crypto";
import { planFirstPartyCrawl, type CrawlControllerPlan } from "./crawl-controller.js";
import {
  buildSitemapInventory,
  type SitemapInventoryPolicy,
  type SitemapInventoryResult,
  type SuppliedSitemapDocument,
} from "./sitemap-inventory.js";
import {
  advanceCompletedCheckpointWithTerminalRecovery,
  advanceCrawlCheckpoint,
  assertFullSiteCrawlCheckpointIntegrity,
  assertFullSiteCrawlExecutionPlanIntegrity,
  classifyCrawlRetry,
  createInitialCrawlCheckpoint,
  describeCrawlResumeWork,
  evaluateFullSiteExecutionUrl,
  planBoundedPilotCrawlExecution,
  planFullSiteCrawlExecution,
  planFullSiteCrawlExecutionForResume,
  type CrawlRetrySignal,
  type FullSiteCrawlCheckpoint,
  type FullSiteCrawlExecutionPlan,
  type FullSiteExecutionPolicy,
  type SuppliedCrawlUrlOutcome,
  type TerminalFailureRecoveryOutcome,
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
import {
  assertTerminalFailureEventIntegrity,
  buildTerminalFailureRecoveryPlan,
  buildTerminalFailureRecoveryReceipt,
  createTerminalFailureEvent,
  type TerminalFailureEvent,
  type TerminalFailureRecoveryPlan,
  type TerminalFailureRecoveryReceipt,
  type TerminalFailureRecoveryUrlReceipt,
} from "./first-party-crawl-terminal-recovery.js";

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

export const ROBOTS_POLICY_REJECTION_REASONS = Object.freeze([
  "http_unavailable",
  "redirect_limit",
  "response_oversize",
  "malformed_policy",
  "scope_validation",
  "secure_transport_rejection",
  "transport_error",
  "unclassified",
] as const);
export type RobotsPolicyRejectionReason = (typeof ROBOTS_POLICY_REJECTION_REASONS)[number];

export const OTHER_POLICY_REJECTION_REASONS = Object.freeze([
  "response_oversize",
  "redirect_validation",
  "scope_validation",
  "secure_transport_rejection",
  "request_validation",
  "unclassified",
] as const);
export type OtherPolicyRejectionReason = (typeof OTHER_POLICY_REJECTION_REASONS)[number];

export class RobotsPolicyEvaluationError extends Error {
  constructor(
    readonly reason: RobotsPolicyRejectionReason,
    code: string,
  ) {
    super(code);
    this.name = "RobotsPolicyEvaluationError";
  }
}

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
  | {
      kind: "failure";
      signal: CrawlRetrySignal;
      policyRejectionReason?: OtherPolicyRejectionReason;
    };

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
  terminalFailureEvents: TerminalFailureEvent[];
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

export type FullSiteCrawlAccountingReceipt = {
  version: typeof P12_2_CRAWL_BRIDGE_VERSION;
  status: "accounting_complete_uncertified";
  runId: string;
  observedAt: string;
  siteId: string;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  executionPlanFingerprint: string;
  checkpointRevision: number;
  checkpointFingerprint: string;
  accountingSnapshotFingerprint: string;
  terminalFailures: number;
  blockers: string[];
  persistence: {
    checkpointPersisted: true;
    accountingSnapshotPersisted: true;
    completedRunPersisted: false;
    terminalFailureEvidencePersisted: true;
    rawResponseBodyPersisted: false;
    rawSitemapXmlPersisted: false;
    pageContentPersisted: false;
  };
  fingerprint: string;
};

export type FullSiteCrawlAccountingAwareResult =
  | FullSiteCrawlBridgeSnapshot
  | FullSiteCrawlAccountingReceipt;

export type TerminalFailureRecoveryPersistenceTransition = {
  version: typeof P12_2_CRAWL_BRIDGE_VERSION;
  sourceCheckpointFingerprint: string;
  checkpointRecord: CrawlCheckpointPersistenceRecord;
  accountingSnapshot: FullSiteCrawlBridgeSnapshot;
  recoveryReceipt: TerminalFailureRecoveryReceipt;
  completedRunPersisted: boolean;
};

export type TerminalFailureRecoveryBridgeResult = {
  recoveryPlan: TerminalFailureRecoveryPlan;
  recoveryReceipt: TerminalFailureRecoveryReceipt;
  accountingSnapshot: FullSiteCrawlBridgeSnapshot;
  completedRunPersisted: boolean;
};

export type BoundedPilotFailureAttribution = {
  terminalFailures: number;
  policyRejections: number;
  robotsPolicyRejections: {
    total: number;
    reasons: Array<{ reason: RobotsPolicyRejectionReason; count: number }>;
  };
  otherPolicyRejections: number;
  otherPolicyRejectionReasons: Array<{ reason: OtherPolicyRejectionReason; count: number }>;
  permanentHttp: Array<{ httpStatus: number; count: number }>;
  attemptsExhausted: {
    networkTimeout: number;
    connectionReset: number;
    transportUnavailable: number;
    http: Array<{ httpStatus: number; count: number }>;
  };
};

export type BoundedPilotCrawlBridgeReceipt = {
  version: typeof P12_2_CRAWL_BRIDGE_VERSION;
  status: "bounded_pilot_completed";
  runId: string;
  observedAt: string;
  siteId: string;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  inventoryFingerprint: string;
  executionPlanFingerprint: string;
  checkpointFingerprint: string;
  selectedUrls: number;
  inventoryTruncated: true;
  truncationReasons: string[];
  summary: {
    fetchedSuccessful: number;
    noindex: number;
    redirects: number;
    robotsExcluded: number;
    failures: number;
  };
  failureAttribution: BoundedPilotFailureAttribution;
  wholeSiteCertified: false;
  persistence: {
    checkpointPersisted: true;
    completedRunPersisted: false;
    rawResponseBodyPersisted: false;
    rawSitemapXmlPersisted: false;
    pageContentPersisted: false;
  };
  fingerprint: string;
};

export type FullSiteCrawlInterruptionReceipt = {
  version: typeof P12_2_CRAWL_BRIDGE_VERSION;
  status: "intentional_interruption";
  runId: string;
  observedAt: string;
  siteId: string;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  executionPlanFingerprint: string;
  checkpointRevision: number;
  checkpointFingerprint: string;
  persistence: {
    checkpointPersisted: true;
    completedRunPersisted: false;
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
  loadLatestAccounting(input: {
    version: typeof P12_2_CRAWL_BRIDGE_VERSION;
    runId: string;
    siteId: string;
    canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
    executionPlanFingerprint: string;
  }): Promise<FullSiteCrawlBridgeSnapshot | null>;
  loadUnresolvedTerminalFailures(input: {
    version: typeof P12_2_CRAWL_BRIDGE_VERSION;
    runId: string;
    siteId: string;
    canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
    executionPlanFingerprint: string;
  }): Promise<TerminalFailureEvent[]>;
  saveAccountingRun(snapshot: FullSiteCrawlBridgeSnapshot): Promise<void>;
  saveCompletedRun(snapshot: FullSiteCrawlBridgeSnapshot): Promise<void>;
  saveRecoveryReceipt(receipt: TerminalFailureRecoveryReceipt): Promise<void>;
  saveRecoveryTransition(transition: TerminalFailureRecoveryPersistenceTransition): Promise<void>;
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

export type TerminalFailureRecoveryBridgeRunInput = {
  runId: string;
  observedAt: string;
  siteId: string;
  canonicalOrigin: typeof DIAMOND_SHELF_CANONICAL_ORIGIN;
  executionPlanFingerprint: string;
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
    options.sitemapAcquirer &&
    options.robotsEvaluator &&
    options.pageTransport &&
    options.clock &&
    options.persistence
  );
}

type ExecutableCrawlAdapters = {
  robotsEvaluator: FirstPartyRobotsEvaluator;
  pageTransport: FirstPartyPageTransport;
  clock: FirstPartyCrawlClock;
};

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

function assertRecoveryExecutable(options: FirstPartyCrawlBridgeOptions): asserts options is FirstPartyCrawlBridgeOptions & {
  robotsEvaluator: FirstPartyRobotsEvaluator;
  pageTransport: FirstPartyPageTransport;
  clock: FirstPartyCrawlClock;
  persistence: FirstPartyCrawlPersistence;
} {
  if (
    !options.robotsEvaluator ||
    !options.pageTransport ||
    !options.clock ||
    !options.persistence
  ) throw new Error("crawl_recovery_bridge_unconfigured");
  if (options.networkReady !== true) throw new Error("crawl_recovery_bridge_network_not_ready");
  if (options.liveExecutionAuthorized !== true) throw new Error("crawl_recovery_bridge_execution_not_authorized");
  if (options.persistenceReady !== true) throw new Error("crawl_recovery_bridge_persistence_not_ready");
  if (options.persistenceAuthorized !== true) throw new Error("crawl_recovery_bridge_persistence_not_authorized");
}

function retryDelayForAttempt(
  completedAttempt: number,
  policy: Pick<FullSiteExecutionPolicy, "retryBaseDelayMs" | "retryMaxDelayMs">,
): number {
  return Math.min(policy.retryMaxDelayMs, policy.retryBaseDelayMs * (2 ** Math.max(0, completedAttempt - 1)));
}

export function assertFullSiteCrawlBridgeSnapshotIntegrity(snapshot: FullSiteCrawlBridgeSnapshot): void {
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
): AttributedCrawlUrlOutcome {
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
  return {
    canonicalUrl,
    kind: "failure",
    signal: result.signal,
    ...(result.policyRejectionReason
      ? { otherPolicyRejectionReason: result.policyRejectionReason }
      : {}),
  };
}

type AttributedCrawlUrlOutcome = SuppliedCrawlUrlOutcome & {
  robotsPolicyRejectionReason?: RobotsPolicyRejectionReason;
  otherPolicyRejectionReason?: OtherPolicyRejectionReason;
};

async function executeCanonicalUrl(input: {
  siteId: string;
  plan: FullSiteCrawlExecutionPlan;
  canonicalUrl: string;
  options: ExecutableCrawlAdapters;
  requestState: { pageRequestsStarted: number };
}): Promise<AttributedCrawlUrlOutcome> {
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
    const robotsPolicyRejectionReason =
      error instanceof RobotsPolicyEvaluationError ? error.reason : "unclassified";
    return {
      canonicalUrl: input.canonicalUrl,
      kind: "failure",
      signal: { kind: "policy_rejection" },
      robotsPolicyRejectionReason,
    };
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
  options: ExecutableCrawlAdapters;
  requestState: { pageRequestsStarted: number };
}): Promise<AttributedCrawlUrlOutcome[]> {
  assertFullSiteCrawlCheckpointIntegrity(input.plan, input.checkpoint);
  const resume = describeCrawlResumeWork(input.plan, input.checkpoint);
  if (resume.status === "completed") return [];
  if (resume.executionEnabled !== false) throw new Error("crawl_bridge_upstream_execution_boundary_changed");

  if ((resume.attempt ?? 1) > 1) {
    await input.options.clock.sleep(retryDelayForAttempt((resume.attempt ?? 1) - 1, input.plan.policy));
  }

  const outcomes: AttributedCrawlUrlOutcome[] = [];
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
  terminalFailureEvents?: TerminalFailureEvent[];
}): CrawlCheckpointPersistenceRecord {
  return {
    version: P12_2_CRAWL_BRIDGE_VERSION,
    runId: input.runId,
    observedAt: input.observedAt,
    siteId: input.siteId,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: input.plan.fingerprint,
    checkpoint: input.checkpoint,
    terminalFailureEvents: input.terminalFailureEvents ?? [],
    rawResponseBodyPersisted: false,
    rawSitemapXmlPersisted: false,
  };
}

function terminalFailureEventsForAttempt(input: {
  runId: string;
  observedAt: string;
  siteId: string;
  plan: FullSiteCrawlExecutionPlan;
  sourceCheckpoint: FullSiteCrawlCheckpoint;
  resultCheckpoint: FullSiteCrawlCheckpoint;
  outcomes: AttributedCrawlUrlOutcome[];
}): TerminalFailureEvent[] {
  if (
    input.sourceCheckpoint.status !== "pending" ||
    input.sourceCheckpoint.activeBatchId === null ||
    input.sourceCheckpoint.nextAttempt === null
  ) throw new Error("crawl_bridge_terminal_failure_source_checkpoint_invalid");

  const events: TerminalFailureEvent[] = [];
  for (const outcome of input.outcomes) {
    if (outcome.kind !== "failure") continue;
    const decision = classifyCrawlRetry(
      outcome.signal,
      input.sourceCheckpoint.nextAttempt,
      input.plan.policy,
    );
    if (decision.retryable) continue;
    if (!["permanent_http", "policy_rejection", "attempts_exhausted"].includes(decision.reason)) {
      throw new Error("crawl_bridge_terminal_failure_reason_invalid");
    }
    events.push(createTerminalFailureEvent({
      eventType: "terminal_failure",
      runId: input.runId,
      observedAt: input.observedAt,
      siteId: input.siteId,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
      executionPlanFingerprint: input.plan.fingerprint,
      canonicalUrl: outcome.canonicalUrl,
      checkpointRevision: input.resultCheckpoint.sequence,
      checkpointFingerprint: input.resultCheckpoint.fingerprint,
      batchId: input.sourceCheckpoint.activeBatchId,
      attempt: input.sourceCheckpoint.nextAttempt,
      sourceEventFingerprint: null,
      outcome,
      decisionReason: decision.reason,
      ...(outcome.robotsPolicyRejectionReason
        ? { robotsPolicyRejectionReason: outcome.robotsPolicyRejectionReason }
        : {}),
      ...(outcome.otherPolicyRejectionReason
        ? { otherPolicyRejectionReason: outcome.otherPolicyRejectionReason }
        : {}),
    }));
  }
  return events;
}

type MutableBoundedPilotFailureAttribution = {
  policyRejections: number;
  robotsPolicyRejections: Map<RobotsPolicyRejectionReason, number>;
  otherPolicyRejections: number;
  otherPolicyRejectionReasons: Map<OtherPolicyRejectionReason, number>;
  permanentHttp: Map<number, number>;
  attemptsExhausted: {
    networkTimeout: number;
    connectionReset: number;
    transportUnavailable: number;
    http: Map<number, number>;
  };
};

function createBoundedPilotFailureAttribution(): MutableBoundedPilotFailureAttribution {
  return {
    policyRejections: 0,
    robotsPolicyRejections: new Map(),
    otherPolicyRejections: 0,
    otherPolicyRejectionReasons: new Map(),
    permanentHttp: new Map(),
    attemptsExhausted: {
      networkTimeout: 0,
      connectionReset: 0,
      transportUnavailable: 0,
      http: new Map(),
    },
  };
}

function incrementStatusCount(target: Map<number, number>, status: number): void {
  target.set(status, (target.get(status) ?? 0) + 1);
}

function observeBoundedPilotTerminalFailures(input: {
  outcomes: AttributedCrawlUrlOutcome[];
  attempt: number;
  policy: FullSiteExecutionPolicy;
  attribution: MutableBoundedPilotFailureAttribution;
}): void {
  for (const outcome of input.outcomes) {
    if (outcome.kind !== "failure") continue;
    const decision = classifyCrawlRetry(outcome.signal, input.attempt, input.policy);
    if (decision.retryable) continue;

    if (decision.reason === "policy_rejection") {
      input.attribution.policyRejections += 1;
      if (outcome.robotsPolicyRejectionReason) {
        input.attribution.robotsPolicyRejections.set(
          outcome.robotsPolicyRejectionReason,
          (input.attribution.robotsPolicyRejections.get(outcome.robotsPolicyRejectionReason) ?? 0) + 1,
        );
      } else {
        input.attribution.otherPolicyRejections += 1;
        const reason = outcome.otherPolicyRejectionReason ?? "unclassified";
        input.attribution.otherPolicyRejectionReasons.set(
          reason,
          (input.attribution.otherPolicyRejectionReasons.get(reason) ?? 0) + 1,
        );
      }
      continue;
    }
    if (decision.reason === "permanent_http") {
      if (outcome.signal.kind !== "http_status") {
        throw new Error("crawl_bridge_failure_attribution_permanent_http_signal_invalid");
      }
      incrementStatusCount(input.attribution.permanentHttp, outcome.signal.httpStatus);
      continue;
    }
    if (decision.reason !== "attempts_exhausted") {
      throw new Error("crawl_bridge_failure_attribution_reason_invalid");
    }
    if (outcome.signal.kind === "http_status") {
      incrementStatusCount(input.attribution.attemptsExhausted.http, outcome.signal.httpStatus);
    } else if (outcome.signal.kind === "network_timeout") {
      input.attribution.attemptsExhausted.networkTimeout += 1;
    } else if (outcome.signal.kind === "connection_reset") {
      input.attribution.attemptsExhausted.connectionReset += 1;
    } else if (outcome.signal.kind === "transport_unavailable") {
      input.attribution.attemptsExhausted.transportUnavailable += 1;
    } else {
      throw new Error("crawl_bridge_failure_attribution_exhausted_signal_invalid");
    }
  }
}

function finalizeBoundedPilotFailureAttribution(
  input: MutableBoundedPilotFailureAttribution,
  expectedTerminalFailures: number,
): BoundedPilotFailureAttribution {
  const robotsPolicyReasons = [...input.robotsPolicyRejections.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([reason, count]) => ({ reason, count }));
  const robotsPolicyTotal = robotsPolicyReasons.reduce((sum, item) => sum + item.count, 0);
  const otherPolicyReasons = [...input.otherPolicyRejectionReasons.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([reason, count]) => ({ reason, count }));
  const otherPolicyTotal = otherPolicyReasons.reduce((sum, item) => sum + item.count, 0);
  if (
    otherPolicyTotal !== input.otherPolicyRejections ||
    robotsPolicyTotal + input.otherPolicyRejections !== input.policyRejections
  ) {
    throw new Error("crawl_bridge_failure_attribution_policy_counter_mismatch");
  }
  const permanentHttp = [...input.permanentHttp.entries()]
    .sort(([a], [b]) => a - b)
    .map(([httpStatus, count]) => ({ httpStatus, count }));
  const exhaustedHttp = [...input.attemptsExhausted.http.entries()]
    .sort(([a], [b]) => a - b)
    .map(([httpStatus, count]) => ({ httpStatus, count }));
  const attributed =
    input.policyRejections +
    permanentHttp.reduce((sum, item) => sum + item.count, 0) +
    input.attemptsExhausted.networkTimeout +
    input.attemptsExhausted.connectionReset +
    input.attemptsExhausted.transportUnavailable +
    exhaustedHttp.reduce((sum, item) => sum + item.count, 0);
  if (attributed !== expectedTerminalFailures) {
    throw new Error("crawl_bridge_failure_attribution_counter_mismatch");
  }
  return {
    terminalFailures: expectedTerminalFailures,
    policyRejections: input.policyRejections,
    robotsPolicyRejections: {
      total: robotsPolicyTotal,
      reasons: robotsPolicyReasons,
    },
    otherPolicyRejections: input.otherPolicyRejections,
    otherPolicyRejectionReasons: otherPolicyReasons,
    permanentHttp,
    attemptsExhausted: {
      networkTimeout: input.attemptsExhausted.networkTimeout,
      connectionReset: input.attemptsExhausted.connectionReset,
      transportUnavailable: input.attemptsExhausted.transportUnavailable,
      http: exhaustedHttp,
    },
  };
}

function historySource(snapshot: FullSiteCrawlBridgeSnapshot): CrawlHistorySource {
  return { inventory: snapshot.inventory, certification: snapshot.certification };
}

async function runFullSiteCrawlBridgeInternal(
  input: FullSiteCrawlBridgeRunInput,
  options: FirstPartyCrawlBridgeOptions = {},
  control: {
    stopAfterCheckpointRevision?: number | null;
    scope?: "full_site" | "bounded_pilot";
    durableAccounting?: boolean;
  } = {},
): Promise<
  FullSiteCrawlBridgeSnapshot |
  FullSiteCrawlAccountingReceipt |
  FullSiteCrawlInterruptionReceipt |
  BoundedPilotCrawlBridgeReceipt
> {
  const runId = requireRunId(input.runId);
  const observedAt = requireObservedAt(input.observedAt);
  const binding = normalizeBinding(input.binding);
  assertExecutable(options);

  const stopAfterCheckpointRevision = control.stopAfterCheckpointRevision ?? null;
  const scope = control.scope ?? "full_site";
  if (scope === "bounded_pilot" && stopAfterCheckpointRevision !== null) {
    throw new Error("crawl_bridge_bounded_pilot_interruption_not_supported");
  }
  if (
    stopAfterCheckpointRevision !== null &&
    (!Number.isInteger(stopAfterCheckpointRevision) || stopAfterCheckpointRevision < 1)
  ) {
    throw new Error("crawl_bridge_interruption_revision_invalid");
  }

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
  const executionPlan = scope === "bounded_pilot"
    ? planBoundedPilotCrawlExecution(crawlPlan, inventory, input.executionPolicy)
    : input.resumeCheckpoint
      ? planFullSiteCrawlExecutionForResume(
          crawlPlan,
          inventory,
          input.executionPolicy,
          input.resumeCheckpoint.inventoryFingerprint,
        )
      : planFullSiteCrawlExecution(crawlPlan, inventory, input.executionPolicy);
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

  const interruptionReceipt = (): FullSiteCrawlInterruptionReceipt => {
    const withoutFingerprint: Omit<FullSiteCrawlInterruptionReceipt, "fingerprint"> = {
      version: P12_2_CRAWL_BRIDGE_VERSION,
      status: "intentional_interruption",
      runId,
      observedAt,
      siteId: binding.siteId,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
      executionPlanFingerprint: executionPlan.fingerprint,
      checkpointRevision: checkpoint.sequence,
      checkpointFingerprint: checkpoint.fingerprint,
      persistence: {
        checkpointPersisted: true,
        completedRunPersisted: false,
        rawResponseBodyPersisted: false,
        rawSitemapXmlPersisted: false,
        pageContentPersisted: false,
      },
    };
    return {
      ...withoutFingerprint,
      fingerprint: fingerprint(withoutFingerprint),
    };
  };

  if (stopAfterCheckpointRevision !== null) {
    if (checkpoint.sequence === stopAfterCheckpointRevision) return interruptionReceipt();
    if (checkpoint.sequence > stopAfterCheckpointRevision) {
      throw new Error("crawl_bridge_interruption_revision_already_passed");
    }
  }

  const requestState = { pageRequestsStarted: 0 };
  const boundedFailureAttribution = createBoundedPilotFailureAttribution();
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
    if (scope === "bounded_pilot") {
      observeBoundedPilotTerminalFailures({
        outcomes,
        attempt: checkpoint.nextAttempt!,
        policy: executionPlan.policy,
        attribution: boundedFailureAttribution,
      });
    }
    const sourceCheckpoint = checkpoint;
    const resultCheckpoint = advanceCrawlCheckpoint(executionPlan, sourceCheckpoint, {
      expectedCheckpointFingerprint: sourceCheckpoint.fingerprint,
      batchId: sourceCheckpoint.activeBatchId!,
      attempt: sourceCheckpoint.nextAttempt!,
      outcomes,
    });
    const terminalFailureEvents = terminalFailureEventsForAttempt({
      runId,
      observedAt,
      siteId: binding.siteId,
      plan: executionPlan,
      sourceCheckpoint,
      resultCheckpoint,
      outcomes,
    });
    checkpoint = resultCheckpoint;
    await options.persistence.saveCheckpoint(checkpointRecord({
      runId,
      observedAt,
      siteId: binding.siteId,
      plan: executionPlan,
      checkpoint,
      terminalFailureEvents,
    }));
    if (stopAfterCheckpointRevision !== null) {
      if (checkpoint.sequence === stopAfterCheckpointRevision) return interruptionReceipt();
      if (checkpoint.sequence > stopAfterCheckpointRevision) {
        throw new Error("crawl_bridge_interruption_revision_already_passed");
      }
    }
  }

  if (scope === "bounded_pilot") {
    const withoutFingerprint: Omit<BoundedPilotCrawlBridgeReceipt, "fingerprint"> = {
      version: P12_2_CRAWL_BRIDGE_VERSION,
      status: "bounded_pilot_completed",
      runId,
      observedAt,
      siteId: binding.siteId,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
      inventoryFingerprint: inventory.fingerprint,
      executionPlanFingerprint: executionPlan.fingerprint,
      checkpointFingerprint: checkpoint.fingerprint,
      selectedUrls: executionPlan.source.inventoryUniqueUrls,
      inventoryTruncated: true,
      truncationReasons: [...inventory.completeness.reasons],
      summary: {
        fetchedSuccessful: checkpoint.counters.fetchedSuccessful,
        noindex: checkpoint.counters.noindex,
        redirects: checkpoint.counters.redirects,
        robotsExcluded: checkpoint.counters.robotsExcluded,
        failures: checkpoint.counters.terminalFailures,
      },
      failureAttribution: finalizeBoundedPilotFailureAttribution(
        boundedFailureAttribution,
        checkpoint.counters.terminalFailures,
      ),
      wholeSiteCertified: false,
      persistence: {
        checkpointPersisted: true,
        completedRunPersisted: false,
        rawResponseBodyPersisted: false,
        rawSitemapXmlPersisted: false,
        pageContentPersisted: false,
      },
    };
    return {
      ...withoutFingerprint,
      fingerprint: fingerprint(withoutFingerprint),
    };
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
      assertFullSiteCrawlBridgeSnapshotIntegrity(previous);
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
  assertFullSiteCrawlBridgeSnapshotIntegrity(snapshot);

  if (control.durableAccounting === true) {
    await options.persistence.saveAccountingRun(snapshot);
    if (!snapshot.certification.certification.wholeSiteCertified) {
      if (snapshot.checkpoint.counters.terminalFailures < 1) {
        throw new Error("crawl_bridge_accounting_uncertified_without_terminal_failure");
      }
      const withoutAccountingFingerprint: Omit<FullSiteCrawlAccountingReceipt, "fingerprint"> = {
        version: P12_2_CRAWL_BRIDGE_VERSION,
        status: "accounting_complete_uncertified",
        runId,
        observedAt,
        siteId: binding.siteId,
        canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
        executionPlanFingerprint: executionPlan.fingerprint,
        checkpointRevision: checkpoint.sequence,
        checkpointFingerprint: checkpoint.fingerprint,
        accountingSnapshotFingerprint: snapshot.fingerprint,
        terminalFailures: checkpoint.counters.terminalFailures,
        blockers: [...snapshot.certification.certification.blockers],
        persistence: {
          checkpointPersisted: true,
          accountingSnapshotPersisted: true,
          completedRunPersisted: false,
          terminalFailureEvidencePersisted: true,
          rawResponseBodyPersisted: false,
          rawSitemapXmlPersisted: false,
          pageContentPersisted: false,
        },
      };
      return {
        ...withoutAccountingFingerprint,
        fingerprint: fingerprint(withoutAccountingFingerprint),
      };
    }
  }

  await options.persistence.saveCompletedRun(snapshot);
  return snapshot;
}

export async function runFullSiteCrawlBridge(
  input: FullSiteCrawlBridgeRunInput,
  options: FirstPartyCrawlBridgeOptions = {},
): Promise<FullSiteCrawlBridgeSnapshot> {
  const result = await runFullSiteCrawlBridgeInternal(input, options);
  if ("status" in result) {
    if (result.status === "intentional_interruption") {
      throw new Error("crawl_bridge_unexpected_interruption");
    }
  }
  return result as FullSiteCrawlBridgeSnapshot;
}

export async function runFullSiteCrawlBridgeAccountingAware(
  input: FullSiteCrawlBridgeRunInput,
  options: FirstPartyCrawlBridgeOptions = {},
): Promise<FullSiteCrawlAccountingAwareResult> {
  const result = await runFullSiteCrawlBridgeInternal(input, options, { durableAccounting: true });
  if ("status" in result) {
    if (result.status === "intentional_interruption" || result.status === "bounded_pilot_completed") {
      throw new Error("crawl_bridge_accounting_unexpected_non_full_site_result");
    }
    if (result.status === "accounting_complete_uncertified") return result;
  }
  return result as FullSiteCrawlBridgeSnapshot;
}

export async function runBoundedPilotCrawlBridge(
  input: FullSiteCrawlBridgeRunInput,
  options: FirstPartyCrawlBridgeOptions = {},
): Promise<BoundedPilotCrawlBridgeReceipt> {
  const result = await runFullSiteCrawlBridgeInternal(input, options, { scope: "bounded_pilot" });
  if (!("status" in result) || result.status !== "bounded_pilot_completed") {
    throw new Error("crawl_bridge_bounded_pilot_receipt_required");
  }
  return result;
}

export async function runFullSiteCrawlBridgeUntilCheckpoint(
  input: FullSiteCrawlBridgeRunInput,
  stopAfterCheckpointRevision: number,
  options: FirstPartyCrawlBridgeOptions = {},
): Promise<FullSiteCrawlInterruptionReceipt> {
  const result = await runFullSiteCrawlBridgeInternal(input, options, { stopAfterCheckpointRevision });
  if (!("status" in result) || result.status !== "intentional_interruption") {
    throw new Error("crawl_bridge_interruption_revision_unreachable");
  }
  return result;
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
  options: ExecutableCrawlAdapters;
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

type AttributedRecoveryUrlReceipt = {
  canonicalUrl: string;
  attempts: number;
  outcome: AttributedCrawlUrlOutcome;
};

async function executeRecoveryUrl(input: {
  siteId: string;
  plan: FullSiteCrawlExecutionPlan;
  canonicalUrl: string;
  options: ExecutableCrawlAdapters;
  requestState: { pageRequestsStarted: number };
}): Promise<AttributedRecoveryUrlReceipt> {
  let attempt = 1;
  while (true) {
    const outcome = await executeCanonicalUrl({
      siteId: input.siteId,
      plan: input.plan,
      canonicalUrl: input.canonicalUrl,
      options: input.options,
      requestState: input.requestState,
    });
    if (outcome.kind !== "failure") {
      return { canonicalUrl: input.canonicalUrl, attempts: attempt, outcome };
    }
    const retry = classifyCrawlRetry(outcome.signal, attempt, input.plan.policy);
    if (!retry.retryable) {
      return { canonicalUrl: input.canonicalUrl, attempts: attempt, outcome };
    }
    await input.options.clock.sleep(retry.delayMs!);
    attempt = retry.nextAttempt!;
  }
}

export async function runTerminalFailureRecoveryBridge(
  input: TerminalFailureRecoveryBridgeRunInput,
  options: FirstPartyCrawlBridgeOptions = {},
): Promise<TerminalFailureRecoveryBridgeResult> {
  const runId = requireRunId(input.runId);
  const observedAt = requireObservedAt(input.observedAt);
  if (!input.siteId.trim() || input.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN) {
    throw new Error("crawl_recovery_bridge_identity_invalid");
  }
  if (!HEX_64.test(input.executionPlanFingerprint)) {
    throw new Error("crawl_recovery_bridge_execution_fingerprint_invalid");
  }
  assertRecoveryExecutable(options);

  const accountingSnapshot = await options.persistence.loadLatestAccounting({
    version: P12_2_CRAWL_BRIDGE_VERSION,
    runId,
    siteId: input.siteId,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: input.executionPlanFingerprint,
  });
  if (!accountingSnapshot) throw new Error("crawl_recovery_accounting_snapshot_not_found");
  assertFullSiteCrawlBridgeSnapshotIntegrity(accountingSnapshot);
  if (
    accountingSnapshot.runId !== runId ||
    accountingSnapshot.siteId !== input.siteId ||
    accountingSnapshot.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN ||
    accountingSnapshot.executionPlan.fingerprint !== input.executionPlanFingerprint
  ) throw new Error("crawl_recovery_accounting_snapshot_lineage_invalid");
  if (accountingSnapshot.certification.certification.wholeSiteCertified) {
    throw new Error("crawl_recovery_accounting_already_certified");
  }
  if (
    accountingSnapshot.checkpoint.status !== "completed" ||
    accountingSnapshot.checkpoint.counters.terminalFailures < 1
  ) throw new Error("crawl_recovery_accounting_not_recoverable");

  const unresolvedEvents = await options.persistence.loadUnresolvedTerminalFailures({
    version: P12_2_CRAWL_BRIDGE_VERSION,
    runId,
    siteId: input.siteId,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlanFingerprint: input.executionPlanFingerprint,
  });
  const recoveryPlan = buildTerminalFailureRecoveryPlan({
    runId,
    observedAt,
    siteId: input.siteId,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    executionPlan: accountingSnapshot.executionPlan,
    checkpoint: accountingSnapshot.checkpoint,
    unresolvedEvents,
  });

  const eventByUrl = new Map(unresolvedEvents.map((event) => [event.canonicalUrl, event]));
  const requestState = { pageRequestsStarted: 0 };
  const attributedReceipts: AttributedRecoveryUrlReceipt[] = [];
  for (const evidence of recoveryPlan.evidence) {
    attributedReceipts.push(await executeRecoveryUrl({
      siteId: input.siteId,
      plan: accountingSnapshot.executionPlan,
      canonicalUrl: evidence.canonicalUrl,
      options: {
        robotsEvaluator: options.robotsEvaluator,
        pageTransport: options.pageTransport,
        clock: options.clock,
      },
      requestState,
    }));
  }

  const recoveryOutcomes: TerminalFailureRecoveryOutcome[] = attributedReceipts.map((item) => ({
    canonicalUrl: item.canonicalUrl,
    attempts: item.attempts,
    outcome: item.outcome,
  }));
  const resultCheckpoint = advanceCompletedCheckpointWithTerminalRecovery(
    accountingSnapshot.executionPlan,
    accountingSnapshot.checkpoint,
    recoveryOutcomes,
  );

  const transitionEvents = attributedReceipts.map((item) => {
    const source = eventByUrl.get(item.canonicalUrl);
    if (!source) throw new Error("crawl_recovery_source_event_missing");
    if (item.outcome.kind === "failure") {
      const decision = classifyCrawlRetry(
        item.outcome.signal,
        item.attempts,
        accountingSnapshot.executionPlan.policy,
      );
      if (decision.retryable) throw new Error("crawl_recovery_result_not_terminal");
      return createTerminalFailureEvent({
        eventType: "recovery_failure",
        runId,
        observedAt,
        siteId: input.siteId,
        canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
        executionPlanFingerprint: input.executionPlanFingerprint,
        canonicalUrl: item.canonicalUrl,
        checkpointRevision: resultCheckpoint.sequence,
        checkpointFingerprint: resultCheckpoint.fingerprint,
        batchId: source.batchId,
        attempt: item.attempts,
        sourceEventFingerprint: source.fingerprint,
        outcome: item.outcome,
        decisionReason: decision.reason,
        ...(item.outcome.robotsPolicyRejectionReason
          ? { robotsPolicyRejectionReason: item.outcome.robotsPolicyRejectionReason }
          : {}),
        ...(item.outcome.otherPolicyRejectionReason
          ? { otherPolicyRejectionReason: item.outcome.otherPolicyRejectionReason }
          : {}),
      });
    }
    return createTerminalFailureEvent({
      eventType: "recovery_resolved",
      runId,
      observedAt,
      siteId: input.siteId,
      canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
      executionPlanFingerprint: input.executionPlanFingerprint,
      canonicalUrl: item.canonicalUrl,
      checkpointRevision: resultCheckpoint.sequence,
      checkpointFingerprint: resultCheckpoint.fingerprint,
      batchId: source.batchId,
      attempt: item.attempts,
      sourceEventFingerprint: source.fingerprint,
      outcome: item.outcome,
      decisionReason: "resolved",
    });
  });

  const certification = buildFullSiteCrawlCertification({
    crawlPlan: accountingSnapshot.crawlPlan,
    inventory: accountingSnapshot.inventory,
    executionPlan: accountingSnapshot.executionPlan,
    checkpoint: resultCheckpoint,
  });
  assertFullSiteCrawlCertificationIntegrity(certification);

  const withoutSnapshotFingerprint: Omit<FullSiteCrawlBridgeSnapshot, "fingerprint"> = {
    version: P12_2_CRAWL_BRIDGE_VERSION,
    runId,
    observedAt,
    siteId: input.siteId,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    rootSitemapUrl: accountingSnapshot.rootSitemapUrl,
    crawlPlan: accountingSnapshot.crawlPlan,
    inventory: accountingSnapshot.inventory,
    executionPlan: accountingSnapshot.executionPlan,
    checkpoint: resultCheckpoint,
    certification,
    comparisonToPrevious: null,
    persistence: {
      rawResponseBodyPersisted: false,
      rawSitemapXmlPersisted: false,
      pageContentPersisted: false,
    },
  };
  const recoveredAccountingSnapshot: FullSiteCrawlBridgeSnapshot = {
    ...withoutSnapshotFingerprint,
    fingerprint: fingerprint(withoutSnapshotFingerprint),
  };
  assertFullSiteCrawlBridgeSnapshotIntegrity(recoveredAccountingSnapshot);

  const completedRunPersisted = certification.certification.wholeSiteCertified;
  const urlReceipts: TerminalFailureRecoveryUrlReceipt[] = attributedReceipts.map((item) => {
    const source = eventByUrl.get(item.canonicalUrl);
    if (!source) throw new Error("crawl_recovery_source_event_missing");
    return {
      canonicalUrl: item.canonicalUrl,
      sourceEventFingerprint: source.fingerprint,
      attempts: item.attempts,
      outcome: item.outcome,
    };
  });
  const recoveryReceipt = buildTerminalFailureRecoveryReceipt({
    plan: recoveryPlan,
    resultCheckpoint,
    accountingSnapshotFingerprint: recoveredAccountingSnapshot.fingerprint,
    wholeSiteCertified: certification.certification.wholeSiteCertified,
    completedRunPersisted,
    blockers: certification.certification.blockers,
    urlReceipts,
  });

  await options.persistence.saveRecoveryTransition({
    version: P12_2_CRAWL_BRIDGE_VERSION,
    sourceCheckpointFingerprint: accountingSnapshot.checkpoint.fingerprint,
    checkpointRecord: checkpointRecord({
      runId,
      observedAt,
      siteId: input.siteId,
      plan: accountingSnapshot.executionPlan,
      checkpoint: resultCheckpoint,
      terminalFailureEvents: transitionEvents,
    }),
    accountingSnapshot: recoveredAccountingSnapshot,
    recoveryReceipt,
    completedRunPersisted,
  });

  return {
    recoveryPlan,
    recoveryReceipt,
    accountingSnapshot: recoveredAccountingSnapshot,
    completedRunPersisted,
  };
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

export function assertIncrementalCrawlBridgeReceiptIntegrity(receipt: IncrementalCrawlBridgeReceipt): void {
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
  assertIncrementalCrawlBridgeReceiptIntegrity(receipt);
  await options.persistence.saveIncrementalRun(receipt);
  return receipt;
}
