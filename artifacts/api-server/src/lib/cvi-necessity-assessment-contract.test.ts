import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assessCviContentNecessity,
  type CviNecessityAssessmentInput,
} from "./cvi-necessity-assessment-contract.js";
import {
  UGP_CONTENT_OPPORTUNITY_MODEL_VERSION,
  UGP_CONTENT_OPPORTUNITY_MODEL_POLICY,
  type ContentOpportunity,
  type ContentOpportunityModelResult,
} from "./content-opportunity-model-contract.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

const fp = (num: number) => num.toString(16).padStart(64, "0");

function model(action: ContentOpportunity["recommendedAction"], coverage: ContentOpportunity["existingCoverage"] = "no_matching_topic_evidence_in_supplied_scope"): ContentOpportunityModelResult {
  const opportunity: ContentOpportunity = {
    opportunityId: "opportunity-1",
    opportunityFingerprint: fp(12),
    clusterFingerprint: fp(16),
    representativeKeyword: "reliable research topic",
    targetTopic: "reliable research topic",
    searchIntent: "mixed",
    recommendedContentType: "article_or_guide",
    recommendedAction: action,
    existingCoverage: coverage,
    cannibalizationState: "no_matching_cluster_query_evidence",
    businessRelevance: {
      relevance: 0.8,
      rationaleCode: "synthetic_business_relevance",
      evidenceFingerprint: fp(17),
    },
    evidence: {
      topicClusteringFingerprint: fp(18),
      coverageAssessmentFingerprint: fp(19),
      cannibalizationAssessmentFingerprint: fp(20),
      businessRelevanceEvidenceFingerprint: fp(21),
    },
    expectedMeasurement: {
      method: "ongoing_search_observation",
      causalAttribution: false,
    },
    limitations: [],
    rationale: [],
  };
  const base = {
    version: UGP_CONTENT_OPPORTUNITY_MODEL_VERSION,
    market: {} as ContentOpportunityModelResult["market"],
    policy: UGP_CONTENT_OPPORTUNITY_MODEL_POLICY,
    provenance: {} as ContentOpportunityModelResult["provenance"],
    opportunities: [opportunity],
    summary: {} as ContentOpportunityModelResult["summary"],
    semantics: {
      readOnly: true,
      deterministic: true,
      evidenceBacked: true,
      grantsAuthorization: false,
      grantsProviderWrite: false,
      grantsPublicSiteWrite: false,
      performsNetworkOperation: false,
      performsPersistence: false,
      publicationAuthorized: false,
      executionAuthorized: false,
      causalAttribution: false,
    } as const,
  };
  return {
    ...base,
    opportunityModelFingerprint: stableEvidenceHash({ purpose: "ugp_content_opportunity_model_result", ...base }),
  };
}

function input(action: ContentOpportunity["recommendedAction"] = "create_candidate"): CviNecessityAssessmentInput {
  return {
    model: model(action),
    opportunityId: "opportunity-1",
    tenantId: "tenant-1",
    siteId: "site-1",
    siteBindingEvidenceFingerprint: fp(13),
    editorialEvidenceFingerprints: [fp(15), fp(14), fp(14)],
    hasVerifiedBusinessTruth: true,
    hasVerifiedOriginalContribution: true,
    unresolvedConflicts: false,
  };
}

test("stable fingerprint ignores editorial evidence order and duplicates", () => {
  const base = input();
  const result = assessCviContentNecessity(base);
  const reordered = assessCviContentNecessity({
    ...base,
    editorialEvidenceFingerprints: [fp(14), fp(15)],
  });
  assert.equal(result.assessmentFingerprint, reordered.assessmentFingerprint);
  assert.deepEqual(result.editorialEvidenceFingerprints, [fp(14), fp(15)]);
  assert.equal(result.disposition, "PROCEED_TO_RESEARCH");
  assert.equal(result.semantics.publicationAuthorized, false);
  assert.equal(result.semantics.executionAuthorized, false);
  assert.equal(result.evidenceTrust.assertionProvenance, "caller_supplied_unverified");
  assert.equal(result.evidenceTrust.independentlyCertified, false);
  assert.equal(result.evidenceTrust.mustRevalidateBeforeGenerationOrPublication, true);
});

test("evidence fingerprint mutation changes identity", () => {
  const base = input();
  assert.notEqual(
    assessCviContentNecessity(base).assessmentFingerprint,
    assessCviContentNecessity({ ...base, editorialEvidenceFingerprints: [fp(22)] }).assessmentFingerprint,
  );
});

test("upstream defer remains request for evidence", () => {
  assert.equal(assessCviContentNecessity(input("defer_insufficient_evidence")).disposition, "REQUEST_EVIDENCE");
});

test("leave alone cannot become generation", () => {
  assert.equal(assessCviContentNecessity(input("leave_alone")).disposition, "NO_ACTION");
  const case2 = input("leave_alone");
  assert.equal(assessCviContentNecessity({
    ...case2, model: model("leave_alone", "material_search_coverage_observed"),
  }).disposition, "PRESERVE");
});

test("consolidation and unresolved conflict require review", () => {
  assert.equal(assessCviContentNecessity(input("consolidate_candidate")).disposition, "REVIEW_REQUIRED");
  const base = input();
  assert.equal(assessCviContentNecessity({ ...base, unresolvedConflicts: true }).disposition, "REVIEW_REQUIRED");
});

test("missing verified contribution or business facts cannot pass", () => {
  const base = input();
  assert.equal(assessCviContentNecessity({ ...base, hasVerifiedBusinessTruth: false }).disposition, "REQUEST_EVIDENCE");
  assert.equal(assessCviContentNecessity({ ...base, hasVerifiedOriginalContribution: false }).disposition, "REQUEST_EVIDENCE");
  assert.equal(assessCviContentNecessity({ ...base, editorialEvidenceFingerprints: [] }).disposition, "REQUEST_EVIDENCE");
});

test("reject invalid binding, invalid evidence, missing opportunity or modified upstream fingerprint", () => {
  const base = input();
  assert.throws(() => assessCviContentNecessity({ ...base, tenantId: "invalid tenant" }));
  assert.throws(() => assessCviContentNecessity({ ...base, editorialEvidenceFingerprints: ["not-a-hash"] }));
  assert.throws(() => assessCviContentNecessity({ ...base, opportunityId: "unknown" }));
  assert.throws(() => assessCviContentNecessity({
    ...base,
    model: { ...base.model, opportunityModelFingerprint: fp(99) },
  }));
});


test("business and contribution assertions are bound to the report identity", () => {
  const base = input();
  const accepted = assessCviContentNecessity(base);
  const unverifiedBusiness = assessCviContentNecessity({ ...base, hasVerifiedBusinessTruth: false });
  const unverifiedContribution = assessCviContentNecessity({ ...base, hasVerifiedOriginalContribution: false });
  assert.notEqual(accepted.assessmentFingerprint, unverifiedBusiness.assessmentFingerprint);
  assert.notEqual(accepted.assessmentFingerprint, unverifiedContribution.assessmentFingerprint);
  assert.equal(accepted.assessmentInputs.hasVerifiedBusinessTruth, true);
  assert.equal(accepted.assessmentInputs.hasVerifiedOriginalContribution, true);
  assert.equal(unverifiedBusiness.disposition, "REQUEST_EVIDENCE");
});

test("all dispositions remain advisory without network, provider or publication authority", () => {
  for (const action of ["create_candidate", "refresh_candidate", "consolidate_candidate", "leave_alone", "defer_insufficient_evidence"] as const) {
    const result = assessCviContentNecessity(input(action));
    assert.equal(result.semantics.publicationAuthorized, false);
    assert.equal(result.semantics.executionAuthorized, false);
    assert.equal(result.semantics.requiresSeparateAuthorization, true);
    assert.equal(result.evidenceTrust.independentlyCertified, false);
    assert.equal(result.semantics.performsNetworkOperation, false);
    assert.equal(result.semantics.performsPersistence, false);
  }
});

test("malformed upstream action never promotes to research", () => {
  const base = input();
  const altered = {
    ...base.model,
    opportunities: [{ ...base.model.opportunities[0], recommendedAction: "unsafe_action" as ContentOpportunity["recommendedAction"] }],
  };
  const { opportunityModelFingerprint: _previous, ...withoutFingerprint } = altered;
  const forgedModel = {
    ...withoutFingerprint,
    opportunityModelFingerprint: stableEvidenceHash({ purpose: "ugp_content_opportunity_model_result", ...withoutFingerprint }),
  };
  assert.throws(() => assessCviContentNecessity({ ...base, model: forgedModel }), /cvi_invalid_upstream_action/);
});

test("provider-free contract excludes IO, environment, timers and persistence", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(here, "cvi-necessity-assessment-contract.ts"), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(source, /\b(?:insertInto|updateTable|deleteFrom|persistRecord)\b/);
  assert.doesNotMatch(source, /setTimeout|setInterval|queueMicrotask|Date\.now|Math\.random/);
});
