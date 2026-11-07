import assert from "node:assert/strict";
import test from "node:test";
import {assessCutoverPhase,type CutoverObservation,type CutoverPhase}
  from "./pilot-01-rt01a12-18-cutover-sequencing.js";
import {REQUIRED_GATES,type Evidence,type IntegrationPlan,type RequestedIntent}
  from "./pilot-01-rt01a12-13-integration-readiness.js";

const intent:RequestedIntent={
  sessionId:"session",subject:"subject",organizationId:"orgA",siteId:"siteA",
  issuerId:"issuerA",operation:"analyze",membershipRevision:2,issuerRevision:4
};
const evidence:Evidence={
  ...intent,source:"trusted_server_port",sessionExpiresAt:500,membershipExpiresAt:500,
  issuerExpiresAt:500,sessionRevoked:false,membershipRevoked:false,issuerRevoked:false,
  activeSite:true,tenantMatches:true,issuerScopeMatches:true
};
const plan:IntegrationPlan={
  gates:Object.fromEntries(REQUIRED_GATES.map(k=>[k,true])) as IntegrationPlan["gates"],
  enabledRuntimeIntegration:false,databaseConnections:false,migrationsApplied:false,
  publicSiteWrites:false,providerReads:false,backgroundWorkerActive:false
};
const baseline:CutoverObservation={
  phase:"worker_continuation",authEnforced:true,legacyQueueReachable:false,
  trustedSessionBound:true,scopedAdmissionRecorded:true,ownershipFenceCurrent:true,
  revocationStillClear:true,transactionOutcome:"committed",recoveryUsesTrustedQueue:true,
  providerReadsEnabled:false,publicSiteWritesEnabled:false,evidenceSource:"mock_server_test"
};
const check=(x:CutoverObservation,p=plan,e:Evidence|null=evidence)=>
  assessCutoverPhase(intent,e,p,x,100);
test("baseline is only synthetic design consistency, never executable authorization",()=>{
  assert.deepEqual(check(baseline),{
    decision:"design_consistent",reason:"synthetic_only_no_runtime_authority"
  });
});
test("reject expired, revoked and forged already-defined A12.13 trusted evidence",()=>{
  for(const e of [
    {...evidence,source:"caller" as const}, {...evidence,membershipRevoked:true},
    {...evidence,issuerRevision:9},{...evidence,sessionExpiresAt:100}
  ])assert.equal(check(baseline,plan,e).decision,"blocked");
  assert.equal(check(baseline,{...plan,enabledRuntimeIntegration:true}).decision,"blocked");
});
test("reject caller assertions and unavailable custody evidence at every phase",()=>{
  for(const phase of ["route_authorization","custody_admission","queue_claim",
    "worker_continuation","provider_dispatch","recovery"] as CutoverPhase[]){
    for(const evidenceSource of ["caller","unavailable"] as const){
      const r=check({...baseline,phase,evidenceSource});
      assert.equal(r.reason,"untrusted_cutover_observation");
    }
  }
});
test("no phase may fall back to public.jobs, anonymous sessions or active providers",()=>{
  for(const change of [
    {legacyQueueReachable:true},{authEnforced:false},{trustedSessionBound:false},
    {providerReadsEnabled:true},{publicSiteWritesEnabled:true}
  ])assert.equal(check({...baseline,...change}).reason,"runtime_or_legacy_bypass");
});
test("unknown commit and rollback fail closed, without retry-on-timeout interpretation",()=>{
  for(const transactionOutcome of ["unknown","rolled_back"] as const)
    assert.equal(check({...baseline,transactionOutcome}).decision,"blocked");
});
test("route cannot invent custody admission or worker claim",()=>{
  assert.equal(check({...baseline,phase:"route_authorization",
    transactionOutcome:"not_attempted",scopedAdmissionRecorded:false,
    ownershipFenceCurrent:false}).decision,"design_consistent");
  for(const change of [
    {scopedAdmissionRecorded:true},{ownershipFenceCurrent:true},
    {transactionOutcome:"committed" as const}
  ])assert.equal(check({...baseline,phase:"route_authorization",
    transactionOutcome:"not_attempted",scopedAdmissionRecorded:false,
    ownershipFenceCurrent:false,...change}).decision,"blocked");
});
test("custody admission must commit and cannot itself assert worker ownership",()=>{
  assert.equal(check({...baseline,phase:"custody_admission",
    ownershipFenceCurrent:false}).decision,"design_consistent");
  for(const change of [{scopedAdmissionRecorded:false},{ownershipFenceCurrent:true},
    {transactionOutcome:"not_attempted" as const}]){
    assert.equal(check({...baseline,phase:"custody_admission",
      ownershipFenceCurrent:false,...change}).decision,"blocked");
  }
});
test("queue claim, worker continuation and dispatch require current fence and revocation",()=>{
  for(const phase of ["queue_claim","worker_continuation","provider_dispatch"] as const){
    assert.equal(check({...baseline,phase}).decision,"design_consistent");
    for(const change of [{ownershipFenceCurrent:false},{scopedAdmissionRecorded:false},
      {revocationStillClear:false},{transactionOutcome:"not_attempted" as const}])
      assert.equal(check({...baseline,phase,...change}).decision,"blocked");
  }
});
test("recovery cannot revive legacy queue or proceed without fresh generation fence",()=>{
  assert.equal(check({...baseline,phase:"recovery"}).decision,"design_consistent");
  for(const change of [{recoveryUsesTrustedQueue:false},{ownershipFenceCurrent:false},
    {revocationStillClear:false},{scopedAdmissionRecorded:false}])
    assert.equal(check({...baseline,phase:"recovery",...change}).decision,"blocked");
});
test("unknown phase cannot be represented as successful",()=>{
  assert.equal(check({...baseline,phase:"undefined_phase" as CutoverPhase}).reason,
    "unknown_phase");
});
