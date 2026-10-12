/** UGP-11.C4: disposable PostgreSQL independent observer concurrency.
 * Tests one atomic marker+job snapshot protected by a job row lock.
 * No Production SQL, runtime adapter, retries or provider authority.
 */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {reconcileFencedCommitEvidence} from "./ugp-11-c4-fenced-evidence-reconcile.js";

test("independent locked observer prevents concurrent fence drift during durable reconciliation", async t=>{
 const raw=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!raw){t.skip("dedicated disposable database absent");return;}
 const u=new URL(raw);
 if(!["postgres:","postgresql:"].includes(u.protocol)||
    !["127.0.0.1","localhost"].includes(u.hostname)||
    u.pathname!=="/seo_engine_test"||u.port!=="5432") throw Error("disposable_database_only");
 const admin=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const observer=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const contender=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const tenant="c4-snapshot-observer",site="race",jobIdentity="c".repeat(64),fingerprint="d".repeat(64),attemptId="c4-snapshot-1";
 t.after(async()=>{try{
   await admin`DROP TABLE IF EXISTS ugp11_transport_fixture.commit_attempts`;
   await admin`DROP FUNCTION IF EXISTS ugp11_transport_fixture.reject_commit_attempt_mutation()`;
   await admin`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
   await admin`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 }finally{await Promise.allSettled([admin.end({timeout:2}),observer.end({timeout:2}),contender.end({timeout:2})]);}});
 await admin`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
 await admin`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 await admin`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint)
 VALUES(${tenant},${site},'running',1,${fingerprint})`;
 await admin`INSERT INTO ugp11_transport_fixture.jobs(identity,tenant_id,site_id,idempotency_key,job_class,
 envelope_fingerprint,upstream_fingerprint,control_revision,control_fingerprint,
 slot_at,expires_at,admission_expires_at,status,worker_id,claimed_at,lease_expires_at,fence,attempts)
 VALUES(${jobIdentity},${tenant},${site},${site},'signal_refresh',
 ${fingerprint},${fingerprint},1,${fingerprint},transaction_timestamp()-interval '2 minutes',
 transaction_timestamp()+interval '20 minutes',transaction_timestamp()+interval '10 minutes',
 'claimed','old-owner',transaction_timestamp()-interval '2 minutes',
 transaction_timestamp()-interval '1 minute',7,1)`;
 // Marker and fenced transition must be in ONE committed transaction.
 await admin.begin(async tx=>{
   const updated=await tx`UPDATE ugp11_transport_fixture.jobs SET worker_id='candidate',
    fence=fence+1,attempts=attempts+1 WHERE identity=${jobIdentity} AND fence=7 AND worker_id='old-owner'
    RETURNING fence,attempts`;
   assert.equal(updated.length,1);
   await tx`INSERT INTO ugp11_transport_fixture.commit_attempts
    (attempt_id,tenant_id,site_id,job_identity,payload_fingerprint,prior_fence,committed_fence)
    VALUES(${attemptId},${tenant},${site},${jobIdentity},${fingerprint},7,8)`;
 });
 const expected={attemptId,tenantId:tenant,siteId:site,jobIdentity,fingerprint,
   priorFence:7,committedFence:8,priorAttempts:1,owner:"candidate"};
 await observer.begin("isolation level repeatable read",async tx=>{
   const job=await tx`SELECT worker_id,fence,attempts FROM ugp11_transport_fixture.jobs
     WHERE identity=${jobIdentity} AND tenant_id=${tenant} AND site_id=${site} FOR SHARE`;
   assert.equal(job.length,1);
   // Writer cannot advance the observed row while our observer holds the lock.
   await assert.rejects(contender.begin(async w=>{
     await w`SET LOCAL lock_timeout='200ms'`;
     await w`UPDATE ugp11_transport_fixture.jobs SET fence=fence+1, attempts=attempts+1
       WHERE identity=${jobIdentity}`;
   }),/lock timeout/);
   const markers=await tx`SELECT attempt_id,tenant_id,site_id,job_identity,
     payload_fingerprint,prior_fence,committed_fence
     FROM ugp11_transport_fixture.commit_attempts
     WHERE attempt_id=${attemptId} AND job_identity=${jobIdentity}`;
   const evidence={kind:"available" as const,markers:markers.map(m=>({
     attemptId:m.attempt_id,tenantId:m.tenant_id,siteId:m.site_id,
     jobIdentity:String(m.job_identity).trim(),fingerprint:String(m.payload_fingerprint).trim(),
     priorFence:Number(m.prior_fence),committedFence:Number(m.committed_fence)
   })),job:{workerId:job[0]!.worker_id,fence:Number(job[0]!.fence),attempts:Number(job[0]!.attempts)}};
   const result=reconcileFencedCommitEvidence(expected,evidence);
   assert.equal(result.outcome,"committed");
   assert.equal(result.automaticRetryAllowed,false);
   assert.equal(result.providerDispatchAllowed,false);
   assert.equal(result.productionAuthority,false);
 });
 // Subsequent drift must NOT be accepted as the same fenced state.
 await contender`UPDATE ugp11_transport_fixture.jobs SET fence=fence+1,attempts=attempts+1 WHERE identity=${jobIdentity}`;
 const [changed]=await observer`SELECT worker_id,fence,attempts FROM ugp11_transport_fixture.jobs WHERE identity=${jobIdentity}`;
 assert.equal(reconcileFencedCommitEvidence(expected,{kind:"available",
   markers:[{attemptId,tenantId:tenant,siteId:site,jobIdentity,fingerprint,priorFence:7,committedFence:8}],
   job:{workerId:changed!.worker_id,fence:Number(changed!.fence),attempts:Number(changed!.attempts)}}).outcome,
   "manual_intervention_required");
});
