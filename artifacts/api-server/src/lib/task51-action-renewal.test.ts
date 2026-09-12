import { describe, expect, it } from "vitest";
import { executionStateFingerprint, type AuthorizationEnvelope } from "./execution-foundation.js";
import {
  buildExecutableActionRenewalConfirmation,
  evaluateExecutableActionAuthorizationRenewal,
} from "./task51-action-renewal.js";

const actionId = "d89cef34-2251-468e-b1c6-96b8c86050b6";
const planId = "2c39cae9-83ea-4d29-8150-915f78128ebc";
const beforeFingerprint = executionStateFingerprint("meta_description", null);
const afterValue = "The Home Fragrance collection combines Candles, Diffusers, and Other Home Fragrance, placing these related product types together for easier comparison.";
const afterFingerprint = executionStateFingerprint("meta_description", afterValue);

function envelope(): AuthorizationEnvelope {
  return {
    version: "controlled_execution_foundation_v1",
    planId,
    target: {
      pageId: "7282df97-7f7a-4e1d-8887-08b7101054be",
      url: "https://diamondshelf.us/collections/home-fragrance",
      field: "meta_description",
    },
    actionType: "update_meta_description",
    expectedCurrentState: { value: null, fingerprint: beforeFingerprint },
    proposedState: { value: afterValue, fingerprint: afterFingerprint },
    evidence: {
      ids: [
        "16537dc4-ef4e-42d3-af16-3da5a9177695",
        "517acec1-5438-4b9d-930a-6cd222132f2f",
      ],
      proposalFingerprint: "d9a980068863c45c08ac33430e75fa836127ef063f57513abbe5fa9da25b3e84",
    },
    risk: { classification: "medium", boundedPilot: true },
    rollback: { value: null, fingerprint: beforeFingerprint },
    authorization: {
      issuedAt: "2026-09-12T11:51:13.277Z",
      expiresAt: "2026-09-12T12:02:37.660Z",
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
      expectedFingerprint: afterFingerprint,
      failureDisposition: "rollback_eligible",
    },
    envelopeFingerprint: "old-envelope-fingerprint",
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    actionId,
    actionPlanId: planId,
    actionStatus: "pending",
    lifecycle: "executable_action",
    executionAuthorized: true,
    planPublicSiteWrites: false,
    automaticTransition: false,
    foundationActionId: actionId,
    publicWriteOccurred: false,
    latestApprovalDecision: "approved",
    qualityEligible: true,
    riskClassification: "medium",
    evidenceIds: envelope().evidence.ids,
    persistedEvidenceCount: 2,
    priorActionCount: 1,
    priorDeploymentCount: 0,
    otherActiveExecutionCount: 0,
    currentEnvelope: envelope(),
    providerCurrentValue: null,
    publicWriteGateEnabled: true,
    now: "2026-09-12T13:15:00.000Z",
    ...overrides,
  };
}

describe("executable-action authorization renewal", () => {
  it("requires an exact fingerprint-bound confirmation", () => {
    expect(buildExecutableActionRenewalConfirmation(actionId, "abc")).toBe(
      `RENEW_EXECUTABLE_ACTION_AUTHORIZATION:${actionId}:abc`,
    );
  });

  it("renews only the expired internal envelope while keeping provider/public write flags false", () => {
    const result = evaluateExecutableActionAuthorizationRenewal(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.previousExpiresAt).toBe("2026-09-12T12:02:37.660Z");
    expect(result.envelope.authorization.issuedAt).toBe("2026-09-12T13:15:00.000Z");
    expect(result.envelope.authorization.expiresAt).toBe("2026-09-12T13:30:00.000Z");
    expect(result.envelope.authorization.executionAuthorized).toBe(true);
    expect(result.envelope.authorization.providerWriteAllowed).toBe(false);
    expect(result.envelope.authorization.publicSiteWrites).toBe(false);
    expect(result.envelope.authorization.automaticTransition).toBe(false);
    expect(result.envelope.envelopeFingerprint).not.toBe("old-envelope-fingerprint");
  });

  it("fails closed while the existing envelope is still active", () => {
    const result = evaluateExecutableActionAuthorizationRenewal(input({ now: "2026-09-12T12:00:00.000Z" }));
    expect(result).toEqual({ ok: false, reason: "action_authorization_still_active" });
  });

  it("fails closed if Shopify no longer matches the approved before state", () => {
    const result = evaluateExecutableActionAuthorizationRenewal(input({ providerCurrentValue: "changed" }));
    expect(result).toEqual({ ok: false, reason: "provider_state_changed_since_authorization" });
  });

  it("requires the global production write gate for this Task #53 readiness renewal", () => {
    const result = evaluateExecutableActionAuthorizationRenewal(input({ publicWriteGateEnabled: false }));
    expect(result).toEqual({ ok: false, reason: "public_site_write_gate_not_enabled" });
  });

  it("blocks renewal after any provider deployment reservation", () => {
    const result = evaluateExecutableActionAuthorizationRenewal(input({ priorDeploymentCount: 1 }));
    expect(result).toEqual({ ok: false, reason: "duplicate_provider_execution_blocked" });
  });

  it("blocks renewal if a public write was already recorded", () => {
    const result = evaluateExecutableActionAuthorizationRenewal(input({ publicWriteOccurred: true }));
    expect(result).toEqual({ ok: false, reason: "execution_safety_invariant_failed" });
  });
});
