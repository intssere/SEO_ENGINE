import assert from "node:assert/strict";
import test from "node:test";
import {
  assertP122L1019CQueryContract,
  buildP122L1019CQueries,
  p122L1019CAuthorizationFingerprint,
  p122L1019CAuthorizationLiteral,
  p122L1019CQuerySetFingerprint,
} from "./p12-2-l10-19-c-post-disposition-certification.js";

const DEPLOYMENT = "11111111-1111-4111-8111-111111111111";
const OTHER_DEPLOYMENT = "22222222-2222-4222-8222-222222222222";
const IMAGE =
  "ghcr.io/intssere/seo-engine-p12-2-l10-19-packet-014-expected-absence-disposition@sha256:" +
  "a".repeat(64);
const OTHER_IMAGE =
  "ghcr.io/intssere/seo-engine-p12-2-l10-19-packet-014-expected-absence-disposition@sha256:" +
  "b".repeat(64);

test("L10.19 post-disposition cert builds exactly ten SELECT-only queries", () => {
  const queries = buildP122L1019CQueries({
    dispositionDeploymentId: DEPLOYMENT,
    verifierImage: IMAGE,
  });
  assert.equal(queries.length, 10);
  assert.doesNotThrow(() => assertP122L1019CQueryContract(queries));
  for (const query of queries) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
  assert.match(
    p122L1019CQuerySetFingerprint({
      dispositionDeploymentId: DEPLOYMENT,
      verifierImage: IMAGE,
    }),
    /^[0-9a-f]{64}$/,
  );
});

test("L10.19 post-disposition authorization binds deployment and verifier image", () => {
  const binding = { dispositionDeploymentId: DEPLOYMENT, verifierImage: IMAGE };
  const otherDeployment = {
    dispositionDeploymentId: OTHER_DEPLOYMENT,
    verifierImage: IMAGE,
  };
  const otherImage = {
    dispositionDeploymentId: DEPLOYMENT,
    verifierImage: OTHER_IMAGE,
  };

  assert.match(p122L1019CAuthorizationFingerprint(binding), /^[0-9a-f]{64}$/);
  assert.notEqual(
    p122L1019CAuthorizationFingerprint(binding),
    p122L1019CAuthorizationFingerprint(otherDeployment),
  );
  assert.notEqual(
    p122L1019CAuthorizationFingerprint(binding),
    p122L1019CAuthorizationFingerprint(otherImage),
  );
  assert.equal(
    p122L1019CAuthorizationLiteral(binding),
    "AUTHORIZE:P12_2_L10_19_PACKET_014_POST_DISPOSITION_READ_ONLY:" +
      p122L1019CAuthorizationFingerprint(binding),
  );
});

test("L10.19 post-disposition cert rejects malformed runtime bindings", () => {
  assert.throws(
    () => buildP122L1019CQueries({
      dispositionDeploymentId: "not-a-deployment",
      verifierImage: IMAGE,
    }),
    /p12_2_l10_19_c_disposition_deployment_id_invalid/,
  );
  assert.throws(
    () => buildP122L1019CQueries({
      dispositionDeploymentId: DEPLOYMENT,
      verifierImage: "ghcr.io/intssere/wrong@sha256:" + "a".repeat(64),
    }),
    /p12_2_l10_19_c_verifier_image_invalid/,
  );
});
