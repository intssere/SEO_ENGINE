/** Isolated C4 PostgreSQL lease rollover race. No operational P9 claim. */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
const tenant="c4-lease-race",site="lease",id="7".repeat(64),hash="a".repeat(64);
test("C4 disposable SQL lease rollover allows one successor and fences old owner",async t=>{
 const url=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!url){t.skip("disposable database unset");return;}
 const u=new URL(url);
 if(!["postgres:","postgresql:"].includes(u.protocol)||!["127.0.0.1","localhost"].includes(u.hostname)||u.pathname!=="/seo_engine_test")throw Error("disposable_database_only");
 const db=postgres(url,{max:6,prepare:false,connect_timeout:8,idle_timeout:2});
 t.after(async()=>{try{
  await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
  await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 }finally{await db.end({timeout:2});}});
 await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
 await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 await db`INSERT INTO ugp11_transport_fixture.controls(tenant_id,site_id,mode,revision,fingerprint)
 VALUES(${tenant},${site},'running',1,${hash})`;
 await db`INSERT INTO ugp11_transport_fixture.jobs(identity,tenant_id,site_id,idempotency_key,job_class,
 envelope_fingerprint,upstream_fingerprint,control_revision,control_fingerprint,slot_at,expires_at,admission_expires_at,
 status,worker_id,fence,attempts,claimed_at,lease_expires_at)
 VALUES(${id},${tenant},${site},'c4-lease-key','signal_refresh',${hash},${hash},1,${hash},
 transaction_timestamp()-interval '2 minutes',transaction_timestamp()+interval '20 minutes',
 transaction_timestamp()+interval '10 minutes','claimed','A',7,1,
 transaction_timestamp()-interval '2 minutes',transaction_timestamp()-interval '1 minute')`;
 // Synthetic fixture rollover, not the production P9 claim path.
 const contender=(owner:string)=>db.begin(async tx=>{
  const control=await tx`SELECT mode,revision,source FROM ugp11_transport_fixture.controls
   WHERE tenant_id=${tenant} AND site_id=${site} FOR UPDATE`;
  if(control[0]?.mode!=="running"||Number(control[0]?.revision)!==1||control[0]?.source!=="fixture_only")return false;
  const rows=await tx`UPDATE ugp11_transport_fixture.jobs
   SET worker_id=${owner},fence=fence+1,attempts=attempts+1,
       claimed_at=transaction_timestamp(),lease_expires_at=transaction_timestamp()+interval '1 minute'
   WHERE identity=${id} AND status='claimed' AND fence=7 AND worker_id='A'
   AND lease_expires_at<transaction_timestamp() RETURNING fence`;
  return rows.length===1;
 });
 const outcomes=await Promise.all([contender("B"),contender("C")]);
 assert.equal(outcomes.filter(Boolean).length,1);
 const [row]=await db`SELECT status,worker_id,fence,attempts,receipt_fingerprint
 FROM ugp11_transport_fixture.jobs WHERE identity=${id}`;
 assert.equal(row.status,"claimed");
 assert.ok(["B","C"].includes(row.worker_id));
 assert.equal(Number(row.fence),8);
 assert.equal(Number(row.attempts),2);
 assert.equal(row.receipt_fingerprint,null);
 const heartbeat=await db`UPDATE ugp11_transport_fixture.jobs SET lease_expires_at=transaction_timestamp()+interval '5 minutes'
 WHERE identity=${id} AND status='claimed' AND worker_id='A' AND fence=7 RETURNING identity`;
 assert.equal(heartbeat.length,0);
 const settle=await db`UPDATE ugp11_transport_fixture.jobs
 SET status='completed',lease_expires_at=NULL,worker_id=NULL,claimed_at=NULL,receipt_fingerprint=${hash}
 WHERE identity=${id} AND status='claimed' AND worker_id='A' AND fence=7 RETURNING identity`;
 assert.equal(settle.length,0);
});
