/** A12.23 isolated PG17 schema/upgrade compatibility only. Never operational SQL. */
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";
import {sourceGate,type SourceMigration} from "./pilot-01-rt01a12-23-migration-lineage-gate.js";
type DB=ReturnType<typeof postgres>;
const armed=process.env.PILOT01_A12_23_DISPOSABLE_PG==="I_ACKNOWLEDGE_NEW_EMPTY_PG17_ONLY"&&
 Boolean(process.env.PILOT01_A12_23_DISPOSABLE_DATABASE_URL);
function url():string{
  if(!armed)throw Error("A12_23_NOT_ARMED");
  const u=new URL(process.env.PILOT01_A12_23_DISPOSABLE_DATABASE_URL!);
  if(!["postgres:","postgresql:"].includes(u.protocol)||
   !["127.0.0.1","localhost","[::1]","::1"].includes(u.hostname)||
   u.port!=="5432"||u.username!=="postgres"||
   u.pathname!=="/pilot01_disposable_rt01a12_23_ci"||
   Boolean(u.search)||Boolean(u.hash)||
   /railway|neon|production|staging|restore|supabase|diamondshelf/i.test(u.href))
    throw Error("A12_23_REFUSE_NONDISPOSABLE_TARGET");
  return u.toString();
}
async function attest(db:DB){
  const r=await db.unsafe<{name:string;major:number;who:string;tables:number;extra:number;extensions:number;roles:number}[]>(
    "SELECT current_database() AS name, current_setting('server_version_num')::int/10000 AS major,"+
    "current_user AS who, (SELECT count(*)::int FROM pg_tables WHERE schemaname='public') AS tables,"+
    "(SELECT count(*)::int FROM pg_namespace WHERE nspname NOT IN "+
    "('public','pg_catalog','information_schema','pg_toast') AND nspname NOT LIKE 'pg_temp_%' "+
    "AND nspname NOT LIKE 'pg_toast_temp_%') AS extra,"+
    "(SELECT count(*)::int FROM pg_extension WHERE extname<>'plpgsql') AS extensions,"+
    "(SELECT count(*)::int FROM pg_roles WHERE rolname LIKE 'pilot01_a12_21_%') AS roles");
  assert.deepEqual(r[0],{name:"pilot01_disposable_rt01a12_23_ci",major:17,who:"postgres",
    tables:0,extra:0,extensions:0,roles:0});
}
async function tableFingerprint(db:DB){
  return db.unsafe<{table_name:string;column_name:string;data_type:string;is_nullable:string}[]>(
    "SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns "+
    "WHERE table_schema='public' ORDER BY table_name,column_name");
}
test("A12.23 unarmed fixture is non-executable",()=>{
  if(!armed)assert.throws(url,/A12_23_NOT_ARMED/);
});
test("A12.23 canonical-to-custody upgrade in attested fresh PG17, rollback and fail-closed checks",
  {skip:!armed,timeout:180000},async t=>{
  const db=postgres(url(),{max:1,prepare:false,connect_timeout:4,idle_timeout:4});
  let safe=false;
  try{
    await attest(db);safe=true;
    const names=(await readdir(new URL("../migrations/",import.meta.url)))
      .filter(n=>/^\d{4}_.*\.sql$/.test(n)).sort();
    const canonical:SourceMigration[]=await Promise.all(names.map(async name=>({
      name,sql:await readFile(new URL("../migrations/"+name,import.meta.url),"utf8")
    })));
    const candidates:SourceMigration[]=await Promise.all([
      "rt01-a12-1-pilot01-additive.sql",
      "rt01-a12-14-canonical-membership-issuer-revocation-additive.sql",
      "rt01-a12-16-custody-integrity-enforcement-additive.sql",
      "rt01-a12-21-isolated-role-rls-default-deny.sql"
    ].map(async name=>({name,sql:await readFile(
      new URL("../../../docs/sql-candidates/"+name,import.meta.url),"utf8")})));
    const gate=sourceGate(canonical,candidates);
    assert.equal(gate.status,"pass",gate.issues.join(","));
    for(const x of canonical)await db.unsafe(x.sql);
    const before=await tableFingerprint(db);
    assert.ok(before.some(x=>x.table_name==="organizations"&&x.column_name==="id"));
    assert.ok(before.some(x=>x.table_name==="auth_sessions"&&x.column_name==="subject"));
    await t.test("failed synthetic upgrade transaction leaves no partial DDL",async()=>{
      await assert.rejects(db.begin(async tx=>{
        await tx.unsafe("CREATE SCHEMA pilot01_rollback_probe");
        await tx.unsafe("CREATE TABLE pilot01_rollback_probe.candidate(id integer)");
        await tx.unsafe("SELECT 1/0");
      }));
      const found=await db.unsafe<{exists:boolean}[]>(
        "SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='pilot01_rollback_probe') AS exists");
      assert.equal(found[0].exists,false);
    });
    for(const x of candidates)await db.unsafe(x.sql);
    await t.test("canonical column signatures unchanged after additive candidates",async()=>{
      assert.deepEqual(await tableFingerprint(db),before);
    });
    await t.test("custody tables, privileges, FORCE RLS and revocation guards exist",async()=>{
      const required=["grants","jobs","admissions","job_events","outbox",
        "tenant_memberships","issuer_custody","custody_revocation_events"];
      const rows=await db.unsafe<{relname:string;relrowsecurity:boolean;relforcerowsecurity:boolean}[]>(
        "SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class "+
        "WHERE relnamespace='pilot01'::regnamespace AND relkind='r' ORDER BY relname");
      assert.deepEqual(rows.map(x=>x.relname).sort(),[...required].sort());
      assert.ok(rows.every(x=>x.relrowsecurity&&x.relforcerowsecurity));
      const triggers=await db.unsafe<{tgname:string}[]>(
        "SELECT tgname FROM pg_trigger WHERE tgrelid='pilot01.tenant_memberships'::regclass "+
        "AND NOT tgisinternal");
      assert.ok(triggers.some(x=>x.tgname==="pilot01_membership_revocation_guard"));
      const role=await db.unsafe<{rolname:string;rolbypassrls:boolean;rolcanlogin:boolean}[]>(
        "SELECT rolname,rolbypassrls,rolcanlogin FROM pg_roles WHERE rolname LIKE 'pilot01_a12_21_%'");
      assert.equal(role.length,4);
      assert.ok(role.every(x=>!x.rolbypassrls&&!x.rolcanlogin));
    });
    await t.test("repeated non-idempotent candidate refuses partial replay",async()=>{
      await assert.rejects(db.unsafe(candidates[0].sql));
      const rows=await db.unsafe<{n:number}[]>(
        "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='pilot01'");
      assert.equal(rows[0].n,8);
    });
  }finally{
    // This instance is created exclusively by GitHub Actions for this job.
    if(safe){
      try{await db.unsafe("DROP SCHEMA IF EXISTS pilot01 CASCADE");
        await db.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
        await db.unsafe("CREATE SCHEMA public");
      }finally{await db.end({timeout:4});}
    }else await db.end({timeout:4});
  }
});
