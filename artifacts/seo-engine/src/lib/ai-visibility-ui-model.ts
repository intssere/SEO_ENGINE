import type { StatusTone } from "./status-grammar.js";

export const P7_7_AI_VISIBILITY_UI_VERSION = "p7.7-ai-visibility-ui-v1" as const;

export type UiCrawlerRow = {
  botKey: string;
  userAgent: string;
  status: "accessible" | "blocked" | "limited" | "unavailable" | "indeterminate";
  robotsDecision: "allowed" | "disallowed" | "unknown";
  observedPathCount: number;
};

export type UiAnswerObservationRow = {
  observationFingerprint: string;
  providerKey: string;
  modelKey: string;
  promptKey: string;
  promptSetKey: string;
  trackedBrand: string;
  brandMentionState: "observed" | "not_observed_with_evidence" | "missing_evidence";
  brandMentionEvidenceCount: number;
  citationCount: number;
  observedAt: string;
};

export type UiCitationComparisonRow = {
  comparisonFingerprint: string;
  groupKey: string;
  trackedBrand: string;
  competitorBrand: string;
  sharedMentionPrompts: number;
  trackedOnlyMentionPrompts: number;
  competitorOnlyMentionPrompts: number;
  sharedCitationDomains: number;
  trackedOnlyCitationDomains: number;
  competitorOnlyCitationDomains: number;
};

export type UiVisibilityScoreRow = {
  scoreFingerprint: string;
  providerKey: string;
  modelKey: string;
  brandKey: string;
  promptSetKey: string;
  score100: number | null;
  previousScore100: number | null;
  delta100: number | null;
  direction: "up" | "down" | "flat" | "unavailable";
  componentCoverage: string;
  historyPoints: number;
};

export type UiAiOpportunityRow = {
  integrationFingerprint: string;
  opportunityFingerprint: string;
  kind: "ai_visibility_gap" | "ai_citation_gap";
  subjectKey: string;
  sourceScoreFingerprint: string;
  comparisonFingerprint: string;
  citationDomainCount: number;
  explicitRequest: true;
  p6Score: null;
  recommendationGenerated: false;
  executionAuthorized: false;
};

export type AiVisibilityUiFixture = {
  version: "p7.7-synthetic-ui-fixture-v1";
  fixtureKind: "synthetic_read_only";
  siteLabel: string;
  referenceTime: string;
  reportFingerprint: string;
  promptTopics: {
    topics: number;
    prompts: number;
    promptSets: number;
    activePromptSetLabel: string;
  };
  crawlers: UiCrawlerRow[];
  answers: UiAnswerObservationRow[];
  comparisons: UiCitationComparisonRow[];
  scores: UiVisibilityScoreRow[];
  opportunities: UiAiOpportunityRow[];
  diagnostics: string[];
  semantics: {
    robotsAllowanceIsTrainingConsent: false;
    crawlerAccessibilityImpliesIndexingCitationOrVisibility: false;
    promptMembershipImpliesDemandPopularityVolumeOrPriority: false;
    brandMentionEvidenceImpliesCorrectnessSentimentOrEndorsement: false;
    citationCoOccurrenceImpliesSupportEndorsementOrAssociation: false;
    missingMentionEvidenceImpliesBrandAbsence: false;
    scoreCrossProviderModelWinnerComparable: false;
    historyDirectionImpliesImprovementOrRegression: false;
    opportunityProjectionImplicit: false;
    p75ScoreIsP62Score: false;
    p61OpportunityImpliesRecommendationApprovalPriorityOrExecution: false;
  };
};

export type AiVisibilityUiModel = {
  version: typeof P7_7_AI_VISIBILITY_UI_VERSION;
  fixtureKind: "synthetic_read_only";
  siteLabel: string;
  referenceTime: string;
  reportFingerprint: string;
  reportFingerprintShort: string;
  promptTopics: AiVisibilityUiFixture["promptTopics"];
  summary: {
    crawlerAccessible: number;
    crawlerTotal: number;
    topics: number;
    prompts: number;
    promptSets: number;
    answerObservations: number;
    citedAnswers: number;
    scoredProfiles: number;
    unscorableProfiles: number;
    projectedOpportunities: number;
  };
  crawlers: UiCrawlerRow[];
  answers: UiAnswerObservationRow[];
  comparisons: UiCitationComparisonRow[];
  scores: UiVisibilityScoreRow[];
  opportunities: UiAiOpportunityRow[];
  diagnostics: string[];
  guardrails: string[];
  safety: ReturnType<typeof aiVisibilityUiCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;

function unique<T>(values: T[], key: (value: T) => string, code: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    const identity = key(value);
    if (seen.has(identity)) throw new Error(code);
    seen.add(identity);
  }
}

function sorted<T>(values: T[], key: (value: T) => string): T[] {
  return structuredClone(values).sort((a, b) => key(a).localeCompare(key(b)));
}

function finiteCount(value: number, code: string): number {
  if (!Number.isInteger(value) || value < 0) throw new Error(code);
  return value;
}

function score(value: number | null, code: string): number | null {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(code);
  return value;
}

function fingerprint(value: string, code: string): string {
  if (!HEX_64.test(value)) throw new Error(code);
  return value;
}

function canonicalTime(value: string): string {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error("invalid_ai_visibility_reference_time");
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) throw new Error("invalid_ai_visibility_reference_time");
  return canonical;
}

function validateSemantics(fixture: AiVisibilityUiFixture): void {
  for (const [key, value] of Object.entries(fixture.semantics)) {
    if (value !== false) throw new Error("ai_visibility_semantic_contradiction:" + key);
  }
}

function validateFixture(fixture: AiVisibilityUiFixture): void {
  if (fixture.version !== "p7.7-synthetic-ui-fixture-v1") {
    throw new Error("unsupported_ai_visibility_fixture_version");
  }
  if (fixture.fixtureKind !== "synthetic_read_only") {
    throw new Error("ai_visibility_fixture_must_be_synthetic_read_only");
  }

  canonicalTime(fixture.referenceTime);
  fingerprint(fixture.reportFingerprint, "invalid_ai_visibility_report_fingerprint");
  validateSemantics(fixture);

  if (!fixture.siteLabel.trim() || !fixture.promptTopics.activePromptSetLabel.trim()) {
    throw new Error("invalid_ai_visibility_scope");
  }

  finiteCount(fixture.promptTopics.topics, "invalid_ai_visibility_topic_count");
  finiteCount(fixture.promptTopics.prompts, "invalid_ai_visibility_prompt_count");
  finiteCount(fixture.promptTopics.promptSets, "invalid_ai_visibility_prompt_set_count");

  unique(fixture.crawlers, (row) => row.botKey, "duplicate_ai_visibility_crawler");
  unique(fixture.answers, (row) => row.observationFingerprint, "duplicate_ai_visibility_answer_observation");
  unique(fixture.comparisons, (row) => row.comparisonFingerprint, "duplicate_ai_visibility_comparison");
  unique(fixture.scores, (row) => row.scoreFingerprint, "duplicate_ai_visibility_score");
  unique(fixture.opportunities, (row) => row.integrationFingerprint, "duplicate_ai_visibility_integration");
  unique(fixture.opportunities, (row) => row.opportunityFingerprint, "duplicate_ai_visibility_opportunity");

  for (const row of fixture.crawlers) {
    finiteCount(row.observedPathCount, "invalid_ai_visibility_crawler_path_count");
  }

  for (const row of fixture.answers) {
    fingerprint(row.observationFingerprint, "invalid_ai_visibility_answer_fingerprint");
    finiteCount(row.brandMentionEvidenceCount, "invalid_ai_visibility_brand_mention_evidence_count");
    finiteCount(row.citationCount, "invalid_ai_visibility_citation_count");
    canonicalTime(row.observedAt);
    if (row.brandMentionState === "missing_evidence" && row.brandMentionEvidenceCount !== 0) {
      throw new Error("ai_visibility_missing_mention_evidence_contradiction");
    }
  }

  for (const row of fixture.comparisons) {
    fingerprint(row.comparisonFingerprint, "invalid_ai_visibility_comparison_fingerprint");
    finiteCount(row.sharedMentionPrompts, "invalid_ai_visibility_comparison_count");
    finiteCount(row.trackedOnlyMentionPrompts, "invalid_ai_visibility_comparison_count");
    finiteCount(row.competitorOnlyMentionPrompts, "invalid_ai_visibility_comparison_count");
    finiteCount(row.sharedCitationDomains, "invalid_ai_visibility_comparison_count");
    finiteCount(row.trackedOnlyCitationDomains, "invalid_ai_visibility_comparison_count");
    finiteCount(row.competitorOnlyCitationDomains, "invalid_ai_visibility_comparison_count");
  }

  for (const row of fixture.scores) {
    fingerprint(row.scoreFingerprint, "invalid_ai_visibility_score_fingerprint");
    const current = score(row.score100, "invalid_ai_visibility_score_value");
    const previous = score(row.previousScore100, "invalid_ai_visibility_previous_score_value");

    if (current === null || previous === null) {
      if (row.delta100 !== null || row.direction !== "unavailable") {
        throw new Error("ai_visibility_score_history_null_contradiction");
      }
    } else {
      const expected = Number((current - previous).toFixed(6));
      if (row.delta100 !== expected) {
        throw new Error("ai_visibility_score_history_delta_mismatch");
      }
      const expectedDirection = expected > 0 ? "up" : expected < 0 ? "down" : "flat";
      if (row.direction !== expectedDirection) {
        throw new Error("ai_visibility_score_history_direction_mismatch");
      }
    }

    finiteCount(row.historyPoints, "invalid_ai_visibility_history_points");
  }

  for (const row of fixture.opportunities) {
    fingerprint(row.integrationFingerprint, "invalid_ai_visibility_integration_fingerprint");
    fingerprint(row.opportunityFingerprint, "invalid_ai_visibility_opportunity_fingerprint");
    fingerprint(row.sourceScoreFingerprint, "invalid_ai_visibility_source_score_fingerprint");
    fingerprint(row.comparisonFingerprint, "invalid_ai_visibility_source_comparison_fingerprint");
    finiteCount(row.citationDomainCount, "invalid_ai_visibility_citation_domain_count");
    if (
      row.explicitRequest !== true ||
      row.p6Score !== null ||
      row.recommendationGenerated !== false ||
      row.executionAuthorized !== false
    ) {
      throw new Error("ai_visibility_opportunity_semantics_mismatch");
    }
  }
}

export function formatVisibilityScore(value: number | null): string {
  return value === null ? "Unscorable" : value.toFixed(1);
}

export function formatArithmeticDirection(row: UiVisibilityScoreRow): string {
  if (row.delta100 === null || row.direction === "unavailable") {
    return "No comparable prior score";
  }
  if (row.direction === "flat") return "0.0 arithmetic delta";
  const prefix = row.delta100 > 0 ? "+" : "";
  return prefix + row.delta100.toFixed(1) + " arithmetic delta";
}

export function crawlerTone(status: UiCrawlerRow["status"]): StatusTone {
  if (status === "accessible") return "success";
  if (status === "limited") return "warning";
  if (status === "blocked") return "danger";
  return "neutral";
}

export function mentionTone(state: UiAnswerObservationRow["brandMentionState"]): StatusTone {
  if (state === "observed") return "success";
  if (state === "missing_evidence") return "warning";
  return "neutral";
}

export function scoreTone(row: UiVisibilityScoreRow): StatusTone {
  return row.score100 === null ? "neutral" : "info";
}

export function aiVisibilityUiCapability() {
  return Object.freeze({
    version: P7_7_AI_VISIBILITY_UI_VERSION,
    readOnly: true,
    syntheticFixtureOnly: true,
    defaultOff: true,
    liveProviderCallsAuthorized: false,
    providerCredentialUseAuthorized: false,
    publicSiteReadsAuthorized: false,
    publicSiteWritesAuthorized: false,
    runtimeApiBindingAuthorized: false,
    answerCollectionAuthorized: false,
    persistenceAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    p6ScoringAuthorized: false,
    p6PrioritizationAuthorized: false,
    p6ActionabilityAuthorized: false,
    executionAuthorized: false,
    schedulerEnabled: false,
    workerEnabled: false,
    publicationAuthorized: false,
  });
}

export function buildAiVisibilityUiModel(fixture: AiVisibilityUiFixture): AiVisibilityUiModel {
  validateFixture(fixture);

  const crawlers = sorted(fixture.crawlers, (row) => row.botKey);
  const answers = sorted(
    fixture.answers,
    (row) => row.providerKey + "\\u0000" + row.modelKey + "\\u0000" + row.promptKey + "\\u0000" + row.observationFingerprint,
  );
  const comparisons = sorted(
    fixture.comparisons,
    (row) => row.groupKey + "\\u0000" + row.trackedBrand + "\\u0000" + row.competitorBrand,
  );
  const scores = sorted(
    fixture.scores,
    (row) => row.providerKey + "\\u0000" + row.modelKey + "\\u0000" + row.brandKey + "\\u0000" + row.promptSetKey,
  );
  const opportunities = sorted(
    fixture.opportunities,
    (row) => row.kind + "\\u0000" + row.subjectKey + "\\u0000" + row.opportunityFingerprint,
  );
  const diagnostics = [...new Set(fixture.diagnostics)].sort((a, b) => a.localeCompare(b));

  return {
    version: P7_7_AI_VISIBILITY_UI_VERSION,
    fixtureKind: fixture.fixtureKind,
    siteLabel: fixture.siteLabel.trim(),
    referenceTime: fixture.referenceTime,
    reportFingerprint: fixture.reportFingerprint,
    reportFingerprintShort: fixture.reportFingerprint.slice(0, 12) + "…",
    promptTopics: structuredClone(fixture.promptTopics),
    summary: {
      crawlerAccessible: crawlers.filter((row) => row.status === "accessible").length,
      crawlerTotal: crawlers.length,
      topics: fixture.promptTopics.topics,
      prompts: fixture.promptTopics.prompts,
      promptSets: fixture.promptTopics.promptSets,
      answerObservations: answers.length,
      citedAnswers: answers.filter((row) => row.citationCount > 0).length,
      scoredProfiles: scores.filter((row) => row.score100 !== null).length,
      unscorableProfiles: scores.filter((row) => row.score100 === null).length,
      projectedOpportunities: opportunities.length,
    },
    crawlers,
    answers,
    comparisons,
    scores,
    opportunities,
    diagnostics,
    guardrails: [
      "Robots allowance is not training consent or a data-use license.",
      "Crawler accessibility does not prove indexing, citation, retrieval or AI-answer visibility.",
      "Prompt/topic membership does not establish demand, popularity, search volume or priority.",
      "Supplied brand-mention evidence does not establish correctness, sentiment or endorsement.",
      "Citation-domain co-occurrence does not establish support, endorsement or association.",
      "Missing mention evidence is unknown evidence state; it is not proof that a brand is absent.",
      "P7.5 scores are evidence-bound within their exact provider/model/profile frame; no cross-provider winner is inferred.",
      "History direction is an arithmetic delta only; it is not labeled improvement or regression.",
      "P7.6 AI/GEO opportunities require explicit integration requests.",
      "P7.5 score is source evidence and is not a P6.2 opportunity score.",
      "A projected P6.1 AI opportunity is not a recommendation, approval, priority or execution authorization.",
    ],
    safety: aiVisibilityUiCapability(),
  };
}

export const P7_7_SYNTHETIC_AI_VISIBILITY_FIXTURE: AiVisibilityUiFixture = {
  version: "p7.7-synthetic-ui-fixture-v1",
  fixtureKind: "synthetic_read_only",
  siteLabel: "Diamond Shelf Test",
  referenceTime: "2026-09-19T12:00:00.000Z",
  reportFingerprint: "a7".repeat(32),
  promptTopics: {
    topics: 4,
    prompts: 6,
    promptSets: 2,
    activePromptSetLabel: "Core fragrance discovery",
  },
  crawlers: [
    {
      botKey: "crawler-alpha",
      userAgent: "SyntheticCrawlerAlpha/1.0",
      status: "accessible",
      robotsDecision: "allowed",
      observedPathCount: 3,
    },
    {
      botKey: "crawler-beta",
      userAgent: "SyntheticCrawlerBeta/1.0",
      status: "limited",
      robotsDecision: "allowed",
      observedPathCount: 3,
    },
    {
      botKey: "crawler-gamma",
      userAgent: "SyntheticCrawlerGamma/1.0",
      status: "indeterminate",
      robotsDecision: "unknown",
      observedPathCount: 2,
    },
  ],
  answers: [
    {
      observationFingerprint: "11".repeat(32),
      providerKey: "provider-alpha",
      modelKey: "model-a",
      promptKey: "best-men-fragrance",
      promptSetKey: "core-fragrance",
      trackedBrand: "Diamond Shelf",
      brandMentionState: "observed",
      brandMentionEvidenceCount: 1,
      citationCount: 2,
      observedAt: "2026-09-19T10:00:00.000Z",
    },
    {
      observationFingerprint: "22".repeat(32),
      providerKey: "provider-alpha",
      modelKey: "model-a",
      promptKey: "best-women-fragrance",
      promptSetKey: "core-fragrance",
      trackedBrand: "Diamond Shelf",
      brandMentionState: "not_observed_with_evidence",
      brandMentionEvidenceCount: 1,
      citationCount: 0,
      observedAt: "2026-09-19T10:02:00.000Z",
    },
    {
      observationFingerprint: "33".repeat(32),
      providerKey: "provider-beta",
      modelKey: "model-b",
      promptKey: "oud-fragrance-retailers",
      promptSetKey: "category-fragrance",
      trackedBrand: "Diamond Shelf",
      brandMentionState: "missing_evidence",
      brandMentionEvidenceCount: 0,
      citationCount: 1,
      observedAt: "2026-09-19T10:05:00.000Z",
    },
    {
      observationFingerprint: "44".repeat(32),
      providerKey: "provider-beta",
      modelKey: "model-b",
      promptKey: "fragrance-gift-shopping",
      promptSetKey: "category-fragrance",
      trackedBrand: "Diamond Shelf",
      brandMentionState: "observed",
      brandMentionEvidenceCount: 2,
      citationCount: 1,
      observedAt: "2026-09-19T10:08:00.000Z",
    },
  ],
  comparisons: [
    {
      comparisonFingerprint: "55".repeat(32),
      groupKey: "fragrance-retailers",
      trackedBrand: "Diamond Shelf",
      competitorBrand: "Competitor A",
      sharedMentionPrompts: 1,
      trackedOnlyMentionPrompts: 1,
      competitorOnlyMentionPrompts: 1,
      sharedCitationDomains: 1,
      trackedOnlyCitationDomains: 1,
      competitorOnlyCitationDomains: 2,
    },
    {
      comparisonFingerprint: "66".repeat(32),
      groupKey: "fragrance-retailers",
      trackedBrand: "Diamond Shelf",
      competitorBrand: "Competitor B",
      sharedMentionPrompts: 0,
      trackedOnlyMentionPrompts: 2,
      competitorOnlyMentionPrompts: 1,
      sharedCitationDomains: 0,
      trackedOnlyCitationDomains: 2,
      competitorOnlyCitationDomains: 1,
    },
  ],
  scores: [
    {
      scoreFingerprint: "77".repeat(32),
      providerKey: "provider-alpha",
      modelKey: "model-a",
      brandKey: "diamond-shelf",
      promptSetKey: "core-fragrance",
      score100: 42,
      previousScore100: 38,
      delta100: 4,
      direction: "up",
      componentCoverage: "4 / 4",
      historyPoints: 3,
    },
    {
      scoreFingerprint: "88".repeat(32),
      providerKey: "provider-beta",
      modelKey: "model-b",
      brandKey: "diamond-shelf",
      promptSetKey: "category-fragrance",
      score100: 0,
      previousScore100: 0,
      delta100: 0,
      direction: "flat",
      componentCoverage: "4 / 4",
      historyPoints: 2,
    },
    {
      scoreFingerprint: "99".repeat(32),
      providerKey: "provider-gamma",
      modelKey: "model-c",
      brandKey: "diamond-shelf",
      promptSetKey: "core-fragrance",
      score100: null,
      previousScore100: null,
      delta100: null,
      direction: "unavailable",
      componentCoverage: "3 / 4",
      historyPoints: 1,
    },
  ],
  opportunities: [
    {
      integrationFingerprint: "aa".repeat(32),
      opportunityFingerprint: "bb".repeat(32),
      kind: "ai_visibility_gap",
      subjectKey: "ai:provider-beta:model-b:category-fragrance",
      sourceScoreFingerprint: "88".repeat(32),
      comparisonFingerprint: "55".repeat(32),
      citationDomainCount: 0,
      explicitRequest: true,
      p6Score: null,
      recommendationGenerated: false,
      executionAuthorized: false,
    },
    {
      integrationFingerprint: "cc".repeat(32),
      opportunityFingerprint: "dd".repeat(32),
      kind: "ai_citation_gap",
      subjectKey: "ai:provider-alpha:model-a:citation-domain-gap",
      sourceScoreFingerprint: "77".repeat(32),
      comparisonFingerprint: "66".repeat(32),
      citationDomainCount: 2,
      explicitRequest: true,
      p6Score: null,
      recommendationGenerated: false,
      executionAuthorized: false,
    },
  ],
  diagnostics: [
    "provider-gamma/model-c remains unscorable because one required supplied component is null.",
    "crawler-beta is limited by supplied challenge/rate-limit evidence; vendor intent is not inferred.",
  ],
  semantics: {
    robotsAllowanceIsTrainingConsent: false,
    crawlerAccessibilityImpliesIndexingCitationOrVisibility: false,
    promptMembershipImpliesDemandPopularityVolumeOrPriority: false,
    brandMentionEvidenceImpliesCorrectnessSentimentOrEndorsement: false,
    citationCoOccurrenceImpliesSupportEndorsementOrAssociation: false,
    missingMentionEvidenceImpliesBrandAbsence: false,
    scoreCrossProviderModelWinnerComparable: false,
    historyDirectionImpliesImprovementOrRegression: false,
    opportunityProjectionImplicit: false,
    p75ScoreIsP62Score: false,
    p61OpportunityImpliesRecommendationApprovalPriorityOrExecution: false,
  },
};
