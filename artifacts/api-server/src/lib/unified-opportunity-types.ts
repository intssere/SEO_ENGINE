import { createHash } from "node:crypto";

export const P6_1_UNIFIED_OPPORTUNITY_TYPES_VERSION = "p6.1-unified-opportunity-types-v1" as const;
export const P6_1_MAX_EVIDENCE_REFS = 64 as const;
export const P6_1_MAX_MISSING_EVIDENCE_CODES = 32 as const;

export type UnifiedOpportunityFamily =
  | "technical"
  | "content"
  | "query"
  | "competitor"
  | "link"
  | "ai";

export type UnifiedOpportunityKind =
  | "technical_remediation"
  | "content_alignment"
  | "content_gap"
  | "organic_ctr"
  | "striking_distance"
  | "query_gap"
  | "competitor_visibility_gap"
  | "competitor_page_gap"
  | "competitor_topic_gap"
  | "internal_link"
  | "backlink_gap"
  | "ai_visibility_gap"
  | "ai_citation_gap";

export type LegacyOpportunityType =
  | "organic_ctr"
  | "striking_distance"
  | "technical_remediation"
  | "internal_link"
  | "content_alignment";

export type UnifiedOpportunityEvidenceKind =
  | "crawl_page"
  | "gsc_query"
  | "technical_issue"
  | "serp_ranking"
  | "keyword_metrics"
  | "trend_context"
  | "backlink_gap"
  | "competitor_gap"
  | "source_telemetry"
  | "ai_visibility";

export type UnifiedOpportunitySemanticGuard =
  | "null_distinct_from_zero"
  | "keyword_difficulty_provider_native_not_cross_provider_comparable"
  | "trend_request_frame_relative"
  | "trend_cross_frame_not_comparable"
  | "trend_not_absolute_search_demand"
  | "backlink_authority_provider_native_not_cross_provider_comparable"
  | "competitor_visibility_not_market_share"
  | "gap_evidence_not_recommendation"
  | "source_telemetry_descriptive_only"
  | "source_telemetry_does_not_control_refresh_or_execution"
  | "missing_evidence_not_fabricated";

export type UnifiedOpportunityEvidenceInput = {
  kind: UnifiedOpportunityEvidenceKind;
  fingerprint: string;
  sourceKey?: string | null;
  observedAt?: string | null;
  marketFingerprint?: string | null;
  categoryFingerprint?: string | null;
};

export type UnifiedOpportunityEvidenceRef = {
  kind: UnifiedOpportunityEvidenceKind;
  fingerprint: string;
  sourceKey: string | null;
  observedAt: string | null;
  marketFingerprint: string | null;
  categoryFingerprint: string | null;
};

export type UnifiedOpportunityInput = {
  family: UnifiedOpportunityFamily;
  kind: UnifiedOpportunityKind;
  subjectKey: string;
  referenceTime: string;
  marketFingerprint?: string | null;
  categoryFingerprint?: string | null;
  evidence: UnifiedOpportunityEvidenceInput[];
  missingEvidence?: string[];
  legacyType?: LegacyOpportunityType | null;
};

export type UnifiedOpportunityRecord = {
  version: typeof P6_1_UNIFIED_OPPORTUNITY_TYPES_VERSION;
  opportunityId: string;
  opportunityFingerprint: string;
  family: UnifiedOpportunityFamily;
  kind: UnifiedOpportunityKind;
  subjectKey: string;
  referenceTime: string;
  scope: {
    marketFingerprint: string | null;
    categoryFingerprint: string | null;
  };
  evidence: UnifiedOpportunityEvidenceRef[];
  missingEvidence: string[];
  semanticGuards: UnifiedOpportunitySemanticGuard[];
  legacyType: LegacyOpportunityType | null;
  semantics: ReturnType<typeof unifiedOpportunitySemantics>;
  safety: ReturnType<typeof unifiedOpportunityCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const CODE = /^[a-z0-9][a-z0-9._:-]{0,95}$/;

const FAMILY_BY_KIND: Record<UnifiedOpportunityKind, UnifiedOpportunityFamily> = {
  technical_remediation: "technical",
  content_alignment: "content",
  content_gap: "content",
  organic_ctr: "query",
  striking_distance: "query",
  query_gap: "query",
  competitor_visibility_gap: "competitor",
  competitor_page_gap: "competitor",
  competitor_topic_gap: "competitor",
  internal_link: "link",
  backlink_gap: "link",
  ai_visibility_gap: "ai",
  ai_citation_gap: "ai",
};

const LEGACY_CLASSIFICATION: Record<
  LegacyOpportunityType,
  { family: UnifiedOpportunityFamily; kind: UnifiedOpportunityKind }
> = {
  organic_ctr: { family: "query", kind: "organic_ctr" },
  striking_distance: { family: "query", kind: "striking_distance" },
  technical_remediation: { family: "technical", kind: "technical_remediation" },
  internal_link: { family: "link", kind: "internal_link" },
  content_alignment: { family: "content", kind: "content_alignment" },
};

const EVIDENCE_KINDS = new Set<UnifiedOpportunityEvidenceKind>([
  "crawl_page",
  "gsc_query",
  "technical_issue",
  "serp_ranking",
  "keyword_metrics",
  "trend_context",
  "backlink_gap",
  "competitor_gap",
  "source_telemetry",
  "ai_visibility",
]);

const GUARDS_BY_EVIDENCE_KIND: Record<UnifiedOpportunityEvidenceKind, UnifiedOpportunitySemanticGuard[]> = {
  crawl_page: [],
  gsc_query: ["null_distinct_from_zero"],
  technical_issue: [],
  serp_ranking: ["null_distinct_from_zero"],
  keyword_metrics: [
    "null_distinct_from_zero",
    "keyword_difficulty_provider_native_not_cross_provider_comparable",
  ],
  trend_context: [
    "null_distinct_from_zero",
    "trend_request_frame_relative",
    "trend_cross_frame_not_comparable",
    "trend_not_absolute_search_demand",
  ],
  backlink_gap: [
    "null_distinct_from_zero",
    "backlink_authority_provider_native_not_cross_provider_comparable",
    "gap_evidence_not_recommendation",
  ],
  competitor_gap: [
    "null_distinct_from_zero",
    "competitor_visibility_not_market_share",
    "gap_evidence_not_recommendation",
  ],
  source_telemetry: [
    "null_distinct_from_zero",
    "source_telemetry_descriptive_only",
    "source_telemetry_does_not_control_refresh_or_execution",
  ],
  ai_visibility: ["null_distinct_from_zero"],
};

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function exactOpaqueText(value: unknown, name: string, max: number): string {
  if (typeof value !== "string" || value.length < 1 || value.length > max) throw new Error(`invalid_${name}`);
  if (value !== value.trim() || /[\u0000-\u001f\u007f]/.test(value)) throw new Error(`invalid_${name}`);
  return value;
}

function canonicalTimestamp(value: unknown, name: string): string {
  const raw = exactOpaqueText(value, name, 64);
  const milliseconds = Date.parse(raw);
  if (!Number.isFinite(milliseconds)) throw new Error(`invalid_${name}`);
  return new Date(milliseconds).toISOString();
}

function fingerprintOrNull(value: unknown, name: string): string | null {
  if (value == null) return null;
  const raw = exactOpaqueText(value, name, 64);
  if (!HEX_64.test(raw)) throw new Error(`invalid_${name}`);
  return raw;
}

function sourceKeyOrNull(value: unknown): string | null {
  if (value == null) return null;
  return exactOpaqueText(value, "source_key", 160);
}

function normalizeEvidence(
  input: UnifiedOpportunityEvidenceInput,
  referenceTime: string,
): UnifiedOpportunityEvidenceRef {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_evidence");
  if (!EVIDENCE_KINDS.has(input.kind)) throw new Error("invalid_evidence_kind");
  const fingerprint = fingerprintOrNull(input.fingerprint, "evidence_fingerprint");
  if (fingerprint === null) throw new Error("invalid_evidence_fingerprint");
  const observedAt = input.observedAt == null ? null : canonicalTimestamp(input.observedAt, "observed_at");
  if (observedAt !== null && Date.parse(observedAt) > Date.parse(referenceTime)) {
    throw new Error("future_evidence_timestamp");
  }
  return {
    kind: input.kind,
    fingerprint,
    sourceKey: sourceKeyOrNull(input.sourceKey),
    observedAt,
    marketFingerprint: fingerprintOrNull(input.marketFingerprint, "market_fingerprint"),
    categoryFingerprint: fingerprintOrNull(input.categoryFingerprint, "category_fingerprint"),
  };
}

function normalizeMissingEvidence(values: string[] | undefined): string[] {
  if (values == null) return [];
  if (!Array.isArray(values) || values.length > P6_1_MAX_MISSING_EVIDENCE_CODES) {
    throw new Error("invalid_missing_evidence");
  }
  const normalized = values.map((value) => {
    if (typeof value !== "string") throw new Error("invalid_missing_evidence_code");
    const code = value.normalize("NFKC").trim().toLowerCase();
    if (!CODE.test(code)) throw new Error("invalid_missing_evidence_code");
    return code;
  });
  return [...new Set(normalized)].sort((a, b) => a.localeCompare(b));
}

function resolveScope(
  explicit: string | null,
  evidenceValues: Array<string | null>,
  dimension: "market" | "category",
): string | null {
  const distinct = [...new Set(evidenceValues.filter((value): value is string => value !== null))];
  if (distinct.length > 1) throw new Error(`mixed_${dimension}_scope_not_allowed`);
  const evidenceValue = distinct[0] ?? null;
  if (explicit !== null && evidenceValue !== null && explicit !== evidenceValue) {
    throw new Error(`${dimension}_scope_mismatch`);
  }
  return explicit ?? evidenceValue;
}

function semanticGuards(evidence: UnifiedOpportunityEvidenceRef[]): UnifiedOpportunitySemanticGuard[] {
  const guards = new Set<UnifiedOpportunitySemanticGuard>(["missing_evidence_not_fabricated"]);
  for (const ref of evidence) {
    for (const guard of GUARDS_BY_EVIDENCE_KIND[ref.kind]) guards.add(guard);
  }
  return [...guards].sort((a, b) => a.localeCompare(b));
}

export function familyForUnifiedOpportunityKind(kind: UnifiedOpportunityKind): UnifiedOpportunityFamily {
  const family = FAMILY_BY_KIND[kind];
  if (!family) throw new Error("invalid_opportunity_kind");
  return family;
}

export function classifyLegacyOpportunityType(
  legacyType: LegacyOpportunityType,
): { family: UnifiedOpportunityFamily; kind: UnifiedOpportunityKind } {
  const classification = LEGACY_CLASSIFICATION[legacyType];
  if (!classification) throw new Error("invalid_legacy_opportunity_type");
  return { ...classification };
}

export function unifiedOpportunitySemantics() {
  return Object.freeze({
    classificationOnly: true,
    crossSignalScoreIncluded: false,
    impactScoreIncluded: false,
    confidenceScoreIncluded: false,
    riskScoreIncluded: false,
    effortScoreIncluded: false,
    freshnessScoreIncluded: false,
    priorityIncluded: false,
    recommendationGenerated: false,
    missingEvidenceFabricated: false,
  });
}

export function unifiedOpportunityCapability() {
  return Object.freeze({
    deterministicNormalizationOnly: true,
    legacyOpportunityEngineMutationEnabled: false,
    openApiMutationEnabled: false,
    liveProviderReadsAuthorized: false,
    providerCredentialUseAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
    refreshPlanReorderingEnabled: false,
    task64ExecutionAuthorized: false,
    task70ExecutionAuthorized: false,
    observationPersistenceAuthorized: false,
    evidencePersistenceAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    schemaMutationAuthorized: false,
    schedulerEnabled: false,
    workerEnabled: false,
    retryLoopEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticTransitionEnabled: false,
    publicationAuthorized: false,
  });
}

export function buildUnifiedOpportunityRecord(input: UnifiedOpportunityInput): UnifiedOpportunityRecord {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_opportunity_input");
  const expectedFamily = familyForUnifiedOpportunityKind(input.kind);
  if (input.family !== expectedFamily) throw new Error("opportunity_family_kind_mismatch");

  const subjectKey = exactOpaqueText(input.subjectKey, "subject_key", 512);
  const referenceTime = canonicalTimestamp(input.referenceTime, "reference_time");
  const explicitMarket = fingerprintOrNull(input.marketFingerprint, "market_fingerprint");
  const explicitCategory = fingerprintOrNull(input.categoryFingerprint, "category_fingerprint");

  if (!Array.isArray(input.evidence) || input.evidence.length < 1) throw new Error("evidence_required");
  if (input.evidence.length > P6_1_MAX_EVIDENCE_REFS) throw new Error("evidence_limit_exceeded");

  const normalizedEvidence = input.evidence.map((item) => normalizeEvidence(item, referenceTime));
  const byFingerprint = new Map<string, UnifiedOpportunityEvidenceRef>();
  for (const ref of normalizedEvidence) {
    const previous = byFingerprint.get(ref.fingerprint);
    if (previous === undefined) {
      byFingerprint.set(ref.fingerprint, ref);
      continue;
    }
    if (JSON.stringify(previous) !== JSON.stringify(ref)) throw new Error("conflicting_evidence_fingerprint");
  }
  const evidence = [...byFingerprint.values()].sort(
    (a, b) => a.kind.localeCompare(b.kind) || a.fingerprint.localeCompare(b.fingerprint),
  );

  const scope = {
    marketFingerprint: resolveScope(explicitMarket, evidence.map((ref) => ref.marketFingerprint), "market"),
    categoryFingerprint: resolveScope(explicitCategory, evidence.map((ref) => ref.categoryFingerprint), "category"),
  };

  const legacyType = input.legacyType ?? null;
  if (legacyType !== null) {
    const legacy = classifyLegacyOpportunityType(legacyType);
    if (legacy.family !== input.family || legacy.kind !== input.kind) {
      throw new Error("legacy_opportunity_type_mismatch");
    }
  }

  const missingEvidence = normalizeMissingEvidence(input.missingEvidence);
  const guards = semanticGuards(evidence);
  const semantics = unifiedOpportunitySemantics();

  const identity = {
    version: P6_1_UNIFIED_OPPORTUNITY_TYPES_VERSION,
    family: input.family,
    kind: input.kind,
    subjectKey,
    referenceTime,
    scope,
    evidence,
    missingEvidence,
    semanticGuards: guards,
    legacyType,
    semantics,
  };
  const opportunityFingerprint = hash(identity);

  return {
    version: P6_1_UNIFIED_OPPORTUNITY_TYPES_VERSION,
    opportunityId: `p61-opportunity-${opportunityFingerprint.slice(0, 20)}`,
    opportunityFingerprint,
    family: input.family,
    kind: input.kind,
    subjectKey,
    referenceTime,
    scope,
    evidence,
    missingEvidence,
    semanticGuards: guards,
    legacyType,
    semantics,
    safety: unifiedOpportunityCapability(),
  };
}
