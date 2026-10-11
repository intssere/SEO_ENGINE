/** UGP-11.C4: strict lease boundaries in disposable fixture SQL only.
 * No P9 claim API, runtime worker, issuer, or provider authority.
 */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
const tenant="c4-boundary",hash="a".repeat(64);
test("C4 disposable PostgreSQL strict lease expiry: future/equal denied, past allowed once",async t=>{
 const url=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!url){t.skip("disposable database unset");return;}
 const u=new URL(url);
 if(!["postgres:","postgresql:"].includes(u.protocol)||
  !["127.0.0.1","localhost"].includes(u.hostname)||u.pathname!=="/seo_engine_test")
  throw Error("disposable_database_only");
 const db=postgres(url,{max:3,prepare:false,connect_timeout:8,idle_timeout:2});
 t.after(async()=>{try{
  await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
  await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 }finally{await db.end({timeout:2});}});
 await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
 await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 for(const [index,offset] of [1,0,-1].entries()){
  const site="case-"+index,identity=String(index+1).repeat(64);
  await db`INSERT INTO ugp11_transport_fixture.controls
   (tenant_id,site_id,mode,revision,fingerprint)
   VALUES(${tenant},${site},'running',1,${hash})`;
  await db`INSERT INTO ugp11_transport_fixture.jobs
   (identity,tenant_id,site_id,idempotency_key,job_class,envelope_fingerprint,
    upstream_fingerprint,control_revision,control_fingerprint,slot_at,expires_at,
    admission_expires_at,status,worker_id,fence,attempts,claimed_at,lease_expires_at)
   VALUES(${identity},${tenant},${site},${site},'signal_refresh',${hash},${hash},
    1,${hash},transaction_timestamp()-interval '1 minute',
    transaction_timestamp()+interval '20 minutes',
    transaction_timestamp()+interval '10 minutes','claimed','A',7,1,
    transaction_timestamp()-interval '2 minutes',transaction_timestamp()+${offset}*interval '1 second')`;
  // Same database transaction_timestamp() anchors equality and takeover.
  // Tests are independent of the host clock and scheduler timing.
  await db.begin(async tx=>{
   await tx`UPDATE ugp11_transport_fixture.jobs SET
     lease_expires_at=transaction_timestamp()+${offset}*interval '1 second'
     WHERE identity=${identity}`;
   const attempt=await tx`UPDATE ugp11_transport_fixture.jobs SET
     worker_id='B',fence=fence+1,attempts=attempts+1,
     claimed_at=transaction_timestamp(),
     lease_expires_at=transaction_timestamp()+interval '60 seconds'
     WHERE identity=${identity} AND status='claimed' AND worker_id='A'
      AND fence=7 AND lease_expires_at<transaction_timestamp()
     RETURNING fence`;
   assert.equal(attempt.length,offset<0?1:0);
  });
  const [row]=await db`SELECT worker_id,fence,attempts FROM ugp11_transport_fixture.jobs WHERE identity=${identity}`;
  assert.equal(row.worker_id,offset<0?"B":"A");
  assert.equal(Number(row.fence),offset<0?8:7);
  assert.equal(Number(row.attempts),offset<0?2:1);

 }
});
