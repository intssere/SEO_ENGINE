import { createHash } from "node:crypto";
import { assertUniversalConnectorDescriptorIntegrity, type JsonValue, type UniversalConnectorDescriptor } from "./universal-connector-contract.js";
import { findUniversalCapability } from "./universal-capability-registry.js";
import type { UniversalResourceKind } from "./universal-site-resource-identity.js";

export const UGP_WORDPRESS_READ_PROVIDER_VERSION = "ugp-4-5-wordpress-read-provider-v1" as const;
export type WordPressReadRoute = "/wp-json/wp/v2/pages" | "/wp-json/wp/v2/posts";
export type WordPressReadPlan = Readonly<{
 version: typeof UGP_WORDPRESS_READ_PROVIDER_VERSION;
 descriptorFingerprint: string;
 siteId: string;
 connectionId: string;
 canonicalOrigin: string;
 method: "GET";
 route: WordPressReadRoute;
 resourceKind: "page" | "article";
 capability: "read.resource" | "read.content";
 maxResults: number;
 semantics: Readonly<{fixtureCertificationOnly:true;liveTransportEnabled:false;credentialMaterialAccepted:false;grantsAuthorization:false;providerWrites:false;publicSiteWrites:false}>;
 requestFingerprint: string;
}>;
export type WordPressReadReceipt = Readonly<{
 version: typeof UGP_WORDPRESS_READ_PROVIDER_VERSION;
 requestFingerprint: string;
 effectiveUrl: string;
 status: 200;
 payload: JsonValue;
 payloadBytes: number;
 stateFingerprint: string;
 receiptFingerprint: string;
}>;

const SEM=Object.freeze({fixtureCertificationOnly:true as const,liveTransportEnabled:false as const,credentialMaterialAccepted:false as const,grantsAuthorization:false as const,providerWrites:false as const,publicSiteWrites:false as const});
function stable(v:unknown):string{if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";const o=v as Record<string,unknown>;return "{"+Object.keys(o).sort().map(k=>JSON.stringify(k)+":"+stable(o[k])).join(",")+"}";}
function hash(v:unknown){return createHash("sha256").update(stable(v)).digest("hex");}
function freeze<T>(v:T):T{if(v&&typeof v==="object"&&!Object.isFrozen(v)){Object.freeze(v);for(const n of Object.values(v as Record<string,unknown>))freeze(n);}return v;}
function assertJson(v:unknown,seen=new Set<object>()):asserts v is JsonValue{if(v===null||typeof v==="string"||typeof v==="boolean")return;if(typeof v==="number"){if(Number.isFinite(v))return;throw new Error("ugp_wordpress_non_json_payload");}if(typeof v!=="object"||v===undefined)throw new Error("ugp_wordpress_non_json_payload");if(seen.has(v))throw new Error("ugp_wordpress_cyclic_payload");seen.add(v);if(Array.isArray(v)){for(const n of v)assertJson(n,seen);}else{const p=Object.getPrototypeOf(v);if(p!==Object.prototype&&p!==null)throw new Error("ugp_wordpress_non_json_payload");for(const n of Object.values(v as Record<string,unknown>))assertJson(n,seen);}seen.delete(v);}
function routeKind(route:WordPressReadRoute):"page"|"article"{return route.endsWith("/pages")?"page":"article";}
function exactOrigin(raw:string){const u=new URL(raw);if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash||u.pathname!=="/"||u.origin!==raw)throw new Error("ugp_wordpress_https_canonical_origin_required");return u.origin;}
export function buildWordPressReadPlan(input:{descriptor:UniversalConnectorDescriptor;method:"GET";route:WordPressReadRoute;resourceKind:"page"|"article";capability:"read.resource"|"read.content";maxResults:number}):WordPressReadPlan{
 assertUniversalConnectorDescriptorIntegrity(input.descriptor);
 if(input.descriptor.provider!=="wordpress")throw new Error("ugp_wordpress_provider_required");
 if(!input.descriptor.connectionId)throw new Error("ugp_wordpress_connection_required");
 if(input.method!=="GET")throw new Error("ugp_wordpress_get_only");
 if(input.route!=="/wp-json/wp/v2/pages"&&input.route!=="/wp-json/wp/v2/posts")throw new Error("ugp_wordpress_route_denied");
 if(routeKind(input.route)!==input.resourceKind)throw new Error("ugp_wordpress_route_resource_mismatch");
 const cap=findUniversalCapability(input.descriptor.registry,input.capability,input.resourceKind);
 if(!cap||cap.sideEffect!=="read_only")throw new Error("ugp_wordpress_read_capability_required");
 if(!Number.isSafeInteger(input.maxResults)||input.maxResults<1||input.maxResults>Math.min(100,cap.limits.maxOperationsPerRequest))throw new Error("ugp_wordpress_invalid_max_results");
 const canonicalOrigin=exactOrigin(input.descriptor.registry.site.canonicalOrigin);
 const base={version:UGP_WORDPRESS_READ_PROVIDER_VERSION,descriptorFingerprint:input.descriptor.descriptorFingerprint,siteId:input.descriptor.siteId,connectionId:input.descriptor.connectionId,canonicalOrigin,method:"GET" as const,route:input.route,resourceKind:input.resourceKind,capability:input.capability,maxResults:input.maxResults,semantics:SEM};
 return freeze({...base,requestFingerprint:hash({purpose:"ugp_wordpress_read_plan",...base})});
}
export function normalizeWordPressReadReceipt(input:{plan:WordPressReadPlan;effectiveUrl:string;status:number;payload:unknown}):WordPressReadReceipt{
 if(!input.plan||input.plan.version!==UGP_WORDPRESS_READ_PROVIDER_VERSION)throw new Error("ugp_wordpress_invalid_plan");
 if(input.status!==200)throw new Error("ugp_wordpress_read_status_not_ok");
 const expected=new URL(input.plan.route,input.plan.canonicalOrigin).toString();
 if(input.effectiveUrl!==expected)throw new Error("ugp_wordpress_effective_url_drift");
 assertJson(input.payload);
 const payloadBytes=Buffer.byteLength(stable(input.payload),"utf8");
 if(payloadBytes>1_000_000)throw new Error("ugp_wordpress_payload_too_large");
 const stateFingerprint=hash({purpose:"ugp_wordpress_read_state",payload:input.payload});
 const base={version:UGP_WORDPRESS_READ_PROVIDER_VERSION,requestFingerprint:input.plan.requestFingerprint,effectiveUrl:input.effectiveUrl,status:200 as const,payload:input.payload,payloadBytes,stateFingerprint};
 return freeze({...base,receiptFingerprint:hash({purpose:"ugp_wordpress_read_receipt",...base})});
}
