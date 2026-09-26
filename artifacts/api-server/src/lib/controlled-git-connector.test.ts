import { describe, expect, it } from "vitest";
import { buildUniversalConnectorDescriptor } from "./universal-connector-contract.js";
import { buildUniversalCapabilityRegistry } from "./universal-capability-registry.js";
import { buildUniversalConnectionIdentity, buildUniversalSiteIdentity } from "./universal-site-resource-identity.js";
import { assertControlledGitPlanIntegrity, buildControlledGitPlan } from "./controlled-git-connector.js";
const site=buildUniversalSiteIdentity({siteId:"site-1",canonicalOrigin:"https://example.com"});
const connection=buildUniversalConnectionIdentity({site,connectionId:"github-primary",provider:"github",externalAccountId:"owner/repo",connectionMode:"git"});
const registry=buildUniversalCapabilityRegistry({provider:"github",connectorVersion:"git-v1",site,connection,credentialProfileId:"github-profile",capabilities:[
 {capability:"git.branch",resourceKinds:["page"],verification:"required",rollback:"unsupported",maxOperationsPerRequest:10,maxPayloadBytes:1000000},
 {capability:"git.commit",resourceKinds:["page"],verification:"required",rollback:"supported",maxOperationsPerRequest:10,maxPayloadBytes:1000000},
 {capability:"git.pull_request",resourceKinds:["page"],verification:"required",rollback:"unsupported",maxOperationsPerRequest:10,maxPayloadBytes:1000000},
 {capability:"read.metadata",resourceKinds:["page"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:10,maxPayloadBytes:1000000}
]});
const descriptor=buildUniversalConnectorDescriptor({connectorId:"git-test",connectorKind:"git",registry});
const input={descriptor,repository:"owner/repo",defaultBranch:"main",baseCommitSha:"a".repeat(40),workingBranch:"seo/fix",detection:{framework:"Next.js",contentSource:"MDX",evidencePaths:["package.json","content/a.mdx"]},patches:[{path:"content/a.mdx",expectedBlobSha:"b".repeat(40),proposedContentFingerprint:"c".repeat(64)}]};
describe("controlled git connector",()=>{it("builds deterministic PR-only plans",()=>{const a=buildControlledGitPlan(input),b=buildControlledGitPlan(input);expect(a).toEqual(b);expect(a.change.directDefaultBranchWrite).toBe(false);expect(a.change.pullRequestRequired).toBe(true);expect(a.ciObservation.readOnly).toBe(true);expect(a.semantics.networkEnabled).toBe(false);expect(a.semantics.grantsAuthorization).toBe(false);assertControlledGitPlanIntegrity(a);});it("denies default branch mutation",()=>expect(()=>buildControlledGitPlan({...input,workingBranch:"main"})).toThrow("ugp_git_default_branch_write_denied"));it("denies traversal and duplicate targets",()=>{expect(()=>buildControlledGitPlan({...input,patches:[{...input.patches[0],path:"../x"}]})).toThrow("ugp_git_invalid_path");expect(()=>buildControlledGitPlan({...input,patches:[input.patches[0],input.patches[0]]})).toThrow("ugp_git_duplicate_file_target");});it("denies wrong connector kind",()=>expect(()=>buildControlledGitPlan({...input,descriptor:{...descriptor,connectorKind:"openapi"} as typeof descriptor})).toThrow());});
