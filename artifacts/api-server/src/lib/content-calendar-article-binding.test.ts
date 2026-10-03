import assert from "node:assert/strict";
import test from "node:test";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import type { ArticleDraftPipelineResult } from "./article-draft-pipeline-contract.js";
import type { ArticleQualityGateResult } from "./article-quality-gate-contract.js";
import type { ContentCalendarProjection } from "./content-calendar-policy-projection.js";
import {
  buildUniversalSiteIdentity,
  buildUniversalConnectionIdentity,
  buildUniversalResourceLocator,
} from "./universal-site-resource-identity.js";
import { buildUniversalCapabilityRegistry } from "./universal-capability-registry.js";
import { buildUniversalConnectorDescriptor } from "./universal-connector-contract.js";
import { buildArticlePublicationPlan } from "./article-publishing-contract.js";
import {
  assertContentCalendarArticleBindingIntegrity,
  buildArticleCalendarReadinessFingerprint,
  buildContentCalendarArticleBinding,
} from "./content-calendar-article-binding.js";

const fp=(c:string)=>c.repeat(64);

function draftFixture():ArticleDraftPipelineResult{
 const base={
  version:"ugp-7-4-article-draft-pipeline-v1" as const,
  briefId:fp("1"),briefFingerprint:fp("2"),
  sourceEvidenceLedgerId:fp("3"),sourceEvidenceLedgerFingerprint:fp("4"),
  targetTopic:"calendar binding",status:"draft_complete" as const,
  sections:Object.freeze([]),articleBody:"# Ready article",
  stages:Object.freeze([]),
  finishingAssets:Object.freeze({metadata:Object.freeze({title:"Ready Article",metaDescription:"Ready for publication planning."}),schemaPlan:Object.freeze(["Article"]),mediaPlan:Object.freeze([])}),
  blockers:Object.freeze([]),warnings:Object.freeze([]),
  provenance:Object.freeze({contentBriefFingerprint:fp("2"),researchPlanFingerprint:fp("5"),sourceEvidenceLedgerFingerprint:fp("4"),contentOpportunityFingerprint:fp("6"),topicClusteringFingerprint:fp("7")}),
  semantics:Object.freeze({evidenceBound:true as const,stageBased:true as const,builtInNetworkTransport:false as const,providerAdapterInjected:true as const,performsPersistence:false as const,publicationAuthorized:false as const,executionAuthorized:false as const,qualityGatePassed:false as const,requiresUGP75QualityGate:true as const,deterministicGivenFrozenInputsAndAdapterOutputs:true as const}),
 };
 const draftFingerprint=stableEvidenceHash({purpose:"ugp_article_draft_pipeline",...base});
 return Object.freeze({...base,draftId:stableEvidenceHash({purpose:"ugp_article_draft_pipeline_id",version:"ugp-7-4-article-draft-pipeline-v1",briefId:base.briefId,draftFingerprint}),draftFingerprint});
}
function gateFixture(draft:ArticleDraftPipelineResult,status:"pass"|"blocked"="pass"):ArticleQualityGateResult{
 const base={
  version:"ugp-7-5-article-quality-gate-v1" as const,
  draftId:draft.draftId,draftFingerprint:draft.draftFingerprint,
  briefId:draft.briefId,briefFingerprint:draft.briefFingerprint,
  sourceEvidenceLedgerId:draft.sourceEvidenceLedgerId,sourceEvidenceLedgerFingerprint:draft.sourceEvidenceLedgerFingerprint,
  status,approvalEligible:status==="pass",checks:Object.freeze([]),
  blockingReasons:Object.freeze(status==="pass"?[]:["blocked"]),
  provenance:Object.freeze({contentBriefFingerprint:draft.briefFingerprint,sourceEvidenceLedgerFingerprint:draft.sourceEvidenceLedgerFingerprint,articleDraftFingerprint:draft.draftFingerprint,contentOpportunityFingerprint:draft.provenance.contentOpportunityFingerprint,topicClusteringFingerprint:draft.provenance.topicClusteringFingerprint}),
  semantics:Object.freeze({deterministic:true as const,failClosed:true as const,separateFromGeneration:true as const,modelConfidenceIsNotQualityGate:true as const,performsNetworkOperation:false as const,performsPersistence:false as const,publicationAuthorized:false as const,executionAuthorized:false as const,providerWrites:false as const,publicSiteWrites:false as const}),
 };
 const gateFingerprint=stableEvidenceHash({purpose:"ugp_article_quality_gate",...base});
 return Object.freeze({...base,gateId:stableEvidenceHash({purpose:"ugp_article_quality_gate_id",version:"ugp-7-5-article-quality-gate-v1",draftId:draft.draftId,gateFingerprint}),gateFingerprint});
}
function publicationFixture(draft:ArticleDraftPipelineResult,gate:ArticleQualityGateResult,operation:"create"|"update"){
 const site=buildUniversalSiteIdentity({siteId:"site-1",canonicalOrigin:"https://example.com"});
 const connection=buildUniversalConnectionIdentity({site,connectionId:"connection-1",provider:"wordpress",externalAccountId:"account-1",connectionMode:"api"});
 const registry=buildUniversalCapabilityRegistry({site,connection,provider:"wordpress",connectorVersion:"test-v1",credentialProfileId:"profile",capabilities:[
  {capability:operation==="create"?"create.article":"update.article",resourceKinds:["article"],verification:"required",rollback:"supported",maxOperationsPerRequest:10,maxPayloadBytes:100000},
  {capability:"preview.change",resourceKinds:["article"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:10,maxPayloadBytes:100000},
  {capability:"verify.change",resourceKinds:["article"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:10,maxPayloadBytes:100000},
 ]});
 const descriptor=buildUniversalConnectorDescriptor({connectorId:"wp",connectorKind:"openapi",registry});
 const target=buildUniversalResourceLocator({site,connection,provider:"wordpress",kind:"article",externalId:"article-123",canonicalUrl:"https://example.com/article-123"});
 return buildArticlePublicationPlan({operation,descriptor,target,draft,qualityGate:gate,expectedStateFingerprint:fp("8"),proposedStateFingerprint:fp("9")});
}
function calendarFixture(draft:ArticleDraftPipelineResult,gate:ArticleQualityGateResult,action:"create_candidate"|"refresh_candidate"):ContentCalendarProjection{
 const readinessFingerprint=buildArticleCalendarReadinessFingerprint({draft,qualityGate:gate});
 const itemBase={opportunityId:fp("a"),opportunityFingerprint:draft.provenance.contentOpportunityFingerprint,action,category:"guides",priorityScore:90,readinessFingerprint,scheduledDate:"2026-10-10",weekIndex:0,slotIndex:0,reviewRequired:true,autopilotPolicySelected:false,publicationAuthorized:false as const,executionAuthorized:false as const};
 const item=Object.freeze({...itemBase,itemFingerprint:stableEvidenceHash({purpose:"ugp_content_calendar_item",version:"ugp-8-3a-content-calendar-policy-projection-v1",...itemBase})});
 const base={version:"ugp-8-3a-content-calendar-policy-projection-v1" as const,opportunityModelFingerprint:fp("b"),startDate:"2026-10-10",weeks:1,policy:Object.freeze({articlesPerWeek:1,allowedCategories:Object.freeze(["guides"]),blackoutDates:Object.freeze([]),mode:"review_required" as const}),scheduled:Object.freeze([item]),deferred:Object.freeze([]),capacity:Object.freeze({theoreticalSlots:1,availableDateSlots:1,scheduled:1,unused:0}),semantics:Object.freeze({deterministic:true as const,planningOnly:true as const,customerPolicyDriven:true as const,autopilotIsPolicyPreferenceOnly:true as const,grantsAuthorization:false as const,publicationAuthorized:false as const,executionAuthorized:false as const,performsNetworkOperation:false as const,performsPersistence:false as const,providerWrites:false as const,publicSiteWrites:false as const})};
 return Object.freeze({...base,projectionFingerprint:stableEvidenceHash({purpose:"ugp_content_calendar_projection",...base})});
}

test("UGP-8.3B binds create calendar item to exact ready draft, passing gate, and create plan",()=>{
 const draft=draftFixture();const gate=gateFixture(draft);const calendar=calendarFixture(draft,gate,"create_candidate");const plan=publicationFixture(draft,gate,"create");
 const result=buildContentCalendarArticleBinding({calendar,calendarItemFingerprint:calendar.scheduled[0]!.itemFingerprint,draft,qualityGate:gate,publicationPlan:plan});
 assert.equal(result.requiredPublicationPlanOperation,"create");
 assert.equal(result.publicationPlanFingerprint,plan.planFingerprint);
 assert.equal(result.semantics.schedulerMaterialized,false);
 assert.equal(result.semantics.publicationAuthorized,false);
 assertContentCalendarArticleBindingIntegrity(result);
});

test("UGP-8.3B binds refresh calendar item only to update plan",()=>{
 const draft=draftFixture();const gate=gateFixture(draft);const calendar=calendarFixture(draft,gate,"refresh_candidate");const plan=publicationFixture(draft,gate,"update");
 const result=buildContentCalendarArticleBinding({calendar,calendarItemFingerprint:calendar.scheduled[0]!.itemFingerprint,draft,qualityGate:gate,publicationPlan:plan});
 assert.equal(result.requiredPublicationPlanOperation,"update");
});

test("UGP-8.3B rejects stale/opaque readiness fingerprints",()=>{
 const draft=draftFixture();const gate=gateFixture(draft);const calendar=calendarFixture(draft,gate,"create_candidate");const plan=publicationFixture(draft,gate,"create");
 const badItem={...calendar.scheduled[0]!,readinessFingerprint:fp("0")};
 const {itemFingerprint:_old,...itemBase}=badItem;
 const item={...itemBase,itemFingerprint:stableEvidenceHash({purpose:"ugp_content_calendar_item",version:"ugp-8-3a-content-calendar-policy-projection-v1",...itemBase})};
 const calBase={...calendar,scheduled:Object.freeze([item])}; delete (calBase as any).projectionFingerprint;
 const badCalendar={...calBase,projectionFingerprint:stableEvidenceHash({purpose:"ugp_content_calendar_projection",...calBase})} as ContentCalendarProjection;
 assert.throws(()=>buildContentCalendarArticleBinding({calendar:badCalendar,calendarItemFingerprint:item.itemFingerprint,draft,qualityGate:gate,publicationPlan:plan}),/readiness_fingerprint_mismatch/);
});

test("UGP-8.3B rejects create item bound to update plan",()=>{
 const draft=draftFixture();const gate=gateFixture(draft);const calendar=calendarFixture(draft,gate,"create_candidate");const plan=publicationFixture(draft,gate,"update");
 assert.throws(()=>buildContentCalendarArticleBinding({calendar,calendarItemFingerprint:calendar.scheduled[0]!.itemFingerprint,draft,qualityGate:gate,publicationPlan:plan}),/publication_operation_mismatch/);
});

test("UGP-8.3B rejects blocked quality gate before scheduling binding",()=>{
 const draft=draftFixture();const blocked=gateFixture(draft,"blocked");
 assert.throws(()=>buildArticleCalendarReadinessFingerprint({draft,qualityGate:blocked}),/passing_quality_gate_required/);
});

test("UGP-8.3B integrity detects tampering",()=>{
 const draft=draftFixture();const gate=gateFixture(draft);const calendar=calendarFixture(draft,gate,"create_candidate");const plan=publicationFixture(draft,gate,"create");
 const result=buildContentCalendarArticleBinding({calendar,calendarItemFingerprint:calendar.scheduled[0]!.itemFingerprint,draft,qualityGate:gate,publicationPlan:plan});
 assert.throws(()=>assertContentCalendarArticleBindingIntegrity({...result,bindingFingerprint:fp("0")}),/binding_fingerprint_mismatch/);
});
