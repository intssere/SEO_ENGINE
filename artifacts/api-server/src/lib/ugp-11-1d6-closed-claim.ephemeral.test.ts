import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { attemptClosedFixtureClaim } from "./ugp-11-1d6-closed-claim.js";
const hash="a".repeat(64),identity="d".repeat(64);
const input={identity,tenantId:"d6-tenant",siteId:"d6-site",workerId:"d6-worker"};
test("D6 closed claim refuses non-fixture DB and invalid identities",async()=>{
 await assert.rejects(attemptClosedFixtureClaim("postgres://u:p@example.org/prod",input),/disposable_database_only/);
 await assert.rejects(attemptClosedFixtureClaim("postgres://u:p@127.0.0.1/seo_engine_test",{...input,identity:"bad"}),/invalid_claim_scope/);
});
test("D6 durable running control cannot authorize claim or change fence",async t=>{
 const url=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!url){t.skip("disposable database URL not configured");return;}
 const db=postgres(url,{max:3,prepare:false});
 t.after(async()=>{
  await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id='d6-tenant'`;
  await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id='d6-tenant'`;
  await db.end({timeout:2});
 });
 await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id='d6-tenant'`;
 await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id='d6-tenant'`;
 await db`INSERT INTO ugp11_transport_fixture.jobs
 (identity,tenant_id,site_id,idempotency_key,job_class,envelope_fingerprint,upstream_fingerprint,
 control_revision,control_fingerprint,slot_at,expires_at,admission_expires_at)
 VALUES (${identity},'d6-tenant','d6-site','d6-key','signal_refresh',${hash},${hash},2,${hash},
 transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '20 minutes',
 transaction_timestamp()+interval '15 minutes')`;
 await db`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint)
 VALUES ('d6-tenant','d6-site','running',2,${hash})`;
 const attempts=await Promise.all(Array.from({length:8},()=>attemptClosedFixtureClaim(url,input)));
 for(const attempt of attempts) assert.deepEqual(attempts[0],attempt);
 assert.deepEqual(attempts[0],{claimed:false,dispatchAllowed:false,reason:"no_certified_p9_authority"});
 const state=await db`SELECT status,fence,attempts,worker_id FROM ugp11_transport_fixture.jobs WHERE identity=${identity}`;
 assert.equal(state[0]?.status,"queued");
 assert.equal(Number(state[0]?.fence),0);
 assert.equal(state[0]?.attempts,0);
 assert.equal(state[0]?.worker_id,null);
 await assert.rejects(db`UPDATE ugp11_transport_fixture.controls SET source='certified_p9' WHERE tenant_id='d6-tenant'`);
 await db`UPDATE ugp11_transport_fixture.controls SET mode='killed' WHERE tenant_id='d6-tenant'`;
 assert.equal((await attemptClosedFixtureClaim(url,input)).claimed,false);
});
