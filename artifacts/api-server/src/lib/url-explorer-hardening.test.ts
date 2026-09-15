import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./url-explorer.ts", import.meta.url)), "utf8");

test("P2.7 URL Explorer contains no built-in network, socket, DNS or persistence mutation primitive", () => {
  const forbidden = [
    /\bfetch\s*\(/,
    /from\s+["']node:(?:https?|net|dns|tls)["']/i,
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

test("P2.7 URL Explorer artifact surface does not expose raw payloads, tokens, secrets or credentials", () => {
  const forbidden = [
    /\brawHtml\b/,
    /\brawXml\b/,
    /\bresponseBody\b/,
    /\bproviderPayload\b/,
    /\baccessToken\b/,
    /\brefreshToken\b/,
    /\bclientSecret\b/,
    /\bapiKey\b/,
    /\bcredential\b\s*:/,
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(source), false, `forbidden field matched ${pattern}`);
  }
});

test("P2.7 explicitly keeps all execution, persistence, scheduler, competitor and write boundaries closed", () => {
  for (const field of [
    "networkExecutionEnabled",
    "crawlExecutionAuthorized",
    "sitemapNetworkFetchingEnabled",
    "persistenceAuthorized",
    "schedulerEnabled",
    "batchExecutorEnabled",
    "autonomousWorkerEnabled",
    "retryLoopEnabled",
    "competitorCollectionAuthorized",
    "competitorPersistenceAuthorized",
    "providerRequestsAuthorized",
    "providerWrites",
    "publicSiteWrites",
  ]) {
    assert.match(source, new RegExp(`${field}:\\s*false`));
  }
  assert.match(source, /upstream_p2_1_to_p2_6_do_not_retain_per_url_fetch_or_content_outcomes/);
});
