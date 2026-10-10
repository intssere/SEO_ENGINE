/** UGP-11.1D18: independent revocation-authority requirements, fail closed. */
import {reviewOfflineRevocation,type SignedRevocation} from "./ugp-11-1d16-revocation-evidence.js";
export type RevocationAuthorityCandidate=Readonly<{
 signed:SignedRevocation;fixturePublicKeyPem:string;
 prior:{issuer:string;tenantId:string;siteId:string;keyId:string;sequence:number;fingerprint:string}|null;
 assertedTrustAnchorId:string;assertedIssuerAuthorized:boolean;
 assertedSignerActive:boolean;assertedPolicyVersion:string;
 assertedRevocationRegistryCurrent:boolean;
}>;
export type RevocationAuthorityReview=Readonly<{
 signatureValid:boolean;lineageValid:boolean;
 issuerTrusted:false;signerTrusted:false;revocationAuthoritative:false;
 issuanceAllowed:false;claimAllowed:false;dispatchAllowed:false;
 reason:"invalid_evidence"|"unverified_signature_or_lineage"|"untrusted_issuer_or_signer"|"independent_revocation_authority_unavailable";
}>;
const ID=/^[A-Za-z0-9._:-]{1,128}$/;
const deny=(reason:RevocationAuthorityReview["reason"],signatureValid=false,lineageValid=false):RevocationAuthorityReview=>
 Object.freeze({reason,signatureValid,lineageValid,issuerTrusted:false,signerTrusted:false,
 revocationAuthoritative:false,issuanceAllowed:false,claimAllowed:false,dispatchAllowed:false});
export function reviewRevocationAuthorityCandidate(c:RevocationAuthorityCandidate):RevocationAuthorityReview {
 if(!c||!c.signed||typeof c.fixturePublicKeyPem!=="string"||
 ![c.assertedTrustAnchorId,c.assertedPolicyVersion].every(x=>typeof x==="string"&&ID.test(x))||
 typeof c.assertedIssuerAuthorized!=="boolean"||typeof c.assertedSignerActive!=="boolean"||
 typeof c.assertedRevocationRegistryCurrent!=="boolean")return deny("invalid_evidence");
 const review=reviewOfflineRevocation(c.signed,c.fixturePublicKeyPem,c.prior);
 if(!review.signatureValid||!review.lineageValid)
  return deny("unverified_signature_or_lineage",review.signatureValid,review.lineageValid);
 if(!c.assertedIssuerAuthorized||!c.assertedSignerActive||!c.assertedRevocationRegistryCurrent)
  return deny("untrusted_issuer_or_signer",true,true);
 // Assertions and fixture keys are not independently sourced. No trusted root is connected.
 return deny("independent_revocation_authority_unavailable",true,true);
}
