import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {assessCustodyIntegritySql} from "./pilot-01-rt01a12-16-integrity-source-audit.js";
const read=(p:string)=>readFileSync(new URL(p,import.meta.url),"utf8");
const sql=read("../../../docs/sql-candidates/rt01-a12-16-custody-integrity-enforcement-additive.sql");
const base=read("../../../docs/sql-candidates/rt01-a12-1-pilot01-additive.sql");
const custody=read("../../../docs/sql-candidates/rt01-a12-14-canonical-membership-issuer-revocation-additive.sql");
const audit=(s:string,b=base,c=custody)=>assessCustodyIntegritySql(s,b,c);
test("integrity delta is source-only, reuses A12.1 and A12.14 without new tables",()=>{
  assert.deepEqual(audit(sql),{status:"source_consistent",issues:[]});
  assert.doesNotMatch(sql,/CREATE\s+TABLE\s+pilot01\./i);
});
test("missing dependency fails closed without SQL execution",()=>{
  assert.equal(audit(sql,"").status,"blocked");
  assert.equal(audit(sql,base,"").status,"blocked");
  assert.equal(audit(sql,base.replace("reject_immutable_mutation","missing_guard")).status,"blocked");
  assert.equal(audit(sql,base,custody.replace("CREATE TABLE pilot01.issuer_custody","CREATE TABLE pilot01.removed")).status,"blocked");
});
test("negative mutations reject revision downgrades or skipped increments",()=>{
  for(const patch of ["NEW.revision <> OLD.revision", "NEW.revision < OLD.revision + 1",
    "NEW.revision = OLD.revision + 1"]){
    assert.equal(audit(sql.replace("NEW.revision <> OLD.revision + 1",patch)).status,"blocked");
  }
});
test("negative mutations reject missing irreversible revocation safeguards",()=>{
  for(const text of ["OLD.active IS DISTINCT FROM TRUE","OLD.revoked_at IS NOT NULL",
    "NEW.active IS DISTINCT FROM FALSE","NEW.revoked_at IS NULL"]){
    assert.equal(audit(sql.replace(text,"FALSE")).status,"blocked",text);
  }
});
test("scope identity guard cannot silently remove tenant, role or issuer binding",()=>{
  for(const text of [
    "NEW.organization_id IS DISTINCT FROM OLD.organization_id",
    "NEW.role IS DISTINCT FROM OLD.role",
    "NEW.site_id IS DISTINCT FROM OLD.site_id",
    "NEW.provenance_sha256 IS DISTINCT FROM OLD.provenance_sha256"
  ])assert.equal(audit(sql.replace(text,"FALSE")).status,"blocked",text);
});
test("removing either custody guard or audit trigger fails",()=>{
  for(const name of [
    "pilot01_membership_no_delete","pilot01_issuer_no_delete",
    "pilot01_membership_revocation_guard","pilot01_issuer_revocation_guard",
    "pilot01_membership_revocation_append","pilot01_issuer_revocation_append",
    "pilot01_custody_revocation_events_immutable"
  ])assert.equal(audit(sql.replace("CREATE TRIGGER "+name,"CREATE TRIGGER disabled_"+name)).status,"blocked",name);
});
test("removing automatic audit INSERT, invoker identity, or restricted function rights fails",()=>{
  for(const replacement of [
    sql.replace("INSERT INTO pilot01.custody_revocation_events","INSERT INTO pilot01.untrusted_events"),
    sql.replaceAll("SECURITY INVOKER","SECURITY DEFINER"),
    sql.replace("public.digest(v_material,'sha256')","digest(v_material,'sha256')"),
    sql.replace("REVOKE ALL ON FUNCTION pilot01.append_guarded_custody_revocation() FROM PUBLIC;","")
  ])assert.equal(audit(replacement).status,"blocked");
});
test("unauthorized grants, new tables, role setup or policy changes fail closed",()=>{
  for(const statement of [
    "GRANT UPDATE ON pilot01.tenant_memberships TO api;",
    "CREATE POLICY unsafe_all ON pilot01.issuer_custody USING (true);",
    "CREATE ROLE custodian LOGIN;",
    "CREATE TABLE pilot01.duplicate(id uuid);",
    "DROP SCHEMA pilot01 CASCADE;"
  ])assert.equal(audit(sql.replace("COMMIT;",statement+"\nCOMMIT;")).status,"blocked",statement);
});
