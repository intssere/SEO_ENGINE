import assert from "node:assert/strict";
import test from "node:test";
import {classifyIndependentObserverResult} from "./ugp-11-c4-observer-read-classifier.js";
import {reconcileFencedCommitEvidence} from "./ugp-11-c4-fenced-evidence-reconcile.js";
const expected={attemptId:"error-case",tenantId:"tenant",siteId:"site",jobIdentity:"a".repeat(64),fingerprint:"b".repeat(64),priorFence:4,committedFence:5,priorAttempts:1,owner:"candidate"};
const marker={attemptId:expected.attemptId,tenantId:expected.tenantId,siteId:expected.siteId,jobIdentity:expected.jobIdentity,fingerprint:expected.fingerprint,priorFence:4,committedFence:5};
const job={workerId:"candidate",fence:5,attempts:2};
test("failed, partial, conflicting and unclosed observer reads fail closed",()=>{
 const results=[
  {kind:"failed" as const,error:new Error("connection terminated")},
  {kind:"failed" as const,error:{code:"57P01"}},
  {kind:"failed" as const,error:{code:"08006"}},
  {kind:"incomplete" as const,reason:"marker read interrupted"},
  {kind:"complete" as const,markers:[marker],job,transactionClosed:false as const},
  {kind:"complete" as const,markers:[],job,transactionClosed:true as const},
  {kind:"complete" as const,markers:[marker],job:null,transactionClosed:true as const},
  {kind:"complete" as const,markers:[marker,marker],job,transactionClosed:true as const}
 ];
 for(const read of results){
  const evidence=classifyIndependentObserverResult(read);
  assert.notEqual(evidence.kind,"available");
  const outcome=reconcileFencedCommitEvidence(expected,evidence);
  assert.equal(outcome.outcome,"manual_intervention_required");
  assert.equal(outcome.automaticRetryAllowed,false);
  assert.equal(outcome.providerDispatchAllowed,false);
  assert.equal(outcome.productionAuthority,false);
 }
});
test("only complete closed single-marker plus fenced job can be classified available, without execution grants",()=>{
 const snapshot=classifyIndependentObserverResult({kind:"complete",markers:[marker],job,transactionClosed:true});
 assert.equal(snapshot.kind,"available");
 const r=reconcileFencedCommitEvidence(expected,snapshot);
 assert.equal(r.outcome,"committed");
 assert.equal(r.automaticRetryAllowed,false);
 assert.equal(r.providerDispatchAllowed,false);
 assert.equal(r.productionAuthority,false);
});
