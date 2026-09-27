import { createHash } from "node:crypto";
import { assertUniversalConnectorDescriptorIntegrity, type JsonValue, type UniversalConnectorDescriptor } from "./universal-connector-contract.js";
import { findUniversalCapability } from "./universal-capability-registry.js";

export const UGP_WEBFLOW_READ_PROVIDER_VERSION = "ugp-4-6-webflow-read-provider-v1" as const;
export const WEBFLOW_API_ORIGIN = "https://api.webflow.com" as const;
export type WebflowReadResource = "pages" | "collections";
export type WebflowReadPlan = Readonly<{
  version: typeof UGP_WEBFLOW_READ_PROVIDER_VERSION;
  descriptorFingerprint: string;
  siteId: string;
  connectionId: string;
  webflowSiteId: string;
  apiOrigin: typeof WEBFLOW_API_ORIGIN;
  method: "GET";
  resource: WebflowReadResource;
  path: string;
  capability: "read.resource" | "read.content";
  requiredProviderScope: "pages:read" | "cms:read";
  maxResults: number;
  semantics: Readonly<{fixtureCertificationOnly:true;liveTransportEnabled:false;credentialMaterialAccepted:false;grantsAuthorization:false;providerWrites:false;publicSiteWrites:false}>;
  requestFingerprint: string;
}>;
export type WebflowReadReceipt = Readonly<{
  version: typeof UGP_WEBFLOW_READ_PROVIDER_VERSION;
  requestFingerprint: string;
  effectiveUrl: string;
  status: 200;
  payload: JsonValue;
  payloadBytes: number;
  stateFingerprint: string;
  receiptFingerprint: string;
}>;

const SEM=Object.freeze({fixtureCertificationOnly:true as const,liveTransportEnabled:false as const,credentialMaterialAccepted:false as const,grantsAuthorization:false as const,providerWrites:false as const,publicSiteWrites:false as const});
const OBJECT_ID=/^[0-9a-f]{24}$/;
function stable(v:unknown):string{if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";const o=v as Record<string,unknown>;return "{"+Object.keys(o).sort().map(k=>JSON.stringify(k)+":"+stable(o[k])).join(",")+"}";}
function hash(v:unknown){return createHash("sha256").update(stable(v)).digest("hex");}
function freeze<T>(v:T):T{if(v&&typeof v==="object"&&!Object.isFrozen(v)){Object.freeze(v);for(const n of Object.values(v as Record<string,unknown>))freeze(n);}return v;}
function assertJson(v:unknown,seen=new Set<object>()):asserts v is JsonValue{if(v===null||typeof v==="string"||typeof v==="boolean")return;if(typeof v==="number"){if(Number.isFinite(v))return;throw new Error("ugp_webflow_non_json_payload");}if(typeof v!=="object"||v===undefined)throw new Error("ugp_webflow_non_json_payload");if(seen.has(v))throw new Error("ugp_webflow_cyclic_payload");seen.add(v);if(Array.isArray(v)){for(const n of v)assertJson(n,seen);}else{const p=Object.getPrototypeOf(v);if(p!==Object.prototype&&p!==null)throw new Error("ugp_webflow_non_json_payload");for(const n of Object.values(v as Record<string,unknown>))assertJson(n,seen);}seen.delete(v);}
function route(siteId:string,resource:WebflowReadResource){return `/v2/sites/${siteId}/${resource}`;}
function scope(resource:WebflowReadResource):"pages:read"|"cms:read"{return resource==="pages"?"pages:read":"cms:read";}
function kind(resource:WebflowReadResource):"page"|"collection"{return resource==="pages"?"page":"collection";}

export function buildWebflowReadPlan(input:{descriptor:UniversalConnectorDescriptor;method:"GET";resource:WebflowReadResource;capability:"read.resource"|"read.content";maxResults:number}):WebflowReadPlan{
  assertUniversalConnectorDescriptorIntegrity(input.descriptor);
  if(input.descriptor.provider!=="webflow")throw new Error("ugp_webflow_provider_required");
  const connection=input.descriptor.registry.connection;
  if(!connection||!input.descriptor.connectionId)throw new Error("ugp_webflow_connection_required");
  if(connection.connectionId!==input.descriptor.connectionId)throw new Error("ugp_webflow_connection_mismatch");
  if(connection.connectionMode!=="api")throw new Error("ugp_webflow_api_connection_required");
  const webflowSiteId=connection.externalAccountId;
  if(!webflowSiteId||!OBJECT_ID.test(webflowSiteId))throw new Error("ugp_webflow_site_id_required");
  if(input.method!=="GET")throw new Error("ugp_webflow_get_only");
  if(input.resource!=="pages"&&input.resource!=="collections")throw new Error("ugp_webflow_resource_denied");
  const cap=findUniversalCapability(input.descriptor.registry,input.capability,kind(input.resource));
  if(!cap||cap.sideEffect!=="read_only")throw new Error("ugp_webflow_read_capability_required");
  const requiredProviderScope=scope(input.resource);
  if(!cap.requiredProviderScopes.includes(requiredProviderScope))throw new Error("ugp_webflow_provider_scope_required");
  if(!Number.isSafeInteger(input.maxResults)||input.maxResults<1||input.maxResults>Math.min(100,cap.limits.maxOperationsPerRequest))throw new Error("ugp_webflow_invalid_max_results");
  const base={version:UGP_WEBFLOW_READ_PROVIDER_VERSION,descriptorFingerprint:input.descriptor.descriptorFingerprint,siteId:input.descriptor.siteId,connectionId:input.descriptor.connectionId,webflowSiteId,apiOrigin:WEBFLOW_API_ORIGIN,method:"GET" as const,resource:input.resource,path:route(webflowSiteId,input.resource),capability:input.capability,requiredProviderScope,maxResults:input.maxResults,semantics:SEM};
  return freeze({...base,requestFingerprint:hash({purpose:"ugp_webflow_read_plan",...base})});
}
export function normalizeWebflowReadReceipt(input:{plan:WebflowReadPlan;effectiveUrl:string;status:number;payload:unknown}):WebflowReadReceipt{
  if(!input.plan||input.plan.version!==UGP_WEBFLOW_READ_PROVIDER_VERSION)throw new Error("ugp_webflow_invalid_plan");
  if(input.status!==200)throw new Error("ugp_webflow_read_status_not_ok");
  const expected=WEBFLOW_API_ORIGIN+input.plan.path;
  if(input.effectiveUrl!==expected)throw new Error("ugp_webflow_effective_url_drift");
  assertJson(input.payload);
  const payloadBytes=Buffer.byteLength(stable(input.payload),"utf8");
  if(payloadBytes>1_000_000)throw new Error("ugp_webflow_payload_too_large");
  const stateFingerprint=hash({purpose:"ugp_webflow_read_state",payload:input.payload});
  const base={version:UGP_WEBFLOW_READ_PROVIDER_VERSION,requestFingerprint:input.plan.requestFingerprint,effectiveUrl:input.effectiveUrl,status:200 as const,payload:input.payload,payloadBytes,stateFingerprint};
  return freeze({...base,receiptFingerprint:hash({purpose:"ugp_webflow_read_receipt",...base})});
}
