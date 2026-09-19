import { createHash } from "node:crypto";
import {
  P7_5_AI_VISIBILITY_SCORING_HISTORY_VERSION,
  buildAiVisibilityScoringHistory,
  type AiVisibilityScoringHistoryInput,
  type AiVisibilityScoringHistoryReport,
  type AiVisibilityScoreRecord,
  type AiVisibilityScoreSnapshot,
} from "./ai-visibility-scoring-history.js";
import type {
  AiCitationCompetitorComparisonReport,
  AiCompetitorComparisonGroup,
  AiCompetitorPairComparison,
  AiCitationDomainSummary,
} from "./ai-citation-competitor-comparison.js";
import type { AiAnswerObservationRecord } from "./ai-answer-visibility-collection.js";
import {
  P6_1_MAX_EVIDENCE_REFS,
  buildUnifiedOpportunityRecord,
  type UnifiedOpportunityKind,
  type UnifiedOpportunityRecord,
  type UnifiedOpportunityEvidenceInput,
} from "./unified-opportunity-types.js";

export const P7_6_AI_GEO_OPPORTUNITY_INTEGRATION_VERSION =
  "p7.6-ai-geo-opportunity-integration-v1" as const;
export const P7_6_MAX_REQUESTS = 256 as const;
export const P7_6_MAX_DOMAIN_SUMMARIES_PER_REQUEST = 32 as const;

export type AiGeoOpportunityKind = Extract<
  UnifiedOpportunityKind,
  "ai_visibility_gap" | "ai_citation_gap"
>;

export type AiGeoOpportunityIntegrationRequest = {
  integrationKey: string;
  kind: AiGeoOpportunityKind;
  subjectKey: string;
  snapshotFingerprint: string;
  scoreFingerprint: string;
  comparisonFingerprint: string;
  pairFingerprint: string | null;
  domainSummaryFingerprints: string[];
  marketFingerprint: string | null;
  categoryFingerprint: string | null;
};

export type AiGeoOpportunityIntegrationInput = {
  scoringInput: AiVisibilityScoringHistoryInput;
  scoring: AiVisibilityScoringHistoryReport;
  requests: AiGeoOpportunityIntegrationRequest[];
};

export type AiGeoOpportunitySourceLineage = {
  snapshotFingerprint: string;
  collectionReferenceTime: string;
  scoreKey: string;
  scoreFingerprint: string;
  scoreStatus: "scored" | "unscorable";
  sourceScore100: number | null;
  scoreProfileFingerprint: string;
  missingComponentCodes: string[];
  comparisonKey: string;
  comparisonFingerprint: string;
  pairFingerprint: string | null;
  domainSummaryFingerprints: string[];
  observationFingerprints: string[];
};

export type AiGeoOpportunityIntegrationRecord = {
  integrationId: string;
  integrationFingerprint: string;
  integrationKey: string;
  kind: AiGeoOpportunityKind;
  lineage: AiGeoOpportunitySourceLineage;
  opportunity: UnifiedOpportunityRecord;
};

export type AiGeoOpportunityIntegrationReport = {
  version: typeof P7_6_AI_GEO_OPPORTUNITY_INTEGRATION_VERSION;
  reportId: string;
  reportFingerprint: string;
  siteKey: string;
  historyReferenceTime: string;
  scoringReportFingerprint: string;
  counts: {
    integrations: number;
    visibilityGaps: number;
    citationGaps: number;
    scoredSources: number;
    unscorableSources: number;
  };
  integrations: AiGeoOpportunityIntegrationRecord[];
  semantics: ReturnType<typeof aiGeoOpportunityIntegrationSemantics>;
  safety: ReturnType<typeof aiGeoOpportunityIntegrationCapability>;
};

const KEY = /^[a-z0-9][a-z0-9._:-]{0,95}$/;
const HEX_64 = /^[0-9a-f]{64}$/;

function canonicalJson(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function hash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function normalizeKey(value: unknown, errorCode: string): string {
  if (typeof value !== "string") throw new Error(errorCode);
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!KEY.test(normalized)) throw new Error(errorCode);
  return normalized;
}

function validateFingerprint(value: unknown, errorCode: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) throw new Error(errorCode);
  return value;
}

function validateOptionalFingerprint(value: unknown, errorCode: string): string | null {
  if (value === null) return null;
  return validateFingerprint(value, errorCode);
}

function canonicalScoring(
  input: AiVisibilityScoringHistoryInput,
  supplied: AiVisibilityScoringHistoryReport,
): AiVisibilityScoringHistoryReport {
  if (!supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
    throw new Error("invalid_p75_scoring_history_report");
  }
  if (supplied.version !== P7_5_AI_VISIBILITY_SCORING_HISTORY_VERSION) {
    throw new Error("unsupported_p75_scoring_history_version");
  }
  const rebuilt = buildAiVisibilityScoringHistory(input);
  if (canonicalJson(rebuilt) !== canonicalJson(supplied)) {
    throw new Error("p75_scoring_history_integrity_mismatch");
  }
  return rebuilt;
}

function normalizeDomainSummaryFingerprints(input: unknown): string[] {
  if (!Array.isArray(input)) throw new Error("invalid_ai_geo_domain_summary_fingerprints");
  if (input.length > P7_6_MAX_DOMAIN_SUMMARIES_PER_REQUEST) {
    throw new Error("ai_geo_domain_summary_limit_exceeded");
  }
  return [...new Set(input.map((value) =>
    validateFingerprint(value, "invalid_ai_geo_domain_summary_fingerprint"),
  ))].sort((a, b) => a.localeCompare(b));
}

function findSnapshot(
  scoring: AiVisibilityScoringHistoryReport,
  fingerprint: string,
): AiVisibilityScoreSnapshot {
  const snapshot = scoring.snapshots.find(
    (candidate) => candidate.snapshotFingerprint === fingerprint,
  );
  if (!snapshot) throw new Error("unknown_ai_geo_snapshot");
  return snapshot;
}

function findScore(
  snapshot: AiVisibilityScoreSnapshot,
  fingerprint: string,
): AiVisibilityScoreRecord {
  const score = snapshot.scores.find(
    (candidate) => candidate.scoreFingerprint === fingerprint,
  );
  if (!score) throw new Error("unknown_ai_geo_score");
  return score;
}

function findSnapshotInput(
  input: AiVisibilityScoringHistoryInput,
  snapshot: AiVisibilityScoreSnapshot,
) {
  const source = input.snapshots.find(
    (candidate) =>
      candidate.comparison.collectionReferenceTime === snapshot.collectionReferenceTime,
  );
  if (!source) throw new Error("ai_geo_snapshot_input_missing");
  if (source.comparison.reportFingerprint !== snapshot.comparisonReportFingerprint) {
    throw new Error("ai_geo_snapshot_comparison_lineage_mismatch");
  }
  return source;
}

function findComparison(
  comparison: AiCitationCompetitorComparisonReport,
  score: AiVisibilityScoreRecord,
  fingerprint: string,
): AiCompetitorComparisonGroup {
  const group = comparison.comparisons.find(
    (candidate) => candidate.comparisonKey === score.scope.comparisonKey,
  );
  if (!group) throw new Error("ai_geo_score_comparison_missing");
  if (group.comparisonFingerprint !== fingerprint) {
    throw new Error("ai_geo_comparison_fingerprint_mismatch");
  }
  if (score.comparisonReportFingerprint !== comparison.reportFingerprint) {
    throw new Error("ai_geo_score_comparison_report_mismatch");
  }
  return group;
}

function findPair(
  group: AiCompetitorComparisonGroup,
  score: AiVisibilityScoreRecord,
  fingerprint: string,
): AiCompetitorPairComparison {
  const pair = group.pairs.find((candidate) => candidate.pairFingerprint === fingerprint);
  if (!pair) throw new Error("unknown_ai_geo_pair");
  if (
    pair.subject.brandKey !== score.scope.brandKey &&
    pair.competitor.brandKey !== score.scope.brandKey
  ) {
    throw new Error("ai_geo_pair_does_not_include_score_brand");
  }
  return pair;
}

function selectedDomainSummaries(
  comparison: AiCitationCompetitorComparisonReport,
  pair: AiCompetitorPairComparison,
  fingerprints: string[],
): AiCitationDomainSummary[] {
  const allowedDomains = new Set([
    ...pair.citationDomainCooccurrence.subjectDomains,
    ...pair.citationDomainCooccurrence.competitorDomains,
  ]);
  return fingerprints.map((fingerprint) => {
    const summary = comparison.domains.find(
      (candidate) => candidate.domainSummaryFingerprint === fingerprint,
    );
    if (!summary) throw new Error("unknown_ai_geo_domain_summary");
    if (!allowedDomains.has(summary.domain)) {
      throw new Error("ai_geo_domain_summary_outside_pair_evidence");
    }
    return summary;
  });
}

function scoreObservationFingerprints(score: AiVisibilityScoreRecord): string[] {
  return [...new Set(
    score.components.flatMap((component) => component.evidenceObservationFingerprints),
  )].sort((a, b) => a.localeCompare(b));
}

function observationsByFingerprint(
  observations: AiAnswerObservationRecord[],
  fingerprints: string[],
): AiAnswerObservationRecord[] {
  const byFingerprint = new Map(
    observations.map((observation) => [observation.observationFingerprint, observation]),
  );
  return fingerprints.map((fingerprint) => {
    const observation = byFingerprint.get(fingerprint);
    if (!observation) throw new Error("ai_geo_score_observation_missing");
    return observation;
  });
}

function evidenceRef(
  fingerprint: string,
  sourceKey: string,
  observedAt: string | null,
  marketFingerprint: string | null,
  categoryFingerprint: string | null,
): UnifiedOpportunityEvidenceInput {
  return {
    kind: "ai_visibility",
    fingerprint,
    sourceKey,
    observedAt,
    marketFingerprint,
    categoryFingerprint,
  };
}

function buildEvidence(
  request: {
    marketFingerprint: string | null;
    categoryFingerprint: string | null;
  },
  score: AiVisibilityScoreRecord,
  comparison: AiCompetitorComparisonGroup,
  pair: AiCompetitorPairComparison | null,
  domains: AiCitationDomainSummary[],
  observations: AiAnswerObservationRecord[],
): UnifiedOpportunityEvidenceInput[] {
  const values: UnifiedOpportunityEvidenceInput[] = [
    evidenceRef(
      score.scoreFingerprint,
      "p7.5:score",
      null,
      request.marketFingerprint,
      request.categoryFingerprint,
    ),
    evidenceRef(
      comparison.comparisonFingerprint,
      "p7.4:comparison",
      null,
      request.marketFingerprint,
      request.categoryFingerprint,
    ),
  ];

  if (pair) {
    values.push(evidenceRef(
      pair.pairFingerprint,
      "p7.4:pair",
      null,
      request.marketFingerprint,
      request.categoryFingerprint,
    ));
  }
  for (const domain of domains) {
    values.push(evidenceRef(
      domain.domainSummaryFingerprint,
      "p7.4:domain_summary",
      null,
      request.marketFingerprint,
      request.categoryFingerprint,
    ));
  }
  for (const observation of observations) {
    values.push(evidenceRef(
      observation.observationFingerprint,
      "p7.3:observation",
      observation.observedAt,
      request.marketFingerprint,
      request.categoryFingerprint,
    ));
  }

  if (values.length > P6_1_MAX_EVIDENCE_REFS) {
    throw new Error("ai_geo_p61_evidence_limit_exceeded");
  }
  return values;
}

function normalizeRequest(
  request: AiGeoOpportunityIntegrationRequest,
): AiGeoOpportunityIntegrationRequest {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new Error("invalid_ai_geo_integration_request");
  }
  if (request.kind !== "ai_visibility_gap" && request.kind !== "ai_citation_gap") {
    throw new Error("invalid_ai_geo_opportunity_kind");
  }

  return {
    integrationKey: normalizeKey(request.integrationKey, "invalid_ai_geo_integration_key"),
    kind: request.kind,
    subjectKey: request.subjectKey,
    snapshotFingerprint: validateFingerprint(
      request.snapshotFingerprint,
      "invalid_ai_geo_snapshot_fingerprint",
    ),
    scoreFingerprint: validateFingerprint(
      request.scoreFingerprint,
      "invalid_ai_geo_score_fingerprint",
    ),
    comparisonFingerprint: validateFingerprint(
      request.comparisonFingerprint,
      "invalid_ai_geo_comparison_fingerprint",
    ),
    pairFingerprint: validateOptionalFingerprint(
      request.pairFingerprint,
      "invalid_ai_geo_pair_fingerprint",
    ),
    domainSummaryFingerprints: normalizeDomainSummaryFingerprints(
      request.domainSummaryFingerprints,
    ),
    marketFingerprint: validateOptionalFingerprint(
      request.marketFingerprint,
      "invalid_ai_geo_market_fingerprint",
    ),
    categoryFingerprint: validateOptionalFingerprint(
      request.categoryFingerprint,
      "invalid_ai_geo_category_fingerprint",
    ),
  };
}

function integrateOne(
  request: AiGeoOpportunityIntegrationRequest,
  scoringInput: AiVisibilityScoringHistoryInput,
  scoring: AiVisibilityScoringHistoryReport,
): AiGeoOpportunityIntegrationRecord {
  const snapshot = findSnapshot(scoring, request.snapshotFingerprint);
  const score = findScore(snapshot, request.scoreFingerprint);
  const snapshotInput = findSnapshotInput(scoringInput, snapshot);
  const comparisonReport = snapshotInput.comparison;
  const group = findComparison(comparisonReport, score, request.comparisonFingerprint);

  let pair: AiCompetitorPairComparison | null = null;
  let domains: AiCitationDomainSummary[] = [];
  if (request.kind === "ai_visibility_gap") {
    if (request.pairFingerprint !== null || request.domainSummaryFingerprints.length > 0) {
      throw new Error("ai_visibility_gap_must_not_claim_citation_pair_or_domains");
    }
  } else {
    if (request.pairFingerprint === null) throw new Error("ai_citation_gap_pair_required");
    if (request.domainSummaryFingerprints.length < 1) {
      throw new Error("ai_citation_gap_domain_summary_required");
    }
    pair = findPair(group, score, request.pairFingerprint);
    domains = selectedDomainSummaries(
      comparisonReport,
      pair,
      request.domainSummaryFingerprints,
    );
  }

  const observationFingerprints = scoreObservationFingerprints(score);
  const observations = observationsByFingerprint(
    snapshotInput.comparisonInput.collection.observations,
    observationFingerprints,
  );
  const evidence = buildEvidence(
    request,
    score,
    group,
    pair,
    domains,
    observations,
  );
  const missingEvidence =
    score.status === "unscorable" ? ["p7.5.unscorable_score"] : [];

  const opportunity = buildUnifiedOpportunityRecord({
    family: "ai",
    kind: request.kind,
    subjectKey: request.subjectKey,
    referenceTime: snapshot.collectionReferenceTime,
    marketFingerprint: request.marketFingerprint,
    categoryFingerprint: request.categoryFingerprint,
    evidence,
    missingEvidence,
    legacyType: null,
  });

  const lineage: AiGeoOpportunitySourceLineage = {
    snapshotFingerprint: snapshot.snapshotFingerprint,
    collectionReferenceTime: snapshot.collectionReferenceTime,
    scoreKey: score.scoreKey,
    scoreFingerprint: score.scoreFingerprint,
    scoreStatus: score.status,
    sourceScore100: score.score100,
    scoreProfileFingerprint: score.profile.profileFingerprint,
    missingComponentCodes: [...score.missingComponentCodes],
    comparisonKey: group.comparisonKey,
    comparisonFingerprint: group.comparisonFingerprint,
    pairFingerprint: pair?.pairFingerprint ?? null,
    domainSummaryFingerprints: domains
      .map((domain) => domain.domainSummaryFingerprint)
      .sort((a, b) => a.localeCompare(b)),
    observationFingerprints,
  };

  const identity = {
    version: P7_6_AI_GEO_OPPORTUNITY_INTEGRATION_VERSION,
    integrationKey: request.integrationKey,
    kind: request.kind,
    lineage,
    opportunityFingerprint: opportunity.opportunityFingerprint,
  };
  const integrationFingerprint = hash(identity);

  return {
    integrationId: `p76-integration-${integrationFingerprint.slice(0, 20)}`,
    integrationFingerprint,
    integrationKey: request.integrationKey,
    kind: request.kind,
    lineage,
    opportunity,
  };
}

export function aiGeoOpportunityIntegrationSemantics() {
  return Object.freeze({
    exactP75LineageRequired: true,
    explicitIntegrationRequestRequired: true,
    gapExistenceInferredFromScoreThreshold: false,
    gapExistenceInferredFromHistoryDelta: false,
    gapExistenceInferredFromComparisonCounts: false,
    p75ScoreUsedAsSourceEvidenceOnly: true,
    p75ScoreReusedAsP62Score: false,
    p75ComponentsMappedToP62Dimensions: false,
    p61AiOpportunityProjectionOnly: true,
    p62ScoringPerformed: false,
    p63PrioritizationPerformed: false,
    p64ExplanationGenerated: false,
    p65ActionabilityClassified: false,
    p66PreviewGenerated: false,
    p67LifecycleTransitionPerformed: false,
    p7MarketLanguageKeysMappedToP6Scope: false,
    citationCooccurrenceImpliesSupport: false,
    citationCooccurrenceImpliesEndorsement: false,
    citationCooccurrenceImpliesAssociation: false,
    missingMentionEvidenceImpliesBrandAbsent: false,
    opportunityImpliesRecommendation: false,
    opportunityImpliesExecutionPriority: false,
  });
}

export function aiGeoOpportunityIntegrationCapability() {
  return Object.freeze({
    deterministicP61ProjectionOnly: true,
    liveProviderRequestsAuthorized: false,
    providerCredentialUseAuthorized: false,
    aiModelCallsAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
    opportunityPersistenceAuthorized: false,
    scorePersistenceAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    schemaMutationAuthorized: false,
    schedulerEnabled: false,
    workerEnabled: false,
    retryLoopEnabled: false,
    p62ScoringAuthorized: false,
    prioritizationAuthorized: false,
    recommendationGenerationAuthorized: false,
    approvalGrantAuthorized: false,
    applyAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticTransitionEnabled: false,
    publicationAuthorized: false,
  });
}

export function buildAiGeoOpportunityIntegration(
  input: AiGeoOpportunityIntegrationInput,
): AiGeoOpportunityIntegrationReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_ai_geo_opportunity_integration_input");
  }
  if (!input.scoringInput || typeof input.scoringInput !== "object" || Array.isArray(input.scoringInput)) {
    throw new Error("invalid_ai_geo_scoring_input");
  }

  const scoring = canonicalScoring(input.scoringInput, input.scoring);
  if (!Array.isArray(input.requests)) throw new Error("invalid_ai_geo_integration_requests");
  if (input.requests.length > P7_6_MAX_REQUESTS) {
    throw new Error("ai_geo_integration_request_limit_exceeded");
  }

  const seenKeys = new Set<string>();
  const normalized = input.requests.map((raw) => {
    const request = normalizeRequest(raw);
    if (seenKeys.has(request.integrationKey)) throw new Error("duplicate_ai_geo_integration_key");
    seenKeys.add(request.integrationKey);
    return request;
  }).sort((a, b) => a.integrationKey.localeCompare(b.integrationKey));

  const integrations = normalized.map((request) =>
    integrateOne(request, input.scoringInput, scoring));

  const seenOpportunityFingerprints = new Set<string>();
  for (const integration of integrations) {
    if (seenOpportunityFingerprints.has(integration.opportunity.opportunityFingerprint)) {
      throw new Error("duplicate_ai_geo_opportunity_projection");
    }
    seenOpportunityFingerprints.add(integration.opportunity.opportunityFingerprint);
  }

  const counts = {
    integrations: integrations.length,
    visibilityGaps: integrations.filter((item) => item.kind === "ai_visibility_gap").length,
    citationGaps: integrations.filter((item) => item.kind === "ai_citation_gap").length,
    scoredSources: integrations.filter((item) => item.lineage.scoreStatus === "scored").length,
    unscorableSources: integrations.filter((item) => item.lineage.scoreStatus === "unscorable").length,
  };
  const semantics = aiGeoOpportunityIntegrationSemantics();
  const identity = {
    version: P7_6_AI_GEO_OPPORTUNITY_INTEGRATION_VERSION,
    siteKey: scoring.siteKey,
    historyReferenceTime: scoring.historyReferenceTime,
    scoringReportFingerprint: scoring.reportFingerprint,
    counts,
    integrations,
    semantics,
  };
  const reportFingerprint = hash(identity);

  return {
    version: P7_6_AI_GEO_OPPORTUNITY_INTEGRATION_VERSION,
    reportId: `p76-report-${reportFingerprint.slice(0, 20)}`,
    reportFingerprint,
    siteKey: scoring.siteKey,
    historyReferenceTime: scoring.historyReferenceTime,
    scoringReportFingerprint: scoring.reportFingerprint,
    counts,
    integrations,
    semantics,
    safety: aiGeoOpportunityIntegrationCapability(),
  };
}
