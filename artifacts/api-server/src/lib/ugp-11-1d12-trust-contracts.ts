/** UGP-11.1D12: pure negative-review contract; never an identity verifier or trusted issuer. */
export type P9OperatorEvidence=Readonly<{
 principalId:string;tenantId:string;siteId:string;
 identityProvider:string;subject:string;sessionId:string;
 authenticationTime:string;expiresAt:string;
 assertedVerified:boolean;permission:string;policyVersion:string;
}>;
export type P9KeyEvidence=Readonly<{
 keyId:string;issuerId:string;algorithm:"Ed25519"|"ES256";
 scopeTenantId:string;scopeSiteId:string;notBefore:string;notAfter:string;
 state:"active"|"revoked"|"expired"|"rotating";rotationEpoch:number;
 assertedSignatureVerified:boolean;trustAnchorId:string;
}>;
export type P9IssuanceTrustReview=Readonly<{
 identityTrusted:false;keyTrusted:false;issuanceAllowed:false;
 authorityVerified:false;claimAllowed:false;dispatchAllowed:false;
 reason:"malformed_evidence"|"scope_mismatch"|"expired_or_revoked"|"independent_trust_unavailable";
}>;
const ID=/^[A-Za-z0-9._:-]{1,128}$/;
const TIME=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const deny=(reason:P9IssuanceTrustReview["reason"]):P9IssuanceTrustReview=>Object.freeze({
 identityTrusted:false,keyTrusted:false,issuanceAllowed:false,
 authorityVerified:false,claimAllowed:false,dispatchAllowed:false,reason
});
const validTime=(v:string):boolean=>typeof v==="string"&&TIME.test(v)&&
 Number.isFinite(Date.parse(v))&&new Date(Date.parse(v)).toISOString()===v;
export function reviewP9IssuanceTrustContracts(
 identity:P9OperatorEvidence,key:P9KeyEvidence,observedAt:string
):P9IssuanceTrustReview {
 if(!identity||!key||!validTime(observedAt)||
  ![identity.principalId,identity.tenantId,identity.siteId,identity.identityProvider,
    identity.subject,identity.sessionId,identity.permission,identity.policyVersion,
    key.keyId,key.issuerId,key.scopeTenantId,key.scopeSiteId,key.trustAnchorId]
    .every(v=>typeof v==="string"&&ID.test(v))||
  ![identity.authenticationTime,identity.expiresAt,key.notBefore,key.notAfter].every(validTime)||
  !["Ed25519","ES256"].includes(key.algorithm)||
  !["active","revoked","expired","rotating"].includes(key.state)||
  !Number.isSafeInteger(key.rotationEpoch)||key.rotationEpoch<0||
  typeof identity.assertedVerified!=="boolean"||typeof key.assertedSignatureVerified!=="boolean")
  return deny("malformed_evidence");
 if(identity.tenantId!==key.scopeTenantId||identity.siteId!==key.scopeSiteId)
  return deny("scope_mismatch");
 const at=Date.parse(observedAt);
 if(key.state!=="active"||Date.parse(identity.authenticationTime)>at||
  Date.parse(identity.expiresAt)<=at||Date.parse(key.notBefore)>at||
  Date.parse(key.notAfter)<=at||Date.parse(identity.expiresAt)<=Date.parse(identity.authenticationTime)||
  Date.parse(key.notAfter)<=Date.parse(key.notBefore))return deny("expired_or_revoked");
 // All evidence is supplied by the caller: even matching and current assertions
 // cannot establish independent identity, policy grants, key provenance or signature validity.
 return deny("independent_trust_unavailable");
}
