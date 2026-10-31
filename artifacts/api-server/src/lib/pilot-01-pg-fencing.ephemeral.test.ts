/** PILOT-01 isolated PostgreSQL integration rehearsal.
 * ONLY run against a newly provisioned, empty, explicitly disposable PostgreSQL
 * database. Never point at Railway, staging, restored, or customer databases.
 * Invocation: PILOT01_DISPOSABLE_PG=I_ACKNOWLEDGE_DISPOSABLE_ONLY
 *             PILOT01_DISPOSABLE_DATABASE_URL=postgres://... tsx --test <this file>
 * Without both flags this test skips and performs ZERO IO.
 */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {randomUUID} from "node:crypto";
const armed=process.env.PILOT01_DISPOSABLE_PG==="I_ACKNOWLEDGE_DISPOSABLE_ONLY" &&
 Boolean(process.env.PILOT01_DISPOSABLE_DATABASE_URL);
const allowed=()=> {
 const u=new URL(process.env.PILOT01_DISPOSABLE_DATABASE_URL!);
 // Hard block the known live hosts and demand an explicitly named disposable DB.
 if(!["postgres:","postgresql:"].includes(u.protocol) ||
   !/^(pilot01_disposable_[a-z0-9_]+)$/.test(u.pathname.slice(1)) ||
   /railway|neon|production|diamondshelf|supabase/i.test(u.host+" "+u.pathname) ||
   !/^(localhost|127\.0\.0\.1|::1|\[::1\])$/.test(u.hostname))
   throw Error("PILOT01_REFUSE_NONLOCAL_OR_NONDISPOSABLE_DATABASE");
 return u.toString();
};
test("isolated two-session fencing + atomic grant consumption", {skip:!armed},async()=>{
 const url=allowed();
 const sql=postgres(url,{max:4,prepare:false,connect_timeout:3});
 // Test-only schema generated from cryptographic randomness; never shared data.
 const schema="pilot01_test_"+randomUUID().replace(/-/g,"");
 const ident='"'+schema+'"';
 try {
  await sql.unsafe("CREATE SCHEMA "+ident);
  await sql.unsafe("CREATE TABLE "+ident+".jobs (id text PRIMARY KEY, tenant text NOT NULL, site text NOT NULL, state text NOT NULL DEFAULT 'pending', owner text, generation bigint NOT NULL DEFAULT 0, expires_at timestamptz, result text)");
  await sql.unsafe("CREATE TABLE "+ident+".grants (id text PRIMARY KEY, state text NOT NULL DEFAULT 'issued', actor text NOT NULL, tenant text NOT NULL, site text NOT NULL, expires_at timestamptz NOT NULL)");
  await sql.unsafe("CREATE TABLE "+ident+".audit (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, subject text NOT NULL, event text NOT NULL, generation bigint)");
  await sql.unsafe("INSERT INTO "+ident+".jobs(id,tenant,site) VALUES ('j','t','s')");
  await sql.unsafe("INSERT INTO "+ident+".grants(id,actor,tenant,site,expires_at) VALUES ('g','actor','t','s',clock_timestamp()+interval '1 hour')");
  const claim=async(owner:string)=>sql.begin(async tx=>{
   const rows=await tx.unsafe("UPDATE "+ident+".jobs SET state='active',owner=$1,generation=generation+1,expires_at=clock_timestamp()+interval '1 second' WHERE id='j' AND tenant='t' AND site='s' AND (state='pending' OR (state='active' AND expires_at<=clock_timestamp())) RETURNING generation",[owner]);
   if(rows.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event,generation) VALUES ('j','claimed',$1)",[rows[0].generation]);
   return rows.length?BigInt(rows[0].generation):null;
  });
  const [a,b]=await Promise.all([claim("a"),claim("b")]);
  assert.equal([a,b].filter(v=>v!==null).length,1);
  const winner=a!==null?"a":"b";const gen=a??b;
  const commit=async(owner:string,generation:bigint)=>sql.begin(async tx=>{
   const result=await tx.unsafe("UPDATE "+ident+".jobs SET state='completed',result=$1 WHERE id='j' AND owner=$2 AND generation=$3 AND state='active' AND expires_at>clock_timestamp() RETURNING id",["receipt",owner,generation.toString()]);
   if(result.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event,generation) VALUES ('j','completed',$1)",[generation.toString()]);
   return result.length;
  });
  assert.equal(await commit(winner==="a"?"b":"a",gen!),0);
  assert.equal(await commit(winner,gen!),1);
  assert.equal(await commit(winner,gen!),0);
  const consume=async()=>sql.begin(async tx=>{
   const r=await tx.unsafe("UPDATE "+ident+".grants SET state='consumed' WHERE id='g' AND actor='actor' AND tenant='t' AND site='s' AND state='issued' AND expires_at>clock_timestamp() RETURNING id");
   if(r.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event) VALUES ('g','consumed')");
   return r.length;
  });
  const consumed=await Promise.all([consume(),consume()]);
  assert.deepEqual(consumed.sort(),[0,1]);
  const final=await sql.unsafe("SELECT count(*)::int AS n FROM "+ident+".audit WHERE subject='g' AND event='consumed'");
  assert.equal(final[0].n,1);
  // Audit failure must roll back a changed job state.
  await sql.unsafe("INSERT INTO "+ident+".jobs(id,tenant,site) VALUES ('rollback','t','s')");
  await assert.rejects(()=>sql.begin(async tx=>{
   await tx.unsafe("UPDATE "+ident+".jobs SET state='active' WHERE id='rollback'");
   await tx.unsafe("INSERT INTO "+ident+".audit(subject,event) VALUES (NULL,'invalid')");
  }));
  const unchanged=await sql.unsafe("SELECT state FROM "+ident+".jobs WHERE id='rollback'");
  assert.equal(unchanged[0].state,"pending");
 } finally {
  try{await sql.unsafe("DROP SCHEMA IF EXISTS "+ident+" CASCADE");}finally{await sql.end({timeout:3});}
 }
});
