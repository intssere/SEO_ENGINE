import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSiteOwnershipEvidence,
  type SiteOwnershipPageInventory,
  type SiteOwnershipQueryPageObservation,
} from "./site-ownership-evidence-contract.js";
import { detectCannibalization } from "./cannibalization-detection-contract.js";
import { classifyTopicCoverage } from "./topic-coverage-classification-contract.js";
import {
  buildContentOpportunityBusinessRelevanceEvidence,
  buildContentOpportunityModel,
} from "./content-opportunity-model-contract.js";
import { buildResearchPlan } from "./research-plan-contract.js";
import {
  assertSourceEvidenceLedgerIntegrity,
  buildSourceEvidenceLedger,
  type CapturedResearchEvidenceInput,
  type CapturedResearchSourceInput,
} from "./source-evidence-ledger-contract.js";
import {
  stableEvidenceHash,
  type SearchMarket,
} from "./keyword-serp-evidence-contract.js";
import {
  UGP_TOPIC_CLUSTERING_POLICY,
  type TopicCluster,
  type TopicClusteringResult,
} from "./topic-clustering-contract.js";

const MARKET: SearchMarket = {
  searchEngine: "google",
  locationCode: 2840,
  languageCode: "en",
  device: "desktop",
};

const CLOSED_CLUSTERING_SEMANTICS = Object.freeze({
  readOnly: true as const,
  deterministic: true as const,
  grantsAuthorization: false as const,
  grantsProviderWrite: false as const,
  grantsPublicSiteWrite: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
});

function cluster(): TopicCluster {
  const members = Object.freeze([
    Object.freeze({
      keyword: "stress relief journal",
      evidenceFingerprint: "5".repeat(64),
      searchVolume: 100,
      intent: "informational" as const,
    }),
  ]);
  const base = {
    representativeKeyword: "stress relief journal",
    members,
  };
  return Object.freeze({
    clusterFingerprint: stableEvidenceHash({
      purpose: "ugp_topic_cluster",
      version: "ugp-6-2a-deterministic-topic-clustering-v1",
      ...base,
    }),
    ...base,
  });
}

function clustering(topic: TopicCluster): TopicClusteringResult {
  const base = {
    version: "ugp-6-2a-deterministic-topic-clustering-v1" as const,
    market: MARKET,
    policy: UGP_TOPIC_CLUSTERING_POLICY,
    clusters: Object.freeze([topic]),
    pairAssessments: Object.freeze([]),
    semantics: CLOSED_CLUSTERING_SEMANTICS,
  };
  return Object.freeze({
    ...base,
    clusteringFingerprint: stableEvidenceHash({
      purpose: "ugp_topic_clustering_result",
      ...base,
    }),
  });
}

function inventory(): SiteOwnershipPageInventory {
  return {
    version: "ugp-6-3a-page-inventory-projection-v1",
    canonicalOrigin: "https://example.com",
    sourceAnalysisFingerprint: "a".repeat(64),
    coverage: "observed_inventory_complete",
    wholeSiteCertified: false,
    pages: [
      {
        url: "https://example.com/a",
        analysisPageId: "analysis-a",
        evidenceId: "evidence-a",
        pageFingerprint: "b".repeat(64),
        sourceFingerprint: "c".repeat(64),
        outcome: "success",
        indexability: "indexable",
        canonicalUrl: "https://example.com/a",
        canonicalState: "self",
        title: "Existing A",
        h1: "Existing A",
        headings: ["Existing A"],
        contentFingerprint: "e".repeat(64),
      },
    ],
  };
}

function observation(query = "other query"): SiteOwnershipQueryPageObservation {
  return {
    query,
    pageUrl: "https://example.com/a",
    market: MARKET,
    clicks: 3,
    impressions: 25,
    ctr: 0.12,
    position: 8,
    sourceId: "captured-query-page-source",
    sourceFingerprint: "d".repeat(64),
  };
}

function researchPlan() {
  const topic = cluster();
  const topicClustering = clustering(topic);
  const ownership = buildSiteOwnershipEvidence({
    pageInventory: inventory(),
    market: MARKET,
    queryPageObservations: [observation()],
  });
  const cannibalization = detectCannibalization({
    clustering: topicClustering,
    ownership,
  });
  const coverage = classifyTopicCoverage({
    clustering: topicClustering,
    ownership,
  });
  const business = buildContentOpportunityBusinessRelevanceEvidence({
    clusterFingerprint: topic.clusterFingerprint,
    relevance: 0.9,
    rationaleCode: "core_business_topic",
    sourceId: "business-context-fixture",
    sourceFingerprint: "9".repeat(64),
  });
  const model = buildContentOpportunityModel({
    clustering: topicClustering,
    cannibalization,
    coverage,
    businessRelevance: [business],
  });
  const opportunity = model.opportunities[0];
  assert.equal(opportunity.recommendedAction, "create_candidate");
  return buildResearchPlan({
    opportunityModel: model,
    opportunityId: opportunity.opportunityId,
  });
}

function source(
  overrides: Partial<CapturedResearchSourceInput> = {},
): CapturedResearchSourceInput {
  return {
    sourceId: "official-source-1",
    sourceKind: "official_primary",
    acquisitionMethod: "captured_http",
    locator: "https://authority.example/guide#section",
    canonicalLocator: "https://authority.example/guide",
    title: "Official Stress Guidance",
    publisher: "Authority Example",
    author: "Editorial Office",
    publishedAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    acquiredAt: "2026-10-01T00:00:00Z",
    sourceFingerprint: "6".repeat(64),
    qualitySignals: {
      publisherIdentityKnown: true,
      authorIdentityKnown: true,
      publicationDateAvailable: true,
      updateDateAvailable: true,
      provenanceComplete: true,
      firstPartyOrOfficial: true,
      independentlyProduced: true,
    },
    ...overrides,
  };
}

function evidence(
  plan: ReturnType<typeof researchPlan>,
  overrides: Partial<CapturedResearchEvidenceInput> = {},
): CapturedResearchEvidenceInput {
  return {
    sourceId: "official-source-1",
    extractedEvidence: "The captured source contains evidence relevant to the planned research question.",
    questionIds: [plan.questions[0].questionId],
    evidenceClasses: ["search_intent_context"],
    claimRefs: [
      {
        claimKey: "claim:stress-guidance-context",
        relevance: "supporting",
      },
    ],
    ...overrides,
  };
}

test("UGP-7.2 builds an immutable captured-source evidence ledger", () => {
  const plan = researchPlan();
  const ledger = buildSourceEvidenceLedger({
    researchPlan: plan,
    sources: [source()],
    evidence: [evidence(plan)],
  });

  assert.equal(ledger.researchPlanId, plan.planId);
  assert.equal(ledger.sources.length, 1);
  assert.equal(ledger.evidence.length, 1);
  assert.equal(
    ledger.sources[0]?.canonicalLocator,
    "https://authority.example/guide",
  );
  assert.equal(ledger.sources[0]?.supportTier, "strong");
  assert.equal(ledger.evidence[0]?.claimRefs[0]?.relevance, "supporting");
  assert.equal(ledger.semantics.extractedEvidenceIsNotVerifiedClaim, true);
  assertSourceEvidenceLedgerIntegrity(ledger);
});

test("UGP-7.2 canonicalizes source locators without treating URL fragments as identity", () => {
  const plan = researchPlan();
  const ledger = buildSourceEvidenceLedger({
    researchPlan: plan,
    sources: [source({
      canonicalLocator: null,
    })],
    evidence: [evidence(plan)],
  });

  assert.equal(
    ledger.sources[0]?.locator,
    "https://authority.example/guide",
  );
});

test("UGP-7.2 transparently derives support tier from explicit quality signals", () => {
  const plan = researchPlan();
  const ledger = buildSourceEvidenceLedger({
    researchPlan: plan,
    sources: [
      source({
        sourceId: "limited-source",
        sourceKind: "reputable_secondary",
        sourceFingerprint: "7".repeat(64),
        publishedAt: null,
        updatedAt: null,
        qualitySignals: {
          publisherIdentityKnown: true,
          authorIdentityKnown: false,
          publicationDateAvailable: false,
          updateDateAvailable: false,
          provenanceComplete: true,
          firstPartyOrOfficial: false,
          independentlyProduced: false,
        },
      }),
    ],
    evidence: [
      evidence(plan, {
        sourceId: "limited-source",
      }),
    ],
  });

  assert.equal(ledger.sources[0]?.supportTier, "limited");
  assert.equal(ledger.semantics.sourceQualityDoesNotEstablishTruth, true);
});

test("UGP-7.2 records missing required evidence classes rather than fabricating coverage", () => {
  const plan = researchPlan();
  const ledger = buildSourceEvidenceLedger({
    researchPlan: plan,
    sources: [source()],
    evidence: [evidence(plan)],
  });

  assert.ok(ledger.unresolvedEvidenceClasses.length > 0);
  assert.ok(
    ledger.unresolvedEvidenceClasses.includes("primary_authoritative_sources"),
  );
  assert.equal(
    ledger.coverage.find(
      (item) => item.requiredEvidenceClass === "primary_authoritative_sources",
    )?.status,
    "missing",
  );
});

test("UGP-7.2 can satisfy multiple planned evidence classes with explicit bindings", () => {
  const plan = researchPlan();
  const ledger = buildSourceEvidenceLedger({
    researchPlan: plan,
    sources: [source()],
    evidence: [
      evidence(plan, {
        questionIds: [
          plan.questions[2].questionId,
          plan.questions[6].questionId,
        ],
        evidenceClasses: [
          "primary_authoritative_sources",
          "claim_verification",
          "definitions_and_background",
        ],
      }),
    ],
  });

  assert.equal(
    ledger.coverage.find(
      (item) => item.requiredEvidenceClass === "primary_authoritative_sources",
    )?.status,
    "observed",
  );
  assert.equal(
    ledger.coverage.find(
      (item) => item.requiredEvidenceClass === "claim_verification",
    )?.status,
    "observed",
  );
});

test("UGP-7.2 preserves conflicting captured evidence side-by-side", () => {
  const plan = researchPlan();
  const secondSource = source({
    sourceId: "secondary-source-2",
    sourceKind: "reputable_secondary",
    sourceFingerprint: "8".repeat(64),
    title: "Independent Stress Review",
    publisher: "Independent Review",
    author: "Reviewer",
    publishedAt: "2026-07-01T00:00:00Z",
    updatedAt: null,
    qualitySignals: {
      publisherIdentityKnown: true,
      authorIdentityKnown: true,
      publicationDateAvailable: true,
      updateDateAvailable: false,
      provenanceComplete: true,
      firstPartyOrOfficial: false,
      independentlyProduced: true,
    },
  });

  const ledger = buildSourceEvidenceLedger({
    researchPlan: plan,
    sources: [source(), secondSource],
    evidence: [
      evidence(plan, {
        extractedEvidence: "Captured source A supports interpretation A.",
      }),
      evidence(plan, {
        sourceId: "secondary-source-2",
        extractedEvidence: "Captured source B supports a conflicting interpretation B.",
        claimRefs: [
          {
            claimKey: "claim:stress-guidance-context",
            relevance: "direct",
          },
        ],
      }),
    ],
  });

  assert.equal(ledger.evidence.length, 2);
  assert.equal(ledger.semantics.conflictingEvidenceMayCoexist, true);
  assert.notEqual(
    ledger.evidence[0]?.evidenceFingerprint,
    ledger.evidence[1]?.evidenceFingerprint,
  );
});

test("UGP-7.2 rejects evidence that references an unknown research question", () => {
  const plan = researchPlan();

  assert.throws(
    () => buildSourceEvidenceLedger({
      researchPlan: plan,
      sources: [source()],
      evidence: [
        evidence(plan, {
          questionIds: ["0".repeat(64)],
        }),
      ],
    }),
    /ugp_source_ledger_unknown_question_ref/,
  );
});

test("UGP-7.2 rejects evidence classes not required by the certified research plan", () => {
  const plan = researchPlan();
  const modified = {
    ...evidence(plan),
    evidenceClasses: ["comparative_evidence" as const],
  };

  assert.throws(
    () => buildSourceEvidenceLedger({
      researchPlan: plan,
      sources: [source()],
      evidence: [modified],
    }),
    /ugp_source_ledger_unplanned_evidence_class/,
  );
});

test("UGP-7.2 rejects duplicate source fingerprints across different source IDs", () => {
  const plan = researchPlan();

  assert.throws(
    () => buildSourceEvidenceLedger({
      researchPlan: plan,
      sources: [
        source(),
        source({
          sourceId: "duplicate-source-id",
        }),
      ],
      evidence: [evidence(plan)],
    }),
    /ugp_source_ledger_duplicate_source_fingerprint/,
  );
});

test("UGP-7.2 rejects quality date signals that do not match captured dates", () => {
  const plan = researchPlan();

  assert.throws(
    () => buildSourceEvidenceLedger({
      researchPlan: plan,
      sources: [
        source({
          publishedAt: null,
        }),
      ],
      evidence: [evidence(plan)],
    }),
    /ugp_source_ledger_date_signal_mismatch/,
  );
});

test("UGP-7.2 rejects source dates later than acquisition time", () => {
  const plan = researchPlan();

  assert.throws(
    () => buildSourceEvidenceLedger({
      researchPlan: plan,
      sources: [
        source({
          publishedAt: "2026-10-02T00:00:00Z",
          acquiredAt: "2026-10-01T00:00:00Z",
        }),
      ],
      evidence: [evidence(plan)],
    }),
    /ugp_source_ledger_publication_after_acquisition/,
  );
});

test("UGP-7.2 output is invariant to source and evidence input order", () => {
  const plan = researchPlan();
  const secondSource = source({
    sourceId: "secondary-source-2",
    sourceKind: "reputable_secondary",
    sourceFingerprint: "8".repeat(64),
    title: "Independent Stress Review",
    publisher: "Independent Review",
    author: "Reviewer",
    updatedAt: null,
    qualitySignals: {
      publisherIdentityKnown: true,
      authorIdentityKnown: true,
      publicationDateAvailable: true,
      updateDateAvailable: false,
      provenanceComplete: true,
      firstPartyOrOfficial: false,
      independentlyProduced: true,
    },
  });
  const sources = [source(), secondSource];
  const evidenceItems = [
    evidence(plan),
    evidence(plan, {
      sourceId: "secondary-source-2",
      extractedEvidence: "Independent captured evidence for the same research question.",
      claimRefs: [],
    }),
  ];

  const forward = buildSourceEvidenceLedger({
    researchPlan: plan,
    sources,
    evidence: evidenceItems,
  });
  const reverse = buildSourceEvidenceLedger({
    researchPlan: plan,
    sources: [...sources].reverse(),
    evidence: [...evidenceItems].reverse(),
  });

  assert.deepEqual(forward, reverse);
  assert.equal(forward.ledgerFingerprint, reverse.ledgerFingerprint);
});

test("UGP-7.2 integrity guard rejects ledger fingerprint mutation", () => {
  const plan = researchPlan();
  const ledger = buildSourceEvidenceLedger({
    researchPlan: plan,
    sources: [source()],
    evidence: [evidence(plan)],
  });

  assert.throws(
    () => assertSourceEvidenceLedgerIntegrity({
      ...ledger,
      ledgerFingerprint: "0".repeat(64),
    }),
    /ugp_source_ledger_fingerprint_mismatch/,
  );
});

test("UGP-7.2 semantics remain captured-only and non-authorizing", () => {
  const plan = researchPlan();
  const ledger = buildSourceEvidenceLedger({
    researchPlan: plan,
    sources: [source()],
    evidence: [evidence(plan)],
  });

  assert.deepEqual(ledger.semantics, {
    deterministic: true,
    capturedAcquisitionOnly: true,
    performsNetworkOperation: false,
    performsLiveSourceAcquisition: false,
    performsPersistence: false,
    extractedEvidenceIsNotVerifiedClaim: true,
    conflictingEvidenceMayCoexist: true,
    sourceQualityDoesNotEstablishTruth: true,
    generatesArticleText: false,
    publicationAuthorized: false,
    executionAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
  });
});
