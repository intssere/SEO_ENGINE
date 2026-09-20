import assert from "node:assert/strict";
import test from "node:test";
import {
  P10_7_SYNTHETIC_IMPACT_FIXTURE,
  buildImpactWorkspaceModel,
  impactWorkspaceCapability,
  type ImpactWorkspaceFixture,
} from "./impact-workspace-model.js";

function cloneFixture(): ImpactWorkspaceFixture {
  return structuredClone(P10_7_SYNTHETIC_IMPACT_FIXTURE);
}

test("P10.7 builds a deterministic six-layer read-only projection", () => {
  const first = buildImpactWorkspaceModel(cloneFixture());
  const second = buildImpactWorkspaceModel(cloneFixture());

  assert.equal(first.modelFingerprint, second.modelFingerprint);
  assert.deepEqual(
    first.layers.map((layer) => layer.layer),
    ["p10.1", "p10.2", "p10.3", "p10.4", "p10.5", "p10.6"],
  );
  assert.equal(first.summary.lineageLayers, 6);
  assert.equal(first.summary.outcomes, 4);
  assert.equal(first.summary.calibrationSignals, 4);
  assert.equal(first.fixtureKind, "synthetic_read_only");
});

test("P10.7 preserves unavailable P10.5/P10.6 evidence explicitly", () => {
  const model = buildImpactWorkspaceModel(cloneFixture());
  const outcome = model.outcomes.find((row) => row.actualId === "actual-ctr")!;
  const signal = model.calibrations.find((row) => row.actualId === "actual-ctr")!;

  assert.equal(outcome.trackingState, "expected_unavailable");
  assert.equal(outcome.expectedValue, null);
  assert.equal(outcome.signedDifference, null);
  assert.equal(outcome.relation, null);
  assert.equal(signal.kind, "unavailable");
  assert.equal(model.summary.comparisonsUnavailable, 1);
  assert.equal(model.summary.calibrationUnavailable, 1);
});

test("P10.7 rejects duplicate actual identity", () => {
  const fixture = cloneFixture();
  fixture.outcomes.push(structuredClone(fixture.outcomes[0]!));

  assert.throws(
    () => buildImpactWorkspaceModel(fixture),
    /duplicate_impact_actual_id/,
  );
});

test("P10.7 rejects calibration signals without an exact outcome binding", () => {
  const fixture = cloneFixture();
  fixture.calibrations[0]!.actualFingerprint = "f".repeat(64);

  assert.throws(
    () => buildImpactWorkspaceModel(fixture),
    /impact_workspace_signal_actual_not_found/,
  );
});

test("P10.7 rejects calibration-to-outcome lineage mismatch", () => {
  const fixture = cloneFixture();
  fixture.calibrations[0]!.expectationFingerprint = "e".repeat(64);

  assert.throws(
    () => buildImpactWorkspaceModel(fixture),
    /impact_workspace_signal_outcome_mismatch/,
  );
});

test("P10.7 rejects recommendation mismatch", () => {
  const fixture = cloneFixture();
  fixture.calibrations[0]!.recommendationId = "recommendation-other";

  assert.throws(
    () => buildImpactWorkspaceModel(fixture),
    /impact_workspace_signal_recommendation_mismatch/,
  );
});

test("P10.7 rejects unsupported layer versions and broken parent binding", () => {
  const badVersion = cloneFixture();
  badVersion.layers[2]!.version = "p10.3-other";
  assert.throws(
    () => buildImpactWorkspaceModel(badVersion),
    /impact_workspace_layer_version_mismatch/,
  );

  const badParent = cloneFixture();
  badParent.layers[4]!.parentReportFingerprint = "a".repeat(64);
  assert.throws(
    () => buildImpactWorkspaceModel(badParent),
    /impact_workspace_parent_fingerprint_mismatch/,
  );
});

test("P10.7 row input order does not change the model fingerprint", () => {
  const first = cloneFixture();
  const second = cloneFixture();
  second.outcomes.reverse();
  second.calibrations.reverse();

  const firstModel = buildImpactWorkspaceModel(first);
  const secondModel = buildImpactWorkspaceModel(second);

  assert.equal(firstModel.modelFingerprint, secondModel.modelFingerprint);
  assert.deepEqual(firstModel.outcomes, secondModel.outcomes);
  assert.deepEqual(firstModel.calibrations, secondModel.calibrations);
});

test("P10.7 safety capability keeps runtime and mutation authority closed", () => {
  const capability = impactWorkspaceCapability();

  assert.equal(capability.syntheticFixtureOnly, true);
  assert.equal(capability.readOnly, true);
  assert.equal(capability.runtimeApiBindingAuthorized, false);
  assert.equal(capability.liveOutcomeLoadingAuthorized, false);
  assert.equal(capability.providerNetworkReadAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.recommendationMutationAuthorized, false);
  assert.equal(capability.modelTrainingAuthorized, false);
  assert.equal(capability.modelWeightUpdateAuthorized, false);
  assert.equal(capability.recommendationRankingMutationAuthorized, false);
  assert.equal(capability.policyMutationAuthorized, false);
  assert.equal(capability.task51ExecutionAuthorized, false);
  assert.equal(capability.task53ExecutionAuthorized, false);
  assert.equal(capability.task54ExecutionAuthorized, false);
  assert.equal(capability.autonomousMutationAuthorized, false);
  assert.equal(capability.p98ImplementationAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.workerEnabled, false);
  assert.equal(capability.publicationAuthorized, false);
});
