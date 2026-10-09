import assert from "node:assert/strict";
import test from "node:test";
import { buildUniversalSiteIdentity, buildUniversalConnectionIdentity } from "./universal-site-resource-identity.js";
import { inspectCviGscReadTransport } from "./cvi-gsc-read-transport-boundary.js";

const site=buildUniversalSiteIdentity({siteId:"site-1",canonicalOrigin:"https://example.com"});
const connection=buildUniversalConnectionIdentity({site,connectionId:"connection-1",provider:"google",externalAccountId:"google#gsc-read-only-v1"});
const observation={siteEntry:[{siteUrl:"sc-domain:example.com",permissionLevel:"siteFullUser"}]};
const defaultInput={
 site,connection,requestedProperty:"sc-domain:example.com",
 evaluatedAt:"2026-10-09T04:00:00.000Z",maxAgeSeconds:300,
 transport:{listSitesReadOnly:async()=>observation},
 observedAt:()=>"2026-10-09T04:00:01.000Z",
};
test("apparent live result never verifies tenant entitlement or grants access",async()=>{
 const r=await inspectCviGscReadTransport(defaultInput);
 assert.equal(r.status,"PENDING_TRUSTED_TRANSPORT_AND_TENANT_ATTESTATION");
 assert.equal(r.authorizationGranted,false);
 assert.equal(r.independentlyVerified,false);
 assert.equal(r.publicationAuthorized,false);
 assert.equal(r.executionAuthorized,false);
 assert.match(r.observationFingerprint??"",/^[a-f0-9]{64}$/);
});
test("rejected property, spoofed provider data and weak permission deny",async()=>{
 for(const payload of [
  {siteEntry:[]},
  {siteEntry:[{siteUrl:"sc-domain:example.com.attacker.test",permissionLevel:"siteFullUser"}]},
  {siteEntry:[{siteUrl:"sc-domain:example.com",permissionLevel:"siteUnverifiedUser"}]},
  {siteEntry:"invalid"},
 ]) {
  const r=await inspectCviGscReadTransport({...defaultInput,transport:{listSitesReadOnly:async()=>payload}});
  assert.equal(r.status,"DENY");
  assert.equal(r.authorizationGranted,false);
 }
});
test("provider failure is fail-closed without leaking exception",async()=>{
 const r=await inspectCviGscReadTransport({...defaultInput,transport:{listSitesReadOnly:async()=>{throw new Error("secret-token");}}});
 assert.deepEqual(r.reasons,["transport_failed"]);
 assert.equal(r.observationFingerprint,null);
});
test("clock drift or async reading too long denies",async()=>{
 for(const stamp of ["2026-10-09T03:59:59.000Z","2026-10-09T04:00:31.000Z","invalid"]) {
  const r=await inspectCviGscReadTransport({...defaultInput,observedAt:()=>stamp});
  assert.equal(r.status,"DENY");
 }
});
test("wrong connection identity and provider deny before transport invocation",async()=>{
 let reads=0;
 const wrong=buildUniversalConnectionIdentity({site,connectionId:"other",provider:"shopify"});
 const r=await inspectCviGscReadTransport({...defaultInput,connection:wrong,transport:{listSitesReadOnly:async()=>{reads++;return observation;}}});
 assert.equal(r.status,"DENY");
 assert.equal(reads,0);
});
test("invalid freshness policy denies before transport invocation",async()=>{
 let reads=0;
 const r=await inspectCviGscReadTransport({...defaultInput,maxAgeSeconds:3601,transport:{listSitesReadOnly:async()=>{reads++;return observation;}}});
 assert.equal(r.status,"DENY");
 assert.equal(reads,0);
});
