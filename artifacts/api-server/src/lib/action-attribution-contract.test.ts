import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./action-attribution.ts", import.meta.url), "utf8");

test("P10.2 contains no database, provider, environment, timer or mutation runtime primitive", () => {
  assert.doesNotMatch(source, /operational-data|execution-store|task53-production-pilot|task54-persistent-apply|measurement-attribution/);
  assert.doesNotMatch(source, /DATABASE_URL|process\.env|postgres\s*\(|drizzle|sql\s*\`/i);
  assert.doesNotMatch(source, /fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(source, /setTimeout|setInterval|cron|worker_threads|child_process|spawn\s*\(|fork\s*\(/);
  assert.doesNotMatch(source, /Date\.now\s*\(|new Date\s*\(\s*\)/);
  assert.doesNotMatch(source, /mutateTask53ShopifyState|executeTask54PersistentApply|authorizeApprovedProposal/);
});

test("P10.2 verifies exact P10.1 input and joins only explicit action IDs", () => {
  assert.match(source, /buildUnifiedChangeTimeline/);
  assert.match(source, /p10_1_timeline_integrity_mismatch/);
  assert.match(source, /const actionId = event\.lineage\.actionId/);
  assert.match(source, /if \(actionId === null\) continue/);
  assert.doesNotMatch(source, /actionPlanId.*Map|opportunityId.*Map|occurredAt.*Map/);
});

test("P10.2 reads association dimensions only from explicit P10.1 fields", () => {
  assert.match(source, /event\.target\?\.pageId/);
  assert.match(source, /event\.target\?\.url/);
  assert.match(source, /event\.associations\.query/);
  assert.match(source, /event\.associations\.category/);
  assert.match(source, /pagePathInferencePerformed: false/);
  assert.match(source, /resourceKindCreatesCategory: false/);
  assert.match(source, /sharedActionPlanCreatesAssociation: false/);
  assert.match(source, /temporalProximityCreatesAssociation: false/);
});

test("P10.2 encodes non-causal and no-authority guards", () => {
  assert.match(source, /causalAttributionPerformed: false/);
  assert.match(source, /impactCalculated: false/);
  assert.match(source, /measurementMovementCreatesAssociation: false/);
  assert.match(source, /databaseWritesAuthorized: false/);
  assert.match(source, /providerWrites: false/);
  assert.match(source, /publicSiteWrites: false/);
  assert.match(source, /task51ExecutionAuthorized: false/);
  assert.match(source, /task53ExecutionAuthorized: false/);
  assert.match(source, /task54ExecutionAuthorized: false/);
  assert.match(source, /autonomousMutationAuthorized: false/);
  assert.match(source, /p98ImplementationAuthorized: false/);
  assert.match(source, /p103ImplementationAuthorized: false/);
  assert.match(source, /publicationAuthorized: false/);
});
