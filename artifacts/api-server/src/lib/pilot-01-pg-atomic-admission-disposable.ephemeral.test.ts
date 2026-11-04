/**
 * RT01-A7: explicit local disposable-only PostgreSQL tests; no connections
 * or schema changes without BOTH sentinels. NEVER use Railway, staging,
 * restored, customer, shared, or Production databases.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { DisposablePgAtomicAdmissionAdapter } from "./pilot-01-pg-atomic-admission-disposable.js";
import { rehearseAtomicGrantJobAdmission, type AtomicAdmissionRequest } from "./pilot-01-atomic-job-admission.js";
import type { VerifiedGrantContext } from "./pilot-01-trusted-grant-contract.js";

const armed = process.env.PILOT01_DISPOSABLE_PG === "I_ACKNOWLEDGE_DISPOSABLE_ONLY" &&
  Boolean(process.env.PILOT01_DISPOSABLE_DATABASE_URL);
function disposableUrl(): string {
  if (!armed) throw Error("DISPOSABLE_EXPLICIT_ACK_REQUIRED");
  const u = new URL(process.env.PILOT01_DISPOSABLE_DATABASE_URL!);
  if (!["postgres:","postgresql:"].includes(u.protocol) ||
    !/^pilot01_disposable_[a-z0-9_]+$/.test(u.pathname.slice(1)) ||
    !/^(127\.0\.0\.1|localhost|\[::1\]|::1)$/.test(u.hostname) ||
    /railway|neon|production|diamondshelf|supabase/i.test(u.host+" "+u.pathname) ||
    u.username !== "postgres") throw Error("REFUSE_NONLOCAL_OR_NONDISPOSABLE_DATABASE");
  return u.toString();
}
type Sql=ReturnType<typeof postgres>;
const c: VerifiedGrantContext = {
  actorId:"synthetic-actor",tenantId:"synthetic-tenant",siteId:"synthetic-site",
  issuerId:"synthetic-issuer",sessionId:"synthetic-session",
  role:"admin",source:"server_verified_session",
};
const r: AtomicAdmissionRequest = {
  grantId:"grant-one",siteId:c.siteId,operation:"analyze",idempotencyKey:"idempotency-one",
};
const policy={
  authEnforced:true,siteVerified:true,runGateEnabled:true,
  publicSiteWritesEnabled:false,aiProposalGenerationEnabled:false,
};
async function fixture(fn:(f:{
  sql:Sql; schema:string; rawName:string;
  adapter:DisposablePgAtomicAdmissionAdapter;
  seed:(grantId:string,operation?:"analyze"|"recommend",expiry?:string)=>Promise<void>;
  counts:()=>Promise<{grants:number;jobs:number;admissions:number}>;
})=>Promise<void>) {
  const sql=postgres(disposableUrl(),{max:5,prepare:false,connect_timeout:3});
  const rawName="pilot01_test_"+randomUUID().replace(/-/g,"");
  const schema='"'+rawName+'"';
  try {
    await sql.unsafe("CREATE SCHEMA "+schema);
    await sql.unsafe(`CREATE TABLE ${schema}.grants (
      grant_id text PRIMARY KEY, state text NOT NULL DEFAULT 'issued'
      CHECK(state IN ('issued','consumed','revoked')),
      tenant_id text NOT NULL,site_id text NOT NULL,actor_id text NOT NULL,
      issuer_id text NOT NULL,operation text NOT NULL
      CHECK(operation IN ('analyze','recommend')),
      expires_at timestamptz NOT NULL,consumed_at timestamptz)`);
    await sql.unsafe(`CREATE TABLE ${schema}.jobs(
      job_id uuid PRIMARY KEY, grant_id text NOT NULL UNIQUE REFERENCES ${schema}.grants(grant_id),
      tenant_id text NOT NULL,site_id text NOT NULL,actor_id text NOT NULL,
      operation text NOT NULL CHECK(operation IN ('analyze','recommend')),
      state text NOT NULL CHECK(state='pending'))`);
    await sql.unsafe(`CREATE TABLE ${schema}.admissions(
      admission_id uuid PRIMARY KEY,job_id uuid NOT NULL UNIQUE REFERENCES ${schema}.jobs(job_id),
      grant_id text NOT NULL UNIQUE REFERENCES ${schema}.grants(grant_id),
      idempotency_key text NOT NULL UNIQUE,actor_id text NOT NULL,
      tenant_id text NOT NULL,site_id text NOT NULL,issuer_id text NOT NULL,
      operation text NOT NULL CHECK(operation IN ('analyze','recommend')),
      transaction_id text NOT NULL,committed_at timestamptz NOT NULL)`);
    const seed=async (id:string,op:"analyze"|"recommend"="analyze",expiry="1 hour")=>{
      if(!["1 hour","-1 second"].includes(expiry))throw Error("SYNTHETIC_EXPIRY_ONLY");
      await sql.unsafe(
        `INSERT INTO ${schema}.grants(grant_id,tenant_id,site_id,actor_id,issuer_id,operation,expires_at)
         VALUES($1,$2,$3,$4,$5,$6,clock_timestamp()+$7::interval)`,
        [id,c.tenantId,c.siteId,c.actorId,c.issuerId,op,expiry],
      );
    };
    const counts=async()=>{
      const [a,b,d]=await Promise.all([
        sql.unsafe(`SELECT count(*)::int AS n FROM ${schema}.grants WHERE state='consumed'`),
        sql.unsafe(`SELECT count(*)::int AS n FROM ${schema}.jobs`),
        sql.unsafe(`SELECT count(*)::int AS n FROM ${schema}.admissions`),
      ]);
      return {grants:a[0].n,jobs:b[0].n,admissions:d[0].n};
    };
    await seed(r.grantId);
    await fn({sql,schema,rawName,adapter:new DisposablePgAtomicAdmissionAdapter(sql,rawName),seed,counts});
  } finally {
    try { await sql.unsafe("DROP SCHEMA IF EXISTS "+schema+" CASCADE"); }
    finally { await sql.end({timeout:3}); }
  }
}
const admit=(adapter:DisposablePgAtomicAdmissionAdapter,req:AtomicAdmissionRequest=r,ctx=c)=>
  rehearseAtomicGrantJobAdmission(req,policy,{async resolve(){return ctx;}},adapter);

test("RT01-A7: no arming sentinels means zero database I/O",()=>{
  if(!armed)assert.throws(()=>disposableUrl(),/DISPOSABLE_EXPLICIT_ACK_REQUIRED/);
});
test("RT01-A7 disposable: grant, pending job and immutable admission receipt commit together",
  {skip:!armed},async()=>{
    await fixture(async({adapter,counts,sql,schema})=>{
      const first=await admit(adapter);
      assert.equal(first.status,"recorded_for_rehearsal");
      assert.deepEqual(await counts(),{grants:1,jobs:1,admissions:1});
      const rows=await sql.unsafe(
        `SELECT g.state,j.state AS job_state,a.transaction_id,a.job_id
           FROM ${schema}.grants g JOIN ${schema}.jobs j USING(grant_id)
           JOIN ${schema}.admissions a USING(grant_id)`);
      assert.equal(rows.length,1);
      assert.equal(rows[0].state,"consumed");
      assert.equal(rows[0].job_state,"pending");
      if(first.status==="recorded_for_rehearsal")
        assert.equal(first.receipt.jobId,String(rows[0].job_id));
    });
});
test("RT01-A7 disposable: two independent sessions same key commit one job; retry identical receipt",
  {skip:!armed},async()=>{
    await fixture(async({adapter,counts,rawName})=>{
      const another=postgres(disposableUrl(),{max:2,prepare:false,connect_timeout:3});
      try{
        const competing=new DisposablePgAtomicAdmissionAdapter(another,rawName);
        const [a,b]=await Promise.all([admit(adapter),admit(competing)]);
        assert.equal(a.status,"recorded_for_rehearsal");
        assert.equal(b.status,"recorded_for_rehearsal");
        if(a.status==="recorded_for_rehearsal"&&b.status==="recorded_for_rehearsal"){
          assert.deepEqual(a.receipt,b.receipt);
          assert.equal(Number(a.replay)+Number(b.replay),1);
        }
        assert.deepEqual(await counts(),{grants:1,jobs:1,admissions:1});
      }finally{await another.end({timeout:3});}
    });
});
test("RT01-A7 disposable: competing different keys cannot consume same grant twice",
  {skip:!armed},async()=>{
    await fixture(async({adapter,counts,rawName})=>{
      const another=postgres(disposableUrl(),{max:2,prepare:false,connect_timeout:3});
      try{
        const competing=new DisposablePgAtomicAdmissionAdapter(another,rawName);
        const [a,b]=await Promise.all([
          admit(adapter),admit(competing,{...r,idempotencyKey:"different-key"}),
        ]);
        assert.deepEqual([a.status,b.status].sort(),["denied","recorded_for_rehearsal"]);
        assert.deepEqual(await counts(),{grants:1,jobs:1,admissions:1});
      }finally{await another.end({timeout:3});}
    });
});
test("RT01-A7 disposable: reusing idempotency key for different grant never creates second job",
  {skip:!armed},async()=>{
    await fixture(async({adapter,seed,counts})=>{
      await seed("grant-two");
      assert.equal((await admit(adapter)).status,"recorded_for_rehearsal");
      const outcome=await admit(adapter,{...r,grantId:"grant-two"});
      assert.notEqual(outcome.status,"recorded_for_rehearsal");
      assert.deepEqual(await counts(),{grants:1,jobs:1,admissions:1});
    });
});
test("RT01-A7 disposable: transactional injection at every step rolls back ALL writes",
  {skip:!armed},async()=>{
    for(const fault of ["after_grant","after_job","after_audit"] as const){
      await fixture(async({sql,rawName,counts,adapter,schema})=>{
        const failing=new DisposablePgAtomicAdmissionAdapter(sql,rawName,fault);
        assert.deepEqual(await admit(failing),{status:"unavailable"});
        assert.deepEqual(await counts(),{grants:0,jobs:0,admissions:0});
        const row=await sql.unsafe(`SELECT state FROM ${schema}.grants WHERE grant_id=$1`,[r.grantId]);
        assert.equal(row[0].state,"issued");
        assert.equal((await admit(adapter)).status,"recorded_for_rehearsal");
        assert.deepEqual(await counts(),{grants:1,jobs:1,admissions:1});
      });
    }
});
test("RT01-A7 disposable: expired and wrong-scope grants do not create jobs",
  {skip:!armed},async()=>{
    await fixture(async({adapter,seed,counts})=>{
      await seed("expired","analyze","-1 second");
      assert.deepEqual(await admit(adapter,{...r,grantId:"expired",idempotencyKey:"expired-key"}),{status:"denied"});
      assert.deepEqual(await admit(adapter,r,{...c,actorId:"other"}),{status:"denied"});
      assert.deepEqual(await admit(adapter,{...r,operation:"recommend"}),{status:"denied"});
      assert.deepEqual(await counts(),{grants:0,jobs:0,admissions:0});
    });
});
test("RT01-A7 disposable: audit constraint failure rolls back job and consumed grant",
  {skip:!armed},async()=>{
    await fixture(async({adapter,sql,schema,counts})=>{
      await sql.unsafe(`ALTER TABLE ${schema}.admissions ADD CONSTRAINT reject_receipt CHECK(false)`);
      assert.deepEqual(await admit(adapter),{status:"unavailable"});
      assert.deepEqual(await counts(),{grants:0,jobs:0,admissions:0});
      await sql.unsafe(`ALTER TABLE ${schema}.admissions DROP CONSTRAINT reject_receipt`);
      assert.equal((await admit(adapter)).status,"recorded_for_rehearsal");
    });
});
