import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./action-window-confounder.ts", import.meta.url), "utf8");

test("P10.3 contains no database, live measurement, provider, timer or mutation runtime primitive", () => {
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

test("P10.3 independently rebuilds P10.2 from exact P10.1 input", () => {
  assert.match(source, /buildActionAttribution\(timeline\)/);
  assert.match(source, /p10_2_attribution_integrity_mismatch/);
  assert.match(source, /p10_3_timeline_attribution_binding_mismatch/);
  assert.match(source, /ACTION_ATTRIBUTION_VERSION/);
  assert.match(source, /UNIFIED_CHANGE_TIMELINE_VERSION/);
});

test("P10.3 anchors only to exact retained-live action evidence", () => {
  assert.match(source, /event\.eventFingerprint === anchorFingerprint/);
  assert.match(source, /event\.lineage\.actionId === actionId/);
  assert.match(source, /verified_change_retained_live/);
  assert.match(source, /p10_3_anchor_required_for_windows/);
  assert.match(source, /p10_3_before_window_must_precede_anchor/);
  assert.match(source, /p10_3_after_window_must_follow_anchor/);
});

test("P10.3 observation scope is exact P10.2 association only", () => {
  assert.match(source, /action\.pages\.status !== "direct"/);
  assert.match(source, /action\.queries\.status !== "direct"/);
  assert.match(source, /action\.categories\.status !== "direct"/);
  assert.match(source, /page\.pageId === scope\.pageId/);
  assert.match(source, /page\.url === scope\.url/);
  assert.doesNotMatch(source, /includes\(scope\.query\)|startsWith\(scope\.url\)|similarity|fuzzy/i);
});

test("P10.3 encodes descriptive confounders without impact or recommendations", () => {
  assert.match(source, /provider_write_outcome_uncertain/);
  assert.match(source, /rollback_started/);
  assert.match(source, /manual_intervention_required/);
  assert.match(source, /overlapping_direct_action/);
  assert.match(source, /external_supplied/);
  assert.match(source, /confounderOverlapCreatesCausalAdjustment: false/);
  assert.match(source, /metricDeltaCalculated: false/);
  assert.match(source, /recommendationGenerated: false/);
  assert.match(source, /causalAttributionPerformed: false/);
  assert.match(source, /impactCalculated: false/);
});

test("P10.3 keeps all runtime and mutation authority closed", () => {
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
  assert.match(source, /p104ImplementationAuthorized: false/);
  assert.match(source, /publicationAuthorized: false/);
});
