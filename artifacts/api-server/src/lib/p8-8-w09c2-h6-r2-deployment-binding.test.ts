import assert from "node:assert/strict";
import test from "node:test";
import { createBuildProvenance } from "./p8-8-w09c2f-build-provenance.js";
import { bindServingProvenanceToDeployment } from "./p8-8-w09c2-h6-r2-deployment-binding.js";

const commit = "1".repeat(40);
const tree = "2".repeat(40);
const deployment = "fbef9788-c08d-475d-a85d-88ede16e92c7";
const url = "https://dsseoengine.replit.app/";
const built = createBuildProvenance({
  canonical_commit_sha: commit,
  canonical_tree_sha: tree,
  source_branch: "main",
  generated_at_build: "2026-09-27T00:00:00.000Z",
});
assert.equal(built.result, "pass");
if (built.result !== "pass") throw new Error("fixture");

const serving = {
  result: "pass" as const,
  code: "ok" as const,
  attestation_version: "p8-8-w09c2-h6-r1-serving-provenance-v1" as const,
  provenance: built.artifact,
};
const expected = {
  canonical_application_sha: commit,
  canonical_tree_sha: tree,
  source_branch: "main",
  serving_provenance_fingerprint: built.artifact.provenance_fingerprint,
  deployment_publication_identity: deployment,
  production_url: url,
};
const publication = {
  deployment_publication_identity: deployment,
  status: "success" as const,
  url,
};

test("binds exact serving provenance to exact successful Replit publication observation", () => {
  const result = bindServingProvenanceToDeployment({ expected, serving, publication });
  assert.deepEqual(result, {
    result: "pass",
    code: "ok",
    attestation_version: "p8-8-w09c2-h6-r2-deployment-binding-v1",
    canonical_application_sha: commit,
    canonical_tree_sha: tree,
    source_branch: "main",
    serving_provenance_fingerprint: built.artifact.provenance_fingerprint,
    deployment_publication_identity: deployment,
    production_url: url,
    publication_status: "success",
  });
});

test("fails closed when serving provenance is unavailable", () => {
  const result = bindServingProvenanceToDeployment({
    expected,
    serving: { result: "fail_closed", code: "artifact_unavailable", attestation_version: "p8-8-w09c2-h6-r1-serving-provenance-v1" },
    publication,
  });
  assert.equal(result.result, "fail_closed");
  assert.equal(result.code, "serving_provenance_unavailable");
});

test("fails closed on publication identity, URL, or source-provenance mismatch", () => {
  for (const input of [
    { expected: { ...expected, deployment_publication_identity: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, serving, publication },
    { expected: { ...expected, production_url: "https://other.example/" }, serving, publication },
    { expected: { ...expected, canonical_tree_sha: "3".repeat(40) }, serving, publication },
  ]) {
    const result = bindServingProvenanceToDeployment(input);
    assert.equal(result.result, "fail_closed");
    assert.equal(result.code, "identity_mismatch");
  }
});

test("fails closed on non-success or malformed control-plane evidence", () => {
  const pending = bindServingProvenanceToDeployment({
    expected, serving, publication: { ...publication, status: "pending" },
  });
  assert.equal(pending.result, "fail_closed");
  assert.equal(pending.code, "publication_not_successful");

  for (const malformed of [
    null,
    {},
    { ...publication, extra: "not-allowlisted" },
    { ...publication, url: "https://dsseoengine.replit.app/?x=1" },
  ]) {
    assert.equal(bindServingProvenanceToDeployment({ expected, serving, publication: malformed }).result, "fail_closed");
  }
});

test("ambient environment cannot supply either evidence channel", () => {
  const previousDatabase = process.env.DATABASE_URL;
  const previousDeployment = process.env.REPLIT_DEPLOYMENT_ID;
  process.env.DATABASE_URL = "postgres://secret:secret@example.invalid/db";
  process.env.REPLIT_DEPLOYMENT_ID = deployment;
  try {
    const noPublication = bindServingProvenanceToDeployment({ expected, serving, publication: undefined });
    assert.equal(noPublication.result, "fail_closed");
    assert.equal(noPublication.code, "publication_observation_invalid");
  } finally {
    if (previousDatabase === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previousDatabase;
    if (previousDeployment === undefined) delete process.env.REPLIT_DEPLOYMENT_ID; else process.env.REPLIT_DEPLOYMENT_ID = previousDeployment;
  }
});
