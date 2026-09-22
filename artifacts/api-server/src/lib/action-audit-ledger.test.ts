import test from "node:test";
import assert from "node:assert/strict";
import {
  actionAuditLedgerCapability,
  actionAuditLedgerIntegrityIssues,
  buildActionAuditLedger,
  P8_6_ACTION_AUDIT_LEDGER_MAX_ENTRIES,
  type ActionAuditLedgerInput,
  type RollbackWorkflowEvidenceEnvelope,
  type VerificationEvidenceEnvelope,
} from "./action-audit-ledger.js";
import { executionStateFingerprint } from "./execution-foundation.js";
import {
  planRollbackWorkflow,
  type RollbackAttemptEvidence,
  type RollbackWorkflowInput,
} from "./rollback-manual-intervention-workflow.js";
import {
  verifyCertifiedMutation,
  type VerificationAdapterResult,
} from "./verification-adapters.js";
import type {
  Task53ProviderState,
  Task53ShopifyCredential,
  Task53StorefrontVerification,
} from "./task53-production-pilot.js";
import type { UnifiedTimelineSourceEventInput } from "./unified-change-timeline.js";

const actionId = "action-p86-1";
const resource = {
  kind: "product" as const,
  gid: "gid://shopify/Product/123456789",
};
const targetUrl = "https://diamondshelf.us/products/example";
const field = "meta_description" as const;
const mutationClass = "shopify_product_seo_meta_description" as const;
const beforeValue = "Before SEO description";
const afterValue = "After SEO description";
const beforeFingerprint = executionStateFingerprint(field, beforeValue);
const afterFingerprint = executionStateFingerprint(field, afterValue);

const credential: Task53ShopifyCredential = {
  shopDomain: "vcuxm7-76.myshopify.com",
  accessToken: "network-free-test-token",
  scopes: ["read_products"],
};

function providerState(value: string | null): Task53ProviderState {
  return {
    resource,
    field,
    value,
    fingerprint: executionStateFingerprint(field, value),
    seoTitle: null,
    seoDescription: value,
    providerRequestId: "provider-read-network-free",
  };
}

function storefrontState(
  expectedValue: string | null,
  observedValue: string | null = expectedValue,
  errorCategory: string | null = null,
): Task53StorefrontVerification {
  const expectedFingerprint = executionStateFingerprint(field, expectedValue);
  const observedFingerprint = observedValue === null
    ? executionStateFingerprint(field, null)
    : executionStateFingerprint(field, observedValue);
  return {
    ok: errorCategory === null && expectedFingerprint === observedFingerprint,
    statusCode: errorCategory === "storefront_network_error" ? null : 200,
    expectedValue,
    observedValue,
    expectedFingerprint,
    observedFingerprint,
    errorCategory,
  };
}

async function verification(
  expectedValue: string,
  mode: "verified" | "failed_provider" | "unavailable",
): Promise<VerificationAdapterResult> {
  return verifyCertifiedMutation(
    {
      resource,
      targetUrl,
      field,
      expectedValue,
      expectedFingerprint: executionStateFingerprint(field, expectedValue),
      credential,
    },
    {
      readProvider: async () =>
        providerState(mode === "failed_provider" ? "Provider mismatch" : expectedValue),
      verifyStorefront: async () => {
        if (mode === "unavailable") {
          return {
            ok: false,
            statusCode: null,
            expectedValue,
            observedValue: null,
            expectedFingerprint: executionStateFingerprint(field, expectedValue),
            observedFingerprint: null,
            errorCategory: "storefront_network_error",
          };
        }
        return storefrontState(expectedValue);
      },
    },
  );
}

function rollbackAttempt(): RollbackAttemptEvidence {
  return {
    attemptId: "rollback-attempt-1",
    mutationClass,
    resource,
    targetUrl,
    field,
    restoreValue: beforeValue,
    restoreFingerprint: beforeFingerprint,
    outcome: "accepted",
    deploymentId: "deployment-1",
    rollbackId: "rollback-1",
  };
}

async function rollbackResult(
  disposition: "manual" | "closed" | "no_rollback",
) {
  const forwardMode =
    disposition === "no_rollback" ? "verified" : disposition === "manual" ? "unavailable" : "failed_provider";
  const forward = await verification(afterValue, forwardMode);

  const input: RollbackWorkflowInput = {
    mutationClass,
    resource,
    targetUrl,
    field,
    before: { value: beforeValue, fingerprint: beforeFingerprint },
    after: { value: afterValue, fingerprint: afterFingerprint },
    forwardVerification: forward,
    publicWriteOccurrence: disposition === "no_rollback" ? "confirmed" : "confirmed",
    rollbackAttempts: disposition === "closed" ? [rollbackAttempt()] : [],
    rollbackVerification:
      disposition === "closed" ? await verification(beforeValue, "verified") : null,
    rollbackVerificationExhausted: false,
    lineage: {
      executionId: "execution-1",
      deploymentId: "deployment-1",
      rollbackId: "rollback-1",
      authorizationFingerprint: "a".repeat(64),
    },
  };
  return planRollbackWorkflow(input);
}

function timelineEvent(
  eventId: string,
  occurredAt: string,
  eventKind: "action_authorized" | "provider_write_accepted" | "verification_passed" =
    "action_authorized",
  overrides: Partial<UnifiedTimelineSourceEventInput> = {},
): UnifiedTimelineSourceEventInput {
  const state =
    eventKind === "provider_write_accepted"
      ? {
          terminal: null,
          providerMutationOccurred: true,
          verification: null,
          rollback: null,
          changeRetainedLive: null,
          manualInterventionRequired: false,
          measurementEligibility: null,
        }
      : eventKind === "verification_passed"
        ? {
            terminal: null,
            providerMutationOccurred: true,
            verification: "verified" as const,
            rollback: null,
            changeRetainedLive: null,
            manualInterventionRequired: false,
            measurementEligibility: null,
          }
        : {
            terminal: null,
            providerMutationOccurred: false,
            verification: null,
            rollback: null,
            changeRetainedLive: null,
            manualInterventionRequired: false,
            measurementEligibility: null,
          };

  const base: UnifiedTimelineSourceEventInput = {
    occurredAt,
    eventClass: "execution",
    eventKind,
    source: {
      system: "p86_test_execution",
      version: "v1",
      eventId,
      eventFingerprint: null,
    },
    site: {
      siteId: "eb1da9ee-539c-4200-8f04-f64ccaea7768",
      domain: "diamondshelf.us",
    },
    lineage: {
      opportunityId: null,
      opportunityFingerprint: null,
      relatedOpportunityFingerprint: null,
      recommendationId: null,
      recommendationFingerprint: null,
      actionPlanId: "plan-1",
      proposalFingerprint: "b".repeat(64),
      approvalId: "approval-1",
      actionId,
      authorizationFingerprint: "a".repeat(64),
      deploymentId: "deployment-1",
      verificationId: eventKind === "verification_passed" ? "verification-1" : null,
      rollbackId: null,
    },
    target: {
      pageId: null,
      url: targetUrl,
      resourceKind: resource.kind,
      resourceId: resource.gid,
      field,
      beforeFingerprint,
      afterFingerprint,
    },
    associations: {
      query: null,
      category: null,
    },
    state,
    sourceLineage: [],
  };

  return {
    ...base,
    ...overrides,
    source: overrides.source ?? base.source,
    site: overrides.site ?? base.site,
    lineage: overrides.lineage ?? base.lineage,
    target: overrides.target === undefined ? base.target : overrides.target,
    associations: overrides.associations ?? base.associations,
    state: overrides.state ?? base.state,
    sourceLineage: overrides.sourceLineage ?? base.sourceLineage,
  };
}

function target() {
  return {
    mutationClass,
    resource,
    targetUrl,
    field,
    beforeFingerprint,
    afterFingerprint,
  };
}

async function verificationEnvelope(
  evidenceId: string,
  occurredAt: string,
  mode: "verified" | "failed_provider" | "unavailable" = "verified",
  expectedValue = afterValue,
): Promise<VerificationEvidenceEnvelope> {
  return {
    evidenceId,
    actionId,
    occurredAt,
    lineage: {
      actionPlanId: "plan-1",
      approvalId: "approval-1",
      authorizationFingerprint: "a".repeat(64),
      deploymentId: "deployment-1",
      verificationId: "verification-1",
    },
    result: await verification(expectedValue, mode),
  };
}

async function rollbackEnvelope(
  evidenceId: string,
  occurredAt: string,
  disposition: "manual" | "closed" | "no_rollback",
): Promise<RollbackWorkflowEvidenceEnvelope> {
  return {
    evidenceId,
    actionId,
    occurredAt,
    lineage: {
      actionPlanId: "plan-1",
      approvalId: "approval-1",
      authorizationFingerprint: "a".repeat(64),
      deploymentId: "deployment-1",
      rollbackId: "rollback-1",
    },
    result: await rollbackResult(disposition),
  };
}

async function mixedInput(): Promise<ActionAuditLedgerInput> {
  return {
    actionId,
    referenceTime: "2026-09-22T12:10:00.000Z",
    target: target(),
    timelineEvents: [
      timelineEvent("event-write", "2026-09-22T12:02:00.000Z", "provider_write_accepted"),
      timelineEvent("event-auth", "2026-09-22T12:01:00.000Z", "action_authorized"),
    ],
    verificationEvidence: [
      await verificationEnvelope("verification-evidence-1", "2026-09-22T12:03:00.000Z"),
    ],
    rollbackEvidence: [
      await rollbackEnvelope("rollback-evidence-1", "2026-09-22T12:04:00.000Z", "no_rollback"),
    ],
  };
}

test("mixed P10.1 + P8.4 + P8.5 evidence builds one deterministic action-bound hash chain", async () => {
  const ledger = buildActionAuditLedger(await mixedInput());

  assert.equal(ledger.summary.total, 4);
  assert.equal(ledger.summary.timeline, 2);
  assert.equal(ledger.summary.verification, 1);
  assert.equal(ledger.summary.rollbackWorkflow, 1);
  assert.equal(ledger.summary.verificationVerified, 1);
  assert.equal(ledger.summary.rollbackNoRollbackNeeded, 1);
  assert.deepEqual(
    ledger.entries.map((entry) => entry.entryClass),
    ["timeline", "timeline", "verification", "rollback_workflow"],
  );
  assert.deepEqual(
    ledger.entries.map((entry) => entry.sequence),
    [1, 2, 3, 4],
  );
  assert.equal(ledger.entries[0]?.previousEntryFingerprint, null);
  assert.equal(
    ledger.entries[1]?.previousEntryFingerprint,
    ledger.entries[0]?.entryFingerprint,
  );
  assert.equal(
    ledger.finalEntryFingerprint,
    ledger.entries.at(-1)?.entryFingerprint,
  );
  assert.deepEqual(actionAuditLedgerIntegrityIssues(ledger), []);
});

test("input ordering does not change ledger ordering or fingerprint", async () => {
  const firstInput = await mixedInput();
  const secondInput = await mixedInput();
  secondInput.timelineEvents = [...secondInput.timelineEvents].reverse();
  secondInput.verificationEvidence = [...(secondInput.verificationEvidence ?? [])].reverse();
  secondInput.rollbackEvidence = [...(secondInput.rollbackEvidence ?? [])].reverse();

  const first = buildActionAuditLedger(firstInput);
  const second = buildActionAuditLedger(secondInput);
  assert.deepEqual(first, second);
  assert.equal(first.ledgerFingerprint, second.ledgerFingerprint);
});

test("exact timeline/evidence replay collapses, conflicting replay fails closed", async () => {
  const input = await mixedInput();
  input.timelineEvents.push(structuredClone(input.timelineEvents[0]!));
  input.verificationEvidence = [
    ...(input.verificationEvidence ?? []),
    structuredClone((input.verificationEvidence ?? [])[0]!),
  ];
  const ledger = buildActionAuditLedger(input);
  assert.equal(ledger.summary.total, 4);

  const conflict = await mixedInput();
  const original = (conflict.verificationEvidence ?? [])[0]!;
  conflict.verificationEvidence = [
    original,
    {
      ...structuredClone(original),
      occurredAt: "2026-09-22T12:03:30.000Z",
    },
  ];
  assert.throws(
    () => buildActionAuditLedger(conflict),
    /p86_source_replay_conflict/,
  );
});

test("timeline history requires exact direct action ID", async () => {
  const missing = await mixedInput();
  missing.timelineEvents[0] = timelineEvent(
    "event-write",
    "2026-09-22T12:02:00.000Z",
    "provider_write_accepted",
    {
      lineage: {
        ...timelineEvent("x", "2026-09-22T12:00:00.000Z").lineage,
        actionId: null,
      },
    },
  );
  assert.throws(() => buildActionAuditLedger(missing), /p86_timeline_action_id_missing/);

  const foreign = await mixedInput();
  foreign.timelineEvents[0] = timelineEvent(
    "event-write",
    "2026-09-22T12:02:00.000Z",
    "provider_write_accepted",
    {
      lineage: {
        ...timelineEvent("x", "2026-09-22T12:00:00.000Z").lineage,
        actionId: "action-foreign",
      },
    },
  );
  assert.throws(() => buildActionAuditLedger(foreign), /p86_timeline_action_id_mismatch/);
});

test("timeline target/resource/field/before/after conflicts fail closed", async () => {
  for (const [key, value, pattern] of [
    ["url", "https://diamondshelf.us/products/different", /p86_timeline_target_url_mismatch/],
    ["resourceKind", "collection", /p86_timeline_resource_kind_mismatch/],
    ["resourceId", "gid:\/\/shopify\/Product\/999", /p86_timeline_resource_id_mismatch/],
    ["field", "title", /p86_timeline_field_mismatch/],
    ["beforeFingerprint", "c".repeat(64), /p86_timeline_before_fingerprint_mismatch/],
    ["afterFingerprint", "d".repeat(64), /p86_timeline_after_fingerprint_mismatch/],
  ] as const) {
    const input = await mixedInput();
    const base = timelineEvent("event-write", "2026-09-22T12:02:00.000Z", "provider_write_accepted");
    input.timelineEvents = [{
      ...base,
      target: {
        ...base.target!,
        [key]: value,
      },
    }];
    assert.throws(() => buildActionAuditLedger(input), pattern);
  }
});

test("tampered P8.4 evidence fails closed", async () => {
  const input = await mixedInput();
  const envelope = structuredClone((input.verificationEvidence ?? [])[0]!);
  envelope.result.resultFingerprint = "0".repeat(64);
  input.verificationEvidence = [envelope];
  assert.throws(
    () => buildActionAuditLedger(input),
    /p86_verification_integrity_failure/,
  );
});

test("tampered P8.5 evidence fails closed", async () => {
  const input = await mixedInput();
  const envelope = structuredClone((input.rollbackEvidence ?? [])[0]!);
  envelope.result.resultFingerprint = "0".repeat(64);
  input.rollbackEvidence = [envelope];
  assert.throws(
    () => buildActionAuditLedger(input),
    /p86_rollback_workflow_integrity_failure/,
  );
});

test("manual-intervention artifact is preserved exactly as bounded descriptive evidence", async () => {
  const input = await mixedInput();
  const manual = await rollbackEnvelope(
    "rollback-manual",
    "2026-09-22T12:04:00.000Z",
    "manual",
  );
  input.rollbackEvidence = [manual];

  const ledger = buildActionAuditLedger(input);
  const entry = ledger.entries.find((candidate) => candidate.entryClass === "rollback_workflow")!;
  const projected = entry.evidence.manualIntervention as Record<string, unknown>;
  assert.equal(projected.artifactFingerprint, manual.result.manualIntervention?.artifactFingerprint);
  assert.deepEqual(projected.requiredEvidence, manual.result.manualIntervention?.requiredEvidence);
  assert.equal(ledger.summary.manualInterventionRequired, 1);
  assert.equal(ledger.safety.liveExecutionAuthorized, false);
});

test("rollback-verified closure is preserved without implying live authority", async () => {
  const input = await mixedInput();
  const closed = await rollbackEnvelope(
    "rollback-closed",
    "2026-09-22T12:05:00.000Z",
    "closed",
  );
  input.rollbackEvidence = [closed];

  const ledger = buildActionAuditLedger(input);
  const entry = ledger.entries.find((candidate) => candidate.entryClass === "rollback_workflow")!;
  assert.equal(entry.evidence.disposition, "rollback_verified_closed");
  assert.equal(ledger.summary.rollbackVerifiedClosed, 1);
  assert.equal(ledger.safety.rollbackWritePerformed, false);
  assert.equal(ledger.safety.task53ExecutionPerformed, false);
  assert.equal(ledger.safety.task54ExecutionPerformed, false);
  assert.equal(ledger.safety.liveExecutionAuthorized, false);
});

test("unavailable verification evidence stays unavailable", async () => {
  const input = await mixedInput();
  input.verificationEvidence = [
    await verificationEnvelope(
      "verification-unavailable",
      "2026-09-22T12:03:00.000Z",
      "unavailable",
    ),
  ];
  input.rollbackEvidence = [];

  const ledger = buildActionAuditLedger(input);
  const entry = ledger.entries.find((candidate) => candidate.entryClass === "verification")!;
  assert.equal(entry.entryKind, "p8.4_unavailable");
  assert.equal(entry.evidence.status, "unavailable");
  assert.equal(ledger.summary.verificationUnavailable, 1);
  assert.equal(ledger.semantics.unknownAndUnavailablePreserved, true);
  assert.equal(ledger.semantics.currentStateInferred, false);
});

test("entry mutation, removal and reordering are detected by ledger integrity verification", async () => {
  const ledger = buildActionAuditLedger(await mixedInput());

  const mutated = structuredClone(ledger);
  (mutated.entries[1]!.evidence.state as Record<string, unknown>).providerMutationOccurred = false;
  assert.ok(actionAuditLedgerIntegrityIssues(mutated).includes("p86_entry_fingerprint_mismatch"));

  const removed = structuredClone(ledger);
  removed.entries.splice(1, 1);
  const removalIssues = actionAuditLedgerIntegrityIssues(removed);
  assert.ok(
    removalIssues.includes("p86_entry_sequence_mismatch") ||
    removalIssues.includes("p86_entry_chain_link_mismatch") ||
    removalIssues.includes("p86_summary_mismatch") ||
    removalIssues.includes("p86_ledger_fingerprint_mismatch"),
  );

  const reordered = structuredClone(ledger);
  [reordered.entries[0], reordered.entries[1]] = [reordered.entries[1]!, reordered.entries[0]!];
  const reorderIssues = actionAuditLedgerIntegrityIssues(reordered);
  assert.ok(
    reorderIssues.includes("p86_entry_sequence_mismatch") ||
    reorderIssues.includes("p86_entry_chain_link_mismatch"),
  );
});

test("ledger fingerprint and complete result are deterministic across replay", async () => {
  const input = await mixedInput();
  const first = buildActionAuditLedger(input);
  const second = buildActionAuditLedger(structuredClone(input));
  assert.deepEqual(first, second);
  assert.match(first.ledgerFingerprint, /^[0-9a-f]{64}$/);
  assert.match(first.ledgerId, /^p86-ledger-[0-9a-f]{24}$/);
});

test("bounded entry limit fails closed", async () => {
  const verified = await verification(afterValue, "verified");
  const verificationEvidence: VerificationEvidenceEnvelope[] = Array.from(
    { length: P8_6_ACTION_AUDIT_LEDGER_MAX_ENTRIES + 1 },
    (_, index) => ({
      evidenceId: `verification-limit-${index + 1}`,
      actionId,
      occurredAt: "2026-09-22T12:03:00.000Z",
      result: verified,
    }),
  );

  assert.throws(
    () =>
      buildActionAuditLedger({
        actionId,
        referenceTime: "2026-09-22T12:10:00.000Z",
        target: target(),
        timelineEvents: [],
        verificationEvidence,
        rollbackEvidence: [],
      }),
    /p86_entry_limit_exceeded/,
  );
});

test("capability explicitly prohibits persistence, provider activity, execution, automation and publication", () => {
  const capability = actionAuditLedgerCapability();
  assert.equal(capability.databaseReadPerformed, false);
  assert.equal(capability.databaseWritePerformed, false);
  assert.equal(capability.schemaMutationPerformed, false);
  assert.equal(capability.persistencePerformed, false);
  assert.equal(capability.providerNetworkReadPerformed, false);
  assert.equal(capability.providerWritePerformed, false);
  assert.equal(capability.publicSiteWritePerformed, false);
  assert.equal(capability.rollbackWritePerformed, false);
  assert.equal(capability.approvalGrantPerformed, false);
  assert.equal(capability.task51ExecutionPerformed, false);
  assert.equal(capability.task53ExecutionPerformed, false);
  assert.equal(capability.task54ExecutionPerformed, false);
  assert.equal(capability.automaticTransition, false);
  assert.equal(capability.schedulerActivated, false);
  assert.equal(capability.workerActivated, false);
  assert.equal(capability.autonomousExecutionAuthorized, false);
  assert.equal(capability.liveExecutionAuthorized, false);
  assert.equal(capability.deploymentPerformed, false);
  assert.equal(capability.publicationPerformed, false);
});
