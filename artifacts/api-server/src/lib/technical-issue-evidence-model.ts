import { createHash } from "node:crypto";
import type { TechnicalFindingSignal } from "./opportunity-engine.js";
import type { UrlExplorerRow } from "./url-explorer-query-model.js";

export const TECHNICAL_ISSUE_CATEGORIES = Object.freeze([
  "crawlability_indexability",
  "canonicalization",
  "metadata",
  "structured_data",
  "internal_links",
  "performance",
  "images",
  "content_quality",
  "ai_accessibility",
  "crawl_completeness",
] as const);

export type TechnicalIssueCategory = typeof TECHNICAL_ISSUE_CATEGORIES[number];

export const TECHNICAL_ISSUE_SEVERITIES = Object.freeze(["info", "low", "medium", "high", "critical"] as const);
export type TechnicalIssueSeverity = typeof TECHNICAL_ISSUE_SEVERITIES[number];

export const TECHNICAL_ISSUE_STATUSES = Object.freeze(["open", "acknowledged", "suppressed", "resolved"] as const);
export type TechnicalIssueStatus = typeof TECHNICAL_ISSUE_STATUSES[number];

export const TECHNICAL_EVIDENCE_QUALITIES = Object.freeze(["unknown", "weak", "moderate", "strong", "verified"] as const);
export type TechnicalEvidenceQuality = typeof TECHNICAL_EVIDENCE_QUALITIES[number];
export type TechnicalIssueConfidence = "low" | "medium" | "high" | "verified";

export const TECHNICAL_EVIDENCE_DIMENSIONS = Object.freeze([
  "canonical_url",
  "sitemap_membership",
  "sitemap_lastmod",
  "recrawl_decision",
  "crawl_completeness",
  "http_status",
  "fetch_outcome",
  "redirect_target",
  "canonical_target",
  "indexability",
  "content_fingerprint",
  "title",
  "meta_description",
  "h1",
  "structured_data",
  "internal_links",
  "performance",
  "images",
  "content_quality",
  "ai_accessibility",
] as const);
export type TechnicalEvidenceDimension = typeof TECHNICAL_EVIDENCE_DIMENSIONS[number];

export type TechnicalEvidenceKind = "retained_fact" | "aggregate_fact" | "supplied_observation" | "unavailable";
export type TechnicalEvidenceSource = "p2_7_url_explorer" | "p2_4_completion_certification" | "supplied_first_party_observation" | "unavailable_marker";
export type TechnicalIssueScope = "site" | "url";
export type TechnicalIssueAvailability = "retained_or_aggregate" | "requires_supplied_observation";

export type TechnicalIssueTypeId =
  | "crawl.inventory_incomplete"
  | "crawl.terminal_failures"
  | "crawl.hard_limit_reached"
  | "sitemap.lastmod_missing"
  | "crawlability.http_error"
  | "crawlability.fetch_failed"
  | "indexability.noindex"
  | "canonical.missing"
  | "canonical.mismatch"
  | "redirect.chain"
  | "metadata.title_missing"
  | "metadata.description_missing"
  | "metadata.h1_missing"
  | "structured_data.invalid"
  | "internal_links.orphan"
  | "performance.cwv_poor"
  | "images.alt_missing"
  | "content.thin"
  | "ai_accessibility.blocked";

export type TechnicalIssueTypeDefinition = {
  id: TechnicalIssueTypeId;
  category: TechnicalIssueCategory;
  scope: TechnicalIssueScope;
  defaultSeverity: TechnicalIssueSeverity;
  title: string;
  requiredDimensions: TechnicalEvidenceDimension[];
  requirement: "all" | "any";
  availability: TechnicalIssueAvailability;
};

export const TECHNICAL_ISSUE_TAXONOMY: readonly TechnicalIssueTypeDefinition[] = Object.freeze([
  { id: "crawl.inventory_incomplete", category: "crawl_completeness", scope: "site", defaultSeverity: "high", title: "Crawl inventory is incomplete", requiredDimensions: ["crawl_completeness"], requirement: "all", availability: "retained_or_aggregate" },
  { id: "crawl.terminal_failures", category: "crawl_completeness", scope: "site", defaultSeverity: "high", title: "Crawl contains terminal failures", requiredDimensions: ["crawl_completeness"], requirement: "all", availability: "retained_or_aggregate" },
  { id: "crawl.hard_limit_reached", category: "crawl_completeness", scope: "site", defaultSeverity: "critical", title: "Crawl safety limit was reached", requiredDimensions: ["crawl_completeness"], requirement: "all", availability: "retained_or_aggregate" },
  { id: "sitemap.lastmod_missing", category: "crawl_completeness", scope: "url", defaultSeverity: "info", title: "Sitemap lastmod is unavailable", requiredDimensions: ["sitemap_lastmod"], requirement: "all", availability: "retained_or_aggregate" },
  { id: "crawlability.http_error", category: "crawlability_indexability", scope: "url", defaultSeverity: "high", title: "URL returned an HTTP error", requiredDimensions: ["http_status"], requirement: "all", availability: "requires_supplied_observation" },
  { id: "crawlability.fetch_failed", category: "crawlability_indexability", scope: "url", defaultSeverity: "high", title: "URL fetch failed", requiredDimensions: ["fetch_outcome"], requirement: "all", availability: "requires_supplied_observation" },
  { id: "indexability.noindex", category: "crawlability_indexability", scope: "url", defaultSeverity: "high", title: "URL is not indexable", requiredDimensions: ["indexability"], requirement: "all", availability: "requires_supplied_observation" },
  { id: "canonical.missing", category: "canonicalization", scope: "url", defaultSeverity: "medium", title: "Canonical target is missing", requiredDimensions: ["canonical_target"], requirement: "all", availability: "requires_supplied_observation" },
  { id: "canonical.mismatch", category: "canonicalization", scope: "url", defaultSeverity: "high", title: "Canonical target conflicts with expected URL", requiredDimensions: ["canonical_target", "canonical_url"], requirement: "all", availability: "requires_supplied_observation" },
  { id: "redirect.chain", category: "canonicalization", scope: "url", defaultSeverity: "medium", title: "URL has a redirect-chain issue", requiredDimensions: ["redirect_target"], requirement: "all", availability: "requires_supplied_observation" },
  { id: "metadata.title_missing", category: "metadata", scope: "url", defaultSeverity: "medium", title: "Page title is missing", requiredDimensions: ["title"], requirement: "all", availability: "requires_supplied_observation" },
  { id: "metadata.description_missing", category: "metadata", scope: "url", defaultSeverity: "low", title: "Meta description is missing", requiredDimensions: ["meta_description"], requirement: "all", availability: "requires_supplied_observation" },
  { id: "metadata.h1_missing", category: "metadata", scope: "url", defaultSeverity: "medium", title: "H1 is missing", requiredDimensions: ["h1"], requirement: "all", availability: "requires_supplied_observation" },
  { id: "structured_data.invalid", category: "structured_data", scope: "url", defaultSeverity: "medium", title: "Structured data is invalid", requiredDimensions: ["structured_data"], requirement: "all", availability: "requires_supplied_observation" },
  { id: "internal_links.orphan", category: "internal_links", scope: "url", defaultSeverity: "high", title: "URL lacks expected internal-link support", requiredDimensions: ["internal_links"], requirement: "all", availability: "requires_supplied_observation" },
  { id: "performance.cwv_poor", category: "performance", scope: "url", defaultSeverity: "medium", title: "Core Web Vitals performance is poor", requiredDimensions: ["performance"], requirement: "all", availability: "requires_supplied_observation" },
  { id: "images.alt_missing", category: "images", scope: "url", defaultSeverity: "low", title: "Image alternative text is missing", requiredDimensions: ["images"], requirement: "all", availability: "requires_supplied_observation" },
  { id: "content.thin", category: "content_quality", scope: "url", defaultSeverity: "medium", title: "Content quality signal indicates thin content", requiredDimensions: ["content_quality"], requirement: "all", availability: "requires_supplied_observation" },
  { id: "ai_accessibility.blocked", category: "ai_accessibility", scope: "url", defaultSeverity: "medium", title: "AI crawler accessibility is blocked", requiredDimensions: ["ai_accessibility"], requirement: "all", availability: "requires_supplied_observation" },
]);

export const P2_7_RETAINED_EVIDENCE_DIMENSIONS = Object.freeze(["canonical_url", "sitemap_membership", "sitemap_lastmod", "recrawl_decision"] as const);
export const P2_7_EXPLICITLY_UNAVAILABLE_DIMENSIONS = Object.freeze(["http_status", "fetch_outcome", "redirect_target", "canonical_target", "indexability", "content_fingerprint"] as const);

export const TECHNICAL_ISSUE_LIMITS = Object.freeze({
  siteIdLength: 160,
  textLength: 2_048,
  labelLength: 240,
  evidencePerIssue: 32,
  issuesPerQuery: 10_000,
  pageSize: 500,
  offset: 25_000,
} as const);

export type TechnicalUrlReference = {
  urlId: string;
  canonicalUrl: string;
  pathname: string;
};

export type TechnicalIssueLineage = {
  urlExplorerFingerprint: string;
  inventoryFingerprint: string;
  recrawlPlanFingerprint: string | null;
  completionCertificationFingerprint: string | null;
};

export type TechnicalEvidenceInput = {
  kind: TechnicalEvidenceKind;
  dimension: TechnicalEvidenceDimension;
  quality: TechnicalEvidenceQuality;
  source: TechnicalEvidenceSource;
  sourceFingerprint: string;
  label: string;
  value?: string | number | boolean | null;
  affectedUrl?: TechnicalUrlReference | null;
  unavailableReason?: string | null;
};

export type TechnicalEvidence = {
  evidenceId: string;
  kind: TechnicalEvidenceKind;
  dimension: TechnicalEvidenceDimension;
  quality: TechnicalEvidenceQuality;
  source: TechnicalEvidenceSource;
  sourceFingerprint: string;
  label: string;
  value: string | number | boolean | null;
  affectedUrl: TechnicalUrlReference | null;
  availability: "available" | "unavailable";
  unavailableReason: string | null;
  fingerprint: string;
};

export type TechnicalIssueInput = {
  typeId: TechnicalIssueTypeId;
  siteId: string;
  canonicalOrigin: string;
  lineage: TechnicalIssueLineage;
  affectedUrl?: TechnicalUrlReference | null;
  evidence: TechnicalEvidence[];
  severity?: TechnicalIssueSeverity;
  status?: TechnicalIssueStatus;
  summary: string;
  detail?: string | null;
};

export type TechnicalIssue = {
  version: "technical_issue_evidence_v1";
  issueKey: string;
  typeId: TechnicalIssueTypeId;
  category: TechnicalIssueCategory;
  scope: TechnicalIssueScope;
  siteId: string;
  canonicalOrigin: string;
  lineage: TechnicalIssueLineage;
  affectedUrl: TechnicalUrlReference | null;
  title: string;
  summary: string;
  detail: string | null;
  severity: TechnicalIssueSeverity;
  confidence: TechnicalIssueConfidence;
  status: TechnicalIssueStatus;
  evidence: TechnicalEvidence[];
  evidenceSetFingerprint: string;
  capabilities: {
    p2_7RetainedDimensions: TechnicalEvidenceDimension[];
    p2_7ExplicitlyUnavailableDimensions: TechnicalEvidenceDimension[];
    issueTypeAvailability: TechnicalIssueAvailability;
  };
  authorization: TechnicalIssueAuthorization;
  fingerprint: string;
};

export type TechnicalIssueAuthorization = {
  networkExecutionEnabled: false;
  crawlExecutionAuthorized: false;
  sitemapNetworkFetchingEnabled: false;
  persistenceAuthorized: false;
  ddlAuthorized: false;
  schedulerEnabled: false;
  workerEnabled: false;
  providerReadsAuthorized: false;
  providerWrites: false;
  competitorCollectionAuthorized: false;
  competitorPersistenceAuthorized: false;
  publicSiteWrites: false;
  publicationAuthorized: false;
};

export type TechnicalIssueQuery = {
  categories?: TechnicalIssueCategory[];
  severities?: TechnicalIssueSeverity[];
  statuses?: TechnicalIssueStatus[];
  typeIds?: TechnicalIssueTypeId[];
  urlId?: string;
  text?: string;
  sort?: { field: "severity" | "category" | "typeId" | "issueKey"; direction: "asc" | "desc" };
  page?: { offset: number; limit: number };
};

export type TechnicalIssueQueryResult = {
  version: "technical_issue_query_v1";
  queryFingerprint: string;
  rows: TechnicalIssue[];
  page: { offset: number; limit: number; returned: number; totalMatched: number; hasMore: boolean };
  authorization: TechnicalIssueAuthorization;
  fingerprint: string;
};

const severityRank: Record<TechnicalIssueSeverity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
const qualityRank: Record<TechnicalEvidenceQuality, number> = { unknown: 0, weak: 1, moderate: 2, strong: 3, verified: 4 };

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

function isFingerprint(value: string | null): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function requireFingerprint(value: string, code: string): string {
  if (!isFingerprint(value)) throw new Error(code);
  return value;
}

function sanitizeText(value: string, max: number, code: string): string {
  if (typeof value !== "string") throw new Error(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > max || /[\u0000-\u001f\u007f]/.test(normalized)) throw new Error(code);
  if (/<(?:!DOCTYPE|\?xml|\/?script\b|\/?html\b|\/?body\b)/i.test(normalized)) throw new Error(`${code}_raw_markup_denied`);
  if (/\b(?:Bearer\s+[A-Za-z0-9._~+\/-]+|sk-[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9_]{8,}|client_secret\s*[:=]|password\s*[:=]|-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----)\b/i.test(normalized)) {
    throw new Error(`${code}_secret_material_denied`);
  }
  return normalized;
}

function normalizeSiteId(value: string): string {
  const normalized = sanitizeText(value, TECHNICAL_ISSUE_LIMITS.siteIdLength, "technical_issue_site_id_invalid");
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(normalized)) throw new Error("technical_issue_site_id_invalid");
  return normalized;
}

function normalizeOrigin(value: string): string {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("technical_issue_origin_invalid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") {
    throw new Error("technical_issue_origin_invalid");
  }
  return parsed.origin;
}

function normalizeUrlReference(value: TechnicalUrlReference, origin?: string): TechnicalUrlReference {
  if (!value || typeof value !== "object" || !isFingerprint(value.urlId)) throw new Error("technical_issue_url_reference_invalid");
  let parsed: URL;
  try { parsed = new URL(value.canonicalUrl); } catch { throw new Error("technical_issue_url_reference_invalid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("technical_issue_url_reference_invalid");
  if (origin && parsed.origin !== origin) throw new Error("technical_issue_url_reference_origin_mismatch");
  const pathname = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  const canonicalUrl = pathname === "/" ? parsed.origin : `${parsed.origin}${pathname}`;
  if (canonicalUrl !== value.canonicalUrl || pathname !== value.pathname) throw new Error("technical_issue_url_reference_not_canonical");
  if (sha256({ canonicalUrl }) !== value.urlId) throw new Error("technical_issue_url_id_mismatch");
  return { urlId: value.urlId, canonicalUrl, pathname };
}

function closedAuthorization(): TechnicalIssueAuthorization {
  return {
    networkExecutionEnabled: false,
    crawlExecutionAuthorized: false,
    sitemapNetworkFetchingEnabled: false,
    persistenceAuthorized: false,
    ddlAuthorized: false,
    schedulerEnabled: false,
    workerEnabled: false,
    providerReadsAuthorized: false,
    providerWrites: false,
    competitorCollectionAuthorized: false,
    competitorPersistenceAuthorized: false,
    publicSiteWrites: false,
    publicationAuthorized: false,
  };
}

function assertClosedAuthorization(value: TechnicalIssueAuthorization): void {
  if (Object.values(value as unknown as Record<string, boolean>).some((flag) => flag !== false)) {
    throw new Error("technical_issue_authorization_must_be_closed");
  }
}

function normalizeLineage(value: TechnicalIssueLineage): TechnicalIssueLineage {
  requireFingerprint(value.urlExplorerFingerprint, "technical_issue_url_explorer_fingerprint_invalid");
  requireFingerprint(value.inventoryFingerprint, "technical_issue_inventory_fingerprint_invalid");
  if (value.recrawlPlanFingerprint !== null) requireFingerprint(value.recrawlPlanFingerprint, "technical_issue_recrawl_fingerprint_invalid");
  if (value.completionCertificationFingerprint !== null) requireFingerprint(value.completionCertificationFingerprint, "technical_issue_completion_fingerprint_invalid");
  return { ...value };
}

function taxonomyById(typeId: TechnicalIssueTypeId): TechnicalIssueTypeDefinition {
  const definition = TECHNICAL_ISSUE_TAXONOMY.find((candidate) => candidate.id === typeId);
  if (!definition) throw new Error("technical_issue_type_unknown");
  return definition;
}

export function assertTechnicalIssueTaxonomyIntegrity(): void {
  const ids = new Set<string>();
  for (const definition of TECHNICAL_ISSUE_TAXONOMY) {
    if (ids.has(definition.id)) throw new Error("technical_issue_taxonomy_duplicate_id");
    ids.add(definition.id);
    if (!TECHNICAL_ISSUE_CATEGORIES.includes(definition.category)) throw new Error("technical_issue_taxonomy_category_invalid");
    if (!TECHNICAL_ISSUE_SEVERITIES.includes(definition.defaultSeverity)) throw new Error("technical_issue_taxonomy_severity_invalid");
    if (definition.requiredDimensions.length === 0 || new Set(definition.requiredDimensions).size !== definition.requiredDimensions.length) throw new Error("technical_issue_taxonomy_dimensions_invalid");
    for (const dimension of definition.requiredDimensions) {
      if (!TECHNICAL_EVIDENCE_DIMENSIONS.includes(dimension)) throw new Error("technical_issue_taxonomy_dimension_unknown");
    }
    if (definition.availability === "retained_or_aggregate" && definition.requiredDimensions.some((dimension) => ![...P2_7_RETAINED_EVIDENCE_DIMENSIONS, "crawl_completeness"].includes(dimension as never))) {
      throw new Error("technical_issue_taxonomy_availability_invalid");
    }
  }
}

export const TECHNICAL_ISSUE_TAXONOMY_FINGERPRINT = sha256(TECHNICAL_ISSUE_TAXONOMY);

export function urlReferenceFromExplorerRow(row: Pick<UrlExplorerRow, "urlId" | "canonicalUrl" | "pathname">): TechnicalUrlReference {
  return normalizeUrlReference({ urlId: row.urlId, canonicalUrl: row.canonicalUrl, pathname: row.pathname });
}

function validateEvidenceSemantics(input: TechnicalEvidenceInput): void {
  const retained = (P2_7_RETAINED_EVIDENCE_DIMENSIONS as readonly string[]).includes(input.dimension);
  if (input.kind === "retained_fact") {
    if (input.source !== "p2_7_url_explorer" || !retained || input.unavailableReason) throw new Error("technical_evidence_retained_fact_invalid");
  } else if (input.kind === "aggregate_fact") {
    if (input.source !== "p2_4_completion_certification" || input.dimension !== "crawl_completeness" || input.affectedUrl || input.unavailableReason) throw new Error("technical_evidence_aggregate_fact_invalid");
  } else if (input.kind === "supplied_observation") {
    if (input.source !== "supplied_first_party_observation" || input.unavailableReason) throw new Error("technical_evidence_supplied_observation_invalid");
  } else if (input.kind === "unavailable") {
    if (input.source !== "unavailable_marker" || !input.unavailableReason || input.value !== undefined) throw new Error("technical_evidence_unavailable_invalid");
  } else {
    throw new Error("technical_evidence_kind_invalid");
  }
}

export function createTechnicalEvidence(input: TechnicalEvidenceInput): TechnicalEvidence {
  if (!TECHNICAL_EVIDENCE_DIMENSIONS.includes(input.dimension)) throw new Error("technical_evidence_dimension_invalid");
  if (!TECHNICAL_EVIDENCE_QUALITIES.includes(input.quality)) throw new Error("technical_evidence_quality_invalid");
  requireFingerprint(input.sourceFingerprint, "technical_evidence_source_fingerprint_invalid");
  validateEvidenceSemantics(input);
  const label = sanitizeText(input.label, TECHNICAL_ISSUE_LIMITS.labelLength, "technical_evidence_label_invalid");
  let value: string | number | boolean | null = input.value ?? null;
  if (typeof value === "string") value = sanitizeText(value, TECHNICAL_ISSUE_LIMITS.textLength, "technical_evidence_value_invalid");
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("technical_evidence_value_invalid");
  const affectedUrl = input.affectedUrl ? normalizeUrlReference(input.affectedUrl) : null;
  const unavailableReason = input.kind === "unavailable"
    ? sanitizeText(input.unavailableReason as string, TECHNICAL_ISSUE_LIMITS.labelLength, "technical_evidence_unavailable_reason_invalid")
    : null;
  const core = {
    kind: input.kind,
    dimension: input.dimension,
    quality: input.quality,
    source: input.source,
    sourceFingerprint: input.sourceFingerprint,
    label,
    value,
    affectedUrl,
    availability: input.kind === "unavailable" ? "unavailable" as const : "available" as const,
    unavailableReason,
  };
  const fingerprint = sha256(core);
  return { evidenceId: fingerprint, ...core, fingerprint };
}

export function assertTechnicalEvidenceIntegrity(evidence: TechnicalEvidence, origin?: string): void {
  requireFingerprint(evidence.evidenceId, "technical_evidence_id_invalid");
  requireFingerprint(evidence.fingerprint, "technical_evidence_fingerprint_invalid");
  if (evidence.evidenceId !== evidence.fingerprint) throw new Error("technical_evidence_id_fingerprint_mismatch");
  const rebuilt = createTechnicalEvidence({
    kind: evidence.kind,
    dimension: evidence.dimension,
    quality: evidence.quality,
    source: evidence.source,
    sourceFingerprint: evidence.sourceFingerprint,
    label: evidence.label,
    value: evidence.availability === "unavailable" ? undefined : evidence.value,
    affectedUrl: evidence.affectedUrl,
    unavailableReason: evidence.unavailableReason,
  });
  if (origin && rebuilt.affectedUrl) normalizeUrlReference(rebuilt.affectedUrl, origin);
  if (rebuilt.fingerprint !== evidence.fingerprint || stableSerialize(rebuilt) !== stableSerialize(evidence)) throw new Error("technical_evidence_fingerprint_mismatch");
}

function confidenceFor(evidence: TechnicalEvidence[]): TechnicalIssueConfidence {
  const available = evidence.filter((item) => item.availability === "available");
  if (available.length === 0) throw new Error("technical_issue_requires_available_evidence");
  const minimum = Math.min(...available.map((item) => qualityRank[item.quality]));
  if (minimum >= qualityRank.verified) return "verified";
  if (minimum >= qualityRank.strong) return "high";
  if (minimum >= qualityRank.moderate) return "medium";
  return "low";
}

function validateEvidenceRequirement(definition: TechnicalIssueTypeDefinition, evidence: TechnicalEvidence[]): void {
  const availableDimensions = new Set(evidence.filter((item) => item.availability === "available").map((item) => item.dimension));
  const matches = definition.requiredDimensions.map((dimension) => availableDimensions.has(dimension));
  const satisfied = definition.requirement === "all" ? matches.every(Boolean) : matches.some(Boolean);
  if (!satisfied) throw new Error("technical_issue_required_evidence_missing");
  if (definition.availability === "requires_supplied_observation") {
    const requiredSupplied = evidence.some((item) => item.availability === "available" && item.kind === "supplied_observation" && definition.requiredDimensions.includes(item.dimension));
    if (!requiredSupplied) throw new Error("technical_issue_supplied_observation_required");
  }
}

export function createTechnicalIssue(input: TechnicalIssueInput): TechnicalIssue {
  assertTechnicalIssueTaxonomyIntegrity();
  const definition = taxonomyById(input.typeId);
  const siteId = normalizeSiteId(input.siteId);
  const canonicalOrigin = normalizeOrigin(input.canonicalOrigin);
  const lineage = normalizeLineage(input.lineage);
  const affectedUrl = input.affectedUrl ? normalizeUrlReference(input.affectedUrl, canonicalOrigin) : null;
  if (definition.scope === "url" && !affectedUrl) throw new Error("technical_issue_url_scope_requires_url");
  if (definition.scope === "site" && affectedUrl) throw new Error("technical_issue_site_scope_forbids_url");
  if (!Array.isArray(input.evidence) || input.evidence.length < 1 || input.evidence.length > TECHNICAL_ISSUE_LIMITS.evidencePerIssue) throw new Error("technical_issue_evidence_count_invalid");
  const evidence = [...input.evidence];
  const seenEvidence = new Set<string>();
  for (const item of evidence) {
    assertTechnicalEvidenceIntegrity(item, canonicalOrigin);
    if (seenEvidence.has(item.evidenceId)) throw new Error("technical_issue_duplicate_evidence");
    seenEvidence.add(item.evidenceId);
    if (definition.scope === "url") {
      if (item.affectedUrl && item.affectedUrl.urlId !== affectedUrl?.urlId) throw new Error("technical_issue_evidence_url_mismatch");
      if (item.kind === "retained_fact" && !item.affectedUrl) throw new Error("technical_issue_retained_url_evidence_requires_url");
    } else if (item.affectedUrl) {
      throw new Error("technical_issue_site_evidence_forbids_url");
    }
  }
  validateEvidenceRequirement(definition, evidence);
  const severity = input.severity ?? definition.defaultSeverity;
  if (!TECHNICAL_ISSUE_SEVERITIES.includes(severity)) throw new Error("technical_issue_severity_invalid");
  if (severityRank[severity] < severityRank[definition.defaultSeverity]) throw new Error("technical_issue_severity_downgrade_denied");
  const status = input.status ?? "open";
  if (!TECHNICAL_ISSUE_STATUSES.includes(status)) throw new Error("technical_issue_status_invalid");
  const summary = sanitizeText(input.summary, TECHNICAL_ISSUE_LIMITS.textLength, "technical_issue_summary_invalid");
  const detail = input.detail === undefined || input.detail === null ? null : sanitizeText(input.detail, TECHNICAL_ISSUE_LIMITS.textLength, "technical_issue_detail_invalid");
  const evidenceSorted = [...evidence].sort((a, b) => a.evidenceId.localeCompare(b.evidenceId));
  const evidenceSetFingerprint = sha256(evidenceSorted.map((item) => item.fingerprint));
  const issueKey = sha256({ siteId, canonicalOrigin, typeId: definition.id, urlId: affectedUrl?.urlId ?? null });
  const authorization = closedAuthorization();
  const core = {
    version: "technical_issue_evidence_v1" as const,
    issueKey,
    typeId: definition.id,
    category: definition.category,
    scope: definition.scope,
    siteId,
    canonicalOrigin,
    lineage,
    affectedUrl,
    title: definition.title,
    summary,
    detail,
    severity,
    confidence: confidenceFor(evidenceSorted),
    status,
    evidence: evidenceSorted,
    evidenceSetFingerprint,
    capabilities: {
      p2_7RetainedDimensions: [...P2_7_RETAINED_EVIDENCE_DIMENSIONS] as TechnicalEvidenceDimension[],
      p2_7ExplicitlyUnavailableDimensions: [...P2_7_EXPLICITLY_UNAVAILABLE_DIMENSIONS] as TechnicalEvidenceDimension[],
      issueTypeAvailability: definition.availability,
    },
    authorization,
  };
  return { ...core, fingerprint: sha256(core) };
}

export function assertTechnicalIssueIntegrity(issue: TechnicalIssue): void {
  assertClosedAuthorization(issue.authorization);
  const rebuilt = createTechnicalIssue({
    typeId: issue.typeId,
    siteId: issue.siteId,
    canonicalOrigin: issue.canonicalOrigin,
    lineage: issue.lineage,
    affectedUrl: issue.affectedUrl,
    evidence: issue.evidence,
    severity: issue.severity,
    status: issue.status,
    summary: issue.summary,
    detail: issue.detail,
  });
  if (rebuilt.issueKey !== issue.issueKey || rebuilt.fingerprint !== issue.fingerprint || stableSerialize(rebuilt) !== stableSerialize(issue)) {
    throw new Error("technical_issue_fingerprint_mismatch");
  }
}

export function toTechnicalFindingSignal(issue: TechnicalIssue): TechnicalFindingSignal {
  assertTechnicalIssueIntegrity(issue);
  if (!issue.affectedUrl) throw new Error("technical_issue_site_scope_not_compatible_with_page_finding");
  if (issue.status === "resolved" || issue.status === "suppressed") throw new Error("technical_issue_inactive_not_compatible_with_page_finding");
  return {
    findingId: issue.issueKey,
    pageId: issue.affectedUrl.urlId,
    title: issue.title,
    severity: issue.severity,
    evidenceId: issue.evidenceSetFingerprint,
  };
}

function uniqueAllowed<T extends string>(values: T[] | undefined, allowed: readonly T[], code: string): T[] | null {
  if (values === undefined) return null;
  if (!Array.isArray(values) || values.length === 0 || new Set(values).size !== values.length || values.some((value) => !allowed.includes(value))) throw new Error(code);
  return [...values].sort();
}

function normalizeQuery(query: TechnicalIssueQuery | undefined): Required<Omit<TechnicalIssueQuery, "categories" | "severities" | "statuses" | "typeIds" | "urlId" | "text">> & {
  categories: TechnicalIssueCategory[] | null;
  severities: TechnicalIssueSeverity[] | null;
  statuses: TechnicalIssueStatus[] | null;
  typeIds: TechnicalIssueTypeId[] | null;
  urlId: string | null;
  text: string | null;
} {
  const input = query ?? {};
  const categories = uniqueAllowed(input.categories, TECHNICAL_ISSUE_CATEGORIES, "technical_issue_query_categories_invalid");
  const severities = uniqueAllowed(input.severities, TECHNICAL_ISSUE_SEVERITIES, "technical_issue_query_severities_invalid");
  const statuses = uniqueAllowed(input.statuses, TECHNICAL_ISSUE_STATUSES, "technical_issue_query_statuses_invalid");
  const knownIds = TECHNICAL_ISSUE_TAXONOMY.map((item) => item.id);
  const typeIds = uniqueAllowed(input.typeIds, knownIds, "technical_issue_query_type_ids_invalid");
  const urlId = input.urlId === undefined ? null : requireFingerprint(input.urlId, "technical_issue_query_url_id_invalid");
  const text = input.text === undefined ? null : sanitizeText(input.text, TECHNICAL_ISSUE_LIMITS.labelLength, "technical_issue_query_text_invalid");
  const field = input.sort?.field ?? "severity";
  const direction = input.sort?.direction ?? "desc";
  if (!["severity", "category", "typeId", "issueKey"].includes(field)) throw new Error("technical_issue_query_sort_field_invalid");
  if (!["asc", "desc"].includes(direction)) throw new Error("technical_issue_query_sort_direction_invalid");
  const offset = input.page?.offset ?? 0;
  const limit = input.page?.limit ?? 100;
  if (!Number.isInteger(offset) || offset < 0 || offset > TECHNICAL_ISSUE_LIMITS.offset) throw new Error("technical_issue_query_offset_invalid");
  if (!Number.isInteger(limit) || limit < 1 || limit > TECHNICAL_ISSUE_LIMITS.pageSize) throw new Error("technical_issue_query_limit_invalid");
  return { categories, severities, statuses, typeIds, urlId, text, sort: { field, direction }, page: { offset, limit } };
}

export function queryTechnicalIssues(issues: TechnicalIssue[], query?: TechnicalIssueQuery): TechnicalIssueQueryResult {
  if (!Array.isArray(issues) || issues.length > TECHNICAL_ISSUE_LIMITS.issuesPerQuery) throw new Error("technical_issue_query_input_count_invalid");
  for (const issue of issues) assertTechnicalIssueIntegrity(issue);
  if (new Set(issues.map((issue) => issue.fingerprint)).size !== issues.length) throw new Error("technical_issue_query_duplicate_issue");
  const normalized = normalizeQuery(query);
  const needle = normalized.text?.toLocaleLowerCase("en-US") ?? null;
  const filtered = issues.filter((issue) => {
    if (normalized.categories && !normalized.categories.includes(issue.category)) return false;
    if (normalized.severities && !normalized.severities.includes(issue.severity)) return false;
    if (normalized.statuses && !normalized.statuses.includes(issue.status)) return false;
    if (normalized.typeIds && !normalized.typeIds.includes(issue.typeId)) return false;
    if (normalized.urlId && issue.affectedUrl?.urlId !== normalized.urlId) return false;
    if (needle && !`${issue.title} ${issue.summary} ${issue.detail ?? ""} ${issue.affectedUrl?.canonicalUrl ?? ""}`.toLocaleLowerCase("en-US").includes(needle)) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (normalized.sort.field === "severity") cmp = severityRank[a.severity] - severityRank[b.severity];
    else if (normalized.sort.field === "category") cmp = a.category.localeCompare(b.category);
    else if (normalized.sort.field === "typeId") cmp = a.typeId.localeCompare(b.typeId);
    else cmp = a.issueKey.localeCompare(b.issueKey);
    if (cmp === 0) cmp = a.issueKey.localeCompare(b.issueKey);
    return normalized.sort.direction === "asc" ? cmp : -cmp;
  });
  const rows = sorted.slice(normalized.page.offset, normalized.page.offset + normalized.page.limit);
  const authorization = closedAuthorization();
  const core = {
    version: "technical_issue_query_v1" as const,
    queryFingerprint: sha256(normalized),
    rows,
    page: {
      offset: normalized.page.offset,
      limit: normalized.page.limit,
      returned: rows.length,
      totalMatched: sorted.length,
      hasMore: normalized.page.offset + rows.length < sorted.length,
    },
    authorization,
  };
  return { ...core, fingerprint: sha256(core) };
}
