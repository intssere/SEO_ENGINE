import assert from "node:assert/strict";
import test from "node:test";
import {
  assertP122L1AE1QueryContract,
  P12_2_L1A_E1_P12_TABLES,
  P12_2_L1A_E1_QUERIES,
  P12_2_L1A_E1_SITE_ID,
  p122L1AE1AuthorizationLiteral,
  p122L1AE1QuerySetFingerprint,
} from "./p12-2-l1a-e1-readonly-query-contract.js";

test("query contract is fixed and mutation-free", () => {
  assert.doesNotThrow(() => assertP122L1AE1QueryContract());
  assert.equal(P12_2_L1A_E1_QUERIES.length, 7);
  for (const query of P12_2_L1A_E1_QUERIES) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
});

test("site query is exact primary-key lookup selecting only id and canonical_origin", () => {
  const site = P12_2_L1A_E1_QUERIES.find((query) => query.id === "exact_site_binding");
  assert.ok(site);
  assert.equal(
    site.sql,
    "SELECT id::text AS id, canonical_origin FROM public.sites WHERE id = $1::uuid",
  );
  assert.deepEqual(site.params, [P12_2_L1A_E1_SITE_ID]);
});

test("metadata queries are restricted to public schema and P12 tables", () => {
  for (const id of [
    "p12_table_inventory",
    "p12_column_contract",
    "p12_constraint_contract",
    "p12_index_contract",
  ] as const) {
    const query = P12_2_L1A_E1_QUERIES.find((item) => item.id === id)!;
    for (const table of P12_2_L1A_E1_P12_TABLES) {
      assert.match(query.sql, new RegExp(table));
    }
    assert.match(query.sql, /public/i);
  }
});

test("query-set fingerprint and authorization literal are deterministic", () => {
  const a = p122L1AE1QuerySetFingerprint();
  const b = p122L1AE1QuerySetFingerprint();
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(a, b);
  assert.equal(
    p122L1AE1AuthorizationLiteral(),
    `AUTHORIZE:P12_2_L1A_READ_ONLY_OBSERVATION:${a}`,
  );
});
