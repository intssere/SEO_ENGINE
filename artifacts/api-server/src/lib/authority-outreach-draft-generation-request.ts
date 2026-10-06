import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachDraftPreparationIntegrity,
  buildAuthorityOutreachDraftPreparation,
  type AuthorityOutreachDraftPurposeCode,
} from "./authority-outreach-draft-brief.js";
import {
  assertAuthorityOutreachTargetBindingProjectionIntegrity,
  buildAuthorityOutreachTargetBindingProjection,
  type AuthorityOutreachTargetBindingInput,
} from "./authority-outreach-target-binding.js";
import {
  buildAuthorityOutreachWorkspace,
  type AuthorityOutreachReviewInput,
} from "./authority-outreach-workspace.js";
import type {
  AuthorityProspectQualificationResult,
  AuthorityProspectRiskClass,
} from "./authority-prospect-qualification.js";
import type { AuthorityOpportunityKind } from "./authority-opportunity-discovery.js";
import type { UniversalResourceIdentity } from "./universal-site-resource-identity.js";

export const UGP_AUTHORITY_OUTREACH_DRAFT_GENERATION_REQUEST_VERSION =
  "ugp-10-6-outreach-draft-generation-request-v1" as const;

export type AuthorityOutreachDraftGenerationRequest = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_DRAFT_GENERATION_REQUEST_VERSION;
  requestId: string;
  requestFingerprint: string;
  targetBindingProjectionFingerprint: string;
  preparationFingerprint: string;
  workspaceFingerprint: string;
  workspaceItemFingerprint: string;
  qualificationFingerprint: string;
  prospectFingerprint: string;
  opportunityFingerprint: string;
  approvalReviewFingerprint: string;
  targetBindingFingerprint: string | null;
  resourceIdentityFingerprint: string | null;
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
  requestedOutput: Readonly<{
    format: "plain_text";
    subjectRequired: true;
    subjectMaxChars: 120;
    bodyRequired: true;
    bodyMaxChars: 3000;
    oneMessageOnly: true;
  }>;
  constraints: Readonly<{
    useOnlySuppliedEvidenceForFactualClaims: true;
    doNotInventRelationshipHistory: true;
    doNotInventRecipientIdentity: true;
    doNotInventContactDetails: true;
    doNotUsePrivateOrUnverifiedContactData: true;
    targetUrlMustRemainExact: true;
    doNotOfferPaymentForLinks: true;
    doNotOfferReciprocalLinks: true;
    doNotPromiseRankingOutcomes: true;
    doNotRepresentMessageAsAlreadySent: true;
    humanReviewRequiredBeforeSend: true;
    sendingNotAuthorized: true;
  }>;
}>;

export type AuthorityOutreachDraftGenerationRequestItem = Readonly<{
  prospectFingerprint: string;
  opportunityFingerprint: string;
  state:
    | "generation_request_ready"
    | "target_binding_required"
    | "human_review_required"
    | "rejected"
    | "deferred"
    | "qualification_blocked";
  request: AuthorityOutreachDraftGenerationRequest | null;
}>;

export type AuthorityOutreachDraftGenerationRequestProjection = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_DRAFT_GENERATION_REQUEST_VERSION;
  targetDomain: string;
  qualificationFingerprint: string;
  workspaceFingerprint: string;
  preparationFingerprint: string;
  targetBindingProjectionFingerprint: string;
  items: readonly AuthorityOutreachDraftGenerationRequestItem[];
  summary: Readonly<{
    total: number;
    generationRequestReady: number;
    targetBindingRequired: number;
    humanReviewRequired: number;
    rejected: number;
    deferred: number;
    qualificationBlocked: number;
  }>;
  semantics: Readonly<{
    deterministic: true;
    evidenceBound: true;
    requestEnvelopeOnly: true;
    recipientDataIncluded: false;
    contactDiscoveryAuthorized: false;
    contactDiscoveryPerformed: false;
    outreachDraftTextGenerationAuthorized: false;
    outreachDraftTextGenerated: false;
    modelExecutionAuthorized: false;
    performsModelCall: false;
    performsProviderCall: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    outreachSendingAuthorized: false;
    outreachSendingPerformed: false;
    schedulerEnabled: false;
    workerEnabled: false;
    providerWrites: false;
    publicSiteWrites: false;
    linkSchemeAutomationAuthorized: false;
  }>;
  projectionFingerprint: string;
}>;

const REQUESTED_OUTPUT=Object.freeze({
  format:"plain_text" as const,
  subjectRequired:true as const,
  subjectMaxChars:120 as const,
  bodyRequired:true as const,
  bodyMaxChars:3000 as const,
  oneMessageOnly:true as const,
});

const CONSTRAINTS=Object.freeze({
  useOnlySuppliedEvidenceForFactualClaims:true as const,
  doNotInventRelationshipHistory:true as const,
  doNotInventRecipientIdentity:true as const,
  doNotInventContactDetails:true as const,
  doNotUsePrivateOrUnverifiedContactData:true as const,
  targetUrlMustRemainExact:true as const,
  doNotOfferPaymentForLinks:true as const,
  doNotOfferReciprocalLinks:true as const,
  doNotPromiseRankingOutcomes:true as const,
  doNotRepresentMessageAsAlreadySent:true as const,
  humanReviewRequiredBeforeSend:true as const,
  sendingNotAuthorized:true as const,
});

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  evidenceBound:true as const,
  requestEnvelopeOnly:true as const,
  recipientDataIncluded:false as const,
  contactDiscoveryAuthorized:false as const,
  contactDiscoveryPerformed:false as const,
  outreachDraftTextGenerationAuthorized:false as const,
  outreachDraftTextGenerated:false as const,
  modelExecutionAuthorized:false as const,
  performsModelCall:false as const,
  performsProviderCall:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  outreachSendingAuthorized:false as const,
  outreachSendingPerformed:false as const,
  schedulerEnabled:false as const,
  workerEnabled:false as const,
  providerWrites:false as const,
  publicSiteWrites:false as const,
  linkSchemeAutomationAuthorized:false as const,
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

function assertTarget(targetDomain:string,targetUrl:string):void{
  let parsed:URL;
  try{parsed=new URL(targetUrl);}catch{
    throw new Error("ugp_outreach_draft_request_target_invalid");
  }
  if(
    parsed.protocol!=="https:"
    ||parsed.username
    ||parsed.password
    ||parsed.search
    ||parsed.hash
    ||parsed.hostname.toLowerCase()!==targetDomain.toLowerCase()
  ){
    throw new Error("ugp_outreach_draft_request_target_mismatch");
  }
}

export function buildAuthorityOutreachDraftGenerationRequestProjection(
  input:Readonly<{
    qualification:AuthorityProspectQualificationResult;
    reviews?:readonly AuthorityOutreachReviewInput[];
    resources?:readonly UniversalResourceIdentity[];
    bindings?:readonly AuthorityOutreachTargetBindingInput[];
  }>,
):AuthorityOutreachDraftGenerationRequestProjection{
  const preparationInput={
    qualification:input.qualification,
    reviews:input.reviews??[],
  };
  const preparation=buildAuthorityOutreachDraftPreparation(preparationInput);
  assertAuthorityOutreachDraftPreparationIntegrity(
    preparation,
    preparationInput,
  );

  const targetBindingInput={
    qualification:input.qualification,
    reviews:input.reviews??[],
    resources:input.resources??[],
    bindings:input.bindings??[],
  };
  const targetProjection=buildAuthorityOutreachTargetBindingProjection(
    targetBindingInput,
  );
  assertAuthorityOutreachTargetBindingProjectionIntegrity(
    targetProjection,
    targetBindingInput,
  );
  if(
    targetProjection.preparationFingerprint
    !==preparation.preparationFingerprint
    ||targetProjection.workspaceFingerprint!==preparation.workspaceFingerprint
    ||targetProjection.qualificationFingerprint
      !==preparation.qualificationFingerprint
  ){
    throw new Error("ugp_outreach_draft_request_lineage_mismatch");
  }

  const preparationByProspect=new Map(
    preparation.items.map(item=>[item.prospectFingerprint,item]),
  );

  const items=Object.freeze(targetProjection.items.map(targetItem=>{
    const prepared=preparationByProspect.get(targetItem.prospectFingerprint);
    if(!prepared){
      throw new Error("ugp_outreach_draft_request_missing_preparation_item");
    }
    const ready=
      targetItem.state==="draft_brief_ready_existing_target"
      ||targetItem.state==="draft_brief_ready_bound_target";
    if(!ready){
      return Object.freeze({
        prospectFingerprint:targetItem.prospectFingerprint,
        opportunityFingerprint:targetItem.opportunityFingerprint,
        state:targetItem.state,
        request:null,
      });
    }

    const targetUrl=targetItem.resolvedTargetUrl;
    if(!targetUrl){
      throw new Error("ugp_outreach_draft_request_ready_without_target");
    }
    assertTarget(targetProjection.targetDomain,targetUrl);
    if(prepared.workspaceState!=="approved_for_draft"){
      throw new Error("ugp_outreach_draft_request_without_human_approval");
    }

    const reviewWorkspace=buildAuthorityOutreachWorkspace({
      qualification:input.qualification,
      reviews:input.reviews??[],
    });
    const reviewedItem=reviewWorkspace.items.find(
      candidate=>candidate.prospectFingerprint===prepared.prospectFingerprint,
    );
    if(
      reviewedItem?.latestReview?.decision!=="approved_for_draft"
      ||reviewedItem.latestReview.reasonCode!=="editorial_fit_confirmed"
    ){
      throw new Error("ugp_outreach_draft_request_approval_missing");
    }
    const approvalReviewFingerprint=
      reviewedItem.latestReview.reviewFingerprint;

    const prospect=input.qualification.prospects.find(
      candidate=>candidate.prospectFingerprint===prepared.prospectFingerprint,
    );
    if(!prospect){
      throw new Error("ugp_outreach_draft_request_unknown_prospect");
    }

    const existingBrief=prepared.brief;
    const targetBinding=targetItem.targetBinding;
    const draftPurposeCode=existingBrief?.draftPurposeCode
      ??({
        competitor_link_gap:"competitor_gap_context",
        domain_intersection:"shared_referrer_context",
        broken_link_opportunity:"broken_reference_context",
        unlinked_brand_mention:"unlinked_mention_context",
        lost_link_recovery:"lost_link_recovery_context",
        resource_page_opportunity:"resource_page_context",
        partner_supplier_citation:"partner_citation_context",
        content_promotion_prospect:"content_promotion_context",
      } as const)[prepared.kind];

    const base={
      version:UGP_AUTHORITY_OUTREACH_DRAFT_GENERATION_REQUEST_VERSION,
      targetBindingProjectionFingerprint:targetProjection.projectionFingerprint,
      preparationFingerprint:preparation.preparationFingerprint,
      workspaceFingerprint:preparation.workspaceFingerprint,
      workspaceItemFingerprint:prepared.workspaceItemFingerprint,
      qualificationFingerprint:preparation.qualificationFingerprint,
      prospectFingerprint:prepared.prospectFingerprint,
      opportunityFingerprint:prepared.opportunityFingerprint,
      approvalReviewFingerprint,
      targetBindingFingerprint:targetBinding?.bindingFingerprint??null,
      resourceIdentityFingerprint:
        targetBinding?.resourceIdentityFingerprint??null,
      kind:prepared.kind,
      draftPurposeCode,
      sourceDomain:prepared.sourceDomain,
      sourceUrl:prepared.sourceUrl,
      targetDomain:targetProjection.targetDomain,
      targetUrl,
      qualificationScore:prospect.score,
      evidenceCoverage:prospect.evidenceCoverage,
      riskClass:prospect.riskClass,
      evidenceFingerprints:Object.freeze([...prospect.evidenceFingerprints]),
      requestedOutput:REQUESTED_OUTPUT,
      constraints:CONSTRAINTS,
    };
    const requestFingerprint=hash({
      purpose:"ugp_authority_outreach_draft_generation_request",
      ...base,
    });
    const request=Object.freeze({
      ...base,
      requestId:"uaodr-"+requestFingerprint.slice(0,24),
      requestFingerprint,
    });
    return Object.freeze({
      prospectFingerprint:targetItem.prospectFingerprint,
      opportunityFingerprint:targetItem.opportunityFingerprint,
      state:"generation_request_ready" as const,
      request,
    });
  }));

  const summary=Object.freeze({
    total:items.length,
    generationRequestReady:items.filter(
      item=>item.state==="generation_request_ready",
    ).length,
    targetBindingRequired:items.filter(
      item=>item.state==="target_binding_required",
    ).length,
    humanReviewRequired:items.filter(
      item=>item.state==="human_review_required",
    ).length,
    rejected:items.filter(item=>item.state==="rejected").length,
    deferred:items.filter(item=>item.state==="deferred").length,
    qualificationBlocked:items.filter(
      item=>item.state==="qualification_blocked",
    ).length,
  });
  const base={
    version:UGP_AUTHORITY_OUTREACH_DRAFT_GENERATION_REQUEST_VERSION,
    targetDomain:targetProjection.targetDomain,
    qualificationFingerprint:targetProjection.qualificationFingerprint,
    workspaceFingerprint:targetProjection.workspaceFingerprint,
    preparationFingerprint:targetProjection.preparationFingerprint,
    targetBindingProjectionFingerprint:targetProjection.projectionFingerprint,
    items,
    summary,
    semantics:SEMANTICS,
  };
  return Object.freeze({
    ...base,
    projectionFingerprint:hash({
      purpose:"ugp_authority_outreach_draft_generation_request_projection",
      ...base,
    }),
  });
}

export function assertAuthorityOutreachDraftGenerationRequestProjectionIntegrity(
  result:AuthorityOutreachDraftGenerationRequestProjection,
  input:Readonly<{
    qualification:AuthorityProspectQualificationResult;
    reviews?:readonly AuthorityOutreachReviewInput[];
    resources?:readonly UniversalResourceIdentity[];
    bindings?:readonly AuthorityOutreachTargetBindingInput[];
  }>,
):void{
  if(
    !result
    ||result.version!==UGP_AUTHORITY_OUTREACH_DRAFT_GENERATION_REQUEST_VERSION
  ){
    throw new Error("ugp_outreach_draft_request_version_invalid");
  }
  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.evidenceBound!==true
    ||s.requestEnvelopeOnly!==true
    ||s.recipientDataIncluded!==false
    ||s.contactDiscoveryAuthorized!==false
    ||s.contactDiscoveryPerformed!==false
    ||s.outreachDraftTextGenerationAuthorized!==false
    ||s.outreachDraftTextGenerated!==false
    ||s.modelExecutionAuthorized!==false
    ||s.performsModelCall!==false
    ||s.performsProviderCall!==false
    ||s.performsNetworkOperation!==false
    ||s.performsPersistence!==false
    ||s.outreachSendingAuthorized!==false
    ||s.outreachSendingPerformed!==false
    ||s.schedulerEnabled!==false
    ||s.workerEnabled!==false
    ||s.providerWrites!==false
    ||s.publicSiteWrites!==false
    ||s.linkSchemeAutomationAuthorized!==false
  ){
    throw new Error("ugp_outreach_draft_request_unsafe_semantics");
  }
  const expected=buildAuthorityOutreachDraftGenerationRequestProjection(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error("ugp_outreach_draft_request_integrity_mismatch");
  }
}
