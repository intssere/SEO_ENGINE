/**
 * RT01-A12.20 — DISPOSABLE PG17 ONLY.
 * Single transaction, ordered DB row locks, DB-clock custody rechecks and
 * grant/job/admission/event atomic mutation. No runtime imports or exports.
 * Not a production RLS/role/issuer attestation implementation.
 */
import {randomUUID,createHash} from "node:crypto";
import type postgres from "postgres";
import {
  type TransactionCustodyPort,type TransactionRequest,type TxResult,
  validTransactionRequest,evidenceMatches,type AuthoritativeEvidence
} from "./pilot-01-rt01a12-8-disconnected-transaction.js";
import {
  type AdmissionReceipt,type ReadOperation
} from "./pilot-01-rt01a12-4-disconnected-admission-contract.js";

type Client=ReturnType<typeof postgres>;
const digest=(v:string)=>createHash("sha256").update(v).digest("hex");
const clean=(s:unknown):s is string=>typeof s==="string"&&s.length>0&&s.length<=256&&s.trim()===s;
const checkedDigest=(s:unknown)=>typeof s==="string"&&/^[0-9a-f]{64}$/.test(s);
type SessionRow={id:string;subject:string;role:"viewer"|"operator"|"admin";revoked_at:Date|null;expires_at:Date};
type SiteRow={id:string;organization_id:string;is_active:boolean};
type MemberRow={organization_id:string;subject:string;role:"viewer"|"operator"|"admin";
 active:boolean;revoked_at:Date|null;expires_at:Date;revision:string};
type IssuerRow={issuer_id:string;organization_id:string;site_id:string;actor_subject:string;
 operation:ReadOperation;provenance_sha256:string;active:boolean;revoked_at:Date|null;
 expires_at:Date;revision:string};
type GrantRow={grant_id:string;state:string;issuer_provenance_sha256:string};
type ReceiptRow={admission_id:string;job_id:string;grant_id:string;organization_id:string;
 site_id:string;actor_subject:string;issuer_id:string;operation:ReadOperation;
 idempotency_key:string;request_sha256:string;transaction_id:string;committed_at:Date;
 session_id:string;issuer_provenance_sha256:string};
function receipt(r:ReceiptRow):AdmissionReceipt{
  return {admissionId:r.admission_id,jobId:r.job_id,grantId:r.grant_id,
    organizationId:r.organization_id,siteId:r.site_id,actorSubject:r.actor_subject,
    issuerId:r.issuer_id,operation:r.operation,idempotencyKey:r.idempotency_key,
    requestSha256:r.request_sha256.trim(),transactionId:r.transaction_id,
    committedAt:new Date(r.committed_at).toISOString(),sessionId:r.session_id,
    issuerProvenanceSha256:r.issuer_provenance_sha256.trim()};
}
function receiptMatches(r:AdmissionReceipt,x:TransactionRequest):boolean{
  return r.organizationId===x.scope.organizationId&&r.siteId===x.scope.siteId&&
    r.actorSubject===x.scope.actorSubject&&r.sessionId===x.scope.sessionId&&
    r.issuerId===x.scope.issuerId&&r.operation===x.scope.operation&&
    r.grantId===x.intent.grantId&&r.idempotencyKey===x.intent.idempotencyKey&&
    r.requestSha256===x.intent.requestSha256&&
    clean(r.jobId)&&clean(r.admissionId)&&clean(r.transactionId);
}
/** Unexported by workspace package index. Constructor requires literal CI-only arming. */
export class DisposableAtomicCustodyAdapter implements TransactionCustodyPort {
  constructor(private readonly db:Client,authorization:string,
    private readonly afterCustodyLocks?:()=>Promise<void>){
    if(authorization!=="RT01_A12_20_ATTESTED_EMPTY_PG17_ONLY")throw Error("A12_20_REFUSE_RUNTIME_ADAPTER");
  }
  async admitWithCustody(x:TransactionRequest):Promise<TxResult>{
    if(!validTransactionRequest(x))return {status:"denied"};
    const s=x.scope,i=x.intent;
    try{
      return await this.db.begin(async tx=>{
        // Lock order is stable: session -> site -> membership -> issuer -> grant.
        // PostgreSQL row UPDATE revocations of the same records block on these locks.
        // Privileged/noncooperating owner DDL and cross-table deletions are out of scope.
        const session=await tx.unsafe<SessionRow[]>(
          "SELECT id::text,subject,role,revoked_at,expires_at FROM public.auth_sessions "+
          "WHERE id=$1 FOR UPDATE",[s.sessionId]);
        if(session.length!==1||session[0].subject!==s.actorSubject)return {status:"denied" as const};
        const site=await tx.unsafe<SiteRow[]>(
          "SELECT id::text,organization_id::text,is_active FROM public.sites "+
          "WHERE id=$1 FOR UPDATE",[s.siteId]);
        if(site.length!==1||site[0].organization_id!==s.organizationId)return {status:"denied" as const};
        const member=await tx.unsafe<MemberRow[]>(
          "SELECT organization_id::text,subject,role,active,revoked_at,expires_at,revision::text "+
          "FROM pilot01.tenant_memberships WHERE organization_id=$1 AND subject=$2 FOR UPDATE",
          [s.organizationId,s.actorSubject]);
        if(member.length!==1)return {status:"denied" as const};
        const issuer=await tx.unsafe<IssuerRow[]>(
          "SELECT issuer_id,organization_id::text,site_id::text,actor_subject,operation,"+
          "provenance_sha256,active,revoked_at,expires_at,revision::text "+
          "FROM pilot01.issuer_custody WHERE issuer_id=$1 FOR UPDATE",[s.issuerId]);
        if(issuer.length!==1)return {status:"denied" as const};
        const grant=await tx.unsafe<GrantRow[]>(
          "SELECT grant_id::text,state,issuer_provenance_sha256 "+
          "FROM pilot01.grants WHERE grant_id=$1 AND organization_id=$2 AND site_id=$3 "+
          "AND actor_subject=$4 AND session_id=$5 AND issuer_id=$6 AND operation=$7 FOR UPDATE",
          [i.grantId,s.organizationId,s.siteId,s.actorSubject,s.sessionId,s.issuerId,s.operation]);
        if(grant.length!==1)return {status:"denied" as const};
        // Trusted DB clock AFTER acquiring locks, never a browser-supplied timestamp.
        const time=await tx.unsafe<{now:Date}[]>("SELECT clock_timestamp() AS now");
        const dbNow=time[0].now.getTime(),m=member[0],u=issuer[0],g=grant[0],se=session[0];
        const evidence:AuthoritativeEvidence={
          scope:s,sessionActive:se.revoked_at===null&&["operator","admin"].includes(se.role),
          sessionRevoked:se.revoked_at!==null,sessionExpiresAt:se.expires_at.getTime(),
          siteActive:site[0].is_active,membershipActive:m.active,membershipRevoked:m.revoked_at!==null,
          membershipExpiresAt:m.expires_at.getTime(),membershipRevision:Number(m.revision),
          membershipRole:m.role,issuerActive:u.active,issuerRevoked:u.revoked_at!==null,
          issuerExpiresAt:u.expires_at.getTime(),issuerRevision:Number(u.revision),
          issuerProvenanceSha256:u.provenance_sha256.trim()
        };
        if(!evidenceMatches(x,evidence,dbNow)||
          u.organization_id!==s.organizationId||u.site_id!==s.siteId||
          u.actor_subject!==s.actorSubject||u.operation!==s.operation||
          !checkedDigest(u.provenance_sha256.trim())||
          u.provenance_sha256.trim()!==g.issuer_provenance_sha256.trim())
          return {status:"denied" as const};
        // A serial idempotency key: protect against different grants racing in same tenant.
        await tx.unsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
          [s.organizationId+":"+i.idempotencyKey]);
        const existing=await tx.unsafe<ReceiptRow[]>(
          "SELECT a.*,g.session_id::text,g.issuer_provenance_sha256 FROM pilot01.admissions a "+
          "JOIN pilot01.grants g ON g.grant_id=a.grant_id "+
          "WHERE a.organization_id=$1 AND a.idempotency_key=$2",
          [s.organizationId,i.idempotencyKey]);
        if(existing.length){
          const r=receipt(existing[0]);
          return receiptMatches(r,x)?{status:"committed" as const,receipt:r,
            membershipRevision:Number(m.revision),issuerRevision:Number(u.revision)}
            :{status:"conflict" as const};
        }
        if(g.state!=="issued")return {status:"denied" as const};\n        // Synthetic test-only interleaving; locks stay held for the whole transaction.\n        if(this.afterCustodyLocks)await this.afterCustodyLocks();
        const consumed=await tx.unsafe<{grant_id:string}[]>(
          "UPDATE pilot01.grants SET state='consumed',consumed_at=clock_timestamp() "+
          "WHERE grant_id=$1 AND state='issued' AND expires_at>clock_timestamp() RETURNING grant_id",
          [i.grantId]);
        if(consumed.length!==1)return {status:"denied" as const};
        const jobId=randomUUID(),admissionId=randomUUID();
        await tx.unsafe(
          "INSERT INTO pilot01.jobs(job_id,grant_id,organization_id,site_id,actor_subject,issuer_id,operation) "+
          "VALUES($1,$2,$3,$4,$5,$6,$7)",
          [jobId,i.grantId,s.organizationId,s.siteId,s.actorSubject,s.issuerId,s.operation]);
        const admitted=await tx.unsafe<ReceiptRow[]>(
          "INSERT INTO pilot01.admissions(admission_id,job_id,grant_id,organization_id,site_id,"+
          "actor_subject,issuer_id,operation,idempotency_key,request_sha256,transaction_id) "+
          "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,txid_current()::text) RETURNING *",
          [admissionId,jobId,i.grantId,s.organizationId,s.siteId,s.actorSubject,s.issuerId,
          s.operation,i.idempotencyKey,i.requestSha256]);
        const event=await tx.unsafe<{event_id:string}[]>(
          "INSERT INTO pilot01.job_events(admission_id,job_id,grant_id,organization_id,site_id,"+
          "event_kind,generation,event_sha256) VALUES($1,$2,$3,$4,$5,'admitted',0,$6) RETURNING event_id",
          [admissionId,jobId,i.grantId,s.organizationId,s.siteId,digest("admitted:"+admissionId)]);
        if(event.length!==1)throw Error("ATOMIC_EVENT_REQUIRED");
        const r=receipt({...admitted[0],session_id:s.sessionId,
          issuer_provenance_sha256:u.provenance_sha256});
        return {status:"committed" as const,receipt:r,
          membershipRevision:Number(m.revision),issuerRevision:Number(u.revision)};
      });
    }catch{return {status:"commit_unknown"};}
  }
  async reconcileReadOnly(x:TransactionRequest):Promise<TxResult>{
    if(!validTransactionRequest(x))return {status:"denied"};
    try{
      const found=await this.db.unsafe<ReceiptRow[]>(
        "SELECT a.*,g.session_id::text,g.issuer_provenance_sha256 FROM pilot01.admissions a "+
        "JOIN pilot01.grants g ON g.grant_id=a.grant_id "+
        "WHERE a.organization_id=$1 AND a.idempotency_key=$2",
        [x.scope.organizationId,x.intent.idempotencyKey]);
      if(!found.length)return {status:"unavailable"};
      const r=receipt(found[0]);
      if(!receiptMatches(r,x))return {status:"conflict"};
      // Read-only lookup never calls the admission write path. If historical
      // revision provenance is not persisted in the receipt, do not synthesize
      // a "committed" revision from caller input. Explicitly return unavailable.
      return {status:"unavailable"};
    }catch{return {status:"unavailable"};}
  }
}
