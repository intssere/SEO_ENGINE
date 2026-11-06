/** Source-only RT01-A12.11 tests. No database, TCP, SQL or provider calls. */
import test from "node:test";
import assert from "node:assert/strict";
import {REQUIRED_CASES,validateSandboxDesign,validateAcceptancePlan,
 expectedRaceOutcome,type ProposedSandbox,type AcceptancePlan,type RaceScenario}
 from "./pilot-01-rt01a12-11-validation-plan.js";
const sandbox:ProposedSandbox={
 freshEmptyDatabase:true,databaseVersion:17,localhostOnly:true,
 syntheticFixturesOnly:true,armedForFutureUse:false,
 existingDatabaseAccess:false,operationalMigrations:false,
 runtimeConnections:false,providerEffects:false,publicSiteWrites:false,
 applicationSuperuser:false,appBypassRls:false,positiveOwnerAuthorization:false
};
const plan:AcceptancePlan={
 cases:REQUIRED_CASES,
 identities:["schema_owner","migration_operator","api","admission","worker","auditor"],
 twoIndependentSessions:true,nonSuperuserRlsAssertions:true,
 deterministicRaceBarriers:true,readOnlyUnknownCommitReconciliation:true,
 expiryUsesDatabaseClock:true,teardownAndIsolationReviewed:true,
 noRuntimeWiring:true
};
const race:RaceScenario={
 kind:"membership_revoke_wins",firstCommitted:"revoke",revisionFresh:false,
 tenantMatches:true,readOnlyReconcile:false,automaticRetry:false,externalEffects:false
};
test("disposable sandbox is a PAPER plan only and is deliberately unarmed",()=>{
 assert.equal(validateSandboxDesign(sandbox),"eligible-plan");
});
test("deny existing access, privileged application role, effects and armed execution",()=>{
 for(const key of ["armedForFutureUse","existingDatabaseAccess","operationalMigrations",
  "runtimeConnections","providerEffects","publicSiteWrites","applicationSuperuser",
  "appBypassRls","positiveOwnerAuthorization"] as const){
  assert.equal(validateSandboxDesign({...sandbox,[key]:true}),"blocked",key);
 }
 for(const key of ["freshEmptyDatabase","localhostOnly","syntheticFixturesOnly"] as const){
  assert.equal(validateSandboxDesign({...sandbox,[key]:false}),"blocked",key);
 }
});
test("all required canonical/RLS/revocation/connection/commit cases present",()=>{
 assert.equal(validateAcceptancePlan(plan),"complete-plan");
 for(const absent of REQUIRED_CASES){
  assert.equal(validateAcceptancePlan({...plan,cases:REQUIRED_CASES.filter(x=>x!==absent)}),
    "blocked",absent);
 }
});
test("reject duplicate cases, absent roles and missing isolation controls",()=>{
 assert.equal(validateAcceptancePlan({...plan,cases:[...plan.cases,plan.cases[0]]}),"blocked");
 assert.equal(validateAcceptancePlan({...plan,identities:plan.identities.filter(x=>x!=="api")}),"blocked");
 for(const field of ["twoIndependentSessions","nonSuperuserRlsAssertions",
  "deterministicRaceBarriers","readOnlyUnknownCommitReconciliation",
  "expiryUsesDatabaseClock","teardownAndIsolationReviewed","noRuntimeWiring"] as const){
  assert.equal(validateAcceptancePlan({...plan,[field]:false}),"blocked",field);
 }
});
test("synthetic revocation-first admission denied for membership and issuer",()=>{
 for(const kind of ["membership_revoke_wins","issuer_revoke_wins"] as const){
  assert.equal(expectedRaceOutcome({...race,kind}),"deny");
  assert.equal(expectedRaceOutcome({...race,kind,firstCommitted:"admission"}),"blocked");
 }
});
test("synthetic admission-first only on fresh authority with no effects",()=>{
 assert.equal(expectedRaceOutcome({...race,kind:"admission_commits_first",
  firstCommitted:"admission",revisionFresh:true}),"commit");
 assert.equal(expectedRaceOutcome({...race,kind:"admission_commits_first",
  firstCommitted:"admission",revisionFresh:false}),"blocked");
});
test("unknown commit means read-only reconciliation, never automatic retry",()=>{
 const lost:RaceScenario={...race,kind:"commit_transport_lost",
  firstCommitted:"unknown",readOnlyReconcile:true};
 assert.equal(expectedRaceOutcome(lost),"commit_unknown");
 assert.equal(expectedRaceOutcome({...lost,readOnlyReconcile:false}),"blocked");
 assert.equal(expectedRaceOutcome({...lost,automaticRetry:true}),"blocked");
 assert.equal(expectedRaceOutcome({...lost,externalEffects:true}),"blocked");
 assert.equal(expectedRaceOutcome({...lost,tenantMatches:false}),"blocked");
});
