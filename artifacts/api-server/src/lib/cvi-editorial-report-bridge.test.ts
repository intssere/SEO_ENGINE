import assert from "node:assert/strict";
import test from "node:test";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import { CVI_BUSINESS_TRUTH_FRESHNESS_VERSION, type CviBusinessTruthFreshnessReport } from "./cvi-business-truth-freshness-contract.js";
import { CVI_CLAIM_PROVENANCE_VERSION, type CviClaimProvenanceReport } from "./cvi-claim-provenance-contract.js";
import { type CviEditorialCandidate } from "./cvi-editorial-evidence-gate.js";
import { bridgeCviEditorialEvidenceReports } from "./cvi-editorial-report-bridge.js";

const fp = (c: string) => c.repeat(64);
const binding = fp("b");
const businessBase = {
  version: CVI_BUSINESS_TRUTH_FRESHNESS_VERSION,
  bindingFingerprint: binding, evaluatedAt: "2026-10-09T04:00:00.000Z",
  scope: {tenantId:"tenant-1",siteId:"site-1",siteBindingEvidenceFingerprint:fp("c")},
  facts:[{factKey:"price",evidenceFingerprint:fp("a"),observedAt:"2026-10-09T03:00:00.000Z",
    expiresAt:"2026-10-10T03:00:00.000Z",status:"EVIDENCE_LINKED_CURRENT"}],
  status:"RESEARCH_REVIEW_ONLY",
  trust:{evidenceLinkedNotFactuallyCertified:true,tenantAuthorityIndependentlyVerified:false,
    businessTruthIndependentlyVerified:false,permissionToPublish:false},
  semantics:{deterministic:true,readOnly:true,networkCalls:false,persistence:false,
    executionAuthorized:false,publicationAuthorized:false},
};
const provenanceBase = {
  version:CVI_CLAIM_PROVENANCE_VERSION,
  sourceBindingFingerprint:binding,sourceLedgerFingerprint:fp("d"),
  claims:[{claimKey:"claim-1",evidenceStatus:"REFERENCE_LINKED",
    contributionStatus:"DOCUMENTED_CANDIDATE",evidenceFingerprints:[fp("a")],
    missingEvidenceFingerprints:[],contributionEvidenceFingerprints:[fp("a")]}],
  disposition:"RESEARCH_REVIEW_ONLY",
  trust:{sourceReferenceIntegrityChecked:true,claimsIndependentlyVerified:false,
    originalityIndependentlyVerified:false,licensingIndependentlyVerified:false,
    reviewerAuthorityVerified:false,tenantAuthorityVerified:false},
  semantics:{deterministic:true,readOnly:true,publicationAuthorized:false,
    executionAuthorized:false,performsNetworkOperation:false,performsPersistence:false},
};
function signed<T extends Record<string,unknown>>(o:T,version:string) {
  return {...o,reportFingerprint:stableEvidenceHash({purpose:version,...o})};
}
const business = signed(businessBase,CVI_BUSINESS_TRUTH_FRESHNESS_VERSION) as unknown as CviBusinessTruthFreshnessReport;
const provenance = signed(provenanceBase,CVI_CLAIM_PROVENANCE_VERSION) as unknown as CviClaimProvenanceReport;
const candidate: CviEditorialCandidate = {
  candidateId:"candidate-1",siteId:"site-1",contentFingerprint:fp("e"),
  necessityStatus:"supported",factualFreshnessStatus:"current",originalityStatus:"reviewed",
  claims:[{claimId:"claim-1",statement:"Reviewable stated business fact",
    sourceIds:["s1","s2"],material:true,status:"supported"}],
  sources:[
    {sourceId:"s1",url:"https://publisher1.test",accessedAt:"2026-10-09T04:00:00Z",
      independentPublisherId:"p1",evidenceStatus:"verified_excerpt",licensingStatus:"cleared"},
    {sourceId:"s2",url:"https://publisher2.test",accessedAt:"2026-10-09T04:00:00Z",
      independentPublisherId:"p2",evidenceStatus:"verified_excerpt",licensingStatus:"cleared"},
  ],
  humanReview:{decision:"approved",reviewerId:"editor-1",decisionAt:"2026-10-09T04:00:00Z"},
};
const base = {candidate,businessReport:business,provenanceReport:provenance,
  expectedSiteId:"site-1",expectedTenantId:"tenant-1",expectedSourceBindingFingerprint:binding};
test("matching report identities yield only research and human review, never execution",()=>{
 const r=bridgeCviEditorialEvidenceReports(base);
 assert.equal(r.status,"RESEARCH_AND_HUMAN_REVIEW_ONLY");
 assert.deepEqual(r.reasons,[]);
 assert.equal(r.externalFactsIndependentlyVerified,false);
 assert.equal(r.tenantAccessIndependentlyVerified,false);
 assert.equal(r.executionAuthorized,false);
 assert.equal(r.publicationAuthorized,false);
 assert.equal(r.outputFingerprint,bridgeCviEditorialEvidenceReports(base).outputFingerprint);
});
test("scope and lineage mismatches block",()=>{
 assert.equal(bridgeCviEditorialEvidenceReports({...base,expectedTenantId:"tenant-2"}).status,"BLOCKED");
 assert.equal(bridgeCviEditorialEvidenceReports({...base,expectedSourceBindingFingerprint:fp("f")}).status,"BLOCKED");
 assert.equal(bridgeCviEditorialEvidenceReports({...base,candidate:{...candidate,siteId:"other"}}).status,"BLOCKED");
});
test("tampered provenance or business reports block",()=>{
 const r=bridgeCviEditorialEvidenceReports({...base,
  provenanceReport:{...provenance,disposition:"BLOCKED"}});
 assert.equal(r.status,"BLOCKED");
 assert.ok(r.reasons.includes("provenance_integrity_mismatch"));
 assert.equal(bridgeCviEditorialEvidenceReports({...base,
  businessReport:{...business,status:"BLOCKED"}}).status,"BLOCKED");
});
test("editorial claim must be bound to upstream reference-linked claim",()=>{
 const r=bridgeCviEditorialEvidenceReports({...base,
  candidate:{...candidate,claims:[{...candidate.claims[0]!,claimId:"wrong-claim"}]}});
 assert.equal(r.status,"BLOCKED");
 assert.ok(r.reasons.includes("editorial_claims_not_bound_to_provenance"));
});
test("contested declarations block even when reports look valid",()=>{
 const r=bridgeCviEditorialEvidenceReports({...base,
  candidate:{...candidate,claims:[{...candidate.claims[0]!,status:"contested"}]}});
 assert.equal(r.status,"BLOCKED");
 assert.equal(r.publicationAuthorized,false);
});
