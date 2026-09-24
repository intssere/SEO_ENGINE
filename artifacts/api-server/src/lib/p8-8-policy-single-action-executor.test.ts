import assert from "node:assert/strict";
import test from "node:test";
import {
  executeP88W07SingleAction,
  type P88W07ExecutionStore,
  type P88W07ProviderReadEvidence,
} from "./p8-8-policy-single-action-executor.js";
import {
  p88W07StableHash,
  projectP88W07DispatchIntent,
  type P88W07DispatchIntent,
  type P88W07DispatchState,
} from "./p8-8-policy-single-action-apply.js";
import type { P88W07DispatchRecord } from "./p8-8-policy-single-action-store.js";
import type {
  P88W07MutationReceipt,
  P88W07StorefrontEvidence,
} from "./p8-8-policy-single-action-shopify.js";
import { buildP88W07TestFixture } from "./p8-8-w07-test-fixture.js";

function dispatchRecord(
  intent: P88W07DispatchIntent,
  state: P88W07DispatchState = "reserved_prewrite",
  revision = 1,
): P88W07DispatchRecord {
  const forwardSpent = state !== "reserved_prewrite"
    && state !== "cancelled_before_dispatch";
  const rollbackSpent = [
    "rollback_started",
    "rollback_verification_pending",
    "rollback_verified_closed",
  ].includes(state);
  return {
    dispatchId: intent.dispatchId,
    dispatchFingerprint: intent.dispatchFingerprint,
    executionId: intent.executionId,
    siteId: intent.siteId,
    state,
    rowRevision: revision,
    forwardAttemptCount: forwardSpent ? 1 : 0,
    rollbackAttemptCount: rollbackSpent ? 1 : 0,
    publicWriteOccurrence:
      state === "reserved_prewrite" || state === "cancelled_before_dispatch"
        ? "none"
        : state === "forward_rejected_no_write"
          ? "none"
          : state === "dispatch_started" || state === "manual_intervention_required"
            ? "possible"
            : "confirmed",
    rollbackOccurrence: rollbackSpent ? "possible" : "none",
    providerRequestId: null,
    providerRequestFingerprint: null,
    providerResponseFingerprint: null,
    verificationFingerprint: null,
    reservedAt: "2026-09-23T12:00:00.000Z",
    dispatchStartedAt: forwardSpent ? "2026-09-23T12:00:01.000Z" : null,
    rollbackStartedAt: rollbackSpent ? "2026-09-23T12:00:02.000Z" : null,
    terminalAt: [
      "forward_rejected_no_write",
      "forward_verified_live",
      "rollback_verified_closed",
      "cancelled_before_dispatch",
      "manual_intervention_required",
    ].includes(state) ? "2026-09-23T12:00:03.000Z" : null,
    terminalReason: null,
  };
}

class FakeStore implements P88W07ExecutionStore {
  current: P88W07DispatchRecord | null = null;
  controlMode = "running";

  constructor(
    private readonly initialState: P88W07DispatchState = "reserved_prewrite",
  ) {}

  private set(
    intent: P88W07DispatchIntent,
    state: P88W07DispatchState,
  ): P88W07DispatchRecord {
    const revision = (this.current?.rowRevision ?? 0) + 1;
    this.current = dispatchRecord(intent, state, revision);
    return this.current;
  }

  async reservePrewrite(intent: P88W07DispatchIntent) {
    if (this.current) return { kind: "existing" as const, record: this.current };
    this.current = dispatchRecord(intent, this.initialState, 1);
    return {
      kind: this.initialState === "reserved_prewrite"
        ? "created" as const
        : "existing" as const,
      record: this.current,
    };
  }

  async readCurrentControl() {
    return { revision: 1, mode: this.controlMode, fingerprint: "a".repeat(64) };
  }

  async startDispatch(input: { intent: P88W07DispatchIntent }) {
    return this.set(input.intent, "dispatch_started");
  }

  async cancelBeforeDispatch(input: { intent: P88W07DispatchIntent }) {
    return this.set(input.intent, "cancelled_before_dispatch");
  }

  async markForwardRejectedNoWrite(input: { intent: P88W07DispatchIntent }) {
    return this.set(input.intent, "forward_rejected_no_write");
  }

  async markForwardAccepted(input: { intent: P88W07DispatchIntent }) {
    return this.set(input.intent, "forward_verification_pending");
  }

  async markForwardVerifiedLive(input: { intent: P88W07DispatchIntent }) {
    return this.set(input.intent, "forward_verified_live");
  }

  async markRollbackRequired(input: { intent: P88W07DispatchIntent }) {
    return this.set(input.intent, "rollback_required");
  }

  async startRollback(input: { intent: P88W07DispatchIntent }) {
    return this.set(input.intent, "rollback_started");
  }

  async markRollbackAccepted(input: { intent: P88W07DispatchIntent }) {
    return this.set(input.intent, "rollback_verification_pending");
  }

  async markRollbackVerifiedClosed(input: { intent: P88W07DispatchIntent }) {
    return this.set(input.intent, "rollback_verified_closed");
  }

  async markManualIntervention(input: { intent: P88W07DispatchIntent }) {
    return this.set(input.intent, "manual_intervention_required");
  }
}

function provider(
  intent: P88W07DispatchIntent,
  purpose: "before" | "after",
  rawValue?: string | null,
  status: P88W07ProviderReadEvidence["status"] = "observed",
): P88W07ProviderReadEvidence {
  return {
    status,
    resourceGid: intent.target.resourceGid,
    rawValue: rawValue === undefined
      ? purpose === "before"
        ? intent.state.beforeValue
        : intent.state.afterValue
      : rawValue,
    evidenceFingerprint: p88W07StableHash({
      purpose: "w07-executor-test-provider",
      phase: purpose,
      rawValue,
      status,
    }),
  };
}

function storefront(
  expectedValue: string | null,
  outcome: P88W07StorefrontEvidence["outcome"] = "verified",
): P88W07StorefrontEvidence {
  return {
    outcome,
    statusCode: 200,
    expectedValue,
    observedValue: outcome === "verified" ? expectedValue : "different",
    evidenceFingerprint: p88W07StableHash({
      purpose: "w07-executor-test-storefront",
      expectedValue,
      outcome,
    }),
    errorCategory: outcome === "verified" ? null : "storefront_state_mismatch",
  };
}

function receipt(
  outcome: P88W07MutationReceipt["outcome"],
): P88W07MutationReceipt {
  return {
    outcome,
    providerRequestId: "req-" + outcome,
    httpStatus: 200,
    errorCategory: outcome === "accepted"
      ? null
      : outcome === "rejected"
        ? "shopify_user_error"
        : "shopify_transport_outcome_uncertain",
    userErrors: outcome === "rejected"
      ? [{ field: ["seo", "description"], message: "Rejected" }]
      : [],
    responseFingerprint: p88W07StableHash({
      purpose: "w07-executor-test-receipt",
      outcome,
    }),
    providerMutationCalled: true,
    automaticRetryPerformed: false,
  };
}

function base() {
  const fixture = buildP88W07TestFixture();
  const intent = projectP88W07DispatchIntent({
    bundle: fixture.bundle,
    databaseNow: fixture.snapshot.databaseNow,
  });
  return { fixture, intent };
}

test("W07 exact happy path sends one forward write and retains verified live state", async () => {
  const { fixture, intent } = base();
  const store = new FakeStore();
  let forwardWrites = 0;
  let rollbackWrites = 0;
  const result = await executeP88W07SingleAction({
    bundle: fixture.bundle,
    store,
    publicSiteWritesEnabled: true,
    policyMutationExecutionEnabled: true,
    credentialProfileId: intent.policy.credentialProfileId,
    credentialScopes: ["write_products"],
    readProvider: async (purpose) => provider(intent, purpose),
    mutateProvider: async (phase) => {
      if (phase === "forward") forwardWrites += 1;
      else rollbackWrites += 1;
      return receipt("accepted");
    },
    verifyStorefront: async (expected) => storefront(expected),
  });

  assert.equal(result.disposition, "forward_verified_live");
  assert.equal(forwardWrites, 1);
  assert.equal(rollbackWrites, 0);
  assert.equal(result.automaticForwardRetryPerformed, false);
  assert.equal(result.task54ExecutionPerformed, false);
});

test("accepted receipt alone is not success; failed verification performs exactly one rollback", async () => {
  const { fixture, intent } = base();
  const store = new FakeStore();
  let forwardWrites = 0;
  let rollbackWrites = 0;
  let afterReads = 0;
  const result = await executeP88W07SingleAction({
    bundle: fixture.bundle,
    store,
    publicSiteWritesEnabled: true,
    policyMutationExecutionEnabled: true,
    credentialProfileId: intent.policy.credentialProfileId,
    credentialScopes: ["write_products"],
    readProvider: async (purpose) => {
      if (purpose === "after") {
        afterReads += 1;
        return provider(intent, "after", "Third state");
      }
      return provider(intent, "before");
    },
    mutateProvider: async (phase) => {
      if (phase === "forward") forwardWrites += 1;
      else rollbackWrites += 1;
      return receipt("accepted");
    },
    verifyStorefront: async (expected) => storefront(expected),
  });

  assert.equal(afterReads, 1);
  assert.equal(forwardWrites, 1);
  assert.equal(rollbackWrites, 1);
  assert.equal(result.disposition, "rollback_verified_closed");
});

test("ambiguous rollback closes to manual intervention without a rollback retry", async () => {
  const { fixture, intent } = base();
  const store = new FakeStore();
  let forwardWrites = 0;
  let rollbackWrites = 0;
  const result = await executeP88W07SingleAction({
    bundle: fixture.bundle,
    store,
    publicSiteWritesEnabled: true,
    policyMutationExecutionEnabled: true,
    credentialProfileId: intent.policy.credentialProfileId,
    credentialScopes: ["write_products"],
    readProvider: async (purpose) =>
      purpose === "after"
        ? provider(intent, "after", "Third state")
        : provider(intent, "before"),
    mutateProvider: async (phase) => {
      if (phase === "forward") {
        forwardWrites += 1;
        return receipt("accepted");
      }
      rollbackWrites += 1;
      return receipt("uncertain");
    },
    verifyStorefront: async (expected) => storefront(expected),
  });

  assert.equal(forwardWrites, 1);
  assert.equal(rollbackWrites, 1);
  assert.equal(result.disposition, "manual_intervention_required");
  assert.equal(result.automaticRollbackRetryPerformed, false);
});

test("forward transport uncertainty never retries the forward write", async () => {
  const { fixture, intent } = base();
  const store = new FakeStore();
  let forwardWrites = 0;
  const result = await executeP88W07SingleAction({
    bundle: fixture.bundle,
    store,
    publicSiteWritesEnabled: true,
    policyMutationExecutionEnabled: true,
    credentialProfileId: intent.policy.credentialProfileId,
    credentialScopes: ["write_products"],
    readProvider: async (purpose) =>
      purpose === "before"
        ? provider(intent, "before")
        : provider(intent, "after", intent.state.beforeValue),
    mutateProvider: async () => {
      forwardWrites += 1;
      return receipt("uncertain");
    },
    verifyStorefront: async (expected) => storefront(expected),
  });

  assert.equal(forwardWrites, 1);
  assert.equal(result.disposition, "manual_intervention_required");
  assert.equal(result.automaticForwardRetryPerformed, false);
});

test("replay from dispatch_started performs zero new forward writes", async () => {
  const { fixture, intent } = base();
  const store = new FakeStore("dispatch_started");
  let writes = 0;
  const result = await executeP88W07SingleAction({
    bundle: fixture.bundle,
    store,
    publicSiteWritesEnabled: true,
    policyMutationExecutionEnabled: true,
    credentialProfileId: intent.policy.credentialProfileId,
    credentialScopes: ["write_products"],
    readProvider: async () => provider(intent, "after", intent.state.beforeValue),
    mutateProvider: async () => {
      writes += 1;
      return receipt("accepted");
    },
    verifyStorefront: async (expected) => storefront(expected),
  });

  assert.equal(writes, 0);
  assert.equal(result.disposition, "manual_intervention_required");
});

test("replay from rollback_started performs zero new rollback writes", async () => {
  const { fixture, intent } = base();
  const store = new FakeStore("rollback_started");
  let writes = 0;
  const result = await executeP88W07SingleAction({
    bundle: fixture.bundle,
    store,
    publicSiteWritesEnabled: true,
    policyMutationExecutionEnabled: true,
    credentialProfileId: intent.policy.credentialProfileId,
    credentialScopes: ["write_products"],
    readProvider: async (purpose) => provider(intent, purpose),
    mutateProvider: async () => {
      writes += 1;
      return receipt("accepted");
    },
    verifyStorefront: async (expected) => storefront(expected),
  });

  assert.equal(writes, 0);
  assert.equal(result.disposition, "rollback_verified_closed");
});

test("disabled policy/public gate cancels before dispatch with zero writes", async () => {
  const { fixture, intent } = base();
  const store = new FakeStore();
  let writes = 0;
  const result = await executeP88W07SingleAction({
    bundle: fixture.bundle,
    store,
    publicSiteWritesEnabled: false,
    policyMutationExecutionEnabled: false,
    credentialProfileId: intent.policy.credentialProfileId,
    credentialScopes: ["write_products"],
    readProvider: async (purpose) => provider(intent, purpose),
    mutateProvider: async () => {
      writes += 1;
      return receipt("accepted");
    },
    verifyStorefront: async (expected) => storefront(expected),
  });

  assert.equal(writes, 0);
  assert.equal(result.disposition, "cancelled_before_dispatch");
});

test("authoritative rejection plus exact before-state proof consumes the spent attempt without rollback", async () => {
  const { fixture, intent } = base();
  const store = new FakeStore();
  let forwardWrites = 0;
  let rollbackWrites = 0;
  const result = await executeP88W07SingleAction({
    bundle: fixture.bundle,
    store,
    publicSiteWritesEnabled: true,
    policyMutationExecutionEnabled: true,
    credentialProfileId: intent.policy.credentialProfileId,
    credentialScopes: ["write_products"],
    readProvider: async (purpose) => provider(intent, purpose === "after" ? "before" : purpose),
    mutateProvider: async (phase) => {
      if (phase === "forward") forwardWrites += 1;
      else rollbackWrites += 1;
      return receipt("rejected");
    },
    verifyStorefront: async (expected) => storefront(expected),
  });

  assert.equal(forwardWrites, 1);
  assert.equal(rollbackWrites, 0);
  assert.equal(result.disposition, "forward_rejected_no_write");
});

test("kill observed after-state routes nonterminal action to one rollback", async () => {
  const { fixture, intent } = base();
  const store = new FakeStore();
  store.controlMode = "killed";
  let forwardWrites = 0;
  let rollbackWrites = 0;
  const result = await executeP88W07SingleAction({
    bundle: fixture.bundle,
    store,
    publicSiteWritesEnabled: true,
    policyMutationExecutionEnabled: true,
    credentialProfileId: intent.policy.credentialProfileId,
    credentialScopes: ["write_products"],
    readProvider: async (purpose) => provider(intent, purpose),
    mutateProvider: async (phase) => {
      if (phase === "forward") forwardWrites += 1;
      else rollbackWrites += 1;
      return receipt("accepted");
    },
    verifyStorefront: async (expected) => storefront(expected),
  });

  assert.equal(forwardWrites, 1);
  assert.equal(rollbackWrites, 1);
  assert.equal(result.disposition, "rollback_verified_closed");
});
