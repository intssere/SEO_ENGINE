import { createHash } from "node:crypto";
import {
  assertPublicWebOnboardingPlanIntegrity,
  type PublicWebOnboardingPlan,
  type PublicWebOnboardingResolution,
} from "./public-web-onboarding.js";
import type { CrawlPageSignal } from "./opportunity-engine.js";

export const UGP_UNIVERSAL_READ_ANALYSIS_VERSION =
  "ugp-3-3-universal-read-analysis-v1" as const;

export const UGP_UNIVERSAL_READ_ANALYSIS_LIMITS = Object.freeze({
  maxPages: 10_000,
  maxUrlLength: 2_048,
  maxTextLength: 250_000,
  maxMetadataLength: 4_096,
  maxHeadingLength: 2_048,
  maxHeadingsPerPage: 128,
  maxLinksPerPage: 2_000,
  maxImagesPerPage: 1_000,
  maxStructuredDataTypesPerPage: 128,
  maxStructuredDataIssuesPerPage: 128,
  maxSourceLabelLength: 160,
  maxFailureCodeLength: 160,
  maxResponseTimeMs: 300_000,
  maxTransferBytes: 100_000_000,
} as const);

export type UniversalReadAnalysisAuthorization = Readonly<{
  networkReadAuthorized: false;
  crawlExecutionAuthorized: false;
  persistenceAuthorized: false;
  connectorCapabilityGranted: false;
  schedulerEnabled: false;
  autonomousWorkerEnabled: false;
  providerWrites: false;
  publicSiteWrites: false;
}>;

export type UniversalReadAnalysisCrawlControls = Readonly<{
  method: "GET";
  sameOriginOnly: true;
  httpsOnly: true;
  robotsEnforced: true;
  redirectTargetRevalidation: true;
  queryPolicy: "reject_all";
  fragmentPolicy: "reject_all";
  responseBodyPersistence: false;
}>;

export type UniversalReadAnalysisCrawlSource = Readonly<{
  adapter: "existing_crawl_architecture";
  sourceVersion: string;
  sourceFingerprint: string;
  mode: "baseline" | "full_site";
  discoveredPages: number;
  observedPages: number;
  pageHardLimit: number;
  truncated: boolean;
  controls: UniversalReadAnalysisCrawlControls;
  authorization: UniversalReadAnalysisAuthorization;
}>;

export type SuppliedReadOnlyFetchOutcome =
  | "success"
  | "redirect"
  | "http_error"
  | "failure"
  | "robots_excluded";

export type SuppliedStructuredDataObservation = Readonly<{
  types: readonly string[];
  validity: "valid" | "invalid" | "unknown";
  issues: readonly string[];
}>;

export type SuppliedImageObservation = Readonly<{
  src: string;
  alt: string | null;
}>;

export type SuppliedTransportPerformanceObservation = Readonly<{
  responseTimeMs: number | null;
  transferBytes: number | null;
}>;

export type SuppliedReadOnlyPageObservation = Readonly<{
  url: string;
  outcome: SuppliedReadOnlyFetchOutcome;
  statusCode: number | null;
  robotsAllowed: boolean;
  redirectTarget: string | null;
  failureCode: string | null;
  noindex: boolean | null;
  canonicalUrl: string | null;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  headings: readonly string[];
  contentText: string | null;
  structuredData: SuppliedStructuredDataObservation;
  internalLinks: readonly string[];
  images: readonly SuppliedImageObservation[];
  performance: SuppliedTransportPerformanceObservation | null;
  sourceFingerprint: string;
}>;

export type UniversalPageFindingCode =
  | "crawlability.robots_excluded"
  | "crawlability.http_error"
  | "crawlability.fetch_failed"
  | "indexability.noindex"
  | "canonical.missing"
  | "metadata.title_missing"
  | "metadata.description_missing"
  | "metadata.h1_missing"
  | "structured_data.invalid"
  | "images.alt_missing"
  | "content.empty";

export type UniversalReadOnlyPageAnalysis = Readonly<{
  pageId: string;
  evidenceId: string;
  url: string;
  outcome: SuppliedReadOnlyFetchOutcome;
  statusCode: number | null;
  crawlability: Readonly<{
    state: "fetched" | "redirected" | "http_error" | "failed" | "robots_excluded";
    robotsAllowed: boolean;
    redirectTarget: string | null;
    failureCode: string | null;
  }>;
  indexability: Readonly<{
    state: "indexable" | "noindex" | "http_not_indexable" | "unavailable";
  }>;
  metadata: Readonly<{
    title: string | null;
    metaDescription: string | null;
    h1: string | null;
    headings: readonly string[];
  }>;
  canonical: Readonly<{
    value: string | null;
    state: "self" | "same_origin_other" | "external" | "missing" | "unavailable";
  }>;
  structuredData: SuppliedStructuredDataObservation;
  internalLinks: readonly string[];
  graph: Readonly<{
    observedInboundLinks: number;
    orphanCandidate: boolean;
  }>;
  content: Readonly<{
    available: boolean;
    text: string;
    wordCount: number;
    contentFingerprint: string | null;
  }>;
  images: Readonly<{
    count: number;
    missingAltCount: number;
    observations: readonly SuppliedImageObservation[];
  }>;
  performance: Readonly<{
    availability: "observed" | "unavailable";
    responseTimeMs: number | null;
    transferBytes: number | null;
    source: "supplied_transport_observation" | "unavailable";
    lighthouseEvidence: "not_collected_in_ugp_3_3";
  }>;
  findings: readonly UniversalPageFindingCode[];
  sourceFingerprint: string;
  pageFingerprint: string;
}>;

export type UniversalReadOnlySiteAnalysis = Readonly<{
  version: typeof UGP_UNIVERSAL_READ_ANALYSIS_VERSION;
  site: Readonly<{
    canonicalOrigin: string;
    hostname: string;
    entryUrl: string;
  }>;
  provenance: Readonly<{
    mode: "supplied_existing_crawl_observations";
    onboardingVersion: PublicWebOnboardingResolution["version"];
    planFingerprint: string;
    resolutionFingerprint: string;
    crawlSourceVersion: string;
    crawlSourceFingerprint: string;
    observationSetFingerprint: string;
  }>;
  crawl: Readonly<{
    source: UniversalReadAnalysisCrawlSource;
    coverage: Readonly<{
      discoveredPages: number;
      observedPages: number;
      successfullyFetchedPages: number;
      coveragePercent: number;
      state: "observed_inventory_complete" | "partial";
      wholeSiteCertified: false;
      wholeSiteReason: "not_independently_certified_by_ugp_3_3";
    }>;
  }>;
  pages: readonly UniversalReadOnlyPageAnalysis[];
  summary: Readonly<{
    robotsExcludedPages: number;
    redirectPages: number;
    httpErrorPages: number;
    failedPages: number;
    indexablePages: number;
    noindexPages: number;
    missingTitlePages: number;
    missingDescriptionPages: number;
    missingH1Pages: number;
    missingCanonicalPages: number;
    invalidStructuredDataPages: number;
    pagesWithMissingImageAlt: number;
    emptyContentPages: number;
    performanceObservedPages: number;
    observedInternalLinks: number;
    orphanCandidates: number;
  }>;
  downstream: Readonly<{
    crawlPageSignalCompatible: true;
    successfulPageSignals: number;
    technicalEvidenceProjection: "not_performed";
    lighthouseAdapter: "not_performed";
  }>;
  authorization: UniversalReadAnalysisAuthorization;
  analysisFingerprint: string;
}>;

type NormalizedPageObservation = Readonly<{
  url: string;
  outcome: SuppliedReadOnlyFetchOutcome;
  statusCode: number | null;
  robotsAllowed: boolean;
  redirectTarget: string | null;
  failureCode: string | null;
  noindex: boolean | null;
  canonicalUrl: string | null;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  headings: readonly string[];
  contentText: string | null;
  structuredData: SuppliedStructuredDataObservation;
  internalLinks: readonly string[];
  images: readonly SuppliedImageObservation[];
  performance: SuppliedTransportPerformanceObservation | null;
  sourceFingerprint: string;
}>;

const HEX_64 = /^[0-9a-f]{64}$/;

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function authorizationBoundary(): UniversalReadAnalysisAuthorization {
  return {
    networkReadAuthorized: false,
    crawlExecutionAuthorized: false,
    persistenceAuthorized: false,
    connectorCapabilityGranted: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
  };
}

function onboardingAuthorizationBoundary(): PublicWebOnboardingResolution["authorization"] {
  return {
    networkReadAuthorized: false,
    crawlExecutionAuthorized: false,
    persistenceAuthorized: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
  };
}

function requireFingerprint(value: unknown, code: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) throw new Error(code);
  return value;
}

function requireBoundedString(
  value: unknown,
  code: string,
  maxLength: number,
  allowEmpty = false,
): string {
  if (
    typeof value !== "string"
    || value.length > maxLength
    || (!allowEmpty && value.trim().length < 1)
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  ) {
    throw new Error(code);
  }
  return value.replace(/\s+/g, " ").trim();
}

function nullableText(value: unknown, code: string, maxLength: number): string | null {
  if (value === null) return null;
  const normalized = requireBoundedString(value, code, maxLength, true);
  return normalized || null;
}

function nonNegativeInteger(value: unknown, code: string, maximum = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > maximum) {
    throw new Error(code);
  }
  return value as number;
}

function positiveInteger(value: unknown, code: string, maximum = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > maximum) {
    throw new Error(code);
  }
  return value as number;
}

function normalizeStatusCode(value: unknown): number | null {
  if (value === null) return null;
  if (!Number.isInteger(value) || (value as number) < 100 || (value as number) > 599) {
    throw new Error("ugp_read_analysis_status_invalid");
  }
  return value as number;
}

function normalizeFirstPartyPageUrl(value: unknown, canonicalOrigin: string, code: string): string {
  const raw = requireBoundedString(
    value,
    code,
    UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxUrlLength,
  );
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(code);
  }
  if (
    url.protocol !== "https:"
    || url.origin !== canonicalOrigin
    || url.username
    || url.password
    || url.port
    || url.search
    || url.hash
  ) {
    throw new Error(code);
  }
  return url.toString();
}

function normalizeObservedUrl(value: unknown, base: string, code: string): string {
  const raw = requireBoundedString(
    value,
    code,
    UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxMetadataLength,
  );
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    throw new Error(code);
  }
  if (
    (url.protocol !== "https:" && url.protocol !== "http:")
    || url.username
    || url.password
    || url.port
  ) {
    throw new Error(code);
  }
  url.hash = "";
  return url.toString();
}

function assertResolutionBinding(
  plan: PublicWebOnboardingPlan,
  resolution: PublicWebOnboardingResolution,
): void {
  assertPublicWebOnboardingPlanIntegrity(plan);
  if (!resolution || typeof resolution !== "object" || Array.isArray(resolution)) {
    throw new Error("ugp_read_analysis_resolution_invalid");
  }
  if (resolution.version !== plan.version) {
    throw new Error("ugp_read_analysis_resolution_version_mismatch");
  }
  if (resolution.planFingerprint !== plan.planFingerprint) {
    throw new Error("ugp_read_analysis_plan_lineage_mismatch");
  }
  if (resolution.evidenceMode !== "supplied_only") {
    throw new Error("ugp_read_analysis_resolution_provenance_invalid");
  }
  if (!HEX_64.test(resolution.resolutionFingerprint)) {
    throw new Error("ugp_read_analysis_resolution_fingerprint_invalid");
  }
  if (resolution.readAnalysisEligibility.eligible !== true
    || resolution.readAnalysisEligibility.reason !== "eligible") {
    throw new Error("ugp_read_analysis_resolution_not_eligible");
  }
  let origin: URL;
  let finalUrl: URL;
  try {
    origin = new URL(resolution.canonicalOrigin);
    finalUrl = new URL(resolution.finalUrl);
  } catch {
    throw new Error("ugp_read_analysis_resolution_identity_invalid");
  }
  if (
    origin.protocol !== "https:"
    || origin.origin !== resolution.canonicalOrigin
    || finalUrl.protocol !== "https:"
    || finalUrl.origin !== resolution.canonicalOrigin
    || finalUrl.hostname.toLowerCase() !== resolution.hostname.toLowerCase()
  ) {
    throw new Error("ugp_read_analysis_resolution_identity_invalid");
  }
  if (stableJson(resolution.authorization) !== stableJson(onboardingAuthorizationBoundary())) {
    throw new Error("ugp_read_analysis_resolution_authority_open");
  }
}

function normalizeCrawlSource(
  source: UniversalReadAnalysisCrawlSource,
): UniversalReadAnalysisCrawlSource {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("ugp_read_analysis_crawl_source_invalid");
  }
  if (source.adapter !== "existing_crawl_architecture") {
    throw new Error("ugp_read_analysis_crawl_adapter_invalid");
  }
  const sourceVersion = requireBoundedString(
    source.sourceVersion,
    "ugp_read_analysis_crawl_version_invalid",
    UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxSourceLabelLength,
  );
  const sourceFingerprint = requireFingerprint(
    source.sourceFingerprint,
    "ugp_read_analysis_crawl_fingerprint_invalid",
  );
  if (source.mode !== "baseline" && source.mode !== "full_site") {
    throw new Error("ugp_read_analysis_crawl_mode_invalid");
  }
  const discoveredPages = positiveInteger(
    source.discoveredPages,
    "ugp_read_analysis_discovered_pages_invalid",
    UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxPages,
  );
  const observedPages = positiveInteger(
    source.observedPages,
    "ugp_read_analysis_observed_pages_invalid",
    UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxPages,
  );
  const pageHardLimit = positiveInteger(
    source.pageHardLimit,
    "ugp_read_analysis_page_limit_invalid",
    UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxPages,
  );
  if (observedPages > discoveredPages || observedPages > pageHardLimit) {
    throw new Error("ugp_read_analysis_crawl_counts_invalid");
  }
  const expectedControls: UniversalReadAnalysisCrawlControls = {
    method: "GET",
    sameOriginOnly: true,
    httpsOnly: true,
    robotsEnforced: true,
    redirectTargetRevalidation: true,
    queryPolicy: "reject_all",
    fragmentPolicy: "reject_all",
    responseBodyPersistence: false,
  };
  if (stableJson(source.controls) !== stableJson(expectedControls)) {
    throw new Error("ugp_read_analysis_crawl_controls_unsafe");
  }
  if (stableJson(source.authorization) !== stableJson(authorizationBoundary())) {
    throw new Error("ugp_read_analysis_crawl_authority_open");
  }
  if (typeof source.truncated !== "boolean") {
    throw new Error("ugp_read_analysis_crawl_truncated_invalid");
  }
  return {
    adapter: "existing_crawl_architecture",
    sourceVersion,
    sourceFingerprint,
    mode: source.mode,
    discoveredPages,
    observedPages,
    pageHardLimit,
    truncated: source.truncated,
    controls: expectedControls,
    authorization: authorizationBoundary(),
  };
}

function normalizeTextList(
  values: readonly string[],
  code: string,
  limit: number,
  itemLimit: number,
): readonly string[] {
  if (!Array.isArray(values) || values.length > limit) throw new Error(code);
  const normalized = values.map((value) => requireBoundedString(value, code, itemLimit));
  return [...new Set(normalized)].sort((left, right) => left.localeCompare(right));
}

function normalizeStructuredData(
  value: SuppliedStructuredDataObservation,
): SuppliedStructuredDataObservation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ugp_read_analysis_structured_data_invalid");
  }
  if (!["valid", "invalid", "unknown"].includes(value.validity)) {
    throw new Error("ugp_read_analysis_structured_data_validity_invalid");
  }
  const types = normalizeTextList(
    value.types,
    "ugp_read_analysis_structured_data_type_invalid",
    UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxStructuredDataTypesPerPage,
    UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxHeadingLength,
  );
  const issues = normalizeTextList(
    value.issues,
    "ugp_read_analysis_structured_data_issue_invalid",
    UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxStructuredDataIssuesPerPage,
    UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxMetadataLength,
  );
  if (value.validity === "valid" && issues.length > 0) {
    throw new Error("ugp_read_analysis_structured_data_validity_conflict");
  }
  return { types, validity: value.validity, issues };
}

function normalizeImages(
  values: readonly SuppliedImageObservation[],
  pageUrl: string,
): readonly SuppliedImageObservation[] {
  if (!Array.isArray(values)
    || values.length > UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxImagesPerPage) {
    throw new Error("ugp_read_analysis_images_invalid");
  }
  const deduped = new Map<string, SuppliedImageObservation>();
  for (const image of values) {
    if (!image || typeof image !== "object" || Array.isArray(image)) {
      throw new Error("ugp_read_analysis_image_invalid");
    }
    const src = normalizeObservedUrl(image.src, pageUrl, "ugp_read_analysis_image_src_invalid");
    const alt = nullableText(
      image.alt,
      "ugp_read_analysis_image_alt_invalid",
      UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxMetadataLength,
    );
    deduped.set(stableJson({ src, alt }), { src, alt });
  }
  return [...deduped.values()].sort((left, right) =>
    left.src.localeCompare(right.src) || (left.alt ?? "").localeCompare(right.alt ?? "")
  );
}

function normalizePerformance(
  value: SuppliedTransportPerformanceObservation | null,
): SuppliedTransportPerformanceObservation | null {
  if (value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ugp_read_analysis_performance_invalid");
  }
  const responseTimeMs = value.responseTimeMs === null
    ? null
    : nonNegativeInteger(
      value.responseTimeMs,
      "ugp_read_analysis_response_time_invalid",
      UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxResponseTimeMs,
    );
  const transferBytes = value.transferBytes === null
    ? null
    : nonNegativeInteger(
      value.transferBytes,
      "ugp_read_analysis_transfer_bytes_invalid",
      UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxTransferBytes,
    );
  if (responseTimeMs === null && transferBytes === null) {
    throw new Error("ugp_read_analysis_performance_empty");
  }
  return { responseTimeMs, transferBytes };
}

function normalizePageObservation(
  page: SuppliedReadOnlyPageObservation,
  canonicalOrigin: string,
): NormalizedPageObservation {
  if (!page || typeof page !== "object" || Array.isArray(page)) {
    throw new Error("ugp_read_analysis_page_invalid");
  }
  const url = normalizeFirstPartyPageUrl(
    page.url,
    canonicalOrigin,
    "ugp_read_analysis_page_url_invalid",
  );
  if (!["success", "redirect", "http_error", "failure", "robots_excluded"].includes(page.outcome)) {
    throw new Error("ugp_read_analysis_outcome_invalid");
  }
  const suppliedStatus = normalizeStatusCode(page.statusCode);
  if (typeof page.robotsAllowed !== "boolean") {
    throw new Error("ugp_read_analysis_robots_allowed_invalid");
  }
  const redirectTarget = page.redirectTarget === null
    ? null
    : normalizeFirstPartyPageUrl(
      page.redirectTarget,
      canonicalOrigin,
      "ugp_read_analysis_redirect_target_invalid",
    );
  const failureCode = page.failureCode === null
    ? null
    : requireBoundedString(
      page.failureCode,
      "ugp_read_analysis_failure_code_invalid",
      UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxFailureCodeLength,
    );
  if (page.noindex !== null && typeof page.noindex !== "boolean") {
    throw new Error("ugp_read_analysis_noindex_invalid");
  }

  if (page.outcome === "success") {
    if (suppliedStatus === null || suppliedStatus < 200 || suppliedStatus >= 300) {
      throw new Error("ugp_read_analysis_success_status_invalid");
    }
    if (!page.robotsAllowed || redirectTarget !== null || failureCode !== null || page.noindex === null) {
      throw new Error("ugp_read_analysis_success_shape_invalid");
    }
  } else if (page.outcome === "redirect") {
    if (suppliedStatus === null || suppliedStatus < 300 || suppliedStatus >= 400
      || !page.robotsAllowed || redirectTarget === null || failureCode !== null) {
      throw new Error("ugp_read_analysis_redirect_shape_invalid");
    }
  } else if (page.outcome === "http_error") {
    if (suppliedStatus === null || suppliedStatus < 400 || !page.robotsAllowed
      || redirectTarget !== null || failureCode !== null) {
      throw new Error("ugp_read_analysis_http_error_shape_invalid");
    }
  } else if (page.outcome === "failure") {
    if (suppliedStatus !== null || !page.robotsAllowed || redirectTarget !== null || failureCode === null) {
      throw new Error("ugp_read_analysis_failure_shape_invalid");
    }
  } else if (suppliedStatus !== null || page.robotsAllowed || redirectTarget !== null || failureCode !== null) {
    throw new Error("ugp_read_analysis_robots_excluded_shape_invalid");
  }

  const canonicalUrl = page.canonicalUrl === null
    ? null
    : normalizeObservedUrl(
      page.canonicalUrl,
      url,
      "ugp_read_analysis_canonical_url_invalid",
    );
  const title = nullableText(
    page.title,
    "ugp_read_analysis_title_invalid",
    UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxMetadataLength,
  );
  const metaDescription = nullableText(
    page.metaDescription,
    "ugp_read_analysis_description_invalid",
    UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxMetadataLength,
  );
  const h1 = nullableText(
    page.h1,
    "ugp_read_analysis_h1_invalid",
    UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxHeadingLength,
  );
  const headings = normalizeTextList(
    page.headings,
    "ugp_read_analysis_heading_invalid",
    UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxHeadingsPerPage,
    UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxHeadingLength,
  );
  const contentText = page.contentText === null
    ? null
    : requireBoundedString(
      page.contentText,
      "ugp_read_analysis_content_invalid",
      UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxTextLength,
      true,
    );
  const structuredData = normalizeStructuredData(page.structuredData);
  if (!Array.isArray(page.internalLinks)
    || page.internalLinks.length > UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxLinksPerPage) {
    throw new Error("ugp_read_analysis_internal_links_invalid");
  }
  const internalLinks = [...new Set(page.internalLinks.map((link) =>
    normalizeFirstPartyPageUrl(
      link,
      canonicalOrigin,
      "ugp_read_analysis_internal_link_invalid",
    )
  ))].sort((left, right) => left.localeCompare(right));
  const images = normalizeImages(page.images, url);
  const performance = normalizePerformance(page.performance);
  const sourceFingerprint = requireFingerprint(
    page.sourceFingerprint,
    "ugp_read_analysis_page_source_fingerprint_invalid",
  );

  const payloadPresent =
    page.noindex !== null
    || canonicalUrl !== null
    || title !== null
    || metaDescription !== null
    || h1 !== null
    || contentText !== null
    || headings.length > 0
    || structuredData.types.length > 0
    || structuredData.issues.length > 0
    || structuredData.validity !== "unknown"
    || internalLinks.length > 0
    || images.length > 0
    || performance !== null;
  if (page.outcome !== "success" && payloadPresent) {
    throw new Error("ugp_read_analysis_non_success_payload_invalid");
  }

  return {
    url,
    outcome: page.outcome,
    statusCode: suppliedStatus,
    robotsAllowed: page.robotsAllowed,
    redirectTarget,
    failureCode,
    noindex: page.noindex,
    canonicalUrl,
    title,
    metaDescription,
    h1,
    headings,
    contentText,
    structuredData,
    internalLinks,
    images,
    performance,
    sourceFingerprint,
  };
}

function normalizePages(
  pages: readonly SuppliedReadOnlyPageObservation[],
  canonicalOrigin: string,
): readonly NormalizedPageObservation[] {
  if (!Array.isArray(pages) || pages.length < 1
    || pages.length > UGP_UNIVERSAL_READ_ANALYSIS_LIMITS.maxPages) {
    throw new Error("ugp_read_analysis_pages_invalid");
  }
  const byUrl = new Map<string, NormalizedPageObservation>();
  for (const page of pages) {
    const normalized = normalizePageObservation(page, canonicalOrigin);
    if (byUrl.has(normalized.url)) {
      throw new Error("ugp_read_analysis_duplicate_page_url");
    }
    byUrl.set(normalized.url, normalized);
  }
  return [...byUrl.values()].sort((left, right) => left.url.localeCompare(right.url));
}

function wordCount(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/u).filter(Boolean).length : 0;
}

function canonicalState(
  page: NormalizedPageObservation,
  canonicalOrigin: string,
): UniversalReadOnlyPageAnalysis["canonical"]["state"] {
  if (page.outcome !== "success") return "unavailable";
  if (page.canonicalUrl === null) return "missing";
  if (page.canonicalUrl === page.url) return "self";
  return new URL(page.canonicalUrl).origin === canonicalOrigin
    ? "same_origin_other"
    : "external";
}

function indexabilityState(
  page: NormalizedPageObservation,
): UniversalReadOnlyPageAnalysis["indexability"]["state"] {
  if (page.outcome === "success") return page.noindex ? "noindex" : "indexable";
  if (page.outcome === "http_error") return "http_not_indexable";
  return "unavailable";
}

function crawlabilityState(
  outcome: SuppliedReadOnlyFetchOutcome,
): UniversalReadOnlyPageAnalysis["crawlability"]["state"] {
  if (outcome === "success") return "fetched";
  if (outcome === "redirect") return "redirected";
  if (outcome === "http_error") return "http_error";
  if (outcome === "failure") return "failed";
  return "robots_excluded";
}

function pageFindings(page: NormalizedPageObservation): readonly UniversalPageFindingCode[] {
  const findings: UniversalPageFindingCode[] = [];
  if (page.outcome === "robots_excluded") findings.push("crawlability.robots_excluded");
  if (page.outcome === "http_error") findings.push("crawlability.http_error");
  if (page.outcome === "failure") findings.push("crawlability.fetch_failed");
  if (page.outcome === "success") {
    if (page.noindex) findings.push("indexability.noindex");
    if (page.canonicalUrl === null) findings.push("canonical.missing");
    if (page.title === null) findings.push("metadata.title_missing");
    if (page.metaDescription === null) findings.push("metadata.description_missing");
    if (page.h1 === null) findings.push("metadata.h1_missing");
    if (page.structuredData.validity === "invalid") findings.push("structured_data.invalid");
    if (page.images.some((image) => image.alt === null)) findings.push("images.alt_missing");
    if ((page.contentText ?? "").trim().length === 0) findings.push("content.empty");
  }
  return findings.sort((left, right) => left.localeCompare(right));
}

function buildPageAnalysis(
  page: NormalizedPageObservation,
  canonicalOrigin: string,
  inboundCounts: ReadonlyMap<string, number>,
  observedInventoryComplete: boolean,
  entryUrl: string,
): UniversalReadOnlyPageAnalysis {
  const text = page.contentText ?? "";
  const contentAvailable = page.outcome === "success" && page.contentText !== null;
  const contentFingerprint = contentAvailable ? stableHash(text) : null;
  const missingAltCount = page.images.filter((image) => image.alt === null).length;
  const findings = pageFindings(page);
  const pageId = "ugp-page-" + stableHash({ url: page.url }).slice(0, 24);
  const evidenceId = "ugp-evidence-" + stableHash({
    url: page.url,
    sourceFingerprint: page.sourceFingerprint,
    outcome: page.outcome,
  }).slice(0, 24);

  const base = {
    pageId,
    evidenceId,
    url: page.url,
    outcome: page.outcome,
    statusCode: page.statusCode,
    crawlability: {
      state: crawlabilityState(page.outcome),
      robotsAllowed: page.robotsAllowed,
      redirectTarget: page.redirectTarget,
      failureCode: page.failureCode,
    },
    indexability: { state: indexabilityState(page) },
    metadata: {
      title: page.title,
      metaDescription: page.metaDescription,
      h1: page.h1,
      headings: page.headings,
    },
    canonical: {
      value: page.canonicalUrl,
      state: canonicalState(page, canonicalOrigin),
    },
    structuredData: page.structuredData,
    internalLinks: page.internalLinks,
    graph: {
      observedInboundLinks: inboundCounts.get(page.url) ?? 0,
      orphanCandidate:
        observedInventoryComplete
        && page.outcome === "success"
        && page.url !== entryUrl
        && (inboundCounts.get(page.url) ?? 0) === 0,
    },
    content: {
      available: contentAvailable,
      text,
      wordCount: contentAvailable ? wordCount(text) : 0,
      contentFingerprint,
    },
    images: {
      count: page.images.length,
      missingAltCount,
      observations: page.images,
    },
    performance: {
      availability: page.performance === null ? "unavailable" as const : "observed" as const,
      responseTimeMs: page.performance?.responseTimeMs ?? null,
      transferBytes: page.performance?.transferBytes ?? null,
      source: page.performance === null
        ? "unavailable" as const
        : "supplied_transport_observation" as const,
      lighthouseEvidence: "not_collected_in_ugp_3_3" as const,
    },
    findings,
    sourceFingerprint: page.sourceFingerprint,
  };

  return {
    ...base,
    pageFingerprint: stableHash({
      purpose: "ugp_universal_read_analysis_page",
      ...base,
    }),
  };
}

function siteSummary(
  pages: readonly UniversalReadOnlyPageAnalysis[],
): UniversalReadOnlySiteAnalysis["summary"] {
  return {
    robotsExcludedPages: pages.filter((page) => page.outcome === "robots_excluded").length,
    redirectPages: pages.filter((page) => page.outcome === "redirect").length,
    httpErrorPages: pages.filter((page) => page.outcome === "http_error").length,
    failedPages: pages.filter((page) => page.outcome === "failure").length,
    indexablePages: pages.filter((page) => page.indexability.state === "indexable").length,
    noindexPages: pages.filter((page) => page.indexability.state === "noindex").length,
    missingTitlePages: pages.filter((page) => page.findings.includes("metadata.title_missing")).length,
    missingDescriptionPages: pages.filter((page) => page.findings.includes("metadata.description_missing")).length,
    missingH1Pages: pages.filter((page) => page.findings.includes("metadata.h1_missing")).length,
    missingCanonicalPages: pages.filter((page) => page.findings.includes("canonical.missing")).length,
    invalidStructuredDataPages: pages.filter((page) => page.findings.includes("structured_data.invalid")).length,
    pagesWithMissingImageAlt: pages.filter((page) => page.findings.includes("images.alt_missing")).length,
    emptyContentPages: pages.filter((page) => page.findings.includes("content.empty")).length,
    performanceObservedPages: pages.filter((page) => page.performance.availability === "observed").length,
    observedInternalLinks: pages.reduce((sum, page) => sum + page.internalLinks.length, 0),
    orphanCandidates: pages.filter((page) => page.graph.orphanCandidate).length,
  };
}

export function analyzeSuppliedReadOnlySite(input: {
  plan: PublicWebOnboardingPlan;
  resolution: PublicWebOnboardingResolution;
  crawlSource: UniversalReadAnalysisCrawlSource;
  pages: readonly SuppliedReadOnlyPageObservation[];
}): UniversalReadOnlySiteAnalysis {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_read_analysis_input_invalid");
  }
  assertResolutionBinding(input.plan, input.resolution);
  const crawlSource = normalizeCrawlSource(input.crawlSource);
  const pages = normalizePages(input.pages, input.resolution.canonicalOrigin);
  if (pages.length !== crawlSource.observedPages) {
    throw new Error("ugp_read_analysis_observed_page_count_mismatch");
  }

  const inboundCounts = new Map<string, number>();
  const observedUrls = new Set(pages.map((page) => page.url));
  for (const page of pages) {
    for (const link of page.internalLinks) {
      if (!observedUrls.has(link)) continue;
      inboundCounts.set(link, (inboundCounts.get(link) ?? 0) + 1);
    }
  }

  const observedInventoryComplete =
    crawlSource.truncated === false
    && crawlSource.discoveredPages === crawlSource.observedPages;
  const analyzedPages = pages.map((page) =>
    buildPageAnalysis(
      page,
      input.resolution.canonicalOrigin,
      inboundCounts,
      observedInventoryComplete,
      input.resolution.finalUrl,
    )
  );
  const successfullyFetchedPages = analyzedPages.filter(
    (page) => page.outcome === "success",
  ).length;
  const coveragePercent = Number(
    ((crawlSource.observedPages / crawlSource.discoveredPages) * 100).toFixed(2),
  );
  const observationSetFingerprint = stableHash(
    pages.map((page) => ({
      url: page.url,
      sourceFingerprint: page.sourceFingerprint,
      normalizedFingerprint: stableHash(page),
    })),
  );

  const base = {
    version: UGP_UNIVERSAL_READ_ANALYSIS_VERSION,
    site: {
      canonicalOrigin: input.resolution.canonicalOrigin,
      hostname: input.resolution.hostname,
      entryUrl: input.resolution.finalUrl,
    },
    provenance: {
      mode: "supplied_existing_crawl_observations" as const,
      onboardingVersion: input.resolution.version,
      planFingerprint: input.plan.planFingerprint,
      resolutionFingerprint: input.resolution.resolutionFingerprint,
      crawlSourceVersion: crawlSource.sourceVersion,
      crawlSourceFingerprint: crawlSource.sourceFingerprint,
      observationSetFingerprint,
    },
    crawl: {
      source: crawlSource,
      coverage: {
        discoveredPages: crawlSource.discoveredPages,
        observedPages: crawlSource.observedPages,
        successfullyFetchedPages,
        coveragePercent,
        state: observedInventoryComplete
          ? "observed_inventory_complete" as const
          : "partial" as const,
        wholeSiteCertified: false as const,
        wholeSiteReason: "not_independently_certified_by_ugp_3_3" as const,
      },
    },
    pages: analyzedPages,
    summary: siteSummary(analyzedPages),
    downstream: {
      crawlPageSignalCompatible: true as const,
      successfulPageSignals: successfullyFetchedPages,
      technicalEvidenceProjection: "not_performed" as const,
      lighthouseAdapter: "not_performed" as const,
    },
    authorization: authorizationBoundary(),
  };

  return deepFreeze({
    ...base,
    analysisFingerprint: stableHash({
      purpose: "ugp_universal_read_analysis",
      ...base,
    }),
  });
}

export function assertUniversalReadOnlySiteAnalysisIntegrity(
  analysis: UniversalReadOnlySiteAnalysis,
): void {
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) {
    throw new Error("ugp_read_analysis_result_invalid");
  }
  if (analysis.version !== UGP_UNIVERSAL_READ_ANALYSIS_VERSION) {
    throw new Error("ugp_read_analysis_version_mismatch");
  }
  if (!HEX_64.test(analysis.analysisFingerprint)) {
    throw new Error("ugp_read_analysis_fingerprint_invalid");
  }
  if (stableJson(analysis.authorization) !== stableJson(authorizationBoundary())) {
    throw new Error("ugp_read_analysis_authority_open");
  }
  if (analysis.crawl.coverage.wholeSiteCertified !== false) {
    throw new Error("ugp_read_analysis_whole_site_overclaim");
  }
  for (const page of analysis.pages) {
    const { pageFingerprint, ...pageBase } = page;
    if (!HEX_64.test(pageFingerprint)
      || pageFingerprint !== stableHash({
        purpose: "ugp_universal_read_analysis_page",
        ...pageBase,
      })) {
      throw new Error("ugp_read_analysis_page_integrity_failed");
    }
  }
  const { analysisFingerprint, ...base } = analysis;
  const expected = stableHash({
    purpose: "ugp_universal_read_analysis",
    ...base,
  });
  if (analysisFingerprint !== expected) {
    throw new Error("ugp_read_analysis_integrity_failed");
  }
}

export function projectUniversalAnalysisToCrawlPageSignals(
  analysis: UniversalReadOnlySiteAnalysis,
): CrawlPageSignal[] {
  assertUniversalReadOnlySiteAnalysisIntegrity(analysis);
  return analysis.pages
    .filter((page) => page.outcome === "success")
    .map((page) => ({
      pageId: page.pageId,
      url: page.url,
      indexable: page.indexability.state === "indexable",
      title: page.metadata.title,
      description: page.metadata.metaDescription,
      h1: page.metadata.h1,
      contentText: page.content.text,
      links: [...page.internalLinks],
      evidenceId: page.evidenceId,
      headings: [...page.metadata.headings],
      structuredData: {
        types: [...page.structuredData.types],
        validity: page.structuredData.validity,
        issues: [...page.structuredData.issues],
      },
    }));
}
