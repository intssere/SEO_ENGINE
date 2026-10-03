import assert from "node:assert/strict";
import test from "node:test";
import { buildUniversalCapabilityRegistry } from "./universal-capability-registry.js";
import { buildUniversalConnectorDescriptor, type UniversalMutationReceipt } from "./universal-connector-contract.js";
import { buildUniversalConnectionIdentity, buildUniversalResourceLocator, buildUniversalSiteIdentity } from "./universal-site-resource-identity.js";
import { buildInternalLinkingRecommendations } from "./internal-linking-recommendation-contract.js";
import { buildInternalLinkMutationPreview } from "./internal-link-mutation-preview.js";
import { mapInternalLinkPreviewToWordPress } from "./internal-link-provider-patch-mapping.js";
import { assertInternalLinkVerificationRollbackPlanIntegrity, bindInternalLinkRollbackIntentToReceipt, bindInternalLinkVerificationToReceipt, buildInternalLinkVerificationRollbackPlan } from "./internal-link-verification-rollback.js";

const fp=(c:string)=>c.repeat(64);
function fixture(includeRollback=true){
 const site=buildUniversalSiteIdentity({siteId:"site-wordpress",canonicalOrigin:"https://example.test"});
 const connection=buildUniversalConnectionIdentity({site,connectionId:"wp-1",provider:"wordpress",externalAccountId:"site",connectionMode:"native_api"});
 const registry=buildUniversalCapabilityRegistry({site,connection,provider:"wordpress",connectorVersion:"test-v1",credentialProfileId:"profile",capabilities:[
  {capability:"write.internal_links",resourceKinds:["article"],verification:"required",rollback:"supported",maxOperationsPerRequest:10,maxPayloadBytes:2000000},
  {capability:"preview.change",resourceKinds:["article"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:10,maxPayloadBytes:2000000},
  {capability:"verify.change",resourceKinds:["article"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:10,maxPayloadBytes:2000000},
  ...(includeRollback?[{capability:"rollback.change" as const,resourceKinds:["article" as const],verification:"required" as const,rollback:"not_applicable" as const,maxOperationsPerRequest:10,maxPayloadBytes:2000000}]:[]),
 ]});
 const descriptor=buildUniversalConnectorDescriptor({connectorId:"wp",connectorKind:"native_api",registry});
 const source=buildUniversalResourceLocator({site,connection,provider:"wordpress",kind:"article",externalId:"42",canonicalUrl:"https://example.test/source"});
 const target=buildUniversalResourceLocator({site,connection,provider:"wordpress",kind:"article",externalId:"77",canonicalUrl:"https://example.test/target"});
 const recs=buildInternalLinkingRecommendations({newContent:source,candidates:[{direction:"new_content_to_existing",source,target,sourceStateFingerprint:fp("1"),targetStateFingerprint:fp("2"),anchorText:"target guide",context:"Relevant paragraph.",topicalRelevance:0.9,contextualFit:0.8,businessRelevance:0.7,supportingEvidenceFingerprints:[fp("a")],alreadyLinked:false}]});
 const preview=buildInternalLinkMutationPreview({recommendations:recs,bindings:[{recommendationFingerprint:recs.recommendations[0]!.recommendationFingerprint,descriptor,proposedStateFingerprint:fp("3")}]});
 const entry=preview.entries[0]!;
 const patch=mapInternalLinkPreviewToWordPress({preview,entryFingerprint:entry.entryFingerprint,postId:42,proposedContent:'<p><a href="https://example.test/target">target guide</a></p>'});
 return {preview,entry,patch};
}
function receipt(entry:any):UniversalMutationReceipt{
 return Object.freeze({version:"ugp-1-3-universal-connector-contract-v1",operation:"execute_mutation_receipt",descriptorFingerprint:entry.mutationIntent.descriptor.descriptorFingerprint,executeRequestFingerprint:fp("4"),mutationIntentFingerprint:entry.mutationIntent.intentFingerprint,targetLocatorFingerprint:entry.mutationIntent.target.resourceLocatorFingerprint,providerReceiptId:"provider-1",reportedAt:"2026-10-03T12:00:00.000Z",providerStateFingerprint:entry.proposedStateFingerprint,responseArtifact:null,mutationStatus:"reported_applied",verified:false,receiptFingerprint:fp("5")});
}

test("UGP-8.2E plan binds applied and restore state lineage without execution authority",()=>{
 const x=fixture();
 const plan=buildInternalLinkVerificationRollbackPlan({preview:x.preview,entryFingerprint:x.entry.entryFingerprint,providerPatch:x.patch});
 assert.equal(plan.expectedAppliedStateFingerprint,fp("3"));
 assert.equal(plan.restoreStateFingerprint,fp("1"));
 assert.equal(plan.provider,"wordpress");
 assert.equal(plan.semantics.executeRequestConstructed,false);
 assert.equal(plan.semantics.rollbackRequestConstructed,false);
 assertInternalLinkVerificationRollbackPlanIntegrity(plan);
});

test("UGP-8.2E binds verify request only after matching mutation receipt exists",()=>{
 const x=fixture();
 const plan=buildInternalLinkVerificationRollbackPlan({preview:x.preview,entryFingerprint:x.entry.entryFingerprint,providerPatch:x.patch});
 const bound=bindInternalLinkVerificationToReceipt({plan,preview:x.preview,mutationReceipt:receipt(x.entry)});
 assert.equal(bound.verificationRequest.operation,"verify_mutation");
 assert.equal(bound.verificationRequest.expectedStateFingerprint,fp("3"));
 assert.equal(bound.verificationRequest.target.resourceLocatorFingerprint,x.entry.sourceLocatorFingerprint);
});

test("UGP-8.2E builds rollback intent to exact pre-change source state but no rollback request",()=>{
 const x=fixture();
 const plan=buildInternalLinkVerificationRollbackPlan({preview:x.preview,entryFingerprint:x.entry.entryFingerprint,providerPatch:x.patch});
 const bound=bindInternalLinkRollbackIntentToReceipt({plan,preview:x.preview,mutationReceipt:receipt(x.entry)});
 assert.equal(bound.rollbackIntent.capability,"rollback.change");
 assert.equal(bound.rollbackIntent.restoreStateFingerprint,fp("1"));
 assert.equal(bound.rollbackRequestConstructed,false);
});

test("UGP-8.2E rejects provider-patch lineage drift",()=>{
 const x=fixture();
 assert.throws(()=>buildInternalLinkVerificationRollbackPlan({preview:x.preview,entryFingerprint:x.entry.entryFingerprint,providerPatch:{...x.patch,previewEntryFingerprint:fp("9")}}),/patch_fingerprint_mismatch|patch_preview_lineage_mismatch/);
});

test("UGP-8.2E requires verify and rollback capabilities",()=>{
 const x=fixture(false);
 assert.throws(()=>buildInternalLinkVerificationRollbackPlan({preview:x.preview,entryFingerprint:x.entry.entryFingerprint,providerPatch:x.patch}),/rollback_capability_required/);
});

test("UGP-8.2E rejects mutation receipts bound to another intent",()=>{
 const x=fixture();
 const plan=buildInternalLinkVerificationRollbackPlan({preview:x.preview,entryFingerprint:x.entry.entryFingerprint,providerPatch:x.patch});
 assert.throws(()=>bindInternalLinkVerificationToReceipt({plan,preview:x.preview,mutationReceipt:{...receipt(x.entry),mutationIntentFingerprint:fp("8")}}),/receipt_intent_mismatch/);
});
