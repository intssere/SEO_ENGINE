import assert from "node:assert/strict";
import test from "node:test";
import {
  W09_C2W_SCHEMA_VERSION,
  adaptLegacyC2NIdentity,
  verifySanitizedPlatformBindingAttestation,
  type VerifyPlatformAttestationContext,
} from "./p8-8-w09c2w-platform-attestation-verifier.js";
import {
  W09_C2N_SCHEMA_VERSION,
  type SanitizedBindingIdentity,
} from "./p8-8-w09c2n-attestation-verifier.js";

const context = (platform: "replit" | "railway"): VerifyPlatformAttestationContext => ({
  expectedPlatformKind: platform,
  expectedPlatformSubjectId: `synthetic-${platform}-subject`,
  expectedDeploymentId: `synthetic-${platform}-deployment`,
  expectedProvider: "Neon",
  approvedProvenanceKinds: ["synthetic_control_plane_attestation"],
  approvedProvenanceAuthorities: [`synthetic.${platform}.control-plane`],
  observedAt: "2030-01-01T00:00:30.000Z",
  maxAgeMs: 60_000,
});

const fixture = (platform: "replit" | "railway") => ({
  schemaVersion: W09_C2W_SCHEMA_VERSION,
  provenanceKind: "synthetic_control_plane_attestation",
  provenanceAuthority: `synthetic.${platform}.control-plane`,
  platformKind: platform,
  platformSubjectId: `synthetic-${platform}-subject`,
  deploymentId: `synthetic-${platform}-deployment`,
  deploymentStatus: "success",
  publicUrl: `https://synthetic-${platform}.example.invalid`,
  bindingRevisionId: `synthetic-${platform}-binding-revision`,
  provider: "Neon",
  providerProjectId: "synthetic-project",
  branchId: "synthetic-branch",
  databaseName: "synthetic_database",
  timelineId: "synthetic-timeline",
  endpointId: "synthetic-endpoint",
  observedAt: "2030-01-01T00:00:00.000Z",
});

for (const platform of ["replit", "railway"] as const) {
  test(`${platform} fixture passes deterministically`, () => {
    const a = verifySanitizedPlatformBindingAttestation(fixture(platform), context(platform));
    const b = verifySanitizedPlatformBindingAttestation(fixture(platform), context(platform));
    assert.deepEqual(a, b);
    assert.equal(a.verdict, "PASS");
    assert.equal(a.identity?.platformKind, platform);
  });
}

test("platform identity cannot be aliased", () => {
  const value = fixture("railway");
  assert.equal(
    verifySanitizedPlatformBindingAttestation(value, context("replit")).code,
    "ATTESTATION_PROVENANCE_UNAPPROVED",
  );
  const sameAuthority = context("replit");
  sameAuthority.approvedProvenanceAuthorities = ["synthetic.railway.control-plane"];
  assert.equal(
    verifySanitizedPlatformBindingAttestation(value, sameAuthority).code,
    "ATTESTATION_PLATFORM_MISMATCH",
  );
});

test("platform subject mismatch fails closed", () => {
  const value = fixture("railway");
  value.platformSubjectId = "other";
  assert.equal(
    verifySanitizedPlatformBindingAttestation(value, context("railway")).code,
    "ATTESTATION_PLATFORM_SUBJECT_MISMATCH",
  );
});

test("unknown field fails closed", () => {
  const value: Record<string, unknown> = fixture("railway");
  value.replId = "must-not-be-accepted-by-v2";
  assert.equal(
    verifySanitizedPlatformBindingAttestation(value, context("railway")).code,
    "ATTESTATION_UNKNOWN_FIELD",
  );
});

test("credential-shaped contamination fails without echo", () => {
  const value: Record<string, unknown> = fixture("railway");
  value.DATABASE_URL = "postgresql://synthetic-user:synthetic-pass@invalid/db";
  const receipt = verifySanitizedPlatformBindingAttestation(value, context("railway"));
  assert.equal(receipt.code, "ATTESTATION_CREDENTIAL_SHAPED_INPUT");
  assert.equal(receipt.secretNonObservabilityVerdict, "UNPROVED");
  assert.doesNotMatch(JSON.stringify(receipt), /synthetic-pass|postgresql:\/\//);
});

test("provenance is never self-approved", () => {
  const c = context("railway");
  c.approvedProvenanceAuthorities = [];
  assert.equal(
    verifySanitizedPlatformBindingAttestation(fixture("railway"), c).code,
    "ATTESTATION_PROVENANCE_UNAPPROVED",
  );
});

test("deployment, freshness, provider and lineage remain fail closed", () => {
  const deployment = fixture("railway");
  deployment.deploymentId = "other";
  assert.equal(verifySanitizedPlatformBindingAttestation(deployment, context("railway")).code, "ATTESTATION_DEPLOYMENT_MISMATCH");

  const stale = fixture("railway");
  stale.observedAt = "2029-12-31T23:00:00.000Z";
  assert.equal(verifySanitizedPlatformBindingAttestation(stale, context("railway")).code, "ATTESTATION_STALE");

  const provider = fixture("railway");
  provider.provider = "Other";
  assert.equal(verifySanitizedPlatformBindingAttestation(provider, context("railway")).code, "ATTESTATION_PROVIDER_MISMATCH");

  const lineage = fixture("railway");
  delete (lineage as Partial<typeof lineage>).timelineId;
  assert.equal(verifySanitizedPlatformBindingAttestation(lineage, context("railway")).code, "ATTESTATION_LINEAGE_UNPROVED");
  assert.equal(
    verifySanitizedPlatformBindingAttestation(lineage, { ...context("railway"), lineageContinuityCertified: true }).verdict,
    "PASS",
  );
});

test("legacy C2N sanitized identity maps only to explicit replit subject", () => {
  const legacy: SanitizedBindingIdentity = {
    schemaVersion: W09_C2N_SCHEMA_VERSION,
    provenanceKind: "synthetic_control_plane_attestation",
    provenanceAuthority: "synthetic.replit.control-plane",
    replId: "synthetic-replit-subject",
    deploymentId: "synthetic-replit-deployment",
    deploymentStatus: "success",
    publicUrl: "https://synthetic-replit.example.invalid",
    bindingRevisionId: "synthetic-replit-binding-revision",
    provider: "Neon",
    providerProjectId: "synthetic-project",
    branchId: "synthetic-branch",
    databaseName: "synthetic_database",
    timelineId: "synthetic-timeline",
    endpointId: "synthetic-endpoint",
    observedAt: "2030-01-01T00:00:00.000Z",
  };
  const mapped = adaptLegacyC2NIdentity(legacy);
  assert.equal(mapped.platformKind, "replit");
  assert.equal(mapped.platformSubjectId, legacy.replId);
  assert.equal("replId" in mapped, false);
});

test("verifier has no ambient clock or runtime I/O requirement", () => {
  const receipt = verifySanitizedPlatformBindingAttestation(fixture("railway"), context("railway"));
  assert.equal(receipt.verdict, "PASS");
  assert.equal(Object.keys(receipt).includes("rawInput"), false);
});
