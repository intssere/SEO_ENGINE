import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const sourceUrl = new URL("./p8-8-stage-0-shadow-certification.ts", import.meta.url);
const libDir = new URL("./", import.meta.url);
const migrationsDir = new URL("../../../../lib/db/migrations/", import.meta.url);

test("W09 core contains no database/provider/runtime execution binding", async () => {
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
      "W09 core must not contain forbidden runtime binding: " + forbidden,
    );
  }
});

test("W09 module is not imported by non-test runtime source", async () => {
  const entries = await readdir(libDir, { withFileTypes: true });
  const offenders: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    if (
      entry.name === "p8-8-stage-0-shadow-certification.ts"
      || entry.name === "p8-8-w09-test-fixture.ts"
      || entry.name.endsWith(".test.ts")
    ) continue;
    const content = await readFile(join(libDir.pathname, entry.name), "utf8");
    if (content.includes("p8-8-stage-0-shadow-certification")) {
      offenders.push(entry.name);
    }
  }
  assert.deepEqual(offenders, []);
});

test("W09 implementation adds no P8.8 W09 migration", async () => {
  const names = await readdir(migrationsDir);
  assert.equal(names.some((name) => /p8_8.*w09|w09.*p8_8/i.test(name)), false);
});
