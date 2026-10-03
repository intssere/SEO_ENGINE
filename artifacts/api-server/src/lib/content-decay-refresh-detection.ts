import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_CONTENT_DECAY_REFRESH_VERSION =
  "ugp-8-4a-content-decay-refresh-detection-v1" as const;

export const UGP_CONTENT_DECAY_REFRESH_POLICY = Object.freeze({
  minimumBaselineImpressions: 50,
  minimumClickDeclineRatio: 0.2,
  minimumImpressionDeclineRatio: 0.2,
  minimumPositionWorsening: 3,
  minimumRankWorsening: 3,
  staleContentAgeDays: 180,
  minimumEvidenceClassesForRefresh: 2,
} as const);

export type DecayEvidenceClass =
  | "gsc_performance"
  | "ranking"
  | "freshness"
  | "serp_change"
  | "content_change";

export type ContentDecayClassification =
  | "refresh_candidate"
  | "watch"
  | "stable"
  | "defer_insufficient_evidence";

export type SearchPerformanceWindow = Readonly<{
  startDate: string;
  endDate: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  evidenceFingerprint: string;
}>;

export type RankingObservation = Readonly<{
  observedDate: string;
  rank: number | null;
  evidenceFingerprint: string;
}>;

export type FreshnessObservation = Readonly<{
  evaluatedDate: string;
  lastMeaningfulUpdateDate: string | null;
  ageDays: number | null;
  evidenceFingerprint: string;
}>;

export type SerpChangeObservation = Readonly<{
  beforeEvidenceFingerprint: string;
  afterEvidenceFingerprint: string;
  materiallyChanged: boolean;
  evidenceFingerprint: string;
}>;

export type ContentChangeObservation = Readonly<{
  beforeStateFingerprint: string;
  afterStateFingerprint: string;
  materiallyChanged: boolean;
  evidenceFingerprint: string;
}>;

export type ContentDecayRefreshInput = Readonly<{
  pageUrl: string;
  pageIdentityFingerprint: string;
  contentOpportunityFingerprint: string | null;
  gsc?: Readonly<{
    before: SearchPerformanceWindow;
    after: SearchPerformanceWindow;
  }> | null;
  ranking?: Readonly<{
    before: RankingObservation;
    after: RankingObservation;
  }> | null;
  freshness?: FreshnessObservation | null;
  serpChange?: SerpChangeObservation | null;
  contentChange?: ContentChangeObservation | null;
}>;

export type ContentDecayRefreshAssessment = Readonly<{
  version: typeof UGP_CONTENT_DECAY_REFRESH_VERSION;
  pageUrl: string;
  pageIdentityFingerprint: string;
  contentOpportunityFingerprint: string | null;
  classification: ContentDecayClassification;
  signals: Readonly<{
    gscClicksDeclined: boolean;
    gscImpressionsDeclined: boolean;
    gscPositionWorsened: boolean;
    rankingWorsened: boolean;
    contentStale: boolean;
    serpMateriallyChanged: boolean;
    contentMateriallyChanged: boolean;
  }>;
  evidenceClassesPresent: readonly DecayEvidenceClass[];
  evidenceClassesMaterial: readonly DecayEvidenceClass[];
  evidenceFingerprints: readonly string[];
  rationale: readonly string[];
  limitations: readonly string[];
  expectedMeasurement: Readonly<{
    method: "gsc_page_before_after_observational";
    causalAttribution: false;
  }>;
  semantics: Readonly<{
    deterministic: true;
    readOnly: true;
    observationalOnly: true;
    causalAttribution: false;
    evidenceBacked: true;
    grantsAuthorization: false;
    publicationAuthorized: false;
    executionAuthorized: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  assessmentFingerprint: string;
}>;

const HEX64=/^[0-9a-f]{64}$/;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const SEMANTICS=Object.freeze({
  deterministic:true as const,
  readOnly:true as const,
  observationalOnly:true as const,
  causalAttribution:false as const,
  evidenceBacked:true as const,
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
    throw new Error("ugp_content_decay_invalid_"+field);
  }
  return value;
}

function exactDate(value:unknown,field:string):string{
  if(typeof value!=="string"||!DATE.test(value)){
    throw new Error("ugp_content_decay_invalid_"+field);
  }
  const d=new Date(value+"T00:00:00.000Z");
  if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value){
    throw new Error("ugp_content_decay_invalid_"+field);
  }
  return value;
}

function number(value:unknown,min:number,max:number,field:string):number{
  if(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max){
    throw new Error("ugp_content_decay_invalid_"+field);
  }
  return value;
}

function pageUrl(value:unknown):string{
  if(typeof value!=="string"||value.length<1||value.length>2048){
    throw new Error("ugp_content_decay_invalid_page_url");
  }
  let u:URL;
  try{u=new URL(value);}catch{throw new Error("ugp_content_decay_invalid_page_url");}
  if(u.protocol!=="https:"&&u.protocol!=="http:"){
    throw new Error("ugp_content_decay_invalid_page_url");
  }
  u.hash="";
  return u.toString();
}

function validateWindow(w:SearchPerformanceWindow,name:string):SearchPerformanceWindow{
  const startDate=exactDate(w.startDate,name+"_start_date");
  const endDate=exactDate(w.endDate,name+"_end_date");
  if(Date.parse(endDate+"T00:00:00.000Z")<Date.parse(startDate+"T00:00:00.000Z")){
    throw new Error("ugp_content_decay_invalid_"+name+"_date_range");
  }
  const clicks=number(w.clicks,0,1e15,name+"_clicks");
  const impressions=number(w.impressions,0,1e15,name+"_impressions");
  if(clicks>impressions) throw new Error("ugp_content_decay_invalid_"+name+"_clicks");
  const ctr=number(w.ctr,0,1,name+"_ctr");
  const position=number(w.position,0,10000,name+"_position");
  fp(w.evidenceFingerprint,name+"_evidence_fingerprint");
  return Object.freeze({startDate,endDate,clicks,impressions,ctr,position,evidenceFingerprint:w.evidenceFingerprint});
}

function declineRatio(before:number,after:number):number{
  if(before<=0) return 0;
  return (before-after)/before;
}

export function buildContentDecayRefreshAssessment(
  input:ContentDecayRefreshInput,
):ContentDecayRefreshAssessment{
  const url=pageUrl(input.pageUrl);
  const pageIdentityFingerprint=fp(input.pageIdentityFingerprint,"page_identity_fingerprint");
  const contentOpportunityFingerprint=input.contentOpportunityFingerprint===null
    ? null
    : fp(input.contentOpportunityFingerprint,"content_opportunity_fingerprint");

  const present=new Set<DecayEvidenceClass>();
  const material=new Set<DecayEvidenceClass>();
  const evidence:string[]=[];
  const rationale:string[]=[];
  const limitations:string[]=[];

  let gscClicksDeclined=false;
  let gscImpressionsDeclined=false;
  let gscPositionWorsened=false;
  let rankingWorsened=false;
  let contentStale=false;
  let serpMateriallyChanged=false;
  let contentMateriallyChanged=false;

  if(input.gsc){
    const before=validateWindow(input.gsc.before,"gsc_before");
    const after=validateWindow(input.gsc.after,"gsc_after");
    if(Date.parse(after.startDate+"T00:00:00.000Z")<=Date.parse(before.endDate+"T00:00:00.000Z")){
      throw new Error("ugp_content_decay_gsc_windows_overlap_or_reverse");
    }
    present.add("gsc_performance");
    evidence.push(before.evidenceFingerprint,after.evidenceFingerprint);
    if(before.impressions>=UGP_CONTENT_DECAY_REFRESH_POLICY.minimumBaselineImpressions){
      gscClicksDeclined=declineRatio(before.clicks,after.clicks)>=UGP_CONTENT_DECAY_REFRESH_POLICY.minimumClickDeclineRatio;
      gscImpressionsDeclined=declineRatio(before.impressions,after.impressions)>=UGP_CONTENT_DECAY_REFRESH_POLICY.minimumImpressionDeclineRatio;
      gscPositionWorsened=(after.position-before.position)>=UGP_CONTENT_DECAY_REFRESH_POLICY.minimumPositionWorsening;
      if(gscClicksDeclined||gscImpressionsDeclined||gscPositionWorsened){
        material.add("gsc_performance");
        rationale.push("gsc_performance_deterioration_observed");
      }
    }else{
      limitations.push("gsc_baseline_impressions_below_materiality_threshold");
    }
  }else{
    limitations.push("gsc_performance_not_supplied");
  }

  if(input.ranking){
    const beforeDate=exactDate(input.ranking.before.observedDate,"ranking_before_date");
    const afterDate=exactDate(input.ranking.after.observedDate,"ranking_after_date");
    if(Date.parse(afterDate+"T00:00:00.000Z")<=Date.parse(beforeDate+"T00:00:00.000Z")){
      throw new Error("ugp_content_decay_ranking_dates_not_ordered");
    }
    const beforeRank=input.ranking.before.rank;
    const afterRank=input.ranking.after.rank;
    if(beforeRank!==null) number(beforeRank,1,10000,"ranking_before_rank");
    if(afterRank!==null) number(afterRank,1,10000,"ranking_after_rank");
    fp(input.ranking.before.evidenceFingerprint,"ranking_before_evidence_fingerprint");
    fp(input.ranking.after.evidenceFingerprint,"ranking_after_evidence_fingerprint");
    present.add("ranking");
    evidence.push(input.ranking.before.evidenceFingerprint,input.ranking.after.evidenceFingerprint);
    if(beforeRank!==null){
      rankingWorsened=afterRank===null||(afterRank-beforeRank)>=UGP_CONTENT_DECAY_REFRESH_POLICY.minimumRankWorsening;
      if(rankingWorsened){
        material.add("ranking");
        rationale.push("ranking_deterioration_observed");
      }
    }else{
      limitations.push("ranking_baseline_absent");
    }
  }else{
    limitations.push("ranking_evidence_not_supplied");
  }

  if(input.freshness){
    const evaluated=exactDate(input.freshness.evaluatedDate,"freshness_evaluated_date");
    fp(input.freshness.evidenceFingerprint,"freshness_evidence_fingerprint");
    present.add("freshness");
    evidence.push(input.freshness.evidenceFingerprint);
    if(input.freshness.lastMeaningfulUpdateDate===null){
      if(input.freshness.ageDays!==null) throw new Error("ugp_content_decay_freshness_age_without_date");
      limitations.push("last_meaningful_update_date_unknown");
    }else{
      const last=exactDate(input.freshness.lastMeaningfulUpdateDate,"freshness_last_update_date");
      if(Date.parse(last+"T00:00:00.000Z")>Date.parse(evaluated+"T00:00:00.000Z")){
        throw new Error("ugp_content_decay_freshness_update_in_future");
      }
      if(input.freshness.ageDays===null||!Number.isInteger(input.freshness.ageDays)||input.freshness.ageDays<0){
        throw new Error("ugp_content_decay_invalid_freshness_age_days");
      }
      const computed=Math.floor((Date.parse(evaluated+"T00:00:00.000Z")-Date.parse(last+"T00:00:00.000Z"))/86400000);
      if(computed!==input.freshness.ageDays) throw new Error("ugp_content_decay_freshness_age_mismatch");
      contentStale=input.freshness.ageDays>=UGP_CONTENT_DECAY_REFRESH_POLICY.staleContentAgeDays;
      if(contentStale){
        material.add("freshness");
        rationale.push("content_freshness_threshold_exceeded");
      }
    }
  }else{
    limitations.push("freshness_evidence_not_supplied");
  }

  if(input.serpChange){
    fp(input.serpChange.beforeEvidenceFingerprint,"serp_before_evidence_fingerprint");
    fp(input.serpChange.afterEvidenceFingerprint,"serp_after_evidence_fingerprint");
    fp(input.serpChange.evidenceFingerprint,"serp_change_evidence_fingerprint");
    if(input.serpChange.beforeEvidenceFingerprint===input.serpChange.afterEvidenceFingerprint&&input.serpChange.materiallyChanged){
      throw new Error("ugp_content_decay_serp_change_inconsistent");
    }
    present.add("serp_change");
    evidence.push(input.serpChange.beforeEvidenceFingerprint,input.serpChange.afterEvidenceFingerprint,input.serpChange.evidenceFingerprint);
    serpMateriallyChanged=input.serpChange.materiallyChanged;
    if(serpMateriallyChanged){
      material.add("serp_change");
      rationale.push("serp_material_change_observed");
    }
  }else{
    limitations.push("serp_change_evidence_not_supplied");
  }

  if(input.contentChange){
    fp(input.contentChange.beforeStateFingerprint,"content_before_state_fingerprint");
    fp(input.contentChange.afterStateFingerprint,"content_after_state_fingerprint");
    fp(input.contentChange.evidenceFingerprint,"content_change_evidence_fingerprint");
    if(input.contentChange.beforeStateFingerprint===input.contentChange.afterStateFingerprint&&input.contentChange.materiallyChanged){
      throw new Error("ugp_content_decay_content_change_inconsistent");
    }
    present.add("content_change");
    evidence.push(input.contentChange.beforeStateFingerprint,input.contentChange.afterStateFingerprint,input.contentChange.evidenceFingerprint);
    contentMateriallyChanged=input.contentChange.materiallyChanged;
    if(contentMateriallyChanged){
      material.add("content_change");
      rationale.push("content_state_material_change_observed");
    }
  }else{
    limitations.push("per_url_content_change_evidence_not_supplied");
  }

  const primaryDeterioration=material.has("gsc_performance")||material.has("ranking");
  let classification:ContentDecayClassification;
  if(present.size<2){
    classification="defer_insufficient_evidence";
    rationale.push("fewer_than_two_evidence_classes_supplied");
  }else if(
    primaryDeterioration
    && material.size>=UGP_CONTENT_DECAY_REFRESH_POLICY.minimumEvidenceClassesForRefresh
  ){
    classification="refresh_candidate";
    rationale.push("search_deterioration_corroborated_by_additional_evidence");
  }else if(primaryDeterioration||material.size>0){
    classification="watch";
    rationale.push("material_signal_observed_without_refresh_threshold");
  }else{
    classification="stable";
    rationale.push("no_material_decay_signal_observed");
  }

  const evidenceClassesPresent=[...present].sort() as DecayEvidenceClass[];
  const evidenceClassesMaterial=[...material].sort() as DecayEvidenceClass[];
  const evidenceFingerprints=[...new Set(evidence)].sort();

  const base={
    version:UGP_CONTENT_DECAY_REFRESH_VERSION,
    pageUrl:url,
    pageIdentityFingerprint,
    contentOpportunityFingerprint,
    classification,
    signals:Object.freeze({
      gscClicksDeclined,
      gscImpressionsDeclined,
      gscPositionWorsened,
      rankingWorsened,
      contentStale,
      serpMateriallyChanged,
      contentMateriallyChanged,
    }),
    evidenceClassesPresent:Object.freeze(evidenceClassesPresent),
    evidenceClassesMaterial:Object.freeze(evidenceClassesMaterial),
    evidenceFingerprints:Object.freeze(evidenceFingerprints),
    rationale:Object.freeze([...new Set(rationale)].sort()),
    limitations:Object.freeze([...new Set(limitations)].sort()),
    expectedMeasurement:Object.freeze({
      method:"gsc_page_before_after_observational" as const,
      causalAttribution:false as const,
    }),
    semantics:SEMANTICS,
  };

  return Object.freeze({
    ...base,
    assessmentFingerprint:stableEvidenceHash({
      purpose:"ugp_content_decay_refresh_assessment",
      ...base,
    }),
  });
}

export function assertContentDecayRefreshAssessmentIntegrity(
  result:ContentDecayRefreshAssessment,
):void{
  if(!result||result.version!==UGP_CONTENT_DECAY_REFRESH_VERSION){
    throw new Error("ugp_content_decay_version_invalid");
  }
  fp(result.pageIdentityFingerprint,"page_identity_fingerprint");
  if(result.contentOpportunityFingerprint!==null){
    fp(result.contentOpportunityFingerprint,"content_opportunity_fingerprint");
  }
  fp(result.assessmentFingerprint,"assessment_fingerprint");
  pageUrl(result.pageUrl);
  for(const f of result.evidenceFingerprints) fp(f,"evidence_fingerprint");
  const s=result.semantics;
  if(
    s.deterministic!==true||s.readOnly!==true||s.observationalOnly!==true
    ||s.causalAttribution!==false||s.evidenceBacked!==true
    ||s.grantsAuthorization!==false||s.publicationAuthorized!==false
    ||s.executionAuthorized!==false||s.performsNetworkOperation!==false
    ||s.performsPersistence!==false||s.providerWrites!==false
    ||s.publicSiteWrites!==false
  ) throw new Error("ugp_content_decay_unsafe_semantics");
  const {assessmentFingerprint,...base}=result;
  const expected=stableEvidenceHash({
    purpose:"ugp_content_decay_refresh_assessment",
    ...base,
  });
  if(expected!==assessmentFingerprint){
    throw new Error("ugp_content_decay_assessment_fingerprint_mismatch");
  }
}
