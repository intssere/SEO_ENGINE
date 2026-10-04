import assert from "node:assert/strict";
import test from "node:test";
import {
  UGP_CONTENT_OPPORTUNITY_MODEL_POLICY,
  UGP_CONTENT_OPPORTUNITY_MODEL_VERSION,
  type ContentOpportunity,
  type ContentOpportunityModelResult,
} from "./content-opportunity-model-contract.js";
import {
  UGP_DECAY_OPPORTUNITY_INTEGRATION_VERSION,
  type DecayOpportunityIntegrationResult,
  type DecayOpportunityProjection,
} from "./content-decay-opportunity-integration.js";
import {
  assertRefreshCalendarProjectionIntegrity,
  assertRefreshCalendarWorkSpecIntegrity,
  buildRefreshCalendarProjection,
  buildRefreshCalendarWorkSpec,
} from "./content-refresh-calendar-integration.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

const FP=(c:string)=>c.repeat(64);

const MODEL_SEMANTICS=Object.freeze({
  readOnly:true as const,
  deterministic:true as const,
  evidenceBacked:true as const,
  grantsAuthorization:false as const,
  grantsProviderWrite:false as const,
  grantsPublicSiteWrite:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  publicationAuthorized:false as const,
  executionAuthorized:false as const,
  causalAttribution:false as const,
});

const DECAY_SEMANTICS=Object.freeze({
  deterministic:true as const,
  readOnly:true as const,
  projectionOnly:true as const,
  evidenceBacked:true as const,
  preservesCannibalizationGuard:true as const,
  preservesBusinessRelevanceGuard:true as const,
  suppressesDuplicateCreateWhenRefreshEvidenceIsBound:true as const,
  grantsAuthorization:false as const,
  publicationAuthorized:false as const,
  schedulingAuthorized:false as const,
  executionAuthorized:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  providerWrites:false as const,
  publicSiteWrites:false as const,
});

function opportunity(input:{
  fingerprint:string;
  action:ContentOpportunity["recommendedAction"];
  clusterChar:string;
  keyword:string;
}):ContentOpportunity{
  const base={
    clusterFingerprint:FP(input.clusterChar),
    representativeKeyword:input.keyword,
    targetTopic:input.keyword,
    searchIntent:"informational" as const,
    recommendedContentType:"article_or_guide" as const,
    recommendedAction:input.action,
    existingCoverage:input.action==="create_candidate"
      ? "no_matching_topic_evidence_in_supplied_scope" as const
      : "search_presence_observed_below_materiality" as const,
    cannibalizationState:"no_material_collision_observed_in_supplied_evidence" as const,
    businessRelevance:Object.freeze({
      relevance:0.9,
      rationaleCode:"fixture_business_relevance",
      evidenceFingerprint:FP("d"),
    }),
    evidence:Object.freeze({
      topicClusteringFingerprint:FP("e"),
      coverageAssessmentFingerprint:FP("f"),
      cannibalizationAssessmentFingerprint:FP("1"),
      businessRelevanceEvidenceFingerprint:FP("d"),
    }),
    expectedMeasurement:Object.freeze({
      method:"gsc_query_page_before_after_observational" as const,
      causalAttribution:false as const,
    }),
    limitations:Object.freeze([] as string[]),
    rationale:Object.freeze(["fixture"] as string[]),
  };
  return Object.freeze({
    opportunityId:stableEvidenceHash({
      purpose:"ugp_content_opportunity_id",
      version:UGP_CONTENT_OPPORTUNITY_MODEL_VERSION,
      clusterFingerprint:base.clusterFingerprint,
      opportunityFingerprint:input.fingerprint,
    }),
    opportunityFingerprint:input.fingerprint,
    ...base,
  });
}

function model(opportunities:readonly ContentOpportunity[]):ContentOpportunityModelResult{
  const summary={
    create_candidate:opportunities.filter(x=>x.recommendedAction==="create_candidate").length,
    refresh_candidate:opportunities.filter(x=>x.recommendedAction==="refresh_candidate").length,
    consolidate_candidate:opportunities.filter(x=>x.recommendedAction==="consolidate_candidate").length,
    leave_alone:opportunities.filter(x=>x.recommendedAction==="leave_alone").length,
    defer_insufficient_evidence:opportunities.filter(x=>x.recommendedAction==="defer_insufficient_evidence").length,
  };
  const base={
    version:UGP_CONTENT_OPPORTUNITY_MODEL_VERSION,
    market:{searchEngine:"google" as const,locationCode:2840,languageCode:"en",device:"desktop" as const},
    policy:UGP_CONTENT_OPPORTUNITY_MODEL_POLICY,
    provenance:Object.freeze({
      topicClusteringFingerprint:FP("e"),
      siteOwnershipEvidenceFingerprint:FP("2"),
      cannibalizationFingerprint:FP("3"),
      coverageFingerprint:FP("4"),
    }),
    opportunities:Object.freeze([...opportunities]),
    summary:Object.freeze(summary),
    semantics:MODEL_SEMANTICS,
  };
  return Object.freeze({
    ...base,
    opportunityModelFingerprint:stableEvidenceHash({
      purpose:"ugp_content_opportunity_model_result",
      ...base,
    }),
  });
}

function projection(input:{
  opportunity:ContentOpportunity;
  projectedAction:DecayOpportunityProjection["projectedAction"];
  char:string;
}):DecayOpportunityProjection{
  const hasRefresh=input.projectedAction==="refresh_candidate";
  const base={
    opportunityId:input.opportunity.opportunityId,
    opportunityFingerprint:input.opportunity.opportunityFingerprint,
    clusterFingerprint:input.opportunity.clusterFingerprint,
    representativeKeyword:input.opportunity.representativeKeyword,
    originalAction:input.opportunity.recommendedAction,
    projectedAction:input.projectedAction,
    businessRelevance:input.opportunity.businessRelevance.relevance,
    cannibalizationState:input.opportunity.cannibalizationState,
    boundDecayAssessmentFingerprints:Object.freeze(hasRefresh?[FP(input.char)]:[]),
    boundDecayAdapterFingerprints:Object.freeze(hasRefresh?[FP("a")]:[]),
    boundPageUrls:Object.freeze(hasRefresh?["https://example.com/"+input.char]:[]),
    decayClassifications:Object.freeze(hasRefresh?["refresh_candidate" as const]:[]),
    createSuppressedByRefreshEvidence:
      input.opportunity.recommendedAction==="create_candidate"&&hasRefresh,
    rationale:Object.freeze(["fixture"]),
    limitations:Object.freeze([] as string[]),
  };
  return Object.freeze({
    ...base,
    projectionFingerprint:stableEvidenceHash({
      purpose:"ugp_decay_opportunity_projection",
      version:UGP_DECAY_OPPORTUNITY_INTEGRATION_VERSION,
      ...base,
    }),
  });
}

function integration(
  opportunityModel:ContentOpportunityModelResult,
  projections:readonly DecayOpportunityProjection[],
):DecayOpportunityIntegrationResult{
  const count=(action:DecayOpportunityProjection["projectedAction"])=>
    projections.filter(x=>x.projectedAction===action).length;
  const base={
    version:UGP_DECAY_OPPORTUNITY_INTEGRATION_VERSION,
    opportunityModelFingerprint:opportunityModel.opportunityModelFingerprint,
    projections:Object.freeze([...projections]),
    summary:Object.freeze({
      projectedCreateCandidate:count("create_candidate"),
      projectedRefreshCandidate:count("refresh_candidate"),
      projectedConsolidateCandidate:count("consolidate_candidate"),
      projectedLeaveAlone:count("leave_alone"),
      projectedDeferInsufficientEvidence:count("defer_insufficient_evidence"),
      createCandidatesSuppressedByRefreshEvidence:projections.filter(
        x=>x.createSuppressedByRefreshEvidence,
      ).length,
      boundDecayAssessments:projections.reduce(
        (sum,x)=>sum+x.boundDecayAssessmentFingerprints.length,0,
      ),
    }),
    semantics:DECAY_SEMANTICS,
  };
  return Object.freeze({
    ...base,
    integrationFingerprint:stableEvidenceHash({
      purpose:"ugp_decay_opportunity_integration",
      ...base,
    }),
  });
}

test("projected refresh is scheduled with exact decay and readiness lineage",()=>{
  const op=opportunity({
    fingerprint:FP("5"),
    action:"create_candidate",
    clusterChar:"6",
    keyword:"refresh this page",
  });
  const m=model([op]);
  const d=integration(m,[projection({opportunity:op,projectedAction:"refresh_candidate",char:"7"})]);

  const calendar=buildRefreshCalendarProjection({
    opportunityModel:m,
    decayIntegration:d,
    candidates:[{
      opportunityFingerprint:op.opportunityFingerprint,
      category:"Guides",
      priorityScore:88.1234,
      readinessFingerprint:FP("8"),
    }],
    policy:{
      articlesPerWeek:2,
      allowedCategories:["guides"],
      blackoutDates:[],
      mode:"review_required",
    },
    startDate:"2026-10-05",
    weeks:1,
  });

  assert.equal(calendar.scheduled.length,1);
  assert.equal(calendar.scheduled[0]!.action,"refresh_candidate");
  assert.equal(calendar.scheduled[0]!.originalAction,"create_candidate");
  assert.equal(calendar.scheduled[0]!.requiredPublicationPlanOperation,"update");
  assert.equal(calendar.scheduled[0]!.priorityScore,88.123);
  assert.equal(calendar.scheduled[0]!.scheduledDate,"2026-10-05");
  assert.equal(calendar.scheduled[0]!.publicationAuthorized,false);
  assert.equal(calendar.scheduled[0]!.executionAuthorized,false);
  assertRefreshCalendarProjectionIntegrity(calendar);
});

test("non-refresh projected action is deferred instead of silently entering refresh calendar",()=>{
  const op=opportunity({
    fingerprint:FP("9"),
    action:"create_candidate",
    clusterChar:"a",
    keyword:"new topic",
  });
  const m=model([op]);
  const d=integration(m,[projection({opportunity:op,projectedAction:"create_candidate",char:"b"})]);
  const calendar=buildRefreshCalendarProjection({
    opportunityModel:m,
    decayIntegration:d,
    candidates:[{
      opportunityFingerprint:op.opportunityFingerprint,
      category:"guides",
      priorityScore:70,
      readinessFingerprint:FP("c"),
    }],
    policy:{articlesPerWeek:1,allowedCategories:["guides"],blackoutDates:[],mode:"review_required"},
    startDate:"2026-10-05",
    weeks:1,
  });
  assert.equal(calendar.scheduled.length,0);
  assert.deepEqual(calendar.deferred,[{
    opportunityFingerprint:op.opportunityFingerprint,
    reason:"projected_action_not_refresh",
  }]);
});

test("calendar preserves deterministic priority, blackout, and capacity semantics",()=>{
  const one=opportunity({fingerprint:FP("1"),action:"refresh_candidate",clusterChar:"2",keyword:"one"});
  const two=opportunity({fingerprint:FP("3"),action:"refresh_candidate",clusterChar:"4",keyword:"two"});
  const m=model([one,two]);
  const d=integration(m,[
    projection({opportunity:one,projectedAction:"refresh_candidate",char:"5"}),
    projection({opportunity:two,projectedAction:"refresh_candidate",char:"6"}),
  ]);
  const calendar=buildRefreshCalendarProjection({
    opportunityModel:m,
    decayIntegration:d,
    candidates:[
      {opportunityFingerprint:one.opportunityFingerprint,category:"guides",priorityScore:10,readinessFingerprint:FP("7")},
      {opportunityFingerprint:two.opportunityFingerprint,category:"guides",priorityScore:90,readinessFingerprint:FP("8")},
    ],
    policy:{
      articlesPerWeek:1,
      allowedCategories:["guides"],
      blackoutDates:["2026-10-05"],
      mode:"autopilot_policy",
    },
    startDate:"2026-10-05",
    weeks:1,
  });
  assert.equal(calendar.scheduled.length,1);
  assert.equal(calendar.scheduled[0]!.opportunityFingerprint,two.opportunityFingerprint);
  assert.equal(calendar.scheduled[0]!.scheduledDate,"2026-10-06");
  assert.equal(calendar.scheduled[0]!.autopilotPolicySelected,true);
  assert.equal(calendar.scheduled[0]!.publicationAuthorized,false);
  assert.equal(calendar.deferred[0]!.reason,"capacity_exhausted");
});

test("refresh work spec preserves immutable planning lineage and never embeds authority",()=>{
  const op=opportunity({fingerprint:FP("b"),action:"refresh_candidate",clusterChar:"c",keyword:"decaying guide"});
  const m=model([op]);
  const d=integration(m,[projection({opportunity:op,projectedAction:"refresh_candidate",char:"d"})]);
  const calendar=buildRefreshCalendarProjection({
    opportunityModel:m,
    decayIntegration:d,
    candidates:[{
      opportunityFingerprint:op.opportunityFingerprint,
      category:"guides",
      priorityScore:95,
      readinessFingerprint:FP("e"),
    }],
    policy:{articlesPerWeek:1,allowedCategories:["guides"],blackoutDates:[],mode:"review_required"},
    startDate:"2026-10-05",
    weeks:1,
  });
  const spec=buildRefreshCalendarWorkSpec({
    calendar,
    calendarItemFingerprint:calendar.scheduled[0]!.itemFingerprint,
  });

  assert.equal(spec.lifecycle,"proposed");
  assert.equal(spec.workClass,"content_article_refresh");
  assert.equal(spec.operation,"update");
  assert.equal(spec.runtimeRequirements.canonicalArticleReadinessRevalidationRequired,true);
  assert.equal(spec.runtimeRequirements.articleDraftAndQualityGateLineageRequired,true);
  assert.equal(spec.runtimeRequirements.publicationPlanOperationMustBeUpdate,true);
  assert.equal(spec.runtimeRequirements.explicitAuthorizationRequiredBeforeExecution,true);
  assert.equal(spec.runtimeRequirements.authorizationEmbedded,false);
  assert.equal(spec.runtimeRequirements.executionRequestEmbedded,false);
  assert.equal(spec.semantics.queueMaterialized,false);
  assert.equal(spec.semantics.schedulerActivated,false);
  assert.equal(spec.semantics.publicationAuthorized,false);
  assert.equal(spec.semantics.executionAuthorized,false);
  assertRefreshCalendarWorkSpecIntegrity(spec);
});

test("model/integration lineage mismatch fails closed",()=>{
  const op=opportunity({fingerprint:FP("f"),action:"refresh_candidate",clusterChar:"1",keyword:"topic"});
  const m=model([op]);
  const d=integration(m,[projection({opportunity:op,projectedAction:"refresh_candidate",char:"2"})]);
  const tampered={...d,opportunityModelFingerprint:FP("3")};
  const rebased={
    ...tampered,
    integrationFingerprint:stableEvidenceHash({
      purpose:"ugp_decay_opportunity_integration",
      version:tampered.version,
      opportunityModelFingerprint:tampered.opportunityModelFingerprint,
      projections:tampered.projections,
      summary:tampered.summary,
      semantics:tampered.semantics,
    }),
  };
  assert.throws(()=>buildRefreshCalendarProjection({
    opportunityModel:m,
    decayIntegration:rebased,
    candidates:[],
    policy:{articlesPerWeek:1,allowedCategories:["guides"],blackoutDates:[],mode:"review_required"},
    startDate:"2026-10-05",
    weeks:1,
  }),/ugp_refresh_calendar_opportunity_model_lineage_mismatch/);
});

test("calendar and work-spec fingerprints detect tampering",()=>{
  const op=opportunity({fingerprint:FP("4"),action:"refresh_candidate",clusterChar:"5",keyword:"topic"});
  const m=model([op]);
  const d=integration(m,[projection({opportunity:op,projectedAction:"refresh_candidate",char:"6"})]);
  const calendar=buildRefreshCalendarProjection({
    opportunityModel:m,
    decayIntegration:d,
    candidates:[{opportunityFingerprint:op.opportunityFingerprint,category:"guides",priorityScore:50,readinessFingerprint:FP("7")}],
    policy:{articlesPerWeek:1,allowedCategories:["guides"],blackoutDates:[],mode:"review_required"},
    startDate:"2026-10-05",
    weeks:1,
  });
  const badCalendar={...calendar,capacity:{...calendar.capacity,scheduled:99}};
  assert.throws(
    ()=>assertRefreshCalendarProjectionIntegrity(badCalendar),
    /ugp_refresh_calendar_projection_fingerprint_mismatch/,
  );

  const spec=buildRefreshCalendarWorkSpec({
    calendar,
    calendarItemFingerprint:calendar.scheduled[0]!.itemFingerprint,
  });
  const badSpec={...spec,operation:"create" as any};
  assert.throws(
    ()=>assertRefreshCalendarWorkSpecIntegrity(badSpec),
    /ugp_refresh_calendar_work_spec_shape_invalid/,
  );
});
