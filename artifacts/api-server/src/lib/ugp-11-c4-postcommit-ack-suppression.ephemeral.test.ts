/** UGP-11.C4: post-commit acknowledgement suppression, not a socket-loss test.
 * A real PostgreSQL COMMIT completes, but a synthetic caller boundary withholds
 * the successful acknowledgement. Reconcile via an independent connection.
 */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";

test("C4 committed mutation survives suppressed acknowledgement without replay", async t => {
 const url=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!url){t.skip("dedicated disposable database absent");return;}
 const u=new URL(url);
 if(!["postgres:","postgresql:"].includes(u.protocol)||
    !["localhost","127.0.0.1"].includes(u.hostname)||u.pathname!=="/seo_engine_test")
   throw Error("disposable_database_only");
 const writer=postgres(url,{max:1,prepare:false,connect_timeout:8,idle_timeout:2});
 const reader=postgres(url,{max:1,prepare:false,connect_timeout:8,idle_timeout:2});
 const tenant="c4-ack-suppression",site="ack",identity="e".repeat(64);
 const hash="a".repeat(64),attempt="ack-suppressed-1";
 t.after(async()=>{
   try {
     await reader`DROP TABLE IF EXISTS ugp11_transport_fixture.commit_attempts`;
     await reader`DROP FUNCTION IF EXISTS ugp11_transport_fixture.reject_commit_attempt_mutation()`;
     await reader`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
     await reader`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
   } finally {await Promise.allSettled([writer.end({timeout:2}),reader.end({timeout:2})]);}
 });
 await reader`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
 await reader`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 await writer`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint)
 VALUES(${tenant},${site},'running',1,${hash})`;
 await writer`INSERT INTO ugp11_transport_fixture.jobs(identity,tenant_id,site_id,idempotency_key,
 job_class,envelope_fingerprint,upstream_fingerprint,control_revision,control_fingerprint,
 slot_at,expires_at,admission_expires_at,status,worker_id,claimed_at,lease_expires_at,fence,attempts)
 VALUES(${identity},${tenant},${site},${site},'signal_refresh',${hash},${hash},1,${hash},
 transaction_timestamp()-interval '2 minutes',transaction_timestamp()+interval '20 minutes',
 transaction_timestamp()+interval '10 minutes','claimed','old-owner',
 transaction_timestamp()-interval '2 minutes',transaction_timestamp()-interval '1 minute',7,1)`;
 // This truly commits to PostgreSQL, but the caller never receives success.
 await assert.rejects(async()=>{
   await writer.begin(async tx=>{
     const updated=await tx`UPDATE ugp11_transport_fixture.jobs SET
       worker_id='candidate',fence=fence+1,attempts=attempts+1,
       claimed_at=transaction_timestamp(),lease_expires_at=transaction_timestamp()+interval '1 minute'
       WHERE identity=${identity} AND status='claimed' AND worker_id='old-owner'
       AND fence=7 AND lease_expires_at<transaction_timestamp() RETURNING fence`;
     assert.equal(Number(updated[0]?.fence),8);
     await tx`INSERT INTO ugp11_transport_fixture.commit_attempts
       (attempt_id,tenant_id,site_id,job_identity,payload_fingerprint,prior_fence,committed_fence)
       VALUES(${attempt},${tenant},${site},${identity},${hash},7,8)`;
   });
   throw Error("synthetic_ack_suppressed_after_confirmed_commit");
 },/synthetic_ack_suppressed_after_confirmed_commit/);
 const [observed]=await reader`SELECT worker_id,fence,attempts
   FROM ugp11_transport_fixture.jobs WHERE identity=${identity}`;
 const marker=await reader`SELECT attempt_id,payload_fingerprint,committed_fence
   FROM ugp11_transport_fixture.commit_attempts
   WHERE attempt_id=${attempt} AND tenant_id=${tenant} AND site_id=${site} AND job_identity=${identity}`;
 assert.equal(marker.length,1);
 assert.equal(marker[0]?.attempt_id,attempt);
 assert.equal(marker[0]?.payload_fingerprint?.trim(),hash);
 assert.equal(Number(marker[0]?.committed_fence),8);
 assert.equal(observed?.worker_id,"candidate");
 assert.equal(Number(observed?.fence),8);
 assert.equal(Number(observed?.attempts),2);
 // Attempt ID cannot be inserted again; no second forward transition is sent.
 await assert.rejects(reader`INSERT INTO ugp11_transport_fixture.commit_attempts
   (attempt_id,tenant_id,site_id,job_identity,payload_fingerprint,prior_fence,committed_fence)
   VALUES(${attempt},${tenant},${site},${identity},${hash},7,8)`,/duplicate key/);
 const [final]=await reader`SELECT fence,attempts FROM ugp11_transport_fixture.jobs WHERE identity=${identity}`;
 assert.equal(Number(final?.fence),8);
 assert.equal(Number(final?.attempts),2);
});
