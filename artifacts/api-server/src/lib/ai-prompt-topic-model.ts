import { createHash } from "node:crypto";

export const P7_2_AI_PROMPT_TOPIC_MODEL_VERSION = "p7.2-ai-prompt-topic-model-v1" as const;
export const P7_2_MAX_TOPICS = 256 as const;
export const P7_2_MAX_PROMPTS = 512 as const;
export const P7_2_MAX_PROMPT_SETS = 128 as const;
export const P7_2_MAX_TOPICS_PER_PROMPT = 32 as const;
export const P7_2_MAX_PROMPTS_PER_SET = 256 as const;
export const P7_2_MAX_LABEL_LENGTH = 256 as const;
export const P7_2_MAX_PROMPT_TEXT_LENGTH = 4096 as const;

export type AiPromptTopicInput = {
  topicKey: string;
  label: string;
  parentTopicKey: string | null;
};

export type AiPromptDefinitionInput = {
  promptKey: string;
  text: string;
  topicKeys: string[];
  intentCode: string | null;
  languageKey: string | null;
  marketKey: string | null;
};

export type AiPromptSetInput = {
  setKey: string;
  label: string;
  promptKeys: string[];
};

export type AiPromptTopicModelInput = {
  siteKey: string;
  referenceTime: string;
  topics: AiPromptTopicInput[];
  prompts: AiPromptDefinitionInput[];
  sets: AiPromptSetInput[];
};

export type AiPromptTopicRecord = {
  topicId: string;
  topicFingerprint: string;
  topicKey: string;
  label: string;
  parentTopicKey: string | null;
};

export type AiPromptDefinitionRecord = {
  promptId: string;
  promptFingerprint: string;
  promptKey: string;
  text: string;
  topicKeys: string[];
  topicFingerprints: string[];
  intentCode: string | null;
  languageKey: string | null;
  marketKey: string | null;
};

export type AiPromptSetRecord = {
  setId: string;
  setFingerprint: string;
  setKey: string;
  label: string;
  promptKeys: string[];
  promptFingerprints: string[];
  topicKeys: string[];
  topicFingerprints: string[];
};

export type AiPromptTopicModelReport = {
  version: typeof P7_2_AI_PROMPT_TOPIC_MODEL_VERSION;
  reportId: string;
  reportFingerprint: string;
  siteKey: string;
  referenceTime: string;
  counts: {
    topics: number;
    rootTopics: number;
    prompts: number;
    promptSets: number;
    promptTopicReferences: number;
    setPromptReferences: number;
    setTopicCoverageReferences: number;
  };
  topics: AiPromptTopicRecord[];
  prompts: AiPromptDefinitionRecord[];
  sets: AiPromptSetRecord[];
  semantics: ReturnType<typeof aiPromptTopicModelSemantics>;
  safety: ReturnType<typeof aiPromptTopicModelCapability>;
};

const KEY = /^[a-z0-9][a-z0-9._:-]{0,95}$/;
const INVALID_TEXT_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

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

function normalizeOptionalKey(value: unknown, errorCode: string): string | null {
  if (value === null) return null;
  return normalizeKey(value, errorCode);
}

function canonicalTimestamp(value: unknown, errorCode: string): string {
  if (typeof value !== "string") throw new Error(errorCode);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(errorCode);
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) throw new Error(errorCode);
  return canonical;
}

function validateExactText(
  value: unknown,
  maxLength: number,
  errorCode: string,
): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maxLength ||
    INVALID_TEXT_CONTROL.test(value)
  ) {
    throw new Error(errorCode);
  }
  return value;
}

function normalizeReferenceKeys(
  input: unknown,
  max: number,
  emptyError: string,
  limitError: string,
  keyError: string,
): string[] {
  if (!Array.isArray(input) || input.length < 1) throw new Error(emptyError);
  if (input.length > max) throw new Error(limitError);
  return [...new Set(input.map((value) => normalizeKey(value, keyError)))]
    .sort((a, b) => a.localeCompare(b));
}

function validateTopicGraph(
  topics: Map<string, { topicKey: string; label: string; parentTopicKey: string | null }>,
): void {
  for (const topic of topics.values()) {
    if (topic.parentTopicKey === null) continue;
    if (topic.parentTopicKey === topic.topicKey) throw new Error("ai_topic_self_parent");
    if (!topics.has(topic.parentTopicKey)) throw new Error("unknown_ai_parent_topic");
  }

  for (const start of topics.keys()) {
    const seen = new Set<string>();
    let cursor: string | null = start;
    while (cursor !== null) {
      if (seen.has(cursor)) throw new Error("ai_topic_cycle");
      seen.add(cursor);
      cursor = topics.get(cursor)?.parentTopicKey ?? null;
    }
  }
}

function buildTopicRecords(input: AiPromptTopicInput[]): AiPromptTopicRecord[] {
  if (!Array.isArray(input) || input.length < 1) throw new Error("invalid_ai_topics");
  if (input.length > P7_2_MAX_TOPICS) throw new Error("ai_topic_limit_exceeded");

  const normalized = new Map<
    string,
    { topicKey: string; label: string; parentTopicKey: string | null }
  >();

  for (const topic of input) {
    if (!topic || typeof topic !== "object" || Array.isArray(topic)) {
      throw new Error("invalid_ai_topic");
    }
    const topicKey = normalizeKey(topic.topicKey, "invalid_ai_topic_key");
    if (normalized.has(topicKey)) throw new Error("duplicate_ai_topic_key");
    normalized.set(topicKey, {
      topicKey,
      label: validateExactText(
        topic.label,
        P7_2_MAX_LABEL_LENGTH,
        "invalid_ai_topic_label",
      ),
      parentTopicKey: normalizeOptionalKey(
        topic.parentTopicKey,
        "invalid_ai_parent_topic_key",
      ),
    });
  }

  validateTopicGraph(normalized);

  return [...normalized.values()]
    .sort((a, b) => a.topicKey.localeCompare(b.topicKey))
    .map((topic) => {
      const identity = {
        version: P7_2_AI_PROMPT_TOPIC_MODEL_VERSION,
        topicKey: topic.topicKey,
        label: topic.label,
        parentTopicKey: topic.parentTopicKey,
      };
      const topicFingerprint = hash(identity);
      return {
        topicId: `p72-topic-${topicFingerprint.slice(0, 20)}`,
        topicFingerprint,
        ...topic,
      };
    });
}

function buildPromptRecords(
  input: AiPromptDefinitionInput[],
  topics: AiPromptTopicRecord[],
): AiPromptDefinitionRecord[] {
  if (!Array.isArray(input) || input.length < 1) throw new Error("invalid_ai_prompts");
  if (input.length > P7_2_MAX_PROMPTS) throw new Error("ai_prompt_limit_exceeded");

  const topicsByKey = new Map(topics.map((topic) => [topic.topicKey, topic]));
  const normalized = new Map<
    string,
    {
      promptKey: string;
      text: string;
      topicKeys: string[];
      intentCode: string | null;
      languageKey: string | null;
      marketKey: string | null;
    }
  >();

  for (const prompt of input) {
    if (!prompt || typeof prompt !== "object" || Array.isArray(prompt)) {
      throw new Error("invalid_ai_prompt");
    }
    const promptKey = normalizeKey(prompt.promptKey, "invalid_ai_prompt_key");
    if (normalized.has(promptKey)) throw new Error("duplicate_ai_prompt_key");
    const topicKeys = normalizeReferenceKeys(
      prompt.topicKeys,
      P7_2_MAX_TOPICS_PER_PROMPT,
      "invalid_ai_prompt_topics",
      "ai_prompt_topic_limit_exceeded",
      "invalid_ai_prompt_topic_key",
    );
    for (const topicKey of topicKeys) {
      if (!topicsByKey.has(topicKey)) throw new Error("unknown_ai_prompt_topic");
    }

    normalized.set(promptKey, {
      promptKey,
      text: validateExactText(
        prompt.text,
        P7_2_MAX_PROMPT_TEXT_LENGTH,
        "invalid_ai_prompt_text",
      ),
      topicKeys,
      intentCode: normalizeOptionalKey(prompt.intentCode, "invalid_ai_prompt_intent_code"),
      languageKey: normalizeOptionalKey(prompt.languageKey, "invalid_ai_prompt_language_key"),
      marketKey: normalizeOptionalKey(prompt.marketKey, "invalid_ai_prompt_market_key"),
    });
  }

  return [...normalized.values()]
    .sort((a, b) => a.promptKey.localeCompare(b.promptKey))
    .map((prompt) => {
      const topicFingerprints = prompt.topicKeys.map(
        (topicKey) => topicsByKey.get(topicKey)!.topicFingerprint,
      );
      const identity = {
        version: P7_2_AI_PROMPT_TOPIC_MODEL_VERSION,
        ...prompt,
        topicFingerprints,
      };
      const promptFingerprint = hash(identity);
      return {
        promptId: `p72-prompt-${promptFingerprint.slice(0, 20)}`,
        promptFingerprint,
        ...prompt,
        topicFingerprints,
      };
    });
}

function buildSetRecords(
  input: AiPromptSetInput[],
  prompts: AiPromptDefinitionRecord[],
  topics: AiPromptTopicRecord[],
): AiPromptSetRecord[] {
  if (!Array.isArray(input) || input.length < 1) throw new Error("invalid_ai_prompt_sets");
  if (input.length > P7_2_MAX_PROMPT_SETS) throw new Error("ai_prompt_set_limit_exceeded");

  const promptsByKey = new Map(prompts.map((prompt) => [prompt.promptKey, prompt]));
  const topicsByKey = new Map(topics.map((topic) => [topic.topicKey, topic]));
  const normalized = new Map<string, { setKey: string; label: string; promptKeys: string[] }>();

  for (const set of input) {
    if (!set || typeof set !== "object" || Array.isArray(set)) {
      throw new Error("invalid_ai_prompt_set");
    }
    const setKey = normalizeKey(set.setKey, "invalid_ai_prompt_set_key");
    if (normalized.has(setKey)) throw new Error("duplicate_ai_prompt_set_key");
    const promptKeys = normalizeReferenceKeys(
      set.promptKeys,
      P7_2_MAX_PROMPTS_PER_SET,
      "invalid_ai_prompt_set_prompts",
      "ai_prompt_set_prompt_limit_exceeded",
      "invalid_ai_prompt_set_prompt_key",
    );
    for (const promptKey of promptKeys) {
      if (!promptsByKey.has(promptKey)) throw new Error("unknown_ai_prompt_set_prompt");
    }
    normalized.set(setKey, {
      setKey,
      label: validateExactText(
        set.label,
        P7_2_MAX_LABEL_LENGTH,
        "invalid_ai_prompt_set_label",
      ),
      promptKeys,
    });
  }

  return [...normalized.values()]
    .sort((a, b) => a.setKey.localeCompare(b.setKey))
    .map((set) => {
      const promptFingerprints = set.promptKeys.map(
        (promptKey) => promptsByKey.get(promptKey)!.promptFingerprint,
      );
      const topicKeys = [...new Set(
        set.promptKeys.flatMap((promptKey) => promptsByKey.get(promptKey)!.topicKeys),
      )].sort((a, b) => a.localeCompare(b));
      const topicFingerprints = topicKeys.map(
        (topicKey) => topicsByKey.get(topicKey)!.topicFingerprint,
      );
      const identity = {
        version: P7_2_AI_PROMPT_TOPIC_MODEL_VERSION,
        setKey: set.setKey,
        label: set.label,
        promptKeys: set.promptKeys,
        promptFingerprints,
        topicKeys,
        topicFingerprints,
      };
      const setFingerprint = hash(identity);
      return {
        setId: `p72-set-${setFingerprint.slice(0, 20)}`,
        setFingerprint,
        setKey: set.setKey,
        label: set.label,
        promptKeys: set.promptKeys,
        promptFingerprints,
        topicKeys,
        topicFingerprints,
      };
    });
}

export function aiPromptTopicModelSemantics() {
  return Object.freeze({
    suppliedDefinitionsOnly: true,
    topicHierarchyExplicitOnly: true,
    topicSimilarityInferred: false,
    promptTextPreservedExactly: true,
    promptGenerated: false,
    promptExpanded: false,
    promptRewritten: false,
    embeddingGenerated: false,
    intentCodeCallerOwned: true,
    intentInferred: false,
    languageKeyCallerOwned: true,
    marketKeyCallerOwned: true,
    promptMembershipImpliesDemand: false,
    promptMembershipImpliesPopularity: false,
    promptMembershipImpliesSearchVolume: false,
    promptSetMembershipImpliesPriority: false,
    topicCoverageImpliesAiVisibility: false,
    promptCoverageImpliesAnswerInclusion: false,
    promptCoverageImpliesCitation: false,
    promptCoverageImpliesRanking: false,
    promptCoverageImpliesRecommendation: false,
    answerCollectionPerformed: false,
    visibilityScored: false,
    opportunityGenerated: false,
  });
}

export function aiPromptTopicModelCapability() {
  return Object.freeze({
    deterministicModelOnly: true,
    providerRequestsAuthorized: false,
    providerCredentialUseAuthorized: false,
    aiModelCallsAuthorized: false,
    embeddingCallsAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
    promptPersistenceAuthorized: false,
    topicPersistenceAuthorized: false,
    answerCollectionAuthorized: false,
    citationCollectionAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    schemaMutationAuthorized: false,
    schedulerEnabled: false,
    workerEnabled: false,
    retryLoopEnabled: false,
    approvalGrantAuthorized: false,
    applyAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticTransitionEnabled: false,
    publicationAuthorized: false,
  });
}

export function buildAiPromptTopicModel(
  input: AiPromptTopicModelInput,
): AiPromptTopicModelReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_ai_prompt_topic_model_input");
  }

  const siteKey = normalizeKey(input.siteKey, "invalid_ai_prompt_topic_site_key");
  const referenceTime = canonicalTimestamp(
    input.referenceTime,
    "invalid_ai_prompt_topic_reference_time",
  );
  const topics = buildTopicRecords(input.topics);
  const prompts = buildPromptRecords(input.prompts, topics);
  const sets = buildSetRecords(input.sets, prompts, topics);

  const counts = {
    topics: topics.length,
    rootTopics: topics.filter((topic) => topic.parentTopicKey === null).length,
    prompts: prompts.length,
    promptSets: sets.length,
    promptTopicReferences: prompts.reduce((sum, prompt) => sum + prompt.topicKeys.length, 0),
    setPromptReferences: sets.reduce((sum, set) => sum + set.promptKeys.length, 0),
    setTopicCoverageReferences: sets.reduce((sum, set) => sum + set.topicKeys.length, 0),
  };
  const semantics = aiPromptTopicModelSemantics();
  const identity = {
    version: P7_2_AI_PROMPT_TOPIC_MODEL_VERSION,
    siteKey,
    referenceTime,
    counts,
    topics,
    prompts,
    sets,
    semantics,
  };
  const reportFingerprint = hash(identity);

  return {
    version: P7_2_AI_PROMPT_TOPIC_MODEL_VERSION,
    reportId: `p72-report-${reportFingerprint.slice(0, 20)}`,
    reportFingerprint,
    siteKey,
    referenceTime,
    counts,
    topics,
    prompts,
    sets,
    semantics,
    safety: aiPromptTopicModelCapability(),
  };
}
