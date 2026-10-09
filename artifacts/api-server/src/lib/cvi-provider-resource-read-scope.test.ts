import assert from "node:assert/strict";
import test from "node:test";
import {
  buildUniversalSiteIdentity,
  buildUniversalConnectionIdentity,
} from "./universal-site-resource-identity.js";
import { reviewCviProviderResourceReadScope } from "./cvi-provider-resource-read-scope.js";

const site = buildUniversalSiteIdentity({
  siteId: "site-1", canonicalOrigin: "https://example.com",
});
const google = buildUniversalConnectionIdentity({
  site, connectionId: "google-1", provider: "google", externalAccountId: "google",
});
const shopify = buildUniversalConnectionIdentity({
  site, connectionId: "shopify-1", provider: "shopify",
  externalAccountId: "example-store.myshopify.com",
});
const gsc = "https://www.googleapis.com/auth/webmasters.readonly";
const reviewGoogle = (patch: Partial<Parameters<typeof reviewCviProviderResourceReadScope>[0]> = {}) =>
  reviewCviProviderResourceReadScope({
    site, connection: google, provider: "google", scopes: [gsc],
    state: "connected", externalResource: "https://example.com/",
    ...patch,
  });
test("declared GSC read property never conveys attested authorization", () => {
  const r = reviewGoogle();
  assert.equal(r.outcome, "PENDING_INDEPENDENT_PROVIDER_ATTESTATION");
  assert.equal(r.independentlyVerified, false);
  assert.equal(r.authorizationGranted, false);
  assert.equal(r.executionAuthorized, false);
  assert.equal(r.publicationAuthorized, false);
});
test("wrong scopes and write scope cannot qualify", () => {
  assert.equal(reviewGoogle({ scopes: ["https://www.googleapis.com/auth/analytics.readonly"] }).outcome, "DENY");
  assert.equal(reviewGoogle({ scopes: [gsc, "write_products"] }).outcome, "DENY");
  assert.equal(reviewGoogle({ scopes: [] }).outcome, "DENY");
});
test("domain spoof, missing property and revoked connection deny", () => {
  assert.equal(reviewGoogle({ externalResource: "https://example.com.attacker.test/" }).outcome, "DENY");
  assert.equal(reviewGoogle({ externalResource: "https://unrelated.test/" }).outcome, "DENY");
  assert.equal(reviewGoogle({ externalResource: null }).outcome, "DENY");
  assert.equal(reviewGoogle({ state: "revoked" }).outcome, "DENY");
  assert.equal(reviewGoogle({ site: buildUniversalSiteIdentity({
    siteId: "site-2", canonicalOrigin: "https://example.com",
  }) }).outcome, "DENY");
});
test("Shopify content reads require declared matching permanent shop domain", () => {
  const valid = reviewCviProviderResourceReadScope({
    site, connection: shopify, provider: "shopify",
    state: "connected", scopes: ["read_content"],
    externalResource: "example-store.myshopify.com",
  });
  assert.equal(valid.outcome, "PENDING_INDEPENDENT_PROVIDER_ATTESTATION");
  assert.equal(valid.authorizationGranted, false);
  const invalid = reviewCviProviderResourceReadScope({
    site, connection: shopify, provider: "shopify",
    state: "connected", scopes: ["read_products"],
    externalResource: "attacker-store.myshopify.com",
  });
  assert.equal(invalid.outcome, "DENY");
});
test("unsupported providers fail closed", () => {
  assert.equal(reviewGoogle({ provider: "other" }).outcome, "DENY");
});
