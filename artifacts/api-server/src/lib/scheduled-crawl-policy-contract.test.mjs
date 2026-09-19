import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "scheduled-crawl-policy.ts"), "utf8");

test("P9.3 is a deterministic policy review with no timer, environment, DB, network, or runtime execution primitive", () => {
  assert.doesNotMatch(source, /Date\.now\s*\(/);
  assert.doesNotMatch(source, /new Date\s*\(\s*\)/);
  assert.doesNotMatch(source, /setInterval|setTimeout|cron|node-cron/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|postgres\s*\(/);
  assert.doesNotMatch(source, /fetch\s*\(|https?:\/\//);
  assert.doesNotMatch(source, /advanceCrawlCheckpoint|nextCrawlResumeWork/);
  assert.doesNotMatch(source, /signal-collection-execution|task53-|task54-/);
});

test("P9.3 composes only certified P2 crawl evidence and P9.1 schedule semantics", () => {
  assert.match(source, /crawl-history-comparison\.js/);
  assert.match(source, /full-site-crawl-certification\.js/);
  assert.match(source, /incremental-recrawl-planner\.js/);
  assert.match(source, /read-scheduler-queue\.js/);
  assert.match(source, /workClass: "crawl_refresh"/);
  assert.match(source, /buildFullSiteCrawlCertification/);
  assert.match(source, /compareFullSiteCrawlHistory/);
  assert.match(source, /buildIncrementalRecrawlPlan/);
});

test("P9.3 keeps all runtime, crawl, persistence, mutation, and publication gates closed", () => {
  assert.match(source, /architectureOnly: true/);
  assert.match(source, /deterministicProjectionOnly: true/);
  assert.match(source, /firstPartyCrawlPolicyOnly: true/);
  assert.match(source, /materializationReviewOnly: true/);
  assert.match(source, /p2SafetyControlsRequired: true/);
  assert.match(source, /fullReconciliationFallbackPreserved: true/);
  assert.match(source, /timerActivated: false/);
  assert.match(source, /schedulerActivated: false/);
  assert.match(source, /durableEnqueueAuthorized: false/);
  assert.match(source, /queueReservationAuthorized: false/);
  assert.match(source, /workerEnabled: false/);
  assert.match(source, /batchExecutorEnabled: false/);
  assert.match(source, /retryLoopEnabled: false/);
  assert.match(source, /sitemapNetworkFetchingAuthorized: false/);
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
