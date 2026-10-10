import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const root = fileURLToPath(new URL("../../../../", import.meta.url));
const workflow = readFileSync(root + ".github/workflows/p12-2-l2-production-image-release.yml","utf8");
test("L10.50 source-only workflow integration follows verified registry digest and keeps manual release boundary",()=>{
 assert.match(workflow,/workflow_dispatch:/);
 assert.doesNotMatch(workflow,/^  (?:push|schedule|pull_request|workflow_run):/m);
 assert.match(workflow,/test "\$AUTHORIZATION_INPUT" = "\$EXPECTED_AUTH"/);
 assert.match(workflow,/test "\$DIGEST" = "\$\{\{ steps\.build\.outputs\.digest \}\}"/);
 assert.match(workflow,/id: verify_digest/);
 assert.match(workflow,/RECEIPT_VERIFIED_DIGEST: \$\{\{ steps\.verify_digest\.outputs\.digest \}\}/);
 assert.ok(workflow.indexOf("test \"$DIGEST\"") < workflow.indexOf("Produce sanitized verified receipt artifact"));
 assert.match(workflow,/actions\/upload-artifact@[0-9a-f]{40}/);
 assert.match(workflow,/retention-days: 7/);
 assert.match(workflow,/if-no-files-found: error/);
 assert.doesNotMatch(workflow,/steps\.identity\.outputs\.authorization/);
});
test("L10.50 pure receipt writer's node regression suite passes in workspace CI",()=>{
 execFileSync("node",["--test","scripts/p12-2-l10-50-release-receipt.test.mjs"],{cwd:root,stdio:"pipe"});
});
