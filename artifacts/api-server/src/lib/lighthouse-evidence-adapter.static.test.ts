import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const sourceUrl = new URL("./lighthouse-evidence-adapter.ts", import.meta.url);
const libDir = new URL("./", import.meta.url);

test("UGP-3.5 adapter has no live Lighthouse/browser/network/database/runtime activation", async () => {
  const source = await readFile(sourceUrl, "utf8");
  for (const forbidden of [
    'from "lighthouse', 'from "playwright', 'from "@playwright/test', 'from "puppeteer',
    'from "crawlee', "chromium.launch", "page.goto(", "browser.newPage(",
    'from "node:dns', 'from "node:http', 'from "node:https', 'from "node:net',
    'from "undici', 'from "postgres', 'from "drizzle', "process.env", "fetch(",
    "DATABASE_URL", "child_process", "spawn(", "exec(", "PUBLIC_SITE_WRITES_ENABLED",
  ]) {
    assert.equal(source.includes(forbidden), false, "UGP-3.5 must not contain runtime binding: " + forbidden);
  }
});

test("UGP-3.5 adapter is not imported by non-test API runtime source", async () => {
  const entries = await readdir(libDir, { withFileTypes: true });
  const offenders: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    if (entry.name === "lighthouse-evidence-adapter.ts" || entry.name.endsWith(".test.ts")) continue;
    const source = await readFile(join(libDir.pathname, entry.name), "utf8");
    if (source.includes("lighthouse-evidence-adapter")) offenders.push(entry.name);
  }
  assert.deepEqual(offenders, []);
});

test("UGP-3.5 source encodes lab/field/transport separation and closed authority", async () => {
  const source = await readFile(sourceUrl, "utf8");
  for (const expected of [
    'evidenceClass: "lighthouse_lab"', "fieldCoreWebVitalsInferred: false",
    "cruxDataPresent: false", "transportTimingEquivalent: false", "wholeSiteCertified: false",
    "lighthouseExecutionAuthorized: false", "browserExecutionAuthorized: false",
    "networkReadAuthorized: false", "persistenceAuthorized: false", "schedulerEnabled: false",
    "autonomousWorkerEnabled: false", "providerWrites: false", "publicSiteWrites: false",
  ]) assert.equal(source.includes(expected), true, "missing UGP-3.5 invariant: " + expected);
});
