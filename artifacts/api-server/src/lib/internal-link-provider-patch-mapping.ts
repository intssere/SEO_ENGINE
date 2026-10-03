import { buildControlledGitPlan, assertControlledGitPlanIntegrity, type ControlledGitPlan } from "./controlled-git-connector.js";
import {
  assertInternalLinkMutationPreviewIntegrity,
  type InternalLinkMutationPreviewEntry,
  type InternalLinkMutationPreviewResult,
} from "./internal-link-mutation-preview.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_INTERNAL_LINK_PROVIDER_PATCH_VERSION =
  "ugp-8-2d-provider-internal-link-patch-mapping-v1" as const;

export type InternalLinkProvider = "shopify"|"wordpress"|"webflow"|"git_markdown";
export type InternalLinkProviderPatch =
  | Readonly<{provider:"shopify";version:typeof UGP_INTERNAL_LINK_PROVIDER_PATCH_VERSION;previewEntryFingerprint:string;operation:"articleUpdate"|"pageUpdate";requiredAnyScopes:readonly ["write_content","write_online_store_pages"];variables:Readonly<Record<string,unknown>>;proposedContentFingerprint:string;linkMarkup:string;semantics:typeof SEMANTICS;mappingFingerprint:string}>
  | Readonly<{provider:"wordpress";version:typeof UGP_INTERNAL_LINK_PROVIDER_PATCH_VERSION;previewEntryFingerprint:string;method:"POST";route:string;body:Readonly<{content:string}>;proposedContentFingerprint:string;linkMarkup:string;semantics:typeof SEMANTICS;mappingFingerprint:string}>
  | Readonly<{provider:"webflow";version:typeof UGP_INTERNAL_LINK_PROVIDER_PATCH_VERSION;previewEntryFingerprint:string;method:"PATCH";path:string;body:Readonly<{fieldData:Readonly<Record<string,string>>}>;proposedContentFingerprint:string;linkMarkup:string;semantics:typeof SEMANTICS;mappingFingerprint:string}>
  | Readonly<{provider:"git_markdown";version:typeof UGP_INTERNAL_LINK_PROVIDER_PATCH_VERSION;previewEntryFingerprint:string;format:"md"|"mdx";filePath:string;proposedContent:string;proposedContentFingerprint:string;linkMarkup:string;controlledGitPlan:ControlledGitPlan;semantics:typeof GIT_SEMANTICS;mappingFingerprint:string}>;

export type InternalLinkProviderPatchCertification = Readonly<{
  version:"ugp-8-2d-provider-internal-link-patch-certification-v1";
  mappings:readonly InternalLinkProviderPatch[];
  providerCoverage:readonly ["git_markdown","shopify","webflow","wordpress"];
  semantics:Readonly<{
    deterministic:true;
    mappingOnly:true;
    previewLineageRequired:true;
    exactLinkMarkupRequired:true;
    executionRequestConstructed:false;
    performsNetworkOperation:false;
    performsPersistence:false;
    usesCredentials:false;
    executionAuthorized:false;
    providerWrites:false;
    publicSiteWrites:false;
  }>;
  certificationFingerprint:string;
}>;

const HEX40=/^[0-9a-f]{40}$/;
const HEX64=/^[0-9a-f]{64}$/;
const OBJECT_ID=/^[0-9a-f]{24}$/;
const SHOP_ARTICLE=/^gid:\/\/shopify\/Article\/[0-9]+$/;
const SHOP_PAGE=/^gid:\/\/shopify\/Page\/[0-9]+$/;
const FIELD=/^[A-Za-z0-9_-]{1,128}$/;

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  mappingOnly:true as const,
  exactProposedContentRequired:true as const,
  exactLinkMarkupRequired:true as const,
  previewLineageRequired:true as const,
  executionRequestConstructed:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  usesCredentials:false as const,
  executionAuthorized:false as const,
  providerWrites:false as const,
  publicSiteWrites:false as const,
});
const GIT_SEMANTICS=Object.freeze({...SEMANTICS,branchAndPullRequestOnly:true as const,directDefaultBranchWrite:false as const});

function fp(v:unknown,f:string):string{if(typeof v!=="string"||!HEX64.test(v))throw new Error("ugp_internal_link_patch_invalid_"+f);return v;}
function text(v:unknown,f:string,max:number):string{if(typeof v!=="string"||v.length<1||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v))throw new Error("ugp_internal_link_patch_invalid_"+f);return v;}
function entry(result:InternalLinkMutationPreviewResult,entryFingerprint:string):InternalLinkMutationPreviewEntry{
  assertInternalLinkMutationPreviewIntegrity(result);
  fp(entryFingerprint,"entry_fingerprint");
  const found=result.entries.find(e=>e.entryFingerprint===entryFingerprint);
  if(!found)throw new Error("ugp_internal_link_patch_unknown_preview_entry");
  if(found.mutationIntent.capability!=="write.internal_links")throw new Error("ugp_internal_link_patch_capability_invalid");
  return found;
}
function htmlEscape(s:string):string{return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function htmlMarkup(e:InternalLinkMutationPreviewEntry):string{return `<a href="${htmlEscape(e.targetUrl)}">${htmlEscape(e.anchorText)}</a>`;}
function markdownText(s:string):string{return s.replace(/\\/g,"\\\\").replace(/\[/g,"\\[").replace(/\]/g,"\\]");}
function markdownMarkup(e:InternalLinkMutationPreviewEntry):string{return `[${markdownText(e.anchorText)}](<${e.targetUrl}>)`;}
function proposed(content:unknown,markup:string):Readonly<{content:string;fingerprint:string}>{
  const value=text(content,"proposed_content",2_000_000);
  const first=value.indexOf(markup);
  if(first<0||value.indexOf(markup,first+markup.length)>=0)throw new Error("ugp_internal_link_patch_exact_link_markup_required");
  return Object.freeze({content:value,fingerprint:stableEvidenceHash({purpose:"ugp_internal_link_provider_proposed_content",content:value})});
}
function fingerprint(base:Record<string,unknown>):string{return stableEvidenceHash({purpose:"ugp_internal_link_provider_patch_mapping",...base});}

export function mapInternalLinkPreviewToShopify(input:{preview:InternalLinkMutationPreviewResult;entryFingerprint:string;resourceId:string;proposedContent:string}):InternalLinkProviderPatch{
  const e=entry(input.preview,input.entryFingerprint);
  if(e.mutationIntent.descriptor.provider!=="shopify")throw new Error("ugp_internal_link_patch_shopify_provider_required");
  const kind=e.mutationIntent.target.kind;
  let operation:"articleUpdate"|"pageUpdate";
  if(kind==="article"||kind==="blog_post"){if(!SHOP_ARTICLE.test(input.resourceId))throw new Error("ugp_internal_link_patch_invalid_shopify_article_id");operation="articleUpdate";}
  else if(kind==="page"||kind==="landing_page"){if(!SHOP_PAGE.test(input.resourceId))throw new Error("ugp_internal_link_patch_invalid_shopify_page_id");operation="pageUpdate";}
  else throw new Error("ugp_internal_link_patch_shopify_kind_unsupported");
  const targetId=e.mutationIntent.target.externalId;
  if(targetId&&targetId!==input.resourceId)throw new Error("ugp_internal_link_patch_shopify_target_id_mismatch");
  const linkMarkup=htmlMarkup(e);const p=proposed(input.proposedContent,linkMarkup);
  const variables=Object.freeze({id:input.resourceId,[operation==="articleUpdate"?"article":"page"]:Object.freeze({body:p.content})});
  const base={provider:"shopify" as const,version:UGP_INTERNAL_LINK_PROVIDER_PATCH_VERSION,previewEntryFingerprint:e.entryFingerprint,operation,requiredAnyScopes:Object.freeze(["write_content","write_online_store_pages"] as const),variables,proposedContentFingerprint:p.fingerprint,linkMarkup,semantics:SEMANTICS};
  return Object.freeze({...base,mappingFingerprint:fingerprint(base)});
}

export function mapInternalLinkPreviewToWordPress(input:{preview:InternalLinkMutationPreviewResult;entryFingerprint:string;postId:number;proposedContent:string}):InternalLinkProviderPatch{
  const e=entry(input.preview,input.entryFingerprint);
  if(e.mutationIntent.descriptor.provider!=="wordpress")throw new Error("ugp_internal_link_patch_wordpress_provider_required");
  if(!Number.isSafeInteger(input.postId)||input.postId<=0)throw new Error("ugp_internal_link_patch_invalid_wordpress_id");
  const kind=e.mutationIntent.target.kind;
  const segment=kind==="page"||kind==="landing_page"?"pages":kind==="article"||kind==="blog_post"?"posts":null;
  if(!segment)throw new Error("ugp_internal_link_patch_wordpress_kind_unsupported");
  const ext=e.mutationIntent.target.externalId;
  if(ext!==null&&ext!==String(input.postId))throw new Error("ugp_internal_link_patch_wordpress_target_id_mismatch");
  const linkMarkup=htmlMarkup(e);const p=proposed(input.proposedContent,linkMarkup);
  const base={provider:"wordpress" as const,version:UGP_INTERNAL_LINK_PROVIDER_PATCH_VERSION,previewEntryFingerprint:e.entryFingerprint,method:"POST" as const,route:`/wp-json/wp/v2/${segment}/${input.postId}`,body:Object.freeze({content:p.content}),proposedContentFingerprint:p.fingerprint,linkMarkup,semantics:SEMANTICS};
  return Object.freeze({...base,mappingFingerprint:fingerprint(base)});
}

export function mapInternalLinkPreviewToWebflow(input:{preview:InternalLinkMutationPreviewResult;entryFingerprint:string;collectionId:string;itemId:string;bodyFieldSlug:string;proposedContent:string}):InternalLinkProviderPatch{
  const e=entry(input.preview,input.entryFingerprint);
  if(e.mutationIntent.descriptor.provider!=="webflow")throw new Error("ugp_internal_link_patch_webflow_provider_required");
  if(!OBJECT_ID.test(input.collectionId)||!OBJECT_ID.test(input.itemId))throw new Error("ugp_internal_link_patch_invalid_webflow_id");
  if(!FIELD.test(input.bodyFieldSlug)||input.bodyFieldSlug==="name"||input.bodyFieldSlug==="slug")throw new Error("ugp_internal_link_patch_invalid_webflow_body_field");
  const ext=e.mutationIntent.target.externalId;
  if(ext!==null&&ext!==input.itemId)throw new Error("ugp_internal_link_patch_webflow_target_id_mismatch");
  const linkMarkup=htmlMarkup(e);const p=proposed(input.proposedContent,linkMarkup);
  const fieldData=Object.freeze({[input.bodyFieldSlug]:p.content});
  const base={provider:"webflow" as const,version:UGP_INTERNAL_LINK_PROVIDER_PATCH_VERSION,previewEntryFingerprint:e.entryFingerprint,method:"PATCH" as const,path:`/v2/collections/${input.collectionId}/items/${input.itemId}`,body:Object.freeze({fieldData}),proposedContentFingerprint:p.fingerprint,linkMarkup,semantics:SEMANTICS};
  return Object.freeze({...base,mappingFingerprint:fingerprint(base)});
}

export function mapInternalLinkPreviewToGitMarkdown(input:{preview:InternalLinkMutationPreviewResult;entryFingerprint:string;format:"md"|"mdx";repository:string;defaultBranch:string;baseCommitSha:string;workingBranch:string;filePath:string;expectedBlobSha:string;framework:string|null;contentSource:string|null;detectionEvidencePaths:readonly string[];proposedContent:string}):InternalLinkProviderPatch{
  const e=entry(input.preview,input.entryFingerprint);
  if(e.mutationIntent.descriptor.connectorKind!=="git")throw new Error("ugp_internal_link_patch_git_connector_required");
  if(input.format!=="md"&&input.format!=="mdx")throw new Error("ugp_internal_link_patch_invalid_git_format");
  const extension=input.format==="md"?".md":".mdx";
  if(!input.filePath.endsWith(extension)||input.filePath.startsWith("/")||input.filePath.includes("\\")||input.filePath.split("/").some(x=>!x||x==="."||x===".."))throw new Error("ugp_internal_link_patch_invalid_git_path");
  if(!HEX40.test(input.expectedBlobSha))throw new Error("ugp_internal_link_patch_invalid_git_blob_sha");
  const ext=e.mutationIntent.target.externalId;
  if(ext!==null&&ext!==input.filePath)throw new Error("ugp_internal_link_patch_git_target_path_mismatch");
  const linkMarkup=markdownMarkup(e);const p=proposed(input.proposedContent,linkMarkup);
  const controlledGitPlan=buildControlledGitPlan({descriptor:e.mutationIntent.descriptor,repository:input.repository,defaultBranch:input.defaultBranch,baseCommitSha:input.baseCommitSha,workingBranch:input.workingBranch,detection:{framework:input.framework,contentSource:input.contentSource,evidencePaths:input.detectionEvidencePaths},patches:[{path:input.filePath,expectedBlobSha:input.expectedBlobSha,proposedContentFingerprint:p.fingerprint}]});
  assertControlledGitPlanIntegrity(controlledGitPlan);
  const base={provider:"git_markdown" as const,version:UGP_INTERNAL_LINK_PROVIDER_PATCH_VERSION,previewEntryFingerprint:e.entryFingerprint,format:input.format,filePath:input.filePath,proposedContent:p.content,proposedContentFingerprint:p.fingerprint,linkMarkup,controlledGitPlan,semantics:GIT_SEMANTICS};
  return Object.freeze({...base,mappingFingerprint:fingerprint(base)});
}

export function assertInternalLinkProviderPatchIntegrity(mapping:InternalLinkProviderPatch):void{
  if(!mapping||mapping.version!==UGP_INTERNAL_LINK_PROVIDER_PATCH_VERSION)throw new Error("ugp_internal_link_patch_version_invalid");
  fp(mapping.previewEntryFingerprint,"preview_entry_fingerprint");fp(mapping.proposedContentFingerprint,"proposed_content_fingerprint");fp(mapping.mappingFingerprint,"mapping_fingerprint");
  if(mapping.semantics.mappingOnly!==true||mapping.semantics.deterministic!==true||mapping.semantics.previewLineageRequired!==true||mapping.semantics.exactLinkMarkupRequired!==true||mapping.semantics.executionRequestConstructed!==false||mapping.semantics.performsNetworkOperation!==false||mapping.semantics.performsPersistence!==false||mapping.semantics.usesCredentials!==false||mapping.semantics.executionAuthorized!==false||mapping.semantics.providerWrites!==false||mapping.semantics.publicSiteWrites!==false)throw new Error("ugp_internal_link_patch_unsafe_semantics");
  if(mapping.provider==="git_markdown"){assertControlledGitPlanIntegrity(mapping.controlledGitPlan);if(mapping.semantics.branchAndPullRequestOnly!==true||mapping.semantics.directDefaultBranchWrite!==false)throw new Error("ugp_internal_link_patch_git_unsafe_semantics");}
  const {mappingFingerprint,...base}=mapping;
  if(mappingFingerprint!==fingerprint(base as unknown as Record<string,unknown>))throw new Error("ugp_internal_link_patch_fingerprint_mismatch");
}

const CERT_SEMANTICS=Object.freeze({deterministic:true as const,mappingOnly:true as const,previewLineageRequired:true as const,exactLinkMarkupRequired:true as const,executionRequestConstructed:false as const,performsNetworkOperation:false as const,performsPersistence:false as const,usesCredentials:false as const,executionAuthorized:false as const,providerWrites:false as const,publicSiteWrites:false as const});
export function buildInternalLinkProviderPatchCertification(mappings:readonly InternalLinkProviderPatch[]):InternalLinkProviderPatchCertification{
  if(!Array.isArray(mappings)||mappings.length!==4)throw new Error("ugp_internal_link_patch_cert_exact_provider_matrix_required");
  mappings.forEach(assertInternalLinkProviderPatchIntegrity);
  const ordered=[...mappings].sort((a,b)=>a.provider.localeCompare(b.provider));
  const providers=ordered.map(x=>x.provider);
  const expected=["git_markdown","shopify","webflow","wordpress"];
  if(providers.some((p,i)=>p!==expected[i]))throw new Error("ugp_internal_link_patch_cert_provider_coverage_invalid");
  const base={version:"ugp-8-2d-provider-internal-link-patch-certification-v1" as const,mappings:Object.freeze(ordered),providerCoverage:Object.freeze(expected as ["git_markdown","shopify","webflow","wordpress"]),semantics:CERT_SEMANTICS};
  return Object.freeze({...base,certificationFingerprint:stableEvidenceHash({purpose:"ugp_internal_link_provider_patch_certification",...base})});
}
export function assertInternalLinkProviderPatchCertificationIntegrity(c:InternalLinkProviderPatchCertification):void{
  const rebuilt=buildInternalLinkProviderPatchCertification(c.mappings);
  if(rebuilt.certificationFingerprint!==c.certificationFingerprint)throw new Error("ugp_internal_link_patch_cert_fingerprint_mismatch");
}
