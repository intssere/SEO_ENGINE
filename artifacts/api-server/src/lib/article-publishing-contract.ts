import {
  assertArticleDraftPipelineIntegrity,
  type ArticleDraftPipelineResult,
} from "./article-draft-pipeline-contract.js";
import {
  assertArticleQualityGateIntegrity,
  type ArticleQualityGateResult,
} from "./article-quality-gate-contract.js";
import {
  buildUniversalConnectorArtifact,
  buildUniversalMutationIntent,
  buildUniversalPreviewMutationRequest,
  type UniversalConnectorDescriptor,
  type UniversalMutationIntent,
  type UniversalPreviewMutationRequest,
} from "./universal-connector-contract.js";
import {
  findUniversalCapability,
  type UniversalCapabilityName,
} from "./universal-capability-registry.js";
import {
  assertUniversalResourceLocatorIntegrity,
  type UniversalResourceLocator,
} from "./universal-site-resource-identity.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_ARTICLE_PUBLISHING_CONTRACT_VERSION =
  "ugp-8-1-connector-neutral-article-publishing-v1" as const;

export type ArticlePublicationOperation =
  | "create"
  | "update"
  | "publish";

export type ArticlePublicationPlan = Readonly<{
  version: typeof UGP_ARTICLE_PUBLISHING_CONTRACT_VERSION;
  operation: ArticlePublicationOperation;
  capability: "create.article" | "update.article" | "publish.article";
  descriptorFingerprint: string;
  targetLocatorFingerprint: string;
  draftId: string;
  draftFingerprint: string;
  qualityGateId: string;
  qualityGateFingerprint: string;
  artifactFingerprint: string;
  mutationIntent: UniversalMutationIntent;
  previewRequest: UniversalPreviewMutationRequest;
  verification: Readonly<{
    required: true;
    capability: "verify.change";
    expectedStateFingerprint: string;
  }>;
  provenance: Readonly<{
    contentBriefFingerprint: string;
    sourceEvidenceLedgerFingerprint: string;
    articleDraftFingerprint: string;
    articleQualityGateFingerprint: string;
    contentOpportunityFingerprint: string;
    topicClusteringFingerprint: string;
  }>;
  semantics: Readonly<{
    deterministic: true;
    connectorNeutral: true;
    qualityGateRequired: true;
    previewRequiredBeforeExecution: true;
    verificationRequiredAfterExecution: true;
    authorizationReferenceRequiredForExecution: true;
    executionRequestConstructed: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    publicationAuthorized: false;
    executionAuthorized: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  planFingerprint: string;
}>;

const SEMANTICS = Object.freeze({
  deterministic: true as const,
  connectorNeutral: true as const,
  qualityGateRequired: true as const,
  previewRequiredBeforeExecution: true as const,
  verificationRequiredAfterExecution: true as const,
  authorizationReferenceRequiredForExecution: true as const,
  executionRequestConstructed: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  publicationAuthorized: false as const,
  executionAuthorized: false as const,
  providerWrites: false as const,
  publicSiteWrites: false as const,
});

const OPERATION_CAPABILITY: Readonly<
  Record<ArticlePublicationOperation, ArticlePublicationPlan["capability"]>
> = Object.freeze({
  create: "create.article",
  update: "update.article",
  publish: "publish.article",
});

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("ugp_article_publishing_invalid_" + field);
  }
  return value;
}

function requireCapability(
  descriptor: UniversalConnectorDescriptor,
  capability: UniversalCapabilityName,
  target: UniversalResourceLocator,
): void {
  if (!findUniversalCapability(descriptor.registry, capability, target.kind)) {
    throw new Error("ugp_article_publishing_capability_not_available:" + capability);
  }
}

function assertArticleTarget(target: UniversalResourceLocator): void {
  assertUniversalResourceLocatorIntegrity(target);
  if (target.kind !== "article" && target.kind !== "blog_post") {
    throw new Error("ugp_article_publishing_article_target_required");
  }
}

function assertPublishableLineage(
  draft: ArticleDraftPipelineResult,
  qualityGate: ArticleQualityGateResult,
): void {
  assertArticleDraftPipelineIntegrity(draft);
  assertArticleQualityGateIntegrity(qualityGate);

  if (
    qualityGate.draftId !== draft.draftId
    || qualityGate.draftFingerprint !== draft.draftFingerprint
  ) {
    throw new Error("ugp_article_publishing_quality_gate_draft_mismatch");
  }
  if (
    qualityGate.status !== "pass"
    || qualityGate.approvalEligible !== true
  ) {
    throw new Error("ugp_article_publishing_quality_gate_not_eligible");
  }
  if (
    draft.status !== "draft_complete"
    || draft.articleBody === null
    || draft.finishingAssets === null
  ) {
    throw new Error("ugp_article_publishing_complete_draft_required");
  }
}

export function buildArticlePublicationPlan(input: {
  operation: ArticlePublicationOperation;
  descriptor: UniversalConnectorDescriptor;
  target: UniversalResourceLocator;
  draft: ArticleDraftPipelineResult;
  qualityGate: ArticleQualityGateResult;
  expectedStateFingerprint: string;
  proposedStateFingerprint: string;
}): ArticlePublicationPlan {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_article_publishing_invalid_input");
  }

  assertArticleTarget(input.target);
  assertPublishableLineage(input.draft, input.qualityGate);

  const capability = OPERATION_CAPABILITY[input.operation];
  if (!capability) {
    throw new Error("ugp_article_publishing_invalid_operation");
  }

  requireCapability(input.descriptor, capability, input.target);
  requireCapability(input.descriptor, "preview.change", input.target);
  requireCapability(input.descriptor, "verify.change", input.target);

  const expectedStateFingerprint = exactFingerprint(
    input.expectedStateFingerprint,
    "expected_state_fingerprint",
  );
  const proposedStateFingerprint = exactFingerprint(
    input.proposedStateFingerprint,
    "proposed_state_fingerprint",
  );

  const artifact = buildUniversalConnectorArtifact({
    schemaId: "ugp.article.publication.v1",
    payload: {
      article: {
        draftId: input.draft.draftId,
        draftFingerprint: input.draft.draftFingerprint,
        qualityGateId: input.qualityGate.gateId,
        qualityGateFingerprint: input.qualityGate.gateFingerprint,
        targetTopic: input.draft.targetTopic,
        body: input.draft.articleBody,
        metadata: {
          title: input.draft.finishingAssets.metadata.title,
          metaDescription:
            input.draft.finishingAssets.metadata.metaDescription,
        },
        schemaPlan: input.draft.finishingAssets.schemaPlan,
        mediaPlan: input.draft.finishingAssets.mediaPlan,
      },
      publication: {
        operation: input.operation,
        qualityGatePassed: true,
        approvalEligible: true,
      },
      provenance: {
        contentBriefFingerprint:
          input.qualityGate.provenance.contentBriefFingerprint,
        sourceEvidenceLedgerFingerprint:
          input.qualityGate.provenance.sourceEvidenceLedgerFingerprint,
        articleDraftFingerprint:
          input.qualityGate.provenance.articleDraftFingerprint,
        articleQualityGateFingerprint: input.qualityGate.gateFingerprint,
        contentOpportunityFingerprint:
          input.qualityGate.provenance.contentOpportunityFingerprint,
        topicClusteringFingerprint:
          input.qualityGate.provenance.topicClusteringFingerprint,
      },
    },
  });

  const mutationIntent = buildUniversalMutationIntent({
    descriptor: input.descriptor,
    capability,
    target: input.target,
    artifact,
    expectedStateFingerprint,
    proposedStateFingerprint,
  });

  const previewRequest = buildUniversalPreviewMutationRequest({
    mutation: mutationIntent,
  });

  const provenance = Object.freeze({
    contentBriefFingerprint:
      input.qualityGate.provenance.contentBriefFingerprint,
    sourceEvidenceLedgerFingerprint:
      input.qualityGate.provenance.sourceEvidenceLedgerFingerprint,
    articleDraftFingerprint:
      input.qualityGate.provenance.articleDraftFingerprint,
    articleQualityGateFingerprint: input.qualityGate.gateFingerprint,
    contentOpportunityFingerprint:
      input.qualityGate.provenance.contentOpportunityFingerprint,
    topicClusteringFingerprint:
      input.qualityGate.provenance.topicClusteringFingerprint,
  });

  const base = {
    version: UGP_ARTICLE_PUBLISHING_CONTRACT_VERSION,
    operation: input.operation,
    capability,
    descriptorFingerprint: input.descriptor.descriptorFingerprint,
    targetLocatorFingerprint: input.target.resourceLocatorFingerprint,
    draftId: input.draft.draftId,
    draftFingerprint: input.draft.draftFingerprint,
    qualityGateId: input.qualityGate.gateId,
    qualityGateFingerprint: input.qualityGate.gateFingerprint,
    artifactFingerprint: artifact.artifactFingerprint,
    mutationIntent,
    previewRequest,
    verification: Object.freeze({
      required: true as const,
      capability: "verify.change" as const,
      expectedStateFingerprint: proposedStateFingerprint,
    }),
    provenance,
    semantics: SEMANTICS,
  };

  return Object.freeze({
    ...base,
    planFingerprint: stableEvidenceHash({
      purpose: "ugp_article_publication_plan",
      ...base,
    }),
  });
}

export function assertArticlePublicationPlanIntegrity(
  plan: ArticlePublicationPlan,
): void {
  if (
    !plan
    || plan.version !== UGP_ARTICLE_PUBLISHING_CONTRACT_VERSION
  ) {
    throw new Error("ugp_article_publishing_version_invalid");
  }
  if (
    plan.semantics.deterministic !== true
    || plan.semantics.connectorNeutral !== true
    || plan.semantics.qualityGateRequired !== true
    || plan.semantics.previewRequiredBeforeExecution !== true
    || plan.semantics.verificationRequiredAfterExecution !== true
    || plan.semantics.authorizationReferenceRequiredForExecution !== true
    || plan.semantics.executionRequestConstructed !== false
    || plan.semantics.performsNetworkOperation !== false
    || plan.semantics.performsPersistence !== false
    || plan.semantics.publicationAuthorized !== false
    || plan.semantics.executionAuthorized !== false
    || plan.semantics.providerWrites !== false
    || plan.semantics.publicSiteWrites !== false
  ) {
    throw new Error("ugp_article_publishing_unsafe_semantics");
  }
  exactFingerprint(plan.planFingerprint, "plan_fingerprint");
  if (
    plan.mutationIntent.intentFingerprint
    !== plan.previewRequest.mutation.intentFingerprint
  ) {
    throw new Error("ugp_article_publishing_preview_intent_mismatch");
  }
  if (
    plan.verification.expectedStateFingerprint
    !== plan.mutationIntent.proposedStateFingerprint
  ) {
    throw new Error("ugp_article_publishing_verification_state_mismatch");
  }
  const { planFingerprint, ...base } = plan;
  const expected = stableEvidenceHash({
    purpose: "ugp_article_publication_plan",
    ...base,
  });
  if (planFingerprint !== expected) {
    throw new Error("ugp_article_publishing_fingerprint_mismatch");
  }
}
