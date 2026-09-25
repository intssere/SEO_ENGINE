import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const sourceUrl = new URL("./universal-read-only-site-analysis.ts", import.meta.url);
const libDir = new URL("./", import.meta.url);

test("UGP-3.3 analysis has no direct network, database, credential or runtime binding", async () => {
  const source = await readFile(sourceUrl, "utf8");
  for (const forbidden of [
    'from "node:dns',
    'from "node:http',
    'from "node:https',
    'from "node:net',
    'from "undici',
    'from "postgres',
    'from "drizzle',
    "process.env",
    "fetch(",
    "DATABASE_URL",
    "PUBLIC_SITE_WRITES_ENABLED",
    "P8_8_STAGE_0",
    "createSecureCompetitorFetch",
    "createFirstPartyPageTransport",
    "createFirstPartySitemapAcquirer",
    "createFirstPartyRobotsEvaluator",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      "UGP-3.3 analysis must not contain direct runtime binding: " + forbidden,
    );
  }
});

test("UGP-3.3 pure analysis is not imported by non-test API runtime source", async () => {
  const entries = await readdir(libDir, { withFileTypes: true });
  const offenders: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    if (
      entry.name === "universal-read-only-site-analysis.ts"
      || entry.name.endsWith(".test.ts")
    ) continue;
    const source = await readFile(join(libDir.pathname, entry.name), "utf8");
    if (source.includes("universal-read-only-site-analysis")) offenders.push(entry.name);
  }
  assert.deepEqual(offenders, []);
});

test("UGP-3.3 source preserves existing-crawl supplied-evidence and closed-authority semantics", async () => {
  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /adapter: "existing_crawl_architecture"/);
  assert.match(source, /mode: "supplied_existing_crawl_observations"/);
  assert.match(source, /method: "GET"/);
  assert.match(source, /sameOriginOnly: true/);
  assert.match(source, /httpsOnly: true/);
  assert.match(source, /robotsEnforced: true/);
  assert.match(source, /redirectTargetRevalidation: true/);
  assert.match(source, /queryPolicy: "reject_all"/);
  assert.match(source, /fragmentPolicy: "reject_all"/);
  assert.match(source, /responseBodyPersistence: false/);
  assert.match(source, /networkReadAuthorized: false/);
  assert.match(source, /crawlExecutionAuthorized: false/);
  assert.match(source, /persistenceAuthorized: false/);
  assert.match(source, /connectorCapabilityGranted: false/);
  assert.match(source, /providerWrites: false/);
  assert.match(source, /publicSiteWrites: false/);
});

test("UGP-3.3 source covers roadmap dimensions without claiming future adapters", async () => {
  const source = await readFile(sourceUrl, "utf8");
  for (const expected of [
    "crawlability",
    "indexability",
    "metadata",
    "canonical",
    "structuredData",
    "internalLinks",
    "content",
    "images",
    "performance",
    "crawlPageSignalCompatible",
  ]) {
    assert.equal(source.includes(expected), true, "missing UGP-3.3 analysis dimension: " + expected);
  }
  assert.match(source, /wholeSiteCertified: false/);
  assert.match(source, /not_independently_certified_by_ugp_3_3/);
  assert.match(source, /lighthouseEvidence: "not_collected_in_ugp_3_3"/);
  assert.match(source, /lighthouseAdapter: "not_performed"/);
  assert.match(source, /technicalEvidenceProjection: "not_performed"/);
});
