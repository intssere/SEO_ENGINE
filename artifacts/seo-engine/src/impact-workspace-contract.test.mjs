import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(here, "pages", "impact.tsx"), "utf8");
const css = readFileSync(join(here, "pages", "impact.css"), "utf8");
const model = readFileSync(join(here, "lib", "impact-workspace-model.ts"), "utf8");
const app = readFileSync(join(here, "App.tsx"), "utf8");
const navigation = JSON.parse(readFileSync(join(here, "navigation.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"));

test("P10.7 preserves the Impact route while P12.1 keeps it engineering-only", () => {
  assert.match(app, /<Route path="\/impact" component=\{ImpactPage\}/);
  const primaryPaths = navigation.flatMap((group) =>
    group.items.map((item) => item.path),
  );
  assert.equal(primaryPaths.includes("/impact"), false);
});

test("P10.7 is visibly synthetic, read-only, non-causal and non-executable", () => {
  assert.match(page, /SYNTHETIC READ-ONLY/);
  assert.match(page, /NO CAUSAL VERDICT/);
  assert.match(page, /NO EXECUTION/);
  assert.match(page, /do not establish causal impact/);
  assert.match(page, /not recommendation quality, reward\/penalty/);
  assert.match(page, /Arithmetic only · not success\/failure/);
});

test("P10.7 keeps P10.1 through P10.6 layers explicit", () => {
  for (const value of [
    "P10.1 + P10.2 DIRECT LINEAGE",
    "P10.3 + P10.4 ANALYSIS FRAME",
    "P10.5 EXPECTED VS ACTUAL",
    "P10.6 DIRECTIONAL CALIBRATION",
  ]) {
    assert.ok(page.includes(value), value);
  }
  for (const value of [
    "p10.1-unified-change-timeline-v1",
    "p10.2-action-attribution-v1",
    "p10.3-window-confounder-v1",
    "p10.4-experiment-holdout-v1",
    "p10.5-expected-actual-v1",
    "p10.6-recommendation-calibration-v1",
  ]) {
    assert.ok(model.includes(value), value);
  }
});

test("P10.7 frontend contains no live API, network, database or mutation primitive", () => {
  const source = [page, model].join("\n");
  assert.doesNotMatch(source, /@workspace\/api-client-react/);
  assert.doesNotMatch(source, /useListDeployments|useGetImpact|useMutation/);
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(source, /setInterval|setTimeout|worker_threads|child_process/);
  assert.doesNotMatch(source, /executeTask5[134]|providerWrite\s*\(|publicSiteWrite\s*\(/i);
});

test("P10.7 model hard-codes runtime, learning-update and mutation gates closed", () => {
  for (const value of [
    "syntheticFixtureOnly: true",
    "readOnly: true",
    "runtimeApiBindingAuthorized: false",
    "liveOutcomeLoadingAuthorized: false",
    "providerNetworkReadAuthorized: false",
    "databaseReadsAuthorized: false",
    "databaseWritesAuthorized: false",
    "providerWrites: false",
    "publicSiteWrites: false",
    "recommendationMutationAuthorized: false",
    "modelTrainingAuthorized: false",
    "modelWeightUpdateAuthorized: false",
    "recommendationRankingMutationAuthorized: false",
    "policyMutationAuthorized: false",
    "task51ExecutionAuthorized: false",
    "task53ExecutionAuthorized: false",
    "task54ExecutionAuthorized: false",
    "autonomousMutationAuthorized: false",
    "p98ImplementationAuthorized: false",
    "schedulerEnabled: false",
    "workerEnabled: false",
    "publicationAuthorized: false",
  ]) {
    assert.ok(model.includes(value), value);
  }
});

test("P10.7 interpretation semantics explicitly reject causal, reward and success/failure upgrades", () => {
  for (const value of [
    "chronologyIsCausality: false",
    "associationIsCausality: false",
    "windowMembershipIsCausalEffect: false",
    "holdoutPresenceProvesCounterfactualValidity: false",
    "expectedActualDifferenceIsImpact: false",
    "calibrationSignalIsRecommendationQuality: false",
    "calibrationSignalIsRewardOrPenalty: false",
    "arithmeticRelationIsSuccessOrFailure: false",
    "structuralFlagAbsenceCreatesConfidence: false",
  ]) {
    assert.ok(model.includes(value), value);
  }
});

test("P10.7 workspace defines responsive desktop/tablet/mobile layout rules", () => {
  assert.match(css, /\.impactLineageStrip/);
  assert.match(css, /\.impactSummaryGrid/);
  assert.match(css, /\.impactContextGrid/);
  assert.match(css, /\.impactBottomGrid/);
  assert.match(css, /@media\(max-width:1180px\)/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:820px\)/);
  assert.match(css, /@media\(max-width:640px\)/);
});

test("P10.7 tests are registered in the frontend package command", () => {
  assert.match(packageJson.scripts.test, /impact-workspace-contract\.test\.mjs/);
  assert.match(packageJson.scripts.test, /impact-workspace-model\.test\.ts/);
});