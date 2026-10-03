import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L7_1_ENVIRONMENT_ID,
  P12_2_L7_1_MIGRATION_BLOB_SHA,
  P12_2_L7_1_MIGRATION_PATH,
  P12_2_L7_1_MIGRATION_SHA256,
  P12_2_L7_1_POSTGRES_SERVICE_ID,
  P12_2_L7_1_PROJECT_ID,
  P12_2_L7_1_QUERIES,
  assertP122L71QueryContract,
  p122L71AuthorizationFingerprint,
  p122L71AuthorizationLiteral,
  p122L71QuerySetFingerprint,
} from "./p12-2-l7-1-0008-readonly-certification.js";

test("L7.1 query contract is exactly nine SELECT-only statements", () => {
  assert.doesNotThrow(() => assertP122L71QueryContract());
  assert.equal(P12_2_L7_1_QUERIES.length, 9);
  for (const query of P12_2_L7_1_QUERIES) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
});

test("L7.1 authorization is bound to exact Production IDs and migration identity", () => {
  assert.equal(P12_2_L7_1_PROJECT_ID, "52265e29-921b-4652-ac0d-9da4e5e69936");
  assert.equal(P12_2_L7_1_ENVIRONMENT_ID, "7f8d920f-f6c6-44f0-b9fe-252cb4f32298");
  assert.equal(P12_2_L7_1_POSTGRES_SERVICE_ID, "b69e0633-7ab9-40ab-85f3-c9edd6acb031");
  assert.equal(P12_2_L7_1_MIGRATION_PATH, "lib/db/migrations/0008_first_party_crawl_l2_invocations.sql");
  assert.equal(P12_2_L7_1_MIGRATION_BLOB_SHA, "1635c7da4cb1deac343b1d6aa73f334e1dd7e15a");
  assert.equal(P12_2_L7_1_MIGRATION_SHA256, "a3604fc210374392426e1a75a1dacc3a89651942466ff4b6d76c620e120dd25b");
  assert.match(p122L71QuerySetFingerprint(), /^[0-9a-f]{64}$/);
  assert.match(p122L71AuthorizationFingerprint(), /^[0-9a-f]{64}$/);
  assert.equal(
    p122L71AuthorizationLiteral(),
    `AUTHORIZE:P12_2_L7_0008_READ_ONLY:${p122L71AuthorizationFingerprint()}`,
  );
});

test("L7.1 query surface explicitly covers absence/presence, legacy lineage, and exact site binding", () => {
  const ids = P12_2_L7_1_QUERIES.map((query) => query.id);
  assert.deepEqual(ids, [
    "database_identity",
    "public_base_table_count",
    "l2_object_any_schema",
    "l2_column_contract",
    "l2_constraint_contract",
    "l2_index_contract",
    "legacy_p12_inventory",
    "legacy_p12_columns",
    "exact_site_binding",
  ]);
});
