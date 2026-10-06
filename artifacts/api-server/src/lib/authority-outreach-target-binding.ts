import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachDraftPreparationIntegrity,
  buildAuthorityOutreachDraftPreparation,
  UGP_AUTHORITY_OUTREACH_DRAFT_BRIEF_VERSION,
  type AuthorityOutreachDraftBrief,
  type AuthorityOutreachReviewInput,
} from "./authority-outreach-draft-brief.js";
import type { AuthorityProspectQualificationResult } from "./authority-prospect-qualification.js";
import {
  assertUniversalResourceLocatorIntegrity,
  buildUniversalResourceIdentity,
  type UniversalResourceIdentity,
  type UniversalResourceKind,
} from "./universal-site-resource-identity.js";

export const UGP_AUTHORITY_OUTREACH_TARGET_BINDING_VERSION =
  "ugp-10-5-owned-target-binding-v1" as const;

export type AuthorityOutreachTargetBindingInput = Readonly<{
  preparationFingerprint: string;
  prospectFingerprint: string;
  resourceIdentityFingerprint: string;
  binderId: string;
  boundAt: string;
}>;

export type AuthorityOutreachOwnedTargetBinding = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_TARGET_BINDING_VERSION;
  bindingId: string;
  bindingFingerprint: string;
  preparationVersion: typeof UGP_AUTHORITY_OUTREACH_DRAFT_BRIEF_VERSION;
  preparationFingerprint: string;
  workspaceFingerprint: string;
  workspaceItemFingerprint: string;
  qualificationFingerprint: string;
  prospectFingerprint: string;
  opportunityFingerprint: string;
  resourceIdentityFingerprint: string;
  resourceLocatorFingerprint: string;
  resourceStateFingerprint: string;
  resourceObservedAt: string;
  provider: string;
  resourceKind: UniversalResourceKind;
  targetUrl: string;
  binderId: string;
  boundAt: string;
  semantics: Readonly<{
    explicitHumanSelectionRequired: true;
    verifiedOwnedResourceRequired: true;
    sameSiteCanonicalUrlRequired: true;
    targetSelectionAutomatic: false;
    contactDiscoveryAuthorized: false;
    outreachDraftTextGenerationAuthorized: false;
    outreachSendingAuthorized: false;
    performsModelCall: false;
    performsProviderCall: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    publicSiteWrites: false;
  }>;
}>;

export type AuthorityOutreachTargetBindingState =
  | "draft_brief_ready_existing_target"
  | "draft_brief_ready_bound_target"
  | "target_binding_required"
  | "human_review_required"
  | "rejected"
  | "deferred"
  | "qualification_blocked";

export type AuthorityOutreachTargetBindingItem = Readonly<{
  prospectFingerprint: string;
  opportunityFingerprint: string;
  workspaceItemFingerprint: string;
  state: AuthorityOutreachTargetBindingState;
  resolvedTargetUrl: string | null;
  existingBrief: AuthorityOutreachDraftBrief | null;
  targetBinding: AuthorityOutreachOwnedTargetBinding | null;
}>;

export type AuthorityOutreachTargetBindingProjection = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_TARGET_BINDING_VERSION;
  targetDomain: string;
  qualificationFingerprint: string;
  workspaceFingerprint: string;
  preparationFingerprint: string;
  items: readonly AuthorityOutreachTargetBindingItem[];
  summary: Readonly<{
    total: number;
    draftBriefReadyExistingTarget: number;
    draftBriefReadyBoundTarget: number;
    targetBindingRequired: number;
    humanReviewRequired: number;
    rejected: number;
    deferred: number;
    qualificationBlocked: number;
  }>;
  semantics: Readonly<{
    deterministic: true;
    evidenceBound: true;
    explicitHumanSelectionRequiredForMissingTarget: true;
    verifiedOwnedResourceRequired: true;
    automaticTargetSelection: false;
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
  projectionFingerprint: string;
}>;

const HEX64=/^[0-9a-f]{64}$/;
const BINDER=/^[A-Za-z0-9_.:@-]{1,120}$/;
const TARGETABLE_KINDS=new Set<UniversalResourceKind>([
  "homepage",
  "page",
  "product",
  "collection",
  "category",
  "article",
  "blog_post",
  "landing_page",
]);

const BINDING_SEMANTICS=Object.freeze({
  explicitHumanSelectionRequired:true as const,
  verifiedOwnedResourceRequired:true as const,
  sameSiteCanonicalUrlRequired:true as const,
  targetSelectionAutomatic:false as const,
  contactDiscoveryAuthorized:false as const,
  outreachDraftTextGenerationAuthorized:false as const,
  outreachSendingAuthorized:false as const,
  performsModelCall:false as const,
  performsProviderCall:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  publicSiteWrites:false as const,
});

const PROJECTION_SEMANTICS=Object.freeze({
  deterministic:true as const,
  evidenceBound:true as const,
  explicitHumanSelectionRequiredForMissingTarget:true as const,
  verifiedOwnedResourceRequired:true as const,
  automaticTargetSelection:false as const,
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

function fingerprint(value:unknown,field:string):string{
  if(typeof value!=="string"||!HEX64.test(value)){
    throw new Error("ugp_outreach_target_binding_invalid_"+field);
  }
  return value;
}

function binder(value:unknown):string{
  if(typeof value!=="string"||value.trim()!==value||!BINDER.test(value)){
    throw new Error("ugp_outreach_target_binding_invalid_binder");
  }
  return value;
}

function timestamp(value:unknown,field:string):string{
  if(typeof value!=="string"){
    throw new Error("ugp_outreach_target_binding_invalid_"+field);
  }
  const millis=Date.parse(value);
  if(!Number.isFinite(millis)){
    throw new Error("ugp_outreach_target_binding_invalid_"+field);
  }
  const canonical=new Date(millis).toISOString();
  if(canonical!==value){
    throw new Error("ugp_outreach_target_binding_invalid_"+field);
  }
  return canonical;
}

function assertResourceIdentityIntegrity(resource:UniversalResourceIdentity):void{
  assertUniversalResourceLocatorIntegrity(resource.locator);
  const rebuilt=buildUniversalResourceIdentity({
    locator:resource.locator,
    stateFingerprint:resource.stateFingerprint,
    observedAt:resource.observedAt,
    parent:resource.parent,
    relationship:resource.relationship,
  });
  if(stableJson(rebuilt)!==stableJson(resource)){
    throw new Error("ugp_outreach_target_binding_resource_integrity_failed");
  }
}

function targetUrlFor(
  resource:UniversalResourceIdentity,
  targetDomain:string,
):string{
  assertResourceIdentityIntegrity(resource);
  if(!TARGETABLE_KINDS.has(resource.locator.kind)){
    throw new Error("ugp_outreach_target_binding_resource_kind_not_targetable");
  }
  const canonicalUrl=resource.locator.canonicalUrl;
  if(!canonicalUrl){
    throw new Error("ugp_outreach_target_binding_resource_canonical_url_required");
  }
  let parsed:URL;
  try{parsed=new URL(canonicalUrl);}catch{
    throw new Error("ugp_outreach_target_binding_resource_url_invalid");
  }
  if(
    parsed.protocol!=="https:"
    ||parsed.username
    ||parsed.password
    ||parsed.search
    ||parsed.hash
    ||parsed.hostname.toLowerCase()!==targetDomain.toLowerCase()
  ){
    throw new Error("ugp_outreach_target_binding_resource_site_mismatch");
  }
  return canonicalUrl;
}

export function buildAuthorityOutreachTargetBindingProjection(input:Readonly<{
  qualification:AuthorityProspectQualificationResult;
  reviews?:readonly AuthorityOutreachReviewInput[];
  resources?:readonly UniversalResourceIdentity[];
  bindings?:readonly AuthorityOutreachTargetBindingInput[];
}>):AuthorityOutreachTargetBindingProjection{
  const draftInput={
    qualification:input.qualification,
    reviews:input.reviews??[],
  };
  const preparation=buildAuthorityOutreachDraftPreparation(draftInput);
  assertAuthorityOutreachDraftPreparationIntegrity(preparation,draftInput);

  const resources=new Map<string,UniversalResourceIdentity>();
  for(const resource of input.resources??[]){
    assertResourceIdentityIntegrity(resource);
    const key=fingerprint(
      resource.resourceIdentityFingerprint,
      "resource_identity_fingerprint",
    );
    if(resources.has(key)){
      throw new Error("ugp_outreach_target_binding_duplicate_resource_identity");
    }
    resources.set(key,resource);
  }

  const bindings=new Map<string,AuthorityOutreachOwnedTargetBinding>();
  for(const raw of input.bindings??[]){
    if(raw.preparationFingerprint!==preparation.preparationFingerprint){
      throw new Error("ugp_outreach_target_binding_stale_preparation");
    }
    const prospectFingerprint=fingerprint(
      raw.prospectFingerprint,
      "prospect_fingerprint",
    );
    if(bindings.has(prospectFingerprint)){
      throw new Error("ugp_outreach_target_binding_duplicate_prospect_binding");
    }
    const item=preparation.items.find(
      candidate=>candidate.prospectFingerprint===prospectFingerprint,
    );
    if(!item){
      throw new Error("ugp_outreach_target_binding_unknown_prospect");
    }
    if(item.state!=="target_binding_required"){
      throw new Error("ugp_outreach_target_binding_not_required");
    }
    const resourceIdentityFingerprint=fingerprint(
      raw.resourceIdentityFingerprint,
      "resource_identity_fingerprint",
    );
    const resource=resources.get(resourceIdentityFingerprint);
    if(!resource){
      throw new Error("ugp_outreach_target_binding_unknown_resource");
    }
    const targetUrl=targetUrlFor(resource,preparation.targetDomain);
    const boundAt=timestamp(raw.boundAt,"bound_at");
    const resourceObservedAt=timestamp(resource.observedAt,"resource_observed_at");
    if(Date.parse(boundAt)<Date.parse(resourceObservedAt)){
      throw new Error("ugp_outreach_target_binding_before_resource_observation");
    }
    const base={
      version:UGP_AUTHORITY_OUTREACH_TARGET_BINDING_VERSION,
      preparationVersion:preparation.version,
      preparationFingerprint:preparation.preparationFingerprint,
      workspaceFingerprint:preparation.workspaceFingerprint,
      workspaceItemFingerprint:item.workspaceItemFingerprint,
      qualificationFingerprint:preparation.qualificationFingerprint,
      prospectFingerprint:item.prospectFingerprint,
      opportunityFingerprint:item.opportunityFingerprint,
      resourceIdentityFingerprint:resource.resourceIdentityFingerprint,
      resourceLocatorFingerprint:resource.locator.resourceLocatorFingerprint,
      resourceStateFingerprint:resource.stateFingerprint,
      resourceObservedAt,
      provider:resource.locator.provider,
      resourceKind:resource.locator.kind,
      targetUrl,
      binderId:binder(raw.binderId),
      boundAt,
      semantics:BINDING_SEMANTICS,
    };
    const bindingFingerprint=hash({
      purpose:"ugp_authority_outreach_owned_target_binding",
      ...base,
    });
    bindings.set(prospectFingerprint,Object.freeze({
      ...base,
      bindingId:"uaotb-"+bindingFingerprint.slice(0,24),
      bindingFingerprint,
    }));
  }

  const items=Object.freeze(preparation.items.map(item=>{
    if(item.state==="draft_brief_ready"){
      if(!item.brief){
        throw new Error("ugp_outreach_target_binding_existing_brief_missing");
      }
      return Object.freeze({
        prospectFingerprint:item.prospectFingerprint,
        opportunityFingerprint:item.opportunityFingerprint,
        workspaceItemFingerprint:item.workspaceItemFingerprint,
        state:"draft_brief_ready_existing_target" as const,
        resolvedTargetUrl:item.brief.targetUrl,
        existingBrief:item.brief,
        targetBinding:null,
      });
    }
    if(item.state==="target_binding_required"){
      const targetBinding=bindings.get(item.prospectFingerprint)??null;
      return Object.freeze({
        prospectFingerprint:item.prospectFingerprint,
        opportunityFingerprint:item.opportunityFingerprint,
        workspaceItemFingerprint:item.workspaceItemFingerprint,
        state:targetBinding
          ?"draft_brief_ready_bound_target" as const
          :"target_binding_required" as const,
        resolvedTargetUrl:targetBinding?.targetUrl??null,
        existingBrief:null,
        targetBinding,
      });
    }
    return Object.freeze({
      prospectFingerprint:item.prospectFingerprint,
      opportunityFingerprint:item.opportunityFingerprint,
      workspaceItemFingerprint:item.workspaceItemFingerprint,
      state:item.state,
      resolvedTargetUrl:null,
      existingBrief:null,
      targetBinding:null,
    });
  }));

  const summary=Object.freeze({
    total:items.length,
    draftBriefReadyExistingTarget:items.filter(
      item=>item.state==="draft_brief_ready_existing_target",
    ).length,
    draftBriefReadyBoundTarget:items.filter(
      item=>item.state==="draft_brief_ready_bound_target",
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
    version:UGP_AUTHORITY_OUTREACH_TARGET_BINDING_VERSION,
    targetDomain:preparation.targetDomain,
    qualificationFingerprint:preparation.qualificationFingerprint,
    workspaceFingerprint:preparation.workspaceFingerprint,
    preparationFingerprint:preparation.preparationFingerprint,
    items,
    summary,
    semantics:PROJECTION_SEMANTICS,
  };
  return Object.freeze({
    ...base,
    projectionFingerprint:hash({
      purpose:"ugp_authority_outreach_target_binding_projection",
      ...base,
    }),
  });
}

export function assertAuthorityOutreachTargetBindingProjectionIntegrity(
  result:AuthorityOutreachTargetBindingProjection,
  input:Readonly<{
    qualification:AuthorityProspectQualificationResult;
    reviews?:readonly AuthorityOutreachReviewInput[];
    resources?:readonly UniversalResourceIdentity[];
    bindings?:readonly AuthorityOutreachTargetBindingInput[];
  }>,
):void{
  if(
    !result
    ||result.version!==UGP_AUTHORITY_OUTREACH_TARGET_BINDING_VERSION
  ){
    throw new Error("ugp_outreach_target_binding_version_invalid");
  }
  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.evidenceBound!==true
    ||s.explicitHumanSelectionRequiredForMissingTarget!==true
    ||s.verifiedOwnedResourceRequired!==true
    ||s.automaticTargetSelection!==false
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
    throw new Error("ugp_outreach_target_binding_unsafe_semantics");
  }
  const expected=buildAuthorityOutreachTargetBindingProjection(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error("ugp_outreach_target_binding_integrity_mismatch");
  }
}
