import assert from "node:assert/strict";
import test from "node:test";
import {assessTrustedBoundary,assessTransitionPlan,assessMigrationTransition,
  REQUIRED_GATES,type Evidence,type RequestedIntent,type IntegrationPlan,type MigrationLineage}
 from "./pilot-01-rt01a12-13-integration-readiness.js";
const intent:RequestedIntent={
 sessionId:"session",subject:"subject",organizationId:"org-A",siteId:"site-A",
 issuerId:"issuer-A",operation:"analyze",membershipRevision:1,issuerRevision:1
};
const e:Evidence={
 ...intent,source:"trusted_server_port",
 sessionExpiresAt:300,membershipExpiresAt:300,issuerExpiresAt:300,
 membershipRevoked:false,issuerRevoked:false,sessionRevoked:false,
 activeSite:true,tenantMatches:true,issuerScopeMatches:true
};
const plan:IntegrationPlan={
 gates:Object.fromEntries(REQUIRED_GATES.map(k=>[k,true])) as IntegrationPlan["gates"],
 enabledRuntimeIntegration:false,databaseConnections:false,migrationsApplied:false,
 publicSiteWrites:false,providerReads:false,backgroundWorkerActive:false
};
test("synthetic trusted evidence accepts only exact bounded read-only scope",()=>{
 assert.equal(assessTrustedBoundary(intent,e,100),"design_consistent");
});
test("reject caller authority, unavailable evidence, forged session, site, issuer and revisions",()=>{
 for(const source of ["caller","unavailable"] as const)
  assert.equal(assessTrustedBoundary(intent,{...e,source},100),"blocked",source);
 for(const key of ["sessionId","subject","organizationId","siteId","issuerId"] as const)
  assert.equal(assessTrustedBoundary(intent,{...e,[key]:"forged"},100),"blocked",key);
 assert.equal(assessTrustedBoundary({...intent,operation:"recommend"},e,100),"blocked");
 assert.equal(assessTrustedBoundary({...intent,issuerRevision:2},e,100),"blocked");
 assert.equal(assessTrustedBoundary({...intent,membershipRevision:2},e,100),"blocked");
});
test("reject session/issuer/membership revocation, expiry and tenant mismatch",()=>{
 for(const key of ["membershipRevoked","issuerRevoked","sessionRevoked"] as const)
  assert.equal(assessTrustedBoundary(intent,{...e,[key]:true},100),"blocked");
 for(const key of ["activeSite","tenantMatches","issuerScopeMatches"] as const)
  assert.equal(assessTrustedBoundary(intent,{...e,[key]:false},100),"blocked");
 for(const key of ["sessionExpiresAt","membershipExpiresAt","issuerExpiresAt"] as const)
  assert.equal(assessTrustedBoundary(intent,{...e,[key]:100},100),"blocked");
});
test("disconnected implementation plan rejects every missing security gate",()=>{
 assert.equal(assessTransitionPlan(plan),"design_consistent");
 for(const gate of REQUIRED_GATES){
  assert.equal(assessTransitionPlan({...plan,gates:{...plan.gates,[gate]:false}}),
    "blocked",gate);
 }
});
test("integration plan refuses wiring, DB access, provider reads, workers and writes",()=>{
 for(const key of ["enabledRuntimeIntegration","databaseConnections","migrationsApplied",
   "publicSiteWrites","providerReads","backgroundWorkerActive"] as const)
   assert.equal(assessTransitionPlan({...plan,[key]:true}),"blocked",key);
});
const lineage:MigrationLineage={
 sourceLineage:"main_0001_0011",competingHistoricalLineageReviewed:true,
 independentInstalledLedgerAvailable:false,sourceChecksumsPinned:true,
 existingSchemaDriftKnown:false,targetOwnerAttested:false,
 resourceSpecificAuthorization:false,operationalMigrationPermitted:false
};
test("canonical source is insufficient without independent installed authority",()=>{
 assert.equal(assessMigrationTransition(lineage),"needs-attestation");
 assert.equal(assessMigrationTransition({...lineage,sourceChecksumsPinned:false}),"blocked");
 assert.equal(assessMigrationTransition({...lineage,competingHistoricalLineageReviewed:false}),"blocked");
 assert.equal(assessMigrationTransition({...lineage,resourceSpecificAuthorization:true}),"blocked");
 assert.equal(assessMigrationTransition({...lineage,operationalMigrationPermitted:true}),"blocked");
});
