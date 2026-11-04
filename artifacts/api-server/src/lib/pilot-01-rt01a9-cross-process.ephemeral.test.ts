/**
 * RT01-A9: process-level disposable-only PostgreSQL certification.
 * CI provisions fresh localhost postgres:17 and unique test schema.
 * No IO without BOTH existing disposable arming sentinels.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { rehearseUncertainCommitReconciliation } from "./pilot-01-offline-commit-reconciliation.js";
import { DisposablePgAtomicAdmissionAdapter } from "./pilot-01-pg-atomic-admission-disposable.js";
import type { AtomicAdmissionReceipt } from "./pilot-01-atomic-job-admission.js";
import type { VerifiedGrantContext } from "./pilot-01-trusted-grant-contract.js";

const armed=process.env.PILOT01_DISPOSABLE_PG==="I_ACKNOWLEDGE_DISPOSABLE_ONLY" &&
  Boolean(process.env.PILOT01_DISPOSABLE_DATABASE_URL);
function url():string{
  if(!armed)throw Error("RT01A9_EXPLICIT_DISPOSABLE_ACK_REQUIRED");
  const u=new URL(process.env.PILOT01_DISPOSABLE_DATABASE_URL!);
  if(!["postgres:","postgresql:"].includes(u.protocol) ||
    !["127.0.0.1","localhost","[::1]","::1"].includes(u.hostname) ||
    u.username!=="postgres" ||
    !/^pilot01_disposable_[a-z0-9_]+$/.test(u.pathname.slice(1)) ||
    /railway|neon|production|diamondshelf|supabase/i.test(u.host+" "+u.pathname))
    throw Error("RT01A9_NON_DISPOSABLE_URL_REFUSED");
  return u.toString();
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
const worker=fileURLToPath(new URL("./pilot-01-rt01a9-disposable-worker.ts",import.meta.url));

async function fixture(fn:(f:{
  sql:Sql; schema:string; ident:string;
  counts:()=>Promise<{consumed:number;jobs:number;receipts:number}>;
})=>Promise<void>){
  const sql=postgres(url(),{max:5,prepare:false,connect_timeout:3});
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
      site_id text NOT NULL,issuer_id text NOT NULL,
      operation text NOT NULL CHECK(operation IN ('analyze','recommend')),
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
function spawnWorker(schema:string,mode:"compete"|"hold_uncommitted"|"commit_no_ack",
  key:"same-key"|"other-key"="same-key"):ChildProcessWithoutNullStreams{
  // No additional database credential sources are read or passed.
  return spawn(process.execPath,["--import","tsx",worker,mode,schema,key],{
    cwd:fileURLToPath(new URL("../../",import.meta.url)),
    env:{
      PATH:process.env.PATH,
      NODE_ENV:"test",
      PILOT01_DISPOSABLE_PG:process.env.PILOT01_DISPOSABLE_PG,
      PILOT01_DISPOSABLE_DATABASE_URL:process.env.PILOT01_DISPOSABLE_DATABASE_URL,
    },
    stdio:["pipe","pipe","pipe"],
  });
}
function finished(child:ChildProcessWithoutNullStreams){
  return new Promise<{code:number|null,signal:NodeJS.Signals|null,output:string}>((resolve,reject)=>{
    let output="",err="";
    const watchdog=setTimeout(()=>{child.kill("SIGKILL");reject(Error("RT01A9_CHILD_TIMEOUT"));},20000);
    child.stdout.on("data",(chunk:Buffer)=>{output+=chunk.toString();});
    child.stderr.on("data",(chunk:Buffer)=>{err+=chunk.toString();});
    child.on("error",e=>{clearTimeout(watchdog);reject(e);});
    child.on("close",(code,signal)=>{
      clearTimeout(watchdog);
      if(code!==0)reject(Error("RT01A9_CHILD_EXIT_"+code+"_"+signal+"_"+err.slice(0,120)));
      else resolve({code,signal,output:output.trim()});
    });
  });
}
async function untilOpen(child:ChildProcessWithoutNullStreams){
  await new Promise<void>((resolve,reject)=>{
    let output="";
    const timer=setTimeout(()=>reject(Error("RT01A9_OPEN_TIMEOUT")),20000);
    child.stdout.on("data",(chunk:Buffer)=>{
      output+=chunk.toString();
      if(output.includes("OPEN\n")){clearTimeout(timer);resolve();}
    });
    child.on("error",e=>{clearTimeout(timer);reject(e);});
    child.on("close",()=>{clearTimeout(timer);reject(Error("RT01A9_CLOSED_BEFORE_OPEN"));});
  });
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

test("RT01-A9: missing explicit sentinels performs no database IO",()=>{
  if(!armed)assert.throws(url,/RT01A9_EXPLICIT_DISPOSABLE_ACK_REQUIRED/);
});
test("RT01-A9: independent OS processes, same key -> one durable job and identical receipt",
  {skip:!armed},async()=>{
    await fixture(async({sql,schema,ident,counts})=>{
      const [a,b]=await Promise.all([
        finished(spawnWorker(schema,"compete")),
        finished(spawnWorker(schema,"compete")),
      ]);
      const results=[JSON.parse(a.output),JSON.parse(b.output)];
      assert.deepEqual(results.map(x=>x.status).sort(),["already_committed","committed"]);
      assert.deepEqual(results[0].receipt,results[1].receipt);
      assert.deepEqual(await counts(),{consumed:1,jobs:1,receipts:1});
      const evidence=await rehearseUncertainCommitReconciliation(
        request,policy,{async resolve(){return context;}},await authoritativeLookup(sql,ident));
      assert.equal(evidence.status,"confirmed_for_rehearsal");
    });
});
test("RT01-A9: independent processes with conflicting keys -> one commit, one deny",
  {skip:!armed},async()=>{
    await fixture(async({schema,counts})=>{
      const [a,b]=await Promise.all([
        finished(spawnWorker(schema,"compete","same-key")),
        finished(spawnWorker(schema,"compete","other-key")),
      ]);
      const states=[JSON.parse(a.output).status,JSON.parse(b.output).status].sort();
      assert.deepEqual(states,["committed","denied"]);
      assert.deepEqual(await counts(),{consumed:1,jobs:1,receipts:1});
    });
});
test("RT01-A9: kill independent process before COMMIT -> grant and job roll back",
  {skip:!armed},async()=>{
    await fixture(async({sql,schema,ident,counts})=>{
      const child=spawnWorker(schema,"hold_uncommitted");
      try{
        await untilOpen(child);
        // KILL only the isolated synthetic subprocess, never the DB server.
        child.kill("SIGKILL");
        await new Promise<void>(resolve=>child.once("close",()=>resolve()));
        assert.deepEqual(await counts(),{consumed:0,jobs:0,receipts:0});
        const row=await sql.unsafe(`SELECT state FROM ${ident}.grants WHERE grant_id=$1`,
          [request.grantId]);
        assert.equal(row[0].state,"issued");
        const lookup=await authoritativeLookup(sql,ident);
        const recovered=await rehearseUncertainCommitReconciliation(
          request,policy,{async resolve(){return context;}},lookup);
        assert.deepEqual(recovered,{status:"unresolved"});
        // No automatic retry. The test makes a separate, explicit synthetic
        // admission to demonstrate the released grant can be used once.
        const adapter=new DisposablePgAtomicAdmissionAdapter(sql,schema);
        const admitted=await adapter.admit({context,request});
        assert.equal(admitted.status,"committed");
        assert.deepEqual(await counts(),{consumed:1,jobs:1,receipts:1});
      }finally{if(child.exitCode===null)child.kill("SIGKILL");}
    });
});
test("RT01-A9: committed child withholds receipt -> primary read confirms one job",
  {skip:!armed},async()=>{
    await fixture(async({sql,schema,ident,counts})=>{
      const child=await finished(spawnWorker(schema,"commit_no_ack"));
      assert.equal(child.output,"COMMITTED_WITHHELD_RECEIPT");
      const lookup=await authoritativeLookup(sql,ident);
      const reconciled=await rehearseUncertainCommitReconciliation(
        request,policy,{async resolve(){return context;}},lookup);
      assert.equal(reconciled.status,"confirmed_for_rehearsal");
      assert.deepEqual(await counts(),{consumed:1,jobs:1,receipts:1});
      const adapter=new DisposablePgAtomicAdmissionAdapter(sql,schema);
      const second=await adapter.admit({context,request});
      assert.equal(second.status,"already_committed");
      if(reconciled.status==="confirmed_for_rehearsal"&&"receipt" in second)
        assert.deepEqual(second.receipt,reconciled.receipt);
      assert.deepEqual(await counts(),{consumed:1,jobs:1,receipts:1});
    });
});
