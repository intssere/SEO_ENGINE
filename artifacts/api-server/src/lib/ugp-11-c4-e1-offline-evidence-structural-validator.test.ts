import assert from "node:assert/strict";
import test from "node:test";
import {C4_E1_CASES,reviewC4E1EvidencePacket} from "./ugp-11-c4-e1-offline-evidence-structural-validator.js";
const digest=(c:string)=>c.repeat(64);
const sha=(c:string)=>c.repeat(40);
function fixture(){
 return C4_E1_CASES.flatMap(testId=>(["native","pg_boss"] as const).map(candidate=>({
  testId,candidate,outcome:"PASS" as const,sourceSha:sha("a"),runnerSha:sha("b"),
  fixtureSeed:`seed-${testId}`,workFingerprint:digest("c"),observationDigest:digest("d"),
  isolatedTargetId:"proposed-disposable-c4",externalEffectAttempts:0,providerNetworkAttempts:0
 })));
}
test("a structurally complete set can never certify operation or execution",()=>{
 const r=reviewC4E1EvidencePacket(fixture());
 assert.equal(r.status,"STRUCTURALLY_COMPLETE_UNVERIFIED");
 assert.deepEqual(r.issues,[]);
 assert.equal(r.stage2bCertified,false);
 assert.equal(r.operationalAuthority,false);
 assert.equal(r.executionAuthorized,false);
});
test("missing case, duplicate and fail/skip/inconclusive/not-run all deny",()=>{
 const base=fixture();
 assert.equal(reviewC4E1EvidencePacket(base.slice(1)).status,"INCOMPLETE_OR_UNSAFE");
 assert.equal(reviewC4E1EvidencePacket([...base.slice(1),base[1]]).status,"INCOMPLETE_OR_UNSAFE");
 for(const outcome of ["FAIL","SKIPPED","INCONCLUSIVE","NOT_RUN"] as const){
  const rows=fixture();rows[0]={...rows[0]!,outcome};
  assert.ok(reviewC4E1EvidencePacket(rows).issues.some(x=>x.startsWith("not_pass_")));
 }
});
test("candidate comparability and zero-effects are mandatory",()=>{
 for(const change of [{fixtureSeed:"different"},{workFingerprint:digest("e")},{sourceSha:sha("f")},{providerNetworkAttempts:1},{externalEffectAttempts:1}]){
  const rows=fixture();rows[1]={...rows[1]!,...change};
  assert.equal(reviewC4E1EvidencePacket(rows).status,"INCOMPLETE_OR_UNSAFE");
 }
});
test("shape, tampered fields, unknown candidates and malformed input deny",()=>{
 for(const patch of [{testId:"A15"},{candidate:"third"},{observationDigest:"fake"},{extra:"field"},{externalEffectAttempts:-1}]){
  const rows:unknown[]=fixture();rows[0]={...(rows[0] as object),...patch};
  assert.equal(reviewC4E1EvidencePacket(rows).status,"INCOMPLETE_OR_UNSAFE");
 }
 for(const bad of [null,{},[],[null],"PASS"]){
  const r=reviewC4E1EvidencePacket(bad);
  assert.equal(r.stage2bCertified,false);
  assert.equal(r.status,"INCOMPLETE_OR_UNSAFE");
 }
});
