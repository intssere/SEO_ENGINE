/** A12.22 disconnected tests; no production DB, token issuer or runtime auth. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  DisconnectedTrustedTenantBinding
} from "./pilot-01-rt01a12-22-disconnected-trusted-binding.js";
import type {
  TrustedCustodyPorts,SessionEvidence,IssuerEvidence,MembershipEvidence
} from "./pilot-01-rt01a12-7-disconnected-custody.js";
import type {
  TransactionCustodyPort,TransactionRequest,TxResult
} from "./pilot-01-rt01a12-8-disconnected-transaction.js";
const now=Date.parse("2026-11-08T00:00:00.000Z");
const expiry=new Date(now+3600000).toISOString();
const org="org-a",site="site-a",subject="subject-a";
const session:SessionEvidence={
  sessionId:"session-a",subject,role:"operator",active:true,revokedAt:null,expiresAt:expiry
};
const membership:MembershipEvidence={
  organizationId:org,subject,role:"operator",active:true,revokedAt:null,
  expiresAt:expiry,revision:3
};
const issuer:IssuerEvidence={
  issuerId:"issuer-a",organizationId:org,siteId:site,actorSubject:subject,
  operation:"analyze",active:true,revokedAt:null,expiresAt:expiry,
  provenanceSha256:"a".repeat(64),revision:8
};
const intent={
  siteId:site,issuerId:"issuer-a",operation:"analyze",
  grantId:"grant-a",idempotencyKey:"request-a",requestSha256:"b".repeat(64)
} as const;
type Overrides=Readonly<{session?:SessionEvidence|null;membership?:MembershipEvidence|null;
 issuer?:IssuerEvidence|null;siteOrg?:string;rejectSession?:boolean}>;
function trusted(override:Overrides={}):TrustedCustodyPorts{
  return {
    session:{async current(){
      if(override.rejectSession)throw Error("SESSION_SOURCE_UNAVAILABLE");
      return override.session===undefined?session:override.session;
    }},
    site:{async get(s){
      return s===site?{organizationId:override.siteOrg??org,siteId:site,active:true}:null;
    }},
    membership:{async get(s,o){
      if(s!==subject||o!==org)return null;
      return override.membership===undefined?membership:override.membership;
    }},
    issuer:{async get(id){
      return id==="issuer-a"?(override.issuer===undefined?issuer:override.issuer):null;
    }},
    now:()=>now
  };
}
function transaction(f:(r:TransactionRequest)=>Promise<TxResult>):TransactionCustodyPort{
  return {
    admitWithCustody:f,
    async reconcileReadOnly(){return {status:"unavailable"};}
  };
}
test("A12.22 builds transaction authority exclusively from server-owned custody sources",async()=>{
  let seen:TransactionRequest|undefined;
  const gate=new DisconnectedTrustedTenantBinding(trusted(),transaction(async r=>{
    seen=r;return {status:"denied"};
  }));
  const forged={
    ...intent,organizationId:"org-b",actorSubject:"attacker",
    sessionId:"forged",role:"admin",issuerProvenanceSha256:"0".repeat(64),
    membershipRevision:999,issuerRevision:999,
    tenantGuc:"org-b",sessionActive:true,authenticated:true
  };
  assert.deepEqual(await gate.admit(forged),{status:"denied"});
  assert.deepEqual(seen?.scope,{
    organizationId:org,siteId:site,actorSubject:subject,sessionId:"session-a",
    issuerId:"issuer-a",operation:"analyze"
  });
  assert.deepEqual(seen?.fence,{membershipRevision:3,issuerRevision:8});
  assert.equal(seen?.intent.requestSha256,intent.requestSha256);
});
test("A12.22 rejects missing, forged and revoked session; never calls transaction",async()=>{
  for(const state of [
    null,
    {...session,subject:"subject-b"},
    {...session,role:"viewer" as const},
    {...session,revokedAt:new Date(now-1000).toISOString()},
    {...session,expiresAt:new Date(now-1).toISOString()}
  ]){
    let called=false;
    const gate=new DisconnectedTrustedTenantBinding(trusted({session:state}),
      transaction(async()=>{called=true;return {status:"commit_unknown"};}));
    assert.equal((await gate.admit(intent)).status,"denied");
    assert.equal(called,false);
  }
});
test("A12.22 rejects cross-tenant scope, inactive membership and wrong issuer provenance",async()=>{
  for(const x of [
    {siteOrg:"org-b"},
    {membership:{...membership,active:false}},
    {membership:{...membership,revokedAt:expiry}},
    {issuer:{...issuer,organizationId:"org-b"}},
    {issuer:{...issuer,actorSubject:"subject-b"}},
    {issuer:{...issuer,provenanceSha256:"untrusted"}},
    {issuer:{...issuer,expiresAt:new Date(now-1).toISOString()}}
  ]){
    let called=false;
    const gate=new DisconnectedTrustedTenantBinding(trusted(x),
      transaction(async()=>{called=true;return {status:"commit_unknown"};}));
    assert.equal((await gate.admit(intent)).status,"denied");
    assert.equal(called,false);
  }
});
test("A12.22 refuses input with invalid grant, digest, issuer and site",async()=>{
  let called=false;const gate=new DisconnectedTrustedTenantBinding(trusted(),
    transaction(async()=>{called=true;return {status:"commit_unknown"};}));
  for(const v of [
    null,{}, {...intent,grantId:""},
    {...intent,requestSha256:"0"},
    {...intent,operation:"write"}, {...intent,siteId:"site-b"},
    {...intent,issuerId:"issuer-b"}, {...intent,idempotencyKey:" "}
  ]){
    assert.equal((await gate.admit(v)).status,"denied");
  }
  assert.equal(called,false);
});
test("A12.22 fails closed on untrusted custody source outage",async()=>{
  const gate=new DisconnectedTrustedTenantBinding(trusted({rejectSession:true}),
    transaction(async()=>{throw Error("SHOULD_NOT_RUN");}));
  assert.deepEqual(await gate.admit(intent),{status:"unavailable"});
});
test("A12.22 transaction revocation race is authoritative after preliminary verification",async()=>{
  let revision=3,active=true;
  const gate=new DisconnectedTrustedTenantBinding(trusted(),
    transaction(async request=>{
      if(!active||revision!==request.fence.membershipRevision)return {status:"denied"};
      return {status:"unavailable"};
    }));
  revision=4;active=false;
  assert.deepEqual(await gate.admit(intent),{status:"denied"});
});
test("A12.22 unknown transaction commit is fail closed and never retried",async()=>{
  let calls=0;
  const gate=new DisconnectedTrustedTenantBinding(trusted(),
    transaction(async()=>{calls++;throw Error("synthetic transaction transport unknown");}));
  assert.deepEqual(await gate.admit(intent),{status:"commit_unknown"});
  assert.equal(calls,1);
});
