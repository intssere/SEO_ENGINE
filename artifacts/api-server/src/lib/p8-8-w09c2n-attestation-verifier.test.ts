import assert from "node:assert/strict";
import test from "node:test";
import {
  W09_C2N_SCHEMA_VERSION,
  verifySanitizedBindingAttestation,
  type VerifyAttestationContext,
} from "./p8-8-w09c2n-attestation-verifier.js";

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

test("complete synthetic authoritative fixture passes deterministically", () => {
  const a = verifySanitizedBindingAttestation(fixture(), context);
  const b = verifySanitizedBindingAttestation(fixture(), context);
  assert.deepEqual(a, b);
  assert.equal(a.verdict, "PASS");
  assert.equal(a.code, "ATTESTATION_OK");
});

const cases: Array<[string, (x: Record<string, unknown>) => void, string]> = [
  ["unknown field", x => { x.unexpected = "value"; }, "ATTESTATION_UNKNOWN_FIELD"],
  ["unapproved provenance", x => { x.provenanceAuthority = "synthetic.application"; }, "ATTESTATION_PROVENANCE_UNAPPROVED"],
  ["wrong repl", x => { x.replId = "synthetic-repl-other"; }, "ATTESTATION_REPL_MISMATCH"],
  ["wrong deployment", x => { x.deploymentId = "synthetic-deployment-other"; }, "ATTESTATION_DEPLOYMENT_MISMATCH"],
  ["non-success deployment", x => { x.deploymentStatus = "failed"; }, "ATTESTATION_DEPLOYMENT_NOT_SUCCESS"],
  ["missing binding association", x => { x.bindingRevisionId = ""; }, "ATTESTATION_BINDING_UNPROVED"],
  ["stale attestation", x => { x.observedAt = "2029-12-31T23:00:00.000Z"; }, "ATTESTATION_STALE"],
  ["missing project", x => { x.providerProjectId = ""; }, "ATTESTATION_PROJECT_MISSING"],
  ["missing branch", x => { x.branchId = ""; }, "ATTESTATION_BRANCH_MISSING"],
  ["missing database", x => { x.databaseName = ""; }, "ATTESTATION_DATABASE_MISSING"],
  ["missing endpoint", x => { x.endpointId = ""; }, "ATTESTATION_ENDPOINT_MISSING"],
  ["provider mismatch", x => { x.provider = "Other"; }, "ATTESTATION_PROVIDER_MISMATCH"],
];

for (const [name, mutate, code] of cases) {
  test(name + " fails closed", () => {
    const value: Record<string, unknown> = fixture();
    mutate(value);
    const receipt = verifySanitizedBindingAttestation(value, context);
    assert.equal(receipt.verdict, "UNPROVED");
    assert.equal(receipt.code, code);
    assert.equal("identity" in receipt, false);
  });
}

test("DATABASE_URL-shaped key fails closed and is never echoed", () => {
  const value: Record<string, unknown> = fixture();
  value.DATABASE_URL = "postgresql://synthetic-user:synthetic-pass@synthetic.invalid/db";
  const receipt = verifySanitizedBindingAttestation(value, context);
  assert.equal(receipt.code, "ATTESTATION_CREDENTIAL_SHAPED_INPUT");
  assert.equal(receipt.secretNonObservabilityVerdict, "UNPROVED");
  assert.doesNotMatch(JSON.stringify(receipt), /synthetic-pass|postgresql:\/\//);
});

test("credential URL hidden in an allowed string fails closed without echo", () => {
  const value = fixture();
  value.publicUrl = "postgresql://synthetic-user:synthetic-pass@synthetic.invalid/db";
  const receipt = verifySanitizedBindingAttestation(value, context);
  assert.equal(receipt.code, "ATTESTATION_CREDENTIAL_SHAPED_INPUT");
  assert.doesNotMatch(JSON.stringify(receipt), /synthetic-pass|postgresql:\/\//);
});

test("missing timeline fails closed without certified continuity", () => {
  const value = fixture();
  delete (value as Partial<typeof value>).timelineId;
  const receipt = verifySanitizedBindingAttestation(value, context);
  assert.equal(receipt.code, "ATTESTATION_LINEAGE_UNPROVED");
});

test("missing timeline may pass only with separately certified continuity context", () => {
  const value = fixture();
  delete (value as Partial<typeof value>).timelineId;
  const receipt = verifySanitizedBindingAttestation(value, {
    ...context,
    lineageContinuityCertified: true,
  });
  assert.equal(receipt.verdict, "PASS");
});

test("future-dated and malformed observations fail freshness", () => {
  for (const observedAt of ["2030-01-01T00:01:00.000Z", "not-a-date"]) {
    const value = fixture();
    value.observedAt = observedAt;
    assert.equal(
      verifySanitizedBindingAttestation(value, context).code,
      "ATTESTATION_STALE",
    );
  }
});

test("verifier source contract exposes no runtime I/O dependencies", async () => {
  // Behavioral guard: importing and invoking requires only input + explicit context.
  // Static CI/review additionally guards the source from environment/network/DB additions.
  const receipt = verifySanitizedBindingAttestation(fixture(), context);
  assert.equal(receipt.verdict, "PASS");
  assert.equal(Object.keys(receipt).includes("rawInput"), false);
});
