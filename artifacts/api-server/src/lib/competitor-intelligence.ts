import { createHash } from "node:crypto";
import postgres from "postgres";
import { getRuntimeReadiness } from "./operational-data.js";

export const COMPETITOR_EVIDENCE_KIND = "competitor_page_observation";
export const COMPETITOR_EVIDENCE_SCHEMA_VERSION = "competitor_page_observation_v1";
export const COMPETITOR_INTELLIGENCE_CODE_VERSION = "task58-competitor-evidence-v1";

const MAX_SIGNAL_VALUES = 50;
const MAX_SIGNAL_LENGTH = 120;

export type CompetitorObservationInput = {
  source: string;
  sourceUrl: string;
  competitorDomain?: string | null;
  pageType?: string | null;
  observedAt: string;
  confidence?: number | null;
  title?: string | null;
  metaDescription?: string | null;
  h1?: string | null;
  bodyText?: string | null;
  wordCount?: number | null;
  keywordThemes?: string[] | null;
  taxonomyLabels?: string[] | null;
  schemaTypes?: string[] | null;
  entityTypes?: string[] | null;
  internalLinkPatterns?: string[] | null;
};

export type CompetitorSignals = {
  titleLength: number;
  metaDescriptionLength: number;
  h1Present: boolean;
  h1Length: number;
  wordCount: number;
  keywordThemes: string[];
  taxonomyLabels: string[];
  schemaTypes: string[];
  entityTypes: string[];
  internalLinkPatterns: string[];
};

export type CompetitorEvidencePayload = {
  schemaVersion: typeof COMPETITOR_EVIDENCE_SCHEMA_VERSION;
  codeVersion: typeof COMPETITOR_INTELLIGENCE_CODE_VERSION;
  competitorDomain: string;
  sourceUrl: string;
  pageType: string | null;
  signals: CompetitorSignals;
  fingerprint: string;
  advisoryOnly: true;
  causalAttribution: false;
  executionAuthorized: false;
  publicSiteWrites: false;
  automaticTransition: false;
};

export type CompetitorEvidenceEnvelope = {
  kind: typeof COMPETITOR_EVIDENCE_KIND;
  source: string;
  observedAt: string;
  confidence: number;
  payload: CompetitorEvidencePayload;
  provenance: {
    schemaVersion: typeof COMPETITOR_EVIDENCE_SCHEMA_VERSION;
    codeVersion: typeof COMPETITOR_INTELLIGENCE_CODE_VERSION;
    source: string;
    sourceUrl: string;
    contentFingerprint: string;
  };
};

export type CompetitorObservationResult =
  | { ok: true; record: CompetitorEvidenceEnvelope }
  | { ok: false; reason: "invalid_source" | "invalid_source_url" | "invalid_competitor_domain" | "domain_url_mismatch" | "own_domain_observation" | "invalid_observed_at" | "invalid_confidence" };

export type OwnedSemanticSignals = {
  keywordThemes?: string[] | null;
  taxonomyLabels?: string[] | null;
  schemaTypes?: string[] | null;
  entityTypes?: string[] | null;
  internalLinkPatterns?: string[] | null;
};

const normalizeWhitespace = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ");

const normalizeSource = (value: string) => {
  const normalized = normalizeWhitespace(value).toLowerCase();
  return normalized.length > 0 && normalized.length <= 80 ? normalized : null;
};

const normalizeTerm = (value: string) => {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (!normalized || normalized.length > MAX_SIGNAL_LENGTH) return null;
  return normalized;
};

const normalizeTerms = (values: string[] | null | undefined) => {
  const normalized = new Set<string>();
  for (const value of values ?? []) {
    if (typeof value !== "string") continue;
    const term = normalizeTerm(value);
    if (term) normalized.add(term);
    if (normalized.size >= MAX_SIGNAL_VALUES) break;
  }
  return [...normalized].sort();
};

const normalizeDomain = (value: string | null | undefined) => {
  if (!value || typeof value !== "string") return null;
  try {
    const parsed = new URL(value.includes("://") ? value : `https://${value}`);
    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
    if (!hostname || !hostname.includes(".") || hostname.length > 253) return null;
    return hostname;
  } catch {
    return null;
  }
};

const isOwnedDomain = (candidate: string | null, ownDomain: string | null) => Boolean(candidate && ownDomain && (candidate === ownDomain || candidate.endsWith(`.${ownDomain}`)));

const normalizeSourceUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (parsed.username || parsed.password) return null;
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
};

const normalizeObservedAt = (value: string) => {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
};

const normalizeConfidence = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 0.5;
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
};

const textLength = (value: string | null | undefined) => typeof value === "string" ? normalizeWhitespace(value).length : 0;

const deriveWordCount = (input: CompetitorObservationInput) => {
  if (typeof input.wordCount === "number" && Number.isFinite(input.wordCount) && input.wordCount >= 0) return Math.floor(input.wordCount);
  if (typeof input.bodyText !== "string") return 0;
  const normalized = normalizeWhitespace(input.bodyText);
  return normalized ? normalized.split(" ").length : 0;
};

const buildSignals = (input: CompetitorObservationInput): CompetitorSignals => ({
  titleLength: textLength(input.title),
  metaDescriptionLength: textLength(input.metaDescription),
  h1Present: textLength(input.h1) > 0,
  h1Length: textLength(input.h1),
  wordCount: deriveWordCount(input),
  keywordThemes: normalizeTerms(input.keywordThemes),
  taxonomyLabels: normalizeTerms(input.taxonomyLabels),
  schemaTypes: normalizeTerms(input.schemaTypes),
  entityTypes: normalizeTerms(input.entityTypes),
  internalLinkPatterns: normalizeTerms(input.internalLinkPatterns),
});

const buildFingerprint = (value: Omit<CompetitorEvidencePayload, "fingerprint" | "advisoryOnly" | "causalAttribution" | "executionAuthorized" | "publicSiteWrites" | "automaticTransition">) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function normalizeCompetitorObservation(input: CompetitorObservationInput, ownDomain?: string | null): CompetitorObservationResult {
  const source = normalizeSource(input.source);
  if (!source) return { ok: false, reason: "invalid_source" };

  const sourceUrl = normalizeSourceUrl(input.sourceUrl);
  if (!sourceUrl) return { ok: false, reason: "invalid_source_url" };

  const sourceDomain = normalizeDomain(new URL(sourceUrl).hostname);
  const competitorDomain = normalizeDomain(input.competitorDomain ?? sourceDomain);
  if (!competitorDomain) return { ok: false, reason: "invalid_competitor_domain" };
  if (sourceDomain !== competitorDomain) return { ok: false, reason: "domain_url_mismatch" };

  const normalizedOwnDomain = normalizeDomain(ownDomain);
  if (isOwnedDomain(competitorDomain, normalizedOwnDomain)) return { ok: false, reason: "own_domain_observation" };

  const observedAt = normalizeObservedAt(input.observedAt);
  if (!observedAt) return { ok: false, reason: "invalid_observed_at" };

  const confidence = normalizeConfidence(input.confidence);
  if (confidence === null) return { ok: false, reason: "invalid_confidence" };

  const pageType = input.pageType ? normalizeTerm(input.pageType) : null;
  const signals = buildSignals(input);
  const fingerprintBasis = {
    schemaVersion: COMPETITOR_EVIDENCE_SCHEMA_VERSION,
    codeVersion: COMPETITOR_INTELLIGENCE_CODE_VERSION,
    competitorDomain,
    sourceUrl,
    pageType,
    signals,
  } as const;
  const fingerprint = buildFingerprint(fingerprintBasis);
  const payload: CompetitorEvidencePayload = {
    ...fingerprintBasis,
    fingerprint,
    advisoryOnly: true,
    causalAttribution: false,
    executionAuthorized: false,
    publicSiteWrites: false,
    automaticTransition: false,
  };

  return {
    ok: true,
    record: {
      kind: COMPETITOR_EVIDENCE_KIND,
      source,
      observedAt,
      confidence,
      payload,
      provenance: {
        schemaVersion: COMPETITOR_EVIDENCE_SCHEMA_VERSION,
        codeVersion: COMPETITOR_INTELLIGENCE_CODE_VERSION,
        source,
        sourceUrl,
        contentFingerprint: fingerprint,
      },
    },
  };
}

export function deduplicateCompetitorEvidence(records: CompetitorEvidenceEnvelope[]) {
  const sorted = [...records].sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  const seen = new Set<string>();
  return sorted.filter((record) => {
    if (seen.has(record.payload.fingerprint)) return false;
    seen.add(record.payload.fingerprint);
    return true;
  });
}

const difference = (competitor: string[], own: string[]) => {
  const ownSet = new Set(normalizeTerms(own));
  return normalizeTerms(competitor).filter((value) => !ownSet.has(value));
};

export function compareCompetitorSignals(own: OwnedSemanticSignals, competitor: CompetitorEvidencePayload) {
  const gaps = {
    keywordThemes: difference(competitor.signals.keywordThemes, own.keywordThemes ?? []),
    taxonomyLabels: difference(competitor.signals.taxonomyLabels, own.taxonomyLabels ?? []),
    schemaTypes: difference(competitor.signals.schemaTypes, own.schemaTypes ?? []),
    entityTypes: difference(competitor.signals.entityTypes, own.entityTypes ?? []),
    internalLinkPatterns: difference(competitor.signals.internalLinkPatterns, own.internalLinkPatterns ?? []),
  };
  const gapCount = Object.values(gaps).reduce((total, values) => total + values.length, 0);
  return {
    competitorDomain: competitor.competitorDomain,
    sourceUrl: competitor.sourceUrl,
    gaps,
    gapCount,
    advisoryOnly: true as const,
    causalAttribution: false as const,
    executionAuthorized: false as const,
    publicSiteWrites: false as const,
    automaticTransition: false as const,
  };
}

function database() {
  const url = process.env.DATABASE_URL?.trim();
  return url ? postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 2 }) : null;
}

type CompetitorDbRow = {
  id: string;
  page_id: string | null;
  source: string;
  observed_at: string;
  confidence: number | string;
  payload: unknown;
  site_domain: string;
};

type PersistedPayload = Partial<CompetitorEvidencePayload> & { signals?: Partial<CompetitorSignals> };

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function sanitizePersistedRow(row: CompetitorDbRow) {
  if (!isObject(row.payload)) return null;
  const payload = row.payload as PersistedPayload;
  if (payload.schemaVersion !== COMPETITOR_EVIDENCE_SCHEMA_VERSION || payload.codeVersion !== COMPETITOR_INTELLIGENCE_CODE_VERSION) return null;
  if (typeof payload.competitorDomain !== "string" || typeof payload.sourceUrl !== "string" || typeof payload.fingerprint !== "string") return null;
  if (!isObject(payload.signals)) return null;

  const ownDomain = normalizeDomain(row.site_domain);
  const competitorDomain = normalizeDomain(payload.competitorDomain);
  const sourceUrl = normalizeSourceUrl(payload.sourceUrl);
  if (!competitorDomain || !sourceUrl || isOwnedDomain(competitorDomain, ownDomain)) return null;
  if (normalizeDomain(new URL(sourceUrl).hostname) !== competitorDomain) return null;

  const signals: CompetitorSignals = {
    titleLength: Math.max(0, Number(payload.signals.titleLength ?? 0) || 0),
    metaDescriptionLength: Math.max(0, Number(payload.signals.metaDescriptionLength ?? 0) || 0),
    h1Present: payload.signals.h1Present === true,
    h1Length: Math.max(0, Number(payload.signals.h1Length ?? 0) || 0),
    wordCount: Math.max(0, Number(payload.signals.wordCount ?? 0) || 0),
    keywordThemes: normalizeTerms(Array.isArray(payload.signals.keywordThemes) ? payload.signals.keywordThemes.filter((v): v is string => typeof v === "string") : []),
    taxonomyLabels: normalizeTerms(Array.isArray(payload.signals.taxonomyLabels) ? payload.signals.taxonomyLabels.filter((v): v is string => typeof v === "string") : []),
    schemaTypes: normalizeTerms(Array.isArray(payload.signals.schemaTypes) ? payload.signals.schemaTypes.filter((v): v is string => typeof v === "string") : []),
    entityTypes: normalizeTerms(Array.isArray(payload.signals.entityTypes) ? payload.signals.entityTypes.filter((v): v is string => typeof v === "string") : []),
    internalLinkPatterns: normalizeTerms(Array.isArray(payload.signals.internalLinkPatterns) ? payload.signals.internalLinkPatterns.filter((v): v is string => typeof v === "string") : []),
  };
  const pageType = typeof payload.pageType === "string" ? normalizeTerm(payload.pageType) : null;
  const fingerprintBasis = {
    schemaVersion: COMPETITOR_EVIDENCE_SCHEMA_VERSION,
    codeVersion: COMPETITOR_INTELLIGENCE_CODE_VERSION,
    competitorDomain,
    sourceUrl,
    pageType,
    signals,
  } as const;
  const fingerprint = buildFingerprint(fingerprintBasis);
  if (payload.fingerprint !== fingerprint) return null;

  return {
    id: row.id,
    page_id: row.page_id,
    source: row.source,
    observed_at: row.observed_at,
    confidence: Number(row.confidence),
    kind: COMPETITOR_EVIDENCE_KIND,
    schemaVersion: COMPETITOR_EVIDENCE_SCHEMA_VERSION,
    codeVersion: COMPETITOR_INTELLIGENCE_CODE_VERSION,
    competitorDomain,
    sourceUrl,
    pageType,
    signals,
    fingerprint,
    advisoryOnly: true as const,
    causalAttribution: false as const,
    executionAuthorized: false as const,
    publicSiteWrites: false as const,
    automaticTransition: false as const,
  };
}

export async function loadCompetitorIntelligence() {
  const readiness = await getRuntimeReadiness();
  if (readiness.state !== "live" || !readiness.siteId) return { readiness, rows: [] as Record<string, unknown>[], summary: null };
  const sql = database();
  if (!sql) return { readiness: { state: "unavailable" as const, message: "Database connection is not configured.", siteId: readiness.siteId }, rows: [] as Record<string, unknown>[], summary: null };

  try {
    const evidenceRows = await sql<CompetitorDbRow[]>`
      SELECT
        e.id::text AS id,
        e.page_id::text AS page_id,
        e.source,
        e.observed_at::text AS observed_at,
        e.confidence,
        e.payload,
        s.domain AS site_domain
      FROM evidence e
      JOIN sites s ON s.id=e.site_id
      WHERE e.site_id=${readiness.siteId}::uuid
        AND e.kind=${COMPETITOR_EVIDENCE_KIND}
      ORDER BY e.observed_at DESC, e.created_at DESC
      LIMIT 200`;

    const validRows = evidenceRows.map(sanitizePersistedRow).filter((row): row is NonNullable<typeof row> => row !== null);
    const seen = new Set<string>();
    const rows = validRows.filter((row) => {
      if (seen.has(row.fingerprint)) return false;
      seen.add(row.fingerprint);
      return true;
    });
    const competitorDomains = new Set(rows.map((row) => row.competitorDomain));

    return {
      readiness,
      rows,
      summary: {
        kind: COMPETITOR_EVIDENCE_KIND,
        schemaVersion: COMPETITOR_EVIDENCE_SCHEMA_VERSION,
        evidenceRows: evidenceRows.length,
        validRows: validRows.length,
        uniqueRows: rows.length,
        excludedRows: evidenceRows.length - validRows.length,
        duplicateRows: validRows.length - rows.length,
        uniqueCompetitors: competitorDomains.size,
        latestObservedAt: rows[0]?.observed_at ?? null,
        advisoryOnly: true as const,
        causalAttribution: false as const,
        executionAuthorized: false as const,
        publicSiteWrites: false as const,
        automaticTransition: false as const,
      },
    };
  } catch {
    return { readiness: { state: "unavailable" as const, message: "Competitor intelligence could not be loaded.", siteId: readiness.siteId }, rows: [] as Record<string, unknown>[], summary: null };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}
