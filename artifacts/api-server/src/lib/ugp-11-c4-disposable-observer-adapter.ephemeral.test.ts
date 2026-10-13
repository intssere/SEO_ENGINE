import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {observeDisposableFencedEvidence} from "./ugp-11-c4-disposable-observer-adapter.js";
import {reconcileFencedCommitEvidence} from "./ugp-11-c4-fenced-evidence-reconcile.js";

test("resolved independent PostgreSQL transaction supplies exact fenced evidence; missing and bad connections fail closed",async t=>{
 const raw=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!raw){t.skip("dedicated disposable database absent");return;}
 const u=new URL(raw);
 if(!["postgres:","postgresql:"].includes(u.protocol)||!["127.0.0.1","localhost"].includes(u.hostname)||
 u.port!=="5432"||u.pathname!=="/seo_engine_test")throw Error("disposable_database_only");
 const admin=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const key={attemptId:"c4-adapter-observer-001",tenantId:"c4-adapter-tenant",siteId:"adapter",
  jobIdentity:"c".repeat(64)};
 const fingerprint="d".repeat(64);
 t.after(async()=>{try{
  await admin`DROP TABLE IF EXISTS ugp11_transport_fixture.commit_attempts`;
  await admin`DROP FUNCTION IF EXISTS ugp11_transport_fixture.reject_commit_attempt_mutation()`;
  await admin`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${key.tenantId}`;
  await admin`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${key.tenantId}`;
 }finally{await admin.end({timeout:2})}});
 await admin`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${key.tenantId}`;
 await admin`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${key.tenantId}`;
 await admin`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint)
 VALUES(${key.tenantId},${key.siteId},'running',1,${fingerprint})`;
 await admin`INSERT INTO ugp11_transport_fixture.jobs(identity,tenant_id,site_id,idempotency_key,
 job_class,envelope_fingerprint,upstream_fingerprint,control_revision,control_fingerprint,
 slot_at,expires_at,admission_expires_at,status,worker_id,claimed_at,lease_expires_at,fence,attempts)
 VALUES(${key.jobIdentity},${key.tenantId},${key.siteId},${key.siteId},'signal_refresh',
 ${fingerprint},${fingerprint},1,${fingerprint},
 transaction_timestamp()-interval '2 minutes',transaction_timestamp()+interval '20 minutes',
 transaction_timestamp()+interval '10 minutes','claimed','candidate',
 transaction_timestamp()-interval '2 minutes',transaction_timestamp()+interval '1 minute',8,2)`;
 await admin`INSERT INTO ugp11_transport_fixture.commit_attempts(attempt_id,tenant_id,site_id,
 job_identity,payload_fingerprint,prior_fence,committed_fence)
 VALUES(${key.attemptId},${key.tenantId},${key.siteId},${key.jobIdentity},${fingerprint},7,8)`;
 const expected={...key,fingerprint,priorFence:7,committedFence:8,priorAttempts:1,owner:"candidate"};
 const evidence=await observeDisposableFencedEvidence(raw,key);
 assert.equal(evidence.kind,"available");
 const decision=reconcileFencedCommitEvidence(expected,evidence);
 assert.equal(decision.outcome,"committed");
 assert.equal(decision.automaticRetryAllowed,false);
 assert.equal(decision.providerDispatchAllowed,false);
 assert.equal(decision.productionAuthority,false);
 const missing=await observeDisposableFencedEvidence(raw,{...key,attemptId:"no-such-attempt"});
 assert.equal(missing.kind,"partial");
 assert.equal(reconcileFencedCommitEvidence(expected,missing).outcome,"manual_intervention_required");
 for(const suffix of ["?host=example.invalid","?sslmode=disable","#unexpected"]){
  const altered=await observeDisposableFencedEvidence(raw+suffix,key);
  assert.equal(altered.kind,"unavailable","unexpected URL suffix must fail closed: "+suffix);
  assert.equal(reconcileFencedCommitEvidence(expected,altered).outcome,"manual_intervention_required");
 }
 const forbidden=await observeDisposableFencedEvidence(raw.replace("/seo_engine_test","/postgres"),key);
 assert.equal(forbidden.kind,"unavailable");
 const refused=await observeDisposableFencedEvidence(raw.replace(":5432/",":59999/"),key);
 assert.equal(refused.kind,"unavailable");
 await admin`UPDATE ugp11_transport_fixture.jobs SET fence=9,attempts=3 WHERE identity=${key.jobIdentity}`;
 const drift=await observeDisposableFencedEvidence(raw,key);
 assert.equal(reconcileFencedCommitEvidence(expected,drift).outcome,"manual_intervention_required");
});
