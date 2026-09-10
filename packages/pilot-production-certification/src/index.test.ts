import test from "node:test";
import assert from "node:assert/strict";
import { assertProductionCertified, evaluateProductionCertification } from "./index.js";

const base = {
  siteDomain: "diamondshelf.us",
  softwareBaselineGreen: true,
  runtimeDatabaseReady: true,
  readOnlyConnectionsVerified: true,
  realBaselineCertified: true,
  opportunityRunCompleted: true,
  dashboardLiveDataVerified: true,
  dryRunCompleted: true,
  controlledWritePathVerified: true,
  controlledProductionActionCompleted: true,
  controlledProductionActionVerified: true,
  measurementCompleted: true,
  guardedAutonomyGateVerified: true,
  unresolvedRegressions: 0,
  pendingVerifications: 0,
  certificationActor: "operator-1",
  certificationRef: "cert-2026-09-10",
  certifiedAt: "2026-09-10T13:30:00Z",
};

test("full evidenced chain can reach PILOT_CERTIFIED", () => {
  const result = evaluateProductionCertification(base);
  assert.equal(result.status, "PILOT_CERTIFIED");
  assert.equal(result.productionReady, true);
  assert.doesNotThrow(() => assertProductionCertified(result));
});

test("CI/software readiness alone cannot certify production", () => {
  const result = evaluateProductionCertification({
    ...base,
    readOnlyConnectionsVerified: false,
    realBaselineCertified: false,
    opportunityRunCompleted: false,
    dashboardLiveDataVerified: false,
    dryRunCompleted: false,
    controlledWritePathVerified: false,
    controlledProductionActionCompleted: false,
    controlledProductionActionVerified: false,
    measurementCompleted: false,
    guardedAutonomyGateVerified: false,
  });
  assert.equal(result.status, "NOT_STARTED");
  assert.equal(result.productionReady, false);
  assert.throws(() => assertProductionCertified(result));
});

test("verified read-only chain reaches READ_ONLY_READY only", () => {
  const result = evaluateProductionCertification({
    ...base,
    dryRunCompleted: false,
    controlledWritePathVerified: false,
    controlledProductionActionCompleted: false,
    controlledProductionActionVerified: false,
    measurementCompleted: false,
    guardedAutonomyGateVerified: false,
  });
  assert.equal(result.status, "READ_ONLY_READY");
  assert.equal(result.productionReady, false);
});

test("unresolved regression blocks final certification", () => {
  const result = evaluateProductionCertification({ ...base, unresolvedRegressions: 1 });
  assert.notEqual(result.status, "PILOT_CERTIFIED");
  assert.equal(result.productionReady, false);
  assert.ok(result.blockers.some((item) => item.includes("unresolved production regression")));
});

test("missing final attestation blocks PILOT_CERTIFIED", () => {
  const result = evaluateProductionCertification({ ...base, certificationActor: "", certificationRef: "" });
  assert.equal(result.status, "CONTROLLED_WRITE_READY");
  assert.equal(result.productionReady, false);
});

test("fatal trust violation blocks certification", () => {
  const result = evaluateProductionCertification({ ...base, fixtureMetricsRepresentedAsLive: true });
  assert.notEqual(result.status, "PILOT_CERTIFIED");
  assert.equal(result.productionReady, false);
});
