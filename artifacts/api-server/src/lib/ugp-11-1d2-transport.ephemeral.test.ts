import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { prepareAdmittedJob, type JobEnvelope } from "./ugp-11-1b-transport.js";

/**
 * UGP-11.1D2: disposable PostgreSQL test ONLY.
 * This is not an exported queue worker or production transport.
 * Fixture DDL is loaded explicitly by the dedicated CI step.
 */
function ephemeralUrl(): string | null {
  const raw=process.env.UGP_11_EPHEMERAL_DATABASE_URL?.trim();
  if(!raw) return null;
  const u=new URL(raw);
  if(!["127.0.0.1","localhost"].includes(u.hostname) || u.pathname!=="/seo_engine_test"
    || !["postgres:","postgresql:"].includes(u.protocol)) throw new Error("ugp11_ephemeral_url_not_allowlisted");
  return raw;
}
const a="a".repeat(64), b="b".repeat(64);
const envelope: JobEnvelope={
  version:"ugp-11-1b-transport-v1",siteId:"fixture-site",tenantId:"fixture-tenant",
  jobClass:"signal_refresh",upstreamId:"fixture-intent",upstreamFingerprint:a,scopeFingerprint:a,
  idempotencyKey:"fixture-idk",slotAt:"2026-10-08T10:00:00.000Z",expiresAt:"2026-10-08T11:00:00.000Z",
  admissionId:"fixture-admission",admissionFingerprint:a,
  admissionExpiresAt:"2026-10-08T10:30:00.000Z",controlRevision:1,controlFingerprint:a,
};
const TABLE="ugp11_transport_fixture.jobs";
test("UGP-11.1D2 disposable PostgreSQL uniqueness, concurrent claim and fencing",async(t)=>{
  const url=ephemeralUrl();
  if(!url){t.skip("UGP_11_EPHEMERAL_DATABASE_URL unset");return;}
  const db=postgres(url,{max:4,prepare:false,connect_timeout:8,idle_timeout:2});
  t.after(async()=>{await db.unsafe("DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id='fixture-tenant'");await db.end({timeout:1});});
  const schema=await db`SELECT to_regclass('ugp11_transport_fixture.jobs')::text AS relation`;
  assert.equal(schema[0]?.relation,TABLE,"fixture must be explicitly migrated in CI");
  await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id='fixture-tenant'`;
  const job=prepareAdmittedJob(envelope);
  const insert=()=>db`INSERT INTO ugp11_transport_fixture.jobs
    (identity,tenant_id,site_id,idempotency_key,job_class,envelope_fingerprint,upstream_fingerprint,
    control_revision,control_fingerprint,slot_at,expires_at,admission_expires_at)
    VALUES (${job.identity},${envelope.tenantId},${envelope.siteId},${envelope.idempotencyKey},
      ${envelope.jobClass},${job.identity},${envelope.upstreamFingerprint},
      ${envelope.controlRevision},${envelope.controlFingerprint},
      ${envelope.slotAt},${envelope.expiresAt},${envelope.admissionExpiresAt})
    ON CONFLICT (identity) DO NOTHING RETURNING identity`;
  await t.test("concurrent duplicate producers yield one durable row",async()=>{
    const attempts=await Promise.all([insert(),insert()]);
    assert.equal(attempts.reduce((n,x)=>n+x.length,0),1);
    const rows=await db`SELECT COUNT(*)::int AS count FROM ugp11_transport_fixture.jobs WHERE tenant_id='fixture-tenant'`;
    assert.equal(rows[0]?.count,1);
  });
  await t.test("same scope/key with altered identity is rejected",async()=>{
    await assert.rejects(db`INSERT INTO ugp11_transport_fixture.jobs
      (identity,tenant_id,site_id,idempotency_key,job_class,envelope_fingerprint,upstream_fingerprint,
      control_revision,control_fingerprint,slot_at,expires_at,admission_expires_at)
      VALUES (${b},${envelope.tenantId},${envelope.siteId},${envelope.idempotencyKey},
       ${envelope.jobClass},${b},${b},1,${a},${envelope.slotAt},${envelope.expiresAt},${envelope.admissionExpiresAt})`,
      /duplicate key|unique constraint/i);
  });
  await t.test("two competing claim transactions cannot own same row",async()=>{
    const claim=(worker:string)=>db.begin(async tx=>{
      const row=await tx`SELECT identity FROM ugp11_transport_fixture.jobs
        WHERE identity=${job.identity} AND status='queued'
        FOR UPDATE SKIP LOCKED LIMIT 1`;
      if(row.length===0)return false;
      const update=await tx`UPDATE ugp11_transport_fixture.jobs
        SET status='claimed',worker_id=${worker},claimed_at=transaction_timestamp(),
          lease_expires_at=transaction_timestamp()+interval '5 minutes',
          fence=fence+1,attempts=attempts+1,updated_at=transaction_timestamp()
        WHERE identity=${job.identity} AND status='queued' RETURNING fence`;
      assert.equal(update[0]?.fence,"1");
      return true;
    });
    const claims=await Promise.all([claim("worker-a"),claim("worker-b")]);
    assert.equal(claims.filter(Boolean).length,1);
    const rows=await db`SELECT fence, attempts, status, worker_id FROM ugp11_transport_fixture.jobs WHERE identity=${job.identity}`;
    assert.equal(rows[0]?.status,"claimed");assert.equal(rows[0]?.attempts,1);
  });
  await t.test("stale fence cannot settle and unknown outcome quarantines",async()=>{
    const stale=await db`UPDATE ugp11_transport_fixture.jobs SET status='completed',
     lease_expires_at=NULL,receipt_fingerprint=${a}
     WHERE identity=${job.identity} AND fence=0 AND status='claimed' RETURNING identity`;
    assert.equal(stale.length,0);
    const unknown=await db`UPDATE ugp11_transport_fixture.jobs
      SET status='manual_intervention',lease_expires_at=NULL,updated_at=transaction_timestamp()
      WHERE identity=${job.identity} AND fence=1 AND status='claimed' RETURNING status`;
    assert.equal(unknown[0]?.status,"manual_intervention");
    const terminal=await db`SELECT status FROM ugp11_transport_fixture.jobs WHERE identity=${job.identity}`;
    assert.equal(terminal[0]?.status,"manual_intervention");
  });
});
