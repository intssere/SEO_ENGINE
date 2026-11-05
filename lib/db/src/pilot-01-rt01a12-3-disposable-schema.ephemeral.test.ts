import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";

// RT01-A12.3: disposable PostgreSQL 17 only. No operational adapter, startup or provider.
const armed = process.env.PILOT01_A12_3_DISPOSABLE_PG === "I_ACKNOWLEDGE_NEW_EMPTY_PG17_ONLY"
  && Boolean(process.env.PILOT01_A12_3_DISPOSABLE_DATABASE_URL);
const candidate = new URL("../../../docs/sql-candidates/rt01-a12-1-pilot01-additive.sql", import.meta.url);
function disposableUrl(): string {
  if (!armed) throw Error("A12_3_NOT_ARMED");
  const u = new URL(process.env.PILOT01_A12_3_DISPOSABLE_DATABASE_URL!);
  if (!["postgres:", "postgresql:"].includes(u.protocol) ||
      !["localhost", "127.0.0.1", "[::1]", "::1"].includes(u.hostname) ||
      !/^pilot01_disposable_rt01a12_3_[a-z0-9_]+$/.test(u.pathname.slice(1)) ||
      u.username !== "postgres" || u.search !== "" ||
      /railway|neon|production|staging|restore|diamondshelf|supabase/i.test(u.href))
    throw Error("A12_3_REFUSE_NONLOCAL_NONDISPOSABLE_DATABASE");
  return u.toString();
}
test("A12.3 without arming performs zero database I/O", () => {
  if (!armed) assert.throws(disposableUrl, /A12_3_NOT_ARMED/);
});
test("A12.3 isolated PG17 schema candidate constraints, RLS and cleanup",
  {skip: !armed, timeout: 120000}, async t => {
  const sql = postgres(disposableUrl(), {max: 3, prepare: false, connect_timeout: 3});
  let owns = false;
  let role: string | null = null;
  try {
    const identity = await sql.unsafe<{db:string;major:number;username:string;n:number;pilot:boolean}[]>(
      "SELECT current_database() AS db, current_setting('server_version_num')::integer/10000 AS major, " +
      "current_user AS username, " +
      "(SELECT count(*)::int FROM pg_tables WHERE schemaname='public') AS n, " +
      "EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='pilot01') AS pilot");
    assert.match(identity[0]!.db, /^pilot01_disposable_rt01a12_3_[a-z0-9_]+$/);
    assert.equal(identity[0]!.major, 17);
    assert.equal(identity[0]!.username, "postgres");
    assert.equal(identity[0]!.n, 0, "refuse populated database");
    assert.equal(identity[0]!.pilot, false);
    const extra = await sql.unsafe(
      "SELECT nspname FROM pg_namespace WHERE nspname NOT IN " +
      "('public','information_schema','pg_catalog','pg_toast') " +
      "AND nspname NOT LIKE 'pg_temp_%' AND nspname NOT LIKE 'pg_toast_temp_%'");
    assert.equal(extra.length, 0, "refuse other user schemas");
    owns = true;
    // Only three synthetic public tables needed for canonical FK resolution.
    await sql.unsafe(
      "CREATE TABLE public.organizations(id uuid PRIMARY KEY); " +
      "CREATE TABLE public.sites(id uuid PRIMARY KEY,organization_id uuid NOT NULL " +
      "REFERENCES public.organizations(id)); " +
      "CREATE TABLE public.auth_sessions(id uuid PRIMARY KEY);");
    await sql.unsafe(await readFile(candidate, "utf8"));
    const tables = await sql.unsafe<{tablename:string}[]>(
      "SELECT tablename FROM pg_tables WHERE schemaname='pilot01' ORDER BY tablename");
    assert.deepEqual(tables.map(x => x.tablename),
      ["admissions","grants","job_events","jobs","outbox"]);
    const orgA = randomUUID(), orgB = randomUUID(), site = randomUUID(), session = randomUUID();
    const grant = randomUUID(), job = randomUUID(), admission = randomUUID();
    await sql.unsafe("INSERT INTO public.organizations VALUES($1),($2)", [orgA,orgB]);
    await sql.unsafe("INSERT INTO public.sites VALUES($1,$2)", [site,orgA]);
    await sql.unsafe("INSERT INTO public.auth_sessions VALUES($1)", [session]);
    const addGrant = (id:string, tenant:string, op:string="analyze") => sql.unsafe(
      "INSERT INTO pilot01.grants(grant_id,organization_id,site_id,actor_subject," +
      "session_id,issuer_id,issuer_provenance_sha256,operation,expires_at) " +
      "VALUES($1,$2,$3,'synthetic-actor',$4,'synthetic-issuer',$5,$6," +
      "clock_timestamp()+interval '1 hour')",
      [id,tenant,site,session,"a".repeat(64),op]);
    await addGrant(grant,orgA);
    await t.test("tenant foreign key and operation check", async () => {
      await assert.rejects(addGrant(randomUUID(),orgB),(e:any)=>e.code==="23503");
      await assert.rejects(addGrant(randomUUID(),orgA,"site_write"),(e:any)=>e.code==="23514");
    });
    await t.test("grant state shapes reject inconsistent transitions", async () => {
      await assert.rejects(sql.unsafe(
        "UPDATE pilot01.grants SET state='consumed' WHERE grant_id=$1",[grant]),
        (e:any)=>e.code==="23514");
      await sql.unsafe(
        "UPDATE pilot01.grants SET state='consumed',consumed_at=clock_timestamp() WHERE grant_id=$1",[grant]);
      await assert.rejects(sql.unsafe(
        "UPDATE pilot01.grants SET state='revoked',revoked_at=clock_timestamp() WHERE grant_id=$1",[grant]),
        (e:any)=>e.code==="23514");
    });
    await sql.unsafe(
      "INSERT INTO pilot01.jobs(job_id,grant_id,organization_id,site_id," +
      "actor_subject,issuer_id,operation) " +
      "VALUES($1,$2,$3,$4,'synthetic-actor','synthetic-issuer','analyze')",
      [job,grant,orgA,site]);
    await t.test("composite job scope prohibits spoofed actor", async () => {
      await assert.rejects(sql.unsafe(
        "INSERT INTO pilot01.jobs(grant_id,organization_id,site_id," +
        "actor_subject,issuer_id,operation) " +
        "VALUES($1,$2,$3,'forged-actor','synthetic-issuer','analyze')",
        [grant,orgA,site]),(e:any)=>e.code==="23503");
    });
    const addReceipt = (id:string,key:string) => sql.unsafe(
      "INSERT INTO pilot01.admissions(admission_id,job_id,grant_id," +
      "organization_id,site_id,actor_subject,issuer_id,operation," +
      "idempotency_key,request_sha256,transaction_id) " +
      "VALUES($1,$2,$3,$4,$5,'synthetic-actor','synthetic-issuer'," +
      "'analyze',$6,$7,'synthetic-tx')",
      [id,job,grant,orgA,site,key,"b".repeat(64)]);
    await addReceipt(admission,"synthetic-key");
    await t.test("immutable admission and event receipts",async()=>{
      await assert.rejects(sql.unsafe(
        "UPDATE pilot01.admissions SET idempotency_key='other' WHERE admission_id=$1",[admission]),
        (e:any)=>e.code==="P0001");
      await assert.rejects(sql.unsafe(
        "DELETE FROM pilot01.admissions WHERE admission_id=$1",[admission]),
        (e:any)=>e.code==="P0001");
      const event=randomUUID();
      await sql.unsafe(
        "INSERT INTO pilot01.job_events(event_id,admission_id,job_id,grant_id," +
        "organization_id,site_id,event_kind,generation,event_sha256) " +
        "VALUES($1,$2,$3,$4,$5,$6,'admitted',0,$7)",
        [event,admission,job,grant,orgA,site,"c".repeat(64)]);
      await assert.rejects(sql.unsafe(
        "DELETE FROM pilot01.job_events WHERE event_id=$1",[event]),
        (e:any)=>e.code==="P0001");
    });
    await t.test("outbox is blocked by default and cannot omit delivery time",async()=>{
      const out=await sql.unsafe<{state:string}[]>(
        "INSERT INTO pilot01.outbox(admission_id,job_id,grant_id,organization_id," +
        "site_id,operation,owner_id,generation,intent_sha256) " +
        "VALUES($1,$2,$3,$4,$5,'analyze','worker',1,$6) RETURNING state",
        [admission,job,grant,orgA,site,"d".repeat(64)]);
      assert.equal(out[0].state,"blocked");
      await assert.rejects(sql.unsafe(
        "UPDATE pilot01.outbox SET state='delivered' WHERE admission_id=$1",[admission]),
        (e:any)=>e.code==="23514");
    });
    await t.test("forced RLS denies even a SELECT-granted probe role",async()=>{
      role="pilot01_probe_"+randomUUID().replace(/-/g,"").slice(0,16);
      await sql.unsafe('CREATE ROLE "'+role+'" NOLOGIN NOBYPASSRLS');
      await sql.unsafe('GRANT USAGE ON SCHEMA pilot01 TO "'+role+'"');
      await sql.unsafe('GRANT SELECT ON pilot01.grants TO "'+role+'"');
      const result=await sql.begin(async tx=>{
        await tx.unsafe('SET LOCAL ROLE "'+role+'"');
        return tx.unsafe<{n:number}[]>("SELECT count(*)::int AS n FROM pilot01.grants");
      });
      assert.equal(result[0].n,0);
      const flags=await sql.unsafe<{relrowsecurity:boolean;relforcerowsecurity:boolean}[]>(
        "SELECT relrowsecurity,relforcerowsecurity FROM pg_class c " +
        "JOIN pg_namespace n ON n.oid=c.relnamespace " +
        "WHERE n.nspname='pilot01' AND c.relkind='r'");
      assert.equal(flags.length,5);
      assert.ok(flags.every(x=>x.relrowsecurity&&x.relforcerowsecurity));
    });
    await t.test("duplicate durable receipt is rejected",async()=>{
      await assert.rejects(addReceipt(randomUUID(),"synthetic-key"),(e:any)=>e.code==="23505");
    });
  }finally{
    if(owns){
      try{
        if(role){
          await sql.unsafe('DROP OWNED BY "'+role+'"');
          await sql.unsafe('DROP ROLE "'+role+'"');
        }
        await sql.unsafe("DROP SCHEMA IF EXISTS pilot01 CASCADE");
        await sql.unsafe("DROP INDEX IF EXISTS public.pilot01_sites_organization_id_id_unique");
        await sql.unsafe("DROP TABLE IF EXISTS public.auth_sessions");
        await sql.unsafe("DROP TABLE IF EXISTS public.sites");
        await sql.unsafe("DROP TABLE IF EXISTS public.organizations");
        const after=await sql.unsafe<{n:number}[]>(
          "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'");
        assert.equal(after[0].n,0,"fixture cleanup incomplete");
      }finally{await sql.end({timeout:3});}
    }else await sql.end({timeout:3});
  }
});
