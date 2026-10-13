/** UGP-11.C4 disposable-only PostgreSQL observation adapter.
 * Transaction completion is derived from postgres.begin resolving, not caller input.
 * No writer, retries, provider dispatch, or production connection allowed.
 */
import postgres from "postgres";
import type {EvidenceSnapshot} from "./ugp-11-c4-fenced-evidence-reconcile.js";
import {classifyIndependentObserverResult} from "./ugp-11-c4-observer-read-classifier.js";

export type DisposableObserverKey=Readonly<{attemptId:string;tenantId:string;siteId:string;jobIdentity:string}>;
export async function observeDisposableFencedEvidence(raw:string,key:DisposableObserverKey):Promise<EvidenceSnapshot>{
 let u:URL;
 try{u=new URL(raw)}catch{return {kind:"unavailable"}}
 if(!["postgres:","postgresql:"].includes(u.protocol)||
  !["127.0.0.1","localhost"].includes(u.hostname)||
  u.port!=="5432"||u.pathname!=="/seo_engine_test"||
  !key.attemptId||!key.tenantId||!key.siteId||!/^[0-9a-f]{64}$/.test(key.jobIdentity))
  return {kind:"unavailable"};
 const db=postgres(raw,{max:1,prepare:false,connect_timeout:5,idle_timeout:2});
 try{
  // Only this resolved transaction can supply a completed observation.
  const read=await db.begin("isolation level repeatable read",async tx=>{
   // The independent observer must never acquire write capability.
   await tx`SET TRANSACTION READ ONLY`;
   const jobs=await tx`SELECT worker_id,fence,attempts
    FROM ugp11_transport_fixture.jobs
    WHERE identity=${key.jobIdentity} AND tenant_id=${key.tenantId} AND site_id=${key.siteId}
    FOR SHARE`;
   if(jobs.length!==1) return {kind:"incomplete" as const,reason:"job_not_unique"};
   const markers=await tx`SELECT attempt_id,tenant_id,site_id,job_identity,payload_fingerprint,
      prior_fence,committed_fence FROM ugp11_transport_fixture.commit_attempts
      WHERE attempt_id=${key.attemptId} AND tenant_id=${key.tenantId}
      AND site_id=${key.siteId} AND job_identity=${key.jobIdentity}`;
   const row=jobs[0]!;
   return {kind:"complete" as const,transactionClosed:true as const,
    job:{workerId:String(row.worker_id),fence:Number(row.fence),attempts:Number(row.attempts)},
    markers:markers.map(m=>({attemptId:String(m.attempt_id),tenantId:String(m.tenant_id),
     siteId:String(m.site_id),jobIdentity:String(m.job_identity).trim(),
     fingerprint:String(m.payload_fingerprint).trim(),priorFence:Number(m.prior_fence),
     committedFence:Number(m.committed_fence)}))};
  });
  return classifyIndependentObserverResult(read);
 }catch(error){
  return classifyIndependentObserverResult({kind:"failed",error});
 }finally{
  await db.end({timeout:2}).catch(()=>{});
 }
}
