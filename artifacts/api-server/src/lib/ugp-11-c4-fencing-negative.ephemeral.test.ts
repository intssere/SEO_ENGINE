/** UGP-11.C4: PostgreSQL fixture fencing NEGATIVE certification.
 * Manual fixture transitions simulate lease rollover; there is NO successful
 * authenticated claim, dispatch, worker, provider or production authority.
 */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {attemptClosedFixtureClaim} from "./ugp-11-1d6-closed-claim.js";
const URL_ENV="UGP_11_EPHEMERAL_DATABASE_URL";
const identity="c".repeat(64),fingerprint="b".repeat(64);
const tenant="c4-fence-tenant",site="c4-fence-site";
test("C4 disposable SQL: stale owner cannot settle replacement fence; missing independent authority cannot claim",async t=>{
 const url=process.env[URL_ENV];
 if(!url){t.skip("ephemeral database not configured");return;}
 const parsed=new URL(url);
 if(!["postgres:","postgresql:"].includes(parsed.protocol)||!["localhost","127.0.0.1"].includes(parsed.hostname)||parsed.pathname!=="/seo_engine_test") throw Error("disposable_database_only");
 const db=postgres(url,{max:5,prepare:false,connect_timeout:8,idle_timeout:2});
 t.after(async()=>{await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;await db.end({timeout:2});});
 await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
 await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 await db`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint) VALUES(${tenant},${site},'running',1,${fingerprint})`;
 await db`INSERT INTO ugp11_transport_fixture.jobs(identity,tenant_id,site_id,idempotency_key,job_class,envelope_fingerprint,upstream_fingerprint,control_revision,control_fingerprint,slot_at,expires_at,admission_expires_at) VALUES(${identity},${tenant},${site},'c4-fence-key','signal_refresh',${fingerprint},${fingerprint},1,${fingerprint},transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '20 minutes',transaction_timestamp()+interval '10 minutes')`;
 const attempt=await attemptClosedFixtureClaim(url,{identity,tenantId:tenant,siteId:site,workerId:"candidate"});
 assert.deepEqual(attempt,{claimed:false,dispatchAllowed:false,reason:"no_certified_p9_authority"});
 // Fixture-only manual state construction, NOT a certified claim.
 await db`UPDATE ugp11_transport_fixture.jobs SET status='claimed',worker_id='A',fence=7,attempts=1,claimed_at=transaction_timestamp()-interval '90 seconds',lease_expires_at=transaction_timestamp()-interval '60 seconds' WHERE identity=${identity}`;
 // Explicit simulated handoff; no automatically invoked claim/reclaim path.
 const swapped=await db`UPDATE ugp11_transport_fixture.jobs SET worker_id='B',fence=fence+1,attempts=attempts+1,claimed_at=transaction_timestamp(),lease_expires_at=transaction_timestamp()+interval '30 seconds' WHERE identity=${identity} AND worker_id='A' AND fence=7 AND lease_expires_at<transaction_timestamp() RETURNING fence`;
 assert.equal(swapped.length,1);
 assert.equal(Number(swapped[0]?.fence),8);
 const stale=await Promise.all(Array.from({length:6},()=>db`UPDATE ugp11_transport_fixture.jobs SET status='completed',lease_expires_at=NULL,receipt_fingerprint=${fingerprint} WHERE identity=${identity} AND worker_id='A' AND fence=7 AND status='claimed' RETURNING identity`));
 assert.ok(stale.every(rows=>rows.length===0));
 const oldHeartbeat=await db`UPDATE ugp11_transport_fixture.jobs SET lease_expires_at=transaction_timestamp()+interval '60 seconds' WHERE identity=${identity} AND worker_id='A' AND fence=7 AND status='claimed' RETURNING identity`;
 assert.equal(oldHeartbeat.length,0);
 // Fixture control transitions never create a certified issuer, even while 'running'.
 assert.equal((await attemptClosedFixtureClaim(url,{identity,tenantId:tenant,siteId:site,workerId:"C"})).claimed,false);
 await db`UPDATE ugp11_transport_fixture.controls SET mode='killed',revision=2 WHERE tenant_id=${tenant} AND site_id=${site}`;
 assert.equal((await attemptClosedFixtureClaim(url,{identity,tenantId:tenant,siteId:site,workerId:"C"})).claimed,false);
 const final=await db`SELECT status,worker_id,fence,attempts,receipt_fingerprint FROM ugp11_transport_fixture.jobs WHERE identity=${identity}`;
 assert.equal(final[0]?.status,"claimed");
 assert.equal(final[0]?.worker_id,"B");
 assert.equal(Number(final[0]?.fence),8);
 assert.equal(Number(final[0]?.attempts),2);
 assert.equal(final[0]?.receipt_fingerprint,null);
});
