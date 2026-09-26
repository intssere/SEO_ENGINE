import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const sourceUrl = new URL("./public-web-onboarding.ts", import.meta.url);
const libDir = new URL("./", import.meta.url);

test("UGP-3.1 core has no direct network, database, credential or runtime binding", async () => {
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
      "UGP-3.1 core must not contain direct runtime binding: " + forbidden,
    );
  }
});

test("UGP-3.1 core is not imported by API runtime source outside certified pure successor layers", async () => {
  const entries = await readdir(libDir, { withFileTypes: true });
  const offenders: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    if (
      entry.name === "public-web-onboarding.ts"
      || entry.name === "platform-detection.ts"
      || entry.name === "universal-read-only-site-analysis.ts"
      || entry.name.endsWith(".test.ts")
    ) continue;
    const content = await readFile(join(libDir.pathname, entry.name), "utf8");
    if (content.includes("public-web-onboarding")) offenders.push(entry.name);
  }
  assert.deepEqual(offenders, []);
});

test("UGP-3.1 source keeps supplied evidence distinct from network execution", async () => {
  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /evidenceMode: "supplied_only"/);
  assert.match(source, /networkReadAuthorized: false/);
  assert.match(source, /crawlExecutionAuthorized: false/);
  assert.match(source, /persistenceAuthorized: false/);
  assert.match(source, /publicAddressVerification: "required_before_each_request"/);
  assert.match(source, /redirectTargetRevalidation: true/);
  assert.match(source, /finalHttpsRequired: true/);
  assert.match(source, /platformDetection: "not_performed"/);
});
