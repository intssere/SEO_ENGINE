/** Disposable PostgreSQL atomic fenced mutation + attempt marker evidence.
 * This does NOT inject a lost COMMIT acknowledgement or grant retry authority.
 */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";

test("C4 durable attempt marker commits atomically with fenced mutation", async t => {
  const url = process.env.UGP_11_EPHEMERAL_DATABASE_URL;
  if (!url) { t.skip("disposable database absent"); return; }
  const u = new URL(url);
  if (!["postgres:", "postgresql:"].includes(u.protocol) ||
      !["localhost", "127.0.0.1"].includes(u.hostname) ||
      u.pathname !== "/seo_engine_test") throw Error("disposable_database_only");
  const db = postgres(url, { max: 2, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  const observer = postgres(url, { max: 1, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  const tenant = "c4-durable-attempt", hash = "a".repeat(64);
  t.after(async () => {
    try {
      await observer`DROP TABLE IF EXISTS ugp11_transport_fixture.commit_attempts`;
      await observer`DROP FUNCTION IF EXISTS ugp11_transport_fixture.reject_commit_attempt_mutation()`;
      await observer`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
      await observer`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
    } finally {
      await Promise.all([db.end({ timeout: 2 }), observer.end({ timeout: 2 })]);
    }
  });
  await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
  await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
  for (const [index, shouldCommit] of [true, false].entries()) {
    const site = "site-" + index, identity = String(index + 5).repeat(64);
    const attemptId = "attempt-" + index;
    await db`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint)
      VALUES(${tenant},${site},'running',1,${hash})`;
    await db`INSERT INTO ugp11_transport_fixture.jobs(identity,tenant_id,site_id,idempotency_key,
      job_class,envelope_fingerprint,upstream_fingerprint,control_revision,control_fingerprint,
      slot_at,expires_at,admission_expires_at,status,worker_id,claimed_at,lease_expires_at,fence,attempts)
      VALUES(${identity},${tenant},${site},${site},'signal_refresh',${hash},${hash},1,${hash},
      transaction_timestamp()-interval '2 minutes',transaction_timestamp()+interval '20 minutes',
      transaction_timestamp()+interval '10 minutes','claimed','old-owner',
      transaction_timestamp()-interval '2 minutes',transaction_timestamp()-interval '1 minute',7,1)`;
    const transact = () => db.begin(async tx => {
      const rows = await tx`UPDATE ugp11_transport_fixture.jobs
        SET worker_id='candidate',fence=fence+1,attempts=attempts+1,
        claimed_at=transaction_timestamp(),lease_expires_at=transaction_timestamp()+interval '1 minute'
        WHERE identity=${identity} AND status='claimed' AND worker_id='old-owner'
        AND fence=7 AND lease_expires_at<transaction_timestamp() RETURNING fence`;
      assert.equal(Number(rows[0]?.fence), 8);
      await tx`INSERT INTO ugp11_transport_fixture.commit_attempts
        (attempt_id,tenant_id,site_id,job_identity,payload_fingerprint,prior_fence,committed_fence)
        VALUES(${attemptId},${tenant},${site},${identity},${hash},7,8)`;
      if (!shouldCommit) throw Error("controlled_pre_commit_rollback");
    });
    if (shouldCommit) await transact();
    else await assert.rejects(transact(), /controlled_pre_commit_rollback/);
    const [row] = await observer`SELECT worker_id,fence,attempts
      FROM ugp11_transport_fixture.jobs WHERE identity=${identity}`;
    const markers = await observer`SELECT attempt_id,payload_fingerprint,committed_fence
      FROM ugp11_transport_fixture.commit_attempts
      WHERE tenant_id=${tenant} AND site_id=${site} AND job_identity=${identity}`;
    assert.equal(markers.length, shouldCommit ? 1 : 0);
    assert.equal(row?.worker_id, shouldCommit ? "candidate" : "old-owner");
    assert.equal(Number(row?.fence), shouldCommit ? 8 : 7);
    assert.equal(Number(row?.attempts), shouldCommit ? 2 : 1);
    if (shouldCommit) {
      assert.equal(markers[0]?.attempt_id, attemptId);
      assert.equal(markers[0]?.payload_fingerprint.trim(), hash);
      assert.equal(Number(markers[0]?.committed_fence), 8);
      await assert.rejects(observer`UPDATE ugp11_transport_fixture.commit_attempts
        SET payload_fingerprint=${"b".repeat(64)} WHERE attempt_id=${attemptId}`, /commit_attempt_append_only/);
      await assert.rejects(observer`DELETE FROM ugp11_transport_fixture.commit_attempts
        WHERE attempt_id=${attemptId}`, /commit_attempt_append_only/);
    }
  }
});
