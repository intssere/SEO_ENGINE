import assert from "node:assert/strict";
import test from "node:test";
import {C4_E1_CASES} from "./ugp-11-c4-e1-offline-evidence-structural-validator.js";
import {reviewC4E1A07CrossEvidence} from "./ugp-11-c4-e1-a07-cross-evidence-preflight.js";
const sha=(x:string)=>x.repeat(40),digest=(x:string)=>x.repeat(64);
const packet=()=>C4_E1_CASES.flatMap(testId=>(["native","pg_boss"] as const).map(candidate=>({
 testId,candidate,outcome:"PASS",sourceSha:sha("a"),runnerSha:sha("b"),
 fixtureSeed:`seed-${testId}`,workFingerprint:digest("c"),observationDigest:digest("d"),
 isolatedTargetId:"disposable-proposed",externalEffectAttempts:0,providerNetworkAttempts:0
})));
const traces=()=> (["native","pg_boss"] as const).map(candidate=>({
 testId:"A07",candidate,outcome:"manual_intervention_required",
 mockEvents:[
  {sequence:0,kind:"mock_attempt",syntheticEffectId:"effect-A07"},
  {sequence:1,kind:"mock_may_have_started",syntheticEffectId:"effect-A07"},
  {sequence:2,kind:"mock_replay_blocked",syntheticEffectId:"effect-A07"}],
 externalProviderCalls:0,realExternalEffectAttempts:0
}));
test("matched self-reports are only structurally consistent, never certified",()=>{
 const r=reviewC4E1A07CrossEvidence(packet(),traces());
 assert.equal(r.status,"STRUCTURALLY_CONSISTENT_UNVERIFIED");
 assert.deepEqual(r.issues,[]);
 assert.equal(r.stage2bCertified,false);
 assert.equal(r.executionAuthorized,false);
 assert.equal(r.operationalAuthority,false);
});
test("missing, duplicated or unknown candidate traces fail closed",()=>{
 const ts=traces();
 for(const set of [[],[ts[0]],[ts[0],ts[0]],[ts[0],{...ts[1],candidate:"other"}],null]){
  assert.equal(reviewC4E1A07CrossEvidence(packet(),set).status,"INCOMPLETE_OR_UNSAFE");
 }
});
test("self-reported provider attempt and ambiguous trace omission deny",()=>{
 const ts=traces(),p=packet();
 ts[1]={...ts[1],externalProviderCalls:1};
 assert.equal(reviewC4E1A07CrossEvidence(p,ts).status,"INCOMPLETE_OR_UNSAFE");
 const ts2=traces();ts2[0]={...ts2[0],mockEvents:ts2[0].mockEvents.slice(0,2)};
 assert.equal(reviewC4E1A07CrossEvidence(p,ts2).status,"INCOMPLETE_OR_UNSAFE");
});
test("A07 packet mismatch and malformed parity packet fail closed",()=>{
 const p=packet(),ts=traces(),i=p.findIndex(x=>x.testId==="A07"&&x.candidate==="native");
 p[i]={...p[i]!,outcome:"NOT_RUN"};
 assert.equal(reviewC4E1A07CrossEvidence(p,ts).status,"INCOMPLETE_OR_UNSAFE");
 assert.equal(reviewC4E1A07CrossEvidence(null,ts).status,"INCOMPLETE_OR_UNSAFE");
});
