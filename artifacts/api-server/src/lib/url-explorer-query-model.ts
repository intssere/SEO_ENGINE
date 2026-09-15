import { createHash } from "node:crypto";
import type { SitemapInventoryEntry, SitemapInventoryResult } from "./sitemap-inventory.js";
import {
  assertIncrementalRecrawlPlanIntegrity,
  INCREMENTAL_RECRAWL_REASONS,
  type IncrementalRecrawlPlan,
  type IncrementalRecrawlPriority,
  type IncrementalRecrawlReason,
} from "./incremental-recrawl-planner.js";

export const URL_EXPLORER_ABSOLUTE_LIMITS = Object.freeze({
  pageSize: 500,
  offset: 25_000,
  textLength: 2_048,
} as const);

export const URL_EXPLORER_UNAVAILABLE_PER_URL_DIMENSIONS = Object.freeze([
  "httpStatus",
  "fetchOutcome",
  "redirectTarget",
  "canonicalTarget",
  "indexability",
  "contentFingerprint",
] as const);

export type UrlExplorerUnavailableDimension = typeof URL_EXPLORER_UNAVAILABLE_PER_URL_DIMENSIONS[number];
export type UrlExplorerRecrawlStatus = "selected" | "deferred" | "not_planned";
export type UrlExplorerSortField = "canonicalUrl" | "pathname" | "lastmod" | "recrawlStatus" | "recrawlPriority";
export type UrlExplorerSortDirection = "asc" | "desc";

export type UrlExplorerQuery = {
  text?: string;
  pathPrefix?: string;
  lastmod?: "any" | "present" | "absent";
  sitemapSource?: string;
  recrawlStatus?: UrlExplorerRecrawlStatus | "any";
  recrawlPriority?: IncrementalRecrawlPriority | "any";
  recrawlReason?: IncrementalRecrawlReason | "any";
  sort?: { field: UrlExplorerSortField; direction: UrlExplorerSortDirection };
  page?: { offset: number; limit: number };
};

export type UrlExplorerRow = {
  urlId: string;
  canonicalUrl: string;
  pathname: string;
  sourceSitemaps: string[];
  lastmod: string | null;
  recrawl: {
    status: UrlExplorerRecrawlStatus;
    priority: IncrementalRecrawlPriority | null;
    reasons: IncrementalRecrawlReason[];
  };
  unavailable: Record<UrlExplorerUnavailableDimension, true>;
};

export type UrlExplorerAuthorization = {
  networkExecutionEnabled: false;
  crawlExecutionAuthorized: false;
  sitemapNetworkFetchingEnabled: false;
  persistenceAuthorized: false;
  schedulerEnabled: false;
  workerEnabled: false;
  providerReadsAuthorized: false;
  providerWrites: false;
  competitorCollectionAuthorized: false;
  competitorPersistenceAuthorized: false;
  publicSiteWrites: false;
};

export type UrlExplorerResult = {
  version: "first_party_url_explorer_query_v1";
  siteId: string;
  canonicalOrigin: string;
  source: {
    inventoryFingerprint: string;
    recrawlPlanFingerprint: string | null;
  };
  query: Required<Pick<UrlExplorerQuery, "lastmod" | "recrawlStatus" | "recrawlPriority" | "recrawlReason">> & {
    text: string | null;
    pathPrefix: string | null;
    sitemapSource: string | null;
    sort: { field: UrlExplorerSortField; direction: UrlExplorerSortDirection };
    page: { offset: number; limit: number };
  };
  queryFingerprint: string;
  rows: UrlExplorerRow[];
  page: {
    offset: number;
    limit: number;
    returned: number;
    totalMatched: number;
    hasMore: boolean;
  };
  capabilities: {
    retainedPerUrlDimensions: ["canonicalUrl", "pathname", "sourceSitemaps", "lastmod", "recrawl"];
    unavailablePerUrlDimensions: UrlExplorerUnavailableDimension[];
    reason: "upstream_p2_1_to_p2_6_do_not_retain_per_url_fetch_redirect_indexability_or_content_outcomes";
  };
  authorization: UrlExplorerAuthorization;
  fingerprint: string;
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
    workerEnabled: false,
    providerReadsAuthorized: false,
    providerWrites: false,
    competitorCollectionAuthorized: false,
    competitorPersistenceAuthorized: false,
    publicSiteWrites: false,
  };
}

function normalizeOrigin(value: string): string {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("url_explorer_origin_invalid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") {
    throw new Error("url_explorer_origin_invalid");
  }
  return parsed.origin;
}

function normalizeCanonicalUrl(value: string, canonicalOrigin: string): { canonicalUrl: string; pathname: string } {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("url_explorer_inventory_url_invalid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("url_explorer_inventory_url_invalid");
  if (parsed.origin !== canonicalOrigin) throw new Error("url_explorer_inventory_cross_origin_denied");
  if (parsed.search || parsed.hash) throw new Error("url_explorer_inventory_query_or_fragment_denied");
  parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/");
  const canonicalUrl = parsed.pathname === "/" ? canonicalOrigin : `${canonicalOrigin}${parsed.pathname.replace(/\/$/, "")}`;
  if (canonicalUrl !== value) throw new Error("url_explorer_inventory_url_not_canonical");
  return { canonicalUrl, pathname: parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/$/, "") };
}

function requireClosedInventoryAuthorization(inventory: SitemapInventoryResult): void {
  if (!allFalse(inventory.authorization as unknown as Record<string, boolean>)) {
    throw new Error("url_explorer_inventory_authorization_must_be_closed");
  }
}

function assertInventoryIntegrity(inventory: SitemapInventoryResult, expectedSiteId: string, expectedOrigin: string): void {
  if (inventory.version !== "first_party_sitemap_inventory_v1") throw new Error("url_explorer_inventory_version_invalid");
  if (!expectedSiteId.trim() || inventory.siteId !== expectedSiteId) throw new Error("url_explorer_inventory_site_identity_mismatch");
  const origin = normalizeOrigin(expectedOrigin);
  if (inventory.canonicalOrigin !== origin) throw new Error("url_explorer_inventory_origin_identity_mismatch");
  if (!inventory.completeness.complete || inventory.completeness.hardLimitReached || inventory.completeness.reasons.length !== 0) {
    throw new Error("url_explorer_inventory_must_be_complete");
  }
  requireClosedInventoryAuthorization(inventory);
  if (inventory.inventory.uniqueUrls !== inventory.inventory.entries.length) throw new Error("url_explorer_inventory_count_mismatch");
  const seen = new Set<string>();
  for (const entry of inventory.inventory.entries) {
    normalizeCanonicalUrl(entry.canonicalUrl, origin);
    if (seen.has(entry.canonicalUrl)) throw new Error("url_explorer_inventory_duplicate_url");
    seen.add(entry.canonicalUrl);
    if (new Set(entry.sourceSitemaps).size !== entry.sourceSitemaps.length) throw new Error("url_explorer_inventory_duplicate_sitemap_source");
    if ([...entry.sourceSitemaps].sort().join("\n") !== entry.sourceSitemaps.join("\n")) throw new Error("url_explorer_inventory_sitemap_sources_not_sorted");
    for (const source of entry.sourceSitemaps) {
      let parsed: URL;
      try { parsed = new URL(source); } catch { throw new Error("url_explorer_inventory_sitemap_source_invalid"); }
      if (parsed.origin !== origin || parsed.username || parsed.password || parsed.search || parsed.hash) {
        throw new Error("url_explorer_inventory_sitemap_source_invalid");
      }
    }
  }
  const { fingerprint, ...withoutFingerprint } = inventory;
  if (!/^[a-f0-9]{64}$/.test(fingerprint) || fingerprint !== sha256(withoutFingerprint)) {
    throw new Error("url_explorer_inventory_fingerprint_mismatch");
  }
}

function normalizeOptionalText(value: string | undefined, code: string): string | null {
  if (value === undefined) return null;
  if (typeof value !== "string") throw new Error(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > URL_EXPLORER_ABSOLUTE_LIMITS.textLength || /[\u0000-\u001f\u007f]/.test(normalized)) throw new Error(code);
  return normalized;
}

function normalizePathPrefix(value: string | undefined): string | null {
  const normalized = normalizeOptionalText(value, "url_explorer_path_prefix_invalid");
  if (normalized === null) return null;
  if (!normalized.startsWith("/") || normalized.includes("?") || normalized.includes("#") || normalized.includes("\\") || normalized.includes("//")) {
    throw new Error("url_explorer_path_prefix_invalid");
  }
  return normalized;
}

function normalizeSitemapSource(value: string | undefined, origin: string): string | null {
  const normalized = normalizeOptionalText(value, "url_explorer_sitemap_source_invalid");
  if (normalized === null) return null;
  let parsed: URL;
  try { parsed = new URL(normalized); } catch { throw new Error("url_explorer_sitemap_source_invalid"); }
  if (parsed.origin !== origin || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("url_explorer_sitemap_source_invalid");
  return parsed.toString();
}

function assertEnum<T extends string>(value: string, allowed: readonly T[], code: string): T {
  if (!(allowed as readonly string[]).includes(value)) throw new Error(code);
  return value as T;
}

function normalizeQuery(query: UrlExplorerQuery | undefined, canonicalOrigin: string): UrlExplorerResult["query"] {
  const input = query ?? {};
  const lastmod = assertEnum(input.lastmod ?? "any", ["any", "present", "absent"] as const, "url_explorer_lastmod_filter_invalid");
  const recrawlStatus = assertEnum(input.recrawlStatus ?? "any", ["any", "selected", "deferred", "not_planned"] as const, "url_explorer_recrawl_status_invalid");
  const recrawlPriority = assertEnum(input.recrawlPriority ?? "any", ["any", "p0_change", "p1_actionable", "p2_maintenance"] as const, "url_explorer_recrawl_priority_invalid");
  const recrawlReason = assertEnum(input.recrawlReason ?? "any", ["any", ...INCREMENTAL_RECRAWL_REASONS] as const, "url_explorer_recrawl_reason_invalid");
  const field = assertEnum(input.sort?.field ?? "canonicalUrl", ["canonicalUrl", "pathname", "lastmod", "recrawlStatus", "recrawlPriority"] as const, "url_explorer_sort_field_invalid");
  const direction = assertEnum(input.sort?.direction ?? "asc", ["asc", "desc"] as const, "url_explorer_sort_direction_invalid");
  const offset = input.page?.offset ?? 0;
  const limit = input.page?.limit ?? 100;
  if (!Number.isInteger(offset) || offset < 0 || offset > URL_EXPLORER_ABSOLUTE_LIMITS.offset) throw new Error("url_explorer_offset_invalid");
  if (!Number.isInteger(limit) || limit < 1 || limit > URL_EXPLORER_ABSOLUTE_LIMITS.pageSize) throw new Error("url_explorer_limit_invalid");
  return {
    text: normalizeOptionalText(input.text, "url_explorer_text_invalid"),
    pathPrefix: normalizePathPrefix(input.pathPrefix),
    sitemapSource: normalizeSitemapSource(input.sitemapSource, canonicalOrigin),
    lastmod,
    recrawlStatus,
    recrawlPriority,
    recrawlReason,
    sort: { field, direction },
    page: { offset, limit },
  };
}

function unavailableDimensions(): Record<UrlExplorerUnavailableDimension, true> {
  return Object.fromEntries(URL_EXPLORER_UNAVAILABLE_PER_URL_DIMENSIONS.map((key) => [key, true])) as Record<UrlExplorerUnavailableDimension, true>;
}

function recrawlLookup(plan: IncrementalRecrawlPlan | undefined, inventory: SitemapInventoryResult): Map<string, UrlExplorerRow["recrawl"]> {
  const lookup = new Map<string, UrlExplorerRow["recrawl"]>();
  if (!plan) return lookup;
  assertIncrementalRecrawlPlanIntegrity(plan);
  if (plan.siteId !== inventory.siteId || plan.canonicalOrigin !== inventory.canonicalOrigin) throw new Error("url_explorer_recrawl_identity_mismatch");
  if (plan.source.afterInventoryFingerprint !== inventory.fingerprint) throw new Error("url_explorer_recrawl_inventory_lineage_mismatch");
  for (const item of plan.items) lookup.set(item.canonicalUrl, { status: "selected", priority: item.priority, reasons: [...item.reasons] });
  for (const item of plan.deferred) {
    if (lookup.has(item.canonicalUrl)) throw new Error("url_explorer_recrawl_selected_deferred_overlap");
    lookup.set(item.canonicalUrl, { status: "deferred", priority: item.priority, reasons: [...item.reasons] });
  }
  return lookup;
}

function rowFor(entry: SitemapInventoryEntry, origin: string, recrawl: Map<string, UrlExplorerRow["recrawl"]>): UrlExplorerRow {
  const normalized = normalizeCanonicalUrl(entry.canonicalUrl, origin);
  return {
    urlId: sha256({ canonicalUrl: normalized.canonicalUrl }),
    canonicalUrl: normalized.canonicalUrl,
    pathname: normalized.pathname,
    sourceSitemaps: [...entry.sourceSitemaps],
    lastmod: entry.lastmod,
    recrawl: recrawl.get(entry.canonicalUrl) ?? { status: "not_planned", priority: null, reasons: [] },
    unavailable: unavailableDimensions(),
  };
}

const PRIORITY_RANK: Record<IncrementalRecrawlPriority, number> = { p0_change: 0, p1_actionable: 1, p2_maintenance: 2 };
const STATUS_RANK: Record<UrlExplorerRecrawlStatus, number> = { selected: 0, deferred: 1, not_planned: 2 };

function compareRows(a: UrlExplorerRow, b: UrlExplorerRow, field: UrlExplorerSortField): number {
  if (field === "canonicalUrl") return a.canonicalUrl.localeCompare(b.canonicalUrl);
  if (field === "pathname") return a.pathname.localeCompare(b.pathname);
  if (field === "lastmod") return (a.lastmod ?? "\uffff").localeCompare(b.lastmod ?? "\uffff");
  if (field === "recrawlStatus") return STATUS_RANK[a.recrawl.status] - STATUS_RANK[b.recrawl.status];
  const ar = a.recrawl.priority ? PRIORITY_RANK[a.recrawl.priority] : 999;
  const br = b.recrawl.priority ? PRIORITY_RANK[b.recrawl.priority] : 999;
  return ar - br;
}

function matches(row: UrlExplorerRow, query: UrlExplorerResult["query"]): boolean {
  if (query.text) {
    const needle = query.text.toLocaleLowerCase("en-US");
    if (!row.canonicalUrl.toLocaleLowerCase("en-US").includes(needle) && !row.pathname.toLocaleLowerCase("en-US").includes(needle)) return false;
  }
  if (query.pathPrefix && !row.pathname.startsWith(query.pathPrefix)) return false;
  if (query.lastmod === "present" && row.lastmod === null) return false;
  if (query.lastmod === "absent" && row.lastmod !== null) return false;
  if (query.sitemapSource && !row.sourceSitemaps.includes(query.sitemapSource)) return false;
  if (query.recrawlStatus !== "any" && row.recrawl.status !== query.recrawlStatus) return false;
  if (query.recrawlPriority !== "any" && row.recrawl.priority !== query.recrawlPriority) return false;
  if (query.recrawlReason !== "any" && !row.recrawl.reasons.includes(query.recrawlReason)) return false;
  return true;
}

export function queryUrlExplorer(input: {
  siteId: string;
  canonicalOrigin: string;
  inventory: SitemapInventoryResult;
  recrawlPlan?: IncrementalRecrawlPlan;
  query?: UrlExplorerQuery;
}): UrlExplorerResult {
  assertInventoryIntegrity(input.inventory, input.siteId, input.canonicalOrigin);
  const query = normalizeQuery(input.query, input.inventory.canonicalOrigin);
  const recrawl = recrawlLookup(input.recrawlPlan, input.inventory);
  const rows = input.inventory.inventory.entries.map((entry) => rowFor(entry, input.inventory.canonicalOrigin, recrawl));
  const filtered = rows.filter((row) => matches(row, query));
  filtered.sort((a, b) => {
    const primary = compareRows(a, b, query.sort.field);
    const directed = query.sort.direction === "asc" ? primary : -primary;
    return directed || a.canonicalUrl.localeCompare(b.canonicalUrl);
  });
  const pageRows = filtered.slice(query.page.offset, query.page.offset + query.page.limit);
  const withoutFingerprint: Omit<UrlExplorerResult, "fingerprint"> = {
    version: "first_party_url_explorer_query_v1",
    siteId: input.inventory.siteId,
    canonicalOrigin: input.inventory.canonicalOrigin,
    source: {
      inventoryFingerprint: input.inventory.fingerprint,
      recrawlPlanFingerprint: input.recrawlPlan?.fingerprint ?? null,
    },
    query,
    queryFingerprint: sha256(query),
    rows: pageRows,
    page: {
      offset: query.page.offset,
      limit: query.page.limit,
      returned: pageRows.length,
      totalMatched: filtered.length,
      hasMore: query.page.offset + pageRows.length < filtered.length,
    },
    capabilities: {
      retainedPerUrlDimensions: ["canonicalUrl", "pathname", "sourceSitemaps", "lastmod", "recrawl"],
      unavailablePerUrlDimensions: [...URL_EXPLORER_UNAVAILABLE_PER_URL_DIMENSIONS],
      reason: "upstream_p2_1_to_p2_6_do_not_retain_per_url_fetch_redirect_indexability_or_content_outcomes",
    },
    authorization: authorizationBoundary(),
  };
  return { ...withoutFingerprint, fingerprint: sha256(withoutFingerprint) };
}
