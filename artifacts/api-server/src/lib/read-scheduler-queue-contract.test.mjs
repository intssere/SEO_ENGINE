import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "read-scheduler-queue.ts"), "utf8");

test("P9.1 is a pure projection with no timer, environment, DB, network, or execution import", () => {
  assert.doesNotMatch(source, /Date\.now\s*\(/);
  assert.doesNotMatch(source, /new Date\s*\(\s*\)/);
  assert.doesNotMatch(source, /setInterval|setTimeout|cron|node-cron/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|postgres\s*\(/);
  assert.doesNotMatch(source, /fetch\s*\(|https?:\/\/|graphql|shopify/i);
  assert.doesNotMatch(source, /signal-collection-job-planning|signal-collection-execution/);
  assert.doesNotMatch(source, /executeSignal|preflightSignalCollectionJobPacket|buildSignalCollectionJobPacket/);
});

test("P9.1 source exposes closed scheduler/queue/execution semantics", () => {
  assert.match(source, /architectureOnly: true/);
  assert.match(source, /deterministicProjectionOnly: true/);
  assert.match(source, /readWorkOnly: true/);
  assert.match(source, /schedulerActivated: false/);
  assert.match(source, /durableEnqueueAuthorized: false/);
  assert.match(source, /queueReservationAuthorized: false/);
  assert.match(source, /task70ExecutionAuthorized: false/);
  assert.match(source, /networkReadAuthorized: false/);
  assert.match(source, /crawlExecutionAuthorized: false/);
  assert.match(source, /productionDbWriteAuthorized: false/);
  assert.match(source, /publicSiteWrites: false/);
  assert.match(source, /orderingImpliesPriority: false/);
});

test("P9.1 v1 admits only non-mutating signal/crawl read-work classes", () => {
  assert.match(source, /"signal_refresh" \| "crawl_refresh"/);
  assert.doesNotMatch(source, /mutation_refresh|deployment|public_write|execute_action/);
});
