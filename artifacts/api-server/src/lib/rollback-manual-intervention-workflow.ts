import { createHash } from "node:crypto";
import { executionStateFingerprint, type ExecutableField } from "./execution-foundation.js";
import {
  verificationAdapterIntegrityIssues,
  verificationAdapterRegistry,
  type VerificationAdapterResult,
  type VerificationMutationClass,
} from "./verification-adapters.js";

export const P8_5_ROLLBACK_WORKFLOW_VERSION = "p8-5-rollback-manual-intervention-v1" as const;

export const rollbackWorkflowDispositions = [
  "no_rollback_needed",
  "rollback_ready",
  "rollback_verification_pending",
  "rollback_verified_closed",
  "manual_intervention_required",
] as const;

export type RollbackWorkflowDisposition = typeof rollbackWorkflowDispositions[number];
export type PublicWriteOccurrence = "none" | "confirmed" | "possible";
export type RollbackMutationOutcome = "accepted" | "rejected" | "uncertain";

export type RollbackWorkflowRegistryEntry = {
  mutationClass: VerificationMutationClass;
  resourceKind: "product" | "collection";
  field: ExecutableField;
  workflowFingerprint: string;
};

export type RollbackWorkflowLineage = {
  executionId?: string | null;
  deploymentId?: string | null;
  rollbackId?: string | null;
  authorizationFingerprint?: string | null;
};

export type RollbackAttemptEvidence = {
  attemptId: string;
  mutationClass: string;
  resource: {
    kind: string;
    gid: string;
  };
  targetUrl: string;
  field: string;
  restoreValue: string | null;
  restoreFingerprint: string;
  outcome: RollbackMutationOutcome;
  deploymentId?: string | null;
  rollbackId?: string | null;
};

export type RollbackWorkflowInput = {
  mutationClass: string;
  resource: {
    kind: string;
    gid: string;
  };
  targetUrl: string;
  field: string;
  before: {
    value: string | null;
    fingerprint: string;
  };
  after: {
    value: string | null;
    fingerprint: string;
  };
  forwardVerification: VerificationAdapterResult;
  publicWriteOccurrence: PublicWriteOccurrence;
  rollbackAttempts?: readonly RollbackAttemptEvidence[];
  rollbackVerification?: VerificationAdapterResult | null;
  rollbackVerificationExhausted?: boolean;
  lineage?: RollbackWorkflowLineage | null;
};

export type ManualInterventionArtifact = {
  version: typeof P8_5_ROLLBACK_WORKFLOW_VERSION;
  mutationClass: string;
  resource: {
    kind: string;
    gid: string;
  };
  targetUrl: string;
  field: string;
  lineage: RollbackWorkflowLineage | null;
  reasonCodes: string[];
  requiredEvidence: string[];
  providerWriteMayHaveOccurred: boolean;
  rollbackAttemptCount: number;
  providerWritePerformed: false;
  rollbackWritePerformed: false;
  databaseMutationPerformed: false;
  automaticTransition: false;
  liveExecutionAuthorized: false;
  artifactFingerprint: string;
};

export type RollbackWorkflowResult = {
  version: typeof P8_5_ROLLBACK_WORKFLOW_VERSION;
  mutationClass: string;
  workflowFingerprint: string | null;
  disposition: RollbackWorkflowDisposition;
  resource: {
    kind: string;
    gid: string;
  };
  targetUrl: string;
  field: string;
  before: {
    value: string | null;
    fingerprint: string;
  };
  after: {
    value: string | null;
    fingerprint: string;
  };
  forwardVerificationFingerprint: string;
  rollbackVerificationFingerprint: string | null;
  publicWriteOccurrence: PublicWriteOccurrence;
  rollbackAttemptCount: number;
  rollbackAttemptFingerprint: string | null;
  reasonCodes: string[];
  manualIntervention: ManualInterventionArtifact | null;
  providerWritePerformed: false;
  rollbackWritePerformed: false;
  databaseMutationPerformed: false;
  automaticTransition: false;
  liveExecutionAuthorized: false;
  resultFingerprint: string;
};

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

function normalizeReasons(reasons: readonly string[]): string[] {
  return [...new Set(reasons)].sort();
}

function safeString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = value.normalize("NFKC").trim();
  return normalized || null;
}

function normalizeLineage(value: RollbackWorkflowLineage | null | undefined): RollbackWorkflowLineage | null {
  if (!value) return null;
  return {
    executionId: safeString(value.executionId),
    deploymentId: safeString(value.deploymentId),
    rollbackId: safeString(value.rollbackId),
    authorizationFingerprint: safeString(value.authorizationFingerprint),
  };
}

export const rollbackWorkflowRegistry: readonly RollbackWorkflowRegistryEntry[] = Object.freeze(
  verificationAdapterRegistry.map((entry) => Object.freeze({
    mutationClass: entry.mutationClass,
    resourceKind: entry.resourceKind,
    field: entry.field,
    workflowFingerprint: hash({
      version: P8_5_ROLLBACK_WORKFLOW_VERSION,
      mutationClass: entry.mutationClass,
      resourceKind: entry.resourceKind,
      field: entry.field,
    }),
  })),
);

export function resolveRollbackWorkflow(
  mutationClass: string,
  resourceKind: string,
  field: string,
): RollbackWorkflowRegistryEntry | null {
  return rollbackWorkflowRegistry.find(
    (entry) =>
      entry.mutationClass === mutationClass &&
      entry.resourceKind === resourceKind &&
      entry.field === field,
  ) ?? null;
}

function sameResource(
  left: { kind: string; gid: string },
  right: { kind: string; gid: string },
): boolean {
  return left.kind === right.kind && left.gid === right.gid;
}

function rollbackAttemptFingerprint(attempt: RollbackAttemptEvidence): string {
  return hash({
    attemptId: attempt.attemptId,
    mutationClass: attempt.mutationClass,
    resource: attempt.resource,
    targetUrl: attempt.targetUrl,
    field: attempt.field,
    restoreValue: attempt.restoreValue,
    restoreFingerprint: attempt.restoreFingerprint,
    outcome: attempt.outcome,
    deploymentId: safeString(attempt.deploymentId),
    rollbackId: safeString(attempt.rollbackId),
  });
}

function forwardIntegrityIssues(
  input: RollbackWorkflowInput,
  entry: RollbackWorkflowRegistryEntry | null,
): string[] {
  const issues = verificationAdapterIntegrityIssues(input.forwardVerification)
    .map((issue) => "forward_" + issue);

  if (!entry) issues.push("unsupported_mutation_class");
  if (input.forwardVerification.mutationClass !== input.mutationClass) {
    issues.push("forward_mutation_class_mismatch");
  }
  if (!sameResource(input.forwardVerification.resource, input.resource)) {
    issues.push("forward_resource_identity_mismatch");
  }
  if (input.forwardVerification.targetUrl !== input.targetUrl) {
    issues.push("forward_target_url_mismatch");
  }
  if (input.forwardVerification.field !== input.field) {
    issues.push("forward_field_mismatch");
  }
  if (
    input.forwardVerification.expected.value !== input.after.value ||
    input.forwardVerification.expected.fingerprint !== input.after.fingerprint
  ) {
    issues.push("forward_expected_state_mismatch");
  }
  if (executionStateFingerprint(input.field, input.before.value) !== input.before.fingerprint) {
    issues.push("before_state_fingerprint_invalid");
  }
  if (executionStateFingerprint(input.field, input.after.value) !== input.after.fingerprint) {
    issues.push("after_state_fingerprint_invalid");
  }
  return normalizeReasons(issues);
}

function attemptIntegrityIssues(
  input: RollbackWorkflowInput,
  attempt: RollbackAttemptEvidence,
): string[] {
  const issues: string[] = [];
  if (!attempt.attemptId.trim()) issues.push("rollback_attempt_identity_missing");
  if (attempt.mutationClass !== input.mutationClass) issues.push("rollback_mutation_class_mismatch");
  if (!sameResource(attempt.resource, input.resource)) issues.push("rollback_resource_identity_mismatch");
  if (attempt.targetUrl !== input.targetUrl) issues.push("rollback_target_url_mismatch");
  if (attempt.field !== input.field) issues.push("rollback_field_mismatch");
  if (
    attempt.restoreValue !== input.before.value ||
    attempt.restoreFingerprint !== input.before.fingerprint
  ) {
    issues.push("rollback_restore_state_mismatch");
  }
  if (executionStateFingerprint(input.field, attempt.restoreValue) !== attempt.restoreFingerprint) {
    issues.push("rollback_restore_fingerprint_invalid");
  }
  if (!["accepted", "rejected", "uncertain"].includes(attempt.outcome)) {
    issues.push("rollback_outcome_invalid");
  }
  const lineage = normalizeLineage(input.lineage);
  if (
    lineage?.deploymentId &&
    safeString(attempt.deploymentId) &&
    lineage.deploymentId !== safeString(attempt.deploymentId)
  ) {
    issues.push("rollback_deployment_lineage_mismatch");
  }
  if (
    lineage?.rollbackId &&
    safeString(attempt.rollbackId) &&
    lineage.rollbackId !== safeString(attempt.rollbackId)
  ) {
    issues.push("rollback_identity_lineage_mismatch");
  }
  return normalizeReasons(issues);
}

function rollbackVerificationIssues(
  input: RollbackWorkflowInput,
  verification: VerificationAdapterResult,
): string[] {
  const issues = verificationAdapterIntegrityIssues(verification)
    .map((issue) => "rollback_" + issue);
  if (verification.mutationClass !== input.mutationClass) {
    issues.push("rollback_verification_mutation_class_mismatch");
  }
  if (!sameResource(verification.resource, input.resource)) {
    issues.push("rollback_verification_resource_mismatch");
  }
  if (verification.targetUrl !== input.targetUrl) {
    issues.push("rollback_verification_target_url_mismatch");
  }
  if (verification.field !== input.field) {
    issues.push("rollback_verification_field_mismatch");
  }
  if (
    verification.expected.value !== input.before.value ||
    verification.expected.fingerprint !== input.before.fingerprint
  ) {
    issues.push("rollback_verification_expected_restore_mismatch");
  }
  return normalizeReasons(issues);
}

function evidenceForReasons(reasons: readonly string[]): string[] {
  const required = new Set<string>();
  for (const reason of reasons) {
    if (reason.includes("unsupported_mutation_class")) required.add("supported_mutation_class");
    if (reason.includes("forward_verification") || reason.includes("forward_state")) {
      required.add("authoritative_forward_state");
    }
    if (reason.includes("public_write") || reason.includes("write_outcome")) {
      required.add("provider_write_outcome");
    }
    if (
      reason.includes("before_state") ||
      reason.includes("restore") ||
      reason.includes("fingerprint")
    ) {
      required.add("captured_pre_change_state");
    }
    if (
      reason.includes("resource") ||
      reason.includes("target") ||
      reason.includes("field") ||
      reason.includes("lineage") ||
      reason.includes("identity")
    ) {
      required.add("matching_execution_lineage");
    }
    if (reason.includes("rollback_mutation") || reason.includes("rollback_outcome")) {
      required.add("rollback_mutation_outcome");
    }
    if (reason.includes("rollback_verification")) {
      required.add("authoritative_rollback_state");
    }
    if (reason.includes("disagreement") || reason.includes("state_mismatch")) {
      required.add("provider_storefront_restore_agreement");
    }
    if (reason.includes("duplicate") || reason.includes("multiple")) {
      required.add("single_rollback_attempt_lineage");
    }
  }
  if (required.size === 0) required.add("operator_review");
  return [...required].sort();
}

function manualArtifact(
  input: RollbackWorkflowInput,
  reasons: readonly string[],
  rollbackAttemptCount: number,
): ManualInterventionArtifact {
  const normalizedReasons = normalizeReasons(reasons);
  const withoutFingerprint = {
    version: P8_5_ROLLBACK_WORKFLOW_VERSION,
    mutationClass: input.mutationClass,
    resource: input.resource,
    targetUrl: input.targetUrl,
    field: input.field,
    lineage: normalizeLineage(input.lineage),
    reasonCodes: normalizedReasons,
    requiredEvidence: evidenceForReasons(normalizedReasons),
    providerWriteMayHaveOccurred: input.publicWriteOccurrence !== "none",
    rollbackAttemptCount,
    providerWritePerformed: false as const,
    rollbackWritePerformed: false as const,
    databaseMutationPerformed: false as const,
    automaticTransition: false as const,
    liveExecutionAuthorized: false as const,
  };
  return {
    ...withoutFingerprint,
    artifactFingerprint: hash(withoutFingerprint),
  };
}

function finalize(
  input: RollbackWorkflowInput,
  entry: RollbackWorkflowRegistryEntry | null,
  disposition: RollbackWorkflowDisposition,
  reasons: readonly string[],
  attempt: RollbackAttemptEvidence | null,
  manual: ManualInterventionArtifact | null,
): RollbackWorkflowResult {
  const normalizedReasons = normalizeReasons(reasons);
  const withoutFingerprint = {
    version: P8_5_ROLLBACK_WORKFLOW_VERSION,
    mutationClass: input.mutationClass,
    workflowFingerprint: entry?.workflowFingerprint ?? null,
    disposition,
    resource: input.resource,
    targetUrl: input.targetUrl,
    field: input.field,
    before: input.before,
    after: input.after,
    forwardVerificationFingerprint: input.forwardVerification.resultFingerprint,
    rollbackVerificationFingerprint: input.rollbackVerification?.resultFingerprint ?? null,
    publicWriteOccurrence: input.publicWriteOccurrence,
    rollbackAttemptCount: input.rollbackAttempts?.length ?? 0,
    rollbackAttemptFingerprint: attempt ? rollbackAttemptFingerprint(attempt) : null,
    reasonCodes: normalizedReasons,
    manualIntervention: manual,
    providerWritePerformed: false as const,
    rollbackWritePerformed: false as const,
    databaseMutationPerformed: false as const,
    automaticTransition: false as const,
    liveExecutionAuthorized: false as const,
  };
  return {
    ...withoutFingerprint,
    resultFingerprint: hash(withoutFingerprint),
  };
}

export function planRollbackWorkflow(input: RollbackWorkflowInput): RollbackWorkflowResult {
  const entry = resolveRollbackWorkflow(input.mutationClass, input.resource.kind, input.field);
  const attempts = [...(input.rollbackAttempts ?? [])];
  const structuralIssues = forwardIntegrityIssues(input, entry);

  if (!["none", "confirmed", "possible"].includes(input.publicWriteOccurrence)) {
    structuralIssues.push("public_write_occurrence_invalid");
  }
  if (attempts.length > 1) {
    structuralIssues.push("multiple_rollback_attempts_detected");
  }

  const attempt = attempts[0] ?? null;
  if (attempt) structuralIssues.push(...attemptIntegrityIssues(input, attempt));

  if (input.rollbackVerification && !attempt) {
    structuralIssues.push("rollback_verification_without_attempt");
  }
  if (input.rollbackVerification) {
    structuralIssues.push(...rollbackVerificationIssues(input, input.rollbackVerification));
  }

  const normalizedStructural = normalizeReasons(structuralIssues);
  if (normalizedStructural.length > 0) {
    const artifact = manualArtifact(input, normalizedStructural, attempts.length);
    return finalize(
      input,
      entry,
      "manual_intervention_required",
      normalizedStructural,
      attempt,
      artifact,
    );
  }

  const forward = input.forwardVerification;

  if (forward.status === "verified") {
    if (attempt) {
      const reasons = ["rollback_attempt_present_after_verified_forward_state"];
      const artifact = manualArtifact(input, reasons, attempts.length);
      return finalize(input, entry, "manual_intervention_required", reasons, attempt, artifact);
    }
    return finalize(
      input,
      entry,
      "no_rollback_needed",
      ["forward_state_verified"],
      null,
      null,
    );
  }

  if (forward.status === "unavailable") {
    if (input.publicWriteOccurrence === "none" && !attempt) {
      return finalize(
        input,
        entry,
        "no_rollback_needed",
        ["forward_verification_unavailable_no_public_write"],
        null,
        null,
      );
    }
    const reasons = [
      input.publicWriteOccurrence === "possible"
        ? "public_write_outcome_uncertain"
        : "forward_verification_unavailable_after_confirmed_write",
    ];
    const artifact = manualArtifact(input, reasons, attempts.length);
    return finalize(input, entry, "manual_intervention_required", reasons, attempt, artifact);
  }

  // Forward verification is authoritatively failed from here.
  if (input.publicWriteOccurrence === "none") {
    if (attempt) {
      const reasons = ["rollback_attempt_present_without_public_write"];
      const artifact = manualArtifact(input, reasons, attempts.length);
      return finalize(input, entry, "manual_intervention_required", reasons, attempt, artifact);
    }
    return finalize(
      input,
      entry,
      "no_rollback_needed",
      ["forward_failed_before_public_write"],
      null,
      null,
    );
  }

  if (input.publicWriteOccurrence === "possible") {
    const reasons = ["public_write_outcome_uncertain"];
    const artifact = manualArtifact(input, reasons, attempts.length);
    return finalize(input, entry, "manual_intervention_required", reasons, attempt, artifact);
  }

  if (!attempt) {
    return finalize(
      input,
      entry,
      "rollback_ready",
      ["authoritative_forward_failure_after_confirmed_write", "restore_state_integrity_verified"],
      null,
      null,
    );
  }

  if (attempt.outcome === "rejected") {
    const reasons = ["rollback_mutation_rejected"];
    const artifact = manualArtifact(input, reasons, attempts.length);
    return finalize(input, entry, "manual_intervention_required", reasons, attempt, artifact);
  }
  if (attempt.outcome === "uncertain") {
    const reasons = ["rollback_mutation_outcome_uncertain"];
    const artifact = manualArtifact(input, reasons, attempts.length);
    return finalize(input, entry, "manual_intervention_required", reasons, attempt, artifact);
  }

  const rollbackVerification = input.rollbackVerification ?? null;
  if (!rollbackVerification) {
    if (input.rollbackVerificationExhausted === true) {
      const reasons = ["rollback_verification_exhausted_without_authoritative_evidence"];
      const artifact = manualArtifact(input, reasons, attempts.length);
      return finalize(input, entry, "manual_intervention_required", reasons, attempt, artifact);
    }
    return finalize(
      input,
      entry,
      "rollback_verification_pending",
      ["rollback_mutation_accepted_verification_pending"],
      attempt,
      null,
    );
  }

  if (rollbackVerification.status === "verified") {
    if (!rollbackVerification.providerVerified || !rollbackVerification.storefrontVerified) {
      const reasons = ["rollback_verification_verified_state_inconsistent"];
      const artifact = manualArtifact(input, reasons, attempts.length);
      return finalize(input, entry, "manual_intervention_required", reasons, attempt, artifact);
    }
    return finalize(
      input,
      entry,
      "rollback_verified_closed",
      ["rollback_restore_verified_by_provider_and_storefront"],
      attempt,
      null,
    );
  }

  if (rollbackVerification.status === "unavailable") {
    if (input.rollbackVerificationExhausted === true) {
      const reasons = ["rollback_verification_unavailable_after_bounded_evidence_exhausted"];
      const artifact = manualArtifact(input, reasons, attempts.length);
      return finalize(input, entry, "manual_intervention_required", reasons, attempt, artifact);
    }
    return finalize(
      input,
      entry,
      "rollback_verification_pending",
      ["rollback_verification_temporarily_unavailable"],
      attempt,
      null,
    );
  }

  const reasons = rollbackVerification.failureCategories.includes("provider_storefront_disagreement")
    ? ["rollback_provider_storefront_disagreement"]
    : ["rollback_verification_failed"];
  const artifact = manualArtifact(input, reasons, attempts.length);
  return finalize(input, entry, "manual_intervention_required", reasons, attempt, artifact);
}

export function rollbackWorkflowCapability() {
  return Object.freeze({
    version: P8_5_ROLLBACK_WORKFLOW_VERSION,
    dispositions: rollbackWorkflowDispositions,
    mutationClasses: rollbackWorkflowRegistry.map((entry) => entry.mutationClass),
    providerWritePerformed: false,
    rollbackWritePerformed: false,
    databaseMutationPerformed: false,
    automaticTransition: false,
    liveExecutionAuthorized: false,
    persistenceEnabled: false,
    networkAccessEnabled: false,
  });
}
