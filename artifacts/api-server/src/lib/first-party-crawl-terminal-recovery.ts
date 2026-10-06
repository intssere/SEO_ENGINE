import { createHash } from "node:crypto";
import {
  assertFullSiteCrawlCheckpointIntegrity,
  classifyCrawlRetry,
  type CrawlRetryDecision,
  type FullSiteCrawlCheckpoint,
  type FullSiteCrawlExecutionPlan,
  type SuppliedCrawlUrlOutcome,
  type TerminalFailureRecoveryOutcome,
} from "./full-site-crawl-control.js";

export const P12_2_TERMINAL_FAILURE_EVENT_VERSION =
  "first_party_terminal_failure_event_v1" as const;
export const P12_2_TERMINAL_FAILURE_RECOVERY_PLAN_VERSION =
  "first_party_terminal_failure_recovery_plan_v1" as const;
export const P12_2_TERMINAL_FAILURE_RECOVERY_RECEIPT_VERSION =
  "first_party_terminal_failure_recovery_receipt_v1" as const;

const CANONICAL_ORIGIN = "https://diamondshelf.us" as const;
const HEX64 = /^[0-9a-f]{64}$/;

function stableSerialize(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableSerialize).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort()
    .map((key) => JSON.stringify(key) + ":" + stableSerialize(object[key]))
    .join(",") + "}";
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function requireObservedAt(value: string): string {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error("crawl_recovery_observed_at_invalid");
  }
  return value;
}

function requireCanonicalUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("crawl_recovery_url_invalid");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.origin !== CANONICAL_ORIGIN ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) throw new Error("crawl_recovery_url_invalid");
  return parsed.toString();
}

export type TerminalFailureEventType =
  | "terminal_failure"
  | "recovery_failure"
  | "recovery_resolved";

export type TerminalFailureEvent = {
  version: typeof P12_2_TERMINAL_FAILURE_EVENT_VERSION;
  eventType: TerminalFailureEventType;
  runId: string;
  observedAt: string;
  siteId: string;
  canonicalOrigin: typeof CANONICAL_ORIGIN;
  executionPlanFingerprint: string;
  canonicalUrl: string;
  checkpointRevision: number;
  checkpointFingerprint: string;
  batchId: string;
  attempt: number;
  sourceEventFingerprint: string | null;
  outcome: SuppliedCrawlUrlOutcome;
  decisionReason: CrawlRetryDecision["reason"] | "resolved";
  robotsPolicyRejectionReason?: string;
  otherPolicyRejectionReason?: string;
  fingerprint: string;
};

export function createTerminalFailureEvent(
  input: Omit<TerminalFailureEvent, "version" | "fingerprint">,
): TerminalFailureEvent {
  const withoutFingerprint = {
    version: P12_2_TERMINAL_FAILURE_EVENT_VERSION,
    ...input,
  } satisfies Omit<TerminalFailureEvent, "fingerprint">;
  const event = {
    ...withoutFingerprint,
    fingerprint: fingerprint(withoutFingerprint),
  };
  assertTerminalFailureEventIntegrity(event);
  return event;
}

export function assertTerminalFailureEventIntegrity(event: TerminalFailureEvent): void {
  if (event.version !== P12_2_TERMINAL_FAILURE_EVENT_VERSION) {
    throw new Error("crawl_recovery_event_version_invalid");
  }
  if (!event.runId.trim() || !event.siteId.trim() || event.canonicalOrigin !== CANONICAL_ORIGIN) {
    throw new Error("crawl_recovery_event_identity_invalid");
  }
  requireObservedAt(event.observedAt);
  requireCanonicalUrl(event.canonicalUrl);
  if (
    !HEX64.test(event.executionPlanFingerprint) ||
    !HEX64.test(event.checkpointFingerprint) ||
    !HEX64.test(event.fingerprint)
  ) throw new Error("crawl_recovery_event_fingerprint_invalid");
  if (!Number.isInteger(event.checkpointRevision) || event.checkpointRevision < 1) {
    throw new Error("crawl_recovery_event_checkpoint_revision_invalid");
  }
  if (!event.batchId.trim() || !Number.isInteger(event.attempt) || event.attempt < 1) {
    throw new Error("crawl_recovery_event_attempt_invalid");
  }
  if (event.outcome.canonicalUrl !== event.canonicalUrl) {
    throw new Error("crawl_recovery_event_outcome_identity_mismatch");
  }

  if (event.eventType === "terminal_failure") {
    if (event.sourceEventFingerprint !== null || event.outcome.kind !== "failure") {
      throw new Error("crawl_recovery_terminal_event_shape_invalid");
    }
    if (!["permanent_http", "policy_rejection", "attempts_exhausted"].includes(event.decisionReason)) {
      throw new Error("crawl_recovery_terminal_event_reason_invalid");
    }
  } else {
    if (!event.sourceEventFingerprint || !HEX64.test(event.sourceEventFingerprint)) {
      throw new Error("crawl_recovery_source_event_fingerprint_invalid");
    }
    if (event.eventType === "recovery_failure") {
      if (event.outcome.kind !== "failure" || event.decisionReason === "resolved") {
        throw new Error("crawl_recovery_failure_event_shape_invalid");
      }
    } else if (event.outcome.kind === "failure" || event.decisionReason !== "resolved") {
      throw new Error("crawl_recovery_resolved_event_shape_invalid");
    }
  }

  const { fingerprint: actual, ...withoutFingerprint } = event;
  if (actual !== fingerprint(withoutFingerprint)) {
    throw new Error("crawl_recovery_event_fingerprint_mismatch");
  }
}

export type TerminalFailureRecoveryPlan = {
  version: typeof P12_2_TERMINAL_FAILURE_RECOVERY_PLAN_VERSION;
  runId: string;
  observedAt: string;
  siteId: string;
  canonicalOrigin: typeof CANONICAL_ORIGIN;
  executionPlanFingerprint: string;
  sourceCheckpointRevision: number;
  sourceCheckpointFingerprint: string;
  sourceTerminalFailureCount: number;
  evidence: Array<{
    canonicalUrl: string;
    eventFingerprint: string;
  }>;
  maxAttemptsPerUrl: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  fingerprint: string;
};

export function buildTerminalFailureRecoveryPlan(input: {
  runId: string;
  observedAt: string;
  siteId: string;
  canonicalOrigin: string;
  executionPlan: FullSiteCrawlExecutionPlan;
  checkpoint: FullSiteCrawlCheckpoint;
  unresolvedEvents: TerminalFailureEvent[];
}): TerminalFailureRecoveryPlan {
  requireObservedAt(input.observedAt);
  if (!input.runId.trim() || !input.siteId.trim() || input.canonicalOrigin !== CANONICAL_ORIGIN) {
    throw new Error("crawl_recovery_plan_identity_invalid");
  }
  assertFullSiteCrawlCheckpointIntegrity(input.executionPlan, input.checkpoint);
  if (input.checkpoint.status !== "completed") throw new Error("crawl_recovery_checkpoint_not_completed");
  if (input.checkpoint.counters.terminalFailures < 1) throw new Error("crawl_recovery_terminal_failures_absent");
  if (input.unresolvedEvents.length !== input.checkpoint.counters.terminalFailures) {
    throw new Error("crawl_recovery_failure_evidence_incomplete");
  }

  const inventoryUrls = new Set(input.executionPlan.batches.flatMap((batch) => batch.canonicalUrls));
  const seen = new Set<string>();
  const evidence = [...input.unresolvedEvents]
    .sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl))
    .map((event) => {
      assertTerminalFailureEventIntegrity(event);
      if (
        event.runId !== input.runId ||
        event.siteId !== input.siteId ||
        event.canonicalOrigin !== CANONICAL_ORIGIN ||
        event.executionPlanFingerprint !== input.executionPlan.fingerprint ||
        !["terminal_failure", "recovery_failure"].includes(event.eventType)
      ) throw new Error("crawl_recovery_failure_evidence_lineage_invalid");
      if (!inventoryUrls.has(event.canonicalUrl) || seen.has(event.canonicalUrl)) {
        throw new Error("crawl_recovery_failure_evidence_url_invalid");
      }
      seen.add(event.canonicalUrl);
      return {
        canonicalUrl: event.canonicalUrl,
        eventFingerprint: event.fingerprint,
      };
    });

  const withoutFingerprint: Omit<TerminalFailureRecoveryPlan, "fingerprint"> = {
    version: P12_2_TERMINAL_FAILURE_RECOVERY_PLAN_VERSION,
    runId: input.runId,
    observedAt: input.observedAt,
    siteId: input.siteId,
    canonicalOrigin: CANONICAL_ORIGIN,
    executionPlanFingerprint: input.executionPlan.fingerprint,
    sourceCheckpointRevision: input.checkpoint.sequence,
    sourceCheckpointFingerprint: input.checkpoint.fingerprint,
    sourceTerminalFailureCount: input.checkpoint.counters.terminalFailures,
    evidence,
    maxAttemptsPerUrl: input.executionPlan.policy.maxAttemptsPerUrl,
    retryBaseDelayMs: input.executionPlan.policy.retryBaseDelayMs,
    retryMaxDelayMs: input.executionPlan.policy.retryMaxDelayMs,
  };
  return {
    ...withoutFingerprint,
    fingerprint: fingerprint(withoutFingerprint),
  };
}

export type TerminalFailureRecoveryUrlReceipt = {
  canonicalUrl: string;
  sourceEventFingerprint: string;
  attempts: number;
  outcome: SuppliedCrawlUrlOutcome;
};

export type TerminalFailureRecoveryReceipt = {
  version: typeof P12_2_TERMINAL_FAILURE_RECOVERY_RECEIPT_VERSION;
  status: "resolved" | "incomplete";
  runId: string;
  observedAt: string;
  siteId: string;
  canonicalOrigin: typeof CANONICAL_ORIGIN;
  executionPlanFingerprint: string;
  recoveryPlanFingerprint: string;
  sourceCheckpointRevision: number;
  sourceCheckpointFingerprint: string;
  resultCheckpointRevision: number;
  resultCheckpointFingerprint: string;
  terminalFailuresBefore: number;
  terminalFailuresAfter: number;
  urlReceipts: TerminalFailureRecoveryUrlReceipt[];
  fingerprint: string;
};

export function buildTerminalFailureRecoveryReceipt(input: {
  plan: TerminalFailureRecoveryPlan;
  resultCheckpoint: FullSiteCrawlCheckpoint;
  urlReceipts: TerminalFailureRecoveryUrlReceipt[];
}): TerminalFailureRecoveryReceipt {
  if (input.resultCheckpoint.sequence !== input.plan.sourceCheckpointRevision + 1) {
    throw new Error("crawl_recovery_result_checkpoint_revision_invalid");
  }
  if (input.resultCheckpoint.planFingerprint !== input.plan.executionPlanFingerprint) {
    throw new Error("crawl_recovery_result_checkpoint_lineage_invalid");
  }
  if (input.urlReceipts.length !== input.plan.evidence.length) {
    throw new Error("crawl_recovery_receipt_count_invalid");
  }
  const byUrl = new Map(input.plan.evidence.map((item) => [item.canonicalUrl, item.eventFingerprint]));
  for (const receipt of input.urlReceipts) {
    if (
      byUrl.get(receipt.canonicalUrl) !== receipt.sourceEventFingerprint ||
      receipt.outcome.canonicalUrl !== receipt.canonicalUrl ||
      !Number.isInteger(receipt.attempts) ||
      receipt.attempts < 1 ||
      receipt.attempts > input.plan.maxAttemptsPerUrl
    ) throw new Error("crawl_recovery_receipt_url_invalid");
  }

  const withoutFingerprint: Omit<TerminalFailureRecoveryReceipt, "fingerprint"> = {
    version: P12_2_TERMINAL_FAILURE_RECOVERY_RECEIPT_VERSION,
    status: input.resultCheckpoint.counters.terminalFailures === 0 ? "resolved" : "incomplete",
    runId: input.plan.runId,
    observedAt: input.plan.observedAt,
    siteId: input.plan.siteId,
    canonicalOrigin: CANONICAL_ORIGIN,
    executionPlanFingerprint: input.plan.executionPlanFingerprint,
    recoveryPlanFingerprint: input.plan.fingerprint,
    sourceCheckpointRevision: input.plan.sourceCheckpointRevision,
    sourceCheckpointFingerprint: input.plan.sourceCheckpointFingerprint,
    resultCheckpointRevision: input.resultCheckpoint.sequence,
    resultCheckpointFingerprint: input.resultCheckpoint.fingerprint,
    terminalFailuresBefore: input.plan.sourceTerminalFailureCount,
    terminalFailuresAfter: input.resultCheckpoint.counters.terminalFailures,
    urlReceipts: [...input.urlReceipts].sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl)),
  };
  return {
    ...withoutFingerprint,
    fingerprint: fingerprint(withoutFingerprint),
  };
}

export function recoveryOutcomesFromReceipt(
  receipt: TerminalFailureRecoveryReceipt,
): TerminalFailureRecoveryOutcome[] {
  return receipt.urlReceipts.map((item) => ({
    canonicalUrl: item.canonicalUrl,
    attempts: item.attempts,
    outcome: item.outcome,
  }));
}
