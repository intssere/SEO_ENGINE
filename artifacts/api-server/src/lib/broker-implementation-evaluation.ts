import { createHash } from "node:crypto";

export const UGP_BROKER_EVALUATION_VERSION =
  "ugp-5-2-broker-implementation-evaluation-v1" as const;

export const NANGO_EVALUATION = Object.freeze({
  candidate: "nango",
  evaluatedAt: "2026-09-30T00:00:00.000Z",
  disposition: "approved_for_bounded_pilot_only",
  productionAdoption: false,
  pilotDeployment: "nango_cloud",
  productionPreferredDeployment: "byoc",
  freeSelfHostedForProduction: false,
  license: Object.freeze({
    type: "Elastic License 2.0",
    commercialUseReviewRequired: true,
    hostedManagedServiceRestrictionPresent: true,
  }),
  residency: Object.freeze({
    nangoCloudRegion: "aws_us",
    byocKeepsRequestsAndDataInCustomerInfrastructure: true,
    productionResidencyAcceptanceRequired: true,
  }),
  credentials: Object.freeze({
    encryptedAtRestAndTransitCloudClaimed: true,
    brokerMayStoreCredentialMaterialInSeoEngine: false,
    directCredentialExposureToProductModulesAllowed: false,
    selfHostedEncryptionKeyRequired: true,
    selfHostedEncryptionKeyRotationSupported: false,
  }),
  recovery: Object.freeze({
    tokenRefreshSupported: true,
    brokenConnectionDetectionSupported: true,
    recoveryWebhookSupported: true,
    automaticReconnectInSeoEngineAllowed: false,
  }),
  brokerBoundary: Object.freeze({
    mustRemainBehindConnectionBroker: true,
    grantsAuthorization: false,
    grantsProviderWrite: false,
    grantsPublicSiteWrite: false,
  }),
  liveConnectivityGate: Object.freeze({
    enabled: false,
    requiredBeforeEnablement: Object.freeze([
      "commercial_license_acceptance",
      "deployment_mode_acceptance",
      "data_residency_acceptance",
      "credential_storage_review",
      "secret_injection_plan",
      "oauth_callback_allowlist",
      "least_privilege_scope_plan",
      "webhook_signature_verification",
      "connection_loss_recovery_test",
      "provider_write_authorization_separation_test",
      "kill_switch_and_revoke_path",
    ]),
  }),
} as const);

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

export const NANGO_EVALUATION_FINGERPRINT = createHash("sha256")
  .update(stableJson({
    purpose: "ugp_broker_implementation_evaluation",
    version: UGP_BROKER_EVALUATION_VERSION,
    evaluation: NANGO_EVALUATION,
  }))
  .digest("hex");

export function assertNangoEvaluationSafety(): void {
  if (NANGO_EVALUATION.productionAdoption !== false) {
    throw new Error("ugp_5_2_production_adoption_must_remain_disabled");
  }
  if (NANGO_EVALUATION.liveConnectivityGate.enabled !== false) {
    throw new Error("ugp_5_2_live_connectivity_must_remain_disabled");
  }
  if (NANGO_EVALUATION.brokerBoundary.grantsAuthorization !== false
    || NANGO_EVALUATION.brokerBoundary.grantsProviderWrite !== false
    || NANGO_EVALUATION.brokerBoundary.grantsPublicSiteWrite !== false) {
    throw new Error("ugp_5_2_authority_expansion_forbidden");
  }
  if (NANGO_EVALUATION.credentials.brokerMayStoreCredentialMaterialInSeoEngine !== false
    || NANGO_EVALUATION.credentials.directCredentialExposureToProductModulesAllowed !== false) {
    throw new Error("ugp_5_2_credential_boundary_failed");
  }
  if (NANGO_EVALUATION.freeSelfHostedForProduction !== false) {
    throw new Error("ugp_5_2_free_self_hosted_production_forbidden");
  }
  if (NANGO_EVALUATION.productionPreferredDeployment !== "byoc") {
    throw new Error("ugp_5_2_production_deployment_decision_changed");
  }
}
