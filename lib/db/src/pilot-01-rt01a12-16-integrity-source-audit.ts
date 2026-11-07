/** A12.16 source-only static audit, never SQL execution or RLS certification. */
export type IntegrityAudit=Readonly<{status:"source_consistent"|"blocked";issues:readonly string[]}>;
const check=(s:string,re:RegExp)=>re.test(s);
const strip=(s:string)=>s.replace(/--[^\n]*/g,"").replace(/\/\*[\s\S]*?\*\//g,"");
export function assessCustodyIntegritySql(enforcement:string,base:string,custody:string):IntegrityAudit{
  if([enforcement,base,custody].some(s=>typeof s!=="string"||!s.trim()))
    return {status:"blocked",issues:["missing_source"]};
  const s=strip(enforcement),b=strip(base),c=strip(custody),issues:string[]=[];
  const require=(re:RegExp,problem:string)=>{if(!check(s,re))issues.push(problem);};
  if(!check(enforcement,/UNEXECUTED ADDITIVE ENFORCEMENT CANDIDATE/i)||
     !check(s,/^\s*BEGIN\s*;/i)||!check(s,/COMMIT\s*;\s*$/i))
    issues.push("candidate_not_guarded");
  for(const name of ["tenant_memberships","issuer_custody","custody_revocation_events"]){
    const re=new RegExp("CREATE\\s+TABLE\\s+pilot01\\."+name+"\\s*\\(","i");
    if(!check(c,re))issues.push("missing_custody_dependency_"+name);
    if(check(s,re))issues.push("duplicate_custody_table_"+name);
  }
  if(!check(b,/CREATE\s+FUNCTION\s+pilot01\.reject_immutable_mutation\s*\(/i))
    issues.push("missing_existing_immutability_guard");
  if(!check(b,/CREATE\s+SCHEMA\s+pilot01\s*;/i))
    issues.push("missing_pilot_schema_dependency");
  require(/CREATE\s+TRIGGER\s+pilot01_custody_revocation_events_immutable\s+BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+pilot01\.custody_revocation_events[\s\S]*?EXECUTE\s+FUNCTION\s+pilot01\.reject_immutable_mutation\s*\(\s*\)/i,"immutable_revocation_evidence_missing");
  for(const [name,label] of [["tenant_memberships","membership"],["issuer_custody","issuer"]] as const){
    const trigger=(kind:string,timing:string,fn:string)=>new RegExp(
      "CREATE\\s+TRIGGER\\s+pilot01_"+label+"_"+kind+"\\s+"+timing+
      "\\s+ON\\s+pilot01\\."+name+"[\\s\\S]*?EXECUTE\\s+FUNCTION\\s+pilot01\\."+fn+"\\s*\\(\\s*\\)","i");
    if(!check(s,trigger("no_delete","BEFORE\\s+DELETE","reject_immutable_mutation")))
      issues.push("delete_guard_missing_"+label);
    if(!check(s,trigger("revocation_guard","BEFORE\\s+UPDATE","guard_custody_revocation_transition")))
      issues.push("transition_guard_missing_"+label);
    if(!check(s,trigger("revocation_append","AFTER\\s+UPDATE","append_guarded_custody_revocation")))
      issues.push("audit_append_missing_"+label);
  }
  require(/NEW\.revision\s*<>\s*OLD\.revision\s*\+\s*1/i,"revision_not_exact_increment");
  for(const re of [/OLD\.active\s+IS\s+DISTINCT\s+FROM\s+TRUE/i,
    /OLD\.revoked_at\s+IS\s+NOT\s+NULL/i,
    /NEW\.active\s+IS\s+DISTINCT\s+FROM\s+FALSE/i,
    /NEW\.revoked_at\s+IS\s+NULL/i])require(re,"irreversible_revocation_guard_missing");
  for(const field of ["organization_id","subject","role","issuer_id","site_id",
    "actor_subject","operation","provenance_sha256"]){
    const re=new RegExp("NEW\\."+field+"\\s+IS\\s+DISTINCT\\s+FROM\\s+OLD\\."+field,"i");
    require(re,"identity_scope_freeze_missing_"+field);
    if(field==="organization_id"&&(s.match(re)||[]).length<2)
      issues.push("tenant_identity_guard_missing_in_one_custody_branch");
  }
  require(/INSERT\s+INTO\s+pilot01\.custody_revocation_events/i,"atomic_audit_insert_missing");
  require(/CREATE\s+FUNCTION\s+pilot01\.append_guarded_custody_revocation\s*\(\s*\)/i,"atomic_audit_function_missing");
  require(/RETURN\s+NULL\s*;/i,"audit_after_trigger_return_missing");
  if((s.match(/SECURITY\s+INVOKER/gi)||[]).length<2)
    issues.push("functions_not_invoker");
  require(/SET\s+search_path\s*=\s*pg_catalog\s*,\s*pilot01/i,"search_path_unpinned");
  require(/public\.digest\s*\(\s*v_material\s*,\s*'sha256'\s*\)/i,"pgcrypto_digest_unqualified");
  for(const name of ["guard_custody_revocation_transition","append_guarded_custody_revocation"]){
    const re=new RegExp("REVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+pilot01\\."+name+
      "\\s*\\(\\s*\\)\\s+FROM\\s+PUBLIC","i");
    require(re,"public_function_execute_not_revoked_"+name);
  }
  if(check(s,/\bCREATE\s+TABLE\b|\bCREATE\s+ROLE\b|\bCREATE\s+POLICY\b|\bGRANT\b|\bTRUNCATE\b|\bDROP\s+(?:TABLE|SCHEMA|ROLE)\b/i))
    issues.push("unauthorized_ddl_or_grants");
  return {status:issues.length?"blocked":"source_consistent",issues};
}
