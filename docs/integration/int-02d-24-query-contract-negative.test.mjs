// INT-02D-24: offline-only source-contract regression tests. No DB/network access.
import assert from "node:assert/strict";
import {test} from "node:test";
import {QUERY_SET, TARGET, validateMetadataQuerySet, metadataQueryFingerprint, evaluateLiveMetadataAdmission} from "./int-02c-05a-railway-metadata-query-contract.mjs";

const clone=()=>QUERY_SET.map(q=>({id:q.id,sql:q.sql,params:[...q.params]}));
const invalid=(change,expected)=>{const q=clone();change(q);const result=validateMetadataQuerySet(q);assert.equal(result.valid,false);assert.equal(result.reason,expected);};
test("four ordered and immutable approved statement declarations",()=>{
 assert.deepEqual(QUERY_SET.map(q=>q.id),["session_identity","catalog_table_names","catalog_constraint_names","migration_ledger_candidates"]);
 assert.deepEqual(QUERY_SET.map(q=>q.params.length),[0,0,0,0]);
 assert.equal(validateMetadataQuerySet().valid,true);
 assert.equal(Object.isFrozen(QUERY_SET),true);
 for(const q of QUERY_SET){assert.equal(Object.isFrozen(q),true);assert.equal(Object.isFrozen(q.params),true);}
});
test("rejects missing, extra, moved and duplicate queries",()=>{
 invalid(q=>q.pop(),"query_set_shape_invalid");
 invalid(q=>q.push({...q[0]}),"query_set_shape_invalid");
 invalid(q=>q.reverse(),"query_contract_mismatch");
 invalid(q=>{q[1].id=q[0].id;},"query_contract_mismatch");
});
test("rejects changed SQL and injected arguments",()=>{
 invalid(q=>{q[0].sql+="; SELECT 1";},"non_readonly_sql_refused");
 invalid(q=>{q[1].sql="SELECT * FROM public.customer";},"unapproved_query_refused");
 invalid(q=>{q[2].sql="DELETE FROM public.customer";},"non_readonly_sql_refused");
 invalid(q=>{q[3].params.push("arbitrary");},"query_contract_mismatch");
 invalid(q=>{q[0].sql="SELECT 1 -- change";},"unapproved_query_refused");
});
test("canonical fingerprint is stable and shaped like SHA-256",()=>{
 const a=metadataQueryFingerprint(),b=metadataQueryFingerprint();
 assert.match(a,/^[a-f0-9]{64}$/);assert.equal(a,b);
 assert.deepEqual(Object.keys(TARGET).sort(),["environmentId","railwayProjectId","serviceId","volumeId"]);
});
test("live admission is unconditionally denied even with apparent approval",()=>{
 const samples=[undefined,{}, {authorized:true,roleReadOnly:true}, {fingerprint:metadataQueryFingerprint(),target:TARGET,authorization:"approved"}];
 for(const x of samples)assert.deepEqual(evaluateLiveMetadataAdmission(x),{admitted:false,reason:"independent_readonly_execution_adapter_unavailable"});
});
test("query limits are in canonical SQL, not dynamic inputs",()=>{
 const limits=[null,128,256,32];
 QUERY_SET.forEach((q,i)=>{assert.equal(q.params.length,0);if(limits[i]!==null)assert.match(q.sql,new RegExp("LIMIT "+limits[i]+"$"));});
});
