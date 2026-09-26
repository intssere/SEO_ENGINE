import { createHash } from "node:crypto";
import {
  assertUniversalConnectorDescriptorIntegrity,
  type UniversalConnectorDescriptor,
} from "./universal-connector-contract.js";
import {
  findUniversalCapability,
  type UniversalCapabilityName,
} from "./universal-capability-registry.js";
import type { UniversalResourceKind } from "./universal-site-resource-identity.js";

export const UGP_MCP_CONNECTOR_VERSION = "ugp-4-1-controlled-mcp-connector-v1" as const;
export type McpInventoryKind = "tool" | "resource";
export type McpMappedOperation = Readonly<{
  inventoryKind: McpInventoryKind;
  remoteName: string;
  capability: UniversalCapabilityName;
  resourceKinds: readonly UniversalResourceKind[];
  readOnly: boolean;
}>;
export type ControlledMcpConnectorPolicy = Readonly<{
  version: typeof UGP_MCP_CONNECTOR_VERSION;
  descriptor: UniversalConnectorDescriptor;
  serverId: string;
  provider: string;
  allowlistedServerIds: readonly string[];
  operations: readonly McpMappedOperation[];
  semantics: Readonly<{
    inventoryOnly: true;
    liveTransportEnabled: false;
    arbitraryToolExecution: false;
    credentialMaterialAccepted: false;
    grantsAuthorization: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  policyFingerprint: string;
}>;

const SAFE=/^[a-z0-9][a-z0-9._:-]{0,127}$/;
const SEMANTICS=Object.freeze({inventoryOnly:true as const,liveTransportEnabled:false as const,arbitraryToolExecution:false as const,credentialMaterialAccepted:false as const,grantsAuthorization:false as const,providerWrites:false as const,publicSiteWrites:false as const});
function stable(v:unknown):string{if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";const o=v as Record<string,unknown>;return "{"+Object.keys(o).sort().map(k=>JSON.stringify(k)+":"+stable(o[k])).join(",")+"}";}
function hash(v:unknown){return createHash("sha256").update(stable(v)).digest("hex");}
function freeze<T>(v:T):T{if(v&&typeof v==="object"&&!Object.isFrozen(v)){Object.freeze(v);for(const n of Object.values(v as Record<string,unknown>))freeze(n);}return v;}
function key(v:unknown,field:string){if(typeof v!=="string"||v!==v.trim()||!SAFE.test(v))throw new Error("ugp_mcp_invalid_"+field);return v;}
function kinds(values:readonly UniversalResourceKind[]){if(!Array.isArray(values)||values.length<1)throw new Error("ugp_mcp_resource_kinds_required");const n=[...values].sort();if(new Set(n).size!==n.length)throw new Error("ugp_mcp_duplicate_resource_kind");return Object.freeze(n);}
export function buildControlledMcpConnectorPolicy(input:{descriptor:UniversalConnectorDescriptor;serverId:string;allowlistedServerIds:readonly string[];operations:readonly McpMappedOperation[]}):ControlledMcpConnectorPolicy{
  assertUniversalConnectorDescriptorIntegrity(input.descriptor);
  if(input.descriptor.connectorKind!=="mcp")throw new Error("ugp_mcp_connector_kind_required");
  const serverId=key(input.serverId,"server_id");
  const allow=[...input.allowlistedServerIds].map(v=>key(v,"allowlisted_server_id")).sort();
  if(allow.length<1||new Set(allow).size!==allow.length)throw new Error("ugp_mcp_invalid_allowlist");
  if(!allow.includes(serverId))throw new Error("ugp_mcp_server_not_allowlisted");
  if(!Array.isArray(input.operations)||input.operations.length<1)throw new Error("ugp_mcp_operations_required");
  const seen=new Set<string>();
  const operations=input.operations.map(op=>{
    if(!op||typeof op!=="object")throw new Error("ugp_mcp_invalid_operation");
    if(op.inventoryKind!=="tool"&&op.inventoryKind!=="resource")throw new Error("ugp_mcp_invalid_inventory_kind");
    const remoteName=key(op.remoteName,"remote_name");
    const resourceKinds=kinds(op.resourceKinds);
    const def=resourceKinds.map(kind=>findUniversalCapability(input.descriptor.registry,op.capability,kind));
    if(def.some(v=>!v))throw new Error("ugp_mcp_capability_not_available");
    const readOnly=def.every(v=>v?.sideEffect==="read_only");
    if(!readOnly)throw new Error("ugp_mcp_initial_mode_read_only");
    if(op.readOnly!==true)throw new Error("ugp_mcp_operation_must_be_read_only");
    const identity=op.inventoryKind+":"+remoteName;
    if(seen.has(identity))throw new Error("ugp_mcp_duplicate_remote_operation");
    seen.add(identity);
    return freeze({inventoryKind:op.inventoryKind,remoteName,capability:op.capability,resourceKinds,readOnly:true as const});
  }).sort((a,b)=>(a.inventoryKind+":"+a.remoteName).localeCompare(b.inventoryKind+":"+b.remoteName));
  const base={version:UGP_MCP_CONNECTOR_VERSION,descriptor:input.descriptor,serverId,provider:input.descriptor.provider,allowlistedServerIds:Object.freeze(allow),operations:Object.freeze(operations),semantics:SEMANTICS};
  return freeze({...base,policyFingerprint:hash({purpose:"ugp_controlled_mcp_connector_policy",...base})});
}
export function assertControlledMcpConnectorPolicyIntegrity(policy:ControlledMcpConnectorPolicy):void{
  if(!policy||typeof policy!=="object"||policy.version!==UGP_MCP_CONNECTOR_VERSION)throw new Error("ugp_mcp_invalid_policy");
  const rebuilt=buildControlledMcpConnectorPolicy({descriptor:policy.descriptor,serverId:policy.serverId,allowlistedServerIds:policy.allowlistedServerIds,operations:policy.operations});
  if(stable(rebuilt)!==stable(policy))throw new Error("ugp_mcp_policy_integrity_failed");
}
export function resolveControlledMcpOperation(policy:ControlledMcpConnectorPolicy,input:{inventoryKind:McpInventoryKind;remoteName:string}):McpMappedOperation{
  assertControlledMcpConnectorPolicyIntegrity(policy);
  const remoteName=key(input.remoteName,"remote_name");
  const match=policy.operations.find(op=>op.inventoryKind===input.inventoryKind&&op.remoteName===remoteName);
  if(!match)throw new Error("ugp_mcp_remote_operation_denied");
  return match;
}
