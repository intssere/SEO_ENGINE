import assert from "node:assert/strict";
import test from "node:test";
import {
  W09_C2N_SCHEMA_VERSION,
  type VerifyAttestationContext,
} from "./p8-8-w09c2n-attestation-verifier.js";
import {
  W09_C2U_RECEIPT_SCHEMA_VERSION,
  adaptSanitizedPlatformAttestation,
} from "./p8-8-w09c2u-platform-attestation-receipt.js";

const context: VerifyAttestationContext = {
  expectedReplId: "synthetic-repl-001",
  expectedDeploymentId: "synthetic-deployment-001",
  expectedProvider: "Neon",
  approvedProvenanceKinds: ["synthetic_control_plane_attestation"],
  approvedProvenanceAuthorities: ["synthetic.replit.control-plane"],
  observedAt: "2030-01-01T00:00:30.000Z",
  maxAgeMs: 60_000,
};

const fixture = () => ({
  schemaVersion: W09_C2N_SCHEMA_VERSION,
  provenanceKind: "synthetic_control_plane_attestation",
  provenanceAuthority: "synthetic.replit.control-plane",
  replId: "synthetic-repl-001",
  deploymentId: "synthetic-deployment-001",
  deploymentStatus: "success",
  publicUrl: "https://synthetic-app.example.invalid",
  bindingRevisionId: "synthetic-binding-revision-001",
  provider: "Neon",
  providerProjectId: "synthetic-project-001",
  branchId: "synthetic-branch-001",
  databaseName: "synthetic_database",
  timelineId: "synthetic-timeline-001",
  endpointId: "synthetic-endpoint-001",
  observedAt: "2030-01-01T00:00:00.000Z",
});

test("PASS is converted to a bounded deterministic safe receipt", () => {
  const a = adaptSanitizedPlatformAttestation(fixture(), context);
  const b = adaptSanitizedPlatformAttestation(fixture(), context);
  assert.deepEqual(a, b);
  assert.equal(a.schemaVersion, W09_C2U_RECEIPT_SCHEMA_VERSION);
  assert.equal(a.verdict, "PASS");
  assert.equal(a.code, "ATTESTATION_OK");
  assert.equal(a.receiptObservedAt, context.observedAt);
  assert.equal(a.identity?.endpointId, "synthetic-endpoint-001");
});

test("UNPROVED never carries identity or rejected input", () => {
  const value: Record<string, unknown> = fixture();
  value.providerProjectId = "";
  value.untrustedPayload = "must-not-echo";
  const receipt = adaptSanitizedPlatformAttestation(value, context);
  assert.equal(receipt.verdict, "UNPROVED");
  assert.equal(receipt.code, "ATTESTATION_UNKNOWN_FIELD");
  assert.equal("identity" in receipt, false);
  assert.doesNotMatch(JSON.stringify(receipt), /must-not-echo|untrustedPayload/);
});

test("credential-shaped contamination fails closed without echo", () => {
  const value: Record<string, unknown> = fixture();
  value.DATABASE_URL = "postgresql://synthetic-user:synthetic-pass@synthetic.invalid/db";
  const receipt = adaptSanitizedPlatformAttestation(value, context);
  assert.equal(receipt.verdict, "UNPROVED");
  assert.equal(receipt.code, "ATTESTATION_CREDENTIAL_SHAPED_INPUT");
  assert.equal(receipt.secretNonObservabilityVerdict, "UNPROVED");
  assert.doesNotMatch(JSON.stringify(receipt), /synthetic-pass|postgresql:\/\//);
});

test("adapter does not create provenance approval", () => {
  const value = fixture();
  value.provenanceAuthority = "unapproved.synthetic.authority";
  const receipt = adaptSanitizedPlatformAttestation(value, context);
  assert.equal(receipt.verdict, "UNPROVED");
  assert.equal(receipt.code, "ATTESTATION_PROVENANCE_UNAPPROVED");
  assert.equal("identity" in receipt, false);
});

test("deployment mismatch remains fail closed", () => {
  const value = fixture();
  value.deploymentId = "synthetic-deployment-other";
  const receipt = adaptSanitizedPlatformAttestation(value, context);
  assert.equal(receipt.verdict, "UNPROVED");
  assert.equal(receipt.code, "ATTESTATION_DEPLOYMENT_MISMATCH");
});

test("receipt time is explicit context, never ambient wall-clock time", () => {
  const first = adaptSanitizedPlatformAttestation(fixture(), context);
  const second = adaptSanitizedPlatformAttestation(fixture(), {
    ...context,
    observedAt: "2030-01-01T00:00:31.000Z",
  });
  assert.equal(first.receiptObservedAt, "2030-01-01T00:00:30.000Z");
  assert.equal(second.receiptObservedAt, "2030-01-01T00:00:31.000Z");
});

test("receipt surface is bounded to safe allowlisted fields", () => {
  const receipt = adaptSanitizedPlatformAttestation(fixture(), context);
  assert.deepEqual(Object.keys(receipt).sort(), [
    "code",
    "deploymentBindingVerdict",
    "freshnessVerdict",
    "identity",
    "provenanceVerdict",
    "receiptObservedAt",
    "schemaVersion",
    "secretNonObservabilityVerdict",
    "verdict",
  ]);
});
