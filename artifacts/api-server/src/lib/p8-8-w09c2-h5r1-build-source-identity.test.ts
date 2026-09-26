import assert from "node:assert/strict";
import test from "node:test";
import { resolveBuildSourceIdentity } from "./p8-8-w09c2-h5r1-build-source-identity.js";

const COMMIT = "a".repeat(40);
const TREE = "b".repeat(40);

test("explicit identity passes without consulting Git", () => {
  let gitCalls = 0;
  const result = resolveBuildSourceIdentity({
    EXPECTED_CANONICAL_COMMIT: COMMIT,
    EXPECTED_CANONICAL_TREE: TREE,
    EXPECTED_SOURCE_BRANCH: "main",
  }, () => { gitCalls++; throw new Error("must not run"); });
  assert.equal(result.result, "pass");
  if (result.result === "pass") {
    assert.equal(result.identity.source, "explicit");
    assert.equal(result.identity.canonical_commit_sha, COMMIT);
    assert.equal(result.identity.canonical_tree_sha, TREE);
    assert.equal(result.identity.source_branch, "main");
  }
  assert.equal(gitCalls, 0);
});

test("partial explicit identity fails closed and never falls back to Git", () => {
  let gitCalls = 0;
  const result = resolveBuildSourceIdentity({
    EXPECTED_CANONICAL_COMMIT: COMMIT,
  }, () => { gitCalls++; return ""; });
  assert.deepEqual(result, { result: "fail_closed", code: "partial_explicit_identity" });
  assert.equal(gitCalls, 0);
});

test("clean attached Git source identity is admitted when explicit identity is absent", () => {
  const responses = new Map([
    ["status --porcelain --untracked-files=no", ""],
    ["rev-parse HEAD", COMMIT],
    ["rev-parse HEAD^{tree}", TREE],
    ["symbolic-ref --quiet --short HEAD", "main"],
  ]);
  const result = resolveBuildSourceIdentity({}, (args) => {
    const value = responses.get(args.join(" "));
    if (value === undefined) throw new Error("unexpected git call");
    return value;
  });
  assert.equal(result.result, "pass");
  if (result.result === "pass") {
    assert.deepEqual(result.identity, {
      canonical_commit_sha: COMMIT,
      canonical_tree_sha: TREE,
      source_branch: "main",
      source: "git",
    });
  }
});

test("dirty Git source fails closed", () => {
  const result = resolveBuildSourceIdentity({}, (args) =>
    args[0] === "status" ? " M tracked-file.ts" : "");
  assert.deepEqual(result, { result: "fail_closed", code: "dirty_source_tree" });
});

test("missing or detached Git identity fails closed", () => {
  const result = resolveBuildSourceIdentity({}, (args) => {
    if (args[0] === "status") return "";
    if (args[0] === "symbolic-ref") throw new Error("detached");
    return args.includes("HEAD^{tree}") ? TREE : COMMIT;
  });
  assert.deepEqual(result, { result: "fail_closed", code: "git_identity_unavailable" });
});
