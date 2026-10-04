import {
  UGP_CONTENT_OPPORTUNITY_MODEL_POLICY,
  assertContentOpportunityModelIntegrity,
  type ContentOpportunityAction,
  type ContentOpportunityModelResult,
} from "./content-opportunity-model-contract.js";
import {
  assertContentDecayRefreshAssessmentIntegrity,
  buildContentDecayRefreshAssessment,
  type ContentDecayClassification,
} from "./content-decay-refresh-detection.js";
import {
  UGP_DECAY_EVIDENCE_ADAPTER_VERSION,
  assertContentDecayEvidenceAdapterIntegrity,
  type ContentDecayEvidenceAdapterResult,
} from "./content-decay-evidence-adapter.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_DECAY_OPPORTUNITY_INTEGRATION_VERSION =
  "ugp-8-4c-decay-opportunity-integration-v1" as const;

export type DecayOpportunityProjectedAction = ContentOpportunityAction;

export type DecayOpportunityProjection = Readonly<{
  opportunityId: string;
  opportunityFingerprint: string;
  clusterFingerprint: string;
  representativeKeyword: string;
  originalAction: ContentOpportunityAction;
  projectedAction: DecayOpportunityProjectedAction;
  businessRelevance: number;
  cannibalizationState:
    | "exact_query_collision_detected"
    | "topic_page_dispersion_detected"
    | "no_material_collision_observed_in_supplied_evidence"
    | "no_matching_cluster_query_evidence"
    | "query_page_evidence_not_supplied";
  boundDecayAssessmentFingerprints: readonly string[];
  boundDecayAdapterFingerprints: readonly string[];
  boundPageUrls: readonly string[];
  decayClassifications: readonly ContentDecayClassification[];
  createSuppressedByRefreshEvidence: boolean;
  rationale: readonly string[];
  limitations: readonly string[];
  projectionFingerprint: string;
}>;

export type DecayOpportunityIntegrationResult = Readonly<{
  version: typeof UGP_DECAY_OPPORTUNITY_INTEGRATION_VERSION;
  opportunityModelFingerprint: string;
  projections: readonly DecayOpportunityProjection[];
  summary: Readonly<{
    projectedCreateCandidate: number;
    projectedRefreshCandidate: number;
    projectedConsolidateCandidate: number;
    projectedLeaveAlone: number;
    projectedDeferInsufficientEvidence: number;
    createCandidatesSuppressedByRefreshEvidence: number;
    boundDecayAssessments: number;
  }>;
  semantics: Readonly<{
    deterministic: true;
    readOnly: true;
    projectionOnly: true;
    evidenceBacked: true;
    preservesCannibalizationGuard: true;
    preservesBusinessRelevanceGuard: true;
    suppressesDuplicateCreateWhenRefreshEvidenceIsBound: true;
    grantsAuthorization: false;
    publicationAuthorized: false;
    schedulingAuthorized: false;
    executionAuthorized: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  integrationFingerprint: string;
}>;

const HEX64 = /^[0-9a-f]{64}$/;
const SEMANTICS = Object.freeze({
  deterministic: true as const,
  readOnly: true as const,
  projectionOnly: true as const,
  evidenceBacked: true as const,
  preservesCannibalizationGuard: true as const,
  preservesBusinessRelevanceGuard: true as const,
  suppressesDuplicateCreateWhenRefreshEvidenceIsBound: true as const,
  grantsAuthorization: false as const,
  publicationAuthorized: false as const,
  schedulingAuthorized: false as const,
  executionAuthorized: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  providerWrites: false as const,
  publicSiteWrites: false as const,
});

function fp(value: unknown, field: string): string {
  if (typeof value !== "string" || !HEX64.test(value)) {
    throw new Error("ugp_decay_opportunity_invalid_" + field);
  }
  return value;
}

function canonicalPageUrl(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 2048) {
    throw new Error("ugp_decay_opportunity_invalid_page_url");
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("ugp_decay_opportunity_invalid_page_url");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("ugp_decay_opportunity_invalid_page_url");
  }
  parsed.hash = "";
  return parsed.toString();
}

function assertDecayAdapterBinding(adapter: ContentDecayEvidenceAdapterResult): void {
  assertContentDecayEvidenceAdapterIntegrity(adapter);
  if (adapter.version !== UGP_DECAY_EVIDENCE_ADAPTER_VERSION) {
    throw new Error("ugp_decay_opportunity_adapter_version_invalid");
  }
  assertContentDecayRefreshAssessmentIntegrity(adapter.assessment);

  const rebuilt = buildContentDecayRefreshAssessment(adapter.mappedInput);
  if (rebuilt.assessmentFingerprint !== adapter.assessment.assessmentFingerprint) {
    throw new Error("ugp_decay_opportunity_adapter_assessment_input_mismatch");
  }

  const pageUrl = canonicalPageUrl(adapter.pageUrl);
  if (
    canonicalPageUrl(adapter.assessment.pageUrl) !== pageUrl
    || canonicalPageUrl(adapter.mappedInput.pageUrl) !== pageUrl
  ) {
    throw new Error("ugp_decay_opportunity_adapter_page_lineage_mismatch");
  }
  if (
    adapter.assessment.contentOpportunityFingerprint
    !== adapter.mappedInput.contentOpportunityFingerprint
  ) {
    throw new Error("ugp_decay_opportunity_adapter_opportunity_lineage_mismatch");
  }
}

function count(
  projections: readonly DecayOpportunityProjection[],
  action: ContentOpportunityAction,
): number {
  return projections.filter((item) => item.projectedAction === action).length;
}

export function buildDecayOpportunityIntegration(input: {
  opportunityModel: ContentOpportunityModelResult;
  decayEvidence: readonly ContentDecayEvidenceAdapterResult[];
}): DecayOpportunityIntegrationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_decay_opportunity_invalid_input");
  }
  assertContentOpportunityModelIntegrity(input.opportunityModel);
  if (!Array.isArray(input.decayEvidence)) {
    throw new Error("ugp_decay_opportunity_invalid_decay_evidence");
  }

  const opportunitiesByFingerprint = new Map(
    input.opportunityModel.opportunities.map((opportunity) => [
      opportunity.opportunityFingerprint,
      opportunity,
    ] as const),
  );

  const adaptersByOpportunity = new Map<string, ContentDecayEvidenceAdapterResult[]>();
  const seenAdapterFingerprints = new Set<string>();
  const seenAssessmentFingerprints = new Set<string>();
  const seenOpportunityPage = new Set<string>();

  for (const adapter of input.decayEvidence) {
    assertDecayAdapterBinding(adapter);
    fp(adapter.adapterFingerprint, "adapter_fingerprint");
    fp(adapter.assessment.assessmentFingerprint, "assessment_fingerprint");
    if (seenAdapterFingerprints.has(adapter.adapterFingerprint)) {
      throw new Error("ugp_decay_opportunity_duplicate_adapter");
    }
    if (seenAssessmentFingerprints.has(adapter.assessment.assessmentFingerprint)) {
      throw new Error("ugp_decay_opportunity_duplicate_assessment");
    }
    seenAdapterFingerprints.add(adapter.adapterFingerprint);
    seenAssessmentFingerprints.add(adapter.assessment.assessmentFingerprint);

    const opportunityFingerprint = adapter.assessment.contentOpportunityFingerprint;
    if (opportunityFingerprint === null) {
      throw new Error("ugp_decay_opportunity_explicit_opportunity_binding_required");
    }
    fp(opportunityFingerprint, "bound_opportunity_fingerprint");
    if (!opportunitiesByFingerprint.has(opportunityFingerprint)) {
      throw new Error("ugp_decay_opportunity_unknown_opportunity_fingerprint");
    }

    const key = opportunityFingerprint + "\u0001" + canonicalPageUrl(adapter.pageUrl);
    if (seenOpportunityPage.has(key)) {
      throw new Error("ugp_decay_opportunity_duplicate_page_binding");
    }
    seenOpportunityPage.add(key);

    const existing = adaptersByOpportunity.get(opportunityFingerprint) ?? [];
    adaptersByOpportunity.set(opportunityFingerprint, [...existing, adapter]);
  }

  const projections = Object.freeze(
    [...input.opportunityModel.opportunities]
      .sort((a, b) =>
        a.representativeKeyword.localeCompare(b.representativeKeyword)
        || a.opportunityFingerprint.localeCompare(b.opportunityFingerprint),
      )
      .map((opportunity): DecayOpportunityProjection => {
        fp(opportunity.opportunityFingerprint, "opportunity_fingerprint");
        const adapters = [...(adaptersByOpportunity.get(opportunity.opportunityFingerprint) ?? [])]
          .sort((a, b) =>
            canonicalPageUrl(a.pageUrl).localeCompare(canonicalPageUrl(b.pageUrl))
            || a.assessment.assessmentFingerprint.localeCompare(b.assessment.assessmentFingerprint),
          );

        const refreshAdapters = adapters.filter(
          (adapter) => adapter.assessment.classification === "refresh_candidate",
        );
        const hasRefreshEvidence = refreshAdapters.length > 0;
        const cannibalizationGuard =
          opportunity.cannibalizationState === "exact_query_collision_detected"
          || opportunity.cannibalizationState === "topic_page_dispersion_detected";
        const businessRelevanceGuard =
          opportunity.businessRelevance.relevance
          < UGP_CONTENT_OPPORTUNITY_MODEL_POLICY.minimumBusinessRelevanceForActionCandidate;

        let projectedAction: ContentOpportunityAction = opportunity.recommendedAction;
        const rationale = new Set<string>();
        const limitations = new Set<string>();

        if (hasRefreshEvidence) {
          rationale.add("bound_decay_refresh_candidate_observed");
          if (cannibalizationGuard) {
            projectedAction = "consolidate_candidate";
            rationale.add("cannibalization_guard_preserves_consolidation_over_refresh");
          } else if (businessRelevanceGuard) {
            projectedAction = "leave_alone";
            rationale.add("business_relevance_guard_preserves_leave_alone");
          } else {
            projectedAction = "refresh_candidate";
            rationale.add("refresh_evidence_prioritized_over_net_new_creation");
          }
        } else if (adapters.length > 0) {
          rationale.add("bound_decay_evidence_does_not_meet_refresh_candidate_threshold");
          rationale.add("original_content_opportunity_action_preserved");
        } else {
          rationale.add("no_bound_decay_evidence_original_action_preserved");
        }

        for (const adapter of adapters) {
          for (const limitation of adapter.adapterLimitations) limitations.add(limitation);
          for (const limitation of adapter.assessment.limitations) limitations.add(limitation);
        }

        const createSuppressedByRefreshEvidence =
          opportunity.recommendedAction === "create_candidate"
          && projectedAction !== "create_candidate"
          && hasRefreshEvidence;

        if (createSuppressedByRefreshEvidence) {
          rationale.add("duplicate_net_new_create_suppressed_for_existing_decay_bound_page");
        }

        const base = {
          opportunityId: opportunity.opportunityId,
          opportunityFingerprint: opportunity.opportunityFingerprint,
          clusterFingerprint: opportunity.clusterFingerprint,
          representativeKeyword: opportunity.representativeKeyword,
          originalAction: opportunity.recommendedAction,
          projectedAction,
          businessRelevance: opportunity.businessRelevance.relevance,
          cannibalizationState: opportunity.cannibalizationState,
          boundDecayAssessmentFingerprints: Object.freeze(
            adapters.map((adapter) => adapter.assessment.assessmentFingerprint).sort(),
          ),
          boundDecayAdapterFingerprints: Object.freeze(
            adapters.map((adapter) => adapter.adapterFingerprint).sort(),
          ),
          boundPageUrls: Object.freeze(
            adapters.map((adapter) => canonicalPageUrl(adapter.pageUrl)).sort(),
          ),
          decayClassifications: Object.freeze(
            [...new Set(adapters.map((adapter) => adapter.assessment.classification))].sort(),
          ),
          createSuppressedByRefreshEvidence,
          rationale: Object.freeze([...rationale].sort()),
          limitations: Object.freeze([...limitations].sort()),
        };

        return Object.freeze({
          ...base,
          projectionFingerprint: stableEvidenceHash({
            purpose: "ugp_decay_opportunity_projection",
            version: UGP_DECAY_OPPORTUNITY_INTEGRATION_VERSION,
            ...base,
          }),
        });
      }),
  );

  const summary = Object.freeze({
    projectedCreateCandidate: count(projections, "create_candidate"),
    projectedRefreshCandidate: count(projections, "refresh_candidate"),
    projectedConsolidateCandidate: count(projections, "consolidate_candidate"),
    projectedLeaveAlone: count(projections, "leave_alone"),
    projectedDeferInsufficientEvidence: count(projections, "defer_insufficient_evidence"),
    createCandidatesSuppressedByRefreshEvidence: projections.filter(
      (item) => item.createSuppressedByRefreshEvidence,
    ).length,
    boundDecayAssessments: input.decayEvidence.length,
  });

  const base = {
    version: UGP_DECAY_OPPORTUNITY_INTEGRATION_VERSION,
    opportunityModelFingerprint: input.opportunityModel.opportunityModelFingerprint,
    projections,
    summary,
    semantics: SEMANTICS,
  };

  return Object.freeze({
    ...base,
    integrationFingerprint: stableEvidenceHash({
      purpose: "ugp_decay_opportunity_integration",
      ...base,
    }),
  });
}

export function assertDecayOpportunityIntegrationIntegrity(
  result: DecayOpportunityIntegrationResult,
): void {
  if (!result || result.version !== UGP_DECAY_OPPORTUNITY_INTEGRATION_VERSION) {
    throw new Error("ugp_decay_opportunity_version_invalid");
  }
  fp(result.opportunityModelFingerprint, "opportunity_model_fingerprint");
  fp(result.integrationFingerprint, "integration_fingerprint");
  if (
    result.semantics.deterministic !== true
    || result.semantics.readOnly !== true
    || result.semantics.projectionOnly !== true
    || result.semantics.evidenceBacked !== true
    || result.semantics.preservesCannibalizationGuard !== true
    || result.semantics.preservesBusinessRelevanceGuard !== true
    || result.semantics.suppressesDuplicateCreateWhenRefreshEvidenceIsBound !== true
    || result.semantics.grantsAuthorization !== false
    || result.semantics.publicationAuthorized !== false
    || result.semantics.schedulingAuthorized !== false
    || result.semantics.executionAuthorized !== false
    || result.semantics.performsNetworkOperation !== false
    || result.semantics.performsPersistence !== false
    || result.semantics.providerWrites !== false
    || result.semantics.publicSiteWrites !== false
  ) {
    throw new Error("ugp_decay_opportunity_unsafe_semantics");
  }

  for (const projection of result.projections) {
    fp(projection.opportunityFingerprint, "projection_opportunity_fingerprint");
    fp(projection.clusterFingerprint, "projection_cluster_fingerprint");
    fp(projection.projectionFingerprint, "projection_fingerprint");
    const { projectionFingerprint, ...base } = projection;
    const expected = stableEvidenceHash({
      purpose: "ugp_decay_opportunity_projection",
      version: UGP_DECAY_OPPORTUNITY_INTEGRATION_VERSION,
      ...base,
    });
    if (projectionFingerprint !== expected) {
      throw new Error("ugp_decay_opportunity_projection_fingerprint_mismatch");
    }
  }

  const { integrationFingerprint, ...base } = result;
  const expected = stableEvidenceHash({
    purpose: "ugp_decay_opportunity_integration",
    ...base,
  });
  if (integrationFingerprint !== expected) {
    throw new Error("ugp_decay_opportunity_integration_fingerprint_mismatch");
  }
}
