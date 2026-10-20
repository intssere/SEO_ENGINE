import test from "node:test";
import assert from "node:assert/strict";
import { createCustomerAttestationReader } from "./customer-attestation-reader.js";

const scope = { organizationId: "org-a", siteId: "site-a" };
const row = { organization_id: "org-a", site_id: "site-a", kind: "setup",
  evidence_id: "proof-a", authority: "certifier", complete: true, verified_at: "2026-10-20T00:00:00Z" };

test("attestation reader binds organization, site and attestation kind", async () => {
  let query = "";
  let params: unknown[] = [];
  const read = createCustomerAttestationReader(async (strings, ...values) => {
    query = strings.join("?");
    params = values;
    return [row];
  });
  assert.deepEqual(await read(scope, "setup"), { ...scope, evidenceId: "proof-a",
    authority: "certifier", complete: true, verifiedAt: "2026-10-20T00:00:00Z" });
  assert.deepEqual(params, ["org-a", "site-a", "setup"]);
  assert.match(query, /e\.site_id = a\.site_id/);
  assert.match(query, /s\.is_active = true/);
  assert.match(query, /ORDER BY a\.verified_at DESC/);
});

test("attestation reader rejects mismatched ownership and kind", async () => {
  for (const rows of [[{ ...row, organization_id: "org-b" }], [{ ...row, site_id: "site-b" }],
    [{ ...row, kind: "initial_analysis" }], [{ ...row, verified_at: "bad" }], []]) {
    assert.equal(await createCustomerAttestationReader(async () => rows)(scope, "setup"), null);
  }
});

test("missing site scope cannot query attestation persistence", async () => {
  let queries = 0;
  const read = createCustomerAttestationReader(async () => { queries++; return [row]; });
  assert.equal(await read({ ...scope, siteId: "" }, "setup"), null);
  assert.equal(queries, 0);
});
