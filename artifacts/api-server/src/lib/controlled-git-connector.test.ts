import assert from "node:assert/strict";
import test from "node:test";
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
test("UGP-4.3 builds deterministic PR-only plans",()=>{const a=buildControlledGitPlan(input),b=buildControlledGitPlan(input);assert.deepEqual(a,b);assert.equal(a.change.directDefaultBranchWrite,false);assert.equal(a.change.pullRequestRequired,true);assert.equal(a.ciObservation.readOnly,true);assert.equal(a.semantics.networkEnabled,false);assert.equal(a.semantics.grantsAuthorization,false);assertControlledGitPlanIntegrity(a);});
test("UGP-4.3 denies default branch mutation",()=>assert.throws(()=>buildControlledGitPlan({...input,workingBranch:"main"}),/ugp_git_default_branch_write_denied/));
test("UGP-4.3 denies traversal and duplicate targets",()=>{assert.throws(()=>buildControlledGitPlan({...input,patches:[{...input.patches[0]!,path:"../x"}]}),/ugp_git_invalid_path/);assert.throws(()=>buildControlledGitPlan({...input,patches:[input.patches[0]!,input.patches[0]!]}),/ugp_git_duplicate_file_target/);});
test("UGP-4.3 denies wrong connector kind",()=>assert.throws(()=>buildControlledGitPlan({...input,descriptor:{...descriptor,connectorKind:"openapi"} as typeof descriptor})));
