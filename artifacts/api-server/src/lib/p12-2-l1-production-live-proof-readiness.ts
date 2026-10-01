export const P12_2_L1_SCHEMA = "p12-2-l1-production-live-proof-readiness-v1" as const;

export const P12_2_L1_EVIDENCE = {
  canonicalMain: "d6153bc0f5b81c91ea37c9cb8b69e53da9c6e52b",
  productionImageSourceCommit: "9ba3640d8f50843da8609608124918fa356d552c",
  productionImageSourceTree: "75b750b59f2de907a121c61907c2f1cfe7364c1f",
  productionImage: "ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22",
  productionDeploymentId: "18486079-d88f-4376-bc5c-abc14e190b7c",
  siteId: "eb1da9ee-539c-4200-8f04-f64ccaea7768",
  canonicalOrigin: "https://diamondshelf.us",
  robotsUserAgent: "SEO_ENGINE_P12_2_CERTIFIER",
  exactConfirmation: "AUTHORIZE:P12_2_LIVE_CRAWL:eb1da9ee-539c-4200-8f04-f64ccaea7768",
  migrationPath: "lib/db/migrations/0004_first_party_crawl_execution_state.sql",
  migrationBlob: "c46e007f087d0edbb6e4f5c8cda1490e9f0be548",
  runtimeBridgeBlob: "556a1a39b147714c09a801d70b78e0e9ccc73f66",
  manualCompositionBlob: "2b6e038df178d7ee10c2309f124d690dd780b4f6",
  persistenceBlob: "c50fe3f59426cccbcc8b5c91e8b05d11ef7dacbc",
  inspectionCliBlob: "c949759b2de9ad4efcebccd3f625f36c46ad99d6",
  liveAdapterDocBlob: "a9ce954838c519d7c8cc4887b47c50f31a8d2a4b",
  bridgeDocBlob: "a8abfca3041b959245015b74ba9f9ec10b9d27a6",
  imageAndMainArtifactsByteIdentical: true,
  productionDbSchemaObserved: false,
  productionSiteBindingObserved: false,
  migrationEligibilityCertified: false,
  oneShotOperatorCallerCertified: false,
  productionDdlAuthorized: false,
  liveNetworkAuthorized: false,
  liveExecutionAuthorized: false,
  persistenceAuthorized: false,
} as const;

export type P122L1Result =
  | { result: "ready_for_observation"; code: "p12_2_l1_observation_required" }
  | { result: "blocked"; code: string };

export function evaluateP122L1Readiness(
  evidence: typeof P12_2_L1_EVIDENCE = P12_2_L1_EVIDENCE,
): P122L1Result {
  if (!evidence.imageAndMainArtifactsByteIdentical) {
    return { result: "blocked", code: "running_image_artifact_drift" };
  }

  if (
    evidence.productionDdlAuthorized ||
    evidence.liveNetworkAuthorized ||
    evidence.liveExecutionAuthorized ||
    evidence.persistenceAuthorized
  ) {
    return { result: "blocked", code: "unexpected_live_authority" };
  }

  if (
    evidence.productionDbSchemaObserved ||
    evidence.productionSiteBindingObserved ||
    evidence.migrationEligibilityCertified ||
    evidence.oneShotOperatorCallerCertified
  ) {
    return { result: "blocked", code: "unearned_readiness_claim" };
  }

  return {
    result: "ready_for_observation",
    code: "p12_2_l1_observation_required",
  };
}
