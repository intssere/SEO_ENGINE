import { createHash } from "node:crypto";
import type { SitemapInventoryEntry, SitemapInventoryResult } from "./sitemap-inventory.js";
import {
  assertFullSiteCrawlCertificationIntegrity,
  type CrawlCertificationBlocker,
  type FullSiteCrawlCertification,
  type FullSiteCrawlCompletionLedger,
} from "./full-site-crawl-certification.js";

export const CRAWL_HISTORY_PROVEN_DIMENSIONS = Object.freeze([
  "inventory_membership",
  "sitemap_lastmod",
  "aggregate_completion_ledger",
  "whole_site_certification",
  "certification_blockers",
  "crawl_lineage_configuration",
] as const);

export const CRAWL_HISTORY_UNAVAILABLE_PER_URL_DIMENSIONS = Object.freeze([
  "http_status",
  "fetch_result",
  "canonical_target",
  "indexability",
  "content_fingerprint",
] as const);

export type CrawlHistoryProvenDimension = typeof CRAWL_HISTORY_PROVEN_DIMENSIONS[number];
export type CrawlHistoryUnavailablePerUrlDimension = typeof CRAWL_HISTORY_UNAVAILABLE_PER_URL_DIMENSIONS[number];

export type CrawlHistoryAuthorization = {
  networkExecutionEnabled: false;
  crawlExecutionAuthorized: false;
  sitemapNetworkFetchingEnabled: false;
  persistenceAuthorized: false;
  schedulerEnabled: false;
  batchExecutorEnabled: false;
  autonomousWorkerEnabled: false;
  retryLoopEnabled: false;
  providerWrites: false;
  publicSiteWrites: false;
};

export type CrawlHistorySource = {
  inventory: SitemapInventoryResult;
  certification: FullSiteCrawlCertification;
};

export type CrawlHistoryLedgerDeltas = {
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
};

export type CrawlHistoryComparison = {
  version: "first_party_crawl_history_comparison_v1";
  siteId: string;
  canonicalOrigin: string;
  source: {
    before: {
      inventoryFingerprint: string;
      certificationFingerprint: string;
      executionPlanFingerprint: string;
      checkpointFingerprint: string;
      checkpointSequence: number;
    };
    after: {
      inventoryFingerprint: string;
      certificationFingerprint: string;
      executionPlanFingerprint: string;
      checkpointFingerprint: string;
      checkpointSequence: number;
    };
  };
  inventoryChanges: {
    added: Array<{ canonicalUrl: string; lastmod: string | null }>;
    removed: Array<{ canonicalUrl: string; lastmod: string | null }>;
    lastmodChanged: Array<{
      canonicalUrl: string;
      beforeLastmod: string | null;
      afterLastmod: string | null;
    }>;
    unchangedMembership: number;
  };
  ledgerDeltas: CrawlHistoryLedgerDeltas;
  certificationTransition: {
    beforeCertified: boolean;
    afterCertified: boolean;
    changed: boolean;
    blockersAdded: CrawlCertificationBlocker[];
    blockersRemoved: CrawlCertificationBlocker[];
  };
  lineageChanges: {
    inventoryChanged: boolean;
    executionPlanChanged: boolean;
    checkpointChanged: boolean;
    checkpointSequenceDelta: number;
    pageHardLimit: { before: number; after: number; changed: boolean };
    absolutePageCeiling: { before: number; after: number; changed: boolean };
    hardLimitBlocked: { before: boolean; after: boolean; changed: boolean };
  };
  capabilities: {
    provenDimensions: CrawlHistoryProvenDimension[];
    unavailablePerUrlDimensions: CrawlHistoryUnavailablePerUrlDimension[];
    perUrlOutcomeComparisonAvailable: false;
    reason: "upstream_p2_1_to_p2_4_do_not_retain_per_url_fetch_or_content_outcomes";
  };
  summary: {
    changeDetected: boolean;
    inventoryMembershipChanged: boolean;
    sitemapLastmodChanged: boolean;
    aggregateLedgerChanged: boolean;
    certificationChanged: boolean;
    lineageConfigurationChanged: boolean;
  };
  authorization: CrawlHistoryAuthorization;
  fingerprint: string;
};

const LEDGER_FIELDS = Object.freeze([
  "discovered",
  "eligible",
  "fetchedSuccessful",
  "redirects",
  "canonicalizedDeduplicated",
  "robotsExcluded",
  "inventoryExcluded",
  "robotsOrExcluded",
  "noindex",
  "failed",
  "finalized",
  "pending",
  "coveragePercent",
] as const satisfies readonly (keyof FullSiteCrawlCompletionLedger)[]);

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

function authorizationBoundary(): CrawlHistoryAuthorization {
  return {
    networkExecutionEnabled: false,
    crawlExecutionAuthorized: false,
    sitemapNetworkFetchingEnabled: false,
    persistenceAuthorized: false,
    schedulerEnabled: false,
    batchExecutorEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
  };
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
    ) throw new Error("crawl_history_origin_invalid");
    return parsed.origin;
  } catch (error) {
    if (error instanceof Error && error.message === "crawl_history_origin_invalid") throw error;
    throw new Error("crawl_history_origin_invalid");
  }
}

function requireSha256(value: string, code: string): string {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error(code);
  return value;
}

function requireNonNegativeInteger(value: number, code: string): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) throw new Error(code);
  return value;
}

function assertInventoryIntegrity(inventory: SitemapInventoryResult): void {
  if (inventory.version !== "first_party_sitemap_inventory_v1") throw new Error("crawl_history_inventory_version_invalid");
  if (!inventory.siteId.trim()) throw new Error("crawl_history_inventory_site_id_invalid");
  requireCanonicalOrigin(inventory.canonicalOrigin);
  requireSha256(inventory.fingerprint, "crawl_history_inventory_fingerprint_invalid");
  if (!allFalse(inventory.authorization as unknown as Record<string, boolean>)) {
    throw new Error("crawl_history_inventory_authorization_must_be_closed");
  }

  const urls = inventory.inventory.entries.map((entry) => entry.canonicalUrl);
  if (new Set(urls).size !== urls.length) throw new Error("crawl_history_inventory_duplicate_url");
  const sortedUrls = [...urls].sort();
  if (urls.some((url, index) => url !== sortedUrls[index])) throw new Error("crawl_history_inventory_order_invalid");
  if (inventory.inventory.uniqueUrls !== inventory.inventory.entries.length) {
    throw new Error("crawl_history_inventory_unique_count_mismatch");
  }
  if (inventory.inventory.acceptedOccurrences !== inventory.inventory.uniqueUrls + inventory.inventory.duplicateOccurrences) {
    throw new Error("crawl_history_inventory_occurrence_count_mismatch");
  }
  for (const entry of inventory.inventory.entries) {
    if (!entry.canonicalUrl.startsWith(`${inventory.canonicalOrigin}/`) && entry.canonicalUrl !== inventory.canonicalOrigin) {
      throw new Error("crawl_history_inventory_cross_origin_url");
    }
    if (new Set(entry.sourceSitemaps).size !== entry.sourceSitemaps.length) {
      throw new Error("crawl_history_inventory_source_sitemap_duplicate");
    }
    const sortedSources = [...entry.sourceSitemaps].sort();
    if (entry.sourceSitemaps.some((source, index) => source !== sortedSources[index])) {
      throw new Error("crawl_history_inventory_source_sitemap_order_invalid");
    }
    if (entry.lastmod !== null && typeof entry.lastmod !== "string") {
      throw new Error("crawl_history_inventory_lastmod_invalid");
    }
  }
  for (const value of [
    inventory.documents.supplied,
    inventory.documents.processed,
    inventory.documents.referenced,
    inventory.inventory.acceptedOccurrences,
    inventory.inventory.duplicateOccurrences,
    inventory.inventory.uniqueUrls,
  ]) requireNonNegativeInteger(value, "crawl_history_inventory_count_invalid");

  const { fingerprint: actual, ...withoutFingerprint } = inventory;
  if (actual !== fingerprint(withoutFingerprint)) throw new Error("crawl_history_inventory_fingerprint_mismatch");
}

function assertSourceIntegrity(source: CrawlHistorySource): void {
  assertInventoryIntegrity(source.inventory);
  assertFullSiteCrawlCertificationIntegrity(source.certification);
  if (
    source.inventory.siteId !== source.certification.siteId ||
    source.inventory.canonicalOrigin !== source.certification.canonicalOrigin
  ) throw new Error("crawl_history_source_identity_mismatch");
  if (source.inventory.fingerprint !== source.certification.lineage.inventoryFingerprint) {
    throw new Error("crawl_history_source_inventory_lineage_mismatch");
  }
  if (source.inventory.inventory.uniqueUrls !== source.certification.ledger.eligible) {
    throw new Error("crawl_history_source_inventory_count_mismatch");
  }
}

function entryMap(entries: SitemapInventoryEntry[]): Map<string, SitemapInventoryEntry> {
  return new Map(entries.map((entry) => [entry.canonicalUrl, entry]));
}

function ledgerDeltas(
  before: FullSiteCrawlCompletionLedger,
  after: FullSiteCrawlCompletionLedger,
): CrawlHistoryLedgerDeltas {
  const result = {} as CrawlHistoryLedgerDeltas;
  for (const field of LEDGER_FIELDS) {
    const beforeValue = before[field];
    const afterValue = after[field];
    if (typeof beforeValue !== "number" || typeof afterValue !== "number") {
      throw new Error("crawl_history_ledger_field_not_numeric");
    }
    result[field] = afterValue - beforeValue;
  }
  return result;
}

function anyNumericDelta(value: CrawlHistoryLedgerDeltas): boolean {
  return Object.values(value).some((delta) => delta !== 0);
}

function sortedSetDifference<T extends string>(left: readonly T[], right: readonly T[]): T[] {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value)).sort();
}

export function compareFullSiteCrawlHistory(input: {
  before: CrawlHistorySource;
  after: CrawlHistorySource;
}): CrawlHistoryComparison {
  assertSourceIntegrity(input.before);
  assertSourceIntegrity(input.after);

  if (
    input.before.inventory.siteId !== input.after.inventory.siteId ||
    input.before.inventory.canonicalOrigin !== input.after.inventory.canonicalOrigin
  ) throw new Error("crawl_history_cross_identity_comparison_denied");

  const beforeEntries = entryMap(input.before.inventory.inventory.entries);
  const afterEntries = entryMap(input.after.inventory.inventory.entries);
  const allUrls = [...new Set([...beforeEntries.keys(), ...afterEntries.keys()])].sort();
  const added: CrawlHistoryComparison["inventoryChanges"]["added"] = [];
  const removed: CrawlHistoryComparison["inventoryChanges"]["removed"] = [];
  const lastmodChanged: CrawlHistoryComparison["inventoryChanges"]["lastmodChanged"] = [];
  let unchangedMembership = 0;

  for (const canonicalUrl of allUrls) {
    const beforeEntry = beforeEntries.get(canonicalUrl);
    const afterEntry = afterEntries.get(canonicalUrl);
    if (!beforeEntry && afterEntry) {
      added.push({ canonicalUrl, lastmod: afterEntry.lastmod });
      continue;
    }
    if (beforeEntry && !afterEntry) {
      removed.push({ canonicalUrl, lastmod: beforeEntry.lastmod });
      continue;
    }
    if (!beforeEntry || !afterEntry) throw new Error("crawl_history_inventory_comparison_invariant");
    unchangedMembership += 1;
    if (beforeEntry.lastmod !== afterEntry.lastmod) {
      lastmodChanged.push({
        canonicalUrl,
        beforeLastmod: beforeEntry.lastmod,
        afterLastmod: afterEntry.lastmod,
      });
    }
  }

  const deltas = ledgerDeltas(input.before.certification.ledger, input.after.certification.ledger);
  const beforeBlockers = input.before.certification.certification.blockers;
  const afterBlockers = input.after.certification.certification.blockers;
  const blockersAdded = sortedSetDifference(afterBlockers, beforeBlockers);
  const blockersRemoved = sortedSetDifference(beforeBlockers, afterBlockers);
  const beforeCertified = input.before.certification.certification.wholeSiteCertified;
  const afterCertified = input.after.certification.certification.wholeSiteCertified;

  const beforeLineage = input.before.certification.lineage;
  const afterLineage = input.after.certification.lineage;
  const beforeHardLimitBlocked = input.before.certification.ledger.hardLimitState.blockedByHardLimit;
  const afterHardLimitBlocked = input.after.certification.ledger.hardLimitState.blockedByHardLimit;
  const inventoryChanged = beforeLineage.inventoryFingerprint !== afterLineage.inventoryFingerprint;
  const executionPlanChanged = beforeLineage.executionPlanFingerprint !== afterLineage.executionPlanFingerprint;
  const checkpointChanged = beforeLineage.checkpointFingerprint !== afterLineage.checkpointFingerprint;
  const pageHardLimitChanged = beforeLineage.pageHardLimit !== afterLineage.pageHardLimit;
  const absolutePageCeilingChanged = beforeLineage.absolutePageCeiling !== afterLineage.absolutePageCeiling;
  const hardLimitBlockedChanged = beforeHardLimitBlocked !== afterHardLimitBlocked;
  const inventoryMembershipChanged = added.length > 0 || removed.length > 0;
  const sitemapLastmodChanged = lastmodChanged.length > 0;
  const aggregateLedgerChanged = anyNumericDelta(deltas);
  const certificationChanged =
    beforeCertified !== afterCertified || blockersAdded.length > 0 || blockersRemoved.length > 0;
  const lineageConfigurationChanged =
    inventoryChanged ||
    executionPlanChanged ||
    checkpointChanged ||
    pageHardLimitChanged ||
    absolutePageCeilingChanged ||
    hardLimitBlockedChanged;

  const withoutFingerprint: Omit<CrawlHistoryComparison, "fingerprint"> = {
    version: "first_party_crawl_history_comparison_v1",
    siteId: input.before.inventory.siteId,
    canonicalOrigin: input.before.inventory.canonicalOrigin,
    source: {
      before: {
        inventoryFingerprint: beforeLineage.inventoryFingerprint,
        certificationFingerprint: input.before.certification.fingerprint,
        executionPlanFingerprint: beforeLineage.executionPlanFingerprint,
        checkpointFingerprint: beforeLineage.checkpointFingerprint,
        checkpointSequence: beforeLineage.checkpointSequence,
      },
      after: {
        inventoryFingerprint: afterLineage.inventoryFingerprint,
        certificationFingerprint: input.after.certification.fingerprint,
        executionPlanFingerprint: afterLineage.executionPlanFingerprint,
        checkpointFingerprint: afterLineage.checkpointFingerprint,
        checkpointSequence: afterLineage.checkpointSequence,
      },
    },
    inventoryChanges: { added, removed, lastmodChanged, unchangedMembership },
    ledgerDeltas: deltas,
    certificationTransition: {
      beforeCertified,
      afterCertified,
      changed: certificationChanged,
      blockersAdded,
      blockersRemoved,
    },
    lineageChanges: {
      inventoryChanged,
      executionPlanChanged,
      checkpointChanged,
      checkpointSequenceDelta: afterLineage.checkpointSequence - beforeLineage.checkpointSequence,
      pageHardLimit: {
        before: beforeLineage.pageHardLimit,
        after: afterLineage.pageHardLimit,
        changed: pageHardLimitChanged,
      },
      absolutePageCeiling: {
        before: beforeLineage.absolutePageCeiling,
        after: afterLineage.absolutePageCeiling,
        changed: absolutePageCeilingChanged,
      },
      hardLimitBlocked: {
        before: beforeHardLimitBlocked,
        after: afterHardLimitBlocked,
        changed: hardLimitBlockedChanged,
      },
    },
    capabilities: {
      provenDimensions: [...CRAWL_HISTORY_PROVEN_DIMENSIONS],
      unavailablePerUrlDimensions: [...CRAWL_HISTORY_UNAVAILABLE_PER_URL_DIMENSIONS],
      perUrlOutcomeComparisonAvailable: false,
      reason: "upstream_p2_1_to_p2_4_do_not_retain_per_url_fetch_or_content_outcomes",
    },
    summary: {
      changeDetected:
        inventoryMembershipChanged ||
        sitemapLastmodChanged ||
        aggregateLedgerChanged ||
        certificationChanged ||
        lineageConfigurationChanged,
      inventoryMembershipChanged,
      sitemapLastmodChanged,
      aggregateLedgerChanged,
      certificationChanged,
      lineageConfigurationChanged,
    },
    authorization: authorizationBoundary(),
  };

  return { ...withoutFingerprint, fingerprint: fingerprint(withoutFingerprint) };
}

export function assertCrawlHistoryComparisonIntegrity(comparison: CrawlHistoryComparison): void {
  if (comparison.version !== "first_party_crawl_history_comparison_v1") {
    throw new Error("crawl_history_comparison_version_invalid");
  }
  if (!comparison.siteId.trim()) throw new Error("crawl_history_comparison_site_id_invalid");
  requireCanonicalOrigin(comparison.canonicalOrigin);
  for (const value of [
    comparison.source.before.inventoryFingerprint,
    comparison.source.before.certificationFingerprint,
    comparison.source.before.executionPlanFingerprint,
    comparison.source.before.checkpointFingerprint,
    comparison.source.after.inventoryFingerprint,
    comparison.source.after.certificationFingerprint,
    comparison.source.after.executionPlanFingerprint,
    comparison.source.after.checkpointFingerprint,
    comparison.fingerprint,
  ]) requireSha256(value, "crawl_history_comparison_fingerprint_invalid");
  if (!allFalse(comparison.authorization as unknown as Record<string, boolean>)) {
    throw new Error("crawl_history_comparison_authorization_must_be_closed");
  }
  if (comparison.capabilities.perUrlOutcomeComparisonAvailable !== false) {
    throw new Error("crawl_history_comparison_per_url_capability_invalid");
  }
  if (stableSerialize(comparison.capabilities.provenDimensions) !== stableSerialize([...CRAWL_HISTORY_PROVEN_DIMENSIONS])) {
    throw new Error("crawl_history_comparison_proven_dimensions_invalid");
  }
  if (
    stableSerialize(comparison.capabilities.unavailablePerUrlDimensions) !==
    stableSerialize([...CRAWL_HISTORY_UNAVAILABLE_PER_URL_DIMENSIONS])
  ) throw new Error("crawl_history_comparison_unavailable_dimensions_invalid");

  const addedUrls = comparison.inventoryChanges.added.map((entry) => entry.canonicalUrl);
  const removedUrls = comparison.inventoryChanges.removed.map((entry) => entry.canonicalUrl);
  const lastmodUrls = comparison.inventoryChanges.lastmodChanged.map((entry) => entry.canonicalUrl);
  for (const urls of [addedUrls, removedUrls, lastmodUrls]) {
    if (new Set(urls).size !== urls.length) throw new Error("crawl_history_comparison_duplicate_url");
    const sorted = [...urls].sort();
    if (urls.some((url, index) => url !== sorted[index])) throw new Error("crawl_history_comparison_url_order_invalid");
  }
  requireNonNegativeInteger(comparison.inventoryChanges.unchangedMembership, "crawl_history_comparison_unchanged_count_invalid");
  if (new Set(comparison.certificationTransition.blockersAdded).size !== comparison.certificationTransition.blockersAdded.length) {
    throw new Error("crawl_history_comparison_blockers_added_duplicate");
  }
  if (new Set(comparison.certificationTransition.blockersRemoved).size !== comparison.certificationTransition.blockersRemoved.length) {
    throw new Error("crawl_history_comparison_blockers_removed_duplicate");
  }

  const membershipChanged = comparison.inventoryChanges.added.length > 0 || comparison.inventoryChanges.removed.length > 0;
  const lastmodChanged = comparison.inventoryChanges.lastmodChanged.length > 0;
  const ledgerChanged = anyNumericDelta(comparison.ledgerDeltas);
  const certificationChanged =
    comparison.certificationTransition.beforeCertified !== comparison.certificationTransition.afterCertified ||
    comparison.certificationTransition.blockersAdded.length > 0 ||
    comparison.certificationTransition.blockersRemoved.length > 0;
  const lineageChanged =
    comparison.lineageChanges.inventoryChanged ||
    comparison.lineageChanges.executionPlanChanged ||
    comparison.lineageChanges.checkpointChanged ||
    comparison.lineageChanges.pageHardLimit.changed ||
    comparison.lineageChanges.absolutePageCeiling.changed ||
    comparison.lineageChanges.hardLimitBlocked.changed;
  if (
    comparison.summary.inventoryMembershipChanged !== membershipChanged ||
    comparison.summary.sitemapLastmodChanged !== lastmodChanged ||
    comparison.summary.aggregateLedgerChanged !== ledgerChanged ||
    comparison.summary.certificationChanged !== certificationChanged ||
    comparison.summary.lineageConfigurationChanged !== lineageChanged ||
    comparison.summary.changeDetected !== (membershipChanged || lastmodChanged || ledgerChanged || certificationChanged || lineageChanged)
  ) throw new Error("crawl_history_comparison_summary_mismatch");

  const { fingerprint: actual, ...withoutFingerprint } = comparison;
  if (actual !== fingerprint(withoutFingerprint)) throw new Error("crawl_history_comparison_fingerprint_mismatch");
}
