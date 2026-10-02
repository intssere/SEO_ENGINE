import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBoundedSemanticSimilarityMatrix,
} from "./semantic-similarity-adapter.js";
import {
  buildOpenAiEmbeddingControlledRequest,
  buildOpenAiEmbeddingLiveCertificationPlan,
  createOpenAiEmbeddingEncoder,
  evaluateOpenAiEmbeddingLiveCertification,
  executeOpenAiEmbeddingBatch,
  OPENAI_EMBEDDING_CREDENTIAL_PROFILE,
  OPENAI_EMBEDDING_MODEL,
  OPENAI_EMBEDDING_TRANSPORT_POLICY,
} from "./openai-embedding-transport.js";

function vector(seed = 0.01): number[] {
  return Array.from(
    { length: OPENAI_EMBEDDING_TRANSPORT_POLICY.expectedDimensions },
    (_value, index) => seed + (index % 17) * 0.000001,
  );
}

function providerBody(documentCount: number, promptTokens = 24): string {
  return JSON.stringify({
    object: "list",
    data: Array.from({ length: documentCount }, (_value, index) => ({
      object: "embedding",
      index,
      embedding: vector(0.01 + index * 0.001),
    })),
    model: OPENAI_EMBEDDING_MODEL,
    usage: {
      prompt_tokens: promptTokens,
      total_tokens: promptTokens,
    },
  });
}

test("UGP-6.2C builds exact allowlisted OpenAI embeddings request", () => {
  const plan = buildOpenAiEmbeddingLiveCertificationPlan({
    sourceCommitSha: "1".repeat(40),
  });
  const controlled = buildOpenAiEmbeddingControlledRequest({
    documents: plan.documents,
  });

  assert.equal(
    controlled.url,
    "https://api.openai.com/v1/embeddings",
  );
  assert.equal(controlled.modelId, "text-embedding-3-small");
  assert.equal(controlled.documentCount, 2);
  assert.deepEqual(JSON.parse(controlled.body), {
    encoding_format: "float",
    input: plan.documents.map((document) => document.text),
    model: "text-embedding-3-small",
  });
  assert.equal(controlled.requestFingerprint.length, 64);
});

test("UGP-6.2C executes exactly one injected HTTP call and returns no credentials", async () => {
  const plan = buildOpenAiEmbeddingLiveCertificationPlan({
    sourceCommitSha: "2".repeat(40),
  });
  let calls = 0;
  let observedAuthorization = "";

  const result = await executeOpenAiEmbeddingBatch({
    documents: plan.documents,
    credentialProfileId: OPENAI_EMBEDDING_CREDENTIAL_PROFILE,
    resolveCredentials: async () => ({ apiKey: "sk-fixture-secret-key" }),
    httpClient: async (request) => {
      calls += 1;
      observedAuthorization = request.headers.authorization;
      return {
        effectiveUrl: request.url,
        status: 200,
        contentType: "application/json",
        bodyText: providerBody(2),
      };
    },
  });

  assert.equal(calls, 1);
  assert.equal(observedAuthorization, "Bearer sk-fixture-secret-key");
  assert.equal(result.batch.vectors.length, 2);
  assert.equal(result.batch.vectors[0].length, 1536);
  assert.equal(result.receipt.promptTokens, 24);
  assert.equal(result.receipt.estimatedCostUsd, 0.00000048);
  assert.equal(result.receipt.assertions.automaticRetry, false);

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /sk-fixture-secret-key/);
  assert.doesNotMatch(serialized, /Bearer\s+/);
});

test("UGP-6.2C provider encoder plugs directly into UGP-6.2B", async () => {
  const plan = buildOpenAiEmbeddingLiveCertificationPlan({
    sourceCommitSha: "3".repeat(40),
  });
  const encoder = createOpenAiEmbeddingEncoder({
    credentialProfileId: OPENAI_EMBEDDING_CREDENTIAL_PROFILE,
    resolveCredentials: async () => ({ apiKey: "sk-fixture-secret-key" }),
    httpClient: async (request) => ({
      effectiveUrl: request.url,
      status: 200,
      contentType: "application/json",
      bodyText: providerBody(2),
    }),
  });

  const matrix = await buildBoundedSemanticSimilarityMatrix({
    candidates: plan.documents.map((document) => ({
      evidence: {
        version: "ugp-6-1a-keyword-serp-evidence-v1",
        keyword: {
          keyword: document.keyword,
          market: {
            searchEngine: "google",
            locationCode: 2840,
            languageCode: "en",
            device: "desktop",
          },
          searchVolume: 10,
          keywordDifficulty: 10,
          cpcUsd: 0.1,
          paidCompetition: 0.1,
          paidCompetitionLevel: "low",
          intent: "informational",
          monthlySearches: [],
        },
        relatedTopics: [],
        serp: {
          keyword: document.keyword,
          market: {
            searchEngine: "google",
            locationCode: 2840,
            languageCode: "en",
            device: "desktop",
          },
          features: [],
          rankingUrls: [],
        },
        provenance: [],
        semantics: {
          readOnly: true,
          grantsAuthorization: false,
          grantsProviderWrite: false,
          grantsPublicSiteWrite: false,
          performsNetworkOperation: false,
        },
        evidenceFingerprint: document.evidenceFingerprint,
      },
      context: { categories: [], entities: [] },
    })),
    modelId: OPENAI_EMBEDDING_MODEL,
    encoder,
  });

  assert.equal(matrix.similarities.length, 1);
  assert.equal(matrix.modelId, OPENAI_EMBEDDING_MODEL);
});

test("UGP-6.2C fails closed on transport failure with no retry", async () => {
  const plan = buildOpenAiEmbeddingLiveCertificationPlan({
    sourceCommitSha: "4".repeat(40),
  });
  let calls = 0;
  await assert.rejects(
    executeOpenAiEmbeddingBatch({
      documents: plan.documents,
      credentialProfileId: OPENAI_EMBEDDING_CREDENTIAL_PROFILE,
      resolveCredentials: async () => ({ apiKey: "sk-fixture-secret-key" }),
      httpClient: async () => {
        calls += 1;
        throw new Error("network");
      },
    }),
    /transport_failed/,
  );
  assert.equal(calls, 1);
});

test("UGP-6.2C rejects endpoint, model, index and dimension drift", async () => {
  const plan = buildOpenAiEmbeddingLiveCertificationPlan({
    sourceCommitSha: "5".repeat(40),
  });

  await assert.rejects(
    executeOpenAiEmbeddingBatch({
      documents: plan.documents,
      credentialProfileId: OPENAI_EMBEDDING_CREDENTIAL_PROFILE,
      resolveCredentials: async () => ({ apiKey: "sk-fixture-secret-key" }),
      httpClient: async (request) => ({
        effectiveUrl: "https://example.com/v1/embeddings",
        status: 200,
        contentType: "application/json",
        bodyText: providerBody(2),
      }),
    }),
    /effective_url_drift/,
  );

  await assert.rejects(
    executeOpenAiEmbeddingBatch({
      documents: plan.documents,
      credentialProfileId: OPENAI_EMBEDDING_CREDENTIAL_PROFILE,
      resolveCredentials: async () => ({ apiKey: "sk-fixture-secret-key" }),
      httpClient: async (request) => ({
        effectiveUrl: request.url,
        status: 200,
        contentType: "application/json",
        bodyText: JSON.stringify({
          ...JSON.parse(providerBody(2)),
          model: "other-model",
        }),
      }),
    }),
    /model_drift/,
  );

  await assert.rejects(
    executeOpenAiEmbeddingBatch({
      documents: plan.documents,
      credentialProfileId: OPENAI_EMBEDDING_CREDENTIAL_PROFILE,
      resolveCredentials: async () => ({ apiKey: "sk-fixture-secret-key" }),
      httpClient: async (request) => {
        const payload = JSON.parse(providerBody(2));
        payload.data[1].index = 0;
        return {
          effectiveUrl: request.url,
          status: 200,
          contentType: "application/json",
          bodyText: JSON.stringify(payload),
        };
      },
    }),
    /index_drift/,
  );

  await assert.rejects(
    executeOpenAiEmbeddingBatch({
      documents: plan.documents,
      credentialProfileId: OPENAI_EMBEDDING_CREDENTIAL_PROFILE,
      resolveCredentials: async () => ({ apiKey: "sk-fixture-secret-key" }),
      httpClient: async (request) => {
        const payload = JSON.parse(providerBody(2));
        payload.data[0].embedding = payload.data[0].embedding.slice(0, 8);
        return {
          effectiveUrl: request.url,
          status: 200,
          contentType: "application/json",
          bodyText: JSON.stringify(payload),
        };
      },
    }),
    /dimension_drift/,
  );
});

test("UGP-6.2C requires bounded provider usage accounting", async () => {
  const plan = buildOpenAiEmbeddingLiveCertificationPlan({
    sourceCommitSha: "6".repeat(40),
  });

  await assert.rejects(
    executeOpenAiEmbeddingBatch({
      documents: plan.documents,
      credentialProfileId: OPENAI_EMBEDDING_CREDENTIAL_PROFILE,
      resolveCredentials: async () => ({ apiKey: "sk-fixture-secret-key" }),
      httpClient: async (request) => ({
        effectiveUrl: request.url,
        status: 200,
        contentType: "application/json",
        bodyText: JSON.stringify({
          ...JSON.parse(providerBody(2)),
          usage: {},
        }),
      }),
    }),
    /invalid_usage/,
  );

  await assert.rejects(
    executeOpenAiEmbeddingBatch({
      documents: plan.documents,
      credentialProfileId: OPENAI_EMBEDDING_CREDENTIAL_PROFILE,
      resolveCredentials: async () => ({ apiKey: "sk-fixture-secret-key" }),
      httpClient: async (request) => ({
        effectiveUrl: request.url,
        status: 200,
        contentType: "application/json",
        bodyText: providerBody(2, 100_001),
      }),
    }),
    /prompt_token_ceiling_exceeded/,
  );
});

test("UGP-6.2C live certification decision enforces cost and safety limits", async () => {
  const plan = buildOpenAiEmbeddingLiveCertificationPlan({
    sourceCommitSha: "7".repeat(40),
  });
  const result = await executeOpenAiEmbeddingBatch({
    documents: plan.documents,
    credentialProfileId: OPENAI_EMBEDDING_CREDENTIAL_PROFILE,
    resolveCredentials: async () => ({ apiKey: "sk-fixture-secret-key" }),
    httpClient: async (request) => ({
      effectiveUrl: request.url,
      status: 200,
      contentType: "application/json",
      bodyText: providerBody(2, 24),
    }),
  });

  const decision = evaluateOpenAiEmbeddingLiveCertification({ plan, result });
  assert.equal(decision.pass, true);
  assert.deepEqual(decision.reasons, []);
  assert.equal(decision.estimatedCostUsd, 0.00000048);
  assert.equal(decision.receiptFingerprint?.length, 64);
});
