/** UGP-11.C4: disposable PostgreSQL rollback and conservative quarantine evidence.
 * No uncertain-commit detection is claimed; fixture writes confer no P9 authority.
 */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
const tenant="c4-ambiguous",site="rollback",identity="8".repeat(64),hash="a".repeat(64);
test("C4 disposable SQL: rolled-back lease mutation preserves state; suspected outcome quarantines",async t=>{
 const url=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!url){t.skip("dedicated disposable database absent");return;}
 const u=new URL(url);
 if(!["postgres:","postgresql:"].includes(u.protocol)||
    !["localhost","127.0.0.1"].includes(u.hostname)||
    u.pathname!=="/seo_engine_test")throw Error("disposable_database_only");
 const db=postgres(url,{max:3,prepare:false,connect_timeout:8,idle_timeout:2});
 t.after(async()=>{try{
  await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
  await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 }finally{await db.end({timeout:2});}});
 await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
 await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 await db`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint)
 VALUES(${tenant},${site},'running',1,${hash})`;
 await db`INSERT INTO ugp11_transport_fixture.jobs(identity,tenant_id,site_id,idempotency_key,
 job_class,envelope_fingerprint,upstream_fingerprint,control_revision,control_fingerprint,
 slot_at,expires_at,admission_expires_at,status,worker_id,claimed_at,lease_expires_at,fence,attempts)
 VALUES(${identity},${tenant},${site},'ambiguous-key','signal_refresh',${hash},${hash},
 1,${hash},transaction_timestamp()-interval '2 minutes',
 transaction_timestamp()+interval '20 minutes',transaction_timestamp()+interval '10 minutes',
 'claimed','old-owner',transaction_timestamp()-interval '2 minutes',
 transaction_timestamp()-interval '1 minute',7,1)`;
 await assert.rejects(db.begin(async tx=>{
  const takeover=await tx`UPDATE ugp11_transport_fixture.jobs
   SET worker_id='candidate',fence=fence+1,attempts=attempts+1,
   claimed_at=transaction_timestamp(),lease_expires_at=transaction_timestamp()+interval '1 minute'
   WHERE identity=${identity} AND status='claimed' AND worker_id='old-owner' AND fence=7
   AND lease_expires_at<transaction_timestamp() RETURNING fence`;
  assert.equal(Number(takeover[0]?.fence),8);
  throw Error("deliberate_rollback_fixture");
 }),/deliberate_rollback_fixture/);
 const before=await db`SELECT status,worker_id,fence,attempts,receipt_fingerprint
 FROM ugp11_transport_fixture.jobs WHERE identity=${identity}`;
 assert.equal(before[0]?.status,"claimed");assert.equal(before[0]?.worker_id,"old-owner");
 assert.equal(Number(before[0]?.fence),7);assert.equal(Number(before[0]?.attempts),1);
 // Independently conservative decision for a simulated untrusted result, not
 // evidence of an actual PostgreSQL ambiguous network commit.
 const quarantined=await db`UPDATE ugp11_transport_fixture.jobs SET
 status='manual_intervention',lease_expires_at=NULL,worker_id=NULL,claimed_at=NULL,
 updated_at=transaction_timestamp()
 WHERE identity=${identity} AND status='claimed' AND worker_id='old-owner' AND fence=7
 RETURNING status`;
 assert.equal(quarantined[0]?.status,"manual_intervention");
 const retry=await db`UPDATE ugp11_transport_fixture.jobs SET
 status='claimed',worker_id='candidate',fence=fence+1,attempts=attempts+1,
 claimed_at=transaction_timestamp(),lease_expires_at=transaction_timestamp()+interval '1 minute'
 WHERE identity=${identity} AND status='claimed' AND fence=7 RETURNING identity`;
 assert.equal(retry.length,0);
 const final=await db`SELECT status,worker_id,fence,attempts,receipt_fingerprint
 FROM ugp11_transport_fixture.jobs WHERE identity=${identity}`;
 assert.equal(final[0]?.status,"manual_intervention");
 assert.equal(final[0]?.worker_id,null);
 assert.equal(Number(final[0]?.fence),7);
 assert.equal(Number(final[0]?.attempts),1);
 assert.equal(final[0]?.receipt_fingerprint,null);
});
