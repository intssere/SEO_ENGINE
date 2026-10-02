import {
  assertUniversalReadOnlySiteAnalysisIntegrity,
  type UniversalReadOnlySiteAnalysis,
} from "./universal-read-only-site-analysis.js";
import {
  stableEvidenceHash,
  type SearchMarket,
} from "./keyword-serp-evidence-contract.js";

export const UGP_SITE_OWNERSHIP_EVIDENCE_VERSION =
  "ugp-6-3a-site-ownership-evidence-v1" as const;

export const UGP_SITE_OWNERSHIP_EVIDENCE_POLICY = Object.freeze({
  maxPages: 10_000,
  maxQueryPageObservations: 10_000,
  maxQueryLength: 512,
  maxSourceIdLength: 160,
  maxPosition: 10_000,
} as const);

export type SiteOwnershipQueryPageObservation = Readonly<{
  query: string;
  pageUrl: string;
  market: SearchMarket;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  sourceId: string;
  sourceFingerprint: string;
}>;

export type SiteOwnershipPageEvidence = Readonly<{
  url: string;
  pageId: string;
  crawlEvidence: Readonly<{
    availability: "observed" | "not_observed";
    analysisPageId: string | null;
    evidenceId: string | null;
    pageFingerprint: string | null;
    sourceFingerprint: string | null;
    outcome:
      | "success"
      | "redirect"
      | "http_error"
      | "failure"
      | "robots_excluded"
      | null;
    indexability:
      | "indexable"
      | "noindex"
      | "http_not_indexable"
      | "unavailable"
      | null;
    canonicalUrl: string | null;
    canonicalState:
      | "self"
      | "same_origin_other"
      | "external"
      | "missing"
      | "unavailable"
      | null;
    title: string | null;
    h1: string | null;
    headings: readonly string[];
    contentFingerprint: string | null;
  }>;
  queryCount: number;
  queryPerformanceFingerprint: string | null;
  pageEvidenceFingerprint: string;
}>;

export type SiteOwnershipQueryPageEvidence = Readonly<{
  query: string;
  pageUrl: string;
  pageId: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  sourceId: string;
  sourceFingerprint: string;
  evidenceFingerprint: string;
}>;

export type SiteOwnershipEvidence = Readonly<{
  version: typeof UGP_SITE_OWNERSHIP_EVIDENCE_VERSION;
  site: Readonly<{
    canonicalOrigin: string;
    siteFingerprint: string;
  }>;
  market: SearchMarket;
  policy: typeof UGP_SITE_OWNERSHIP_EVIDENCE_POLICY;
  provenance: Readonly<{
    universalReadAnalysisFingerprint: string;
    universalReadAnalysisCoverage: "observed_inventory_complete" | "partial";
    wholeSiteCertified: false;
    queryPageEvidenceAvailability: "available" | "not_supplied";
    queryPageEvidenceSources: readonly Readonly<{
      sourceId: string;
      sourceFingerprint: string;
    }>[];
  }>;
  pages: readonly SiteOwnershipPageEvidence[];
  queryPageEvidence: readonly SiteOwnershipQueryPageEvidence[];
  missingEvidence: readonly (
    | "query_page_performance_not_supplied"
    | "crawl_inventory_partial"
    | "whole_site_not_independently_certified"
  )[];
  semantics: Readonly<{
    readOnly: true;
    deterministic: true;
    grantsAuthorization: false;
    grantsProviderWrite: false;
    grantsPublicSiteWrite: false;
    performsNetworkOperation: false;
    performsPersistence: false;
  }>;
  evidenceFingerprint: string;
}>;

const SEMANTICS = Object.freeze({
  readOnly: true as const,
  deterministic: true as const,
  grantsAuthorization: false as const,
  grantsProviderWrite: false as const,
  grantsPublicSiteWrite: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
});

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("ugp_site_ownership_invalid_" + field);
  }
  return value;
}

function exactText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new Error("ugp_site_ownership_invalid_" + field);
  }
  const normalized = value.normalize("NFKC").trim();
  if (
    normalized.length < 1
    || normalized.length > maxLength
    || /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new Error("ugp_site_ownership_invalid_" + field);
  }
  return normalized;
}

function exactQuery(value: unknown): string {
  return exactText(
    value,
    "query",
    UGP_SITE_OWNERSHIP_EVIDENCE_POLICY.maxQueryLength,
  ).toLocaleLowerCase("en-US");
}

function exactSourceId(value: unknown): string {
  return exactText(
    value,
    "source_id",
    UGP_SITE_OWNERSHIP_EVIDENCE_POLICY.maxSourceIdLength,
  );
}

function exactMarket(market: SearchMarket): SearchMarket {
  if (!market || typeof market !== "object" || Array.isArray(market)) {
    throw new Error("ugp_site_ownership_invalid_market");
  }
  if (market.searchEngine !== "google") {
    throw new Error("ugp_site_ownership_invalid_search_engine");
  }
  if (!Number.isSafeInteger(market.locationCode) || market.locationCode < 1) {
    throw new Error("ugp_site_ownership_invalid_location_code");
  }
  if (!/^[a-z]{2,8}(-[A-Z]{2})?$/.test(market.languageCode)) {
    throw new Error("ugp_site_ownership_invalid_language_code");
  }
  if (market.device !== "desktop" && market.device !== "mobile") {
    throw new Error("ugp_site_ownership_invalid_device");
  }
  return Object.freeze({ ...market });
}

function marketKey(market: SearchMarket): string {
  return [
    market.searchEngine,
    String(market.locationCode),
    market.languageCode,
    market.device,
  ].join("|");
}

function canonicalOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("ugp_site_ownership_invalid_origin");
  }
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.search
    || url.hash
    || url.pathname !== "/"
  ) {
    throw new Error("ugp_site_ownership_invalid_origin");
  }
  return url.origin;
}

function canonicalPageUrl(value: unknown, origin: string): string {
  if (typeof value !== "string") {
    throw new Error("ugp_site_ownership_invalid_page_url");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("ugp_site_ownership_invalid_page_url");
  }
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.origin !== origin
    || url.search
    || url.hash
  ) {
    throw new Error("ugp_site_ownership_invalid_page_url");
  }
  url.pathname = url.pathname.replace(/\/{2,}/g, "/");
  const pathname =
    url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
  return pathname === "/" ? origin + "/" : origin + pathname;
}

function boundedNumber(
  value: unknown,
  min: number,
  max: number,
  field: string,
): number {
  if (
    typeof value !== "number"
    || !Number.isFinite(value)
    || value < min
    || value > max
  ) {
    throw new Error("ugp_site_ownership_invalid_" + field);
  }
  return value;
}

function pageId(url: string): string {
  return "ugp-owner-page-" + stableEvidenceHash({
    purpose: "ugp_site_ownership_page_id",
    url,
  }).slice(0, 24);
}

function normalizeObservation(input: {
  observation: SiteOwnershipQueryPageObservation;
  origin: string;
  market: SearchMarket;
}): SiteOwnershipQueryPageEvidence {
  const observation = input.observation;
  if (
    !observation
    || typeof observation !== "object"
    || Array.isArray(observation)
  ) {
    throw new Error("ugp_site_ownership_invalid_query_page_observation");
  }
  const query = exactQuery(observation.query);
  const pageUrl = canonicalPageUrl(observation.pageUrl, input.origin);
  const market = exactMarket(observation.market);
  if (marketKey(market) !== marketKey(input.market)) {
    throw new Error("ugp_site_ownership_mixed_market");
  }
  const clicks = boundedNumber(
    observation.clicks,
    0,
    1_000_000_000_000_000,
    "clicks",
  );
  const impressions = boundedNumber(
    observation.impressions,
    0,
    1_000_000_000_000_000,
    "impressions",
  );
  if (clicks > impressions) {
    throw new Error("ugp_site_ownership_clicks_exceed_impressions");
  }
  const ctr = boundedNumber(observation.ctr, 0, 1, "ctr");
  const position = boundedNumber(
    observation.position,
    0,
    UGP_SITE_OWNERSHIP_EVIDENCE_POLICY.maxPosition,
    "position",
  );
  const sourceId = exactSourceId(observation.sourceId);
  const sourceFingerprint = exactFingerprint(
    observation.sourceFingerprint,
    "source_fingerprint",
  );
  const base = {
    query,
    pageUrl,
    pageId: pageId(pageUrl),
    clicks,
    impressions,
    ctr,
    position,
    sourceId,
    sourceFingerprint,
  };
  return Object.freeze({
    ...base,
    evidenceFingerprint: stableEvidenceHash({
      purpose: "ugp_site_ownership_query_page_evidence",
      version: UGP_SITE_OWNERSHIP_EVIDENCE_VERSION,
      market,
      ...base,
    }),
  });
}

function crawlEvidenceFor(
  page: UniversalReadOnlySiteAnalysis["pages"][number] | undefined,
): SiteOwnershipPageEvidence["crawlEvidence"] {
  if (!page) {
    return Object.freeze({
      availability: "not_observed" as const,
      analysisPageId: null,
      evidenceId: null,
      pageFingerprint: null,
      sourceFingerprint: null,
      outcome: null,
      indexability: null,
      canonicalUrl: null,
      canonicalState: null,
      title: null,
      h1: null,
      headings: Object.freeze([]),
      contentFingerprint: null,
    });
  }
  return Object.freeze({
    availability: "observed" as const,
    analysisPageId: page.pageId,
    evidenceId: page.evidenceId,
    pageFingerprint: page.pageFingerprint,
    sourceFingerprint: page.sourceFingerprint,
    outcome: page.outcome,
    indexability: page.indexability.state,
    canonicalUrl: page.canonical.value,
    canonicalState: page.canonical.state,
    title: page.metadata.title,
    h1: page.metadata.h1,
    headings: Object.freeze([...page.metadata.headings]),
    contentFingerprint: page.content.contentFingerprint,
  });
}

export function buildSiteOwnershipEvidence(input: {
  analysis: UniversalReadOnlySiteAnalysis;
  market: SearchMarket;
  queryPageObservations?: readonly SiteOwnershipQueryPageObservation[];
}): SiteOwnershipEvidence {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_site_ownership_invalid_input");
  }

  assertUniversalReadOnlySiteAnalysisIntegrity(input.analysis);
  const origin = canonicalOrigin(input.analysis.site.canonicalOrigin);
  const market = exactMarket(input.market);
  const suppliedObservations = input.queryPageObservations ?? [];
  if (
    !Array.isArray(suppliedObservations)
    || suppliedObservations.length
      > UGP_SITE_OWNERSHIP_EVIDENCE_POLICY.maxQueryPageObservations
  ) {
    throw new Error("ugp_site_ownership_query_page_observation_limit");
  }
  if (
    input.analysis.pages.length
      > UGP_SITE_OWNERSHIP_EVIDENCE_POLICY.maxPages
  ) {
    throw new Error("ugp_site_ownership_page_limit");
  }

  const normalizedRows = suppliedObservations.map((observation) =>
    normalizeObservation({ observation, origin, market }),
  );
  normalizedRows.sort((a, b) =>
    a.query.localeCompare(b.query)
    || a.pageUrl.localeCompare(b.pageUrl)
    || a.sourceId.localeCompare(b.sourceId)
    || a.sourceFingerprint.localeCompare(b.sourceFingerprint),
  );

  const duplicateKeys = new Set<string>();
  for (const row of normalizedRows) {
    const key = [
      row.query,
      row.pageUrl,
      row.sourceId,
      row.sourceFingerprint,
    ].join("\u0001");
    if (duplicateKeys.has(key)) {
      throw new Error("ugp_site_ownership_duplicate_query_page_evidence");
    }
    duplicateKeys.add(key);
  }

  const analysisPages = new Map(
    input.analysis.pages.map((page) => [
      canonicalPageUrl(page.url, origin),
      page,
    ] as const),
  );
  const allUrls = new Set<string>(analysisPages.keys());
  for (const row of normalizedRows) allUrls.add(row.pageUrl);

  const rowsByPage = new Map<string, SiteOwnershipQueryPageEvidence[]>();
  for (const row of normalizedRows) {
    const existing = rowsByPage.get(row.pageUrl) ?? [];
    existing.push(row);
    rowsByPage.set(row.pageUrl, existing);
  }

  const pages = [...allUrls]
    .sort((a, b) => a.localeCompare(b))
    .map((url): SiteOwnershipPageEvidence => {
      const queryRows = rowsByPage.get(url) ?? [];
      const crawlEvidence = crawlEvidenceFor(analysisPages.get(url));
      const queryPerformanceFingerprint = queryRows.length === 0
        ? null
        : stableEvidenceHash({
            purpose: "ugp_site_ownership_page_query_performance",
            version: UGP_SITE_OWNERSHIP_EVIDENCE_VERSION,
            rows: queryRows.map((row) => row.evidenceFingerprint),
          });
      const base = {
        url,
        pageId: pageId(url),
        crawlEvidence,
        queryCount: new Set(queryRows.map((row) => row.query)).size,
        queryPerformanceFingerprint,
      };
      return Object.freeze({
        ...base,
        pageEvidenceFingerprint: stableEvidenceHash({
          purpose: "ugp_site_ownership_page_evidence",
          version: UGP_SITE_OWNERSHIP_EVIDENCE_VERSION,
          ...base,
        }),
      });
    });

  const sourceMap = new Map<string, {
    sourceId: string;
    sourceFingerprint: string;
  }>();
  for (const row of normalizedRows) {
    sourceMap.set(
      row.sourceId + "\u0001" + row.sourceFingerprint,
      {
        sourceId: row.sourceId,
        sourceFingerprint: row.sourceFingerprint,
      },
    );
  }
  const queryPageEvidenceSources = Object.freeze(
    [...sourceMap.values()].sort((a, b) =>
      a.sourceId.localeCompare(b.sourceId)
      || a.sourceFingerprint.localeCompare(b.sourceFingerprint),
    ),
  );

  const missingEvidence: SiteOwnershipEvidence["missingEvidence"][number][] = [];
  if (normalizedRows.length === 0) {
    missingEvidence.push("query_page_performance_not_supplied");
  }
  if (input.analysis.crawl.coverage.state === "partial") {
    missingEvidence.push("crawl_inventory_partial");
  }
  missingEvidence.push("whole_site_not_independently_certified");

  const siteFingerprint = stableEvidenceHash({
    purpose: "ugp_site_ownership_site_identity",
    canonicalOrigin: origin,
  });

  const base = {
    version: UGP_SITE_OWNERSHIP_EVIDENCE_VERSION,
    site: Object.freeze({
      canonicalOrigin: origin,
      siteFingerprint,
    }),
    market,
    policy: UGP_SITE_OWNERSHIP_EVIDENCE_POLICY,
    provenance: Object.freeze({
      universalReadAnalysisFingerprint: input.analysis.analysisFingerprint,
      universalReadAnalysisCoverage: input.analysis.crawl.coverage.state,
      wholeSiteCertified: false as const,
      queryPageEvidenceAvailability:
        normalizedRows.length > 0 ? "available" as const : "not_supplied" as const,
      queryPageEvidenceSources,
    }),
    pages: Object.freeze(pages),
    queryPageEvidence: Object.freeze(normalizedRows),
    missingEvidence: Object.freeze(missingEvidence),
    semantics: SEMANTICS,
  };

  return Object.freeze({
    ...base,
    evidenceFingerprint: stableEvidenceHash({
      purpose: "ugp_site_ownership_evidence",
      ...base,
    }),
  });
}

export function assertSiteOwnershipEvidenceIntegrity(
  evidence: SiteOwnershipEvidence,
): void {
  if (
    !evidence
    || evidence.version !== UGP_SITE_OWNERSHIP_EVIDENCE_VERSION
  ) {
    throw new Error("ugp_site_ownership_version_invalid");
  }
  if (
    evidence.semantics.readOnly !== true
    || evidence.semantics.deterministic !== true
    || evidence.semantics.grantsAuthorization !== false
    || evidence.semantics.grantsProviderWrite !== false
    || evidence.semantics.grantsPublicSiteWrite !== false
    || evidence.semantics.performsNetworkOperation !== false
    || evidence.semantics.performsPersistence !== false
  ) {
    throw new Error("ugp_site_ownership_unsafe_semantics");
  }
  const { evidenceFingerprint, ...withoutFingerprint } = evidence;
  const expected = stableEvidenceHash({
    purpose: "ugp_site_ownership_evidence",
    ...withoutFingerprint,
  });
  if (
    exactFingerprint(evidenceFingerprint, "evidence_fingerprint") !== expected
  ) {
    throw new Error("ugp_site_ownership_fingerprint_mismatch");
  }
}
