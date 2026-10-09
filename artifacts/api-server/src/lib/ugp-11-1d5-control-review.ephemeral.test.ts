import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { inspectDurableFixtureControl } from "./ugp-11-1d5-control-review.js";

const hash="a".repeat(64);
const identity="c".repeat(64);
test("UGP-11.1D5 rejects non-disposable database",async()=>{
 await assert.rejects(
  inspectDurableFixtureControl("postgres://u:p@db.example.com/prod",{identity,tenantId:"d5-tenant",siteId:"d5-site"}),
  /disposable_database_only/
 );
});
test("UGP-11.1D5 fixture controls remain non-authoritative across control transitions",async t=>{
 const url=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!url){t.skip("dedicated ephemeral DB not configured");return;}
 const db=postgres(url,{max:2,prepare:false});
 t.after(async()=>{
  await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id='d5-tenant'`;
  await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id='d5-tenant'`;
  await db.end({timeout:2});
 });
 await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id='d5-tenant'`;
 await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id='d5-tenant'`;
 const scope={identity,tenantId:"d5-tenant",siteId:"d5-site"};
 await db`INSERT INTO ugp11_transport_fixture.jobs
 (identity,tenant_id,site_id,idempotency_key,job_class,envelope_fingerprint,upstream_fingerprint,
 control_revision,control_fingerprint,slot_at,expires_at,admission_expires_at)
 VALUES (${identity},'d5-tenant','d5-site','d5-key','signal_refresh',${hash},${hash},2,${hash},
 transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '20 minutes',
 transaction_timestamp()+interval '15 minutes')`;
 assert.equal((await inspectDurableFixtureControl(url,scope)).reason,"control_missing");
 await db`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint)
 VALUES ('d5-tenant','d5-site','running',2,${hash})`;
 const good=await inspectDurableFixtureControl(url,scope);
 assert.deepEqual(good,{claimAllowed:false,dispatchAllowed:false,reason:"fixture_only_not_authoritative"});
 await db`UPDATE ugp11_transport_fixture.controls SET mode='paused' WHERE tenant_id='d5-tenant'`;
 assert.equal((await inspectDurableFixtureControl(url,scope)).reason,"control_closed_or_stale");
 await db`UPDATE ugp11_transport_fixture.controls SET mode='running',revision=3 WHERE tenant_id='d5-tenant'`;
 assert.equal((await inspectDurableFixtureControl(url,scope)).reason,"control_closed_or_stale");
 const unseen=await inspectDurableFixtureControl(url,{...scope,tenantId:"other-tenant"});
 assert.equal(unseen.reason,"job_missing");
 const row=await db`SELECT status,fence,attempts FROM ugp11_transport_fixture.jobs WHERE identity=${identity}`;
 assert.equal(row[0]?.status,"queued");assert.equal(Number(row[0]?.fence),0);
 assert.equal(row[0]?.attempts,0);
});
