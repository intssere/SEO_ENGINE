import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "external-intelligence-refresh.ts"), "utf8");

test("P9.4 has no timer, environment, DB, live network, Task #69/#70, or execution primitive", () => {
  assert.doesNotMatch(source, /Date\.now\s*\(/);
  assert.doesNotMatch(source, /new Date\s*\(\s*\)/);
  assert.doesNotMatch(source, /setInterval|setTimeout|cron|node-cron/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|postgres\s*\(/);
  assert.doesNotMatch(source, /fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(source, /signal-collection-job-planning|signal-collection-execution/);
  assert.doesNotMatch(source, /buildSignalCollectionJobPacket|executeSignal|preflightSignalCollectionJobPacket/);
  assert.doesNotMatch(source, /task53-|task54-/);
});

test("P9.4 composes exact Task #67/#68, P5 adapters/telemetry, and P9.1 only", () => {
  assert.match(source, /signal-source-registry\.js/);
  assert.match(source, /signal-observation-normalization\.js/);
  assert.match(source, /dataforseo-serp-adapter\.js/);
  assert.match(source, /dataforseo-keyword-adapter\.js/);
  assert.match(source, /dataforseo-google-trends-adapter\.js/);
  assert.match(source, /backlink-supplied-adapter\.js/);
  assert.match(source, /source-telemetry\.js/);
  assert.match(source, /read-scheduler-queue\.js/);
  assert.match(source, /workClass: "signal_refresh"/);
});

test("P9.4 does not convert telemetry into source ranking or execution authority", () => {
  assert.match(source, /sourceRefreshPlanReorderingEnabled: false/);
  assert.match(source, /qualityTelemetryChangesRefreshOrder: false/);
  assert.match(source, /costTelemetryChangesRefreshOrder: false/);
  assert.match(source, /rateLimitTelemetryIsExecutionAuthorization: false/);
  assert.match(source, /suppliedAdapterFoundationIsLiveRunner: false/);
  assert.match(source, /orderingImpliesPriority: false/);
});

test("P9.4 keeps provider/runtime/persistence/mutation/publication gates closed", () => {
  assert.match(source, /providerEnrollmentAuthorized: false/);
  assert.match(source, /providerPurchaseAuthorized: false/);
  assert.match(source, /credentialCreationAuthorized: false/);
  assert.match(source, /credentialUseAuthorized: false/);
  assert.match(source, /providerNetworkReadAuthorized: false/);
  assert.match(source, /liveEndpointExecutionAuthorized: false/);
  assert.match(source, /pollingAuthorized: false/);
  assert.match(source, /task69PacketMaterializationAuthorized: false/);
  assert.match(source, /task70ExecutionAuthorized: false/);
  assert.match(source, /durableEnqueueAuthorized: false/);
  assert.match(source, /queueReservationAuthorized: false/);
  assert.match(source, /workerEnabled: false/);
  assert.match(source, /batchExecutorEnabled: false/);
  assert.match(source, /retryLoopEnabled: false/);
  assert.match(source, /observationPersistenceAuthorized: false/);
  assert.match(source, /evidencePersistenceAuthorized: false/);
  assert.match(source, /productionDbReadAuthorized: false/);
  assert.match(source, /productionDbWriteAuthorized: false/);
  assert.match(source, /providerWrites: false/);
  assert.match(source, /publicSiteWrites: false/);
  assert.match(source, /automaticTransition: false/);
  assert.match(source, /publicationAuthorized: false/);
});
