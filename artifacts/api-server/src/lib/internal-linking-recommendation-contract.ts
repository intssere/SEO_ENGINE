import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import {
  assertUniversalResourceLocatorIntegrity,
  type UniversalResourceLocator,
} from "./universal-site-resource-identity.js";

export const UGP_INTERNAL_LINKING_RECOMMENDATION_VERSION =
  "ugp-8-2a-internal-linking-recommendation-v1" as const;

export const UGP_INTERNAL_LINKING_POLICY = Object.freeze({
  maxCandidatesPerDirection: 64,
  maxEvidenceFingerprintsPerCandidate: 16,
  maxAnchorTextChars: 160,
  maxContextChars: 1000,
} as const);

export type InternalLinkDirection =
  | "new_content_to_existing"
  | "existing_to_new_content";

export type InternalLinkCandidateInput = Readonly<{
  direction: InternalLinkDirection;
  source: UniversalResourceLocator;
  target: UniversalResourceLocator;
  sourceStateFingerprint: string;
  targetStateFingerprint: string;
  anchorText: string;
  context: string;
  topicalRelevance: number;
  contextualFit: number;
  businessRelevance: number;
  supportingEvidenceFingerprints: readonly string[];
  alreadyLinked: boolean;
}>;

export type InternalLinkRecommendation = Readonly<{
  direction: InternalLinkDirection;
  source: UniversalResourceLocator;
  target: UniversalResourceLocator;
  sourceStateFingerprint: string;
  targetStateFingerprint: string;
  anchorText: string;
  context: string;
  score: number;
  signals: Readonly<{
    topicalRelevance: number;
    contextualFit: number;
    businessRelevance: number;
  }>;
  supportingEvidenceFingerprints: readonly string[];
  recommendationFingerprint: string;
}>;

export type InternalLinkingRecommendationResult = Readonly<{
  version: typeof UGP_INTERNAL_LINKING_RECOMMENDATION_VERSION;
  newContent: UniversalResourceLocator;
  recommendations: readonly InternalLinkRecommendation[];
  summary: Readonly<{
    newContentToExisting: number;
    existingToNewContent: number;
    total: number;
  }>;
  semantics: Readonly<{
    deterministic: true;
    evidenceBacked: true;
    planningOnly: true;
    performsNetworkOperation: false;
    performsPersistence: false;
    mutatesContent: false;
    grantsAuthorization: false;
    executionAuthorized: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  resultFingerprint: string;
}>;

const HEX64=/^[0-9a-f]{64}$/;
const SEMANTICS=Object.freeze({
  deterministic:true as const,
  evidenceBacked:true as const,
  planningOnly:true as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  mutatesContent:false as const,
  grantsAuthorization:false as const,
  executionAuthorized:false as const,
  providerWrites:false as const,
  publicSiteWrites:false as const,
});

function exactFingerprint(value:unknown,field:string):string{
  if(typeof value!=="string"||!HEX64.test(value)) throw new Error("ugp_internal_link_invalid_"+field);
  return value;
}
function exactText(value:unknown,field:string,max:number):string{
  if(typeof value!=="string"||value!==value.trim()||value.length<1||value.length>max||/[\u0000-\u001f\u007f]/.test(value)){
    throw new Error("ugp_internal_link_invalid_"+field);
  }
  return value;
}
function exactScore(value:unknown,field:string):number{
  if(typeof value!=="number"||!Number.isFinite(value)||value<0||value>1) throw new Error("ugp_internal_link_invalid_"+field);
  return Math.round(value*10000)/10000;
}
function sameSite(a:UniversalResourceLocator,b:UniversalResourceLocator):boolean{
  return a.siteId===b.siteId&&a.siteIdentityFingerprint===b.siteIdentityFingerprint;
}
function canonicalKey(locator:UniversalResourceLocator):string{
  return locator.canonicalUrl ?? locator.provider+":"+locator.externalId;
}
function normalizeEvidence(values:readonly string[]):readonly string[]{
  if(!Array.isArray(values)||values.length<1||values.length>UGP_INTERNAL_LINKING_POLICY.maxEvidenceFingerprintsPerCandidate){
    throw new Error("ugp_internal_link_invalid_evidence");
  }
  return Object.freeze([...new Set(values.map(v=>exactFingerprint(v,"evidence_fingerprint")))].sort());
}
function assertDirection(
  direction:InternalLinkDirection,
  source:UniversalResourceLocator,
  target:UniversalResourceLocator,
  newContent:UniversalResourceLocator,
):void{
  if(direction==="new_content_to_existing"){
    if(source.resourceLocatorFingerprint!==newContent.resourceLocatorFingerprint) throw new Error("ugp_internal_link_direction_source_mismatch");
    if(target.resourceLocatorFingerprint===newContent.resourceLocatorFingerprint) throw new Error("ugp_internal_link_self_link");
    return;
  }
  if(direction==="existing_to_new_content"){
    if(target.resourceLocatorFingerprint!==newContent.resourceLocatorFingerprint) throw new Error("ugp_internal_link_direction_target_mismatch");
    if(source.resourceLocatorFingerprint===newContent.resourceLocatorFingerprint) throw new Error("ugp_internal_link_self_link");
    return;
  }
  throw new Error("ugp_internal_link_invalid_direction");
}

export function buildInternalLinkingRecommendations(input:{
  newContent:UniversalResourceLocator;
  candidates:readonly InternalLinkCandidateInput[];
}):InternalLinkingRecommendationResult{
  if(!input||typeof input!=="object"||Array.isArray(input)) throw new Error("ugp_internal_link_invalid_input");
  assertUniversalResourceLocatorIntegrity(input.newContent);
  if(!input.newContent.canonicalUrl) throw new Error("ugp_internal_link_new_content_canonical_url_required");
  if(input.newContent.kind!=="article"&&input.newContent.kind!=="blog_post"&&input.newContent.kind!=="page"&&input.newContent.kind!=="landing_page"){
    throw new Error("ugp_internal_link_new_content_kind_invalid");
  }
  if(!Array.isArray(input.candidates)) throw new Error("ugp_internal_link_candidates_required");

  const dirCounts=new Map<InternalLinkDirection,number>();
  const pairKeys=new Set<string>();
  const recommendations:InternalLinkRecommendation[]=[];

  for(const candidate of input.candidates){
    assertUniversalResourceLocatorIntegrity(candidate.source);
    assertUniversalResourceLocatorIntegrity(candidate.target);
    if(!sameSite(candidate.source,input.newContent)||!sameSite(candidate.target,input.newContent)) throw new Error("ugp_internal_link_cross_site_candidate");
    if(!candidate.source.canonicalUrl||!candidate.target.canonicalUrl) throw new Error("ugp_internal_link_canonical_url_required");
    assertDirection(candidate.direction,candidate.source,candidate.target,input.newContent);
    if(candidate.alreadyLinked!==false) throw new Error("ugp_internal_link_already_linked");

    const next=(dirCounts.get(candidate.direction)??0)+1;
    if(next>UGP_INTERNAL_LINKING_POLICY.maxCandidatesPerDirection) throw new Error("ugp_internal_link_direction_limit_exceeded");
    dirCounts.set(candidate.direction,next);

    const pairKey=candidate.direction+":"+canonicalKey(candidate.source)+"->"+canonicalKey(candidate.target);
    if(pairKeys.has(pairKey)) throw new Error("ugp_internal_link_duplicate_candidate");
    pairKeys.add(pairKey);

    const topicalRelevance=exactScore(candidate.topicalRelevance,"topical_relevance");
    const contextualFit=exactScore(candidate.contextualFit,"contextual_fit");
    const businessRelevance=exactScore(candidate.businessRelevance,"business_relevance");
    const supportingEvidenceFingerprints=normalizeEvidence(candidate.supportingEvidenceFingerprints);
    const base={
      direction:candidate.direction,
      source:candidate.source,
      target:candidate.target,
      sourceStateFingerprint:exactFingerprint(candidate.sourceStateFingerprint,"source_state_fingerprint"),
      targetStateFingerprint:exactFingerprint(candidate.targetStateFingerprint,"target_state_fingerprint"),
      anchorText:exactText(candidate.anchorText,"anchor_text",UGP_INTERNAL_LINKING_POLICY.maxAnchorTextChars),
      context:exactText(candidate.context,"context",UGP_INTERNAL_LINKING_POLICY.maxContextChars),
      score:Math.round(((topicalRelevance*0.5)+(contextualFit*0.3)+(businessRelevance*0.2))*10000)/10000,
      signals:Object.freeze({topicalRelevance,contextualFit,businessRelevance}),
      supportingEvidenceFingerprints,
    };
    recommendations.push(Object.freeze({
      ...base,
      recommendationFingerprint:stableEvidenceHash({
        purpose:"ugp_internal_link_recommendation",
        version:UGP_INTERNAL_LINKING_RECOMMENDATION_VERSION,
        ...base,
      }),
    }));
  }

  recommendations.sort((a,b)=>b.score-a.score||a.direction.localeCompare(b.direction)||a.source.canonicalUrl!.localeCompare(b.source.canonicalUrl!)||a.target.canonicalUrl!.localeCompare(b.target.canonicalUrl!));
  const n2e=recommendations.filter(r=>r.direction==="new_content_to_existing").length;
  const e2n=recommendations.filter(r=>r.direction==="existing_to_new_content").length;
  const base={
    version:UGP_INTERNAL_LINKING_RECOMMENDATION_VERSION,
    newContent:input.newContent,
    recommendations:Object.freeze(recommendations),
    summary:Object.freeze({newContentToExisting:n2e,existingToNewContent:e2n,total:recommendations.length}),
    semantics:SEMANTICS,
  };
  return Object.freeze({...base,resultFingerprint:stableEvidenceHash({purpose:"ugp_internal_link_recommendation_result",...base})});
}

export function assertInternalLinkingRecommendationIntegrity(result:InternalLinkingRecommendationResult):void{
  if(!result||result.version!==UGP_INTERNAL_LINKING_RECOMMENDATION_VERSION) throw new Error("ugp_internal_link_version_invalid");
  assertUniversalResourceLocatorIntegrity(result.newContent);
  if(result.semantics.deterministic!==true||result.semantics.evidenceBacked!==true||result.semantics.planningOnly!==true||result.semantics.performsNetworkOperation!==false||result.semantics.performsPersistence!==false||result.semantics.mutatesContent!==false||result.semantics.grantsAuthorization!==false||result.semantics.executionAuthorized!==false||result.semantics.providerWrites!==false||result.semantics.publicSiteWrites!==false){
    throw new Error("ugp_internal_link_unsafe_semantics");
  }
  const n2e=result.recommendations.filter(r=>r.direction==="new_content_to_existing").length;
  const e2n=result.recommendations.filter(r=>r.direction==="existing_to_new_content").length;
  if(result.summary.newContentToExisting!==n2e||result.summary.existingToNewContent!==e2n||result.summary.total!==result.recommendations.length) throw new Error("ugp_internal_link_summary_mismatch");
  for(const rec of result.recommendations){
    const {recommendationFingerprint,...base}=rec;
    const expected=stableEvidenceHash({purpose:"ugp_internal_link_recommendation",version:UGP_INTERNAL_LINKING_RECOMMENDATION_VERSION,...base});
    if(recommendationFingerprint!==expected) throw new Error("ugp_internal_link_recommendation_fingerprint_mismatch");
  }
  const {resultFingerprint,...base}=result;
  const expected=stableEvidenceHash({purpose:"ugp_internal_link_recommendation_result",...base});
  if(resultFingerprint!==expected) throw new Error("ugp_internal_link_result_fingerprint_mismatch");
}
