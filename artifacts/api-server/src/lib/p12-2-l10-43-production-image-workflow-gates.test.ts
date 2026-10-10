import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const workflow = readFileSync(
  fileURLToPath(new URL("../../../../.github/workflows/p12-2-l2-production-image-release.yml", import.meta.url)),
  "utf8",
);
test("L10.43 production image release remains exact manual-only and immutable",()=>{
  assert.match(workflow,/workflow_dispatch:/);
  assert.doesNotMatch(workflow,/^\s+(?:push|schedule|pull_request|workflow_run):/m);
  assert.match(workflow,/test "\$GITHUB_REF" = "refs\/heads\/main"/);
  assert.match(workflow,/test "\$GITHUB_RUN_ATTEMPT" = "1"/);
  assert.match(workflow,/EXPECTED_AUTH="AUTHORIZE:P12_2_L2_PROD_IMAGE_RELEASE:/);
  assert.match(workflow,/SOURCE_SHA="\$\(git rev-parse HEAD\)"/);
  assert.match(workflow,/SOURCE_TREE="\$\(git rev-parse 'HEAD\^\{tree\}'\)"/);
  assert.match(workflow,/file: Dockerfile\s+target: runtime\s+platforms: linux\/amd64/);
  assert.match(workflow,/provenance: mode=max/);
  assert.match(workflow,/subject-name: ghcr\.io\/intssere\/seo-engine/);
  assert.match(workflow,/subject-digest: \$\{\{ steps\.build\.outputs\.digest \}\}/);
  assert.match(workflow,/test "\$DIGEST" = "\$\{\{ steps\.build\.outputs\.digest \}\}"/);
});
test("L10.43 no automated upload/deploy introduced by offline receipt adapter",()=>{
  assert.doesNotMatch(workflow,/actions\/upload-artifact@/);
  assert.doesNotMatch(workflow,/railway(?:\.app|\/action| up| deploy)/i);
  assert.doesNotMatch(workflow,/p12-2-l10-42-release-receipt-dry-run/);
});
