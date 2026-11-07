/**
 * PILOT-01 RT01-A12.22 — disconnected, source-only identity-to-custody binding.
 * This is NOT a runtime authentication provider, proof of human identity,
 * PostgreSQL SECURITY DEFINER endpoint or deployable database role.
 * Server-owned dependency ports are mandatory; no caller-provided principal.
 */
import {
  resolveDisconnectedCustody,type TrustedCustodyPorts,type CustodyIntent
} from "./pilot-01-rt01a12-7-disconnected-custody.js";
import {
  DisconnectedTransactionContract,type TransactionCustodyPort,type TxResult,
  type TransactionRequest
} from "./pilot-01-rt01a12-8-disconnected-transaction.js";
import type {
  AdmissionIntent
} from "./pilot-01-rt01a12-4-disconnected-admission-contract.js";

export type UntrustedAdmissionIntent=Readonly<CustodyIntent&AdmissionIntent>;
export type TrustedBindingResult=TxResult;

/**
 * TrustedCustodyPorts and TransactionCustodyPort MUST be server-injected from
 * independently authenticated, non-caller-controlled sources. Never derive
 * session.current() from request bodies, cookies without validated signatures,
 * arbitrary current_setting() GUCs or user-provided role claims.
 *
 * A12.7 check is preliminary only: A12.20's transaction must acquire row locks,
 * use DB time, recheck all authority and revision fences, and atomically admit.
 */
export class DisconnectedTrustedTenantBinding {
  private readonly atomic:DisconnectedTransactionContract;
  constructor(private readonly custody:TrustedCustodyPorts,
    transaction:TransactionCustodyPort){
    this.atomic=new DisconnectedTransactionContract(transaction);
  }
  async admit(untrusted:unknown):Promise<TrustedBindingResult>{
    if(!untrusted||typeof untrusted!=="object")return {status:"denied"};
    const i=untrusted as Partial<UntrustedAdmissionIntent>;
    if(typeof i.siteId!=="string"||typeof i.issuerId!=="string"||
      !["analyze","recommend"].includes(i.operation??"")||
      typeof i.grantId!=="string"||typeof i.idempotencyKey!=="string"||
      typeof i.requestSha256!=="string")return {status:"denied"};
    const intent:CustodyIntent={
      siteId:i.siteId,issuerId:i.issuerId,
      operation:i.operation as CustodyIntent["operation"]
    };
    const result=await resolveDisconnectedCustody(intent,this.custody);
    if(result.status!=="verified")return {status:result.status};
    const p=result.principal;
    // Build scope exclusively from independently resolved server-owned facts;
    // arbitrary organizationId, subject, sessionId, role, revisions and GUCs
    // embedded in untrusted input have NO bearing on this transaction request.
    const request:TransactionRequest={
      scope:{
        organizationId:p.organizationId,siteId:p.siteId,
        actorSubject:p.actorSubject,sessionId:p.sessionId,
        issuerId:p.issuerId,operation:p.operation
      },
      fence:{
        membershipRevision:result.membershipRevision,
        issuerRevision:result.issuerRevision
      },
      intent:{
        grantId:i.grantId,idempotencyKey:i.idempotencyKey,
        requestSha256:i.requestSha256
      }
    };
    return this.atomic.admit(request);
  }
  /**
   * Commit ambiguity is never automatically retried as a write. A future
   * reconciliation path requires independently authenticated authority plus
   * durable historical revision provenance; A12.20 currently returns
   * unavailable when that provenance cannot be certified.
   */
}
