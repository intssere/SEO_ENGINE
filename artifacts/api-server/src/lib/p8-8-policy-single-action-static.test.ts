import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("W07 implementation remains unbound from routes, workers, schedulers and live activation config", async () => {
  const sources = await Promise.all([
    "p8-8-policy-single-action-apply.ts",
    "p8-8-policy-dispatch-store.ts",
    "p8-8-policy-shopify-mutation.ts",
    "p8-8-policy-single-action-orchestrator.ts",
  ].map((name) =>
    readFile(new URL("./" + name, import.meta.url), "utf8")
  ));
  const combined = sources.join("\n");

  assert.doesNotMatch(combined, /from ["'][^"']*(?:server|main|routes|router)["']/i);
  assert.doesNotMatch(combined, /\bexpress\s*\(/);
  assert.doesNotMatch(combined, /\brouter\.(?:get|post|put|patch|delete)\s*\(/i);
  assert.doesNotMatch(combined, /\bsetInterval\s*\(/);
  assert.doesNotMatch(combined, /mutateTask53ShopifyState/);
  assert.doesNotMatch(combined, /task54-persistent-apply/);
  assert.doesNotMatch(combined, /APPLY_AND_VERIFY_TASK54/);
  assert.doesNotMatch(combined, /EXECUTE_AND_ROLLBACK_TASK53/);
  assert.doesNotMatch(combined, /process\.env\.P8_8_POLICY_MUTATION_EXECUTION_ENABLED/);
  assert.doesNotMatch(combined, /process\.env\.PUBLIC_SITE_WRITES_ENABLED/);
  assert.doesNotMatch(combined, /process\.env\.DATABASE_URL/);
});

test("W07 runtime implementation never owns automatic write retry loops", async () => {
  const mutation = await readFile(
    new URL("./p8-8-policy-shopify-mutation.ts", import.meta.url),
    "utf8",
  );
  const orchestrator = await readFile(
    new URL("./p8-8-policy-single-action-orchestrator.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(mutation, /\bwhile\s*\(/);
  assert.doesNotMatch(orchestrator, /\bwhile\s*\(/);
  assert.doesNotMatch(mutation, /retry\s*\(/i);
  assert.doesNotMatch(orchestrator, /retry\s*\(/i);
  assert.match(mutation, /retryAllowed:\s*false/);
  assert.match(orchestrator, /automaticWriteRetryPerformed:\s*false/);
});
