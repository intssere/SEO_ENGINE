import assert from "node:assert/strict";
import test from "node:test";
import { assessCviEditorialEvidence, type CviEditorialCandidate } from "./cvi-editorial-evidence-gate.js";

const candidate: CviEditorialCandidate = {
  candidateId: "candidate-1", siteId: "site-1", contentFingerprint: "a".repeat(64),
  necessityStatus: "supported", factualFreshnessStatus: "current",
  originalityStatus: "reviewed",
  sources: [
    {sourceId: "source-1",url:"https://source-one.test/report",accessedAt:"2026-10-09T04:00:00Z",
      independentPublisherId:"publisher-1",evidenceStatus:"verified_excerpt",licensingStatus:"cleared"},
    {sourceId: "source-2",url:"https://source-two.test/report",accessedAt:"2026-10-09T04:00:00Z",
      independentPublisherId:"publisher-2",evidenceStatus:"verified_excerpt",licensingStatus:"cleared"},
  ],
  claims:[{claimId:"claim-1",statement:"A material and externally reviewable fact",
    sourceIds:["source-1","source-2"],material:true,status:"supported"}],
  humanReview:{decision:"approved",reviewerId:"editor-1",decisionAt:"2026-10-09T04:01:00Z"},
};
const check = (patch: Partial<CviEditorialCandidate> = {}) =>
  assessCviEditorialEvidence({...candidate,...patch});
test("even all declared checks and editor approval never grant publication",()=>{
  const r=check();
  assert.equal(r.status,"READY_FOR_GOVERNED_INTEGRATION_REVIEW");
  assert.equal(r.factualTruthIndependentlyProven,false);
  assert.equal(r.authorizationGranted,false);
  assert.equal(r.executionAuthorized,false);
  assert.equal(r.publicationAuthorized,false);
  assert.match(r.candidateFingerprint,/^[a-f0-9]{64}$/);
});
test("unverified material claims require editorial review",()=>{
  assert.equal(check({claims:[{...candidate.claims[0]!,sourceIds:["source-1"]}]}).status,"NEEDS_HUMAN_REVIEW");
  assert.equal(check({claims:[{...candidate.claims[0]!,status:"unverified"}]}).status,"NEEDS_HUMAN_REVIEW");
  assert.equal(check({humanReview:{decision:"pending",reviewerId:null,decisionAt:null}}).status,"NEEDS_HUMAN_REVIEW");
  assert.equal(check({factualFreshnessStatus:"unknown"}).status,"NEEDS_HUMAN_REVIEW");
});
test("contested claim, stale business facts and restricted source reject",()=>{
  assert.equal(check({claims:[{...candidate.claims[0]!,status:"contested"}]}).status,"REJECT");
  assert.equal(check({factualFreshnessStatus:"stale"}).status,"REJECT");
  assert.equal(check({sources:[{...candidate.sources[0]!,licensingStatus:"restricted"},candidate.sources[1]!]}).status,"REJECT");
  assert.equal(check({humanReview:{decision:"rejected",reviewerId:"editor-1",decisionAt:"2026-10-09T04:01:00Z"}}).status,"REJECT");
});
test("absent cited source and duplicated source IDs reject",()=>{
  assert.equal(check({claims:[{...candidate.claims[0]!,sourceIds:["source-1","unknown"]}]}).status,"REJECT");
  assert.equal(check({sources:[candidate.sources[0]!,candidate.sources[0]!]}).status,"REJECT");
});
test("unverified rights or source excerpts require review, not execution",()=>{
  assert.equal(check({sources:[{...candidate.sources[0]!,licensingStatus:"unknown"},candidate.sources[1]!]}).status,"NEEDS_HUMAN_REVIEW");
  assert.equal(check({sources:[{...candidate.sources[0]!,evidenceStatus:"unverified"},candidate.sources[1]!]}).status,"NEEDS_HUMAN_REVIEW");
});
