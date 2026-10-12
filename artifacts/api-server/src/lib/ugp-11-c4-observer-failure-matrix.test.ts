/** UGP-11.C4 independent-observer evidence failure matrix.
 * Pure negative-case certification, no operational PostgreSQL reader or authority.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {reconcileFencedCommitEvidence, type EvidenceSnapshot} from "./ugp-11-c4-fenced-evidence-reconcile.js";
const expected={attemptId:"c4-ambiguous-001",tenantId:"tenant-a",siteId:"site-a",
 jobIdentity:"e".repeat(64),fingerprint:"f".repeat(64),
 priorFence:11,committedFence:12,priorAttempts:2,owner:"new-owner"};
const marker={attemptId:expected.attemptId,tenantId:expected.tenantId,siteId:expected.siteId,
 jobIdentity:expected.jobIdentity,fingerprint:expected.fingerprint,
 priorFence:expected.priorFence,committedFence:expected.committedFence};
const current={workerId:expected.owner,fence:12,attempts:3};
function mustQuarantine(snapshot:EvidenceSnapshot,reason:string){
 const r=reconcileFencedCommitEvidence(expected,snapshot);
 assert.equal(r.outcome,"manual_intervention_required",reason);
 assert.equal(r.automaticRetryAllowed,false,reason);
 assert.equal(r.providerDispatchAllowed,false,reason);
 assert.equal(r.productionAuthority,false,reason);
}
test("unavailable and partial observer evidence cannot authorize a transaction conclusion",()=>{
 for(const kind of ["unavailable","partial","conflicting"] as const)
   mustQuarantine({kind},kind);
 mustQuarantine({kind:"available",markers:[marker],job:null},"marker without job");
 mustQuarantine({kind:"available",markers:[],job:current},"job without marker");
 mustQuarantine({kind:"available",markers:[],job:null},"empty response");
});
test("out-of-snapshot and contradictory observations remain quarantined",()=>{
 const cases:ReadonlyArray<[string,EvidenceSnapshot]>=[
 ["job fence advanced after marker", {kind:"available",markers:[marker],job:{...current,fence:13,attempts:4}}],
 ["job fence reverted", {kind:"available",markers:[marker],job:{...current,fence:11,attempts:2}}],
 ["owner changed", {kind:"available",markers:[marker],job:{...current,workerId:"contender"}}],
 ["attempt counter advanced", {kind:"available",markers:[marker],job:{...current,attempts:4}}],
 ["attempt counter reverted", {kind:"available",markers:[marker],job:{...current,attempts:2}}],
 ["marker commit fence conflicts", {kind:"available",markers:[{...marker,committedFence:13}],job:current}],
 ["marker from another site", {kind:"available",markers:[{...marker,siteId:"site-b"}],job:current}],
 ["marker from another tenant", {kind:"available",markers:[{...marker,tenantId:"tenant-b"}],job:current}],
 ["marker identity conflict", {kind:"available",markers:[{...marker,jobIdentity:"a".repeat(64)}],job:current}],
 ["marker fingerprint conflict", {kind:"available",markers:[{...marker,fingerprint:"b".repeat(64)}],job:current}],
 ["conflicting duplicate attempt", {kind:"available",markers:[marker,{...marker,committedFence:13}],job:current}],
 ["exact duplicate attempt", {kind:"available",markers:[marker,marker],job:current}]
 ];
 for(const [reason,evidence] of cases) mustQuarantine(evidence,reason);
});
test("valid evidence is still non-executable and cannot grant retry or dispatch",()=>{
 const result=reconcileFencedCommitEvidence(expected,{kind:"available",markers:[marker],job:current});
 assert.equal(result.outcome,"committed");
 assert.equal(result.automaticRetryAllowed,false);
 assert.equal(result.providerDispatchAllowed,false);
 assert.equal(result.productionAuthority,false);
});
