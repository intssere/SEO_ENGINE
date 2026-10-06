import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachWorkspaceIntegrity,
  buildAuthorityOutreachWorkspace,
  UGP_AUTHORITY_OUTREACH_WORKSPACE_VERSION,
  type AuthorityOutreachReviewInput,
  type AuthorityOutreachWorkspaceState,
} from "./authority-outreach-workspace.js";
import type {
  AuthorityProspectQualificationResult,
  AuthorityProspectRiskClass,
} from "./authority-prospect-qualification.js";
import type { AuthorityOpportunityKind } from "./authority-opportunity-discovery.js";

export const UGP_AUTHORITY_OUTREACH_DRAFT_BRIEF_VERSION =
  "ugp-10-4-outreach-draft-brief-v1" as const;

export type AuthorityOutreachDraftPurposeCode =
  | "competitor_gap_context"
  | "shared_referrer_context"
  | "broken_reference_context"
  | "unlinked_mention_context"
  | "lost_link_recovery_context"
  | "resource_page_context"
  | "partner_citation_context"
  | "content_promotion_context";

export type AuthorityOutreachDraftPreparationState =
  | "draft_brief_ready"
  | "target_binding_required"
  | "human_review_required"
  | "rejected"
  | "deferred"
  | "qualification_blocked";

export type AuthorityOutreachDraftBrief = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_DRAFT_BRIEF_VERSION;
  briefId: string;
  briefFingerprint: string;
  workspaceVersion: typeof UGP_AUTHORITY_OUTREACH_WORKSPACE_VERSION;
  workspaceFingerprint: string;
  workspaceItemId: string;
  workspaceItemFingerprint: string;
  qualificationFingerprint: string;
  prospectFingerprint: string;
  opportunityFingerprint: string;
  approvalReviewFingerprint: string;
  kind: AuthorityOpportunityKind;
  draftPurposeCode: AuthorityOutreachDraftPurposeCode;
  sourceDomain: string;
  sourceUrl: string | null;
  targetDomain: string;
  targetUrl: string;
  qualificationScore: number;
  evidenceCoverage: number;
  riskClass: AuthorityProspectRiskClass;
  evidenceFingerprints: readonly string[];
  constraints: Readonly<{
    claimsMustBeEvidenceBacked: true;
    relationshipClaimsMayNotBeInvented: true;
    contactDetailsMayNotBeInvented: true;
    targetPageMustRemainExact: true;
    humanEditRequiredBeforeFutureSend: true;
    paidOrReciprocalLinkSchemeAuthorized: false;
  }>;
}>;

export type AuthorityOutreachDraftPreparationItem = Readonly<{
  workspaceItemId: string;
  workspaceItemFingerprint: string;
  prospectFingerprint: string;
  opportunityFingerprint: string;
  kind: AuthorityOpportunityKind;
  sourceDomain: string;
  sourceUrl: string | null;
  targetUrl: string | null;
  workspaceState: AuthorityOutreachWorkspaceState;
  state: AuthorityOutreachDraftPreparationState;
  blockerCode:
    | "human_review_required"
    | "review_rejected"
    | "review_deferred"
    | "qualification_not_draft_eligible"
    | "owned_target_page_missing"
    | null;
  brief: AuthorityOutreachDraftBrief | null;
}>;

export type AuthorityOutreachDraftPreparation = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_DRAFT_BRIEF_VERSION;
  targetDomain: string;
  qualificationFingerprint: string;
  workspaceFingerprint: string;
  items: readonly AuthorityOutreachDraftPreparationItem[];
  summary: Readonly<{
    total: number;
    draftBriefReady: number;
    targetBindingRequired: number;
    humanReviewRequired: number;
    rejected: number;
    deferred: number;
    qualificationBlocked: number;
  }>;
  semantics: Readonly<{
    deterministic: true;
    evidenceBound: true;
    approvedForDraftRequired: true;
    existingTargetBindingOnly: true;
    contactDiscoveryAuthorized: false;
    contactDiscoveryPerformed: false;
    outreachDraftTextGenerationAuthorized: false;
    outreachDraftTextGenerated: false;
    outreachSendingAuthorized: false;
    outreachSendingPerformed: false;
    performsModelCall: false;
    performsProviderCall: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    schedulerEnabled: false;
    workerEnabled: false;
    providerWrites: false;
    publicSiteWrites: false;
    linkSchemeAutomationAuthorized: false;
  }>;
  preparationFingerprint: string;
}>;

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  evidenceBound:true as const,
  approvedForDraftRequired:true as const,
  existingTargetBindingOnly:true as const,
  contactDiscoveryAuthorized:false as const,
  contactDiscoveryPerformed:false as const,
  outreachDraftTextGenerationAuthorized:false as const,
  outreachDraftTextGenerated:false as const,
  outreachSendingAuthorized:false as const,
  outreachSendingPerformed:false as const,
  performsModelCall:false as const,
  performsProviderCall:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  schedulerEnabled:false as const,
  workerEnabled:false as const,
  providerWrites:false as const,
  publicSiteWrites:false as const,
  linkSchemeAutomationAuthorized:false as const,
});

const BRIEF_CONSTRAINTS=Object.freeze({
  claimsMustBeEvidenceBacked:true as const,
  relationshipClaimsMayNotBeInvented:true as const,
  contactDetailsMayNotBeInvented:true as const,
  targetPageMustRemainExact:true as const,
  humanEditRequiredBeforeFutureSend:true as const,
  paidOrReciprocalLinkSchemeAuthorized:false as const,
});

function stableJson(value:unknown):string{
  if(value===undefined) return "null";
  if(value===null||typeof value!=="object") return JSON.stringify(value);
  if(Array.isArray(value)) return "["+value.map(stableJson).join(",")+"]";
  const object=value as Record<string,unknown>;
  return "{"+Object.keys(object).sort().map(
    key=>JSON.stringify(key)+":"+stableJson(object[key]),
  ).join(",")+"}";
}

function hash(value:unknown):string{
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function purpose(kind:AuthorityOpportunityKind):AuthorityOutreachDraftPurposeCode{
  const map:Record<AuthorityOpportunityKind,AuthorityOutreachDraftPurposeCode>={
    competitor_link_gap:"competitor_gap_context",
    domain_intersection:"shared_referrer_context",
    broken_link_opportunity:"broken_reference_context",
    unlinked_brand_mention:"unlinked_mention_context",
    lost_link_recovery:"lost_link_recovery_context",
    resource_page_opportunity:"resource_page_context",
    partner_supplier_citation:"partner_citation_context",
    content_promotion_prospect:"content_promotion_context",
  };
  return map[kind];
}

function stateFor(
  workspaceState:AuthorityOutreachWorkspaceState,
  targetUrl:string|null,
):Readonly<{
  state:AuthorityOutreachDraftPreparationState;
  blockerCode:AuthorityOutreachDraftPreparationItem["blockerCode"];
}>{
  if(workspaceState==="approved_for_draft"){
    return targetUrl
      ?{state:"draft_brief_ready",blockerCode:null}
      :{state:"target_binding_required",blockerCode:"owned_target_page_missing"};
  }
  if(workspaceState==="rejected"){
    return {state:"rejected",blockerCode:"review_rejected"};
  }
  if(workspaceState==="deferred"){
    return {state:"deferred",blockerCode:"review_deferred"};
  }
  if(
    workspaceState==="awaiting_human_review"
    ||workspaceState==="qualification_review_required"
  ){
    return {state:"human_review_required",blockerCode:"human_review_required"};
  }
  return {
    state:"qualification_blocked",
    blockerCode:"qualification_not_draft_eligible",
  };
}

function assertTargetBinding(targetDomain:string,targetUrl:string):void{
  let parsed:URL;
  try{parsed=new URL(targetUrl);}catch{
    throw new Error("ugp_outreach_draft_invalid_target_url");
  }
  if(
    !["http:","https:"].includes(parsed.protocol)
    ||parsed.username
    ||parsed.password
    ||parsed.hostname.toLowerCase()!==targetDomain.toLowerCase()
  ){
    throw new Error("ugp_outreach_draft_target_binding_mismatch");
  }
}

export function buildAuthorityOutreachDraftPreparation(input:Readonly<{
  qualification:AuthorityProspectQualificationResult;
  reviews?:readonly AuthorityOutreachReviewInput[];
}>):AuthorityOutreachDraftPreparation{
  const workspaceInput={
    qualification:input.qualification,
    reviews:input.reviews??[],
  };
  const workspace=buildAuthorityOutreachWorkspace(workspaceInput);
  assertAuthorityOutreachWorkspaceIntegrity(workspace,workspaceInput);

  const items=Object.freeze(workspace.items.map(item=>{
    const status=stateFor(item.state,item.targetUrl);
    let brief:AuthorityOutreachDraftBrief|null=null;
    if(status.state==="draft_brief_ready"){
      if(!item.targetUrl){
        throw new Error("ugp_outreach_draft_ready_without_target");
      }
      if(
        item.latestReview?.decision!=="approved_for_draft"
        ||item.latestReview.reasonCode!=="editorial_fit_confirmed"
      ){
        throw new Error("ugp_outreach_draft_missing_human_approval");
      }
      assertTargetBinding(workspace.targetDomain,item.targetUrl);
      const base={
        version:UGP_AUTHORITY_OUTREACH_DRAFT_BRIEF_VERSION,
        workspaceVersion:workspace.version,
        workspaceFingerprint:workspace.workspaceFingerprint,
        workspaceItemId:item.workspaceItemId,
        workspaceItemFingerprint:item.workspaceItemFingerprint,
        qualificationFingerprint:item.qualificationFingerprint,
        prospectFingerprint:item.prospectFingerprint,
        opportunityFingerprint:item.opportunityFingerprint,
        approvalReviewFingerprint:item.latestReview.reviewFingerprint,
        kind:item.kind,
        draftPurposeCode:purpose(item.kind),
        sourceDomain:item.sourceDomain,
        sourceUrl:item.sourceUrl,
        targetDomain:workspace.targetDomain,
        targetUrl:item.targetUrl,
        qualificationScore:item.qualificationScore,
        evidenceCoverage:item.evidenceCoverage,
        riskClass:item.riskClass,
        evidenceFingerprints:Object.freeze([...item.evidenceFingerprints]),
        constraints:BRIEF_CONSTRAINTS,
      };
      const briefFingerprint=hash({
        purpose:"ugp_authority_outreach_draft_brief",
        ...base,
      });
      brief=Object.freeze({
        ...base,
        briefId:"uaodb-"+briefFingerprint.slice(0,24),
        briefFingerprint,
      });
    }
    return Object.freeze({
      workspaceItemId:item.workspaceItemId,
      workspaceItemFingerprint:item.workspaceItemFingerprint,
      prospectFingerprint:item.prospectFingerprint,
      opportunityFingerprint:item.opportunityFingerprint,
      kind:item.kind,
      sourceDomain:item.sourceDomain,
      sourceUrl:item.sourceUrl,
      targetUrl:item.targetUrl,
      workspaceState:item.state,
      state:status.state,
      blockerCode:status.blockerCode,
      brief,
    });
  }));

  const summary=Object.freeze({
    total:items.length,
    draftBriefReady:items.filter(item=>item.state==="draft_brief_ready").length,
    targetBindingRequired:items.filter(item=>item.state==="target_binding_required").length,
    humanReviewRequired:items.filter(item=>item.state==="human_review_required").length,
    rejected:items.filter(item=>item.state==="rejected").length,
    deferred:items.filter(item=>item.state==="deferred").length,
    qualificationBlocked:items.filter(item=>item.state==="qualification_blocked").length,
  });
  const base={
    version:UGP_AUTHORITY_OUTREACH_DRAFT_BRIEF_VERSION,
    targetDomain:workspace.targetDomain,
    qualificationFingerprint:workspace.qualificationFingerprint,
    workspaceFingerprint:workspace.workspaceFingerprint,
    items,
    summary,
    semantics:SEMANTICS,
  };
  return Object.freeze({
    ...base,
    preparationFingerprint:hash({
      purpose:"ugp_authority_outreach_draft_preparation",
      ...base,
    }),
  });
}

export function assertAuthorityOutreachDraftPreparationIntegrity(
  result:AuthorityOutreachDraftPreparation,
  input:Readonly<{
    qualification:AuthorityProspectQualificationResult;
    reviews?:readonly AuthorityOutreachReviewInput[];
  }>,
):void{
  if(
    !result
    ||result.version!==UGP_AUTHORITY_OUTREACH_DRAFT_BRIEF_VERSION
  ){
    throw new Error("ugp_outreach_draft_version_invalid");
  }
  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.evidenceBound!==true
    ||s.approvedForDraftRequired!==true
    ||s.existingTargetBindingOnly!==true
    ||s.contactDiscoveryAuthorized!==false
    ||s.contactDiscoveryPerformed!==false
    ||s.outreachDraftTextGenerationAuthorized!==false
    ||s.outreachDraftTextGenerated!==false
    ||s.outreachSendingAuthorized!==false
    ||s.outreachSendingPerformed!==false
    ||s.performsModelCall!==false
    ||s.performsProviderCall!==false
    ||s.performsNetworkOperation!==false
    ||s.performsPersistence!==false
    ||s.schedulerEnabled!==false
    ||s.workerEnabled!==false
    ||s.providerWrites!==false
    ||s.publicSiteWrites!==false
    ||s.linkSchemeAutomationAuthorized!==false
  ){
    throw new Error("ugp_outreach_draft_unsafe_semantics");
  }
  const expected=buildAuthorityOutreachDraftPreparation(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error("ugp_outreach_draft_integrity_mismatch");
  }
}
