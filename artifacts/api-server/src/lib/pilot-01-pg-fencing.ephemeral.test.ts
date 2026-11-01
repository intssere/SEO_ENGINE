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


test("isolated expired-owner takeover and revoke-versus-consume race", {skip:!armed},async()=>{
 const sql=postgres(allowed(),{max:4,prepare:false,connect_timeout:3});
 const schema="pilot01_test_"+randomUUID().replace(/-/g,"");
 const ident='"'+schema+'"';
 try{
  await sql.unsafe("CREATE SCHEMA "+ident);
  await sql.unsafe("CREATE TABLE "+ident+".jobs(id text PRIMARY KEY,tenant text NOT NULL,site text NOT NULL,state text NOT NULL,owner text,generation bigint NOT NULL,expires_at timestamptz,result text)");
  await sql.unsafe("CREATE TABLE "+ident+".grants(id text PRIMARY KEY,state text NOT NULL,actor text NOT NULL,tenant text NOT NULL,site text NOT NULL,expires_at timestamptz NOT NULL)");
  await sql.unsafe("CREATE TABLE "+ident+".audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,subject text NOT NULL,event text NOT NULL,generation bigint)");
  await sql.unsafe("INSERT INTO "+ident+".jobs VALUES ('j','t','s','active','A',1,clock_timestamp()-interval '1 second',NULL)");
  const takeover=await sql.begin(async tx=>{
   const r=await tx.unsafe("UPDATE "+ident+".jobs SET owner='B',generation=generation+1,expires_at=clock_timestamp()+interval '1 minute' WHERE id='j' AND tenant='t' AND site='s' AND state='active' AND expires_at<=clock_timestamp() RETURNING generation");
   if(r.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event,generation) VALUES ('j','takeover',$1)",[r[0].generation]);
   return r;
  });
  assert.equal(takeover.length,1);
  assert.equal(BigInt(takeover[0].generation),2n);
  const complete=async(owner:string,generation:number)=>sql.begin(async tx=>{
   const r=await tx.unsafe("UPDATE "+ident+".jobs SET state='completed',result=$1 WHERE id='j' AND tenant='t' AND site='s' AND owner=$2 AND generation=$3 AND state='active' AND expires_at>clock_timestamp() RETURNING id",["committed-by-"+owner,owner,generation]);
   if(r.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event,generation) VALUES ('j','completed',$1)",[generation]);
   return r.length;
  });
  assert.equal(await complete("A",1),0);
  assert.equal(await complete("B",2),1);
  assert.equal(await complete("A",1),0);
  assert.equal(await complete("B",2),0);
  const job=await sql.unsafe("SELECT owner,generation,result FROM "+ident+".jobs WHERE id='j'");
  assert.equal(job[0].owner,"B");
  assert.equal(BigInt(job[0].generation),2n);
  assert.equal(job[0].result,"committed-by-B");
  await sql.unsafe("INSERT INTO "+ident+".grants VALUES ('g','issued','actor','t','s',clock_timestamp()+interval '1 hour')");
  const transition=async(next:"consumed"|"revoked")=>sql.begin(async tx=>{
   const r=await tx.unsafe("UPDATE "+ident+".grants SET state=$1 WHERE id='g' AND actor='actor' AND tenant='t' AND site='s' AND state='issued' AND expires_at>clock_timestamp() RETURNING id",[next]);
   if(r.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event) VALUES ('g',$1)",[next]);
   return r.length;
  });
  const outcomes=await Promise.all([transition("consumed"),transition("revoked")]);
  assert.deepEqual(outcomes.sort(),[0,1]);
  const grant=await sql.unsafe("SELECT state FROM "+ident+".grants WHERE id='g'");
  assert.ok(["consumed","revoked"].includes(grant[0].state));
  const events=await sql.unsafe("SELECT event,count(*)::int AS n FROM "+ident+".audit WHERE subject='g' GROUP BY event");
  assert.equal(events.length,1);
  assert.equal(events[0].event,grant[0].state);
  assert.equal(events[0].n,1);
 }finally{
  try{await sql.unsafe("DROP SCHEMA IF EXISTS "+ident+" CASCADE");}finally{await sql.end({timeout:3});}
 }
});


test("isolated connection restart, durable idempotency and audit consistency", {skip:!armed},async()=>{
 const url=allowed();
 const schema="pilot01_test_"+randomUUID().replace(/-/g,"");
 const ident='"'+schema+'"';
 let sql=postgres(url,{max:3,prepare:false,connect_timeout:3});
 try{
  await sql.unsafe("CREATE SCHEMA "+ident);
  await sql.unsafe("CREATE TABLE "+ident+".jobs (id text PRIMARY KEY, tenant text NOT NULL,site text NOT NULL,state text NOT NULL DEFAULT 'pending',owner text,generation bigint NOT NULL DEFAULT 0,expires_at timestamptz,result text, idempotency_key text UNIQUE)");
  await sql.unsafe("CREATE TABLE "+ident+".audit (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,subject text NOT NULL,event text NOT NULL,generation bigint)");
  await sql.unsafe("INSERT INTO "+ident+".jobs(id,tenant,site,idempotency_key) VALUES ('j','t','s','once')");
  // Claim committed by worker A; shutdown simulates a process boundary after a durable write.
  const a=await sql.begin(async tx=>{
   const r=await tx.unsafe("UPDATE "+ident+".jobs SET state='active',owner='A',generation=generation+1,expires_at=clock_timestamp()-interval '1 second' WHERE id='j' AND state='pending' RETURNING generation");
   await tx.unsafe("INSERT INTO "+ident+".audit(subject,event,generation) VALUES ('j','claimed',$1)",[r[0].generation]);
   return BigInt(r[0].generation);
  });
  assert.equal(a,1n);
  await sql.end({timeout:3});
  // Fresh pool and independent connection; never rely on in-memory state.
  sql=postgres(url,{max:3,prepare:false,connect_timeout:3});
  const recovered=await sql.begin(async tx=>{
   const r=await tx.unsafe("UPDATE "+ident+".jobs SET owner='B',generation=generation+1,expires_at=clock_timestamp()+interval '1 minute' WHERE id='j' AND state='active' AND expires_at<=clock_timestamp() RETURNING generation");
   if(r.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event,generation) VALUES ('j','reclaimed',$1)",[r[0].generation]);
   return BigInt(r[0].generation);
  });
  assert.equal(recovered,2n);
  const finish=async(owner:string,gen:bigint)=>sql.begin(async tx=>{
   const r=await tx.unsafe("UPDATE "+ident+".jobs SET state='completed',result='receipt' WHERE id='j' AND owner=$1 AND generation=$2 AND state='active' AND expires_at>clock_timestamp() RETURNING id",[owner,gen.toString()]);
   if(r.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event,generation) VALUES ('j','completed',$1)",[gen.toString()]);
   return r.length;
  });
  assert.equal(await finish("A",a),0);
  assert.equal(await finish("B",recovered),1);
  assert.equal(await finish("B",recovered),0);
  // A repeated idempotency key may not produce an additional job.
  const retry=await sql.unsafe("INSERT INTO "+ident+".jobs(id,tenant,site,idempotency_key) VALUES ('duplicate','t','s','once') ON CONFLICT (idempotency_key) DO NOTHING RETURNING id");
  assert.equal(retry.length,0);
  const durable=await sql.unsafe("SELECT id,state,owner,generation,result FROM "+ident+".jobs");
  assert.equal(durable.length,1);
  assert.equal(durable[0].state,"completed");
  assert.equal(durable[0].owner,"B");
  assert.equal(BigInt(durable[0].generation),2n);
  const events=await sql.unsafe("SELECT event,generation FROM "+ident+".audit WHERE subject='j' ORDER BY id");
  assert.deepEqual(events.map(e=>e.event),["claimed","reclaimed","completed"]);
  assert.deepEqual(events.map(e=>BigInt(e.generation)),[1n,2n,2n]);
  // Audit insertion failure must abort a queued claim, even across connection restarts.
  await sql.unsafe("INSERT INTO "+ident+".jobs(id,tenant,site,idempotency_key) VALUES ('rollback','t','s','rollback-once')");
  await assert.rejects(()=>sql.begin(async tx=>{
   await tx.unsafe("UPDATE "+ident+".jobs SET state='active',owner='X',generation=1 WHERE id='rollback'");
   await tx.unsafe("INSERT INTO "+ident+".audit(subject,event) VALUES (NULL,'invalid')");
  }));
  const unchanged=await sql.unsafe("SELECT state,owner,generation FROM "+ident+".jobs WHERE id='rollback'");
  assert.equal(unchanged[0].state,"pending");
  assert.equal(unchanged[0].owner,null);
  assert.equal(BigInt(unchanged[0].generation),0n);
 }finally{
  try{await sql.unsafe("DROP SCHEMA IF EXISTS "+ident+" CASCADE");}finally{await sql.end({timeout:3});}
 }
});


test("isolated transactional outbox: superseded generation cannot enqueue or deliver", {skip:!armed},async()=>{
 const sql=postgres(allowed(),{max:4,prepare:false,connect_timeout:3});
 const schema="pilot01_test_"+randomUUID().replace(/-/g,"");
 const ident='"'+schema+'"';
 try{
  await sql.unsafe("CREATE SCHEMA "+ident);
  await sql.unsafe("CREATE TABLE "+ident+".jobs(id text PRIMARY KEY,tenant text NOT NULL,site text NOT NULL,state text NOT NULL,owner text NOT NULL,generation bigint NOT NULL,expires_at timestamptz NOT NULL)");
  await sql.unsafe("CREATE TABLE "+ident+".outbox(id text PRIMARY KEY,job_id text NOT NULL,tenant text NOT NULL,site text NOT NULL,owner text NOT NULL,generation bigint NOT NULL,kind text NOT NULL CHECK(kind='synthetic_noop'),state text NOT NULL DEFAULT 'pending',UNIQUE(job_id,kind))");
  await sql.unsafe("CREATE TABLE "+ident+".audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,subject text NOT NULL,event text NOT NULL,generation bigint)");
  await sql.unsafe("INSERT INTO "+ident+".jobs VALUES ('j','t','s','active','A',1,clock_timestamp()-interval '1 second')");
  // Two-session takeover: the old generation may not enqueue after B replaces A.
  const takeover=await sql.begin(async tx=>{
   const r=await tx.unsafe("UPDATE "+ident+".jobs SET owner='B',generation=generation+1,expires_at=clock_timestamp()+interval '1 minute' WHERE id='j' AND state='active' AND expires_at<=clock_timestamp() RETURNING generation");
   if(r.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event,generation) VALUES ('j','takeover',$1)",[r[0].generation]);
   return r.length;
  });
  assert.equal(takeover,1);
  const enqueue=async(owner:string,generation:number)=>sql.begin(async tx=>{
   const eligible=await tx.unsafe("SELECT id FROM "+ident+".jobs WHERE id='j' AND tenant='t' AND site='s' AND owner=$1 AND generation=$2 AND state='active' AND expires_at>clock_timestamp() FOR UPDATE",[owner,generation]);
   if(!eligible.length)return 0;
   const r=await tx.unsafe("INSERT INTO "+ident+".outbox(id,job_id,tenant,site,owner,generation,kind) VALUES ($1,'j','t','s',$2,$3,'synthetic_noop') ON CONFLICT (job_id,kind) DO NOTHING RETURNING id",["intent-"+owner,owner,generation]);
   if(r.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event,generation) VALUES ('j','enqueued',$1)",[generation]);
   return r.length;
  });
  assert.equal(await enqueue("A",1),0);
  assert.equal(await enqueue("B",2),1);
  assert.equal(await enqueue("B",2),0);
  // An atomic, DB-side recheck fences delivery; no network/provider operation occurs.
  const deliver=async()=>sql.begin(async tx=>{
   const r=await tx.unsafe("UPDATE "+ident+".outbox AS o SET state='accepted' FROM "+ident+".jobs AS j WHERE o.job_id=j.id AND o.tenant=j.tenant AND o.site=j.site AND o.owner=j.owner AND o.generation=j.generation AND j.state='active' AND j.expires_at>clock_timestamp() AND o.kind='synthetic_noop' AND o.state='pending' RETURNING o.id,o.generation");
   if(r.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event,generation) VALUES ('j','accepted',$1)",[r[0].generation]);
   return r.length;
  });
  const delivered=await Promise.all([deliver(),deliver()]);
  assert.deepEqual(delivered.sort(),[0,1]);
  const final=await sql.unsafe("SELECT id,owner,generation,state FROM "+ident+".outbox");
  assert.equal(final.length,1);
  assert.equal(final[0].owner,"B");
  assert.equal(BigInt(final[0].generation),2n);
  assert.equal(final[0].state,"accepted");
  const audit=await sql.unsafe("SELECT event,generation FROM "+ident+".audit WHERE subject='j' ORDER BY id");
  assert.deepEqual(audit.map(r=>r.event),["takeover","enqueued","accepted"]);
  assert.deepEqual(audit.map(r=>BigInt(r.generation)),[2n,2n,2n]);
 }finally{
  try{await sql.unsafe("DROP SCHEMA IF EXISTS "+ident+" CASCADE");}finally{await sql.end({timeout:3});}
 }
});


test("isolated outbox cross-tenant and missing-grant fail-closed checks", {skip:!armed},async()=>{
 const sql=postgres(allowed(),{max:4,prepare:false,connect_timeout:3});
 const schema="pilot01_test_"+randomUUID().replace(/-/g,"");
 const ident='"'+schema+'"';
 try{
  await sql.unsafe("CREATE SCHEMA "+ident);
  await sql.unsafe("CREATE TABLE "+ident+".jobs(id text PRIMARY KEY,tenant text NOT NULL,site text NOT NULL,state text NOT NULL,owner text NOT NULL,generation bigint NOT NULL,expires_at timestamptz NOT NULL)");
  await sql.unsafe("CREATE TABLE "+ident+".grants(id text PRIMARY KEY,tenant text NOT NULL,site text NOT NULL,actor text NOT NULL,operation text NOT NULL,state text NOT NULL,expires_at timestamptz NOT NULL)");
  await sql.unsafe("CREATE TABLE "+ident+".outbox(id text PRIMARY KEY,job_id text NOT NULL,tenant text NOT NULL,site text NOT NULL,owner text NOT NULL,generation bigint NOT NULL,grant_id text NOT NULL,state text NOT NULL DEFAULT 'pending')");
  await sql.unsafe("CREATE TABLE "+ident+".audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,subject text NOT NULL,event text NOT NULL)");
  await sql.unsafe("INSERT INTO "+ident+".jobs VALUES ('job-a','tenant-a','site-a','active','worker-a',1,clock_timestamp()+interval '1 minute')");
  await sql.unsafe("INSERT INTO "+ident+".grants VALUES ('grant-a','tenant-a','site-a','actor-a','analyze','issued',clock_timestamp()+interval '1 minute')");
  // This synthetic intent is NOT a provider request. Grant and fence must match DB rows.
  await sql.unsafe("INSERT INTO "+ident+".outbox VALUES ('intent-a','job-a','tenant-a','site-a','worker-a',1,'grant-a','pending')");
  const accept=async(tenant:string,site:string,actor:string,grant:string)=>sql.begin(async tx=>{
   const rows=await tx.unsafe("UPDATE "+ident+".outbox AS o SET state='accepted' FROM "+ident+".jobs AS j,"+ident+".grants AS g WHERE o.job_id=j.id AND o.grant_id=g.id AND o.tenant=$1 AND o.site=$2 AND g.actor=$3 AND g.id=$4 AND j.tenant=o.tenant AND j.site=o.site AND g.tenant=o.tenant AND g.site=o.site AND j.owner=o.owner AND j.generation=o.generation AND j.state='active' AND j.expires_at>clock_timestamp() AND g.operation='analyze' AND g.state='issued' AND g.expires_at>clock_timestamp() AND o.state='pending' RETURNING o.id",[tenant,site,actor,grant]);
   if(rows.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event) VALUES ('intent-a','accepted')");
   return rows.length;
  });
  assert.equal(await accept("tenant-b","site-a","actor-a","grant-a"),0);
  assert.equal(await accept("tenant-a","site-b","actor-a","grant-a"),0);
  assert.equal(await accept("tenant-a","site-a","actor-forged","grant-a"),0);
  assert.equal(await accept("tenant-a","site-a","actor-a","grant-missing"),0);
  await sql.unsafe("UPDATE "+ident+".grants SET state='revoked' WHERE id='grant-a'");
  assert.equal(await accept("tenant-a","site-a","actor-a","grant-a"),0);
  await sql.unsafe("UPDATE "+ident+".grants SET state='issued',expires_at=clock_timestamp()-interval '1 second' WHERE id='grant-a'");
  assert.equal(await accept("tenant-a","site-a","actor-a","grant-a"),0);
  await sql.unsafe("UPDATE "+ident+".grants SET expires_at=clock_timestamp()+interval '1 minute' WHERE id='grant-a'");
  const attempts=await Promise.all([accept("tenant-a","site-a","actor-a","grant-a"),accept("tenant-a","site-a","actor-a","grant-a")]);
  assert.deepEqual(attempts.sort(),[0,1]);
  const rows=await sql.unsafe("SELECT state FROM "+ident+".outbox WHERE id='intent-a'");
  assert.equal(rows[0].state,"accepted");
  const audit=await sql.unsafe("SELECT count(*)::int AS n FROM "+ident+".audit");
  assert.equal(audit[0].n,1);
 }finally{
  try{await sql.unsafe("DROP SCHEMA IF EXISTS "+ident+" CASCADE");}finally{await sql.end({timeout:3});}
 }
});


test("isolated signed-claim gate plus durable single-use grant consumption", {skip:!armed},async()=>{
 const {createHmac,randomBytes,timingSafeEqual}=await import("node:crypto");
 const sql=postgres(allowed(),{max:4,prepare:false,connect_timeout:3});
 const schema="pilot01_test_"+randomUUID().replace(/-/g,"");
 const ident='"'+schema+'"';
 const secret=randomBytes(32);
 const claims={issuer:"synthetic-issuer",actor:"actor-a",tenant:"tenant-a",site:"site-a",operation:"analyze",nonce:"once",expires:Date.now()+60000};
 const body=Buffer.from(JSON.stringify(claims)).toString("base64url");
 const token=body+"."+createHmac("sha256",secret).update(body).digest("base64url");
 const verified=(candidate:string,actor:string,tenant:string,site:string)=>{
  const parts=candidate.split(".");
  if(parts.length!==2)return false;
  let provided:Buffer;
  try{provided=Buffer.from(parts[1],"base64url");}catch{return false;}
  const expected=createHmac("sha256",secret).update(parts[0]).digest();
  if(provided.length!==expected.length||!timingSafeEqual(provided,expected))return false;
  let c:typeof claims;
  try{c=JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8"));}catch{return false;}
  return c.issuer===claims.issuer&&c.nonce===claims.nonce&&
   c.actor===actor&&c.tenant===tenant&&c.site===site&&c.operation==="analyze"&&
   Number.isFinite(c.expires)&&c.expires>Date.now();
 };
 try{
  await sql.unsafe("CREATE SCHEMA "+ident);
  await sql.unsafe("CREATE TABLE "+ident+".grants(id text PRIMARY KEY,issuer text NOT NULL,nonce text NOT NULL UNIQUE,actor text NOT NULL,tenant text NOT NULL,site text NOT NULL,operation text NOT NULL,state text NOT NULL,expires_at timestamptz NOT NULL)");
  await sql.unsafe("CREATE TABLE "+ident+".audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,subject text NOT NULL,event text NOT NULL)");
  await sql.unsafe("INSERT INTO "+ident+".grants VALUES ('g','synthetic-issuer','once','actor-a','tenant-a','site-a','analyze','issued',clock_timestamp()+interval '1 minute')");
  const consume=async(candidate:string,actor:string,tenant:string,site:string)=>{
   if(!verified(candidate,actor,tenant,site))return 0;
   return sql.begin(async tx=>{
    const r=await tx.unsafe("UPDATE "+ident+".grants SET state='consumed' WHERE id='g' AND issuer='synthetic-issuer' AND nonce='once' AND actor=$1 AND tenant=$2 AND site=$3 AND operation='analyze' AND state='issued' AND expires_at>clock_timestamp() RETURNING id",[actor,tenant,site]);
    if(r.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event) VALUES ('g','consumed')");
    return r.length;
   });
  };
  assert.equal(await consume(token,"actor-b","tenant-a","site-a"),0);
  assert.equal(await consume(token,"actor-a","tenant-b","site-a"),0);
  assert.equal(await consume(token,"actor-a","tenant-a","site-b"),0);
  const forgedBody=Buffer.from(JSON.stringify({...claims,actor:"actor-b"})).toString("base64url");
  assert.equal(await consume(forgedBody+"."+token.split(".")[1],"actor-b","tenant-a","site-a"),0);
  const race=await Promise.all([consume(token,"actor-a","tenant-a","site-a"),consume(token,"actor-a","tenant-a","site-a")]);
  assert.deepEqual(race.sort(),[0,1]);
  assert.equal(await consume(token,"actor-a","tenant-a","site-a"),0);
  const rows=await sql.unsafe("SELECT state FROM "+ident+".grants WHERE id='g'");
  assert.equal(rows[0].state,"consumed");
  const receipts=await sql.unsafe("SELECT count(*)::int AS n FROM "+ident+".audit WHERE subject='g' AND event='consumed'");
  assert.equal(receipts[0].n,1);
 }finally{
  try{await sql.unsafe("DROP SCHEMA IF EXISTS "+ident+" CASCADE");}finally{await sql.end({timeout:3});}
 }
});


test("isolated revoke-before-accept and stale generation block synthetic outbox", {skip:!armed},async()=>{
 const sql=postgres(allowed(),{max:4,prepare:false,connect_timeout:3});
 const schema="pilot01_test_"+randomUUID().replace(/-/g,"");
 const ident='"'+schema+'"';
 try {
  await sql.unsafe("CREATE SCHEMA "+ident);
  await sql.unsafe("CREATE TABLE "+ident+".jobs(id text PRIMARY KEY,tenant text NOT NULL,site text NOT NULL,state text NOT NULL,owner text NOT NULL,generation bigint NOT NULL,expires_at timestamptz NOT NULL)");
  await sql.unsafe("CREATE TABLE "+ident+".grants(id text PRIMARY KEY,tenant text NOT NULL,site text NOT NULL,state text NOT NULL,expires_at timestamptz NOT NULL)");
  await sql.unsafe("CREATE TABLE "+ident+".outbox(id text PRIMARY KEY,job_id text NOT NULL,grant_id text NOT NULL,tenant text NOT NULL,site text NOT NULL,owner text NOT NULL,generation bigint NOT NULL,kind text NOT NULL CHECK(kind='synthetic_noop'),state text NOT NULL DEFAULT 'pending')");
  await sql.unsafe("CREATE TABLE "+ident+".audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,subject text NOT NULL,event text NOT NULL)");
  await sql.unsafe("INSERT INTO "+ident+".jobs VALUES ('j','t','s','active','A',1,clock_timestamp()+interval '1 minute')");
  await sql.unsafe("INSERT INTO "+ident+".grants VALUES ('g','t','s','issued',clock_timestamp()+interval '1 minute')");
  await sql.unsafe("INSERT INTO "+ident+".outbox VALUES ('intent','j','g','t','s','A',1,'synthetic_noop','pending')");
  const accept=()=>sql.begin(async tx=>{
   // Lock both authorization and worker before effect-intent acceptance.
   const matching=await tx.unsafe("SELECT o.id FROM "+ident+".outbox o JOIN "+ident+".jobs j ON j.id=o.job_id AND j.tenant=o.tenant AND j.site=o.site JOIN "+ident+".grants g ON g.id=o.grant_id AND g.tenant=o.tenant AND g.site=o.site WHERE o.id='intent' AND o.state='pending' AND j.owner=o.owner AND j.generation=o.generation AND j.state='active' AND j.expires_at>clock_timestamp() AND g.state='issued' AND g.expires_at>clock_timestamp() FOR UPDATE OF o,j,g");
   if(!matching.length)return 0;
   const row=await tx.unsafe("UPDATE "+ident+".outbox SET state='accepted' WHERE id='intent' AND state='pending' RETURNING id");
   if(row.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event) VALUES ('intent','accepted')");
   return row.length;
  });
  const revoke=()=>sql.begin(async tx=>{
   const row=await tx.unsafe("UPDATE "+ident+".grants SET state='revoked' WHERE id='g' AND state='issued' RETURNING id");
   if(row.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event) VALUES ('g','revoked')");
   return row.length;
  });
  // Revocation strictly precedes delivery authorization.
  assert.equal(await revoke(),1);
  assert.equal(await accept(),0);
  assert.equal((await sql.unsafe("SELECT state FROM "+ident+".outbox WHERE id='intent'"))[0].state,"pending");
  // Restore synthetic grant and supersede worker ownership/generation.
  await sql.unsafe("UPDATE "+ident+".grants SET state='issued' WHERE id='g'");
  await sql.unsafe("UPDATE "+ident+".jobs SET owner='B',generation=2 WHERE id='j'");
  assert.equal(await accept(),0);
  // Only the current generation can accept; no external effect is executed.
  await sql.unsafe("UPDATE "+ident+".outbox SET owner='B',generation=2 WHERE id='intent'");
  assert.equal(await accept(),1);
  assert.equal(await accept(),0);
  const events=await sql.unsafe("SELECT event,count(*)::int AS n FROM "+ident+".audit GROUP BY event ORDER BY event");
  assert.deepEqual(events.map(x=>[x.event,x.n]),[["accepted",1],["revoked",1]]);
 }finally{
  try{await sql.unsafe("DROP SCHEMA IF EXISTS "+ident+" CASCADE");}finally{await sql.end({timeout:3});}
 }
});


test("isolated concurrent revoke-versus-accept has at most one synthetic authorization receipt", {skip:!armed},async()=>{
 const sql=postgres(allowed(),{max:6,prepare:false,connect_timeout:3});
 const schema="pilot01_test_"+randomUUID().replace(/-/g,"");
 const ident='"'+schema+'"';
 try{
  await sql.unsafe("CREATE SCHEMA "+ident);
  await sql.unsafe("CREATE TABLE "+ident+".grants(id text PRIMARY KEY,state text NOT NULL)");
  await sql.unsafe("CREATE TABLE "+ident+".outbox(id text PRIMARY KEY,grant_id text NOT NULL,state text NOT NULL DEFAULT 'pending',kind text NOT NULL CHECK(kind='synthetic_noop'))");
  await sql.unsafe("CREATE TABLE "+ident+".audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,subject text NOT NULL,event text NOT NULL)");
  for(let i=0;i<8;i++){
   const id="race-"+i;
   await sql.unsafe("INSERT INTO "+ident+".grants VALUES ($1,'issued')",[id]);
   await sql.unsafe("INSERT INTO "+ident+".outbox(id,grant_id,kind) VALUES ($1,$1,'synthetic_noop')",[id]);
   const revoke=()=>sql.begin(async tx=>{
    // Both competitors acquire the grant row first: one serialized decision per grant.
    const grant=await tx.unsafe("SELECT state FROM "+ident+".grants WHERE id=$1 FOR UPDATE",[id]);
    if(grant[0]?.state!=="issued")return 0;
    const rows=await tx.unsafe("UPDATE "+ident+".grants SET state='revoked' WHERE id=$1 AND state='issued' RETURNING id",[id]);
    if(rows.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event) VALUES ($1,'revoked')",[id]);
    return rows.length;
   });
   const accept=()=>sql.begin(async tx=>{
    const grant=await tx.unsafe("SELECT state FROM "+ident+".grants WHERE id=$1 FOR UPDATE",[id]);
    if(grant[0]?.state!=="issued")return 0;
    const rows=await tx.unsafe("UPDATE "+ident+".outbox SET state='accepted' WHERE id=$1 AND grant_id=$1 AND kind='synthetic_noop' AND state='pending' RETURNING id",[id]);
    if(rows.length)await tx.unsafe("INSERT INTO "+ident+".audit(subject,event) VALUES ($1,'accepted')",[id]);
    return rows.length;
   });
   const [revoked,accepted]=await Promise.all([revoke(),accept()]);
   assert.equal(revoked,1);
   assert.ok(accepted===0||accepted===1);
   const grant=await sql.unsafe("SELECT state FROM "+ident+".grants WHERE id=$1",[id]);
   const effect=await sql.unsafe("SELECT state FROM "+ident+".outbox WHERE id=$1",[id]);
   const events=await sql.unsafe("SELECT event FROM "+ident+".audit WHERE subject=$1 ORDER BY id",[id]);
   assert.equal(grant[0].state,"revoked");
   assert.equal(effect[0].state,accepted===1?"accepted":"pending");
   assert.deepEqual(events.map(r=>r.event),accepted===1?["accepted","revoked"]:["revoked"]);
   assert.equal(await accept(),0);
  }
 }finally{
  try{await sql.unsafe("DROP SCHEMA IF EXISTS "+ident+" CASCADE");}finally{await sql.end({timeout:3});}
 }
});
