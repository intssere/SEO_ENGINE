import { createHash } from "node:crypto";
import { assertUniversalConnectorDescriptorIntegrity, type UniversalConnectorDescriptor } from "./universal-connector-contract.js";
import { findUniversalCapability, type UniversalCapabilityName } from "./universal-capability-registry.js";
import type { UniversalResourceKind } from "./universal-site-resource-identity.js";

export const UGP_OPENAPI_CONNECTOR_VERSION="ugp-4-2-controlled-openapi-connector-v1" as const;
export const OPENAPI_READ_METHODS=["get","head"] as const;
export type OpenApiReadMethod=(typeof OPENAPI_READ_METHODS)[number];
export type OpenApiOperationInput={operationId:string;method:string;path:string;capability:UniversalCapabilityName;resourceKinds:readonly UniversalResourceKind[]};
export type ControlledOpenApiPlan=Readonly<{version:typeof UGP_OPENAPI_CONNECTOR_VERSION;descriptor:UniversalConnectorDescriptor;document:Readonly<{openapi:"3.0"|"3.1";documentId:string;documentFingerprint:string}>;operations:readonly Readonly<{operationId:string;method:OpenApiReadMethod;path:string;capability:UniversalCapabilityName;resourceKinds:readonly UniversalResourceKind[]}>[];typedClient:Readonly<{generator:"unselected";runtimeGenerated:false;networkEnabled:false;executionEnabled:false}>;semantics:Readonly<{inventoryOnly:true;readOnly:true;grantsAuthorization:false;credentialMaterialAccepted:false;providerWrites:false;publicSiteWrites:false}>;planFingerprint:string}>;

const KEY=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/; const HEX=/^[0-9a-f]{64}$/; const MAX_OPS=1000; const MAX_PATH=1024;
const SEM=Object.freeze({inventoryOnly:true as const,readOnly:true as const,grantsAuthorization:false as const,credentialMaterialAccepted:false as const,providerWrites:false as const,publicSiteWrites:false as const});
const CLIENT=Object.freeze({generator:"unselected" as const,runtimeGenerated:false as const,networkEnabled:false as const,executionEnabled:false as const});
function stable(v:unknown):string{if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";const o=v as Record<string,unknown>;return "{"+Object.keys(o).sort().map(k=>JSON.stringify(k)+":"+stable(o[k])).join(",")+"}";}
function hash(v:unknown){return createHash("sha256").update(stable(v)).digest("hex");}
function freeze<T>(v:T):T{if(v&&typeof v==="object"&&!Object.isFrozen(v)){Object.freeze(v);for(const n of Object.values(v as Record<string,unknown>))freeze(n);}return v;}
function key(v:unknown,f:string){if(typeof v!=="string"||v!==v.trim()||!KEY.test(v))throw new Error("ugp_openapi_invalid_"+f);return v;}
function path(v:unknown){if(typeof v!=="string"||v.length<1||v.length>MAX_PATH||v!==v.trim()||!v.startsWith("/")||v.includes("?")||v.includes("#")||/[\u0000-\u001f\u007f]/.test(v))throw new Error("ugp_openapi_invalid_path");return v;}
function kinds(v:readonly UniversalResourceKind[]){if(!Array.isArray(v)||v.length<1)throw new Error("ugp_openapi_resource_kinds_required");const n=[...v].sort();if(new Set(n).size!==n.length)throw new Error("ugp_openapi_duplicate_resource_kind");return Object.freeze(n);}
export function buildControlledOpenApiPlan(input:{descriptor:UniversalConnectorDescriptor;openapi:string;documentId:string;documentFingerprint:string;operations:readonly OpenApiOperationInput[]}):ControlledOpenApiPlan{
 assertUniversalConnectorDescriptorIntegrity(input.descriptor); if(input.descriptor.connectorKind!=="openapi")throw new Error("ugp_openapi_connector_kind_required");
 const openapi=input.openapi==="3.0"||input.openapi.startsWith("3.0.")?"3.0":input.openapi==="3.1"||input.openapi.startsWith("3.1.")?"3.1":null; if(!openapi)throw new Error("ugp_openapi_unsupported_version");
 const documentId=key(input.documentId,"document_id"); if(!HEX.test(input.documentFingerprint))throw new Error("ugp_openapi_invalid_document_fingerprint");
 if(!Array.isArray(input.operations)||input.operations.length<1||input.operations.length>MAX_OPS)throw new Error("ugp_openapi_invalid_operation_count");
 const seenId=new Set<string>(),seenRoute=new Set<string>();
 const operations=input.operations.map(op=>{const operationId=key(op.operationId,"operation_id");const method=String(op.method).toLowerCase();if(!(OPENAPI_READ_METHODS as readonly string[]).includes(method))throw new Error("ugp_openapi_initial_mode_read_only");const route=method+":"+path(op.path);if(seenId.has(operationId)||seenRoute.has(route))throw new Error("ugp_openapi_duplicate_or_ambiguous_operation");seenId.add(operationId);seenRoute.add(route);const resourceKinds=kinds(op.resourceKinds);for(const kind of resourceKinds){const d=findUniversalCapability(input.descriptor.registry,op.capability,kind);if(!d||d.sideEffect!=="read_only")throw new Error("ugp_openapi_capability_not_available_read_only");}return freeze({operationId,method:method as OpenApiReadMethod,path:op.path,capability:op.capability,resourceKinds});}).sort((a,b)=>a.operationId.localeCompare(b.operationId));
 const base={version:UGP_OPENAPI_CONNECTOR_VERSION,descriptor:input.descriptor,document:freeze({openapi,documentId,documentFingerprint:input.documentFingerprint}),operations:Object.freeze(operations),typedClient:CLIENT,semantics:SEM};
 return freeze({...base,planFingerprint:hash({purpose:"ugp_controlled_openapi_plan",...base})});
}
export function assertControlledOpenApiPlanIntegrity(plan:ControlledOpenApiPlan):void{if(!plan||typeof plan!=="object"||plan.version!==UGP_OPENAPI_CONNECTOR_VERSION)throw new Error("ugp_openapi_invalid_plan");const rebuilt=buildControlledOpenApiPlan({descriptor:plan.descriptor,openapi:plan.document.openapi,documentId:plan.document.documentId,documentFingerprint:plan.document.documentFingerprint,operations:plan.operations});if(stable(rebuilt)!==stable(plan))throw new Error("ugp_openapi_plan_integrity_failed");}
export function resolveControlledOpenApiOperation(plan:ControlledOpenApiPlan,operationId:string){assertControlledOpenApiPlanIntegrity(plan);const id=key(operationId,"operation_id");const found=plan.operations.find(x=>x.operationId===id);if(!found)throw new Error("ugp_openapi_operation_denied");return found;}
