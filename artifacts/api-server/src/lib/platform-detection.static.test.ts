import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const sourceUrl = new URL("./platform-detection.ts", import.meta.url);
const libDir = new URL("./", import.meta.url);

test("UGP-3.2 detector has no direct network, database, credential or runtime binding", async () => {
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
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      "UGP-3.2 detector must not contain direct runtime binding: " + forbidden,
    );
  }
});

test("UGP-3.2 detector is not imported by non-test API runtime source", async () => {
  const entries = await readdir(libDir, { withFileTypes: true });
  const offenders: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    if (
      entry.name === "platform-detection.ts"
      || entry.name.endsWith(".test.ts")
    ) continue;
    const source = await readFile(join(libDir.pathname, entry.name), "utf8");
    if (source.includes("platform-detection")) offenders.push(entry.name);
  }
  assert.deepEqual(offenders, []);
});

test("UGP-3.2 source preserves advisory supplied-evidence semantics", async () => {
  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /mode: "supplied_observations_only"/);
  assert.match(source, /connectorCapabilityGranted: false/);
  assert.match(source, /networkReadAuthorized: false/);
  assert.match(source, /crawlExecutionAuthorized: false/);
  assert.match(source, /persistenceAuthorized: false/);
  assert.match(source, /providerWrites: false/);
  assert.match(source, /publicSiteWrites: false/);
  assert.match(source, /state: PlatformDetectionState/);
  assert.match(source, /candidatePlatform: PlatformFamily/);
  assert.match(source, /contradictoryEvidence/);
  assert.match(source, /observationFingerprint/);
  assert.match(source, /detectionFingerprint/);
});

test("UGP-3.2 keeps hostname evidence weak and headless/custom evidence explicit", async () => {
  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /id: "hostname_myshopify"[\s\S]*strength: "weak"/);
  assert.match(source, /id: "hostname_wordpress_com"[\s\S]*strength: "weak"/);
  assert.match(source, /id: "hostname_webflow_io"[\s\S]*strength: "weak"/);
  assert.match(source, /id: "hostname_wix_hosted"[\s\S]*strength: "weak"/);
  assert.match(source, /family: "headless_custom"/);
  assert.match(source, /hasObservedEvidence/);
  assert.match(source, /headlessHasFrameworkEvidence/);
});
