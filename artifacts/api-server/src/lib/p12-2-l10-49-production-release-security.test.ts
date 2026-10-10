import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const workflow = readFileSync(
  fileURLToPath(new URL("../../../../.github/workflows/p12-2-l2-production-image-release.yml", import.meta.url)),
  "utf8",
);
test("L10.49 dispatch authorization passes via env rather than executable shell interpolation", () => {
  assert.match(workflow, /AUTHORIZATION_INPUT: \$\{\{ inputs\.authorization \}\}/);
  assert.match(workflow, /test "\$AUTHORIZATION_INPUT" = "\$EXPECTED_AUTH"/);
  assert.doesNotMatch(workflow, /test "\$\{\{ inputs\.authorization \}\}"/);
  const runBlocks = workflow.split(/\n\s+run: \|\n/g).slice(1);
  for (const block of runBlocks) {
    const scriptBody = block.split(/\n\s+- name: /)[0];
    assert.doesNotMatch(scriptBody, /\$\{\{\s*(?:inputs|github\.event\.inputs)\.authorization\s*\}\}/);
  }
});
test("L10.49 authorization literal never propagated to output or receipt", () => {
  assert.doesNotMatch(workflow, /echo "authorization=.*\$GITHUB_OUTPUT/);
  assert.doesNotMatch(workflow, /steps\.identity\.outputs\.authorization/);
  assert.doesNotMatch(workflow, /"authorization=/);
  assert.match(workflow, /echo "source_sha=\$SOURCE_SHA" >> "\$GITHUB_OUTPUT"/);
  assert.match(workflow, /echo "source_tree=\$SOURCE_TREE" >> "\$GITHUB_OUTPUT"/);
  assert.match(workflow, /test "\$DIGEST" = "\$\{\{ steps\.build\.outputs\.digest \}\}"/);
  assert.match(workflow, /"attestation=published"/);
});
