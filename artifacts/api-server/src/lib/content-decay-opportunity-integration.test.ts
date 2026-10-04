import assert from "node:assert/strict";
import test from "node:test";
import {
  UGP_CONTENT_OPPORTUNITY_MODEL_POLICY,
  UGP_CONTENT_OPPORTUNITY_MODEL_VERSION,
  type ContentOpportunity,
  type ContentOpportunityAction,
  type ContentOpportunityModelResult,
} from "./content-opportunity-model-contract.js";
import {
  buildContentDecayRefreshAssessment,
  type ContentDecayRefreshInput,
} from "./content-decay-refresh-detection.js";
import {
  UGP_DECAY_EVIDENCE_ADAPTER_VERSION,
  type ContentDecayEvidenceAdapterResult,
} from "./content-decay-evidence-adapter.js";
import {
  assertDecayOpportunityIntegrationIntegrity,
  buildDecayOpportunityIntegration,
} from "./content-decay-opportunity-integration.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

const PAGE = "https://example.com/guide";
const FP = (char: string) => char.repeat(64);

const MODEL_SEMANTICS = Object.freeze({
  readOnly: true as const,
  deterministic: true as const,
  evidenceBacked: true as const,
  grantsAuthorization: false as const,
  grantsProviderWrite: false as const,
  grantsPublicSiteWrite: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  publicationAuthorized: false as const,
  executionAuthorized: false as const,
  causalAttribution: false as const,
});

const ADAPTER_SEMANTICS = Object.freeze({
  deterministic: true as const,
  readOnly: true as const,
  evidenceTranslationOnly: true as const,
  providerAcquisition: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  grantsAuthorization: false as const,
  publicationAuthorized: false as const,
  executionAuthorized: false as const,
  providerWrites: false as const,
  publicSiteWrites: false as const,
});

function opportunity(input: {
  fingerprint: string;
  action: ContentOpportunityAction;
  relevance?: number;
  cannibalizationState?: ContentOpportunity["cannibalizationState"];
}): ContentOpportunity {
  const base = {
    clusterFingerprint: FP("c"),
    representativeKeyword: "example guide",
    targetTopic: "example guide",
    searchIntent: "informational" as const,
    recommendedContentType: "article_or_guide" as const,
    recommendedAction: input.action,
    existingCoverage: input.action === "create_candidate"
      ? "no_matching_topic_evidence_in_supplied_scope" as const
      : "search_presence_observed_below_materiality" as const,
    cannibalizationState: input.cannibalizationState
      ?? "no_material_collision_observed_in_supplied_evidence" as const,
    businessRelevance: Object.freeze({
      relevance: input.relevance ?? 0.9,
      rationaleCode: "fixture_business_relevance",
      evidenceFingerprint: FP("d"),
    }),
    evidence: Object.freeze({
      topicClusteringFingerprint: FP("e"),
      coverageAssessmentFingerprint: FP("f"),
      cannibalizationAssessmentFingerprint: FP("1"),
      businessRelevanceEvidenceFingerprint: FP("d"),
    }),
    expectedMeasurement: Object.freeze({
      method: "gsc_query_page_before_after_observational" as const,
      causalAttribution: false as const,
    }),
    limitations: Object.freeze([] as string[]),
    rationale: Object.freeze(["fixture"] as string[]),
  };
  return Object.freeze({
    opportunityId: stableEvidenceHash({
      purpose: "ugp_content_opportunity_id",
      version: UGP_CONTENT_OPPORTUNITY_MODEL_VERSION,
      clusterFingerprint: base.clusterFingerprint,
      opportunityFingerprint: input.fingerprint,
    }),
    opportunityFingerprint: input.fingerprint,
    ...base,
  });
}

function model(opportunities: readonly ContentOpportunity[]): ContentOpportunityModelResult {
  const summary = {
    create_candidate: opportunities.filter((x) => x.recommendedAction === "create_candidate").length,
    refresh_candidate: opportunities.filter((x) => x.recommendedAction === "refresh_candidate").length,
    consolidate_candidate: opportunities.filter((x) => x.recommendedAction === "consolidate_candidate").length,
    leave_alone: opportunities.filter((x) => x.recommendedAction === "leave_alone").length,
    defer_insufficient_evidence: opportunities.filter((x) => x.recommendedAction === "defer_insufficient_evidence").length,
  };
  const base = {
    version: UGP_CONTENT_OPPORTUNITY_MODEL_VERSION,
    market: {
      searchEngine: "google" as const,
      locationCode: 2840,
      languageCode: "en",
      device: "desktop" as const,
    },
    policy: UGP_CONTENT_OPPORTUNITY_MODEL_POLICY,
    provenance: Object.freeze({
      topicClusteringFingerprint: FP("e"),
      siteOwnershipEvidenceFingerprint: FP("2"),
      cannibalizationFingerprint: FP("3"),
      coverageFingerprint: FP("4"),
    }),
    opportunities: Object.freeze([...opportunities]),
    summary: Object.freeze(summary),
    semantics: MODEL_SEMANTICS,
  };
  return Object.freeze({
    ...base,
    opportunityModelFingerprint: stableEvidenceHash({
      purpose: "ugp_content_opportunity_model_result",
      ...base,
    }),
  });
}

function decayAdapter(input: {
  opportunityFingerprint: string | null;
  classification?: "refresh_candidate" | "watch";
  pageUrl?: string;
}): ContentDecayEvidenceAdapterResult {
  const pageUrl = input.pageUrl ?? PAGE;
  let mappedInput: ContentDecayRefreshInput;
  if (input.classification === "watch") {
    mappedInput = {
      pageUrl,
      pageIdentityFingerprint: FP("5"),
      contentOpportunityFingerprint: input.opportunityFingerprint,
      gsc: {
        before: {
          startDate: "2026-01-01",
          endDate: "2026-01-28",
          clicks: 100,
          impressions: 1000,
          ctr: 0.1,
          position: 5,
          evidenceFingerprint: FP("6"),
        },
        after: {
          startDate: "2026-02-01",
          endDate: "2026-02-28",
          clicks: 70,
          impressions: 900,
          ctr: 70 / 900,
          position: 6,
          evidenceFingerprint: FP("7"),
        },
      },
      freshness: {
        evaluatedDate: "2026-03-01",
        lastMeaningfulUpdateDate: "2026-02-01",
        ageDays: 28,
        evidenceFingerprint: FP("8"),
      },
    };
  } else {
    mappedInput = {
      pageUrl,
      pageIdentityFingerprint: FP("5"),
      contentOpportunityFingerprint: input.opportunityFingerprint,
      gsc: {
        before: {
          startDate: "2026-01-01",
          endDate: "2026-01-28",
          clicks: 100,
          impressions: 1000,
          ctr: 0.1,
          position: 5,
          evidenceFingerprint: FP("6"),
        },
        after: {
          startDate: "2026-02-01",
          endDate: "2026-02-28",
          clicks: 60,
          impressions: 700,
          ctr: 60 / 700,
          position: 9,
          evidenceFingerprint: FP("7"),
        },
      },
      serpChange: {
        beforeEvidenceFingerprint: FP("8"),
        afterEvidenceFingerprint: FP("9"),
        materiallyChanged: true,
        evidenceFingerprint: FP("a"),
      },
    };
  }

  const assessment = buildContentDecayRefreshAssessment(mappedInput);
  const base = {
    version: UGP_DECAY_EVIDENCE_ADAPTER_VERSION,
    pageUrl,
    mappedInput,
    assessment,
    adapterLimitations: Object.freeze([
      "freshness_evidence_adapter_not_available",
      "per_url_content_change_evidence_adapter_not_available",
    ]),
    evidenceBindings: Object.freeze({
      gscBeforeObservationFingerprint: FP("b"),
      gscAfterObservationFingerprint: FP("c"),
      serpBeforeRankingFingerprint: input.classification === "watch" ? null : FP("d"),
      serpAfterRankingFingerprint: input.classification === "watch" ? null : FP("e"),
    }),
    semantics: ADAPTER_SEMANTICS,
  };
  return Object.freeze({
    ...base,
    adapterFingerprint: stableEvidenceHash({
      purpose: "ugp_content_decay_evidence_adapter",
      ...base,
    }),
  });
}

test("bound refresh evidence suppresses a net-new create and projects refresh", () => {
  const op = opportunity({ fingerprint: FP("1"), action: "create_candidate" });
  const result = buildDecayOpportunityIntegration({
    opportunityModel: model([op]),
    decayEvidence: [decayAdapter({ opportunityFingerprint: op.opportunityFingerprint })],
  });

  assert.equal(result.projections[0]!.originalAction, "create_candidate");
  assert.equal(result.projections[0]!.projectedAction, "refresh_candidate");
  assert.equal(result.projections[0]!.createSuppressedByRefreshEvidence, true);
  assert.equal(result.summary.createCandidatesSuppressedByRefreshEvidence, 1);
  assert.equal(result.summary.projectedCreateCandidate, 0);
  assert.equal(result.summary.projectedRefreshCandidate, 1);
  assertDecayOpportunityIntegrationIntegrity(result);
});

test("cannibalization guard preserves consolidation over decay refresh", () => {
  const op = opportunity({
    fingerprint: FP("2"),
    action: "consolidate_candidate",
    cannibalizationState: "exact_query_collision_detected",
  });
  const result = buildDecayOpportunityIntegration({
    opportunityModel: model([op]),
    decayEvidence: [decayAdapter({ opportunityFingerprint: op.opportunityFingerprint })],
  });

  assert.equal(result.projections[0]!.projectedAction, "consolidate_candidate");
  assert.ok(result.projections[0]!.rationale.includes(
    "cannibalization_guard_preserves_consolidation_over_refresh",
  ));
});

test("business relevance guard prevents a low-relevance decay page from becoming a refresh action", () => {
  const op = opportunity({
    fingerprint: FP("3"),
    action: "leave_alone",
    relevance: 0.2,
  });
  const result = buildDecayOpportunityIntegration({
    opportunityModel: model([op]),
    decayEvidence: [decayAdapter({ opportunityFingerprint: op.opportunityFingerprint })],
  });

  assert.equal(result.projections[0]!.projectedAction, "leave_alone");
  assert.ok(result.projections[0]!.rationale.includes(
    "business_relevance_guard_preserves_leave_alone",
  ));
});

test("watch evidence does not overwrite the original content opportunity action", () => {
  const op = opportunity({ fingerprint: FP("4"), action: "create_candidate" });
  const result = buildDecayOpportunityIntegration({
    opportunityModel: model([op]),
    decayEvidence: [decayAdapter({
      opportunityFingerprint: op.opportunityFingerprint,
      classification: "watch",
    })],
  });

  assert.equal(result.projections[0]!.projectedAction, "create_candidate");
  assert.equal(result.projections[0]!.createSuppressedByRefreshEvidence, false);
  assert.ok(result.projections[0]!.rationale.includes(
    "bound_decay_evidence_does_not_meet_refresh_candidate_threshold",
  ));
});

test("explicit opportunity fingerprint binding is required and unknown bindings fail closed", () => {
  const op = opportunity({ fingerprint: FP("5"), action: "create_candidate" });
  assert.throws(
    () => buildDecayOpportunityIntegration({
      opportunityModel: model([op]),
      decayEvidence: [decayAdapter({ opportunityFingerprint: null })],
    }),
    /ugp_decay_opportunity_explicit_opportunity_binding_required/,
  );

  assert.throws(
    () => buildDecayOpportunityIntegration({
      opportunityModel: model([op]),
      decayEvidence: [decayAdapter({ opportunityFingerprint: FP("9") })],
    }),
    /ugp_decay_opportunity_unknown_opportunity_fingerprint/,
  );
});

test("duplicate page bindings are rejected instead of cherry-picking conflicting decay assessments", () => {
  const op = opportunity({ fingerprint: FP("6"), action: "create_candidate" });
  const refresh = decayAdapter({ opportunityFingerprint: op.opportunityFingerprint });
  const watch = decayAdapter({
    opportunityFingerprint: op.opportunityFingerprint,
    classification: "watch",
  });

  assert.throws(
    () => buildDecayOpportunityIntegration({
      opportunityModel: model([op]),
      decayEvidence: [refresh, watch],
    }),
    /ugp_decay_opportunity_duplicate_page_binding/,
  );
});

test("integration is deterministic and detects output tampering", () => {
  const op = opportunity({ fingerprint: FP("7"), action: "create_candidate" });
  const input = {
    opportunityModel: model([op]),
    decayEvidence: [decayAdapter({ opportunityFingerprint: op.opportunityFingerprint })],
  };
  const a = buildDecayOpportunityIntegration(input);
  const b = buildDecayOpportunityIntegration(input);
  assert.deepEqual(a, b);

  const tampered = {
    ...a,
    summary: {
      ...a.summary,
      projectedRefreshCandidate: 99,
    },
  };
  assert.throws(
    () => assertDecayOpportunityIntegrationIntegrity(tampered),
    /ugp_decay_opportunity_integration_fingerprint_mismatch/,
  );
});
