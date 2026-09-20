import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./experiment-holdout.ts", import.meta.url), "utf8");

test("P10.4 contains no database, live measurement, provider, timer, assignment or mutation runtime primitive", () => {
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

test("P10.4 independently rebuilds exact P10.2 and P10.3 lineage", () => {
  assert.match(source, /buildActionAttribution\(input\.timeline\)/);
  assert.match(source, /buildActionWindowConfounderReport\(input\.treatmentAnalysisInput\)/);
  assert.match(source, /p10_2_attribution_integrity_mismatch/);
  assert.match(source, /p10_3_treatment_integrity_mismatch/);
  assert.match(source, /p10_4_treatment_lineage_binding_mismatch/);
  assert.match(source, /ACTION_ATTRIBUTION_VERSION/);
  assert.match(source, /WINDOW_CONFOUNDER_VERSION/);
  assert.match(source, /UNIFIED_CHANGE_TIMELINE_VERSION/);
});

test("P10.4 reuses exact P10.3 windows and supplied holdout scope", () => {
  assert.match(source, /rebuiltTreatment\.windows\.before/);
  assert.match(source, /rebuiltTreatment\.windows\.after/);
  assert.match(source, /canonicalJson\(scope\) !== canonicalJson\(unit\.scope\)/);
  assert.match(source, /p10_4_observation_scope_mismatch/);
  assert.doesNotMatch(source, /similarity|fuzzy|semantic expansion|random\s*\(/i);
});

test("P10.4 structural flags remain descriptive and non-causal", () => {
  assert.match(source, /cross_arm_scope_overlap/);
  assert.match(source, /holdout_action_overlap/);
  assert.match(source, /treatment_confounder_present/);
  assert.match(source, /holdout_missing_before_observation/);
  assert.match(source, /holdout_missing_after_observation/);
  assert.match(source, /externallyRandomizedDeclarationVerified: false/);
  assert.match(source, /externallyMatchedDeclarationVerified: false/);
  assert.match(source, /holdoutPresenceEstablishesComparability: false/);
  assert.match(source, /scopeDisjointnessEstablishesExchangeability: false/);
  assert.match(source, /beforeAfterTimingEstablishesCausality: false/);
  assert.match(source, /contaminationFlagsPerformCausalAdjustment: false/);
  assert.match(source, /treatmentEffectCalculated: false/);
  assert.match(source, /statisticalSignificanceCalculated: false/);
  assert.match(source, /causalAttributionPerformed: false/);
  assert.match(source, /rolloutRecommendationGenerated: false/);
});

test("P10.4 keeps all runtime and mutation authority closed", () => {
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
  assert.match(source, /p105ImplementationAuthorized: false/);
  assert.match(source, /publicationAuthorized: false/);
});
