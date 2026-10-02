export type ArticleWorkspaceStatus =
  | "available"
  | "unavailable"
  | "blocked"
  | "pass"
  | "warning"
  | "not_published";

export type ArticleWorkspaceSnapshot = Readonly<{
  articleId: string;
  title: string;
  targetTopic: string;
  research: Readonly<{
    status: ArticleWorkspaceStatus;
    summary: string;
    questionCount: number;
    unresolvedEvidenceClasses: readonly string[];
  }>;
  sources: readonly Readonly<{
    sourceId: string;
    title: string;
    publisher: string | null;
    supportTier: string;
    evidenceCount: number;
  }>[];
  outline: readonly Readonly<{
    sectionId: string;
    order: number;
    headingIntent: string;
    evidenceCount: number;
    unresolvedEvidenceClasses: readonly string[];
  }>[];
  draft: Readonly<{
    status: ArticleWorkspaceStatus;
    body: string | null;
    draftFingerprint: string;
    deterministicFromFrozenInputs: boolean;
  }>;
  claims: readonly Readonly<{
    claimKey: string;
    text: string;
    verificationStatus: string;
    citationEvidenceIds: readonly string[];
  }>[];
  seoChecks: readonly Readonly<{
    check: string;
    status: ArticleWorkspaceStatus;
    summary: string;
  }>[];
  internalLinks: readonly Readonly<{
    targetUrl: string;
    targetLabel: string;
    evidenceCount: number;
  }>[];
  qualityGate: Readonly<{
    status: ArticleWorkspaceStatus;
    approvalEligible: boolean;
    blockingReasons: readonly string[];
    modelConfidenceIsNotQualityGate: true;
  }>;
  publication: Readonly<{
    status: "not_published" | "published";
    publicationAuthorized: boolean;
    publishedUrl: string | null;
  }>;
  provenance: Readonly<{
    researchPlanFingerprint: string;
    sourceEvidenceLedgerFingerprint: string;
    briefFingerprint: string;
    draftFingerprint: string;
    qualityGateFingerprint: string;
  }>;
}>;

export type ArticleWorkspaceModel = Readonly<{
  binding: "available" | "unavailable";
  title: string;
  subtitle: string;
  snapshot: ArticleWorkspaceSnapshot | null;
  notice: string;
  capabilities: Readonly<{
    networkExecutionEnabled: false;
    productionEvidenceReadsAuthorized: false;
    persistenceAuthorized: false;
    publicationAuthorized: false;
    schedulerEnabled: false;
    workerEnabled: false;
    publicSiteWrites: false;
  }>;
}>;

const CLOSED_CAPABILITIES = Object.freeze({
  networkExecutionEnabled: false as const,
  productionEvidenceReadsAuthorized: false as const,
  persistenceAuthorized: false as const,
  publicationAuthorized: false as const,
  schedulerEnabled: false as const,
  workerEnabled: false as const,
  publicSiteWrites: false as const,
});

export function buildArticleWorkspaceModel(
  snapshot: ArticleWorkspaceSnapshot | null,
): ArticleWorkspaceModel {
  if (snapshot === null) {
    return Object.freeze({
      binding: "unavailable" as const,
      title: "Article workspace",
      subtitle: "Research, draft, provenance, quality, and publication state",
      snapshot: null,
      notice:
        "No certified article artifact is bound to this workspace. No research progress, sources, draft text, citations, SEO results, internal links, or publication state are synthesized.",
      capabilities: CLOSED_CAPABILITIES,
    });
  }

  return Object.freeze({
    binding: "available" as const,
    title: snapshot.title,
    subtitle: snapshot.targetTopic,
    snapshot,
    notice:
      "This workspace renders a frozen article artifact. Quality-gate status remains separate from model confidence, and generation completion never grants publication authority.",
    capabilities: CLOSED_CAPABILITIES,
  });
}
