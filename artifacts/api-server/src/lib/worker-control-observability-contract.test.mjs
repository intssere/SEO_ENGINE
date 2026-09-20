import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "worker-control-observability.ts"), "utf8");

test("P9.6 contains no runtime timer, environment, DB, network, Task #69/#70, or worker execution primitive", () => {
  assert.doesNotMatch(source, /Date\.now\s*\(/);
  assert.doesNotMatch(source, /new Date\s*\(\s*\)/);
  assert.doesNotMatch(source, /setInterval|setTimeout|cron|node-cron/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|postgres\s*\(|drizzle/i);
  assert.doesNotMatch(source, /fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(source, /signal-collection-job-planning|signal-collection-execution/);
  assert.doesNotMatch(source, /buildSignalCollectionJobPacket|executeAuthorizedSignalCollectionJob|preflightSignalCollectionJobPacket/);
  assert.doesNotMatch(source, /INSERT\s+INTO|UPDATE\s+jobs|DELETE\s+FROM/i);
  assert.doesNotMatch(source, /worker_threads|child_process|spawn\s*\(|fork\s*\(/);
});

test("P9.6 composes certified P9.5 control-plane semantics only", () => {
  assert.match(source, /failure-retry-dead-letter\.js/);
  assert.match(source, /normalizeFailureControlArtifact/);
  assert.match(source, /projectFailureRetryDeadLetterControl/);
  assert.match(source, /worker_claim_not_eligible_under_p9_5/);
  assert.match(source, /no_work_execution_history_forbidden/);
});

test("P9.6 encodes pause/drain/kill/resume precedence and fail-closed kill recovery", () => {
  assert.match(source, /killed_requires_recovery_review/);
  assert.match(source, /drain_precedence_blocks_pause/);
  assert.match(source, /drain_not_complete/);
  assert.match(source, /confirmed_not_started_reviewable_after_recovery/);
  assert.match(source, /manual_intervention_required/);
  assert.match(source, /killed_in_flight_outcome_uncertain/);
});

test("P9.6 cannot reset P9.5 history, revive dead letters, extend windows, or create catch-up", () => {
  assert.match(source, /deadLetterReactivationAllowed: false/);
  assert.match(source, /catchUpBackfillAllowed: false/);
  assert.match(source, /attemptResetAllowed: false/);
  assert.match(source, /idempotencyResetAllowed: false/);
  assert.match(source, /workWindowExtensionAllowed: false/);
});

test("P9.6 keeps worker/runtime/persistence/mutation/publication gates closed", () => {
  assert.match(source, /wallClockAccess: false/);
  assert.match(source, /timerActivated: false/);
  assert.match(source, /schedulerActivated: false/);
  assert.match(source, /liveWorkerEnabled: false/);
  assert.match(source, /liveRetryLoopEnabled: false/);
  assert.match(source, /durableControlStateAuthorized: false/);
  assert.match(source, /durableEnqueueAuthorized: false/);
  assert.match(source, /queueReservationAuthorized: false/);
  assert.match(source, /durableDeadLetterStoreAuthorized: false/);
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
