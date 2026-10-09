import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { prepareAdmittedJob, type JobEnvelope } from "./ugp-11-1b-transport.js";
import { Ugp11IsolatedPostgresStore } from "./ugp-11-1d3-postgres-store.js";

const h="a".repeat(64), bad="b".repeat(64);
const fixture:JobEnvelope={
 version:"ugp-11-1b-transport-v1",siteId:"fixture-site-d3",tenantId:"fixture-tenant-d3",
 jobClass:"signal_refresh",upstreamId:"fixture-intent",upstreamFingerprint:h,scopeFingerprint:h,
 idempotencyKey:"d3-candidate",slotAt:"2026-10-08T10:00:00.000Z",
 expiresAt:"2026-10-08T11:00:00.000Z",admissionId:"d3-admission",
 admissionFingerprint:h,admissionExpiresAt:"2026-10-08T10:30:00.000Z",
 controlRevision:1,controlFingerprint:h
};
test("UGP-11.1D3 refuses database outside dedicated fixture",()=>{
 assert.throws(()=>new Ugp11IsolatedPostgresStore({databaseUrl:"postgres://u:p@db.example.com:5432/prod"}),/isolated_disposable_postgres_only/);
 assert.throws(()=>new Ugp11IsolatedPostgresStore({databaseUrl:"postgres://u:p@localhost:5432/production"}),/isolated_disposable_postgres_only/);
});
test("UGP-11.1D3 durable inert enqueue and scoped inspection",async t=>{
 const url=process.env.UGP_11_EPHEMERAL_DATABASE_URL?.trim();
 if(!url){t.skip("dedicated ephemeral URL missing");return;}
 const store=new Ugp11IsolatedPostgresStore({databaseUrl:url});
 const admin=postgres(url,{max:2,prepare:false});
 t.after(async()=>{
  await admin`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id='fixture-tenant-d3'`;
  await store.close();await admin.end({timeout:2});
 });
 await admin`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id='fixture-tenant-d3'`;
 const job=prepareAdmittedJob(fixture);
 const results=await Promise.all([store.enqueue(job),store.enqueue(job)]);
 assert.deepEqual(results.map(x=>x.kind).sort(),["created","exact_replay"]);
 assert.equal((await store.inspect(job.identity,fixture.tenantId,fixture.siteId))?.state,"queued");
 assert.equal(await store.inspect(job.identity,"other-tenant",fixture.siteId),null);
 const conflicting=prepareAdmittedJob({...fixture,upstreamFingerprint:bad});
 assert.equal((await store.enqueue(conflicting)).kind,"conflict");
 await assert.rejects(store.claim(),/durable_p9_control_mapping_not_certified/);
 await assert.rejects(store.dispatch(),/external_execution_not_authorized/);
 const rows=await admin`SELECT COUNT(*)::int AS count FROM ugp11_transport_fixture.jobs WHERE tenant_id='fixture-tenant-d3'`;
 assert.equal(rows[0]?.count,1);
});
