import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./technical-issue-evidence-model.ts", import.meta.url)), "utf8");

test("P2.8 issue/evidence model contains no network, persistence, DDL, scheduler or worker execution primitive", () => {
  const forbidden = [
    /\bfetch\s*\(/,
    /from\s+["']node:(?:https?|net|dns)["']/i,
    /\baxios\b/i,
    /\bundici\b/i,
    /\bWebSocket\b/,
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\s+[A-Za-z_][\w."-]*\s+SET\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bCREATE\s+(?:TABLE|INDEX|TYPE)\b/i,
    /\bALTER\s+TABLE\b/i,
    /\bDROP\s+(?:TABLE|INDEX|TYPE)\b/i,
    /\bsetInterval\s*\(/,
    /\bsetTimeout\s*\(/,
    /from\s+["'](?:pg|postgres|drizzle-orm)["']/i,
  ];
  for (const pattern of forbidden) assert.equal(pattern.test(source), false, `forbidden primitive matched ${pattern}`);
});

test("P2.8 output surface contains no raw payload or credential-bearing fields", () => {
  const forbidden = [
    /\brawHtml\b/,
    /\brawXml\b/,
    /\bresponseBody\b/,
    /\bproviderPayload\b/,
    /\baccessToken\b/,
    /\brefreshToken\b/,
    /\bclientSecret\b/,
    /\bcredential\b\s*:/,
  ];
  for (const pattern of forbidden) assert.equal(pattern.test(source), false, `forbidden field matched ${pattern}`);
});

test("P2.8 explicitly keeps execution, persistence, provider, competitor and publication boundaries closed", () => {
  assert.match(source, /networkExecutionEnabled:\s*false/);
  assert.match(source, /crawlExecutionAuthorized:\s*false/);
  assert.match(source, /sitemapNetworkFetchingEnabled:\s*false/);
  assert.match(source, /persistenceAuthorized:\s*false/);
  assert.match(source, /ddlAuthorized:\s*false/);
  assert.match(source, /schedulerEnabled:\s*false/);
  assert.match(source, /workerEnabled:\s*false/);
  assert.match(source, /providerReadsAuthorized:\s*false/);
  assert.match(source, /providerWrites:\s*false/);
  assert.match(source, /competitorCollectionAuthorized:\s*false/);
  assert.match(source, /competitorPersistenceAuthorized:\s*false/);
  assert.match(source, /publicSiteWrites:\s*false/);
  assert.match(source, /publicationAuthorized:\s*false/);
});

test("P2.8 preserves the explicit P2.7 unavailable dimensions", () => {
  for (const dimension of ["http_status", "fetch_outcome", "redirect_target", "canonical_target", "indexability", "content_fingerprint"]) {
    assert.match(source, new RegExp(`"${dimension}"`));
  }
});
