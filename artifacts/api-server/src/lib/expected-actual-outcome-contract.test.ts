import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./expected-actual-outcome.ts", import.meta.url), "utf8");

test("P10.5 contains no live DB, provider, timer, worker, outcome-loader or mutation runtime primitive", () => {
  assert.doesNotMatch(
    source,
    /operational-data|execution-store|measurement-attribution|task53-production-pilot|task54-persistent-apply/,
  );
  assert.doesNotMatch(source, /DATABASE_URL|process\.env|postgres\s*\(|drizzle|sql\s*\`/i);
  assert.doesNotMatch(source, /fetch\s*\(|axios|undici|got\s*\(/i);
  assert.doesNotMatch(
    source,
    /setTimeout|setInterval|cron|worker_threads|child_process|spawn\s*\(|fork\s*\(/,
  );
  assert.doesNotMatch(source, /Date\.now\s*\(|new Date\s*\(\s*\)/);
  assert.doesNotMatch(
    source,
    /mutateTask53ShopifyState|executeTask54PersistentApply|authorizeApprovedProposal/,
  );
});

test("P10.5 independently rebuilds exact P10.4 lineage", () => {
  assert.match(source, /buildExperimentHoldoutReport\(input\.experimentInput\)/);
  assert.match(source, /p10_4_experiment_integrity_mismatch/);
  assert.match(source, /EXPERIMENT_HOLDOUT_VERSION/);
});

test("P10.5 uses exact decimal arithmetic rather than floating point", () => {
  assert.match(source, /BigInt/);
  assert.match(source, /10n \*\* BigInt/);
  assert.match(source, /signedDifference/);
  assert.match(source, /above_expected/);
  assert.match(source, /equal_expected/);
  assert.match(source, /below_expected/);
  assert.doesNotMatch(source, /parseFloat|Number\s*\(|Math\./);
});

test("P10.5 binds actuals to exact expectation scope and after window", () => {
  assert.match(source, /canonicalJson\(scope\) !== canonicalJson\(expectation\.scope\)/);
  assert.match(source, /p10_5_actual_expectation_binding_mismatch/);
  assert.match(source, /experiment\.treatment\.afterWindow\.start/);
  assert.match(source, /experiment\.treatment\.afterWindow\.end/);
  assert.match(source, /p10_5_actual_outside_after_window/);
});

test("P10.5 encodes descriptive arithmetic without causal/statistical conclusions", () => {
  assert.match(source, /expectedValueIsCausalCounterfactual: false/);
  assert.match(source, /actualValueProvesActionImpact: false/);
  assert.match(source, /signedDifferenceIsCausalEffect: false/);
  assert.match(source, /comparisonRelationIsEvaluation: false/);
  assert.match(source, /percentageChangeCalculated: false/);
  assert.match(source, /treatmentVsHoldoutEffectCalculated: false/);
  assert.match(source, /differenceInDifferencesCalculated: false/);
  assert.match(source, /statisticalSignificanceCalculated: false/);
  assert.match(source, /confidenceIntervalCalculated: false/);
  assert.match(source, /causalAttributionPerformed: false/);
  assert.match(source, /recommendationGenerated: false/);
  assert.match(source, /rolloutDecisionGenerated: false/);
});

test("P10.5 keeps all runtime and mutation authority closed", () => {
  assert.match(source, /liveOutcomeLoadingAuthorized: false/);
  assert.match(source, /liveExperimentAssignmentAuthorized: false/);
  assert.match(source, /databaseReadsAuthorized: false/);
  assert.match(source, /databaseWritesAuthorized: false/);
  assert.match(source, /providerNetworkReadAuthorized: false/);
  assert.match(source, /providerWrites: false/);
  assert.match(source, /publicSiteWrites: false/);
  assert.match(source, /task51ExecutionAuthorized: false/);
  assert.match(source, /task53ExecutionAuthorized: false/);
  assert.match(source, /task54ExecutionAuthorized: false/);
  assert.match(source, /autonomousMutationAuthorized: false/);
  assert.match(source, /p98ImplementationAuthorized: false/);
  assert.match(source, /p106ImplementationAuthorized: false/);
  assert.match(source, /publicationAuthorized: false/);
});
