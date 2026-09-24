import { createHash } from "node:crypto";
import {
  assertActionAuditLedgerIntegrity,
  type ActionAuditLedger,
} from "./action-audit-ledger.js";
import {
  evaluateP88PolicyAdmission,
  p88W01PolicyCapability,
  p88W01PolicySemantics,
  type P88PolicyCandidate,
  type P88PolicyEvaluation,
  type P88PolicyGrant,
  type P88PolicyRejectionReason,
} from "./p8-8-policy-grant-evaluation.js";

export const P8_8_W09_VERSION = "p8-8-w09-stage-0-shadow-certification-v1" as const;
export const P8_8_W09_MAX_SESSION_ITEMS = 1000 as const;

export type P88W09SourceProvenance =
  | "synthetic_fixture"
  | "supplied_real_snapshot"
  | "production_read_snapshot";

export type P88W09SourceEnvelope = Readonly<{
  system: string;
  version: string;
  sourceId: string;
  provenance: P88W09SourceProvenance;
  sourceFingerprint: string;
}>;

export type P88W09HumanOutcome =
  | "not_supplied"
  | "not_comparable"
  | "human_approved_executed_verified"
  | "human_approved_executed_failed_or_unavailable"
  | "human_approved_no_verified_execution"
  | "human_rejected_or_not_approved"
  | "human_manual_intervention"
  | "human_rollback_verified_closed"
  | "human_outcome_uncertain";

export type P88W09ComparisonDirection =
  | "same_direction"
  | "different_direction"
  | "not_comparable"
  | "insufficient_human_evidence";

export type P88W09HumanComparison = Readonly<{
  supplied: boolean;
  ledgerId: string | null;
  ledgerFingerprint: string | null;
  actionId: string | null;
  comparable: boolean;
  outcome: P88W09HumanOutcome;
  direction: P88W09ComparisonDirection;
  exactTargetBinding: boolean;
}>;

export type P88W09ShadowItemInput = Readonly<{
  source: P88W09SourceEnvelope;
  grant: P88PolicyGrant;
  candidate: P88PolicyCandidate;
  referenceTime: string;
  evaluationExpiresAt: string;
  evaluation: P88PolicyEvaluation;
  humanLedger?: ActionAuditLedger | null;
}>;

export type P88W09ShadowDecision = Readonly<{
  version: typeof P8_8_W09_VERSION;
  shadowDecisionId: string;
  shadowDecisionFingerprint: string;
  source: P88W09SourceEnvelope;
  policy: Readonly<{
    policyId: string;
    policyVersion: string;
    policyFingerprint: string;
    policyStage: P88PolicyEvaluation["policy"]["policyStage"];
  }>;
  evaluationId: string;
  evaluationFingerprint: string;
  decision: "admit" | "reject";
  rejectionReasons: readonly P88PolicyRejectionReason[];
  referenceTime: string;
  evaluationExpiresAt: string;
  recommendationFingerprint: string;
  recommendationIdempotencyKey: string;
  proposalFingerprint: string;
  evidenceSetFingerprint: string;
  qualityFingerprint: string;
  riskFingerprint: string;
  target: P88PolicyEvaluation["target"];
  currentState: P88PolicyEvaluation["currentState"];
  comparison: P88W09HumanComparison;
  lineageComplete: true;
  semantics: ReturnType<typeof p88W09ShadowSemantics>;
  safety: ReturnType<typeof p88W09ShadowCapability>;
}>;

export type P88W09ShadowSessionInput = Readonly<{
  sessionReferenceTime: string;
  items: readonly P88W09ShadowItemInput[];
}>;

export type P88W09ShadowSessionSummary = Readonly<{
  totalCandidates: number;
  admittedCount: number;
  rejectedCount: number;
  rejectionCounts: Readonly<Record<string, number>>;
  sourceProvenanceCounts: Readonly<Record<P88W09SourceProvenance, number>>;
  comparisonSuppliedCount: number;
  comparableCount: number;
  sameDirectionCount: number;
  differentDirectionCount: number;
  insufficientHumanEvidenceCount: number;
  idempotentReplayCount: number;
  conflictCount: 0;
  controlModeRejectionCount: number;
  quotaRejectionCount: number;
  cooldownRejectionCount: number;
  concurrencyRejectionCount: number;
  unresolvedSideEffectRejectionCount: number;
  lineageCompleteCount: number;
  lineageIncompleteCount: 0;
}>;

export type P88W09ShadowSession = Readonly<{
  version: typeof P8_8_W09_VERSION;
  sessionId: string;
  sessionFingerprint: string;
  sessionReferenceTime: string;
  policyId: string;
  policyVersion: string;
  policyFingerprint: string;
  status: "engineering_fixture_pass";
  decisions: readonly P88W09ShadowDecision[];
  summary: P88W09ShadowSessionSummary;
  semantics: ReturnType<typeof p88W09ShadowSemantics>;
  safety: ReturnType<typeof p88W09ShadowCapability>;
}>;

const HEX_64 = /^[0-9a-f]{64}$/;
const EXACT_ID = /^[A-Za-z0-9][A-Za-z0-9._:+\/-]{0,511}$/;

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(stable(value)) ?? "undefined";
}

export function p88W09StableHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function exactId(value: unknown, code: string): string {
  if (typeof value !== "string" || value.trim() !== value || !EXACT_ID.test(value)) {
    throw new Error(code);
  }
  return value;
}

function fingerprint(value: unknown, code: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) throw new Error(code);
  return value;
}

function canonicalIso(value: unknown, code: string): string {
  if (typeof value !== "string") throw new Error(code);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(code);
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) throw new Error(code);
  return canonical;
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

function exactEqual(left: unknown, right: unknown): boolean {
  return stableJson(left) === stableJson(right);
}

function sourceIdentity(source: P88W09SourceEnvelope): string {
  return [source.system, source.version, source.sourceId].join("\u0000");
}

function sourceFingerprintPayload(
  input: Omit<P88W09ShadowItemInput, "source" | "humanLedger">,
  source: Omit<P88W09SourceEnvelope, "sourceFingerprint">,
): unknown {
  return {
    version: P8_8_W09_VERSION,
    purpose: "p8.8_w09_shadow_source_snapshot",
    source,
    grant: input.grant,
    candidate: input.candidate,
    referenceTime: input.referenceTime,
    evaluationExpiresAt: input.evaluationExpiresAt,
  };
}

export function computeP88W09SourceFingerprint(input: {
  source: Omit<P88W09SourceEnvelope, "sourceFingerprint">;
  grant: P88PolicyGrant;
  candidate: P88PolicyCandidate;
  referenceTime: string;
  evaluationExpiresAt: string;
}): string {
  return p88W09StableHash(sourceFingerprintPayload({
    grant: input.grant,
    candidate: input.candidate,
    referenceTime: input.referenceTime,
    evaluationExpiresAt: input.evaluationExpiresAt,
    evaluation: evaluateP88PolicyAdmission({
      grant: input.grant,
      candidate: input.candidate,
      referenceTime: input.referenceTime,
      evaluationExpiresAt: input.evaluationExpiresAt,
    }),
  }, input.source));
}

function normalizeSource(
  input: P88W09ShadowItemInput,
): P88W09SourceEnvelope {
  const source = {
    system: exactId(input.source.system, "p88_w09_source_system_invalid"),
    version: exactId(input.source.version, "p88_w09_source_version_invalid"),
    sourceId: exactId(input.source.sourceId, "p88_w09_source_id_invalid"),
    provenance: input.source.provenance,
    sourceFingerprint: fingerprint(
      input.source.sourceFingerprint,
      "p88_w09_source_fingerprint_invalid",
    ),
  } as const;
  if (
    source.provenance !== "synthetic_fixture"
    && source.provenance !== "supplied_real_snapshot"
    && source.provenance !== "production_read_snapshot"
  ) {
    throw new Error("p88_w09_source_provenance_invalid");
  }
  if (source.provenance === "production_read_snapshot") {
    throw new Error("p88_w09_production_read_snapshot_not_authorized");
  }
  const expected = computeP88W09SourceFingerprint({
    source: {
      system: source.system,
      version: source.version,
      sourceId: source.sourceId,
      provenance: source.provenance,
    },
    grant: input.grant,
    candidate: input.candidate,
    referenceTime: input.referenceTime,
    evaluationExpiresAt: input.evaluationExpiresAt,
  });
  if (source.sourceFingerprint !== expected) {
    throw new Error("p88_w09_source_fingerprint_mismatch");
  }
  return deepFreeze(source);
}

function exactTargetComparable(
  evaluation: P88PolicyEvaluation,
  ledger: ActionAuditLedger,
): boolean {
  let hostname: string | null = null;
  try {
    hostname = new URL(ledger.target.targetUrl).hostname;
  } catch {
    return false;
  }
  return ledger.target.mutationClass === "shopify_product_seo_meta_description"
    && ledger.target.resource.kind === "product"
    && ledger.target.resource.gid === evaluation.target.resourceGid
    && ledger.target.targetUrl === evaluation.target.targetUrl
    && hostname === evaluation.target.domain
    && ledger.target.field === evaluation.target.field
    && ledger.target.beforeFingerprint === evaluation.target.beforeFingerprint
    && ledger.target.afterFingerprint === evaluation.target.afterFingerprint;
}

function classifyHumanOutcome(ledger: ActionAuditLedger): P88W09HumanOutcome {
  if (ledger.summary.manualInterventionRequired > 0) return "human_manual_intervention";
  if (ledger.summary.rollbackVerifiedClosed > 0) return "human_rollback_verified_closed";
  if (ledger.summary.verificationVerified > 0) return "human_approved_executed_verified";
  if (
    ledger.summary.verificationFailed > 0
    || ledger.summary.verificationUnavailable > 0
  ) return "human_approved_executed_failed_or_unavailable";

  const kinds = new Set(ledger.entries.map((entry) => entry.entryKind));
  if (kinds.has("proposal_rejected")) return "human_rejected_or_not_approved";
  if (
    kinds.has("proposal_approved")
    || kinds.has("authorization_created")
    || kinds.has("authorization_renewed")
    || kinds.has("action_authorized")
    || kinds.has("execution_reserved")
    || kinds.has("provider_write_accepted")
    || ledger.entries.some((entry) => entry.lineage.approvalId !== null)
  ) return "human_approved_no_verified_execution";
  return "human_outcome_uncertain";
}

function comparisonFor(
  evaluation: P88PolicyEvaluation,
  ledger: ActionAuditLedger | null | undefined,
): P88W09HumanComparison {
  if (!ledger) {
    return deepFreeze({
      supplied: false,
      ledgerId: null,
      ledgerFingerprint: null,
      actionId: null,
      comparable: false,
      outcome: "not_supplied",
      direction: "insufficient_human_evidence",
      exactTargetBinding: false,
    });
  }

  assertActionAuditLedgerIntegrity(ledger);
  const comparable = exactTargetComparable(evaluation, ledger);
  if (!comparable) {
    return deepFreeze({
      supplied: true,
      ledgerId: ledger.ledgerId,
      ledgerFingerprint: ledger.ledgerFingerprint,
      actionId: ledger.actionId,
      comparable: false,
      outcome: "not_comparable",
      direction: "not_comparable",
      exactTargetBinding: false,
    });
  }

  const outcome = classifyHumanOutcome(ledger);
  const humanDirection =
    outcome === "human_rejected_or_not_approved"
      ? "reject"
      : outcome === "human_outcome_uncertain"
        ? null
        : "admit";
  const direction: P88W09ComparisonDirection =
    humanDirection === null
      ? "insufficient_human_evidence"
      : humanDirection === evaluation.decision
        ? "same_direction"
        : "different_direction";

  return deepFreeze({
    supplied: true,
    ledgerId: ledger.ledgerId,
    ledgerFingerprint: ledger.ledgerFingerprint,
    actionId: ledger.actionId,
    comparable: true,
    outcome,
    direction,
    exactTargetBinding: true,
  });
}

function decisionFingerprintPayload(
  decision: Omit<P88W09ShadowDecision, "shadowDecisionId" | "shadowDecisionFingerprint">,
): unknown {
  return decision;
}

export function p88W09ShadowSemantics() {
  return Object.freeze({
    stage0ShadowOnly: true,
    certifiedW01IsOnlyPolicyDecisionEngine: true,
    shadowAdmitCreatesExecutionAuthority: false,
    exactReplayCollapsed: true,
    conflictingReplayFailsClosed: true,
    canonicalOrderingOnly: true,
    orderingCreatesPriority: false,
    orderingCreatesAuthority: false,
    orderingCreatesConfidence: false,
    comparisonDescriptiveOnly: true,
    comparisonCreatesCorrectnessJudgment: false,
    comparisonCreatesCausality: false,
    timestampProximityCreatesComparability: false,
    p87CollectionPilotProductComparable: false,
    realSnapshotLabelProvesProvenance: false,
    w09BProductionRunAuthorized: false,
    w10ActivationAuthorized: false,
  });
}

export function p88W09ShadowCapability() {
  return Object.freeze({
    version: P8_8_W09_VERSION,
    deterministicProjectionOnly: true,
    callerSuppliedOnly: true,
    databaseReadPerformed: false,
    databaseWritePerformed: false,
    persistencePerformed: false,
    schemaMutationPerformed: false,
    providerNetworkReadPerformed: false,
    providerWritePerformed: false,
    publicSiteWritePerformed: false,
    w03AuthorizationCreated: false,
    w04ReservationCreatedOrMutated: false,
    w05ClaimOrControlMutated: false,
    w06ProviderPreflightPerformed: false,
    w07DispatchOrRollbackPerformed: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    routeBound: false,
    startupBound: false,
    schedulerActivated: false,
    workerActivated: false,
    policyActivated: false,
    liveExecutionAuthorized: false,
    autonomousExecutionAuthorized: false,
    credentialScopeChanged: false,
    publicWriteGateChanged: false,
    policyExecutionGateChanged: false,
    deploymentPerformed: false,
    publicationPerformed: false,
  });
}

export function buildP88W09ShadowDecision(
  input: P88W09ShadowItemInput,
): P88W09ShadowDecision {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("p88_w09_shadow_item_invalid");
  }
  const referenceTime = canonicalIso(input.referenceTime, "p88_w09_reference_time_invalid");
  const evaluationExpiresAt = canonicalIso(
    input.evaluationExpiresAt,
    "p88_w09_evaluation_expiry_invalid",
  );
  const source = normalizeSource(input);

  const rebuilt = evaluateP88PolicyAdmission({
    grant: input.grant,
    candidate: input.candidate,
    referenceTime,
    evaluationExpiresAt,
  });
  if (!exactEqual(rebuilt, input.evaluation)) {
    throw new Error("p88_w09_w01_evaluation_integrity_mismatch");
  }
  if (!exactEqual(rebuilt.safety, p88W01PolicyCapability())) {
    throw new Error("p88_w09_w01_safety_mismatch");
  }
  if (!exactEqual(rebuilt.semantics, p88W01PolicySemantics())) {
    throw new Error("p88_w09_w01_semantics_mismatch");
  }

  const comparison = comparisonFor(rebuilt, input.humanLedger);
  const withoutIdentity = {
    version: P8_8_W09_VERSION,
    source,
    policy: rebuilt.policy,
    evaluationId: rebuilt.evaluationId,
    evaluationFingerprint: rebuilt.evaluationFingerprint,
    decision: rebuilt.decision,
    rejectionReasons: [...rebuilt.rejectionReasons],
    referenceTime: rebuilt.referenceTime,
    evaluationExpiresAt: rebuilt.evaluationExpiresAt,
    recommendationFingerprint: rebuilt.recommendation.recommendationFingerprint,
    recommendationIdempotencyKey: rebuilt.recommendation.recommendationIdempotencyKey,
    proposalFingerprint: rebuilt.proposal.proposalFingerprint,
    evidenceSetFingerprint: rebuilt.evidence.evidenceSetFingerprint,
    qualityFingerprint: rebuilt.quality.qualityFingerprint,
    riskFingerprint: rebuilt.risk.riskFingerprint,
    target: rebuilt.target,
    currentState: rebuilt.currentState,
    comparison,
    lineageComplete: true as const,
    semantics: p88W09ShadowSemantics(),
    safety: p88W09ShadowCapability(),
  };
  const shadowDecisionFingerprint = p88W09StableHash(
    decisionFingerprintPayload(withoutIdentity),
  );
  return deepFreeze({
    ...withoutIdentity,
    shadowDecisionFingerprint,
    shadowDecisionId: "p88w09-decision-" + shadowDecisionFingerprint.slice(0, 24),
  });
}

function compareDecisions(left: P88W09ShadowDecision, right: P88W09ShadowDecision): number {
  return left.referenceTime.localeCompare(right.referenceTime)
    || sourceIdentity(left.source).localeCompare(sourceIdentity(right.source))
    || left.evaluationFingerprint.localeCompare(right.evaluationFingerprint)
    || left.shadowDecisionFingerprint.localeCompare(right.shadowDecisionFingerprint);
}

function summarize(
  decisions: readonly P88W09ShadowDecision[],
  replayCount: number,
): P88W09ShadowSessionSummary {
  const rejectionCounts: Record<string, number> = {};
  const sourceProvenanceCounts: Record<P88W09SourceProvenance, number> = {
    synthetic_fixture: 0,
    supplied_real_snapshot: 0,
    production_read_snapshot: 0,
  };
  for (const decision of decisions) {
    sourceProvenanceCounts[decision.source.provenance] += 1;
    for (const reason of decision.rejectionReasons) {
      rejectionCounts[reason] = (rejectionCounts[reason] ?? 0) + 1;
    }
  }
  return deepFreeze({
    totalCandidates: decisions.length,
    admittedCount: decisions.filter((d) => d.decision === "admit").length,
    rejectedCount: decisions.filter((d) => d.decision === "reject").length,
    rejectionCounts: deepFreeze(
      Object.fromEntries(Object.entries(rejectionCounts).sort(([a], [b]) => a.localeCompare(b))),
    ),
    sourceProvenanceCounts: deepFreeze(sourceProvenanceCounts),
    comparisonSuppliedCount: decisions.filter((d) => d.comparison.supplied).length,
    comparableCount: decisions.filter((d) => d.comparison.comparable).length,
    sameDirectionCount: decisions.filter((d) => d.comparison.direction === "same_direction").length,
    differentDirectionCount: decisions.filter((d) => d.comparison.direction === "different_direction").length,
    insufficientHumanEvidenceCount: decisions.filter(
      (d) => d.comparison.direction === "insufficient_human_evidence",
    ).length,
    idempotentReplayCount: replayCount,
    conflictCount: 0,
    controlModeRejectionCount: decisions.filter(
      (d) => d.rejectionReasons.includes("control_not_running"),
    ).length,
    quotaRejectionCount: decisions.filter(
      (d) => d.rejectionReasons.includes("mutation_quota_exhausted"),
    ).length,
    cooldownRejectionCount: decisions.filter(
      (d) => d.rejectionReasons.includes("same_target_cooldown_not_satisfied"),
    ).length,
    concurrencyRejectionCount: decisions.filter(
      (d) => d.rejectionReasons.includes("site_mutation_concurrency_exhausted"),
    ).length,
    unresolvedSideEffectRejectionCount: decisions.filter((d) =>
      d.rejectionReasons.includes("manual_intervention_unresolved")
      || d.rejectionReasons.includes("provider_write_uncertain")
      || d.rejectionReasons.includes("rollback_failure_unresolved")
    ).length,
    lineageCompleteCount: decisions.length,
    lineageIncompleteCount: 0,
  });
}

function sessionFingerprintPayload(
  session: Omit<P88W09ShadowSession, "sessionId" | "sessionFingerprint">,
): unknown {
  return session;
}

export function buildP88W09ShadowSession(
  input: P88W09ShadowSessionInput,
): P88W09ShadowSession {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("p88_w09_shadow_session_invalid");
  }
  const sessionReferenceTime = canonicalIso(
    input.sessionReferenceTime,
    "p88_w09_session_reference_time_invalid",
  );
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("p88_w09_shadow_session_items_required");
  }
  if (input.items.length > P8_8_W09_MAX_SESSION_ITEMS) {
    throw new Error("p88_w09_shadow_session_item_limit_exceeded");
  }

  const bySource = new Map<string, P88W09ShadowDecision>();
  let replayCount = 0;
  for (const item of input.items) {
    const decision = buildP88W09ShadowDecision(item);
    if (decision.referenceTime > sessionReferenceTime) {
      throw new Error("p88_w09_decision_after_session_reference_time");
    }
    const identity = sourceIdentity(decision.source);
    const existing = bySource.get(identity);
    if (existing) {
      if (!exactEqual(existing, decision)) {
        throw new Error("p88_w09_source_replay_conflict");
      }
      replayCount += 1;
      continue;
    }
    bySource.set(identity, decision);
  }

  const decisions = [...bySource.values()].sort(compareDecisions);
  const first = decisions[0]!;
  for (const decision of decisions) {
    if (
      decision.policy.policyId !== first.policy.policyId
      || decision.policy.policyVersion !== first.policy.policyVersion
      || decision.policy.policyFingerprint !== first.policy.policyFingerprint
    ) {
      throw new Error("p88_w09_mixed_policy_session");
    }
  }

  const summary = summarize(decisions, replayCount);
  const withoutIdentity = {
    version: P8_8_W09_VERSION,
    sessionReferenceTime,
    policyId: first.policy.policyId,
    policyVersion: first.policy.policyVersion,
    policyFingerprint: first.policy.policyFingerprint,
    status: "engineering_fixture_pass" as const,
    decisions: deepFreeze(decisions),
    summary,
    semantics: p88W09ShadowSemantics(),
    safety: p88W09ShadowCapability(),
  };
  const sessionFingerprint = p88W09StableHash(sessionFingerprintPayload(withoutIdentity));
  return deepFreeze({
    ...withoutIdentity,
    sessionFingerprint,
    sessionId: "p88w09-session-" + sessionFingerprint.slice(0, 24),
  });
}

export function p88W09ShadowDecisionIntegrityIssues(
  decision: P88W09ShadowDecision,
): string[] {
  const issues: string[] = [];
  if (decision.version !== P8_8_W09_VERSION) issues.push("p88_w09_decision_version_mismatch");
  if (!HEX_64.test(decision.shadowDecisionFingerprint)) {
    issues.push("p88_w09_decision_fingerprint_invalid");
  }
  if (
    decision.shadowDecisionId
    !== "p88w09-decision-" + decision.shadowDecisionFingerprint.slice(0, 24)
  ) issues.push("p88_w09_decision_id_mismatch");
  if (decision.evaluationFingerprint.length !== 64) {
    issues.push("p88_w09_evaluation_fingerprint_invalid");
  }
  if (!decision.lineageComplete) issues.push("p88_w09_lineage_incomplete");
  if (!exactEqual(decision.semantics, p88W09ShadowSemantics())) {
    issues.push("p88_w09_semantics_marker_mismatch");
  }
  if (!exactEqual(decision.safety, p88W09ShadowCapability())) {
    issues.push("p88_w09_safety_marker_mismatch");
  }
  const { shadowDecisionId: _id, shadowDecisionFingerprint: _fp, ...withoutIdentity } = decision;
  if (p88W09StableHash(decisionFingerprintPayload(withoutIdentity)) !== decision.shadowDecisionFingerprint) {
    issues.push("p88_w09_decision_fingerprint_mismatch");
  }
  return [...new Set(issues)].sort();
}

export function assertP88W09ShadowDecisionIntegrity(
  decision: P88W09ShadowDecision,
): void {
  const issues = p88W09ShadowDecisionIntegrityIssues(decision);
  if (issues.length) {
    throw new Error("p88_w09_shadow_decision_integrity_failure:" + issues.join(","));
  }
}

export function p88W09ShadowSessionIntegrityIssues(
  session: P88W09ShadowSession,
): string[] {
  const issues: string[] = [];
  if (session.version !== P8_8_W09_VERSION) issues.push("p88_w09_session_version_mismatch");
  if (!HEX_64.test(session.sessionFingerprint)) issues.push("p88_w09_session_fingerprint_invalid");
  if (session.sessionId !== "p88w09-session-" + session.sessionFingerprint.slice(0, 24)) {
    issues.push("p88_w09_session_id_mismatch");
  }
  let prior: P88W09ShadowDecision | null = null;
  const seen = new Set<string>();
  for (const decision of session.decisions) {
    for (const issue of p88W09ShadowDecisionIntegrityIssues(decision)) {
      issues.push("decision:" + issue);
    }
    const identity = sourceIdentity(decision.source);
    if (seen.has(identity)) issues.push("p88_w09_duplicate_source_identity");
    seen.add(identity);
    if (prior && compareDecisions(prior, decision) > 0) {
      issues.push("p88_w09_decision_order_mismatch");
    }
    if (
      decision.policy.policyId !== session.policyId
      || decision.policy.policyVersion !== session.policyVersion
      || decision.policy.policyFingerprint !== session.policyFingerprint
    ) issues.push("p88_w09_session_policy_mismatch");
    prior = decision;
  }
  if (!exactEqual(summarize(session.decisions, session.summary.idempotentReplayCount), session.summary)) {
    issues.push("p88_w09_session_summary_mismatch");
  }
  if (!exactEqual(session.semantics, p88W09ShadowSemantics())) {
    issues.push("p88_w09_session_semantics_marker_mismatch");
  }
  if (!exactEqual(session.safety, p88W09ShadowCapability())) {
    issues.push("p88_w09_session_safety_marker_mismatch");
  }
  const { sessionId: _id, sessionFingerprint: _fp, ...withoutIdentity } = session;
  if (p88W09StableHash(sessionFingerprintPayload(withoutIdentity)) !== session.sessionFingerprint) {
    issues.push("p88_w09_session_fingerprint_mismatch");
  }
  return [...new Set(issues)].sort();
}

export function assertP88W09ShadowSessionIntegrity(
  session: P88W09ShadowSession,
): void {
  const issues = p88W09ShadowSessionIntegrityIssues(session);
  if (issues.length) {
    throw new Error("p88_w09_shadow_session_integrity_failure:" + issues.join(","));
  }
}
