/**
 * UGP-11.1D5: disposable fixture control inspection. This is deliberately NOT
 * an authorization API and never updates or claims a job.
 */
import postgres from "postgres";

const HEX=/^[0-9a-f]{64}$/;
const ID=/^[a-zA-Z0-9._:-]{1,128}$/;
export type DurableControlReview=Readonly<{
  claimAllowed:false; dispatchAllowed:false;
  reason:"invalid_scope"|"job_missing"|"control_missing"|"control_closed_or_stale"|"work_window_closed"|"fixture_only_not_authoritative";
}>;
export async function inspectDurableFixtureControl(
  databaseUrl:string, input:{identity:string;tenantId:string;siteId:string}
):Promise<DurableControlReview>{
  if(typeof databaseUrl!=="string")throw Error("explicit_ephemeral_database_required");
  const url=new URL(databaseUrl);
  if(!["postgres:","postgresql:"].includes(url.protocol) ||
     !["127.0.0.1","localhost"].includes(url.hostname) ||
     url.pathname!=="/seo_engine_test")throw Error("disposable_database_only");
  const db=postgres(databaseUrl,{max:1,prepare:false,connect_timeout:8,idle_timeout:2});
  try {
    return await db.begin(async tx=>{
      if(!HEX.test(input.identity)||!ID.test(input.tenantId)||!ID.test(input.siteId))
        return {claimAllowed:false,dispatchAllowed:false,reason:"invalid_scope"} as const;
      const jobs=await tx`SELECT identity,control_revision,control_fingerprint,slot_at,expires_at,admission_expires_at
        FROM ugp11_transport_fixture.jobs WHERE identity=${input.identity}
        AND tenant_id=${input.tenantId} AND site_id=${input.siteId} FOR SHARE`;
      if(jobs.length!==1)return {claimAllowed:false,dispatchAllowed:false,reason:"job_missing"} as const;
      const controls=await tx`SELECT mode,revision,fingerprint,source
        FROM ugp11_transport_fixture.controls WHERE tenant_id=${input.tenantId}
        AND site_id=${input.siteId} FOR SHARE`;
      if(controls.length!==1)return {claimAllowed:false,dispatchAllowed:false,reason:"control_missing"} as const;
      const j=jobs[0], c=controls[0];
      if(c.mode!=="running" || Number(c.revision)!==Number(j.control_revision) ||
         c.fingerprint.trim()!==j.control_fingerprint.trim())
        return {claimAllowed:false,dispatchAllowed:false,reason:"control_closed_or_stale"} as const;
      const now=await tx`SELECT transaction_timestamp() AS at`;
      const at=new Date(now[0].at).getTime();
      if(at<new Date(j.slot_at).getTime() || at>=new Date(j.expires_at).getTime() ||
         at>=new Date(j.admission_expires_at).getTime())
        return {claimAllowed:false,dispatchAllowed:false,reason:"work_window_closed"} as const;
      // A matching fixture record is NOT proof of independently durable P9 authority.
      return {claimAllowed:false,dispatchAllowed:false,reason:"fixture_only_not_authoritative"} as const;
    });
  }finally{await db.end({timeout:2});}
}
