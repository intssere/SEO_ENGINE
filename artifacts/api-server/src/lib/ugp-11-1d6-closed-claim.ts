/**
 * UGP-11.1D6: fixture-only atomic claim admission NEGATIVE test boundary.
 * The controls schema permits ONLY source='fixture_only', so no existing row
 * can meet the independent-authority gate. This module cannot grant a claim.
 * It is never imported by a worker, route, timer or runtime startup.
 */
import postgres from "postgres";

const HEX=/^[0-9a-f]{64}$/;
const ID=/^[a-zA-Z0-9._:-]{1,128}$/;
export type ClosedClaimAttempt=Readonly<{
 claimed:false; dispatchAllowed:false; reason:"no_certified_p9_authority";
}>;

export async function attemptClosedFixtureClaim(
 databaseUrl:string,
 input:{identity:string;tenantId:string;siteId:string;workerId:string},
):Promise<ClosedClaimAttempt>{
 if(typeof databaseUrl!=="string")throw Error("explicit_ephemeral_database_required");
 const url=new URL(databaseUrl);
 if(!["postgres:","postgresql:"].includes(url.protocol) ||
   !["localhost","127.0.0.1"].includes(url.hostname) ||
   url.pathname!=="/seo_engine_test")throw Error("disposable_database_only");
 if(!HEX.test(input.identity)||![input.tenantId,input.siteId,input.workerId].every(v=>ID.test(v)))
   throw Error("invalid_claim_scope");
 const db=postgres(databaseUrl,{max:1,prepare:false,connect_timeout:8,idle_timeout:2});
 try {
  return await db.begin(async tx=>{
   // Single statement compares both durable control and job state atomically.
   // source='certified_p9' is deliberately IMPOSSIBLE under the D5 CHECK constraint.
   // Claim fencing/worker metadata is updated only if a future separately-reviewed
   // authority schema actually admits independently certified durable evidence.
   const rows=await tx`UPDATE ugp11_transport_fixture.jobs AS j SET
     status='claimed',
     worker_id=${input.workerId},
     claimed_at=transaction_timestamp(),
     lease_expires_at=transaction_timestamp()+interval '30 seconds',
     fence=j.fence+1,
     attempts=j.attempts+1,
     updated_at=transaction_timestamp()
    FROM ugp11_transport_fixture.controls AS c
    WHERE j.identity=${input.identity} AND j.tenant_id=${input.tenantId}
      AND j.site_id=${input.siteId} AND j.status='queued'
      AND j.attempts<8
      AND transaction_timestamp()>=j.slot_at
      AND transaction_timestamp()<j.expires_at
      AND transaction_timestamp()<j.admission_expires_at
      AND c.tenant_id=j.tenant_id AND c.site_id=j.site_id
      AND c.mode='running' AND c.revision=j.control_revision
      AND c.fingerprint=j.control_fingerprint
      AND c.source='certified_p9'
    RETURNING j.identity`;
   if(rows.length!==0)throw Error("unauthorized_fixture_claim_invariant_broken");
   return {claimed:false,dispatchAllowed:false,reason:"no_certified_p9_authority"} as const;
  });
 }finally{await db.end({timeout:2});}
}
