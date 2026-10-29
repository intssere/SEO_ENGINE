import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertCviStartupDatabaseBinding } from "./cvi-ops-02-startup-gate.js";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "..", "index.ts"), "utf8");
test("guard is wired before any app.listen and reads the actual process environment", () => {
  const guard = source.indexOf("assertCviStartupDatabaseBinding(process.env)");
  const listen = source.indexOf("app.listen(");
  assert.ok(guard >= 0 && listen > guard);
});

const cases = [
  ["production-missing", { NODE_ENV: "production" }, false],
  ["production-blank", { NODE_ENV: "production", DATABASE_URL: "  " }, false],
  ["staging-missing", { NODE_ENV: "production", RAILWAY_ENVIRONMENT_NAME: "staging" }, false],
  ["railway-prod-mislabelled-node", { NODE_ENV: "development", RAILWAY_ENVIRONMENT_NAME: "production" }, false],
  ["railway-staging-mislabelled-node", { NODE_ENV: "test", RAILWAY_ENVIRONMENT_NAME: "staging" }, false],
  ["railway-preview-dev-without-db", { NODE_ENV: "development", RAILWAY_ENVIRONMENT_NAME: "preview" }, false],
  ["railway-custom-dev-without-db", { NODE_ENV: "development", RAILWAY_ENVIRONMENT_NAME: "qa" }, false],
  ["production-railway-dev-label", { NODE_ENV: "production", RAILWAY_ENVIRONMENT_NAME: "development" }, false],
  ["unclassified-missing", {}, false],
  ["prod-configured", { NODE_ENV: "production", DATABASE_URL: "mock://not-connected" }, true],
  ["development-offline", { NODE_ENV: "development" }, true],
  ["test-offline", { NODE_ENV: "test" }, true],
  ["development-offline-blank-binding", { NODE_ENV: "development", DATABASE_URL: "  " }, true],
  ["test-offline-blank-binding", { NODE_ENV: "test", DATABASE_URL: "  " }, true],
] as const;
for (const [name, env, allow] of cases) {
  test(`mock process startup gate: ${name}`, () => {
    const child = spawnSync(process.execPath, [
      "--import", "tsx", "--input-type=module", "--eval",
      'import { assertCviStartupDatabaseBinding } from "./src/lib/cvi-ops-02-startup-gate.ts"; try { assertCviStartupDatabaseBinding(process.env); process.stdout.write("MOCK_LISTEN"); } catch { process.exitCode=47; }',
    ], {
      cwd: join(here, "..", ".."), encoding: "utf8",
      env: { PATH: process.env.PATH, NODE_OPTIONS: "", ...env },
      timeout: 10000,
    });
    assert.equal(child.error, undefined, child.error?.message);
    assert.equal(child.status, allow ? 0 : 47, child.stderr);
    assert.equal(child.stdout.includes("MOCK_LISTEN"), allow);
    assertCviStartupDatabaseBinding({ NODE_ENV: "development" });
  });
}
