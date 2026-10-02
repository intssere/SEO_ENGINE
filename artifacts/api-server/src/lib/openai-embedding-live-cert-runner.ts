import {
  buildOpenAiEmbeddingLiveCertificationPlan,
  evaluateOpenAiEmbeddingLiveCertification,
  executeOpenAiEmbeddingBatch,
  OPENAI_EMBEDDING_CREDENTIAL_PROFILE,
  OPENAI_EMBEDDING_TRANSPORT_POLICY,
  type OpenAiEmbeddingHttpClient,
} from "./openai-embedding-transport.js";

export const UGP_OPENAI_EMBEDDING_LIVE_RUNNER_VERSION =
  "ugp-6-2c-openai-live-cert-runner-v1" as const;

export const UGP_OPENAI_EMBEDDING_CERTIFICATION_SOURCE_COMMIT =
  "1c3e4dada5465fee265fbf6e813b478313b693a1" as const;

export type OpenAiEmbeddingLiveRunnerEnvironment = Readonly<{
  AI_INTEGRATIONS_OPENAI_API_KEY?: string;
}>;

export type OpenAiEmbeddingLiveRunnerResult = Readonly<{
  runnerVersion: typeof UGP_OPENAI_EMBEDDING_LIVE_RUNNER_VERSION;
  sourceCommitSha: typeof UGP_OPENAI_EMBEDDING_CERTIFICATION_SOURCE_COMMIT;
  providerCallCount: 1;
  modelId: "text-embedding-3-small";
  promptTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  decision: Readonly<{
    pass: boolean;
    reasons: readonly string[];
    requestFingerprint: string | null;
    receiptFingerprint: string | null;
    estimatedCostUsd: number | null;
    planFingerprint: string;
  }>;
}>;

function exactApiKey(value: string | undefined): string {
  if (
    typeof value !== "string"
    || value.length < 8
    || value.length > 4096
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_openai_embedding_live_runner_missing_api_key");
  }
  return value;
}

export async function executeOpenAiEmbeddingLiveCertification(input: {
  env: OpenAiEmbeddingLiveRunnerEnvironment;
  httpClient: OpenAiEmbeddingHttpClient;
}): Promise<OpenAiEmbeddingLiveRunnerResult> {
  const apiKey = exactApiKey(input.env.AI_INTEGRATIONS_OPENAI_API_KEY);
  const plan = buildOpenAiEmbeddingLiveCertificationPlan({
    sourceCommitSha: UGP_OPENAI_EMBEDDING_CERTIFICATION_SOURCE_COMMIT,
  });

  let calls = 0;

  const result = await executeOpenAiEmbeddingBatch({
    documents: plan.documents,
    credentialProfileId: OPENAI_EMBEDDING_CREDENTIAL_PROFILE,
    resolveCredentials: async () => ({ apiKey }),
    httpClient: async (request) => {
      if (calls >= OPENAI_EMBEDDING_TRANSPORT_POLICY.maxCallsPerExecution) {
        throw new Error("ugp_openai_embedding_live_runner_call_limit_exceeded");
      }
      calls += 1;
      return input.httpClient(request);
    },
  });

  if (calls !== 1) {
    throw new Error("ugp_openai_embedding_live_runner_call_count_mismatch");
  }

  const decision = evaluateOpenAiEmbeddingLiveCertification({
    plan,
    result,
  });

  if (!decision.pass) {
    throw new Error(
      "ugp_openai_embedding_live_runner_certification_failed:"
      + decision.reasons.join(","),
    );
  }

  return Object.freeze({
    runnerVersion: UGP_OPENAI_EMBEDDING_LIVE_RUNNER_VERSION,
    sourceCommitSha: UGP_OPENAI_EMBEDDING_CERTIFICATION_SOURCE_COMMIT,
    providerCallCount: 1 as const,
    modelId: result.receipt.modelId,
    promptTokens: result.receipt.promptTokens,
    totalTokens: result.receipt.totalTokens,
    estimatedCostUsd: result.receipt.estimatedCostUsd,
    decision,
  });
}
