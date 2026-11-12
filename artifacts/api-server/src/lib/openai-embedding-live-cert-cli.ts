import {
  executeOpenAiEmbeddingLiveCertification,
} from "./openai-embedding-live-cert-runner.js";

function sanitizedFailure(error: unknown): Readonly<{
  ok: false;
  error: string;
}> {
  const message =
    error instanceof Error && /^[A-Za-z0-9_.:,\-]+$/.test(error.message)
      ? error.message
      : "ugp_openai_embedding_live_runner_unknown_failure";
  return Object.freeze({ ok: false as const, error: message });
}

try {
  const result = await executeOpenAiEmbeddingLiveCertification({
    env: {
      AI_INTEGRATIONS_OPENAI_API_KEY:
        process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    },
    httpClient: async (request) => {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: "error",
        signal: AbortSignal.timeout(request.timeoutMs),
      });
      return {
        effectiveUrl: response.url || request.url,
        status: response.status,
        contentType: response.headers.get("content-type"),
        bodyText: await response.text(),
      };
    },
  });

  process.stdout.write(JSON.stringify({ ok: true, result }) + "\n");
  process.exitCode = 0;
} catch (error) {
  process.stdout.write(JSON.stringify(sanitizedFailure(error)) + "\n");
  process.exitCode = 1;
}
