import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import postgres from "postgres";

function migrationPath():string{
  return fileURLToPath(
    new URL("../migrations/0011_ugp_10_33_controlled_https_certification.sql",import.meta.url),
  );
}

function databaseUrl():string|null{
  const raw=process.env.UGP_10_33_EPHEMERAL_DATABASE_URL?.trim();
  if(!raw) return null;
  const parsed=new URL(raw);
  if(!["127.0.0.1","localhost"].includes(parsed.hostname)){
    throw new Error("ugp10_33_ephemeral_database_must_be_localhost");
  }
  if(parsed.pathname.replace(/^\//,"")!=="seo_engine_test"){
    throw new Error("ugp10_33_ephemeral_database_name_invalid");
  }
  return raw;
}

test("UGP-10.33 migration only expands the execution-event reason constraint",async()=>{
  const source=await readFile(migrationPath(),"utf8");
  assert.match(source,/^BEGIN;/);
  assert.match(source,/COMMIT;\s*$/);
  assert.equal((source.match(/\bCREATE\s+TABLE\b/gi)??[]).length,0);
  assert.equal((source.match(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/gi)??[]).length,0);
  assert.equal((source.match(/\bALTER\s+TABLE\b/gi)??[]).length,2);
  assert.match(source,/controlled_https_cert_accepted/);
  assert.match(source,/controlled_https_cert_rejected/);
  assert.match(source,/controlled_https_cert_uncertain/);
  assert.equal(
    /\bINSERT\s+INTO\b|\bUPDATE\s+[A-Za-z_][A-Za-z0-9_.]*\s+SET\b|\bDELETE\s+FROM\b/i.test(source),
    false,
  );
});

test("UGP-10.33 migration preserves the 49-table state and installs controlled certification reasons",async(t)=>{
  const url=databaseUrl();
  if(!url){
    t.skip("UGP_10_33_EPHEMERAL_DATABASE_URL is not configured");
    return;
  }
  const sql=postgres(url,{max:1,prepare:false,connect_timeout:8,idle_timeout:2});
  t.after(async()=>{await sql.end({timeout:1}).catch(()=>undefined);});

  const before=await sql.unsafe<{count:number}[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(Number(before[0]?.count??0),49);
  await sql.unsafe(await readFile(migrationPath(),"utf8"));
  const after=await sql.unsafe<{count:number}[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(Number(after[0]?.count??0),49);

  const checks=await sql.unsafe<{definition:string}[]>(
    "SELECT pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid WHERE r.relname='authority_outreach_single_send_execution_events' AND c.contype='c' AND pg_get_constraintdef(c.oid) LIKE '%event_reason%'",
  );
  assert.equal(checks.length,1);
  const definition=checks[0]!.definition;
  for(const reason of [
    "execution_preflight_passed",
    "mock_adapter_accepted",
    "execution_recovery_uncertain",
    "controlled_https_cert_accepted",
    "controlled_https_cert_rejected",
    "controlled_https_cert_uncertain",
  ]){
    assert.match(definition,new RegExp(reason));
  }
});
