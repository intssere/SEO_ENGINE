import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";
import type { AuthPrincipal } from "./auth-foundation.js";
import {reviewCviExpressAuthenticatedPrincipal,bindCviPrincipalReadbackToExpressRequest} from "./cvi-gsc-express-auth-gate.js";
import {CVI_GSC_ACQUISITION_LINEAGE_VERSION,type CviGscAcquisitionLineage} from "./cvi-gsc-acquisition-lineage.js";
const uuid=(c:string)=>c.repeat(8)+"-"+c.repeat(4)+"-4"+c.repeat(3)+"-8"+c.repeat(3)+"-"+c.repeat(12);
const ids={tenantId:uuid("a"),siteId:uuid("b"),connectionId:uuid("c")};
const principal:AuthPrincipal={
 sessionId:uuid("d"),subject:"verified-subject",email:"user@example.test",
 displayName:null,role:"viewer",csrfTokenHash:"e".repeat(64),
 issuedAt:"2026-10-10T00:00:00.000Z",lastSeenAt:"2026-10-10T00:02:00.000Z",
 expiresAt:"2026-10-10T01:00:00.000Z",
};
const when="2026-10-10T00:03:00.000Z";
const req=(auth?:AuthPrincipal)=>({auth} as Pick<Request,"auth">);
test("CVI specifically rejects application's optional authentication-disabled mode",()=>{
 for(const config of [{enabled:false,configured:true},{enabled:true,configured:false},{enabled:false,configured:false}])
  assert.equal(reviewCviExpressAuthenticatedPrincipal({req:req(principal),config,evaluatedAt:when}).status,"DENY");
});
test("only the protected req.auth principal is considered; no fallback for missing or expired auth",()=>{
 const config={enabled:true,configured:true};
 assert.equal(reviewCviExpressAuthenticatedPrincipal({req:req(),config,evaluatedAt:when}).status,"DENY");
 for(const auth of [
   {...principal,expiresAt:when},{...principal,sessionId:"not-a-uuid"},
   {...principal,subject:""},{...principal,role:"owner" as AuthPrincipal["role"]},
   {...principal,issuedAt:"2026-10-10T00:04:00.000Z"},
 ]) assert.equal(reviewCviExpressAuthenticatedPrincipal({req:req(auth),config,evaluatedAt:when}).status,"DENY");
 assert.equal(reviewCviExpressAuthenticatedPrincipal({req:req(principal),config,evaluatedAt:when}).status,
 "AUTH_CONTEXT_PRESENT_REVIEW_ONLY");
});
const lineage:CviGscAcquisitionLineage={
 version:CVI_GSC_ACQUISITION_LINEAGE_VERSION,status:"UNTRUSTED_CAPTURE_REVIEW_ONLY",
 reasons:[],...ids,authSubject:principal.subject,authSessionId:principal.sessionId,
 acquisitionId:"acq-1",requestNonce:"nonce-1",requestedResource:"sc-domain:example.com",
 observationFingerprint:"a".repeat(64),attestationFingerprint:"b".repeat(64),
 packetFingerprint:"c".repeat(64),requestIdentityConsistent:true,
 independentProviderOriginVerified:false,independentOAuthCustodyVerified:false,
 durableReplayVerified:false,executionAuthorized:false,publicationAuthorized:false,
};
const row={acquisitionId:"acq-1",...ids,authSubject:principal.subject,authSessionId:principal.sessionId,
 requestNonce:"nonce-1",requestedResource:"sc-domain:example.com",
 observationFingerprint:"a".repeat(64),disposition:"recorded_untrusted"};
test("private facade uses server request auth and server site resolver; only historical review",async()=>{
 let lookups=0;
 const read=bindCviPrincipalReadbackToExpressRequest({
  req:req(principal),config:{enabled:true,configured:true},now:()=>when,
  resolveServerSiteConnection:async()=>ids,
  store:{fetchScoped:async()=>{lookups++;return row;}},
 });
 const r=await read({acquisitionId:"acq-1",lineage});
 assert.equal(r.status,"UNTRUSTED_SCOPED_HISTORICAL_REVIEW_ONLY");
 assert.equal(lookups,1);
 assert.equal(r.principalAuthenticatedIndependently,false);
 assert.equal(r.executionAuthorized,false);
 assert.equal(r.publicationAuthorized,false);
});
test("disabled/missing request auth stops read before DB access, even with matching claimed lineage",async()=>{
 let calls=0;
 for(const [auth,config] of [
  [principal,{enabled:false,configured:true}],
  [undefined,{enabled:true,configured:true}],
  [principal,{enabled:true,configured:false}],
 ] as const){
  const read=bindCviPrincipalReadbackToExpressRequest({
   req:req(auth),config,now:()=>when,
   resolveServerSiteConnection:async()=>ids,
   store:{fetchScoped:async()=>{calls++;return row;}},
  });
  assert.equal((await read({acquisitionId:"acq-1",lineage})).status,"DENY");
 }
 assert.equal(calls,0);
});
