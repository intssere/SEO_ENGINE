import assert from "node:assert/strict";
import test from "node:test";
import { buildUniversalSiteIdentity,buildUniversalConnectionIdentity } from "./universal-site-resource-identity.js";
import { buildUniversalCapabilityRegistry } from "./universal-capability-registry.js";
import { buildUniversalConnectorDescriptor } from "./universal-connector-contract.js";
import { buildControlledMcpConnectorPolicy,resolveControlledMcpOperation,assertControlledMcpConnectorPolicyIntegrity } from "./controlled-mcp-connector.js";

function fixture(){
 const site=buildUniversalSiteIdentity({siteId:"site-1",canonicalOrigin:"https://example.com"});
 const connection=buildUniversalConnectionIdentity({site,connectionId:"mcp-1",provider:"wordpress",externalAccountId:"wp-site-1",connectionMode:"mcp"});
 const registry=buildUniversalCapabilityRegistry({site,connection,provider:"wordpress",connectorVersion:"mcp-contract-v1",credentialProfileId:"credential-profile-ref",capabilities:[
  {capability:"read.resource",resourceKinds:["page","article"],requiredProviderScopes:["content:read"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:100,maxPayloadBytes:100000},
  {capability:"read.content",resourceKinds:["page","article"],requiredProviderScopes:["content:read"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:100,maxPayloadBytes:100000},
 ]});
 return buildUniversalConnectorDescriptor({connectorId:"wordpress-mcp",connectorKind:"mcp",registry});
}
test("UGP-4.1 creates deterministic sorted allowlisted read-only inventory",()=>{
 const descriptor=fixture();
 const a=buildControlledMcpConnectorPolicy({descriptor,serverId:"wordpress-prod",allowlistedServerIds:["wordpress-prod"],operations:[
  {inventoryKind:"tool",remoteName:"get_page",capability:"read.content",resourceKinds:["page"],readOnly:true},
  {inventoryKind:"resource",remoteName:"articles",capability:"read.resource",resourceKinds:["article"],readOnly:true},
 ]});
 const b=buildControlledMcpConnectorPolicy({descriptor,serverId:"wordpress-prod",allowlistedServerIds:["wordpress-prod"],operations:[...a.operations].reverse()});
 assert.equal(a.policyFingerprint,b.policyFingerprint); assert.ok(Object.isFrozen(a)); assertControlledMcpConnectorPolicyIntegrity(a);
});
test("UGP-4.1 denies a server outside the exact allowlist",()=>{
 assert.throws(()=>buildControlledMcpConnectorPolicy({descriptor:fixture(),serverId:"evil",allowlistedServerIds:["wordpress-prod"],operations:[{inventoryKind:"tool",remoteName:"get_page",capability:"read.content",resourceKinds:["page"],readOnly:true}]}),/server_not_allowlisted/);
});
test("UGP-4.1 denies unmapped remote operations",()=>{
 const p=buildControlledMcpConnectorPolicy({descriptor:fixture(),serverId:"wordpress-prod",allowlistedServerIds:["wordpress-prod"],operations:[{inventoryKind:"tool",remoteName:"get_page",capability:"read.content",resourceKinds:["page"],readOnly:true}]});
 assert.equal(resolveControlledMcpOperation(p,{inventoryKind:"tool",remoteName:"get_page"}).capability,"read.content");
 assert.throws(()=>resolveControlledMcpOperation(p,{inventoryKind:"tool",remoteName:"delete_page"}),/remote_operation_denied/);
});
test("UGP-4.1 rejects write capability mappings in initial certification",()=>{
 const descriptor=fixture();
 assert.throws(()=>buildControlledMcpConnectorPolicy({descriptor,serverId:"wordpress-prod",allowlistedServerIds:["wordpress-prod"],operations:[{inventoryKind:"tool",remoteName:"update_page",capability:"write.visible_content",resourceKinds:["page"],readOnly:true}]}),/capability_not_available|initial_mode_read_only/);
});
test("UGP-4.1 semantics never grant transport, credentials, authorization or writes",()=>{
 const p=buildControlledMcpConnectorPolicy({descriptor:fixture(),serverId:"wordpress-prod",allowlistedServerIds:["wordpress-prod"],operations:[{inventoryKind:"tool",remoteName:"get_page",capability:"read.content",resourceKinds:["page"],readOnly:true}]});
 assert.deepEqual(p.semantics,{inventoryOnly:true,liveTransportEnabled:false,arbitraryToolExecution:false,credentialMaterialAccepted:false,grantsAuthorization:false,providerWrites:false,publicSiteWrites:false});
});
