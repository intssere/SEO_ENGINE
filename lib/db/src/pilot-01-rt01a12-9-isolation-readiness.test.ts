/** Network-free A12.9 negative tests; no DB client, SQL or credentials. */
import test from "node:test";
import assert from "node:assert/strict";
import {assessRole,assessTransaction,migrationReadiness,LOCK_ORDER,
  type RlsModel,type RoleSpec,type SyntheticTransaction}
  from "./pilot-01-rt01a12-9-isolation-readiness.js";
const all={grants:true,jobs:true,admissions:true,job_events:true,outbox:true};
const rls:RlsModel={enabled:all,forced:all,policiesComplete:true,
  trustedTenantContext:true,trustedActorContext:true,
  tenantBoundToSession:true,contextResetBetweenRequests:true};
const role:RoleSpec={role:"api",login:true,bypassRls:false,superuser:false,
  ownsPilotSchema:false,securityDefiner:false,
  allowed:[{relation:"jobs",action:"select"}]};
const tx:SyntheticTransaction={
  scope:{organizationId:"org-a",siteId:"site-a",subject:"actor-a",issuerId:"issuer-a"},
  fence:{membershipRevision:4,issuerRevision:8},
  observed:{organizationId:"org-a",siteId:"site-a",subject:"actor-a",issuerId:"issuer-a",
    sessionActive:true,siteActive:true,membershipActive:true,issuerActive:true,
    membershipRevision:4,issuerRevision:8},
  locks:LOCK_ORDER,databaseTimeTrusted:true,authorizationRecheckedAtCommit:true,
  revocationSerialized:true,transactionAtomic:true
};
test("only a synthetic role candidate; never certified for execution",()=>{
  assert.equal(assessRole(role,rls),"candidate-review");
});
test("deny bypassrls, superuser, definer, schema-owner login and write privileges",()=>{
  for(const patch of [{bypassRls:true},{superuser:true},{securityDefiner:true},
    {ownsPilotSchema:true},{allowed:[{relation:"jobs",action:"update"}]},
    {allowed:[{relation:"jobs",action:"execute"}]}] as Partial<RoleSpec>[]){
    assert.equal(assessRole({...role,...patch},rls),"blocked");
  }
  assert.equal(assessRole({...role,role:"auditor",allowed:[{relation:"outbox",action:"delete"}]},rls),"blocked");
  assert.equal(assessRole({...role,role:"worker",allowed:[{relation:"admissions",action:"update"}]},rls),"blocked");
});
test("deny incomplete FORCE RLS, untrusted scope and leaked session context",()=>{
  for(const patch of [{forced:{...all,jobs:false}},
    {enabled:{...all,outbox:false}},{policiesComplete:false},
    {trustedTenantContext:false},{trustedActorContext:false},
    {tenantBoundToSession:false},{contextResetBetweenRequests:false}] as Partial<RlsModel>[]){
    assert.equal(assessRole(role,{...rls,...patch}),"blocked");
  }
});
test("synthetic transaction ordering baseline is only design-consistent",()=>{
  assert.equal(assessTransaction(tx),"design-consistent");
});
test("deny cross-tenant, wrong-site, wrong-actor, wrong-issuer and stale versions",()=>{
  for(const patch of [{organizationId:"org-b"},{siteId:"site-b"},
    {subject:"actor-b"},{issuerId:"issuer-b"},
    {membershipRevision:5},{issuerRevision:9}]){
    assert.equal(assessTransaction({...tx,observed:{...tx.observed,...patch}}),"blocked");
  }
});
test("deny missing lock, reversed lock order and unprotected revocation window",()=>{
  for(const locks of [LOCK_ORDER.slice(1),[...LOCK_ORDER].reverse(),
    [...LOCK_ORDER.slice(0,2),"issuer","membership",...LOCK_ORDER.slice(4)] as typeof LOCK_ORDER]){
    assert.equal(assessTransaction({...tx,locks}),"blocked");
  }
  for(const patch of [{databaseTimeTrusted:false},{authorizationRecheckedAtCommit:false},
    {revocationSerialized:false},{transactionAtomic:false}]){
    assert.equal(assessTransaction({...tx,...patch}),"blocked");
  }
});
test("deny revoked/expired-like inactive synthetic evidence and zero revisions",()=>{
  for(const field of ["sessionActive","siteActive","membershipActive","issuerActive"] as const){
    assert.equal(assessTransaction({...tx,observed:{...tx.observed,[field]:false}}),"blocked");
  }
  assert.equal(assessTransaction({...tx,fence:{...tx.fence,issuerRevision:0}}),"blocked");
});
test("source-only migration plan remains blocked without every independent audit",()=>{
  const allChecks={ledgerVerified:true,checksumsVerified:true,driftReviewed:true,
    privilegesReviewed:true,indexesReviewed:true,rollbackReviewed:true,
    canonicalReplayVerified:true};
  assert.equal(migrationReadiness(allChecks),"design-review");
  for(const key of Object.keys(allChecks) as (keyof typeof allChecks)[]){
    assert.equal(migrationReadiness({...allChecks,[key]:false}),"blocked",key);
  }
});
