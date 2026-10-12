/** UGP-11.C4 real PostgreSQL wire-disconnect experiment.
 * ONLY disposable loopback PostgreSQL /seo_engine_test, no runtime authority.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {spawn} from "node:child_process";
import postgres from "postgres";
import {startDisposableCommitAckProxy} from "./ugp-11-c4-loopback-ack-proxy.js";

test("real PostgreSQL COMMIT reply dropped on wire with independent durable reconciliation",async t=>{
 const raw=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!raw){t.skip("dedicated disposable database absent");return;}
 const url=new URL(raw);
 if(!["postgres:","postgresql:"].includes(url.protocol)||
   !["127.0.0.1","localhost"].includes(url.hostname)||
   url.pathname!=="/seo_engine_test" || url.port!=="5432")
   throw Error("disposable_database_only");
 const admin=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const observer=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const tenant="c4-real-wire-ack",site="loopback",identity="f".repeat(64),hash="b".repeat(64),attempt="c4-real-wire-ack-001";
 let proxy:Awaited<ReturnType<typeof startDisposableCommitAckProxy>>|undefined;
 t.after(async()=>{
   try {
     await admin`DROP TABLE IF EXISTS ugp11_transport_fixture.commit_attempts`;
     await admin`DROP FUNCTION IF EXISTS ugp11_transport_fixture.reject_commit_attempt_mutation()`;
     await admin`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
     await admin`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
   }finally{
     if(proxy) await proxy.close();
     await Promise.allSettled([admin.end({timeout:2}),observer.end({timeout:2})]);
   }
 });
 await admin`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
 await admin`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 await admin`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint)
 VALUES(${tenant},${site},'running',1,${hash})`;
 await admin`INSERT INTO ugp11_transport_fixture.jobs(identity,tenant_id,site_id,idempotency_key,
 job_class,envelope_fingerprint,upstream_fingerprint,control_revision,control_fingerprint,
 slot_at,expires_at,admission_expires_at,status,worker_id,claimed_at,lease_expires_at,fence,attempts)
 VALUES(${identity},${tenant},${site},${site},'signal_refresh',${hash},${hash},1,${hash},
 transaction_timestamp()-interval '2 minutes',transaction_timestamp()+interval '20 minutes',
 transaction_timestamp()+interval '10 minutes','claimed','old-owner',
 transaction_timestamp()-interval '2 minutes',transaction_timestamp()-interval '1 minute',7,1)`;
 proxy=await startDisposableCommitAckProxy(5432);
 // libpq emits simple-query protocol for each -c, with no encrypted/GSS negotiation.
 const commands=[
  "BEGIN",
  `UPDATE ugp11_transport_fixture.jobs SET worker_id='candidate',fence=fence+1,attempts=attempts+1,claimed_at=transaction_timestamp(),lease_expires_at=transaction_timestamp()+interval '1 minute' WHERE identity='${identity}' AND status='claimed' AND worker_id='old-owner' AND fence=7 AND lease_expires_at<transaction_timestamp()`,
  `INSERT INTO ugp11_transport_fixture.commit_attempts(attempt_id,tenant_id,site_id,job_identity,payload_fingerprint,prior_fence,committed_fence) VALUES('${attempt}','${tenant}','${site}','${identity}','${hash}',7,8)`,
  "COMMIT",
 ];
 const args=["-X","-v","ON_ERROR_STOP=1","-h","127.0.0.1","-p",String(proxy.port),"-U",decodeURIComponent(url.username),"-d","seo_engine_test",...commands.flatMap(x=>["-c",x])];
 const env={...process.env,PGPASSWORD:decodeURIComponent(url.password),PGSSLMODE:"disable",PGGSSENCMODE:"disable",PGCONNECT_TIMEOUT:"5"};
 const child=spawn("psql",args,{env,stdio:["ignore","pipe","pipe"]});
 let out="",err="";
 child.stdout.setEncoding("utf8");child.stderr.setEncoding("utf8");
 child.stdout.on("data",(s:string)=>{out=(out+s).slice(-4000);});
 child.stderr.on("data",(s:string)=>{err=(err+s).slice(-4000);});
 const status=new Promise<{code:number|null;signal:NodeJS.Signals|null}>((resolve,reject)=>{
   child.once("error",reject);
   child.once("close",(code,signal)=>resolve({code,signal}));
 });
 let observedDrop=false;
 try {
   assert.equal(await proxy.completion,"commit_ack_dropped");
   observedDrop=true;
 }finally{
   if(!observedDrop) child.kill("SIGKILL");
 }
 const exit=await status;
 assert.notEqual(exit.code,0,"psql must not report COMMIT success through the dropped channel");
 assert.doesNotMatch(out,/COMMIT\s*$/m,"client must not receive a COMMIT result");
 const [job]=await observer`SELECT worker_id,fence,attempts FROM ugp11_transport_fixture.jobs WHERE identity=${identity}`;
 const marker=await observer`SELECT attempt_id,payload_fingerprint,prior_fence,committed_fence FROM ugp11_transport_fixture.commit_attempts WHERE attempt_id=${attempt} AND tenant_id=${tenant} AND site_id=${site} AND job_identity=${identity}`;
 assert.equal(marker.length,1);
 assert.equal(marker[0]?.attempt_id,attempt);
 assert.equal(marker[0]?.payload_fingerprint?.trim(),hash);
 assert.equal(Number(marker[0]?.prior_fence),7);
 assert.equal(Number(marker[0]?.committed_fence),8);
 assert.equal(job?.worker_id,"candidate");
 assert.equal(Number(job?.fence),8);
 assert.equal(Number(job?.attempts),2);
 await assert.rejects(observer`INSERT INTO ugp11_transport_fixture.commit_attempts(attempt_id,tenant_id,site_id,job_identity,payload_fingerprint,prior_fence,committed_fence) VALUES(${attempt},${tenant},${site},${identity},${hash},7,8)`,/duplicate key/);
 const [again]=await observer`SELECT fence,attempts FROM ugp11_transport_fixture.jobs WHERE identity=${identity}`;
 assert.equal(Number(again?.fence),8);
 assert.equal(Number(again?.attempts),2);
});
