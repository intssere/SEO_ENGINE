import {
  stableEvidenceHash,
} from "./keyword-serp-evidence-contract.js";
import {
  UGP_SEMANTIC_SIMILARITY_ADAPTER_VERSION,
  type SemanticDocument,
  type SemanticEmbeddingBatch,
  type SemanticEmbeddingEncoder,
} from "./semantic-similarity-adapter.js";

export const UGP_OPENAI_EMBEDDING_TRANSPORT_VERSION =
  "ugp-6-2c-openai-embedding-transport-v1" as const;

export const UGP_OPENAI_EMBEDDING_CERTIFICATION_VERSION =
  "ugp-6-2c-openai-embedding-live-certification-v1" as const;

export const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small" as const;
export const OPENAI_EMBEDDING_CREDENTIAL_PROFILE = "openai-primary" as const;
export const OPENAI_EMBEDDING_API_KEY_VARIABLE =
  "AI_INTEGRATIONS_OPENAI_API_KEY" as const;

export const OPENAI_EMBEDDING_TRANSPORT_POLICY = Object.freeze({
  origin: "https://api.openai.com",
  path: "/v1/embeddings",
  method: "POST" as const,
  model: OPENAI_EMBEDDING_MODEL,
  encodingFormat: "float" as const,
  expectedDimensions: 1536,
  maxDocumentsPerRequest: 200,
  maxCallsPerExecution: 1,
  maxAttemptsPerCall: 1,
  maxConcurrency: 1,
  automaticRetry: false as const,
  timeoutMs: 30_000,
  maxResponseBytes: 20_000_000,
  maxPromptTokens: 100_000,
  inputPriceUsdPerMillionTokens: 0.02,
  maxCertificationCostUsd: 0.01,
  grantsAuthorization: false as const,
  grantsProviderWrite: false as const,
  grantsPublicSiteWrite: false as const,
  persistence: false as const,
});

export type OpenAiEmbeddingCredentialMaterial = Readonly<{
  apiKey: string;
}>;

export type OpenAiEmbeddingCredentialResolver = (
  credentialProfileId: typeof OPENAI_EMBEDDING_CREDENTIAL_PROFILE,
) => Promise<OpenAiEmbeddingCredentialMaterial>;

export type OpenAiEmbeddingHttpResponse = Readonly<{
  effectiveUrl: string;
  status: number;
  contentType: string | null;
  bodyText: string;
}>;

export type OpenAiEmbeddingHttpClient = (input: Readonly<{
  url: string;
  method: "POST";
  headers: Readonly<Record<string, string>>;
  body: string;
  timeoutMs: number;
}>) => Promise<OpenAiEmbeddingHttpResponse>;

export type OpenAiEmbeddingControlledRequest = Readonly<{
  version: typeof UGP_OPENAI_EMBEDDING_TRANSPORT_VERSION;
  url: string;
  modelId: typeof OPENAI_EMBEDDING_MODEL;
  documentCount: number;
  documentFingerprints: readonly string[];
  body: string;
  requestFingerprint: string;
}>;

export type OpenAiEmbeddingExecutionReceipt = Readonly<{
  version: typeof UGP_OPENAI_EMBEDDING_TRANSPORT_VERSION;
  requestFingerprint: string;
  responseFingerprint: string;
  modelId: typeof OPENAI_EMBEDDING_MODEL;
  vectorCount: number;
  dimensions: 1536;
  promptTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  assertions: Readonly<{
    callCount: 1;
    maxAttemptsPerCall: 1;
    automaticRetry: false;
    maxConcurrency: 1;
    providerWrites: false;
    publicSiteWrites: false;
    persistence: false;
    credentialsReturned: false;
  }>;
  receiptFingerprint: string;
}>;

export type OpenAiEmbeddingExecutionResult = Readonly<{
  batch: SemanticEmbeddingBatch;
  receipt: OpenAiEmbeddingExecutionReceipt;
}>;

export type OpenAiEmbeddingLiveCertificationPlan = Readonly<{
  version: typeof UGP_OPENAI_EMBEDDING_CERTIFICATION_VERSION;
  sourceCommitSha: string;
  modelId: typeof OPENAI_EMBEDDING_MODEL;
  credentialProfileId: typeof OPENAI_EMBEDDING_CREDENTIAL_PROFILE;
  documents: readonly SemanticDocument[];
  maxCalls: 1;
  maxAttemptsPerCall: 1;
  automaticRetry: false;
  maxConcurrency: 1;
  maxPromptTokens: 100_000;
  maxEstimatedCostUsd: 0.01;
  providerWrites: false;
  publicSiteWrites: false;
  persistence: false;
  scheduling: false;
  publication: false;
  planFingerprint: string;
}>;

export type OpenAiEmbeddingLiveCertificationDecision = Readonly<{
  pass: boolean;
  reasons: readonly string[];
  requestFingerprint: string | null;
  receiptFingerprint: string | null;
  estimatedCostUsd: number | null;
  planFingerprint: string;
}>;

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("ugp_openai_embedding_invalid_" + field);
  }
  return value;
}

function exactApiKey(value: unknown): string {
  if (
    typeof value !== "string"
    || value.length < 8
    || value.length > 4096
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_openai_embedding_invalid_api_key");
  }
  return value;
}

function exactSourceSha(value: string): string {
  if (!/^[0-9a-f]{40}$/.test(value)) {
    throw new Error("ugp_openai_embedding_invalid_source_sha");
  }
  return value;
}

function exactDocuments(
  documents: readonly SemanticDocument[],
): readonly SemanticDocument[] {
  if (
    !Array.isArray(documents)
    || documents.length < 2
    || documents.length > OPENAI_EMBEDDING_TRANSPORT_POLICY.maxDocumentsPerRequest
  ) {
    throw new Error("ugp_openai_embedding_invalid_document_count");
  }

  const fingerprints = new Set<string>();
  const normalized = documents.map((document) => {
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      throw new Error("ugp_openai_embedding_invalid_document");
    }
    const evidenceFingerprint = exactFingerprint(
      document.evidenceFingerprint,
      "evidence_fingerprint",
    );
    const documentFingerprint = exactFingerprint(
      document.documentFingerprint,
      "document_fingerprint",
    );
    if (
      typeof document.keyword !== "string"
      || document.keyword !== document.keyword.trim()
      || document.keyword.length < 1
      || document.keyword.length > 512
    ) {
      throw new Error("ugp_openai_embedding_invalid_keyword");
    }
    if (
      typeof document.text !== "string"
      || document.text.length < 1
      || document.text.length > 2048
      || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(document.text)
    ) {
      throw new Error("ugp_openai_embedding_invalid_document_text");
    }
    if (fingerprints.has(documentFingerprint)) {
      throw new Error("ugp_openai_embedding_duplicate_document");
    }
    fingerprints.add(documentFingerprint);
    return Object.freeze({
      evidenceFingerprint,
      keyword: document.keyword,
      text: document.text,
      documentFingerprint,
    });
  });

  return Object.freeze(normalized);
}

export function buildOpenAiEmbeddingControlledRequest(input: {
  documents: readonly SemanticDocument[];
}): OpenAiEmbeddingControlledRequest {
  const documents = exactDocuments(input.documents);
  const body = stableJson({
    model: OPENAI_EMBEDDING_MODEL,
    input: documents.map((document) => document.text),
    encoding_format: OPENAI_EMBEDDING_TRANSPORT_POLICY.encodingFormat,
  });
  const url =
    OPENAI_EMBEDDING_TRANSPORT_POLICY.origin
    + OPENAI_EMBEDDING_TRANSPORT_POLICY.path;
  const base = {
    version: UGP_OPENAI_EMBEDDING_TRANSPORT_VERSION,
    url,
    modelId: OPENAI_EMBEDDING_MODEL,
    documentCount: documents.length,
    documentFingerprints: Object.freeze(
      documents.map((document) => document.documentFingerprint),
    ),
    body,
  };
  return Object.freeze({
    ...base,
    requestFingerprint: stableEvidenceHash({
      purpose: "ugp_openai_embedding_controlled_request",
      ...base,
    }),
  });
}

function parseResponse(input: {
  controlled: OpenAiEmbeddingControlledRequest;
  response: OpenAiEmbeddingHttpResponse;
}): OpenAiEmbeddingExecutionResult {
  const { controlled, response } = input;
  if (response.effectiveUrl !== controlled.url) {
    throw new Error("ugp_openai_embedding_effective_url_drift");
  }
  if (
    !Number.isInteger(response.status)
    || response.status < 200
    || response.status >= 300
  ) {
    throw new Error("ugp_openai_embedding_http_failed");
  }
  if (
    typeof response.contentType !== "string"
    || !/^application\/json(?:\s*;|$)/i.test(response.contentType.trim())
  ) {
    throw new Error("ugp_openai_embedding_json_required");
  }
  const responseBytes = Buffer.byteLength(response.bodyText, "utf8");
  if (
    responseBytes < 2
    || responseBytes > OPENAI_EMBEDDING_TRANSPORT_POLICY.maxResponseBytes
  ) {
    throw new Error("ugp_openai_embedding_response_bounds");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(response.bodyText);
  } catch {
    throw new Error("ugp_openai_embedding_invalid_json");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("ugp_openai_embedding_invalid_envelope");
  }

  const envelope = payload as Record<string, unknown>;
  if (envelope.model !== OPENAI_EMBEDDING_MODEL) {
    throw new Error("ugp_openai_embedding_model_drift");
  }
  if (!Array.isArray(envelope.data) || envelope.data.length !== controlled.documentCount) {
    throw new Error("ugp_openai_embedding_vector_count_mismatch");
  }

  const indexed = new Map<number, readonly number[]>();
  for (const item of envelope.data) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("ugp_openai_embedding_invalid_data_item");
    }
    const row = item as Record<string, unknown>;
    if (!Number.isSafeInteger(row.index)) {
      throw new Error("ugp_openai_embedding_invalid_index");
    }
    const index = row.index as number;
    if (index < 0 || index >= controlled.documentCount || indexed.has(index)) {
      throw new Error("ugp_openai_embedding_index_drift");
    }
    if (!Array.isArray(row.embedding)) {
      throw new Error("ugp_openai_embedding_invalid_vector");
    }
    if (row.embedding.length !== OPENAI_EMBEDDING_TRANSPORT_POLICY.expectedDimensions) {
      throw new Error("ugp_openai_embedding_dimension_drift");
    }
    const vector = row.embedding.map((component) => {
      if (typeof component !== "number" || !Number.isFinite(component)) {
        throw new Error("ugp_openai_embedding_non_finite_vector");
      }
      return component;
    });
    let normSquared = 0;
    for (const component of vector) normSquared += component * component;
    if (!Number.isFinite(normSquared) || normSquared <= 0) {
      throw new Error("ugp_openai_embedding_zero_vector");
    }
    indexed.set(index, Object.freeze(vector));
  }

  const usage = envelope.usage;
  if (!usage || typeof usage !== "object" || Array.isArray(usage)) {
    throw new Error("ugp_openai_embedding_usage_required");
  }
  const usageObject = usage as Record<string, unknown>;
  if (
    !Number.isSafeInteger(usageObject.prompt_tokens)
    || (usageObject.prompt_tokens as number) < 1
    || !Number.isSafeInteger(usageObject.total_tokens)
    || (usageObject.total_tokens as number) < (usageObject.prompt_tokens as number)
  ) {
    throw new Error("ugp_openai_embedding_invalid_usage");
  }
  const promptTokens = usageObject.prompt_tokens as number;
  const totalTokens = usageObject.total_tokens as number;
  if (promptTokens > OPENAI_EMBEDDING_TRANSPORT_POLICY.maxPromptTokens) {
    throw new Error("ugp_openai_embedding_prompt_token_ceiling_exceeded");
  }
  const estimatedCostUsd =
    Math.round(
      promptTokens
      * OPENAI_EMBEDDING_TRANSPORT_POLICY.inputPriceUsdPerMillionTokens
      / 1_000_000
      * 1_000_000_000,
    ) / 1_000_000_000;

  const vectors = Object.freeze(
    Array.from({ length: controlled.documentCount }, (_value, index) => {
      const vector = indexed.get(index);
      if (!vector) throw new Error("ugp_openai_embedding_missing_index");
      return vector;
    }),
  );

  const responseFingerprint = stableEvidenceHash({
    purpose: "ugp_openai_embedding_provider_response",
    model: envelope.model,
    data: envelope.data,
    usage: envelope.usage,
  });

  const assertions = Object.freeze({
    callCount: 1 as const,
    maxAttemptsPerCall: 1 as const,
    automaticRetry: false as const,
    maxConcurrency: 1 as const,
    providerWrites: false as const,
    publicSiteWrites: false as const,
    persistence: false as const,
    credentialsReturned: false as const,
  });

  const receiptBase = {
    version: UGP_OPENAI_EMBEDDING_TRANSPORT_VERSION,
    requestFingerprint: controlled.requestFingerprint,
    responseFingerprint,
    modelId: OPENAI_EMBEDDING_MODEL,
    vectorCount: vectors.length,
    dimensions: OPENAI_EMBEDDING_TRANSPORT_POLICY.expectedDimensions as 1536,
    promptTokens,
    totalTokens,
    estimatedCostUsd,
    assertions,
  };

  return Object.freeze({
    batch: Object.freeze({
      modelId: OPENAI_EMBEDDING_MODEL,
      vectors,
    }),
    receipt: Object.freeze({
      ...receiptBase,
      receiptFingerprint: stableEvidenceHash({
        purpose: "ugp_openai_embedding_execution_receipt",
        ...receiptBase,
      }),
    }),
  });
}

export async function executeOpenAiEmbeddingBatch(input: {
  documents: readonly SemanticDocument[];
  credentialProfileId: typeof OPENAI_EMBEDDING_CREDENTIAL_PROFILE;
  resolveCredentials: OpenAiEmbeddingCredentialResolver;
  httpClient: OpenAiEmbeddingHttpClient;
}): Promise<OpenAiEmbeddingExecutionResult> {
  if (input.credentialProfileId !== OPENAI_EMBEDDING_CREDENTIAL_PROFILE) {
    throw new Error("ugp_openai_embedding_credential_profile_drift");
  }
  if (typeof input.resolveCredentials !== "function") {
    throw new Error("ugp_openai_embedding_invalid_credential_resolver");
  }
  if (typeof input.httpClient !== "function") {
    throw new Error("ugp_openai_embedding_invalid_http_client");
  }

  const controlled = buildOpenAiEmbeddingControlledRequest({
    documents: input.documents,
  });
  const credentials = await input.resolveCredentials(
    OPENAI_EMBEDDING_CREDENTIAL_PROFILE,
  );
  const apiKey = exactApiKey(credentials.apiKey);

  let response: OpenAiEmbeddingHttpResponse;
  try {
    response = await input.httpClient({
      url: controlled.url,
      method: "POST",
      headers: Object.freeze({
        authorization: "Bearer " + apiKey,
        "content-type": "application/json",
        accept: "application/json",
      }),
      body: controlled.body,
      timeoutMs: OPENAI_EMBEDDING_TRANSPORT_POLICY.timeoutMs,
    });
  } catch {
    throw new Error("ugp_openai_embedding_transport_failed");
  }

  return parseResponse({ controlled, response });
}

export function createOpenAiEmbeddingEncoder(input: {
  credentialProfileId: typeof OPENAI_EMBEDDING_CREDENTIAL_PROFILE;
  resolveCredentials: OpenAiEmbeddingCredentialResolver;
  httpClient: OpenAiEmbeddingHttpClient;
}): SemanticEmbeddingEncoder {
  return async ({ modelId, documents }) => {
    if (modelId !== OPENAI_EMBEDDING_MODEL) {
      throw new Error("ugp_openai_embedding_model_not_allowed");
    }
    const result = await executeOpenAiEmbeddingBatch({
      documents,
      credentialProfileId: input.credentialProfileId,
      resolveCredentials: input.resolveCredentials,
      httpClient: input.httpClient,
    });
    return result.batch;
  };
}

function certificationDocument(input: {
  keyword: string;
  intent: "informational";
}): SemanticDocument {
  const evidenceFingerprint = stableEvidenceHash({
    purpose: "ugp_openai_embedding_certification_evidence",
    keyword: input.keyword,
  });
  const text = "keyword: " + input.keyword + "\nintent: " + input.intent;
  const base = { evidenceFingerprint, keyword: input.keyword, text };
  return Object.freeze({
    ...base,
    documentFingerprint: stableEvidenceHash({
      purpose: "ugp_semantic_similarity_document",
      version: UGP_SEMANTIC_SIMILARITY_ADAPTER_VERSION,
      ...base,
    }),
  });
}

export function buildOpenAiEmbeddingLiveCertificationPlan(input: {
  sourceCommitSha: string;
}): OpenAiEmbeddingLiveCertificationPlan {
  const sourceCommitSha = exactSourceSha(input.sourceCommitSha);
  const documents = Object.freeze([
    certificationDocument({
      keyword: "stress relief journal",
      intent: "informational",
    }),
    certificationDocument({
      keyword: "stress relief journal prompts",
      intent: "informational",
    }),
  ]);
  const base = {
    version: UGP_OPENAI_EMBEDDING_CERTIFICATION_VERSION,
    sourceCommitSha,
    modelId: OPENAI_EMBEDDING_MODEL,
    credentialProfileId: OPENAI_EMBEDDING_CREDENTIAL_PROFILE,
    documents,
    maxCalls: 1 as const,
    maxAttemptsPerCall: 1 as const,
    automaticRetry: false as const,
    maxConcurrency: 1 as const,
    maxPromptTokens: OPENAI_EMBEDDING_TRANSPORT_POLICY.maxPromptTokens,
    maxEstimatedCostUsd:
      OPENAI_EMBEDDING_TRANSPORT_POLICY.maxCertificationCostUsd,
    providerWrites: false as const,
    publicSiteWrites: false as const,
    persistence: false as const,
    scheduling: false as const,
    publication: false as const,
  };
  return Object.freeze({
    ...base,
    planFingerprint: stableEvidenceHash({
      purpose: "ugp_openai_embedding_live_certification_plan",
      ...base,
    }),
  });
}

export function evaluateOpenAiEmbeddingLiveCertification(input: {
  plan: OpenAiEmbeddingLiveCertificationPlan;
  result: OpenAiEmbeddingExecutionResult;
}): OpenAiEmbeddingLiveCertificationDecision {
  const reasons: string[] = [];
  const { plan, result } = input;

  if (plan.modelId !== OPENAI_EMBEDDING_MODEL) {
    reasons.push("model_drift");
  }
  if (plan.maxCalls !== 1 || result.receipt.assertions.callCount !== 1) {
    reasons.push("call_count_drift");
  }
  if (
    plan.maxAttemptsPerCall !== 1
    || result.receipt.assertions.maxAttemptsPerCall !== 1
    || plan.automaticRetry !== false
    || result.receipt.assertions.automaticRetry !== false
  ) {
    reasons.push("retry_policy_drift");
  }
  if (
    plan.maxConcurrency !== 1
    || result.receipt.assertions.maxConcurrency !== 1
  ) {
    reasons.push("concurrency_drift");
  }
  if (result.receipt.promptTokens > plan.maxPromptTokens) {
    reasons.push("prompt_token_ceiling_exceeded");
  }
  if (result.receipt.estimatedCostUsd > plan.maxEstimatedCostUsd) {
    reasons.push("estimated_cost_ceiling_exceeded");
  }
  if (
    result.receipt.vectorCount !== plan.documents.length
    || result.receipt.dimensions
      !== OPENAI_EMBEDDING_TRANSPORT_POLICY.expectedDimensions
  ) {
    reasons.push("vector_shape_drift");
  }
  if (
    result.receipt.assertions.providerWrites !== false
    || result.receipt.assertions.publicSiteWrites !== false
    || result.receipt.assertions.persistence !== false
    || result.receipt.assertions.credentialsReturned !== false
  ) {
    reasons.push("unsafe_execution_assertions");
  }

  const pass = reasons.length === 0;
  return Object.freeze({
    pass,
    reasons: Object.freeze(reasons),
    requestFingerprint: pass ? result.receipt.requestFingerprint : null,
    receiptFingerprint: pass ? result.receipt.receiptFingerprint : null,
    estimatedCostUsd: result.receipt.estimatedCostUsd,
    planFingerprint: plan.planFingerprint,
  });
}
