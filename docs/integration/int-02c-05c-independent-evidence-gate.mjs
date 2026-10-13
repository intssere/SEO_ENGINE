/** INT-02C-05C: pure evidence consistency reviewer, never a live executor. */
import {TARGET,metadataQueryFingerprint} from "./int-02c-05a-railway-metadata-query-contract.mjs";
const deny=reason=>({reviewEligible:false,executionAuthorized:false,reason});
const id=/^[a-z0-9_-]{8,128}$/i;
export function inspectIndependentEvidence(packet){
 if(!packet||typeof packet!=="object"||Array.isArray(packet))return deny("packet_missing");
 const {provider,session,witness}=packet;
 if(!provider||!session||!witness)return deny("evidence_class_missing");
 if(provider.origin!=="railway_control_plane"||provider.projectId!==TARGET.railwayProjectId||provider.environmentId!==TARGET.environmentId||provider.serviceId!==TARGET.serviceId||provider.volumeId!==TARGET.volumeId)return deny("provider_target_mismatch");
 if(provider.resourceRevision===undefined||typeof provider.resourceRevision!=="string"||!id.test(provider.resourceRevision))return deny("provider_revision_missing");
 if(session.origin!=="postgres_session_observation"||session.database!=="int02c_disposable"||session.role!=="int02c_metadata_reader"||session.transactionReadOnly!==true||session.isSuperuser!==false)return deny("readonly_session_not_attested");
 if(session.queryFingerprint!==metadataQueryFingerprint())return deny("query_fingerprint_mismatch");
 if(typeof session.observationId!=="string"||!id.test(session.observationId))return deny("session_observation_missing");
 if(witness.origin!=="independent_reviewer"||typeof witness.observationId!=="string"||witness.observationId!==session.observationId||typeof witness.reviewerId!=="string"||!id.test(witness.reviewerId))return deny("independent_witness_missing");
 if(witness.collectorId===witness.reviewerId)return deny("same_party_witness");
 // All fields are caller-controlled; independent provenance cannot be established here.
 return deny("external_evidence_authentication_unavailable");
}
export function authorizeProductionExecution(){return deny("production_execution_disabled");}
