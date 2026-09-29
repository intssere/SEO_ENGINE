import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { buildUniversalConnectorDescriptor } from "./universal-connector-contract.js";
import { buildUniversalCapabilityRegistry } from "./universal-capability-registry.js";
import { buildUniversalConnectionIdentity, buildUniversalSiteIdentity } from "./universal-site-resource-identity.js";
import { buildControlledGitPlan } from "./controlled-git-connector.js";
import { attestGitCertification } from "./git-certification-attestation.js";

const fixtureContent = `# UGP-4.7 live Git certification fixture

This file exists only to certify the bounded Git-backed custom-site PR lifecycle defined by Issue #653.

- Repository: intssere/SEO_ENGINE
- Base initiative commit: 1441871b303143e647df19e5ef9233a6ae57b6d2
- Observed source path: docs/universal-growth-platform/UGP-4.7-GIT-CERTIFICATION-CONTRACT.md
- Observed source blob: 7e13efaa3c83585571f87c4db59a346a4384d5e3
- Working branch: ugp-047-live-certification-fixture
- Target branch: initiative-universal-growth-platform
- Mutation scope: this fixture file only
- Direct default-branch write: false
- Force push: false
- Merge authorization: absent
- Deployment/publication: false

The pull request containing this file must remain unmerged during live certification.
`;
const proposedContentFingerprint=createHash("sha256").update(fixtureContent).digest("hex");

const site=buildUniversalSiteIdentity({siteId:"ugp-047-git-certification",canonicalOrigin:"https://github.com"});
const connection=buildUniversalConnectionIdentity({site,connectionId:"github-certification",provider:"github",externalAccountId:"intssere/SEO_ENGINE",connectionMode:"git"});
const registry=buildUniversalCapabilityRegistry({provider:"github",connectorVersion:"git-v1",site,connection,credentialProfileId:"captured-evidence-only",capabilities:[
 {capability:"git.branch",resourceKinds:["page"],verification:"required",rollback:"unsupported",maxOperationsPerRequest:1,maxPayloadBytes:1000000},
 {capability:"git.commit",resourceKinds:["page"],verification:"required",rollback:"supported",maxOperationsPerRequest:1,maxPayloadBytes:1000000},
 {capability:"git.pull_request",resourceKinds:["page"],verification:"required",rollback:"unsupported",maxOperationsPerRequest:1,maxPayloadBytes:1000000},
 {capability:"read.metadata",resourceKinds:["page"],verification:"not_applicable",rollback:"not_applicable",maxOperationsPerRequest:10,maxPayloadBytes:1000000}
]});
const descriptor=buildUniversalConnectorDescriptor({connectorId:"ugp-047-git-certification",connectorKind:"git",registry});
const plan=buildControlledGitPlan({
 descriptor,
 repository:"intssere/SEO_ENGINE",
 defaultBranch:"main",
 baseCommitSha:"1441871b303143e647df19e5ef9233a6ae57b6d2",
 workingBranch:"ugp-047-live-certification-fixture",
 detection:{framework:null,contentSource:"Markdown",evidencePaths:["docs/universal-growth-platform/UGP-4.7-GIT-CERTIFICATION-CONTRACT.md"]},
 patches:[{
  path:"docs/universal-growth-platform/fixtures/UGP-4.7-LIVE-GIT-CERTIFICATION-FIXTURE.md",
  expectedBlobSha:null,
  proposedContentFingerprint
 }]
});
const receipt=attestGitCertification({plan,evidence:{
 repository:"intssere/SEO_ENGINE",
 defaultBranch:"main",
 baseCommitSha:"1441871b303143e647df19e5ef9233a6ae57b6d2",
 filePath:"docs/universal-growth-platform/UGP-4.7-GIT-CERTIFICATION-CONTRACT.md",
 observedBlobSha:"7e13efaa3c83585571f87c4db59a346a4384d5e3",
 changePath:"docs/universal-growth-platform/fixtures/UGP-4.7-LIVE-GIT-CERTIFICATION-FIXTURE.md",
 resultingBlobSha:"f0c4b148b2e9eb753d694b1728d0c67ca6310b4d",
 workingBranch:"ugp-047-live-certification-fixture",
 resultingCommitSha:"438aa79caaeb2b07d38400749b36a500c6695aef",
 pullRequestNumber:656,
 pullRequestHeadSha:"438aa79caaeb2b07d38400749b36a500c6695aef",
 ciCommitSha:"438aa79caaeb2b07d38400749b36a500c6695aef",
 ciConclusion:"success",
 proposedContentFingerprint
}});

test("UGP-4.7 captured live evidence produces an inert deterministic create-file receipt",()=>{
 assert.equal(proposedContentFingerprint,"96cad6fb3a3f7b9a44be5e87c9659a9c2fc9634c83413d2714d3c2f74785123e");
 assert.equal(receipt.repositoryRead.path,"docs/universal-growth-platform/UGP-4.7-GIT-CERTIFICATION-CONTRACT.md");
 assert.equal(receipt.repositoryRead.blobSha,"7e13efaa3c83585571f87c4db59a346a4384d5e3");
 assert.equal(receipt.patch.path,"docs/universal-growth-platform/fixtures/UGP-4.7-LIVE-GIT-CERTIFICATION-FIXTURE.md");
 assert.equal(receipt.patch.expectedBlobSha,null);
 assert.equal(receipt.patch.resultingBlobSha,"f0c4b148b2e9eb753d694b1728d0c67ca6310b4d");
 assert.equal(receipt.change.pullRequestNumber,656);
 assert.equal(receipt.change.mergePerformed,false);
 assert.equal(receipt.assertions.networkCalls,false);
 assert.equal(receipt.assertions.credentials,false);
 console.log("UGP_4_7_PLAN_FINGERPRINT="+receipt.planFingerprint);
 console.log("UGP_4_7_RECEIPT_FINGERPRINT="+receipt.receiptFingerprint);
});
