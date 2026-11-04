/**
 * RT01-A10 ephemeral, wire-level COMMIT interruption certification.
 * Zero DB I/O unless both disposable sentinels are present; only localhost
 * postgres:17 test service, unique synthetic schema, no operational workers.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { DisposableCommitWireFault, type CommitFaultPoint } from "./pilot-01-rt01a10-commit-wire-fault.js";
import { DisposablePgAtomicAdmissionAdapter } from "./pilot-01-pg-atomic-admission-disposable.js";
import { rehearseUncertainCommitReconciliation } from "./pilot-01-offline-commit-reconciliation.js";
import type { AtomicAdmissionReceipt } from "./pilot-01-atomic-job-admission.js";
import type { VerifiedGrantContext } from "./pilot-01-trusted-grant-contract.js";

const armed=process.env.PILOT01_DISPOSABLE_PG==="I_ACKNOWLEDGE_DISPOSABLE_ONLY" &&
  Boolean(process.env.PILOT01_DISPOSABLE_DATABASE_URL);
function url():URL {
  if(!armed)throw Error("RT01A10_DISPOSABLE_ACK_REQUIRED");
  const u=new URL(process.env.PILOT01_DISPOSABLE_DATABASE_URL!);
  if(!["postgres:","postgresql:"].includes(u.protocol) ||
     !["127.0.0.1","localhost","[::1]","::1"].includes(u.hostname) ||
     u.username!=="postgres" ||
     !/^pilot01_disposable_[a-z0-9_]+$/.test(u.pathname.slice(1)) ||
     /railway|production|staging|neon|supabase|diamondshelf/i.test(u.host+" "+u.pathname))
    throw Error("RT01A10_NON_DISPOSABLE_REFUSED");
  return u;
}
type Sql=ReturnType<typeof postgres>;
const context:VerifiedGrantContext={
  actorId:"synthetic-actor",tenantId:"synthetic-tenant",siteId:"synthetic-site",
  issuerId:"synthetic-issuer",sessionId:"synthetic-session",
  role:"admin",source:"server_verified_session",
};
const request={
  grantId:"synthetic-grant",siteId:context.siteId,operation:"analyze" as const,
  idempotencyKey:"stable-key",
};
const policy={
  authEnforced:true,siteVerified:true,runGateEnabled:true,
  publicSiteWritesEnabled:false,aiProposalGenerationEnabled:false,
};
async function fixture(fn:(f:{
  sql:Sql;schema:string;ident:string;
  counts:()=>Promise<{consumed:number;jobs:number;receipts:number}>;
})=>Promise<void>):Promise<void>{
  const sql=postgres(url().toString(),{max:4,prepare:false,connect_timeout:3});
  const schema="pilot01_test_"+randomUUID().replace(/-/g,"");
  const ident='"'+schema+'"';
  try{
    await sql.unsafe("CREATE SCHEMA "+ident);
    await sql.unsafe(`CREATE TABLE ${ident}.grants(
      grant_id text PRIMARY KEY,state text NOT NULL DEFAULT 'issued'
        CHECK(state IN ('issued','consumed','revoked')),
      tenant_id text NOT NULL,site_id text NOT NULL,actor_id text NOT NULL,
      issuer_id text NOT NULL,operation text NOT NULL CHECK(operation IN ('analyze','recommend')),
      expires_at timestamptz NOT NULL,consumed_at timestamptz)`);
    await sql.unsafe(`CREATE TABLE ${ident}.jobs(
      job_id uuid PRIMARY KEY, grant_id text NOT NULL UNIQUE REFERENCES ${ident}.grants(grant_id),
      tenant_id text NOT NULL,site_id text NOT NULL,actor_id text NOT NULL,
      operation text NOT NULL CHECK(operation IN ('analyze','recommend')),
      state text NOT NULL CHECK(state='pending'))`);
    await sql.unsafe(`CREATE TABLE ${ident}.admissions(
      admission_id uuid PRIMARY KEY,job_id uuid NOT NULL UNIQUE REFERENCES ${ident}.jobs(job_id),
      grant_id text NOT NULL UNIQUE REFERENCES ${ident}.grants(grant_id),
      idempotency_key text NOT NULL UNIQUE,actor_id text NOT NULL,tenant_id text NOT NULL,
      site_id text NOT NULL,issuer_id text NOT NULL,operation text NOT NULL
       CHECK(operation IN ('analyze','recommend')),
      transaction_id text NOT NULL,committed_at timestamptz NOT NULL)`);
    await sql.unsafe(
      `INSERT INTO ${ident}.grants
       (grant_id,tenant_id,site_id,actor_id,issuer_id,operation,expires_at)
       VALUES($1,$2,$3,$4,$5,'analyze',clock_timestamp()+interval '1 hour')`,
      [request.grantId,context.tenantId,context.siteId,context.actorId,context.issuerId],
    );
    const counts=async()=>{
      const [a,b,c]=await Promise.all([
        sql.unsafe(`SELECT count(*)::int AS n FROM ${ident}.grants WHERE state='consumed'`),
        sql.unsafe(`SELECT count(*)::int AS n FROM ${ident}.jobs`),
        sql.unsafe(`SELECT count(*)::int AS n FROM ${ident}.admissions`),
      ]);
      return {consumed:a[0].n,jobs:b[0].n,receipts:c[0].n};
    };
    await fn({sql,schema,ident,counts});
  }finally{
    try{await sql.unsafe("DROP SCHEMA IF EXISTS "+ident+" CASCADE");}
    finally{await sql.end({timeout:3});}
  }
}
async function authoritativeLookup(sql:Sql,ident:string){
  return {
    async findCommitted(){
      const rows=await sql.unsafe(
        `SELECT admission_id,job_id,grant_id,idempotency_key,actor_id,tenant_id,
         site_id,issuer_id,operation,transaction_id,committed_at
         FROM ${ident}.admissions WHERE idempotency_key=$1`,
        [request.idempotencyKey],
      );
      if(rows.length===0)return {status:"not_found" as const};
      if(rows.length!==1)return {status:"conflict" as const};
      const v=rows[0];
      const receipt:AtomicAdmissionReceipt={
        admissionId:String(v.admission_id),jobId:String(v.job_id),grantId:String(v.grant_id),
        idempotencyKey:String(v.idempotency_key),actorId:String(v.actor_id),
        tenantId:String(v.tenant_id),siteId:String(v.site_id),
        issuerId:String(v.issuer_id),operation:v.operation,
        transactionId:String(v.transaction_id),
        committedAt:new Date(v.committed_at).toISOString(),
      };
      return {status:"found" as const,receipt};
    },
  };
}
async function withFault(point:CommitFaultPoint,schema:string){
  const dbUrl=url();
  const proxy=await DisposableCommitWireFault.open(point,Number(dbUrl.port||5432));
  const viaProxy=new URL(dbUrl.toString());
  viaProxy.hostname="127.0.0.1";
  viaProxy.port=String(proxy.port);
  const client=postgres(viaProxy.toString(),{
    max:1,prepare:false,connect_timeout:3,
    idle_timeout:1,
  });
  const adapter=new DisposablePgAtomicAdmissionAdapter(client,schema);
  try {
    const result=await adapter.admit({context,request});
    await proxy.observed();
    return {result,observed:proxy.faultFired};
  } finally {
    // Connection is deliberately broken by the proxy. Do not reconnect for
    // cleanup; close the isolated client pool and proxy before fresh DB reads.
    await client.end({timeout:1}).catch(()=>{});
    await proxy.close();
  }
}

test("RT01-A10: no arming flags prevents all PostgreSQL and proxy IO",()=>{
  if(!armed)assert.throws(url,/RT01A10_DISPOSABLE_ACK_REQUIRED/);
});
test("RT01-A10: wire drops COMMIT before sending to PG -> full rollback and unresolved lookup",
  {skip:!armed},async()=>{
    await fixture(async({sql,schema,ident,counts})=>{
      const fault=await withFault("before_commit_send",schema);
      assert.equal(fault.observed,true);
      assert.deepEqual(fault.result,{status:"unavailable"});
      assert.deepEqual(await counts(),{consumed:0,jobs:0,receipts:0});
      const recovered=await rehearseUncertainCommitReconciliation(
        request,policy,{async resolve(){return context;}},await authoritativeLookup(sql,ident));
      assert.deepEqual(recovered,{status:"unresolved"});
      const state=await sql.unsafe(`SELECT state FROM ${ident}.grants WHERE grant_id=$1`,
        [request.grantId]);
      assert.equal(state[0].state,"issued");
    });
});
test("RT01-A10: backend commits but its wire-level idle/commit acknowledgement is dropped",
  {skip:!armed},async()=>{
    await fixture(async({sql,schema,ident,counts})=>{
      const fault=await withFault("after_backend_commit_ready",schema);
      assert.equal(fault.observed,true);
      assert.deepEqual(fault.result,{status:"unavailable"});
      assert.deepEqual(await counts(),{consumed:1,jobs:1,receipts:1});
      const recovered=await rehearseUncertainCommitReconciliation(
        request,policy,{async resolve(){return context;}},await authoritativeLookup(sql,ident));
      assert.equal(recovered.status,"confirmed_for_rehearsal");
      // Explicit same-key check is read-write *only in this disposable test*
      // and must recover the identical receipt without inserting another job.
      const adapter=new DisposablePgAtomicAdmissionAdapter(sql,schema);
      const replay=await adapter.admit({context,request});
      assert.equal(replay.status,"already_committed");
      if(recovered.status==="confirmed_for_rehearsal"&&"receipt" in replay)
        assert.deepEqual(replay.receipt,recovered.receipt);
      assert.deepEqual(await counts(),{consumed:1,jobs:1,receipts:1});
    });
});
