import {test} from "node:test";
import assert from "node:assert/strict";
import {TARGET,QUERY_SET,validateMetadataQuerySet,metadataQueryFingerprint,evaluateLiveMetadataAdmission} from "./int-02c-05a-railway-metadata-query-contract.mjs";

test("contract pinned to independently identified Railway primary candidate",()=>{
 assert.equal(TARGET.serviceId,"b69e0633-7ab9-40ab-85f3-c9edd6acb031");
 assert.equal(TARGET.volumeId,"5e7f09d1-c436-4a49-9526-c3150d0e820a");
 assert.equal(validateMetadataQuerySet().valid,true);
 assert.match(metadataQueryFingerprint(),/^[a-f0-9]{64}$/);
});
test("only fixed, ordered metadata SELECT statements permitted",()=>{
 assert.deepEqual(QUERY_SET.map(q=>q.id),["session_identity","catalog_table_names","catalog_constraint_names","migration_ledger_candidates"]);
 for(const [i,replacement] of [[0,"DELETE FROM public.sites"],[1,"SELECT * FROM public.sites"],[2,"SELECT 1; DROP TABLE users"],[3,"SELECT * FROM information_schema.columns"]]){
  const injected=QUERY_SET.map((q,j)=>j===i?{...q,sql:replacement,params:[]}:q);
  assert.equal(validateMetadataQuerySet(injected).valid,false);
 }
 assert.equal(validateMetadataQuerySet(QUERY_SET.slice(0,3)).valid,false);
 assert.equal(validateMetadataQuerySet([...QUERY_SET].reverse()).valid,false);
 assert.equal(validateMetadataQuerySet(QUERY_SET.map((q,i)=>i===0?{...q,params:["secret"]}:q)).valid,false);
});
test("no live request can pass admission through offline contract",()=>{
 for(const request of [undefined,{}, {authorized:true,readOnly:true,serviceId:TARGET.serviceId},{productionCertified:true}]){
  assert.deepEqual(evaluateLiveMetadataAdmission(request),{admitted:false,reason:"independent_readonly_execution_adapter_unavailable"});
 }
});
