import assert from "node:assert/strict";
import test from "node:test";
import {reviewIdpTrustConfiguration,type TrustConfig} from "./ugp-11-1d14-idp-trust-config.js";
const c:TrustConfig={issuer:"issuer-a",audience:"audience-a",jwksUri:"https://idp.example.org/keys",
 tenantId:"tenant-a",siteId:"site-a",version:1,
 activeFrom:"2026-10-09T10:00:00.000Z",activeUntil:"2026-10-12T10:00:00.000Z",
 allowedKeyIds:["kid-a","kid-b"],revokedKeyIds:["kid-c"],provenance:"fixture_only",approvedBy:"reviewer-a"};
const at="2026-10-10T10:00:00.000Z";
test("D14 apparently governed fixture configuration never enables identity or issuance",()=>{
 const r=reviewIdpTrustConfiguration(c,at);
 assert.equal(r.reason,"independent_governance_unavailable");
 assert.match(r.configFingerprint??"",/^[0-9a-f]{64}$/);
 assert.equal(r.configurationTrusted,false);
 assert.equal(r.identityTrusted,false);
 assert.equal(r.issuanceAllowed,false);
 assert.equal(r.claimAllowed,false);
 assert.equal(r.dispatchAllowed,false);
});
test("D14 deterministic fingerprint ignores order-only changes to key sets",()=>{
 const a=reviewIdpTrustConfiguration(c,at);
 const b=reviewIdpTrustConfiguration({...c,allowedKeyIds:["kid-b","kid-a"]},at);
 assert.equal(a.configFingerprint,b.configFingerprint);
});
test("D14 rejects revoked allowed keys, duplicates, unsafe JWKS and stale config",()=>{
 assert.equal(reviewIdpTrustConfiguration({...c,allowedKeyIds:["kid-a","kid-c"]},at).reason,"key_conflict");
 assert.equal(reviewIdpTrustConfiguration({...c,allowedKeyIds:["kid-a","kid-a"]},at).reason,"key_conflict");
 assert.equal(reviewIdpTrustConfiguration({...c,jwksUri:"http://idp.example.org/jwks"},at).reason,"unsafe_jwks_location");
 assert.equal(reviewIdpTrustConfiguration({...c,jwksUri:"https://localhost/jwks"},at).reason,"unsafe_jwks_location");
 assert.equal(reviewIdpTrustConfiguration({...c,jwksUri:"https://127.0.0.1/jwks"},at).reason,"unsafe_jwks_location");
 assert.equal(reviewIdpTrustConfiguration({...c,activeUntil:at},at).reason,"expired_configuration");
 assert.equal(reviewIdpTrustConfiguration({...c,version:0},at).reason,"invalid_configuration");
 assert.equal(reviewIdpTrustConfiguration({...c,provenance:"certified" as "fixture_only"},at).reason,"invalid_configuration");
});
