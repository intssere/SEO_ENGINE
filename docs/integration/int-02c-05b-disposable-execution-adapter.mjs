/** INT-02C-05B: disposable-only, dependency-injected adapter. NO driver, network or Production path. */
import {QUERY_SET,validateMetadataQuerySet,metadataQueryFingerprint} from "./int-02c-05a-railway-metadata-query-contract.mjs";

const deny=reason=>({ok:false,reason});
export async function inspectDisposableMetadata({fixture,executor,queries=QUERY_SET}={}){
 if(!fixture||fixture.kind!=="disposable_fixture"||fixture.database!=="int02c_disposable"||fixture.role!=="int02c_metadata_reader")return deny("disposable_identity_required");
 if(typeof executor!=="function")return deny("isolated_executor_required");
 if(!validateMetadataQuerySet(queries).valid)return deny("query_contract_invalid");
 const fp=metadataQueryFingerprint();
 const results=[];
 try{
  for(const q of queries){
   const records=await executor(q.sql,[...q.params],{fixtureOnly:true,queryId:q.id});
   if(!Array.isArray(records))return deny("invalid_result_shape");
   const max={session_identity:1,catalog_table_names:128,catalog_constraint_names:256,migration_ledger_candidates:32}[q.id];
   if(q.id!=="session_identity" && records.length>=max)return deny("result_limit_reached_inventory_incomplete");
   if(q.id==="session_identity"){
    if(records.length!==1||records[0]?.database_name!==fixture.database||records[0]?.session_role!==fixture.role||records[0]?.in_recovery!==false)return deny("session_identity_mismatch");
   }
   results.push({queryId:q.id,rowCount:records.length});
  }
 }catch{return deny("isolated_execution_failed");}
 // Return only result cardinality, not object names or rows; no attestation of live DB.
 return {ok:true,scope:"disposable_fixture_only",fingerprint:fp,results};
}
export function productionAdmission(){return deny("production_execution_not_implemented");}
