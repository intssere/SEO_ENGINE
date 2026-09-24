import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  P8_8_W09B_QUERY_DESCRIPTORS,
  p88W09BQueryDescriptorIssues,
} from "./p8-8-w09b-evidence-contract.js";

const libDir = new URL("./", import.meta.url);
const migrationsDir = new URL("../../../../lib/db/migrations/", import.meta.url);

async function source(name: string): Promise<string> {
  return readFile(new URL("./" + name, import.meta.url), "utf8");
}

test("BE1 and BE3 remain pure and database/network free", async () => {
  for (const name of [
    "p8-8-w09b-evidence-contract.ts",
    "p8-8-w09b-offline-translator.ts",
  ]) {
    const text = await source(name);
    for (const forbidden of [
      'from "postgres"',
      "from 'postgres'",
      "@workspace/db",
      "process.env",
      "fetch(",
      'from "express"',
      "node:fs",
      "node:fs/promises",
    ]) {
      assert.equal(
        text.includes(forbidden),
        false,
        name + " must not contain " + forbidden,
      );
    }
  }
});

test("BE2 uses only explicit postgres and has no ambient/provider/runtime binding", async () => {
  const text = await source("p8-8-w09b-readonly-acquisition.ts");
  assert.equal(text.includes('from "postgres"'), true);
  for (const forbidden of [
    "process.env",
    "DATABASE_URL",
    "@workspace/db",
    "fetch(",
    "shopify-admin",
    "shopify-graphql",
    'from "express"',
    "router.",
    "app.",
    "scheduler",
    "worker-runner",
    "task53-production-pilot",
    "task54-production-apply",
    "PUBLIC_SITE_WRITES_ENABLED",
    "P8_8_POLICY_MUTATION_EXECUTION_ENABLED",
    "reservePrewrite",
    "startDispatch",
    "markForward",
    "startRollback",
  ]) {
    assert.equal(
      text.includes(forbidden),
      false,
      "BE2 must not contain forbidden runtime binding: " + forbidden,
    );
  }
});

test("all frozen W09-B query descriptors remain SELECT-only and lock-free", () => {
  assert.equal(P8_8_W09B_QUERY_DESCRIPTORS.length, 18);
  assert.deepEqual(p88W09BQueryDescriptorIssues(), []);
  const forbidden = /\b(INSERT|UPDATE|DELETE|MERGE|COPY|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|COMMENT|VACUUM|ANALYZE|REFRESH|CALL|DO|LOCK)\b|\bFOR\s+(UPDATE|SHARE)\b|pg_advisory|pg_sleep/i;
  for (const descriptor of P8_8_W09B_QUERY_DESCRIPTORS) {
    assert.match(descriptor.sql.trim(), /^SELECT\b/i);
    assert.equal(forbidden.test(descriptor.sql), false, descriptor.queryId);
  }
});

test("W09-B acquisition modules are not imported by application runtime source", async () => {
  const entries = await readdir(libDir, { withFileTypes: true });
  const allowed = new Set([
    "p8-8-w09b-evidence-contract.ts",
    "p8-8-w09b-readonly-acquisition.ts",
    "p8-8-w09b-offline-translator.ts",
    "p8-8-w09b-test-fixture.ts",
  ]);
  const offenders: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    if (allowed.has(entry.name) || entry.name.endsWith(".test.ts")) continue;
    const text = await readFile(join(libDir.pathname, entry.name), "utf8");
    if (
      text.includes("p8-8-w09b-readonly-acquisition")
      || text.includes("p8-8-w09b-offline-translator")
      || text.includes("p8-8-w09b-evidence-contract")
    ) {
      offenders.push(entry.name);
    }
  }
  assert.deepEqual(offenders, []);
});

test("W09-B implementation adds no migration", async () => {
  const names = await readdir(migrationsDir);
  assert.equal(
    names.some((name) => /w09b|w09_b|w09-be/i.test(name)),
    false,
  );
});
