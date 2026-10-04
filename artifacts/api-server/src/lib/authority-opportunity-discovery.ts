import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { domainToASCII } from "node:url";
import {
  assertBacklinkEvidenceDatasetIntegrity,
  type BacklinkEvidenceDataset,
} from "./backlink-evidence-contract.js";
import type { BacklinkFixtureBundle } from "./backlink-fixture-normalization.js";

export const UGP_AUTHORITY_OPPORTUNITY_DISCOVERY_VERSION =
  "ugp-9-3a-authority-opportunity-discovery-v1" as const;

export type AuthorityOpportunityKind =
  | "competitor_link_gap"
  | "domain_intersection"
  | "broken_link_opportunity"
  | "unlinked_brand_mention"
  | "lost_link_recovery"
  | "resource_page_opportunity"
  | "partner_supplier_citation"
  | "content_promotion_prospect";

export type SupplementalAuthorityOpportunityKind = Exclude<
  AuthorityOpportunityKind,
  "competitor_link_gap" | "domain_intersection" | "lost_link_recovery"
>;

export type SupplementalAuthorityEvidence = Readonly<{
  kind: SupplementalAuthorityOpportunityKind;
  sourceDomain: string;
  sourceUrl: string | null;
  targetUrl: string | null;
  observedAt: string;
  evidenceFingerprint: string;
}>;

export type AuthorityOpportunity = Readonly<{
  opportunityId: string;
  opportunityFingerprint: string;
  kind: AuthorityOpportunityKind;
  sourceDomain: string;
  sourceUrl: string | null;
  targetUrl: string | null;
  competitorDomains: readonly string[];
  observedAt: string;
  providerAuthority: number | null;
  evidenceFingerprints: readonly string[];
  rationaleCode:
    | "competitor_links_without_owned_link"
    | "multiple_competitors_share_referring_domain"
    | "normalized_lost_backlink"
    | "explicit_broken_link_evidence"
    | "explicit_unlinked_brand_mention_evidence"
    | "explicit_resource_page_evidence"
    | "explicit_partner_supplier_citation_evidence"
    | "explicit_content_promotion_prospect_evidence";
}>;

export type AuthorityOpportunityDiscovery = Readonly<{
  version: typeof UGP_AUTHORITY_OPPORTUNITY_DISCOVERY_VERSION;
  targetDomain: string;
  currentDatasetFingerprint: string;
  competitorBundleFingerprint: string | null;
  opportunities: readonly AuthorityOpportunity[];
  summary: Readonly<Record<AuthorityOpportunityKind, number> & { total: number }>;
  limitations: readonly string[];
  semantics: Readonly<{
    deterministic: true;
    evidenceBackedOnly: true;
    discoveryOnly: true;
    scoringPerformed: false;
    prospectQualificationPerformed: false;
    contactDiscoveryPerformed: false;
    outreachAuthorized: false;
    liveAcquisitionAuthorized: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    schedulerEnabled: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  discoveryFingerprint: string;
}>;

const HEX64=/^[0-9a-f]{64}$/;
const HOST_LABEL=/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const KINDS:readonly AuthorityOpportunityKind[]=[
  "competitor_link_gap",
  "domain_intersection",
  "broken_link_opportunity",
  "unlinked_brand_mention",
  "lost_link_recovery",
  "resource_page_opportunity",
  "partner_supplier_citation",
  "content_promotion_prospect",
];

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  evidenceBackedOnly:true as const,
  discoveryOnly:true as const,
  scoringPerformed:false as const,
  prospectQualificationPerformed:false as const,
  contactDiscoveryPerformed:false as const,
  outreachAuthorized:false as const,
  liveAcquisitionAuthorized:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  schedulerEnabled:false as const,
  providerWrites:false as const,
  publicSiteWrites:false as const,
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
function fingerprint(value:unknown,name:string):string{
  if(typeof value!=="string"||!HEX64.test(value)) throw new Error("ugp_authority_opportunity_invalid_"+name);
  return value;
}
function cleanText(value:unknown,name:string,max:number):string{
  if(typeof value!=="string") throw new Error("ugp_authority_opportunity_invalid_"+name);
  const result=value.normalize("NFKC").trim().replace(/\s+/g," ");
  if(!result||result.length>max||/[\u0000-\u001f\u007f]/.test(result)){
    throw new Error("ugp_authority_opportunity_invalid_"+name);
  }
  return result;
}
function canonicalDomain(value:unknown):string{
  const raw=cleanText(value,"domain",2048).toLowerCase().replace(/\.$/,"");
  if(/[\s\/@?#:]/.test(raw)) throw new Error("ugp_authority_opportunity_invalid_domain");
  const ascii=domainToASCII(raw);
  if(!ascii||ascii.length>253||ascii==="localhost"||isIP(ascii)!==0||!ascii.includes(".")){
    throw new Error("ugp_authority_opportunity_invalid_domain");
  }
  if(ascii.split(".").some(label=>!HOST_LABEL.test(label))){
    throw new Error("ugp_authority_opportunity_invalid_domain");
  }
  return ascii;
}
function canonicalUrl(value:unknown):string{
  const raw=cleanText(value,"url",4096);
  let parsed:URL;
  try{parsed=new URL(raw);}catch{throw new Error("ugp_authority_opportunity_invalid_url");}
  if(parsed.protocol!=="http:"&&parsed.protocol!=="https:") throw new Error("ugp_authority_opportunity_invalid_url");
  if(parsed.username||parsed.password) throw new Error("ugp_authority_opportunity_invalid_url");
  parsed.hostname=canonicalDomain(parsed.hostname);
  parsed.hash="";
  return parsed.toString();
}
function nullableUrl(value:unknown):string|null{
  return value===null?null:canonicalUrl(value);
}
function timestamp(value:unknown):string{
  const raw=cleanText(value,"observed_at",64);
  const ms=Date.parse(raw);
  if(!Number.isFinite(ms)) throw new Error("ugp_authority_opportunity_invalid_observed_at");
  return new Date(ms).toISOString();
}
function rationale(kind:SupplementalAuthorityOpportunityKind):AuthorityOpportunity["rationaleCode"]{
  const map:Record<SupplementalAuthorityOpportunityKind,AuthorityOpportunity["rationaleCode"]>={
    broken_link_opportunity:"explicit_broken_link_evidence",
    unlinked_brand_mention:"explicit_unlinked_brand_mention_evidence",
    resource_page_opportunity:"explicit_resource_page_evidence",
    partner_supplier_citation:"explicit_partner_supplier_citation_evidence",
    content_promotion_prospect:"explicit_content_promotion_prospect_evidence",
  };
  return map[kind];
}
function opportunity(input:Omit<AuthorityOpportunity,"opportunityId"|"opportunityFingerprint">):AuthorityOpportunity{
  const base={
    ...input,
    competitorDomains:Object.freeze([...input.competitorDomains].sort()),
    evidenceFingerprints:Object.freeze([...input.evidenceFingerprints].sort()),
  };
  const opportunityFingerprint=hash({
    purpose:"ugp_authority_opportunity",
    version:UGP_AUTHORITY_OPPORTUNITY_DISCOVERY_VERSION,
    ...base,
  });
  return Object.freeze({
    opportunityId:"uao-"+opportunityFingerprint.slice(0,24),
    opportunityFingerprint,
    ...base,
  });
}
function assertCompetitorBasis(current:BacklinkEvidenceDataset,bundle:BacklinkFixtureBundle):void{
  if(bundle.owned.targetDomain!==current.targetDomain){
    throw new Error("ugp_authority_opportunity_competitor_target_mismatch");
  }
  const authority=current.source.authorityMetric;
  if(
    bundle.basis.providerKey!==current.source.providerKey
    ||bundle.basis.providerMethod!==current.source.providerDataset
    ||bundle.basis.sourceFingerprint!==current.source.sourceFingerprint
    ||bundle.basis.marketFingerprint!==current.source.marketFingerprint
    ||bundle.basis.categoryFingerprint!==current.source.categoryFingerprint
    ||(authority===null)!==(bundle.basis.authorityMetric===null)
    ||(
      authority!==null
      &&(
        bundle.basis.authorityMetric.name!==authority.key
        ||bundle.basis.authorityMetric.min!==authority.min
        ||bundle.basis.authorityMetric.max!==authority.max
        ||bundle.basis.authorityMetric.crossProviderComparable!==false
      )
    )
  ){
    throw new Error("ugp_authority_opportunity_competitor_basis_mismatch");
  }
}
function normalizeSupplemental(
  signal:SupplementalAuthorityEvidence,
  current:BacklinkEvidenceDataset,
):SupplementalAuthorityEvidence{
  if(![
    "broken_link_opportunity",
    "unlinked_brand_mention",
    "resource_page_opportunity",
    "partner_supplier_citation",
    "content_promotion_prospect",
  ].includes(signal.kind)) throw new Error("ugp_authority_opportunity_invalid_supplemental_kind");
  const sourceDomain=canonicalDomain(signal.sourceDomain);
  const sourceUrl=nullableUrl(signal.sourceUrl);
  if(sourceUrl&&new URL(sourceUrl).hostname!==sourceDomain){
    throw new Error("ugp_authority_opportunity_source_domain_url_mismatch");
  }
  const targetUrl=nullableUrl(signal.targetUrl);
  if(targetUrl&&new URL(targetUrl).hostname!==current.targetDomain){
    throw new Error("ugp_authority_opportunity_target_domain_url_mismatch");
  }
  const observedAt=timestamp(signal.observedAt);
  if(Date.parse(observedAt)>Date.parse(current.source.observedAt)){
    throw new Error("ugp_authority_opportunity_observed_after_dataset");
  }
  return Object.freeze({
    kind:signal.kind,
    sourceDomain,
    sourceUrl,
    targetUrl,
    observedAt,
    evidenceFingerprint:fingerprint(signal.evidenceFingerprint,"evidence_fingerprint"),
  });
}

export function discoverAuthorityOpportunities(input:{
  current:BacklinkEvidenceDataset;
  competitorBundle?:BacklinkFixtureBundle|null;
  supplementalEvidence?:readonly SupplementalAuthorityEvidence[];
}):AuthorityOpportunityDiscovery{
  assertBacklinkEvidenceDatasetIntegrity(input.current);
  const competitorBundle=input.competitorBundle??null;
  if(competitorBundle) assertCompetitorBasis(input.current,competitorBundle);
  const supplemental=(input.supplementalEvidence??[]).map(
    signal=>normalizeSupplemental(signal,input.current),
  );

  const opportunities:AuthorityOpportunity[]=[];

  if(competitorBundle){
    for(const gap of competitorBundle.gapCandidates){
      if(gap.ownedPresent||gap.competitorPresenceCount<1) continue;
      const competitorDomains=gap.competitors.filter(x=>x.present).map(x=>x.targetDomain);
      const evidence=hash({
        purpose:"ugp_authority_competitor_gap_evidence",
        bundleFingerprint:competitorBundle.bundleFingerprint,
        referringDomain:gap.referringDomain,
        competitorDomains,
      });
      opportunities.push(opportunity({
        kind:"competitor_link_gap",
        sourceDomain:gap.referringDomain,
        sourceUrl:null,
        targetUrl:null,
        competitorDomains,
        observedAt:competitorBundle.observedAt,
        providerAuthority:gap.authority,
        evidenceFingerprints:[evidence],
        rationaleCode:"competitor_links_without_owned_link",
      }));
      if(gap.competitorPresenceCount>=2){
        opportunities.push(opportunity({
          kind:"domain_intersection",
          sourceDomain:gap.referringDomain,
          sourceUrl:null,
          targetUrl:null,
          competitorDomains,
          observedAt:competitorBundle.observedAt,
          providerAuthority:gap.authority,
          evidenceFingerprints:[evidence],
          rationaleCode:"multiple_competitors_share_referring_domain",
        }));
      }
    }
  }

  for(const row of input.current.backlinks){
    if(row.state!=="lost"||row.lostAt===null) continue;
    opportunities.push(opportunity({
      kind:"lost_link_recovery",
      sourceDomain:row.sourceDomain,
      sourceUrl:row.sourceUrl,
      targetUrl:row.targetUrl,
      competitorDomains:[],
      observedAt:row.lostAt,
      providerAuthority:row.providerAuthority,
      evidenceFingerprints:[row.backlinkFingerprint],
      rationaleCode:"normalized_lost_backlink",
    }));
  }

  for(const signal of supplemental){
    opportunities.push(opportunity({
      kind:signal.kind,
      sourceDomain:signal.sourceDomain,
      sourceUrl:signal.sourceUrl,
      targetUrl:signal.targetUrl,
      competitorDomains:[],
      observedAt:signal.observedAt,
      providerAuthority:null,
      evidenceFingerprints:[signal.evidenceFingerprint],
      rationaleCode:rationale(signal.kind),
    }));
  }

  const sorted=Object.freeze(opportunities.sort(
    (a,b)=>a.kind.localeCompare(b.kind)
      ||a.sourceDomain.localeCompare(b.sourceDomain)
      ||(a.targetUrl??"").localeCompare(b.targetUrl??"")
      ||a.opportunityFingerprint.localeCompare(b.opportunityFingerprint),
  ));
  const seen=new Set<string>();
  for(const row of sorted){
    if(seen.has(row.opportunityFingerprint)) throw new Error("ugp_authority_opportunity_duplicate");
    seen.add(row.opportunityFingerprint);
  }
  const byKind=Object.fromEntries(KINDS.map(kind=>[
    kind,
    sorted.filter(row=>row.kind===kind).length,
  ])) as Record<AuthorityOpportunityKind,number>;
  const summary=Object.freeze({...byKind,total:sorted.length});
  const limitations=Object.freeze([
    ...(competitorBundle?[]:["authority_opportunity_competitor_bundle_not_supplied"]),
    ...(supplemental.length?[]:["authority_opportunity_supplemental_evidence_not_supplied"]),
    "authority_opportunity_discovery_is_not_prospect_qualification",
    "authority_opportunity_discovery_does_not_authorize_outreach",
  ]);
  const base={
    version:UGP_AUTHORITY_OPPORTUNITY_DISCOVERY_VERSION,
    targetDomain:input.current.targetDomain,
    currentDatasetFingerprint:input.current.datasetFingerprint,
    competitorBundleFingerprint:competitorBundle?.bundleFingerprint??null,
    opportunities:sorted,
    summary,
    limitations,
    semantics:SEMANTICS,
  };
  return Object.freeze({
    ...base,
    discoveryFingerprint:hash({purpose:"ugp_authority_opportunity_discovery",...base}),
  });
}

export function assertAuthorityOpportunityDiscoveryIntegrity(
  result:AuthorityOpportunityDiscovery,
):void{
  if(!result||result.version!==UGP_AUTHORITY_OPPORTUNITY_DISCOVERY_VERSION){
    throw new Error("ugp_authority_opportunity_version_invalid");
  }
  canonicalDomain(result.targetDomain);
  fingerprint(result.currentDatasetFingerprint,"current_dataset_fingerprint");
  if(result.competitorBundleFingerprint!==null){
    fingerprint(result.competitorBundleFingerprint,"competitor_bundle_fingerprint");
  }
  const s=result.semantics;
  if(
    s.deterministic!==true||s.evidenceBackedOnly!==true||s.discoveryOnly!==true
    ||s.scoringPerformed!==false||s.prospectQualificationPerformed!==false
    ||s.contactDiscoveryPerformed!==false||s.outreachAuthorized!==false
    ||s.liveAcquisitionAuthorized!==false||s.performsNetworkOperation!==false
    ||s.performsPersistence!==false||s.schedulerEnabled!==false
    ||s.providerWrites!==false||s.publicSiteWrites!==false
  ) throw new Error("ugp_authority_opportunity_unsafe_semantics");

  for(const row of result.opportunities){
    if(!KINDS.includes(row.kind)) throw new Error("ugp_authority_opportunity_kind_invalid");
    canonicalDomain(row.sourceDomain);
    if(row.sourceUrl!==null) canonicalUrl(row.sourceUrl);
    if(row.targetUrl!==null){
      const target=canonicalUrl(row.targetUrl);
      if(new URL(target).hostname!==result.targetDomain){
        throw new Error("ugp_authority_opportunity_target_domain_url_mismatch");
      }
    }
    timestamp(row.observedAt);
    row.evidenceFingerprints.forEach(value=>fingerprint(value,"evidence_fingerprint"));
    const expected=opportunity({
      kind:row.kind,
      sourceDomain:row.sourceDomain,
      sourceUrl:row.sourceUrl,
      targetUrl:row.targetUrl,
      competitorDomains:row.competitorDomains.map(canonicalDomain),
      observedAt:row.observedAt,
      providerAuthority:row.providerAuthority,
      evidenceFingerprints:row.evidenceFingerprints,
      rationaleCode:row.rationaleCode,
    });
    if(expected.opportunityFingerprint!==row.opportunityFingerprint
      ||expected.opportunityId!==row.opportunityId){
      throw new Error("ugp_authority_opportunity_fingerprint_mismatch");
    }
  }
  const summary=Object.freeze({
    ...Object.fromEntries(KINDS.map(kind=>[
      kind,
      result.opportunities.filter(row=>row.kind===kind).length,
    ])),
    total:result.opportunities.length,
  });
  if(stableJson(summary)!==stableJson(result.summary)){
    throw new Error("ugp_authority_opportunity_summary_mismatch");
  }
  const base={
    version:result.version,
    targetDomain:result.targetDomain,
    currentDatasetFingerprint:result.currentDatasetFingerprint,
    competitorBundleFingerprint:result.competitorBundleFingerprint,
    opportunities:result.opportunities,
    summary:result.summary,
    limitations:result.limitations,
    semantics:result.semantics,
  };
  if(hash({purpose:"ugp_authority_opportunity_discovery",...base})!==result.discoveryFingerprint){
    throw new Error("ugp_authority_opportunity_discovery_fingerprint_mismatch");
  }
}
