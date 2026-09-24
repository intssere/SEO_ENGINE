import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const sourceUrl = new URL("./p8-8-autonomous-audit-projection.ts", import.meta.url);
const libDir = new URL("./", import.meta.url);
const migrationsDir = new URL("../../../../lib/db/migrations/", import.meta.url);

test("W08 source contains no database/provider/runtime execution binding", async () => {
  const source = await readFile(sourceUrl, "utf8");
  for (const forbidden of [
    'from "postgres"',
    'from "express"',
    "process.env",
    "fetch(",
    "task53-production-pilot",
    "task54-production-apply",
    "PUBLIC_SITE_WRITES_ENABLED",
    "P8_8_POLICY_MUTATION_EXECUTION_ENABLED",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      "W08 core must not contain forbidden runtime binding: " + forbidden,
    );
  }
});

test("W08 module is not imported by non-test runtime source", async () => {
  const entries = await readdir(libDir, { withFileTypes: true });
  const offenders: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    if (
      entry.name === "p8-8-autonomous-audit-projection.ts"
      || entry.name === "p8-8-w08-test-fixture.ts"
      || entry.name.endsWith(".test.ts")
    ) continue;
    const content = await readFile(join(libDir.pathname, entry.name), "utf8");
    if (content.includes("p8-8-autonomous-audit-projection")) {
      offenders.push(entry.name);
    }
  }
  assert.deepEqual(offenders, []);
});

test("W08 implementation adds no migration 0008", async () => {
  const names = await readdir(migrationsDir);
  assert.equal(names.some((name) => /^0008_.*p8_8/i.test(name)), false);
});
