import {
  assertContentBriefOutlineIntegrity,
  type ContentBriefOutline,
} from "./content-brief-outline-contract.js";
import {
  buildInternalLinkingRecommendations,
  type InternalLinkCandidateInput,
  type InternalLinkingRecommendationResult,
} from "./internal-linking-recommendation-contract.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import {
  assertSourceEvidenceLedgerIntegrity,
  type SourceEvidenceLedger,
} from "./source-evidence-ledger-contract.js";
import {
  assertUniversalResourceLocatorIntegrity,
  type UniversalResourceLocator,
} from "./universal-site-resource-identity.js";

export const UGP_INTERNAL_LINKING_EVIDENCE_INTEGRATION_VERSION =
  "ugp-8-2b-internal-linking-evidence-integration-v1" as const;

export type ObservedInternalLinkAnchor = Readonly<{
  href: string;
  text: string;
}>;

export type ObservedPageLinkEvidence = Readonly<{
  page: UniversalResourceLocator;
  stateFingerprint: string;
  evidenceFingerprint: string;
  internalAnchors: readonly ObservedInternalLinkAnchor[];
}>;

export type InternalLinkRelevanceAssessment = Readonly<{
  source: UniversalResourceLocator;
  target: UniversalResourceLocator;
  topicalRelevance: number;
  contextualFit: number;
  businessRelevance: number;
  anchorText: string;
  context: string;
  evidenceFingerprints: readonly string[];
  assessmentFingerprint: string;
}>;

export type InternalLinkingEvidenceIntegrationResult = Readonly<{
  version: typeof UGP_INTERNAL_LINKING_EVIDENCE_INTEGRATION_VERSION;
  briefFingerprint: string;
  sourceEvidenceLedgerFingerprint: string;
  newContent: UniversalResourceLocator;
  newContentStateFingerprint: string;
  candidateInputs: readonly InternalLinkCandidateInput[];
  recommendations: InternalLinkingRecommendationResult;
  semantics: Readonly<{
    deterministic: true;
    capturedEvidenceOnly: true;
    planningOnly: true;
    derivesObservedLinkState: true;
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
  capturedEvidenceOnly:true as const,
  planningOnly:true as const,
  derivesObservedLinkState:true as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  mutatesContent:false as const,
  grantsAuthorization:false as const,
  executionAuthorized:false as const,
  providerWrites:false as const,
  publicSiteWrites:false as const,
});

function fp(value:unknown,field:string):string{
  if(typeof value!=="string"||!HEX64.test(value)) throw new Error("ugp_internal_link_evidence_invalid_"+field);
  return value;
}
function canonical(value:string,field:string):string{
  let u:URL;
  try{u=new URL(value);}catch{throw new Error("ugp_internal_link_evidence_invalid_"+field);}
  if((u.protocol!=="https:"&&u.protocol!=="http:")||u.username||u.password) throw new Error("ugp_internal_link_evidence_invalid_"+field);
  u.hash="";
  return u.toString();
}
function sameUrl(a:string,b:string):boolean{return canonical(a,"url_a")===canonical(b,"url_b");}
function normalizedAnchors(values:readonly ObservedInternalLinkAnchor[]):readonly ObservedInternalLinkAnchor[]{
  if(!Array.isArray(values)) throw new Error("ugp_internal_link_evidence_invalid_anchors");
  return Object.freeze(values.map(anchor=>{
    if(!anchor||typeof anchor.text!=="string"||!anchor.text.trim()) throw new Error("ugp_internal_link_evidence_invalid_anchor_text");
    return Object.freeze({href:canonical(anchor.href,"anchor_href"),text:anchor.text.trim()});
  }).sort((a,b)=>a.href.localeCompare(b.href)||a.text.localeCompare(b.text)));
}
function observedAlreadyLinked(evidence:ObservedPageLinkEvidence,targetUrl:string):boolean{
  return normalizedAnchors(evidence.internalAnchors).some(anchor=>sameUrl(anchor.href,targetUrl));
}
function assertEvidenceRecord(record:ObservedPageLinkEvidence):void{
  assertUniversalResourceLocatorIntegrity(record.page);
  if(!record.page.canonicalUrl) throw new Error("ugp_internal_link_evidence_page_url_required");
  fp(record.stateFingerprint,"page_state_fingerprint");
  fp(record.evidenceFingerprint,"page_evidence_fingerprint");
  normalizedAnchors(record.internalAnchors);
}
function assertAssessment(a:InternalLinkRelevanceAssessment):void{
  assertUniversalResourceLocatorIntegrity(a.source);
  assertUniversalResourceLocatorIntegrity(a.target);
  for(const [name,value] of [["topical",a.topicalRelevance],["contextual",a.contextualFit],["business",a.businessRelevance]] as const){
    if(typeof value!=="number"||!Number.isFinite(value)||value<0||value>1) throw new Error("ugp_internal_link_evidence_invalid_"+name+"_score");
  }
  if(typeof a.anchorText!=="string"||!a.anchorText.trim()) throw new Error("ugp_internal_link_evidence_invalid_anchor_text");
  if(typeof a.context!=="string"||!a.context.trim()) throw new Error("ugp_internal_link_evidence_invalid_context");
  if(!Array.isArray(a.evidenceFingerprints)||a.evidenceFingerprints.length<1) throw new Error("ugp_internal_link_evidence_assessment_evidence_required");
  const normalized=[...new Set(a.evidenceFingerprints.map(x=>fp(x,"assessment_evidence_fingerprint")))].sort();
  const expected=stableEvidenceHash({
    purpose:"ugp_internal_link_relevance_assessment",
    sourceLocatorFingerprint:a.source.resourceLocatorFingerprint,
    targetLocatorFingerprint:a.target.resourceLocatorFingerprint,
    topicalRelevance:a.topicalRelevance,
    contextualFit:a.contextualFit,
    businessRelevance:a.businessRelevance,
    anchorText:a.anchorText.trim(),
    context:a.context.trim(),
    evidenceFingerprints:normalized,
  });
  if(a.assessmentFingerprint!==expected) throw new Error("ugp_internal_link_evidence_assessment_fingerprint_mismatch");
}
function evidenceByUrl(records:readonly ObservedPageLinkEvidence[]):Map<string,ObservedPageLinkEvidence>{
  const map=new Map<string,ObservedPageLinkEvidence>();
  for(const record of records){
    assertEvidenceRecord(record);
    const key=canonical(record.page.canonicalUrl!,"page_url");
    if(map.has(key)) throw new Error("ugp_internal_link_evidence_duplicate_page_evidence");
    map.set(key,record);
  }
  return map;
}
function assessmentKey(source:UniversalResourceLocator,target:UniversalResourceLocator):string{
  return source.resourceLocatorFingerprint+"->"+target.resourceLocatorFingerprint;
}

export function buildInternalLinkingEvidenceIntegration(input:{
  brief:ContentBriefOutline;
  sourceEvidenceLedger:SourceEvidenceLedger;
  newContent:UniversalResourceLocator;
  newContentStateFingerprint:string;
  pageEvidence:readonly ObservedPageLinkEvidence[];
  relevanceAssessments:readonly InternalLinkRelevanceAssessment[];
}):InternalLinkingEvidenceIntegrationResult{
  assertContentBriefOutlineIntegrity(input.brief);
  assertSourceEvidenceLedgerIntegrity(input.sourceEvidenceLedger);
  assertUniversalResourceLocatorIntegrity(input.newContent);
  const newState=fp(input.newContentStateFingerprint,"new_content_state_fingerprint");
  if(!input.newContent.canonicalUrl) throw new Error("ugp_internal_link_evidence_new_content_url_required");
  if(input.brief.sourceEvidenceLedgerFingerprint!==input.sourceEvidenceLedger.ledgerFingerprint||input.brief.sourceEvidenceLedgerId!==input.sourceEvidenceLedger.ledgerId) throw new Error("ugp_internal_link_evidence_brief_ledger_lineage_mismatch");

  const pages=evidenceByUrl(input.pageEvidence);
  const assessments=new Map<string,InternalLinkRelevanceAssessment>();
  for(const assessment of input.relevanceAssessments){
    assertAssessment(assessment);
    const key=assessmentKey(assessment.source,assessment.target);
    if(assessments.has(key)) throw new Error("ugp_internal_link_evidence_duplicate_assessment");
    assessments.set(key,assessment);
  }

  const ledgerEvidence=new Map(input.sourceEvidenceLedger.evidence.map(e=>[e.evidenceId,e.evidenceFingerprint]));
  const candidates:InternalLinkCandidateInput[]=[];

  for(const target of input.brief.internalLinkTargets){
    const observed=pages.get(canonical(target.targetUrl,"brief_target_url"));
    if(!observed) throw new Error("ugp_internal_link_evidence_brief_target_not_observed");
    const assessment=assessments.get(assessmentKey(input.newContent,observed.page));
    if(!assessment) throw new Error("ugp_internal_link_evidence_outbound_assessment_missing");
    const briefEvidence=target.supportingEvidenceIds.map(id=>{
      const fingerprint=ledgerEvidence.get(id);
      if(!fingerprint) throw new Error("ugp_internal_link_evidence_unknown_brief_evidence");
      return fingerprint;
    });
    candidates.push(Object.freeze({
      direction:"new_content_to_existing",
      source:input.newContent,
      target:observed.page,
      sourceStateFingerprint:newState,
      targetStateFingerprint:observed.stateFingerprint,
      anchorText:assessment.anchorText.trim(),
      context:assessment.context.trim(),
      topicalRelevance:assessment.topicalRelevance,
      contextualFit:assessment.contextualFit,
      businessRelevance:assessment.businessRelevance,
      supportingEvidenceFingerprints:Object.freeze([...new Set([
        ...briefEvidence,
        observed.evidenceFingerprint,
        assessment.assessmentFingerprint,
        ...assessment.evidenceFingerprints,
      ])].sort()),
      alreadyLinked:false,
    }));
  }

  for(const observed of input.pageEvidence){
    if(observed.page.resourceLocatorFingerprint===input.newContent.resourceLocatorFingerprint) continue;
    const assessment=assessments.get(assessmentKey(observed.page,input.newContent));
    if(!assessment) continue;
    candidates.push(Object.freeze({
      direction:"existing_to_new_content",
      source:observed.page,
      target:input.newContent,
      sourceStateFingerprint:observed.stateFingerprint,
      targetStateFingerprint:newState,
      anchorText:assessment.anchorText.trim(),
      context:assessment.context.trim(),
      topicalRelevance:assessment.topicalRelevance,
      contextualFit:assessment.contextualFit,
      businessRelevance:assessment.businessRelevance,
      supportingEvidenceFingerprints:Object.freeze([...new Set([
        observed.evidenceFingerprint,
        assessment.assessmentFingerprint,
        ...assessment.evidenceFingerprints,
      ])].sort()),
      alreadyLinked:observedAlreadyLinked(observed,input.newContent.canonicalUrl),
    }));
  }

  const recommendations=buildInternalLinkingRecommendations({
    newContent:input.newContent,
    candidates,
  });
  const base={
    version:UGP_INTERNAL_LINKING_EVIDENCE_INTEGRATION_VERSION,
    briefFingerprint:input.brief.briefFingerprint,
    sourceEvidenceLedgerFingerprint:input.sourceEvidenceLedger.ledgerFingerprint,
    newContent:input.newContent,
    newContentStateFingerprint:newState,
    candidateInputs:Object.freeze(candidates),
    recommendations,
    semantics:SEMANTICS,
  };
  return Object.freeze({...base,resultFingerprint:stableEvidenceHash({purpose:"ugp_internal_link_evidence_integration",...base})});
}

export function assertInternalLinkingEvidenceIntegrationIntegrity(result:InternalLinkingEvidenceIntegrationResult):void{
  if(!result||result.version!==UGP_INTERNAL_LINKING_EVIDENCE_INTEGRATION_VERSION) throw new Error("ugp_internal_link_evidence_version_invalid");
  fp(result.briefFingerprint,"brief_fingerprint");
  fp(result.sourceEvidenceLedgerFingerprint,"source_evidence_ledger_fingerprint");
  fp(result.newContentStateFingerprint,"new_content_state_fingerprint");
  if(result.semantics.deterministic!==true||result.semantics.capturedEvidenceOnly!==true||result.semantics.planningOnly!==true||result.semantics.derivesObservedLinkState!==true||result.semantics.performsNetworkOperation!==false||result.semantics.performsPersistence!==false||result.semantics.mutatesContent!==false||result.semantics.grantsAuthorization!==false||result.semantics.executionAuthorized!==false||result.semantics.providerWrites!==false||result.semantics.publicSiteWrites!==false) throw new Error("ugp_internal_link_evidence_unsafe_semantics");
  const {resultFingerprint,...base}=result;
  const expected=stableEvidenceHash({purpose:"ugp_internal_link_evidence_integration",...base});
  if(resultFingerprint!==expected) throw new Error("ugp_internal_link_evidence_result_fingerprint_mismatch");
}
