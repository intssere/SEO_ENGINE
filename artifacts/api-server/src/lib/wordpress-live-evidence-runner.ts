import { buildWordPressReadPlan, normalizeWordPressReadReceipt, type WordPressReadReceipt, type WordPressReadRoute } from "./wordpress-read-provider-certification.js";
import type { UniversalConnectorDescriptor } from "./universal-connector-contract.js";

export const UGP_WORDPRESS_LIVE_EVIDENCE_VERSION = "ugp-4-5l-live-evidence-runner-v1" as const;
export const UGP_WORDPRESS_LIVE_ALLOWED_ORIGIN = "https://kalkeenwellness.com" as const;
const ALLOWED_ROUTES = ["/wp-json/wp/v2/pages", "/wp-json/wp/v2/posts"] as const;
export type WordPressLiveTransport = (request: Readonly<{url:string;method:"GET";redirect:"manual";credentials:"omit";headers:Readonly<{accept:"application/json"}>;timeoutMs:number;maxResponseBytes:number}>) => Promise<Readonly<{effectiveUrl:string;status:number;contentType:string;payload:unknown;responseBytes:number;redirected:boolean}>>;

export async function runAuthorizedWordPressLiveEvidence(input:{descriptor:UniversalConnectorDescriptor;transport:WordPressLiveTransport}):Promise<Readonly<{version:typeof UGP_WORDPRESS_LIVE_EVIDENCE_VERSION;origin:typeof UGP_WORDPRESS_LIVE_ALLOWED_ORIGIN;receipts:readonly WordPressReadReceipt[];assertions:Readonly<{getOnly:true;credentialsOmitted:true;redirectsDenied:true;providerWrites:false;publicSiteWrites:false;persistence:false}>}>>{
 if(input.descriptor.registry.site.canonicalOrigin!==UGP_WORDPRESS_LIVE_ALLOWED_ORIGIN)throw new Error("ugp_wordpress_live_origin_not_authorized");
 const receipts:WordPressReadReceipt[]=[];
 for(const route of ALLOWED_ROUTES){
  const resourceKind=route.endsWith("/pages")?"page":"article";
  const plan=buildWordPressReadPlan({descriptor:input.descriptor,method:"GET",route:route as WordPressReadRoute,resourceKind,capability:"read.content",maxResults:100});
  const url=new URL(route,UGP_WORDPRESS_LIVE_ALLOWED_ORIGIN).toString();
  const observed=await input.transport({url,method:"GET",redirect:"manual",credentials:"omit",headers:{accept:"application/json"},timeoutMs:10_000,maxResponseBytes:1_000_000});
  if(observed.redirected||observed.effectiveUrl!==url)throw new Error("ugp_wordpress_live_redirect_or_origin_drift");
  if(observed.status===401||observed.status===403)throw new Error("ugp_wordpress_live_auth_required");
  if(observed.status!==200)throw new Error("ugp_wordpress_live_status_not_ok");
  if(!/^application\/json(?:;|$)/i.test(observed.contentType.trim()))throw new Error("ugp_wordpress_live_json_required");
  if(!Number.isSafeInteger(observed.responseBytes)||observed.responseBytes<0||observed.responseBytes>1_000_000)throw new Error("ugp_wordpress_live_response_bounds");
  receipts.push(normalizeWordPressReadReceipt({plan,effectiveUrl:observed.effectiveUrl,status:observed.status,payload:observed.payload}));
 }
 return Object.freeze({version:UGP_WORDPRESS_LIVE_EVIDENCE_VERSION,origin:UGP_WORDPRESS_LIVE_ALLOWED_ORIGIN,receipts:Object.freeze(receipts),assertions:Object.freeze({getOnly:true,credentialsOmitted:true,redirectsDenied:true,providerWrites:false,publicSiteWrites:false,persistence:false})});
}
