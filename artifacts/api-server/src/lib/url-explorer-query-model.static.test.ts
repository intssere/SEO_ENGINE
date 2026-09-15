import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./url-explorer-query-model.ts", import.meta.url)), "utf8");

test("P2.7 query model contains no network, persistence, scheduler or worker execution primitive", () => {
  const forbidden = [
    /\bfetch\s*\(/,
    /from\s+["']node:(?:https?|net|dns)["']/i,
    /\baxios\b/i,
    /\bundici\b/i,
    /\bWebSocket\b/,
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\s+[A-Za-z_][\w."-]*\s+SET\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bsetInterval\s*\(/,
    /\bsetTimeout\s*\(/,
  ];
  for (const pattern of forbidden) assert.equal(pattern.test(source), false, `forbidden primitive matched ${pattern}`);
});

test("P2.7 output surface contains no raw provider payload or secret-bearing fields", () => {
  const forbidden = [
    /\brawHtml\b/,
    /\brawXml\b/,
    /\bresponseBody\b/,
    /\baccessToken\b/,
    /\brefreshToken\b/,
    /\bclientSecret\b/,
    /\bcredential\b\s*:/,
  ];
  for (const pattern of forbidden) assert.equal(pattern.test(source), false, `forbidden field matched ${pattern}`);
});

test("P2.7 explicitly keeps all execution and write boundaries closed", () => {
  assert.match(source, /networkExecutionEnabled:\s*false/);
  assert.match(source, /crawlExecutionAuthorized:\s*false/);
  assert.match(source, /persistenceAuthorized:\s*false/);
  assert.match(source, /schedulerEnabled:\s*false/);
  assert.match(source, /workerEnabled:\s*false/);
  assert.match(source, /providerReadsAuthorized:\s*false/);
  assert.match(source, /providerWrites:\s*false/);
  assert.match(source, /publicSiteWrites:\s*false/);
});
