import assert from "node:assert/strict";
import test from "node:test";
import { buildUniversalSiteIdentity } from "./universal-site-resource-identity.js";
import { reviewCviGscPropertyAttestation } from "./cvi-gsc-property-attestation-review.js";
import { GSC_READONLY_SCOPE } from "@seo-engine/oauth-connection-manager/gsc-readonly";

const site = buildUniversalSiteIdentity({siteId:"site-1",canonicalOrigin:"https://example.com"});
const base = {
  site, requestedProperty:"sc-domain:example.com",
  observedAt:"2026-10-09T04:00:00.000Z",
  evaluatedAt:"2026-10-09T04:03:00.000Z",
  maxAgeSeconds:300,
  connectionIdentityFingerprint:"a".repeat(64),
  grantedScopes:[GSC_READONLY_SCOPE] as string[],
  observation:{siteEntry:[{siteUrl:"sc-domain:example.com",permissionLevel:"siteFullUser"}]} as unknown,
};
const check = (patch: Partial<typeof base> = {}) => reviewCviGscPropertyAttestation({...base,...patch});

test("matching declared GSC site is pending trusted transport, never an access grant", () => {
  const a = check();
  assert.equal(a.outcome,"PENDING_TRUSTED_TRANSPORT_ATTESTATION");
  assert.equal(a.independentlyVerified,false);
  assert.equal(a.authorizationGranted,false);
  assert.equal(a.publicationAuthorized,false);
  assert.equal(a.executionAuthorized,false);
  assert.equal(a.observationFingerprint,check().observationFingerprint);
});
test("rejected observed permissions, unrelated domains and suffix spoofing", () => {
  assert.equal(check({observation:{siteEntry:[{siteUrl:"sc-domain:example.com",permissionLevel:"siteUnverifiedUser"}]}}).outcome,"DENY");
  assert.equal(check({requestedProperty:"sc-domain:other.com"}).outcome,"DENY");
  assert.equal(check({requestedProperty:"sc-domain:example.com.attacker.test"}).outcome,"DENY");
  assert.equal(check({observation:{siteEntry:[{siteUrl:"sc-domain:example.com.attacker.test",permissionLevel:"siteFullUser"}]}}).outcome,"DENY");
});
test("stale, future and altered clock cannot pass", () => {
  assert.equal(check({observedAt:"2026-10-09T03:00:00.000Z"}).outcome,"DENY");
  assert.equal(check({observedAt:"2026-10-09T04:04:00.000Z"}).outcome,"DENY");
  assert.throws(() => check({evaluatedAt:"2026-10-09"}), /invalid_clock/);
  assert.throws(() => check({maxAgeSeconds:3601}), /max_age_invalid/);
});
test("missing, extra or write scopes reject declared observation", () => {
  assert.equal(check({grantedScopes:[]}).outcome,"DENY");
  assert.equal(check({grantedScopes:[GSC_READONLY_SCOPE,"write_content"]}).outcome,"DENY");
  assert.equal(check({connectionIdentityFingerprint:"invalid"}).outcome,"DENY");
});
test("malformed provider payload fails closed and changes source fingerprint", () => {
  assert.equal(check({observation:{siteEntry:[{siteUrl:"sc-domain:example.com",permissionLevel:42}]}}).outcome,"DENY");
  assert.notEqual(check().observationFingerprint,check({observation:{siteEntry:[]}}).observationFingerprint);
});
