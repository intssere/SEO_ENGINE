import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./recommendation-calibration.ts", import.meta.url),
  "utf8",
);

test("P10.6 contains no live DB, provider, timer, worker, training or mutation runtime primitive", () => {
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

test("P10.6 independently rebuilds exact P10.5 lineage", () => {
  assert.match(source, /buildExpectedActualOutcomeReport\(input\.outcomeInput\)/);
  assert.match(source, /p10_5_outcome_integrity_mismatch/);
  assert.match(source, /EXPECTED_ACTUAL_OUTCOME_VERSION/);
});

test("P10.6 binds calibration only through exact same-action recommendation lineage", () => {
  assert.match(
    source,
    /event\.lineage\.actionId === outcome\.treatmentActionId/,
  );
  assert.match(source, /p10_6_recommendation_lineage_incomplete/);
  assert.match(source, /p10_6_recommendation_lineage_conflict/);
  assert.match(source, /p10_6_definition_recommendation_mismatch/);
  assert.match(source, /p10_6_calibration_requires_treatment_expectation/);
});

test("P10.6 directional signals remain bounded and non-aggregating", () => {
  assert.match(source, /same_as_declared_direction/);
  assert.match(source, /opposite_declared_direction/);
  assert.match(source, /equal_expected/);
  assert.match(source, /neutral_direction/);
  assert.match(source, /unavailable/);
  assert.match(source, /noSignalAggregation: true/);
  assert.match(source, /multipleActualsRemainIndependent: true/);
  assert.match(source, /trendInferred: false/);
  assert.doesNotMatch(source, /average|majority|weighted score|win rate/i);
});

test("P10.6 explicitly prevents reward, ranking, model, policy and causal conclusions", () => {
  assert.match(source, /directionalSignalIsRecommendationQuality: false/);
  assert.match(source, /directionalSignalIsRewardOrPenalty: false/);
  assert.match(source, /rewardScoreCalculated: false/);
  assert.match(source, /recommendationScoreCalculated: false/);
  assert.match(source, /recommendationRankRecalculated: false/);
  assert.match(source, /modelParametersUpdated: false/);
  assert.match(source, /modelWeightsUpdated: false/);
  assert.match(source, /policyUpdated: false/);
  assert.match(source, /promptTemplateUpdated: false/);
  assert.match(source, /causalAttributionPerformed: false/);
  assert.match(source, /rolloutRecommendationGenerated: false/);
  assert.match(source, /autonomousTransitionGenerated: false/);
});

test("P10.6 keeps all runtime and mutation authority closed", () => {
  assert.match(source, /liveOutcomeLoadingAuthorized: false/);
  assert.match(source, /databaseReadsAuthorized: false/);
  assert.match(source, /databaseWritesAuthorized: false/);
  assert.match(source, /providerNetworkReadAuthorized: false/);
  assert.match(source, /providerWrites: false/);
  assert.match(source, /publicSiteWrites: false/);
  assert.match(source, /recommendationPersistenceAuthorized: false/);
  assert.match(source, /recommendationMutationAuthorized: false/);
  assert.match(source, /modelTrainingAuthorized: false/);
  assert.match(source, /modelWeightUpdateAuthorized: false/);
  assert.match(source, /recommendationRankingMutationAuthorized: false/);
  assert.match(source, /policyMutationAuthorized: false/);
  assert.match(source, /task51ExecutionAuthorized: false/);
  assert.match(source, /task53ExecutionAuthorized: false/);
  assert.match(source, /task54ExecutionAuthorized: false/);
  assert.match(source, /autonomousMutationAuthorized: false/);
  assert.match(source, /p98ImplementationAuthorized: false/);
  assert.match(source, /p107ImplementationAuthorized: false/);
  assert.match(source, /publicationAuthorized: false/);
});
