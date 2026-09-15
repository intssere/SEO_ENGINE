import { createHash } from "node:crypto";
import {
  CRAWL_HISTORY_UNAVAILABLE_PER_URL_DIMENSIONS,
  type CrawlHistoryUnavailablePerUrlDimension,
} from "./crawl-history-comparison.js";
import {
  INCREMENTAL_RECRAWL_REASONS,
  assertIncrementalRecrawlPlanIntegrity,
  type IncrementalRecrawlPlan,
  type IncrementalRecrawlPriority,
  type IncrementalRecrawlReason,
} from "./incremental-recrawl-planner.js";
import {
  SITEMAP_INVENTORY_ABSOLUTE_LIMITS,
  SITEMAP_REJECTION_REASONS,
  type SitemapInventoryEntry,
  type SitemapInventoryResult,
  type SitemapRejectionReason,
} from "./sitemap-inventory.js";

export const URL_EXPLORER_LIMITS = Object.freeze({
  pageSize: 500,
  cursorBytes: 1_024,
  filterText: 2_048,
  resultUrls: SITEMAP_INVENTORY_ABSOLUTE_LIMITS.inventoryUrls,
} as const);

export const URL_EXPLORER_RECRAWL_STATUSES = Object.freeze([
  "selected",
  "deferred",
  "not_planned",
] as const);

export const URL_EXPLORER_SORT_FIELDS = Object.freeze([
  "canonical_url",
  "pathname",
  "lastmod",
  "recrawl_status",
  "recrawl_priority",
] as const);

export type UrlExplorerRecrawlStatus = typeof URL_EXPLORER_RECRAWL_STATUSES[number];
export type UrlExplorerSortField = typeof URL_EXPLORER_SORT_FIELDS[number];
export type UrlExplorerSortDirection = "asc" | "desc";

export type UrlExplorerFilters = {
  canonicalUrlPrefix?: string;
  pathnamePrefix?: string;
  hasLastmod?: boolean;
  sourceSitemap?: string;
  recrawlStatus?: UrlExplorerRecrawlStatus;
  recrawlPriority?: IncrementalRecrawlPriority;
  recrawlReason?: IncrementalRecrawlReason;
};

export type UrlExplorerQuery = {
  filters?: UrlExplorerFilters;
  sort?: {
    field: UrlExplorerSortField;
    direction: UrlExplorerSortDirection;
  };
  page?: {
    limit?: number;
    cursor?: string | null;
  };
};

export type UrlExplorerItem = {
  urlId: string;
  canonicalUrl: string;
  pathname: string;
  inventory: {
    member: true;
    sourceSitemaps: string[];
    lastmod: string | null;
  };
  recrawl: {
    status: UrlExplorerRecrawlStatus;
    priority: IncrementalRecrawlPriority | null;
    reasons: IncrementalRecrawlReason[];
  };
  unavailablePerUrlDimensions: CrawlHistoryUnavailablePerUrlDimension[];
};

export type UrlExplorerAuthorization = {
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
  providerRequestsAuthorized: false;
  providerWrites: false;
  publicSiteWrites: false;
};

export type UrlExplorerResult = {
  version: "first_party_url_explorer_result_v1";
  siteId: string;
  canonicalOrigin: string;
  source: {
    inventoryFingerprint: string;
    inventoryUniqueUrls: number;
    inventoryComplete: boolean;
    inventoryHardLimitReached: boolean;
    recrawlPlanFingerprint: string | null;
  };
  query: {
    filters: UrlExplorerFilters;
    sort: {
      field: UrlExplorerSortField;
      direction: UrlExplorerSortDirection;
    };
    limit: number;
    fingerprint: string;
  };
  page: {
    offset: number;
    returned: number;
    totalMatched: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
  capabilities: {
    retainedPerUrlDimensions: readonly [
      "inventory_membership",
      "sitemap_sources",
      "sitemap_lastmod",
      "incremental_recrawl_membership",
    ];
    unavailablePerUrlDimensions: CrawlHistoryUnavailablePerUrlDimension[];
    reason: "upstream_p2_1_to_p2_6_do_not_retain_per_url_fetch_or_content_outcomes";
  };
  authorization: UrlExplorerAuthorization;
  items: UrlExplorerItem[];
  fingerprint: string;
};

type NormalizedQuery = {
  filters: UrlExplorerFilters;
  sort: { field: UrlExplorerSortField; direction: UrlExplorerSortDirection };
  limit: number;
  cursor: string | null;
};

type CursorPayload = {
  version: "url_explorer_cursor_v1";
  offset: number;
  queryFingerprint: string;
};

const RECRAWL_PRIORITIES = Object.freeze(["p0_change", "p1_actionable", "p2_maintenance"] as const);
const RETAINED_DIMENSIONS = Object.freeze([
  "inventory_membership",
  "sitemap_sources",
  "sitemap_lastmod",
  "incremental_recrawl_membership",
] as const);

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

function requireInteger(value: number, minimum: number, maximum: number, code: string): number {
  if (!Number.isInteger(value) || !Number.isFinite(value) || value < minimum || value > maximum) throw new Error(code);
  return value;
}

function allFalse(value: Record<string, boolean>): boolean {
  return Object.values(value).every((flag) => flag === false);
}

function authorizationBoundary(): UrlExplorerAuthorization {
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
    providerRequestsAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
  };
}

function normalizeOrigin(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("url_explorer_origin_invalid");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("url_explorer_origin_invalid");
  }
  if (parsed.pathname !== "/" || parsed.origin !== value) throw new Error("url_explorer_origin_invalid");
  return parsed.origin;
}

function normalizeCanonicalUrl(value: string, canonicalOrigin: string, code: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(code);
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.origin !== canonicalOrigin ||
    parsed.search ||
    parsed.hash
  ) throw new Error(code);
  parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/");
  const normalized = parsed.toString().replace(/\/$/, "") || canonicalOrigin;
  return normalized === canonicalOrigin.replace(/\/$/, "") ? canonicalOrigin : normalized;
}

function assertNormalizedLastmod(value: string | null): void {
  if (value === null) return;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new Error("url_explorer_inventory_lastmod_invalid");
    }
    return;
  }
  const parsed = new Date(value);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error("url_explorer_inventory_lastmod_invalid");
  }
}

function assertSortedUniqueStrings(values: readonly string[], code: string): void {
  if (new Set(values).size !== values.length) throw new Error(`${code}_duplicate`);
  const sorted = [...values].sort();
  if (stableSerialize(sorted) !== stableSerialize(values)) throw new Error(`${code}_order_invalid`);
}

function assertSitemapInventoryIntegrity(inventory: SitemapInventoryResult): void {
  if (inventory.version !== "first_party_sitemap_inventory_v1") throw new Error("url_explorer_inventory_version_invalid");
  if (!inventory.siteId.trim()) throw new Error("url_explorer_inventory_site_id_invalid");
  const origin = normalizeOrigin(inventory.canonicalOrigin);
  if (origin !== inventory.canonicalOrigin) throw new Error("url_explorer_inventory_origin_invalid");
  if (normalizeCanonicalUrl(inventory.rootSitemapUrl, origin, "url_explorer_root_sitemap_invalid") !== inventory.rootSitemapUrl) {
    throw new Error("url_explorer_root_sitemap_not_canonical");
  }
  requireSha256(inventory.fingerprint, "url_explorer_inventory_fingerprint_invalid");
  if (!allFalse(inventory.authorization as unknown as Record<string, boolean>)) {
    throw new Error("url_explorer_inventory_authorization_must_be_closed");
  }

  const policy = inventory.policy;
  requireInteger(policy.maxDocuments, 1, SITEMAP_INVENTORY_ABSOLUTE_LIMITS.documents, "url_explorer_inventory_policy_invalid");
  requireInteger(policy.maxDepth, 0, SITEMAP_INVENTORY_ABSOLUTE_LIMITS.depth, "url_explorer_inventory_policy_invalid");
  requireInteger(policy.maxDocumentBytes, 1, SITEMAP_INVENTORY_ABSOLUTE_LIMITS.documentBytes, "url_explorer_inventory_policy_invalid");
  requireInteger(policy.maxInventoryUrls, 1, SITEMAP_INVENTORY_ABSOLUTE_LIMITS.inventoryUrls, "url_explorer_inventory_policy_invalid");
  requireInteger(policy.maxPathSegments, 1, SITEMAP_INVENTORY_ABSOLUTE_LIMITS.pathSegments, "url_explorer_inventory_policy_invalid");

  requireInteger(inventory.documents.supplied, 0, policy.maxDocuments, "url_explorer_inventory_document_count_invalid");
  requireInteger(inventory.documents.processed, 0, inventory.documents.supplied, "url_explorer_inventory_document_count_invalid");
  requireInteger(inventory.documents.referenced, 0, SITEMAP_INVENTORY_ABSOLUTE_LIMITS.documents * 100, "url_explorer_inventory_document_count_invalid");
  assertSortedUniqueStrings(inventory.documents.missingSupplied, "url_explorer_inventory_missing_sitemaps");
  for (const url of inventory.documents.missingSupplied) {
    if (normalizeCanonicalUrl(url, origin, "url_explorer_inventory_missing_sitemap_invalid") !== url) {
      throw new Error("url_explorer_inventory_missing_sitemap_not_canonical");
    }
  }

  const entries = inventory.inventory.entries;
  if (entries.length > policy.maxInventoryUrls || entries.length > URL_EXPLORER_LIMITS.resultUrls) {
    throw new Error("url_explorer_inventory_entry_count_invalid");
  }
  if (inventory.inventory.uniqueUrls !== entries.length) throw new Error("url_explorer_inventory_unique_count_mismatch");
  requireInteger(inventory.inventory.acceptedOccurrences, 0, Number.MAX_SAFE_INTEGER, "url_explorer_inventory_occurrence_count_invalid");
  requireInteger(inventory.inventory.duplicateOccurrences, 0, Number.MAX_SAFE_INTEGER, "url_explorer_inventory_occurrence_count_invalid");
  if (
    inventory.inventory.acceptedOccurrences < entries.length ||
    inventory.inventory.duplicateOccurrences !== inventory.inventory.acceptedOccurrences - entries.length
  ) throw new Error("url_explorer_inventory_occurrence_count_mismatch");

  const canonicalUrls = entries.map((entry) => entry.canonicalUrl);
  assertSortedUniqueStrings(canonicalUrls, "url_explorer_inventory_urls");
  for (const entry of entries) {
    if (normalizeCanonicalUrl(entry.canonicalUrl, origin, "url_explorer_inventory_url_invalid") !== entry.canonicalUrl) {
      throw new Error("url_explorer_inventory_url_not_canonical");
    }
    assertSortedUniqueStrings(entry.sourceSitemaps, "url_explorer_inventory_sources");
    if (entry.sourceSitemaps.length === 0) throw new Error("url_explorer_inventory_source_required");
    for (const source of entry.sourceSitemaps) {
      if (normalizeCanonicalUrl(source, origin, "url_explorer_inventory_source_invalid") !== source) {
        throw new Error("url_explorer_inventory_source_not_canonical");
      }
    }
    assertNormalizedLastmod(entry.lastmod);
  }

  const allowedReasons = new Set<string>(SITEMAP_REJECTION_REASONS);
  const tallies = Object.fromEntries(SITEMAP_REJECTION_REASONS.map((reason) => [reason, 0])) as Record<SitemapRejectionReason, number>;
  const sortedRejections = [...inventory.rejections].sort(
    (a, b) => a.sourceSitemap.localeCompare(b.sourceSitemap) || a.kind.localeCompare(b.kind) || a.reason.localeCompare(b.reason),
  );
  if (stableSerialize(sortedRejections) !== stableSerialize(inventory.rejections)) {
    throw new Error("url_explorer_inventory_rejection_order_invalid");
  }
  for (const rejection of inventory.rejections) {
    if (rejection.kind !== "sitemap_reference" && rejection.kind !== "url_entry") throw new Error("url_explorer_inventory_rejection_kind_invalid");
    if (!allowedReasons.has(rejection.reason)) throw new Error("url_explorer_inventory_rejection_reason_invalid");
    if (normalizeCanonicalUrl(rejection.sourceSitemap, origin, "url_explorer_inventory_rejection_source_invalid") !== rejection.sourceSitemap) {
      throw new Error("url_explorer_inventory_rejection_source_not_canonical");
    }
    tallies[rejection.reason]++;
  }
  const rejectionKeys = Object.keys(inventory.rejectionCounts).sort();
  const expectedRejectionKeys = [...SITEMAP_REJECTION_REASONS].sort();
  if (stableSerialize(rejectionKeys) !== stableSerialize(expectedRejectionKeys)) {
    throw new Error("url_explorer_inventory_rejection_counts_shape_invalid");
  }
  for (const reason of SITEMAP_REJECTION_REASONS) {
    if (inventory.rejectionCounts[reason] !== tallies[reason]) throw new Error("url_explorer_inventory_rejection_counts_mismatch");
  }

  assertSortedUniqueStrings(inventory.completeness.reasons, "url_explorer_inventory_completeness_reasons");
  if (inventory.completeness.complete) {
    if (inventory.documents.missingSupplied.length || inventory.completeness.hardLimitReached || inventory.completeness.reasons.length) {
      throw new Error("url_explorer_inventory_completeness_mismatch");
    }
  }

  const { fingerprint: actual, ...withoutFingerprint } = inventory;
  if (actual !== sha256(withoutFingerprint)) throw new Error("url_explorer_inventory_fingerprint_mismatch");
}

function normalizePrefixUrl(value: string, origin: string): string {
  if (value.length > URL_EXPLORER_LIMITS.filterText) throw new Error("url_explorer_url_prefix_too_long");
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("url_explorer_url_prefix_invalid");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.origin !== origin || parsed.search || parsed.hash) {
    throw new Error("url_explorer_url_prefix_invalid");
  }
  parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/");
  return `${parsed.origin}${parsed.pathname === "/" ? "" : parsed.pathname}`;
}

function normalizePathPrefix(value: string): string {
  const clean = value.trim();
  if (!clean.startsWith("/") || clean.includes("?") || clean.includes("#") || clean.length > URL_EXPLORER_LIMITS.filterText) {
    throw new Error("url_explorer_path_prefix_invalid");
  }
  return clean.replace(/\/{2,}/g, "/");
}

function normalizeFilters(filters: UrlExplorerFilters | undefined, origin: string): UrlExplorerFilters {
  const normalized: UrlExplorerFilters = {};
  if (filters?.canonicalUrlPrefix !== undefined) normalized.canonicalUrlPrefix = normalizePrefixUrl(filters.canonicalUrlPrefix, origin);
  if (filters?.pathnamePrefix !== undefined) normalized.pathnamePrefix = normalizePathPrefix(filters.pathnamePrefix);
  if (filters?.hasLastmod !== undefined) {
    if (typeof filters.hasLastmod !== "boolean") throw new Error("url_explorer_has_lastmod_invalid");
    normalized.hasLastmod = filters.hasLastmod;
  }
  if (filters?.sourceSitemap !== undefined) {
    if (filters.sourceSitemap.length > URL_EXPLORER_LIMITS.filterText) throw new Error("url_explorer_source_sitemap_too_long");
    normalized.sourceSitemap = normalizeCanonicalUrl(filters.sourceSitemap, origin, "url_explorer_source_sitemap_invalid");
  }
  if (filters?.recrawlStatus !== undefined) {
    if (!URL_EXPLORER_RECRAWL_STATUSES.includes(filters.recrawlStatus)) throw new Error("url_explorer_recrawl_status_invalid");
    normalized.recrawlStatus = filters.recrawlStatus;
  }
  if (filters?.recrawlPriority !== undefined) {
    if (!RECRAWL_PRIORITIES.includes(filters.recrawlPriority)) throw new Error("url_explorer_recrawl_priority_invalid");
    normalized.recrawlPriority = filters.recrawlPriority;
  }
  if (filters?.recrawlReason !== undefined) {
    if (!INCREMENTAL_RECRAWL_REASONS.includes(filters.recrawlReason)) throw new Error("url_explorer_recrawl_reason_invalid");
    normalized.recrawlReason = filters.recrawlReason;
  }
  return normalized;
}

function normalizeQuery(query: UrlExplorerQuery | undefined, origin: string): NormalizedQuery {
  const filters = normalizeFilters(query?.filters, origin);
  const sort = query?.sort ?? { field: "canonical_url", direction: "asc" as const };
  if (!URL_EXPLORER_SORT_FIELDS.includes(sort.field)) throw new Error("url_explorer_sort_field_invalid");
  if (sort.direction !== "asc" && sort.direction !== "desc") throw new Error("url_explorer_sort_direction_invalid");
  const limit = requireInteger(query?.page?.limit ?? 100, 1, URL_EXPLORER_LIMITS.pageSize, "url_explorer_page_limit_invalid");
  const cursor = query?.page?.cursor ?? null;
  if (cursor !== null && (typeof cursor !== "string" || !cursor)) throw new Error("url_explorer_cursor_invalid");
  return { filters, sort: { field: sort.field, direction: sort.direction }, limit, cursor };
}

function queryFingerprint(input: {
  siteId: string;
  canonicalOrigin: string;
  inventoryFingerprint: string;
  recrawlPlanFingerprint: string | null;
  filters: UrlExplorerFilters;
  sort: { field: UrlExplorerSortField; direction: UrlExplorerSortDirection };
  limit: number;
}): string {
  return sha256({ version: "url_explorer_query_v1", ...input });
}

function encodeCursor(offset: number, fingerprint: string): string {
  const payload: CursorPayload = { version: "url_explorer_cursor_v1", offset, queryFingerprint: fingerprint };
  return Buffer.from(stableSerialize(payload), "utf8").toString("base64url");
}

function decodeCursor(value: string, expectedQueryFingerprint: string): number {
  if (Buffer.byteLength(value, "utf8") > URL_EXPLORER_LIMITS.cursorBytes || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("url_explorer_cursor_invalid");
  }
  let parsed: unknown;
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    if (Buffer.from(decoded, "utf8").toString("base64url") !== value) throw new Error("non_canonical_cursor");
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error("url_explorer_cursor_invalid");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("url_explorer_cursor_invalid");
  const object = parsed as Record<string, unknown>;
  if (stableSerialize(Object.keys(object).sort()) !== stableSerialize(["offset", "queryFingerprint", "version"])) {
    throw new Error("url_explorer_cursor_invalid");
  }
  if (object.version !== "url_explorer_cursor_v1" || object.queryFingerprint !== expectedQueryFingerprint) {
    throw new Error("url_explorer_cursor_lineage_mismatch");
  }
  return requireInteger(object.offset as number, 0, URL_EXPLORER_LIMITS.resultUrls, "url_explorer_cursor_offset_invalid");
}

function recrawlLookup(plan: IncrementalRecrawlPlan | undefined, inventory: SitemapInventoryResult): Map<string, UrlExplorerItem["recrawl"]> {
  const lookup = new Map<string, UrlExplorerItem["recrawl"]>();
  if (!plan) return lookup;
  assertIncrementalRecrawlPlanIntegrity(plan);
  if (plan.siteId !== inventory.siteId || plan.canonicalOrigin !== inventory.canonicalOrigin) {
    throw new Error("url_explorer_recrawl_identity_mismatch");
  }
  if (plan.source.afterInventoryFingerprint !== inventory.fingerprint) {
    throw new Error("url_explorer_recrawl_inventory_lineage_mismatch");
  }
  const inventoryUrls = new Set(inventory.inventory.entries.map((entry) => entry.canonicalUrl));
  for (const item of plan.items) {
    if (!inventoryUrls.has(item.canonicalUrl)) throw new Error("url_explorer_recrawl_selected_url_not_in_inventory");
    lookup.set(item.canonicalUrl, { status: "selected", priority: item.priority, reasons: [...item.reasons] });
  }
  for (const item of plan.deferred) {
    if (!inventoryUrls.has(item.canonicalUrl)) throw new Error("url_explorer_recrawl_deferred_url_not_in_inventory");
    if (lookup.has(item.canonicalUrl)) throw new Error("url_explorer_recrawl_url_overlap");
    lookup.set(item.canonicalUrl, { status: "deferred", priority: item.priority, reasons: [...item.reasons] });
  }
  return lookup;
}

function toItem(entry: SitemapInventoryEntry, lookup: Map<string, UrlExplorerItem["recrawl"]>): UrlExplorerItem {
  const parsed = new URL(entry.canonicalUrl);
  return {
    urlId: sha256(entry.canonicalUrl),
    canonicalUrl: entry.canonicalUrl,
    pathname: parsed.pathname,
    inventory: {
      member: true,
      sourceSitemaps: [...entry.sourceSitemaps],
      lastmod: entry.lastmod,
    },
    recrawl: lookup.get(entry.canonicalUrl) ?? { status: "not_planned", priority: null, reasons: [] },
    unavailablePerUrlDimensions: [...CRAWL_HISTORY_UNAVAILABLE_PER_URL_DIMENSIONS],
  };
}

function matchesFilters(item: UrlExplorerItem, filters: UrlExplorerFilters): boolean {
  if (filters.canonicalUrlPrefix !== undefined && !item.canonicalUrl.startsWith(filters.canonicalUrlPrefix)) return false;
  if (filters.pathnamePrefix !== undefined && !item.pathname.startsWith(filters.pathnamePrefix)) return false;
  if (filters.hasLastmod !== undefined && (item.inventory.lastmod !== null) !== filters.hasLastmod) return false;
  if (filters.sourceSitemap !== undefined && !item.inventory.sourceSitemaps.includes(filters.sourceSitemap)) return false;
  if (filters.recrawlStatus !== undefined && item.recrawl.status !== filters.recrawlStatus) return false;
  if (filters.recrawlPriority !== undefined && item.recrawl.priority !== filters.recrawlPriority) return false;
  if (filters.recrawlReason !== undefined && !item.recrawl.reasons.includes(filters.recrawlReason)) return false;
  return true;
}

function recrawlStatusRank(value: UrlExplorerRecrawlStatus): number {
  if (value === "selected") return 0;
  if (value === "deferred") return 1;
  return 2;
}

function recrawlPriorityRank(value: IncrementalRecrawlPriority | null): number {
  if (value === "p0_change") return 0;
  if (value === "p1_actionable") return 1;
  if (value === "p2_maintenance") return 2;
  return 3;
}

function compareNullableString(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}

function sortItems(items: UrlExplorerItem[], sort: NormalizedQuery["sort"]): UrlExplorerItem[] {
  const direction = sort.direction === "asc" ? 1 : -1;
  const compare = (a: UrlExplorerItem, b: UrlExplorerItem): number => {
    let primary = 0;
    if (sort.field === "canonical_url") primary = a.canonicalUrl.localeCompare(b.canonicalUrl);
    else if (sort.field === "pathname") primary = a.pathname.localeCompare(b.pathname);
    else if (sort.field === "lastmod") primary = compareNullableString(a.inventory.lastmod, b.inventory.lastmod);
    else if (sort.field === "recrawl_status") primary = recrawlStatusRank(a.recrawl.status) - recrawlStatusRank(b.recrawl.status);
    else primary = recrawlPriorityRank(a.recrawl.priority) - recrawlPriorityRank(b.recrawl.priority);
    return primary * direction || a.canonicalUrl.localeCompare(b.canonicalUrl);
  };
  return [...items].sort(compare);
}

function assertItemSemantics(item: UrlExplorerItem, origin: string): void {
  if (requireSha256(item.urlId, "url_explorer_item_id_invalid") !== sha256(item.canonicalUrl)) throw new Error("url_explorer_item_id_mismatch");
  if (normalizeCanonicalUrl(item.canonicalUrl, origin, "url_explorer_item_url_invalid") !== item.canonicalUrl) {
    throw new Error("url_explorer_item_url_not_canonical");
  }
  if (new URL(item.canonicalUrl).pathname !== item.pathname) throw new Error("url_explorer_item_pathname_mismatch");
  if (item.inventory.member !== true) throw new Error("url_explorer_item_inventory_membership_invalid");
  assertSortedUniqueStrings(item.inventory.sourceSitemaps, "url_explorer_item_sources");
  if (item.inventory.sourceSitemaps.length === 0) throw new Error("url_explorer_item_source_required");
  for (const source of item.inventory.sourceSitemaps) normalizeCanonicalUrl(source, origin, "url_explorer_item_source_invalid");
  assertNormalizedLastmod(item.inventory.lastmod);
  if (!URL_EXPLORER_RECRAWL_STATUSES.includes(item.recrawl.status)) throw new Error("url_explorer_item_recrawl_status_invalid");
  if (item.recrawl.status === "not_planned") {
    if (item.recrawl.priority !== null || item.recrawl.reasons.length !== 0) throw new Error("url_explorer_item_recrawl_not_planned_invalid");
  } else {
    if (item.recrawl.priority === null || !RECRAWL_PRIORITIES.includes(item.recrawl.priority)) throw new Error("url_explorer_item_recrawl_priority_invalid");
    if (item.recrawl.reasons.length === 0 || new Set(item.recrawl.reasons).size !== item.recrawl.reasons.length) {
      throw new Error("url_explorer_item_recrawl_reasons_invalid");
    }
    for (const reason of item.recrawl.reasons) {
      if (!INCREMENTAL_RECRAWL_REASONS.includes(reason)) throw new Error("url_explorer_item_recrawl_reason_invalid");
    }
  }
  if (stableSerialize(item.unavailablePerUrlDimensions) !== stableSerialize([...CRAWL_HISTORY_UNAVAILABLE_PER_URL_DIMENSIONS])) {
    throw new Error("url_explorer_item_unavailable_dimensions_invalid");
  }
}

export function queryUrlExplorer(input: {
  inventory: SitemapInventoryResult;
  recrawlPlan?: IncrementalRecrawlPlan;
  query?: UrlExplorerQuery;
}): UrlExplorerResult {
  assertSitemapInventoryIntegrity(input.inventory);
  const inventory = input.inventory;
  const origin = inventory.canonicalOrigin;
  const normalized = normalizeQuery(input.query, origin);
  const lookup = recrawlLookup(input.recrawlPlan, inventory);
  const recrawlPlanFingerprint = input.recrawlPlan?.fingerprint ?? null;
  const fingerprint = queryFingerprint({
    siteId: inventory.siteId,
    canonicalOrigin: origin,
    inventoryFingerprint: inventory.fingerprint,
    recrawlPlanFingerprint,
    filters: normalized.filters,
    sort: normalized.sort,
    limit: normalized.limit,
  });
  const offset = normalized.cursor ? decodeCursor(normalized.cursor, fingerprint) : 0;
  const matching = sortItems(
    inventory.inventory.entries.map((entry) => toItem(entry, lookup)).filter((item) => matchesFilters(item, normalized.filters)),
    normalized.sort,
  );
  if (offset > matching.length) throw new Error("url_explorer_cursor_offset_out_of_range");
  const items = matching.slice(offset, offset + normalized.limit);
  const nextOffset = offset + items.length;
  const hasMore = nextOffset < matching.length;
  const nextCursor = hasMore ? encodeCursor(nextOffset, fingerprint) : null;

  const withoutFingerprint: Omit<UrlExplorerResult, "fingerprint"> = {
    version: "first_party_url_explorer_result_v1",
    siteId: inventory.siteId,
    canonicalOrigin: origin,
    source: {
      inventoryFingerprint: inventory.fingerprint,
      inventoryUniqueUrls: inventory.inventory.uniqueUrls,
      inventoryComplete: inventory.completeness.complete,
      inventoryHardLimitReached: inventory.completeness.hardLimitReached,
      recrawlPlanFingerprint,
    },
    query: {
      filters: normalized.filters,
      sort: normalized.sort,
      limit: normalized.limit,
      fingerprint,
    },
    page: {
      offset,
      returned: items.length,
      totalMatched: matching.length,
      hasMore,
      nextCursor,
    },
    capabilities: {
      retainedPerUrlDimensions: RETAINED_DIMENSIONS,
      unavailablePerUrlDimensions: [...CRAWL_HISTORY_UNAVAILABLE_PER_URL_DIMENSIONS],
      reason: "upstream_p2_1_to_p2_6_do_not_retain_per_url_fetch_or_content_outcomes",
    },
    authorization: authorizationBoundary(),
    items,
  };
  return { ...withoutFingerprint, fingerprint: sha256(withoutFingerprint) };
}

export function assertUrlExplorerResultIntegrity(result: UrlExplorerResult): void {
  if (result.version !== "first_party_url_explorer_result_v1") throw new Error("url_explorer_result_version_invalid");
  if (!result.siteId.trim()) throw new Error("url_explorer_result_site_id_invalid");
  if (normalizeOrigin(result.canonicalOrigin) !== result.canonicalOrigin) throw new Error("url_explorer_result_origin_invalid");
  requireSha256(result.source.inventoryFingerprint, "url_explorer_result_source_fingerprint_invalid");
  if (result.source.recrawlPlanFingerprint !== null) requireSha256(result.source.recrawlPlanFingerprint, "url_explorer_result_source_fingerprint_invalid");
  requireInteger(result.source.inventoryUniqueUrls, 0, URL_EXPLORER_LIMITS.resultUrls, "url_explorer_result_inventory_count_invalid");
  if (typeof result.source.inventoryComplete !== "boolean" || typeof result.source.inventoryHardLimitReached !== "boolean") {
    throw new Error("url_explorer_result_inventory_state_invalid");
  }
  if (!allFalse(result.authorization as unknown as Record<string, boolean>)) throw new Error("url_explorer_result_authorization_must_be_closed");
  if (stableSerialize(result.capabilities.retainedPerUrlDimensions) !== stableSerialize(RETAINED_DIMENSIONS)) {
    throw new Error("url_explorer_result_retained_dimensions_invalid");
  }
  if (stableSerialize(result.capabilities.unavailablePerUrlDimensions) !== stableSerialize([...CRAWL_HISTORY_UNAVAILABLE_PER_URL_DIMENSIONS])) {
    throw new Error("url_explorer_result_unavailable_dimensions_invalid");
  }

  const normalizedFilters = normalizeFilters(result.query.filters, result.canonicalOrigin);
  if (stableSerialize(normalizedFilters) !== stableSerialize(result.query.filters)) throw new Error("url_explorer_result_filters_not_normalized");
  if (!URL_EXPLORER_SORT_FIELDS.includes(result.query.sort.field) || (result.query.sort.direction !== "asc" && result.query.sort.direction !== "desc")) {
    throw new Error("url_explorer_result_sort_invalid");
  }
  requireInteger(result.query.limit, 1, URL_EXPLORER_LIMITS.pageSize, "url_explorer_result_limit_invalid");
  const expectedQueryFingerprint = queryFingerprint({
    siteId: result.siteId,
    canonicalOrigin: result.canonicalOrigin,
    inventoryFingerprint: result.source.inventoryFingerprint,
    recrawlPlanFingerprint: result.source.recrawlPlanFingerprint,
    filters: result.query.filters,
    sort: result.query.sort,
    limit: result.query.limit,
  });
  if (result.query.fingerprint !== expectedQueryFingerprint) throw new Error("url_explorer_result_query_fingerprint_mismatch");

  requireInteger(result.page.offset, 0, URL_EXPLORER_LIMITS.resultUrls, "url_explorer_result_page_offset_invalid");
  requireInteger(result.page.returned, 0, result.query.limit, "url_explorer_result_page_returned_invalid");
  requireInteger(result.page.totalMatched, 0, result.source.inventoryUniqueUrls, "url_explorer_result_total_matched_invalid");
  if (result.page.returned !== result.items.length || result.page.offset + result.page.returned > result.page.totalMatched) {
    throw new Error("url_explorer_result_page_accounting_mismatch");
  }
  const expectedHasMore = result.page.offset + result.page.returned < result.page.totalMatched;
  if (result.page.hasMore !== expectedHasMore) throw new Error("url_explorer_result_has_more_mismatch");
  if (expectedHasMore) {
    if (!result.page.nextCursor) throw new Error("url_explorer_result_next_cursor_required");
    const nextOffset = decodeCursor(result.page.nextCursor, result.query.fingerprint);
    if (nextOffset !== result.page.offset + result.page.returned) throw new Error("url_explorer_result_next_cursor_offset_mismatch");
  } else if (result.page.nextCursor !== null) {
    throw new Error("url_explorer_result_next_cursor_unexpected");
  }

  const urls = result.items.map((item) => item.canonicalUrl);
  if (new Set(urls).size !== urls.length) throw new Error("url_explorer_result_duplicate_item");
  for (const item of result.items) {
    assertItemSemantics(item, result.canonicalOrigin);
    if (!matchesFilters(item, result.query.filters)) throw new Error("url_explorer_result_item_filter_mismatch");
  }
  if (stableSerialize(sortItems(result.items, result.query.sort)) !== stableSerialize(result.items)) {
    throw new Error("url_explorer_result_item_order_invalid");
  }

  const { fingerprint: actual, ...withoutFingerprint } = result;
  requireSha256(actual, "url_explorer_result_fingerprint_invalid");
  if (actual !== sha256(withoutFingerprint)) throw new Error("url_explorer_result_fingerprint_mismatch");
}
