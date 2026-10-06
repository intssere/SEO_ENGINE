import { createHash } from "node:crypto";

export const P12_2_L10_13F_SCHEMA =
  "p12-2-l10-13f-production-app-image-transition-receipt-v1" as const;

export const P12_2_L10_13F_RECEIPT = Object.freeze({
  schema: P12_2_L10_13F_SCHEMA,
  authorizationFingerprint:
    "970db42c4ead3751365706cb9693484f686e6a83fa367ae71f29e6937f3e5a0b",
  projectId: "52265e29-921b-4652-ac0d-9da4e5e69936",
  environmentId: "7f8d920f-f6c6-44f0-b9fe-252cb4f32298",
  serviceId: "1e8c1e7d-16f7-4c63-8193-1021bcbe6d90",
  serviceName: "seo-engine-shadow",
  oldImage:
    "ghcr.io/intssere/seo-engine@sha256:30632cc85de834c5dfb2ee6e34c55cab3e68d799ae69be8dcd8c0efa6fc3b283",
  newImage:
    "ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2",
  patchId: "fe96638e-8cf4-473e-872e-5fb4e3dc5703",
  deploymentId: "11362736-c4ea-43a0-9e4b-f6627acdee24",
  deploymentSnapshotId: "58a72727-79f4-42bb-a5ac-53fb1e52bffc",
  deploymentStatus: "SUCCESS",
  deploymentAttempts: 1,
  deploymentRetries: 0,
  automaticRollbackUsed: false,
  sourceImageOnlyMutation: true,
  serviceState: "live",
  replicaRunning: 1,
  replicaTotal: 1,
  region: "europe-west4-drams3a",
  healthcheckPath: "/api/healthz",
  healthcheckTimeout: 120,
  runtime: "V2",
  builder: "DOCKERFILE",
  buildEnvironment: "V3",
  dockerfilePath: "Dockerfile",
  restartPolicyMaxRetries: 3,
  railwayDomainId: "985121f2-2edb-4a27-9e9a-165e306eeb49",
  railwayDomain: "seo-engine-shadow-production.up.railway.app",
  railwayDomainTargetPort: 8080,
  customDomainCount: 0,
  appAttachedVolumeCount: 0,
  activeWarningCount: 0,
  activeCriticalCount: 0,
  recentFailureCount: 0,
  finalEnvironmentStagedChanges: null,
  finalServiceStagedChangeCount: 0,
  finalPendingWorkCount: 0,
  postgresServiceId: "b69e0633-7ab9-40ab-85f3-c9edd6acb031",
  postgresServiceState: "live",
  postgresDeploymentId: "31895ebb-987b-47e7-a938-a52b902b62ef",
  postgresDeploymentStatus: "SUCCESS",
  postgresVolumeId: "5e7f09d1-c436-4a49-9526-c3150d0e820a",
  postgresVolumeName: "postgres-volume",
  postgresVolumeMountPath: "/var/lib/postgresql/data",
  migration0010Applied: false,
  productionDbReadPerformed: false,
  productionDbWritePerformed: false,
  schedulerWorkerActivation: false,
  crawlOrRecoveryExecution: false,
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

export function p122L1013FTransitionReceiptFingerprint(): string {
  return createHash("sha256")
    .update(stableSerialize(P12_2_L10_13F_RECEIPT))
    .digest("hex");
}

export function assertP122L1013FTransitionReceipt(): void {
  const r = P12_2_L10_13F_RECEIPT;
  if (
    r.deploymentStatus !== "SUCCESS" ||
    r.deploymentAttempts !== 1 ||
    r.deploymentRetries !== 0 ||
    r.automaticRollbackUsed !== false ||
    r.sourceImageOnlyMutation !== true ||
    r.serviceState !== "live" ||
    r.replicaRunning !== 1 ||
    r.replicaTotal !== 1 ||
    r.finalEnvironmentStagedChanges !== null ||
    r.finalServiceStagedChangeCount !== 0 ||
    r.finalPendingWorkCount !== 0 ||
    r.postgresServiceState !== "live" ||
    r.postgresDeploymentStatus !== "SUCCESS" ||
    r.migration0010Applied !== false ||
    r.productionDbReadPerformed !== false ||
    r.productionDbWritePerformed !== false ||
    r.schedulerWorkerActivation !== false ||
    r.crawlOrRecoveryExecution !== false ||
    r.providerOrPublicSiteWrites !== false
  ) {
    throw new Error("p12_2_l10_13f_transition_receipt_invalid");
  }
}
