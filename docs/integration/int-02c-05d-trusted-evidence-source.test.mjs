import {test} from "node:test";
import assert from "node:assert/strict";
import {TARGET,metadataQueryFingerprint} from "./int-02c-05a-railway-metadata-query-contract.mjs";
import {inspectEvidenceAnchor,authorizeLiveCollection} from "./int-02c-05d-trusted-evidence-source.mjs";
const packet=()=>({observation:{digest:"a".repeat(64)},anchor:{origin:"external_evidence_registry",provenanceVerified:true,reviewerId:"reviewer",collectorId:"collector",digest:"a".repeat(64),targetServiceId:TARGET.serviceId,targetVolumeId:TARGET.volumeId,queryFingerprint:metadataQueryFingerprint()}});
test("even caller-supplied matching anchor cannot authenticate execution",()=>assert.deepEqual(inspectEvidenceAnchor(packet()),{verified:false,executionAuthorized:false,reason:"trusted_registry_verification_unavailable"}));
test("reject forged or mismatched evidence",()=>{
 for(const mutate of [p=>p.anchor.origin="self",p=>p.anchor.provenanceVerified=false,p=>p.anchor.reviewerId="collector",p=>p.anchor.digest="b".repeat(64),p=>p.anchor.targetVolumeId="other",p=>p.anchor.queryFingerprint="0".repeat(64)]){
  const p=packet();mutate(p);assert.equal(inspectEvidenceAnchor(p).verified,false);
 }
});
test("live collection is always disabled",()=>{assert.equal(authorizeLiveCollection().executionAuthorized,false);assert.equal(inspectEvidenceAnchor({}).verified,false);});
