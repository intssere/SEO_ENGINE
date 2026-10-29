import assert from "node:assert/strict";
import test from "node:test";
import {reviewA07MockEffectTrace} from "./ugp-11-c4-e1-offline-effect-trace.js";
function fixture(){
 return {testId:"A07",candidate:"native",outcome:"manual_intervention_required",
  mockEvents:[
   {sequence:0,kind:"mock_attempt",syntheticEffectId:"effect-1"},
   {sequence:1,kind:"mock_may_have_started",syntheticEffectId:"effect-1"},
   {sequence:2,kind:"mock_replay_blocked",syntheticEffectId:"effect-1"}],
  externalProviderCalls:0,realExternalEffectAttempts:0};
}
test("synthetic attempt is allowed structurally but never certifies execution",()=>{
 const r=reviewA07MockEffectTrace(fixture());
 assert.equal(r.status,"STRUCTURALLY_CONSISTENT_UNVERIFIED");
 assert.deepEqual(r.issues,[]);
 assert.equal(r.stage2bCertified,false);
 assert.equal(r.executionAuthorized,false);
 assert.equal(r.operationalAuthority,false);
});
test("real external calls and uncertain/manual disposition mismatch fail closed",()=>{
 for(const patch of [{externalProviderCalls:1},{realExternalEffectAttempts:1},{outcome:"completed"},{candidate:"unknown"},{testId:"A06"}]){
  assert.equal(reviewA07MockEffectTrace({...fixture(),...patch}).status,"INVALID_OR_INCOMPLETE");
 }
});
test("missing attempt, missing possible effect, or missing replay block fails",()=>{
 const original=fixture();
 for(const index of [0,1,2]){
  const events=original.mockEvents.filter((_,i)=>i!==index);
  assert.equal(reviewA07MockEffectTrace({...original,mockEvents:events}).status,"INVALID_OR_INCOMPLETE");
 }
});
test("reject reordered, duplicate, mismatched identities and malformed events",()=>{
 const original=fixture();
 const cases=[
  [original.mockEvents[1],original.mockEvents[0],original.mockEvents[2]],
  [original.mockEvents[0],original.mockEvents[1],original.mockEvents[1]],
  original.mockEvents.map((e,i)=>i===1?{...e,syntheticEffectId:"other"}:e),
  original.mockEvents.map((e,i)=>i===1?{...e,sequence:-1}:e),
  original.mockEvents.map((e,i)=>i===1?{...e,extra:true}:e)
 ];
 for(const mockEvents of cases)
  assert.equal(reviewA07MockEffectTrace({...original,mockEvents}).status,"INVALID_OR_INCOMPLETE");
 for(const bad of [null,[],{},false,{...original,mockEvents:[]},{...original,extra:true}])
  assert.equal(reviewA07MockEffectTrace(bad).status,"INVALID_OR_INCOMPLETE");
});
