import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  P7_4_MAX_COMPARISON_GROUPS,
  P7_4_MAX_COMPETITORS_PER_GROUP,
  aiCitationCompetitorComparisonCapability,
  buildAiCitationCompetitorComparison,
  type AiCompetitorComparisonInput,
} from "./ai-citation-competitor-comparison.js";
import {
  buildAiAnswerVisibilityCollection,
  type AiAnswerVisibilityCollectionInput,
  type AiAnswerVisibilityCollectionReport,
} from "./ai-answer-visibility-collection.js";
import {
  buildAiPromptTopicModel,
  type AiPromptTopicModelInput,
} from "./ai-prompt-topic-model.js";

const PROMPT_REFERENCE = "2026-09-19T00:00:00.000Z";
const COLLECTION_REFERENCE = "2026-09-19T12:00:00.000Z";

function fp(value: number): string {
  return value.toString(16).padStart(64, "0");
}

function buildFixture(): {
  collectionInput: AiAnswerVisibilityCollectionInput;
  collection: AiAnswerVisibilityCollectionReport;
} {
  const promptModelInput: AiPromptTopicModelInput = {
    siteKey: "site",
    referenceTime: PROMPT_REFERENCE,
    topics: [
      { topicKey: "root", label: "Root", parentTopicKey: null },
      { topicKey: "topic-a", label: "Topic A", parentTopicKey: "root" },
      { topicKey: "topic-b", label: "Topic B", parentTopicKey: "root" },
    ],
    prompts: [
      {
        promptKey: "prompt-a",
        text: "Prompt A",
        topicKeys: ["root", "topic-a"],
        intentCode: null,
        languageKey: null,
        marketKey: null,
      },
      {
        promptKey: "prompt-b",
        text: "Prompt B",
        topicKeys: ["root", "topic-b"],
        intentCode: null,
        languageKey: null,
        marketKey: null,
      },
      {
        promptKey: "prompt-c",
        text: "Prompt C",
        topicKeys: ["root"],
        intentCode: null,
        languageKey: null,
        marketKey: null,
      },
    ],
    sets: [
      {
        setKey: "core",
        label: "Core",
        promptKeys: ["prompt-a", "prompt-b", "prompt-c"],
      },
    ],
  };
  const promptModel = buildAiPromptTopicModel(promptModelInput);
  const promptFingerprint = (key: string) => {
    const prompt = promptModel.prompts.find((candidate) => candidate.promptKey === key);
    assert.ok(prompt);
    return prompt.promptFingerprint;
  };

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
      {
        providerKey: "provider-b",
        label: "Provider B",
        models: [{ modelKey: "model-b", label: "Model B" }],
      },
    ],
    brands: [
      { brandKey: "subject", label: "Subject Brand" },
      { brandKey: "comp-one", label: "Competitor One" },
      { brandKey: "comp-two", label: "Competitor Two" },
      { brandKey: "unused", label: "Unused Brand" },
    ],
    observations: [
      {
        observationKey: "obs-subject",
        providerKey: "provider-a",
        modelKey: "model-a",
        promptKey: "prompt-a",
        promptFingerprint: promptFingerprint("prompt-a"),
        observedAt: "2026-09-19T08:00:00.000Z",
        evidenceFingerprint: fp(1),
        answerState: "answered",
        answerText: "Subject answer",
        brandMentions: [{ brandKey: "subject", matchedText: "Subject Brand" }],
        citations: [
          { url: "https://a.example/path#fragment", title: "A" },
          { url: "https://shared.example/one", title: "Shared one" },
        ],
      },
      {
        observationKey: "obs-comp-one",
        providerKey: "provider-a",
        modelKey: "model-a",
        promptKey: "prompt-b",
        promptFingerprint: promptFingerprint("prompt-b"),
        observedAt: "2026-09-19T09:00:00.000Z",
        evidenceFingerprint: fp(2),
        answerState: "answered",
        answerText: "Competitor answer",
        brandMentions: [{ brandKey: "comp-one", matchedText: "Competitor One" }],
        citations: [
          { url: "https://b.example/path", title: "B" },
          { url: "https://shared.example/two", title: "Shared two" },
        ],
      },
      {
        observationKey: "obs-both",
        providerKey: "provider-b",
        modelKey: "model-b",
        promptKey: "prompt-c",
        promptFingerprint: promptFingerprint("prompt-c"),
        observedAt: "2026-09-19T10:00:00.000Z",
        evidenceFingerprint: fp(3),
        answerState: "answered",
        answerText: "Both brands answer",
        brandMentions: [
          { brandKey: "subject", matchedText: "Subject Brand" },
          { brandKey: "comp-one", matchedText: "Competitor One" },
        ],
        citations: [
          { url: "https://shared.example/three", title: "Shared three" },
          { url: "https://both.example/path", title: "Both" },
        ],
      },
      {
        observationKey: "obs-comp-two",
        providerKey: "provider-b",
        modelKey: "model-b",
        promptKey: "prompt-a",
        promptFingerprint: promptFingerprint("prompt-a"),
        observedAt: "2026-09-19T11:00:00.000Z",
        evidenceFingerprint: fp(4),
        answerState: "answered",
        answerText: "Second competitor answer",
        brandMentions: [{ brandKey: "comp-two", matchedText: "Competitor Two" }],
        citations: [{ url: "https://c.example/path", title: "C" }],
      },
      {
        observationKey: "obs-refused",
        providerKey: "provider-a",
        modelKey: "model-a",
        promptKey: "prompt-c",
        promptFingerprint: promptFingerprint("prompt-c"),
        observedAt: "2026-09-19T11:30:00.000Z",
        evidenceFingerprint: fp(5),
        answerState: "refused",
        answerText: null,
        brandMentions: [],
        citations: [],
      },
    ],
  };

  return {
    collectionInput,
    collection: buildAiAnswerVisibilityCollection(collectionInput),
  };
}

function baseComparisons(): AiCompetitorComparisonInput[] {
  return [{
    comparisonKey: "core-comparison",
    subjectBrandKey: "subject",
    competitorBrandKeys: ["comp-one", "comp-two"],
  }];
}

test("P7.4 derives exact positive mention-evidence overlap and evidence-only differences", () => {
  const fixture = buildFixture();
  const report = buildAiCitationCompetitorComparison({
    ...fixture,
    comparisons: baseComparisons(),
  });
  const group = report.comparisons[0]!;
  const pair = group.pairs.find((candidate) => candidate.competitor.brandKey === "comp-one");
  assert.ok(pair);

  assert.deepEqual(pair.mentionEvidence.subjectObservationKeys, ["obs-both", "obs-subject"]);
  assert.deepEqual(pair.mentionEvidence.competitorObservationKeys, ["obs-both", "obs-comp-one"]);
  assert.deepEqual(pair.mentionEvidence.bothObservationKeys, ["obs-both"]);
  assert.deepEqual(pair.mentionEvidence.subjectEvidenceOnlyObservationKeys, ["obs-subject"]);
  assert.deepEqual(pair.mentionEvidence.competitorEvidenceOnlyObservationKeys, ["obs-comp-one"]);
  assert.deepEqual(pair.mentionEvidence.counts, {
    subject: 2,
    competitor: 2,
    both: 1,
    subjectEvidenceOnly: 1,
    competitorEvidenceOnly: 1,
  });
});

test("P7.4 derives citation-domain co-occurrence without claiming citation support", () => {
  const fixture = buildFixture();
  const report = buildAiCitationCompetitorComparison({
    ...fixture,
    comparisons: baseComparisons(),
  });
  const pair = report.comparisons[0]!.pairs.find(
    (candidate) => candidate.competitor.brandKey === "comp-one",
  );
  assert.ok(pair);

  assert.deepEqual(pair.citationDomainCooccurrence.subjectDomains, [
    "a.example",
    "both.example",
    "shared.example",
  ]);
  assert.deepEqual(pair.citationDomainCooccurrence.competitorDomains, [
    "b.example",
    "both.example",
    "shared.example",
  ]);
  assert.deepEqual(pair.citationDomainCooccurrence.sharedDomains, [
    "both.example",
    "shared.example",
  ]);
  assert.deepEqual(pair.citationDomainCooccurrence.subjectSideOnlyDomains, ["a.example"]);
  assert.deepEqual(pair.citationDomainCooccurrence.competitorSideOnlyDomains, ["b.example"]);
  assert.equal(report.semantics.citationDomainCooccurrenceImpliesBrandSupport, false);
  assert.equal(report.semantics.citationDomainCooccurrenceImpliesAssociation, false);
});

test("domain summaries use exact P7.3 citation records and expose descriptive provenance sets", () => {
  const fixture = buildFixture();
  const report = buildAiCitationCompetitorComparison({
    ...fixture,
    comparisons: baseComparisons(),
  });
  const shared = report.domains.find((domain) => domain.domain === "shared.example");
  assert.ok(shared);

  assert.equal(shared.citationCount, 3);
  assert.equal(shared.observationCount, 3);
  assert.deepEqual(shared.observationKeys, ["obs-both", "obs-comp-one", "obs-subject"]);
  assert.deepEqual(shared.providerKeys, ["provider-a", "provider-b"]);
  assert.deepEqual(shared.promptKeys, ["prompt-a", "prompt-b", "prompt-c"]);
  assert.deepEqual(shared.topicKeys, ["root", "topic-a", "topic-b"]);
  assert.equal(shared.citationFingerprints.length, 3);
});

test("comparison and competitor input order do not change canonical identity", () => {
  const fixture = buildFixture();
  const one = buildAiCitationCompetitorComparison({
    ...fixture,
    comparisons: [
      {
        comparisonKey: "second",
        subjectBrandKey: "subject",
        competitorBrandKeys: ["comp-two"],
      },
      {
        comparisonKey: " Core-Comparison ",
        subjectBrandKey: " SUBJECT ",
        competitorBrandKeys: ["comp-two", "comp-one", "comp-two"],
      },
    ],
  });
  const two = buildAiCitationCompetitorComparison({
    ...fixture,
    comparisons: [
      {
        comparisonKey: "core-comparison",
        subjectBrandKey: "subject",
        competitorBrandKeys: ["comp-one", "comp-two"],
      },
      {
        comparisonKey: "second",
        subjectBrandKey: "subject",
        competitorBrandKeys: ["comp-two"],
      },
    ],
  });

  assert.equal(one.reportFingerprint, two.reportFingerprint);
  assert.deepEqual(one, two);
  assert.deepEqual(one.comparisons.map((comparison) => comparison.comparisonKey), [
    "core-comparison",
    "second",
  ]);
});

test("missing positive mention evidence is never interpreted as semantic brand absence", () => {
  const fixture = buildFixture();
  const report = buildAiCitationCompetitorComparison({
    ...fixture,
    comparisons: [{
      comparisonKey: "unused",
      subjectBrandKey: "subject",
      competitorBrandKeys: ["unused"],
    }],
  });
  const pair = report.comparisons[0]!.pairs[0]!;

  assert.deepEqual(pair.mentionEvidence.competitorObservationKeys, []);
  assert.deepEqual(pair.mentionEvidence.subjectEvidenceOnlyObservationKeys, [
    "obs-both",
    "obs-subject",
  ]);
  assert.equal(report.semantics.missingMentionEvidenceImpliesBrandAbsent, false);
  assert.equal(report.semantics.evidenceOnlySetMeansSemanticAbsence, false);
});

test("competitor identity is explicit only and no winner, rank or visibility score is produced", () => {
  const fixture = buildFixture();
  const report = buildAiCitationCompetitorComparison({
    ...fixture,
    comparisons: baseComparisons(),
  });

  assert.equal(report.semantics.competitorGroupsCallerSuppliedOnly, true);
  assert.equal(report.semantics.competitorIdentityInferred, false);
  assert.equal(report.semantics.winnerSelected, false);
  assert.equal(report.semantics.rankingGenerated, false);
  assert.equal(report.semantics.visibilityScored, false);
  assert.equal(report.semantics.comparisonImpliesPreference, false);
  assert.equal(report.semantics.comparisonImpliesMarketShare, false);
});

test("known brand validation, self-comparison and duplicate comparison keys fail closed", () => {
  const fixture = buildFixture();

  assert.throws(
    () => buildAiCitationCompetitorComparison({
      ...fixture,
      comparisons: [{
        comparisonKey: "x",
        subjectBrandKey: "missing",
        competitorBrandKeys: ["comp-one"],
      }],
    }),
    /unknown_ai_competitor_subject_brand/,
  );

  assert.throws(
    () => buildAiCitationCompetitorComparison({
      ...fixture,
      comparisons: [{
        comparisonKey: "x",
        subjectBrandKey: "subject",
        competitorBrandKeys: ["missing"],
      }],
    }),
    /unknown_ai_competitor_brand/,
  );

  assert.throws(
    () => buildAiCitationCompetitorComparison({
      ...fixture,
      comparisons: [{
        comparisonKey: "x",
        subjectBrandKey: "subject",
        competitorBrandKeys: ["subject"],
      }],
    }),
    /ai_competitor_self_comparison/,
  );

  assert.throws(
    () => buildAiCitationCompetitorComparison({
      ...fixture,
      comparisons: [
        {
          comparisonKey: " X ",
          subjectBrandKey: "subject",
          competitorBrandKeys: ["comp-one"],
        },
        {
          comparisonKey: "x",
          subjectBrandKey: "subject",
          competitorBrandKeys: ["comp-two"],
        },
      ],
    }),
    /duplicate_ai_competitor_comparison_key/,
  );
});

test("P7.4 rejects tampered P7.3 collection reports", () => {
  const fixture = buildFixture();
  const tampered = {
    ...fixture.collection,
    counts: {
      ...fixture.collection.counts,
      citations: fixture.collection.counts.citations + 1,
    },
  };

  assert.throws(
    () => buildAiCitationCompetitorComparison({
      collectionInput: fixture.collectionInput,
      collection: tampered,
      comparisons: baseComparisons(),
    }),
    /p73_collection_integrity_mismatch/,
  );
});

test("comparison-group and competitor bounds fail closed", () => {
  const fixture = buildFixture();
  const valid: AiCompetitorComparisonInput = {
    comparisonKey: "x",
    subjectBrandKey: "subject",
    competitorBrandKeys: ["comp-one"],
  };

  assert.throws(
    () => buildAiCitationCompetitorComparison({
      ...fixture,
      comparisons: Array.from(
        { length: P7_4_MAX_COMPARISON_GROUPS + 1 },
        (_, index) => ({ ...valid, comparisonKey: `comparison-${index}` }),
      ),
    }),
    /ai_competitor_comparison_limit_exceeded/,
  );

  assert.throws(
    () => buildAiCitationCompetitorComparison({
      ...fixture,
      comparisons: [{
        comparisonKey: "x",
        subjectBrandKey: "subject",
        competitorBrandKeys: Array.from(
          { length: P7_4_MAX_COMPETITORS_PER_GROUP + 1 },
          (_, index) => `competitor-${index}`,
        ),
      }],
    }),
    /ai_competitor_brand_limit_exceeded/,
  );
});

test("P7.4 report counts are descriptive only", () => {
  const fixture = buildFixture();
  const report = buildAiCitationCompetitorComparison({
    ...fixture,
    comparisons: baseComparisons(),
  });

  assert.deepEqual(report.counts, {
    domains: 5,
    comparisonGroups: 1,
    comparisonPairs: 2,
  });
  assert.equal(report.semantics.mentionCountImpliesVisibility, false);
  assert.equal(report.semantics.citationCountImpliesVisibility, false);
  assert.equal(report.semantics.domainCountImpliesVisibility, false);
  assert.equal(report.semantics.crossProviderNormalizedComparisonPerformed, false);
});

test("P7.4 capability keeps network, persistence, scoring, execution and publication closed", () => {
  const capability = aiCitationCompetitorComparisonCapability();
  assert.equal(capability.deterministicComparisonOnly, true);
  assert.equal(capability.liveProviderRequestsAuthorized, false);
  assert.equal(capability.providerCredentialUseAuthorized, false);
  assert.equal(capability.aiModelCallsAuthorized, false);
  assert.equal(capability.citationFetchAuthorized, false);
  assert.equal(capability.answerTextMiningAuthorized, false);
  assert.equal(capability.sourceRegistryAdmissionAuthorized, false);
  assert.equal(capability.comparisonPersistenceAuthorized, false);
  assert.equal(capability.domainPersistenceAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.schemaMutationAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.workerEnabled, false);
  assert.equal(capability.retryLoopEnabled, false);
  assert.equal(capability.scoringAuthorized, false);
  assert.equal(capability.approvalGrantAuthorized, false);
  assert.equal(capability.applyAuthorized, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.automaticTransitionEnabled, false);
  assert.equal(capability.publicationAuthorized, false);
});

test("P7.4 source contains no network, AI, environment, database, persistence, execution or scheduler primitive", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourceText = readFileSync(join(here, "ai-citation-competitor-comparison.ts"), "utf8");
  assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
  assert.doesNotMatch(sourceText, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(sourceText, /\bOpenAI\b|chat\.completions|responses\.create/);
  assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(sourceText, /executeCompetitorPilot|executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(sourceText, /\b(?:insertInto|updateTable|deleteFrom|persistRecord|sql\s*\`|db\.(?:insert|update|delete))\b/);
  assert.doesNotMatch(sourceText, /setTimeout|setInterval|queueMicrotask/);
});
