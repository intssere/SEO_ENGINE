/**
 * PILOT-01 RT01-A12.8 — SOURCE ONLY. No DB driver, SQL, runtime adapter or exports.
 * This is an interface for a future single-transaction, server-owned custody
 * check. Synthetic evidence and application-layer locks are NOT DB isolation.
 */
import type {AdmissionIntent, AdmissionReceipt, ReadOperation}
  from "./pilot-01-rt01a12-4-disconnected-admission-contract.js";

export type RevisionFence=Readonly<{
  membershipRevision:number;issuerRevision:number;
}>;
export type TxScope=Readonly<{
  organizationId:string;siteId:string;actorSubject:string;sessionId:string;
  issuerId:string;operation:ReadOperation;
}>;
export type TransactionRequest=Readonly<{
  scope:TxScope;intent:AdmissionIntent;fence:RevisionFence;
}>;
export type AuthoritativeEvidence=Readonly<{
  scope:TxScope;sessionActive:boolean;sessionRevoked:boolean;sessionExpiresAt:number;
  siteActive:boolean;membershipActive:boolean;membershipRevoked:boolean;
  membershipExpiresAt:number;membershipRevision:number;membershipRole:"viewer"|"operator"|"admin";
  issuerActive:boolean;issuerRevoked:boolean;issuerExpiresAt:number;
  issuerRevision:number;issuerProvenanceSha256:string;
}>;
export type TxResult=
  |Readonly<{status:"committed";receipt:AdmissionReceipt;membershipRevision:number;issuerRevision:number}>
  |Readonly<{status:"denied"|"conflict"|"unavailable"|"commit_unknown"}>;
/**
 * Future implementation MUST:
 * - resolve session by server-owned identity, and organization from trusted site;
 * - lock/version-fence session, site, membership, issuer and authorization
 *   at the same durable transaction boundary as grant consumption, idempotency,
 *   job/admission/event/outbox creation;
 * - serialize revocation against admission, or use an equivalent version-fenced
 *   mechanism with documented isolation and transactional conflict handling;
 * - use trusted DB time and never accept browser-provided evidence;
 * - treat ambiguous commit as commit_unknown and only reconcile read-only.
 * This port is NOT implemented here and is NOT wired into the runtime.
 */
export interface TransactionCustodyPort{
  admitWithCustody(request:TransactionRequest):Promise<TxResult>;
  reconcileReadOnly(request:TransactionRequest):Promise<TxResult>;
}
const id=(x:unknown):x is string=>typeof x==="string"&&x.length>0&&x.length<=256&&x.trim()===x;
const digest=(x:unknown):x is string=>typeof x==="string"&&/^[0-9a-f]{64}$/.test(x);
const revision=(x:unknown):x is number=>Number.isSafeInteger(x)&&Number(x)>0;
export function validTransactionRequest(value:unknown):value is TransactionRequest{
  if(!value||typeof value!=="object")return false;
  const x=value as Partial<TransactionRequest>;
  const s=x.scope,i=x.intent,f=x.fence;
  return !!s&&[s.organizationId,s.siteId,s.actorSubject,s.sessionId,s.issuerId].every(id)&&
    (s.operation==="analyze"||s.operation==="recommend")&&!!i&&
    id(i.grantId)&&id(i.idempotencyKey)&&digest(i.requestSha256)&&
    !!f&&revision(f.membershipRevision)&&revision(f.issuerRevision);
}
/** Shape check only. Future custody must be independently verified inside a DB transaction. */
export function evidenceMatches(r:TransactionRequest,e:AuthoritativeEvidence,dbNow:number):boolean{
  if(!validTransactionRequest(r)||!e||!Number.isFinite(dbNow))return false;
  const s=r.scope,t=e.scope;
  return !!t&&s.organizationId===t.organizationId&&s.siteId===t.siteId&&
    s.actorSubject===t.actorSubject&&s.sessionId===t.sessionId&&
    s.issuerId===t.issuerId&&s.operation===t.operation&&
    e.sessionActive===true&&e.sessionRevoked===false&&e.sessionExpiresAt>dbNow&&
    e.siteActive===true&&e.membershipActive===true&&e.membershipRevoked===false&&
    e.membershipExpiresAt>dbNow&&["operator","admin"].includes(e.membershipRole)&&
    e.issuerActive===true&&e.issuerRevoked===false&&e.issuerExpiresAt>dbNow&&
    digest(e.issuerProvenanceSha256)&&
    revision(e.membershipRevision)&&revision(e.issuerRevision)&&
    e.membershipRevision===r.fence.membershipRevision&&
    e.issuerRevision===r.fence.issuerRevision;
}
export class DisconnectedTransactionContract{
  constructor(private readonly port:TransactionCustodyPort){}
  async admit(request:unknown):Promise<TxResult>{
    if(!validTransactionRequest(request))return {status:"denied"};
    try{
      const out=await this.port.admitWithCustody(request);
      if(out.status!=="committed")return out;
      return out.membershipRevision===request.fence.membershipRevision&&
        out.issuerRevision===request.fence.issuerRevision&&
        out.receipt.organizationId===request.scope.organizationId&&
        out.receipt.siteId===request.scope.siteId&&
        out.receipt.actorSubject===request.scope.actorSubject&&
        out.receipt.sessionId===request.scope.sessionId&&
        out.receipt.issuerId===request.scope.issuerId&&
        out.receipt.operation===request.scope.operation&&
        out.receipt.grantId===request.intent.grantId&&
        out.receipt.idempotencyKey===request.intent.idempotencyKey&&
        out.receipt.requestSha256===request.intent.requestSha256
        ?out:{status:"unavailable"};
    }catch{return {status:"commit_unknown"};}
  }
  async reconcile(request:unknown):Promise<TxResult>{
    if(!validTransactionRequest(request))return {status:"denied"};
    try{return await this.port.reconcileReadOnly(request);}
    catch{return {status:"unavailable"};}
  }
}
