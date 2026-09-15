import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./crawl-history-comparison.ts", import.meta.url)), "utf8");

test("P2.5 comparison source contains no built-in network or persistence mutation primitive", () => {
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

test("P2.5 comparison artifact surface does not define raw payload or secret-bearing fields", () => {
  const forbiddenFieldPatterns = [
    /\brawHtml\b/,
    /\brawXml\b/,
    /\bresponseBody\b/,
    /\baccessToken\b/,
    /\brefreshToken\b/,
    /\bclientSecret\b/,
    /\bcredential\b\s*:/,
  ];
  for (const pattern of forbiddenFieldPatterns) {
    assert.equal(pattern.test(source), false, `forbidden artifact field matched ${pattern}`);
  }
});

test("P2.5 source keeps per-URL outcome comparison explicitly unavailable", () => {
  assert.match(source, /perUrlOutcomeComparisonAvailable:\s*false/);
  assert.match(source, /upstream_p2_1_to_p2_4_do_not_retain_per_url_fetch_or_content_outcomes/);
});
