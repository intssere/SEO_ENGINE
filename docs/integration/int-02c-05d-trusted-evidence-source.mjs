/** INT-02C-05D: pure trust-anchor consistency checks; no cryptographic or provider verification. */
import {TARGET,metadataQueryFingerprint} from "./int-02c-05a-railway-metadata-query-contract.mjs";
const deny=reason=>({verified:false,executionAuthorized:false,reason});
const hex=/^[a-f0-9]{64}$/;
export function inspectEvidenceAnchor({observation,anchor}={}){
 if(!observation||!anchor||typeof observation!=="object"||typeof anchor!=="object")return deny("independent_anchor_missing");
 if(anchor.origin!=="external_evidence_registry"||anchor.provenanceVerified!==true)return deny("anchor_provenance_unverified");
 if(anchor.reviewerId===anchor.collectorId||!anchor.reviewerId||!anchor.collectorId)return deny("independent_review_missing");
 if(!hex.test(anchor.digest||"")||!hex.test(observation.digest||"")||anchor.digest!==observation.digest)return deny("observation_digest_mismatch");
 if(anchor.targetServiceId!==TARGET.serviceId||anchor.targetVolumeId!==TARGET.volumeId)return deny("target_identity_mismatch");
 if(anchor.queryFingerprint!==metadataQueryFingerprint())return deny("query_contract_mismatch");
 // provenanceVerified is caller-provided and cannot act as independent authentication.
 return deny("trusted_registry_verification_unavailable");
}
export function authorizeLiveCollection(){return deny("live_collection_disabled");}
