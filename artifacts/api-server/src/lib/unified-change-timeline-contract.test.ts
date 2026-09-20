import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./unified-change-timeline.ts", import.meta.url), "utf8");

test("P10.1 contains no database, provider, environment, timer or mutation runtime primitive", () => {
  assert.doesNotMatch(source, /operational-data|execution-store|task53-production-pilot|task54-persistent-apply|measurement-attribution/);
  assert.doesNotMatch(source, /DATABASE_URL|process\.env|postgres\s*\(|drizzle|sql\s*\`/i);
  assert.doesNotMatch(source, /fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(source, /setTimeout|setInterval|cron|worker_threads|child_process|spawn\s*\(|fork\s*\(/);
  assert.doesNotMatch(source, /Date\.now\s*\(|new Date\s*\(\s*\)/);
  assert.doesNotMatch(source, /mutateTask53ShopifyState|executeTask54PersistentApply|authorizeApprovedProposal/);
});

test("P10.1 binds exact P6.7 lifecycle validation without importing execution runtimes", () => {
  assert.match(source, /buildOpportunityLifecycle/);
  assert.match(source, /p67_lifecycle_integrity_mismatch/);
  assert.match(source, /eventId: lifecycleEvent\.eventId/);
  assert.match(source, /eventFingerprint: lifecycleEvent\.eventFingerprint/);
});

test("P10.1 encodes non-causal and no-authority guards", () => {
  assert.match(source, /causalAttributionPerformed: false/);
  assert.match(source, /metricMovementAttributedToAction: false/);
  assert.match(source, /temporalProximityCreatesLineage: false/);
  assert.match(source, /orderingCreatesPriority: false/);
  assert.match(source, /measurementImpactCalculated: false/);
  assert.match(source, /databaseWritesAuthorized: false/);
  assert.match(source, /providerWrites: false/);
  assert.match(source, /publicSiteWrites: false/);
  assert.match(source, /task51ExecutionAuthorized: false/);
  assert.match(source, /task53ExecutionAuthorized: false/);
  assert.match(source, /task54ExecutionAuthorized: false/);
  assert.match(source, /autonomousMutationAuthorized: false/);
  assert.match(source, /p98ImplementationAuthorized: false/);
  assert.match(source, /publicationAuthorized: false/);
});

test("P10.1 makes duplicate conflict and deterministic ordering explicit", () => {
  assert.match(source, /timeline_source_event_conflict/);
  assert.match(source, /EVENT_KIND_PRECEDENCE/);
  assert.match(source, /eventFingerprint\.localeCompare/);
  assert.match(source, /unknownValuesRemainNull: true/);
});
