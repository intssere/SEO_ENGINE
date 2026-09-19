import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  P7_2_MAX_LABEL_LENGTH,
  P7_2_MAX_PROMPTS,
  P7_2_MAX_PROMPTS_PER_SET,
  P7_2_MAX_PROMPT_SETS,
  P7_2_MAX_PROMPT_TEXT_LENGTH,
  P7_2_MAX_TOPICS,
  P7_2_MAX_TOPICS_PER_PROMPT,
  aiPromptTopicModelCapability,
  buildAiPromptTopicModel,
  type AiPromptTopicModelInput,
} from "./ai-prompt-topic-model.js";

const REFERENCE = "2026-09-19T12:00:00.000Z";

function baseInput(): AiPromptTopicModelInput {
  return {
    siteKey: "diamond-shelf",
    referenceTime: REFERENCE,
    topics: [
      { topicKey: "fragrance", label: "Fragrance", parentTopicKey: null },
      { topicKey: "men", label: "Men's Fragrance", parentTopicKey: "fragrance" },
      { topicKey: "women", label: "Women's Fragrance", parentTopicKey: "fragrance" },
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
      {
        promptKey: "best-women",
        text: "What are some well-known women's fragrances?",
        topicKeys: ["fragrance", "women"],
        intentCode: "discovery",
        languageKey: "en-us",
        marketKey: "us",
      },
    ],
    sets: [
      {
        setKey: "core-fragrance",
        label: "Core fragrance prompts",
        promptKeys: ["best-men", "best-women"],
      },
    ],
  };
}

test("P7.2 builds deterministic topic, prompt and set records with derived topic coverage", () => {
  const report = buildAiPromptTopicModel(baseInput());

  assert.deepEqual(report.counts, {
    topics: 3,
    rootTopics: 1,
    prompts: 2,
    promptSets: 1,
    promptTopicReferences: 4,
    setPromptReferences: 2,
    setTopicCoverageReferences: 3,
  });
  assert.deepEqual(report.topics.map((topic) => topic.topicKey), [
    "fragrance",
    "men",
    "women",
  ]);
  assert.deepEqual(report.prompts.map((prompt) => prompt.promptKey), [
    "best-men",
    "best-women",
  ]);
  assert.deepEqual(report.sets[0]?.topicKeys, ["fragrance", "men", "women"]);
});

test("input order and repeated references do not change canonical identity", () => {
  const one = baseInput();
  const two = baseInput();
  two.siteKey = " DIAMOND-SHELF ";
  two.topics = [...two.topics].reverse();
  two.prompts = [
    {
      ...two.prompts[1]!,
      topicKeys: ["women", "fragrance", "women"],
    },
    {
      ...two.prompts[0]!,
      topicKeys: ["men", "fragrance", "men"],
    },
  ];
  two.sets = [{
    ...two.sets[0]!,
    promptKeys: ["best-women", "best-men", "best-women"],
  }];

  const first = buildAiPromptTopicModel(one);
  const second = buildAiPromptTopicModel(two);

  assert.equal(first.reportFingerprint, second.reportFingerprint);
  assert.deepEqual(first, second);
});

test("labels and prompt text are preserved exactly while keys/codes normalize", () => {
  const input = baseInput();
  input.topics[0] = {
    topicKey: " Fragrance ",
    label: "  Fragrance Label  ",
    parentTopicKey: null,
  };
  input.prompts[0] = {
    promptKey: " BEST-MEN ",
    text: "  What are some well-known men's fragrances?  ",
    topicKeys: [" FRAGRANCE ", " MEN "],
    intentCode: " DISCOVERY ",
    languageKey: " EN-US ",
    marketKey: " US ",
  };

  const report = buildAiPromptTopicModel(input);
  const topic = report.topics.find((item) => item.topicKey === "fragrance");
  const prompt = report.prompts.find((item) => item.promptKey === "best-men");
  assert.ok(topic);
  assert.ok(prompt);
  assert.equal(topic.label, "  Fragrance Label  ");
  assert.equal(prompt.text, "  What are some well-known men's fragrances?  ");
  assert.equal(prompt.intentCode, "discovery");
  assert.equal(prompt.languageKey, "en-us");
  assert.equal(prompt.marketKey, "us");
});

test("topic parent must exist, cannot self-parent and graph must be acyclic", () => {
  const unknown = baseInput();
  unknown.topics[1] = { ...unknown.topics[1]!, parentTopicKey: "missing" };
  assert.throws(() => buildAiPromptTopicModel(unknown), /unknown_ai_parent_topic/);

  const self = baseInput();
  self.topics[1] = { ...self.topics[1]!, parentTopicKey: "men" };
  assert.throws(() => buildAiPromptTopicModel(self), /ai_topic_self_parent/);

  const cycle = baseInput();
  cycle.topics = [
    { topicKey: "a", label: "A", parentTopicKey: "b" },
    { topicKey: "b", label: "B", parentTopicKey: "a" },
  ];
  cycle.prompts = [{
    promptKey: "p",
    text: "Prompt",
    topicKeys: ["a"],
    intentCode: null,
    languageKey: null,
    marketKey: null,
  }];
  cycle.sets = [{ setKey: "s", label: "Set", promptKeys: ["p"] }];
  assert.throws(() => buildAiPromptTopicModel(cycle), /ai_topic_cycle/);
});

test("prompt topics and set prompts must reference existing exact definitions", () => {
  const badTopic = baseInput();
  badTopic.prompts[0] = { ...badTopic.prompts[0]!, topicKeys: ["missing"] };
  assert.throws(() => buildAiPromptTopicModel(badTopic), /unknown_ai_prompt_topic/);

  const badPrompt = baseInput();
  badPrompt.sets[0] = { ...badPrompt.sets[0]!, promptKeys: ["missing"] };
  assert.throws(() => buildAiPromptTopicModel(badPrompt), /unknown_ai_prompt_set_prompt/);
});

test("duplicate normalized topic, prompt and set keys fail closed", () => {
  const duplicateTopic = baseInput();
  duplicateTopic.topics.push({ topicKey: " FRAGRANCE ", label: "Other", parentTopicKey: null });
  assert.throws(() => buildAiPromptTopicModel(duplicateTopic), /duplicate_ai_topic_key/);

  const duplicatePrompt = baseInput();
  duplicatePrompt.prompts.push({ ...duplicatePrompt.prompts[0]!, promptKey: " BEST-MEN " });
  assert.throws(() => buildAiPromptTopicModel(duplicatePrompt), /duplicate_ai_prompt_key/);

  const duplicateSet = baseInput();
  duplicateSet.sets.push({ ...duplicateSet.sets[0]!, setKey: " CORE-FRAGRANCE " });
  assert.throws(() => buildAiPromptTopicModel(duplicateSet), /duplicate_ai_prompt_set_key/);
});

test("required topic, prompt, set and reference collections fail closed when empty", () => {
  const noTopics = baseInput();
  noTopics.topics = [];
  assert.throws(() => buildAiPromptTopicModel(noTopics), /invalid_ai_topics/);

  const noPrompts = baseInput();
  noPrompts.prompts = [];
  assert.throws(() => buildAiPromptTopicModel(noPrompts), /invalid_ai_prompts/);

  const noSets = baseInput();
  noSets.sets = [];
  assert.throws(() => buildAiPromptTopicModel(noSets), /invalid_ai_prompt_sets/);

  const noPromptTopics = baseInput();
  noPromptTopics.prompts[0] = { ...noPromptTopics.prompts[0]!, topicKeys: [] };
  assert.throws(() => buildAiPromptTopicModel(noPromptTopics), /invalid_ai_prompt_topics/);

  const noSetPrompts = baseInput();
  noSetPrompts.sets[0] = { ...noSetPrompts.sets[0]!, promptKeys: [] };
  assert.throws(() => buildAiPromptTopicModel(noSetPrompts), /invalid_ai_prompt_set_prompts/);
});

test("P7.2 does not infer demand, priority, visibility, citation, ranking or recommendation", () => {
  const report = buildAiPromptTopicModel(baseInput());
  assert.equal(report.semantics.promptMembershipImpliesDemand, false);
  assert.equal(report.semantics.promptMembershipImpliesPopularity, false);
  assert.equal(report.semantics.promptMembershipImpliesSearchVolume, false);
  assert.equal(report.semantics.promptSetMembershipImpliesPriority, false);
  assert.equal(report.semantics.topicCoverageImpliesAiVisibility, false);
  assert.equal(report.semantics.promptCoverageImpliesAnswerInclusion, false);
  assert.equal(report.semantics.promptCoverageImpliesCitation, false);
  assert.equal(report.semantics.promptCoverageImpliesRanking, false);
  assert.equal(report.semantics.promptCoverageImpliesRecommendation, false);
  assert.equal(report.semantics.intentInferred, false);
});

test("P7.2 performs no prompt generation, expansion, rewriting, embedding or answer collection", () => {
  const report = buildAiPromptTopicModel(baseInput());
  assert.equal(report.semantics.promptGenerated, false);
  assert.equal(report.semantics.promptExpanded, false);
  assert.equal(report.semantics.promptRewritten, false);
  assert.equal(report.semantics.embeddingGenerated, false);
  assert.equal(report.semantics.answerCollectionPerformed, false);
  assert.equal(report.semantics.visibilityScored, false);
  assert.equal(report.semantics.opportunityGenerated, false);
});

test("count and string bounds fail closed", () => {
  const base = baseInput();

  assert.throws(
    () => buildAiPromptTopicModel({
      ...base,
      topics: Array.from({ length: P7_2_MAX_TOPICS + 1 }, (_, index) => ({
        topicKey: `topic-${index}`,
        label: `Topic ${index}`,
        parentTopicKey: null,
      })),
    }),
    /ai_topic_limit_exceeded/,
  );

  assert.throws(
    () => buildAiPromptTopicModel({
      ...base,
      prompts: Array.from({ length: P7_2_MAX_PROMPTS + 1 }, (_, index) => ({
        promptKey: `prompt-${index}`,
        text: `Prompt ${index}`,
        topicKeys: ["fragrance"],
        intentCode: null,
        languageKey: null,
        marketKey: null,
      })),
    }),
    /ai_prompt_limit_exceeded/,
  );

  assert.throws(
    () => buildAiPromptTopicModel({
      ...base,
      sets: Array.from({ length: P7_2_MAX_PROMPT_SETS + 1 }, (_, index) => ({
        setKey: `set-${index}`,
        label: `Set ${index}`,
        promptKeys: ["best-men"],
      })),
    }),
    /ai_prompt_set_limit_exceeded/,
  );

  const tooManyTopics = baseInput();
  tooManyTopics.topics = Array.from({ length: P7_2_MAX_TOPICS_PER_PROMPT + 1 }, (_, index) => ({
    topicKey: `topic-${index}`,
    label: `Topic ${index}`,
    parentTopicKey: null,
  }));
  tooManyTopics.prompts[0] = {
    ...tooManyTopics.prompts[0]!,
    topicKeys: tooManyTopics.topics.map((topic) => topic.topicKey),
  };
  assert.throws(() => buildAiPromptTopicModel(tooManyTopics), /ai_prompt_topic_limit_exceeded/);

  const tooManySetPrompts = baseInput();
  tooManySetPrompts.prompts = Array.from({ length: P7_2_MAX_PROMPTS_PER_SET + 1 }, (_, index) => ({
    promptKey: `prompt-${index}`,
    text: `Prompt ${index}`,
    topicKeys: ["fragrance"],
    intentCode: null,
    languageKey: null,
    marketKey: null,
  }));
  tooManySetPrompts.sets[0] = {
    ...tooManySetPrompts.sets[0]!,
    promptKeys: tooManySetPrompts.prompts.map((prompt) => prompt.promptKey),
  };
  assert.throws(
    () => buildAiPromptTopicModel(tooManySetPrompts),
    /ai_prompt_set_prompt_limit_exceeded/,
  );

  const longLabel = baseInput();
  longLabel.topics[0] = { ...longLabel.topics[0]!, label: "x".repeat(P7_2_MAX_LABEL_LENGTH + 1) };
  assert.throws(() => buildAiPromptTopicModel(longLabel), /invalid_ai_topic_label/);

  const longPrompt = baseInput();
  longPrompt.prompts[0] = {
    ...longPrompt.prompts[0]!,
    text: "x".repeat(P7_2_MAX_PROMPT_TEXT_LENGTH + 1),
  };
  assert.throws(() => buildAiPromptTopicModel(longPrompt), /invalid_ai_prompt_text/);
});

test("reference time must be canonical", () => {
  const input = baseInput();
  input.referenceTime = "2026-09-19T12:00:00Z";
  assert.throws(() => buildAiPromptTopicModel(input), /invalid_ai_prompt_topic_reference_time/);
});

test("P7.2 capability keeps provider, AI, persistence, execution and publication closed", () => {
  const capability = aiPromptTopicModelCapability();
  assert.equal(capability.deterministicModelOnly, true);
  assert.equal(capability.providerRequestsAuthorized, false);
  assert.equal(capability.providerCredentialUseAuthorized, false);
  assert.equal(capability.aiModelCallsAuthorized, false);
  assert.equal(capability.embeddingCallsAuthorized, false);
  assert.equal(capability.sourceRegistryAdmissionAuthorized, false);
  assert.equal(capability.promptPersistenceAuthorized, false);
  assert.equal(capability.topicPersistenceAuthorized, false);
  assert.equal(capability.answerCollectionAuthorized, false);
  assert.equal(capability.citationCollectionAuthorized, false);
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

test("P7.2 source contains no network, AI, environment, database, persistence, execution or scheduler primitive", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourceText = readFileSync(join(here, "ai-prompt-topic-model.ts"), "utf8");
  assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
  assert.doesNotMatch(sourceText, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(sourceText, /\bOpenAI\b|chat\.completions|responses\.create/);
  assert.doesNotMatch(sourceText, /embeddings\.create|embedMany|embedQuery/);
  assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(sourceText, /executeCompetitorPilot|executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(sourceText, /\b(?:insertInto|updateTable|deleteFrom|persistRecord|sql\s*\`|db\.(?:insert|update|delete))\b/);
  assert.doesNotMatch(sourceText, /setTimeout|setInterval|queueMicrotask/);
});
