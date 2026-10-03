import assert from "node:assert/strict";
import test from "node:test";
import { buildUniversalCapabilityRegistry } from "./universal-capability-registry.js";
import { buildUniversalConnectorDescriptor } from "./universal-connector-contract.js";
import { buildUniversalConnectionIdentity, buildUniversalResourceLocator, buildUniversalSiteIdentity } from "./universal-site-resource-identity.js";
import { buildInternalLinkingRecommendations } from "./internal-linking-recommendation-contract.js";
import { buildInternalLinkMutationPreview } from "./internal-link-mutation-preview.js";
import { assertInternalLinkProviderPatchCertificationIntegrity, buildInternalLinkProviderPatchCertification, mapInternalLinkPreviewToGitMarkdown, mapInternalLinkPreviewToShopify, mapInternalLinkPreviewToWebflow, mapInternalLinkPreviewToWordPress } from "./internal-link-provider-patch-mapping.js";

const fp=(c:string)=>c.repeat(64);
function fixture(provider:string,connectorKind:"native_api"|"git",kind:"article"|"page",externalId:string){
 const site=buildUniversalSiteIdentity({siteId:"site-"+provider,canonicalOrigin:"https://example.test"});
 const connection=buildUniversalConnectionIdentity({site,connectionId:"c-"+provider,provider,externalAccountId:"acct",connectionMode:connectorKind});
 const registry=buildUniversalCapabilityRegistry({site,connection,provider,connectorVersion:"test-v1",credentialProfileId:"profile",capabilities:[
  {capability:"write.internal_links",resourceKinds:[kind],verification:"required",rollback:"supported",maxOperationsPerRequest:10,maxPayloadBytes:2000000},
  {capability:"preview.change",resourceKinds:[kind],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:10,maxPayloadBytes:2000000},
  ...(connectorKind==="git"?[
   {capability:"git.branch" as const,resourceKinds:["page" as const],verification:"required" as const,rollback:"unsupported" as const,maxOperationsPerRequest:10,maxPayloadBytes:2000000},
   {capability:"git.commit" as const,resourceKinds:["page" as const],verification:"required" as const,rollback:"supported" as const,maxOperationsPerRequest:10,maxPayloadBytes:2000000},
   {capability:"git.pull_request" as const,resourceKinds:["page" as const],verification:"required" as const,rollback:"unsupported" as const,maxOperationsPerRequest:10,maxPayloadBytes:2000000},
   {capability:"read.metadata" as const,resourceKinds:["page" as const],verification:"not_applicable" as const,rollback:"not_applicable" as const,maxOperationsPerRequest:10,maxPayloadBytes:2000000},
  ]:[])
 ]});
 const descriptor=buildUniversalConnectorDescriptor({connectorId:"d-"+provider,connectorKind,registry});
 const source=buildUniversalResourceLocator({site,connection,provider,kind,externalId,canonicalUrl:"https://example.test/source"});
 const target=buildUniversalResourceLocator({site,connection,provider,kind,externalId:"target",canonicalUrl:"https://example.test/target"});
 const recs=buildInternalLinkingRecommendations({newContent:source,candidates:[{direction:"new_content_to_existing",source,target,sourceStateFingerprint:fp("1"),targetStateFingerprint:fp("2"),anchorText:"target guide",context:"Relevant source paragraph.",topicalRelevance:0.9,contextualFit:0.8,businessRelevance:0.7,supportingEvidenceFingerprints:[fp("a")],alreadyLinked:false}]});
 const preview=buildInternalLinkMutationPreview({recommendations:recs,bindings:[{recommendationFingerprint:recs.recommendations[0]!.recommendationFingerprint,descriptor,proposedStateFingerprint:fp("3")}]});
 return {preview,entry:preview.entries[0]!};
}

test("UGP-8.2D maps all four providers and certifies coverage",()=>{
 const s=fixture("shopify","native_api","article","gid://shopify/Article/123");
 const w=fixture("wordpress","native_api","article","42");
 const f=fixture("webflow","native_api","article","aaaaaaaaaaaaaaaaaaaaaaaa");
 const g=fixture("github","git","article","content/source.mdx");
 const shop=mapInternalLinkPreviewToShopify({preview:s.preview,entryFingerprint:s.entry.entryFingerprint,resourceId:"gid://shopify/Article/123",proposedContent:'<p>Read the <a href="https://example.test/target">target guide</a>.</p>'});
 const wp=mapInternalLinkPreviewToWordPress({preview:w.preview,entryFingerprint:w.entry.entryFingerprint,postId:42,proposedContent:'<p>Read the <a href="https://example.test/target">target guide</a>.</p>'});
 const webflow=mapInternalLinkPreviewToWebflow({preview:f.preview,entryFingerprint:f.entry.entryFingerprint,collectionId:"bbbbbbbbbbbbbbbbbbbbbbbb",itemId:"aaaaaaaaaaaaaaaaaaaaaaaa",bodyFieldSlug:"body",proposedContent:'<p>Read the <a href="https://example.test/target">target guide</a>.</p>'});
 const git=mapInternalLinkPreviewToGitMarkdown({preview:g.preview,entryFingerprint:g.entry.entryFingerprint,format:"mdx",repository:"owner/repo",defaultBranch:"main",baseCommitSha:"c".repeat(40),workingBranch:"seo/internal-link",filePath:"content/source.mdx",expectedBlobSha:"d".repeat(40),framework:"Next.js",contentSource:"MDX",detectionEvidencePaths:["package.json"],proposedContent:"Read the [target guide](<https://example.test/target>)."});
 const cert=buildInternalLinkProviderPatchCertification([shop,wp,webflow,git]);
 assert.deepEqual(cert.providerCoverage,["git_markdown","shopify","webflow","wordpress"]);
 assert.equal(cert.semantics.executionRequestConstructed,false);
 assertInternalLinkProviderPatchCertificationIntegrity(cert);
});

test("UGP-8.2D Shopify page uses pageUpdate body-only mapping",()=>{
 const x=fixture("shopify","native_api","page","gid://shopify/Page/456");
 const m=mapInternalLinkPreviewToShopify({preview:x.preview,entryFingerprint:x.entry.entryFingerprint,resourceId:"gid://shopify/Page/456",proposedContent:'<p><a href="https://example.test/target">target guide</a></p>'});
 assert.equal(m.provider,"shopify"); if(m.provider!=="shopify")return;
 assert.equal(m.operation,"pageUpdate");
 assert.deepEqual((m.variables as any).page,{body:'<p><a href="https://example.test/target">target guide</a></p>'});
});

test("UGP-8.2D WordPress page maps to pages route",()=>{
 const x=fixture("wordpress","native_api","page","77");
 const m=mapInternalLinkPreviewToWordPress({preview:x.preview,entryFingerprint:x.entry.entryFingerprint,postId:77,proposedContent:'<a href="https://example.test/target">target guide</a>'});
 assert.equal(m.provider,"wordpress");if(m.provider!=="wordpress")return;assert.equal(m.route,"/wp-json/wp/v2/pages/77");
});

test("UGP-8.2D requires exact link markup exactly once",()=>{
 const x=fixture("wordpress","native_api","article","42");
 assert.throws(()=>mapInternalLinkPreviewToWordPress({preview:x.preview,entryFingerprint:x.entry.entryFingerprint,postId:42,proposedContent:"No link here."}),/exact_link_markup_required/);
 const twice='<a href="https://example.test/target">target guide</a> <a href="https://example.test/target">target guide</a>';
 assert.throws(()=>mapInternalLinkPreviewToWordPress({preview:x.preview,entryFingerprint:x.entry.entryFingerprint,postId:42,proposedContent:twice}),/exact_link_markup_required/);
});

test("UGP-8.2D Git mapping denies default-branch write",()=>{
 const g=fixture("github","git","article","content/source.mdx");
 assert.throws(()=>mapInternalLinkPreviewToGitMarkdown({preview:g.preview,entryFingerprint:g.entry.entryFingerprint,format:"mdx",repository:"owner/repo",defaultBranch:"main",baseCommitSha:"c".repeat(40),workingBranch:"main",filePath:"content/source.mdx",expectedBlobSha:"d".repeat(40),framework:"Next.js",contentSource:"MDX",detectionEvidencePaths:["package.json"],proposedContent:"[target guide](<https://example.test/target>)"}),/ugp_git_default_branch_write_denied/);
});
