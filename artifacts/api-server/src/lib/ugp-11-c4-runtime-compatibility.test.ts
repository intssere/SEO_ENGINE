import assert from "node:assert/strict";
import test from "node:test";
import {reviewC4RuntimeMinimums,type C4RuntimeFacts} from "./ugp-11-c4-runtime-compatibility.js";
const evidence:C4RuntimeFacts={
 nodeVersion:"v22.12.0",postgresVersion:"17.0",nodeEvidence:"executed_runtime",
 postgresEvidence:"sql_server_version",environment:"disposable_nonproduction",
 imageDigest:"sha256:"+"a".repeat(64)
};
test("C4 version minima can pass without admitting transport",()=>{
 const result=reviewC4RuntimeMinimums(evidence);
 assert.equal(result.compatibleMinimums,true);
 assert.equal(result.transportCertified,false);
 assert.equal(result.claimAllowed,false);
 assert.equal(result.dispatchAllowed,false);
});
test("C4 rejects insufficient or merely inferred evidence",()=>{
 const variants:Partial<C4RuntimeFacts>[]=[
  {nodeVersion:"v22.11.9"},{nodeVersion:"22"},{postgresVersion:"12.15"},
  {postgresVersion:"18-alpine"},{nodeEvidence:"asserted" as never},
  {postgresEvidence:"image_tag" as never},{environment:"production" as never},
  {imageDigest:"sha256:unknown"}
 ];
 for(const variant of variants){
  const result=reviewC4RuntimeMinimums({...evidence,...variant});
  assert.equal(result.compatibleMinimums,false);
  assert.ok(result.reasons.length>0);
  assert.equal(result.claimAllowed,false);
  assert.equal(result.dispatchAllowed,false);
 }
});
