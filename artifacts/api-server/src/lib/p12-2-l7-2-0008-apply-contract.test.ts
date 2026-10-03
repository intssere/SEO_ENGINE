import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  P12_2_L7_2_ENVIRONMENT_ID,
  P12_2_L7_2_EXPECTED_POST_TABLE_COUNT,
  P12_2_L7_2_EXPECTED_PRE_TABLE_COUNT,
  P12_2_L7_2_MIGRATION_BLOB_SHA,
  P12_2_L7_2_MIGRATION_PATH,
  P12_2_L7_2_MIGRATION_SHA256,
  P12_2_L7_2_POSTGRES_SERVICE_ID,
  P12_2_L7_2_PROJECT_ID,
  p122L72AuthorizationFingerprint,
  p122L72AuthorizationLiteral,
} from "./p12-2-l7-2-0008-apply-contract.js";

test("L7.2 authorization is bound to exact Production and migration identity", () => {
  assert.equal(P12_2_L7_2_PROJECT_ID, "52265e29-921b-4652-ac0d-9da4e5e69936");
  assert.equal(P12_2_L7_2_ENVIRONMENT_ID, "7f8d920f-f6c6-44f0-b9fe-252cb4f32298");
  assert.equal(P12_2_L7_2_POSTGRES_SERVICE_ID, "b69e0633-7ab9-40ab-85f3-c9edd6acb031");
  assert.equal(P12_2_L7_2_EXPECTED_PRE_TABLE_COUNT, 37);
  assert.equal(P12_2_L7_2_EXPECTED_POST_TABLE_COUNT, 38);
  assert.equal(P12_2_L7_2_MIGRATION_BLOB_SHA, "1635c7da4cb1deac343b1d6aa73f334e1dd7e15a");
  assert.equal(P12_2_L7_2_MIGRATION_SHA256, "a3604fc210374392426e1a75a1dacc3a89651942466ff4b6d76c620e120dd25b");
  assert.match(p122L72AuthorizationFingerprint(), /^[0-9a-f]{64}$/);
  assert.equal(
    p122L72AuthorizationLiteral(),
    `AUTHORIZE:P12_2_L7_0008_APPLY:${p122L72AuthorizationFingerprint()}`,
  );
});

test("L7.2 migration SHA-256 constant matches exact repository bytes", async () => {
  const migrationPath = path.resolve(process.cwd(), "../../", P12_2_L7_2_MIGRATION_PATH);
  const bytes = await readFile(migrationPath);
  const actual = createHash("sha256").update(bytes).digest("hex");
  assert.equal(actual, P12_2_L7_2_MIGRATION_SHA256);
});
