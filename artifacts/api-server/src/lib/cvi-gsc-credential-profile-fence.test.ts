import assert from "node:assert/strict";
import test from "node:test";
import { GSC_READONLY_SCOPE,GSC_READONLY_PROFILE,GSC_READONLY_EXTERNAL_ACCOUNT_ID } from "@seo-engine/oauth-connection-manager/gsc-readonly";
import { CVI_GSC_RAW_RESPONSE_CUSTODY_VERSION,type CviGscRawCustodyResult } from "./cvi-gsc-raw-response-custody.js";
import { reviewCviGscCredentialProfile } from "./cvi-gsc-credential-profile-fence.js";

const fp=(c:string)=>c.repeat(64);
const rawResponse:CviGscRawCustodyResult={
 version:CVI_GSC_RAW_RESPONSE_CUSTODY_VERSION,
 status:"PENDING_TRUSTED_TLS_AND_PROVIDER_CREDENTIAL_CUSTODY",
 reasons:[],rawBodySha256:fp("a"),attestationFingerprint:fp("b"),
 requestNonce:"nonce-1",acquisitionId:"acquisition-1",
 tlsPeerIndependentlyAuthenticated:false,oauthCredentialCustodyVerified:false,
 tenantAccessIndependentlyVerified:false,providerResponseIndependentlyVerified:false,
 executionAuthorized:false,publicationAuthorized:false,
};
const base={
 provider:"google",profile:GSC_READONLY_PROFILE,
 externalAccountId:GSC_READONLY_EXTERNAL_ACCOUNT_ID,
 grantedScopes:[GSC_READONLY_SCOPE],credentialSource:"provider_oauth",
 selectedProperty:"sc-domain:example.com",requestedProperty:"sc-domain:example.com",
 connectionSiteId:"site-1",expectedSiteId:"site-1",
 connectionStatus:"connected",credentialRevoked:false,
 credentialExpiresAt:"2026-10-09T05:00:00.000Z",
 evaluatedAt:"2026-10-09T04:00:00.000Z",rawResponse,
};
test("matching sanitized metadata is only pending independent trusted OAuth and TLS",()=>{
 const r=reviewCviGscCredentialProfile(base);
 assert.equal(r.status,"PENDING_TRUSTED_OAUTH_AND_TLS_ORIGIN_ATTESTATION");
 assert.deepEqual(r.reasons,[]);
 assert.equal(r.oauthProfileMatched,true);
 assert.equal(r.rawResponseBound,true);
 assert.equal(r.delegatedCredentialIndependentlyVerified,false);
 assert.equal(r.tlsOriginIndependentlyVerified,false);
 assert.equal(r.tenantPermissionIndependentlyVerified,false);
 assert.equal(r.executionAuthorized,false);
 assert.equal(r.publicationAuthorized,false);
});
test("legacy generic Google OAuth and widened GA4 scopes are rejected",()=>{
 for(const changes of [
  {externalAccountId:"google"},{profile:"legacy"},
  {grantedScopes:[GSC_READONLY_SCOPE,"https://www.googleapis.com/auth/analytics.readonly"]},
  {grantedScopes:["https://www.googleapis.com/auth/webmasters"]},
  {credentialSource:"app_login"},{provider:"shopify"},
 ]) assert.equal(reviewCviGscCredentialProfile({...base,...changes}).status,"DENY");
});
test("revoked, expired, pending and cross-site credentials reject",()=>{
 for(const changes of [
  {credentialRevoked:true},{connectionStatus:"pending"},
  {credentialExpiresAt:base.evaluatedAt},{credentialExpiresAt:"invalid"},
  {connectionSiteId:"other"},{selectedProperty:"sc-domain:attacker.test"},
 ]) assert.equal(reviewCviGscCredentialProfile({...base,...changes}).status,"DENY");
});
test("failed, altered or authority-granting raw response rejects",()=>{
 for(const raw of [
  {...rawResponse,status:"DENY" as const},
  {...rawResponse,rawBodySha256:"no"},
  {...rawResponse,publicationAuthorized:true as false},
  {...rawResponse,tlsPeerIndependentlyAuthenticated:true as false},
 ]) assert.equal(reviewCviGscCredentialProfile({...base,rawResponse:raw}).status,"DENY");
});
