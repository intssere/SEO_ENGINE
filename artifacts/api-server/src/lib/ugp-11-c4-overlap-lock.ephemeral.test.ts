/** UGP-11.C4: overlapping PostgreSQL control-lock contention, fixture ONLY.
 * No P9 issuer, operational claim or dispatch. Always local disposable database.
 */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
const tenant="c4-overlap", hash="a".repeat(64);
function allowedUrl():string|null{
 const raw=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!raw)return null;
 const u=new URL(raw);
 if(!["postgres:","postgresql:"].includes(u.protocol) ||
 !["localhost","127.0.0.1"].includes(u.hostname) ||
 u.pathname!=="/seo_engine_test")throw Error("disposable_database_only");
 return raw;
}
function deferred(){
 let release!:()=>void;
 const promise=new Promise<void>(resolve=>{release=resolve;});
 return {promise,release};
}
test("C4 PostgreSQL: overlapping control lock prevents synthetic claim until kill commits",async t=>{
 const url=allowedUrl();if(!url){t.skip("dedicated disposable SQL unavailable");return;}
 const db=postgres(url,{max:4,prepare:false,connect_timeout:8,idle_timeout:2});
 const site="kill-first",id="6".repeat(64);
 t.after(async()=>{
  try{await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
      await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;}
  finally{await db.end({timeout:2});}
 });
 await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
 await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 await db`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint)
 VALUES(${tenant},${site},'running',1,${hash})`;
 await db`INSERT INTO ugp11_transport_fixture.jobs(identity,tenant_id,site_id,idempotency_key,job_class,
 envelope_fingerprint,upstream_fingerprint,control_revision,control_fingerprint,slot_at,expires_at,admission_expires_at)
 VALUES(${id},${tenant},${site},'lock-race-key','signal_refresh',${hash},${hash},1,${hash},
 transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '20 minutes',
 transaction_timestamp()+interval '10 minutes')`;
 const acquired=deferred(), unblock=deferred();
 const holder=db.begin(async tx=>{
  await tx`SELECT mode FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}
   AND site_id=${site} FOR UPDATE`;
  await tx`UPDATE ugp11_transport_fixture.controls SET mode='killed',revision=revision+1
   WHERE tenant_id=${tenant} AND site_id=${site}`;
  acquired.release();
  await unblock.promise;
 });
 try{
  await acquired.promise;
  // Independent connection cannot take the held row lock; bounded SQL timeout.
  await assert.rejects(db.begin(async tx=>{
   await tx`SET LOCAL lock_timeout = '150ms'`;
   await tx`SELECT mode FROM ugp11_transport_fixture.controls
    WHERE tenant_id=${tenant} AND site_id=${site} FOR UPDATE`;
  }), (error:unknown)=>typeof error==="object"&&error!==null&&
        "code" in error&&(error as {code?:string}).code==="55P03");
 }finally{unblock.release();}
 await holder;
 const [control]=await db`SELECT mode,revision,source FROM ugp11_transport_fixture.controls
 WHERE tenant_id=${tenant} AND site_id=${site}`;
 assert.equal(control.mode,"killed");assert.equal(Number(control.revision),2);
 assert.equal(control.source,"fixture_only");
 const [job]=await db`SELECT status,fence,attempts,worker_id FROM ugp11_transport_fixture.jobs WHERE identity=${id}`;
 assert.equal(job.status,"queued");assert.equal(Number(job.fence),0);
 assert.equal(Number(job.attempts),0);assert.equal(job.worker_id,null);
 // A serialized synthetic claim now sees killed and must not alter any record.
 const denied=await db.begin(async tx=>{
  const rows=await tx`SELECT mode,revision FROM ugp11_transport_fixture.controls
   WHERE tenant_id=${tenant} AND site_id=${site} FOR UPDATE`;
  return rows[0]?.mode!=="running"||Number(rows[0]?.revision)!==1;
 });
 assert.equal(denied,true);
});
