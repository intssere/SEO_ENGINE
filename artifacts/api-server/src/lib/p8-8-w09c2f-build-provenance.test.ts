import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILD_PROVENANCE_SCHEMA_VERSION,
  createBuildProvenance,
  parseBuildProvenance,
  serializeBuildProvenance,
} from "./p8-8-w09c2f-build-provenance.js";

const commit = "1".repeat(40);
const tree = "2".repeat(40);
const timestamp = "2026-09-26T00:00:00.000Z";

function pass(overrides: Record<string, string> = {}) {
  const result = createBuildProvenance({
    canonical_commit_sha: commit,
    canonical_tree_sha: tree,
    source_branch: "main",
    generated_at_build: timestamp,
    ...overrides,
  });
  assert.equal(result.result, "pass");
  if (result.result !== "pass") throw new Error("expected pass");
  return result.artifact;
}

test("emits exactly the allowlisted artifact keys", () => {
  assert.deepEqual(Object.keys(pass()), [
    "schema_version","canonical_commit_sha","canonical_tree_sha",
    "source_branch","generated_at_build","provenance_fingerprint",
  ]);
  assert.equal(pass().schema_version, BUILD_PROVENANCE_SCHEMA_VERSION);
});

test("fails closed on missing or malformed identity", () => {
  assert.equal(createBuildProvenance({}).result, "fail_closed");
  assert.deepEqual(createBuildProvenance({
    canonical_commit_sha: "ABC",
    canonical_tree_sha: tree,
    source_branch: "main",
    generated_at_build: timestamp,
  }), { result: "fail_closed", code: "invalid_commit_sha" });
  assert.equal(createBuildProvenance({
    canonical_commit_sha: commit,
    canonical_tree_sha: "x".repeat(40),
    source_branch: "main",
    generated_at_build: timestamp,
  }).result, "fail_closed");
});

test("fingerprint ignores build timestamp", () => {
  assert.equal(
    pass({ generated_at_build: "2026-09-26T00:00:00.000Z" }).provenance_fingerprint,
    pass({ generated_at_build: "2026-09-27T00:00:00.000Z" }).provenance_fingerprint,
  );
});

test("fingerprint changes with commit, tree, or branch identity", () => {
  const base = pass().provenance_fingerprint;
  assert.notEqual(base, pass({ canonical_commit_sha: "3".repeat(40) }).provenance_fingerprint);
  assert.notEqual(base, pass({ canonical_tree_sha: "4".repeat(40) }).provenance_fingerprint);
  assert.notEqual(base, pass({ source_branch: "release" }).provenance_fingerprint);
});

test("canonical serialization is deterministic and independently validated", () => {
  const artifact = pass();
  const one = serializeBuildProvenance(artifact);
  const two = serializeBuildProvenance({ ...artifact });
  assert.equal(one, two);
  const parsed = parseBuildProvenance(one);
  assert.equal(parsed.result, "pass");
  assert.deepEqual(parsed.result === "pass" ? parsed.artifact : null, artifact);
  const tampered = JSON.parse(one);
  tampered.canonical_tree_sha = "5".repeat(40);
  assert.equal(parseBuildProvenance(JSON.stringify(tampered)).result, "fail_closed");
});

test("ambient DATABASE_URL and historical identifiers cannot supply identity", () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://secret:secret@example.invalid/historical";
  try {
    assert.equal(createBuildProvenance({ generated_at_build: timestamp }).result, "fail_closed");
    const serialized = serializeBuildProvenance(pass());
    for (const forbidden of [
      "late-sunset-42762033",
      "br-super-frost-b341k9ms",
      "07b8ce1a7a41f71ba395a1bab2b03de3",
      "ep-lucky-river-b3sh13is",
      "ep-muddy-mouse-b34bjs0w",
      "secret",
      "DATABASE_URL",
    ]) assert.equal(serialized.includes(forbidden), false);
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});

test("artifact carries no extra secret-bearing fields", () => {
  const artifact = pass();
  const keys = Object.keys(artifact);
  for (const forbidden of ["password","token","credential","database_url","url","host","database"]) {
    assert.equal(keys.some((key) => key.toLowerCase().includes(forbidden)), false);
  }
});
