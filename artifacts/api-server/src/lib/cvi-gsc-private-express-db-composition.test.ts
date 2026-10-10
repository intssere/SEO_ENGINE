import assert from "node:assert/strict";
import test from "node:test";
import type postgres from "postgres";
import type { Request } from "express";
import type { AuthPrincipal } from "./auth-foundation.js";
import { CVI_GSC_ACQUISITION_LINEAGE_VERSION, type CviGscAcquisitionLineage } from "./cvi-gsc-acquisition-lineage.js";
import { CVI_GSC_SERVER_SCOPE_RESOLVER_SQL } from "./cvi-gsc-server-scope-resolver.js";
import { CVI_GSC_SCOPED_READBACK_SQL } from "./cvi-gsc-scoped-ledger-readback.js";
import { createCviPrivateExpressDbComposition } from "./cvi-gsc-private-express-db-composition.js";

const uuid=(c:string)=>c.repeat(8)+"-"+c.repeat(4)+"-4"+c.repeat(3)+"-8"+c.repeat(3)+"-"+c.repeat(12);
const scope={tenantId:uuid("a"),siteId:uuid("b"),connectionId:uuid("c")};
const principal:AuthPrincipal={
 sessionId:uuid("d"),subject:"verified-subject",email:"person@example.test",
 displayName:null,role:"viewer",csrfTokenHash:"e".repeat(64),
 issuedAt:"2026-10-10T00:00:00.000Z",lastSeenAt:"2026-10-10T00:01:00.000Z",
 expiresAt:"2026-10-10T01:00:00.000Z",
};
const lineage:CviGscAcquisitionLineage={
 version:CVI_GSC_ACQUISITION_LINEAGE_VERSION,status:"UNTRUSTED_CAPTURE_REVIEW_ONLY",
 reasons:[],...scope,authSubject:principal.subject,authSessionId:principal.sessionId,
 acquisitionId:"acq-1",requestNonce:"nonce-1",requestedResource:"sc-domain:example.com",
 observationFingerprint:"a".repeat(64),attestationFingerprint:"b".repeat(64),
 packetFingerprint:"c".repeat(64),requestIdentityConsistent:true,
 independentProviderOriginVerified:false,independentOAuthCustodyVerified:false,
 durableReplayVerified:false,executionAuthorized:false,publicationAuthorized:false,
};
const record={acquisitionId:lineage.acquisitionId,...scope,authSubject:principal.subject,
 authSessionId:principal.sessionId,requestNonce:lineage.requestNonce,
 requestedResource:lineage.requestedResource,observationFingerprint:lineage.observationFingerprint,
 disposition:"recorded_untrusted"};
const req=(auth?:AuthPrincipal)=>({auth} as Pick<Request,"auth">);
function fakeDb(rows:{scope?:unknown[];record?:unknown[]},calls:string[]){
 return {unsafe:async(sql:string,_args:unknown[])=>{
   calls.push(sql);
   if(sql===CVI_GSC_SERVER_SCOPE_RESOLVER_SQL)return rows.scope??[];
   if(sql===CVI_GSC_SCOPED_READBACK_SQL)return rows.record??[];
   throw Error("unknown SQL");
 }} as unknown as postgres.Sql;
}
const now=()=>"2026-10-10T00:03:00.000Z";
const request={req:req(principal),acquisitionId:"acq-1",lineage};
test("valid protected context performs exactly two independently scoped reads; authority stays false",async()=>{
 const calls:string[]=[];
 const run=createCviPrivateExpressDbComposition({
  sql:fakeDb({scope:[scope],record:[record]},calls),
  authConfig:{enabled:true,configured:true},now,
 });
 const result=await run(request);
 assert.equal(result.status,"UNTRUSTED_HISTORICAL_REVIEW_ONLY");
 assert.deepEqual(calls,[CVI_GSC_SERVER_SCOPE_RESOLVER_SQL,CVI_GSC_SCOPED_READBACK_SQL]);
 assert.equal(result.executionAuthorized,false);
 assert.equal(result.publicationAuthorized,false);
 assert.equal(result.providerOriginVerified,false);
 assert.equal(result.tenantAuthorizationForFutureOperations,false);
});
test("authentication disabled or missing principal makes zero DB calls",async()=>{
 for(const [auth,authConfig] of [
  [principal,{enabled:false,configured:true}],
  [undefined,{enabled:true,configured:true}],
  [principal,{enabled:true,configured:false}],
 ] as const){
  const calls:string[]=[];
  const run=createCviPrivateExpressDbComposition({
   sql:fakeDb({scope:[scope],record:[record]},calls),authConfig,now,
  });
  assert.equal((await run({...request,req:req(auth)})).status,"DENY");
  assert.deepEqual(calls,[]);
 }
});
test("identity tampering, revoked scope and denied second read all fail closed",async()=>{
 for(const fixture of [
  {scope:[],record:[record]},
  {scope:[scope],record:[]},
  {scope:[scope],record:[{...record,tenantId:uuid("f")}]},
 ]) {
  const calls:string[]=[];
  const run=createCviPrivateExpressDbComposition({
   sql:fakeDb(fixture,calls),authConfig:{enabled:true,configured:true},now,
  });
  assert.equal((await run(request)).status,"DENY");
 }
 const calls:string[]=[];
 const run=createCviPrivateExpressDbComposition({
  sql:fakeDb({scope:[scope],record:[record]},calls),
  authConfig:{enabled:true,configured:true},now,
 });
 assert.equal((await run({...request,lineage:{...lineage,authSubject:"attacker"}})).status,"DENY");
 assert.equal(calls.length,1,"lineage substitution must stop before second scoped DB read");
});
test("invalid request identifier and database errors never reveal private driver messages",async()=>{
 const calls:string[]=[];
 const run=createCviPrivateExpressDbComposition({
  sql:fakeDb({scope:[scope],record:[record]},calls),
  authConfig:{enabled:true,configured:true},now,
 });
 assert.equal((await run({...request,acquisitionId:" invalid "})).status,"DENY");
 assert.equal(calls.length,0);
 const errorDb={unsafe:async()=>{throw Error("database-url-secret");}} as unknown as postgres.Sql;
 const err=await createCviPrivateExpressDbComposition({
  sql:errorDb,authConfig:{enabled:true,configured:true},now,
 })(request);
 assert.equal(err.status,"DENY");
 assert.ok(!JSON.stringify(err).includes("database-url-secret"));
});
