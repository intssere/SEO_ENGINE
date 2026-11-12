import {
  executeDataForSeoDisposableLiveCertification,
  type DataForSeoDisposableFetch,
} from "./dataforseo-disposable-live-runner.js";

function sanitizedFailure(error: unknown): Readonly<{
  ok: false;
  error: string;
}> {
  const message =
    error instanceof Error && /^[A-Za-z0-9_.:,\-]+$/.test(error.message)
      ? error.message
      : "ugp_dataforseo_disposable_unknown_failure";
  return Object.freeze({ ok: false as const, error: message });
}

try {
  const result = await executeDataForSeoDisposableLiveCertification({
    env: {
      DATAFORSEO_PRIMARY_LOGIN: process.env.DATAFORSEO_PRIMARY_LOGIN,
      DATAFORSEO_PRIMARY_PASSWORD: process.env.DATAFORSEO_PRIMARY_PASSWORD,
    },
    fetchImpl: globalThis.fetch as unknown as DataForSeoDisposableFetch,
  });
  process.stdout.write(JSON.stringify({ ok: true, result }) + "\n");
  process.exitCode = 0;
} catch (error) {
  process.stdout.write(JSON.stringify(sanitizedFailure(error)) + "\n");
  process.exitCode = 1;
}
