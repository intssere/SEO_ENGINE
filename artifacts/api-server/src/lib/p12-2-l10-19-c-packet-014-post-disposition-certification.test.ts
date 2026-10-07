import assert from "node:assert/strict";
import test from "node:test";
import {
  buildP122L1019CQueries,
  assertP122L1019CQueryContract,
  p122L1019CAuthorizationFingerprint,
  p122L1019CAuthorizationLiteral,
  p122L1019CQuerySetFingerprint,
} from "./p12-2-l10-19-c-packet-014-post-disposition-certification.js";

const DEPLOYMENT = "11111111-1111-4111-8111-111111111111";
const OTHER_DEPLOYMENT = "22222222-2222-4222-8222-222222222222";
const IMAGE =
  "ghcr.io/intssere/seo-engine-p12-2-l10-19-packet-014-expected-absence-disposition@sha256:" +
  "a".repeat(64);

test("L10.19-C is exactly ten SELECT-only queries bound to disposition lineage", () => {
  const queries = buildP122L1019CQueries(DEPLOYMENT, IMAGE);
  assert.equal(queries.length, 10);
  assert.doesNotThrow(() => assertP122L1019CQueryContract(DEPLOYMENT, IMAGE));
  assert.match(p122L1019CQuerySetFingerprint(DEPLOYMENT, IMAGE), /^[0-9a-f]{64}$/);
  for (const query of queries) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
});

test("L10.19-C authorization binds exact disposition deployment and immutable image", () => {
  const base = p122L1019CAuthorizationFingerprint(DEPLOYMENT, IMAGE);
  assert.match(base, /^[0-9a-f]{64}$/);
  assert.notEqual(
    base,
    p122L1019CAuthorizationFingerprint(OTHER_DEPLOYMENT, IMAGE),
  );
  assert.notEqual(
    base,
    p122L1019CAuthorizationFingerprint(
      DEPLOYMENT,
      "ghcr.io/intssere/seo-engine-p12-2-l10-19-packet-014-expected-absence-disposition@sha256:" +
        "b".repeat(64),
    ),
  );
  assert.equal(
    p122L1019CAuthorizationLiteral(DEPLOYMENT, IMAGE),
    "AUTHORIZE:P12_2_L10_19_PACKET_014_POST_DISPOSITION_READ_ONLY:" + base,
  );
});

test("L10.19-C rejects malformed deployment or wrong image repository", () => {
  assert.throws(
    () => p122L1019CAuthorizationFingerprint("not-a-deployment", IMAGE),
    /p12_2_l10_19_c_disposition_deployment_id_invalid/,
  );
  assert.throws(
    () => p122L1019CAuthorizationFingerprint(
      DEPLOYMENT,
      "ghcr.io/intssere/wrong@sha256:" + "a".repeat(64),
    ),
    /p12_2_l10_19_c_verifier_image_invalid/,
  );
});
