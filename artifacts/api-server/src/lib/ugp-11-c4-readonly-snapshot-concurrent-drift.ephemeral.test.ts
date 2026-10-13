/** Disposable-only nonlocking REPEATABLE READ snapshot versus concurrent fence drift. */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {reconcileFencedCommitEvidence} from "./ugp-11-c4-fenced-evidence-reconcile.js";

test("read-only snapshot is internally consistent but becomes historical after concurrent writer commits",async t=>{
 const raw=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!raw){t.skip("dedicated disposable PostgreSQL absent");return;}
 const u=new URL(raw);
 if(!["postgres:","postgresql:"].includes(u.protocol)||!["127.0.0.1","localhost"].includes(u.hostname)||
 u.port!=="5432"||u.pathname!=="/seo_engine_test")throw Error("disposable_database_only");
 const admin=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const observer=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const writer=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const tenant="c4-snapshot-race",site="snapshot",jobIdentity="1".repeat(64),fingerprint="2".repeat(64),attemptId="c4-snapshot-race-001";
 const expected={tenantId:tenant,siteId:site,jobIdentity,fingerprint,attemptId,priorFence:7,committedFence:8,priorAttempts:1,owner:"candidate"};
 t.after(async()=>{try{
  await admin`DROP TABLE IF EXISTS ugp11_transport_fixture.commit_attempts`;
  await admin`DROP FUNCTION IF EXISTS ugp11_transport_fixture.reject_commit_attempt_mutation()`;
  await admin`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
  await admin`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 }finally{await Promise.allSettled([admin.end({timeout:2}),observer.end({timeout:2}),writer.end({timeout:2})])}});
 await admin`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
 await admin`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 await admin`INSERT INTO ugp11_transport_fixture.controls (tenant_id,site_id,mode,revision,fingerprint)
 VALUES(${tenant},${site},'running',1,${fingerprint})`;
 await admin`INSERT INTO ugp11_transport_fixture.jobs(identity,tenant_id,site_id,idempotency_key,
 job_class,envelope_fingerprint,upstream_fingerprint,control_revision,control_fingerprint,
 slot_at,expires_at,admission_expires_at,status,worker_id,claimed_at,lease_expires_at,fence,attempts)
 VALUES(${jobIdentity},${tenant},${site},${site},'signal_refresh',${fingerprint},${fingerprint},1,${fingerprint},
 transaction_timestamp()-interval '2 minutes',transaction_timestamp()+interval '20 minutes',
 transaction_timestamp()+interval '10 minutes','claimed','candidate',
 transaction_timestamp()-interval '2 minutes',transaction_timestamp()+interval '1 minute',8,2)`;
 await admin`INSERT INTO ugp11_transport_fixture.commit_attempts
 (attempt_id,tenant_id,site_id,job_identity,payload_fingerprint,prior_fence,committed_fence)
 VALUES(${attemptId},${tenant},${site},${jobIdentity},${fingerprint},7,8)`;
 await observer.begin("isolation level repeatable read",async tx=>{
  await tx`SET TRANSACTION READ ONLY`;
  const [first]=await tx`SELECT worker_id,fence,attempts FROM ugp11_transport_fixture.jobs
   WHERE identity=${jobIdentity} AND tenant_id=${tenant} AND site_id=${site}`;
  assert.equal(Number(first!.fence),8);
  const advanced=await writer`UPDATE ugp11_transport_fixture.jobs SET worker_id='contender',
   fence=fence+1,attempts=attempts+1 WHERE identity=${jobIdentity} AND fence=8 RETURNING fence`;
  assert.equal(advanced.length,1,"nonlocking observer must not block the writer");
  const [same]=await tx`SELECT worker_id,fence,attempts FROM ugp11_transport_fixture.jobs
   WHERE identity=${jobIdentity} AND tenant_id=${tenant} AND site_id=${site}`;
  assert.deepEqual({owner:same!.worker_id,fence:Number(same!.fence),attempts:Number(same!.attempts)},
   {owner:first!.worker_id,fence:Number(first!.fence),attempts:Number(first!.attempts)});
  const markers=await tx`SELECT attempt_id FROM ugp11_transport_fixture.commit_attempts
   WHERE attempt_id=${attemptId} AND tenant_id=${tenant} AND site_id=${site} AND job_identity=${jobIdentity}`;
  assert.equal(markers.length,1);
  const historical=reconcileFencedCommitEvidence(expected,{kind:"available",
   markers:[{attemptId,tenantId:tenant,siteId:site,jobIdentity,fingerprint,priorFence:7,committedFence:8}],
   job:{workerId:String(same!.worker_id),fence:Number(same!.fence),attempts:Number(same!.attempts)}});
  assert.equal(historical.outcome,"committed");
  assert.equal(historical.productionAuthority,false);
  assert.equal(historical.providerDispatchAllowed,false);
  assert.equal(historical.automaticRetryAllowed,false);
 });
 const [latest]=await observer`SELECT worker_id,fence,attempts FROM ugp11_transport_fixture.jobs
 WHERE identity=${jobIdentity} AND tenant_id=${tenant} AND site_id=${site}`;
 assert.equal(Number(latest!.fence),9);
 const drift=reconcileFencedCommitEvidence(expected,{kind:"available",
  markers:[{attemptId,tenantId:tenant,siteId:site,jobIdentity,fingerprint,priorFence:7,committedFence:8}],
  job:{workerId:String(latest!.worker_id),fence:Number(latest!.fence),attempts:Number(latest!.attempts)}});
 assert.equal(drift.outcome,"manual_intervention_required");
 assert.equal(drift.productionAuthority,false);
 assert.equal(drift.providerDispatchAllowed,false);
 assert.equal(drift.automaticRetryAllowed,false);
});
