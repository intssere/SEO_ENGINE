/** UGP-11.C4: disposable-only post-observation fence drift certification.
 * Observation is historical evidence, never a live authorization or retry grant.
 */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {observeDisposableFencedEvidence} from "./ugp-11-c4-disposable-observer-adapter.js";
import {reconcileFencedCommitEvidence} from "./ugp-11-c4-fenced-evidence-reconcile.js";

test("post-release fence advance does not turn historical observation into current-state authority",async t=>{
 const raw=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!raw){t.skip("dedicated disposable database absent");return;}
 const u=new URL(raw);
 if(!["postgres:","postgresql:"].includes(u.protocol)||
 !["localhost","127.0.0.1"].includes(u.hostname)||u.port!=="5432"||u.pathname!=="/seo_engine_test")
 throw Error("disposable_database_only");
 const db=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const key={attemptId:"c4-post-release-001",tenantId:"c4-post-release-tenant",siteId:"snapshot",jobIdentity:"e".repeat(64)};
 const fingerprint="f".repeat(64);
 t.after(async()=>{try{
   await db`DROP TABLE IF EXISTS ugp11_transport_fixture.commit_attempts`;
   await db`DROP FUNCTION IF EXISTS ugp11_transport_fixture.reject_commit_attempt_mutation()`;
   await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${key.tenantId}`;
   await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${key.tenantId}`;
 }finally{await db.end({timeout:2})}});
 await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${key.tenantId}`;
 await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${key.tenantId}`;
 await db`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint)
 VALUES(${key.tenantId},${key.siteId},'running',1,${fingerprint})`;
 await db`INSERT INTO ugp11_transport_fixture.jobs(identity,tenant_id,site_id,idempotency_key,
 job_class,envelope_fingerprint,upstream_fingerprint,control_revision,control_fingerprint,
 slot_at,expires_at,admission_expires_at,status,worker_id,claimed_at,lease_expires_at,fence,attempts)
 VALUES(${key.jobIdentity},${key.tenantId},${key.siteId},${key.siteId},'signal_refresh',
 ${fingerprint},${fingerprint},1,${fingerprint},transaction_timestamp()-interval '2 minutes',
 transaction_timestamp()+interval '20 minutes',transaction_timestamp()+interval '10 minutes',
 'claimed','candidate',transaction_timestamp()-interval '2 minutes',
 transaction_timestamp()+interval '1 minute',8,2)`;
 await db`INSERT INTO ugp11_transport_fixture.commit_attempts(attempt_id,tenant_id,site_id,
 job_identity,payload_fingerprint,prior_fence,committed_fence)
 VALUES(${key.attemptId},${key.tenantId},${key.siteId},${key.jobIdentity},${fingerprint},7,8)`;
 const expected={...key,fingerprint,priorFence:7,committedFence:8,priorAttempts:1,owner:"candidate"};
 const first=await observeDisposableFencedEvidence(raw,key);
 assert.equal(first.kind,"available");
 const historical=reconcileFencedCommitEvidence(expected,first);
 assert.equal(historical.outcome,"committed");
 assert.equal(historical.automaticRetryAllowed,false);
 assert.equal(historical.providerDispatchAllowed,false);
 assert.equal(historical.productionAuthority,false);
 // This independent write happens only AFTER the observer transaction completed.
 const changed=await db`UPDATE ugp11_transport_fixture.jobs SET worker_id='later-owner',
 fence=fence+1,attempts=attempts+1 WHERE identity=${key.jobIdentity} AND fence=8 RETURNING fence`;
 assert.equal(changed.length,1);
 const second=await observeDisposableFencedEvidence(raw,key);
 assert.equal(second.kind,"available");
 const latest=reconcileFencedCommitEvidence(expected,second);
 assert.equal(latest.outcome,"manual_intervention_required");
 assert.equal(latest.automaticRetryAllowed,false);
 assert.equal(latest.providerDispatchAllowed,false);
 assert.equal(latest.productionAuthority,false);
 // The original evidence still describes its old committed transaction: it must
 // NEVER be promoted into permission to act on a now-changed fenced job.
 assert.equal(reconcileFencedCommitEvidence(expected,first).productionAuthority,false);
});
