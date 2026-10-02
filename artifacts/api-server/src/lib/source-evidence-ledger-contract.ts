import {
  assertResearchPlanIntegrity,
  type ResearchEvidenceClass,
  type ResearchPlan,
} from "./research-plan-contract.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_SOURCE_EVIDENCE_LEDGER_VERSION =
  "ugp-7-2-source-evidence-ledger-v1" as const;

export const UGP_SOURCE_EVIDENCE_LEDGER_POLICY = Object.freeze({
  maxSources: 64,
  maxEvidenceItems: 256,
  maxEvidenceItemsPerSource: 32,
  maxQuestionRefsPerEvidence: 8,
  maxEvidenceClassesPerEvidence: 8,
  maxClaimRefsPerEvidence: 16,
  maxExtractedEvidenceChars: 4000,
} as const);

export type ResearchSourceKind =
  | "official_primary"
  | "standards_or_regulatory"
  | "first_party_business"
  | "reputable_secondary"
  | "site_content"
  | "search_context"
  | "upstream_certified_evidence"
  | "other";

export type SourceAcquisitionMethod =
  | "captured_http"
  | "provider_api"
  | "manual_import"
  | "internal_evidence"
  | "other";

export type SourceSupportTier =
  | "insufficient"
  | "limited"
  | "supported"
  | "strong";

export type ClaimRelevance =
  | "direct"
  | "supporting"
  | "contextual"
  | "not_assessed";

export type SourceQualitySignals = Readonly<{
  publisherIdentityKnown: boolean;
  authorIdentityKnown: boolean;
  publicationDateAvailable: boolean;
  updateDateAvailable: boolean;
  provenanceComplete: boolean;
  firstPartyOrOfficial: boolean;
  independentlyProduced: boolean;
}>;

export type CapturedResearchSourceInput = Readonly<{
  sourceId: string;
  sourceKind: ResearchSourceKind;
  acquisitionMethod: SourceAcquisitionMethod;
  locator: string;
  canonicalLocator?: string | null;
  title: string;
  publisher?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  acquiredAt: string;
  sourceFingerprint: string;
  qualitySignals: SourceQualitySignals;
}>;

export type CapturedResearchEvidenceInput = Readonly<{
  sourceId: string;
  extractedEvidence: string;
  questionIds: readonly string[];
  evidenceClasses: readonly ResearchEvidenceClass[];
  claimRefs?: readonly Readonly<{
    claimKey: string;
    relevance: ClaimRelevance;
  }>[];
}>;

export type ResearchSourceRecord = Readonly<{
  sourceId: string;
  sourceKind: ResearchSourceKind;
  acquisitionMethod: SourceAcquisitionMethod;
  locator: string;
  canonicalLocator: string | null;
  title: string;
  publisher: string | null;
  author: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  acquiredAt: string;
  sourceFingerprint: string;
  qualitySignals: SourceQualitySignals;
  supportTier: SourceSupportTier;
  sourceRecordFingerprint: string;
}>;

export type ResearchEvidenceRecord = Readonly<{
  evidenceId: string;
  sourceId: string;
  sourceRecordFingerprint: string;
  extractedEvidence: string;
  questionIds: readonly string[];
  evidenceClasses: readonly ResearchEvidenceClass[];
  claimRefs: readonly Readonly<{
    claimKey: string;
    relevance: ClaimRelevance;
  }>[];
  evidenceFingerprint: string;
}>;

export type SourceEvidenceCoverage = Readonly<{
  requiredEvidenceClass: ResearchEvidenceClass;
  evidenceCount: number;
  sourceCount: number;
  status: "observed" | "missing";
}>;

export type SourceEvidenceLedger = Readonly<{
  version: typeof UGP_SOURCE_EVIDENCE_LEDGER_VERSION;
  ledgerId: string;
  ledgerFingerprint: string;
  researchPlanId: string;
  researchPlanFingerprint: string;
  opportunityId: string;
  targetTopic: string;
  sources: readonly ResearchSourceRecord[];
  evidence: readonly ResearchEvidenceRecord[];
  coverage: readonly SourceEvidenceCoverage[];
  unresolvedEvidenceClasses: readonly ResearchEvidenceClass[];
  provenance: Readonly<{
    contentOpportunityModelFingerprint: string;
    contentOpportunityFingerprint: string;
    topicClusteringFingerprint: string;
    coverageAssessmentFingerprint: string;
    cannibalizationAssessmentFingerprint: string;
    businessRelevanceEvidenceFingerprint: string;
  }>;
  semantics: Readonly<{
    deterministic: true;
    capturedAcquisitionOnly: true;
    performsNetworkOperation: false;
    performsLiveSourceAcquisition: false;
    performsPersistence: false;
    extractedEvidenceIsNotVerifiedClaim: true;
    conflictingEvidenceMayCoexist: true;
    sourceQualityDoesNotEstablishTruth: true;
    generatesArticleText: false;
    publicationAuthorized: false;
    executionAuthorized: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
}>;

const SEMANTICS = Object.freeze({
  deterministic: true as const,
  capturedAcquisitionOnly: true as const,
  performsNetworkOperation: false as const,
  performsLiveSourceAcquisition: false as const,
  performsPersistence: false as const,
  extractedEvidenceIsNotVerifiedClaim: true as const,
  conflictingEvidenceMayCoexist: true as const,
  sourceQualityDoesNotEstablishTruth: true as const,
  generatesArticleText: false as const,
  publicationAuthorized: false as const,
  executionAuthorized: false as const,
  providerWrites: false as const,
  publicSiteWrites: false as const,
});

const SOURCE_KINDS = new Set<ResearchSourceKind>([
  "official_primary",
  "standards_or_regulatory",
  "first_party_business",
  "reputable_secondary",
  "site_content",
  "search_context",
  "upstream_certified_evidence",
  "other",
]);

const ACQUISITION_METHODS = new Set<SourceAcquisitionMethod>([
  "captured_http",
  "provider_api",
  "manual_import",
  "internal_evidence",
  "other",
]);

const CLAIM_RELEVANCE = new Set<ClaimRelevance>([
  "direct",
  "supporting",
  "contextual",
  "not_assessed",
]);

function exactText(value: unknown, field: string, max = 2048): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || value.length < 1
    || value.length > max
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_source_ledger_invalid_" + field);
  }
  return value;
}

function optionalText(
  value: unknown,
  field: string,
  max = 512,
): string | null {
  if (value == null) return null;
  return exactText(value, field, max);
}

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("ugp_source_ledger_invalid_" + field);
  }
  return value;
}

function canonicalTimestamp(
  value: unknown,
  field: string,
  nullable = false,
): string | null {
  if (value == null) {
    if (nullable) return null;
    throw new Error("ugp_source_ledger_invalid_" + field);
  }
  const raw = exactText(value, field, 64);
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error("ugp_source_ledger_invalid_" + field);
  }
  return new Date(parsed).toISOString();
}

function normalizeLocator(value: unknown, field: string): string {
  const raw = exactText(value, field, 2048);
  try {
    const url = new URL(raw);
    url.hash = "";
    return url.toString();
  } catch {
    return raw;
  }
}

function normalizeSourceId(value: unknown): string {
  const raw = exactText(value, "source_id", 256);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/.test(raw)) {
    throw new Error("ugp_source_ledger_invalid_source_id");
  }
  return raw;
}

function normalizeClaimKey(value: unknown): string {
  const raw = exactText(value, "claim_key", 256);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/.test(raw)) {
    throw new Error("ugp_source_ledger_invalid_claim_key");
  }
  return raw;
}

function supportTier(signals: SourceQualitySignals): SourceSupportTier {
  if (!signals.provenanceComplete || !signals.publisherIdentityKnown) {
    return "insufficient";
  }
  if (
    signals.firstPartyOrOfficial
    && signals.publicationDateAvailable
  ) {
    return "strong";
  }
  if (
    signals.independentlyProduced
    && (signals.publicationDateAvailable || signals.updateDateAvailable)
  ) {
    return "supported";
  }
  return "limited";
}

function normalizeSource(
  input: CapturedResearchSourceInput,
): ResearchSourceRecord {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_source_ledger_invalid_source");
  }
  if (!SOURCE_KINDS.has(input.sourceKind)) {
    throw new Error("ugp_source_ledger_invalid_source_kind");
  }
  if (!ACQUISITION_METHODS.has(input.acquisitionMethod)) {
    throw new Error("ugp_source_ledger_invalid_acquisition_method");
  }
  if (
    !input.qualitySignals
    || typeof input.qualitySignals !== "object"
    || Array.isArray(input.qualitySignals)
  ) {
    throw new Error("ugp_source_ledger_invalid_quality_signals");
  }

  const qualitySignals = Object.freeze({
    publisherIdentityKnown: input.qualitySignals.publisherIdentityKnown === true,
    authorIdentityKnown: input.qualitySignals.authorIdentityKnown === true,
    publicationDateAvailable:
      input.qualitySignals.publicationDateAvailable === true,
    updateDateAvailable: input.qualitySignals.updateDateAvailable === true,
    provenanceComplete: input.qualitySignals.provenanceComplete === true,
    firstPartyOrOfficial: input.qualitySignals.firstPartyOrOfficial === true,
    independentlyProduced: input.qualitySignals.independentlyProduced === true,
  });

  const publishedAt = canonicalTimestamp(
    input.publishedAt,
    "published_at",
    true,
  );
  const updatedAt = canonicalTimestamp(
    input.updatedAt,
    "updated_at",
    true,
  );
  const acquiredAt = canonicalTimestamp(
    input.acquiredAt,
    "acquired_at",
  ) as string;

  if (publishedAt && Date.parse(publishedAt) > Date.parse(acquiredAt)) {
    throw new Error("ugp_source_ledger_publication_after_acquisition");
  }
  if (updatedAt && Date.parse(updatedAt) > Date.parse(acquiredAt)) {
    throw new Error("ugp_source_ledger_update_after_acquisition");
  }
  if (
    qualitySignals.publicationDateAvailable !== (publishedAt !== null)
    || qualitySignals.updateDateAvailable !== (updatedAt !== null)
  ) {
    throw new Error("ugp_source_ledger_date_signal_mismatch");
  }

  const base = {
    sourceId: normalizeSourceId(input.sourceId),
    sourceKind: input.sourceKind,
    acquisitionMethod: input.acquisitionMethod,
    locator: normalizeLocator(input.locator, "locator"),
    canonicalLocator: input.canonicalLocator == null
      ? null
      : normalizeLocator(input.canonicalLocator, "canonical_locator"),
    title: exactText(input.title, "title", 1024),
    publisher: optionalText(input.publisher, "publisher"),
    author: optionalText(input.author, "author"),
    publishedAt,
    updatedAt,
    acquiredAt,
    sourceFingerprint: exactFingerprint(
      input.sourceFingerprint,
      "source_fingerprint",
    ),
    qualitySignals,
    supportTier: supportTier(qualitySignals),
  };

  return Object.freeze({
    ...base,
    sourceRecordFingerprint: stableEvidenceHash({
      purpose: "ugp_research_source_record",
      version: UGP_SOURCE_EVIDENCE_LEDGER_VERSION,
      ...base,
    }),
  });
}

function normalizeEvidence(
  input: CapturedResearchEvidenceInput,
  sourceById: ReadonlyMap<string, ResearchSourceRecord>,
  questionIds: ReadonlySet<string>,
  permittedEvidenceClasses: ReadonlySet<ResearchEvidenceClass>,
): ResearchEvidenceRecord {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_source_ledger_invalid_evidence");
  }

  const sourceId = normalizeSourceId(input.sourceId);
  const source = sourceById.get(sourceId);
  if (!source) throw new Error("ugp_source_ledger_unknown_source");

  const extractedEvidence = exactText(
    input.extractedEvidence,
    "extracted_evidence",
    UGP_SOURCE_EVIDENCE_LEDGER_POLICY.maxExtractedEvidenceChars,
  );

  if (
    !Array.isArray(input.questionIds)
    || input.questionIds.length < 1
    || input.questionIds.length
      > UGP_SOURCE_EVIDENCE_LEDGER_POLICY.maxQuestionRefsPerEvidence
  ) {
    throw new Error("ugp_source_ledger_invalid_question_refs");
  }
  const normalizedQuestionIds = Object.freeze(
    [...new Set(input.questionIds.map((value) =>
      exactFingerprint(value, "question_id"),
    ))].sort(),
  );
  if (normalizedQuestionIds.some((value) => !questionIds.has(value))) {
    throw new Error("ugp_source_ledger_unknown_question_ref");
  }

  if (
    !Array.isArray(input.evidenceClasses)
    || input.evidenceClasses.length < 1
    || input.evidenceClasses.length
      > UGP_SOURCE_EVIDENCE_LEDGER_POLICY.maxEvidenceClassesPerEvidence
  ) {
    throw new Error("ugp_source_ledger_invalid_evidence_classes");
  }
  const evidenceClasses = Object.freeze(
    [...new Set(input.evidenceClasses)].sort(),
  );
  if (evidenceClasses.some((value) => !permittedEvidenceClasses.has(value))) {
    throw new Error("ugp_source_ledger_unplanned_evidence_class");
  }

  const claimRefs = input.claimRefs ?? [];
  if (
    !Array.isArray(claimRefs)
    || claimRefs.length > UGP_SOURCE_EVIDENCE_LEDGER_POLICY.maxClaimRefsPerEvidence
  ) {
    throw new Error("ugp_source_ledger_invalid_claim_refs");
  }
  const normalizedClaimRefs = Object.freeze(
    claimRefs.map((claim) => {
      if (
        !claim
        || typeof claim !== "object"
        || Array.isArray(claim)
        || !CLAIM_RELEVANCE.has(claim.relevance)
      ) {
        throw new Error("ugp_source_ledger_invalid_claim_ref");
      }
      return Object.freeze({
        claimKey: normalizeClaimKey(claim.claimKey),
        relevance: claim.relevance,
      });
    }).sort((left, right) =>
      left.claimKey.localeCompare(right.claimKey)
      || left.relevance.localeCompare(right.relevance),
    ),
  );

  const duplicateClaimKey = normalizedClaimRefs.find(
    (value, index) =>
      index > 0
      && value.claimKey === normalizedClaimRefs[index - 1]?.claimKey,
  );
  if (duplicateClaimKey) {
    throw new Error("ugp_source_ledger_duplicate_claim_ref");
  }

  const base = {
    sourceId,
    sourceRecordFingerprint: source.sourceRecordFingerprint,
    extractedEvidence,
    questionIds: normalizedQuestionIds,
    evidenceClasses,
    claimRefs: normalizedClaimRefs,
  };
  const evidenceFingerprint = stableEvidenceHash({
    purpose: "ugp_research_evidence_record",
    version: UGP_SOURCE_EVIDENCE_LEDGER_VERSION,
    ...base,
  });

  return Object.freeze({
    evidenceId: stableEvidenceHash({
      purpose: "ugp_research_evidence_id",
      evidenceFingerprint,
    }),
    ...base,
    evidenceFingerprint,
  });
}

export function buildSourceEvidenceLedger(input: {
  researchPlan: ResearchPlan;
  sources: readonly CapturedResearchSourceInput[];
  evidence: readonly CapturedResearchEvidenceInput[];
}): SourceEvidenceLedger {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_source_ledger_invalid_input");
  }
  assertResearchPlanIntegrity(input.researchPlan);

  if (
    !Array.isArray(input.sources)
    || input.sources.length < 1
    || input.sources.length > UGP_SOURCE_EVIDENCE_LEDGER_POLICY.maxSources
  ) {
    throw new Error("ugp_source_ledger_source_count_invalid");
  }
  if (
    !Array.isArray(input.evidence)
    || input.evidence.length < 1
    || input.evidence.length > UGP_SOURCE_EVIDENCE_LEDGER_POLICY.maxEvidenceItems
  ) {
    throw new Error("ugp_source_ledger_evidence_count_invalid");
  }

  const sources = Object.freeze(
    input.sources.map(normalizeSource).sort((left, right) =>
      left.sourceId.localeCompare(right.sourceId)
      || left.sourceRecordFingerprint.localeCompare(right.sourceRecordFingerprint),
    ),
  );

  const sourceById = new Map<string, ResearchSourceRecord>();
  const sourceFingerprints = new Set<string>();
  for (const source of sources) {
    if (sourceById.has(source.sourceId)) {
      throw new Error("ugp_source_ledger_duplicate_source_id");
    }
    if (sourceFingerprints.has(source.sourceFingerprint)) {
      throw new Error("ugp_source_ledger_duplicate_source_fingerprint");
    }
    sourceById.set(source.sourceId, source);
    sourceFingerprints.add(source.sourceFingerprint);
  }

  const questionIds = new Set(
    input.researchPlan.questions.map((question) => question.questionId),
  );
  const permittedEvidenceClasses = new Set(
    input.researchPlan.requiredEvidenceClasses,
  );

  const evidence = Object.freeze(
    input.evidence.map((item) =>
      normalizeEvidence(
        item,
        sourceById,
        questionIds,
        permittedEvidenceClasses,
      ),
    ).sort((left, right) =>
      left.sourceId.localeCompare(right.sourceId)
      || left.evidenceFingerprint.localeCompare(right.evidenceFingerprint),
    ),
  );

  const perSourceCount = new Map<string, number>();
  const evidenceFingerprints = new Set<string>();
  for (const item of evidence) {
    perSourceCount.set(
      item.sourceId,
      (perSourceCount.get(item.sourceId) ?? 0) + 1,
    );
    if (
      (perSourceCount.get(item.sourceId) ?? 0)
      > UGP_SOURCE_EVIDENCE_LEDGER_POLICY.maxEvidenceItemsPerSource
    ) {
      throw new Error("ugp_source_ledger_per_source_evidence_limit_exceeded");
    }
    if (evidenceFingerprints.has(item.evidenceFingerprint)) {
      throw new Error("ugp_source_ledger_duplicate_evidence");
    }
    evidenceFingerprints.add(item.evidenceFingerprint);
  }

  const coverage = Object.freeze(
    [...input.researchPlan.requiredEvidenceClasses]
      .sort()
      .map((requiredEvidenceClass): SourceEvidenceCoverage => {
        const matching = evidence.filter((item) =>
          item.evidenceClasses.includes(requiredEvidenceClass),
        );
        return Object.freeze({
          requiredEvidenceClass,
          evidenceCount: matching.length,
          sourceCount: new Set(matching.map((item) => item.sourceId)).size,
          status: matching.length > 0 ? "observed" : "missing",
        });
      }),
  );

  const unresolvedEvidenceClasses = Object.freeze(
    coverage
      .filter((item) => item.status === "missing")
      .map((item) => item.requiredEvidenceClass),
  );

  const base = {
    version: UGP_SOURCE_EVIDENCE_LEDGER_VERSION,
    researchPlanId: input.researchPlan.planId,
    researchPlanFingerprint: input.researchPlan.planFingerprint,
    opportunityId: input.researchPlan.opportunityId,
    targetTopic: input.researchPlan.targetTopic,
    sources,
    evidence,
    coverage,
    unresolvedEvidenceClasses,
    provenance: input.researchPlan.provenance,
    semantics: SEMANTICS,
  };

  const ledgerFingerprint = stableEvidenceHash({
    purpose: "ugp_source_evidence_ledger",
    ...base,
  });

  return Object.freeze({
    ...base,
    ledgerId: stableEvidenceHash({
      purpose: "ugp_source_evidence_ledger_id",
      version: UGP_SOURCE_EVIDENCE_LEDGER_VERSION,
      researchPlanId: input.researchPlan.planId,
      ledgerFingerprint,
    }),
    ledgerFingerprint,
  });
}

export function assertSourceEvidenceLedgerIntegrity(
  result: SourceEvidenceLedger,
): void {
  if (!result || result.version !== UGP_SOURCE_EVIDENCE_LEDGER_VERSION) {
    throw new Error("ugp_source_ledger_version_invalid");
  }
  if (
    result.semantics.deterministic !== true
    || result.semantics.capturedAcquisitionOnly !== true
    || result.semantics.performsNetworkOperation !== false
    || result.semantics.performsLiveSourceAcquisition !== false
    || result.semantics.performsPersistence !== false
    || result.semantics.extractedEvidenceIsNotVerifiedClaim !== true
    || result.semantics.conflictingEvidenceMayCoexist !== true
    || result.semantics.sourceQualityDoesNotEstablishTruth !== true
    || result.semantics.generatesArticleText !== false
    || result.semantics.publicationAuthorized !== false
    || result.semantics.executionAuthorized !== false
    || result.semantics.providerWrites !== false
    || result.semantics.publicSiteWrites !== false
  ) {
    throw new Error("ugp_source_ledger_unsafe_semantics");
  }

  exactFingerprint(result.ledgerId, "ledger_id");
  exactFingerprint(result.ledgerFingerprint, "ledger_fingerprint");
  exactFingerprint(result.researchPlanId, "research_plan_id");
  exactFingerprint(result.researchPlanFingerprint, "research_plan_fingerprint");

  if (
    result.sources.length < 1
    || result.sources.length > UGP_SOURCE_EVIDENCE_LEDGER_POLICY.maxSources
    || result.evidence.length < 1
    || result.evidence.length > UGP_SOURCE_EVIDENCE_LEDGER_POLICY.maxEvidenceItems
  ) {
    throw new Error("ugp_source_ledger_bounds_invalid");
  }

  const {
    ledgerId: _ledgerId,
    ledgerFingerprint,
    ...base
  } = result;
  const expectedFingerprint = stableEvidenceHash({
    purpose: "ugp_source_evidence_ledger",
    ...base,
  });
  if (ledgerFingerprint !== expectedFingerprint) {
    throw new Error("ugp_source_ledger_fingerprint_mismatch");
  }

  const expectedId = stableEvidenceHash({
    purpose: "ugp_source_evidence_ledger_id",
    version: UGP_SOURCE_EVIDENCE_LEDGER_VERSION,
    researchPlanId: result.researchPlanId,
    ledgerFingerprint,
  });
  if (result.ledgerId !== expectedId) {
    throw new Error("ugp_source_ledger_id_mismatch");
  }
}
