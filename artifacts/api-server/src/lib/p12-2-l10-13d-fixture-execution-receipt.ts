import { createHash } from "node:crypto";

export const P12_2_L10_13D_RECEIPT_SCHEMA =
  "p12-2-l10-13d-compatible-app-image-fixture-receipt-v1" as const;

export const P12_2_L10_13D_RECEIPT = Object.freeze({
  schema: P12_2_L10_13D_RECEIPT_SCHEMA,
  authorizationFingerprint:
    "0c1a4cd9ba7f1d39be34b0b8fd0d7156cee433df02aa397777833de8e0f89ee8",
  fixtureProjectId: "ba649d1b-049e-4100-a141-b91f80f2b9cd",
  fixtureEnvironmentId: "9874824f-9baf-4ff2-91f4-83f815ab872b",
  fixtureServiceId: "a81b0011-5168-41fd-8039-4f38a435554e",
  fixtureServiceName: "seo-engine-l10-13d-fixture-run",
  image:
    "ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2",
  healthcheckPath: "/api/healthz",
  creationPatchId: "2770df06-6494-4a5c-bbf8-9c8af9affc4f",
  deploymentId: "373ff9c3-da61-4575-b830-c06349d4105e",
  deploymentSnapshotId: "2f3e404f-2604-410d-b425-c761cedc6611",
  deploymentStatus: "SUCCESS",
  deploymentAttempts: 1,
  deploymentRetries: 0,
  exactDigestPullabilityProven: true,
  http200HealthcheckProven: true,
  teardownServiceId: "a81b0011-5168-41fd-8039-4f38a435554e",
  teardownPatchId: "8ebce117-8cf5-4398-b7af-0d3a0d98779f",
  teardownDetachedVolumes: 0,
  teardownComplete: true,
  finalFixtureServiceCount: 0,
  finalFixtureStagedChanges: null,
  productionMutation: false,
  productionDbAccess: false,
  migration0010Applied: false,
  schedulerWorkerActivation: false,
  providerOrPublicSiteWrites: false,
} as const);

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableSerialize).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort()
    .map((key) => JSON.stringify(key) + ":" + stableSerialize(object[key]))
    .join(",") + "}";
}

export function p122L1013DFixtureReceiptFingerprint(): string {
  return createHash("sha256")
    .update(stableSerialize(P12_2_L10_13D_RECEIPT))
    .digest("hex");
}

export function assertP122L1013DFixtureReceipt(): void {
  const r = P12_2_L10_13D_RECEIPT;
  if (
    r.deploymentStatus !== "SUCCESS" ||
    r.deploymentAttempts !== 1 ||
    r.deploymentRetries !== 0 ||
    r.exactDigestPullabilityProven !== true ||
    r.http200HealthcheckProven !== true ||
    r.teardownComplete !== true ||
    r.finalFixtureServiceCount !== 0 ||
    r.finalFixtureStagedChanges !== null ||
    r.productionMutation !== false ||
    r.productionDbAccess !== false ||
    r.migration0010Applied !== false ||
    r.schedulerWorkerActivation !== false ||
    r.providerOrPublicSiteWrites !== false
  ) {
    throw new Error("p12_2_l10_13d_fixture_receipt_invalid");
  }
}
