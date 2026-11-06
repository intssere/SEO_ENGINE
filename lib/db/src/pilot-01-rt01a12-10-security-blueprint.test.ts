/** Disconnected A12.10 regression suite: no sockets, env, SQL, or DB clients. */
import test from "node:test";
import assert from "node:assert/strict";
import {assessCustodyDesign,assessRlsBlueprint,assessMigrationBlueprint,
  assessAcceptancePlan,REQUIRED_FUTURE_ACCEPTANCE,type RequestedScope,
  type EvidenceSet,type RlsReadiness,type MigrationPlan}
from "./pilot-01-rt01a12-10-security-blueprint.js";
const now=1_800_000_000_000;
const scope:RequestedScope={sessionId:"s1",organizationId:"org-a",siteId:"site-a",
  subject:"actor-a",issuerId:"issuer-a",operation:"analyze",
  membershipRevision:4,issuerRevision:8};
const proof:EvidenceSet={
  databaseNow:now,transactionalRecheck:true,revocationSerialized:true,
  session:{id:"s1",subject:"actor-a",active:true,revokedAt:null,expiresAt:now+10000},
  site:{id:"site-a",organizationId:"org-a",active:true},
  membership:{organizationId:"org-a",subject:"actor-a",role:"operator",
    active:true,revokedAt:null,expiresAt:now+10000,revision:4},
  issuer:{issuerId:"issuer-a",organizationId:"org-a",siteId:"site-a",
    actorSubject:"actor-a",operation:"analyze",active:true,revokedAt:null,
    expiresAt:now+10000,revision:8,provenanceSha256:"a".repeat(64),
    serverCustodyConfirmed:true}
};
test("positive synthetic custody is design-consistent, not authenticated",()=>{
  assert.equal(assessCustodyDesign(scope,proof),"design-consistent");
});
test("fail closed on missing evidence and nontransactional checks",()=>{
  for(const patch of [{session:null},{site:null},{membership:null},{issuer:null},
    {transactionalRecheck:false},{revocationSerialized:false},{databaseNow:NaN}]){
    assert.equal(assessCustodyDesign(scope,{...proof,...patch}),"blocked");
  }
});
test("reject cross-tenant, site and impersonated session/membership/issuer",()=>{
  assert.equal(assessCustodyDesign(scope,{...proof,site:{...proof.site!,organizationId:"org-b"}}),"blocked");
  assert.equal(assessCustodyDesign(scope,{...proof,session:{...proof.session!,subject:"actor-b"}}),"blocked");
  assert.equal(assessCustodyDesign(scope,{...proof,membership:{...proof.membership!,organizationId:"org-b"}}),"blocked");
  assert.equal(assessCustodyDesign(scope,{...proof,issuer:{...proof.issuer!,siteId:"site-b"}}),"blocked");
  assert.equal(assessCustodyDesign({...scope,operation:"recommend"},proof),"blocked");
});
test("revocation, expiry and viewer role deny",()=>{
  assert.equal(assessCustodyDesign(scope,{...proof,session:{...proof.session!,revokedAt:now-1}}),"blocked");
  assert.equal(assessCustodyDesign(scope,{...proof,membership:{...proof.membership!,role:"viewer"}}),"blocked");
  assert.equal(assessCustodyDesign(scope,{...proof,membership:{...proof.membership!,expiresAt:now}}),"blocked");
  assert.equal(assessCustodyDesign(scope,{...proof,issuer:{...proof.issuer!,active:false}}),"blocked");
});
test("stale revision and merely formatted provenance cannot stand in for issuer custody",()=>{
  assert.equal(assessCustodyDesign({...scope,membershipRevision:3},proof),"blocked");
  assert.equal(assessCustodyDesign({...scope,issuerRevision:7},proof),"blocked");
  assert.equal(assessCustodyDesign(scope,{...proof,issuer:{...proof.issuer!,serverCustodyConfirmed:false}}),"blocked");
  assert.equal(assessCustodyDesign(scope,{...proof,issuer:{...proof.issuer!,provenanceSha256:"bogus"}}),"blocked");
});
const rls:RlsReadiness={
  allPilotTablesEnableAndForceRls:true,policiesPerRoleReviewed:true,
  usingAndWithCheckReviewed:true,noBypassRlsOrSuperuser:true,
  noUnsafeSecurityDefiner:true,noPublicGrants:true,
  trustedTransactionTenantContext:true,poolContextReset:true,
  nonOwnerLeastPrivilegeTestPlanned:true
};
test("RLS blueprint rejects any missing least-privilege prerequisite",()=>{
  assert.equal(assessRlsBlueprint(rls),"design-consistent");
  for(const k of Object.keys(rls) as (keyof RlsReadiness)[]){
    assert.equal(assessRlsBlueprint({...rls,[k]:false}),"blocked",k);
  }
});
const migration:MigrationPlan={
  existingLedgerInspected:true,checksumsCompared:true,schemaDriftAssessed:true,
  uniqueSiteIndexImpactReviewed:true,compositeForeignKeysPlanned:true,
  membershipAndIssuerCustodyPlanned:true,rolePoliciesSeparatelyReviewed:true,
  rollbackAndLockRiskReviewed:true,noOperationalMigrationCreated:true
};
test("migration blueprint fails closed on missing review gate",()=>{
  assert.equal(assessMigrationBlueprint(migration),"design-consistent");
  for(const k of Object.keys(migration) as (keyof MigrationPlan)[]){
    assert.equal(assessMigrationBlueprint({...migration,[k]:false}),"blocked",k);
  }
});
test("future acceptance matrix cannot omit any mandatory negative case",()=>{
  assert.equal(assessAcceptancePlan(REQUIRED_FUTURE_ACCEPTANCE),"design-consistent");
  for(const x of REQUIRED_FUTURE_ACCEPTANCE){
    assert.equal(assessAcceptancePlan(REQUIRED_FUTURE_ACCEPTANCE.filter(y=>y!==x)),"blocked",x);
  }
});
