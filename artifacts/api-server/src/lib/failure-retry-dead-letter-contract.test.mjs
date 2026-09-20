import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "failure-retry-dead-letter.ts"), "utf8");

test("P9.5 has no timer, environment, DB, network, Task #69/#70 execution, or runtime worker primitive", () => {
  assert.doesNotMatch(source, /Date\.now\s*\(/);
  assert.doesNotMatch(source, /new Date\s*\(\s*\)/);
  assert.doesNotMatch(source, /setInterval|setTimeout|cron|node-cron/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|postgres\s*\(|drizzle/i);
  assert.doesNotMatch(source, /fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(source, /signal-collection-job-planning|signal-collection-execution/);
  assert.doesNotMatch(source, /buildSignalCollectionJobPacket|executeAuthorizedSignalCollectionJob|preflightSignalCollectionJobPacket/);
  assert.doesNotMatch(source, /INSERT\s+INTO|UPDATE\s+jobs|DELETE\s+FROM/i);
});

test("P9.5 composes only P9.1-P9.4 supplied/proposed artifacts", () => {
  assert.match(source, /read-scheduler-queue\.js/);
  assert.match(source, /first-party-refresh-materialization\.js/);
  assert.match(source, /scheduled-crawl-policy\.js/);
  assert.match(source, /external-intelligence-refresh\.js/);
  assert.match(source, /p9_1_read_work_intent/);
  assert.match(source, /p9_2_first_party_refresh_candidate/);
  assert.match(source, /p9_3_scheduled_crawl_candidate/);
  assert.match(source, /p9_4_external_intelligence_candidate/);
});

test("P9.5 keeps generic and integrity failures non-retryable by default", () => {
  assert.match(source, /runner_failed: \{ failureClass: "unknown", retryable: false \}/);
  assert.match(source, /normalization_failed: \{ failureClass: "integrity", retryable: false \}/);
  assert.match(source, /identity_collision: \{ failureClass: "integrity", retryable: false \}/);
  assert.match(source, /manual_intervention_required: \{ failureClass: "manual_intervention", retryable: false \}/);
  assert.match(source, /unknown_failure: \{ failureClass: "unknown", retryable: false \}/);
  assert.match(source, /transport_timeout: \{ failureClass: "transient", retryable: true \}/);
  assert.match(source, /provider_rate_limited: \{ failureClass: "throttled", retryable: true \}/);
});

test("P9.5 preserves original window and no catch-up/replay semantics", () => {
  assert.match(source, /attempt_outside_original_work_window/);
  assert.match(source, /work_window_expired_unattempted/);
  assert.match(source, /retry_window_expired/);
  assert.match(source, /exactDuplicateAttemptSuppression: true/);
  assert.match(source, /conflictingReplayFailsClosed: true/);
  assert.match(source, /originalWorkWindowPreserved: true/);
});

test("P9.5 keeps retry/dead-letter runtime, persistence, mutation, and publication gates closed", () => {
  assert.match(source, /liveRetryLoopEnabled: false/);
  assert.match(source, /durableEnqueueAuthorized: false/);
  assert.match(source, /queueReservationAuthorized: false/);
  assert.match(source, /durableDeadLetterStoreAuthorized: false/);
  assert.match(source, /workerEnabled: false/);
  assert.match(source, /batchExecutorEnabled: false/);
  assert.match(source, /task69PacketMaterializationAuthorized: false/);
  assert.match(source, /task70ExecutionAuthorized: false/);
  assert.match(source, /credentialUseAuthorized: false/);
  assert.match(source, /providerNetworkReadAuthorized: false/);
  assert.match(source, /crawlNetworkReadAuthorized: false/);
  assert.match(source, /crawlExecutionAuthorized: false/);
  assert.match(source, /observationPersistenceAuthorized: false/);
  assert.match(source, /evidencePersistenceAuthorized: false/);
  assert.match(source, /productionDbReadAuthorized: false/);
  assert.match(source, /productionDbWriteAuthorized: false/);
  assert.match(source, /providerWrites: false/);
  assert.match(source, /publicSiteWrites: false/);
  assert.match(source, /automaticTransition: false/);
  assert.match(source, /publicationAuthorized: false/);
});
