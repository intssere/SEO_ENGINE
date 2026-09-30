import assert from "node:assert/strict";
import test from "node:test";
import {
  SOURCE_ATTESTATION_ISSUER,
  SOURCE_ATTESTATION_SCHEMA,
  sourceAttestationId,
  verifySourceAttestation,
  type SourceAttestation,
} from "./p8-8-w09c3fa-f4-source-attestation.js";

const COMMIT = "a".repeat(40);
const TREE = "b".repeat(40);
const RECORD: SourceAttestation = {
  schema: SOURCE_ATTESTATION_SCHEMA,
  repository: "intssere/SEO_ENGINE",
  commitSha: COMMIT,
  treeSha: TREE,
  sourceBranch: "main",
  issuedFrom: SOURCE_ATTESTATION_ISSUER,
};
const CONTEXT = {
  expectedRepository: "intssere/SEO_ENGINE",
  railwayCommitSha: COMMIT,
  railwaySourceBranch: "main",
};

test("admits exact allowlisted GitHub commit-to-tree attestation", () => {
  const result = verifySourceAttestation(RECORD, CONTEXT);
  assert.equal(result.result, "pass");
  if (result.result === "pass") {
    assert.deepEqual(result.identity, RECORD);
    assert.match(result.attestationId, /^f4-[0-9a-f]{64}$/);
  }
});

test("attestation identity is deterministic and field sensitive", () => {
  assert.equal(sourceAttestationId(RECORD), sourceAttestationId({ ...RECORD }));
  assert.notEqual(sourceAttestationId(RECORD), sourceAttestationId({ ...RECORD, treeSha: "c".repeat(40) }));
});

test("rejects unknown fields and credential-shaped material", () => {
  assert.deepEqual(
    verifySourceAttestation({ ...RECORD, note: "unexpected" }, CONTEXT),
    { result: "fail_closed", code: "invalid_shape" },
  );
  assert.deepEqual(
    verifySourceAttestation({ ...RECORD, repository: "postgresql://user:pass@example.invalid/db" }, CONTEXT),
    { result: "fail_closed", code: "credential_shaped_material" },
  );
});

test("rejects malformed Git identity", () => {
  assert.deepEqual(
    verifySourceAttestation({ ...RECORD, treeSha: "B".repeat(40) }, CONTEXT),
    { result: "fail_closed", code: "invalid_identity" },
  );
});

test("rejects repository, deployment commit, and deployment branch mismatch", () => {
  assert.deepEqual(
    verifySourceAttestation(RECORD, { ...CONTEXT, expectedRepository: "other/repo" }),
    { result: "fail_closed", code: "repository_mismatch" },
  );
  assert.deepEqual(
    verifySourceAttestation(RECORD, { ...CONTEXT, railwayCommitSha: "c".repeat(40) }),
    { result: "fail_closed", code: "commit_mismatch" },
  );
  assert.deepEqual(
    verifySourceAttestation(RECORD, { ...CONTEXT, railwaySourceBranch: "feature" }),
    { result: "fail_closed", code: "branch_mismatch" },
  );
});
