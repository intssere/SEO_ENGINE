import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  P12_2_L7_3_ENVIRONMENT_ID,
  P12_2_L7_3_EXPECTED_TABLE_COUNT,
  P12_2_L7_3_POSTGRES_SERVICE_ID,
  P12_2_L7_3_PROJECT_ID,
  P12_2_L7_3_QUERIES,
  assertP122L73QueryContract,
  p122L73AuthorizationFingerprint,
  p122L73AuthorizationLiteral,
} from "./p12-2-l7-3-post-apply-certification.js";

test("L7.3 query contract is exactly seven SELECT-only statements", () => {
  assert.equal(P12_2_L7_3_QUERIES.length, 7);
  assert.doesNotThrow(() => assertP122L73QueryContract());
  assert.deepEqual(P12_2_L7_3_QUERIES.map((query) => query.id), [
    "database_identity",
    "post_state_guard",
    "l2_column_contract",
    "l2_constraint_contract",
    "l2_index_contract",
    "legacy_p12_inventory",
    "exact_site_binding",
  ]);
});

test("L7.3 authorization is bound to exact Production post-state", () => {
  assert.equal(P12_2_L7_3_PROJECT_ID, "52265e29-921b-4652-ac0d-9da4e5e69936");
  assert.equal(P12_2_L7_3_ENVIRONMENT_ID, "7f8d920f-f6c6-44f0-b9fe-252cb4f32298");
  assert.equal(P12_2_L7_3_POSTGRES_SERVICE_ID, "b69e0633-7ab9-40ab-85f3-c9edd6acb031");
  assert.equal(P12_2_L7_3_EXPECTED_TABLE_COUNT, 38);
  assert.match(p122L73AuthorizationFingerprint(), /^[0-9a-f]{64}$/);
  assert.equal(
    p122L73AuthorizationLiteral(),
    `AUTHORIZE:P12_2_L7_0008_POST_APPLY_READ_ONLY:${p122L73AuthorizationFingerprint()}`,
  );
});

test("L7.2 wrapper SQL statements are explicitly terminated after incident", async () => {
  const sourcePath = path.resolve(process.cwd(), "src/p12-2-l7-2-0008-apply-cli.ts");
  const source = await readFile(sourcePath, "utf8");
  const wrapperStart = source.indexOf("function wrapperSql()");
  const wrapperEnd = source.indexOf("async function main()", wrapperStart);
  assert.ok(wrapperStart >= 0 && wrapperEnd > wrapperStart);
  const wrapper = source.slice(wrapperStart, wrapperEnd);
  const singleLineSelects = wrapper.split("\n").filter((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith("`SELECT ") && trimmed.endsWith("`,");
  });
  assert.ok(singleLineSelects.length >= 5);
  for (const line of singleLineSelects) assert.match(line, /;`,\s*$/);
  const guardEnds = wrapper.split("\n").filter((line) => line.trim().startsWith("THEN 1 ELSE 0 END"));
  assert.equal(guardEnds.length, 2);
  for (const line of guardEnds) assert.match(line, /;`,\s*$/);
});
