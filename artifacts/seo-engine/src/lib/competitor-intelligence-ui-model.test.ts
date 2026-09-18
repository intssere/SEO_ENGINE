import assert from "node:assert/strict";
import test from "node:test";
import {
  P5_7_SYNTHETIC_REPORT_FIXTURE,
  buildCompetitorIntelligenceUiModel,
  competitorIntelligenceUiCapability,
  competitorStateTone,
  formatNullableNumber,
  formatPercent,
  linkGapTone,
  trendTone,
} from "./competitor-intelligence-ui-model";

test("P5.7 synthetic report derives deterministic summary without scoring", () => {
  const model = buildCompetitorIntelligenceUiModel(P5_7_SYNTHETIC_REPORT_FIXTURE);

  assert.equal(model.fixtureKind, "synthetic_read_only");
  assert.equal(model.summary.reviewedCompetitors, 2);
  assert.equal(model.summary.serpTopics, 4);
  assert.equal(model.summary.observedTopicGaps, 2);
  assert.equal(model.summary.linkGapReferringDomains, 2);
  assert.equal(model.summary.diagnostics, 0);
  assert.equal(model.summary.opportunityScore, null);
  assert.deepEqual(
    model.competitors.map((row) => row.domain),
    ["competitor-a.test", "competitor-b.test"],
  );
  assert.deepEqual(
    model.topics.map((row) => row.topic),
    ["amber perfume", "citrus perfume", "oud perfume", "vanilla perfume"],
  );
  assert.deepEqual(
    model.links.map((row) => row.referringDomain),
    ["a-only.example", "b-only.example", "shared-source.example"],
  );
});

test("null authority stays unavailable while explicit numeric authority is preserved", () => {
  const model = buildCompetitorIntelligenceUiModel(P5_7_SYNTHETIC_REPORT_FIXTURE);
  const a = model.competitors.find((row) => row.domain === "competitor-a.test")!;
  const b = model.competitors.find((row) => row.domain === "competitor-b.test")!;

  assert.equal(a.backlinkAuthority?.value, 65);
  assert.equal(b.backlinkAuthority?.value, null);
  assert.equal(formatNullableNumber(a.backlinkAuthority?.value ?? null), "65");
  assert.equal(formatNullableNumber(b.backlinkAuthority?.value ?? null), "Unavailable");
});

test("semantic and gap tones remain descriptive and non-ranking", () => {
  assert.equal(competitorStateTone("competitor_only"), "warning");
  assert.equal(competitorStateTone("shared"), "info");
  assert.equal(competitorStateTone("owned_only"), "success");
  assert.equal(competitorStateTone("unmeasured"), "neutral");

  assert.equal(linkGapTone("single_competitor_gap"), "warning");
  assert.equal(linkGapTone("shared_competitor_gap"), "warning");
  assert.equal(linkGapTone("universal_competitor_gap"), "warning");
  assert.equal(linkGapTone("shared_coverage"), "info");
  assert.equal(linkGapTone("owned_exclusive"), "success");

  assert.equal(trendTone("rising"), "info");
  assert.equal(trendTone("falling"), "warning");
  assert.equal(trendTone("flat"), "neutral");
  assert.equal(formatPercent(0.5), "50.0%");
});

test("irrelevant row ordering cannot change model ordering or derived totals", () => {
  const reversed = structuredClone(P5_7_SYNTHETIC_REPORT_FIXTURE);
  reversed.competitorVisibility.reverse();
  reversed.topicGaps.reverse();
  reversed.pageSemanticGaps.reverse();
  reversed.linkGaps.reverse();
  reversed.diagnostics = ["zeta", "alpha", "zeta"];

  const model = buildCompetitorIntelligenceUiModel(reversed);
  assert.deepEqual(
    model.competitors.map((row) => row.domain),
    ["competitor-a.test", "competitor-b.test"],
  );
  assert.deepEqual(
    model.topics.map((row) => row.topic),
    ["amber perfume", "citrus perfume", "oud perfume", "vanilla perfume"],
  );
  assert.deepEqual(model.diagnostics, ["alpha", "zeta"]);
  assert.equal(model.summary.diagnostics, 2);
});

test("fixture validation fails closed on coverage and semantics contradictions", () => {
  const badCoverage = structuredClone(P5_7_SYNTHETIC_REPORT_FIXTURE);
  badCoverage.coverage.reviewedCompetitorCount = 3;
  assert.throws(
    () => buildCompetitorIntelligenceUiModel(badCoverage),
    /competitor_coverage_mismatch/,
  );

  const duplicate = structuredClone(P5_7_SYNTHETIC_REPORT_FIXTURE);
  duplicate.competitorDomains = ["competitor-a.test", "competitor-a.test"];
  assert.throws(
    () => buildCompetitorIntelligenceUiModel(duplicate),
    /duplicate_competitor_domain/,
  );

  const invalidSemantics = structuredClone(P5_7_SYNTHETIC_REPORT_FIXTURE) as any;
  invalidSemantics.semantics.observedTopicVisibilityRatioIsMarketShare = true;
  assert.throws(
    () => buildCompetitorIntelligenceUiModel(invalidSemantics),
    /visibility_semantics_mismatch/,
  );
});

test("P5.7 capability keeps all runtime/live mutation gates closed", () => {
  const capability = competitorIntelligenceUiCapability();
  assert.equal(capability.readOnly, true);
  assert.equal(capability.syntheticFixtureOnly, true);
  assert.equal(capability.defaultOff, true);
  assert.equal(capability.liveProviderReadsAuthorized, false);
  assert.equal(capability.publicSiteReadsAuthorized, false);
  assert.equal(capability.runtimeApiBindingAuthorized, false);
  assert.equal(capability.sourceAdmissionAuthorized, false);
  assert.equal(capability.targetMutationAuthorized, false);
  assert.equal(capability.task64ExecutionAuthorized, false);
  assert.equal(capability.task70ExecutionAuthorized, false);
  assert.equal(capability.persistenceAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.workerEnabled, false);
  assert.equal(capability.opportunityScoringIncluded, false);
  assert.equal(capability.publicationAuthorized, false);
});
