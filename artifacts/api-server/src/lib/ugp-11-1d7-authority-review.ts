/**
 * UGP-11.1D7: pure negative authority provenance gate.
 * No authenticator, credential trust store or durable event lineage is wired.
 * A label 'certified_p9' is NOT a verified authority decision.
 */
export type AuthorityCandidate=Readonly<{
 tenantId:string;siteId:string;source:string;mode:string;
 revision:number;fingerprint:string;principalId:string|null;
 decisionId:string|null;priorRevision:number|null;
 evidenceFingerprint:string|null;verifiedByIndependentAuthority:boolean;
}>;
export type AuthorityDenial=Readonly<{
 authorityVerified:false;claimAllowed:false;dispatchAllowed:false;
 reason:"invalid_provenance"|"fixture_only"|"independent_authority_unavailable";
}>;
const ID=/^[a-zA-Z0-9._:-]{1,128}$/;
const HEX=/^[0-9a-f]{64}$/;
export function reviewP9AuthorityProvenance(candidate:AuthorityCandidate):AuthorityDenial {
 const deny=(reason:AuthorityDenial["reason"]):AuthorityDenial=>
   Object.freeze({authorityVerified:false,claimAllowed:false,dispatchAllowed:false,reason});
 if(!candidate || typeof candidate!=="object" ||
   ![candidate.tenantId,candidate.siteId].every(v=>typeof v==="string"&&ID.test(v)) ||
   !Number.isSafeInteger(candidate.revision) || candidate.revision<1 ||
   typeof candidate.fingerprint!=="string" || !HEX.test(candidate.fingerprint) ||
   !["running","paused","draining","drained","killed"].includes(candidate.mode))
   return deny("invalid_provenance");
 if(candidate.source==="fixture_only") return deny("fixture_only");
 if(candidate.source!=="certified_p9" ||
   candidate.principalId===null || !ID.test(candidate.principalId) ||
   candidate.decisionId===null || !ID.test(candidate.decisionId) ||
   candidate.priorRevision===null || !Number.isSafeInteger(candidate.priorRevision) ||
   candidate.priorRevision<0 || candidate.priorRevision>=candidate.revision ||
   candidate.evidenceFingerprint===null || !HEX.test(candidate.evidenceFingerprint))
   return deny("invalid_provenance");
 // No valid independent verifier exists. Never trust a boolean asserted by caller.
 return deny("independent_authority_unavailable");
}
