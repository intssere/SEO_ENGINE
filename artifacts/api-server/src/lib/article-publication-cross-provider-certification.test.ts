import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicationCrossProviderCertificationIntegrity, buildPublicationCrossProviderCertification, type PublicationEvidence } from "./article-publication-cross-provider-certification.js";

const providers=["git_markdown","shopify","webflow","wordpress"] as const;
const operations=["create","publish","update"] as const;
function row(provider:typeof providers[number],operation:typeof operations[number],suffix:string):PublicationEvidence{
 const opDigit=operation==="create"?"1":operation==="publish"?"2":"3";
 return Object.freeze({provider,operation,sourcePlanFingerprint:opDigit.repeat(64),mappingFingerprint:suffix.repeat(64).slice(0,64),expectedVerificationStateFingerprint:(Number(opDigit)+3).toString().repeat(64),mappingOnly:true,deterministic:true,performsNetworkOperation:false,performsPersistence:false,usesCredentials:false,executionAuthorized:false,providerWrites:false,publicSiteWrites:false});
}
function matrix(){return providers.flatMap((p,pi)=>operations.map((o,oi)=>row(p,o,((pi*3+oi)%6+4).toString())));}
test("UGP-8.1 cross-provider certification requires complete 4x3 matrix",()=>{const c=buildPublicationCrossProviderCertification({evidence:matrix()});assert.equal(c.evidence.length,12);assert.deepEqual(c.providerCoverage,["git_markdown","shopify","webflow","wordpress"]);assert.deepEqual(c.operationCoverage,["create","publish","update"]);assertPublicationCrossProviderCertificationIntegrity(c);});
test("UGP-8.1 cross-provider certification rejects missing entries",()=>assert.throws(()=>buildPublicationCrossProviderCertification({evidence:matrix().slice(0,11)}),/exact_matrix_required/));
test("UGP-8.1 cross-provider certification rejects duplicate matrix coordinates",()=>{const m=matrix();m[11]=m[0]!;assert.throws(()=>buildPublicationCrossProviderCertification({evidence:m}),/duplicate_matrix_entry/);});
test("UGP-8.1 cross-provider certification rejects provider lineage divergence",()=>{const m=matrix();m[0]=Object.freeze({...m[0]!,sourcePlanFingerprint:"f".repeat(64)});assert.throws(()=>buildPublicationCrossProviderCertification({evidence:m}),/source_lineage_mismatch/);});
test("UGP-8.1 cross-provider certification rejects verification-state divergence",()=>{const m=matrix();m[0]=Object.freeze({...m[0]!,expectedVerificationStateFingerprint:"e".repeat(64)});assert.throws(()=>buildPublicationCrossProviderCertification({evidence:m}),/verification_state_mismatch/);});
test("UGP-8.1 cross-provider certification rejects unsafe normalized evidence",()=>{const m=matrix();m[0]=Object.freeze({...m[0]!,providerWrites:true}) as unknown as PublicationEvidence;assert.throws(()=>buildPublicationCrossProviderCertification({evidence:m}),/unsafe_evidence/);});
test("UGP-8.1 cross-provider certification fingerprint detects tampering",()=>{const c=buildPublicationCrossProviderCertification({evidence:matrix()});assert.throws(()=>assertPublicationCrossProviderCertificationIntegrity({...c,certificationFingerprint:"0".repeat(64)}),/fingerprint_mismatch/);});
