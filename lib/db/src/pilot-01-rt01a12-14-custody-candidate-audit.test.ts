import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {assessCustodySqlCandidate} from "./pilot-01-rt01a12-14-custody-candidate-audit.js";

// Source-file inspection only. No imports of database drivers or operational modules.
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),"utf8");
const source=read("../../../docs/sql-candidates/rt01-a12-14-canonical-membership-issuer-revocation-additive.sql");
const existing=read("../../../docs/sql-candidates/rt01-a12-1-pilot01-additive.sql");
const auth=read("../migrations/0002_auth.sql");
const core=read("../migrations/0001_core.sql");
const audit=(s:string,p=existing,a=auth,c=core)=>assessCustodySqlCandidate(s,p,a,c);
test("unexecuted, additive candidate retains new-only custody persistence",()=>{
 const result=audit(source);
 assert.deepEqual(result,{status:"candidate_consistent",issues:[]});
 assert.doesNotMatch(source,/CREATE TABLE pilot01\.(grants|jobs|admissions|job_events|outbox)\b/i);
});
test("reject accidental recreation of legacy pilot grant/job/receipt tables",()=>{
 for(const table of ["grants","jobs","admissions","job_events","outbox"]){
  const changed=source.replace("COMMIT;",`CREATE TABLE pilot01.${table} (id integer);\nCOMMIT;`);
  assert.equal(audit(changed).status,"blocked",table);
 }
});
test("reject missing membership/issuer/revocation storage and force RLS",()=>{
 for(const table of ["tenant_memberships","issuer_custody","custody_revocation_events"]){
  const missing=source.replace(new RegExp("CREATE TABLE pilot01\\."+table),`-- removed ${table}`);
  assert.equal(audit(missing).status,"blocked",table);
  const noForce=source.replace(`ALTER TABLE pilot01.${table} FORCE ROW LEVEL SECURITY;`,"-- removed force");
  assert.equal(audit(noForce).status,"blocked",table);
 }
});
test("reject cross-tenant FK deletion, lost revision fences, missing audit or PUBLIC revoke",()=>{
 for(const changed of [
  source.replace("FOREIGN KEY (organization_id, site_id)","FOREIGN KEY (site_id)"),
  source.replaceAll("CHECK (revision > 0)","CHECK (revision >= 0)"),
  source.replace("authorization_receipt_sha256","unsupported_receipt_hash"),
  source.replace("REVOKE ALL ON pilot01.tenant_memberships","-- REVOKE removed")
 ])assert.equal(audit(changed).status,"blocked");
});
test("reject operation-enabling grants, policies, DB roles and destructive DDL",()=>{
 for(const stmt of ["GRANT SELECT ON pilot01.issuer_custody TO app;",
  "CREATE POLICY allow_all ON pilot01.issuer_custody USING (true);",
  "CREATE ROLE pilot_app LOGIN;", "DROP TABLE pilot01.grants;",
  "SECURITY DEFINER", "DELETE FROM public.auth_sessions;"]){
  assert.equal(audit(source.replace("COMMIT;",stmt+"\nCOMMIT;")).status,"blocked",stmt);
 }
});
test("reject unavailable canonical lineage or unexecuted schema prerequisites",()=>{
 assert.equal(audit(source,"",auth,core).status,"blocked");
 assert.equal(audit(source,existing,"",core).status,"blocked");
 assert.equal(audit(source,existing,auth,"").status,"blocked");
 assert.equal(audit(source,existing.replace("pilot01_sites_organization_id_id_unique","removed")).status,"blocked");
});
test("candidate stays physically outside operational migration directory",()=>{
 assert.match(import.meta.url,/pilot-01-rt01a12-14-custody-candidate-audit\.test\.ts/);
 assert.match(source,/NOT in lib\/db\/migrations/);
 assert.doesNotMatch(source,/\bCREATE\s+FUNCTION\b|\bCREATE\s+TRIGGER\b/i);
});
