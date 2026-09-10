import {
  buildActionPlan,
  type ActionPlan,
  type ActionType,
  type PlannerContext,
  type ProposedActionInput,
} from "@seo-engine/action-planner";

export interface DryRunOpportunity {
  siteId: string;
  opportunityId?: string | null;
  pageId?: string | null;
  source: "technical" | "ranking" | "internal_link" | "ai_visibility";
  title: string;
  score: number;
  confidence: number;
  evidenceRef: string;
  rationale: Record<string, unknown>;
}

export interface DryRunProposal {
  opportunity: DryRunOpportunity;
  actionType: ActionType;
  target: Record<string, unknown>;
  proposedChange: Record<string, unknown>;
  expectedState: Record<string, unknown>;
  rollbackIntent: Record<string, unknown>;
  evidenceRefs: string[];
  reversible?: boolean;
  affectsUrl?: boolean;
  affectsNavigation?: boolean;
  destructive?: boolean;
  policyConfidenceTier?: PlannerContext["policyConfidenceTier"];
}

export interface DryRunPlanResult {
  status: "blocked" | "ready";
  blockers: string[];
  executionEnabled: false;
  plan: ActionPlan | null;
  evidenceRefs: string[];
  rollbackIntent: Record<string, unknown> | null;
}

function uniqueEvidence(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

export function buildDryRunPlan(input: DryRunProposal): DryRunPlanResult {
  const blockers: string[] = [];
  const evidenceRefs = uniqueEvidence(input.evidenceRefs);
  const primaryEvidence = input.opportunity.evidenceRef.trim();

  if (!input.opportunity.siteId.trim()) blockers.push("siteId is required");
  if (!input.opportunity.title.trim()) blockers.push("opportunity title is required");
  if (!primaryEvidence) blockers.push("opportunity evidenceRef is required");
  if (primaryEvidence && !evidenceRefs.includes(primaryEvidence)) {
    blockers.push("proposal must preserve the opportunity evidence reference");
  }
  if (Object.keys(input.expectedState).length === 0) blockers.push("expectedState is required for verification planning");
  if (Object.keys(input.rollbackIntent).length === 0) blockers.push("rollbackIntent is required before production eligibility");

  if (blockers.length > 0) {
    return {
      status: "blocked",
      blockers,
      executionEnabled: false,
      plan: null,
      evidenceRefs,
      rollbackIntent: Object.keys(input.rollbackIntent).length ? input.rollbackIntent : null,
    };
  }

  const proposedAction: ProposedActionInput = {
    actionType: input.actionType,
    target: input.target,
    proposedChange: input.proposedChange,
    expectedState: input.expectedState,
  };

  const plan = buildActionPlan(
    {
      siteId: input.opportunity.siteId,
      opportunityId: input.opportunity.opportunityId ?? null,
      pageId: input.opportunity.pageId ?? null,
      type: input.opportunity.source,
      score: input.opportunity.score,
      confidence: input.opportunity.confidence,
      title: input.opportunity.title,
      rationale: {
        ...input.opportunity.rationale,
        evidenceRefs,
        rollbackIntent: input.rollbackIntent,
        dryRun: true,
      },
    },
    [proposedAction],
    {
      publicSiteWritesEnabled: false,
      ...(input.reversible !== undefined ? { reversible: input.reversible } : {}),
      ...(input.affectsUrl !== undefined ? { affectsUrl: input.affectsUrl } : {}),
      ...(input.affectsNavigation !== undefined ? { affectsNavigation: input.affectsNavigation } : {}),
      ...(input.destructive !== undefined ? { destructive: input.destructive } : {}),
      ...(input.policyConfidenceTier ? { policyConfidenceTier: input.policyConfidenceTier } : {}),
    },
  );

  return {
    status: "ready",
    blockers: [],
    executionEnabled: false,
    plan,
    evidenceRefs,
    rollbackIntent: input.rollbackIntent,
  };
}

export function summarizeDryRun(results: DryRunPlanResult[]) {
  return {
    total: results.length,
    ready: results.filter((result) => result.status === "ready").length,
    blocked: results.filter((result) => result.status === "blocked").length,
    auto: results.filter((result) => result.plan?.riskLevel === "auto").length,
    approval: results.filter((result) => result.plan?.riskLevel === "approval").length,
    policyBlocked: results.filter((result) => result.plan?.riskLevel === "blocked").length,
    executionEnabled: false as const,
  };
}
