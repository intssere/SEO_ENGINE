import { createHash } from "node:crypto";
import { planFirstPartyCrawl, type CrawlControllerPlan } from "./crawl-controller.js";
import {
  SITEMAP_REJECTION_REASONS,
  type SitemapInventoryResult,
  type SitemapRejectionReason,
} from "./sitemap-inventory.js";
import {
  assertFullSiteCrawlCheckpointIntegrity,
  assertFullSiteCrawlExecutionPlanIntegrity,
  planFullSiteCrawlExecution,
  type FullSiteCrawlCheckpoint,
  type FullSiteCrawlExecutionPlan,
} from "./full-site-crawl-control.js";

export const CRAWL_CERTIFICATION_BLOCKERS = Object.freeze([
  "checkpoint_incomplete",
  "coverage_below_100",
  "empty_eligible_inventory",
  "terminal_failures_present",
  "unfinished_batches_remaining",
  "pending_urls_remaining",
] as const);

export type CrawlCertificationBlocker = typeof CRAWL_CERTIFICATION_BLOCKERS[number];

export type FullSiteCrawlCompletionLedger = {
  discovered: number;
  eligible: number;
  fetchedSuccessful: number;
  redirects: number;
  canonicalizedDeduplicated: number;
  robotsExcluded: number;
  inventoryExcluded: number;
  robotsOrExcluded: number;
  noindex: number;
  failed: number;
  finalized: number;
  pending: number;
  coveragePercent: number;
  hardLimitState: {
    inventoryHardLimitReached: boolean;
    pageHardLimit: number;
    absolutePageCeiling: number;
    eligibleAtPageHardLimit: boolean;
    blockedByHardLimit: boolean;
  };
};

export type CrawlCertificationAuthorization = {
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

export type FullSiteCrawlCertification = {
  version: "first_party_full_site_crawl_certification_v1";
  siteId: string;
  canonicalOrigin: string;
  lineage: {
    crawlPlanVersion: "first_party_crawl_controller_v1";
    pageHardLimit: number;
    absolutePageCeiling: number;
    inventoryFingerprint: string;
    executionPlanFingerprint: string;
    checkpointFingerprint: string;
    checkpointSequence: number;
    inventoryUniqueUrls: number;
    inventoryAcceptedOccurrences: number;
    inventoryDuplicateOccurrences: number;
    inventoryUrlEntryRejections: number;
    totalBatches: number;
    completedBatches: number;
  };
  ledger: FullSiteCrawlCompletionLedger;
  certification: {
    wholeSiteCertified: boolean;
    wholeSiteReason: "certified_complete_accounting" | "blocked";
    blockers: CrawlCertificationBlocker[];
    assertsCompletenessOnly: true;
    assertsSeoHealth: false;
  };
  authorization: CrawlCertificationAuthorization;
  fingerprint: string;
};

export type FullSiteCrawlCertificationInput = {
  crawlPlan: CrawlControllerPlan;
  inventory: SitemapInventoryResult;
  executionPlan: FullSiteCrawlExecutionPlan;
  checkpoint: FullSiteCrawlCheckpoint;
};

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

function allFalse(value: Record<string, boolean>): boolean {
  return Object.values(value).every((flag) => flag === false);
}

function authorizationBoundary(): CrawlCertificationAuthorization {
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

function requireNonNegativeInteger(value: number, code: string): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) throw new Error(code);
  return value;
}

function requirePositiveInteger(value: number, code: string): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) throw new Error(code);
  return value;
}

function requireSha256(value: string, code: string): string {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error(code);
  return value;
}

function requireCanonicalOrigin(value: string): string {
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/" ||
      parsed.origin !== value
    ) throw new Error("crawl_certification_origin_invalid");
    return parsed.origin;
  } catch (error) {
    if (error instanceof Error && error.message === "crawl_certification_origin_invalid") throw error;
    throw new Error("crawl_certification_origin_invalid");
  }
}

function assertCrawlPlanSemanticIntegrity(plan: CrawlControllerPlan): void {
  if (plan.version !== "first_party_crawl_controller_v1" || plan.mode !== "full_site") {
    throw new Error("crawl_certification_full_site_plan_required");
  }
  if (plan.target.targetClass !== "first_party" || !plan.target.siteId.trim()) {
    throw new Error("crawl_certification_first_party_plan_required");
  }
  requireCanonicalOrigin(plan.target.canonicalOrigin);
  requirePositiveInteger(plan.limits.pageHardLimit, "crawl_certification_page_hard_limit_invalid");
  requirePositiveInteger(plan.limits.absolutePageCeiling, "crawl_certification_absolute_page_ceiling_invalid");
  if (plan.limits.pageHardLimit > plan.limits.absolutePageCeiling) {
    throw new Error("crawl_certification_page_hard_limit_exceeds_ceiling");
  }
  if (!allFalse(plan.authorization as unknown as Record<string, boolean>)) {
    throw new Error("crawl_certification_crawl_plan_authorization_must_be_closed");
  }
  const reconstructed = planFirstPartyCrawl(
    {
      mode: "full_site",
      target: {
        targetClass: "first_party",
        siteId: plan.target.siteId,
        canonicalOrigin: plan.target.canonicalOrigin,
      },
      hardPageLimit: plan.limits.pageHardLimit,
    },
    { absolutePageCeiling: plan.limits.absolutePageCeiling },
  );
  if (stableSerialize(reconstructed) !== stableSerialize(plan)) {
    throw new Error("crawl_certification_crawl_plan_semantic_mismatch");
  }
}

function emptyRejectionCounts(): Record<SitemapRejectionReason, number> {
  return Object.fromEntries(SITEMAP_REJECTION_REASONS.map((reason) => [reason, 0])) as Record<SitemapRejectionReason, number>;
}

function assertInventorySemanticIntegrity(inventory: SitemapInventoryResult): void {
  if (inventory.version !== "first_party_sitemap_inventory_v1") {
    throw new Error("crawl_certification_inventory_version_invalid");
  }
  if (!inventory.siteId.trim()) throw new Error("crawl_certification_inventory_site_id_invalid");
  requireCanonicalOrigin(inventory.canonicalOrigin);
  requireSha256(inventory.fingerprint, "crawl_certification_inventory_fingerprint_invalid");
  requirePositiveInteger(inventory.policy.maxDocuments, "crawl_certification_inventory_policy_invalid");
  requireNonNegativeInteger(inventory.policy.maxDepth, "crawl_certification_inventory_policy_invalid");
  requirePositiveInteger(inventory.policy.maxDocumentBytes, "crawl_certification_inventory_policy_invalid");
  requirePositiveInteger(inventory.policy.maxInventoryUrls, "crawl_certification_inventory_policy_invalid");
  requirePositiveInteger(inventory.policy.maxPathSegments, "crawl_certification_inventory_policy_invalid");
  requireNonNegativeInteger(inventory.documents.supplied, "crawl_certification_inventory_document_count_invalid");
  requireNonNegativeInteger(inventory.documents.processed, "crawl_certification_inventory_document_count_invalid");
  requireNonNegativeInteger(inventory.documents.referenced, "crawl_certification_inventory_document_count_invalid");
  if (inventory.documents.processed > inventory.documents.supplied) {
    throw new Error("crawl_certification_inventory_document_count_invalid");
  }
  if (new Set(inventory.documents.missingSupplied).size !== inventory.documents.missingSupplied.length) {
    throw new Error("crawl_certification_inventory_missing_document_duplicate");
  }
  const sortedMissing = [...inventory.documents.missingSupplied].sort();
  if (inventory.documents.missingSupplied.some((value, index) => value !== sortedMissing[index])) {
    throw new Error("crawl_certification_inventory_missing_document_order_invalid");
  }

  requireNonNegativeInteger(inventory.inventory.acceptedOccurrences, "crawl_certification_inventory_occurrence_count_invalid");
  requireNonNegativeInteger(inventory.inventory.duplicateOccurrences, "crawl_certification_inventory_occurrence_count_invalid");
  requireNonNegativeInteger(inventory.inventory.uniqueUrls, "crawl_certification_inventory_unique_count_invalid");
  if (inventory.inventory.uniqueUrls !== inventory.inventory.entries.length) {
    throw new Error("crawl_certification_inventory_unique_count_mismatch");
  }
  if (inventory.inventory.acceptedOccurrences !== inventory.inventory.uniqueUrls + inventory.inventory.duplicateOccurrences) {
    throw new Error("crawl_certification_inventory_dedupe_count_mismatch");
  }
  if (inventory.inventory.uniqueUrls > inventory.policy.maxInventoryUrls) {
    throw new Error("crawl_certification_inventory_policy_exceeded");
  }
  const canonicalUrls = inventory.inventory.entries.map((entry) => entry.canonicalUrl);
  if (new Set(canonicalUrls).size !== canonicalUrls.length) {
    throw new Error("crawl_certification_inventory_duplicate_canonical_url");
  }
  const sortedCanonical = [...canonicalUrls].sort();
  if (canonicalUrls.some((url, index) => url !== sortedCanonical[index])) {
    throw new Error("crawl_certification_inventory_url_order_invalid");
  }
  for (const entry of inventory.inventory.entries) {
    if (!entry.sourceSitemaps.length || new Set(entry.sourceSitemaps).size !== entry.sourceSitemaps.length) {
      throw new Error("crawl_certification_inventory_source_sitemaps_invalid");
    }
    const sortedSources = [...entry.sourceSitemaps].sort();
    if (entry.sourceSitemaps.some((url, index) => url !== sortedSources[index])) {
      throw new Error("crawl_certification_inventory_source_sitemaps_invalid");
    }
  }

  const expectedCounts = emptyRejectionCounts();
  for (const rejection of inventory.rejections) {
    if (rejection.kind !== "url_entry" && rejection.kind !== "sitemap_reference") {
      throw new Error("crawl_certification_inventory_rejection_kind_invalid");
    }
    if (!SITEMAP_REJECTION_REASONS.includes(rejection.reason)) {
      throw new Error("crawl_certification_inventory_rejection_reason_invalid");
    }
    expectedCounts[rejection.reason] += 1;
  }
  for (const reason of SITEMAP_REJECTION_REASONS) {
    requireNonNegativeInteger(inventory.rejectionCounts[reason], "crawl_certification_inventory_rejection_count_invalid");
    if (inventory.rejectionCounts[reason] !== expectedCounts[reason]) {
      throw new Error("crawl_certification_inventory_rejection_count_mismatch");
    }
  }
  const sortedRejections = [...inventory.rejections].sort(
    (a, b) => a.sourceSitemap.localeCompare(b.sourceSitemap) || a.kind.localeCompare(b.kind) || a.reason.localeCompare(b.reason),
  );
  if (stableSerialize(sortedRejections) !== stableSerialize(inventory.rejections)) {
    throw new Error("crawl_certification_inventory_rejection_order_invalid");
  }
  if (new Set(inventory.completeness.reasons).size !== inventory.completeness.reasons.length) {
    throw new Error("crawl_certification_inventory_completeness_reason_duplicate");
  }
  const sortedReasons = [...inventory.completeness.reasons].sort();
  if (inventory.completeness.reasons.some((reason, index) => reason !== sortedReasons[index])) {
    throw new Error("crawl_certification_inventory_completeness_reason_order_invalid");
  }
  if (inventory.completeness.complete && (inventory.completeness.hardLimitReached || inventory.documents.missingSupplied.length || inventory.completeness.reasons.length)) {
    throw new Error("crawl_certification_inventory_completeness_mismatch");
  }
  if (!allFalse(inventory.authorization as unknown as Record<string, boolean>)) {
    throw new Error("crawl_certification_inventory_authorization_must_be_closed");
  }

  const { fingerprint: actual, ...withoutFingerprint } = inventory;
  if (actual !== fingerprint(withoutFingerprint)) {
    throw new Error("crawl_certification_inventory_fingerprint_mismatch");
  }
}

function countUrlEntryRejections(inventory: SitemapInventoryResult): number {
  return inventory.rejections.filter((rejection) => rejection.kind === "url_entry").length;
}

function countInventoryExcluded(inventory: SitemapInventoryResult): number {
  return inventory.rejections.filter(
    (rejection) => rejection.kind === "url_entry" && rejection.reason === "excluded_path",
  ).length;
}

function coveragePercent(finalized: number, eligible: number): number {
  if (eligible === 0) return 100;
  return Math.min(100, Math.max(0, Math.round((finalized / eligible) * 1_000_000) / 10_000));
}

export function summarizeFullSiteCrawlAccounting(
  crawlPlan: CrawlControllerPlan,
  inventory: SitemapInventoryResult,
  executionPlan: FullSiteCrawlExecutionPlan,
  checkpoint: FullSiteCrawlCheckpoint,
): FullSiteCrawlCompletionLedger {
  const urlEntryRejections = countUrlEntryRejections(inventory);
  const inventoryExcluded = countInventoryExcluded(inventory);
  const finalized =
    checkpoint.counters.fetchedSuccessful +
    checkpoint.counters.redirects +
    checkpoint.counters.robotsExcluded +
    checkpoint.counters.terminalFailures;
  const eligible = inventory.inventory.uniqueUrls;
  const pending = eligible - finalized;
  if (pending < 0) throw new Error("crawl_certification_finalized_exceeds_eligible");

  return {
    discovered: inventory.inventory.acceptedOccurrences + urlEntryRejections,
    eligible,
    fetchedSuccessful: checkpoint.counters.fetchedSuccessful,
    redirects: checkpoint.counters.redirects,
    canonicalizedDeduplicated: inventory.inventory.duplicateOccurrences,
    robotsExcluded: checkpoint.counters.robotsExcluded,
    inventoryExcluded,
    robotsOrExcluded: checkpoint.counters.robotsExcluded + inventoryExcluded,
    noindex: checkpoint.counters.noindex,
    failed: checkpoint.counters.terminalFailures,
    finalized,
    pending,
    coveragePercent: coveragePercent(finalized, eligible),
    hardLimitState: {
      inventoryHardLimitReached: inventory.completeness.hardLimitReached,
      pageHardLimit: crawlPlan.limits.pageHardLimit,
      absolutePageCeiling: crawlPlan.limits.absolutePageCeiling,
      eligibleAtPageHardLimit: eligible === crawlPlan.limits.pageHardLimit,
      blockedByHardLimit: inventory.completeness.hardLimitReached || eligible > crawlPlan.limits.pageHardLimit,
    },
  };
}

function certificationBlockers(
  inventory: SitemapInventoryResult,
  executionPlan: FullSiteCrawlExecutionPlan,
  checkpoint: FullSiteCrawlCheckpoint,
  ledger: FullSiteCrawlCompletionLedger,
): CrawlCertificationBlocker[] {
  const blockers = new Set<CrawlCertificationBlocker>();
  if (ledger.eligible === 0) blockers.add("empty_eligible_inventory");
  if (checkpoint.status !== "completed") blockers.add("checkpoint_incomplete");
  if (ledger.pending !== 0 || checkpoint.progress.pendingUrls !== 0) blockers.add("pending_urls_remaining");
  if (checkpoint.completedBatchIds.length !== executionPlan.batches.length) blockers.add("unfinished_batches_remaining");
  if (ledger.coveragePercent !== 100) blockers.add("coverage_below_100");
  if (ledger.failed > 0) blockers.add("terminal_failures_present");
  if (!inventory.completeness.complete || inventory.completeness.hardLimitReached || ledger.hardLimitState.blockedByHardLimit) {
    throw new Error("crawl_certification_inventory_not_certifiable");
  }
  return [...blockers].sort();
}

function assertExactLineage(input: FullSiteCrawlCertificationInput): void {
  const { crawlPlan, inventory, executionPlan, checkpoint } = input;
  assertCrawlPlanSemanticIntegrity(crawlPlan);
  assertInventorySemanticIntegrity(inventory);
  assertFullSiteCrawlExecutionPlanIntegrity(executionPlan);
  assertFullSiteCrawlCheckpointIntegrity(executionPlan, checkpoint);

  if (
    inventory.siteId !== crawlPlan.target.siteId ||
    executionPlan.siteId !== crawlPlan.target.siteId ||
    checkpoint.siteId !== crawlPlan.target.siteId ||
    inventory.canonicalOrigin !== crawlPlan.target.canonicalOrigin ||
    executionPlan.canonicalOrigin !== crawlPlan.target.canonicalOrigin ||
    checkpoint.canonicalOrigin !== crawlPlan.target.canonicalOrigin
  ) throw new Error("crawl_certification_identity_lineage_mismatch");
  if (
    executionPlan.source.pageHardLimit !== crawlPlan.limits.pageHardLimit ||
    executionPlan.source.absolutePageCeiling !== crawlPlan.limits.absolutePageCeiling ||
    executionPlan.source.inventoryUniqueUrls !== inventory.inventory.uniqueUrls ||
    executionPlan.source.inventoryFingerprint !== inventory.fingerprint ||
    checkpoint.inventoryFingerprint !== inventory.fingerprint ||
    checkpoint.planFingerprint !== executionPlan.fingerprint
  ) throw new Error("crawl_certification_fingerprint_lineage_mismatch");
  if (inventory.policy.maxInventoryUrls > crawlPlan.limits.pageHardLimit || inventory.inventory.uniqueUrls > crawlPlan.limits.pageHardLimit) {
    throw new Error("crawl_certification_inventory_exceeds_page_fuse");
  }
  if (!inventory.completeness.complete || inventory.completeness.hardLimitReached) {
    throw new Error("crawl_certification_inventory_not_certifiable");
  }

  const reconstructedExecutionPlan = planFullSiteCrawlExecution(crawlPlan, inventory, executionPlan.policy);
  if (stableSerialize(reconstructedExecutionPlan) !== stableSerialize(executionPlan)) {
    throw new Error("crawl_certification_execution_plan_semantic_mismatch");
  }
}

export function buildFullSiteCrawlCertification(
  input: FullSiteCrawlCertificationInput,
): FullSiteCrawlCertification {
  assertExactLineage(input);
  const ledger = summarizeFullSiteCrawlAccounting(
    input.crawlPlan,
    input.inventory,
    input.executionPlan,
    input.checkpoint,
  );
  if (ledger.eligible !== input.executionPlan.source.inventoryUniqueUrls) {
    throw new Error("crawl_certification_eligible_count_mismatch");
  }
  if (ledger.finalized !== input.checkpoint.progress.finalizedUrls || ledger.pending !== input.checkpoint.progress.pendingUrls) {
    throw new Error("crawl_certification_checkpoint_accounting_mismatch");
  }
  if (ledger.finalized + ledger.pending !== ledger.eligible) {
    throw new Error("crawl_certification_total_accounting_mismatch");
  }
  if (ledger.noindex > ledger.fetchedSuccessful) {
    throw new Error("crawl_certification_noindex_subset_invalid");
  }

  const blockers = certificationBlockers(input.inventory, input.executionPlan, input.checkpoint, ledger);
  const wholeSiteCertified = blockers.length === 0;
  const withoutFingerprint: Omit<FullSiteCrawlCertification, "fingerprint"> = {
    version: "first_party_full_site_crawl_certification_v1",
    siteId: input.crawlPlan.target.siteId,
    canonicalOrigin: input.crawlPlan.target.canonicalOrigin,
    lineage: {
      crawlPlanVersion: "first_party_crawl_controller_v1",
      pageHardLimit: input.crawlPlan.limits.pageHardLimit,
      absolutePageCeiling: input.crawlPlan.limits.absolutePageCeiling,
      inventoryFingerprint: input.inventory.fingerprint,
      executionPlanFingerprint: input.executionPlan.fingerprint,
      checkpointFingerprint: input.checkpoint.fingerprint,
      checkpointSequence: input.checkpoint.sequence,
      inventoryUniqueUrls: input.inventory.inventory.uniqueUrls,
      inventoryAcceptedOccurrences: input.inventory.inventory.acceptedOccurrences,
      inventoryDuplicateOccurrences: input.inventory.inventory.duplicateOccurrences,
      inventoryUrlEntryRejections: countUrlEntryRejections(input.inventory),
      totalBatches: input.executionPlan.batches.length,
      completedBatches: input.checkpoint.completedBatchIds.length,
    },
    ledger,
    certification: {
      wholeSiteCertified,
      wholeSiteReason: wholeSiteCertified ? "certified_complete_accounting" : "blocked",
      blockers,
      assertsCompletenessOnly: true,
      assertsSeoHealth: false,
    },
    authorization: authorizationBoundary(),
  };
  return { ...withoutFingerprint, fingerprint: fingerprint(withoutFingerprint) };
}

export function assertFullSiteCrawlCertificationIntegrity(certification: FullSiteCrawlCertification): void {
  if (certification.version !== "first_party_full_site_crawl_certification_v1") {
    throw new Error("crawl_certification_version_invalid");
  }
  if (!certification.siteId.trim()) throw new Error("crawl_certification_site_id_invalid");
  requireCanonicalOrigin(certification.canonicalOrigin);
  requireSha256(certification.lineage.inventoryFingerprint, "crawl_certification_lineage_fingerprint_invalid");
  requireSha256(certification.lineage.executionPlanFingerprint, "crawl_certification_lineage_fingerprint_invalid");
  requireSha256(certification.lineage.checkpointFingerprint, "crawl_certification_lineage_fingerprint_invalid");
  requirePositiveInteger(certification.lineage.pageHardLimit, "crawl_certification_page_hard_limit_invalid");
  requirePositiveInteger(certification.lineage.absolutePageCeiling, "crawl_certification_absolute_page_ceiling_invalid");
  if (certification.lineage.pageHardLimit > certification.lineage.absolutePageCeiling) {
    throw new Error("crawl_certification_page_hard_limit_exceeds_ceiling");
  }
  for (const value of [
    certification.lineage.checkpointSequence,
    certification.lineage.inventoryUniqueUrls,
    certification.lineage.inventoryAcceptedOccurrences,
    certification.lineage.inventoryDuplicateOccurrences,
    certification.lineage.inventoryUrlEntryRejections,
    certification.lineage.totalBatches,
    certification.lineage.completedBatches,
  ]) requireNonNegativeInteger(value, "crawl_certification_lineage_count_invalid");
  if (
    certification.lineage.inventoryAcceptedOccurrences !==
    certification.lineage.inventoryUniqueUrls + certification.lineage.inventoryDuplicateOccurrences
  ) throw new Error("crawl_certification_lineage_dedupe_count_mismatch");
  if (certification.lineage.completedBatches > certification.lineage.totalBatches) {
    throw new Error("crawl_certification_completed_batches_invalid");
  }

  const ledger = certification.ledger;
  for (const value of [
    ledger.discovered,
    ledger.eligible,
    ledger.fetchedSuccessful,
    ledger.redirects,
    ledger.canonicalizedDeduplicated,
    ledger.robotsExcluded,
    ledger.inventoryExcluded,
    ledger.robotsOrExcluded,
    ledger.noindex,
    ledger.failed,
    ledger.finalized,
    ledger.pending,
  ]) requireNonNegativeInteger(value, "crawl_certification_ledger_count_invalid");
  if (!Number.isFinite(ledger.coveragePercent) || ledger.coveragePercent < 0 || ledger.coveragePercent > 100) {
    throw new Error("crawl_certification_coverage_invalid");
  }
  if (ledger.eligible !== certification.lineage.inventoryUniqueUrls) throw new Error("crawl_certification_eligible_count_mismatch");
  if (ledger.canonicalizedDeduplicated !== certification.lineage.inventoryDuplicateOccurrences) {
    throw new Error("crawl_certification_dedupe_count_mismatch");
  }
  if (ledger.discovered !== certification.lineage.inventoryAcceptedOccurrences + certification.lineage.inventoryUrlEntryRejections) {
    throw new Error("crawl_certification_discovered_count_mismatch");
  }
  if (ledger.robotsOrExcluded !== ledger.robotsExcluded + ledger.inventoryExcluded) {
    throw new Error("crawl_certification_exclusion_aggregate_mismatch");
  }
  if (ledger.noindex > ledger.fetchedSuccessful) throw new Error("crawl_certification_noindex_subset_invalid");
  if (ledger.finalized !== ledger.fetchedSuccessful + ledger.redirects + ledger.robotsExcluded + ledger.failed) {
    throw new Error("crawl_certification_finalized_count_mismatch");
  }
  if (ledger.finalized + ledger.pending !== ledger.eligible) throw new Error("crawl_certification_total_accounting_mismatch");
  if (ledger.coveragePercent !== coveragePercent(ledger.finalized, ledger.eligible)) {
    throw new Error("crawl_certification_coverage_mismatch");
  }
  if (
    ledger.hardLimitState.pageHardLimit !== certification.lineage.pageHardLimit ||
    ledger.hardLimitState.absolutePageCeiling !== certification.lineage.absolutePageCeiling ||
    ledger.hardLimitState.eligibleAtPageHardLimit !== (ledger.eligible === certification.lineage.pageHardLimit) ||
    ledger.hardLimitState.blockedByHardLimit !== (ledger.hardLimitState.inventoryHardLimitReached || ledger.eligible > certification.lineage.pageHardLimit)
  ) throw new Error("crawl_certification_hard_limit_state_mismatch");

  if (new Set(certification.certification.blockers).size !== certification.certification.blockers.length) {
    throw new Error("crawl_certification_blocker_duplicate");
  }
  const sortedBlockers = [...certification.certification.blockers].sort();
  if (certification.certification.blockers.some((blocker, index) => blocker !== sortedBlockers[index])) {
    throw new Error("crawl_certification_blocker_order_invalid");
  }
  for (const blocker of certification.certification.blockers) {
    if (!CRAWL_CERTIFICATION_BLOCKERS.includes(blocker)) throw new Error("crawl_certification_blocker_invalid");
  }

  const expected = new Set<CrawlCertificationBlocker>();
  if (ledger.eligible === 0) expected.add("empty_eligible_inventory");
  if (ledger.pending !== 0) expected.add("pending_urls_remaining");
  if (certification.lineage.completedBatches !== certification.lineage.totalBatches) expected.add("unfinished_batches_remaining");
  if (ledger.coveragePercent !== 100) expected.add("coverage_below_100");
  if (ledger.failed > 0) expected.add("terminal_failures_present");
  if (ledger.pending !== 0 || certification.lineage.completedBatches !== certification.lineage.totalBatches) {
    expected.add("checkpoint_incomplete");
  }
  const expectedBlockers = [...expected].sort();
  if (stableSerialize(certification.certification.blockers) !== stableSerialize(expectedBlockers)) {
    throw new Error("crawl_certification_blocker_semantics_mismatch");
  }
  const expectedCertified = expectedBlockers.length === 0 && !ledger.hardLimitState.blockedByHardLimit;
  if (certification.certification.wholeSiteCertified !== expectedCertified) {
    throw new Error("crawl_certification_boolean_mismatch");
  }
  if (
    certification.certification.wholeSiteReason !== (expectedCertified ? "certified_complete_accounting" : "blocked") ||
    certification.certification.assertsCompletenessOnly !== true ||
    certification.certification.assertsSeoHealth !== false
  ) throw new Error("crawl_certification_semantics_invalid");
  if (!allFalse(certification.authorization as unknown as Record<string, boolean>)) {
    throw new Error("crawl_certification_authorization_must_be_closed");
  }
  requireSha256(certification.fingerprint, "crawl_certification_fingerprint_invalid");
  const { fingerprint: actual, ...withoutFingerprint } = certification;
  if (actual !== fingerprint(withoutFingerprint)) throw new Error("crawl_certification_fingerprint_mismatch");
}
