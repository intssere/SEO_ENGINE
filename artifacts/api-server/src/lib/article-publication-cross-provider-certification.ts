import type { ArticlePublicationOperation } from "./article-publishing-contract.js";
import { assertGitMarkdownArticlePublishingMappingIntegrity, type GitMarkdownArticlePublishingMapping } from "./git-markdown-article-publishing-mapping.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import { assertShopifyArticlePublishingMappingIntegrity, type ShopifyArticlePublishingMapping } from "./shopify-article-publishing-mapping.js";
import { assertWebflowArticlePublishingMappingIntegrity, type WebflowArticlePublishingMapping } from "./webflow-article-publishing-mapping.js";
import { assertWordPressArticlePublishingMappingIntegrity, type WordPressArticlePublishingMapping } from "./wordpress-article-publishing-mapping.js";

export const UGP_ARTICLE_PUBLICATION_CERT_VERSION =
  "ugp-8-1-cross-provider-article-publication-cert-v1" as const;

export type PublicationProvider = "shopify"|"wordpress"|"webflow"|"git_markdown";
export type PublicationEvidence = Readonly<{
  provider: PublicationProvider;
  operation: ArticlePublicationOperation;
  sourcePlanFingerprint: string;
  mappingFingerprint: string;
  expectedVerificationStateFingerprint: string;
  mappingOnly: true;
  deterministic: true;
  performsNetworkOperation: false;
  performsPersistence: false;
  usesCredentials: false;
  executionAuthorized: false;
  providerWrites: false;
  publicSiteWrites: false;
}>;

export type PublicationCrossProviderCertification = Readonly<{
  version: typeof UGP_ARTICLE_PUBLICATION_CERT_VERSION;
  evidence: readonly PublicationEvidence[];
  providerCoverage: readonly ["git_markdown","shopify","webflow","wordpress"];
  operationCoverage: readonly ["create","publish","update"];
  exactMatrixComplete: true;
  sameOperationLineageRequired: true;
  sameOperationVerificationStateRequired: true;
  certificationFingerprint: string;
}>;

const PROVIDERS=Object.freeze(["git_markdown","shopify","webflow","wordpress"] as const);
const OPERATIONS=Object.freeze(["create","publish","update"] as const);
const FP=/^[0-9a-f]{64}$/;
function fp(v:unknown,f:string){if(typeof v!=="string"||!FP.test(v))throw new Error("ugp_article_publication_cert_invalid_"+f);return v;}
function semantics(mapping:{semantics:Record<string,unknown>}){
 const s=mapping.semantics;
 if(s.mappingOnly!==true||s.deterministic!==true||s.performsNetworkOperation!==false||s.performsPersistence!==false||s.usesCredentials!==false||s.executionAuthorized!==false||s.providerWrites!==false||s.publicSiteWrites!==false) throw new Error("ugp_article_publication_cert_unsafe_semantics");
}
function evidence(provider:PublicationProvider,m:{sourceOperation:ArticlePublicationOperation;sourcePlanFingerprint:string;mappingFingerprint:string;expectedVerificationStateFingerprint:string;semantics:Record<string,unknown>}):PublicationEvidence{
 semantics(m);
 return Object.freeze({provider,operation:m.sourceOperation,sourcePlanFingerprint:fp(m.sourcePlanFingerprint,"source_plan"),mappingFingerprint:fp(m.mappingFingerprint,"mapping"),expectedVerificationStateFingerprint:fp(m.expectedVerificationStateFingerprint,"verification_state"),mappingOnly:true,deterministic:true,performsNetworkOperation:false,performsPersistence:false,usesCredentials:false,executionAuthorized:false,providerWrites:false,publicSiteWrites:false});
}
export function certifyShopifyArticlePublicationMapping(m:ShopifyArticlePublishingMapping):PublicationEvidence{assertShopifyArticlePublishingMappingIntegrity(m);return evidence("shopify",m as unknown as Parameters<typeof evidence>[1]);}
export function certifyWordPressArticlePublicationMapping(m:WordPressArticlePublishingMapping):PublicationEvidence{assertWordPressArticlePublishingMappingIntegrity(m);return evidence("wordpress",m as unknown as Parameters<typeof evidence>[1]);}
export function certifyWebflowArticlePublicationMapping(m:WebflowArticlePublishingMapping):PublicationEvidence{assertWebflowArticlePublishingMappingIntegrity(m);return evidence("webflow",m as unknown as Parameters<typeof evidence>[1]);}
export function certifyGitMarkdownArticlePublicationMapping(m:GitMarkdownArticlePublishingMapping):PublicationEvidence{assertGitMarkdownArticlePublishingMappingIntegrity(m);return evidence("git_markdown",m as unknown as Parameters<typeof evidence>[1]);}

export function buildPublicationCrossProviderCertification(input:{evidence:readonly PublicationEvidence[]}):PublicationCrossProviderCertification{
 if(!input||!Array.isArray(input.evidence)||input.evidence.length!==12)throw new Error("ugp_article_publication_cert_exact_matrix_required");
 const rows=[...input.evidence].map(e=>Object.freeze({...e})).sort((a,b)=>a.provider.localeCompare(b.provider)||a.operation.localeCompare(b.operation));
 const keys=new Set(rows.map(r=>r.provider+":"+r.operation));
 if(keys.size!==12)throw new Error("ugp_article_publication_cert_duplicate_matrix_entry");
 for(const p of PROVIDERS)for(const o of OPERATIONS)if(!keys.has(p+":"+o))throw new Error("ugp_article_publication_cert_incomplete_matrix");
 for(const o of OPERATIONS){
   const sameOp=rows.filter(r=>r.operation===o);
   if(new Set(sameOp.map(r=>r.sourcePlanFingerprint)).size!==1)throw new Error("ugp_article_publication_cert_source_lineage_mismatch:"+o);
   if(new Set(sameOp.map(r=>r.expectedVerificationStateFingerprint)).size!==1)throw new Error("ugp_article_publication_cert_verification_state_mismatch:"+o);
   for(const r of sameOp){fp(r.mappingFingerprint,"mapping");if(r.mappingOnly!==true||r.deterministic!==true||r.performsNetworkOperation!==false||r.performsPersistence!==false||r.usesCredentials!==false||r.executionAuthorized!==false||r.providerWrites!==false||r.publicSiteWrites!==false)throw new Error("ugp_article_publication_cert_unsafe_evidence");}
 }
 const base={version:UGP_ARTICLE_PUBLICATION_CERT_VERSION,evidence:Object.freeze(rows),providerCoverage:PROVIDERS,operationCoverage:OPERATIONS,exactMatrixComplete:true as const,sameOperationLineageRequired:true as const,sameOperationVerificationStateRequired:true as const};
 return Object.freeze({...base,certificationFingerprint:stableEvidenceHash({purpose:"ugp_cross_provider_article_publication_certification",...base})});
}
export function assertPublicationCrossProviderCertificationIntegrity(c:PublicationCrossProviderCertification):void{
 if(!c||c.version!==UGP_ARTICLE_PUBLICATION_CERT_VERSION)throw new Error("ugp_article_publication_cert_version_invalid");
 const rebuilt=buildPublicationCrossProviderCertification({evidence:c.evidence});
 if(rebuilt.certificationFingerprint!==c.certificationFingerprint)throw new Error("ugp_article_publication_cert_fingerprint_mismatch");
}
