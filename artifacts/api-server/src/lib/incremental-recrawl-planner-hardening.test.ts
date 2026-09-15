import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./incremental-recrawl-planner.ts", import.meta.url)), "utf8");

test("P2.6 planner source contains no built-in network or persistence mutation primitive", () => {
  const forbidden = [
    /\bfetch\s*\(/,
    /from\s+["']node:(?:https?|net|dns)["']/i,
    /\baxios\b/i,
    /\bundici\b/i,
    /\bWebSocket\b/,
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\s+[A-Za-z_][\w."-]*\s+SET\b/i,
    /\bDELETE\s+FROM\b/i,
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(source), false, `forbidden primitive matched ${pattern}`);
  }
});

test("P2.6 artifact surface contains no raw payload or secret-bearing fields", () => {
  const forbidden = [
    /\brawHtml\b/,
    /\brawXml\b/,
    /\bresponseBody\b/,
    /\baccessToken\b/,
    /\brefreshToken\b/,
    /\bclientSecret\b/,
    /\bcredential\b\s*:/,
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(source), false, `forbidden field matched ${pattern}`);
  }
});

test("P2.6 explicitly keeps execution, persistence and per-URL outcome capability closed", () => {
  assert.match(source, /networkExecutionEnabled:\s*false/);
  assert.match(source, /crawlExecutionAuthorized:\s*false/);
  assert.match(source, /persistenceAuthorized:\s*false/);
  assert.match(source, /schedulerEnabled:\s*false/);
  assert.match(source, /perUrlOutcomeComparisonAvailable:\s*false/);
  assert.match(source, /compareFullSiteCrawlHistory/);
});
