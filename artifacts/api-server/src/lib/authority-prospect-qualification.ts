import { createHash } from "node:crypto";
import {
  assertBacklinkEvidenceDatasetIntegrity,
  type BacklinkEvidenceDataset,
} from "./backlink-evidence-contract.js";
import {
  assertAuthorityOpportunityDiscoveryIntegrity,
  type AuthorityOpportunity,
  type AuthorityOpportunityDiscovery,
} from "./authority-opportunity-discovery.js";

export const UGP_AUTHORITY_PROSPECT_QUALIFICATION_VERSION =
  "ugp-9-4a-prospect-qualification-v1" as const;

export type AuthorityQualificationMetricSignal = Readonly<{
  value: number;
  evidenceFingerprint: string;
}>;

export type AuthorityProspectQualificationSignal = Readonly<{
  opportunityFingerprint: string;
  topicalRelevance?: AuthorityQualificationMetricSignal | null;
  targetPageFit?: AuthorityQualificationMetricSignal | null;
  contactability?: AuthorityQualificationMetricSignal | null;
  spamRisk?: AuthorityQualificationMetricSignal | null;
}>;

export type AuthorityQualificationComponentState =
  | "available"
  | "unavailable"
  | "not_applicable";

export type AuthorityQualificationComponent = Readonly<{
  state: AuthorityQualificationComponentState;
  weight: number;
  raw: number | null;
  normalized: number | null;
  points: number | null;
  evidenceFingerprints: readonly string[];
}>;

export type AuthorityProspectQualificationStatus =
  | "qualified_for_review"
  | "needs_review"
  | "insufficient_evidence"
  | "disqualified";

export type AuthorityProspectRiskClass =
  | "unknown"
  | "low"
  | "medium"
  | "high";

export type AuthorityProspectQualification = Readonly<{
  prospectId: string;
  prospectFingerprint: string;
  opportunityId: string;
  opportunityFingerprint: string;
  kind: AuthorityOpportunity["kind"];
  sourceDomain: string;
  sourceUrl: string | null;
  targetUrl: string | null;
  status: AuthorityProspectQualificationStatus;
  score: number;
  evidenceCoverage: number;
  riskClass: AuthorityProspectRiskClass;
  reasonCode:
    | "high_risk_signal"
    | "insufficient_evidence_coverage"
    | "score_meets_review_threshold"
    | "score_below_review_threshold";
  components: Readonly<{
    evidenceQuality: AuthorityQualificationComponent;
    sourceQuality: AuthorityQualificationComponent;
    competitorPrecedent: AuthorityQualificationComponent;
    topicalRelevance: AuthorityQualificationComponent;
    targetPageFit: AuthorityQualificationComponent;
    contactability: AuthorityQualificationComponent;
    riskSafety: AuthorityQualificationComponent;
  }>;
  evidenceFingerprints: readonly string[];
}>;

export type AuthorityProspectQualificationResult = Readonly<{
  version: typeof UGP_AUTHORITY_PROSPECT_QUALIFICATION_VERSION;
  targetDomain: string;
  discoveryFingerprint: string;
  currentDatasetFingerprint: string;
  authorityMetric: Readonly<{
    key: string;
    min: number;
    max: number;
    crossProviderComparable: false;
  }> | null;
  prospects: readonly AuthorityProspectQualification[];
  summary: Readonly<{
    total: number;
    qualifiedForReview: number;
    needsReview: number;
    insufficientEvidence: number;
    disqualified: number;
  }>;
  limitations: readonly string[];
  semantics: Readonly<{
    deterministic: true;
    evidenceBound: true;
    transparentScoring: true;
    prospectQualificationPerformed: true;
    syntheticFallback: false;
    missingEvidenceScoredAsZero: false;
    contactDiscoveryPerformed: false;
    outreachAuthorized: false;
    liveAcquisitionAuthorized: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    schedulerEnabled: false;
    providerWrites: false;
    publicSiteWrites: false;
    linkSchemeAutomationAuthorized: false;
  }>;
  qualificationFingerprint: string;
}>;

const HEX64=/^[0-9a-f]{64}$/;
const WEIGHTS=Object.freeze({
  evidenceQuality:20,
  sourceQuality:15,
  competitorPrecedent:15,
  topicalRelevance:20,
  targetPageFit:15,
  contactability:5,
  riskSafety:10,
});
const SEMANTICS=Object.freeze({
  deterministic:true as const,
  evidenceBound:true as const,
  transparentScoring:true as const,
  prospectQualificationPerformed:true as const,
  syntheticFallback:false as const,
  missingEvidenceScoredAsZero:false as const,
  contactDiscoveryPerformed:false as const,
  outreachAuthorized:false as const,
  liveAcquisitionAuthorized:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  schedulerEnabled:false as const,
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
function round(value:number,digits=4):number{
  return Number(value.toFixed(digits));
}
function clamp01(value:number):number{
  return Math.max(0,Math.min(1,value));
}
function fingerprint(value:unknown,name:string):string{
  if(typeof value!=="string"||!HEX64.test(value)){
    throw new Error("ugp_authority_qualification_invalid_"+name);
  }
  return value;
}
function metricSignal(
  value:AuthorityQualificationMetricSignal|null|undefined,
  name:string,
):AuthorityQualificationMetricSignal|null{
  if(value===null||value===undefined) return null;
  if(!Number.isFinite(value.value)||value.value<0||value.value>1){
    throw new Error("ugp_authority_qualification_invalid_"+name+"_value");
  }
  return Object.freeze({
    value:round(value.value,6),
    evidenceFingerprint:fingerprint(
      value.evidenceFingerprint,
      name+"_evidence_fingerprint",
    ),
  });
}
function available(
  weight:number,
  raw:number,
  normalized:number,
  evidenceFingerprints:readonly string[],
):AuthorityQualificationComponent{
  const n=clamp01(normalized);
  return Object.freeze({
    state:"available" as const,
    weight,
    raw:round(raw,6),
    normalized:round(n,6),
    points:round(weight*n,4),
    evidenceFingerprints:Object.freeze([...evidenceFingerprints].sort()),
  });
}
function unavailable(weight:number):AuthorityQualificationComponent{
  return Object.freeze({
    state:"unavailable" as const,
    weight,
    raw:null,
    normalized:null,
    points:null,
    evidenceFingerprints:Object.freeze([]),
  });
}
function notApplicable():AuthorityQualificationComponent{
  return Object.freeze({
    state:"not_applicable" as const,
    weight:0,
    raw:null,
    normalized:null,
    points:null,
    evidenceFingerprints:Object.freeze([]),
  });
}
function explicitComponent(
  weight:number,
  signal:AuthorityQualificationMetricSignal|null,
):AuthorityQualificationComponent{
  return signal
    ?available(weight,signal.value,signal.value,[signal.evidenceFingerprint])
    :unavailable(weight);
}
function sourceQuality(
  opportunity:AuthorityOpportunity,
  current:BacklinkEvidenceDataset,
):AuthorityQualificationComponent{
  const metric=current.source.authorityMetric;
  if(
    opportunity.providerAuthority===null
    ||metric===null
    ||!Number.isFinite(metric.min)
    ||!Number.isFinite(metric.max)
    ||metric.max<=metric.min
  ) return unavailable(WEIGHTS.sourceQuality);
  const normalized=clamp01(
    (opportunity.providerAuthority-metric.min)/(metric.max-metric.min),
  );
  return available(
    WEIGHTS.sourceQuality,
    opportunity.providerAuthority,
    normalized,
    opportunity.evidenceFingerprints,
  );
}
function competitorPrecedent(
  opportunity:AuthorityOpportunity,
):AuthorityQualificationComponent{
  if(
    opportunity.kind!=="competitor_link_gap"
    &&opportunity.kind!=="domain_intersection"
  ) return notApplicable();
  return available(
    WEIGHTS.competitorPrecedent,
    opportunity.competitorDomains.length,
    Math.min(1,opportunity.competitorDomains.length/3),
    opportunity.evidenceFingerprints,
  );
}
function riskClass(signal:AuthorityQualificationMetricSignal|null):AuthorityProspectRiskClass{
  if(!signal) return "unknown";
  if(signal.value>=0.6) return "high";
  if(signal.value>=0.25) return "medium";
  return "low";
}
function qualifyOne(input:{
  opportunity:AuthorityOpportunity;
  current:BacklinkEvidenceDataset;
  signal:AuthorityProspectQualificationSignal|null;
}):AuthorityProspectQualification{
  const topical=metricSignal(input.signal?.topicalRelevance,"topical_relevance");
  const target=metricSignal(input.signal?.targetPageFit,"target_page_fit");
  const contact=metricSignal(input.signal?.contactability,"contactability");
  const risk=metricSignal(input.signal?.spamRisk,"spam_risk");
  const components=Object.freeze({
    evidenceQuality:available(
      WEIGHTS.evidenceQuality,
      input.opportunity.evidenceFingerprints.length,
      Math.min(1,input.opportunity.evidenceFingerprints.length/3),
      input.opportunity.evidenceFingerprints,
    ),
    sourceQuality:sourceQuality(input.opportunity,input.current),
    competitorPrecedent:competitorPrecedent(input.opportunity),
    topicalRelevance:explicitComponent(WEIGHTS.topicalRelevance,topical),
    targetPageFit:explicitComponent(WEIGHTS.targetPageFit,target),
    contactability:explicitComponent(WEIGHTS.contactability,contact),
    riskSafety:risk
      ?available(
        WEIGHTS.riskSafety,
        risk.value,
        1-risk.value,
        [risk.evidenceFingerprint],
      )
      :unavailable(WEIGHTS.riskSafety),
  });
  const values=Object.values(components);
  const eligibleWeight=values
    .filter(component=>component.state!=="not_applicable")
    .reduce((sum,component)=>sum+component.weight,0);
  const availableValues=values.filter(component=>component.state==="available");
  const availableWeight=availableValues.reduce(
    (sum,component)=>sum+component.weight,
    0,
  );
  const points=availableValues.reduce(
    (sum,component)=>sum+(component.points??0),
    0,
  );
  const evidenceCoverage=eligibleWeight===0?0:round(availableWeight/eligibleWeight,4);
  const score=availableWeight===0?0:round(points/availableWeight*100,2);
  const highRisk=(risk?.value??0)>=0.75;
  const status:AuthorityProspectQualificationStatus=
    highRisk?"disqualified"
    :evidenceCoverage<0.7?"insufficient_evidence"
    :score>=70?"qualified_for_review"
    :"needs_review";
  const reasonCode:AuthorityProspectQualification["reasonCode"]=
    highRisk?"high_risk_signal"
    :evidenceCoverage<0.7?"insufficient_evidence_coverage"
    :score>=70?"score_meets_review_threshold"
    :"score_below_review_threshold";
  const evidenceFingerprints=Object.freeze([
    ...new Set(
      values.flatMap(component=>component.evidenceFingerprints),
    ),
  ].sort());
  const base={
    opportunityId:input.opportunity.opportunityId,
    opportunityFingerprint:input.opportunity.opportunityFingerprint,
    kind:input.opportunity.kind,
    sourceDomain:input.opportunity.sourceDomain,
    sourceUrl:input.opportunity.sourceUrl,
    targetUrl:input.opportunity.targetUrl,
    status,
    score,
    evidenceCoverage,
    riskClass:riskClass(risk),
    reasonCode,
    components,
    evidenceFingerprints,
  };
  const prospectFingerprint=hash({
    purpose:"ugp_authority_prospect_qualification",
    version:UGP_AUTHORITY_PROSPECT_QUALIFICATION_VERSION,
    ...base,
  });
  return Object.freeze({
    prospectId:"uaq-"+prospectFingerprint.slice(0,24),
    prospectFingerprint,
    ...base,
  });
}

export function qualifyAuthorityProspects(input:{
  discovery:AuthorityOpportunityDiscovery;
  current:BacklinkEvidenceDataset;
  signals?:readonly AuthorityProspectQualificationSignal[];
}):AuthorityProspectQualificationResult{
  assertAuthorityOpportunityDiscoveryIntegrity(input.discovery);
  assertBacklinkEvidenceDatasetIntegrity(input.current);
  if(
    input.discovery.targetDomain!==input.current.targetDomain
    ||input.discovery.currentDatasetFingerprint!==input.current.datasetFingerprint
  ) throw new Error("ugp_authority_qualification_discovery_dataset_mismatch");

  const signals=new Map<string,AuthorityProspectQualificationSignal>();
  const opportunityFingerprints=new Set(
    input.discovery.opportunities.map(row=>row.opportunityFingerprint),
  );
  for(const raw of input.signals??[]){
    const key=fingerprint(raw.opportunityFingerprint,"opportunity_fingerprint");
    if(!opportunityFingerprints.has(key)){
      throw new Error("ugp_authority_qualification_unknown_opportunity_signal");
    }
    if(signals.has(key)){
      throw new Error("ugp_authority_qualification_duplicate_opportunity_signal");
    }
    signals.set(key,Object.freeze({
      opportunityFingerprint:key,
      topicalRelevance:metricSignal(raw.topicalRelevance,"topical_relevance"),
      targetPageFit:metricSignal(raw.targetPageFit,"target_page_fit"),
      contactability:metricSignal(raw.contactability,"contactability"),
      spamRisk:metricSignal(raw.spamRisk,"spam_risk"),
    }));
  }

  const prospects=Object.freeze(
    input.discovery.opportunities
      .map(opportunity=>qualifyOne({
        opportunity,
        current:input.current,
        signal:signals.get(opportunity.opportunityFingerprint)??null,
      }))
      .sort((a,b)=>
        b.score-a.score
        ||b.evidenceCoverage-a.evidenceCoverage
        ||a.prospectFingerprint.localeCompare(b.prospectFingerprint)
      ),
  );
  const summary=Object.freeze({
    total:prospects.length,
    qualifiedForReview:prospects.filter(
      row=>row.status==="qualified_for_review",
    ).length,
    needsReview:prospects.filter(row=>row.status==="needs_review").length,
    insufficientEvidence:prospects.filter(
      row=>row.status==="insufficient_evidence",
    ).length,
    disqualified:prospects.filter(row=>row.status==="disqualified").length,
  });
  const metric=input.current.source.authorityMetric;
  const authorityMetric=metric?Object.freeze({
    key:metric.key,
    min:metric.min,
    max:metric.max,
    crossProviderComparable:false as const,
  }):null;
  const limitations=Object.freeze([
    "qualification_does_not_authorize_outreach",
    "missing_dimensions_reduce_evidence_coverage",
    "contactability_requires_explicit_evidence",
    ...(metric?["provider_authority_not_cross_provider_comparable"]:[]),
  ].sort());
  const base={
    version:UGP_AUTHORITY_PROSPECT_QUALIFICATION_VERSION,
    targetDomain:input.discovery.targetDomain,
    discoveryFingerprint:input.discovery.discoveryFingerprint,
    currentDatasetFingerprint:input.current.datasetFingerprint,
    authorityMetric,
    prospects,
    summary,
    limitations,
    semantics:SEMANTICS,
  };
  return Object.freeze({
    ...base,
    qualificationFingerprint:hash({
      purpose:"ugp_authority_prospect_qualification_result",
      ...base,
    }),
  });
}

export function assertAuthorityProspectQualificationIntegrity(
  result:AuthorityProspectQualificationResult,
  input:{
    discovery:AuthorityOpportunityDiscovery;
    current:BacklinkEvidenceDataset;
    signals?:readonly AuthorityProspectQualificationSignal[];
  },
):void{
  if(
    !result
    ||result.version!==UGP_AUTHORITY_PROSPECT_QUALIFICATION_VERSION
  ) throw new Error("ugp_authority_qualification_version_invalid");
  const s=result.semantics;
  if(
    s.deterministic!==true||s.evidenceBound!==true
    ||s.transparentScoring!==true
    ||s.prospectQualificationPerformed!==true
    ||s.syntheticFallback!==false
    ||s.missingEvidenceScoredAsZero!==false
    ||s.contactDiscoveryPerformed!==false
    ||s.outreachAuthorized!==false
    ||s.liveAcquisitionAuthorized!==false
    ||s.performsNetworkOperation!==false
    ||s.performsPersistence!==false
    ||s.schedulerEnabled!==false
    ||s.providerWrites!==false
    ||s.publicSiteWrites!==false
    ||s.linkSchemeAutomationAuthorized!==false
  ) throw new Error("ugp_authority_qualification_unsafe_semantics");
  const expected=qualifyAuthorityProspects(input);
  if(stableJson(result)!==stableJson(expected)){
    throw new Error("ugp_authority_qualification_integrity_mismatch");
  }
}
