import { createHash } from "node:crypto";
import {
  assertBacklinkEvidenceDatasetIntegrity,
  buildBacklinkEvidenceDataset,
  type BacklinkEvidenceDataset,
  type BacklinkEvidenceInput,
  type BacklinkRelAttribute,
  type ProviderMetricValue,
} from "./backlink-evidence-contract.js";

export const UGP_DATAFORSEO_BACKLINK_ADAPTER_VERSION =
  "ugp-9-1b-dataforseo-backlink-response-adapter-v1" as const;

export const UGP_DATAFORSEO_BACKLINK_DATASET =
  "backlinks.backlinks.live" as const;

export type DataForSeoBacklinkRankScale = "one_hundred" | "one_thousand";

export type DataForSeoBacklinkAdapterResult = Readonly<{
  version: typeof UGP_DATAFORSEO_BACKLINK_ADAPTER_VERSION;
  providerKey: "dataforseo";
  providerDataset: typeof UGP_DATAFORSEO_BACKLINK_DATASET;
  providerStatusCode: number;
  providerTaskStatusCode: number;
  providerTaskId: string | null;
  providerPath: string | null;
  rankScale: DataForSeoBacklinkRankScale;
  dataset: BacklinkEvidenceDataset;
  limitations: readonly string[];
  semantics: Readonly<{
    deterministic: true;
    capturedResponseNormalizationOnly: true;
    providerSpecificMapping: true;
    providerAuthorityNotUniversal: true;
    liveTransportAuthorized: false;
    providerEnrollmentAuthorized: false;
    credentialUseAuthorized: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    schedulerEnabled: false;
    outreachAuthorized: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  adapterFingerprint: string;
}>;

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  capturedResponseNormalizationOnly:true as const,
  providerSpecificMapping:true as const,
  providerAuthorityNotUniversal:true as const,
  liveTransportAuthorized:false as const,
  providerEnrollmentAuthorized:false as const,
  credentialUseAuthorized:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  schedulerEnabled:false as const,
  outreachAuthorized:false as const,
  providerWrites:false as const,
  publicSiteWrites:false as const,
});

function stableJson(value:unknown):string{
  if(value===undefined) return "null";
  if(value===null||typeof value!=="object") return JSON.stringify(value);
  if(Array.isArray(value)) return "["+value.map(stableJson).join(",")+"]";
  const object=value as Record<string,unknown>;
  return "{"+Object.keys(object).sort((a,b)=>a.localeCompare(b))
    .map(key=>JSON.stringify(key)+":"+stableJson(object[key])).join(",")+"}";
}
function hash(value:unknown):string{
  return createHash("sha256").update(stableJson(value)).digest("hex");
}
function object(value:unknown,field:string):Record<string,unknown>{
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new Error("ugp_dataforseo_backlink_invalid_"+field);
  }
  return value as Record<string,unknown>;
}
function integer(value:unknown,min:number,max:number,field:string):number{
  if(typeof value!=="number"||!Number.isSafeInteger(value)||value<min||value>max){
    throw new Error("ugp_dataforseo_backlink_invalid_"+field);
  }
  return value;
}
function nullableInteger(value:unknown,min:number,max:number,field:string):number|null{
  return value===null||value===undefined?null:integer(value,min,max,field);
}
function stringValue(value:unknown,field:string,max=4096):string{
  if(typeof value!=="string"){
    throw new Error("ugp_dataforseo_backlink_invalid_"+field);
  }
  const normalized=value.normalize("NFKC").trim();
  if(!normalized||normalized.length>max||/[\u0000-\u001f\u007f]/.test(normalized)){
    throw new Error("ugp_dataforseo_backlink_invalid_"+field);
  }
  return normalized;
}
function optionalString(value:unknown,field:string,max=4096):string|null{
  return value===null||value===undefined?null:stringValue(value,field,max);
}
function fingerprint(value:unknown,field:string):string{
  if(typeof value!=="string"||!/^[0-9a-f]{64}$/.test(value)){
    throw new Error("ugp_dataforseo_backlink_invalid_"+field);
  }
  return value;
}
function canonicalObservedAt(value:unknown):string{
  const raw=stringValue(value,"observed_at",64);
  const ms=Date.parse(raw);
  if(!Number.isFinite(ms)) throw new Error("ugp_dataforseo_backlink_invalid_observed_at");
  return new Date(ms).toISOString();
}
function providerTimestamp(value:unknown,field:string):string|null{
  if(value===null||value===undefined) return null;
  const raw=stringValue(value,field,64);
  const normalized=/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \+00:00$/.test(raw)
    ?raw.slice(0,10)+"T"+raw.slice(11,19)+"Z"
    :raw;
  const ms=Date.parse(normalized);
  if(!Number.isFinite(ms)) throw new Error("ugp_dataforseo_backlink_invalid_"+field);
  return new Date(ms).toISOString();
}
function booleanValue(value:unknown,field:string):boolean{
  if(typeof value!=="boolean") throw new Error("ugp_dataforseo_backlink_invalid_"+field);
  return value;
}
function metric(key:string,value:number|null,unit:string|null):ProviderMetricValue[]{
  return value===null?[]:[Object.freeze({key,value,unit})];
}
function boolMetric(key:string,value:boolean):ProviderMetricValue{
  return Object.freeze({key,value:value?1:0,unit:"boolean"});
}
function providerPath(value:unknown):string|null{
  if(value===null||value===undefined) return null;
  if(typeof value==="string") return value.replace(/^\/+|\/+$/g,"");
  if(Array.isArray(value)&&value.every(part=>typeof part==="string")){
    return (value as string[]).join("/");
  }
  throw new Error("ugp_dataforseo_backlink_invalid_provider_path");
}
function exactRank(value:unknown,scale:DataForSeoBacklinkRankScale,field:string):number|null{
  return nullableInteger(value,0,scale==="one_hundred"?100:1000,field);
}
function relAttributes(value:unknown,dofollow:boolean):readonly BacklinkRelAttribute[]{
  const raw=value===null||value===undefined?[]:value;
  if(!Array.isArray(raw)||raw.some(item=>typeof item!=="string")){
    throw new Error("ugp_dataforseo_backlink_invalid_attributes");
  }
  const normalized=(raw as string[]).map(item=>item.toLowerCase());
  const supported:BacklinkRelAttribute[]=[];
  for(const rel of ["nofollow","sponsored","ugc"] as const){
    if(normalized.includes(rel)) supported.push(rel);
  }
  if(dofollow&&supported.includes("nofollow")){
    throw new Error("ugp_dataforseo_backlink_dofollow_attribute_contradiction");
  }
  if(!dofollow&&!supported.includes("nofollow")) supported.unshift("nofollow");
  return Object.freeze(supported);
}

function parseItem(input:{
  value:unknown;
  rankScale:DataForSeoBacklinkRankScale;
  limitations:Set<string>;
}):BacklinkEvidenceInput{
  const row=object(input.value,"item");
  if(row.type!=="backlink") throw new Error("ugp_dataforseo_backlink_item_type_required");

  const dofollow=booleanValue(row.dofollow,"dofollow");
  const isLost=booleanValue(row.is_lost,"is_lost");
  const isNew=booleanValue(row.is_new,"is_new");
  const isBroken=booleanValue(row.is_broken,"is_broken");
  const original=booleanValue(row.original,"original");
  const isIndirect=row.is_indirect_link===undefined
    ?false
    :booleanValue(row.is_indirect_link,"is_indirect_link");

  const attributes=row.attributes===null||row.attributes===undefined?[]:row.attributes;
  if(Array.isArray(attributes)){
    const unsupported=(attributes as unknown[]).filter(
      value=>typeof value==="string"&&!["nofollow","sponsored","ugc"].includes(value.toLowerCase()),
    );
    if(unsupported.length>0){
      input.limitations.add("dataforseo_noncanonical_rel_attributes_not_projected");
    }
  }

  if(isLost){
    input.limitations.add("dataforseo_is_lost_has_no_exact_loss_timestamp_in_backlinks_live");
  }

  const providerMetrics:ProviderMetricValue[]=[
    ...metric("backlink_rank",exactRank(row.rank,input.rankScale,"rank"),"provider_scale"),
    ...metric("page_from_rank",exactRank(row.page_from_rank,input.rankScale,"page_from_rank"),"provider_scale"),
    ...metric("domain_from_rank",exactRank(row.domain_from_rank,input.rankScale,"domain_from_rank"),"provider_scale"),
    ...metric("backlink_spam_score",nullableInteger(row.backlink_spam_score,0,100,"backlink_spam_score"),"provider_scale"),
    ...metric("page_from_status_code",nullableInteger(row.page_from_status_code,100,599,"page_from_status_code"),"http_status"),
    ...metric("url_to_status_code",nullableInteger(row.url_to_status_code,100,599,"url_to_status_code"),"http_status"),
    ...metric("url_to_spam_score",nullableInteger(row.url_to_spam_score,0,100,"url_to_spam_score"),"provider_scale"),
    ...metric("links_count",nullableInteger(row.links_count,0,1_000_000_000,"links_count"),"count"),
    ...metric("group_count",nullableInteger(row.group_count,0,1_000_000_000,"group_count"),"count"),
    boolMetric("is_new",isNew),
    boolMetric("is_lost",isLost),
    boolMetric("is_broken",isBroken),
    boolMetric("original",original),
    boolMetric("is_indirect_link",isIndirect),
  ];

  return Object.freeze({
    sourceUrl:stringValue(row.url_from,"url_from"),
    sourceDomain:stringValue(row.domain_from,"domain_from",2048),
    targetUrl:stringValue(row.url_to,"url_to"),
    anchorText:optionalString(row.anchor,"anchor",1024),
    firstSeenAt:providerTimestamp(row.first_seen,"first_seen"),
    lastSeenAt:providerTimestamp(row.last_seen,"last_seen"),
    lostAt:null,
    state:isLost?"unknown":"active",
    followState:dofollow?"follow":"nofollow",
    rel:relAttributes(row.attributes,dofollow),
    providerAuthority:exactRank(row.domain_from_rank,input.rankScale,"domain_from_rank"),
    providerMetrics:Object.freeze(providerMetrics),
  });
}

export function normalizeCapturedDataForSeoBacklinks(input:{
  targetDomain:string;
  sourceFingerprint:string;
  requestFingerprint:string;
  marketFingerprint:string;
  categoryFingerprint:string;
  observedAt:string;
  rankScale:DataForSeoBacklinkRankScale;
  provided:unknown;
}):DataForSeoBacklinkAdapterResult{
  const observedAt=canonicalObservedAt(input.observedAt);
  const sourceFingerprint=fingerprint(input.sourceFingerprint,"source_fingerprint");
  const requestFingerprint=fingerprint(input.requestFingerprint,"request_fingerprint");
  const marketFingerprint=fingerprint(input.marketFingerprint,"market_fingerprint");
  const categoryFingerprint=fingerprint(input.categoryFingerprint,"category_fingerprint");
  if(input.rankScale!=="one_hundred"&&input.rankScale!=="one_thousand"){
    throw new Error("ugp_dataforseo_backlink_invalid_rank_scale");
  }

  const envelope=object(input.provided,"response");
  const providerStatusCode=integer(envelope.status_code,0,99_999,"provider_status_code");
  if(providerStatusCode!==20_000){
    throw new Error("ugp_dataforseo_backlink_provider_status_"+providerStatusCode);
  }
  const tasksError=integer(envelope.tasks_error??0,0,1000,"tasks_error");
  if(tasksError!==0) throw new Error("ugp_dataforseo_backlink_tasks_error");
  if(!Array.isArray(envelope.tasks)||envelope.tasks.length!==1){
    throw new Error("ugp_dataforseo_backlink_exactly_one_task_required");
  }
  const task=object(envelope.tasks[0],"task");
  const providerTaskStatusCode=integer(task.status_code,0,99_999,"provider_task_status_code");
  if(providerTaskStatusCode!==20_000){
    throw new Error("ugp_dataforseo_backlink_task_status_"+providerTaskStatusCode);
  }
  if(!Array.isArray(task.result)||task.result.length!==1){
    throw new Error("ugp_dataforseo_backlink_exactly_one_result_required");
  }
  const result=object(task.result[0],"result");
  const totalCount=integer(result.total_count??0,0,1_000_000_000,"total_count");
  const itemsCount=integer(result.items_count??0,0,10_000,"items_count");
  const items=result.items??[];
  if(!Array.isArray(items)||items.length>10_000){
    throw new Error("ugp_dataforseo_backlink_items_bound_exceeded");
  }
  if(items.length!==itemsCount){
    throw new Error("ugp_dataforseo_backlink_items_count_mismatch");
  }
  if(totalCount<itemsCount){
    throw new Error("ugp_dataforseo_backlink_total_count_mismatch");
  }

  const limitations=new Set<string>();
  if(totalCount>itemsCount){
    limitations.add("dataforseo_response_is_bounded_page_not_complete_backlink_universe");
  }
  const backlinks=items.map(value=>parseItem({
    value,
    rankScale:input.rankScale,
    limitations,
  }));

  const responseFingerprint=hash(input.provided);
  const dataset=buildBacklinkEvidenceDataset({
    targetDomain:input.targetDomain,
    source:{
      providerKey:"dataforseo",
      providerDataset:UGP_DATAFORSEO_BACKLINK_DATASET,
      sourceFingerprint,
      requestFingerprint,
      marketFingerprint,
      categoryFingerprint,
      observedAt,
      authorityMetric:{
        key:"domain_from_rank",
        min:0,
        max:input.rankScale==="one_hundred"?100:1000,
        crossProviderComparable:false,
      },
      responseFingerprint,
    },
    backlinks,
  });
  assertBacklinkEvidenceDatasetIntegrity(dataset);

  const base={
    version:UGP_DATAFORSEO_BACKLINK_ADAPTER_VERSION,
    providerKey:"dataforseo" as const,
    providerDataset:UGP_DATAFORSEO_BACKLINK_DATASET,
    providerStatusCode,
    providerTaskStatusCode,
    providerTaskId:typeof task.id==="string"?task.id:null,
    providerPath:providerPath(task.path),
    rankScale:input.rankScale,
    dataset,
    limitations:Object.freeze([...limitations].sort()),
    semantics:SEMANTICS,
  };
  return Object.freeze({
    ...base,
    adapterFingerprint:hash({
      purpose:"ugp_dataforseo_backlink_adapter",
      ...base,
    }),
  });
}

export function assertDataForSeoBacklinkAdapterIntegrity(
  result:DataForSeoBacklinkAdapterResult,
):void{
  if(!result||result.version!==UGP_DATAFORSEO_BACKLINK_ADAPTER_VERSION){
    throw new Error("ugp_dataforseo_backlink_version_invalid");
  }
  if(result.providerKey!=="dataforseo"||result.providerDataset!==UGP_DATAFORSEO_BACKLINK_DATASET){
    throw new Error("ugp_dataforseo_backlink_provider_identity_invalid");
  }
  assertBacklinkEvidenceDatasetIntegrity(result.dataset);
  if(result.dataset.source.providerKey!=="dataforseo"
    ||result.dataset.source.providerDataset!==UGP_DATAFORSEO_BACKLINK_DATASET){
    throw new Error("ugp_dataforseo_backlink_dataset_provider_lineage_mismatch");
  }
  if(result.rankScale!=="one_hundred"&&result.rankScale!=="one_thousand"){
    throw new Error("ugp_dataforseo_backlink_rank_scale_invalid");
  }
  const expectedMax=result.rankScale==="one_hundred"?100:1000;
  if(result.dataset.source.authorityMetric?.key!=="domain_from_rank"
    ||result.dataset.source.authorityMetric.min!==0
    ||result.dataset.source.authorityMetric.max!==expectedMax
    ||result.dataset.source.authorityMetric.crossProviderComparable!==false){
    throw new Error("ugp_dataforseo_backlink_authority_basis_invalid");
  }
  const s=result.semantics;
  if(
    s.deterministic!==true||s.capturedResponseNormalizationOnly!==true
    ||s.providerSpecificMapping!==true||s.providerAuthorityNotUniversal!==true
    ||s.liveTransportAuthorized!==false||s.providerEnrollmentAuthorized!==false
    ||s.credentialUseAuthorized!==false||s.performsNetworkOperation!==false
    ||s.performsPersistence!==false||s.schedulerEnabled!==false
    ||s.outreachAuthorized!==false||s.providerWrites!==false
    ||s.publicSiteWrites!==false
  ) throw new Error("ugp_dataforseo_backlink_unsafe_semantics");

  const {adapterFingerprint,...base}=result;
  const expected=hash({
    purpose:"ugp_dataforseo_backlink_adapter",
    ...base,
  });
  if(adapterFingerprint!==expected){
    throw new Error("ugp_dataforseo_backlink_adapter_fingerprint_mismatch");
  }
}
