import {
  assertArticleDraftPipelineIntegrity,
  type ArticleDraftPipelineResult,
} from "./article-draft-pipeline-contract.js";
import {
  assertArticleQualityGateIntegrity,
  type ArticleQualityGateResult,
} from "./article-quality-gate-contract.js";
import {
  assertArticlePublicationPlanIntegrity,
  type ArticlePublicationPlan,
} from "./article-publishing-contract.js";
import {
  assertContentCalendarProjectionIntegrity,
  type ContentCalendarProjection,
  type ContentCalendarScheduledItem,
} from "./content-calendar-policy-projection.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_CONTENT_CALENDAR_BINDING_VERSION =
  "ugp-8-3b-calendar-readiness-publication-binding-v1" as const;

export type ContentCalendarArticleBinding = Readonly<{
  version: typeof UGP_CONTENT_CALENDAR_BINDING_VERSION;
  calendarProjectionFingerprint: string;
  calendarItemFingerprint: string;
  opportunityFingerprint: string;
  scheduledDate: string;
  action: "create_candidate" | "refresh_candidate";
  requiredPublicationPlanOperation: "create" | "update";
  readinessFingerprint: string;
  draftId: string;
  draftFingerprint: string;
  qualityGateId: string;
  qualityGateFingerprint: string;
  publicationPlanFingerprint: string;
  publicationTargetLocatorFingerprint: string;
  reviewRequired: boolean;
  autopilotPolicySelected: boolean;
  semantics: Readonly<{
    deterministic: true;
    lineageBound: true;
    readinessMeansCompleteDraftAndPassingQualityGate: true;
    publicationPlanRequired: true;
    schedulerMaterialized: false;
    schedulerAuthorized: false;
    grantsAuthorization: false;
    publicationAuthorized: false;
    executionAuthorized: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  bindingFingerprint: string;
}>;

const HEX64=/^[0-9a-f]{64}$/;
const SEMANTICS=Object.freeze({
  deterministic:true as const,
  lineageBound:true as const,
  readinessMeansCompleteDraftAndPassingQualityGate:true as const,
  publicationPlanRequired:true as const,
  schedulerMaterialized:false as const,
  schedulerAuthorized:false as const,
  grantsAuthorization:false as const,
  publicationAuthorized:false as const,
  executionAuthorized:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  providerWrites:false as const,
  publicSiteWrites:false as const,
});

function fp(value:unknown,field:string):string{
  if(typeof value!=="string"||!HEX64.test(value)) throw new Error("ugp_content_calendar_binding_invalid_"+field);
  return value;
}

function assertReadyLineage(
  draft:ArticleDraftPipelineResult,
  qualityGate:ArticleQualityGateResult,
):void{
  assertArticleDraftPipelineIntegrity(draft);
  assertArticleQualityGateIntegrity(qualityGate);
  if(
    qualityGate.draftId!==draft.draftId
    || qualityGate.draftFingerprint!==draft.draftFingerprint
    || qualityGate.briefId!==draft.briefId
    || qualityGate.briefFingerprint!==draft.briefFingerprint
    || qualityGate.sourceEvidenceLedgerId!==draft.sourceEvidenceLedgerId
    || qualityGate.sourceEvidenceLedgerFingerprint!==draft.sourceEvidenceLedgerFingerprint
  ) throw new Error("ugp_content_calendar_binding_quality_draft_lineage_mismatch");
  if(draft.status!=="draft_complete"||draft.articleBody===null||draft.finishingAssets===null){
    throw new Error("ugp_content_calendar_binding_complete_draft_required");
  }
  if(qualityGate.status!=="pass"||qualityGate.approvalEligible!==true){
    throw new Error("ugp_content_calendar_binding_passing_quality_gate_required");
  }
  if(
    qualityGate.provenance.articleDraftFingerprint!==draft.draftFingerprint
    || qualityGate.provenance.contentOpportunityFingerprint!==draft.provenance.contentOpportunityFingerprint
  ) throw new Error("ugp_content_calendar_binding_quality_provenance_mismatch");
}

export function buildArticleCalendarReadinessFingerprint(input:{
  draft:ArticleDraftPipelineResult;
  qualityGate:ArticleQualityGateResult;
}):string{
  assertReadyLineage(input.draft,input.qualityGate);
  return stableEvidenceHash({
    purpose:"ugp_content_calendar_article_readiness",
    version:UGP_CONTENT_CALENDAR_BINDING_VERSION,
    draftId:input.draft.draftId,
    draftFingerprint:input.draft.draftFingerprint,
    qualityGateId:input.qualityGate.gateId,
    qualityGateFingerprint:input.qualityGate.gateFingerprint,
    contentOpportunityFingerprint:input.qualityGate.provenance.contentOpportunityFingerprint,
  });
}

function scheduledItem(
  calendar:ContentCalendarProjection,
  itemFingerprint:string,
):ContentCalendarScheduledItem{
  assertContentCalendarProjectionIntegrity(calendar);
  fp(itemFingerprint,"calendar_item_fingerprint");
  const item=calendar.scheduled.find(x=>x.itemFingerprint===itemFingerprint);
  if(!item) throw new Error("ugp_content_calendar_binding_unknown_calendar_item");
  return item;
}

export function buildContentCalendarArticleBinding(input:{
  calendar:ContentCalendarProjection;
  calendarItemFingerprint:string;
  draft:ArticleDraftPipelineResult;
  qualityGate:ArticleQualityGateResult;
  publicationPlan:ArticlePublicationPlan;
}):ContentCalendarArticleBinding{
  const item=scheduledItem(input.calendar,input.calendarItemFingerprint);
  assertReadyLineage(input.draft,input.qualityGate);
  assertArticlePublicationPlanIntegrity(input.publicationPlan);

  const readinessFingerprint=buildArticleCalendarReadinessFingerprint({
    draft:input.draft,
    qualityGate:input.qualityGate,
  });
  if(item.readinessFingerprint!==readinessFingerprint){
    throw new Error("ugp_content_calendar_binding_readiness_fingerprint_mismatch");
  }
  if(item.opportunityFingerprint!==input.qualityGate.provenance.contentOpportunityFingerprint){
    throw new Error("ugp_content_calendar_binding_opportunity_quality_mismatch");
  }
  if(item.opportunityFingerprint!==input.draft.provenance.contentOpportunityFingerprint){
    throw new Error("ugp_content_calendar_binding_opportunity_draft_mismatch");
  }

  const plan=input.publicationPlan;
  if(
    plan.draftId!==input.draft.draftId
    || plan.draftFingerprint!==input.draft.draftFingerprint
    || plan.qualityGateId!==input.qualityGate.gateId
    || plan.qualityGateFingerprint!==input.qualityGate.gateFingerprint
    || plan.provenance.articleDraftFingerprint!==input.draft.draftFingerprint
    || plan.provenance.articleQualityGateFingerprint!==input.qualityGate.gateFingerprint
    || plan.provenance.contentOpportunityFingerprint!==item.opportunityFingerprint
  ) throw new Error("ugp_content_calendar_binding_publication_plan_lineage_mismatch");

  const requiredPublicationPlanOperation=
    item.action==="create_candidate" ? "create" as const : "update" as const;
  if(plan.operation!==requiredPublicationPlanOperation){
    throw new Error("ugp_content_calendar_binding_publication_operation_mismatch");
  }
  if(
    plan.semantics.publicationAuthorized!==false
    || plan.semantics.executionAuthorized!==false
    || plan.semantics.executionRequestConstructed!==false
  ) throw new Error("ugp_content_calendar_binding_publication_plan_unsafe");

  const base={
    version:UGP_CONTENT_CALENDAR_BINDING_VERSION,
    calendarProjectionFingerprint:input.calendar.projectionFingerprint,
    calendarItemFingerprint:item.itemFingerprint,
    opportunityFingerprint:item.opportunityFingerprint,
    scheduledDate:item.scheduledDate,
    action:item.action,
    requiredPublicationPlanOperation,
    readinessFingerprint,
    draftId:input.draft.draftId,
    draftFingerprint:input.draft.draftFingerprint,
    qualityGateId:input.qualityGate.gateId,
    qualityGateFingerprint:input.qualityGate.gateFingerprint,
    publicationPlanFingerprint:plan.planFingerprint,
    publicationTargetLocatorFingerprint:plan.targetLocatorFingerprint,
    reviewRequired:item.reviewRequired,
    autopilotPolicySelected:item.autopilotPolicySelected,
    semantics:SEMANTICS,
  };
  return Object.freeze({
    ...base,
    bindingFingerprint:stableEvidenceHash({
      purpose:"ugp_content_calendar_article_binding",
      ...base,
    }),
  });
}

export function assertContentCalendarArticleBindingIntegrity(
  binding:ContentCalendarArticleBinding,
):void{
  if(!binding||binding.version!==UGP_CONTENT_CALENDAR_BINDING_VERSION){
    throw new Error("ugp_content_calendar_binding_version_invalid");
  }
  for(const [field,value] of [
    ["calendar_projection_fingerprint",binding.calendarProjectionFingerprint],
    ["calendar_item_fingerprint",binding.calendarItemFingerprint],
    ["opportunity_fingerprint",binding.opportunityFingerprint],
    ["readiness_fingerprint",binding.readinessFingerprint],
    ["draft_id",binding.draftId],
    ["draft_fingerprint",binding.draftFingerprint],
    ["quality_gate_id",binding.qualityGateId],
    ["quality_gate_fingerprint",binding.qualityGateFingerprint],
    ["publication_plan_fingerprint",binding.publicationPlanFingerprint],
    ["publication_target_locator_fingerprint",binding.publicationTargetLocatorFingerprint],
    ["binding_fingerprint",binding.bindingFingerprint],
  ] as const) fp(value,field);
  if(
    (binding.action==="create_candidate"&&binding.requiredPublicationPlanOperation!=="create")
    ||(binding.action==="refresh_candidate"&&binding.requiredPublicationPlanOperation!=="update")
  ) throw new Error("ugp_content_calendar_binding_operation_invalid");
  const s=binding.semantics;
  if(
    s.deterministic!==true||s.lineageBound!==true
    ||s.readinessMeansCompleteDraftAndPassingQualityGate!==true
    ||s.publicationPlanRequired!==true
    ||s.schedulerMaterialized!==false||s.schedulerAuthorized!==false
    ||s.grantsAuthorization!==false||s.publicationAuthorized!==false
    ||s.executionAuthorized!==false||s.performsNetworkOperation!==false
    ||s.performsPersistence!==false||s.providerWrites!==false
    ||s.publicSiteWrites!==false
  ) throw new Error("ugp_content_calendar_binding_unsafe_semantics");
  const {bindingFingerprint,...base}=binding;
  const expected=stableEvidenceHash({
    purpose:"ugp_content_calendar_article_binding",
    ...base,
  });
  if(bindingFingerprint!==expected){
    throw new Error("ugp_content_calendar_binding_fingerprint_mismatch");
  }
}
