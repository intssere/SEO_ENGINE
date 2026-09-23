import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  P8_8_INITIAL_POLICY_CLASS,
  P8_8_W01_POLICY_VERSION,
  assertP88PolicyGrantIntegrity,
  buildP88PolicyGrant,
  evaluateP88PolicyAdmission,
  p88PolicyGrantIntegrityIssues,
  p88W01PolicyCapability,
  type P88PolicyCandidate,
  type P88PolicyGrant,
  type P88PolicyGrantInput,
} from "./p8-8-policy-grant-evaluation.js";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
const D = "d".repeat(64);

function grantInput(
  overrides: Partial<P88PolicyGrantInput> = {},
): P88PolicyGrantInput {
  return {
    policyId: "policy.initial-product-meta",
    policyVersion: "v1",
    siteId: "eb1da9ee-539c-4200-8f04-f64ccaea7768",
    allowedDomain: "diamondshelf.us",
    provider: "shopify",
    credentialProfileId: "shopify-task53-write-products",
    requiredProviderScope: "write_products",
    allowedResourceKind: "product",
    allowedActionType: "update_meta_description",
    allowedField: "meta_description",
    allowedProposalGenerationMethod: "p9.7_deterministic_preview",
    maximumEffectiveRisk: "low",
    minimumEvidenceRefs: 2,
    minimumQualityScore: 90,
    concurrencyLimit: 1,
    mutationQuota: {
      maxActions: 1,
      windowHours: 24,
    },
    sameTargetCooldownHours: 336,
    activationTime: "2026-09-23T00:00:00.000Z",
    expiryTime: "2026-10-23T00:00:00.000Z",
    revoked: false,
    revokedAt: null,
    activationActorId: "admin@example.com",
    policyStage: "single_action_canary",
    controlBindingId: "p96-diamondshelf-mutation-control",
    ...overrides,
  };
}

function candidate(
  overrides: Partial<P88PolicyCandidate> = {},
): P88PolicyCandidate {
  const base: P88PolicyCandidate = {
    recommendation: {
      recommendationClass: "proposal_review",
      recommendationFingerprint: A,
      recommendationIdempotencyKey: "rgk-initial-product-meta",
      lineageMaterialized: true,
      changedPreviewPresent: true,
      deterministic: true,
      aiAssisted: false,
      humanEditedAfterCertification: false,
      lifecycleEligible: true,
      proposalGenerationMethod: "p9.7_deterministic_preview",
    },
    proposal: {
      proposalFingerprint: B,
      boundedPilot: true,
      wholeSiteCoverage: false,
    },
    evidence: {
      ids: ["evidence-b", "evidence-a"],
      missingEvidence: [],
    },
    quality: {
      status: "pass",
      approvalEligible: true,
      score: 100,
      blockingReasons: [],
      warnings: [],
    },
    risk: {
      classification: "low",
    },
    target: {
      provider: "shopify",
      domain: "diamondshelf.us",
      resourceKind: "product",
      resourceGid: "gid://shopify/Product/123456789",
      targetUrl: "https://diamondshelf.us/products/example-product",
      actionType: "update_meta_description",
      field: "meta_description",
      requiredProviderScope: "write_products",
      beforeFingerprint: C,
      afterFingerprint: D,
    },
    currentState: {
      providerObservedBeforeFingerprint: C,
      priorDeploymentCount: 0,
      otherActiveSiteMutationCount: 0,
      sameTargetCooldownSatisfied: true,
      mutationQuotaRemaining: 1,
      unresolvedManualIntervention: false,
      unresolvedUncertainProviderWrite: false,
      unresolvedRollbackFailure: false,
      mutationControlMode: "running",
      mutationControlFingerprint: A,
    },
  };

  return {
    ...base,
    ...overrides,
    recommendation: {
      ...base.recommendation,
      ...(overrides.recommendation ?? {}),
    },
    proposal: {
      ...base.proposal,
      ...(overrides.proposal ?? {}),
    },
    evidence: {
      ...base.evidence,
      ...(overrides.evidence ?? {}),
    },
    quality: {
      ...base.quality,
      ...(overrides.quality ?? {}),
    },
    risk: {
      ...base.risk,
      ...(overrides.risk ?? {}),
    },
    target: {
      ...base.target,
      ...(overrides.target ?? {}),
    },
    currentState: {
      ...base.currentState,
      ...(overrides.currentState ?? {}),
    },
  };
}

function evaluate(
  grant = buildP88PolicyGrant(grantInput()),
  suppliedCandidate = candidate(),
  overrides: Partial<{
    referenceTime: string;
    evaluationExpiresAt: string;
  }> = {},
) {
  return evaluateP88PolicyAdmission({
    grant,
    referenceTime:
      overrides.referenceTime ?? "2026-09-23T06:00:00.000Z",
    evaluationExpiresAt:
      overrides.evaluationExpiresAt ?? "2026-09-23T06:15:00.000Z",
    candidate: suppliedCandidate,
  });
}

test("W01 grant is deterministic, immutable, narrowly scoped, and non-authorizing", () => {
  const left = buildP88PolicyGrant(grantInput());
  const right = buildP88PolicyGrant(grantInput());

  assert.equal(left.version, P8_8_W01_POLICY_VERSION);
  assert.equal(left.policyClass, P8_8_INITIAL_POLICY_CLASS);
  assert.equal(left.policyFingerprint, right.policyFingerprint);
  assert.equal(left.allowedDomain, "diamondshelf.us");
  assert.equal(left.provider, "shopify");
  assert.equal(left.allowedResourceKind, "product");
  assert.equal(left.allowedActionType, "update_meta_description");
  assert.equal(left.allowedField, "meta_description");
  assert.equal(left.requiredProviderScope, "write_products");
  assert.equal(left.minimumQualityScore, 90);
  assert.equal(left.concurrencyLimit, 1);
  assert.deepEqual(left.mutationQuota, { maxActions: 1, windowHours: 24 });
  assert.equal(left.sameTargetCooldownHours, 336);

  assert.equal(Object.isFrozen(left), true);
  assert.equal(Object.isFrozen(left.mutationQuota), true);
  assert.equal(Object.isFrozen(left.safety), true);

  assert.deepEqual(left.safety, p88W01PolicyCapability());
  assert.equal(left.safety.databaseReadPerformed, false);
  assert.equal(left.safety.databaseWritePerformed, false);
  assert.equal(left.safety.providerNetworkReadPerformed, false);
  assert.equal(left.safety.providerWritePerformed, false);
  assert.equal(left.safety.executionAuthorizationCreated, false);
  assert.equal(left.safety.policyActivationPerformed, false);
  assert.equal(left.safety.workerActivated, false);
  assert.equal(left.safety.autonomousExecutionAuthorized, false);
  assert.equal(left.safety.publicWriteGateEnabledByGrant, false);

  assert.doesNotThrow(() => assertP88PolicyGrantIntegrity(left));
  assert.deepEqual(p88PolicyGrantIntegrityIssues(left), []);
});

test("material grant changes produce a new deterministic fingerprint", () => {
  const first = buildP88PolicyGrant(grantInput());
  const second = buildP88PolicyGrant(
    grantInput({ policyVersion: "v2" }),
  );
  const third = buildP88PolicyGrant(
    grantInput({ minimumQualityScore: 95 }),
  );

  assert.notEqual(first.policyFingerprint, second.policyFingerprint);
  assert.notEqual(first.policyFingerprint, third.policyFingerprint);
  assert.notEqual(second.policyFingerprint, third.policyFingerprint);
});

test("initial grant rejects broader mutation scope and weaker safeguards", () => {
  assert.throws(
    () => buildP88PolicyGrant(grantInput({ allowedResourceKind: "collection" })),
    /p88_w01_unsupported_policy_resource_kind/,
  );
  assert.throws(
    () => buildP88PolicyGrant(grantInput({ allowedActionType: "update_title" })),
    /p88_w01_unsupported_policy_action_type/,
  );
  assert.throws(
    () => buildP88PolicyGrant(grantInput({ allowedField: "title" })),
    /p88_w01_unsupported_policy_field/,
  );
  assert.throws(
    () =>
      buildP88PolicyGrant(
        grantInput({ requiredProviderScope: "write_files" }),
      ),
    /p88_w01_unsupported_policy_provider_scope/,
  );
  assert.throws(
    () => buildP88PolicyGrant(grantInput({ minimumQualityScore: 89 })),
    /p88_w01_quality_threshold_below_initial_minimum/,
  );
  assert.throws(
    () => buildP88PolicyGrant(grantInput({ concurrencyLimit: 2 })),
    /p88_w01_invalid_concurrency_limit/,
  );
  assert.throws(
    () =>
      buildP88PolicyGrant(
        grantInput({ mutationQuota: { maxActions: 2, windowHours: 24 } }),
      ),
    /p88_w01_invalid_mutation_quota_max_actions/,
  );
  assert.throws(
    () => buildP88PolicyGrant(grantInput({ sameTargetCooldownHours: 335 })),
    /p88_w01_invalid_same_target_cooldown_hours/,
  );
});

test("grant integrity fails closed on fingerprint or safety tampering", () => {
  const grant = buildP88PolicyGrant(grantInput());
  const fingerprintTampered = {
    ...grant,
    policyFingerprint: B,
  } as P88PolicyGrant;

  assert.deepEqual(
    p88PolicyGrantIntegrityIssues(fingerprintTampered),
    ["p88_w01_policy_fingerprint_mismatch"],
  );
  assert.throws(
    () => assertP88PolicyGrantIntegrity(fingerprintTampered),
    /p88_w01_policy_grant_integrity_failure/,
  );

  const safetyTampered = {
    ...grant,
    safety: {
      ...grant.safety,
      providerWritePerformed: true,
    },
  } as unknown as P88PolicyGrant;
  assert.deepEqual(
    p88PolicyGrantIntegrityIssues(safetyTampered),
    ["p88_w01_policy_safety_marker_mismatch"],
  );
});

test("fully eligible caller-supplied candidate is admitted only at the policy layer", () => {
  const result = evaluate();

  assert.equal(result.decision, "admit");
  assert.deepEqual(result.rejectionReasons, []);
  assert.equal(result.policy.policyStage, "single_action_canary");
  assert.deepEqual(result.evidence.ids, ["evidence-a", "evidence-b"]);
  assert.equal(result.risk.classification, "low");
  assert.equal(result.target.resourceKind, "product");
  assert.equal(result.target.field, "meta_description");
  assert.equal(result.currentState.mutationControlMode, "running");
  assert.match(result.evaluationFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(
    result.evaluationId,
    "p88w01-eval-" + result.evaluationFingerprint.slice(0, 24),
  );

  assert.equal(result.semantics.decisionMeansPolicyAdmissionOnly, true);
  assert.equal(result.semantics.admissionIsNotExecutionAuthorization, true);
  assert.equal(result.safety.executionAuthorizationCreated, false);
  assert.equal(result.safety.providerWritePerformed, false);
  assert.equal(result.safety.liveExecutionAuthorized, false);
  assert.equal(result.safety.autonomousExecutionAuthorized, false);
});

test("evidence input ordering cannot change an otherwise identical evaluation", () => {
  const first = evaluate(
    buildP88PolicyGrant(grantInput()),
    candidate({ evidence: { ids: ["evidence-b", "evidence-a"], missingEvidence: [] } }),
  );
  const second = evaluate(
    buildP88PolicyGrant(grantInput()),
    candidate({ evidence: { ids: ["evidence-a", "evidence-b"], missingEvidence: [] } }),
  );

  assert.equal(first.evaluationFingerprint, second.evaluationFingerprint);
  assert.equal(first.evidence.evidenceSetFingerprint, second.evidence.evidenceSetFingerprint);
  assert.deepEqual(first.evidence.ids, second.evidence.ids);
});

test("activation, expiry, revocation, and evaluation TTL fail closed", () => {
  assert.deepEqual(
    evaluate(
      buildP88PolicyGrant(grantInput()),
      candidate(),
      { referenceTime: "2026-09-22T23:59:59.000Z" },
    ).rejectionReasons,
    ["policy_not_active_yet"],
  );

  assert.deepEqual(
    evaluate(
      buildP88PolicyGrant(grantInput()),
      candidate(),
      {
        referenceTime: "2026-10-23T00:00:00.000Z",
        evaluationExpiresAt: "2026-10-23T00:15:00.000Z",
      },
    ).rejectionReasons,
    ["evaluation_expiry_invalid", "policy_expired"],
  );

  const revokedGrant = buildP88PolicyGrant(
    grantInput({
      revoked: true,
      revokedAt: "2026-09-23T05:00:00.000Z",
    }),
  );
  assert.deepEqual(evaluate(revokedGrant).rejectionReasons, ["policy_revoked"]);

  assert.deepEqual(
    evaluate(
      buildP88PolicyGrant(grantInput()),
      candidate(),
      { evaluationExpiresAt: "2026-11-01T00:00:00.000Z" },
    ).rejectionReasons,
    ["evaluation_expiry_invalid"],
  );
});

test("pause/drain/kill and unresolved safety closure conditions block admission", () => {
  const result = evaluate(
    buildP88PolicyGrant(grantInput()),
    candidate({
      currentState: {
        ...candidate().currentState,
        mutationControlMode: "killed",
        unresolvedManualIntervention: true,
        unresolvedUncertainProviderWrite: true,
        unresolvedRollbackFailure: true,
      },
    }),
  );

  assert.deepEqual(result.rejectionReasons, [
    "control_not_running",
    "manual_intervention_unresolved",
    "provider_write_uncertain",
    "rollback_failure_unresolved",
  ]);
});

test("recommendation and proposal constraints fail closed", () => {
  const result = evaluate(
    buildP88PolicyGrant(grantInput()),
    candidate({
      recommendation: {
        ...candidate().recommendation,
        recommendationClass: "advisory_review",
        lineageMaterialized: false,
        changedPreviewPresent: false,
        deterministic: false,
        aiAssisted: true,
        humanEditedAfterCertification: true,
        lifecycleEligible: false,
        proposalGenerationMethod: "freeform_ai",
      },
      proposal: {
        proposalFingerprint: B,
        boundedPilot: false,
        wholeSiteCoverage: true,
      },
    }),
  );

  assert.deepEqual(result.rejectionReasons, [
    "ai_assisted_candidate_blocked",
    "bounded_pilot_required",
    "changed_preview_missing",
    "proposal_edited_after_certification",
    "proposal_generation_method_not_allowed",
    "proposal_lifecycle_ineligible",
    "proposal_not_deterministic",
    "recommendation_class_not_proposal_review",
    "recommendation_lineage_not_materialized",
    "whole_site_coverage_forbidden",
  ]);
});

test("evidence, quality, and risk constraints fail closed", () => {
  const result = evaluate(
    buildP88PolicyGrant(grantInput()),
    candidate({
      evidence: {
        ids: ["only-one"],
        missingEvidence: ["provider_snapshot_missing"],
      },
      quality: {
        status: "blocked",
        approvalEligible: false,
        score: 89,
        blockingReasons: ["quality_blocker"],
        warnings: ["quality_warning"],
      },
      risk: {
        classification: "medium",
      },
    }),
  );

  assert.deepEqual(result.rejectionReasons, [
    "evidence_insufficient",
    "missing_evidence_present",
    "quality_blockers_present",
    "quality_not_approval_eligible",
    "quality_score_below_threshold",
    "quality_status_not_pass",
    "quality_warnings_present",
    "risk_not_low",
  ]);
});

test("unsupported Shopify target scope is rejected rather than broadened", () => {
  const result = evaluate(
    buildP88PolicyGrant(grantInput()),
    candidate({
      target: {
        ...candidate().target,
        provider: "other",
        domain: "example.com",
        resourceKind: "collection",
        resourceGid: "gid://shopify/Collection/123456789",
        targetUrl: "https://diamondshelf.us/collections/home-fragrance",
        actionType: "update_title",
        field: "title",
        requiredProviderScope: "write_files",
      },
    }),
  );

  assert.deepEqual(result.rejectionReasons, [
    "action_type_not_allowed",
    "domain_not_allowed",
    "field_not_allowed",
    "provider_not_allowed",
    "provider_scope_not_allowed",
    "resource_gid_invalid",
    "resource_kind_not_allowed",
    "target_url_not_allowed",
  ]);
});

test("stale state, prior deployment, concurrency, cooldown, and quota fail closed", () => {
  const result = evaluate(
    buildP88PolicyGrant(grantInput()),
    candidate({
      currentState: {
        ...candidate().currentState,
        providerObservedBeforeFingerprint: D,
        priorDeploymentCount: 1,
        otherActiveSiteMutationCount: 1,
        sameTargetCooldownSatisfied: false,
        mutationQuotaRemaining: 0,
      },
    }),
  );

  assert.deepEqual(result.rejectionReasons, [
    "mutation_quota_exhausted",
    "prior_deployment_exists",
    "provider_before_state_mismatch",
    "same_target_cooldown_not_satisfied",
    "site_mutation_concurrency_exhausted",
  ]);
});

test("shadow-stage admission remains non-executable", () => {
  const result = evaluate(
    buildP88PolicyGrant(grantInput({ policyStage: "shadow" })),
  );

  assert.equal(result.decision, "admit");
  assert.equal(result.policy.policyStage, "shadow");
  assert.equal(result.safety.providerWritePerformed, false);
  assert.equal(result.safety.executionAuthorizationCreated, false);
  assert.equal(result.safety.policyActivationPerformed, false);
  assert.equal(result.safety.autonomousExecutionAuthorized, false);
});

test("evaluation fingerprint binds policy, target, state, and reference window", () => {
  const baseline = evaluate();
  const changedTarget = evaluate(
    buildP88PolicyGrant(grantInput()),
    candidate({
      target: {
        ...candidate().target,
        resourceGid: "gid://shopify/Product/987654321",
        targetUrl: "https://diamondshelf.us/products/other-product",
      },
    }),
  );
  const changedReference = evaluate(
    buildP88PolicyGrant(grantInput()),
    candidate(),
    {
      referenceTime: "2026-09-23T06:01:00.000Z",
      evaluationExpiresAt: "2026-09-23T06:16:00.000Z",
    },
  );

  assert.notEqual(baseline.evaluationFingerprint, changedTarget.evaluationFingerprint);
  assert.notEqual(baseline.evaluationFingerprint, changedReference.evaluationFingerprint);
});

test("W01 source has no DB, HTTP, provider SDK, route, or runtime binding", async () => {
  const source = await readFile(
    new URL("./p8-8-policy-grant-evaluation.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /from "node:crypto"/);
  assert.doesNotMatch(source, /from "postgres"/);
  assert.doesNotMatch(source, /drizzle-orm/);
  assert.doesNotMatch(source, /DATABASE_URL/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /https?\.request/);
  assert.doesNotMatch(source, /express\s*\(/);
  assert.doesNotMatch(source, /router\./);
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /task54-persistent-apply/);
  assert.doesNotMatch(source, /task51-action-renewal/);
});
