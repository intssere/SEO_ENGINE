/**
 * RT01-A12.19 disconnected synthetic orchestration.
 * This composes A12.7/A12.8/A12.4 contracts, never creates a connection.
 * NOT an operational transaction, issuer, identity resolver or worker.
 * A separate DB-owned single-transaction custody check is still required.
 */
import {
  resolveDisconnectedCustody,
  type CustodyIntent,type TrustedCustodyPorts
} from "./pilot-01-rt01a12-7-disconnected-custody.js";
import {
  DisconnectedTransactionContract,
  type TransactionCustodyPort,type TransactionRequest
} from "./pilot-01-rt01a12-8-disconnected-transaction.js";
import {
  DisconnectedAdmissionContract,
  type DurableAdmissionPort,type AdmissionIntent,type AdmissionReceipt,
  type LeaseToken
} from "./pilot-01-rt01a12-4-disconnected-admission-contract.js";

export interface SyntheticIntegrationPorts {
  custody:TrustedCustodyPorts;
  transaction:TransactionCustodyPort;
  admission:DurableAdmissionPort;
}
export type SyntheticOutcome =
  | Readonly<{status:"blocked";reason:string}>
  | Readonly<{status:"synthetic_committed";receipt:AdmissionReceipt}>;
const blocked=(reason:string):SyntheticOutcome=>({status:"blocked",reason});
/**
 * This function is only permitted as a test-oriented composition of disconnected
 * contracts. It does not treat a browser token or caller-supplied principal as proof.
 * The A12.8 port MUST independently implement a DB-owned custody check; the
 * previously merged A12.5 admission adapter alone does NOT satisfy that requirement.
 */
export async function attemptSyntheticAdmission(
  ports:SyntheticIntegrationPorts,scope:CustodyIntent,intent:AdmissionIntent
):Promise<SyntheticOutcome>{
  try{
    const c=await resolveDisconnectedCustody(scope,ports.custody);
    if(c.status!=="verified")return blocked("custody_denied_or_unavailable");
    const p=c.principal;
    const req:TransactionRequest={
      scope:{
        organizationId:p.organizationId,siteId:p.siteId,actorSubject:p.actorSubject,
        sessionId:p.sessionId,issuerId:p.issuerId,operation:p.operation
      },
      intent,fence:{
        membershipRevision:c.membershipRevision,issuerRevision:c.issuerRevision
      }
    };
    // A12.8 port performs independent, transaction-scoped custody evidence check.
    const tx=await new DisconnectedTransactionContract(ports.transaction).admit(req);
    if(tx.status!=="committed")return blocked("transaction_"+tx.status);
    // Reconcile the exact receipt using A12.4 facade; no second admission WRITE.
    const reconciled=await new DisconnectedAdmissionContract(ports.admission)
      .reconcile(p,intent);
    if(reconciled.status!=="committed")return blocked("receipt_"+reconciled.status);
    if(reconciled.receipt.admissionId!==tx.receipt.admissionId||
       reconciled.receipt.jobId!==tx.receipt.jobId||
       reconciled.receipt.transactionId!==tx.receipt.transactionId)
      return blocked("receipt_mismatch");
    return {status:"synthetic_committed",receipt:reconciled.receipt};
  }catch{return blocked("integration_unavailable");}
}
export async function attemptSyntheticWorkerStep(
  port:DurableAdmissionPort,token:LeaseToken,intentSha256:string,
  currentCustody:"valid"|"revoked"|"unavailable",
  recoveryPath:"protected"|"legacy"="protected"
):Promise<"synthetic_applied"|"blocked">{
  if(currentCustody!=="valid"||recoveryPath!=="protected")return "blocked";
  const result=await new DisconnectedAdmissionContract(port).fenced({
    token,intentSha256,kind:"complete"
  });
  return result.status==="applied"?"synthetic_applied":"blocked";
}
