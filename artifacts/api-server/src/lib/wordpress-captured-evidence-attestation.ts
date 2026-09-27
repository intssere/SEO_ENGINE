import { buildUniversalSiteIdentity, buildUniversalConnectionIdentity } from "./universal-site-resource-identity.js";
import { buildUniversalCapabilityRegistry } from "./universal-capability-registry.js";
import { buildUniversalConnectorDescriptor } from "./universal-connector-contract.js";
import { buildWordPressReadPlan, normalizeWordPressReadReceipt, type WordPressReadReceipt, type WordPressReadRoute } from "./wordpress-read-provider-certification.js";
import { UGP_WORDPRESS_LIVE_ALLOWED_ORIGIN } from "./wordpress-live-evidence-runner.js";

export const UGP_WORDPRESS_CAPTURED_EVIDENCE_VERSION = "ugp-4-5l-captured-evidence-attestation-v1" as const;
export type CapturedWordPressObservation = Readonly<{route:WordPressReadRoute;effectiveUrl:string;status:number;contentType:string;responseBytes:number;payload:unknown}>;
const ROUTES = ["/wp-json/wp/v2/pages","/wp-json/wp/v2/posts"] as const;

function descriptor(){
 const site=buildUniversalSiteIdentity({siteId:"wp-live-site",canonicalOrigin:UGP_WORDPRESS_LIVE_ALLOWED_ORIGIN});
 const connection=buildUniversalConnectionIdentity({site,connectionId:"wp-live-rest",provider:"wordpress",externalAccountId:"wp-live",connectionMode:"api"});
 const registry=buildUniversalCapabilityRegistry({site,connection,provider:"wordpress",connectorVersion:"wordpress-rest-cert-v1",credentialProfileId:"no-live-credential",capabilities:[{capability:"read.content",resourceKinds:["page","article"],requiredProviderScopes:["content:read"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:100,maxPayloadBytes:1000000}]});
 return buildUniversalConnectorDescriptor({connectorId:"wordpress-live-read",connectorKind:"native_api",registry});
}
export function attestCapturedWordPressEvidence(input:{observations:readonly CapturedWordPressObservation[]}):Readonly<{version:typeof UGP_WORDPRESS_CAPTURED_EVIDENCE_VERSION;origin:typeof UGP_WORDPRESS_LIVE_ALLOWED_ORIGIN;receipts:readonly Readonly<{route:WordPressReadRoute;responseBytes:number;receipt:WordPressReadReceipt}>[];assertions:Readonly<{offlineOnly:true;networkCalls:false;getOnly:true;credentials:false;providerWrites:false;publicSiteWrites:false;persistence:false}>}>{
 if(input.observations.length!==2)throw new Error("ugp_wordpress_captured_exact_two_required");
 const byRoute=new Map(input.observations.map(o=>[o.route,o] as const));
 if(byRoute.size!==2||ROUTES.some(r=>!byRoute.has(r)))throw new Error("ugp_wordpress_captured_route_set_required");
 const d=descriptor();
 const receipts=ROUTES.map(route=>{
  const o=byRoute.get(route)!;
  const expected=new URL(route,UGP_WORDPRESS_LIVE_ALLOWED_ORIGIN).toString();
  if(o.effectiveUrl!==expected)throw new Error("ugp_wordpress_captured_effective_url_drift");
  if(o.status===401||o.status===403)throw new Error("ugp_wordpress_captured_auth_required");
  if(o.status!==200)throw new Error("ugp_wordpress_captured_status_not_ok");
  if(!/^application\/json(?:;|$)/i.test(o.contentType.trim()))throw new Error("ugp_wordpress_captured_json_required");
  if(!Number.isSafeInteger(o.responseBytes)||o.responseBytes<0||o.responseBytes>1_000_000)throw new Error("ugp_wordpress_captured_response_bounds");
  const resourceKind=route.endsWith("/pages")?"page":"article";
  const plan=buildWordPressReadPlan({descriptor:d,method:"GET",route,resourceKind,capability:"read.content",maxResults:100});
  const receipt=normalizeWordPressReadReceipt({plan,effectiveUrl:o.effectiveUrl,status:o.status,payload:o.payload});
  return Object.freeze({route,responseBytes:o.responseBytes,receipt});
 });
 return Object.freeze({version:UGP_WORDPRESS_CAPTURED_EVIDENCE_VERSION,origin:UGP_WORDPRESS_LIVE_ALLOWED_ORIGIN,receipts:Object.freeze(receipts),assertions:Object.freeze({offlineOnly:true,networkCalls:false,getOnly:true,credentials:false,providerWrites:false,publicSiteWrites:false,persistence:false})});
}
