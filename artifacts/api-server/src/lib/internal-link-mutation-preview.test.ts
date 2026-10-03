import assert from "node:assert/strict";
import test from "node:test";
import { buildUniversalCapabilityRegistry } from "./universal-capability-registry.js";
import { buildUniversalConnectorDescriptor } from "./universal-connector-contract.js";
import { buildUniversalConnectionIdentity, buildUniversalResourceLocator, buildUniversalSiteIdentity } from "./universal-site-resource-identity.js";
import { buildInternalLinkingRecommendations } from "./internal-linking-recommendation-contract.js";
import { assertInternalLinkMutationPreviewIntegrity, buildInternalLinkMutationPreview } from "./internal-link-mutation-preview.js";

const fp=(c:string)=>c.repeat(64);
const site=buildUniversalSiteIdentity({siteId:"site-1",canonicalOrigin:"https://example.test"});
const connection=buildUniversalConnectionIdentity({site,connectionId:"cms-1",provider:"wordpress",externalAccountId:"site-1",connectionMode:"native_api"});
const registry=buildUniversalCapabilityRegistry({site,connection,provider:"wordpress",connectorVersion:"test-v1",credentialProfileId:"test-profile",capabilities:[
 {capability:"write.internal_links",resourceKinds:["article","page"],verification:"required",rollback:"supported",maxOperationsPerRequest:10,maxPayloadBytes:100000},
 {capability:"preview.change",resourceKinds:["article","page"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:10,maxPayloadBytes:100000},
 {capability:"verify.change",resourceKinds:["article","page"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:10,maxPayloadBytes:100000},
]});
const descriptor=buildUniversalConnectorDescriptor({connectorId:"wp",connectorKind:"native_api",registry});
const article=buildUniversalResourceLocator({site,connection,provider:"wordpress",kind:"article",externalId:"99",canonicalUrl:"https://example.test/new"});
const page=buildUniversalResourceLocator({site,connection,provider:"wordpress",kind:"page",externalId:"42",canonicalUrl:"https://example.test/existing"});
const recommendations=buildInternalLinkingRecommendations({newContent:article,candidates:[
 {direction:"new_content_to_existing",source:article,target:page,sourceStateFingerprint:fp("1"),targetStateFingerprint:fp("2"),anchorText:"existing guide",context:"Relevant paragraph in the article.",topicalRelevance:0.9,contextualFit:0.8,businessRelevance:0.7,supportingEvidenceFingerprints:[fp("a")],alreadyLinked:false},
 {direction:"existing_to_new_content",source:page,target:article,sourceStateFingerprint:fp("2"),targetStateFingerprint:fp("1"),anchorText:"new guide",context:"Relevant paragraph in the existing page.",topicalRelevance:0.85,contextualFit:0.9,businessRelevance:0.6,supportingEvidenceFingerprints:[fp("b")],alreadyLinked:false},
]});

test("UGP-8.2C builds connector-neutral preview requests for both directions",()=>{
 const result=buildInternalLinkMutationPreview({recommendations,bindings:recommendations.recommendations.map((r,i)=>({recommendationFingerprint:r.recommendationFingerprint,descriptor,proposedStateFingerprint:fp(String(i+3))}))});
 assert.equal(result.entries.length,2);
 assert.equal(result.entries[0]?.mutationIntent.capability,"write.internal_links");
 assert.equal(result.entries[0]?.previewRequest.operation,"preview_mutation");
 assert.equal(result.semantics.executeRequestConstructed,false);
 assert.equal(result.semantics.providerWrites,false);
 assertInternalLinkMutationPreviewIntegrity(result);
});

test("UGP-8.2C mutates the recommendation source, not target",()=>{
 const reverse=recommendations.recommendations.find(r=>r.direction==="existing_to_new_content")!;
 const result=buildInternalLinkMutationPreview({recommendations,bindings:[{recommendationFingerprint:reverse.recommendationFingerprint,descriptor,proposedStateFingerprint:fp("7")}]});
 assert.equal(result.entries[0]?.mutationIntent.target.resourceLocatorFingerprint,page.resourceLocatorFingerprint);
 assert.notEqual(result.entries[0]?.mutationIntent.target.resourceLocatorFingerprint,article.resourceLocatorFingerprint);
});

test("UGP-8.2C rejects unknown and duplicate recommendation bindings",()=>{
 assert.throws(()=>buildInternalLinkMutationPreview({recommendations,bindings:[{recommendationFingerprint:fp("f"),descriptor,proposedStateFingerprint:fp("3")}]}),/unknown_recommendation/);
 const r=recommendations.recommendations[0]!;
 const b={recommendationFingerprint:r.recommendationFingerprint,descriptor,proposedStateFingerprint:fp("3")};
 assert.throws(()=>buildInternalLinkMutationPreview({recommendations,bindings:[b,b]}),/duplicate_binding/);
});

test("UGP-8.2C rejects unchanged proposed state",()=>{
 const r=recommendations.recommendations[0]!;
 assert.throws(()=>buildInternalLinkMutationPreview({recommendations,bindings:[{recommendationFingerprint:r.recommendationFingerprint,descriptor,proposedStateFingerprint:r.sourceStateFingerprint}]}),/state_unchanged/);
});

test("UGP-8.2C rejects descriptor provider drift",()=>{
 const otherConnection=buildUniversalConnectionIdentity({site,connectionId:"shop-1",provider:"shopify",externalAccountId:"store-1",connectionMode:"native_api"});
 const otherRegistry=buildUniversalCapabilityRegistry({site,connection:otherConnection,provider:"shopify",connectorVersion:"test-v1",credentialProfileId:"shop-test-profile",capabilities:[
  {capability:"write.internal_links",resourceKinds:["article"],verification:"required",rollback:"supported",maxOperationsPerRequest:10,maxPayloadBytes:100000},
  {capability:"preview.change",resourceKinds:["article"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:10,maxPayloadBytes:100000},
 ]});
 const other=buildUniversalConnectorDescriptor({connectorId:"shop",connectorKind:"native_api",registry:otherRegistry});
 const r=recommendations.recommendations.find(x=>x.direction==="new_content_to_existing")!;
 assert.throws(()=>buildInternalLinkMutationPreview({recommendations,bindings:[{recommendationFingerprint:r.recommendationFingerprint,descriptor:other,proposedStateFingerprint:fp("8")}]}),/descriptor_provider_mismatch/);
});

test("UGP-8.2C integrity detects tampering",()=>{
 const r=recommendations.recommendations[0]!;
 const result=buildInternalLinkMutationPreview({recommendations,bindings:[{recommendationFingerprint:r.recommendationFingerprint,descriptor,proposedStateFingerprint:fp("9")}]});
 assert.throws(()=>assertInternalLinkMutationPreviewIntegrity({...result,resultFingerprint:fp("0")}),/result_fingerprint_mismatch/);
});
