import assert from "node:assert/strict";
import test from "node:test";
import { buildUniversalConnectorDescriptor } from "./universal-connector-contract.js";
import { buildUniversalCapabilityRegistry } from "./universal-capability-registry.js";
import { buildUniversalConnectionIdentity, buildUniversalSiteIdentity } from "./universal-site-resource-identity.js";
import { buildControlledGitPlan } from "./controlled-git-connector.js";
import { attestGitCertification } from "./git-certification-attestation.js";
const site=buildUniversalSiteIdentity({siteId:"site-1",canonicalOrigin:"https://example.com"});
const connection=buildUniversalConnectionIdentity({site,connectionId:"github-primary",provider:"github",externalAccountId:"owner/repo",connectionMode:"git"});
const registry=buildUniversalCapabilityRegistry({provider:"github",connectorVersion:"git-v1",site,connection,credentialProfileId:"profile",capabilities:[
 {capability:"git.branch",resourceKinds:["page"],verification:"required",rollback:"unsupported",maxOperationsPerRequest:10,maxPayloadBytes:1000000},
 {capability:"git.commit",resourceKinds:["page"],verification:"required",rollback:"supported",maxOperationsPerRequest:10,maxPayloadBytes:1000000},
 {capability:"git.pull_request",resourceKinds:["page"],verification:"required",rollback:"unsupported",maxOperationsPerRequest:10,maxPayloadBytes:1000000},
 {capability:"read.metadata",resourceKinds:["page"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:10,maxPayloadBytes:1000000}]});
const descriptor=buildUniversalConnectorDescriptor({connectorId:"git-cert",connectorKind:"git",registry});
const plan=buildControlledGitPlan({descriptor,repository:"owner/repo",defaultBranch:"main",baseCommitSha:"a".repeat(40),workingBranch:"ugp-cert/test",detection:{framework:"Next.js",contentSource:"MDX",evidencePaths:["package.json","content/a.mdx"]},patches:[{path:"content/a.mdx",expectedBlobSha:"b".repeat(40),proposedContentFingerprint:"c".repeat(64)}]});
const evidence={repository:"owner/repo",defaultBranch:"main",baseCommitSha:"a".repeat(40),filePath:"content/a.mdx",observedBlobSha:"b".repeat(40),workingBranch:"ugp-cert/test",resultingCommitSha:"d".repeat(40),pullRequestNumber:42,pullRequestHeadSha:"d".repeat(40),ciCommitSha:"d".repeat(40),ciConclusion:"success" as const,proposedContentFingerprint:"c".repeat(64)};
test("UGP-4.7 deterministic inert receipt",()=>{const a=attestGitCertification({plan,evidence}),b=attestGitCertification({plan,evidence});assert.deepEqual(a,b);assert.equal(a.change.defaultBranchWrite,false);assert.equal(a.change.mergePerformed,false);assert.equal(a.assertions.networkCalls,false);});
test("UGP-4.7 repository drift fails closed",()=>assert.throws(()=>attestGitCertification({plan,evidence:{...evidence,baseCommitSha:"e".repeat(40)}}),/repository_state_drift/));
test("UGP-4.7 blob drift fails closed",()=>assert.throws(()=>attestGitCertification({plan,evidence:{...evidence,observedBlobSha:"e".repeat(40)}}),/patch_drift/));
test("UGP-4.7 CI head drift fails closed",()=>assert.throws(()=>attestGitCertification({plan,evidence:{...evidence,ciCommitSha:"e".repeat(40)}}),/head_or_ci_drift/));
test("UGP-4.7 default branch fails closed",()=>assert.throws(()=>attestGitCertification({plan,evidence:{...evidence,workingBranch:"main"}}),/branch_drift/));
