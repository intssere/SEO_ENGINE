import assert from "node:assert/strict";
import test from "node:test";
import { reviewUGP47GitEvidence } from "./ugp-4-7-offline-git-evidence.js";

const oid = (x: string) => x.repeat(40);
const dig = (x: string) => x.repeat(64);
function fixture() {
  const repositoryId = 1234;
  const baseSha = oid("a"), blobSha = oid("b"), headSha = oid("c");
  return {
    target: { host:"github.com",repositoryId,owner:"sample",repo:"website",installationId:44,defaultBranch:"main",allowedPath:"content/page.md" },
    read: { repositoryId,baseRef:"main",baseSha,path:"content/page.md",mode:"100644",blobSha,contentDigest:dig("d") },
    patch: { repositoryId,expectedBaseSha:baseSha,path:"content/page.md",expectedBlobSha:blobSha,beforeDigest:dig("d"),
      afterDigest:dig("e"),patchDigest:dig("f"),workingBranch:"ugp47/test-read-pr" },
    commit: { repositoryId,branch:"ugp47/test-read-pr",sha:headSha,parentSha:baseSha,treeSha:oid("d"),
      path:"content/page.md",beforeBlobSha:blobSha,afterBlobSha:oid("e"),afterDigest:dig("e") },
    pr: { repositoryId,number:7,baseRef:"main",baseSha,headRef:"ugp47/test-read-pr",headSha,merged:false,autoMergeEnabled:false },
    ci: { repositoryId,headSha,workflowId:15,runId:900,status:"completed",conclusion:"success",
      requiredChecks:[{name:"validate",headSha,conclusion:"success"}] }
  };
}
const inspect = (x: unknown) => reviewUGP47GitEvidence(JSON.stringify(x));
const denied = (x: unknown) => {
  const v = reviewUGP47GitEvidence(x);
  assert.equal(v.status,"INCOMPLETE_OR_UNSAFE");
  assert.equal(v.gitReadAuthorized,false);
  assert.equal(v.gitWriteAuthorized,false);
  assert.equal(v.mergeAuthorized,false);
  assert.equal(v.deploymentAuthorized,false);
  assert.equal(v.independentlyCertified,false);
};
test("one coherent synthetic chain is only structurally unverified", () => {
  const a = inspect(fixture()), b = inspect(fixture());
  assert.equal(a.status,"STRUCTURALLY_CONSISTENT_UNVERIFIED");
  assert.equal(a.evidenceDigest,b.evidenceDigest);
  assert.equal(a.gitReadAuthorized,false);
  assert.equal(a.gitWriteAuthorized,false);
  assert.equal(a.mergeAuthorized,false);
  assert.equal(a.deploymentAuthorized,false);
  assert.equal(a.independentlyCertified,false);
});
test("rejects untrusted, malformed, non-object and oversized serialized claims", () => {
  for (const x of [undefined,null,42,{},false,"","{","null","[]","x".repeat(270000)]) denied(x);
});
test("rejects repository, ref, blob, patch, commit, PR and CI drift", () => {
  const changes: ((x: ReturnType<typeof fixture>) => void)[] = [
    x => {x.target.repositoryId=1235;}, x => {x.target.installationId=0;},
    x => {x.read.repositoryId=23;}, x => {x.read.baseSha=oid("f");},
    x => {x.read.mode="120000";}, x => {x.read.blobSha=oid("f");},
    x => {x.patch.expectedBaseSha=oid("f");}, x => {x.patch.expectedBlobSha=oid("f");},
    x => {x.patch.workingBranch="main";}, x => {x.patch.workingBranch="ugp47/../x";},
    x => {x.commit.parentSha=oid("f");}, x => {x.commit.beforeBlobSha=oid("f");},
    x => {x.commit.sha=oid("f");}, x => {x.commit.afterDigest=dig("a");},
    x => {x.pr.headSha=oid("f");}, x => {x.pr.baseSha=oid("f");},
    x => {x.pr.merged=true;}, x => {x.pr.autoMergeEnabled=true;},
    x => {x.ci.headSha=oid("f");}, x => {x.ci.conclusion="neutral";},
    x => {x.ci.requiredChecks[0]!.headSha=oid("f");},
    x => {x.ci.requiredChecks[0]!.conclusion="skipped";},
    x => {x.ci.requiredChecks.push({...x.ci.requiredChecks[0]!});}
  ];
  for (const mutate of changes) {const x=fixture(); mutate(x); denied(JSON.stringify(x));}
});
test("rejects unsafe paths and extra fields", () => {
  for (const path of ["../private.txt","/root.txt","content/%2e%2e/file","content\\page.md",".git/config","content/./page.md"]) {
    const x=fixture(); x.target.allowedPath=path; x.read.path=path; x.patch.path=path; x.commit.path=path;
    denied(JSON.stringify(x));
  }
  const x=fixture(); denied(JSON.stringify({...x, executionAuthorized:true}));
});
test("rejects caller-owned objects rather than inspecting their getters", () => {
  const hostile = new Proxy(fixture(), {get(){throw Error("must not inspect");}});
  denied(hostile);
});
