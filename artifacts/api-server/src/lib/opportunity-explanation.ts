import { createHash } from "node:crypto";
import {
  buildUnifiedOpportunityRecord,
  type UnifiedOpportunityEvidenceRef,
  type UnifiedOpportunityRecord,
  type UnifiedOpportunitySemanticGuard,
} from "./unified-opportunity-types.js";
import {
  P6_2_OPPORTUNITY_SCORING_VERSION,
  scoreUnifiedOpportunity,
  type OpportunityScoreDimension,
  type UnifiedOpportunityScore,
} from "./opportunity-scoring.js";
import {
  P6_3_OPPORTUNITY_PRIORITIZATION_VERSION,
  prioritizeUnifiedOpportunities,
  type OpportunityPrioritizationInput,
  type OpportunityPrioritizationReport,
  type OpportunityPriorityDecision,
  type OpportunitySystemSuppressionReason,
} from "./opportunity-prioritization.js";

export const P6_4_OPPORTUNITY_EXPLANATION_VERSION = "p6.4-opportunity-explanation-v1" as const;
export const P6_4_MAX_STATEMENTS_PER_ITEM = 64 as const;

export type OpportunityExplanationInput = {
  collection: OpportunityPrioritizationInput;
  prioritization: OpportunityPrioritizationReport;
};

export type OpportunityExplanationStatementCategory =
  | "decision"
  | "score"
  | "score_component"
  | "missing_evidence"
  | "semantic_guard";

export type OpportunityExplanationStatement = {
  statementId: string;
  statementFingerprint: string;
  category: OpportunityExplanationStatementCategory;
  code: string;
  text: string;
  evidenceFingerprints: string[];
};

export type OpportunityExplanationEvidenceCard = UnifiedOpportunityEvidenceRef & {
  usedByScoreDimensions: OpportunityScoreDimension[];
};

export type OpportunityExplanationItem = {
  explanationId: string;
  explanationFingerprint: string;
  opportunityId: string;
  opportunityFingerprint: string;
  family: UnifiedOpportunityRecord["family"];
  kind: UnifiedOpportunityRecord["kind"];
  subjectKey: string;
  decision: {
    status: OpportunityPriorityDecision["status"];
    priorityRank: number | null;
    priorityTieCount: number | null;
    conflictKey: string | null;
    explicitSuppressionCodes: string[];
    systemSuppressionReasons: OpportunitySystemSuppressionReason[];
  };
  score: {
    scoreId: string;
    scoreFingerprint: string;
    status: UnifiedOpportunityScore["status"];
    score01: number | null;
    score100: number | null;
    formula: UnifiedOpportunityScore["formula"];
    blockers: string[];
    components: UnifiedOpportunityScore["components"];
  };
  evidence: OpportunityExplanationEvidenceCard[];
  missingEvidence: string[];
  semanticGuards: UnifiedOpportunitySemanticGuard[];
  statements: OpportunityExplanationStatement[];
};

export type OpportunityExplanationReport = {
  version: typeof P6_4_OPPORTUNITY_EXPLANATION_VERSION;
  reportId: string;
  reportFingerprint: string;
  collectionKey: string;
  referenceTime: string;
  scope: OpportunityPrioritizationReport["scope"];
  prioritizationReportFingerprint: string;
  itemCount: number;
  items: OpportunityExplanationItem[];
  semantics: ReturnType<typeof opportunityExplanationSemantics>;
  safety: ReturnType<typeof opportunityExplanationCapability>;
};

const DIMENSIONS: OpportunityScoreDimension[] = ["impact", "confidence", "risk", "effort", "freshness"];

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

function canonicalOpportunity(input: UnifiedOpportunityRecord): UnifiedOpportunityRecord {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_opportunity");
  const rebuilt = buildUnifiedOpportunityRecord({
    family: input.family,
    kind: input.kind,
    subjectKey: input.subjectKey,
    referenceTime: input.referenceTime,
    marketFingerprint: input.scope?.marketFingerprint,
    categoryFingerprint: input.scope?.categoryFingerprint,
    evidence: input.evidence,
    missingEvidence: input.missingEvidence,
    legacyType: input.legacyType,
  });
  if (canonicalJson(rebuilt) !== canonicalJson(input)) throw new Error("p61_opportunity_integrity_mismatch");
  return rebuilt;
}

function canonicalScore(
  opportunity: UnifiedOpportunityRecord,
  input: UnifiedOpportunityScore,
): UnifiedOpportunityScore {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_opportunity_score");
  if (input.version !== P6_2_OPPORTUNITY_SCORING_VERSION) throw new Error("unsupported_p62_score_version");
  const rebuilt = scoreUnifiedOpportunity({
    opportunity,
    components: input.components,
  });
  if (canonicalJson(rebuilt) !== canonicalJson(input)) throw new Error("p62_score_integrity_mismatch");
  return rebuilt;
}

function canonicalPrioritization(
  collection: OpportunityPrioritizationInput,
  input: OpportunityPrioritizationReport,
): OpportunityPrioritizationReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_p63_prioritization_report");
  }
  if (input.version !== P6_3_OPPORTUNITY_PRIORITIZATION_VERSION) {
    throw new Error("unsupported_p63_prioritization_version");
  }
  const rebuilt = prioritizeUnifiedOpportunities(collection);
  if (canonicalJson(rebuilt) !== canonicalJson(input)) throw new Error("p63_prioritization_integrity_mismatch");
  return rebuilt;
}

function statement(
  opportunityFingerprint: string,
  category: OpportunityExplanationStatementCategory,
  code: string,
  text: string,
  evidenceFingerprints: string[] = [],
): OpportunityExplanationStatement {
  const basis = [...new Set(evidenceFingerprints)].sort((a, b) => a.localeCompare(b));
  const identity = {
    version: P6_4_OPPORTUNITY_EXPLANATION_VERSION,
    opportunityFingerprint,
    category,
    code,
    text,
    evidenceFingerprints: basis,
  };
  const statementFingerprint = hash(identity);
  return {
    statementId: `p64-statement-${statementFingerprint.slice(0, 20)}`,
    statementFingerprint,
    category,
    code,
    text,
    evidenceFingerprints: basis,
  };
}

function semanticGuardText(guard: UnifiedOpportunitySemanticGuard): string {
  const messages: Record<UnifiedOpportunitySemanticGuard, string> = {
    null_distinct_from_zero: "P6.1 requires null to remain distinct from zero.",
    keyword_difficulty_provider_native_not_cross_provider_comparable:
      "P6.1 records provider-native keyword difficulty as not cross-provider comparable.",
    trend_request_frame_relative:
      "P6.1 records trend values as relative to their request frame.",
    trend_cross_frame_not_comparable:
      "P6.1 does not treat trend values from different request frames as directly comparable.",
    trend_not_absolute_search_demand:
      "P6.1 does not treat trend values as absolute search demand.",
    backlink_authority_provider_native_not_cross_provider_comparable:
      "P6.1 records backlink authority as provider-native and not cross-provider comparable.",
    competitor_visibility_not_market_share:
      "P6.1 records competitor visibility as distinct from market share.",
    gap_evidence_not_recommendation:
      "P6.1 records gap evidence as evidence, not as a recommendation by itself.",
    source_telemetry_descriptive_only:
      "P6.1 records source telemetry as descriptive only.",
    source_telemetry_does_not_control_refresh_or_execution:
      "P6.1 does not allow source telemetry to control refresh or execution.",
    missing_evidence_not_fabricated:
      "P6.1 requires missing evidence to remain explicit rather than fabricated.",
  };
  return messages[guard];
}

function decisionStatements(
  opportunityFingerprint: string,
  decision: OpportunityPriorityDecision,
): OpportunityExplanationStatement[] {
  const output: OpportunityExplanationStatement[] = [];

  if (decision.status === "eligible") {
    if (decision.priorityRank === null || decision.priorityTieCount === null) {
      throw new Error("eligible_decision_missing_priority");
    }
    const suffix = decision.priorityTieCount > 1
      ? `, shared by ${decision.priorityTieCount} eligible opportunities with the same P6.2 score`
      : "";
    output.push(statement(
      opportunityFingerprint,
      "decision",
      "p63.eligible_priority",
      `P6.3 records this opportunity as eligible at advisory priority rank ${decision.priorityRank}${suffix}.`,
    ));
  }

  for (const reason of decision.systemSuppressionReasons) {
    if (reason === "explicit_suppression") {
      if (decision.explicitSuppressionCodes.length < 1) throw new Error("explicit_suppression_codes_missing");
      output.push(statement(
        opportunityFingerprint,
        "decision",
        "p63.explicit_suppression",
        `P6.3 records explicit suppression code(s): ${decision.explicitSuppressionCodes.join(", ")}.`,
      ));
      continue;
    }
    if (reason === "unscorable_score") {
      output.push(statement(
        opportunityFingerprint,
        "decision",
        "p63.unscorable_score",
        "P6.3 suppresses this opportunity from advisory ranking because its P6.2 score status is unscorable.",
      ));
      continue;
    }
    if (reason === "conflict_lower_score") {
      if (decision.conflictKey === null) throw new Error("conflict_reason_missing_conflict_key");
      output.push(statement(
        opportunityFingerprint,
        "decision",
        "p63.conflict_lower_score",
        `P6.3 suppresses this opportunity within explicit conflict key ${decision.conflictKey} because another active member has a higher canonical P6.2 score.`,
      ));
      continue;
    }
    if (reason === "conflict_top_score_tie") {
      if (decision.conflictKey === null) throw new Error("conflict_reason_missing_conflict_key");
      output.push(statement(
        opportunityFingerprint,
        "decision",
        "p63.conflict_top_score_tie",
        `P6.3 leaves the top of explicit conflict key ${decision.conflictKey} unresolved because multiple active members share the same highest canonical P6.2 score; it does not choose an arbitrary winner.`,
      ));
    }
  }

  return output;
}

function scoreStatements(
  opportunityFingerprint: string,
  score: UnifiedOpportunityScore,
): OpportunityExplanationStatement[] {
  const output: OpportunityExplanationStatement[] = [];
  const allBasis = DIMENSIONS.flatMap((dimension) => score.components[dimension].evidenceFingerprints);

  if (score.status === "scored") {
    if (score.score100 === null || score.score01 === null) throw new Error("scored_value_missing");
    output.push(statement(
      opportunityFingerprint,
      "score",
      "p62.score",
      `P6.2 records score100 ${score.score100} using formula ${score.formula}.`,
      allBasis,
    ));
  } else {
    output.push(statement(
      opportunityFingerprint,
      "score",
      "p62.unscorable",
      "P6.2 records this opportunity as unscorable; score100 is unavailable.",
    ));
  }

  if (score.blockers.length > 0) {
    output.push(statement(
      opportunityFingerprint,
      "score",
      "p62.blockers",
      `P6.2 blocker code(s): ${score.blockers.join(", ")}.`,
    ));
  }

  for (const dimension of DIMENSIONS) {
    const component = score.components[dimension];
    if (component.value === null) {
      output.push(statement(
        opportunityFingerprint,
        "score_component",
        `p62.component.${dimension}.unavailable`,
        `P6.2 ${dimension} is unavailable and claims no evidence basis.`,
      ));
      continue;
    }
    if (component.basisCode === null || component.evidenceFingerprints.length < 1) {
      throw new Error("scored_component_basis_missing");
    }
    output.push(statement(
      opportunityFingerprint,
      "score_component",
      `p62.component.${dimension}`,
      `P6.2 ${dimension} = ${component.value} with basis code ${component.basisCode}.`,
      component.evidenceFingerprints,
    ));
  }

  return output;
}

function evidenceCards(
  opportunity: UnifiedOpportunityRecord,
  score: UnifiedOpportunityScore,
): OpportunityExplanationEvidenceCard[] {
  return opportunity.evidence.map((ref) => ({
    ...ref,
    usedByScoreDimensions: DIMENSIONS.filter((dimension) =>
      score.components[dimension].evidenceFingerprints.includes(ref.fingerprint)),
  }));
}

function buildItem(
  opportunity: UnifiedOpportunityRecord,
  score: UnifiedOpportunityScore,
  decision: OpportunityPriorityDecision,
): OpportunityExplanationItem {
  if (
    decision.opportunityFingerprint !== opportunity.opportunityFingerprint ||
    decision.opportunityId !== opportunity.opportunityId ||
    decision.scoreFingerprint !== score.scoreFingerprint ||
    decision.scoreId !== score.scoreId
  ) {
    throw new Error("p63_decision_lineage_mismatch");
  }

  const statements: OpportunityExplanationStatement[] = [
    ...decisionStatements(opportunity.opportunityFingerprint, decision),
    ...scoreStatements(opportunity.opportunityFingerprint, score),
    ...opportunity.missingEvidence.map((code) =>
      statement(
        opportunity.opportunityFingerprint,
        "missing_evidence",
        `p61.missing_evidence.${code}`,
        `P6.1 records missing-evidence code ${code}.`,
      )),
    ...opportunity.semanticGuards.map((guard) =>
      statement(
        opportunity.opportunityFingerprint,
        "semantic_guard",
        `p61.semantic_guard.${guard}`,
        semanticGuardText(guard),
      )),
  ];

  if (statements.length > P6_4_MAX_STATEMENTS_PER_ITEM) throw new Error("explanation_statement_limit_exceeded");

  const decisionProjection = {
    status: decision.status,
    priorityRank: decision.priorityRank,
    priorityTieCount: decision.priorityTieCount,
    conflictKey: decision.conflictKey,
    explicitSuppressionCodes: [...decision.explicitSuppressionCodes],
    systemSuppressionReasons: [...decision.systemSuppressionReasons],
  };
  const scoreProjection = {
    scoreId: score.scoreId,
    scoreFingerprint: score.scoreFingerprint,
    status: score.status,
    score01: score.score01,
    score100: score.score100,
    formula: score.formula,
    blockers: [...score.blockers],
    components: Object.fromEntries(DIMENSIONS.map((dimension) => [
      dimension,
      {
        value: score.components[dimension].value,
        basisCode: score.components[dimension].basisCode,
        evidenceFingerprints: [...score.components[dimension].evidenceFingerprints],
      },
    ])) as UnifiedOpportunityScore["components"],
  };
  const evidence = evidenceCards(opportunity, score);
  const identity = {
    version: P6_4_OPPORTUNITY_EXPLANATION_VERSION,
    opportunityId: opportunity.opportunityId,
    opportunityFingerprint: opportunity.opportunityFingerprint,
    family: opportunity.family,
    kind: opportunity.kind,
    subjectKey: opportunity.subjectKey,
    decision: decisionProjection,
    score: scoreProjection,
    evidence,
    missingEvidence: opportunity.missingEvidence,
    semanticGuards: opportunity.semanticGuards,
    statements,
  };
  const explanationFingerprint = hash(identity);

  return {
    explanationId: `p64-explanation-${explanationFingerprint.slice(0, 20)}`,
    explanationFingerprint,
    opportunityId: opportunity.opportunityId,
    opportunityFingerprint: opportunity.opportunityFingerprint,
    family: opportunity.family,
    kind: opportunity.kind,
    subjectKey: opportunity.subjectKey,
    decision: decisionProjection,
    score: scoreProjection,
    evidence,
    missingEvidence: [...opportunity.missingEvidence],
    semanticGuards: [...opportunity.semanticGuards],
    statements,
  };
}

export function opportunityExplanationSemantics() {
  return Object.freeze({
    deterministicTemplateOnly: true,
    freeformInferenceEnabled: false,
    causalOutcomeClaimsGenerated: false,
    recommendationGenerated: false,
    actionabilityClassified: false,
    previewDiffGenerated: false,
    lifecycleInferred: false,
    exactP63DecisionPreserved: true,
    exactP62EvidenceBasisPreserved: true,
    p61MissingEvidencePreserved: true,
    p61SemanticGuardsPreserved: true,
    providerNativeCrossComparisonPerformed: false,
    explanationOrderCreatesAdditionalPreference: false,
  });
}

export function opportunityExplanationCapability() {
  return Object.freeze({
    deterministicExplanationOnly: true,
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
    prioritizationPersistenceAuthorized: false,
    explanationPersistenceAuthorized: false,
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

export function explainPrioritizedOpportunities(
  input: OpportunityExplanationInput,
): OpportunityExplanationReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_explanation_input");
  if (!input.collection || typeof input.collection !== "object" || Array.isArray(input.collection)) {
    throw new Error("invalid_explanation_collection");
  }

  const prioritization = canonicalPrioritization(input.collection, input.prioritization);

  const canonicalByFingerprint = new Map<
    string,
    { opportunity: UnifiedOpportunityRecord; score: UnifiedOpportunityScore }
  >();

  for (const entry of input.collection.entries) {
    const opportunity = canonicalOpportunity(entry.opportunity);
    const score = canonicalScore(opportunity, entry.score);
    const previous = canonicalByFingerprint.get(opportunity.opportunityFingerprint);
    if (previous === undefined) {
      canonicalByFingerprint.set(opportunity.opportunityFingerprint, { opportunity, score });
      continue;
    }
    if (previous.score.scoreFingerprint !== score.scoreFingerprint) {
      throw new Error("duplicate_opportunity_score_lineage_mismatch");
    }
  }

  const items = prioritization.decisions.map((decision) => {
    const canonical = canonicalByFingerprint.get(decision.opportunityFingerprint);
    if (!canonical) throw new Error("p63_decision_opportunity_missing");
    return buildItem(canonical.opportunity, canonical.score, decision);
  });

  if (items.length !== prioritization.counts.unique) throw new Error("p63_unique_count_mismatch");

  const semantics = opportunityExplanationSemantics();
  const identity = {
    version: P6_4_OPPORTUNITY_EXPLANATION_VERSION,
    collectionKey: prioritization.collectionKey,
    referenceTime: prioritization.referenceTime,
    scope: prioritization.scope,
    prioritizationReportFingerprint: prioritization.reportFingerprint,
    itemCount: items.length,
    items,
    semantics,
  };
  const reportFingerprint = hash(identity);

  return {
    version: P6_4_OPPORTUNITY_EXPLANATION_VERSION,
    reportId: `p64-report-${reportFingerprint.slice(0, 20)}`,
    reportFingerprint,
    collectionKey: prioritization.collectionKey,
    referenceTime: prioritization.referenceTime,
    scope: { ...prioritization.scope },
    prioritizationReportFingerprint: prioritization.reportFingerprint,
    itemCount: items.length,
    items,
    semantics,
    safety: opportunityExplanationCapability(),
  };
}
