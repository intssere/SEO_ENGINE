/** UGP-11.C4 disposable-only concurrent fence mutation while observing.
 * Transactional FOR SHARE prevents a competing writer from changing the job
 * before the observer's exact marker+job read completes.
 */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {reconcileFencedCommitEvidence} from "./ugp-11-c4-fenced-evidence-reconcile.js";

test("in-flight independent observer protects fenced row; later mutation invalidates a new read",async t=>{
 const raw=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!raw){t.skip("disposable PostgreSQL unavailable");return;}
 const url=new URL(raw);
 if(!["postgres:","postgresql:"].includes(url.protocol)||
 !["localhost","127.0.0.1"].includes(url.hostname)||url.port!=="5432"||url.pathname!=="/seo_engine_test")
 throw Error("disposable_database_only");
 const setup=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const reader=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const writer=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const tenant="c4-inflight-race",site="fixture",identity="a".repeat(64),hash="b".repeat(64),attempt="c4-inflight-race-1";
 t.after(async()=>{try{
   await setup`DROP TABLE IF EXISTS ugp11_transport_fixture.commit_attempts`;
   await setup`DROP FUNCTION IF EXISTS ugp11_transport_fixture.reject_commit_attempt_mutation()`;
   await setup`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
   await setup`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 }finally{await Promise.allSettled([setup.end({timeout:2}),reader.end({timeout:2}),writer.end({timeout:2})])}});
 await setup`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
 await setup`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 await setup`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint)
 VALUES(${tenant},${site},'running',1,${hash})`;
 await setup`INSERT INTO ugp11_transport_fixture.jobs(identity,tenant_id,site_id,idempotency_key,
 job_class,envelope_fingerprint,upstream_fingerprint,control_revision,control_fingerprint,
 slot_at,expires_at,admission_expires_at,status,worker_id,claimed_at,lease_expires_at,fence,attempts)
 VALUES(${identity},${tenant},${site},${site},'signal_refresh',${hash},${hash},1,${hash},
 transaction_timestamp()-interval '2 minutes',transaction_timestamp()+interval '20 minutes',
 transaction_timestamp()+interval '10 minutes','claimed','candidate',
 transaction_timestamp()-interval '2 minutes',transaction_timestamp()+interval '1 minute',8,2)`;
 await setup`INSERT INTO ugp11_transport_fixture.commit_attempts
 (attempt_id,tenant_id,site_id,job_identity,payload_fingerprint,prior_fence,committed_fence)
 VALUES(${attempt},${tenant},${site},${identity},${hash},7,8)`;
 const expected={attemptId:attempt,tenantId:tenant,siteId:site,jobIdentity:identity,
 fingerprint:hash,priorFence:7,committedFence:8,priorAttempts:1,owner:"candidate"};
 await reader.begin("isolation level repeatable read",async tx=>{
  const jobs=await tx`SELECT worker_id,fence,attempts FROM ugp11_transport_fixture.jobs
   WHERE identity=${identity} AND tenant_id=${tenant} AND site_id=${site} FOR SHARE`;
  assert.equal(jobs.length,1);
  await assert.rejects(writer.begin(async w=>{
    await w`SET LOCAL lock_timeout='200ms'`;
    await w`UPDATE ugp11_transport_fixture.jobs SET worker_id='contender',fence=fence+1,attempts=attempts+1
     WHERE identity=${identity} AND fence=8`;
  }),/lock timeout/);
  const markers=await tx`SELECT attempt_id,tenant_id,site_id,job_identity,payload_fingerprint,
   prior_fence,committed_fence FROM ugp11_transport_fixture.commit_attempts
   WHERE attempt_id=${attempt} AND tenant_id=${tenant} AND site_id=${site} AND job_identity=${identity}`;
  const snapshot={kind:"available" as const,markers:markers.map(m=>({
    attemptId:String(m.attempt_id),tenantId:String(m.tenant_id),siteId:String(m.site_id),
    jobIdentity:String(m.job_identity).trim(),fingerprint:String(m.payload_fingerprint).trim(),
    priorFence:Number(m.prior_fence),committedFence:Number(m.committed_fence)})),
   job:{workerId:String(jobs[0]!.worker_id),fence:Number(jobs[0]!.fence),attempts:Number(jobs[0]!.attempts)}};
  const decision=reconcileFencedCommitEvidence(expected,snapshot);
  assert.equal(decision.outcome,"committed");
  assert.equal(decision.automaticRetryAllowed,false);
  assert.equal(decision.providerDispatchAllowed,false);
  assert.equal(decision.productionAuthority,false);
 });
 const advance=await writer`UPDATE ugp11_transport_fixture.jobs SET worker_id='contender',
 fence=fence+1,attempts=attempts+1 WHERE identity=${identity} AND fence=8 RETURNING fence`;
 assert.equal(advance.length,1);
 const [now]=await reader`SELECT worker_id,fence,attempts FROM ugp11_transport_fixture.jobs WHERE identity=${identity}`;
 assert.equal(reconcileFencedCommitEvidence(expected,{kind:"available",
  markers:[{attemptId:attempt,tenantId:tenant,siteId:site,jobIdentity:identity,fingerprint:hash,priorFence:7,committedFence:8}],
  job:{workerId:String(now!.worker_id),fence:Number(now!.fence),attempts:Number(now!.attempts)}}).outcome,
  "manual_intervention_required");
});
