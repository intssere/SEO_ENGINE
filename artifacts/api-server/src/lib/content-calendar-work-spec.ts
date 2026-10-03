import {
  assertContentCalendarArticleBindingIntegrity,
  type ContentCalendarArticleBinding,
} from "./content-calendar-article-binding.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_CONTENT_CALENDAR_WORK_SPEC_VERSION =
  "ugp-8-3c-scheduler-ready-content-work-spec-v1" as const;

export type ContentCalendarWorkSpec = Readonly<{
  version: typeof UGP_CONTENT_CALENDAR_WORK_SPEC_VERSION;
  workSpecId: string;
  workSpecFingerprint: string;
  lifecycle: "proposed";
  workClass: "content_article_change";
  schedule: Readonly<{
    kind: "calendar_date";
    scheduledDate: string;
  }>;
  lineage: Readonly<{
    calendarProjectionFingerprint: string;
    calendarItemFingerprint: string;
    articleBindingFingerprint: string;
    opportunityFingerprint: string;
    readinessFingerprint: string;
    draftId: string;
    draftFingerprint: string;
    qualityGateId: string;
    qualityGateFingerprint: string;
    publicationPlanFingerprint: string;
    publicationTargetLocatorFingerprint: string;
  }>;
  operation: "create" | "update";
  policy: Readonly<{
    reviewRequired: boolean;
    autopilotPolicySelected: boolean;
  }>;
  runtimeRequirements: Readonly<{
    bindingRevalidationRequired: true;
    publicationPlanRevalidationRequired: true;
    policyRecheckAtClaimRequired: true;
    explicitAuthorizationRequiredBeforeExecution: true;
    authorizationEmbedded: false;
    executionRequestEmbedded: false;
    transportMaterializationRequired: true;
  }>;
  semantics: Readonly<{
    deterministic: true;
    immutableSpecification: true;
    schedulerReady: true;
    dateOnlySchedule: true;
    planningOnly: true;
    queueMaterialized: false;
    schedulerActivated: false;
    retryPolicyGranted: false;
    deadLetterPolicyGranted: false;
    grantsAuthorization: false;
    publicationAuthorized: false;
    executionAuthorized: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
}>;

const HEX64=/^[0-9a-f]{64}$/;
const ID=/^cws-[0-9a-f]{24}$/;
const DATE=/^\d{4}-\d{2}-\d{2}$/;

const RUNTIME=Object.freeze({
  bindingRevalidationRequired:true as const,
  publicationPlanRevalidationRequired:true as const,
  policyRecheckAtClaimRequired:true as const,
  explicitAuthorizationRequiredBeforeExecution:true as const,
  authorizationEmbedded:false as const,
  executionRequestEmbedded:false as const,
  transportMaterializationRequired:true as const,
});

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  immutableSpecification:true as const,
  schedulerReady:true as const,
  dateOnlySchedule:true as const,
  planningOnly:true as const,
  queueMaterialized:false as const,
  schedulerActivated:false as const,
  retryPolicyGranted:false as const,
  deadLetterPolicyGranted:false as const,
  grantsAuthorization:false as const,
  publicationAuthorized:false as const,
  executionAuthorized:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  providerWrites:false as const,
  publicSiteWrites:false as const,
});

function fp(value:unknown,field:string):string{
  if(typeof value!=="string"||!HEX64.test(value)){
    throw new Error("ugp_content_work_spec_invalid_"+field);
  }
  return value;
}

function exactDate(value:unknown):string{
  if(typeof value!=="string"||!DATE.test(value)){
    throw new Error("ugp_content_work_spec_invalid_scheduled_date");
  }
  const d=new Date(value+"T00:00:00.000Z");
  if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value){
    throw new Error("ugp_content_work_spec_invalid_scheduled_date");
  }
  return value;
}

function fingerprintIdentity(spec:Omit<ContentCalendarWorkSpec,"workSpecId"|"workSpecFingerprint">){
  return spec;
}

export function buildContentCalendarWorkSpec(input:{
  binding:ContentCalendarArticleBinding;
}):ContentCalendarWorkSpec{
  assertContentCalendarArticleBindingIntegrity(input.binding);
  const b=input.binding;

  if(b.reviewRequired===b.autopilotPolicySelected){
    throw new Error("ugp_content_work_spec_policy_mode_invalid");
  }
  const scheduledDate=exactDate(b.scheduledDate);
  const operation=b.requiredPublicationPlanOperation;
  if(
    (b.action==="create_candidate"&&operation!=="create")
    ||(b.action==="refresh_candidate"&&operation!=="update")
  ){
    throw new Error("ugp_content_work_spec_operation_mismatch");
  }

  const base=Object.freeze({
    version:UGP_CONTENT_CALENDAR_WORK_SPEC_VERSION,
    lifecycle:"proposed" as const,
    workClass:"content_article_change" as const,
    schedule:Object.freeze({
      kind:"calendar_date" as const,
      scheduledDate,
    }),
    lineage:Object.freeze({
      calendarProjectionFingerprint:fp(b.calendarProjectionFingerprint,"calendar_projection_fingerprint"),
      calendarItemFingerprint:fp(b.calendarItemFingerprint,"calendar_item_fingerprint"),
      articleBindingFingerprint:fp(b.bindingFingerprint,"article_binding_fingerprint"),
      opportunityFingerprint:fp(b.opportunityFingerprint,"opportunity_fingerprint"),
      readinessFingerprint:fp(b.readinessFingerprint,"readiness_fingerprint"),
      draftId:fp(b.draftId,"draft_id"),
      draftFingerprint:fp(b.draftFingerprint,"draft_fingerprint"),
      qualityGateId:fp(b.qualityGateId,"quality_gate_id"),
      qualityGateFingerprint:fp(b.qualityGateFingerprint,"quality_gate_fingerprint"),
      publicationPlanFingerprint:fp(b.publicationPlanFingerprint,"publication_plan_fingerprint"),
      publicationTargetLocatorFingerprint:fp(b.publicationTargetLocatorFingerprint,"publication_target_locator_fingerprint"),
    }),
    operation,
    policy:Object.freeze({
      reviewRequired:b.reviewRequired,
      autopilotPolicySelected:b.autopilotPolicySelected,
    }),
    runtimeRequirements:RUNTIME,
    semantics:SEMANTICS,
  });

  const workSpecFingerprint=stableEvidenceHash({
    purpose:"ugp_content_calendar_work_spec",
    ...fingerprintIdentity(base),
  });
  return Object.freeze({
    ...base,
    workSpecId:"cws-"+workSpecFingerprint.slice(0,24),
    workSpecFingerprint,
  });
}

export function assertContentCalendarWorkSpecIntegrity(spec:ContentCalendarWorkSpec):void{
  if(!spec||spec.version!==UGP_CONTENT_CALENDAR_WORK_SPEC_VERSION){
    throw new Error("ugp_content_work_spec_version_invalid");
  }
  if(!ID.test(spec.workSpecId)) throw new Error("ugp_content_work_spec_id_invalid");
  fp(spec.workSpecFingerprint,"work_spec_fingerprint");
  exactDate(spec.schedule?.scheduledDate);
  if(spec.schedule.kind!=="calendar_date"||spec.lifecycle!=="proposed"||spec.workClass!=="content_article_change"){
    throw new Error("ugp_content_work_spec_shape_invalid");
  }
  if(spec.policy.reviewRequired===spec.policy.autopilotPolicySelected){
    throw new Error("ugp_content_work_spec_policy_mode_invalid");
  }
  for(const [field,value] of Object.entries(spec.lineage)){
    fp(value,field);
  }
  const r=spec.runtimeRequirements;
  if(
    r.bindingRevalidationRequired!==true
    ||r.publicationPlanRevalidationRequired!==true
    ||r.policyRecheckAtClaimRequired!==true
    ||r.explicitAuthorizationRequiredBeforeExecution!==true
    ||r.authorizationEmbedded!==false
    ||r.executionRequestEmbedded!==false
    ||r.transportMaterializationRequired!==true
  ) throw new Error("ugp_content_work_spec_runtime_requirements_invalid");

  const s=spec.semantics;
  if(
    s.deterministic!==true||s.immutableSpecification!==true
    ||s.schedulerReady!==true||s.dateOnlySchedule!==true
    ||s.planningOnly!==true||s.queueMaterialized!==false
    ||s.schedulerActivated!==false||s.retryPolicyGranted!==false
    ||s.deadLetterPolicyGranted!==false||s.grantsAuthorization!==false
    ||s.publicationAuthorized!==false||s.executionAuthorized!==false
    ||s.performsNetworkOperation!==false||s.performsPersistence!==false
    ||s.providerWrites!==false||s.publicSiteWrites!==false
  ) throw new Error("ugp_content_work_spec_unsafe_semantics");

  const {workSpecId,workSpecFingerprint,...base}=spec;
  const expected=stableEvidenceHash({
    purpose:"ugp_content_calendar_work_spec",
    ...fingerprintIdentity(base),
  });
  if(workSpecFingerprint!==expected||workSpecId!=="cws-"+expected.slice(0,24)){
    throw new Error("ugp_content_work_spec_identity_mismatch");
  }
}
