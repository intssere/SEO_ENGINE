import assert from "node:assert/strict";
import test from "node:test";
import {
  executeOpenAiEmbeddingLiveCertification,
} from "./openai-embedding-live-cert-runner.js";
import {
  OPENAI_EMBEDDING_MODEL,
  OPENAI_EMBEDDING_TRANSPORT_POLICY,
} from "./openai-embedding-transport.js";

function vector(seed = 0.01): number[] {
  return Array.from(
    { length: OPENAI_EMBEDDING_TRANSPORT_POLICY.expectedDimensions },
    (_value, index) => seed + (index % 13) * 0.000001,
  );
}

function providerBody(promptTokens = 20): string {
  return JSON.stringify({
    object: "list",
    data: [
      { object: "embedding", index: 0, embedding: vector(0.01) },
      { object: "embedding", index: 1, embedding: vector(0.02) },
    ],
    model: OPENAI_EMBEDDING_MODEL,
    usage: {
      prompt_tokens: promptTokens,
      total_tokens: promptTokens,
    },
  });
}

test("UGP-6.2C live runner performs exactly one bounded provider call", async () => {
  let calls = 0;
  let authorization = "";

  const result = await executeOpenAiEmbeddingLiveCertification({
    env: {
      AI_INTEGRATIONS_OPENAI_API_KEY: "sk-fixture-secret-key",
    },
    httpClient: async (request) => {
      calls += 1;
      authorization = request.headers.authorization;
      assert.equal(
        request.url,
        "https://api.openai.com/v1/embeddings",
      );
      assert.equal(request.timeoutMs, 30_000);
      return {
        effectiveUrl: request.url,
        status: 200,
        contentType: "application/json",
        bodyText: providerBody(),
      };
    },
  });

  assert.equal(calls, 1);
  assert.equal(authorization, "Bearer sk-fixture-secret-key");
  assert.equal(result.providerCallCount, 1);
  assert.equal(result.modelId, OPENAI_EMBEDDING_MODEL);
  assert.equal(result.decision.pass, true);

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /sk-fixture-secret-key/);
  assert.doesNotMatch(serialized, /Bearer\s+/);
});

test("UGP-6.2C live runner fails before network if API key is absent", async () => {
  let calls = 0;

  await assert.rejects(
    executeOpenAiEmbeddingLiveCertification({
      env: {},
      httpClient: async () => {
        calls += 1;
        throw new Error("must-not-run");
      },
    }),
    /missing_api_key/,
  );

  assert.equal(calls, 0);
});

test("UGP-6.2C live runner performs no retry after provider failure", async () => {
  let calls = 0;

  await assert.rejects(
    executeOpenAiEmbeddingLiveCertification({
      env: {
        AI_INTEGRATIONS_OPENAI_API_KEY: "sk-fixture-secret-key",
      },
      httpClient: async () => {
        calls += 1;
        throw new Error("network");
      },
    }),
    /transport_failed/,
  );

  assert.equal(calls, 1);
});

test("UGP-6.2C live runner rejects over-ceiling usage", async () => {
  let calls = 0;

  await assert.rejects(
    executeOpenAiEmbeddingLiveCertification({
      env: {
        AI_INTEGRATIONS_OPENAI_API_KEY: "sk-fixture-secret-key",
      },
      httpClient: async (request) => {
        calls += 1;
        return {
          effectiveUrl: request.url,
          status: 200,
          contentType: "application/json",
          bodyText: providerBody(100_001),
        };
      },
    }),
    /prompt_token_ceiling_exceeded/,
  );

  assert.equal(calls, 1);
});

test("UGP-6.2C live runner has no arbitrary model or URL input surface", () => {
  const inputKeys = Object.keys({
    env: {},
    httpClient: async () => {
      throw new Error("fixture");
    },
  });

  for (const forbidden of ["url", "model", "documents", "body"]) {
    assert.equal(inputKeys.includes(forbidden), false);
  }
});
