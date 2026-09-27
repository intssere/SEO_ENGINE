import { buildUniversalSiteIdentity, buildUniversalConnectionIdentity } from "./universal-site-resource-identity.js";
import { buildUniversalCapabilityRegistry } from "./universal-capability-registry.js";
import { buildUniversalConnectorDescriptor } from "./universal-connector-contract.js";
import { buildWebflowReadPlan, normalizeWebflowReadReceipt, type WebflowReadReceipt, type WebflowReadResource } from "./webflow-read-provider-certification.js";

export const UGP_WEBFLOW_CAPTURED_EVIDENCE_VERSION = "ugp-4-6l-captured-evidence-attestation-v1" as const;
export const UGP_WEBFLOW_LIVE_SITE_ID = "6ab94b0baca74bd07f84a09e" as const;
export const UGP_WEBFLOW_LIVE_SITE_ORIGIN = "https://seo-engine-ugp-test.webflow.io" as const;
export const UGP_WEBFLOW_API_ORIGIN = "https://api.webflow.com" as const;
export type CapturedWebflowObservation = Readonly<{resource:WebflowReadResource;effectiveUrl:string;status:number;contentType:string;responseBytes:number;payload:unknown}>;
const RESOURCES = ["pages","collections"] as const;

function descriptor(){
 const site=buildUniversalSiteIdentity({siteId:"webflow-live-site",canonicalOrigin:UGP_WEBFLOW_LIVE_SITE_ORIGIN});
 const connection=buildUniversalConnectionIdentity({site,connectionId:"webflow-live-api",provider:"webflow",externalAccountId:UGP_WEBFLOW_LIVE_SITE_ID,connectionMode:"api"});
 const registry=buildUniversalCapabilityRegistry({site,connection,provider:"webflow",connectorVersion:"webflow-data-api-v2-cert-v1",credentialProfileId:"offline-captured-evidence",capabilities:[
  {capability:"read.content",resourceKinds:["page"],requiredProviderScopes:["pages:read"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:100,maxPayloadBytes:1000000},
  {capability:"read.resource",resourceKinds:["collection"],requiredProviderScopes:["cms:read"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:100,maxPayloadBytes:1000000}
 ]});
 return buildUniversalConnectorDescriptor({connectorId:"webflow-live-read",connectorKind:"native_api",registry});
}
function expectedUrl(resource:WebflowReadResource){return `${UGP_WEBFLOW_API_ORIGIN}/v2/sites/${UGP_WEBFLOW_LIVE_SITE_ID}/${resource}`;}

export function attestCapturedWebflowEvidence(input:{observations:readonly CapturedWebflowObservation[]}):Readonly<{version:typeof UGP_WEBFLOW_CAPTURED_EVIDENCE_VERSION;siteId:typeof UGP_WEBFLOW_LIVE_SITE_ID;siteOrigin:typeof UGP_WEBFLOW_LIVE_SITE_ORIGIN;apiOrigin:typeof UGP_WEBFLOW_API_ORIGIN;receipts:readonly Readonly<{resource:WebflowReadResource;responseBytes:number;receipt:WebflowReadReceipt}>[];assertions:Readonly<{offlineOnly:true;networkCalls:false;getOnly:true;credentials:false;providerWrites:false;publicSiteWrites:false;persistence:false}>}>{
 if(input.observations.length!==2)throw new Error("ugp_webflow_captured_exact_two_required");
 const byResource=new Map(input.observations.map(o=>[o.resource,o] as const));
 if(byResource.size!==2||RESOURCES.some(r=>!byResource.has(r)))throw new Error("ugp_webflow_captured_resource_set_required");
 const d=descriptor();
 const receipts=RESOURCES.map(resource=>{
  const o=byResource.get(resource)!;
  if(o.effectiveUrl!==expectedUrl(resource))throw new Error("ugp_webflow_captured_effective_url_drift");
  if(o.status===401||o.status===403)throw new Error("ugp_webflow_captured_auth_required");
  if(o.status!==200)throw new Error("ugp_webflow_captured_status_not_ok");
  if(!/^application\/json(?:;|$)/i.test(o.contentType.trim()))throw new Error("ugp_webflow_captured_json_required");
  if(!Number.isSafeInteger(o.responseBytes)||o.responseBytes<0||o.responseBytes>1_000_000)throw new Error("ugp_webflow_captured_response_bounds");
  const isPages=resource==="pages";
  const plan=buildWebflowReadPlan({descriptor:d,method:"GET",resource,resourceKind:isPages?"page":"collection",capability:isPages?"read.content":"read.resource",maxResults:100});
  const receipt=normalizeWebflowReadReceipt({plan,effectiveUrl:o.effectiveUrl,status:o.status,payload:o.payload});
  return Object.freeze({resource,responseBytes:o.responseBytes,receipt});
 });
 return Object.freeze({version:UGP_WEBFLOW_CAPTURED_EVIDENCE_VERSION,siteId:UGP_WEBFLOW_LIVE_SITE_ID,siteOrigin:UGP_WEBFLOW_LIVE_SITE_ORIGIN,apiOrigin:UGP_WEBFLOW_API_ORIGIN,receipts:Object.freeze(receipts),assertions:Object.freeze({offlineOnly:true,networkCalls:false,getOnly:true,credentials:false,providerWrites:false,publicSiteWrites:false,persistence:false})});
}
