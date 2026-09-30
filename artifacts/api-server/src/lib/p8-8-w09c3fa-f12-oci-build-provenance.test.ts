import assert from "node:assert/strict";
import test from "node:test";
import {
  OCI_BUILD_PROVENANCE_SCHEMA,
  OCI_BUILD_SOURCE_MODE,
  evaluateOciBuildProvenance,
} from "./p8-8-w09c3fa-f12-oci-build-provenance.js";

const digest = (char: string) => "sha256:" + char.repeat(64);

const expected = {
  canonicalRepository: "intssere/SEO_ENGINE",
  canonicalCommitSha: "1".repeat(40),
  canonicalTreeSha: "2".repeat(40),
  sourceArtifactSha256: "3".repeat(64),
  buildDefinitionPath: "Dockerfile",
  buildDefinitionSha256: "4".repeat(64),
};

const base = {
  schema: OCI_BUILD_PROVENANCE_SCHEMA,
  sourceMode: OCI_BUILD_SOURCE_MODE,
  ...expected,
  platformMode: "single_platform" as const,
  platforms: [{ platform: "linux/amd64", manifestDigest: digest("5") }],
  baseImages: [{ image: "node", digest: digest("6") }],
  imageRepository: "ghcr.io/intssere/seo-engine",
  buildResultDigest: digest("7"),
  registry: "ghcr" as const,
  registryAuthority: "ghcr_registry" as const,
  registryDigest: digest("7"),
  attestationAuthority: "github_actions_artifact_attestation" as const,
  attestationKind: "build_provenance" as const,
  attestationSubjectName: "ghcr.io/intssere/seo-engine",
  attestationSubjectDigest: digest("7"),
  attestedRepository: "intssere/SEO_ENGINE",
  attestedCommitSha: "1".repeat(40),
  attestedWorkflowRef: ".github/workflows/release.yml@" + "8".repeat(40),
};

test("exact single-platform build, registry digest, and attestation pass", () => {
  const first = evaluateOciBuildProvenance(expected, base);
  const second = evaluateOciBuildProvenance(expected, structuredClone(base));
  assert.equal(first.result, "pass");
  assert.deepEqual(second, first);
  if (first.result === "pass") {
    assert.equal(first.immutableImageReference, "ghcr.io/intssere/seo-engine@" + digest("7"));
    assert.match(first.provenanceId, /^f12-[0-9a-f]{64}$/);
  }
});

test("source lineage and build definition mismatches fail closed", () => {
  assert.deepEqual(
    evaluateOciBuildProvenance(expected, { ...base, canonicalTreeSha: "9".repeat(40) }),
    { result: "fail_closed", code: "source_lineage_mismatch" },
  );
  assert.deepEqual(
    evaluateOciBuildProvenance(expected, { ...base, buildDefinitionSha256: "a".repeat(64) }),
    { result: "fail_closed", code: "build_definition_mismatch" },
  );
});

test("registry and attestation subject digests must equal build result", () => {
  assert.deepEqual(
    evaluateOciBuildProvenance(expected, { ...base, registryDigest: digest("b") }),
    { result: "fail_closed", code: "digest_mismatch" },
  );
  assert.deepEqual(
    evaluateOciBuildProvenance(expected, { ...base, attestationSubjectDigest: digest("c") }),
    { result: "fail_closed", code: "attestation_mismatch" },
  );
});

test("multi-platform mode requires sorted unique platform manifests", () => {
  const multi = {
    ...base,
    platformMode: "multi_platform_index" as const,
    platforms: [
      { platform: "linux/amd64", manifestDigest: digest("5") },
      { platform: "linux/arm64", manifestDigest: digest("9") },
    ],
  };
  assert.equal(evaluateOciBuildProvenance(expected, multi).result, "pass");
  assert.deepEqual(
    evaluateOciBuildProvenance(expected, {
      ...multi,
      platforms: [...multi.platforms].reverse(),
    }),
    { result: "fail_closed", code: "platform_contract_mismatch" },
  );
  assert.deepEqual(
    evaluateOciBuildProvenance(expected, {
      ...base,
      platformMode: "multi_platform_index",
    }),
    { result: "fail_closed", code: "platform_contract_mismatch" },
  );
});

test("base images require immutable digest descriptors and deterministic order", () => {
  assert.deepEqual(
    evaluateOciBuildProvenance(expected, {
      ...base,
      baseImages: [{ image: "node:latest", digest: digest("6") }],
    }),
    { result: "fail_closed", code: "mutable_base_image" },
  );
  assert.deepEqual(
    evaluateOciBuildProvenance(expected, {
      ...base,
      baseImages: [
        { image: "z/base", digest: digest("6") },
        { image: "a/base", digest: digest("5") },
      ],
    }),
    { result: "fail_closed", code: "mutable_base_image" },
  );
});

test("attestation repository and commit must bind canonical source", () => {
  assert.deepEqual(
    evaluateOciBuildProvenance(expected, { ...base, attestedCommitSha: "f".repeat(40) }),
    { result: "fail_closed", code: "attestation_mismatch" },
  );
  assert.deepEqual(
    evaluateOciBuildProvenance(expected, { ...base, attestedRepository: "other/repo" }),
    { result: "fail_closed", code: "attestation_mismatch" },
  );
});

test("unknown or credential-shaped material fails closed", () => {
  assert.deepEqual(
    evaluateOciBuildProvenance(expected, { ...base, extra: true }),
    { result: "fail_closed", code: "invalid_evidence" },
  );
  assert.deepEqual(
    evaluateOciBuildProvenance(expected, { ...base, token: "secret" }),
    { result: "fail_closed", code: "credential_shaped_material" },
  );
});
