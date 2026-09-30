import assert from "node:assert/strict";
import test from "node:test";
import {
  NANGO_EVALUATION,
  NANGO_EVALUATION_FINGERPRINT,
  assertNangoEvaluationSafety,
} from "./broker-implementation-evaluation.js";

test("UGP-5.2 evaluation is deterministic and safe", () => {
  assertNangoEvaluationSafety();
  assert.match(NANGO_EVALUATION_FINGERPRINT, /^[0-9a-f]{64}$/);
  assert.equal(NANGO_EVALUATION.disposition, "approved_for_bounded_pilot_only");
  assert.equal(NANGO_EVALUATION.productionAdoption, false);
  assert.equal(NANGO_EVALUATION.liveConnectivityGate.enabled, false);
});

test("UGP-5.2 keeps provider authority outside the broker", () => {
  assert.equal(NANGO_EVALUATION.brokerBoundary.grantsAuthorization, false);
  assert.equal(NANGO_EVALUATION.brokerBoundary.grantsProviderWrite, false);
  assert.equal(NANGO_EVALUATION.brokerBoundary.grantsPublicSiteWrite, false);
  assert.equal(
    NANGO_EVALUATION.credentials.directCredentialExposureToProductModulesAllowed,
    false,
  );
});

test("UGP-5.2 records bounded deployment decisions", () => {
  assert.equal(NANGO_EVALUATION.pilotDeployment, "nango_cloud");
  assert.equal(NANGO_EVALUATION.productionPreferredDeployment, "byoc");
  assert.equal(NANGO_EVALUATION.freeSelfHostedForProduction, false);
  assert.equal(
    NANGO_EVALUATION.residency.productionResidencyAcceptanceRequired,
    true,
  );
});

test("UGP-5.2 live connectivity gate is explicit and non-empty", () => {
  const gates=NANGO_EVALUATION.liveConnectivityGate.requiredBeforeEnablement;
  assert.ok(gates.length >= 10);
  assert.ok(gates.includes("commercial_license_acceptance"));
  assert.ok(gates.includes("data_residency_acceptance"));
  assert.ok(gates.includes("provider_write_authorization_separation_test"));
  assert.ok(gates.includes("kill_switch_and_revoke_path"));
});
