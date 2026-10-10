import assert from "node:assert/strict";
import test from "node:test";
import type { AuthPrincipal } from "./auth-foundation.js";
import { CVI_GSC_ACQUISITION_LINEAGE_VERSION,type CviGscAcquisitionLineage } from "./cvi-gsc-acquisition-lineage.js";
import {createCviServerPrincipalReadback} from "./cvi-gsc-server-principal-readback.js";
const uid=(v:string)=>v.repeat(8)+"-"+v.repeat(4)+"-4"+v.repeat(3)+"-8"+v.repeat(3)+"-"+v.repeat(12);
const tenantId=uid("a"),siteId=uid("b"),connectionId=uid("c"),sessionId=uid("d");
const fp=(c:string)=>c.repeat(64);
const principal:AuthPrincipal={
 sessionId,subject:"verified-subject",email:"user@example.test",displayName:null,
 role:"viewer",csrfTokenHash:fp("e"),issuedAt:"2026-10-10T00:00:00.000Z",
 lastSeenAt:"2026-10-10T00:01:00.000Z",expiresAt:"2026-10-10T01:00:00.000Z",
};
const lineage:CviGscAcquisitionLineage={
 version:CVI_GSC_ACQUISITION_LINEAGE_VERSION,status:"UNTRUSTED_CAPTURE_REVIEW_ONLY",
 reasons:[],tenantId,siteId,connectionId,authSubject:principal.subject,authSessionId:sessionId,
 acquisitionId:"acq-1",requestNonce:"nonce-1",requestedResource:"sc-domain:example.com",
 observationFingerprint:fp("a"),attestationFingerprint:fp("b"),packetFingerprint:fp("c"),
 requestIdentityConsistent:true,independentProviderOriginVerified:false,
 independentOAuthCustodyVerified:false,durableReplayVerified:false,
 executionAuthorized:false,publicationAuthorized:false,
};
const row={
 acquisitionId:"acq-1",tenantId,siteId,connectionId,authSubject:principal.subject,
 authSessionId:sessionId,requestNonce:"nonce-1",requestedResource:"sc-domain:example.com",
 observationFingerprint:fp("a"),disposition:"recorded_untrusted",
};
const context=()=>({
 getAuthenticatedPrincipal:async()=>principal,
 getServerBoundSiteConnection:async()=>({tenantId,siteId,connectionId}),
 now:()=>"2026-10-10T00:03:00.000Z",
 store:{fetchScoped:async(_input:unknown)=>row},
});
test("server-side contextual identity yields only untrusted historical review, no authority",async()=>{
 const r=await createCviServerPrincipalReadback(context())({acquisitionId:"acq-1",lineage});
 assert.equal(r.status,"UNTRUSTED_SCOPED_HISTORICAL_REVIEW_ONLY");
 assert.equal(r.historicalRecordMatched,true);
 assert.equal(r.principalAuthenticatedIndependently,false);
 assert.equal(r.providerOriginAuthenticated,false);
 assert.equal(r.executionAuthorized,false);
 assert.equal(r.publicationAuthorized,false);
});
test("supplied identity in lineage cannot override server principal or server site",async()=>{
 let calls=0;
 const deps={...context(),store:{fetchScoped:async()=>{calls++;return row;}}};
 const read=createCviServerPrincipalReadback(deps);
 for(const altered of [
  {...lineage,tenantId:uid("f")},{...lineage,authSessionId:uid("e")},
  {...lineage,authSubject:"attacker"},{...lineage,siteId:uid("f")},
 ])assert.equal((await read({acquisitionId:"acq-1",lineage:altered})).status,"DENY");
 assert.equal(calls,0);
});
test("missing principal, expired session, invalid site binding and source failures deny before query",async()=>{
 const read=(override:Partial<ReturnType<typeof context>>)=>createCviServerPrincipalReadback({...context(),...override});
 for(const deps of [
  {getAuthenticatedPrincipal:async()=>null},
  {getAuthenticatedPrincipal:async()=>({...principal,expiresAt:"2026-10-10T00:01:00.000Z"})},
  {getServerBoundSiteConnection:async()=>({tenantId:"unverified",siteId,connectionId})},
  {getAuthenticatedPrincipal:async()=>{throw Error("secret");}},
 ]) {
  const result=await read(deps)({acquisitionId:"acq-1",lineage});
  assert.equal(result.status,"DENY");
 }
});
test("invalid acquisition ID, missing DB row, or transport failure cannot elevate authority",async()=>{
 let calls=0;
 const deps={...context(),store:{fetchScoped:async()=>{calls++;return row;}}};
 assert.equal((await createCviServerPrincipalReadback(deps)({acquisitionId:" ",lineage})).status,"DENY");
 assert.equal(calls,0);
 const absent=await createCviServerPrincipalReadback({
  ...context(),store:{fetchScoped:async()=>null},
 })({acquisitionId:"acq-1",lineage});
 assert.equal(absent.status,"DENY");
 const errored=await createCviServerPrincipalReadback({
  ...context(),store:{fetchScoped:async()=>{throw Error("DB password");}},
 })({acquisitionId:"acq-1",lineage});
 assert.equal(errored.status,"DENY");
 assert.ok(!JSON.stringify(errored).includes("password"));
});
