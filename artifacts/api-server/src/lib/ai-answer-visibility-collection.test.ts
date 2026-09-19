import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  P7_3_MAX_ANSWER_TEXT_LENGTH,
  P7_3_MAX_BRANDS,
  P7_3_MAX_CITATIONS_PER_OBSERVATION,
  P7_3_MAX_MENTIONS_PER_OBSERVATION,
  P7_3_MAX_MODELS_PER_PROVIDER,
  P7_3_MAX_OBSERVATIONS,
  P7_3_MAX_PROVIDERS,
  aiAnswerVisibilityCollectionCapability,
  buildAiAnswerVisibilityCollection,
  type AiAnswerVisibilityCollectionInput,
} from "./ai-answer-visibility-collection.js";
import {
  buildAiPromptTopicModel,
  type AiPromptTopicModelInput,
} from "./ai-prompt-topic-model.js";

const PROMPT_REFERENCE = "2026-09-19T12:00:00.000Z";
const COLLECTION_REFERENCE = "2026-09-19T13:00:00.000Z";

function fp(value: number): string {
  return value.toString(16).padStart(64, "0");
}

function promptModelInput(): AiPromptTopicModelInput {
  return {
    siteKey: "diamond-shelf",
    referenceTime: PROMPT_REFERENCE,
    topics: [
      { topicKey: "fragrance", label: "Fragrance", parentTopicKey: null },
      { topicKey: "men", label: "Men", parentTopicKey: "fragrance" },
    ],
    prompts: [
      {
        promptKey: "best-men",
        text: "What are some well-known men's fragrances?",
        topicKeys: ["fragrance", "men"],
        intentCode: "discovery",
        languageKey: "en-us",
        marketKey: "us",
      },
    ],
    sets: [
      { setKey: "core", label: "Core prompts", promptKeys: ["best-men"] },
    ],
  };
}

function baseInput(): AiAnswerVisibilityCollectionInput {
  const modelInput = promptModelInput();
  const promptModel = buildAiPromptTopicModel(modelInput);
  const prompt = promptModel.prompts[0]!;
  return {
    promptModelInput: modelInput,
    promptModel,
    collectionReferenceTime: COLLECTION_REFERENCE,
    providers: [
      {
        providerKey: "provider-a",
        label: "Provider A",
        models: [
          { modelKey: "model-a", label: "Model A" },
          { modelKey: "model-b", label: "Model B" },
        ],
      },
    ],
    brands: [
      { brandKey: "diamond-shelf", label: "Diamond Shelf" },
      { brandKey: "brand-x", label: "Brand X" },
    ],
    observations: [
      {
        observationKey: "sample-1",
        providerKey: "provider-a",
        modelKey: "model-a",
        promptKey: prompt.promptKey,
        promptFingerprint: prompt.promptFingerprint,
        observedAt: "2026-09-19T12:30:00.000Z",
        evidenceFingerprint: fp(1),
        answerState: "answered",
        answerText: "Diamond Shelf and Brand X are named here.",
        brandMentions: [
          { brandKey: "diamond-shelf", matchedText: "Diamond Shelf" },
          { brandKey: "brand-x", matchedText: "Brand X" },
        ],
        citations: [
          { url: "HTTPS://Example.com:443/article#section", title: "Example article" },
          { url: "https://docs.example.org/path?q=1", title: null },
        ],
      },
    ],
  };
}

test("P7.3 binds exact P7.2 prompt lineage and normalizes supplied answer visibility evidence", () => {
  const report = buildAiAnswerVisibilityCollection(baseInput());
  const observation = report.observations[0]!;

  assert.equal(report.promptModelReportFingerprint, baseInput().promptModel.reportFingerprint);
  assert.equal(observation.promptKey, "best-men");
  assert.deepEqual(observation.topicKeys, ["fragrance", "men"]);
  assert.equal(observation.answerState, "answered");
  assert.equal(observation.answerText, "Diamond Shelf and Brand X are named here.");
  assert.deepEqual(observation.mentionedBrandKeys, ["brand-x", "diamond-shelf"]);
  assert.deepEqual(observation.citationDomains, ["docs.example.org", "example.com"]);
  assert.equal(observation.citations[0]?.url, "https://docs.example.org/path?q=1");
  assert.equal(observation.citations[1]?.url, "https://example.com/article");
  assert.deepEqual(report.counts, {
    providers: 1,
    models: 2,
    brands: 2,
    observations: 1,
    answered: 1,
    refused: 0,
    unavailable: 0,
    error: 0,
    brandMentions: 2,
    observationsWithBrandMentionEvidence: 1,
    citations: 2,
    citationDomains: 2,
  });
});

test("provider/model/brand/observation input order does not change canonical identity", () => {
  const one = baseInput();
  one.providers.push({
    providerKey: "provider-b",
    label: "Provider B",
    models: [{ modelKey: "model-c", label: "Model C" }],
  });
  one.brands.push({ brandKey: "brand-y", label: "Brand Y" });

  const prompt = one.promptModel.prompts[0]!;
  one.observations.push({
    observationKey: "sample-2",
    providerKey: "provider-b",
    modelKey: "model-c",
    promptKey: prompt.promptKey,
    promptFingerprint: prompt.promptFingerprint,
    observedAt: "2026-09-19T12:40:00.000Z",
    evidenceFingerprint: fp(2),
    answerState: "refused",
    answerText: null,
    brandMentions: [],
    citations: [],
  });

  const two = structuredClone(one);
  two.providers = [...two.providers].reverse().map((provider) => ({
    ...provider,
    models: [...provider.models].reverse(),
  }));
  two.brands = [...two.brands].reverse();
  two.observations = [...two.observations].reverse();

  const first = buildAiAnswerVisibilityCollection(one);
  const second = buildAiAnswerVisibilityCollection(two);
  assert.equal(first.reportFingerprint, second.reportFingerprint);
  assert.deepEqual(first, second);
});

test("answer and matched mention text are preserved exactly", () => {
  const input = baseInput();
  input.observations[0]!.answerText = "  Exact Answer\nSecond line  ";
  input.observations[0]!.brandMentions = [
    { brandKey: " DIAMOND-SHELF ", matchedText: "  Diamond Shelf  " },
  ];

  const report = buildAiAnswerVisibilityCollection(input);
  const observation = report.observations[0]!;
  assert.equal(observation.answerText, "  Exact Answer\nSecond line  ");
  assert.equal(observation.brandMentions[0]?.matchedText, "  Diamond Shelf  ");
});

test("answered requires text and non-answered states forbid text, mentions and citations", () => {
  const noText = baseInput();
  noText.observations[0]!.answerText = null;
  assert.throws(
    () => buildAiAnswerVisibilityCollection(noText),
    /invalid_ai_answer_text/,
  );

  for (const state of ["refused", "unavailable", "error"] as const) {
    const hasText = baseInput();
    hasText.observations[0]!.answerState = state;
    assert.throws(
      () => buildAiAnswerVisibilityCollection(hasText),
      /non_answered_ai_state_has_text/,
    );

    const hasEvidence = baseInput();
    hasEvidence.observations[0]!.answerState = state;
    hasEvidence.observations[0]!.answerText = null;
    assert.throws(
      () => buildAiAnswerVisibilityCollection(hasEvidence),
      /non_answered_ai_state_has_visibility_evidence/,
    );
  }
});

test("explicit identical mention/citation records dedupe; conflicting citation metadata fails closed", () => {
  const input = baseInput();
  input.observations[0]!.brandMentions = [
    { brandKey: "diamond-shelf", matchedText: "Diamond Shelf" },
    { brandKey: "diamond-shelf", matchedText: "Diamond Shelf" },
  ];
  input.observations[0]!.citations = [
    { url: "https://example.com/article#one", title: "Article" },
    { url: "https://example.com/article#two", title: "Article" },
  ];

  const report = buildAiAnswerVisibilityCollection(input);
  assert.equal(report.observations[0]?.brandMentions.length, 1);
  assert.equal(report.observations[0]?.citations.length, 1);

  const conflict = baseInput();
  conflict.observations[0]!.citations = [
    { url: "https://example.com/article#one", title: "Article A" },
    { url: "https://example.com/article#two", title: "Article B" },
  ];
  assert.throws(
    () => buildAiAnswerVisibilityCollection(conflict),
    /ai_citation_metadata_conflict/,
  );
});

test("citation normalization is deterministic and rejects non-HTTP credentials/protocols", () => {
  const input = baseInput();
  input.observations[0]!.citations = [
    { url: "HTTP://Example.COM:80/a/../b?x=1#frag", title: null },
  ];
  const report = buildAiAnswerVisibilityCollection(input);
  assert.equal(report.observations[0]?.citations[0]?.url, "http://example.com/b?x=1");
  assert.equal(report.observations[0]?.citations[0]?.domain, "example.com");

  const credential = baseInput();
  credential.observations[0]!.citations = [
    { url: "https://user:pass@example.com/", title: null },
  ];
  assert.throws(
    () => buildAiAnswerVisibilityCollection(credential),
    /ai_citation_url_credentials_not_allowed/,
  );

  const ftp = baseInput();
  ftp.observations[0]!.citations = [{ url: "ftp://example.com/file", title: null }];
  assert.throws(
    () => buildAiAnswerVisibilityCollection(ftp),
    /invalid_ai_citation_url_protocol/,
  );
});

test("unknown provider/model/prompt/brand and mismatched prompt lineage fail closed", () => {
  const unknownProvider = baseInput();
  unknownProvider.observations[0]!.providerKey = "missing";
  assert.throws(() => buildAiAnswerVisibilityCollection(unknownProvider), /unknown_ai_answer_provider/);

  const unknownModel = baseInput();
  unknownModel.observations[0]!.modelKey = "missing";
  assert.throws(() => buildAiAnswerVisibilityCollection(unknownModel), /unknown_ai_answer_model/);

  const unknownPrompt = baseInput();
  unknownPrompt.observations[0]!.promptKey = "missing";
  assert.throws(() => buildAiAnswerVisibilityCollection(unknownPrompt), /unknown_ai_answer_prompt/);

  const wrongFingerprint = baseInput();
  wrongFingerprint.observations[0]!.promptFingerprint = fp(9999);
  assert.throws(
    () => buildAiAnswerVisibilityCollection(wrongFingerprint),
    /ai_answer_prompt_lineage_mismatch/,
  );

  const unknownBrand = baseInput();
  unknownBrand.observations[0]!.brandMentions = [
    { brandKey: "missing", matchedText: "Missing" },
  ];
  assert.throws(
    () => buildAiAnswerVisibilityCollection(unknownBrand),
    /unknown_ai_brand_mention_brand/,
  );
});

test("duplicate normalized provider, model, brand and observation keys fail closed", () => {
  const duplicateProvider = baseInput();
  duplicateProvider.providers.push({
    providerKey: " PROVIDER-A ",
    label: "Other",
    models: [{ modelKey: "x", label: "X" }],
  });
  assert.throws(
    () => buildAiAnswerVisibilityCollection(duplicateProvider),
    /duplicate_ai_collection_provider_key/,
  );

  const duplicateModel = baseInput();
  duplicateModel.providers[0]!.models.push({ modelKey: " MODEL-A ", label: "Other" });
  assert.throws(
    () => buildAiAnswerVisibilityCollection(duplicateModel),
    /duplicate_ai_collection_model_key/,
  );

  const duplicateBrand = baseInput();
  duplicateBrand.brands.push({ brandKey: " BRAND-X ", label: "Other" });
  assert.throws(
    () => buildAiAnswerVisibilityCollection(duplicateBrand),
    /duplicate_ai_tracked_brand_key/,
  );

  const duplicateObservation = baseInput();
  duplicateObservation.observations.push({
    ...structuredClone(duplicateObservation.observations[0]!),
    observationKey: " SAMPLE-1 ",
    evidenceFingerprint: fp(2),
  });
  assert.throws(
    () => buildAiAnswerVisibilityCollection(duplicateObservation),
    /duplicate_ai_answer_observation_key/,
  );
});

test("collection and observation timestamps are canonical and bounded by the collection frame", () => {
  const nonCanonical = baseInput();
  nonCanonical.collectionReferenceTime = "2026-09-19T13:00:00Z";
  assert.throws(
    () => buildAiAnswerVisibilityCollection(nonCanonical),
    /invalid_ai_answer_collection_reference_time/,
  );

  const beforePrompt = baseInput();
  beforePrompt.collectionReferenceTime = "2026-09-19T11:59:59.000Z";
  assert.throws(
    () => buildAiAnswerVisibilityCollection(beforePrompt),
    /ai_answer_collection_reference_before_prompt_model/,
  );

  const futureObservation = baseInput();
  futureObservation.observations[0]!.observedAt = "2026-09-19T13:01:00.000Z";
  assert.throws(
    () => buildAiAnswerVisibilityCollection(futureObservation),
    /ai_answer_observation_after_collection_reference/,
  );
});

test("tampered P7.2 prompt model fails closed", () => {
  const input = baseInput();
  input.promptModel = {
    ...input.promptModel,
    counts: { ...input.promptModel.counts, prompts: input.promptModel.counts.prompts + 1 },
  };
  assert.throws(
    () => buildAiAnswerVisibilityCollection(input),
    /p72_prompt_model_integrity_mismatch/,
  );
});

test("P7.3 records evidence only and makes no correctness, sentiment, endorsement or visibility claims", () => {
  const report = buildAiAnswerVisibilityCollection(baseInput());
  assert.equal(report.semantics.answerObservedImpliesCorrectness, false);
  assert.equal(report.semantics.nonAnsweredStateDiagnosesProviderPolicy, false);
  assert.equal(report.semantics.brandMentionTextMiningPerformed, false);
  assert.equal(report.semantics.brandMentionImpliesRecommendation, false);
  assert.equal(report.semantics.brandMentionImpliesPositiveSentiment, false);
  assert.equal(report.semantics.brandMentionImpliesProminence, false);
  assert.equal(report.semantics.brandMentionImpliesPreference, false);
  assert.equal(report.semantics.missingMentionEvidenceImpliesBrandAbsent, false);
  assert.equal(report.semantics.citationPresenceImpliesEndorsement, false);
  assert.equal(report.semantics.citationPresenceImpliesAuthority, false);
  assert.equal(report.semantics.citationPresenceImpliesTrust, false);
  assert.equal(report.semantics.citationPresenceImpliesSupport, false);
  assert.equal(report.semantics.answerCollectionImpliesIndexing, false);
  assert.equal(report.semantics.answerCollectionImpliesCrawlerAccessibility, false);
  assert.equal(report.semantics.crossProviderComparabilityClaimed, false);
  assert.equal(report.semantics.domainCompetitorComparisonPerformed, false);
  assert.equal(report.semantics.visibilityScored, false);
  assert.equal(report.semantics.visibilityHistoryGenerated, false);
  assert.equal(report.semantics.opportunityGenerated, false);
});

test("bounds fail closed", () => {
  const providerOverflow = baseInput();
  providerOverflow.providers = Array.from({ length: P7_3_MAX_PROVIDERS + 1 }, (_, index) => ({
    providerKey: `provider-${index}`,
    label: `Provider ${index}`,
    models: [{ modelKey: "model", label: "Model" }],
  }));
  assert.throws(
    () => buildAiAnswerVisibilityCollection(providerOverflow),
    /ai_collection_provider_limit_exceeded/,
  );

  const modelOverflow = baseInput();
  modelOverflow.providers[0]!.models = Array.from(
    { length: P7_3_MAX_MODELS_PER_PROVIDER + 1 },
    (_, index) => ({ modelKey: `model-${index}`, label: `Model ${index}` }),
  );
  assert.throws(
    () => buildAiAnswerVisibilityCollection(modelOverflow),
    /ai_collection_model_limit_exceeded/,
  );

  const brandOverflow = baseInput();
  brandOverflow.brands = Array.from({ length: P7_3_MAX_BRANDS + 1 }, (_, index) => ({
    brandKey: `brand-${index}`,
    label: `Brand ${index}`,
  }));
  assert.throws(
    () => buildAiAnswerVisibilityCollection(brandOverflow),
    /ai_tracked_brand_limit_exceeded/,
  );

  const observationOverflow = baseInput();
  const baseObservation = observationOverflow.observations[0]!;
  observationOverflow.observations = Array.from(
    { length: P7_3_MAX_OBSERVATIONS + 1 },
    (_, index) => ({
      ...structuredClone(baseObservation),
      observationKey: `sample-${index}`,
      evidenceFingerprint: fp(10000 + index),
    }),
  );
  assert.throws(
    () => buildAiAnswerVisibilityCollection(observationOverflow),
    /ai_answer_observation_limit_exceeded/,
  );

  const mentionOverflow = baseInput();
  mentionOverflow.observations[0]!.brandMentions = Array.from(
    { length: P7_3_MAX_MENTIONS_PER_OBSERVATION + 1 },
    (_, index) => ({ brandKey: "brand-x", matchedText: `Brand X ${index}` }),
  );
  assert.throws(
    () => buildAiAnswerVisibilityCollection(mentionOverflow),
    /ai_brand_mention_limit_exceeded/,
  );

  const citationOverflow = baseInput();
  citationOverflow.observations[0]!.citations = Array.from(
    { length: P7_3_MAX_CITATIONS_PER_OBSERVATION + 1 },
    (_, index) => ({ url: `https://example.com/${index}`, title: null }),
  );
  assert.throws(
    () => buildAiAnswerVisibilityCollection(citationOverflow),
    /ai_citation_limit_exceeded/,
  );

  const textOverflow = baseInput();
  textOverflow.observations[0]!.answerText = "x".repeat(P7_3_MAX_ANSWER_TEXT_LENGTH + 1);
  assert.throws(
    () => buildAiAnswerVisibilityCollection(textOverflow),
    /invalid_ai_answer_text/,
  );
});

test("P7.3 capability keeps provider calls, persistence, execution and publication closed", () => {
  const capability = aiAnswerVisibilityCollectionCapability();
  assert.equal(capability.deterministicCollectionNormalizationOnly, true);
  assert.equal(capability.liveProviderRequestsAuthorized, false);
  assert.equal(capability.providerCredentialUseAuthorized, false);
  assert.equal(capability.providerSelectionAuthorized, false);
  assert.equal(capability.aiModelCallsAuthorized, false);
  assert.equal(capability.embeddingCallsAuthorized, false);
  assert.equal(capability.sourceRegistryAdmissionAuthorized, false);
  assert.equal(capability.promptPersistenceAuthorized, false);
  assert.equal(capability.answerPersistenceAuthorized, false);
  assert.equal(capability.mentionPersistenceAuthorized, false);
  assert.equal(capability.citationPersistenceAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.schemaMutationAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.workerEnabled, false);
  assert.equal(capability.retryLoopEnabled, false);
  assert.equal(capability.approvalGrantAuthorized, false);
  assert.equal(capability.applyAuthorized, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.automaticTransitionEnabled, false);
  assert.equal(capability.publicationAuthorized, false);
});

test("P7.3 source contains no network, AI, environment, database, persistence, execution or scheduler primitive", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourceText = readFileSync(join(here, "ai-answer-visibility-collection.ts"), "utf8");
  assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
  assert.doesNotMatch(sourceText, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(sourceText, /\bOpenAI\b|chat\.completions|responses\.create/);
  assert.doesNotMatch(sourceText, /embeddings\.create|embedMany|embedQuery/);
  assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(sourceText, /executeCompetitorPilot|executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(sourceText, /\b(?:insertInto|updateTable|deleteFrom|persistRecord|sql\s*\`|db\.(?:insert|update|delete))\b/);
  assert.doesNotMatch(sourceText, /setTimeout|setInterval|queueMicrotask/);
});
