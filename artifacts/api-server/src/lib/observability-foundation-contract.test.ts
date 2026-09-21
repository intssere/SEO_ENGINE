import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("P11.3 observability foundation stays pure, offline and exporter-free", async () => {
  const code = await source("./observability-foundation.ts");

  assert.match(code, /P11_3_OBSERVABILITY_VERSION/);
  assert.match(code, /deterministicProjectionOnly: true/);
  assert.match(code, /offlineOnly: true/);
  assert.match(code, /suppliedEvidenceOnly: true/);
  assert.match(code, /telemetryExporterConfigured: false/);
  assert.match(code, /telemetrySinkConfigured: false/);
  assert.match(code, /productionTelemetryIngestionAuthorized: false/);
  assert.match(code, /alertDeliveryAuthorized: false/);
  assert.match(code, /incidentCreationAuthorized: false/);
  assert.match(code, /schedulerActivated: false/);
  assert.match(code, /workerActivated: false/);
  assert.match(code, /retryDispatchAuthorized: false/);
  assert.match(code, /productionDbReadAuthorized: false/);
  assert.match(code, /productionDbWriteAuthorized: false/);
  assert.match(code, /providerNetworkReadAuthorized: false/);
  assert.match(code, /providerWrites: false/);
  assert.match(code, /publicSiteWrites: false/);
  assert.match(code, /publicationAuthorized: false/);

  assert.doesNotMatch(code, /process\.env/);
  assert.doesNotMatch(code, /\bfetch\s*\(/);
  assert.doesNotMatch(code, /from ["']postgres["']/);
  assert.doesNotMatch(code, /@opentelemetry/);
  assert.doesNotMatch(code, /prom-client/);
  assert.doesNotMatch(code, /datadog/i);
  assert.doesNotMatch(code, /sentry/i);
  assert.doesNotMatch(code, /setInterval\s*\(/);
  assert.doesNotMatch(code, /setTimeout\s*\(/);
});

test("P11.3 source contract retains exact P9.1/P9.6 rebuilds and no alert delivery", async () => {
  const code = await source("./observability-foundation.ts");

  assert.match(code, /buildReadQueueProjection/);
  assert.match(code, /projectWorkerControlObservability/);
  assert.match(code, /scheduler_projection_mismatch/);
  assert.match(code, /worker_projection_mismatch/);
  assert.match(code, /lifecycle: "candidate_only"/);
  assert.match(code, /deliveryAuthorized: false/);
  assert.match(code, /incidentCreationAuthorized: false/);
  assert.match(code, /secret_attribute_forbidden/);
  assert.match(code, /trace_parent_missing/);
  assert.match(code, /trace_lineage_cycle/);
});

test("P11.3 documentation preserves the non-production observability boundary", async () => {
  const doc = await source("../../../../docs/p11-3-observability.md");

  assert.match(doc, /deterministic\/offline/i);
  assert.match(doc, /no production telemetry/i);
  assert.match(doc, /no alert delivery/i);
  assert.match(doc, /P9\.1/);
  assert.match(doc, /P9\.6/);
  assert.match(doc, /does not claim/i);
  assert.match(doc, /deployment or publication/i);
});
