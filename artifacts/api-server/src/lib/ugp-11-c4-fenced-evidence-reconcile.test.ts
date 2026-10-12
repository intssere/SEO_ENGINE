import assert from "node:assert/strict";
import test from "node:test";
import {reconcileFencedCommitEvidence,type EvidenceSnapshot} from "./ugp-11-c4-fenced-evidence-reconcile.js";
const expected={attemptId:"attempt-1",tenantId:"tenant",siteId:"site",jobIdentity:"f".repeat(64),fingerprint:"a".repeat(64),priorFence:7,committedFence:8,priorAttempts:1,owner:"candidate"};
const marker={attemptId:expected.attemptId,tenantId:expected.tenantId,siteId:expected.siteId,jobIdentity:expected.jobIdentity,fingerprint:expected.fingerprint,priorFence:7,committedFence:8};
const good:EvidenceSnapshot={kind:"available",markers:[marker],job:{workerId:"candidate",fence:8,attempts:2}};
test("only exact independent durable marker plus fenced state classifies committed",()=>{
 const r=reconcileFencedCommitEvidence(expected,good);
 assert.equal(r.outcome,"committed");
 assert.equal(r.automaticRetryAllowed,false);
 assert.equal(r.providerDispatchAllowed,false);
 assert.equal(r.productionAuthority,false);
});
test("conflict, stale fence, duplicate marker, missing or unavailable evidence fail closed",()=>{
 const fail:EvidenceSnapshot[]=[
 {kind:"unavailable"},{kind:"partial"},{kind:"conflicting"},
 {kind:"available",markers:[],job:good.kind==="available"?good.job:null},
 {kind:"available",markers:[marker,marker],job:{workerId:"candidate",fence:8,attempts:2}},
 {kind:"available",markers:[{...marker,fingerprint:"b".repeat(64)}],job:{workerId:"candidate",fence:8,attempts:2}},
 {kind:"available",markers:[{...marker,tenantId:"other"}],job:{workerId:"candidate",fence:8,attempts:2}},
 {kind:"available",markers:[marker],job:null},
 {kind:"available",markers:[marker],job:{workerId:"old-owner",fence:8,attempts:2}},
 {kind:"available",markers:[marker],job:{workerId:"candidate",fence:7,attempts:2}},
 {kind:"available",markers:[marker],job:{workerId:"candidate",fence:8,attempts:3}},
 ];
 for(const evidence of fail){const r=reconcileFencedCommitEvidence(expected,evidence);
  assert.equal(r.outcome,"manual_intervention_required");assert.equal(r.automaticRetryAllowed,false);
  assert.equal(r.providerDispatchAllowed,false);assert.equal(r.productionAuthority,false);
 }
 assert.equal(reconcileFencedCommitEvidence({...expected,committedFence:9},good).outcome,"manual_intervention_required");
});
