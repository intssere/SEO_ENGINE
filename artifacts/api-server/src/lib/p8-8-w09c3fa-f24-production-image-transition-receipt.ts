import { createHash } from "node:crypto";

export const F24_SCHEMA = "p8-8-w09c3fa-f24-production-image-transition-receipt-v1" as const;

export const F24_RECEIPT = {
  schema: F24_SCHEMA,
  canonicalMain: "ba83d67b9679f6b5a3a29438bac1a9645b2e6cc5",
  projectId: "52265e29-921b-4652-ac0d-9da4e5e69936",
  environmentId: "7f8d920f-f6c6-44f0-b9fe-252cb4f32298",
  serviceId: "1e8c1e7d-16f7-4c63-8193-1021bcbe6d90",
  serviceName: "seo-engine-shadow",
  image: "ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22",
  deploymentId: "18486079-d88f-4376-bc5c-abc14e190b7c",
  snapshotId: "2d3f0422-9c0d-4507-b1c4-870e56822077",
  deploymentStatus: "SUCCESS",
  createdAt: "2026-10-01T15:24:54.602Z",
  settledAt: "2026-10-01T15:25:18.214Z",
  deploymentAttempts: 1,
  retries: 0,
  replicasRunning: 1,
  replicasTotal: 1,
  authPublicOriginPresent: true,
  domain: "seo-engine-shadow-production.up.railway.app",
  port: 8080,
  healthcheckPath: "/api/healthz",
  healthcheckTimeoutSeconds: 120,
  postgresServiceId: "b69e0633-7ab9-40ab-85f3-c9edd6acb031",
  postgresVolumeId: "5e7f09d1-c436-4a49-9526-c3150d0e820a",
  effectivePendingChanges: 0,
  providerActionPerformed: false,
  productionDbActionPerformed: false,
  schedulerWorkerActivationPerformed: false,
} as const;

export function validateF24Receipt(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_shape" } as const;
  }
  const v = value as Record<string, unknown>;
  for (const [key, expected] of Object.entries(F24_RECEIPT)) {
    if (v[key] !== expected) {
      return { result: "fail_closed", code: "receipt_mismatch", key } as const;
    }
  }
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(F24_RECEIPT))
    .digest("hex");
  return {
    result: "pass",
    code: "ok",
    fingerprint: "f24-receipt-" + fingerprint,
  } as const;
}
