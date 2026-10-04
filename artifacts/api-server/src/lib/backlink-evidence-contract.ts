import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { domainToASCII } from "node:url";

export const UGP_BACKLINK_EVIDENCE_VERSION =
  "ugp-9-1a-provider-neutral-backlink-evidence-v1" as const;

export type BacklinkLinkState = "active" | "lost" | "unknown";
export type BacklinkFollowState = "follow" | "nofollow" | "unknown";
export type BacklinkRelAttribute = "nofollow" | "sponsored" | "ugc";

export type ProviderMetricValue = Readonly<{
  key: string;
  value: number;
  unit: string | null;
}>;

export type ProviderAuthorityMetricDefinition = Readonly<{
  key: string;
  min: number;
  max: number;
  crossProviderComparable: false;
}>;

export type BacklinkEvidenceSource = Readonly<{
  providerKey: string;
  providerDataset: string;
  sourceFingerprint: string;
  requestFingerprint: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  observedAt: string;
  authorityMetric: ProviderAuthorityMetricDefinition | null;
  responseFingerprint: string;
}>;

export type BacklinkEvidenceInput = Readonly<{
  sourceUrl: string;
  sourceDomain: string;
  targetUrl: string;
  anchorText: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  lostAt: string | null;
  state: BacklinkLinkState;
  followState: BacklinkFollowState;
  rel: readonly BacklinkRelAttribute[];
  providerAuthority: number | null;
  providerMetrics: readonly ProviderMetricValue[];
}>;

export type BacklinkEvidence = Readonly<{
  backlinkId: string;
  backlinkFingerprint: string;
  sourceUrl: string;
  sourceDomain: string;
  targetUrl: string;
  anchorText: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  lostAt: string | null;
  state: BacklinkLinkState;
  followState: BacklinkFollowState;
  rel: readonly BacklinkRelAttribute[];
  providerAuthority: number | null;
  providerMetrics: readonly ProviderMetricValue[];
}>;

export type ReferringDomainEvidence = Readonly<{
  domain: string;
  backlinkCount: number;
  activeBacklinkCount: number;
  lostBacklinkCount: number;
  targetUrls: readonly string[];
  anchorTexts: readonly string[];
  followStates: readonly BacklinkFollowState[];
  rel: readonly BacklinkRelAttribute[];
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  providerAuthority: number | null;
  providerMetrics: readonly ProviderMetricValue[];
  referringDomainFingerprint: string;
}>;

export type BacklinkEvidenceDataset = Readonly<{
  version: typeof UGP_BACKLINK_EVIDENCE_VERSION;
  targetDomain: string;
  source: BacklinkEvidenceSource;
  backlinks: readonly BacklinkEvidence[];
  referringDomains: readonly ReferringDomainEvidence[];
  summary: Readonly<{
    backlinkCount: number;
    activeBacklinkCount: number;
    lostBacklinkCount: number;
    referringDomainCount: number;
    activeReferringDomainCount: number;
    lostOnlyReferringDomainCount: number;
    dofollowBacklinkCount: number;
    nofollowBacklinkCount: number;
    sponsoredBacklinkCount: number;
    ugcBacklinkCount: number;
  }>;
  semantics: Readonly<{
    deterministic: true;
    providerNeutral: true;
    providerMetricsPreserved: true;
    crossProviderAuthorityComparable: false;
    readOnly: true;
    grantsAuthorization: false;
    outreachAuthorized: false;
    providerEnrollmentAuthorized: false;
    credentialUseAuthorized: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    databaseWrites: false;
    schedulerEnabled: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  datasetFingerprint: string;
}>;

const HEX64=/^[0-9a-f]{64}$/;
const KEY=/^[a-z0-9][a-z0-9._:-]{0,95}$/;
const HOST_LABEL=/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const REL_ORDER:readonly BacklinkRelAttribute[]=["nofollow","sponsored","ugc"];

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  providerNeutral:true as const,
  providerMetricsPreserved:true as const,
  crossProviderAuthorityComparable:false as const,
  readOnly:true as const,
  grantsAuthorization:false as const,
  outreachAuthorized:false as const,
  providerEnrollmentAuthorized:false as const,
  credentialUseAuthorized:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  databaseWrites:false as const,
  schedulerEnabled:false as const,
  providerWrites:false as const,
  publicSiteWrites:false as const,
});

function hash(value:unknown):string{
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function text(value:unknown,field:string,max:number):string{
  if(typeof value!=="string") throw new Error("ugp_backlink_invalid_"+field);
  const normalized=value.normalize("NFKC").trim().replace(/\s+/g," ");
  if(!normalized||normalized.length>max||/[\u0000-\u001f\u007f]/.test(normalized)){
    throw new Error("ugp_backlink_invalid_"+field);
  }
  return normalized;
}
function fp(value:unknown,field:string):string{
  if(typeof value!=="string"||!HEX64.test(value)) throw new Error("ugp_backlink_invalid_"+field);
  return value;
}
function timestamp(value:unknown,field:string):string{
  const raw=text(value,field,64);
  const ms=Date.parse(raw);
  if(!Number.isFinite(ms)) throw new Error("ugp_backlink_invalid_"+field);
  return new Date(ms).toISOString();
}
function nullableTimestamp(value:unknown,field:string):string|null{
  return value===null?null:timestamp(value,field);
}
function canonicalDomain(value:unknown):string{
  const raw=text(value,"domain",2048).toLowerCase().replace(/\.$/,"");
  if(/[\s\/@?#:]/.test(raw)) throw new Error("ugp_backlink_invalid_domain");
  const ascii=domainToASCII(raw);
  if(!ascii||ascii.length>253||ascii==="localhost"||isIP(ascii)!==0||!ascii.includes(".")){
    throw new Error("ugp_backlink_invalid_domain");
  }
  if(ascii.split(".").some(label=>!HOST_LABEL.test(label))) throw new Error("ugp_backlink_invalid_domain");
  return ascii;
}
function canonicalUrl(value:unknown):string{
  const raw=text(value,"url",4096);
  let parsed:URL;
  try{ parsed=new URL(raw); }catch{ throw new Error("ugp_backlink_invalid_url"); }
  if(parsed.protocol!=="http:"&&parsed.protocol!=="https:") throw new Error("ugp_backlink_invalid_url");
  if(parsed.username||parsed.password) throw new Error("ugp_backlink_invalid_url");
  parsed.hostname=canonicalDomain(parsed.hostname);
  parsed.hash="";
  const params=[...parsed.searchParams.entries()].sort(
    ([ak,av],[bk,bv])=>ak.localeCompare(bk)||av.localeCompare(bv),
  );
  parsed.search="";
  for(const [key,value] of params) parsed.searchParams.append(key,value);
  return parsed.toString();
}
function optionalAnchor(value:unknown):string|null{
  if(value===null) return null;
  return text(value,"anchor_text",1024);
}
function providerMetric(value:ProviderMetricValue):ProviderMetricValue{
  const key=text(value.key,"provider_metric_key",96).toLowerCase();
  if(!KEY.test(key)) throw new Error("ugp_backlink_invalid_provider_metric_key");
  if(typeof value.value!=="number"||!Number.isFinite(value.value)){
    throw new Error("ugp_backlink_invalid_provider_metric_value");
  }
  const unit=value.unit===null?null:text(value.unit,"provider_metric_unit",64);
  return Object.freeze({key,value:value.value,unit});
}
function normalizeMetrics(values:readonly ProviderMetricValue[]):readonly ProviderMetricValue[]{
  if(!Array.isArray(values)||values.length>128) throw new Error("ugp_backlink_invalid_provider_metrics");
  const normalized=values.map(providerMetric).sort((a,b)=>a.key.localeCompare(b.key));
  const keys=new Set<string>();
  for(const metric of normalized){
    if(keys.has(metric.key)) throw new Error("ugp_backlink_duplicate_provider_metric");
    keys.add(metric.key);
  }
  return Object.freeze(normalized);
}
function normalizeRel(values:readonly BacklinkRelAttribute[]):readonly BacklinkRelAttribute[]{
  if(!Array.isArray(values)) throw new Error("ugp_backlink_invalid_rel");
  const allowed=new Set(REL_ORDER);
  for(const value of values){
    if(!allowed.has(value)) throw new Error("ugp_backlink_invalid_rel");
  }
  return Object.freeze(REL_ORDER.filter(value=>values.includes(value)));
}
function normalizeSource(input:BacklinkEvidenceSource):BacklinkEvidenceSource{
  const providerKey=text(input.providerKey,"provider_key",96).toLowerCase();
  const providerDataset=text(input.providerDataset,"provider_dataset",160).toLowerCase();
  if(!KEY.test(providerKey)||!KEY.test(providerDataset)){
    throw new Error("ugp_backlink_invalid_provider_identity");
  }
  const authorityMetric=input.authorityMetric===null?null:Object.freeze({
    key:text(input.authorityMetric.key,"authority_metric_key",96).toLowerCase(),
    min:input.authorityMetric.min,
    max:input.authorityMetric.max,
    crossProviderComparable:false as const,
  });
  if(authorityMetric){
    if(!KEY.test(authorityMetric.key)
      ||typeof authorityMetric.min!=="number"||!Number.isFinite(authorityMetric.min)
      ||typeof authorityMetric.max!=="number"||!Number.isFinite(authorityMetric.max)
      ||authorityMetric.min>=authorityMetric.max
      ||input.authorityMetric?.crossProviderComparable!==false){
      throw new Error("ugp_backlink_invalid_authority_metric");
    }
  }
  return Object.freeze({
    providerKey,
    providerDataset,
    sourceFingerprint:fp(input.sourceFingerprint,"source_fingerprint"),
    requestFingerprint:fp(input.requestFingerprint,"request_fingerprint"),
    marketFingerprint:fp(input.marketFingerprint,"market_fingerprint"),
    categoryFingerprint:fp(input.categoryFingerprint,"category_fingerprint"),
    observedAt:timestamp(input.observedAt,"observed_at"),
    authorityMetric,
    responseFingerprint:fp(input.responseFingerprint,"response_fingerprint"),
  });
}
function authority(value:unknown,source:BacklinkEvidenceSource):number|null{
  if(value===null) return null;
  if(!source.authorityMetric) throw new Error("ugp_backlink_authority_without_metric_definition");
  if(typeof value!=="number"||!Number.isFinite(value)
    ||value<source.authorityMetric.min||value>source.authorityMetric.max){
    throw new Error("ugp_backlink_invalid_provider_authority");
  }
  return value;
}

function normalizeBacklink(
  input:BacklinkEvidenceInput,
  targetDomain:string,
  source:BacklinkEvidenceSource,
):BacklinkEvidence{
  const sourceUrl=canonicalUrl(input.sourceUrl);
  const sourceDomain=canonicalDomain(input.sourceDomain);
  if(new URL(sourceUrl).hostname!==sourceDomain){
    throw new Error("ugp_backlink_source_domain_url_mismatch");
  }
  const targetUrl=canonicalUrl(input.targetUrl);
  if(new URL(targetUrl).hostname!==targetDomain){
    throw new Error("ugp_backlink_target_domain_url_mismatch");
  }
  const firstSeenAt=nullableTimestamp(input.firstSeenAt,"first_seen_at");
  const lastSeenAt=nullableTimestamp(input.lastSeenAt,"last_seen_at");
  const lostAt=nullableTimestamp(input.lostAt,"lost_at");
  for(const [value,code] of [
    [firstSeenAt,"first_seen_after_observation"],
    [lastSeenAt,"last_seen_after_observation"],
    [lostAt,"lost_after_observation"],
  ] as const){
    if(value!==null&&Date.parse(value)>Date.parse(source.observedAt)){
      throw new Error("ugp_backlink_"+code);
    }
  }
  if(firstSeenAt&&lastSeenAt&&Date.parse(firstSeenAt)>Date.parse(lastSeenAt)){
    throw new Error("ugp_backlink_first_seen_after_last_seen");
  }
  if(firstSeenAt&&lostAt&&Date.parse(firstSeenAt)>Date.parse(lostAt)){
    throw new Error("ugp_backlink_first_seen_after_lost");
  }
  if(input.state!=="active"&&input.state!=="lost"&&input.state!=="unknown"){
    throw new Error("ugp_backlink_invalid_state");
  }
  if(input.followState!=="follow"&&input.followState!=="nofollow"&&input.followState!=="unknown"){
    throw new Error("ugp_backlink_invalid_follow_state");
  }
  if(input.state==="lost"&&lostAt===null){
    throw new Error("ugp_backlink_lost_state_requires_lost_at");
  }
  if(input.state==="active"&&lostAt!==null){
    throw new Error("ugp_backlink_active_state_forbids_lost_at");
  }
  const rel=normalizeRel(input.rel);
  if(input.followState==="follow"&&rel.includes("nofollow")){
    throw new Error("ugp_backlink_follow_rel_contradiction");
  }
  if(input.followState==="nofollow"&&!rel.includes("nofollow")){
    throw new Error("ugp_backlink_nofollow_rel_required");
  }
  const providerMetrics=normalizeMetrics(input.providerMetrics);
  const identity={
    sourceUrl,
    sourceDomain,
    targetUrl,
    anchorText:optionalAnchor(input.anchorText),
    firstSeenAt,
    lastSeenAt,
    lostAt,
    state:input.state,
    followState:input.followState,
    rel,
    providerAuthority:authority(input.providerAuthority,source),
    providerMetrics,
  };
  const backlinkFingerprint=hash({
    purpose:"ugp_backlink_evidence",
    version:UGP_BACKLINK_EVIDENCE_VERSION,
    sourceFingerprint:source.sourceFingerprint,
    requestFingerprint:source.requestFingerprint,
    ...identity,
  });
  return Object.freeze({
    backlinkId:"ubl-"+backlinkFingerprint.slice(0,24),
    backlinkFingerprint,
    ...identity,
  });
}

function aggregateMetrics(rows:readonly BacklinkEvidence[]):readonly ProviderMetricValue[]{
  const byKey=new Map<string,{unit:string|null;values:number[]}>();
  for(const row of rows){
    for(const metric of row.providerMetrics){
      const existing=byKey.get(metric.key);
      if(existing&&existing.unit!==metric.unit){
        throw new Error("ugp_backlink_provider_metric_unit_conflict");
      }
      if(existing) existing.values.push(metric.value);
      else byKey.set(metric.key,{unit:metric.unit,values:[metric.value]});
    }
  }
  return Object.freeze(
    [...byKey.entries()]
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([key,value])=>Object.freeze({
        key,
        value:Math.max(...value.values),
        unit:value.unit,
      })),
  );
}

function aggregateDomains(backlinks:readonly BacklinkEvidence[]):readonly ReferringDomainEvidence[]{
  const byDomain=new Map<string,BacklinkEvidence[]>();
  for(const row of backlinks){
    const existing=byDomain.get(row.sourceDomain)??[];
    byDomain.set(row.sourceDomain,[...existing,row]);
  }
  return Object.freeze(
    [...byDomain.entries()]
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([domain,rows])=>{
        const authorityValues=[...new Set(rows.map(row=>row.providerAuthority).filter(
          (value):value is number=>value!==null,
        ))];
        if(authorityValues.length>1){
          throw new Error("ugp_backlink_conflicting_referring_domain_authority");
        }
        const firstDates=rows.map(row=>row.firstSeenAt).filter((x):x is string=>x!==null).sort();
        const lastDates=rows.map(row=>row.lastSeenAt).filter((x):x is string=>x!==null).sort();
        const base={
          domain,
          backlinkCount:rows.length,
          activeBacklinkCount:rows.filter(row=>row.state==="active").length,
          lostBacklinkCount:rows.filter(row=>row.state==="lost").length,
          targetUrls:Object.freeze([...new Set(rows.map(row=>row.targetUrl))].sort()),
          anchorTexts:Object.freeze([...new Set(rows.map(row=>row.anchorText).filter(
            (x):x is string=>x!==null,
          ))].sort()),
          followStates:Object.freeze([...new Set(rows.map(row=>row.followState))].sort()),
          rel:Object.freeze(REL_ORDER.filter(value=>rows.some(row=>row.rel.includes(value)))),
          firstSeenAt:firstDates.length?firstDates[0]!:null,
          lastSeenAt:lastDates.length?lastDates[lastDates.length-1]!:null,
          providerAuthority:authorityValues.length?authorityValues[0]!:null,
          providerMetrics:aggregateMetrics(rows),
        };
        return Object.freeze({
          ...base,
          referringDomainFingerprint:hash({
            purpose:"ugp_referring_domain_evidence",
            version:UGP_BACKLINK_EVIDENCE_VERSION,
            ...base,
          }),
        });
      }),
  );
}

export function buildBacklinkEvidenceDataset(input:{
  targetDomain:string;
  source:BacklinkEvidenceSource;
  backlinks:readonly BacklinkEvidenceInput[];
}):BacklinkEvidenceDataset{
  const targetDomain=canonicalDomain(input.targetDomain);
  const source=normalizeSource(input.source);
  if(!Array.isArray(input.backlinks)||input.backlinks.length>10000){
    throw new Error("ugp_backlink_invalid_backlinks");
  }
  const backlinks=Object.freeze(
    input.backlinks
      .map(row=>normalizeBacklink(row,targetDomain,source))
      .sort((a,b)=>a.sourceDomain.localeCompare(b.sourceDomain)
        ||a.sourceUrl.localeCompare(b.sourceUrl)
        ||a.targetUrl.localeCompare(b.targetUrl)
        ||(a.anchorText??"").localeCompare(b.anchorText??"")
        ||a.backlinkFingerprint.localeCompare(b.backlinkFingerprint)),
  );
  const ids=new Set<string>();
  for(const row of backlinks){
    if(ids.has(row.backlinkFingerprint)){
      throw new Error("ugp_backlink_duplicate_evidence");
    }
    ids.add(row.backlinkFingerprint);
  }
  const referringDomains=aggregateDomains(backlinks);
  const summary=Object.freeze({
    backlinkCount:backlinks.length,
    activeBacklinkCount:backlinks.filter(row=>row.state==="active").length,
    lostBacklinkCount:backlinks.filter(row=>row.state==="lost").length,
    referringDomainCount:referringDomains.length,
    activeReferringDomainCount:referringDomains.filter(row=>row.activeBacklinkCount>0).length,
    lostOnlyReferringDomainCount:referringDomains.filter(
      row=>row.activeBacklinkCount===0&&row.lostBacklinkCount>0,
    ).length,
    dofollowBacklinkCount:backlinks.filter(row=>row.followState==="follow").length,
    nofollowBacklinkCount:backlinks.filter(row=>row.followState==="nofollow").length,
    sponsoredBacklinkCount:backlinks.filter(row=>row.rel.includes("sponsored")).length,
    ugcBacklinkCount:backlinks.filter(row=>row.rel.includes("ugc")).length,
  });
  const base={
    version:UGP_BACKLINK_EVIDENCE_VERSION,
    targetDomain,
    source,
    backlinks,
    referringDomains,
    summary,
    semantics:SEMANTICS,
  };
  return Object.freeze({
    ...base,
    datasetFingerprint:hash({
      purpose:"ugp_backlink_evidence_dataset",
      ...base,
    }),
  });
}

export function assertBacklinkEvidenceDatasetIntegrity(
  result:BacklinkEvidenceDataset,
):void{
  if(!result||result.version!==UGP_BACKLINK_EVIDENCE_VERSION){
    throw new Error("ugp_backlink_version_invalid");
  }
  canonicalDomain(result.targetDomain);
  normalizeSource(result.source);
  const s=result.semantics;
  if(
    s.deterministic!==true||s.providerNeutral!==true
    ||s.providerMetricsPreserved!==true||s.crossProviderAuthorityComparable!==false
    ||s.readOnly!==true||s.grantsAuthorization!==false
    ||s.outreachAuthorized!==false||s.providerEnrollmentAuthorized!==false
    ||s.credentialUseAuthorized!==false||s.performsNetworkOperation!==false
    ||s.performsPersistence!==false||s.databaseWrites!==false
    ||s.schedulerEnabled!==false||s.providerWrites!==false
    ||s.publicSiteWrites!==false
  ) throw new Error("ugp_backlink_unsafe_semantics");

  const rebuilt=buildBacklinkEvidenceDataset({
    targetDomain:result.targetDomain,
    source:result.source,
    backlinks:result.backlinks.map(row=>({
      sourceUrl:row.sourceUrl,
      sourceDomain:row.sourceDomain,
      targetUrl:row.targetUrl,
      anchorText:row.anchorText,
      firstSeenAt:row.firstSeenAt,
      lastSeenAt:row.lastSeenAt,
      lostAt:row.lostAt,
      state:row.state,
      followState:row.followState,
      rel:row.rel,
      providerAuthority:row.providerAuthority,
      providerMetrics:row.providerMetrics,
    })),
  });
  if(rebuilt.datasetFingerprint!==fp(result.datasetFingerprint,"dataset_fingerprint")){
    throw new Error("ugp_backlink_dataset_fingerprint_mismatch");
  }
}
