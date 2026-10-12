/** INT-02C-05A: OFFLINE query specification; intentionally no DB driver or execution path. */
import {createHash} from "node:crypto";

export const TARGET=Object.freeze({
  railwayProjectId:"52265e29-921b-4652-ac0d-9da4e5e69936",
  environmentId:"7f8d920f-f6c6-44f0-b9fe-252cb4f32298",
  serviceId:"b69e0633-7ab9-40ab-85f3-c9edd6acb031",
  volumeId:"5e7f09d1-c436-4a49-9526-c3150d0e820a"
});

const SPEC=Object.freeze([
  {id:"session_identity",sql:"SELECT current_database() AS database_name, current_user AS session_role, pg_catalog.pg_backend_pid() AS backend_pid, pg_catalog.pg_is_in_recovery() AS in_recovery",params:[]},
  {id:"catalog_table_names",sql:"SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name LIMIT 128",params:[]},
  {id:"catalog_constraint_names",sql:"SELECT n.nspname AS schema_name, c.relname AS table_name, con.conname AS constraint_name, con.contype AS constraint_type FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid = con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' ORDER BY c.relname, con.conname LIMIT 256",params:[]},
  {id:"migration_ledger_candidates",sql:"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND (table_name LIKE '%migration%' OR table_name LIKE '%schema_version%') ORDER BY table_name LIMIT 32",params:[]}
]);
export const QUERY_SET=Object.freeze(SPEC.map(q=>Object.freeze({...q,params:Object.freeze([...q.params])})));
const normalize=s=>s.replace(/\s+/g," ").trim();
const FORBIDDEN=/\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|copy|call|do|execute|prepare|deallocate|vacuum|analyze|refresh|reindex|cluster|lock|set|show|listen|notify)\b/i;
export function validateMetadataQuerySet(queries=QUERY_SET){
 const ids=["session_identity","catalog_table_names","catalog_constraint_names","migration_ledger_candidates"];
 if(!Array.isArray(queries)||queries.length!==ids.length)return {valid:false,reason:"query_set_shape_invalid"};
 for(let i=0;i<ids.length;i++){
  const q=queries[i],canonical=SPEC[i];
  if(!q||q.id!==ids[i]||!Array.isArray(q.params)||q.params.length!==0)return {valid:false,reason:"query_contract_mismatch"};
  if(typeof q.sql!=="string"||!/^SELECT\b/i.test(normalize(q.sql))||q.sql.includes(";")||FORBIDDEN.test(q.sql))return {valid:false,reason:"non_readonly_sql_refused"};
  if(normalize(q.sql)!==normalize(canonical.sql))return {valid:false,reason:"unapproved_query_refused"};
 }
 return {valid:true,reason:"offline_contract_valid_only"};
}
export function metadataQueryFingerprint(){
 const status=validateMetadataQuerySet();
 if(!status.valid)throw Error(status.reason);
 return createHash("sha256").update(JSON.stringify({target:TARGET,queries:QUERY_SET.map(q=>({id:q.id,sql:normalize(q.sql),params:q.params}))})).digest("hex");
}
export function evaluateLiveMetadataAdmission(request){
 // This module cannot independently prove DB role, server identity, credentials, witness,
 // or read-only transaction semantics. It MUST NOT authorize even a matching request.
 return {admitted:false,reason:"independent_readonly_execution_adapter_unavailable"};
}
