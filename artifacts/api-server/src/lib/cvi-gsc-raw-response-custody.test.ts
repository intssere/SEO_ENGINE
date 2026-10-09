import assert from "node:assert/strict";
import test from "node:test";
import { buildUniversalSiteIdentity, buildUniversalConnectionIdentity } from "./universal-site-resource-identity.js";
import {
  reviewCviGscRawResponse, CVI_GSC_SITES_ENDPOINT,
  type CviGscRawResponse,
} from "./cvi-gsc-raw-response-custody.js";

const site=buildUniversalSiteIdentity({siteId:"site-1",canonicalOrigin:"https://example.com"});
const connection=buildUniversalConnectionIdentity({
  site,connectionId:"conn-1",provider:"google",externalAccountId:"google#gsc-read-only-v1",
});
const response:CviGscRawResponse={
  requestMethod:"GET",requestUrl:CVI_GSC_SITES_ENDPOINT,finalUrl:CVI_GSC_SITES_ENDPOINT,
  redirected:false,statusCode:200,contentType:"application/json; charset=utf-8",
  rawBody:Buffer.from(JSON.stringify({siteEntry:[
    {siteUrl:"sc-domain:example.com",permissionLevel:"siteFullUser"},
  ]})),
};
const base={
  site,connection,requestedProperty:"sc-domain:example.com",
  requestNonce:"nonce-1",acquisitionId:"acquisition-1",
  requestedAt:"2026-10-09T04:00:00.000Z",observedAt:"2026-10-09T04:00:02.000Z",
  response,
};
test("accepted synthetic HTTP response is bounded and never authenticates provider origin",()=>{
 const r=reviewCviGscRawResponse(base);
 assert.equal(r.status,"PENDING_TRUSTED_TLS_AND_PROVIDER_CREDENTIAL_CUSTODY");
 assert.deepEqual(r.reasons,[]);
 assert.match(r.rawBodySha256??"",/^[a-f0-9]{64}$/);
 assert.match(r.attestationFingerprint??"",/^[a-f0-9]{64}$/);
 assert.equal(r.tlsPeerIndependentlyAuthenticated,false);
 assert.equal(r.oauthCredentialCustodyVerified,false);
 assert.equal(r.providerResponseIndependentlyVerified,false);
 assert.equal(r.tenantAccessIndependentlyVerified,false);
 assert.equal(r.executionAuthorized,false);
 assert.equal(r.publicationAuthorized,false);
});
test("redirects, different endpoint, wrong method, MIME and non-200 fail closed",()=>{
 const changes:Partial<CviGscRawResponse>[]=[
   {redirected:true},{finalUrl:"https://attacker.test/webmasters/v3/sites"},
   {requestUrl:"https://www.googleapis.com/evil"},{requestMethod:"POST"},
   {contentType:"text/html"},{statusCode:302},{statusCode:403},
 ];
 for (const change of changes)
   assert.equal(reviewCviGscRawResponse({...base,response:{...response,...change}}).status,"DENY");
});
test("malformed, oversized or non-UTF8 JSON is denied",()=>{
 for (const rawBody of [
   Buffer.from("[]not-json"), Buffer.alloc(65_537,120),
   Buffer.from([0xff,0xfe]),Buffer.from(""),
 ]) {
   const r=reviewCviGscRawResponse({...base,response:{...response,rawBody}});
   assert.equal(r.status,"DENY");
 }
});
test("exact site property required, not suffix-based matching",()=>{
 const bad={...response,rawBody:Buffer.from(JSON.stringify({siteEntry:[
   {siteUrl:"sc-domain:example.com.attacker.test",permissionLevel:"siteFullUser"},
 ]}))};
 const r=reviewCviGscRawResponse({...base,response:bad});
 assert.equal(r.status,"DENY");
 assert.ok(r.reasons.includes("gsc_property_attestation_denied"));
});
test("nonce, acquisition ID, timestamps and connection must satisfy offline boundary",()=>{
 for (const override of [
  {requestNonce:""},{acquisitionId:" "},
  {observedAt:"2026-10-09T03:59:00.000Z"},
  {observedAt:"2026-10-09T04:00:31.000Z"},
  {observedAt:"wrong"},
 ]) assert.equal(reviewCviGscRawResponse({...base,...override}).status,"DENY");
 const other=buildUniversalConnectionIdentity({
   site,connectionId:"conn-2",provider:"shopify",
 });
 assert.equal(reviewCviGscRawResponse({...base,connection:other}).status,"DENY");
});
test("different raw bytes produce different body hash even if JSON describes same evidence",()=>{
 const a=reviewCviGscRawResponse(base);
 const b=reviewCviGscRawResponse({...base,response:{...response,
   rawBody:Buffer.from('{"siteEntry": [ {"siteUrl":"sc-domain:example.com","permissionLevel":"siteFullUser"} ]}'),
 }});
 assert.notEqual(a.rawBodySha256,b.rawBodySha256);
 assert.equal(b.status,"PENDING_TRUSTED_TLS_AND_PROVIDER_CREDENTIAL_CUSTODY");
});
