/** UGP-11.C4 real PostgreSQL backend termination while COMMIT executes.
 * Disposable/local-only; proves interrupted in-flight deferred work rolls back.
 * A lost ACK *after* COMMIT remains outside this bounded experiment.
 */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";

test("C4 real backend termination during deferred COMMIT is independently reconciled", async t => {
  const url = process.env.UGP_11_EPHEMERAL_DATABASE_URL;
  if (!url) { t.skip("dedicated disposable database absent"); return; }
  const u = new URL(url);
  if (!["postgres:", "postgresql:"].includes(u.protocol) ||
    !["localhost", "127.0.0.1"].includes(u.hostname) ||
    u.pathname !== "/seo_engine_test") throw Error("disposable_database_only");
  const writer = postgres(url, { max: 1, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  const observer = postgres(url, { max: 1, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  const tenant = "c4-commit-cut", site = "interrupt", hash = "a".repeat(64);
  const identity = "9".repeat(64), attemptId = "c4-commit-cut-1";
  const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
  t.after(async () => {
    try {
      // Disposable-only DDL, after termination and reconciliation.
      await observer`DROP TABLE IF EXISTS ugp11_transport_fixture.commit_attempts`;
      await observer`DROP FUNCTION IF EXISTS ugp11_transport_fixture.pause_commit_marker()`;
      await observer`DROP FUNCTION IF EXISTS ugp11_transport_fixture.reject_commit_attempt_mutation()`;
      await observer`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
      await observer`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
    } finally {
      await Promise.allSettled([writer.end({ timeout: 2 }), observer.end({ timeout: 2 })]);
    }
  });
  await observer`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
  await observer`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
  await writer`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint)
    VALUES(${tenant},${site},'running',1,${hash})`;
  await writer`INSERT INTO ugp11_transport_fixture.jobs(identity,tenant_id,site_id,idempotency_key,
    job_class,envelope_fingerprint,upstream_fingerprint,control_revision,control_fingerprint,
    slot_at,expires_at,admission_expires_at,status,worker_id,claimed_at,lease_expires_at,fence,attempts)
    VALUES(${identity},${tenant},${site},${site},'signal_refresh',${hash},${hash},1,${hash},
    transaction_timestamp()-interval '2 minutes',transaction_timestamp()+interval '20 minutes',
    transaction_timestamp()+interval '10 minutes','claimed','old-owner',
    transaction_timestamp()-interval '2 minutes',transaction_timestamp()-interval '1 minute',7,1)`;

  let pid = 0;
  let signal!: () => void;
  const entered = new Promise<void>(resolve => { signal = resolve; });
  const attempted = writer.begin(async tx => {
    const [backend] = await tx`SELECT pg_backend_pid()::int AS pid`;
    pid = Number(backend.pid);
    const changed = await tx`UPDATE ugp11_transport_fixture.jobs SET
      worker_id='candidate',fence=fence+1,attempts=attempts+1,
      claimed_at=transaction_timestamp(),lease_expires_at=transaction_timestamp()+interval '1 minute'
      WHERE identity=${identity} AND status='claimed' AND worker_id='old-owner'
      AND fence=7 AND lease_expires_at<transaction_timestamp() RETURNING fence`;
    assert.equal(Number(changed[0]?.fence), 8);
    await tx`INSERT INTO ugp11_transport_fixture.commit_attempts
      (attempt_id,tenant_id,site_id,job_identity,payload_fingerprint,prior_fence,committed_fence)
      VALUES(${attemptId},${tenant},${site},${identity},${hash},7,8)`;
    signal(); // postgres.js sends COMMIT only after this callback returns.
  });
  // Attach a rejection handler before intentionally killing the backend.
  const settled = attempted.then(() => "resolved" as const, () => "rejected" as const);
  await entered;
  let observedCommitPhase = false;
  for (let i = 0; i < 60; i++) {
    const [activity] = await observer`SELECT query,wait_event
      FROM pg_stat_activity WHERE pid=${pid} AND datname='seo_engine_test'`;
    if (activity?.query?.trim().toUpperCase() === "COMMIT" && activity?.wait_event === "PgSleep") {
      observedCommitPhase = true;
      break;
    }
    await sleep(100);
  }
  // Do not claim the targeted COMMIT failure window unless it was observed.
  assert.equal(observedCommitPhase, true, "did_not_observe_deferred_commit_phase");
  const [termination] = await observer`SELECT pg_terminate_backend(${pid}) AS terminated`;
  assert.equal(termination.terminated, true);
  assert.equal(await settled, "rejected");
  const [row] = await observer`SELECT worker_id,fence,attempts FROM ugp11_transport_fixture.jobs
    WHERE identity=${identity} AND tenant_id=${tenant}`;
  const markers = await observer`SELECT attempt_id FROM ugp11_transport_fixture.commit_attempts
    WHERE attempt_id=${attemptId} AND tenant_id=${tenant}`;
  assert.equal(markers.length, 0);
  assert.equal(row?.worker_id, "old-owner");
  assert.equal(Number(row?.fence), 7);
  assert.equal(Number(row?.attempts), 1);
  // The failed writer connection MUST NOT be used to infer retry authority.
});
