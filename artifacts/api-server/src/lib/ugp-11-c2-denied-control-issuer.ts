/** UGP-11.C2: pure fail-closed control-issuer preflight; no live trust source. */
import {reviewP9IssuanceTrustContracts,type P9OperatorEvidence,type P9KeyEvidence}
 from "./ugp-11-1d12-trust-contracts.js";
export type ControlIssuerIntent=Readonly<{
 tenantId:string;siteId:string;principalId:string;
 action:"pause"|"drain"|"kill"|"resume";decisionId:string;
 nonce:string;priorRevision:number;priorFingerprint:string;
 policyVersion:string;effectiveAt:string;expiresAt:string;
}>;
export type DeniedIssuerReview=Readonly<{
 kind:"invalid_intent"|"scope_mismatch"|"expired_intent"|"unverified_identity_or_key";
 identityTrusted:false;grantTrusted:false;signerTrusted:false;
 issuanceAllowed:false;claimAllowed:false;dispatchAllowed:false
}>;
const ID=/^[A-Za-z0-9._:-]{1,128}$/,HEX=/^[a-f0-9]{64}$/;
const canonicalTime=(t:string)=>typeof t==="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(t)&&Number.isFinite(Date.parse(t))&&new Date(Date.parse(t)).toISOString()===t;
const deny=(kind:DeniedIssuerReview["kind"]):DeniedIssuerReview=>Object.freeze({
 kind,identityTrusted:false,grantTrusted:false,signerTrusted:false,
 issuanceAllowed:false,claimAllowed:false,dispatchAllowed:false
});
export function reviewDeniedControlIssuer(
 intent:ControlIssuerIntent,identity:P9OperatorEvidence,key:P9KeyEvidence,observedAt:string
):DeniedIssuerReview {
 if(!intent||![intent.tenantId,intent.siteId,intent.principalId,intent.decisionId,
 intent.nonce,intent.policyVersion].every(v=>typeof v==="string"&&ID.test(v))||
 !["pause","drain","kill","resume"].includes(intent.action)||
 !Number.isSafeInteger(intent.priorRevision)||intent.priorRevision<0||
 !HEX.test(intent.priorFingerprint)||!canonicalTime(intent.effectiveAt)||
 !canonicalTime(intent.expiresAt)||!canonicalTime(observedAt))
  return deny("invalid_intent");
 if(!identity||!key||intent.tenantId!==identity.tenantId||
 intent.siteId!==identity.siteId||intent.principalId!==identity.principalId||
 intent.tenantId!==key.scopeTenantId||intent.siteId!==key.scopeSiteId||
 intent.policyVersion!==identity.policyVersion)return deny("scope_mismatch");
 const now=Date.parse(observedAt);
 if(Date.parse(intent.effectiveAt)>now||Date.parse(intent.expiresAt)<=now||
 Date.parse(intent.expiresAt)<=Date.parse(intent.effectiveAt))
  return deny("expired_intent");
 // D12 validates only caller-supplied evidence. No independent identity,
 // grant ledger, governed key registry, or signing authority exists here.
 reviewP9IssuanceTrustContracts(identity,key,observedAt);
 return deny("unverified_identity_or_key");
}
