/**
 * RT01-A12.5 — disposable-only PostgreSQL transactional adapter.
 * Never exported by package index; never constructs connections or reads env.
 * The harness is sole authorized caller. NO provider dispatch.
 */
import {createHash, randomUUID} from "node:crypto";
import type postgres from "postgres";
import {
  type AdmissionReceipt, type AdmissionResolution, type DurableAdmissionPort,
  type FencedMutation, type FencedResolution, type ServerVerifiedPrincipal,
  type AdmissionIntent, validPrincipal, validIntent, validLease,
} from "./pilot-01-rt01a12-4-disconnected-admission-contract.js";

const digest=(s:string)=>createHash("sha256").update(s).digest("hex");
type Client=ReturnType<typeof postgres>;
const receipt=(r:any):AdmissionReceipt=>({
  organizationId:r.organization_id,siteId:r.site_id,actorSubject:r.actor_subject,
  sessionId:r.session_id,issuerId:r.issuer_id,
  issuerProvenanceSha256:r.issuer_provenance_sha256.trim(),operation:r.operation,
  grantId:r.grant_id,jobId:r.job_id,admissionId:r.admission_id,
  idempotencyKey:r.idempotency_key,requestSha256:r.request_sha256.trim(),
  transactionId:r.transaction_id,committedAt:new Date(r.committed_at).toISOString(),
});
/** Injection permitted only after guarded empty-DB attestation in CI harness. */
export class DisposablePgTransactionalAdapter implements DurableAdmissionPort {
  constructor(private readonly db:Client, explicitAuthorization:string) {
    if(explicitAuthorization!=="RT01_A12_5_SYNTHETIC_DISPOSABLE_ONLY")
      throw Error("REFUSE_RUNTIME_ADAPTER");
  }
  async admitAtomically(input:{principal:ServerVerifiedPrincipal;intent:AdmissionIntent}):Promise<AdmissionResolution>{
    const {principal:p,intent:i}=input;
    if(!validPrincipal(p)||!validIntent(i)) return {status:"denied"};
    try{
      return await this.db.begin(async tx=>{
        // Serialize all idempotency races per tenant/key, including distinct grants.
        await tx.unsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
          [p.organizationId+":"+i.idempotencyKey]);
        const existing=await tx.unsafe(
          "SELECT a.*,g.session_id,g.issuer_provenance_sha256 FROM pilot01.admissions a "+
          "JOIN pilot01.grants g ON g.grant_id=a.grant_id "+
          "WHERE a.organization_id=$1 AND a.idempotency_key=$2",
          [p.organizationId,i.idempotencyKey]);
        if(existing.length){
          const r=receipt(existing[0]);
          return (r.grantId===i.grantId&&r.requestSha256===i.requestSha256&&
            r.siteId===p.siteId&&r.actorSubject===p.actorSubject&&
            r.sessionId===p.sessionId&&r.issuerId===p.issuerId&&
            r.issuerProvenanceSha256===p.issuerProvenanceSha256&&r.operation===p.operation)
            ? {status:"committed" as const,receipt:r}:{status:"conflict" as const};
        }
        const grant=await tx.unsafe(
          "UPDATE pilot01.grants SET state='consumed',consumed_at=clock_timestamp() "+
          "WHERE grant_id=$1 AND organization_id=$2 AND site_id=$3 AND actor_subject=$4 "+
          "AND session_id=$5 AND issuer_id=$6 AND issuer_provenance_sha256=$7 "+
          "AND operation=$8 AND state='issued' AND expires_at>clock_timestamp() "+
          "RETURNING grant_id",
          [i.grantId,p.organizationId,p.siteId,p.actorSubject,p.sessionId,p.issuerId,
           p.issuerProvenanceSha256,p.operation]);
        if(grant.length!==1)return {status:"denied" as const};
        const jobId=randomUUID(),admissionId=randomUUID();
        await tx.unsafe(
          "INSERT INTO pilot01.jobs(job_id,grant_id,organization_id,site_id,actor_subject,issuer_id,operation) "+
          "VALUES($1,$2,$3,$4,$5,$6,$7)",
          [jobId,i.grantId,p.organizationId,p.siteId,p.actorSubject,p.issuerId,p.operation]);
        const rows=await tx.unsafe(
          "INSERT INTO pilot01.admissions(admission_id,job_id,grant_id,organization_id,site_id,"+
          "actor_subject,issuer_id,operation,idempotency_key,request_sha256,transaction_id) "+
          "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,txid_current()::text) RETURNING *",
          [admissionId,jobId,i.grantId,p.organizationId,p.siteId,p.actorSubject,p.issuerId,
           p.operation,i.idempotencyKey,i.requestSha256]);
        const event=await tx.unsafe(
          "INSERT INTO pilot01.job_events(admission_id,job_id,grant_id,organization_id,site_id,"+
          "event_kind,generation,event_sha256) VALUES($1,$2,$3,$4,$5,'admitted',0,$6) RETURNING event_id",
          [admissionId,jobId,i.grantId,p.organizationId,p.siteId,
           digest("admitted:"+admissionId)]);
        if(event.length!==1)throw Error("RECEIPT_EVENT_NOT_ATOMIC");
        return {status:"committed" as const,receipt:receipt({
          ...rows[0],session_id:p.sessionId,issuer_provenance_sha256:p.issuerProvenanceSha256,
        })};
      });
    }catch{return {status:"commit_unknown"};}
  }
  async reconcileAdmission(input:{principal:ServerVerifiedPrincipal;intent:AdmissionIntent}):Promise<AdmissionResolution>{
    const {principal:p,intent:i}=input;
    if(!validPrincipal(p)||!validIntent(i))return {status:"denied"};
    try{
      const rows=await this.db.unsafe(
        "SELECT a.*,g.session_id,g.issuer_provenance_sha256 FROM pilot01.admissions a "+
        "JOIN pilot01.grants g ON g.grant_id=a.grant_id "+
        "WHERE a.organization_id=$1 AND a.idempotency_key=$2",
        [p.organizationId,i.idempotencyKey]);
      if(!rows.length)return {status:"unavailable"};
      const r=receipt(rows[0]);
      return (r.grantId===i.grantId&&r.requestSha256===i.requestSha256&&
        r.siteId===p.siteId&&r.actorSubject===p.actorSubject&&r.sessionId===p.sessionId&&
        r.issuerId===p.issuerId&&r.issuerProvenanceSha256===p.issuerProvenanceSha256&&
        r.operation===p.operation)?{status:"committed",receipt:r}:{status:"conflict"};
    }catch{return {status:"unavailable"};}
  }
  async mutateWithFence(input:FencedMutation):Promise<FencedResolution>{
    const {token:t,intentSha256:h,kind}=input;
    if(!validLease(t)||!(/^[0-9a-f]{64}$/.test(h))||
      !["renew","complete","fail","cancel","outbox_eligible"].includes(kind))
      return {status:"denied"};
    // The lease is validated against PostgreSQL's clock, NOT a client timestamp.
    if(kind==="outbox_eligible")return {status:"denied"}; // No dispatch eligibility in A12.5
    try{
      return await this.db.begin(async tx=>{
        const next=kind==="renew"?"claimed":kind==="complete"?"completed":
          kind==="fail"?"failed":"cancelled";
        const done=next!=="claimed";
        const row=await tx.unsafe(
          "UPDATE pilot01.jobs SET state=$1, "+
          "lease_expires_at=CASE WHEN $2 THEN lease_expires_at ELSE clock_timestamp()+interval '60 seconds' END, "+
          "finished_at=CASE WHEN $2 THEN clock_timestamp() ELSE finished_at END "+
          "WHERE job_id=$3 AND organization_id=$4 AND site_id=$5 AND worker_owner=$6 "+
          "AND generation=$7 AND state='claimed' AND lease_expires_at>clock_timestamp() "+
          "RETURNING job_id,grant_id,organization_id,site_id,generation",
          [next,done,t.jobId,t.organizationId,t.siteId,t.workerOwner,t.generation]);
        if(row.length!==1)return {status:"fenced" as const};
        const r=row[0];
        const admission=await tx.unsafe(
          "SELECT admission_id FROM pilot01.admissions WHERE job_id=$1 AND grant_id=$2 "+
          "AND organization_id=$3 AND site_id=$4",
          [r.job_id,r.grant_id,r.organization_id,r.site_id]);
        if(admission.length!==1)throw Error("MISSING_DURABLE_ADMISSION");
        const ev=await tx.unsafe(
          "INSERT INTO pilot01.job_events(admission_id,job_id,grant_id,organization_id,site_id,"+
          "event_kind,worker_owner,generation,event_sha256) "+
          "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING event_id",
          [admission[0].admission_id,r.job_id,r.grant_id,r.organization_id,r.site_id,
           kind==="renew"?"renewed":kind==="complete"?"completed":kind==="fail"?"failed":"cancelled",
           t.workerOwner,t.generation,digest(randomUUID()+":"+h)]);
        if(ev.length!==1)throw Error("MISSING_TRANSITION_EVENT");
        return {status:"applied" as const,generation:t.generation,evidenceId:ev[0].event_id as string};
      });
    }catch{return {status:"commit_unknown"};}
  }
}
