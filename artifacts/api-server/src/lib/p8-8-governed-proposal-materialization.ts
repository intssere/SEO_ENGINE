import { createHash } from "node:crypto";
import {
  RECOMMENDATION_GENERATION_WORKER_VERSION,
  projectRecommendationGenerationWorker,
  type RecommendationGenerationCandidate,
} from "./recommendation-generation-worker.js";
import {
  buildOpportunityPreviewDiff,
  type OpportunityPreviewDiff,
} from "./opportunity-preview-diff.js";

export const P8_8_W02_MATERIALIZATION_VERSION =
  "p8-8-w02-governed-proposal-materialization-v1" as const;

export const P8_8_W02_INITIAL_MUTATION_CLASS =
  "shopify.product.seo.meta_description" as const;

export type P88W02RecommendationWorkerInput =
  Parameters<typeof projectRecommendationGenerationWorker>[0];

export type P88W02ProductTargetBindingInput = {
  siteId: string;
  domain: string;
  provider: string;
  resourceKind: string;
  resourceGid: string;
  targetUrl: string;
  actionType: string;
  field: string;
  requiredProviderScope: string;
  sourceSystem: string;
  sourceIdentity: string;
  sourceFingerprint: string;
};

export type P88W02ProductTargetBinding = Readonly<{
  siteId: string;
  domain: "diamondshelf.us";
  provider: "shopify";
  resourceKind: "product";
  resourceGid: string;
  targetUrl: string;
  actionType: "update_meta_description";
  field: "meta_description";
  requiredProviderScope: "write_products";
  sourceSystem: string;
  sourceIdentity: string;
  sourceFingerprint: string;
  targetBindingFingerprint: string;
}>;

export type P88W02MaterializationInput = {
  recommendationWorkerInput: P88W02RecommendationWorkerInput;
  recommendation: RecommendationGenerationCandidate;
  selectedPreviewFingerprint: string;
  targetBinding: P88W02ProductTargetBinding;
  referenceTime: string;
};

export type P88W02GovernedProposalMaterialization = Readonly<{
  version: typeof P8_8_W02_MATERIALIZATION_VERSION;
  mutationClass: typeof P8_8_W02_INITIAL_MUTATION_CLASS;
  materializationId: string;
  materializationFingerprint: string;
  materializationIdempotencyFingerprint: string;
  proposalId: string;
  proposalFingerprint: string;
  proposalLifecycle: "materialized_unpersisted";
  referenceTime: string;
  recommendation: Readonly<{
    version: typeof RECOMMENDATION_GENERATION_WORKER_VERSION;
    recommendationId: string;
    recommendationFingerprint: string;
    idempotencyKey: string;
    idempotencyFingerprint: string;
    recommendationClass: "proposal_review";
  }>;
  preview: Readonly<{
    previewId: string;
    previewFingerprint: string;
    previewKey: string;
    fieldKey: "meta_description";
    fieldStatus: Exclude<OpportunityPreviewDiff["fields"][number]["status"], "unchanged">;
  }>;
  lineage: Readonly<{
    opportunityId: string;
    opportunityFingerprint: string;
    explanationId: string;
    explanationFingerprint: string;
    actionabilityId: string;
    actionabilityFingerprint: string;
    lifecycleId: string;
    lifecycleFingerprint: string;
    lifecycleState: "observed" | "active";
    scoreFingerprint: string;
    scoreStatus: RecommendationGenerationCandidate["lineage"]["scoreStatus"];
    evidenceFingerprints: readonly string[];
    statementFingerprints: readonly string[];
    missingEvidence: readonly string[];
    semanticGuards: readonly string[];
  }>;
  target: P88W02ProductTargetBinding;
  before: Readonly<{
    value: string | null;
    fingerprint: string;
  }>;
  after: Readonly<{
    value: string | null;
    fingerprint: string;
  }>;
  generation: Readonly<{
    source: "p9.7_deterministic_preview";
    deterministic: true;
    aiAssisted: false;
    textGenerated: false;
    textRewritten: false;
  }>;
  w01Facts: Readonly<{
    recommendationClass: "proposal_review";
    recommendationFingerprint: string;
    recommendationIdempotencyKey: string;
    lineageMaterialized: true;
    changedPreviewPresent: true;
    deterministic: true;
    aiAssisted: false;
    humanEditedAfterCertification: false;
    lifecycleEligible: true;
    proposalGenerationMethod: "p9.7_deterministic_preview";
    proposalFingerprint: string;
    wholeSiteCoverage: false;
    provider: "shopify";
    domain: "diamondshelf.us";
    resourceKind: "product";
    resourceGid: string;
    targetUrl: string;
    actionType: "update_meta_description";
    field: "meta_description";
    requiredProviderScope: "write_products";
    beforeFingerprint: string;
    afterFingerprint: string;
  }>;
  semantics: ReturnType<typeof p88W02MaterializationSemantics>;
  safety: ReturnType<typeof p88W02MaterializationCapability>;
}>;

const HEX_64 = /^[0-9a-f]{64}$/;
const EXACT_KEY = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/;
const SHOPIFY_PRODUCT_GID = /^gid:\/\/shopify\/Product\/[1-9][0-9]*$/;

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function exactKey(value: unknown, field: string): string {
  if (typeof value !== "string" || value !== value.trim() || !EXACT_KEY.test(value)) {
    throw new Error("p88_w02_invalid_" + field);
  }
  return value;
}

function exactIdentity(value: unknown, field: string): string {
  if (
    typeof value !== "string"
    || value.length < 1
    || value.length > 256
    || value !== value.trim()
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("p88_w02_invalid_" + field);
  }
  return value;
}

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) {
    throw new Error("p88_w02_invalid_" + field);
  }
  return value;
}

function canonicalTimestamp(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 64) {
    throw new Error("p88_w02_invalid_" + field);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new Error("p88_w02_invalid_" + field);
  }
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) {
    throw new Error("p88_w02_noncanonical_" + field);
  }
  return canonical;
}

function canonicalProductUrl(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("p88_w02_invalid_target_url");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("p88_w02_invalid_target_url");
  }
  if (
    url.protocol !== "https:"
    || url.hostname !== "diamondshelf.us"
    || url.port
    || url.username
    || url.password
    || url.search
    || url.hash
    || !/^\/products\/[a-z0-9][a-z0-9-]*$/.test(url.pathname)
    || url.toString() !== value
  ) {
    throw new Error("p88_w02_invalid_target_url");
  }
  return value;
}

function targetBindingPayload(
  binding: Omit<P88W02ProductTargetBinding, "targetBindingFingerprint">,
) {
  return {
    version: P8_8_W02_MATERIALIZATION_VERSION,
    purpose: "p8.8_w02_product_target_binding",
    ...binding,
  };
}

export function buildP88W02ProductTargetBinding(
  input: P88W02ProductTargetBindingInput,
): P88W02ProductTargetBinding {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("p88_w02_invalid_target_binding_input");
  }
  if (input.domain !== "diamondshelf.us") {
    throw new Error("p88_w02_unsupported_target_domain");
  }
  if (input.provider !== "shopify") {
    throw new Error("p88_w02_unsupported_target_provider");
  }
  if (input.resourceKind !== "product") {
    throw new Error("p88_w02_unsupported_target_resource_kind");
  }
  if (
    typeof input.resourceGid !== "string"
    || !SHOPIFY_PRODUCT_GID.test(input.resourceGid)
  ) {
    throw new Error("p88_w02_invalid_product_gid");
  }
  if (input.actionType !== "update_meta_description") {
    throw new Error("p88_w02_unsupported_target_action_type");
  }
  if (input.field !== "meta_description") {
    throw new Error("p88_w02_unsupported_target_field");
  }
  if (input.requiredProviderScope !== "write_products") {
    throw new Error("p88_w02_unsupported_target_scope");
  }

  const withoutFingerprint = {
    siteId: exactKey(input.siteId, "site_id"),
    domain: "diamondshelf.us" as const,
    provider: "shopify" as const,
    resourceKind: "product" as const,
    resourceGid: input.resourceGid,
    targetUrl: canonicalProductUrl(input.targetUrl),
    actionType: "update_meta_description" as const,
    field: "meta_description" as const,
    requiredProviderScope: "write_products" as const,
    sourceSystem: exactKey(input.sourceSystem, "source_system"),
    sourceIdentity: exactIdentity(input.sourceIdentity, "source_identity"),
    sourceFingerprint: exactFingerprint(
      input.sourceFingerprint,
      "source_fingerprint",
    ),
  };

  return deepFreeze({
    ...withoutFingerprint,
    targetBindingFingerprint: stableHash(
      targetBindingPayload(withoutFingerprint),
    ),
  });
}

export function p88W02TargetBindingIntegrityIssues(
  binding: P88W02ProductTargetBinding,
): string[] {
  const issues: string[] = [];
  try {
    const rebuilt = buildP88W02ProductTargetBinding({
      siteId: binding.siteId,
      domain: binding.domain,
      provider: binding.provider,
      resourceKind: binding.resourceKind,
      resourceGid: binding.resourceGid,
      targetUrl: binding.targetUrl,
      actionType: binding.actionType,
      field: binding.field,
      requiredProviderScope: binding.requiredProviderScope,
      sourceSystem: binding.sourceSystem,
      sourceIdentity: binding.sourceIdentity,
      sourceFingerprint: binding.sourceFingerprint,
    });
    if (rebuilt.targetBindingFingerprint !== binding.targetBindingFingerprint) {
      issues.push("p88_w02_target_binding_fingerprint_mismatch");
    }
  } catch (error) {
    issues.push(
      error instanceof Error
        ? error.message
        : "p88_w02_target_binding_integrity_invalid",
    );
  }
  return [...new Set(issues)].sort((left, right) => left.localeCompare(right));
}

export function assertP88W02TargetBindingIntegrity(
  binding: P88W02ProductTargetBinding,
): void {
  const issues = p88W02TargetBindingIntegrityIssues(binding);
  if (issues.length > 0) {
    throw new Error(
      "p88_w02_target_binding_integrity_failure:" + issues.join(","),
    );
  }
}

function canonicalRecommendation(
  input: P88W02RecommendationWorkerInput,
  supplied: RecommendationGenerationCandidate,
): {
  projection: ReturnType<typeof projectRecommendationGenerationWorker>;
  recommendation: RecommendationGenerationCandidate;
} {
  if (
    supplied.version !== RECOMMENDATION_GENERATION_WORKER_VERSION
  ) {
    throw new Error("p88_w02_unsupported_p97_version");
  }

  const projection = projectRecommendationGenerationWorker(input);
  const matches = projection.candidates.filter(
    (candidate) =>
      candidate.recommendationFingerprint === supplied.recommendationFingerprint,
  );

  if (matches.length !== 1) {
    throw new Error("p88_w02_recommendation_not_canonical");
  }

  const canonical = matches[0]!;
  if (stableJson(canonical) !== stableJson(supplied)) {
    throw new Error("p88_w02_recommendation_integrity_mismatch");
  }

  if (canonical.recommendationClass !== "proposal_review") {
    throw new Error("p88_w02_advisory_review_not_materializable");
  }
  if (canonical.lifecycle !== "proposed_review") {
    throw new Error("p88_w02_invalid_recommendation_lifecycle");
  }
  if (
    canonical.generation.mode !== "deterministic_template"
    || canonical.generation.aiAssisted !== false
    || canonical.generation.providerModel !== null
    || canonical.generation.freeformGeneration !== false
  ) {
    throw new Error("p88_w02_nondeterministic_recommendation");
  }
  if (
    canonical.governanceHandoff.previewAvailable !== true
    || canonical.governanceHandoff.changedPreviewAvailable !== true
    || canonical.governanceHandoff.approvalRequired !== true
  ) {
    throw new Error("p88_w02_preview_governance_not_eligible");
  }
  if (
    canonical.governanceHandoff.proposalRecordCreated !== false
    || canonical.governanceHandoff.proposalPersistenceAuthorized !== false
    || canonical.governanceHandoff.approvalGranted !== false
    || canonical.governanceHandoff.executionAuthorized !== false
    || canonical.governanceHandoff.publicSiteWrites !== false
    || canonical.governanceHandoff.automaticTransitionAuthorized !== false
    || canonical.governanceHandoff.task51AuthorizationCreated !== false
  ) {
    throw new Error("p88_w02_existing_authority_not_allowed");
  }
  if (
    canonical.lineage.lifecycleState !== "observed"
    && canonical.lineage.lifecycleState !== "active"
  ) {
    throw new Error("p88_w02_lifecycle_not_eligible");
  }

  return { projection, recommendation: canonical };
}

function canonicalPreview(
  workerInput: P88W02RecommendationWorkerInput,
  recommendation: RecommendationGenerationCandidate,
  selectedPreviewFingerprintValue: string,
): OpportunityPreviewDiff {
  const selectedPreviewFingerprint = exactFingerprint(
    selectedPreviewFingerprintValue,
    "selected_preview_fingerprint",
  );

  const rebuilt = buildOpportunityPreviewDiff(
    workerInput.lifecycleInput.previewDiffInput,
  );
  if (
    stableJson(rebuilt)
    !== stableJson(workerInput.lifecycleInput.previewDiff)
  ) {
    throw new Error("p88_w02_p66_preview_integrity_mismatch");
  }

  if (
    !recommendation.lineage.previewFingerprints.includes(
      selectedPreviewFingerprint,
    )
    || !recommendation.lineage.changedPreviewFingerprints.includes(
      selectedPreviewFingerprint,
    )
  ) {
    throw new Error("p88_w02_selected_preview_not_in_recommendation_lineage");
  }

  const matches = rebuilt.previews.filter(
    (preview) => preview.previewFingerprint === selectedPreviewFingerprint,
  );
  if (matches.length !== 1) {
    throw new Error("p88_w02_selected_preview_not_unique");
  }

  const preview = matches[0]!;
  if (
    preview.opportunityFingerprint
      !== recommendation.lineage.opportunityFingerprint
    || preview.opportunityId !== recommendation.lineage.opportunityId
    || preview.actionabilityFingerprint
      !== recommendation.lineage.actionabilityFingerprint
    || preview.actionabilityId !== recommendation.lineage.actionabilityId
  ) {
    throw new Error("p88_w02_preview_lineage_mismatch");
  }

  if (
    preview.actionability.classification !== "approval"
    || preview.actionability.approvalGranted !== false
    || preview.actionability.executionAuthorized !== false
    || preview.actionability.automaticTransitionAuthorized !== false
    || preview.applyAuthorized !== false
  ) {
    throw new Error("p88_w02_preview_authority_mismatch");
  }

  if (
    preview.counts.total !== 1
    || preview.fields.length !== 1
    || preview.counts.changed !== 1
  ) {
    throw new Error("p88_w02_single_changed_field_required");
  }

  const field = preview.fields[0]!;
  if (field.fieldKey !== "meta_description") {
    throw new Error("p88_w02_meta_description_only");
  }
  if (field.status === "unchanged") {
    throw new Error("p88_w02_changed_field_required");
  }

  return preview;
}

export function p88W02StateFingerprint(input: {
  target: P88W02ProductTargetBinding;
  value: string | null;
  purpose: "before" | "after";
}): string {
  return stableHash({
    version: P8_8_W02_MATERIALIZATION_VERSION,
    purpose: "p8.8_w02_" + input.purpose + "_state",
    provider: input.target.provider,
    resourceKind: input.target.resourceKind,
    resourceGid: input.target.resourceGid,
    targetUrl: input.target.targetUrl,
    field: input.target.field,
    value: input.value,
  });
}

export function p88W02MaterializationSemantics() {
  return deepFreeze({
    p97RecommendationRebuiltAndVerified: true,
    p66PreviewRebuiltAndVerified: true,
    proposalReviewOnly: true,
    singleChangedMetaDescriptionOnly: true,
    callerSuppliedProductTargetBindingOnly: true,
    productIdentityInferencePerformed: false,
    providerLookupPerformed: false,
    currentStateDiscoveryPerformed: false,
    beforeAfterCopiedByteForByte: true,
    textNormalizationPerformed: false,
    textGenerationPerformed: false,
    textRewritePerformed: false,
    outputIsPersistedProposalRecord: false,
    outputCreatesApproval: false,
    outputCreatesPolicyAuthorization: false,
    outputCreatesExecutionAuthority: false,
    outputEnablesPublicWriteGate: false,
    w01LiveCurrentStateFieldsMaterialized: false,
  });
}

export function p88W02MaterializationCapability() {
  return deepFreeze({
    version: P8_8_W02_MATERIALIZATION_VERSION,
    deterministicMaterializationOnly: true,
    callerSuppliedTargetBindingOnly: true,
    targetDiscoveryPerformed: false,
    aiModelCallsAuthorized: false,
    textGenerationPerformed: false,
    textRewritePerformed: false,
    databaseReadPerformed: false,
    databaseWritePerformed: false,
    persistencePerformed: false,
    schemaMutationPerformed: false,
    providerNetworkReadPerformed: false,
    providerWritePerformed: false,
    publicSiteWritePerformed: false,
    proposalRecordPersisted: false,
    approvalCreated: false,
    policyAuthorizationCreated: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    policyActivationPerformed: false,
    schedulerActivated: false,
    workerActivated: false,
    autonomousExecutionAuthorized: false,
    liveExecutionAuthorized: false,
    credentialScopeChanged: false,
    configurationChanged: false,
    deploymentPerformed: false,
    publicationPerformed: false,
  });
}

export function materializeP88W02GovernedProposal(
  input: P88W02MaterializationInput,
): P88W02GovernedProposalMaterialization {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("p88_w02_invalid_materialization_input");
  }

  assertP88W02TargetBindingIntegrity(input.targetBinding);

  const { recommendation } = canonicalRecommendation(
    input.recommendationWorkerInput,
    input.recommendation,
  );

  const preview = canonicalPreview(
    input.recommendationWorkerInput,
    recommendation,
    input.selectedPreviewFingerprint,
  );

  const referenceTime = canonicalTimestamp(
    input.referenceTime,
    "reference_time",
  );
  if (
    referenceTime < input.recommendationWorkerInput.referenceTime
    || referenceTime
      < input.recommendationWorkerInput.lifecycleInput.previewDiff.referenceTime
  ) {
    throw new Error("p88_w02_reference_before_upstream");
  }

  const field = preview.fields[0]!;
  const fieldStatus = field.status;
  if (fieldStatus === "unchanged") {
    throw new Error("p88_w02_changed_field_required");
  }
  const beforeValue = field.currentValue;
  const afterValue = field.proposedValue;

  const beforeFingerprint = p88W02StateFingerprint({
    target: input.targetBinding,
    value: beforeValue,
    purpose: "before",
  });
  const afterFingerprint = p88W02StateFingerprint({
    target: input.targetBinding,
    value: afterValue,
    purpose: "after",
  });

  if (beforeFingerprint === afterFingerprint) {
    throw new Error("p88_w02_before_after_state_equal");
  }

  const evidenceFingerprints = [
    ...recommendation.lineage.evidenceFingerprints,
  ].sort((left, right) => left.localeCompare(right));
  const statementFingerprints = [
    ...recommendation.lineage.statementFingerprints,
  ].sort((left, right) => left.localeCompare(right));
  const missingEvidence = [...recommendation.lineage.missingEvidence];
  const semanticGuards = [...recommendation.lineage.semanticGuards];

  const materializationIdempotencyFingerprint = stableHash({
    version: P8_8_W02_MATERIALIZATION_VERSION,
    purpose: "p8.8_w02_materialization_idempotency",
    recommendationIdempotencyFingerprint:
      recommendation.idempotencyFingerprint,
    recommendationFingerprint: recommendation.recommendationFingerprint,
    selectedPreviewFingerprint: preview.previewFingerprint,
    targetBindingFingerprint:
      input.targetBinding.targetBindingFingerprint,
    beforeFingerprint,
    afterFingerprint,
  });

  const generation = {
    source: "p9.7_deterministic_preview" as const,
    deterministic: true as const,
    aiAssisted: false as const,
    textGenerated: false as const,
    textRewritten: false as const,
  };

  const proposalIdentity = {
    version: P8_8_W02_MATERIALIZATION_VERSION,
    purpose: "p8.8_w02_governed_proposal",
    mutationClass: P8_8_W02_INITIAL_MUTATION_CLASS,
    recommendation: {
      recommendationId: recommendation.recommendationId,
      recommendationFingerprint: recommendation.recommendationFingerprint,
      idempotencyKey: recommendation.idempotencyKey,
      idempotencyFingerprint: recommendation.idempotencyFingerprint,
    },
    preview: {
      previewId: preview.previewId,
      previewFingerprint: preview.previewFingerprint,
      previewKey: preview.previewKey,
      fieldKey: "meta_description" as const,
      fieldStatus,
    },
    lineage: {
      opportunityId: recommendation.lineage.opportunityId,
      opportunityFingerprint: recommendation.lineage.opportunityFingerprint,
      explanationId: recommendation.lineage.explanationId,
      explanationFingerprint: recommendation.lineage.explanationFingerprint,
      actionabilityId: recommendation.lineage.actionabilityId,
      actionabilityFingerprint: recommendation.lineage.actionabilityFingerprint,
      lifecycleId: recommendation.lineage.lifecycleId,
      lifecycleFingerprint: recommendation.lineage.lifecycleFingerprint,
      lifecycleState: recommendation.lineage.lifecycleState,
      scoreFingerprint: recommendation.lineage.scoreFingerprint,
      scoreStatus: recommendation.lineage.scoreStatus,
      evidenceFingerprints,
      statementFingerprints,
      missingEvidence,
      semanticGuards,
    },
    targetBindingFingerprint:
      input.targetBinding.targetBindingFingerprint,
    before: {
      value: beforeValue,
      fingerprint: beforeFingerprint,
    },
    after: {
      value: afterValue,
      fingerprint: afterFingerprint,
    },
    generation,
    materializationIdempotencyFingerprint,
  };

  const proposalFingerprint = stableHash(proposalIdentity);
  const proposalId = "p88w02-proposal-" + proposalFingerprint.slice(0, 24);
  const semantics = p88W02MaterializationSemantics();
  const safety = p88W02MaterializationCapability();

  const withoutMaterializationIdentity = {
    version: P8_8_W02_MATERIALIZATION_VERSION,
    mutationClass: P8_8_W02_INITIAL_MUTATION_CLASS,
    materializationIdempotencyFingerprint,
    proposalId,
    proposalFingerprint,
    proposalLifecycle: "materialized_unpersisted" as const,
    referenceTime,
    recommendation: {
      version: RECOMMENDATION_GENERATION_WORKER_VERSION,
      recommendationId: recommendation.recommendationId,
      recommendationFingerprint: recommendation.recommendationFingerprint,
      idempotencyKey: recommendation.idempotencyKey,
      idempotencyFingerprint: recommendation.idempotencyFingerprint,
      recommendationClass: "proposal_review" as const,
    },
    preview: {
      previewId: preview.previewId,
      previewFingerprint: preview.previewFingerprint,
      previewKey: preview.previewKey,
      fieldKey: "meta_description" as const,
      fieldStatus,
    },
    lineage: {
      opportunityId: recommendation.lineage.opportunityId,
      opportunityFingerprint: recommendation.lineage.opportunityFingerprint,
      explanationId: recommendation.lineage.explanationId,
      explanationFingerprint: recommendation.lineage.explanationFingerprint,
      actionabilityId: recommendation.lineage.actionabilityId,
      actionabilityFingerprint: recommendation.lineage.actionabilityFingerprint,
      lifecycleId: recommendation.lineage.lifecycleId,
      lifecycleFingerprint: recommendation.lineage.lifecycleFingerprint,
      lifecycleState: recommendation.lineage.lifecycleState as
        | "observed"
        | "active",
      scoreFingerprint: recommendation.lineage.scoreFingerprint,
      scoreStatus: recommendation.lineage.scoreStatus,
      evidenceFingerprints,
      statementFingerprints,
      missingEvidence,
      semanticGuards,
    },
    target: input.targetBinding,
    before: {
      value: beforeValue,
      fingerprint: beforeFingerprint,
    },
    after: {
      value: afterValue,
      fingerprint: afterFingerprint,
    },
    generation,
    w01Facts: {
      recommendationClass: "proposal_review" as const,
      recommendationFingerprint: recommendation.recommendationFingerprint,
      recommendationIdempotencyKey: recommendation.idempotencyKey,
      lineageMaterialized: true as const,
      changedPreviewPresent: true as const,
      deterministic: true as const,
      aiAssisted: false as const,
      humanEditedAfterCertification: false as const,
      lifecycleEligible: true as const,
      proposalGenerationMethod: "p9.7_deterministic_preview" as const,
      proposalFingerprint,
      wholeSiteCoverage: false as const,
      provider: "shopify" as const,
      domain: "diamondshelf.us" as const,
      resourceKind: "product" as const,
      resourceGid: input.targetBinding.resourceGid,
      targetUrl: input.targetBinding.targetUrl,
      actionType: "update_meta_description" as const,
      field: "meta_description" as const,
      requiredProviderScope: "write_products" as const,
      beforeFingerprint,
      afterFingerprint,
    },
    semantics,
    safety,
  };

  const materializationFingerprint = stableHash({
    purpose: "p8.8_w02_materialization",
    ...withoutMaterializationIdentity,
  });

  return deepFreeze({
    ...withoutMaterializationIdentity,
    materializationId:
      "p88w02-materialization-" + materializationFingerprint.slice(0, 24),
    materializationFingerprint,
  });
}

export function assertP88W02ReplayCompatible(
  existing: P88W02GovernedProposalMaterialization,
  candidate: P88W02GovernedProposalMaterialization,
): void {
  if (
    existing.recommendation.idempotencyFingerprint
      === candidate.recommendation.idempotencyFingerprint
    && existing.materializationIdempotencyFingerprint
      !== candidate.materializationIdempotencyFingerprint
  ) {
    throw new Error("p88_w02_conflicting_replay_identity");
  }
}
