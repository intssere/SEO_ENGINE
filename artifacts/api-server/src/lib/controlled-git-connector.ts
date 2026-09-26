import { createHash } from "node:crypto";
import { assertUniversalConnectorDescriptorIntegrity, type UniversalConnectorDescriptor } from "./universal-connector-contract.js";
import { findUniversalCapability } from "./universal-capability-registry.js";

export const UGP_GIT_CONNECTOR_VERSION = "ugp-4-3-controlled-git-connector-v1" as const;
const SHA=/^[0-9a-f]{40}$/; const REPO=/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/; const REF=/^[A-Za-z0-9][A-Za-z0-9._/-]{0,254}$/; const MAX_FILES=200;
function stable(v:unknown):string{if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";const o=v as Record<string,unknown>;return "{"+Object.keys(o).sort().map(k=>JSON.stringify(k)+":"+stable(o[k])).join(",")+"}";}
function hash(v:unknown){return createHash("sha256").update(stable(v)).digest("hex");}
function freeze<T>(v:T):T{if(v&&typeof v==="object"&&!Object.isFrozen(v)){Object.freeze(v);for(const n of Object.values(v as Record<string,unknown>))freeze(n);}return v;}
function exact(v:unknown,re:RegExp,f:string){if(typeof v!=="string"||v!==v.trim()||!re.test(v))throw new Error("ugp_git_invalid_"+f);return v;}
function path(v:unknown){if(typeof v!=="string"||v.length<1||v.length>1024||v!==v.trim()||v.startsWith("/")||v.includes("\\")||v.split("/").some(x=>!x||x==="."||x==="..")||/[\u0000-\u001f\u007f]/.test(v))throw new Error("ugp_git_invalid_path");return v;}
export type GitPatchInput={path:string;expectedBlobSha:string;proposedContentFingerprint:string};
export type GitDetectionInput={framework:string|null;contentSource:string|null;evidencePaths:readonly string[]};
export type ControlledGitPlan=Readonly<{version:typeof UGP_GIT_CONNECTOR_VERSION;descriptor:UniversalConnectorDescriptor;repository:Readonly<{repository:string;defaultBranch:string;baseCommitSha:string}>;detection:Readonly<{framework:string|null;contentSource:string|null;evidencePaths:readonly string[]}>;change:Readonly<{workingBranch:string;patches:readonly Readonly<GitPatchInput>[];pullRequestRequired:true;directDefaultBranchWrite:false}>;ciObservation:Readonly<{repository:string;ref:string;commitSha:string;readOnly:true}>;semantics:Readonly<{planningOnly:true;networkEnabled:false;gitExecutionEnabled:false;filesystemMutationEnabled:false;credentialMaterialAccepted:false;grantsAuthorization:false;providerWrites:false;publicSiteWrites:false}>;planFingerprint:string}>;
const SEM=freeze({planningOnly:true as const,networkEnabled:false as const,gitExecutionEnabled:false as const,filesystemMutationEnabled:false as const,credentialMaterialAccepted:false as const,grantsAuthorization:false as const,providerWrites:false as const,publicSiteWrites:false as const});
function optionalLabel(v:unknown,f:string){if(v===null)return null;return exact(v,/^[A-Za-z0-9][A-Za-z0-9 ._:+@/-]{0,159}$/,f);}
export function buildControlledGitPlan(input:{descriptor:UniversalConnectorDescriptor;repository:string;defaultBranch:string;baseCommitSha:string;workingBranch:string;detection:GitDetectionInput;patches:readonly GitPatchInput[]}):ControlledGitPlan{
 assertUniversalConnectorDescriptorIntegrity(input.descriptor); if(input.descriptor.connectorKind!=="git")throw new Error("ugp_git_connector_kind_required");
 const repository=exact(input.repository,REPO,"repository"),defaultBranch=exact(input.defaultBranch,REF,"default_branch"),baseCommitSha=exact(input.baseCommitSha,SHA,"base_commit_sha"),workingBranch=exact(input.workingBranch,REF,"working_branch");
 if(workingBranch===defaultBranch)throw new Error("ugp_git_default_branch_write_denied");
 for(const cap of ["git.branch","git.commit","git.pull_request","git.status"] as const){if(!findUniversalCapability(input.descriptor.registry,cap,"page"))throw new Error("ugp_git_capability_not_available");}
 if(!Array.isArray(input.patches)||input.patches.length<1||input.patches.length>MAX_FILES)throw new Error("ugp_git_invalid_patch_count");
 const seen=new Set<string>(); const patches=input.patches.map(p=>{const filePath=path(p.path);if(seen.has(filePath))throw new Error("ugp_git_duplicate_file_target");seen.add(filePath);const expectedBlobSha=exact(p.expectedBlobSha,SHA,"expected_blob_sha");const proposedContentFingerprint=exact(p.proposedContentFingerprint,/^[0-9a-f]{64}$/,"proposed_content_fingerprint");return freeze({path:filePath,expectedBlobSha,proposedContentFingerprint});}).sort((a,b)=>a.path.localeCompare(b.path));
 const evidencePaths=[...input.detection.evidencePaths].map(path).sort();if(new Set(evidencePaths).size!==evidencePaths.length)throw new Error("ugp_git_duplicate_detection_evidence");
 const detection=freeze({framework:optionalLabel(input.detection.framework,"framework"),contentSource:optionalLabel(input.detection.contentSource,"content_source"),evidencePaths:Object.freeze(evidencePaths)});
 const change=freeze({workingBranch,patches:Object.freeze(patches),pullRequestRequired:true as const,directDefaultBranchWrite:false as const});
 const ciObservation=freeze({repository,ref:workingBranch,commitSha:baseCommitSha,readOnly:true as const});
 const base={version:UGP_GIT_CONNECTOR_VERSION,descriptor:input.descriptor,repository:freeze({repository,defaultBranch,baseCommitSha}),detection,change,ciObservation,semantics:SEM};
 return freeze({...base,planFingerprint:hash({purpose:"ugp_controlled_git_plan",...base})});
}
export function assertControlledGitPlanIntegrity(plan:ControlledGitPlan):void{if(!plan||typeof plan!=="object"||plan.version!==UGP_GIT_CONNECTOR_VERSION)throw new Error("ugp_git_invalid_plan");const rebuilt=buildControlledGitPlan({descriptor:plan.descriptor,repository:plan.repository.repository,defaultBranch:plan.repository.defaultBranch,baseCommitSha:plan.repository.baseCommitSha,workingBranch:plan.change.workingBranch,detection:plan.detection,patches:plan.change.patches});if(stable(rebuilt)!==stable(plan))throw new Error("ugp_git_plan_integrity_failed");}
