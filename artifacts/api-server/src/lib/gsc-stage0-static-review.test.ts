import assert from "node:assert/strict";
import test from "node:test";
import { GSC_READONLY_EXTERNAL_ACCOUNT_ID, GSC_READONLY_PROFILE, GSC_READONLY_SCOPE } from "@seo-engine/oauth-connection-manager/gsc-readonly";
import {
  GSC_S0_CANONICAL_ORIGIN,
  GSC_S0_CANDIDATE_APP_ORIGIN,
  GSC_S0_HISTORICAL_SITE_ID,
  GSC_S0_PACKET_VERSION,
  GSC_S0_TARGET_PROPERTY,
  reviewGscStage0StaticContract,
  type GscStage0StaticPacket,
} from "./gsc-stage0-static-review.js";

const sourceFixture: GscStage0StaticPacket = {
  version: GSC_S0_PACKET_VERSION,
  environment: "production_candidate",
  siteId: GSC_S0_HISTORICAL_SITE_ID,
  canonicalOrigin: GSC_S0_CANONICAL_ORIGIN,
  targetProperty: GSC_S0_TARGET_PROPERTY,
  profile: GSC_READONLY_PROFILE,
  externalAccountId: GSC_READONLY_EXTERNAL_ACCOUNT_ID,
  requestedScopes: [GSC_READONLY_SCOPE],
  includeGrantedScopes: false,
  pkce: "S256",
  stateRequired: true,
  clientIdConfigKey: "GSC_OAUTH_CLIENT_ID",
  clientSecretConfigKey: "GSC_OAUTH_CLIENT_SECRET",
  appOrigin: GSC_S0_CANDIDATE_APP_ORIGIN,
  redirectUri: GSC_S0_CANDIDATE_APP_ORIGIN + "/api/connections/google/callback",
};

function checkBlocked(patch: Record<string, unknown>, expected: string) {
  const result = reviewGscStage0StaticContract({ ...sourceFixture, ...patch });
  assert.equal(result.structurallyConformant, false);
  assert.ok(result.findings.includes(expected), JSON.stringify(result.findings));
  assert.deepEqual(
    [
      result.consentAuthorized,
      result.tokenExchangeAuthorized,
      result.providerReadAuthorized,
      result.credentialWriteAuthorized,
      result.evidenceWriteAuthorized,
      result.runtimeBindingAuthorized,
    ],
    [false, false, false, false, false, false],
  );
}

test("conforming synthetic packet is ONLY a static review, never execution permission", () => {
  const result = reviewGscStage0StaticContract(sourceFixture);
  assert.deepEqual(result, {
    kind: "structural_review_only",
    structurallyConformant: true,
    findings: [],
    consentAuthorized: false,
    tokenExchangeAuthorized: false,
    providerReadAuthorized: false,
    credentialWriteAuthorized: false,
    evidenceWriteAuthorized: false,
    runtimeBindingAuthorized: false,
  });
});

test("null, primitive, array, and non-plain instances never qualify", () => {
  for (const invalid of [null, undefined, "", 5, [], new Date()]) {
    const result = reviewGscStage0StaticContract(invalid);
    assert.equal(result.structurallyConformant, false);
    assert.ok(result.findings.includes("packet_must_be_plain_record"));
  }
});

test("reject unexpected fields including inline credentials and fake authorization claims", () => {
  checkBlocked({ accessToken: "fake-never-used" }, "unexpected_packet_field");
  checkBlocked({ clientSecret: "fake-never-used" }, "unexpected_packet_field");
  checkBlocked({ consentAuthorized: true }, "unexpected_packet_field");
  checkBlocked({ databaseGrant: { issuedBy: "fake" } }, "unexpected_packet_field");
});

test("reject missing or stale structural identity", () => {
  checkBlocked({ version: "obsolete" }, "version_mismatch");
  checkBlocked({ environment: "production" }, "environment_mismatch");
  checkBlocked({ siteId: "bad-id" }, "historical_site_id_mismatch");
  checkBlocked({ canonicalOrigin: "https://other.example" }, "canonical_origin_mismatch");
  checkBlocked({ targetProperty: "sc-domain:unrelated.example" }, "target_property_mismatch");
});

test("reject generic Google/GA4 profile identity and credential fallback", () => {
  checkBlocked({ profile: "legacy" }, "profile_mismatch");
  checkBlocked({ externalAccountId: "google" }, "external_account_mismatch");
  checkBlocked({ clientIdConfigKey: "GOOGLE_OAUTH_CLIENT_ID" }, "dedicated_client_id_slot_required");
  checkBlocked({ clientSecretConfigKey: "AUTH_GOOGLE_CLIENT_SECRET" }, "dedicated_client_secret_slot_required");
});

test("exactly one webmasters.readonly scope: no extras, duplicates, omissions or implicit grants", () => {
  checkBlocked({ requestedScopes: [] }, "scope_must_be_exactly_gsc_readonly");
  checkBlocked({ requestedScopes: [GSC_READONLY_SCOPE, GSC_READONLY_SCOPE] }, "scope_must_be_exactly_gsc_readonly");
  checkBlocked({ requestedScopes: [GSC_READONLY_SCOPE, "https://www.googleapis.com/auth/analytics.readonly"] }, "scope_must_be_exactly_gsc_readonly");
  checkBlocked({ requestedScopes: ["https://www.googleapis.com/auth/webmasters"] }, "scope_must_be_exactly_gsc_readonly");
  checkBlocked({ requestedScopes: GSC_READONLY_SCOPE }, "scope_must_be_exactly_gsc_readonly");
  checkBlocked({ includeGrantedScopes: true }, "incremental_scope_grants_forbidden");
});

test("reject missing state or mismatched PKCE posture", () => {
  checkBlocked({ pkce: "plain" }, "pkce_s256_required");
  checkBlocked({ stateRequired: false }, "state_required");
});

test("reject unsafe or non-exact redirect values without attempting network IO", () => {
  checkBlocked({ appOrigin: "http://app.example.test" }, "app_origin_must_be_single_https_origin");
  checkBlocked({ appOrigin: "https://app.example.test/path" }, "app_origin_must_be_single_https_origin");
  checkBlocked({ appOrigin: "https://localhost" }, "app_origin_must_be_single_https_origin");
  checkBlocked({ appOrigin: "https://127.0.0.1" }, "app_origin_must_be_single_https_origin");
  checkBlocked({ appOrigin: "https://evil@app.example.test" }, "app_origin_must_be_single_https_origin");
  checkBlocked({ appOrigin: "https://app.example.test/" }, "app_origin_must_be_single_https_origin");
  checkBlocked({ appOrigin: "https://app.example.test" }, "operator_reported_origin_candidate_mismatch");
  checkBlocked({ redirectUri: "https://app.example.test/api/connections/google/callback?next=/foo" }, "exact_callback_redirect_required");
  checkBlocked({ redirectUri: "https://wrong.example/api/connections/google/callback" }, "exact_callback_redirect_required");
  checkBlocked({ redirectUri: "https://app.example.test/api/connections/google/gsc/callback" }, "exact_callback_redirect_required");
});

test("operator-provided source packet cannot certify live runtime readiness", () => {
  const result = reviewGscStage0StaticContract(sourceFixture);
  assert.equal(result.structurallyConformant, true);
  assert.equal(result.kind, "structural_review_only");
  assert.equal(result.runtimeBindingAuthorized, false);
  assert.equal(result.consentAuthorized, false);
  assert.equal(result.credentialWriteAuthorized, false);
  assert.equal(result.providerReadAuthorized, false);
});
