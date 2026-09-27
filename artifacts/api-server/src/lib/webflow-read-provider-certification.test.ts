import assert from "node:assert/strict";
import test from "node:test";
import {buildUniversalSiteIdentity,buildUniversalConnectionIdentity} from "./universal-site-resource-identity.js";
import {buildUniversalCapabilityRegistry} from "./universal-capability-registry.js";
import {buildUniversalConnectorDescriptor} from "./universal-connector-contract.js";
import {buildWebflowReadPlan,normalizeWebflowReadReceipt,WEBFLOW_API_ORIGIN} from "./webflow-read-provider-certification.js";

const WEBFLOW_SITE_ID="580e63e98c9a982ac9b8b741";
function descriptor(siteId=WEBFLOW_SITE_ID){
 const site=buildUniversalSiteIdentity({siteId:"webflow-site",canonicalOrigin:"https://example.com"});
 const connection=buildUniversalConnectionIdentity({site,connectionId:"webflow-api-1",provider:"webflow",externalAccountId:siteId,connectionMode:"api"});
 const registry=buildUniversalCapabilityRegistry({site,connection,provider:"webflow",connectorVersion:"webflow-data-api-v2-read-cert-v1",credentialProfileId:"credential-profile-ref",capabilities:[
  {capability:"read.resource",resourceKinds:["page","collection"],requiredProviderScopes:["cms:read","pages:read"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:100,maxPayloadBytes:1000000},
  {capability:"read.content",resourceKinds:["page","collection"],requiredProviderScopes:["cms:read","pages:read"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:100,maxPayloadBytes:1000000}
 ]});
 return buildUniversalConnectorDescriptor({connectorId:"webflow-data-api-v2-read",connectorKind:"native_api",registry});
}
test("UGP-4.6 deterministically binds Webflow page reads",()=>{
 const a=buildWebflowReadPlan({descriptor:descriptor(),method:"GET",resource:"pages",capability:"read.content",maxResults:100});
 const b=buildWebflowReadPlan({descriptor:descriptor(),method:"GET",resource:"pages",capability:"read.content",maxResults:100});
 assert.equal(a.requestFingerprint,b.requestFingerprint);
 assert.equal(a.path,`/v2/sites/${WEBFLOW_SITE_ID}/pages`);
 assert.equal(a.requiredProviderScope,"pages:read");
 assert.deepEqual(a.semantics,{fixtureCertificationOnly:true,liveTransportEnabled:false,credentialMaterialAccepted:false,grantsAuthorization:false,providerWrites:false,publicSiteWrites:false});
});
test("UGP-4.6 binds collections to cms:read and normalizes caller-supplied evidence",()=>{
 const p=buildWebflowReadPlan({descriptor:descriptor(),method:"GET",resource:"collections",capability:"read.resource",maxResults:20});
 assert.equal(p.requiredProviderScope,"cms:read");
 const r=normalizeWebflowReadReceipt({plan:p,effectiveUrl:`${WEBFLOW_API_ORIGIN}${p.path}`,status:200,payload:{collections:[{id:"63692ab61fb2852f582ba8f5",displayName:"Posts"}]}});
 assert.equal(r.status,200);assert.equal(r.requestFingerprint,p.requestFingerprint);assert.match(r.stateFingerprint,/^[0-9a-f]{64}$/);assert.ok(Object.isFrozen(r));
});
test("UGP-4.6 fails closed on Webflow site identity and effective URL drift",()=>{
 assert.throws(()=>buildWebflowReadPlan({descriptor:descriptor("not-a-webflow-site-id"),method:"GET",resource:"pages",capability:"read.content",maxResults:10}),/site_id_required/);
 const p=buildWebflowReadPlan({descriptor:descriptor(),method:"GET",resource:"pages",capability:"read.content",maxResults:10});
 assert.throws(()=>normalizeWebflowReadReceipt({plan:p,effectiveUrl:"https://evil.example"+p.path,status:200,payload:{pages:[]}}),/effective_url_drift/);
});
test("UGP-4.6 rejects bad status, malformed evidence, and oversized evidence",()=>{
 const p=buildWebflowReadPlan({descriptor:descriptor(),method:"GET",resource:"pages",capability:"read.content",maxResults:10});
 const url=`${WEBFLOW_API_ORIGIN}${p.path}`;
 assert.throws(()=>normalizeWebflowReadReceipt({plan:p,effectiveUrl:url,status:401,payload:{}}),/status_not_ok/);
 assert.throws(()=>normalizeWebflowReadReceipt({plan:p,effectiveUrl:url,status:200,payload:{bad:undefined}}),/non_json_payload/);
 assert.throws(()=>normalizeWebflowReadReceipt({plan:p,effectiveUrl:url,status:200,payload:"x".repeat(1_000_001)}),/payload_too_large/);
});
