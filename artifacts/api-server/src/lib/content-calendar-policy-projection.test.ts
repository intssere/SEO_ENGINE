import assert from "node:assert/strict";
import test from "node:test";
import { buildContentCalendarProjection, assertContentCalendarProjectionIntegrity } from "./content-calendar-policy-projection.js";
import type { ContentOpportunityModelResult } from "./content-opportunity-model-contract.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

const fp=(c:string)=>c.repeat(64);
function model():ContentOpportunityModelResult{
 const opportunities=[
  {opportunityId:fp("1"),opportunityFingerprint:fp("a"),clusterFingerprint:fp("2"),representativeKeyword:"alpha",targetTopic:"Alpha",searchIntent:"informational" as const,recommendedContentType:"article_or_guide" as const,recommendedAction:"create_candidate" as const,existingCoverage:"no_matching_topic_evidence_in_supplied_scope" as const,cannibalizationState:"no_material_cannibalization_detected" as const,businessRelevance:{relevance:.9,rationaleCode:"fit",evidenceFingerprint:fp("3")},evidence:{topicClusteringFingerprint:fp("4"),coverageAssessmentFingerprint:fp("5"),cannibalizationAssessmentFingerprint:fp("6"),businessRelevanceEvidenceFingerprint:fp("3")},expectedMeasurement:{method:"gsc_query_page_before_after_observational" as const,causalAttribution:false as const},limitations:[],rationale:["test"]},
  {opportunityId:fp("7"),opportunityFingerprint:fp("b"),clusterFingerprint:fp("8"),representativeKeyword:"beta",targetTopic:"Beta",searchIntent:"informational" as const,recommendedContentType:"article_or_guide" as const,recommendedAction:"refresh_candidate" as const,existingCoverage:"search_presence_observed_below_materiality" as const,cannibalizationState:"no_material_cannibalization_detected" as const,businessRelevance:{relevance:.8,rationaleCode:"fit",evidenceFingerprint:fp("9")},evidence:{topicClusteringFingerprint:fp("4"),coverageAssessmentFingerprint:fp("c"),cannibalizationAssessmentFingerprint:fp("d"),businessRelevanceEvidenceFingerprint:fp("9")},expectedMeasurement:{method:"gsc_query_page_before_after_observational" as const,causalAttribution:false as const},limitations:[],rationale:["test"]},
 ];
 const base:any={version:"ugp-6-4-content-opportunity-model-v1",market:{searchEngine:"google",locationCode:2840,languageCode:"en",device:"desktop"},policy:{minimumBusinessRelevanceForActionCandidate:.5,requireCompleteObservedInventoryForCreateCandidate:true,requireQueryPageEvidenceForCreateCandidate:true},provenance:{topicClusteringFingerprint:fp("4"),siteOwnershipEvidenceFingerprint:fp("e"),cannibalizationFingerprint:fp("f"),coverageFingerprint:fp("0")},opportunities:Object.freeze(opportunities),summary:{create_candidate:1,refresh_candidate:1,consolidate_candidate:0,leave_alone:0,defer_insufficient_evidence:0},semantics:{readOnly:true,deterministic:true,evidenceBacked:true,grantsAuthorization:false,grantsProviderWrite:false,grantsPublicSiteWrite:false,performsNetworkOperation:false,performsPersistence:false,publicationAuthorized:false,executionAuthorized:false,causalAttribution:false}};
 return Object.freeze({...base,opportunityModelFingerprint:stableEvidenceHash({purpose:"ugp_content_opportunity_model",...base})}) as ContentOpportunityModelResult;
}

test("UGP-8.3A allocates by priority within weekly capacity and blackout dates",()=>{
 const m=model();
 const result=buildContentCalendarProjection({opportunityModel:m,candidates:[
  {opportunityFingerprint:fp("a"),category:"guides",priorityScore:80,readinessFingerprint:fp("1")},
  {opportunityFingerprint:fp("b"),category:"guides",priorityScore:95,readinessFingerprint:fp("2")},
 ],policy:{articlesPerWeek:2,allowedCategories:["guides"],blackoutDates:["2026-10-05"],mode:"review_required"},startDate:"2026-10-05",weeks:1});
 assert.equal(result.scheduled[0]?.opportunityFingerprint,fp("b"));
 assert.equal(result.scheduled[0]?.scheduledDate,"2026-10-06");
 assert.equal(result.scheduled[1]?.scheduledDate,"2026-10-07");
 assert.equal(result.scheduled[0]?.reviewRequired,true);
 assert.equal(result.scheduled[0]?.publicationAuthorized,false);
 assertContentCalendarProjectionIntegrity(result);
});

test("UGP-8.3A autopilot policy never grants publication authority",()=>{
 const m=model();
 const result=buildContentCalendarProjection({opportunityModel:m,candidates:[{opportunityFingerprint:fp("a"),category:"guides",priorityScore:80,readinessFingerprint:fp("1")}],policy:{articlesPerWeek:1,allowedCategories:["guides"],blackoutDates:[],mode:"autopilot_policy"},startDate:"2026-10-05",weeks:1});
 assert.equal(result.scheduled[0]?.autopilotPolicySelected,true);
 assert.equal(result.scheduled[0]?.reviewRequired,false);
 assert.equal(result.scheduled[0]?.publicationAuthorized,false);
 assert.equal(result.semantics.autopilotIsPolicyPreferenceOnly,true);
});

test("UGP-8.3A defers disallowed categories and capacity overflow",()=>{
 const m=model();
 const result=buildContentCalendarProjection({opportunityModel:m,candidates:[
  {opportunityFingerprint:fp("a"),category:"news",priorityScore:90,readinessFingerprint:fp("1")},
  {opportunityFingerprint:fp("b"),category:"guides",priorityScore:80,readinessFingerprint:fp("2")},
 ],policy:{articlesPerWeek:1,allowedCategories:["guides"],blackoutDates:["2026-10-05","2026-10-06","2026-10-07","2026-10-08","2026-10-09","2026-10-10","2026-10-11"],mode:"review_required"},startDate:"2026-10-05",weeks:1});
 assert.equal(result.scheduled.length,0);
 assert.deepEqual(result.deferred.map(x=>x.reason).sort(),["capacity_exhausted","category_not_allowed"]);
});

test("UGP-8.3A rejects duplicate and unknown opportunity candidates",()=>{
 const m=model();
 const c={opportunityFingerprint:fp("a"),category:"guides",priorityScore:50,readinessFingerprint:fp("1")};
 assert.throws(()=>buildContentCalendarProjection({opportunityModel:m,candidates:[c,c],policy:{articlesPerWeek:1,allowedCategories:["guides"],blackoutDates:[],mode:"review_required"},startDate:"2026-10-05",weeks:1}),/duplicate_candidate/);
 assert.throws(()=>buildContentCalendarProjection({opportunityModel:m,candidates:[{...c,opportunityFingerprint:fp("9")}],policy:{articlesPerWeek:1,allowedCategories:["guides"],blackoutDates:[],mode:"review_required"},startDate:"2026-10-05",weeks:1}),/unknown_opportunity/);
});

test("UGP-8.3A integrity detects tampering",()=>{
 const m=model();
 const result=buildContentCalendarProjection({opportunityModel:m,candidates:[{opportunityFingerprint:fp("a"),category:"guides",priorityScore:80,readinessFingerprint:fp("1")}],policy:{articlesPerWeek:1,allowedCategories:["guides"],blackoutDates:[],mode:"review_required"},startDate:"2026-10-05",weeks:1});
 assert.throws(()=>assertContentCalendarProjectionIntegrity({...result,projectionFingerprint:fp("0")}),/projection_fingerprint_mismatch/);
});
