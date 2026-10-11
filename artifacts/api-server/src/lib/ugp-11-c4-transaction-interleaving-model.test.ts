import assert from "node:assert/strict";
import test from "node:test";
import {initialFixtureState,stepFixture,fixtureRuntimeAuthority,type FixtureAction,type FixtureState} from "./ugp-11-c4-transaction-interleaving-model.js";
function run(actions:FixtureAction[]):FixtureState {
 let state=initialFixtureState;
 for(const action of actions){
  const result=stepFixture(state,action);
  state=result.state;
  assert.equal(state.sideEffects,false);
 }
 return state;
}
test("C4 model: kill before claim forbids ownership and dispatch",()=>{
 const state=run([{type:"control",mode:"killed"},{type:"claim",owner:"A",expectedRevision:1,epoch:1}]);
 assert.equal(state.mode,"killed");
 assert.equal(state.owner,null);
 assert.equal(state.fence,0);
 assert.equal(state.attempts,0);
 assert.equal(fixtureRuntimeAuthority.dispatch,false);
});
test("C4 model: claim before kill cannot settle or recover",()=>{
 let s=run([{type:"claim",owner:"A",expectedRevision:1,epoch:1},{type:"control",mode:"killed"}]);
 assert.equal(s.fence,1);
 for(const action of [
  {type:"settle",owner:"A",fence:1},
  {type:"reclaim",owner:"B",expectedRevision:2,epoch:2},
  {type:"control",mode:"paused"}
 ] as FixtureAction[]){
  const outcome=stepFixture(s,action);
  assert.equal(outcome.accepted,false);
  assert.equal(outcome.state,s);
 }
});
test("C4 model: lease rollover increments fence and rejects old owner",()=>{
 const s=run([
  {type:"claim",owner:"A",expectedRevision:1,epoch:1},
  {type:"expire",epoch:2},
  {type:"reclaim",owner:"B",expectedRevision:1,epoch:3}
 ]);
 assert.equal(s.owner,"B");
 assert.equal(s.fence,2);
 assert.equal(s.attempts,2);
 const stale=stepFixture(s,{type:"settle",owner:"A",fence:1});
 assert.equal(stale.accepted,false);
 assert.equal(stale.state,s);
});
test("C4 model: paused/draining revisions close stale claims",()=>{
 for(const mode of ["paused","draining"] as const){
  const s=run([{type:"control",mode},{type:"claim",owner:"A",expectedRevision:1,epoch:1}]);
  assert.equal(s.owner,null);
  assert.equal(s.revision,2);
 }
});
test("C4 model: uncertain outcomes quarantine; cannot auto-retry",()=>{
 const s=run([{type:"claim",owner:"A",expectedRevision:1,epoch:1},{type:"uncertain"}]);
 assert.equal(s.status,"manual_intervention");
 assert.equal(stepFixture(s,{type:"reclaim",owner:"B",expectedRevision:1,epoch:2}).accepted,false);
 assert.equal(stepFixture(s,{type:"settle",owner:"A",fence:1}).accepted,false);
});
test("C4 model: every short ordering remains effect-free",()=>{
 const actions:FixtureAction[]=[
  {type:"claim",owner:"A",expectedRevision:1,epoch:1},
  {type:"control",mode:"paused"},
  {type:"control",mode:"draining"},
  {type:"control",mode:"killed"},
  {type:"expire",epoch:2},
  {type:"reclaim",owner:"B",expectedRevision:1,epoch:3},
  {type:"settle",owner:"A",fence:1},
  {type:"uncertain"}
 ];
 for(const a of actions)for(const b of actions)for(const c of actions){
  const s=run([a,b,c]);
  assert.equal(s.sideEffects,false);
  assert.equal(fixtureRuntimeAuthority.productionClaim,false);
 }
});
