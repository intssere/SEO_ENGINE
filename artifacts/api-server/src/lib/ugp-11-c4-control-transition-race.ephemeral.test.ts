/** UGP-11.C4: disposable control-transition/denied-claim race tests.
 * Only fixture_only sources exist. No successful claim, sender or worker.
 */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {attemptClosedFixtureClaim, type ClosedClaimAttempt} from "./ugp-11-1d6-closed-claim.js";
const modes=["paused","draining","killed"] as const;
const digest="a".repeat(64);
const tenant="c4-race-tenant";
test("C4 control transition racing with claim attempts never admits fixture authority",async t=>{
 const url=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!url){t.skip("disposable database URL not configured");return;}
 const u=new URL(url);
 if(!["postgres:","postgresql:"].includes(u.protocol)||
    !["localhost","127.0.0.1"].includes(u.hostname)||
    u.pathname!=="/seo_engine_test") throw Error("disposable_database_only");
 const db=postgres(url,{max:6,prepare:false,connect_timeout:8,idle_timeout:2});
 t.after(async()=>{
   try{await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
       await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;}
   finally{await db.end({timeout:2});}
 });
 await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
 await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 for(const [index,mode] of modes.entries()){
   const site="c4-race-"+mode;
   const identity=String(index+1).repeat(64);
   await db`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint)
       VALUES(${tenant},${site},'running',1,${digest})`;
   await db`INSERT INTO ugp11_transport_fixture.jobs
     (identity,tenant_id,site_id,idempotency_key,job_class,envelope_fingerprint,
      upstream_fingerprint,control_revision,control_fingerprint,slot_at,expires_at,
      admission_expires_at)
     VALUES(${identity},${tenant},${site},${"key-"+mode},'signal_refresh',
       ${digest},${digest},1,${digest},transaction_timestamp()-interval '1 minute',
       transaction_timestamp()+interval '20 minutes',transaction_timestamp()+interval '10 minutes')`;
   // A held control-row lock makes competing readers/writers serialize; no positive
   // issuer row can be inserted because source is CHECK-constrained fixture_only.
   const transition=db.begin(async tx=>{
     const lock=await tx`SELECT mode FROM ugp11_transport_fixture.controls
       WHERE tenant_id=${tenant} AND site_id=${site} FOR UPDATE`;
     assert.equal(lock[0]?.mode,"running");
     const changed=await tx`UPDATE ugp11_transport_fixture.controls
       SET mode=${mode},revision=2,updated_at=transaction_timestamp()
       WHERE tenant_id=${tenant} AND site_id=${site} AND mode='running' AND revision=1
       RETURNING mode,revision`;
     assert.equal(changed[0]?.mode,mode);
   });
   const claimAttempts: Promise<ClosedClaimAttempt[]> = Promise.all(Array.from({length:5},(_,i): Promise<ClosedClaimAttempt> =>
     attemptClosedFixtureClaim(url,{identity,tenantId:tenant,siteId:site,workerId:"c4-racer-"+i})
   ));
   const attempts: ClosedClaimAttempt[] = await claimAttempts;
   await transition;
   for(const result of attempts)
     assert.deepEqual(result,{claimed:false,dispatchAllowed:false,reason:"no_certified_p9_authority"});
   const [control]=await db`SELECT mode,revision,source FROM ugp11_transport_fixture.controls
     WHERE tenant_id=${tenant} AND site_id=${site}`;
   const [job]=await db`SELECT status,fence,attempts,worker_id,receipt_fingerprint
     FROM ugp11_transport_fixture.jobs WHERE identity=${identity}`;
   assert.equal(control.mode,mode);
   assert.equal(Number(control.revision),2);
   assert.equal(control.source,"fixture_only");
   assert.equal(job.status,"queued");
   assert.equal(Number(job.fence),0);
   assert.equal(job.attempts,0);
   assert.equal(job.worker_id,null);
   assert.equal(job.receipt_fingerprint,null);
 }
});
