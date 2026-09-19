import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  P7_7_SYNTHETIC_AI_VISIBILITY_FIXTURE,
  aiVisibilityUiCapability,
  buildAiVisibilityUiModel,
  formatArithmeticDirection,
  formatVisibilityScore,
} from "./ai-visibility-ui-model.js";

test("P7.7 synthetic model derives deterministic summary and canonical ordering", () => {
  const model = buildAiVisibilityUiModel(P7_7_SYNTHETIC_AI_VISIBILITY_FIXTURE);

  assert.equal(model.fixtureKind, "synthetic_read_only");
  assert.deepEqual(model.summary, {
    crawlerAccessible: 1,
    crawlerTotal: 3,
    topics: 4,
    prompts: 6,
    promptSets: 2,
    answerObservations: 4,
    citedAnswers: 3,
    scoredProfiles: 2,
    unscorableProfiles: 1,
    projectedOpportunities: 2,
  });
  assert.deepEqual(model.crawlers.map((row) => row.botKey), [
    "crawler-alpha",
    "crawler-beta",
    "crawler-gamma",
  ]);
  assert.deepEqual(model.scores.map((row) => row.providerKey), [
    "provider-alpha",
    "provider-beta",
    "provider-gamma",
  ]);
});

test("irrelevant fixture row ordering cannot change P7.7 model output", () => {
  const reversed = structuredClone(P7_7_SYNTHETIC_AI_VISIBILITY_FIXTURE);
  reversed.crawlers.reverse();
  reversed.answers.reverse();
  reversed.comparisons.reverse();
  reversed.scores.reverse();
  reversed.opportunities.reverse();
  reversed.diagnostics = [...reversed.diagnostics].reverse();

  assert.deepEqual(
    buildAiVisibilityUiModel(reversed),
    buildAiVisibilityUiModel(P7_7_SYNTHETIC_AI_VISIBILITY_FIXTURE),
  );
});

test("null score remains distinct from explicit zero", () => {
  const model = buildAiVisibilityUiModel(P7_7_SYNTHETIC_AI_VISIBILITY_FIXTURE);
  const zero = model.scores.find((row) => row.providerKey === "provider-beta");
  const missing = model.scores.find((row) => row.providerKey === "provider-gamma");

  assert.equal(zero?.score100, 0);
  assert.equal(missing?.score100, null);
  assert.equal(formatVisibilityScore(zero?.score100 ?? null), "0.0");
  assert.equal(formatVisibilityScore(missing?.score100 ?? null), "Unscorable");
});

test("history direction is arithmetic only and carries no improvement/regression language", () => {
  const model = buildAiVisibilityUiModel(P7_7_SYNTHETIC_AI_VISIBILITY_FIXTURE);
  const labels = model.scores.map((row) => formatArithmeticDirection(row));

  assert.deepEqual(labels, [
    "+4.0 arithmetic delta",
    "0.0 arithmetic delta",
    "No comparable prior score",
  ]);

  const joined = labels.join(" ").toLowerCase();
  assert.doesNotMatch(joined, /improv|regress|better|worse|winner|best/);
});

test("P7.7 semantics prohibit cross-provider ranking/winner interpretation", () => {
  const model = buildAiVisibilityUiModel(P7_7_SYNTHETIC_AI_VISIBILITY_FIXTURE);
  const semantics = P7_7_SYNTHETIC_AI_VISIBILITY_FIXTURE.semantics;

  assert.equal(semantics.scoreCrossProviderModelWinnerComparable, false);
  assert.equal(semantics.historyDirectionImpliesImprovementOrRegression, false);
  assert.equal(semantics.promptMembershipImpliesDemandPopularityVolumeOrPriority, false);
  assert.ok(
    model.guardrails.some((value) =>
      value.includes("no cross-provider winner is inferred")),
  );
});

test("projected P6.1 AI opportunity stays explicit-request-only and non-executable", () => {
  const model = buildAiVisibilityUiModel(P7_7_SYNTHETIC_AI_VISIBILITY_FIXTURE);

  for (const row of model.opportunities) {
    assert.equal(row.explicitRequest, true);
    assert.equal(row.p6Score, null);
    assert.equal(row.recommendationGenerated, false);
    assert.equal(row.executionAuthorized, false);
  }

  assert.ok(
    model.guardrails.some((value) =>
      value.includes("not a recommendation, approval, priority or execution authorization")),
  );
});

test("fixture semantic contradictions and invalid lineage values fail closed", () => {
  const badSemantics = structuredClone(P7_7_SYNTHETIC_AI_VISIBILITY_FIXTURE);
  (badSemantics.semantics as any).robotsAllowanceIsTrainingConsent = true;
  assert.throws(
    () => buildAiVisibilityUiModel(badSemantics),
    /ai_visibility_semantic_contradiction/,
  );

  const badScore = structuredClone(P7_7_SYNTHETIC_AI_VISIBILITY_FIXTURE);
  badScore.scores[0]!.delta100 = 5;
  assert.throws(
    () => buildAiVisibilityUiModel(badScore),
    /ai_visibility_score_history_delta_mismatch/,
  );

  const badOpportunity = structuredClone(P7_7_SYNTHETIC_AI_VISIBILITY_FIXTURE);
  (badOpportunity.opportunities[0] as any).executionAuthorized = true;
  assert.throws(
    () => buildAiVisibilityUiModel(badOpportunity),
    /ai_visibility_opportunity_semantics_mismatch/,
  );
});

test("P7.7 capability keeps all live/runtime/persistence/execution/publication gates closed", () => {
  const capability = aiVisibilityUiCapability();

  assert.equal(capability.readOnly, true);
  assert.equal(capability.syntheticFixtureOnly, true);
  assert.equal(capability.defaultOff, true);
  assert.equal(capability.liveProviderCallsAuthorized, false);
  assert.equal(capability.providerCredentialUseAuthorized, false);
  assert.equal(capability.publicSiteReadsAuthorized, false);
  assert.equal(capability.publicSiteWritesAuthorized, false);
  assert.equal(capability.runtimeApiBindingAuthorized, false);
  assert.equal(capability.answerCollectionAuthorized, false);
  assert.equal(capability.persistenceAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.p6ScoringAuthorized, false);
  assert.equal(capability.p6PrioritizationAuthorized, false);
  assert.equal(capability.p6ActionabilityAuthorized, false);
  assert.equal(capability.executionAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.workerEnabled, false);
  assert.equal(capability.publicationAuthorized, false);
});

test("P7.7 frontend model contains no live network, DB, persistence or execution primitives", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(here, "ai-visibility-ui-model.ts"), "utf8");

  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(source, /chat\.completions|responses\.create|embeddings\.create/);
  assert.doesNotMatch(source, /startCrawl|resumeCrawl|executeCompetitorPilot|executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(source, /setTimeout|setInterval|queueMicrotask/);
});
