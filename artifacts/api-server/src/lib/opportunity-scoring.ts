import { createHash } from "node:crypto";
import {
  P6_1_UNIFIED_OPPORTUNITY_TYPES_VERSION,
  buildUnifiedOpportunityRecord,
  type UnifiedOpportunityRecord,
  type UnifiedOpportunitySemanticGuard,
} from "./unified-opportunity-types.js";

export const P6_2_OPPORTUNITY_SCORING_VERSION = "p6.2-opportunity-scoring-v1" as const;
export const P6_2_MAX_COMPONENT_BASIS_REFS = 32 as const;

export type OpportunityScoreDimension = "impact" | "confidence" | "risk" | "effort" | "freshness";

export type OpportunityScoreComponentInput = {
  value: number | null;
  basisCode: string | null;
  evidenceFingerprints: string[];
};

export type OpportunityScoringInput = {
  opportunity: UnifiedOpportunityRecord;
  components: Record<OpportunityScoreDimension, OpportunityScoreComponentInput>;
};

export type OpportunityScoreComponent = {
  value: number | null;
  basisCode: string | null;
  evidenceFingerprints: string[];
};

export type OpportunityScoreStatus = "scored" | "unscorable";

export type UnifiedOpportunityScore = {
  version: typeof P6_2_OPPORTUNITY_SCORING_VERSION;
  scoreId: string;
  scoreFingerprint: string;
  opportunityId: string;
  opportunityFingerprint: string;
  status: OpportunityScoreStatus;
  components: Record<OpportunityScoreDimension, OpportunityScoreComponent>;
  modifiers: {
    riskRetention: number | null;
    effortRetention: number | null;
  };
  score01: number | null;
  score100: number | null;
  blockers: string[];
  inheritedSemanticGuards: UnifiedOpportunitySemanticGuard[];
  recordMissingEvidence: string[];
  formula: "impact * confidence * freshness * (1 - risk) * (1 - effort)";
  semantics: ReturnType<typeof opportunityScoringSemantics>;
  safety: ReturnType<typeof opportunityScoringCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const BASIS_CODE = /^[a-z0-9][a-z0-9._:-]{0,95}$/;
const DIMENSIONS: OpportunityScoreDimension[] = ["impact", "confidence", "risk", "effort", "freshness"];

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function round(value: number, digits = 6): number {
  return Number(value.toFixed(digits));
}

function canonicalP61Record(record: UnifiedOpportunityRecord): UnifiedOpportunityRecord {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("invalid_p61_opportunity");
  if (record.version !== P6_1_UNIFIED_OPPORTUNITY_TYPES_VERSION) throw new Error("unsupported_p61_opportunity_version");
  if (!HEX_64.test(record.opportunityFingerprint)) throw new Error("invalid_p61_opportunity_fingerprint");

  const rebuilt = buildUnifiedOpportunityRecord({
    family: record.family,
    kind: record.kind,
    subjectKey: record.subjectKey,
    referenceTime: record.referenceTime,
    marketFingerprint: record.scope.marketFingerprint,
    categoryFingerprint: record.scope.categoryFingerprint,
    evidence: record.evidence,
    missingEvidence: record.missingEvidence,
    legacyType: record.legacyType,
  });

  if (
    rebuilt.opportunityFingerprint !== record.opportunityFingerprint ||
    rebuilt.opportunityId !== record.opportunityId
  ) {
    throw new Error("p61_opportunity_integrity_mismatch");
  }
  return rebuilt;
}

function normalizeBasisCode(value: unknown): string {
  if (typeof value !== "string") throw new Error("invalid_component_basis_code");
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!BASIS_CODE.test(normalized)) throw new Error("invalid_component_basis_code");
  return normalized;
}

function normalizeComponent(
  dimension: OpportunityScoreDimension,
  input: OpportunityScoreComponentInput,
  evidenceFingerprints: Set<string>,
): OpportunityScoreComponent {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`invalid_${dimension}_component`);
  }
  if (!Array.isArray(input.evidenceFingerprints)) throw new Error(`invalid_${dimension}_evidence_basis`);
  if (input.evidenceFingerprints.length > P6_2_MAX_COMPONENT_BASIS_REFS) {
    throw new Error(`${dimension}_evidence_basis_limit_exceeded`);
  }

  if (input.value === null) {
    if (input.basisCode !== null || input.evidenceFingerprints.length !== 0) {
      throw new Error(`unavailable_${dimension}_must_not_claim_basis`);
    }
    return { value: null, basisCode: null, evidenceFingerprints: [] };
  }

  if (typeof input.value !== "number" || !Number.isFinite(input.value) || input.value < 0 || input.value > 1) {
    throw new Error(`invalid_${dimension}_value`);
  }
  if (input.evidenceFingerprints.length < 1) throw new Error(`${dimension}_evidence_basis_required`);

  const basisCode = normalizeBasisCode(input.basisCode);
  const basis = [...new Set(input.evidenceFingerprints.map((fingerprint) => {
    if (typeof fingerprint !== "string" || !HEX_64.test(fingerprint)) {
      throw new Error(`invalid_${dimension}_evidence_fingerprint`);
    }
    if (!evidenceFingerprints.has(fingerprint)) throw new Error(`${dimension}_evidence_not_on_opportunity`);
    return fingerprint;
  }))].sort((a, b) => a.localeCompare(b));

  return { value: round(input.value), basisCode, evidenceFingerprints: basis };
}

export function opportunityScoringSemantics() {
  return Object.freeze({
    providerNeutralNormalizedComponents: true,
    nullDistinctFromZero: true,
    missingComponentFailsClosed: true,
    singleOpportunityOnly: true,
    collectionRankingIncluded: false,
    prioritizationIncluded: false,
    recommendationGenerated: false,
    actionabilityClassified: false,
    providerNativeCrossComparisonPerformed: false,
    upstreamSemanticGuardsPreserved: true,
    legacyOpportunityScoreReplaced: false,
  });
}

export function opportunityScoringCapability() {
  return Object.freeze({
    deterministicScoringOnly: true,
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
    scorePersistenceAuthorized: false,
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

export function scoreUnifiedOpportunity(input: OpportunityScoringInput): UnifiedOpportunityScore {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_scoring_input");
  if (!input.components || typeof input.components !== "object" || Array.isArray(input.components)) {
    throw new Error("invalid_scoring_components");
  }

  const opportunity = canonicalP61Record(input.opportunity);
  const evidenceFingerprints = new Set(opportunity.evidence.map((ref) => ref.fingerprint));

  const components = Object.fromEntries(
    DIMENSIONS.map((dimension) => [
      dimension,
      normalizeComponent(dimension, input.components[dimension], evidenceFingerprints),
    ]),
  ) as Record<OpportunityScoreDimension, OpportunityScoreComponent>;

  const blockers = DIMENSIONS
    .filter((dimension) => components[dimension].value === null)
    .map((dimension) => `missing_${dimension}_score`);

  const riskRetention = components.risk.value === null ? null : round(1 - components.risk.value);
  const effortRetention = components.effort.value === null ? null : round(1 - components.effort.value);

  let score01: number | null = null;
  let score100: number | null = null;
  if (blockers.length === 0) {
    const impact = components.impact.value as number;
    const confidence = components.confidence.value as number;
    const freshness = components.freshness.value as number;
    score01 = round(
      impact *
      confidence *
      freshness *
      (riskRetention as number) *
      (effortRetention as number),
    );
    score100 = round(score01 * 100);
  }

  const formula = "impact * confidence * freshness * (1 - risk) * (1 - effort)" as const;
  const semantics = opportunityScoringSemantics();
  const identity = {
    version: P6_2_OPPORTUNITY_SCORING_VERSION,
    opportunityFingerprint: opportunity.opportunityFingerprint,
    components,
    blockers,
    formula,
    semantics,
  };
  const scoreFingerprint = hash(identity);

  return {
    version: P6_2_OPPORTUNITY_SCORING_VERSION,
    scoreId: `p62-score-${scoreFingerprint.slice(0, 20)}`,
    scoreFingerprint,
    opportunityId: opportunity.opportunityId,
    opportunityFingerprint: opportunity.opportunityFingerprint,
    status: blockers.length === 0 ? "scored" : "unscorable",
    components,
    modifiers: { riskRetention, effortRetention },
    score01,
    score100,
    blockers,
    inheritedSemanticGuards: [...opportunity.semanticGuards],
    recordMissingEvidence: [...opportunity.missingEvidence],
    formula,
    semantics,
    safety: opportunityScoringCapability(),
  };
}
