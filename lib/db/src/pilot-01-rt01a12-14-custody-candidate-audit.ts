/**
 * A12.14 source-only SQL candidate compatibility gate.
 * Pure text inspection. Does NOT execute SQL, connect to a DB, or certify RLS.
 * Existing A12.7-A12.13 contract and disposable tests are reused unchanged.
 */
export type StaticCandidateResult=Readonly<{
  status:"candidate_consistent"|"blocked";
  issues:readonly string[];
}>;
const legacyTables=["grants","jobs","admissions","job_events","outbox"];
const newTables=["tenant_memberships","issuer_custody","custody_revocation_events"];
function has(source:string,pattern:RegExp):boolean{return pattern.test(source);}
export function assessCustodySqlCandidate(
  candidate:string,priorCandidate:string,authMigration:string,
  coreMigration:string
):StaticCandidateResult{
  const issues:string[]=[];
  if(typeof candidate!=="string"||typeof priorCandidate!=="string"||
    typeof authMigration!=="string"||typeof coreMigration!=="string")
    return {status:"blocked",issues:["missing_source"]};
  // Parse statement text only: descriptive comments may mention prohibited SQL.
  const statements=candidate.replace(/--[^\n]*/g,"").replace(/\/\*[\s\S]*?\*\//g,"");
  if(!has(candidate,/UNEXECUTED ADDITIVE CUSTODY PERSISTENCE CANDIDATE/i))
    issues.push("not_marked_unexecuted");
  if(!has(candidate,/\bBEGIN\s*;/i)||!has(candidate,/\bCOMMIT\s*;/i))
    issues.push("missing_transaction_envelope");
  if(!has(priorCandidate,/CREATE\s+SCHEMA\s+pilot01\b/i))
    issues.push("missing_existing_pilot_schema");
  if(!has(priorCandidate,/UNIQUE\s+INDEX\s+pilot01_sites_organization_id_id_unique/i))
    issues.push("missing_composite_site_index_dependency");
  if(!has(authMigration,/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+auth_sessions\b/i))
    issues.push("canonical_auth_missing");
  if(!has(coreMigration,/CREATE\s+TABLE\s+organizations\s*\(/i)||
    !has(coreMigration,/CREATE\s+TABLE\s+sites\s*\(/i))
    issues.push("canonical_tenant_site_missing");
  for(const name of newTables){
    if(!has(candidate,new RegExp("CREATE\\s+TABLE\\s+pilot01\\."+name+"\\s*\\(","i")))
      issues.push("missing_"+name);
    if(!has(candidate,new RegExp("ALTER\\s+TABLE\\s+pilot01\\."+name+"\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY","i")))
      issues.push("rls_enable_missing_"+name);
    if(!has(candidate,new RegExp("ALTER\\s+TABLE\\s+pilot01\\."+name+"\\s+FORCE\\s+ROW\\s+LEVEL\\s+SECURITY","i")))
      issues.push("rls_force_missing_"+name);
    if(has(priorCandidate,new RegExp("CREATE\\s+TABLE\\s+pilot01\\."+name+"\\s*\\(","i")))
      issues.push("duplicate_existing_table_"+name);
  }
  for(const name of legacyTables)
    if(has(candidate,new RegExp("CREATE\\s+TABLE\\s+pilot01\\."+name+"\\s*\\(","i")))
      issues.push("duplicate_pilot_table_"+name);
  if(!has(candidate,/PRIMARY\s+KEY\s*\(organization_id\s*,\s*subject\s*\)/i))
    issues.push("tenant_membership_key_missing");
  if(!has(candidate,/CHECK\s*\(revision\s*>\s*0\)/gi))
    issues.push("revision_positive_missing");
  if((candidate.match(/CHECK\s*\(revision\s*>\s*0\)/gi)||[]).length<2)
    issues.push("both_revision_fences_required");
  if(!has(candidate,/FOREIGN\s+KEY\s*\(organization_id\s*,\s*site_id\s*\)\s*REFERENCES\s+public\.sites\s*\(organization_id\s*,\s*id\)/i))
    issues.push("cross_tenant_site_fk_missing");
  if(!has(candidate,/entity_type\s+text\s+NOT\s+NULL\s+CHECK/i)||
     !has(candidate,/authorization_receipt_sha256\s+char\(64\)/i))
    issues.push("custody_event_evidence_missing");
  if(!has(candidate,/provenance_sha256\s+char\(64\)/i))
    issues.push("issuer_fingerprint_missing");
  if(!has(candidate,/REVOKE\s+ALL\s+ON\s+pilot01\.tenant_memberships/i)||
    !has(candidate,/custody_revocation_events\s+FROM\s+PUBLIC/i))
    issues.push("public_revoke_missing");
  // Future integration has not been authorized. Candidate may not create open RLS
  // policies or assign privileges to application and worker roles.
  if(has(statements,/\bCREATE\s+POLICY\b|\bCREATE\s+ROLE\b|\bGRANT\b|\bSECURITY\s+DEFINER\b|\bCREATE\s+TRIGGER\b/i))
    issues.push("operational_privilege_or_mutation_prohibited");
  if(has(statements,/\bDROP\s+(?:TABLE|SCHEMA|ROLE|POLICY)\b|\bTRUNCATE\b|\bDELETE\s+FROM\b/i))
    issues.push("destructive_statement_prohibited");
  return {status:issues.length?"blocked":"candidate_consistent",issues};
}
