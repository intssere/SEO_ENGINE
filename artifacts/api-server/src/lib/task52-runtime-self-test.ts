import { executionStateFingerprint, type AuthorizationEnvelope } from "./execution-foundation.js";
import { runShopifyWriteDryRun } from "./shopify-write-foundation.js";

const actionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const planId = "11111111-1111-4111-8111-111111111111";
const beforeValue = "Task 52 previous description";
const afterValue = "Task 52 proposed description";
const envelopeFingerprint = "task52-runtime-self-test-authorization";

function selfTestEnvelope(): AuthorizationEnvelope {
  return {
    version: "controlled_execution_foundation_v1",
    planId,
    target: {
      pageId: "22222222-2222-4222-8222-222222222222",
      url: "https://diamondshelf.us/products/task52-self-test",
      field: "meta_description",
    },
    actionType: "update_meta_description",
    expectedCurrentState: {
      value: beforeValue,
      fingerprint: executionStateFingerprint("meta_description", beforeValue),
    },
    proposedState: {
      value: afterValue,
      fingerprint: executionStateFingerprint("meta_description", afterValue),
    },
    evidence: {
      ids: ["33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444"],
      proposalFingerprint: "task52-runtime-self-test-proposal",
    },
    risk: { classification: "low", boundedPilot: true },
    rollback: {
      value: beforeValue,
      fingerprint: executionStateFingerprint("meta_description", beforeValue),
    },
    authorization: {
      issuedAt: "2026-09-12T00:00:00.000Z",
      expiresAt: "2026-09-12T00:15:00.000Z",
      executionAuthorized: true,
      providerWriteAllowed: false,
      publicSiteWrites: false,
      automaticTransition: false,
    },
    verification: {
      status: "pending",
      mode: "independent_read_after_write",
      expectedField: "meta_description",
      expectedValue: afterValue,
      expectedFingerprint: executionStateFingerprint("meta_description", afterValue),
      failureDisposition: "rollback_eligible",
    },
    envelopeFingerprint,
  };
}

export function runTask52RuntimeSelfTest() {
  const envelope = selfTestEnvelope();
  const common = {
    actionId,
    envelope,
    providerResource: { kind: "product" as const, gid: "gid://shopify/Product/123456789" },
    executionConfirmation: `EXECUTE:${actionId}:${envelopeFingerprint}`,
    now: "2026-09-12T00:05:00.000Z",
  };

  const forward = runShopifyWriteDryRun(common);
  const rollback = runShopifyWriteDryRun({
    ...common,
    observedAfterWrite: "Task 52 deliberately mismatched provider observation",
  });

  const passed =
    forward.providerDispatchAttempted === false
    && forward.publicWriteOccurred === false
    && forward.mutationRequest.version === "shopify_write_connector_v1"
    && forward.verification.status === "passed"
    && forward.finalState === "verified"
    && rollback.providerDispatchAttempted === false
    && rollback.publicWriteOccurred === false
    && rollback.verification.status === "failed"
    && rollback.rollbackRequest?.version === "shopify_write_connector_v1"
    && rollback.rollbackVerification?.status === "passed"
    && rollback.finalState === "rollback_verified";

  return {
    version: "shopify_write_verification_rollback_dry_run_v1" as const,
    status: passed ? "passed" as const : "failed" as const,
    network_requests: 0 as const,
    provider_dispatch_attempted: false as const,
    public_write_occurred: false as const,
    database_mutations: 0 as const,
    forward: {
      connector_version: forward.mutationRequest.version,
      verification_status: forward.verification.status,
      final_state: forward.finalState,
    },
    rollback: {
      connector_version: rollback.rollbackRequest?.version ?? null,
      verification_status: rollback.verification.status,
      rollback_verification_status: rollback.rollbackVerification?.status ?? null,
      final_state: rollback.finalState,
    },
  };
}
