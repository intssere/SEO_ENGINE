/** UGP-11.C4 disposable PostgreSQL lock-order evidence only.
 * Synthetic SQL fixture claim is never a P9 claim, worker or dispatch authority.
 */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
const tenant="c4-lock-cert",hash="a".repeat(64);
const modes=["killed","paused","draining"] as const;
function dbUrl():string|null{
 const raw=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!raw)return null;
 const u=new URL(raw);
 if(!["postgres:","postgresql:"].includes(u.protocol)||
 !["localhost","127.0.0.1"].includes(u.hostname)||
 u.pathname!=="/seo_engine_test")throw Error("disposable_database_only");
 return raw;
}
test("C4 isolated SQL: locked control serializes close-before-claim and claim-before-kill",async t=>{
 const url=dbUrl();
 if(!url){t.skip("disposable database URL absent");return;}
 const db=postgres(url,{max:6,prepare:false,connect_timeout:8,idle_timeout:2});
 t.after(async()=>{
  try{
   await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
   await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
  }finally{await db.end({timeout:2});}
 });
 await db`DELETE FROM ugp11_transport_fixture.jobs WHERE tenant_id=${tenant}`;
 await db`DELETE FROM ugp11_transport_fixture.controls WHERE tenant_id=${tenant}`;
 for(const [i,mode] of modes.entries()){
  for(const order of ["close-first","claim-first"] as const){
   const site=`c4-${i}-${order}`,identity=String(i+1).repeat(64);
   // Identity is unique across sites AND all cases (globally primary keyed).
   const id=String(i+1)+String(order==="close-first"?4:5).repeat(63);
   await db`INSERT INTO ugp11_transport_fixture.controls
     (tenant_id,site_id,mode,revision,fingerprint)
     VALUES(${tenant},${site},'running',1,${hash})`;
   await db`INSERT INTO ugp11_transport_fixture.jobs
     (identity,tenant_id,site_id,idempotency_key,job_class,envelope_fingerprint,
     upstream_fingerprint,control_revision,control_fingerprint,slot_at,expires_at,admission_expires_at)
     VALUES(${id},${tenant},${site},${site},'signal_refresh',${hash},${hash},1,${hash},
     transaction_timestamp()-interval '1 minute',transaction_timestamp()+interval '20 minutes',
     transaction_timestamp()+interval '10 minutes')`;
   const close=async()=>{
    return db.begin(async tx=>{
     const rows=await tx`SELECT mode FROM ugp11_transport_fixture.controls
       WHERE tenant_id=${tenant} AND site_id=${site} FOR UPDATE`;
     assert.equal(rows[0]?.mode,"running");
     return tx`UPDATE ugp11_transport_fixture.controls SET mode=${mode},revision=revision+1
       WHERE tenant_id=${tenant} AND site_id=${site} RETURNING revision`;
    });
   };
   const syntheticClaim=async()=>{
    return db.begin(async tx=>{
     const controls=await tx`SELECT mode,revision,source FROM ugp11_transport_fixture.controls
       WHERE tenant_id=${tenant} AND site_id=${site} FOR UPDATE`;
     if(controls[0]?.mode!=="running"||Number(controls[0]?.revision)!==1||
        controls[0]?.source!=="fixture_only")return false;
     const changed=await tx`UPDATE ugp11_transport_fixture.jobs
       SET status='claimed',worker_id='synthetic-only',fence=fence+1,attempts=attempts+1,
       claimed_at=transaction_timestamp(),lease_expires_at=transaction_timestamp()+interval '1 minute'
       WHERE identity=${id} AND status='queued' AND control_revision=1 RETURNING fence`;
     return changed.length===1;
    });
   };
   if(order==="close-first"){
    const closed=await close(); assert.equal(Number(closed[0]?.revision),2);
    assert.equal(await syntheticClaim(),false);
   }else{
    assert.equal(await syntheticClaim(),true);
    const closed=await close(); assert.equal(Number(closed[0]?.revision),2);
   }
   const [row]=await db`SELECT j.status,j.worker_id,j.fence,j.attempts,c.mode,c.revision,c.source
     FROM ugp11_transport_fixture.jobs j JOIN ugp11_transport_fixture.controls c
     ON c.tenant_id=j.tenant_id AND c.site_id=j.site_id WHERE j.identity=${id}`;
   assert.equal(row.mode,mode);
   assert.equal(Number(row.revision),2);
   assert.equal(row.source,"fixture_only");
   assert.equal(row.status,order==="close-first"?"queued":"claimed");
   assert.equal(Number(row.fence),order==="close-first"?0:1);
   assert.equal(Number(row.attempts),order==="close-first"?0:1);
   const invalidSettle=await db`UPDATE ugp11_transport_fixture.jobs j SET
     status='completed',worker_id=NULL,claimed_at=NULL,lease_expires_at=NULL
     WHERE j.identity=${id} AND j.status='claimed' AND j.fence=1
     AND EXISTS(SELECT 1 FROM ugp11_transport_fixture.controls c WHERE
     c.tenant_id=j.tenant_id AND c.site_id=j.site_id AND c.mode='running'
     AND c.revision=j.control_revision AND c.source='certified_p9')
     RETURNING j.identity`;
   assert.equal(invalidSettle.length,0,"fixture_only must never authorize settlement");
  }
 }
});
