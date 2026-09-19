import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "first-party-refresh-materialization.ts"), "utf8");

test("P9.2 stays above Task 69/70 materialization and execution", () => {
  assert.doesNotMatch(source, /signal-collection-job-planning/);
  assert.doesNotMatch(source, /signal-collection-execution/);
  assert.doesNotMatch(source, /buildSignalCollectionJobPacket/);
  assert.doesNotMatch(source, /executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(source, /AUTHORIZE_SIGNAL_COLLECTION_JOB/);
  assert.match(source, /task69PacketMaterializationAuthorized: false/);
  assert.match(source, /task70ExecutionAuthorized: false/);
});

test("P9.2 contains no timer, network, database, environment or persistence primitive", () => {
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /setInterval\s*\(|setTimeout\s*\(/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|postgres\s*\(|drizzle|INSERT\s+INTO|UPDATE\s+/i);
  assert.doesNotMatch(source, /persistObservation|persistEvidence|reserve\s*\(|claim\s*\(/);
  assert.match(source, /wallClockAccess: false/);
  assert.match(source, /schedulerActivated: false/);
  assert.match(source, /durableEnqueueAuthorized: false/);
  assert.match(source, /queueReservationAuthorized: false/);
  assert.match(source, /providerNetworkReadAuthorized: false/);
  assert.match(source, /observationPersistenceAuthorized: false/);
  assert.match(source, /productionDbWriteAuthorized: false/);
});

test("P9.2 recognizes certified GSC foundation without calling it runtime-ready", () => {
  assert.match(source, /GSC_SEARCH_ANALYTICS_SOURCE_KEY/);
  assert.match(source, /runner_foundation_available/);
  assert.match(source, /runnerFoundationAvailabilityIsRuntimeReadiness: false/);
  assert.match(source, /credentialUseAuthorized: false/);
  assert.match(source, /oauthUseAuthorized: false/);
});

test("P9.2 preserves explicit GA4 and catalog runner-foundation gaps", () => {
  assert.match(source, /task70_compatible_analytics_runner_unavailable/);
  assert.match(source, /task70_compatible_catalog_runner_unavailable/);
  assert.match(source, /signalType === "analytics"/);
  assert.match(source, /signalType === "catalog"/);
});

test("P9.2 remains first-party read-only and cannot transition to site mutation", () => {
  assert.match(source, /firstPartyReadOnly: true/);
  assert.match(source, /materializationReviewOnly: true/);
  assert.match(source, /providerWrites: false/);
  assert.match(source, /publicSiteWrites: false/);
  assert.match(source, /task53ExecutionAuthorized: false/);
  assert.match(source, /task54ExecutionAuthorized: false/);
  assert.match(source, /automaticTransition: false/);
  assert.match(source, /publicationAuthorized: false/);
});
