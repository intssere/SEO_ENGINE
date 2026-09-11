import type { CrawlPageSignal, OpportunityCandidate } from "./opportunity-engine.js";
import { buildPageSpecificMetaDescription, cleanPageEvidence, normalizeProposalText } from "./proposal-content.js";
import { buildSemanticPageProfile, type SemanticPageProfile } from "./semantic-evidence.js";
import type { AiProposalAudit } from "./ai-proposal.js";

export const proposalLifecycleStages = [
  "draft_dry_run",
  "approval_ready",
  "approved_proposal",
  "executable_action",
  "executed_change",
  "verified_result",
  "invalidated",
] as const;
export type ProposalLifecycleStage = typeof proposalLifecycleStages[number];

export type DryRunProposal = {
  status: "pending";
  riskLevel: "blocked";
  rationale: string;
  expectedOutcome: {
    planner: "dry_run_action_planner_v1";
    lifecycleStage: ProposalLifecycleStage;
    dryRun: true;
    executionAuthorized: false;
    publicSiteWrites: false;
    automaticTransition: false;
    opportunityType: OpportunityCandidate["opportunityType"];
    riskClassification: OpportunityCandidate["risk"];
    confidence: number;
    page: { id: string; url: string };
    semanticProfile: SemanticPageProfile | null;
    generation: {
      method: "deterministic" | "ai_generated" | "ai_refined";
      aiAssisted: boolean;
      generatedValue: string | null;
      aiAudit: AiProposalAudit | null;
    };
    proposal: {
      actionType: string;
      field: string;
      beforeValue: string | null;
      afterValue: string | null;
      rationale: string;
      expectedBenefit: string;
      rollback: string;
      supportingEvidenceIds: string[];
      evidenceSufficient: boolean;
      blockedReason: string | null;
      boundedPilot: true;
      wholeSiteCoverage: false;
    };
  };
};

const normalize = (value: string | null | undefined) => normalizeProposalText(value);
const words = (value: string) => value.match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) ?? [];
const sentence = (value: string, max = 155) => {
  const clean = normalize(value);
  if (!clean) return "";
  const end = clean.search(/[.!?](?:\s|$)/);
  const candidate = (end >= 0 ? clean.slice(0, end + 1) : clean).slice(0, max).trim();
  return candidate.length >= 36 && words(candidate).length >= 6 ? candidate : "";
};
const pageContext = (page: CrawlPageSignal) => sentence(cleanPageEvidence(page.contentText)) || normalize(page.h1) || normalize(page.title);

function proposalDetails(candidate: OpportunityCandidate, page: CrawlPageSignal | undefined, semanticProfile: SemanticPageProfile | null) {
  if (!page) return null;
  const context = pageContext(page);
  if (!context) return null;
  const title = normalize(page.title);
  const h1 = normalize(page.h1);
  const description = normalize(page.description);
  const query = normalize(candidate.query);
  const base = {
    rationale: candidate.rationale,
    expectedBenefit: candidate.opportunityType === "organic_ctr"
      ? "Improve relevance of the observed search snippet for an already-ranking query; click impact remains unverified."
      : candidate.opportunityType === "striking_distance"
        ? "Clarify the page's observed topic for the tracked query; ranking impact remains unverified."
        : candidate.opportunityType === "internal_link"
          ? "Make an observed relevant internal path easier to discover; crawl and ranking impact remain unverified."
          : candidate.opportunityType === "content_alignment"
            ? "Make the observed title/H1 more aligned to the tracked query; ranking impact remains unverified."
            : "Address the observed technical metadata gap on this bounded-crawl page; outcome remains unverified.",
  };
  if (candidate.opportunityType === "technical_remediation") {
    if (/meta description/i.test(candidate.title)) {
      const after = buildPageSpecificMetaDescription(page, semanticProfile ?? undefined);
      if (!after) return null;
      return { ...base, actionType: "update_meta_description", field: "meta_description", beforeValue: description || null, afterValue: after, rollback: `Restore the observed meta description exactly: ${description || "(empty value)"}.` };
    }
    if (/page title/i.test(candidate.title) && !title) {
      const after = (h1 || sentence(context, 70)).slice(0, 70);
      if (!after) return null;
      return { ...base, actionType: "update_page_title", field: "title", beforeValue: null, afterValue: after, rollback: "Restore the observed empty title value." };
    }
    if (/heading|h1/i.test(candidate.title) && !h1) {
      const after = (title || sentence(context, 90)).slice(0, 90);
      if (!after) return null;
      return { ...base, actionType: "update_primary_heading", field: "h1", beforeValue: null, afterValue: after, rollback: "Restore the observed empty H1 value." };
    }
    return null;
  }
  if (candidate.opportunityType === "organic_ctr" && query) {
    const after = buildPageSpecificMetaDescription(page, semanticProfile ?? undefined);
    if (!after) return null;
    return { ...base, actionType: "update_meta_description", field: "meta_description", beforeValue: description || null, afterValue: after, rollback: `Restore the observed meta description exactly: ${description || "(empty value)"}.` };
  }
  if (candidate.opportunityType === "striking_distance" && query) {
    const after = `Add a page section headed “${query}” using only reviewed page facts from: ${context.slice(0, 100)}`;
    return { ...base, actionType: "add_content_section", field: "content_brief", beforeValue: title || h1 || null, afterValue: after, rollback: "Remove the proposed section and restore the current observed page content." };
  }
  if (candidate.opportunityType === "content_alignment" && query) {
    const after = `${query} — ${(h1 || title || context).slice(0, 80)}`.slice(0, 120);
    return { ...base, actionType: "update_primary_heading", field: "h1", beforeValue: h1 || null, afterValue: after, rollback: `Restore the observed H1 exactly: ${h1 || "(empty value)"}.` };
  }
  if (candidate.opportunityType === "internal_link" && query) {
    const after = `Add one reviewed contextual link with anchor “${query}” to ${page.url}.`;
    return { ...base, actionType: "add_internal_link", field: "internal_link", beforeValue: "No selected source-page placement is approved.", afterValue: after, rollback: "Remove the added contextual link and restore the source page's prior link markup." };
  }
  return null;
}

export function createDryRunProposal(
  candidate: OpportunityCandidate,
  page: CrawlPageSignal | undefined,
  supportingEvidenceIds: string[],
  profile?: SemanticPageProfile,
): DryRunProposal {
  const semanticProfile = profile ?? (page ? buildSemanticPageProfile({ page, candidate }) : null);
  const details = proposalDetails(candidate, page, semanticProfile);
  const evidenceIds = [...new Set(supportingEvidenceIds.filter(Boolean))].sort();
  const sufficient = Boolean(details && page && evidenceIds.length >= 2);
  const requiresCleanMetaEvidence = Boolean(page
    && (/meta description/i.test(candidate.title) || candidate.opportunityType === "organic_ctr"));
  const blockedReason = sufficient
    ? null
    : requiresCleanMetaEvidence && !details
      ? "insufficient_clean_evidence"
      : "insufficient_persisted_evidence";
  const pageIdentity = page ? { id: page.pageId, url: page.url } : { id: candidate.pageId, url: "" };
  return {
    status: "pending",
    riskLevel: "blocked",
    rationale: details?.rationale ?? `${candidate.recommendation} Proposal remains blocked because source evidence is insufficient for a concrete change.`,
    expectedOutcome: {
      planner: "dry_run_action_planner_v1",
      lifecycleStage: "draft_dry_run",
      dryRun: true,
      executionAuthorized: false,
      publicSiteWrites: false,
      automaticTransition: false,
      opportunityType: candidate.opportunityType,
      riskClassification: candidate.risk,
      confidence: candidate.confidence,
      page: pageIdentity,
      semanticProfile,
      generation: {
        method: "deterministic",
        aiAssisted: false,
        generatedValue: details?.afterValue ?? null,
        aiAudit: null,
      },
      proposal: {
        actionType: details?.actionType ?? "evidence_review_required",
        field: details?.field ?? "unresolved",
        beforeValue: details?.beforeValue ?? null,
        afterValue: details?.afterValue ?? null,
        rationale: details?.rationale ?? candidate.rationale,
        expectedBenefit: details?.expectedBenefit ?? "No benefit is estimated until sufficient persisted evidence supports a concrete proposal.",
        rollback: details?.rollback ?? "No public-site change exists; no rollback is required.",
        supportingEvidenceIds: evidenceIds,
        evidenceSufficient: sufficient,
        blockedReason,
        boundedPilot: true,
        wholeSiteCoverage: false,
      },
    },
  };
}

export function invalidateDryRunProposal<T extends Record<string, unknown>>(expectedOutcome: T, reason: string): T & {
  lifecycleStage: "invalidated";
  executionAuthorized: false;
  publicSiteWrites: false;
  invalidatedReason: string;
  invalidatedAtReconciliation: true;
} {
  return {
    ...expectedOutcome,
    lifecycleStage: "invalidated" as const,
    executionAuthorized: false as const,
    publicSiteWrites: false as const,
    invalidatedReason: reason,
    invalidatedAtReconciliation: true,
  };
}