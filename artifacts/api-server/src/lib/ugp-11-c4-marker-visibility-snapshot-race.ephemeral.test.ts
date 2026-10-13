/** Disposable-only visibility boundary: a marker committed after snapshot creation
 * cannot retroactively turn an incomplete independent observation into success.
 */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {classifyIndependentObserverResult} from "./ugp-11-c4-observer-read-classifier.js";
import {reconcileFencedCommitEvidence} from "./ugp-11-c4-fenced-evidence-reconcile.js";

test("marker inserted after READ ONLY snapshot cannot be observed until a fresh transaction",async t=>{
 const raw=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!raw){t.skip("disposable PostgreSQL unavailable");return;}
 const u=new URL(raw);
 if(!["postgres:","postgresql:"].includes(u.protocol)||
 !["127.0.0.1","localhost"].includes(u.hostname)||
 u.port!=="5432"||u.pathname!=="/seo_engine_test")throw Error("disposable_database_only");
 const setup=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const reader=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const writer=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const tenant="c4-marker-visibility",site="fixture",identity="3".repeat(64),fingerprint="4".repeat(64),attempt="c4-late-marker-001";
 const expected={attemptId:attempt,tenantId:tenant,siteId:site,jobIdentity:identity,
  fingerprint,priorFence:7,committedFence:8,priorAttempts:1,owner:"candidate"};
 t.after(async()=>{try{
  await setup`DROP TABLE IF EXISTS ugp11_transport_fixture.commit_attempts`;
  await setup`DROP FUNCTION IF EXISTS ugp11_transport_fixture.reject_commit_attempt_mutation()`;
  await setup`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
  await setup`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 }finally{await Promise.allSettled([setup.end({timeout:2}),reader.end({timeout:2}),writer.end({timeout:2})])}});
 await setup`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
 await setup`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 await setup`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint)
 VALUES(${tenant},${site},'running',1,${fingerprint})`;
 await setup`INSERT INTO ugp11_transport_fixture.jobs(identity,tenant_id,site_id,idempotency_key,
 job_class,envelope_fingerprint,upstream_fingerprint,control_revision,control_fingerprint,
 slot_at,expires_at,admission_expires_at,status,worker_id,claimed_at,lease_expires_at,fence,attempts)
 VALUES(${identity},${tenant},${site},${site},'signal_refresh',${fingerprint},${fingerprint},1,${fingerprint},
 transaction_timestamp()-interval '2 minutes',transaction_timestamp()+interval '20 minutes',
 transaction_timestamp()+interval '10 minutes','claimed','candidate',
 transaction_timestamp()-interval '2 minutes',transaction_timestamp()+interval '1 minute',8,2)`;
 await reader.begin("isolation level repeatable read",async tx=>{
  await tx`SET TRANSACTION READ ONLY`;
  const [job]=await tx`SELECT worker_id,fence,attempts FROM ugp11_transport_fixture.jobs
   WHERE identity=${identity} AND tenant_id=${tenant} AND site_id=${site}`;
  assert.equal(Number(job!.fence),8);
  const inserted=await writer`INSERT INTO ugp11_transport_fixture.commit_attempts
   (attempt_id,tenant_id,site_id,job_identity,payload_fingerprint,prior_fence,committed_fence)
   VALUES(${attempt},${tenant},${site},${identity},${fingerprint},7,8) RETURNING attempt_id`;
  assert.equal(inserted.length,1);
  const invisible=await tx`SELECT attempt_id FROM ugp11_transport_fixture.commit_attempts
    WHERE attempt_id=${attempt} AND tenant_id=${tenant} AND site_id=${site} AND job_identity=${identity}`;
  assert.equal(invisible.length,0,"late marker must be invisible in the old snapshot");
  const snapshot=classifyIndependentObserverResult({kind:"complete",markers:[],
   job:{workerId:String(job!.worker_id),fence:Number(job!.fence),attempts:Number(job!.attempts)},
   transactionClosed:true});
  assert.equal(snapshot.kind,"partial");
  const d=reconcileFencedCommitEvidence(expected,snapshot);
  assert.equal(d.outcome,"manual_intervention_required");
  assert.equal(d.automaticRetryAllowed,false);
  assert.equal(d.providerDispatchAllowed,false);
  assert.equal(d.productionAuthority,false);
 });
 const fresh=await reader`SELECT attempt_id FROM ugp11_transport_fixture.commit_attempts
  WHERE attempt_id=${attempt} AND tenant_id=${tenant} AND site_id=${site} AND job_identity=${identity}`;
 assert.equal(fresh.length,1,"only a fresh transaction may see the newly committed marker");
});
