import assert from "node:assert/strict";
import test from "node:test";
import { createBuildProvenance, serializeBuildProvenance } from "./p8-8-w09c2f-build-provenance.js";
import { loadServingProvenance, servingProvenanceArtifactPath } from "./p8-8-w09c2-h6-r1-serving-provenance.js";

const artifactResult = createBuildProvenance({
  canonical_commit_sha: "1111111111111111111111111111111111111111",
  canonical_tree_sha: "2222222222222222222222222222222222222222",
  source_branch: "main",
  generated_at_build: "2026-09-26T00:00:00.000Z",
});
assert.equal(artifactResult.result, "pass");
if (artifactResult.result !== "pass") throw new Error("fixture");

test("serving provenance accepts only a valid fingerprinted build artifact", async () => {
  let requestedPath = "";
  const result = await loadServingProvenance(async (path) => {
    requestedPath = path;
    return serializeBuildProvenance(artifactResult.artifact);
  }, "/immutable/dist/build-provenance.json");
  assert.equal(requestedPath, "/immutable/dist/build-provenance.json");
  assert.deepEqual(result, {
    result: "pass",
    code: "ok",
    attestation_version: "p8-8-w09c2-h6-r1-serving-provenance-v1",
    provenance: artifactResult.artifact,
  });
});

test("serving provenance fails closed when artifact is unavailable", async () => {
  const result = await loadServingProvenance(async () => { throw new Error("missing"); }, "/dist/build-provenance.json");
  assert.deepEqual(result, {
    result: "fail_closed",
    code: "artifact_unavailable",
    attestation_version: "p8-8-w09c2-h6-r1-serving-provenance-v1",
  });
});

test("serving provenance fails closed on malformed or fingerprint-invalid content", async () => {
  const malformed = await loadServingProvenance(async () => "{}", "/dist/build-provenance.json");
  assert.equal(malformed.result, "fail_closed");
  assert.equal(malformed.code, "artifact_invalid");

  const tampered = { ...artifactResult.artifact, canonical_tree_sha: "3333333333333333333333333333333333333333" };
  const invalid = await loadServingProvenance(async () => JSON.stringify(tampered), "/dist/build-provenance.json");
  assert.equal(invalid.result, "fail_closed");
  assert.equal(invalid.code, "artifact_invalid");
});

test("artifact path is fixed to the co-packaged dist artifact", () => {
  const resolved = servingProvenanceArtifactPath("file:///srv/artifacts/api-server/src/lib/module.mjs");
  assert.equal(resolved, "/srv/artifacts/api-server/dist/build-provenance.json");
});
