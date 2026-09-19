import { createHash } from "node:crypto";
import {
  P7_2_AI_PROMPT_TOPIC_MODEL_VERSION,
  buildAiPromptTopicModel,
  type AiPromptTopicModelInput,
  type AiPromptTopicModelReport,
} from "./ai-prompt-topic-model.js";

export const P7_3_AI_ANSWER_VISIBILITY_COLLECTION_VERSION =
  "p7.3-ai-answer-visibility-collection-v1" as const;

export const P7_3_MAX_PROVIDERS = 32 as const;
export const P7_3_MAX_MODELS_PER_PROVIDER = 32 as const;
export const P7_3_MAX_BRANDS = 128 as const;
export const P7_3_MAX_OBSERVATIONS = 512 as const;
export const P7_3_MAX_MENTIONS_PER_OBSERVATION = 64 as const;
export const P7_3_MAX_CITATIONS_PER_OBSERVATION = 64 as const;
export const P7_3_MAX_LABEL_LENGTH = 256 as const;
export const P7_3_MAX_ANSWER_TEXT_LENGTH = 32768 as const;
export const P7_3_MAX_MATCHED_TEXT_LENGTH = 1024 as const;
export const P7_3_MAX_CITATION_TITLE_LENGTH = 1024 as const;
export const P7_3_MAX_CITATION_URL_LENGTH = 4096 as const;

export type AiAnswerState = "answered" | "refused" | "unavailable" | "error";

export type AiCollectionModelInput = {
  modelKey: string;
  label: string;
};

export type AiCollectionProviderInput = {
  providerKey: string;
  label: string;
  models: AiCollectionModelInput[];
};

export type AiTrackedBrandInput = {
  brandKey: string;
  label: string;
};

export type AiBrandMentionInput = {
  brandKey: string;
  matchedText: string;
};

export type AiCitationInput = {
  url: string;
  title: string | null;
};

export type AiAnswerObservationInput = {
  observationKey: string;
  providerKey: string;
  modelKey: string;
  promptKey: string;
  promptFingerprint: string;
  observedAt: string;
  evidenceFingerprint: string;
  answerState: AiAnswerState;
  answerText: string | null;
  brandMentions: AiBrandMentionInput[];
  citations: AiCitationInput[];
};

export type AiAnswerVisibilityCollectionInput = {
  promptModelInput: AiPromptTopicModelInput;
  promptModel: AiPromptTopicModelReport;
  collectionReferenceTime: string;
  providers: AiCollectionProviderInput[];
  brands: AiTrackedBrandInput[];
  observations: AiAnswerObservationInput[];
};

export type AiCollectionModelRecord = {
  modelId: string;
  modelFingerprint: string;
  modelKey: string;
  label: string;
};

export type AiCollectionProviderRecord = {
  providerId: string;
  providerFingerprint: string;
  providerKey: string;
  label: string;
  models: AiCollectionModelRecord[];
};

export type AiTrackedBrandRecord = {
  brandId: string;
  brandFingerprint: string;
  brandKey: string;
  label: string;
};

export type AiBrandMentionRecord = {
  mentionId: string;
  mentionFingerprint: string;
  brandKey: string;
  brandFingerprint: string;
  matchedText: string;
};

export type AiCitationRecord = {
  citationId: string;
  citationFingerprint: string;
  url: string;
  domain: string;
  title: string | null;
};

export type AiAnswerObservationRecord = {
  observationId: string;
  observationFingerprint: string;
  observationKey: string;
  providerKey: string;
  providerFingerprint: string;
  modelKey: string;
  modelFingerprint: string;
  promptKey: string;
  promptFingerprint: string;
  topicKeys: string[];
  topicFingerprints: string[];
  observedAt: string;
  evidenceFingerprint: string;
  answerState: AiAnswerState;
  answerText: string | null;
  brandMentions: AiBrandMentionRecord[];
  mentionedBrandKeys: string[];
  citations: AiCitationRecord[];
  citationDomains: string[];
  counts: {
    brandMentions: number;
    distinctBrandsMentioned: number;
    citations: number;
    citationDomains: number;
  };
};

export type AiAnswerVisibilityCollectionReport = {
  version: typeof P7_3_AI_ANSWER_VISIBILITY_COLLECTION_VERSION;
  reportId: string;
  reportFingerprint: string;
  siteKey: string;
  promptModelReferenceTime: string;
  collectionReferenceTime: string;
  promptModelReportFingerprint: string;
  counts: {
    providers: number;
    models: number;
    brands: number;
    observations: number;
    answered: number;
    refused: number;
    unavailable: number;
    error: number;
    brandMentions: number;
    observationsWithBrandMentionEvidence: number;
    citations: number;
    citationDomains: number;
  };
  providers: AiCollectionProviderRecord[];
  brands: AiTrackedBrandRecord[];
  observations: AiAnswerObservationRecord[];
  semantics: ReturnType<typeof aiAnswerVisibilityCollectionSemantics>;
  safety: ReturnType<typeof aiAnswerVisibilityCollectionCapability>;
};

const KEY = /^[a-z0-9][a-z0-9._:-]{0,95}$/;
const HEX_64 = /^[0-9a-f]{64}$/;
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

function validateNullableExactText(
  value: unknown,
  maxLength: number,
  errorCode: string,
): string | null {
  if (value === null) return null;
  return validateExactText(value, maxLength, errorCode);
}

function canonicalTimestamp(value: unknown, errorCode: string): string {
  if (typeof value !== "string") throw new Error(errorCode);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(errorCode);
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) throw new Error(errorCode);
  return canonical;
}

function validateFingerprint(value: unknown, errorCode: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) throw new Error(errorCode);
  return value;
}

function canonicalPromptModel(
  input: AiPromptTopicModelInput,
  supplied: AiPromptTopicModelReport,
): AiPromptTopicModelReport {
  if (!supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
    throw new Error("invalid_p72_prompt_model_report");
  }
  if (supplied.version !== P7_2_AI_PROMPT_TOPIC_MODEL_VERSION) {
    throw new Error("unsupported_p72_prompt_model_version");
  }
  const rebuilt = buildAiPromptTopicModel(input);
  if (canonicalJson(rebuilt) !== canonicalJson(supplied)) {
    throw new Error("p72_prompt_model_integrity_mismatch");
  }
  return rebuilt;
}

function buildProviderRecords(
  input: AiCollectionProviderInput[],
): AiCollectionProviderRecord[] {
  if (!Array.isArray(input) || input.length < 1) throw new Error("invalid_ai_collection_providers");
  if (input.length > P7_3_MAX_PROVIDERS) throw new Error("ai_collection_provider_limit_exceeded");

  const providers = new Map<string, AiCollectionProviderRecord>();
  for (const provider of input) {
    if (!provider || typeof provider !== "object" || Array.isArray(provider)) {
      throw new Error("invalid_ai_collection_provider");
    }
    const providerKey = normalizeKey(provider.providerKey, "invalid_ai_collection_provider_key");
    if (providers.has(providerKey)) throw new Error("duplicate_ai_collection_provider_key");
    const label = validateExactText(
      provider.label,
      P7_3_MAX_LABEL_LENGTH,
      "invalid_ai_collection_provider_label",
    );
    if (!Array.isArray(provider.models) || provider.models.length < 1) {
      throw new Error("invalid_ai_collection_models");
    }
    if (provider.models.length > P7_3_MAX_MODELS_PER_PROVIDER) {
      throw new Error("ai_collection_model_limit_exceeded");
    }

    const models = new Map<string, AiCollectionModelRecord>();
    for (const model of provider.models) {
      if (!model || typeof model !== "object" || Array.isArray(model)) {
        throw new Error("invalid_ai_collection_model");
      }
      const modelKey = normalizeKey(model.modelKey, "invalid_ai_collection_model_key");
      if (models.has(modelKey)) throw new Error("duplicate_ai_collection_model_key");
      const modelLabel = validateExactText(
        model.label,
        P7_3_MAX_LABEL_LENGTH,
        "invalid_ai_collection_model_label",
      );
      const modelIdentity = {
        version: P7_3_AI_ANSWER_VISIBILITY_COLLECTION_VERSION,
        providerKey,
        modelKey,
        label: modelLabel,
      };
      const modelFingerprint = hash(modelIdentity);
      models.set(modelKey, {
        modelId: `p73-model-${modelFingerprint.slice(0, 20)}`,
        modelFingerprint,
        modelKey,
        label: modelLabel,
      });
    }

    const sortedModels = [...models.values()].sort((a, b) => a.modelKey.localeCompare(b.modelKey));
    const providerIdentity = {
      version: P7_3_AI_ANSWER_VISIBILITY_COLLECTION_VERSION,
      providerKey,
      label,
      models: sortedModels,
    };
    const providerFingerprint = hash(providerIdentity);
    providers.set(providerKey, {
      providerId: `p73-provider-${providerFingerprint.slice(0, 20)}`,
      providerFingerprint,
      providerKey,
      label,
      models: sortedModels,
    });
  }

  return [...providers.values()].sort((a, b) => a.providerKey.localeCompare(b.providerKey));
}

function buildBrandRecords(input: AiTrackedBrandInput[]): AiTrackedBrandRecord[] {
  if (!Array.isArray(input) || input.length < 1) throw new Error("invalid_ai_tracked_brands");
  if (input.length > P7_3_MAX_BRANDS) throw new Error("ai_tracked_brand_limit_exceeded");

  const brands = new Map<string, AiTrackedBrandRecord>();
  for (const brand of input) {
    if (!brand || typeof brand !== "object" || Array.isArray(brand)) {
      throw new Error("invalid_ai_tracked_brand");
    }
    const brandKey = normalizeKey(brand.brandKey, "invalid_ai_tracked_brand_key");
    if (brands.has(brandKey)) throw new Error("duplicate_ai_tracked_brand_key");
    const label = validateExactText(
      brand.label,
      P7_3_MAX_LABEL_LENGTH,
      "invalid_ai_tracked_brand_label",
    );
    const identity = {
      version: P7_3_AI_ANSWER_VISIBILITY_COLLECTION_VERSION,
      brandKey,
      label,
    };
    const brandFingerprint = hash(identity);
    brands.set(brandKey, {
      brandId: `p73-brand-${brandFingerprint.slice(0, 20)}`,
      brandFingerprint,
      brandKey,
      label,
    });
  }

  return [...brands.values()].sort((a, b) => a.brandKey.localeCompare(b.brandKey));
}

function normalizeCitationUrl(value: unknown): { url: string; domain: string } {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > P7_3_MAX_CITATION_URL_LENGTH ||
    INVALID_TEXT_CONTROL.test(value)
  ) {
    throw new Error("invalid_ai_citation_url");
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("invalid_ai_citation_url");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("invalid_ai_citation_url_protocol");
  }
  if (parsed.username || parsed.password) throw new Error("ai_citation_url_credentials_not_allowed");
  parsed.hash = "";
  return {
    url: parsed.toString(),
    domain: parsed.hostname.toLowerCase(),
  };
}

function buildMentions(
  input: AiBrandMentionInput[],
  brandsByKey: Map<string, AiTrackedBrandRecord>,
): AiBrandMentionRecord[] {
  if (!Array.isArray(input)) throw new Error("invalid_ai_brand_mentions");
  if (input.length > P7_3_MAX_MENTIONS_PER_OBSERVATION) {
    throw new Error("ai_brand_mention_limit_exceeded");
  }

  const mentions = new Map<string, AiBrandMentionRecord>();
  for (const mention of input) {
    if (!mention || typeof mention !== "object" || Array.isArray(mention)) {
      throw new Error("invalid_ai_brand_mention");
    }
    const brandKey = normalizeKey(mention.brandKey, "invalid_ai_brand_mention_brand_key");
    const brand = brandsByKey.get(brandKey);
    if (!brand) throw new Error("unknown_ai_brand_mention_brand");
    const matchedText = validateExactText(
      mention.matchedText,
      P7_3_MAX_MATCHED_TEXT_LENGTH,
      "invalid_ai_brand_mention_text",
    );
    const identity = {
      version: P7_3_AI_ANSWER_VISIBILITY_COLLECTION_VERSION,
      brandKey,
      brandFingerprint: brand.brandFingerprint,
      matchedText,
    };
    const mentionFingerprint = hash(identity);
    if (!mentions.has(mentionFingerprint)) {
      mentions.set(mentionFingerprint, {
        mentionId: `p73-mention-${mentionFingerprint.slice(0, 20)}`,
        mentionFingerprint,
        brandKey,
        brandFingerprint: brand.brandFingerprint,
        matchedText,
      });
    }
  }

  return [...mentions.values()].sort(
    (a, b) => a.brandKey.localeCompare(b.brandKey) || a.matchedText.localeCompare(b.matchedText),
  );
}

function buildCitations(input: AiCitationInput[]): AiCitationRecord[] {
  if (!Array.isArray(input)) throw new Error("invalid_ai_citations");
  if (input.length > P7_3_MAX_CITATIONS_PER_OBSERVATION) {
    throw new Error("ai_citation_limit_exceeded");
  }

  const citations = new Map<string, AiCitationRecord>();
  for (const citation of input) {
    if (!citation || typeof citation !== "object" || Array.isArray(citation)) {
      throw new Error("invalid_ai_citation");
    }
    const normalized = normalizeCitationUrl(citation.url);
    const title = validateNullableExactText(
      citation.title,
      P7_3_MAX_CITATION_TITLE_LENGTH,
      "invalid_ai_citation_title",
    );
    const previous = citations.get(normalized.url);
    if (previous) {
      if (previous.title !== title) throw new Error("ai_citation_metadata_conflict");
      continue;
    }
    const identity = {
      version: P7_3_AI_ANSWER_VISIBILITY_COLLECTION_VERSION,
      url: normalized.url,
      domain: normalized.domain,
      title,
    };
    const citationFingerprint = hash(identity);
    citations.set(normalized.url, {
      citationId: `p73-citation-${citationFingerprint.slice(0, 20)}`,
      citationFingerprint,
      url: normalized.url,
      domain: normalized.domain,
      title,
    });
  }

  return [...citations.values()].sort((a, b) => a.url.localeCompare(b.url));
}

function validateAnswerState(value: unknown): AiAnswerState {
  if (
    value !== "answered" &&
    value !== "refused" &&
    value !== "unavailable" &&
    value !== "error"
  ) {
    throw new Error("invalid_ai_answer_state");
  }
  return value;
}

function buildObservationRecords(
  input: AiAnswerObservationInput[],
  promptModel: AiPromptTopicModelReport,
  providers: AiCollectionProviderRecord[],
  brands: AiTrackedBrandRecord[],
  collectionReferenceTime: string,
): AiAnswerObservationRecord[] {
  if (!Array.isArray(input)) throw new Error("invalid_ai_answer_observations");
  if (input.length > P7_3_MAX_OBSERVATIONS) {
    throw new Error("ai_answer_observation_limit_exceeded");
  }

  const promptsByKey = new Map(promptModel.prompts.map((prompt) => [prompt.promptKey, prompt]));
  const providersByKey = new Map(providers.map((provider) => [provider.providerKey, provider]));
  const brandsByKey = new Map(brands.map((brand) => [brand.brandKey, brand]));
  const observationKeys = new Set<string>();

  const records = input.map((observation) => {
    if (!observation || typeof observation !== "object" || Array.isArray(observation)) {
      throw new Error("invalid_ai_answer_observation");
    }
    const observationKey = normalizeKey(
      observation.observationKey,
      "invalid_ai_answer_observation_key",
    );
    if (observationKeys.has(observationKey)) throw new Error("duplicate_ai_answer_observation_key");
    observationKeys.add(observationKey);

    const providerKey = normalizeKey(
      observation.providerKey,
      "invalid_ai_answer_provider_key",
    );
    const provider = providersByKey.get(providerKey);
    if (!provider) throw new Error("unknown_ai_answer_provider");
    const modelKey = normalizeKey(observation.modelKey, "invalid_ai_answer_model_key");
    const model = provider.models.find((candidate) => candidate.modelKey === modelKey);
    if (!model) throw new Error("unknown_ai_answer_model");

    const promptKey = normalizeKey(observation.promptKey, "invalid_ai_answer_prompt_key");
    const prompt = promptsByKey.get(promptKey);
    if (!prompt) throw new Error("unknown_ai_answer_prompt");
    const promptFingerprint = validateFingerprint(
      observation.promptFingerprint,
      "invalid_ai_answer_prompt_fingerprint",
    );
    if (promptFingerprint !== prompt.promptFingerprint) {
      throw new Error("ai_answer_prompt_lineage_mismatch");
    }

    const observedAt = canonicalTimestamp(
      observation.observedAt,
      "invalid_ai_answer_observed_at",
    );
    if (observedAt > collectionReferenceTime) {
      throw new Error("ai_answer_observation_after_collection_reference");
    }
    const evidenceFingerprint = validateFingerprint(
      observation.evidenceFingerprint,
      "invalid_ai_answer_evidence_fingerprint",
    );
    const answerState = validateAnswerState(observation.answerState);

    let answerText: string | null;
    if (answerState === "answered") {
      answerText = validateExactText(
        observation.answerText,
        P7_3_MAX_ANSWER_TEXT_LENGTH,
        "invalid_ai_answer_text",
      );
    } else {
      if (observation.answerText !== null) throw new Error("non_answered_ai_state_has_text");
      answerText = null;
    }

    const brandMentions = buildMentions(observation.brandMentions, brandsByKey);
    const citations = buildCitations(observation.citations);
    if (answerState !== "answered" && (brandMentions.length > 0 || citations.length > 0)) {
      throw new Error("non_answered_ai_state_has_visibility_evidence");
    }

    const mentionedBrandKeys = [...new Set(brandMentions.map((mention) => mention.brandKey))]
      .sort((a, b) => a.localeCompare(b));
    const citationDomains = [...new Set(citations.map((citation) => citation.domain))]
      .sort((a, b) => a.localeCompare(b));
    const counts = {
      brandMentions: brandMentions.length,
      distinctBrandsMentioned: mentionedBrandKeys.length,
      citations: citations.length,
      citationDomains: citationDomains.length,
    };
    const identity = {
      version: P7_3_AI_ANSWER_VISIBILITY_COLLECTION_VERSION,
      observationKey,
      providerKey,
      providerFingerprint: provider.providerFingerprint,
      modelKey,
      modelFingerprint: model.modelFingerprint,
      promptKey,
      promptFingerprint,
      topicKeys: prompt.topicKeys,
      topicFingerprints: prompt.topicFingerprints,
      observedAt,
      evidenceFingerprint,
      answerState,
      answerText,
      brandMentions,
      mentionedBrandKeys,
      citations,
      citationDomains,
      counts,
    };
    const observationFingerprint = hash(identity);

    return {
      observationId: `p73-observation-${observationFingerprint.slice(0, 20)}`,
      observationFingerprint,
      observationKey,
      providerKey,
      providerFingerprint: provider.providerFingerprint,
      modelKey,
      modelFingerprint: model.modelFingerprint,
      promptKey,
      promptFingerprint,
      topicKeys: [...prompt.topicKeys],
      topicFingerprints: [...prompt.topicFingerprints],
      observedAt,
      evidenceFingerprint,
      answerState,
      answerText,
      brandMentions,
      mentionedBrandKeys,
      citations,
      citationDomains,
      counts,
    };
  });

  return records.sort((a, b) => a.observationKey.localeCompare(b.observationKey));
}

export function aiAnswerVisibilityCollectionSemantics() {
  return Object.freeze({
    suppliedObservationsOnly: true,
    exactP72PromptLineageRequired: true,
    providerIdentityOpaque: true,
    providerCapabilityInferred: false,
    providerQualityInferred: false,
    providerPolicyInferred: false,
    answerTextPreservedExactly: true,
    answerGenerated: false,
    answerObservedImpliesCorrectness: false,
    nonAnsweredStateDiagnosesProviderPolicy: false,
    brandMentionsCallerSuppliedOnly: true,
    brandMentionTextMiningPerformed: false,
    brandMentionImpliesRecommendation: false,
    brandMentionImpliesPositiveSentiment: false,
    brandMentionImpliesProminence: false,
    brandMentionImpliesPreference: false,
    missingMentionEvidenceImpliesBrandAbsent: false,
    citationsCallerSuppliedOnly: true,
    citationPresenceImpliesEndorsement: false,
    citationPresenceImpliesAuthority: false,
    citationPresenceImpliesTrust: false,
    citationPresenceImpliesSupport: false,
    citationDomainDescriptiveOnly: true,
    answerCollectionImpliesIndexing: false,
    answerCollectionImpliesCrawlerAccessibility: false,
    crossProviderComparabilityClaimed: false,
    domainCompetitorComparisonPerformed: false,
    visibilityScored: false,
    visibilityHistoryGenerated: false,
    opportunityGenerated: false,
  });
}

export function aiAnswerVisibilityCollectionCapability() {
  return Object.freeze({
    deterministicCollectionNormalizationOnly: true,
    liveProviderRequestsAuthorized: false,
    providerCredentialUseAuthorized: false,
    providerSelectionAuthorized: false,
    aiModelCallsAuthorized: false,
    embeddingCallsAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
    promptPersistenceAuthorized: false,
    answerPersistenceAuthorized: false,
    mentionPersistenceAuthorized: false,
    citationPersistenceAuthorized: false,
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

export function buildAiAnswerVisibilityCollection(
  input: AiAnswerVisibilityCollectionInput,
): AiAnswerVisibilityCollectionReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_ai_answer_collection_input");
  }
  if (
    !input.promptModelInput ||
    typeof input.promptModelInput !== "object" ||
    Array.isArray(input.promptModelInput)
  ) {
    throw new Error("invalid_ai_answer_prompt_model_input");
  }

  const promptModel = canonicalPromptModel(input.promptModelInput, input.promptModel);
  const collectionReferenceTime = canonicalTimestamp(
    input.collectionReferenceTime,
    "invalid_ai_answer_collection_reference_time",
  );
  if (collectionReferenceTime < promptModel.referenceTime) {
    throw new Error("ai_answer_collection_reference_before_prompt_model");
  }

  const providers = buildProviderRecords(input.providers);
  const brands = buildBrandRecords(input.brands);
  const observations = buildObservationRecords(
    input.observations,
    promptModel,
    providers,
    brands,
    collectionReferenceTime,
  );

  const citationDomains = new Set(
    observations.flatMap((observation) => observation.citationDomains),
  );
  const counts = {
    providers: providers.length,
    models: providers.reduce((sum, provider) => sum + provider.models.length, 0),
    brands: brands.length,
    observations: observations.length,
    answered: observations.filter((observation) => observation.answerState === "answered").length,
    refused: observations.filter((observation) => observation.answerState === "refused").length,
    unavailable: observations.filter((observation) => observation.answerState === "unavailable").length,
    error: observations.filter((observation) => observation.answerState === "error").length,
    brandMentions: observations.reduce(
      (sum, observation) => sum + observation.counts.brandMentions,
      0,
    ),
    observationsWithBrandMentionEvidence: observations.filter(
      (observation) => observation.counts.brandMentions > 0,
    ).length,
    citations: observations.reduce((sum, observation) => sum + observation.counts.citations, 0),
    citationDomains: citationDomains.size,
  };
  const semantics = aiAnswerVisibilityCollectionSemantics();
  const identity = {
    version: P7_3_AI_ANSWER_VISIBILITY_COLLECTION_VERSION,
    siteKey: promptModel.siteKey,
    promptModelReferenceTime: promptModel.referenceTime,
    collectionReferenceTime,
    promptModelReportFingerprint: promptModel.reportFingerprint,
    counts,
    providers,
    brands,
    observations,
    semantics,
  };
  const reportFingerprint = hash(identity);

  return {
    version: P7_3_AI_ANSWER_VISIBILITY_COLLECTION_VERSION,
    reportId: `p73-report-${reportFingerprint.slice(0, 20)}`,
    reportFingerprint,
    siteKey: promptModel.siteKey,
    promptModelReferenceTime: promptModel.referenceTime,
    collectionReferenceTime,
    promptModelReportFingerprint: promptModel.reportFingerprint,
    counts,
    providers,
    brands,
    observations,
    semantics,
    safety: aiAnswerVisibilityCollectionCapability(),
  };
}
