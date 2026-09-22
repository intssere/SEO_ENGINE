import { createHash } from "node:crypto";
import {
  buildUnifiedChangeTimeline,
  type UnifiedTimelineEvent,
  type UnifiedTimelineSourceEventInput,
} from "./unified-change-timeline.js";
import {
  verificationAdapterIntegrityIssues,
  verificationAdapterRegistry,
  type VerificationAdapterResult,
  type VerificationMutationClass,
} from "./verification-adapters.js";
import {
  rollbackWorkflowIntegrityIssues,
  type RollbackWorkflowResult,
} from "./rollback-manual-intervention-workflow.js";

export const P8_6_ACTION_AUDIT_LEDGER_VERSION = "p8-6-action-audit-ledger-v1" as const;
export const P8_6_ACTION_AUDIT_LEDGER_MAX_ENTRIES = 4096 as const;

export type ActionAuditLedgerLineage = {
  actionPlanId: string | null;
  approvalId: string | null;
  actionId: string;
  authorizationFingerprint: string | null;
  deploymentId: string | null;
  verificationId: string | null;
  rollbackId: string | null;
};

export type ActionAuditLedgerTarget = {
  mutationClass: VerificationMutationClass;
  resource: {
    kind: "product" | "collection";
    gid: string;
  };
  targetUrl: string;
  field: "title" | "meta_description";
  beforeFingerprint: string;
  afterFingerprint: string;
};

export type ActionAuditLedgerEvidenceLineageInput = {
  actionPlanId?: string | null;
  approvalId?: string | null;
  authorizationFingerprint?: string | null;
  deploymentId?: string | null;
  verificationId?: string | null;
  rollbackId?: string | null;
};

export type VerificationEvidenceEnvelope = {
  evidenceId: string;
  actionId: string;
  occurredAt: string;
  lineage?: ActionAuditLedgerEvidenceLineageInput | null;
  result: VerificationAdapterResult;
};

export type RollbackWorkflowEvidenceEnvelope = {
  evidenceId: string;
  actionId: string;
  occurredAt: string;
  lineage?: ActionAuditLedgerEvidenceLineageInput | null;
  result: RollbackWorkflowResult;
};

export type ActionAuditLedgerInput = {
  actionId: string;
  referenceTime: string;
  target: ActionAuditLedgerTarget;
  timelineEvents: UnifiedTimelineSourceEventInput[];
  verificationEvidence?: readonly VerificationEvidenceEnvelope[];
  rollbackEvidence?: readonly RollbackWorkflowEvidenceEnvelope[];
};

export type ActionAuditLedgerEntryClass =
  | "timeline"
  | "verification"
  | "rollback_workflow";

export type ActionAuditLedgerEntry = {
  version: typeof P8_6_ACTION_AUDIT_LEDGER_VERSION;
  sequence: number;
  occurredAt: string;
  entryClass: ActionAuditLedgerEntryClass;
  entryKind: string;
  source: {
    system: string;
    version: string;
    sourceId: string;
    sourceFingerprint: string | null;
  };
  lineage: ActionAuditLedgerLineage;
  target: ActionAuditLedgerTarget;
  evidence: Record<string, unknown>;
  previousEntryFingerprint: string | null;
  entryFingerprint: string;
  entryId: string;
};

export type ActionAuditLedgerSummary = {
  total: number;
  timeline: number;
  verification: number;
  rollbackWorkflow: number;
  verificationVerified: number;
  verificationFailed: number;
  verificationUnavailable: number;
  rollbackNoRollbackNeeded: number;
  rollbackReady: number;
  rollbackVerificationPending: number;
  rollbackVerifiedClosed: number;
  manualInterventionRequired: number;
};

export type ActionAuditLedger = {
  version: typeof P8_6_ACTION_AUDIT_LEDGER_VERSION;
  ledgerId: string;
  ledgerFingerprint: string;
  actionId: string;
  referenceTime: string;
  target: ActionAuditLedgerTarget;
  summary: ActionAuditLedgerSummary;
  firstEntryFingerprint: string | null;
  finalEntryFingerprint: string | null;
  entries: ActionAuditLedgerEntry[];
  semantics: ReturnType<typeof actionAuditLedgerSemantics>;
  safety: ReturnType<typeof actionAuditLedgerCapability>;
};

type Candidate = {
  occurredAt: string;
  entryClass: ActionAuditLedgerEntryClass;
  entryKind: string;
  source: ActionAuditLedgerEntry["source"];
  lineage: ActionAuditLedgerLineage;
  target: ActionAuditLedgerTarget;
  evidence: Record<string, unknown>;
  precedence: number;
  withinClassPrecedence: number;
  sortFingerprint: string;
};

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

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function exactId(value: unknown, code: string): string {
  if (typeof value !== "string" || value.trim() !== value || !EXACT_ID.test(value)) {
    throw new Error(code);
  }
  return value;
}

function canonicalTimestamp(value: unknown, code: string): string {
  if (typeof value !== "string") throw new Error(code);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(code);
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) throw new Error(code);
  return canonical;
}

function fingerprint(value: unknown, code: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) throw new Error(code);
  return value;
}

function nullableFingerprint(value: unknown, code: string): string | null {
  if (value === null || value === undefined) return null;
  return fingerprint(value, code);
}

function nullableId(value: unknown, code: string): string | null {
  if (value === null || value === undefined) return null;
  return exactId(value, code);
}

function canonicalTarget(input: ActionAuditLedgerTarget): ActionAuditLedgerTarget {
  const registryEntry = verificationAdapterRegistry.find(
    (entry) =>
      entry.mutationClass === input.mutationClass &&
      entry.resourceKind === input.resource.kind &&
      entry.field === input.field,
  );
  if (!registryEntry) throw new Error("p86_unsupported_mutation_class");

  const gid = exactId(input.resource.gid, "p86_invalid_resource_gid");
  let parsed: URL;
  try {
    parsed = new URL(input.targetUrl);
  } catch {
    throw new Error("p86_invalid_target_url");
  }
  if (parsed.protocol !== "https:") throw new Error("p86_invalid_target_url");

  return {
    mutationClass: input.mutationClass,
    resource: {
      kind: input.resource.kind,
      gid,
    },
    targetUrl: input.targetUrl,
    field: input.field,
    beforeFingerprint: fingerprint(input.beforeFingerprint, "p86_invalid_before_fingerprint"),
    afterFingerprint: fingerprint(input.afterFingerprint, "p86_invalid_after_fingerprint"),
  };
}

function normalizeEvidenceLineage(
  actionId: string,
  value: ActionAuditLedgerEvidenceLineageInput | null | undefined,
): ActionAuditLedgerLineage {
  return {
    actionPlanId: nullableId(value?.actionPlanId, "p86_invalid_action_plan_id"),
    approvalId: nullableId(value?.approvalId, "p86_invalid_approval_id"),
    actionId,
    authorizationFingerprint: nullableFingerprint(
      value?.authorizationFingerprint,
      "p86_invalid_authorization_fingerprint",
    ),
    deploymentId: nullableId(value?.deploymentId, "p86_invalid_deployment_id"),
    verificationId: nullableId(value?.verificationId, "p86_invalid_verification_id"),
    rollbackId: nullableId(value?.rollbackId, "p86_invalid_rollback_id"),
  };
}

function assertTimelineTarget(
  event: UnifiedTimelineEvent,
  target: ActionAuditLedgerTarget,
): void {
  if (!event.target) return;
  if (event.target.url !== null && event.target.url !== target.targetUrl) {
    throw new Error("p86_timeline_target_url_mismatch");
  }
  if (
    event.target.resourceKind !== null &&
    event.target.resourceKind !== target.resource.kind
  ) {
    throw new Error("p86_timeline_resource_kind_mismatch");
  }
  if (
    event.target.resourceId !== null &&
    event.target.resourceId !== target.resource.gid
  ) {
    throw new Error("p86_timeline_resource_id_mismatch");
  }
  if (event.target.field !== null && event.target.field !== target.field) {
    throw new Error("p86_timeline_field_mismatch");
  }
  if (
    event.target.beforeFingerprint !== null &&
    event.target.beforeFingerprint !== target.beforeFingerprint
  ) {
    throw new Error("p86_timeline_before_fingerprint_mismatch");
  }
  if (
    event.target.afterFingerprint !== null &&
    event.target.afterFingerprint !== target.afterFingerprint
  ) {
    throw new Error("p86_timeline_after_fingerprint_mismatch");
  }
}

function timelineLineage(event: UnifiedTimelineEvent, actionId: string): ActionAuditLedgerLineage {
  if (event.lineage.actionId !== actionId) {
    throw new Error(
      event.lineage.actionId === null
        ? "p86_timeline_action_id_missing"
        : "p86_timeline_action_id_mismatch",
    );
  }
  return {
    actionPlanId: event.lineage.actionPlanId,
    approvalId: event.lineage.approvalId,
    actionId,
    authorizationFingerprint: event.lineage.authorizationFingerprint,
    deploymentId: event.lineage.deploymentId,
    verificationId: event.lineage.verificationId,
    rollbackId: event.lineage.rollbackId,
  };
}

function assertVerificationTarget(
  result: VerificationAdapterResult,
  target: ActionAuditLedgerTarget,
): void {
  const issues = verificationAdapterIntegrityIssues(result);
  if (issues.length > 0) {
    throw new Error("p86_verification_integrity_failure:" + issues.join(","));
  }
  if (result.mutationClass !== target.mutationClass) {
    throw new Error("p86_verification_mutation_class_mismatch");
  }
  if (
    result.resource.kind !== target.resource.kind ||
    result.resource.gid !== target.resource.gid
  ) {
    throw new Error("p86_verification_resource_mismatch");
  }
  if (result.targetUrl !== target.targetUrl) {
    throw new Error("p86_verification_target_url_mismatch");
  }
  if (result.field !== target.field) {
    throw new Error("p86_verification_field_mismatch");
  }
  if (
    result.expected.fingerprint !== target.beforeFingerprint &&
    result.expected.fingerprint !== target.afterFingerprint
  ) {
    throw new Error("p86_verification_expected_fingerprint_outside_action");
  }
}

function assertRollbackTarget(
  result: RollbackWorkflowResult,
  target: ActionAuditLedgerTarget,
): void {
  const issues = rollbackWorkflowIntegrityIssues(result);
  if (issues.length > 0) {
    throw new Error("p86_rollback_workflow_integrity_failure:" + issues.join(","));
  }
  if (result.mutationClass !== target.mutationClass) {
    throw new Error("p86_rollback_mutation_class_mismatch");
  }
  if (
    result.resource.kind !== target.resource.kind ||
    result.resource.gid !== target.resource.gid
  ) {
    throw new Error("p86_rollback_resource_mismatch");
  }
  if (result.targetUrl !== target.targetUrl) {
    throw new Error("p86_rollback_target_url_mismatch");
  }
  if (result.field !== target.field) {
    throw new Error("p86_rollback_field_mismatch");
  }
  if (
    result.before.fingerprint !== target.beforeFingerprint ||
    result.after.fingerprint !== target.afterFingerprint
  ) {
    throw new Error("p86_rollback_action_fingerprint_mismatch");
  }
}

function projectTimelineCandidate(
  event: UnifiedTimelineEvent,
  actionId: string,
  target: ActionAuditLedgerTarget,
  withinClassPrecedence: number,
): Candidate {
  assertTimelineTarget(event, target);
  const lineage = timelineLineage(event, actionId);
  const evidence = {
    p10EventId: event.eventId,
    p10EventFingerprint: event.eventFingerprint,
    eventClass: event.eventClass,
    eventKind: event.eventKind,
    site: event.site,
    sourceTarget: event.target,
    associations: event.associations,
    state: event.state,
    sourceLineage: event.sourceLineage,
  };
  return {
    occurredAt: event.occurredAt,
    entryClass: "timeline",
    entryKind: event.eventKind,
    source: {
      system: event.source.system,
      version: event.source.version,
      sourceId: event.source.eventId,
      sourceFingerprint: event.source.eventFingerprint,
    },
    lineage,
    target,
    evidence,
    precedence: 10,
    withinClassPrecedence,
    sortFingerprint: event.eventFingerprint,
  };
}

function projectVerificationCandidate(
  envelope: VerificationEvidenceEnvelope,
  actionId: string,
  referenceTime: string,
  target: ActionAuditLedgerTarget,
): Candidate {
  const evidenceId = exactId(envelope.evidenceId, "p86_invalid_verification_evidence_id");
  if (envelope.actionId !== actionId) {
    throw new Error("p86_verification_action_id_mismatch");
  }
  const occurredAt = canonicalTimestamp(
    envelope.occurredAt,
    "p86_invalid_verification_timestamp",
  );
  if (occurredAt > referenceTime) throw new Error("p86_verification_after_reference_time");
  assertVerificationTarget(envelope.result, target);

  const evidence = {
    mutationClass: envelope.result.mutationClass,
    resultFingerprint: envelope.result.resultFingerprint,
    status: envelope.result.status,
    providerVerified: envelope.result.providerVerified,
    storefrontVerified: envelope.result.storefrontVerified,
    expectedFingerprint: envelope.result.expected.fingerprint,
    providerObservedFingerprint: envelope.result.provider.observedFingerprint,
    storefrontObservedFingerprint: envelope.result.storefront.observedFingerprint,
    failureCategories: [...envelope.result.failureCategories],
    providerRequestId: envelope.result.provider.requestId,
    providerWritePerformed: envelope.result.providerWritePerformed,
    databaseMutationPerformed: envelope.result.databaseMutationPerformed,
    automaticTransition: envelope.result.automaticTransition,
  };
  return {
    occurredAt,
    entryClass: "verification",
    entryKind: "p8.4_" + envelope.result.status,
    source: {
      system: "p8.4_verification_adapter",
      version: envelope.result.version,
      sourceId: evidenceId,
      sourceFingerprint: envelope.result.resultFingerprint,
    },
    lineage: normalizeEvidenceLineage(actionId, envelope.lineage),
    target,
    evidence,
    precedence: 20,
    withinClassPrecedence:
      envelope.result.status === "verified"
        ? 10
        : envelope.result.status === "failed"
          ? 20
          : 30,
    sortFingerprint: envelope.result.resultFingerprint,
  };
}

function projectRollbackCandidate(
  envelope: RollbackWorkflowEvidenceEnvelope,
  actionId: string,
  referenceTime: string,
  target: ActionAuditLedgerTarget,
): Candidate {
  const evidenceId = exactId(envelope.evidenceId, "p86_invalid_rollback_evidence_id");
  if (envelope.actionId !== actionId) {
    throw new Error("p86_rollback_action_id_mismatch");
  }
  const occurredAt = canonicalTimestamp(
    envelope.occurredAt,
    "p86_invalid_rollback_timestamp",
  );
  if (occurredAt > referenceTime) throw new Error("p86_rollback_after_reference_time");
  assertRollbackTarget(envelope.result, target);

  const manual = envelope.result.manualIntervention;
  const envelopeLineage = normalizeEvidenceLineage(actionId, envelope.lineage);
  const manualLineage = manual?.lineage ?? null;

  for (const [field, supplied] of [
    ["deploymentId", envelopeLineage.deploymentId],
    ["rollbackId", envelopeLineage.rollbackId],
    ["authorizationFingerprint", envelopeLineage.authorizationFingerprint],
  ] as const) {
    const manualValue = manualLineage?.[field] ?? null;
    if (supplied !== null && manualValue !== null && supplied !== manualValue) {
      throw new Error("p86_rollback_lineage_conflict");
    }
  }

  const lineage: ActionAuditLedgerLineage = {
    ...envelopeLineage,
    deploymentId: envelopeLineage.deploymentId ?? manualLineage?.deploymentId ?? null,
    rollbackId: envelopeLineage.rollbackId ?? manualLineage?.rollbackId ?? null,
    authorizationFingerprint:
      envelopeLineage.authorizationFingerprint ??
      manualLineage?.authorizationFingerprint ??
      null,
  };

  const evidence = {
    mutationClass: envelope.result.mutationClass,
    resultFingerprint: envelope.result.resultFingerprint,
    disposition: envelope.result.disposition,
    publicWriteOccurrence: envelope.result.publicWriteOccurrence,
    rollbackAttemptCount: envelope.result.rollbackAttemptCount,
    rollbackAttemptFingerprint: envelope.result.rollbackAttemptFingerprint,
    rollbackVerificationFingerprint: envelope.result.rollbackVerificationFingerprint,
    reasonCodes: [...envelope.result.reasonCodes],
    manualIntervention: manual
      ? {
          artifactFingerprint: manual.artifactFingerprint,
          reasonCodes: [...manual.reasonCodes],
          requiredEvidence: [...manual.requiredEvidence],
          providerWriteMayHaveOccurred: manual.providerWriteMayHaveOccurred,
          rollbackAttemptCount: manual.rollbackAttemptCount,
        }
      : null,
    providerWritePerformed: envelope.result.providerWritePerformed,
    rollbackWritePerformed: envelope.result.rollbackWritePerformed,
    databaseMutationPerformed: envelope.result.databaseMutationPerformed,
    automaticTransition: envelope.result.automaticTransition,
    liveExecutionAuthorized: envelope.result.liveExecutionAuthorized,
  };
  const precedenceByDisposition: Record<RollbackWorkflowResult["disposition"], number> = {
    no_rollback_needed: 10,
    rollback_ready: 20,
    rollback_verification_pending: 30,
    rollback_verified_closed: 40,
    manual_intervention_required: 50,
  };

  return {
    occurredAt,
    entryClass: "rollback_workflow",
    entryKind: "p8.5_" + envelope.result.disposition,
    source: {
      system: "p8.5_rollback_workflow",
      version: envelope.result.version,
      sourceId: evidenceId,
      sourceFingerprint: envelope.result.resultFingerprint,
    },
    lineage,
    target,
    evidence,
    precedence: 30,
    withinClassPrecedence: precedenceByDisposition[envelope.result.disposition],
    sortFingerprint: envelope.result.resultFingerprint,
  };
}

function dedupeCandidates(candidates: readonly Candidate[]): Candidate[] {
  const map = new Map<string, Candidate>();
  for (const candidate of candidates) {
    const identity = [
      candidate.entryClass,
      candidate.source.system,
      candidate.source.version,
      candidate.source.sourceId,
    ].join("\u0000");
    const existing = map.get(identity);
    if (existing && JSON.stringify(stable(existing)) !== JSON.stringify(stable(candidate))) {
      throw new Error("p86_source_replay_conflict");
    }
    map.set(identity, candidate);
  }
  return [...map.values()];
}

function materializeEntry(
  candidate: Candidate,
  sequence: number,
  previousEntryFingerprint: string | null,
): ActionAuditLedgerEntry {
  const withoutIdentity = {
    version: P8_6_ACTION_AUDIT_LEDGER_VERSION,
    sequence,
    occurredAt: candidate.occurredAt,
    entryClass: candidate.entryClass,
    entryKind: candidate.entryKind,
    source: candidate.source,
    lineage: candidate.lineage,
    target: candidate.target,
    evidence: candidate.evidence,
    previousEntryFingerprint,
  };
  const entryFingerprint = hash(withoutIdentity);
  return {
    ...withoutIdentity,
    entryFingerprint,
    entryId: "p86-entry-" + entryFingerprint.slice(0, 24),
  };
}

function summarize(entries: readonly ActionAuditLedgerEntry[]): ActionAuditLedgerSummary {
  const summary: ActionAuditLedgerSummary = {
    total: entries.length,
    timeline: 0,
    verification: 0,
    rollbackWorkflow: 0,
    verificationVerified: 0,
    verificationFailed: 0,
    verificationUnavailable: 0,
    rollbackNoRollbackNeeded: 0,
    rollbackReady: 0,
    rollbackVerificationPending: 0,
    rollbackVerifiedClosed: 0,
    manualInterventionRequired: 0,
  };

  for (const entry of entries) {
    if (entry.entryClass === "timeline") summary.timeline += 1;
    if (entry.entryClass === "verification") {
      summary.verification += 1;
      if (entry.entryKind === "p8.4_verified") summary.verificationVerified += 1;
      if (entry.entryKind === "p8.4_failed") summary.verificationFailed += 1;
      if (entry.entryKind === "p8.4_unavailable") summary.verificationUnavailable += 1;
    }
    if (entry.entryClass === "rollback_workflow") {
      summary.rollbackWorkflow += 1;
      if (entry.entryKind === "p8.5_no_rollback_needed") summary.rollbackNoRollbackNeeded += 1;
      if (entry.entryKind === "p8.5_rollback_ready") summary.rollbackReady += 1;
      if (entry.entryKind === "p8.5_rollback_verification_pending") {
        summary.rollbackVerificationPending += 1;
      }
      if (entry.entryKind === "p8.5_rollback_verified_closed") {
        summary.rollbackVerifiedClosed += 1;
      }
      if (entry.entryKind === "p8.5_manual_intervention_required") {
        summary.manualInterventionRequired += 1;
      }
    }
  }
  return summary;
}

function ledgerFingerprintPayload(
  ledger: Omit<ActionAuditLedger, "ledgerFingerprint" | "ledgerId">,
): unknown {
  return {
    version: ledger.version,
    actionId: ledger.actionId,
    referenceTime: ledger.referenceTime,
    target: ledger.target,
    summary: ledger.summary,
    firstEntryFingerprint: ledger.firstEntryFingerprint,
    finalEntryFingerprint: ledger.finalEntryFingerprint,
    entries: ledger.entries,
    semantics: ledger.semantics,
    safety: ledger.safety,
  };
}

export function actionAuditLedgerSemantics() {
  return Object.freeze({
    actionSpecificDirectLineageOnly: true,
    exactReplayCollapsed: true,
    conflictingReplayFailsClosed: true,
    appendOnlyProjection: true,
    hashChainedEntries: true,
    unknownAndUnavailablePreserved: true,
    neighboringEventsDoNotFillGaps: true,
    orderingCreatesAuthority: false,
    orderingCreatesCausality: false,
    orderingCreatesPriority: false,
    currentStateInferred: false,
    executionSuccessInferred: false,
    approvalInferred: false,
    recommendationQualityInferred: false,
  });
}

export function actionAuditLedgerCapability() {
  return Object.freeze({
    version: P8_6_ACTION_AUDIT_LEDGER_VERSION,
    deterministicProjectionOnly: true,
    readOnlyArchitectureOnly: true,
    databaseReadPerformed: false,
    databaseWritePerformed: false,
    schemaMutationPerformed: false,
    persistencePerformed: false,
    providerNetworkReadPerformed: false,
    providerWritePerformed: false,
    publicSiteWritePerformed: false,
    rollbackWritePerformed: false,
    proposalMutationPerformed: false,
    approvalGrantPerformed: false,
    executionAuthorizationCreated: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    automaticTransition: false,
    schedulerActivated: false,
    workerActivated: false,
    autonomousExecutionAuthorized: false,
    liveExecutionAuthorized: false,
    deploymentPerformed: false,
    publicationPerformed: false,
  });
}

export function buildActionAuditLedger(input: ActionAuditLedgerInput): ActionAuditLedger {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("p86_invalid_input");
  }
  const actionId = exactId(input.actionId, "p86_invalid_action_id");
  const referenceTime = canonicalTimestamp(input.referenceTime, "p86_invalid_reference_time");
  const target = canonicalTarget(input.target);

  if (!Array.isArray(input.timelineEvents)) throw new Error("p86_invalid_timeline_events");
  if (!Array.isArray(input.verificationEvidence ?? [])) {
    throw new Error("p86_invalid_verification_evidence");
  }
  if (!Array.isArray(input.rollbackEvidence ?? [])) {
    throw new Error("p86_invalid_rollback_evidence");
  }

  const timeline = buildUnifiedChangeTimeline({
    timelineKey: "p86-action-" + hash(actionId).slice(0, 24),
    referenceTime,
    events: input.timelineEvents,
  });

  const candidates: Candidate[] = [];
  for (let index = 0; index < timeline.events.length; index += 1) {
    candidates.push(
      projectTimelineCandidate(timeline.events[index]!, actionId, target, index),
    );
  }
  for (const evidence of input.verificationEvidence ?? []) {
    candidates.push(projectVerificationCandidate(evidence, actionId, referenceTime, target));
  }
  for (const evidence of input.rollbackEvidence ?? []) {
    candidates.push(projectRollbackCandidate(evidence, actionId, referenceTime, target));
  }

  const deduped = dedupeCandidates(candidates);
  if (deduped.length > P8_6_ACTION_AUDIT_LEDGER_MAX_ENTRIES) {
    throw new Error("p86_entry_limit_exceeded");
  }

  deduped.sort((left, right) =>
    left.occurredAt.localeCompare(right.occurredAt) ||
    left.precedence - right.precedence ||
    left.withinClassPrecedence - right.withinClassPrecedence ||
    left.sortFingerprint.localeCompare(right.sortFingerprint)
  );

  const entries: ActionAuditLedgerEntry[] = [];
  let previousEntryFingerprint: string | null = null;
  for (let index = 0; index < deduped.length; index += 1) {
    const entry = materializeEntry(deduped[index]!, index + 1, previousEntryFingerprint);
    entries.push(entry);
    previousEntryFingerprint = entry.entryFingerprint;
  }

  const summary = summarize(entries);
  const semantics = actionAuditLedgerSemantics();
  const safety = actionAuditLedgerCapability();
  const withoutIdentity: Omit<ActionAuditLedger, "ledgerFingerprint" | "ledgerId"> = {
    version: P8_6_ACTION_AUDIT_LEDGER_VERSION,
    actionId,
    referenceTime,
    target,
    summary,
    firstEntryFingerprint: entries[0]?.entryFingerprint ?? null,
    finalEntryFingerprint: entries.at(-1)?.entryFingerprint ?? null,
    entries,
    semantics,
    safety,
  };
  const ledgerFingerprint = hash(ledgerFingerprintPayload(withoutIdentity));

  return {
    ...withoutIdentity,
    ledgerFingerprint,
    ledgerId: "p86-ledger-" + ledgerFingerprint.slice(0, 24),
  };
}

export function actionAuditLedgerIntegrityIssues(ledger: ActionAuditLedger): string[] {
  const issues: string[] = [];

  if (ledger.version !== P8_6_ACTION_AUDIT_LEDGER_VERSION) {
    issues.push("p86_ledger_version_mismatch");
  }

  try {
    exactId(ledger.actionId, "p86_ledger_action_id_invalid");
    canonicalTimestamp(ledger.referenceTime, "p86_ledger_reference_time_invalid");
    canonicalTarget(ledger.target);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "p86_ledger_identity_invalid");
  }

  if (ledger.entries.length > P8_6_ACTION_AUDIT_LEDGER_MAX_ENTRIES) {
    issues.push("p86_ledger_entry_limit_exceeded");
  }

  let previous: string | null = null;
  for (let index = 0; index < ledger.entries.length; index += 1) {
    const entry = ledger.entries[index]!;
    if (entry.version !== P8_6_ACTION_AUDIT_LEDGER_VERSION) {
      issues.push("p86_entry_version_mismatch");
    }
    if (entry.sequence !== index + 1) {
      issues.push("p86_entry_sequence_mismatch");
    }
    if (entry.previousEntryFingerprint !== previous) {
      issues.push("p86_entry_chain_link_mismatch");
    }
    if (entry.lineage.actionId !== ledger.actionId) {
      issues.push("p86_entry_action_id_mismatch");
    }
    if (JSON.stringify(stable(entry.target)) !== JSON.stringify(stable(ledger.target))) {
      issues.push("p86_entry_target_mismatch");
    }

    const {
      entryFingerprint: _entryFingerprint,
      entryId: _entryId,
      ...withoutIdentity
    } = entry;
    const recomputed = hash(withoutIdentity);
    if (recomputed !== entry.entryFingerprint) {
      issues.push("p86_entry_fingerprint_mismatch");
    }
    if (entry.entryId !== "p86-entry-" + entry.entryFingerprint.slice(0, 24)) {
      issues.push("p86_entry_id_mismatch");
    }
    previous = entry.entryFingerprint;
  }

  if (
    ledger.firstEntryFingerprint !== (ledger.entries[0]?.entryFingerprint ?? null)
  ) {
    issues.push("p86_first_entry_fingerprint_mismatch");
  }
  if (
    ledger.finalEntryFingerprint !== (ledger.entries.at(-1)?.entryFingerprint ?? null)
  ) {
    issues.push("p86_final_entry_fingerprint_mismatch");
  }

  const expectedSummary = summarize(ledger.entries);
  if (JSON.stringify(stable(expectedSummary)) !== JSON.stringify(stable(ledger.summary))) {
    issues.push("p86_summary_mismatch");
  }

  const { ledgerFingerprint: _ledgerFingerprint, ledgerId: _ledgerId, ...withoutIdentity } = ledger;
  const recomputedLedgerFingerprint = hash(ledgerFingerprintPayload(withoutIdentity));
  if (recomputedLedgerFingerprint !== ledger.ledgerFingerprint) {
    issues.push("p86_ledger_fingerprint_mismatch");
  }
  if (ledger.ledgerId !== "p86-ledger-" + ledger.ledgerFingerprint.slice(0, 24)) {
    issues.push("p86_ledger_id_mismatch");
  }

  if (
    ledger.safety.databaseReadPerformed !== false ||
    ledger.safety.databaseWritePerformed !== false ||
    ledger.safety.persistencePerformed !== false ||
    ledger.safety.providerNetworkReadPerformed !== false ||
    ledger.safety.providerWritePerformed !== false ||
    ledger.safety.publicSiteWritePerformed !== false ||
    ledger.safety.rollbackWritePerformed !== false ||
    ledger.safety.automaticTransition !== false ||
    ledger.safety.liveExecutionAuthorized !== false ||
    ledger.safety.deploymentPerformed !== false ||
    ledger.safety.publicationPerformed !== false
  ) {
    issues.push("p86_safety_marker_mismatch");
  }

  return [...new Set(issues)].sort();
}

export function assertActionAuditLedgerIntegrity(ledger: ActionAuditLedger): void {
  const issues = actionAuditLedgerIntegrityIssues(ledger);
  if (issues.length > 0) {
    throw new Error("p86_ledger_integrity_failure:" + issues.join(","));
  }
}
