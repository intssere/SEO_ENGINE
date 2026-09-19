import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  P7_6_MAX_DOMAIN_SUMMARIES_PER_REQUEST,
  P7_6_MAX_REQUESTS,
  aiGeoOpportunityIntegrationCapability,
  buildAiGeoOpportunityIntegration,
  type AiGeoOpportunityIntegrationRequest,
} from "./ai-geo-opportunity-integration.js";
import {
  buildAiVisibilityScoringHistory,
  type AiVisibilityScoringHistoryInput,
} from "./ai-visibility-scoring-history.js";
import {
  buildAiCitationCompetitorComparison,
  type AiCitationCompetitorComparisonInput,
} from "./ai-citation-competitor-comparison.js";
import {
  buildAiAnswerVisibilityCollection,
  type AiAnswerVisibilityCollectionInput,
} from "./ai-answer-visibility-collection.js";
import {
  buildAiPromptTopicModel,
  type AiPromptTopicModelInput,
} from "./ai-prompt-topic-model.js";
import { P6_1_MAX_EVIDENCE_REFS } from "./unified-opportunity-types.js";

const MARKET = "a".repeat(64);
const CATEGORY = "b".repeat(64);
const PROMPT_REFERENCE = "2026-09-19T08:00:00.000Z";
const COLLECTION_REFERENCE = "2026-09-19T10:00:00.000Z";
const HISTORY_REFERENCE = "2026-09-19T12:00:00.000Z";

function fp(value: number): string {
  return value.toString(16).padStart(64, "0");
}

function buildFixture(options: { unscorable?: boolean } = {}) {
  const promptModelInput: AiPromptTopicModelInput = {
    siteKey: "site",
    referenceTime: PROMPT_REFERENCE,
    topics: [{ topicKey: "fragrance", label: "Fragrance", parentTopicKey: null }],
    prompts: [
      {
        promptKey: "best-fragrance",
        text: "What fragrance brands are often discussed?",
        topicKeys: ["fragrance"],
        intentCode: "discovery",
        languageKey: "en-us",
        marketKey: "us",
      },
    ],
    sets: [
      {
        setKey: "core",
        label: "Core prompts",
        promptKeys: ["best-fragrance"],
      },
    ],
  };
  const promptModel = buildAiPromptTopicModel(promptModelInput);

  const prompt = promptModel.prompts[0]!;
  const collectionInput: AiAnswerVisibilityCollectionInput = {
    promptModelInput,
    promptModel,
    collectionReferenceTime: COLLECTION_REFERENCE,
    providers: [
      {
        providerKey: "provider-a",
        label: "Provider A",
        models: [{ modelKey: "model-a", label: "Model A" }],
      },
    ],
    brands: [
      { brandKey: "diamond-shelf", label: "Diamond Shelf" },
      { brandKey: "competitor-a", label: "Competitor A" },
    ],
    observations: [
      {
        observationKey: "obs-subject",
        providerKey: "provider-a",
        modelKey: "model-a",
        promptKey: prompt.promptKey,
        promptFingerprint: prompt.promptFingerprint,
        observedAt: "2026-09-19T09:00:00.000Z",
        evidenceFingerprint: fp(1),
        answerState: "answered",
        answerText: "Diamond Shelf and Competitor A are discussed.",
        brandMentions: [
          { brandKey: "diamond-shelf", matchedText: "Diamond Shelf" },
          { brandKey: "competitor-a", matchedText: "Competitor A" },
        ],
        citations: [
          { url: "https://example.com/a#fragment", title: "A" },
          { url: "https://shared.example.org/page", title: null },
        ],
      },
      {
        observationKey: "obs-competitor",
        providerKey: "provider-a",
        modelKey: "model-a",
        promptKey: prompt.promptKey,
        promptFingerprint: prompt.promptFingerprint,
        observedAt: "2026-09-19T09:30:00.000Z",
        evidenceFingerprint: fp(2),
        answerState: "answered",
        answerText: "Competitor A is discussed.",
        brandMentions: [
          { brandKey: "competitor-a", matchedText: "Competitor A" },
        ],
        citations: [
          { url: "https://competitor.example.net/story", title: "Story" },
        ],
      },
    ],
  };
  const collection = buildAiAnswerVisibilityCollection(collectionInput);

  const comparisonInput: AiCitationCompetitorComparisonInput = {
    collectionInput,
    collection,
    comparisons: [
      {
        comparisonKey: "fragrance-visibility",
        subjectBrandKey: "diamond-shelf",
        competitorBrandKeys: ["competitor-a"],
      },
    ],
  };
  const comparison = buildAiCitationCompetitorComparison(comparisonInput);
  const observations = collection.observations;
  const subjectObservation = observations.find((item) => item.observationKey === "obs-subject")!;
  const competitorObservation = observations.find((item) => item.observationKey === "obs-competitor")!;

  const scoringInput: AiVisibilityScoringHistoryInput = {
    historyReferenceTime: HISTORY_REFERENCE,
    snapshots: [
      {
        comparisonInput,
        comparison,
        scores: [
          {
            scoreKey: "brand-visibility",
            comparisonKey: "fragrance-visibility",
            providerKey: "provider-a",
            modelKey: "model-a",
            brandKey: "diamond-shelf",
            promptSetKey: "core",
            components: options.unscorable
              ? [
                  {
                    componentCode: "presence",
                    weight: 0.5,
                    value: 0.8,
                    basisCode: "supplied.presence",
                    evidenceObservationFingerprints: [subjectObservation.observationFingerprint],
                  },
                  {
                    componentCode: "citation",
                    weight: 0.5,
                    value: null,
                    basisCode: null,
                    evidenceObservationFingerprints: [],
                  },
                ]
              : [
                  {
                    componentCode: "presence",
                    weight: 0.5,
                    value: 0.8,
                    basisCode: "supplied.presence",
                    evidenceObservationFingerprints: [subjectObservation.observationFingerprint],
                  },
                  {
                    componentCode: "coverage",
                    weight: 0.5,
                    value: 0.4,
                    basisCode: "supplied.coverage",
                    evidenceObservationFingerprints: [
                      subjectObservation.observationFingerprint,
                      competitorObservation.observationFingerprint,
                    ],
                  },
                ],
          },
        ],
      },
    ],
  };
  const scoring = buildAiVisibilityScoringHistory(scoringInput);
  const snapshot = scoring.snapshots[0]!;
  const score = snapshot.scores[0]!;
  const group = comparison.comparisons[0]!;
  const pair = group.pairs[0]!;
  const pairDomains = new Set([
    ...pair.citationDomainCooccurrence.subjectDomains,
    ...pair.citationDomainCooccurrence.competitorDomains,
  ]);
  const domain = comparison.domains.find((item) => pairDomains.has(item.domain))!;

  return {
    scoringInput,
    scoring,
    snapshot,
    score,
    group,
    pair,
    domain,
    collection,
  };
}

function visibilityRequest(
  fixture: ReturnType<typeof buildFixture>,
  overrides: Partial<AiGeoOpportunityIntegrationRequest> = {},
): AiGeoOpportunityIntegrationRequest {
  return {
    integrationKey: "visibility-gap",
    kind: "ai_visibility_gap",
    subjectKey: "ai:visibility:diamond-shelf:core",
    snapshotFingerprint: fixture.snapshot.snapshotFingerprint,
    scoreFingerprint: fixture.score.scoreFingerprint,
    comparisonFingerprint: fixture.group.comparisonFingerprint,
    pairFingerprint: null,
    domainSummaryFingerprints: [],
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
    ...overrides,
  };
}

function citationRequest(
  fixture: ReturnType<typeof buildFixture>,
  overrides: Partial<AiGeoOpportunityIntegrationRequest> = {},
): AiGeoOpportunityIntegrationRequest {
  return {
    integrationKey: "citation-gap",
    kind: "ai_citation_gap",
    subjectKey: "ai:citation:diamond-shelf:core",
    snapshotFingerprint: fixture.snapshot.snapshotFingerprint,
    scoreFingerprint: fixture.score.scoreFingerprint,
    comparisonFingerprint: fixture.group.comparisonFingerprint,
    pairFingerprint: fixture.pair.pairFingerprint,
    domainSummaryFingerprints: [fixture.domain.domainSummaryFingerprint],
    marketFingerprint: MARKET,
    categoryFingerprint: CATEGORY,
    ...overrides,
  };
}

test("P7.6 projects an explicit visibility request into exact P6.1 AI opportunity evidence", () => {
  const fixture = buildFixture();
  const report = buildAiGeoOpportunityIntegration({
    scoringInput: fixture.scoringInput,
    scoring: fixture.scoring,
    requests: [visibilityRequest(fixture)],
  });
  const integration = report.integrations[0]!;

  assert.equal(integration.opportunity.family, "ai");
  assert.equal(integration.opportunity.kind, "ai_visibility_gap");
  assert.equal(integration.opportunity.referenceTime, COLLECTION_REFERENCE);
  assert.equal(integration.opportunity.scope.marketFingerprint, MARKET);
  assert.equal(integration.opportunity.scope.categoryFingerprint, CATEGORY);
  assert.equal(integration.lineage.scoreFingerprint, fixture.score.scoreFingerprint);
  assert.equal(integration.lineage.comparisonFingerprint, fixture.group.comparisonFingerprint);
  assert.equal(integration.lineage.pairFingerprint, null);
  assert.deepEqual(integration.lineage.domainSummaryFingerprints, []);
  assert.ok(integration.opportunity.evidence.some((ref) =>
    ref.fingerprint === fixture.score.scoreFingerprint && ref.sourceKey === "p7.5:score"));
  assert.ok(integration.opportunity.evidence.some((ref) =>
    ref.fingerprint === fixture.group.comparisonFingerprint && ref.sourceKey === "p7.4:comparison"));
  assert.ok(integration.lineage.observationFingerprints.length > 0);
});

test("P7.6 citation integration requires exact pair, score brand and domain co-occurrence evidence", () => {
  const fixture = buildFixture();
  const report = buildAiGeoOpportunityIntegration({
    scoringInput: fixture.scoringInput,
    scoring: fixture.scoring,
    requests: [citationRequest(fixture)],
  });
  const integration = report.integrations[0]!;

  assert.equal(integration.opportunity.kind, "ai_citation_gap");
  assert.equal(integration.lineage.pairFingerprint, fixture.pair.pairFingerprint);
  assert.deepEqual(integration.lineage.domainSummaryFingerprints, [
    fixture.domain.domainSummaryFingerprint,
  ]);
  assert.ok(integration.opportunity.evidence.some((ref) =>
    ref.fingerprint === fixture.pair.pairFingerprint && ref.sourceKey === "p7.4:pair"));
  assert.ok(integration.opportunity.evidence.some((ref) =>
    ref.fingerprint === fixture.domain.domainSummaryFingerprint &&
    ref.sourceKey === "p7.4:domain_summary"));
});

test("visibility integration rejects citation-specific pair/domain claims", () => {
  const fixture = buildFixture();
  assert.throws(
    () => buildAiGeoOpportunityIntegration({
      scoringInput: fixture.scoringInput,
      scoring: fixture.scoring,
      requests: [visibilityRequest(fixture, {
        pairFingerprint: fixture.pair.pairFingerprint,
      })],
    }),
    /ai_visibility_gap_must_not_claim_citation_pair_or_domains/,
  );
});

test("citation integration fails closed on unknown pair/domain or domain outside pair evidence", () => {
  const fixture = buildFixture();

  assert.throws(
    () => buildAiGeoOpportunityIntegration({
      scoringInput: fixture.scoringInput,
      scoring: fixture.scoring,
      requests: [citationRequest(fixture, { pairFingerprint: fp(9001) })],
    }),
    /unknown_ai_geo_pair/,
  );

  assert.throws(
    () => buildAiGeoOpportunityIntegration({
      scoringInput: fixture.scoringInput,
      scoring: fixture.scoring,
      requests: [citationRequest(fixture, {
        domainSummaryFingerprints: [fp(9002)],
      })],
    }),
    /unknown_ai_geo_domain_summary/,
  );
});

test("P7.6 rejects unknown snapshot/score and mismatched comparison lineage", () => {
  const fixture = buildFixture();

  assert.throws(
    () => buildAiGeoOpportunityIntegration({
      scoringInput: fixture.scoringInput,
      scoring: fixture.scoring,
      requests: [visibilityRequest(fixture, { snapshotFingerprint: fp(9100) })],
    }),
    /unknown_ai_geo_snapshot/,
  );
  assert.throws(
    () => buildAiGeoOpportunityIntegration({
      scoringInput: fixture.scoringInput,
      scoring: fixture.scoring,
      requests: [visibilityRequest(fixture, { scoreFingerprint: fp(9101) })],
    }),
    /unknown_ai_geo_score/,
  );
  assert.throws(
    () => buildAiGeoOpportunityIntegration({
      scoringInput: fixture.scoringInput,
      scoring: fixture.scoring,
      requests: [visibilityRequest(fixture, { comparisonFingerprint: fp(9102) })],
    }),
    /ai_geo_comparison_fingerprint_mismatch/,
  );
});

test("unscorable P7.5 score becomes generic missing evidence, not zero or a P6.2 score", () => {
  const fixture = buildFixture({ unscorable: true });
  const report = buildAiGeoOpportunityIntegration({
    scoringInput: fixture.scoringInput,
    scoring: fixture.scoring,
    requests: [visibilityRequest(fixture)],
  });
  const integration = report.integrations[0]!;

  assert.equal(integration.lineage.scoreStatus, "unscorable");
  assert.equal(integration.lineage.sourceScore100, null);
  assert.deepEqual(integration.opportunity.missingEvidence, ["p7.5.unscorable_score"]);
  assert.deepEqual(integration.lineage.missingComponentCodes, ["citation"]);
  assert.equal(report.semantics.p75ScoreReusedAsP62Score, false);
  assert.equal(report.semantics.p75ComponentsMappedToP62Dimensions, false);
  assert.equal(report.semantics.p62ScoringPerformed, false);
});

test("P7.6 does not infer P6 scope from P7 market/language keys", () => {
  const fixture = buildFixture();
  const report = buildAiGeoOpportunityIntegration({
    scoringInput: fixture.scoringInput,
    scoring: fixture.scoring,
    requests: [visibilityRequest(fixture, {
      marketFingerprint: null,
      categoryFingerprint: null,
    })],
  });
  const opportunity = report.integrations[0]!.opportunity;

  assert.equal(opportunity.scope.marketFingerprint, null);
  assert.equal(opportunity.scope.categoryFingerprint, null);
  assert.equal(report.semantics.p7MarketLanguageKeysMappedToP6Scope, false);
});

test("request order and repeated domain-summary refs do not change canonical identity", () => {
  const fixture = buildFixture();
  const visibility = visibilityRequest(fixture, { integrationKey: "b-visibility" });
  const citation = citationRequest(fixture, {
    integrationKey: "a-citation",
    domainSummaryFingerprints: [
      fixture.domain.domainSummaryFingerprint,
      fixture.domain.domainSummaryFingerprint,
    ],
  });

  const one = buildAiGeoOpportunityIntegration({
    scoringInput: fixture.scoringInput,
    scoring: fixture.scoring,
    requests: [visibility, citation],
  });
  const two = buildAiGeoOpportunityIntegration({
    scoringInput: fixture.scoringInput,
    scoring: fixture.scoring,
    requests: [
      { ...citation, domainSummaryFingerprints: [fixture.domain.domainSummaryFingerprint] },
      visibility,
    ],
  });

  assert.equal(one.reportFingerprint, two.reportFingerprint);
  assert.deepEqual(one, two);
  assert.deepEqual(one.integrations.map((item) => item.integrationKey), [
    "a-citation",
    "b-visibility",
  ]);
});

test("P7.6 rejects duplicate integration keys and duplicate opportunity projections", () => {
  const fixture = buildFixture();
  const first = visibilityRequest(fixture);

  assert.throws(
    () => buildAiGeoOpportunityIntegration({
      scoringInput: fixture.scoringInput,
      scoring: fixture.scoring,
      requests: [first, { ...first, integrationKey: " VISIBILITY-GAP " }],
    }),
    /duplicate_ai_geo_integration_key/,
  );

  assert.throws(
    () => buildAiGeoOpportunityIntegration({
      scoringInput: fixture.scoringInput,
      scoring: fixture.scoring,
      requests: [first, { ...first, integrationKey: "visibility-gap-2" }],
    }),
    /duplicate_ai_geo_opportunity_projection/,
  );
});

test("tampered P7.5 report fails closed before opportunity projection", () => {
  const fixture = buildFixture();
  const tampered = {
    ...fixture.scoring,
    counts: { ...fixture.scoring.counts, scores: fixture.scoring.counts.scores + 1 },
  };

  assert.throws(
    () => buildAiGeoOpportunityIntegration({
      scoringInput: fixture.scoringInput,
      scoring: tampered,
      requests: [visibilityRequest(fixture)],
    }),
    /p75_scoring_history_integrity_mismatch/,
  );
});

test("P7.6 emits nothing without an explicit integration request", () => {
  const fixture = buildFixture();
  const report = buildAiGeoOpportunityIntegration({
    scoringInput: fixture.scoringInput,
    scoring: fixture.scoring,
    requests: [],
  });

  assert.equal(report.counts.integrations, 0);
  assert.deepEqual(report.integrations, []);
  assert.equal(report.semantics.explicitIntegrationRequestRequired, true);
  assert.equal(report.semantics.gapExistenceInferredFromScoreThreshold, false);
  assert.equal(report.semantics.gapExistenceInferredFromHistoryDelta, false);
  assert.equal(report.semantics.gapExistenceInferredFromComparisonCounts, false);
});

test("request/domain bounds and P6.1 evidence bound fail closed", () => {
  const fixture = buildFixture();
  const base = visibilityRequest(fixture);

  assert.throws(
    () => buildAiGeoOpportunityIntegration({
      scoringInput: fixture.scoringInput,
      scoring: fixture.scoring,
      requests: Array.from({ length: P7_6_MAX_REQUESTS + 1 }, (_, index) => ({
        ...base,
        integrationKey: `request-${index}`,
        subjectKey: `subject:${index}`,
      })),
    }),
    /ai_geo_integration_request_limit_exceeded/,
  );

  assert.throws(
    () => buildAiGeoOpportunityIntegration({
      scoringInput: fixture.scoringInput,
      scoring: fixture.scoring,
      requests: [citationRequest(fixture, {
        domainSummaryFingerprints: Array.from(
          { length: P7_6_MAX_DOMAIN_SUMMARIES_PER_REQUEST + 1 },
          (_, index) => fp(10000 + index),
        ),
      })],
    }),
    /ai_geo_domain_summary_limit_exceeded/,
  );

  assert.ok(P6_1_MAX_EVIDENCE_REFS >= 4);
});

test("P7.6 capability keeps runtime, persistence, scoring, recommendation and publication closed", () => {
  const capability = aiGeoOpportunityIntegrationCapability();
  assert.equal(capability.deterministicP61ProjectionOnly, true);
  assert.equal(capability.liveProviderRequestsAuthorized, false);
  assert.equal(capability.providerCredentialUseAuthorized, false);
  assert.equal(capability.aiModelCallsAuthorized, false);
  assert.equal(capability.sourceRegistryAdmissionAuthorized, false);
  assert.equal(capability.opportunityPersistenceAuthorized, false);
  assert.equal(capability.scorePersistenceAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.schemaMutationAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.workerEnabled, false);
  assert.equal(capability.retryLoopEnabled, false);
  assert.equal(capability.p62ScoringAuthorized, false);
  assert.equal(capability.prioritizationAuthorized, false);
  assert.equal(capability.recommendationGenerationAuthorized, false);
  assert.equal(capability.approvalGrantAuthorized, false);
  assert.equal(capability.applyAuthorized, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.automaticTransitionEnabled, false);
  assert.equal(capability.publicationAuthorized, false);
});

test("P7.6 source contains no network, AI, DB, persistence, P6 scoring/execution or scheduler primitive", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourceText = readFileSync(join(here, "ai-geo-opportunity-integration.ts"), "utf8");
  assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
  assert.doesNotMatch(sourceText, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(sourceText, /\bOpenAI\b|chat\.completions|responses\.create/);
  assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(sourceText, /scoreUnifiedOpportunity|prioritizeUnifiedOpportunities/);
  assert.doesNotMatch(sourceText, /executeCompetitorPilot|executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(sourceText, /\b(?:insertInto|updateTable|deleteFrom|persistRecord|sql\s*\`|db\.(?:insert|update|delete))\b/);
  assert.doesNotMatch(sourceText, /setTimeout|setInterval|queueMicrotask/);
});
