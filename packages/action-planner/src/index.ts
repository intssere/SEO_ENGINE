import { createHash } from "node:crypto";

export type SafetyDisposition = "auto" | "approval" | "blocked";
export type ActionType =
  | "metadata.title"
  | "metadata.description"
  | "image.alt"
  | "internal_link.add"
  | "internal_link.fix_broken"
  | "schema.patch"
  | "sitemap.maintenance"
  | "content.major_rewrite"
  | "url.change"
  | "redirect.create"
  | "page.delete"
  | "architecture.change"
  | "unknown";

export interface OpportunityInput {
  siteId: string;
  opportunityId?: string | null;
  pageId?: string | null;
  type: string;
  score: number;
  confidence: number;
  title: string;
  rationale?: Record<string, unknown>;
}

export interface ProposedActionInput {
  actionType: ActionType;
  target: Record<string, unknown>;
  proposedChange: Record<string, unknown>;
  expectedState?: Record<string, unknown>;
}

export interface PlannerContext {
  publicSiteWritesEnabled?: boolean;
  algorithmUpdateMode?: boolean;
  policyConfidenceTier?: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  reversible?: boolean;
  affectsUrl?: boolean;
  affectsNavigation?: boolean;
  destructive?: boolean;
}

export interface PlannedAction {
  actionType: ActionType;
  disposition: SafetyDisposition;
  reasons: string[];
  target: Record<string, unknown>;
  proposedChange: Record<string, unknown>;
  expectedState: Record<string, unknown>;
  dedupeKey: string;
}

export interface ActionPlan {
  siteId: string;
  opportunityId: string | null;
  pageId: string | null;
  riskLevel: SafetyDisposition;
  rationale: string;
  expectedOutcome: Record<string, unknown>;
  actions: PlannedAction[];
  dedupeKey: string;
}

const AUTO_SAFE = new Set<ActionType>([
  "metadata.title",
  "metadata.description",
  "image.alt",
  "internal_link.fix_broken",
  "schema.patch",
  "sitemap.maintenance",
]);

const APPROVAL_REQUIRED = new Set<ActionType>([
  "internal_link.add",
  "content.major_rewrite",
  "url.change",
  "redirect.create",
  "page.delete",
  "architecture.change",
]);

function hash(parts: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

function boundedConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function classifyAction(action: ProposedActionInput, context: PlannerContext = {}): { disposition: SafetyDisposition; reasons: string[] } {
  const reasons: string[] = [];

  if (action.actionType === "unknown") {
    return { disposition: "blocked", reasons: ["Unknown action type is never eligible for execution."] };
  }

  if (context.policyConfidenceTier && ["D", "E", "F", "G"].includes(context.policyConfidenceTier)) {
    return { disposition: "blocked", reasons: [`Policy confidence tier ${context.policyConfidenceTier} is insufficient for executable planning.`] };
  }

  if (context.destructive || action.actionType === "page.delete") {
    reasons.push("Destructive change requires explicit human approval.");
    return { disposition: "approval", reasons };
  }

  if (context.affectsUrl || action.actionType === "url.change" || action.actionType === "redirect.create") {
    reasons.push("URL/redirect changes require explicit human approval.");
    return { disposition: "approval", reasons };
  }

  if (context.affectsNavigation || action.actionType === "architecture.change") {
    reasons.push("Navigation or architecture changes require explicit human approval.");
    return { disposition: "approval", reasons };
  }

  if (context.algorithmUpdateMode && !AUTO_SAFE.has(action.actionType)) {
    reasons.push("Algorithm Update Mode freezes non-low-risk autonomous changes.");
    return { disposition: "approval", reasons };
  }

  if (AUTO_SAFE.has(action.actionType)) {
    if (context.reversible === false) {
      return { disposition: "approval", reasons: ["Low-risk action is not known to be reversible."] };
    }
    reasons.push("Action type is in the low-risk allowlist and is reversible by default.");
    if (context.publicSiteWritesEnabled !== true) reasons.push("Public site writes are disabled; classification does not execute the action.");
    return { disposition: "auto", reasons };
  }

  if (APPROVAL_REQUIRED.has(action.actionType)) {
    return { disposition: "approval", reasons: ["Action type requires explicit human approval."] };
  }

  return { disposition: "blocked", reasons: ["Action does not match an approved safety policy."] };
}

function maxRisk(actions: PlannedAction[]): SafetyDisposition {
  if (actions.some((a) => a.disposition === "blocked")) return "blocked";
  if (actions.some((a) => a.disposition === "approval")) return "approval";
  return "auto";
}

export function buildActionPlan(
  opportunity: OpportunityInput,
  proposedActions: ProposedActionInput[],
  context: PlannerContext = {},
): ActionPlan {
  if (!opportunity.siteId.trim()) throw new Error("siteId is required");
  if (!proposedActions.length) throw new Error("At least one proposed action is required");

  const actions = proposedActions.map((action) => {
    const classification = classifyAction(action, context);
    return {
      actionType: action.actionType,
      disposition: classification.disposition,
      reasons: classification.reasons,
      target: action.target,
      proposedChange: action.proposedChange,
      expectedState: action.expectedState ?? {},
      dedupeKey: hash([opportunity.siteId, opportunity.opportunityId ?? null, action.actionType, action.target, action.proposedChange]),
    } satisfies PlannedAction;
  });

  const riskLevel = maxRisk(actions);
  const confidence = boundedConfidence(opportunity.confidence);
  const rationale = `${opportunity.title} | score=${Math.max(0, Math.min(100, opportunity.score))} | confidence=${confidence} | safety=${riskLevel}`;

  return {
    siteId: opportunity.siteId,
    opportunityId: opportunity.opportunityId ?? null,
    pageId: opportunity.pageId ?? null,
    riskLevel,
    rationale,
    expectedOutcome: {
      opportunityType: opportunity.type,
      opportunityScore: Math.max(0, Math.min(100, opportunity.score)),
      opportunityConfidence: confidence,
      executionEnabled: context.publicSiteWritesEnabled === true,
      actionCount: actions.length,
    },
    actions,
    dedupeKey: hash([opportunity.siteId, opportunity.opportunityId ?? null, actions.map((a) => a.dedupeKey)]),
  };
}

export function toActionPlanInsert(plan: ActionPlan) {
  return {
    siteId: plan.siteId,
    opportunityId: plan.opportunityId,
    status: "pending" as const,
    riskLevel: plan.riskLevel,
    rationale: plan.rationale,
    expectedOutcome: { ...plan.expectedOutcome, dedupeKey: plan.dedupeKey },
  };
}

export function toActionInserts(plan: ActionPlan) {
  return plan.actions.map((action) => ({
    pageId: plan.pageId,
    actionType: action.actionType,
    status: "pending" as const,
    target: action.target,
    proposedChange: {
      ...action.proposedChange,
      safetyDisposition: action.disposition,
      safetyReasons: action.reasons,
      dedupeKey: action.dedupeKey,
    },
    expectedState: action.expectedState,
  }));
}
