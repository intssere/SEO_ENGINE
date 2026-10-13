import {test} from "node:test";
import assert from "node:assert/strict";
import {TARGET,metadataQueryFingerprint} from "./int-02c-05a-railway-metadata-query-contract.mjs";
import {inspectIndependentEvidence,authorizeProductionExecution} from "./int-02c-05c-independent-evidence-gate.mjs";
const sample=()=>({
 provider:{origin:"railway_control_plane",projectId:TARGET.railwayProjectId,environmentId:TARGET.environmentId,serviceId:TARGET.serviceId,volumeId:TARGET.volumeId,resourceRevision:"deployment_12345"},
 session:{origin:"postgres_session_observation",database:"int02c_disposable",role:"int02c_metadata_reader",transactionReadOnly:true,isSuperuser:false,queryFingerprint:metadataQueryFingerprint(),observationId:"observation_12345"},
 witness:{origin:"independent_reviewer",observationId:"observation_12345",collectorId:"collector_12345",reviewerId:"reviewer_12345"}
});
test("self-declared evidence cannot authenticate provider or allow execution",()=>{
 assert.deepEqual(inspectIndependentEvidence(sample()),{reviewEligible:false,executionAuthorized:false,reason:"external_evidence_authentication_unavailable"});
 assert.equal(authorizeProductionExecution().executionAuthorized,false);
});
test("reject incorrect target, role, transaction, fingerprint, and witness",()=>{
 for(const mutate of [
  p=>p.provider.serviceId="different",
  p=>p.provider.volumeId="different",
  p=>p.session.role="postgres",
  p=>p.session.transactionReadOnly=false,
  p=>p.session.isSuperuser=true,
  p=>p.session.queryFingerprint="0".repeat(64),
  p=>p.witness.reviewerId=p.witness.collectorId,
  p=>p.witness.observationId="unrelated"
 ]){
  const p=sample();mutate(p);
  assert.equal(inspectIndependentEvidence(p).reviewEligible,false);
  assert.notEqual(inspectIndependentEvidence(p).reason,"external_evidence_authentication_unavailable");
 }
});
test("no missing or malformed payload is admitted",()=>{
 for(const p of [undefined,null,{},[],{provider:{}}])assert.equal(inspectIndependentEvidence(p).executionAuthorized,false);
});
