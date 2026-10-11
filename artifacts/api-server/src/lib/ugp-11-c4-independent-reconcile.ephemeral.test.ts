/** UGP-11.C4: independent fresh-connection outcome reconciliation.
 * This does NOT inject a real connection failure at COMMIT or certify P9.
 */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";

const tenant = "c4-reconcile";
const hash = "a".repeat(64);
const baseline = { worker_id: "old-owner", fence: 7, attempts: 1 };
const changed = { worker_id: "candidate", fence: 8, attempts: 2 };

type Observation = { worker_id: string | null; fence: number | string; attempts: number | string };
function classify(observed: Observation | undefined): "committed" | "rolled_back" | "unresolved" {
  if (!observed) return "unresolved";
  const actual = { worker_id: observed.worker_id, fence: Number(observed.fence), attempts: Number(observed.attempts) };
  if (actual.worker_id === changed.worker_id && actual.fence === changed.fence && actual.attempts === changed.attempts) return "committed";
  if (actual.worker_id === baseline.worker_id && actual.fence === baseline.fence && actual.attempts === baseline.attempts) return "rolled_back";
  return "unresolved";
}

test("C4 independent PostgreSQL reconciliation distinguishes committed, rollback, unresolved", async t => {
  const url = process.env.UGP_11_EPHEMERAL_DATABASE_URL;
  if (!url) { t.skip("dedicated disposable database absent"); return; }
  const u = new URL(url);
  if (!["postgres:", "postgresql:"].includes(u.protocol) ||
      !["localhost", "127.0.0.1"].includes(u.hostname) ||
      u.pathname !== "/seo_engine_test") throw Error("disposable_database_only");
  const writer = postgres(url, { max: 1, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  // Distinct client pool and physical connection, no shared transaction/session.
  const reader = postgres(url, { max: 1, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  t.after(async () => {
    try {
      await reader`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
      await reader`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
    } finally { await Promise.all([reader.end({ timeout: 2 }), writer.end({ timeout: 2 })]); }
  });
  await reader`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
  await reader`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;

  for (const [index, shouldCommit] of [true, false].entries()) {
    const site = "case-" + index, identity = String(index + 3).repeat(64);
    await writer`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint)
      VALUES(${tenant},${site},'running',1,${hash})`;
    await writer`INSERT INTO ugp11_transport_fixture.jobs(identity,tenant_id,site_id,idempotency_key,
      job_class,envelope_fingerprint,upstream_fingerprint,control_revision,control_fingerprint,
      slot_at,expires_at,admission_expires_at,status,worker_id,claimed_at,lease_expires_at,fence,attempts)
      VALUES(${identity},${tenant},${site},${site},'signal_refresh',${hash},${hash},1,${hash},
      transaction_timestamp()-interval '2 minutes',transaction_timestamp()+interval '20 minutes',
      transaction_timestamp()+interval '10 minutes','claimed','old-owner',
      transaction_timestamp()-interval '2 minutes',transaction_timestamp()-interval '1 minute',7,1)`;

    const change = async () => writer.begin(async tx => {
      const result = await tx`UPDATE ugp11_transport_fixture.jobs
        SET worker_id='candidate',fence=fence+1,attempts=attempts+1,
        claimed_at=transaction_timestamp(),lease_expires_at=transaction_timestamp()+interval '1 minute'
        WHERE identity=${identity} AND worker_id='old-owner' AND status='claimed'
        AND fence=7 AND lease_expires_at<transaction_timestamp()
        RETURNING identity`;
      assert.equal(result.length, 1);
      if (!shouldCommit) throw Error("injected_before_commit_rollback");
    });
    if (shouldCommit) await change();
    else await assert.rejects(change(), /injected_before_commit_rollback/);

    // Do not trust the writer's acknowledgement as reconciliation evidence.
    const [observed] = await reader`SELECT worker_id,fence,attempts
      FROM ugp11_transport_fixture.jobs WHERE identity=${identity} AND tenant_id=${tenant} AND site_id=${site}`;
    assert.equal(classify(observed as Observation | undefined), shouldCommit ? "committed" : "rolled_back");
    assert.equal((await reader`SELECT COUNT(*)::int AS count
      FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant} AND site_id=${site} AND idempotency_key=${site}`)[0]?.count, 1);
  }
  assert.equal(classify(undefined), "unresolved");
  assert.equal(classify({ worker_id: "unexpected", fence: 8, attempts: 2 }), "unresolved");
  // Unknown result must never be converted into an automatic retry permission.
});
