import test from "node:test";
import assert from "node:assert/strict";
import { createAttestationEvidenceVerifier } from "./customer-attestation-evidence-reader.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
const row = { id: "evidence-a", site_id: "site-a", source: "crawl", observed_at: "2026-10-19T00:00:00Z" };

test("attestation proof lookup binds evidence, site and organization", async () => {
  let query = "";
  let params: unknown[] = [];
  const reader = createAttestationEvidenceVerifier(async (strings, ...values) => {
    query = strings.join("?");
    params = values;
    return [row];
  });
  assert.deepEqual(await reader(scope, "evidence-a"), { id: "evidence-a", source: "crawl", observedAt: "2026-10-19T00:00:00Z" });
  assert.deepEqual(params, ["evidence-a", "site-a", "org-a"]);
  assert.match(query, /s\.organization_id = \?/);
  assert.match(query, /s\.is_active = true/);
});

test("wrong-site proof, malformed observation and duplicate rows fail closed", async () => {
  for (const rows of [[{ ...row, site_id: "site-b" }], [{ ...row, observed_at: "bad" }], [row, row], []]) {
    assert.equal(await createAttestationEvidenceVerifier(async () => rows)(scope, "evidence-a"), null);
  }
});

test("empty evidence ID cannot access the database", async () => {
  let calls = 0;
  const reader = createAttestationEvidenceVerifier(async () => { calls++; return [row]; });
  assert.equal(await reader(scope, " "), null);
  assert.equal(calls, 0);
});
