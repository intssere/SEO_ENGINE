import test from "node:test";
import assert from "node:assert/strict";
import { executionStateFingerprint } from "./execution-foundation.js";
import {
  planRollbackWorkflow,
  rollbackWorkflowCapability,
  rollbackWorkflowRegistry,
  type RollbackAttemptEvidence,
  type RollbackWorkflowInput,
} from "./rollback-manual-intervention-workflow.js";
import {
  verifyCertifiedMutation,
  verificationAdapterResultFingerprint,
  type VerificationAdapterResult,
} from "./verification-adapters.js";
import type {
  Task53ProviderState,
  Task53ShopifyCredential,
  Task53StorefrontVerification,
} from "./task53-production-pilot.js";

const credential: Task53ShopifyCredential = {
  shopDomain: "vcuxm7-76.myshopify.com",
  accessToken: "network-free-test-token",
  scopes: ["read_products"],
};

const resource = { kind: "product", gid: "gid://shopify/Product/123456789" };
const targetUrl = "https://diamondshelf.us/products/example";
const field = "meta_description" as const;
const beforeValue = "Before SEO description";
const afterValue = "After SEO description";
const beforeFingerprint = executionStateFingerprint(field, beforeValue);
const afterFingerprint = executionStateFingerprint(field, afterValue);
const mutationClass = "shopify_product_seo_meta_description";

function providerState(value: string | null): Task53ProviderState {
  return {
    resource: { kind: "product", gid: resource.gid },
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
  const observedFingerprint = observedValue == null
    ? executionStateFingerprint(field, null)
    : executionStateFingerprint(field, observedValue);
  return {
    ok: errorCategory === null && expectedFingerprint === observedFingerprint,
    statusCode: errorCategory?.startsWith("storefront_http_")
      ? Number(errorCategory.split("_").at(-1))
      : errorCategory === "storefront_network_error"
        ? null
        : 200,
    expectedValue,
    observedValue,
    expectedFingerprint,
    observedFingerprint,
    errorCategory,
  };
}

async function verification(
  expectedValue: string,
  mode: "verified" | "failed_provider" | "failed_storefront" | "unavailable",
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
      readProvider: async () => providerState(
        mode === "failed_provider" ? "Provider mismatch" : expectedValue,
      ),
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
        if (mode === "failed_storefront") {
          return storefrontState(expectedValue, "Storefront mismatch", "storefront_state_mismatch");
        }
        return storefrontState(expectedValue);
      },
    },
  );
}

function attempt(
  outcome: "accepted" | "rejected" | "uncertain" = "accepted",
  overrides: Partial<RollbackAttemptEvidence> = {},
): RollbackAttemptEvidence {
  return {
    attemptId: "rollback-attempt-1",
    mutationClass,
    resource,
    targetUrl,
    field,
    restoreValue: beforeValue,
    restoreFingerprint: beforeFingerprint,
    outcome,
    deploymentId: "deployment-1",
    rollbackId: "rollback-1",
    ...overrides,
  };
}

async function baseInput(
  mode: "verified" | "failed_provider" | "failed_storefront" | "unavailable",
  publicWriteOccurrence: "none" | "confirmed" | "possible",
): Promise<RollbackWorkflowInput> {
  return {
    mutationClass,
    resource,
    targetUrl,
    field,
    before: { value: beforeValue, fingerprint: beforeFingerprint },
    after: { value: afterValue, fingerprint: afterFingerprint },
    forwardVerification: await verification(afterValue, mode),
    publicWriteOccurrence,
    rollbackAttempts: [],
    rollbackVerification: null,
    rollbackVerificationExhausted: false,
    lineage: {
      executionId: "execution-1",
      deploymentId: "deployment-1",
      rollbackId: "rollback-1",
      authorizationFingerprint: "authorization-fingerprint",
    },
  };
}

test("registry remains closed to the four P8.4 mutation classes and exposes no side effects", () => {
  assert.equal(rollbackWorkflowRegistry.length, 4);
  assert.deepEqual(
    rollbackWorkflowRegistry.map((entry) => entry.mutationClass),
    [
      "shopify_product_seo_title",
      "shopify_product_seo_meta_description",
      "shopify_collection_seo_title",
      "shopify_collection_seo_meta_description",
    ],
  );
  const capability = rollbackWorkflowCapability();
  assert.equal(capability.providerWritePerformed, false);
  assert.equal(capability.rollbackWritePerformed, false);
  assert.equal(capability.databaseMutationPerformed, false);
  assert.equal(capability.automaticTransition, false);
  assert.equal(capability.liveExecutionAuthorized, false);
  assert.equal(capability.persistenceEnabled, false);
  assert.equal(capability.networkAccessEnabled, false);
});

test("independently verified forward state requires no rollback", async () => {
  const result = planRollbackWorkflow(await baseInput("verified", "confirmed"));
  assert.equal(result.disposition, "no_rollback_needed");
  assert.deepEqual(result.reasonCodes, ["forward_state_verified"]);
  assert.equal(result.manualIntervention, null);
});

test("authoritative forward failure before any public write requires no rollback", async () => {
  const result = planRollbackWorkflow(await baseInput("failed_provider", "none"));
  assert.equal(result.disposition, "no_rollback_needed");
  assert.deepEqual(result.reasonCodes, ["forward_failed_before_public_write"]);
});

test("authoritative failure after confirmed write with valid restore snapshot is rollback-ready", async () => {
  const result = planRollbackWorkflow(await baseInput("failed_provider", "confirmed"));
  assert.equal(result.disposition, "rollback_ready");
  assert.deepEqual(result.reasonCodes, [
    "authoritative_forward_failure_after_confirmed_write",
    "restore_state_integrity_verified",
  ]);
  assert.equal(result.rollbackAttemptCount, 0);
  assert.equal(result.providerWritePerformed, false);
  assert.equal(result.rollbackWritePerformed, false);
});

test("forward verification unavailable after confirmed or possible write requires manual intervention", async () => {
  const confirmed = planRollbackWorkflow(await baseInput("unavailable", "confirmed"));
  assert.equal(confirmed.disposition, "manual_intervention_required");
  assert.ok(confirmed.reasonCodes.includes("forward_verification_unavailable_after_confirmed_write"));
  assert.ok(confirmed.manualIntervention?.requiredEvidence.includes("authoritative_forward_state"));

  const possible = planRollbackWorkflow(await baseInput("unavailable", "possible"));
  assert.equal(possible.disposition, "manual_intervention_required");
  assert.ok(possible.reasonCodes.includes("public_write_outcome_uncertain"));
  assert.equal(possible.manualIntervention?.providerWriteMayHaveOccurred, true);
});

test("verification unavailable with definitive no-write state needs no rollback", async () => {
  const result = planRollbackWorkflow(await baseInput("unavailable", "none"));
  assert.equal(result.disposition, "no_rollback_needed");
  assert.deepEqual(result.reasonCodes, ["forward_verification_unavailable_no_public_write"]);
});

test("possible write outcome fails closed even when forward verification is authoritatively failed", async () => {
  const result = planRollbackWorkflow(await baseInput("failed_provider", "possible"));
  assert.equal(result.disposition, "manual_intervention_required");
  assert.deepEqual(result.reasonCodes, ["public_write_outcome_uncertain"]);
  assert.ok(result.manualIntervention?.requiredEvidence.includes("provider_write_outcome"));
});

test("missing or corrupt captured pre-change state fails closed into manual intervention", async () => {
  const input = await baseInput("failed_provider", "confirmed");
  input.before.fingerprint = executionStateFingerprint(field, "not-the-before-state");
  const result = planRollbackWorkflow(input);
  assert.equal(result.disposition, "manual_intervention_required");
  assert.ok(result.reasonCodes.includes("before_state_fingerprint_invalid"));
  assert.ok(result.manualIntervention?.requiredEvidence.includes("captured_pre_change_state"));
});

test("forward P8.4 result fingerprint corruption fails closed", async () => {
  const input = await baseInput("failed_provider", "confirmed");
  input.forwardVerification = {
    ...input.forwardVerification,
    resultFingerprint: "0".repeat(64),
  };
  const result = planRollbackWorkflow(input);
  assert.equal(result.disposition, "manual_intervention_required");
  assert.ok(result.reasonCodes.includes("forward_verification_result_fingerprint_mismatch"));
});

test("unsupported mutation class and workflow identity mismatch fail closed", async () => {
  const input = await baseInput("failed_provider", "confirmed");
  input.mutationClass = "shopify_product_handle";
  const result = planRollbackWorkflow(input);
  assert.equal(result.disposition, "manual_intervention_required");
  assert.ok(result.reasonCodes.includes("unsupported_mutation_class"));
  assert.ok(result.reasonCodes.includes("forward_mutation_class_mismatch"));
});

test("rollback resource/field/target/lineage mismatch requires manual intervention", async () => {
  const input = await baseInput("failed_provider", "confirmed");
  input.rollbackAttempts = [attempt("accepted", {
    resource: { kind: "product", gid: "gid://shopify/Product/999999999" },
    targetUrl: "https://diamondshelf.us/products/different",
    field: "title",
    deploymentId: "deployment-other",
  })];
  const result = planRollbackWorkflow(input);
  assert.equal(result.disposition, "manual_intervention_required");
  assert.ok(result.reasonCodes.includes("rollback_resource_identity_mismatch"));
  assert.ok(result.reasonCodes.includes("rollback_target_url_mismatch"));
  assert.ok(result.reasonCodes.includes("rollback_field_mismatch"));
  assert.ok(result.reasonCodes.includes("rollback_deployment_lineage_mismatch"));
});

test("one accepted rollback with no authoritative restore verification remains pending", async () => {
  const input = await baseInput("failed_provider", "confirmed");
  input.rollbackAttempts = [attempt()];
  const result = planRollbackWorkflow(input);
  assert.equal(result.disposition, "rollback_verification_pending");
  assert.deepEqual(result.reasonCodes, ["rollback_mutation_accepted_verification_pending"]);
  assert.equal(result.rollbackAttemptCount, 1);
  assert.match(result.rollbackAttemptFingerprint ?? "", /^[0-9a-f]{64}$/);
});

test("accepted rollback with temporarily unavailable restore verification remains pending until bounded evidence is exhausted", async () => {
  const input = await baseInput("failed_provider", "confirmed");
  input.rollbackAttempts = [attempt()];
  input.rollbackVerification = await verification(beforeValue, "unavailable");

  const pending = planRollbackWorkflow(input);
  assert.equal(pending.disposition, "rollback_verification_pending");
  assert.deepEqual(pending.reasonCodes, ["rollback_verification_temporarily_unavailable"]);

  input.rollbackVerificationExhausted = true;
  const exhausted = planRollbackWorkflow(input);
  assert.equal(exhausted.disposition, "manual_intervention_required");
  assert.deepEqual(exhausted.reasonCodes, ["rollback_verification_unavailable_after_bounded_evidence_exhausted"]);
  assert.ok(exhausted.manualIntervention?.requiredEvidence.includes("authoritative_rollback_state"));
});

test("accepted rollback closes only after provider and storefront independently verify exact pre-change state", async () => {
  const input = await baseInput("failed_provider", "confirmed");
  input.rollbackAttempts = [attempt()];
  input.rollbackVerification = await verification(beforeValue, "verified");
  const result = planRollbackWorkflow(input);
  assert.equal(result.disposition, "rollback_verified_closed");
  assert.deepEqual(result.reasonCodes, ["rollback_restore_verified_by_provider_and_storefront"]);
  assert.equal(result.manualIntervention, null);
});

test("rollback provider/storefront disagreement requires manual intervention", async () => {
  const input = await baseInput("failed_provider", "confirmed");
  input.rollbackAttempts = [attempt()];
  input.rollbackVerification = await verification(beforeValue, "failed_storefront");
  const result = planRollbackWorkflow(input);
  assert.equal(result.disposition, "manual_intervention_required");
  assert.ok(
    result.reasonCodes.includes("rollback_provider_storefront_disagreement") ||
    result.reasonCodes.includes("rollback_verification_failed"),
  );
});

for (const outcome of ["rejected", "uncertain"] as const) {
  test(`rollback mutation ${outcome} requires manual intervention`, async () => {
    const input = await baseInput("failed_provider", "confirmed");
    input.rollbackAttempts = [attempt(outcome)];
    const result = planRollbackWorkflow(input);
    assert.equal(result.disposition, "manual_intervention_required");
    assert.ok(
      result.reasonCodes.includes(
        outcome === "rejected"
          ? "rollback_mutation_rejected"
          : "rollback_mutation_outcome_uncertain",
      ),
    );
  });
}

test("duplicate rollback attempts fail closed even when both are identical", async () => {
  const input = await baseInput("failed_provider", "confirmed");
  input.rollbackAttempts = [attempt(), attempt()];
  const result = planRollbackWorkflow(input);
  assert.equal(result.disposition, "manual_intervention_required");
  assert.ok(result.reasonCodes.includes("multiple_rollback_attempts_detected"));
  assert.equal(result.rollbackAttemptCount, 2);
  assert.ok(result.manualIntervention?.requiredEvidence.includes("single_rollback_attempt_lineage"));
});

test("rollback verification without any rollback attempt fails closed", async () => {
  const input = await baseInput("failed_provider", "confirmed");
  input.rollbackVerification = await verification(beforeValue, "verified");
  const result = planRollbackWorkflow(input);
  assert.equal(result.disposition, "manual_intervention_required");
  assert.ok(result.reasonCodes.includes("rollback_verification_without_attempt"));
});

test("workflow replay is deterministic and no-side-effect markers are always false", async () => {
  const input = await baseInput("failed_provider", "confirmed");
  input.rollbackAttempts = [attempt()];
  input.rollbackVerification = await verification(beforeValue, "failed_storefront");
  const first = planRollbackWorkflow(input);
  const second = planRollbackWorkflow(input);

  assert.deepEqual(first.reasonCodes, [...first.reasonCodes].sort());
  assert.deepEqual(first, second);
  assert.equal(first.resultFingerprint, second.resultFingerprint);
  assert.equal(first.providerWritePerformed, false);
  assert.equal(first.rollbackWritePerformed, false);
  assert.equal(first.databaseMutationPerformed, false);
  assert.equal(first.automaticTransition, false);
  assert.equal(first.liveExecutionAuthorized, false);

  assert.equal(first.manualIntervention?.providerWritePerformed, false);
  assert.equal(first.manualIntervention?.rollbackWritePerformed, false);
  assert.equal(first.manualIntervention?.databaseMutationPerformed, false);
  assert.equal(first.manualIntervention?.automaticTransition, false);
  assert.equal(first.manualIntervention?.liveExecutionAuthorized, false);
  assert.match(first.manualIntervention?.artifactFingerprint ?? "", /^[0-9a-f]{64}$/);
});

test("P8.4 integrity fingerprint helper detects replay tampering deterministically", async () => {
  const result = await verification(afterValue, "verified");
  const { resultFingerprint: _ignored, ...withoutFingerprint } = result;
  assert.equal(verificationAdapterResultFingerprint(withoutFingerprint), result.resultFingerprint);

  const tampered = {
    ...result,
    provider: { ...result.provider, observedValue: "tampered" },
  };
  const input = await baseInput("verified", "confirmed");
  input.forwardVerification = tampered;
  const workflow = planRollbackWorkflow(input);
  assert.equal(workflow.disposition, "manual_intervention_required");
  assert.ok(workflow.reasonCodes.includes("forward_verification_result_fingerprint_mismatch"));
});
