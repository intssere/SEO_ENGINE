/**
 * UGP-11.1D11: pure issuance-governance review, NOT an authenticator or issuer.
 * No trusted credential registry, external identity verifier or trusted key store
 * is connected. All outputs are DENY; never treat supplied assertions as authority.
 */
export type IssuanceRequest=Readonly<{
 tenantId:string;siteId:string;principalId:string;
 action:"pause"|"drain"|"kill"|"resume";
 requestedRevision:number;previousRevision:number;
 decisionFingerprint:string;
 assertedRole:string;assertedAuthenticated:boolean;
 keyId:string;assertedKeyState:"active"|"revoked"|"expired";
 approvalId:string|null;assertedApproved:boolean;
}>;
export type IssuanceReview=Readonly<{
 issuanceAllowed:false;authorityVerified:false;claimAllowed:false;dispatchAllowed:false;
 reason:"invalid_issuance_request"|"untrusted_operator_identity"|"untrusted_key_state"|"independent_policy_and_key_governance_missing";
}>;
const ID=/^[A-Za-z0-9._:-]{1,128}$/;
const HEX=/^[0-9a-f]{64}$/;
const denied=(reason:IssuanceReview["reason"]):IssuanceReview=>
  Object.freeze({issuanceAllowed:false,authorityVerified:false,claimAllowed:false,dispatchAllowed:false,reason});
export function reviewP9ControlIssuance(request:IssuanceRequest):IssuanceReview {
 if(!request||typeof request!=="object"||
   ![request.tenantId,request.siteId,request.principalId,request.keyId].every(x=>typeof x==="string"&&ID.test(x))||
   !["pause","drain","kill","resume"].includes(request.action)||
   !Number.isSafeInteger(request.requestedRevision)||request.requestedRevision<1||
   !Number.isSafeInteger(request.previousRevision)||request.previousRevision<0||
   request.requestedRevision!==request.previousRevision+1||
   typeof request.decisionFingerprint!=="string"||!HEX.test(request.decisionFingerprint)||
   typeof request.assertedRole!=="string"||!ID.test(request.assertedRole)||
   !["active","revoked","expired"].includes(request.assertedKeyState)||
   (request.approvalId!==null&&(typeof request.approvalId!=="string"||!ID.test(request.approvalId))))
   return denied("invalid_issuance_request");
 if(!request.assertedAuthenticated) return denied("untrusted_operator_identity");
 if(request.assertedKeyState!=="active") return denied("untrusted_key_state");
 // Assertions about identity, operator role, approval and key status are not
 // independently verified. Even all-'true' inputs cannot grant issuance.
 return denied("independent_policy_and_key_governance_missing");
}
