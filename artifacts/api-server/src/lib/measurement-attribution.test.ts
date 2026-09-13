import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMeasurementImpact, type MeasurementEvaluationInput } from "./measurement-attribution.js";

const base: MeasurementEvaluationInput = {
  deploymentStatus: "completed",
  deployedAt: "2026-07-01T12:00:00.000Z",
  lifecycle: "production_change_verified_live",
  deploymentMeasurementEligible: true,
  executionMeasurementEligible: true,
  verificationStatus: "verified",
  pageId: "page-1",
  completedRollbackCount: 0,
  baseline: { observedDays: 28, clicks: 100, impressions: 1000, ctr: 0.1, averagePosition: 8 },
  comparison: { observedDays: 28, clicks: 115, impressions: 1100, ctr: 115 / 1100, averagePosition: 7.5 },
  now: "2026-08-15T12:00:00.000Z",
};

test("rolled-back or non-persistent deployments fail closed as not eligible", () => {
  const result = evaluateMeasurementImpact({
    ...base,
    lifecycle: "production_pilot_verified_and_rolled_back",
    deploymentMeasurementEligible: false,
    executionMeasurementEligible: false,
    completedRollbackCount: 1,
  });
  assert.equal(result.measurementEligible, false);
  assert.equal(result.measurementState, "not_eligible");
  assert.equal(result.recommendation, "not_eligible");
  assert.ok(result.eligibilityBlockers.includes("change_not_verified_live"));
  assert.ok(result.eligibilityBlockers.includes("rollback_record_present"));
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.publicSiteWrites, false);
  assert.equal(result.automaticTransition, false);
  assert.equal(result.causalAttribution, false);
});

test("eligible live changes remain measurement pending until cooldown completes", () => {
  const result = evaluateMeasurementImpact({
    ...base,
    deployedAt: "2026-09-01T10:00:00.000Z",
    now: "2026-09-13T10:00:00.000Z",
    comparison: { observedDays: 11, clicks: 40, impressions: 400, ctr: 0.1, averagePosition: 8 },
  });
  assert.equal(result.measurementEligible, true);
  assert.equal(result.cooldownComplete, false);
  assert.equal(result.measurementState, "pending");
  assert.equal(result.recommendation, "measurement_pending");
});

test("complete positive observational windows produce an advisory retain recommendation", () => {
  const result = evaluateMeasurementImpact(base);
  assert.equal(result.measurementEligible, true);
  assert.equal(result.cooldownComplete, true);
  assert.equal(result.confidence, "high");
  assert.equal(result.measurementState, "ready");
  assert.equal(result.recommendation, "retain");
  assert.equal(result.advisoryOnly, true);
  assert.equal(result.causalAttribution, false);
});

test("multiple moderate negative signals produce replace_candidate only", () => {
  const result = evaluateMeasurementImpact({
    ...base,
    comparison: { observedDays: 28, clicks: 82, impressions: 820, ctr: 0.10, averagePosition: 10.5 },
  });
  assert.equal(result.recommendation, "replace_candidate");
  assert.equal(result.recommendationBasis, "multiple_observational_metrics_declined");
  assert.equal(result.executionAuthorized, false);
});

test("strong multi-signal regression is advisory rollback_candidate and never executable", () => {
  const result = evaluateMeasurementImpact({
    ...base,
    comparison: { observedDays: 28, clicks: 60, impressions: 700, ctr: 60 / 700, averagePosition: 11.5 },
  });
  assert.equal(result.recommendation, "rollback_candidate");
  assert.equal(result.recommendationBasis, "multi_signal_observational_regression");
  assert.equal(result.advisoryOnly, true);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.publicSiteWrites, false);
});

test("insufficient persisted search coverage fails closed to measurement_pending", () => {
  const result = evaluateMeasurementImpact({
    ...base,
    baseline: { observedDays: 10, clicks: 4, impressions: 40, ctr: 0.1, averagePosition: 8 },
    comparison: { observedDays: 10, clicks: 2, impressions: 20, ctr: 0.1, averagePosition: 9 },
  });
  assert.equal(result.confidence, "low");
  assert.equal(result.measurementState, "pending");
  assert.equal(result.recommendation, "measurement_pending");
});
