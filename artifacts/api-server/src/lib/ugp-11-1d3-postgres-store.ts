/**
 * UGP-11.1D3: isolated persistent transport storage.
 * No process startup hooks, scheduler, provider dispatch, or production migration.
 * Claim is intentionally blocked pending durable P9 control integration.
 */
import postgres from "postgres";
import { canonicalJobIdentity, type AdmittedJob } from "./ugp-11-1b-transport.js";

const HEX=/^[0-9a-f]{64}$/;
const SAFE=/^[a-zA-Z0-9._:-]{1,128}$/;
export type DurableTransportRow=Readonly<{
 identity:string; tenantId:string; siteId:string; state:string;
 fence:number; attempts:number; workerId:string|null
}>;
export class Ugp11IsolatedPostgresStore {
 private readonly db:ReturnType<typeof postgres>;
 constructor(input:{databaseUrl:string}) {
   if(typeof input?.databaseUrl!=="string")throw new Error("database_url_explicitly_required");
   const parsed=new URL(input.databaseUrl);
   if(!["postgres:","postgresql:"].includes(parsed.protocol) ||
      !["localhost","127.0.0.1"].includes(parsed.hostname) ||
      parsed.pathname!=="/seo_engine_test") throw new Error("isolated_disposable_postgres_only");
   this.db=postgres(input.databaseUrl,{max:4,prepare:false,connect_timeout:8,idle_timeout:2});
 }
 async close():Promise<void>{await this.db.end({timeout:2});}
 private async assertSchema():Promise<void>{
   const found=await this.db`SELECT to_regclass('ugp11_transport_fixture.jobs')::text AS name`;
   if(found[0]?.name!=="ugp11_transport_fixture.jobs")throw new Error("fixture_schema_not_installed");
 }
 async enqueue(job:AdmittedJob):Promise<{kind:"created"|"exact_replay"|"conflict";row:DurableTransportRow|null}>{
   await this.assertSchema();
   if(canonicalJobIdentity(job.envelope)!==job.identity)throw new Error("job_identity_mismatch");
   const e=job.envelope;
   // This store does not grant execution admission. This method persists an inert candidate.
   const inserted=await this.db`INSERT INTO ugp11_transport_fixture.jobs
     (identity,tenant_id,site_id,idempotency_key,job_class,envelope_fingerprint,upstream_fingerprint,
       control_revision,control_fingerprint,slot_at,expires_at,admission_expires_at)
     VALUES (${job.identity},${e.tenantId},${e.siteId},${e.idempotencyKey},${e.jobClass},
       ${job.identity},${e.upstreamFingerprint},${e.controlRevision},${e.controlFingerprint},
       ${e.slotAt},${e.expiresAt},${e.admissionExpiresAt})
     ON CONFLICT DO NOTHING RETURNING identity`;
   const rows=await this.db`SELECT identity,tenant_id,site_id,idempotency_key,envelope_fingerprint,
     status,fence,attempts,worker_id FROM ugp11_transport_fixture.jobs
     WHERE tenant_id=${e.tenantId} AND site_id=${e.siteId} AND idempotency_key=${e.idempotencyKey}`;
   const row=rows[0];
   if(!row || row.identity.trim()!==job.identity || row.envelope_fingerprint.trim()!==job.identity)
     return {kind:"conflict",row:null};
   return {kind:inserted.length?"created":"exact_replay",
     row:{identity:row.identity.trim(),tenantId:row.tenant_id,siteId:row.site_id,
       state:row.status,fence:Number(row.fence),attempts:Number(row.attempts),workerId:row.worker_id}};
 }
 async inspect(identity:string,tenantId:string,siteId:string):Promise<DurableTransportRow|null>{
   await this.assertSchema();
   if(!HEX.test(identity)||!SAFE.test(tenantId)||!SAFE.test(siteId))throw new Error("invalid_inspection_scope");
   const rows=await this.db`SELECT identity,tenant_id,site_id,status,fence,attempts,worker_id
     FROM ugp11_transport_fixture.jobs WHERE identity=${identity} AND tenant_id=${tenantId} AND site_id=${siteId}`;
   const r=rows[0];return r?{identity:r.identity.trim(),tenantId:r.tenant_id,siteId:r.site_id,state:r.status,
     fence:Number(r.fence),attempts:Number(r.attempts),workerId:r.worker_id}:null;
 }
 async claim():Promise<never>{throw new Error("durable_p9_control_mapping_not_certified");}
 async dispatch():Promise<never>{throw new Error("external_execution_not_authorized");}
}
