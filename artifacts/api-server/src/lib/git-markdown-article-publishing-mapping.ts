import {
  assertArticlePublicationPlanIntegrity,
  type ArticlePublicationPlan,
} from "./article-publishing-contract.js";
import {
  assertControlledGitPlanIntegrity,
  buildControlledGitPlan,
  type ControlledGitPlan,
} from "./controlled-git-connector.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_GIT_MARKDOWN_ARTICLE_MAPPING_VERSION =
  "ugp-8-1-git-markdown-article-mapping-v1" as const;

export type GitMarkdownFormat = "md" | "mdx";

export type GitMarkdownFrontmatterBinding = Readonly<{
  titleField: string;
  descriptionField: string;
  publicationField: string;
  draftValue: string | number | boolean;
  publishedValue: string | number | boolean;
}>;

export type GitMarkdownArticlePublishingMapping = Readonly<{
  version: typeof UGP_GIT_MARKDOWN_ARTICLE_MAPPING_VERSION;
  sourcePlanFingerprint: string;
  sourceOperation: ArticlePublicationPlan["operation"];
  format: GitMarkdownFormat;
  repository: string;
  defaultBranch: string;
  baseCommitSha: string;
  workingBranch: string;
  filePath: string;
  expectedBlobSha: string | null;
  frontmatterBinding: GitMarkdownFrontmatterBinding;
  publicationValue: string | number | boolean;
  fileContent: string;
  fileContentFingerprint: string;
  controlledGitPlan: ControlledGitPlan;
  expectedVerificationStateFingerprint: string;
  semantics: Readonly<{
    mappingOnly: true;
    deterministic: true;
    branchAndPullRequestOnly: true;
    directDefaultBranchWrite: false;
    createStartsUnpublished: true;
    updatePreservesObservedPublicationState: true;
    publishChangesPublicationStateOnlyByExplicitBinding: true;
    performsNetworkOperation: false;
    performsPersistence: false;
    usesCredentials: false;
    executionAuthorized: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  mappingFingerprint: string;
}>;

const SHA40 = /^[0-9a-f]{40}$/;
const SAFE_FIELD = /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/;

const SEMANTICS = Object.freeze({
  mappingOnly: true as const,
  deterministic: true as const,
  branchAndPullRequestOnly: true as const,
  directDefaultBranchWrite: false as const,
  createStartsUnpublished: true as const,
  updatePreservesObservedPublicationState: true as const,
  publishChangesPublicationStateOnlyByExplicitBinding: true as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  usesCredentials: false as const,
  executionAuthorized: false as const,
  providerWrites: false as const,
  publicSiteWrites: false as const,
});

function exactText(value: unknown, field: string, max: number): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || value.length < 1
    || value.length > max
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_git_markdown_article_invalid_" + field);
  }
  return value;
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ugp_git_markdown_article_invalid_" + field);
  }
  return value as Record<string, unknown>;
}

function exactField(value: unknown, field: string): string {
  if (typeof value !== "string" || !SAFE_FIELD.test(value)) {
    throw new Error("ugp_git_markdown_article_invalid_" + field);
  }
  return value;
}

function exactScalar(
  value: unknown,
  field: string,
): string | number | boolean {
  if (
    typeof value !== "string"
    && typeof value !== "number"
    && typeof value !== "boolean"
  ) {
    throw new Error("ugp_git_markdown_article_invalid_" + field);
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error("ugp_git_markdown_article_invalid_" + field);
  }
  if (
    typeof value === "string"
    && (
      value.length > 512
      || /[\u0000-\u001f\u007f]/.test(value)
    )
  ) {
    throw new Error("ugp_git_markdown_article_invalid_" + field);
  }
  return value;
}

function exactBinding(
  binding: GitMarkdownFrontmatterBinding,
): GitMarkdownFrontmatterBinding {
  if (!binding || typeof binding !== "object" || Array.isArray(binding)) {
    throw new Error("ugp_git_markdown_article_invalid_frontmatter_binding");
  }
  const titleField = exactField(binding.titleField, "title_field");
  const descriptionField = exactField(
    binding.descriptionField,
    "description_field",
  );
  const publicationField = exactField(
    binding.publicationField,
    "publication_field",
  );
  if (
    new Set([titleField, descriptionField, publicationField]).size !== 3
  ) {
    throw new Error("ugp_git_markdown_article_duplicate_frontmatter_field");
  }
  const draftValue = exactScalar(binding.draftValue, "draft_value");
  const publishedValue = exactScalar(
    binding.publishedValue,
    "published_value",
  );
  if (JSON.stringify(draftValue) === JSON.stringify(publishedValue)) {
    throw new Error("ugp_git_markdown_article_publication_values_equal");
  }
  return Object.freeze({
    titleField,
    descriptionField,
    publicationField,
    draftValue,
    publishedValue,
  });
}

function exactPath(value: unknown, format: GitMarkdownFormat): string {
  const path = exactText(value, "file_path", 1024);
  if (
    path.startsWith("/")
    || path.includes("\\")
    || path.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("ugp_git_markdown_article_invalid_file_path");
  }
  const extension = format === "md" ? ".md" : ".mdx";
  if (!path.toLowerCase().endsWith(extension)) {
    throw new Error("ugp_git_markdown_article_format_path_mismatch");
  }
  return path;
}

function articlePayload(plan: ArticlePublicationPlan): Readonly<{
  title: string;
  description: string;
  body: string;
}> {
  const artifact = plan.mutationIntent.artifact;
  if (artifact.schemaId !== "ugp.article.publication.v1") {
    throw new Error("ugp_git_markdown_article_unsupported_artifact_schema");
  }
  const root = asObject(artifact.payload, "artifact_payload");
  const article = asObject(root.article, "article_payload");
  const metadata = asObject(article.metadata, "article_metadata");
  return Object.freeze({
    title: exactText(metadata.title, "article_title", 512),
    description: exactText(
      metadata.metaDescription,
      "meta_description",
      1024,
    ),
    body: exactText(article.body, "article_body", 2_000_000),
  });
}

function scalarYaml(value: string | number | boolean): string {
  return JSON.stringify(value);
}

function renderContent(input: {
  article: Readonly<{title: string; description: string; body: string}>;
  binding: GitMarkdownFrontmatterBinding;
  publicationValue: string | number | boolean;
}): string {
  const lines = [
    "---",
    `${input.binding.titleField}: ${JSON.stringify(input.article.title)}`,
    `${input.binding.descriptionField}: ${JSON.stringify(input.article.description)}`,
    `${input.binding.publicationField}: ${scalarYaml(input.publicationValue)}`,
    "---",
    "",
    input.article.body,
    "",
  ];
  return lines.join("\n");
}

function assertGitArticlePlan(plan: ArticlePublicationPlan): void {
  assertArticlePublicationPlanIntegrity(plan);
  if (plan.mutationIntent.descriptor.connectorKind !== "git") {
    throw new Error("ugp_git_markdown_article_git_connector_required");
  }
  if (
    plan.mutationIntent.target.kind !== "article"
    && plan.mutationIntent.target.kind !== "blog_post"
  ) {
    throw new Error("ugp_git_markdown_article_article_target_required");
  }
  if (
    plan.semantics.executionAuthorized !== false
    || plan.semantics.publicationAuthorized !== false
    || plan.semantics.providerWrites !== false
    || plan.semantics.publicSiteWrites !== false
  ) {
    throw new Error("ugp_git_markdown_article_unsafe_source_plan");
  }
}

export function mapArticlePublicationPlanToGitMarkdown(input: {
  plan: ArticlePublicationPlan;
  format: GitMarkdownFormat;
  repository: string;
  defaultBranch: string;
  baseCommitSha: string;
  workingBranch: string;
  filePath: string;
  expectedBlobSha: string | null;
  framework: string | null;
  contentSource: string | null;
  detectionEvidencePaths: readonly string[];
  frontmatterBinding: GitMarkdownFrontmatterBinding;
  currentPublicationValue?: string | number | boolean | null;
}): GitMarkdownArticlePublishingMapping {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_git_markdown_article_invalid_input");
  }
  assertGitArticlePlan(input.plan);

  if (input.format !== "md" && input.format !== "mdx") {
    throw new Error("ugp_git_markdown_article_invalid_format");
  }

  const binding = exactBinding(input.frontmatterBinding);
  const filePath = exactPath(input.filePath, input.format);
  const article = articlePayload(input.plan);

  let publicationValue: string | number | boolean;
  let expectedBlobSha: string | null;

  if (input.plan.operation === "create") {
    if (input.expectedBlobSha !== null) {
      throw new Error("ugp_git_markdown_article_create_requires_absent_blob");
    }
    if (input.currentPublicationValue != null) {
      throw new Error(
        "ugp_git_markdown_article_create_rejects_current_publication_state",
      );
    }
    publicationValue = binding.draftValue;
    expectedBlobSha = null;
  } else {
    if (
      typeof input.expectedBlobSha !== "string"
      || !SHA40.test(input.expectedBlobSha)
    ) {
      throw new Error(
        "ugp_git_markdown_article_existing_blob_sha_required",
      );
    }
    expectedBlobSha = input.expectedBlobSha;

    if (input.plan.operation === "update") {
      if (input.currentPublicationValue == null) {
        throw new Error(
          "ugp_git_markdown_article_update_requires_publication_state",
        );
      }
      publicationValue = exactScalar(
        input.currentPublicationValue,
        "current_publication_value",
      );
    } else if (input.plan.operation === "publish") {
      if (
        input.currentPublicationValue != null
        && JSON.stringify(
          exactScalar(
            input.currentPublicationValue,
            "current_publication_value",
          ),
        ) === JSON.stringify(binding.publishedValue)
      ) {
        throw new Error("ugp_git_markdown_article_already_published");
      }
      publicationValue = binding.publishedValue;
    } else {
      throw new Error("ugp_git_markdown_article_invalid_operation");
    }
  }

  const targetExternalId = input.plan.mutationIntent.target.externalId;
  if (
    targetExternalId !== null
    && !targetExternalId.startsWith("planned:")
    && targetExternalId !== filePath
  ) {
    throw new Error("ugp_git_markdown_article_target_file_path_mismatch");
  }

  const fileContent = renderContent({
    article,
    binding,
    publicationValue,
  });
  const fileContentFingerprint = stableEvidenceHash({
    purpose: "ugp_git_markdown_article_file_content",
    format: input.format,
    filePath,
    fileContent,
  });

  const controlledGitPlan = buildControlledGitPlan({
    descriptor: input.plan.mutationIntent.descriptor,
    repository: input.repository,
    defaultBranch: input.defaultBranch,
    baseCommitSha: input.baseCommitSha,
    workingBranch: input.workingBranch,
    detection: {
      framework: input.framework,
      contentSource: input.contentSource,
      evidencePaths: input.detectionEvidencePaths,
    },
    patches: [{
      path: filePath,
      expectedBlobSha,
      proposedContentFingerprint: fileContentFingerprint,
    }],
  });
  assertControlledGitPlanIntegrity(controlledGitPlan);

  const base = {
    version: UGP_GIT_MARKDOWN_ARTICLE_MAPPING_VERSION,
    sourcePlanFingerprint: input.plan.planFingerprint,
    sourceOperation: input.plan.operation,
    format: input.format,
    repository: controlledGitPlan.repository.repository,
    defaultBranch: controlledGitPlan.repository.defaultBranch,
    baseCommitSha: controlledGitPlan.repository.baseCommitSha,
    workingBranch: controlledGitPlan.change.workingBranch,
    filePath,
    expectedBlobSha,
    frontmatterBinding: binding,
    publicationValue,
    fileContent,
    fileContentFingerprint,
    controlledGitPlan,
    expectedVerificationStateFingerprint:
      input.plan.verification.expectedStateFingerprint,
    semantics: SEMANTICS,
  };

  return Object.freeze({
    ...base,
    mappingFingerprint: stableEvidenceHash({
      purpose: "ugp_git_markdown_article_publishing_mapping",
      ...base,
    }),
  });
}

export function assertGitMarkdownArticlePublishingMappingIntegrity(
  mapping: GitMarkdownArticlePublishingMapping,
): void {
  if (
    !mapping
    || mapping.version !== UGP_GIT_MARKDOWN_ARTICLE_MAPPING_VERSION
    || (mapping.format !== "md" && mapping.format !== "mdx")
  ) {
    throw new Error("ugp_git_markdown_article_mapping_shape_invalid");
  }

  exactPath(mapping.filePath, mapping.format);
  exactBinding(mapping.frontmatterBinding);
  assertControlledGitPlanIntegrity(mapping.controlledGitPlan);

  if (
    mapping.controlledGitPlan.change.pullRequestRequired !== true
    || mapping.controlledGitPlan.change.directDefaultBranchWrite !== false
    || mapping.semantics.mappingOnly !== true
    || mapping.semantics.deterministic !== true
    || mapping.semantics.branchAndPullRequestOnly !== true
    || mapping.semantics.directDefaultBranchWrite !== false
    || mapping.semantics.createStartsUnpublished !== true
    || mapping.semantics.updatePreservesObservedPublicationState !== true
    || mapping.semantics
      .publishChangesPublicationStateOnlyByExplicitBinding !== true
    || mapping.semantics.performsNetworkOperation !== false
    || mapping.semantics.performsPersistence !== false
    || mapping.semantics.usesCredentials !== false
    || mapping.semantics.executionAuthorized !== false
    || mapping.semantics.providerWrites !== false
    || mapping.semantics.publicSiteWrites !== false
  ) {
    throw new Error("ugp_git_markdown_article_mapping_unsafe_semantics");
  }

  const expectedFileFingerprint = stableEvidenceHash({
    purpose: "ugp_git_markdown_article_file_content",
    format: mapping.format,
    filePath: mapping.filePath,
    fileContent: mapping.fileContent,
  });
  if (mapping.fileContentFingerprint !== expectedFileFingerprint) {
    throw new Error(
      "ugp_git_markdown_article_file_content_fingerprint_mismatch",
    );
  }

  const patch = mapping.controlledGitPlan.change.patches[0];
  if (
    mapping.controlledGitPlan.change.patches.length !== 1
    || !patch
    || patch.path !== mapping.filePath
    || patch.expectedBlobSha !== mapping.expectedBlobSha
    || patch.proposedContentFingerprint !== mapping.fileContentFingerprint
  ) {
    throw new Error("ugp_git_markdown_article_controlled_plan_mismatch");
  }

  const { mappingFingerprint, ...base } = mapping;
  const expected = stableEvidenceHash({
    purpose: "ugp_git_markdown_article_publishing_mapping",
    ...base,
  });
  if (mappingFingerprint !== expected) {
    throw new Error("ugp_git_markdown_article_mapping_fingerprint_mismatch");
  }
}
