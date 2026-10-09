import assert from "node:assert/strict";
import test from "node:test";
import { CVI_GSC_RAW_RESPONSE_CUSTODY_VERSION,type CviGscRawCustodyResult } from "./cvi-gsc-raw-response-custody.js";
import { CVI_GSC_CREDENTIAL_PROFILE_FENCE_VERSION,type CviGscCredentialProfileReview } from "./cvi-gsc-credential-profile-fence.js";
import { correlateCviGscAcquisitionLineage } from "./cvi-gsc-acquisition-lineage.js";

const fp=(c:string)=>c.repeat(64);
const raw:CviGscRawCustodyResult={
 version:CVI_GSC_RAW_RESPONSE_CUSTODY_VERSION,
 status:"PENDING_TRUSTED_TLS_AND_PROVIDER_CREDENTIAL_CUSTODY",
 reasons:[],rawBodySha256:fp("a"),attestationFingerprint:fp("b"),
 requestNonce:"nonce-1",acquisitionId:"acq-1",
 tlsPeerIndependentlyAuthenticated:false,oauthCredentialCustodyVerified:false,
 tenantAccessIndependentlyVerified:false,providerResponseIndependentlyVerified:false,
 executionAuthorized:false,publicationAuthorized:false,
};
const profile:CviGscCredentialProfileReview={
 version:CVI_GSC_CREDENTIAL_PROFILE_FENCE_VERSION,
 status:"PENDING_TRUSTED_OAUTH_AND_TLS_ORIGIN_ATTESTATION",
 reasons:[],oauthProfileMatched:true,rawResponseBound:true,
 delegatedCredentialIndependentlyVerified:false,tlsOriginIndependentlyVerified:false,
 tenantPermissionIndependentlyVerified:false,
 executionAuthorized:false,publicationAuthorized:false,
};
const base={
 raw,profile,tenantId:"tenant-1",siteId:"site-1",
 connectionId:"connection-1",authSubject:"subject-1",
 authSessionId:"session-1",acquisitionId:"acq-1",
 requestNonce:"nonce-1",requestedResource:"sc-domain:example.com",
 expectedObservationFingerprint:fp("a"),
 expectedAttestationFingerprint:fp("b"),
 expectedAcquisitionId:"acq-1",expectedNonce:"nonce-1",
 expectedResource:"sc-domain:example.com",
};
test("matching source bytes and nonce yield only untrusted review, never provider authority",()=>{
 const r=correlateCviGscAcquisitionLineage(base);
 assert.equal(r.status,"UNTRUSTED_CAPTURE_REVIEW_ONLY");
 assert.deepEqual(r.reasons,[]);
 assert.equal(r.requestIdentityConsistent,true);
 assert.equal(r.independentProviderOriginVerified,false);
 assert.equal(r.independentOAuthCustodyVerified,false);
 assert.equal(r.durableReplayVerified,false);
 assert.equal(r.executionAuthorized,false);
 assert.equal(r.publicationAuthorized,false);
 assert.equal(r.packetFingerprint,correlateCviGscAcquisitionLineage(base).packetFingerprint);
});
test("nonce, acquisition ID and requested GSC property cannot be substituted",()=>{
 for(const change of [
   {expectedNonce:"nonce-2"},{expectedAcquisitionId:"acq-2"},
   {expectedResource:"sc-domain:attacker.test"},
   {raw:{...raw,requestNonce:"nonce-3"}},
   {raw:{...raw,acquisitionId:"acq-3"}},
 ]) assert.equal(correlateCviGscAcquisitionLineage({...base,...change}).status,"DENY");
});
test("swapping raw response hashes or attestation identity is blocked",()=>{
 for(const change of [
   {expectedObservationFingerprint:fp("c")},
   {expectedAttestationFingerprint:fp("d")},
   {raw:{...raw,rawBodySha256:fp("e")}},
   {raw:{...raw,attestationFingerprint:fp("f")}},
 ]) {
   const r=correlateCviGscAcquisitionLineage({...base,...change});
   assert.equal(r.status,"DENY");
   assert.ok(r.reasons.includes("raw_response_checksum_binding_mismatch"));
 }
});
test("unsafe raw response or scope review cannot confer privilege",()=>{
 for(const change of [
   {raw:{...raw,status:"DENY" as const}},
   {raw:{...raw,publicationAuthorized:true as false}},
   {profile:{...profile,status:"DENY" as const}},
   {profile:{...profile,oauthProfileMatched:false}},
   {profile:{...profile,executionAuthorized:true as false}},
 ]) {
   const r=correlateCviGscAcquisitionLineage({...base,...change});
   assert.equal(r.status,"DENY");
   assert.equal(r.executionAuthorized,false);
   assert.equal(r.publicationAuthorized,false);
 }
});
test("malformed identity denied, research packet fingerprints change with independent site scope",()=>{
 assert.equal(correlateCviGscAcquisitionLineage({...base,connectionId:""}).status,"DENY");
 const other=correlateCviGscAcquisitionLineage({...base,siteId:"site-2"});
 assert.notEqual(correlateCviGscAcquisitionLineage(base).packetFingerprint,other.packetFingerprint);
 // Site identity requires authenticated DB/session enforcement outside this offline packet.
 assert.equal(other.independentProviderOriginVerified,false);
});
