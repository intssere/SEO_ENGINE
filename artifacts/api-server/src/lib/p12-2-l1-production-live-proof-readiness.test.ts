import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L1_EVIDENCE,
  evaluateP122L1Readiness,
} from "./p12-2-l1-production-live-proof-readiness.js";

test("L1 permits only the next read-only observation review", () => {
  assert.deepEqual(evaluateP122L1Readiness(), {
    result: "ready_for_observation",
    code: "p12_2_l1_observation_required",
  });
});

test("L1 fails closed if any live authority is claimed", () => {
  for (const key of [
    "productionDdlAuthorized",
    "liveNetworkAuthorized",
    "liveExecutionAuthorized",
    "persistenceAuthorized",
  ] as const) {
    assert.equal(
      evaluateP122L1Readiness({ ...P12_2_L1_EVIDENCE, [key]: true }).result,
      "blocked",
    );
  }
});

test("L1 fails closed on unearned readiness evidence", () => {
  for (const key of [
    "productionDbSchemaObserved",
    "productionSiteBindingObserved",
    "migrationEligibilityCertified",
    "oneShotOperatorCallerCertified",
  ] as const) {
    assert.equal(
      evaluateP122L1Readiness({ ...P12_2_L1_EVIDENCE, [key]: true }).result,
      "blocked",
    );
  }
});

test("running image and current main carry byte-identical P12.2 artifacts", () => {
  assert.equal(P12_2_L1_EVIDENCE.imageAndMainArtifactsByteIdentical, true);
  assert.match(P12_2_L1_EVIDENCE.migrationBlob, /^[0-9a-f]{40}$/);
  assert.match(P12_2_L1_EVIDENCE.runtimeBridgeBlob, /^[0-9a-f]{40}$/);
  assert.match(P12_2_L1_EVIDENCE.manualCompositionBlob, /^[0-9a-f]{40}$/);
  assert.match(P12_2_L1_EVIDENCE.persistenceBlob, /^[0-9a-f]{40}$/);
});
