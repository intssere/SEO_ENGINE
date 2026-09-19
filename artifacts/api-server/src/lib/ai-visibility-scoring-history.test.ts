import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  P7_5_MAX_COMPONENTS_PER_SCORE,
  P7_5_MAX_EVIDENCE_PER_COMPONENT,
  P7_5_MAX_SCORES_PER_SNAPSHOT,
  P7_5_MAX_SNAPSHOTS,
  aiVisibilityScoringHistoryCapability,
  buildAiVisibilityScoringHistory,
  type AiVisibilityScoreInput,
  type AiVisibilityScoreSnapshotInput,
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

const PROMPT_REFERENCE = "2026-09-19T00:00:00.000Z";
const HISTORY_REFERENCE = "2026-09-19T23:00:00.000Z";

function fp(value: number): string {
  return value.toString(16).padStart(64, "0");
}

function promptInput(): AiPromptTopicModelInput {
  return {
    siteKey: "site",
    referenceTime: PROMPT_REFERENCE,
    topics: [{ topicKey: "topic", label: "Topic", parentTopicKey: null }],
    prompts: [
      {
        promptKey: "prompt-a",
        text: "Prompt A",
        topicKeys: ["topic"],
        intentCode: null,
        languageKey: "en",
        marketKey: "us",
      },
      {
        promptKey: "prompt-b",
        text: "Prompt B",
        topicKeys: ["topic"],
        intentCode: null,
        languageKey: "en",
        marketKey: "us",
      },
    ],
    sets: [
      { setKey: "set-a", label: "Set A", promptKeys: ["prompt-a"] },
      { setKey: "set-b", label: "Set B", promptKeys: ["prompt-b"] },
    ],
  };
}

function collectionInput(
  collectionReferenceTime: string,
  seed: number,
): AiAnswerVisibilityCollectionInput {
  const promptModelInput = promptInput();
  const promptModel = buildAiPromptTopicModel(promptModelInput);
  const promptA = promptModel.prompts.find((prompt) => prompt.promptKey === "prompt-a")!;
  const promptB = promptModel.prompts.find((prompt) => prompt.promptKey === "prompt-b")!;

  return {
    promptModelInput,
    promptModel,
    collectionReferenceTime,
    providers: [
      {
        providerKey: "provider-a",
        label: "Provider A",
        models: [
          { modelKey: "model-a", label: "Model A" },
          { modelKey: "model-b", label: "Model B" },
        ],
      },
      {
        providerKey: "provider-b",
        label: "Provider B",
        models: [{ modelKey: "model-a", label: "Model A" }],
      },
    ],
    brands: [
      { brandKey: "subject", label: "Subject" },
      { brandKey: "competitor", label: "Competitor" },
    ],
    observations: [
      {
        observationKey: `obs-a-${seed}`,
        providerKey: "provider-a",
        modelKey: "model-a",
        promptKey: "prompt-a",
        promptFingerprint: promptA.promptFingerprint,
        observedAt: collectionReferenceTime,
        evidenceFingerprint: fp(seed),
        answerState: "answered",
        answerText: "Synthetic answer A",
        brandMentions: [{ brandKey: "subject", matchedText: "Subject" }],
        citations: [{ url: "https://example.com/a", title: "A" }],
      },
      {
        observationKey: `obs-b-${seed}`,
        providerKey: "provider-a",
        modelKey: "model-a",
        promptKey: "prompt-b",
        promptFingerprint: promptB.promptFingerprint,
        observedAt: collectionReferenceTime,
        evidenceFingerprint: fp(seed + 1),
        answerState: "answered",
        answerText: "Synthetic answer B",
        brandMentions: [{ brandKey: "competitor", matchedText: "Competitor" }],
        citations: [{ url: "https://example.org/b", title: "B" }],
      },
      {
        observationKey: `obs-other-model-${seed}`,
        providerKey: "provider-a",
        modelKey: "model-b",
        promptKey: "prompt-a",
        promptFingerprint: promptA.promptFingerprint,
        observedAt: collectionReferenceTime,
        evidenceFingerprint: fp(seed + 2),
        answerState: "answered",
        answerText: "Other model",
        brandMentions: [{ brandKey: "subject", matchedText: "Subject" }],
        citations: [],
      },
      {
        observationKey: `obs-other-provider-${seed}`,
        providerKey: "provider-b",
        modelKey: "model-a",
        promptKey: "prompt-a",
        promptFingerprint: promptA.promptFingerprint,
        observedAt: collectionReferenceTime,
        evidenceFingerprint: fp(seed + 3),
        answerState: "answered",
        answerText: "Other provider",
        brandMentions: [{ brandKey: "subject", matchedText: "Subject" }],
        citations: [],
      },
    ],
  };
}

function comparisonInput(
  collectionReferenceTime: string,
  seed: number,
): AiCitationCompetitorComparisonInput {
  const source = collectionInput(collectionReferenceTime, seed);
  const collection = buildAiAnswerVisibilityCollection(source);
  return {
    collectionInput: source,
    collection,
    comparisons: [{
      comparisonKey: "subject-vs-competitor",
      subjectBrandKey: "subject",
      competitorBrandKeys: ["competitor"],
    }],
  };
}

function snapshot(
  collectionReferenceTime: string,
  seed: number,
  subjectValues: [number | null, number | null] = [0.4, 0.6],
  scoreOverrides: Partial<AiVisibilityScoreInput> = {},
): AiVisibilityScoreSnapshotInput {
  const input = comparisonInput(collectionReferenceTime, seed);
  const comparison = buildAiCitationCompetitorComparison(input);
  const observation = input.collection.observations.find(
    (candidate) =>
      candidate.providerKey === "provider-a" &&
      candidate.modelKey === "model-a" &&
      candidate.promptKey === "prompt-a",
  )!;

  const score: AiVisibilityScoreInput = {
    scoreKey: "primary",
    comparisonKey: "subject-vs-competitor",
    providerKey: "provider-a",
    modelKey: "model-a",
    brandKey: "subject",
    promptSetKey: "set-a",
    components: [
      {
        componentCode: "component-a",
        weight: 0.5,
        value: subjectValues[0],
        basisCode: subjectValues[0] === null ? null : "synthetic.component-a",
        evidenceObservationFingerprints:
          subjectValues[0] === null ? [] : [observation.observationFingerprint],
      },
      {
        componentCode: "component-b",
        weight: 0.5,
        value: subjectValues[1],
        basisCode: subjectValues[1] === null ? null : "synthetic.component-b",
        evidenceObservationFingerprints:
          subjectValues[1] === null ? [] : [observation.observationFingerprint],
      },
    ],
    ...scoreOverrides,
  };

  return { comparisonInput: input, comparison, scores: [score] };
}

test("P7.5 computes transparent weighted scores and preserves zero distinct from null", () => {
  const scored = buildAiVisibilityScoringHistory({
    historyReferenceTime: HISTORY_REFERENCE,
    snapshots: [snapshot("2026-09-19T08:00:00.000Z", 10, [0, 1])],
  });
  const score = scored.snapshots[0]!.scores[0]!;
  assert.equal(score.status, "scored");
  assert.equal(score.score01, 0.5);
  assert.equal(score.score100, 50);
  assert.equal(score.components[0]?.value, 0);
  assert.equal(scored.semantics.nullDistinctFromZero, true);

  const unscorable = buildAiVisibilityScoringHistory({
    historyReferenceTime: HISTORY_REFERENCE,
    snapshots: [snapshot("2026-09-19T09:00:00.000Z", 20, [null, 1])],
  });
  const missing = unscorable.snapshots[0]!.scores[0]!;
  assert.equal(missing.status, "unscorable");
  assert.equal(missing.score01, null);
  assert.equal(missing.score100, null);
  assert.deepEqual(missing.missingComponentCodes, ["component-a"]);
});

test("component input order and repeated evidence do not change canonical identity", () => {
  const one = snapshot("2026-09-19T08:00:00.000Z", 30);
  const original = one.scores[0]!;
  const two: AiVisibilityScoreSnapshotInput = {
    comparisonInput: one.comparisonInput,
    comparison: one.comparison,
    scores: [{
      ...original,
      components: [
        {
          ...original.components[1]!,
          evidenceObservationFingerprints: [
            ...original.components[1]!.evidenceObservationFingerprints,
            ...original.components[1]!.evidenceObservationFingerprints,
          ],
        },
        {
          ...original.components[0]!,
          evidenceObservationFingerprints: [
            ...original.components[0]!.evidenceObservationFingerprints,
            ...original.components[0]!.evidenceObservationFingerprints,
          ],
        },
      ],
    }],
  };

  const first = buildAiVisibilityScoringHistory({
    historyReferenceTime: HISTORY_REFERENCE,
    snapshots: [one],
  });
  const second = buildAiVisibilityScoringHistory({
    historyReferenceTime: HISTORY_REFERENCE,
    snapshots: [two],
  });
  assert.equal(first.reportFingerprint, second.reportFingerprint);
  assert.deepEqual(first, second);
});

test("non-null components require in-scope exact P7.3 observation evidence", () => {
  const base = snapshot("2026-09-19T08:00:00.000Z", 40);
  const score = base.scores[0]!;

  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: HISTORY_REFERENCE,
      snapshots: [{
        ...base,
        scores: [{
          ...score,
          components: score.components.map((component, index) => index === 0
            ? { ...component, evidenceObservationFingerprints: [fp(99999)] }
            : component),
        }],
      }],
    }),
    /ai_visibility_evidence_outside_scope/,
  );

  const otherPromptObservation = base.comparisonInput.collection.observations.find(
    (candidate) => candidate.promptKey === "prompt-b" && candidate.providerKey === "provider-a",
  )!;
  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: HISTORY_REFERENCE,
      snapshots: [{
        ...base,
        scores: [{
          ...score,
          components: score.components.map((component, index) => index === 0
            ? {
                ...component,
                evidenceObservationFingerprints: [otherPromptObservation.observationFingerprint],
              }
            : component),
        }],
      }],
    }),
    /ai_visibility_evidence_outside_scope/,
  );
});

test("provider/model/prompt-set boundaries prevent cross-scope evidence use", () => {
  const base = snapshot("2026-09-19T08:00:00.000Z", 50);
  const score = base.scores[0]!;
  const otherModel = base.comparisonInput.collection.observations.find(
    (candidate) => candidate.modelKey === "model-b",
  )!;
  const otherProvider = base.comparisonInput.collection.observations.find(
    (candidate) => candidate.providerKey === "provider-b",
  )!;

  for (const evidence of [otherModel, otherProvider]) {
    assert.throws(
      () => buildAiVisibilityScoringHistory({
        historyReferenceTime: HISTORY_REFERENCE,
        snapshots: [{
          ...base,
          scores: [{
            ...score,
            components: score.components.map((component, index) => index === 0
              ? { ...component, evidenceObservationFingerprints: [evidence.observationFingerprint] }
              : component),
          }],
        }],
      }),
      /ai_visibility_evidence_outside_scope/,
    );
  }
});

test("null components reject basis/evidence and scored components require basis/evidence", () => {
  const nullBase = snapshot("2026-09-19T08:00:00.000Z", 60, [null, 0.5]);
  const nullScore = nullBase.scores[0]!;
  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: HISTORY_REFERENCE,
      snapshots: [{
        ...nullBase,
        scores: [{
          ...nullScore,
          components: nullScore.components.map((component, index) => index === 0
            ? { ...component, basisCode: "unexpected" }
            : component),
        }],
      }],
    }),
    /null_ai_visibility_component_has_basis_or_evidence/,
  );

  const scoredBase = snapshot("2026-09-19T09:00:00.000Z", 70);
  const scored = scoredBase.scores[0]!;
  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: HISTORY_REFERENCE,
      snapshots: [{
        ...scoredBase,
        scores: [{
          ...scored,
          components: scored.components.map((component, index) => index === 0
            ? { ...component, evidenceObservationFingerprints: [] }
            : component),
        }],
      }],
    }),
    /scored_ai_visibility_component_missing_evidence/,
  );
});

test("weights, component values and duplicate component/scope identities fail closed", () => {
  const base = snapshot("2026-09-19T08:00:00.000Z", 80);
  const score = base.scores[0]!;

  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: HISTORY_REFERENCE,
      snapshots: [{
        ...base,
        scores: [{
          ...score,
          components: score.components.map((component, index) =>
            ({ ...component, weight: index === 0 ? 0.4 : 0.5 })),
        }],
      }],
    }),
    /ai_visibility_component_weights_must_sum_to_one/,
  );

  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: HISTORY_REFERENCE,
      snapshots: [{
        ...base,
        scores: [{
          ...score,
          components: score.components.map((component, index) =>
            ({ ...component, value: index === 0 ? 1.1 : component.value })),
        }],
      }],
    }),
    /invalid_ai_visibility_component_value/,
  );

  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: HISTORY_REFERENCE,
      snapshots: [{
        ...base,
        scores: [{
          ...score,
          components: [score.components[0]!, { ...score.components[0]! }],
        }],
      }],
    }),
    /duplicate_ai_visibility_component_code/,
  );

  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: HISTORY_REFERENCE,
      snapshots: [{ ...base, scores: [score, { ...score }] }],
    }),
    /duplicate_ai_visibility_score_scope/,
  );
});

test("comparison, provider, model, brand and prompt-set identities must be exact and explicit", () => {
  const base = snapshot("2026-09-19T08:00:00.000Z", 90);
  const score = base.scores[0]!;
  const variants: Array<[Partial<AiVisibilityScoreInput>, RegExp]> = [
    [{ comparisonKey: "missing" }, /unknown_ai_visibility_comparison/],
    [{ providerKey: "missing" }, /unknown_ai_visibility_provider/],
    [{ modelKey: "missing" }, /unknown_ai_visibility_model/],
    [{ brandKey: "missing" }, /unknown_ai_visibility_brand/],
    [{ promptSetKey: "missing" }, /unknown_ai_visibility_prompt_set/],
  ];

  for (const [overrides, error] of variants) {
    assert.throws(
      () => buildAiVisibilityScoringHistory({
        historyReferenceTime: HISTORY_REFERENCE,
        snapshots: [{ ...base, scores: [{ ...score, ...overrides }] }],
      }),
      error,
    );
  }
});

test("brand must belong to the explicit P7.4 comparison group", () => {
  const base = snapshot("2026-09-19T08:00:00.000Z", 100);
  const input = base.comparisonInput;
  input.collectionInput.brands.push({ brandKey: "outside", label: "Outside" });
  input.collection = buildAiAnswerVisibilityCollection(input.collectionInput);
  input.comparisons = [{
    comparisonKey: "subject-vs-competitor",
    subjectBrandKey: "subject",
    competitorBrandKeys: ["competitor"],
  }];
  const comparison = buildAiCitationCompetitorComparison(input);
  const score = { ...base.scores[0]!, brandKey: "outside" };

  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: HISTORY_REFERENCE,
      snapshots: [{ comparisonInput: input, comparison, scores: [score] }],
    }),
    /ai_visibility_brand_outside_comparison/,
  );
});

test("history compares only exact comparable scope/profile and emits arithmetic deltas", () => {
  const report = buildAiVisibilityScoringHistory({
    historyReferenceTime: HISTORY_REFERENCE,
    snapshots: [
      snapshot("2026-09-19T10:00:00.000Z", 120, [0.6, 0.6]),
      snapshot("2026-09-19T08:00:00.000Z", 110, [0.4, 0.4]),
      snapshot("2026-09-19T12:00:00.000Z", 130, [0.6, 0.6]),
    ],
  });

  assert.equal(report.series.length, 1);
  const series = report.series[0]!;
  assert.deepEqual(
    series.points.map((point) => point.collectionReferenceTime),
    [
      "2026-09-19T08:00:00.000Z",
      "2026-09-19T10:00:00.000Z",
      "2026-09-19T12:00:00.000Z",
    ],
  );
  assert.deepEqual(series.deltas.map((delta) => [delta.delta100, delta.direction]), [
    [20, "increased"],
    [0, "unchanged"],
  ]);
  assert.equal(report.semantics.historyDirectionImpliesImprovementOrRegression, false);
});

test("unscorable history points produce indeterminate deltas", () => {
  const report = buildAiVisibilityScoringHistory({
    historyReferenceTime: HISTORY_REFERENCE,
    snapshots: [
      snapshot("2026-09-19T08:00:00.000Z", 140, [0.4, 0.4]),
      snapshot("2026-09-19T10:00:00.000Z", 150, [null, 0.5]),
      snapshot("2026-09-19T12:00:00.000Z", 160, [0.7, 0.7]),
    ],
  });
  assert.deepEqual(report.series[0]?.deltas.map((delta) => [delta.delta100, delta.direction]), [
    [null, "indeterminate"],
    [null, "indeterminate"],
  ]);
});

test("different provider/model/profile/prompt-set scopes remain separate series", () => {
  const first = snapshot("2026-09-19T08:00:00.000Z", 170);
  const second = snapshot("2026-09-19T10:00:00.000Z", 180);
  const baseScore = second.scores[0]!;
  const otherPrompt = second.comparisonInput.collection.observations.find(
    (candidate) =>
      candidate.providerKey === "provider-a" &&
      candidate.modelKey === "model-a" &&
      candidate.promptKey === "prompt-b",
  )!;
  second.scores.push({
    ...baseScore,
    promptSetKey: "set-b",
    components: baseScore.components.map((component) => ({
      ...component,
      evidenceObservationFingerprints: [otherPrompt.observationFingerprint],
    })),
  });

  const report = buildAiVisibilityScoringHistory({
    historyReferenceTime: HISTORY_REFERENCE,
    snapshots: [first, second],
  });
  assert.equal(report.series.length, 2);
  assert.deepEqual(report.series.map((series) => series.points.length).sort(), [1, 2]);
  assert.equal(report.semantics.crossProviderNormalizedComparabilityClaimed, false);
  assert.equal(report.semantics.crossModelNormalizedComparabilityClaimed, false);
});

test("snapshot times must be unique, in range and on one site", () => {
  const first = snapshot("2026-09-19T08:00:00.000Z", 190);
  const duplicate = snapshot("2026-09-19T08:00:00.000Z", 200);
  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: HISTORY_REFERENCE,
      snapshots: [first, duplicate],
    }),
    /duplicate_ai_visibility_snapshot_time/,
  );

  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: "2026-09-19T07:00:00.000Z",
      snapshots: [first],
    }),
    /ai_visibility_snapshot_after_history_reference/,
  );

  const other = snapshot("2026-09-19T10:00:00.000Z", 210);
  other.comparisonInput.collectionInput.promptModelInput.siteKey = "other-site";
  other.comparisonInput.collectionInput.promptModel =
    buildAiPromptTopicModel(other.comparisonInput.collectionInput.promptModelInput);
  other.comparisonInput.collection =
    buildAiAnswerVisibilityCollection(other.comparisonInput.collectionInput);
  other.comparison = buildAiCitationCompetitorComparison(other.comparisonInput);

  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: HISTORY_REFERENCE,
      snapshots: [first, other],
    }),
    /mixed_ai_visibility_site_scope/,
  );
});

test("tampered P7.4 report fails closed", () => {
  const base = snapshot("2026-09-19T08:00:00.000Z", 220);
  const tampered = {
    ...base.comparison,
    counts: { ...base.comparison.counts, domains: base.comparison.counts.domains + 1 },
  };
  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: HISTORY_REFERENCE,
      snapshots: [{ ...base, comparison: tampered }],
    }),
    /p74_comparison_integrity_mismatch/,
  );
});

test("P7.5 bounds fail closed", () => {
  const base = snapshot("2026-09-19T08:00:00.000Z", 230);
  const score = base.scores[0]!;

  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: HISTORY_REFERENCE,
      snapshots: Array.from({ length: P7_5_MAX_SNAPSHOTS + 1 }, () => base),
    }),
    /ai_visibility_snapshot_limit_exceeded/,
  );

  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: HISTORY_REFERENCE,
      snapshots: [{
        ...base,
        scores: Array.from({ length: P7_5_MAX_SCORES_PER_SNAPSHOT + 1 }, (_, index) => ({
          ...score,
          scoreKey: `score-${index}`,
        })),
      }],
    }),
    /ai_visibility_score_limit_exceeded/,
  );

  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: HISTORY_REFERENCE,
      snapshots: [{
        ...base,
        scores: [{
          ...score,
          components: Array.from({ length: P7_5_MAX_COMPONENTS_PER_SCORE + 1 }, (_, index) => ({
            componentCode: `component-${index}`,
            weight: 1 / (P7_5_MAX_COMPONENTS_PER_SCORE + 1),
            value: 0.5,
            basisCode: "synthetic",
            evidenceObservationFingerprints:
              score.components[0]!.evidenceObservationFingerprints,
          })),
        }],
      }],
    }),
    /ai_visibility_component_limit_exceeded/,
  );

  assert.throws(
    () => buildAiVisibilityScoringHistory({
      historyReferenceTime: HISTORY_REFERENCE,
      snapshots: [{
        ...base,
        scores: [{
          ...score,
          components: score.components.map((component, index) => index === 0
            ? {
                ...component,
                evidenceObservationFingerprints: Array.from(
                  { length: P7_5_MAX_EVIDENCE_PER_COMPONENT + 1 },
                  (_, value) => fp(50000 + value),
                ),
              }
            : component),
        }],
      }],
    }),
    /ai_visibility_component_evidence_limit_exceeded/,
  );
});

test("P7.5 semantics keep descriptive counts, ranking, recommendation and opportunities separate", () => {
  const report = buildAiVisibilityScoringHistory({
    historyReferenceTime: HISTORY_REFERENCE,
    snapshots: [snapshot("2026-09-19T08:00:00.000Z", 240)],
  });
  assert.equal(report.semantics.rawP73CountsAutomaticallyScored, false);
  assert.equal(report.semantics.rawP74CountsAutomaticallyScored, false);
  assert.equal(report.semantics.aggregateProviderWinnerScoreGenerated, false);
  assert.equal(report.semantics.scoreImpliesMarketShare, false);
  assert.equal(report.semantics.scoreImpliesPreference, false);
  assert.equal(report.semantics.scoreImpliesRank, false);
  assert.equal(report.semantics.scoreImpliesQuality, false);
  assert.equal(report.semantics.scoreImpliesCorrectness, false);
  assert.equal(report.semantics.scoreImpliesRecommendation, false);
  assert.equal(report.semantics.scoreImpliesExecutionPriority, false);
  assert.equal(report.semantics.citationCooccurrenceImpliesSupport, false);
  assert.equal(report.semantics.missingMentionEvidenceImpliesBrandAbsent, false);
  assert.equal(report.semantics.opportunityGenerated, false);
});

test("P7.5 capability keeps provider, persistence, opportunity generation and publication closed", () => {
  const capability = aiVisibilityScoringHistoryCapability();
  assert.equal(capability.deterministicScoringHistoryOnly, true);
  assert.equal(capability.liveProviderRequestsAuthorized, false);
  assert.equal(capability.providerCredentialUseAuthorized, false);
  assert.equal(capability.aiModelCallsAuthorized, false);
  assert.equal(capability.sourceRegistryAdmissionAuthorized, false);
  assert.equal(capability.scorePersistenceAuthorized, false);
  assert.equal(capability.historyPersistenceAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.schemaMutationAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.workerEnabled, false);
  assert.equal(capability.retryLoopEnabled, false);
  assert.equal(capability.opportunityGenerationAuthorized, false);
  assert.equal(capability.approvalGrantAuthorized, false);
  assert.equal(capability.applyAuthorized, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.automaticTransitionEnabled, false);
  assert.equal(capability.publicationAuthorized, false);
});

test("P7.5 source contains no network, AI, environment, database, persistence, execution or scheduler primitive", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourceText = readFileSync(join(here, "ai-visibility-scoring-history.ts"), "utf8");
  assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
  assert.doesNotMatch(sourceText, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(sourceText, /\bOpenAI\b|chat\.completions|responses\.create/);
  assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(sourceText, /executeCompetitorPilot|executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(sourceText, /\b(?:insertInto|updateTable|deleteFrom|persistRecord|sql\s*\`|db\.(?:insert|update|delete))\b/);
  assert.doesNotMatch(sourceText, /setTimeout|setInterval|queueMicrotask/);
});
