import test from "node:test";
import assert from "node:assert/strict";
import {A12_27_CANDIDATE,A12_27_QUERY_CONTRACT,REQUIRED_EVIDENCE_CLASSES,
 evaluateAcquisitionReadiness,evaluateHistoricalLedgerFollowUp,
 authorizeOperationalInspection} from "./pilot-01-rt01a12-27-bounded-acquisition-readiness.mjs";
import {QUERY_SET,metadataQueryFingerprint,validateMetadataQuerySet}
 from "./int-02c-05a-railway-metadata-query-contract.mjs";

/** Synthetic documentation fixture; nothing is collected from providers. */
const fixture=()=>({
 phase:"OFFLINE_DESIGN_ONLY",target:{...A12_27_CANDIDATE},
 queryContractFingerprint:metadataQueryFingerprint(),
 queryIds:[...A12_27_QUERY_CONTRACT.queryIds],
 evidenceClasses:[...REQUIRED_EVIDENCE_CLASSES],
 requestId:"request-synthetic",architectureDecisionRef:"merged-adr-reference",
 reviewerId:"reviewer-synthetic",collectorId:"collector-synthetic",
 securityReviewRef:"security-reference",scopeReviewRef:"scope-review-ref",
 sqlSession:{readOnly:true,existingPrincipal:true,superuser:false,
  databaseOwner:false,canSetRole:false,customerDataSelect:false,
  privateTransport:true,clientSecretExposure:false,
  queryTimeoutSeconds:15,singleAttempt:true},
 binding:{mode:"UNRESOLVED_PROVIDER_REFERENCE",
  observationRef:"unresolved-synthetic-ref"},
 ledger:{phase:"DISCOVER_NAMES_ONLY",rowReadAllowed:false,
  separateMetadataApprovalRequired:true,mainUgPCollisionState:"UNRESOLVED"},
 recovery:{separateAuthorizationRequired:true,pitrCertified:false,cutoverApproved:false},
 createdAtUtc:"2026-11-09T00:00:00.000Z",
 requestDigestSha256:"a".repeat(64),
 scope:{allowsSqlExecution:false,allowsProviderReads:false,
  allowsCredentials:false,allowsMutations:false,allowsDeployment:false},
 executionAuthorizationRef:null
});
test("A12.27 reuses canonical 05A query fingerprint without changing SQL",()=>{
 assert.equal(A12_27_QUERY_CONTRACT.fingerprint,metadataQueryFingerprint());
 assert.deepEqual(A12_27_QUERY_CONTRACT.queryIds,QUERY_SET.map(q=>q.id));
 assert.equal(validateMetadataQuerySet().valid,true);
 assert.equal(A12_27_QUERY_CONTRACT.permitsMigrationLedgerRows,false);
});
test("A12.27 complete synthetic DESIGN packet passes readiness only",()=>{
 assert.deepEqual(evaluateAcquisitionReadiness(fixture()),{
  status:"PASS",issues:[],executionAuthorized:false,
  operationalDatabaseCertified:false,legacyUgPCollisionResolved:false});
});
test("A12.27 missing packet UNVERIFIED, operational inspection always blocked",()=>{
 assert.equal(evaluateAcquisitionReadiness(null).status,"UNVERIFIED");
 assert.equal(authorizeOperationalInspection().executionAuthorized,false);
 assert.equal(authorizeOperationalInspection().status,"BLOCKED");
});
test("A12.27 reject substituted Railway project/service/volume target",()=>{
 const a=fixture();
 for(const target of [
  {...a.target,railwayProjectId:"different-project"},
  {...a.target,environmentId:"different-environment"},
  {...a.target,serviceId:"different-service"},
  {...a.target,volumeId:"different-volume"}
 ]){
  const r=evaluateAcquisitionReadiness({...a,target});
  assert.equal(r.status,"BLOCKED");
  assert.ok(r.issues.includes("CANDIDATE_TARGET_MISMATCH"));
 }
});
test("A12.27 reject query injection, wrong fingerprint, scope creep and ledger row requests",()=>{
 const a=fixture();
 for(const variation of [
  {queryIds:[...a.queryIds,"dump_customer_rows"]},
  {queryIds:[...a.queryIds.slice(1),a.queryIds[0]]},
  {queryContractFingerprint:"f".repeat(64)},
  {ledger:{...a.ledger,rowReadAllowed:true}},
  {ledger:{...a.ledger,mainUgPCollisionState:"RESOLVED"}},
  {scope:{...a.scope,allowsSqlExecution:true}},
  {scope:{...a.scope,allowsProviderReads:true}},
  {executionAuthorizationRef:"preemptive-live-permission"}
 ]){
  const result=evaluateAcquisitionReadiness({...a,...variation});
  assert.equal(result.status,"BLOCKED");
  assert.equal(result.executionAuthorized,false);
 }
});
test("A12.27 reject elevated roles and unsafe transport",()=>{
 const a=fixture();
 for(const variation of [
  {superuser:true},{databaseOwner:true},{canSetRole:true},
  {existingPrincipal:false},{readOnly:false},{privateTransport:false},
  {clientSecretExposure:true},{singleAttempt:false},
  {queryTimeoutSeconds:0},{queryTimeoutSeconds:60},{customerDataSelect:true}
 ]){
  const r=evaluateAcquisitionReadiness({...a,sqlSession:{...a.sqlSession,...variation}});
  assert.equal(r.status,"BLOCKED");
  assert.ok(r.issues.includes("LEAST_PRIVILEGE_OR_TRANSPORT_INCOMPLETE"));
 }
});
test("A12.27 requires distinct witness, complete custody and opaque binding ref",()=>{
 const a=fixture();
 for(const variation of [
  {reviewerId:"collector-synthetic"},
  {securityReviewRef:""},
  {evidenceClasses:a.evidenceClasses.slice(1)},
  {binding:{...a.binding,resolvedSecretValue:"synthetic-secret"}},
  {binding:{mode:"RESOLVED_SECRET",observationRef:"unresolved-synthetic-ref"}},
  {recovery:{...a.recovery,pitrCertified:true}}
 ]){
  assert.equal(evaluateAcquisitionReadiness({...a,...variation}).status,"BLOCKED");
 }
});
test("A12.27 reject credential URL/password leaks and unbounded strings",()=>{
 const a=fixture();
 for(const variation of [
  {requestId:"postgres://user:pass@host/db"},
  {architectureDecisionRef:"password=examplepassword"},
  {collectorId:"token:fake-secret"},
  {requestId:"x".repeat(500)},
  {requestDigestSha256:"unverified"}
 ]){
  const r=evaluateAcquisitionReadiness({...a,...variation});
  assert.equal(r.status,"BLOCKED");
 }
});
test("A12.27 historical 0008-0015 collision cannot be silently marked resolved",()=>{
 const target={action:"DESIGN_SECOND_STAGE_ONLY",separateAuthorizationRequired:true,
  columnsIndependentlyVerified:true,targetBoundWitnessRef:"witness-synthetic",
  exactLedgerName:"ledger_synthetic",namespaceCollisionResolved:false,
  rowReadAllowed:false};
 const good=evaluateHistoricalLedgerFollowUp(target);
 assert.equal(good.status,"PASS");
 assert.equal(good.legacyUgPCollisionResolved,false);
 for(const bad of [
  {...target,namespaceCollisionResolved:true},
  {...target,rowReadAllowed:true},
  {...target,sqlText:"SELECT * FROM migrations"},
  {...target,targetBoundWitnessRef:""},
  {...target,separateAuthorizationRequired:false}
 ]){
  const r=evaluateHistoricalLedgerFollowUp(bad);
  assert.equal(r.status,"BLOCKED");
  assert.equal(r.executionAuthorized,false);
 }
 assert.equal(evaluateHistoricalLedgerFollowUp(null).status,"UNVERIFIED");
});
