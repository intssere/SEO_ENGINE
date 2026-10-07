import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  P12_2_L10_19_A_EXPECTED_POST_TABLE_COUNT,
  P12_2_L10_19_A_EXPECTED_PRE_TABLE_COUNT,
  P12_2_L10_19_A_MIGRATION_BLOB_SHA,
  P12_2_L10_19_A_MIGRATION_PATH,
  P12_2_L10_19_A_MIGRATION_SHA256,
  p122L1019AMigrationAuthorizationFingerprint,
  p122L1019AMigrationAuthorizationLiteral,
} from "./p12-2-l10-19-a-0011-apply-contract.js";
import {
  P12_2_L10_19_B_QUERIES,
  assertP122L1019BQueryContract,
  p122L1019BAuthorizationFingerprint,
  p122L1019BAuthorizationLiteral,
  p122L1019BQuerySetFingerprint,
} from "./p12-2-l10-19-b-0011-post-certification.js";

test("L10.19 migration 0011 apply contract pins exact immutable file identity", async () => {
  const migration = await readFile(
    fileURLToPath(new URL("../../../../lib/db/migrations/0011_first_party_crawl_expected_absence_disposition.sql", import.meta.url)),
  );
  assert.equal(P12_2_L10_19_A_MIGRATION_PATH, "lib/db/migrations/0011_first_party_crawl_expected_absence_disposition.sql");
  assert.equal(P12_2_L10_19_A_MIGRATION_BLOB_SHA, "8749184f481474a4a085eaacf3ff154e8ebfe903");
  assert.equal(createHash("sha256").update(migration).digest("hex"), P12_2_L10_19_A_MIGRATION_SHA256);
  assert.equal(P12_2_L10_19_A_EXPECTED_PRE_TABLE_COUNT, 41);
  assert.equal(P12_2_L10_19_A_EXPECTED_POST_TABLE_COUNT, 43);
  assert.match(p122L1019AMigrationAuthorizationFingerprint(), /^[0-9a-f]{64}$/);
  assert.equal(
    p122L1019AMigrationAuthorizationLiteral(),
    "AUTHORIZE:P12_2_L10_19_0011_APPLY:" +
      p122L1019AMigrationAuthorizationFingerprint(),
  );
});

test("L10.19 post-0011 certification is exactly ten SELECT-only queries", () => {
  assert.equal(P12_2_L10_19_B_QUERIES.length, 10);
  assert.doesNotThrow(() => assertP122L1019BQueryContract());
  assert.match(p122L1019BQuerySetFingerprint(), /^[0-9a-f]{64}$/);
  for (const query of P12_2_L10_19_B_QUERIES) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
});

test("L10.19 post-0011 read-only authorization binds exact apply deployment", () => {
  const a = "11111111-1111-4111-8111-111111111111";
  const b = "22222222-2222-4222-8222-222222222222";
  assert.match(p122L1019BAuthorizationFingerprint(a), /^[0-9a-f]{64}$/);
  assert.notEqual(
    p122L1019BAuthorizationFingerprint(a),
    p122L1019BAuthorizationFingerprint(b),
  );
  assert.equal(
    p122L1019BAuthorizationLiteral(a),
    "AUTHORIZE:P12_2_L10_19_0011_POST_APPLY_READ_ONLY:" +
      p122L1019BAuthorizationFingerprint(a),
  );
  assert.throws(
    () => p122L1019BAuthorizationFingerprint("not-a-deployment"),
    /p12_2_l10_19_b_apply_deployment_id_invalid/,
  );
});
