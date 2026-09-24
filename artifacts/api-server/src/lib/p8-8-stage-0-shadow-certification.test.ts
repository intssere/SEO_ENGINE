import assert from "node:assert/strict";
import test from "node:test";
import {
  assertP88W09ShadowDecisionIntegrity,
  assertP88W09ShadowSessionIntegrity,
  buildP88W09ShadowDecision,
  buildP88W09ShadowSession,
  p88W09ShadowCapability,
  p88W09ShadowDecisionIntegrityIssues,
  p88W09ShadowSemantics,
  p88W09ShadowSessionIntegrityIssues,
} from "./p8-8-stage-0-shadow-certification.js";
import {
  buildP88W09Candidate,
  buildP88W09HumanLedger,
  buildP88W09TestFixture,
} from "./p8-8-w09-test-fixture.js";

function fullCurrentState(overrides: Record<string, unknown>) {
  return {
    ...buildP88W09Candidate().currentState,
    ...overrides,
  };
}

function fullRecommendation(overrides: Record<string, unknown>) {
  return {
    ...buildP88W09Candidate().recommendation,
    ...overrides,
  };
}

function fullProposal(overrides: Record<string, unknown>) {
  return {
    ...buildP88W09Candidate().proposal,
    ...overrides,
  };
}

function fullQuality(overrides: Record<string, unknown>) {
  return {
    ...buildP88W09Candidate().quality,
    ...overrides,
  };
}

function fullTarget(overrides: Record<string, unknown>) {
  return {
    ...buildP88W09Candidate().target,
    ...overrides,
  };
}

test("W09 builds one deterministic zero-write shadow decision by recomputing exact W01", () => {
  const fixture = buildP88W09TestFixture();
  const first = buildP88W09ShadowDecision(fixture.input);
  const second = buildP88W09ShadowDecision(structuredClone(fixture.input));

  assert.deepEqual(first, second);
  assert.equal(first.decision, "admit");
  assert.deepEqual(first.rejectionReasons, []);
  assert.equal(first.evaluationFingerprint, fixture.evaluation.evaluationFingerprint);
  assert.equal(first.source.provenance, "synthetic_fixture");
  assert.equal(first.lineageComplete, true);
  assert.match(first.shadowDecisionFingerprint, /^[0-9a-f]{64}$/);
  assert.doesNotThrow(() => assertP88W09ShadowDecisionIntegrity(first));
  assert.deepEqual(p88W09ShadowDecisionIntegrityIssues(first), []);
  assert.equal(first.safety.w03AuthorizationCreated, false);
  assert.equal(first.safety.w04ReservationCreatedOrMutated, false);
  assert.equal(first.safety.w05ClaimOrControlMutated, false);
  assert.equal(first.safety.w06ProviderPreflightPerformed, false);
  assert.equal(first.safety.w07DispatchOrRollbackPerformed, false);
});

test("tampered caller-supplied W01 evaluation fails closed", () => {
  const fixture = buildP88W09TestFixture();
  const input = structuredClone(fixture.input) as any;
  input.evaluation.evaluationFingerprint = "f".repeat(64);
  assert.throws(
    () => buildP88W09ShadowDecision(input),
    /p88_w09_w01_evaluation_integrity_mismatch/,
  );
});

test("tampered source snapshot fingerprint fails closed", () => {
  const input = structuredClone(buildP88W09TestFixture().input) as any;
  input.source.sourceFingerprint = "f".repeat(64);
  assert.throws(
    () => buildP88W09ShadowDecision(input),
    /p88_w09_source_fingerprint_mismatch/,
  );
});

test("production_read_snapshot is explicitly blocked in W09-A engineering", () => {
  const fixture = buildP88W09TestFixture();
  const input = structuredClone(fixture.input) as any;
  input.source.provenance = "production_read_snapshot";
  assert.throws(
    () => buildP88W09ShadowDecision(input),
    /p88_w09_production_read_snapshot_not_authorized|p88_w09_source_fingerprint_mismatch/,
  );
});

test("supplied_real_snapshot remains descriptive and does not claim W09-B completion", () => {
  const fixture = buildP88W09TestFixture({ provenance: "supplied_real_snapshot" });
  const decision = buildP88W09ShadowDecision(fixture.input);
  const session = buildP88W09ShadowSession({
    sessionReferenceTime: "2026-09-23T07:00:00.000Z",
    items: [fixture.input],
  });
  assert.equal(decision.source.provenance, "supplied_real_snapshot");
  assert.equal(session.status, "engineering_fixture_pass");
  assert.equal(session.semantics.realSnapshotLabelProvesProvenance, false);
  assert.equal(session.semantics.w09BProductionRunAuthorized, false);
});

test("exact replay collapses and input order cannot change canonical session", () => {
  const a = buildP88W09TestFixture({ sourceId: "source-a" });
  const b = buildP88W09TestFixture({
    sourceId: "source-b",
    referenceTime: "2026-09-23T06:01:00.000Z",
    evaluationExpiresAt: "2026-09-23T06:16:00.000Z",
  });

  const first = buildP88W09ShadowSession({
    sessionReferenceTime: "2026-09-23T07:00:00.000Z",
    items: [a.input, b.input, structuredClone(a.input)],
  });
  const second = buildP88W09ShadowSession({
    sessionReferenceTime: "2026-09-23T07:00:00.000Z",
    items: [b.input, a.input, structuredClone(a.input)],
  });

  assert.deepEqual(first, second);
  assert.equal(first.summary.totalCandidates, 2);
  assert.equal(first.summary.idempotentReplayCount, 1);
  assert.doesNotThrow(() => assertP88W09ShadowSessionIntegrity(first));
});

test("conflicting replay for one exact source identity fails closed", () => {
  const first = buildP88W09TestFixture({ sourceId: "same-source" });
  const second = buildP88W09TestFixture({
    sourceId: "same-source",
    candidateOverrides: {
      currentState: fullCurrentState({ mutationQuotaRemaining: 0 }) as any,
    },
  });
  assert.throws(
    () =>
      buildP88W09ShadowSession({
        sessionReferenceTime: "2026-09-23T07:00:00.000Z",
        items: [first.input, second.input],
      }),
    /p88_w09_source_replay_conflict/,
  );
});

test("mixed policy fingerprints in one session fail closed", () => {
  const first = buildP88W09TestFixture({ sourceId: "source-a" });
  const second = buildP88W09TestFixture({
    sourceId: "source-b",
    grantOverrides: { policyVersion: "v2" },
  });
  assert.throws(
    () =>
      buildP88W09ShadowSession({
        sessionReferenceTime: "2026-09-23T07:00:00.000Z",
        items: [first.input, second.input],
      }),
    /p88_w09_mixed_policy_session/,
  );
});

test("session item cap and post-reference decisions fail closed", () => {
  const fixture = buildP88W09TestFixture();
  const tooMany = Array.from({ length: 1001 }, (_, index) => ({
    ...fixture.input,
    source: {
      ...fixture.input.source,
      sourceId: "source-" + index,
    },
  }));
  assert.throws(
    () =>
      buildP88W09ShadowSession({
        sessionReferenceTime: "2026-09-23T07:00:00.000Z",
        items: tooMany as any,
      }),
    /p88_w09_shadow_session_item_limit_exceeded/,
  );

  assert.throws(
    () =>
      buildP88W09ShadowSession({
        sessionReferenceTime: "2026-09-23T05:59:59.000Z",
        items: [fixture.input],
      }),
    /p88_w09_decision_after_session_reference_time/,
  );
});

test("exact-target P8.6 human comparison is descriptive and direction-only", () => {
  const humanLedger = buildP88W09HumanLedger({ eventKind: "action_authorized" });
  const fixture = buildP88W09TestFixture({ humanLedger });
  const decision = buildP88W09ShadowDecision(fixture.input);

  assert.equal(decision.comparison.supplied, true);
  assert.equal(decision.comparison.comparable, true);
  assert.equal(decision.comparison.exactTargetBinding, true);
  assert.equal(decision.comparison.outcome, "human_approved_no_verified_execution");
  assert.equal(decision.comparison.direction, "same_direction");
  assert.equal(decision.semantics.comparisonDescriptiveOnly, true);
  assert.equal(decision.semantics.comparisonCreatesCorrectnessJudgment, false);
  assert.equal(decision.semantics.comparisonCreatesCausality, false);
});

test("exact comparable human rejection can produce different_direction without correctness judgment", () => {
  const humanLedger = buildP88W09HumanLedger({ eventKind: "proposal_rejected" });
  const decision = buildP88W09ShadowDecision(
    buildP88W09TestFixture({ humanLedger }).input,
  );
  assert.equal(decision.comparison.outcome, "human_rejected_or_not_approved");
  assert.equal(decision.comparison.direction, "different_direction");
  assert.equal(decision.semantics.comparisonCreatesCorrectnessJudgment, false);
});

test("P8.7 collection-shaped human evidence is not Product-target comparable", () => {
  const humanLedger = buildP88W09HumanLedger({
    resourceKind: "collection",
    targetUrl: "https://diamondshelf.us/collections/test",
    resourceGid: "gid://shopify/Collection/123456789",
  });
  const decision = buildP88W09ShadowDecision(
    buildP88W09TestFixture({ humanLedger }).input,
  );
  assert.equal(decision.comparison.comparable, false);
  assert.equal(decision.comparison.outcome, "not_comparable");
  assert.equal(decision.comparison.direction, "not_comparable");
  assert.equal(decision.semantics.p87CollectionPilotProductComparable, false);
});

test("target similarity cannot manufacture human comparison lineage", () => {
  const humanLedger = buildP88W09HumanLedger({
    resourceGid: "gid://shopify/Product/987654321",
  });
  const decision = buildP88W09ShadowDecision(
    buildP88W09TestFixture({ humanLedger }).input,
  );
  assert.equal(decision.comparison.exactTargetBinding, false);
  assert.equal(decision.comparison.direction, "not_comparable");
  assert.equal(decision.semantics.timestampProximityCreatesComparability, false);
});

test("tampered P8.6 comparison ledger fails closed before comparison", () => {
  const ledger = structuredClone(buildP88W09HumanLedger()) as any;
  ledger.ledgerFingerprint = "f".repeat(64);
  assert.throws(
    () => buildP88W09ShadowDecision(buildP88W09TestFixture({ humanLedger: ledger }).input),
    /p86_ledger_integrity_failure/,
  );
});

const rejectionCases: Array<{
  name: string;
  expected: string;
  options: Parameters<typeof buildP88W09TestFixture>[0];
}> = [
  {
    name: "policy not active",
    expected: "policy_not_active_yet",
    options: { referenceTime: "2026-09-22T23:59:59.000Z", evaluationExpiresAt: "2026-09-23T00:10:00.000Z" },
  },
  {
    name: "policy expired",
    expected: "policy_expired",
    options: { referenceTime: "2026-10-23T00:00:00.000Z", evaluationExpiresAt: "2026-10-23T00:15:00.000Z" },
  },
  {
    name: "policy revoked",
    expected: "policy_revoked",
    options: { grantOverrides: { revoked: true, revokedAt: "2026-09-23T05:00:00.000Z" } },
  },
  {
    name: "evaluation expiry invalid",
    expected: "evaluation_expiry_invalid",
    options: { evaluationExpiresAt: "2026-11-01T00:00:00.000Z" },
  },
  ...(["paused", "draining", "drained", "killed"] as const).map((mode) => ({
    name: "control " + mode,
    expected: "control_not_running",
    options: {
      candidateOverrides: {
        currentState: fullCurrentState({ mutationControlMode: mode }) as any,
      },
    },
  })),
  {
    name: "manual intervention unresolved",
    expected: "manual_intervention_unresolved",
    options: { candidateOverrides: { currentState: fullCurrentState({ unresolvedManualIntervention: true }) as any } },
  },
  {
    name: "provider write uncertain",
    expected: "provider_write_uncertain",
    options: { candidateOverrides: { currentState: fullCurrentState({ unresolvedUncertainProviderWrite: true }) as any } },
  },
  {
    name: "rollback failure unresolved",
    expected: "rollback_failure_unresolved",
    options: { candidateOverrides: { currentState: fullCurrentState({ unresolvedRollbackFailure: true }) as any } },
  },
  {
    name: "wrong recommendation class",
    expected: "recommendation_class_not_proposal_review",
    options: { candidateOverrides: { recommendation: fullRecommendation({ recommendationClass: "advisory_review" }) as any } },
  },
  {
    name: "lineage not materialized",
    expected: "recommendation_lineage_not_materialized",
    options: { candidateOverrides: { recommendation: fullRecommendation({ lineageMaterialized: false }) as any } },
  },
  {
    name: "changed preview missing",
    expected: "changed_preview_missing",
    options: { candidateOverrides: { recommendation: fullRecommendation({ changedPreviewPresent: false }) as any } },
  },
  {
    name: "nondeterministic proposal",
    expected: "proposal_not_deterministic",
    options: { candidateOverrides: { recommendation: fullRecommendation({ deterministic: false }) as any } },
  },
  {
    name: "AI assisted candidate",
    expected: "ai_assisted_candidate_blocked",
    options: { candidateOverrides: { recommendation: fullRecommendation({ aiAssisted: true }) as any } },
  },
  {
    name: "edited after certification",
    expected: "proposal_edited_after_certification",
    options: { candidateOverrides: { recommendation: fullRecommendation({ humanEditedAfterCertification: true }) as any } },
  },
  {
    name: "lifecycle ineligible",
    expected: "proposal_lifecycle_ineligible",
    options: { candidateOverrides: { recommendation: fullRecommendation({ lifecycleEligible: false }) as any } },
  },
  {
    name: "generation method disallowed",
    expected: "proposal_generation_method_not_allowed",
    options: { candidateOverrides: { recommendation: fullRecommendation({ proposalGenerationMethod: "freeform_ai" }) as any } },
  },
  {
    name: "bounded pilot absent",
    expected: "bounded_pilot_required",
    options: { candidateOverrides: { proposal: fullProposal({ boundedPilot: false }) as any } },
  },
  {
    name: "whole site requested",
    expected: "whole_site_coverage_forbidden",
    options: { candidateOverrides: { proposal: fullProposal({ wholeSiteCoverage: true }) as any } },
  },
  {
    name: "evidence insufficient",
    expected: "evidence_insufficient",
    options: { candidateOverrides: { evidence: { ids: ["one"], missingEvidence: [] } as any } },
  },
  {
    name: "missing evidence",
    expected: "missing_evidence_present",
    options: { candidateOverrides: { evidence: { ids: ["one", "two"], missingEvidence: ["provider"] } as any } },
  },
  {
    name: "quality status fail",
    expected: "quality_status_not_pass",
    options: { candidateOverrides: { quality: fullQuality({ status: "blocked" }) as any } },
  },
  {
    name: "quality not approval eligible",
    expected: "quality_not_approval_eligible",
    options: { candidateOverrides: { quality: fullQuality({ approvalEligible: false }) as any } },
  },
  {
    name: "quality below threshold",
    expected: "quality_score_below_threshold",
    options: { candidateOverrides: { quality: fullQuality({ score: 89 }) as any } },
  },
  {
    name: "quality blockers",
    expected: "quality_blockers_present",
    options: { candidateOverrides: { quality: fullQuality({ blockingReasons: ["blocker"] }) as any } },
  },
  {
    name: "quality warnings",
    expected: "quality_warnings_present",
    options: { candidateOverrides: { quality: fullQuality({ warnings: ["warning"] }) as any } },
  },
  {
    name: "risk not low",
    expected: "risk_not_low",
    options: { candidateOverrides: { risk: { classification: "medium" } as any } },
  },
  {
    name: "provider disallowed",
    expected: "provider_not_allowed",
    options: { candidateOverrides: { target: fullTarget({ provider: "other" }) as any } },
  },
  {
    name: "domain disallowed",
    expected: "domain_not_allowed",
    options: { candidateOverrides: { target: fullTarget({ domain: "example.com" }) as any } },
  },
  {
    name: "resource kind disallowed",
    expected: "resource_kind_not_allowed",
    options: { candidateOverrides: { target: fullTarget({ resourceKind: "collection" }) as any } },
  },
  {
    name: "resource gid invalid",
    expected: "resource_gid_invalid",
    options: { candidateOverrides: { target: fullTarget({ resourceGid: "gid://shopify/Collection/123" }) as any } },
  },
  {
    name: "target url disallowed",
    expected: "target_url_not_allowed",
    options: { candidateOverrides: { target: fullTarget({ targetUrl: "https://diamondshelf.us/collections/test" }) as any } },
  },
  {
    name: "action type disallowed",
    expected: "action_type_not_allowed",
    options: { candidateOverrides: { target: fullTarget({ actionType: "update_title" }) as any } },
  },
  {
    name: "field disallowed",
    expected: "field_not_allowed",
    options: { candidateOverrides: { target: fullTarget({ field: "title" }) as any } },
  },
  {
    name: "provider scope disallowed",
    expected: "provider_scope_not_allowed",
    options: { candidateOverrides: { target: fullTarget({ requiredProviderScope: "write_files" }) as any } },
  },
  {
    name: "provider before-state mismatch",
    expected: "provider_before_state_mismatch",
    options: { candidateOverrides: { currentState: fullCurrentState({ providerObservedBeforeFingerprint: "d".repeat(64) }) as any } },
  },
  {
    name: "prior deployment",
    expected: "prior_deployment_exists",
    options: { candidateOverrides: { currentState: fullCurrentState({ priorDeploymentCount: 1 }) as any } },
  },
  {
    name: "concurrency exhausted",
    expected: "site_mutation_concurrency_exhausted",
    options: { candidateOverrides: { currentState: fullCurrentState({ otherActiveSiteMutationCount: 1 }) as any } },
  },
  {
    name: "cooldown unsatisfied",
    expected: "same_target_cooldown_not_satisfied",
    options: { candidateOverrides: { currentState: fullCurrentState({ sameTargetCooldownSatisfied: false }) as any } },
  },
  {
    name: "quota exhausted",
    expected: "mutation_quota_exhausted",
    options: { candidateOverrides: { currentState: fullCurrentState({ mutationQuotaRemaining: 0 }) as any } },
  },
];

for (const rejectionCase of rejectionCases) {
  test("W09 rejection matrix: " + rejectionCase.name, () => {
    const fixture = buildP88W09TestFixture(rejectionCase.options);
    const decision = buildP88W09ShadowDecision(fixture.input);
    assert.equal(decision.decision, "reject");
    assert.ok(
      decision.rejectionReasons.includes(rejectionCase.expected as any),
      "expected " + rejectionCase.expected + " in " + decision.rejectionReasons.join(","),
    );
    assert.deepEqual(decision.rejectionReasons, fixture.evaluation.rejectionReasons);
  });
}

test("running control with available quota/cooldown/concurrency remains eligible", () => {
  const decision = buildP88W09ShadowDecision(buildP88W09TestFixture().input);
  assert.equal(decision.decision, "admit");
  assert.equal(decision.currentState.mutationControlMode, "running");
  assert.equal(decision.currentState.mutationQuotaRemaining, 1);
  assert.equal(decision.currentState.sameTargetCooldownSatisfied, true);
  assert.equal(decision.currentState.otherActiveSiteMutationCount, 0);
});

test("session summary deterministically counts rejection/control classes without scores", () => {
  const admitted = buildP88W09TestFixture({ sourceId: "admit" });
  const quota = buildP88W09TestFixture({
    sourceId: "quota",
    candidateOverrides: { currentState: fullCurrentState({ mutationQuotaRemaining: 0 }) as any },
  });
  const control = buildP88W09TestFixture({
    sourceId: "control",
    candidateOverrides: { currentState: fullCurrentState({ mutationControlMode: "paused" }) as any },
  });
  const session = buildP88W09ShadowSession({
    sessionReferenceTime: "2026-09-23T07:00:00.000Z",
    items: [quota.input, admitted.input, control.input],
  });

  assert.equal(session.summary.totalCandidates, 3);
  assert.equal(session.summary.admittedCount, 1);
  assert.equal(session.summary.rejectedCount, 2);
  assert.equal(session.summary.quotaRejectionCount, 1);
  assert.equal(session.summary.controlModeRejectionCount, 1);
  assert.equal("accuracy" in session.summary, false);
  assert.equal("score" in session.summary, false);
  assert.deepEqual(p88W09ShadowSessionIntegrityIssues(session), []);
});

test("decision/session tampering is detected independently", () => {
  const fixture = buildP88W09TestFixture();
  const decision = buildP88W09ShadowDecision(fixture.input);
  const tamperedDecision = structuredClone(decision) as any;
  tamperedDecision.currentState.mutationQuotaRemaining = 0;
  assert.ok(
    p88W09ShadowDecisionIntegrityIssues(tamperedDecision).includes(
      "p88_w09_decision_fingerprint_mismatch",
    ),
  );

  const session = buildP88W09ShadowSession({
    sessionReferenceTime: "2026-09-23T07:00:00.000Z",
    items: [fixture.input],
  });
  const tamperedSession = structuredClone(session) as any;
  tamperedSession.summary.admittedCount = 0;
  assert.ok(p88W09ShadowSessionIntegrityIssues(tamperedSession).length > 0);
});

test("W09 semantics and capability freeze zero-write/no-authority behavior", () => {
  const semantics = p88W09ShadowSemantics();
  const capability = p88W09ShadowCapability();

  assert.equal(semantics.stage0ShadowOnly, true);
  assert.equal(semantics.certifiedW01IsOnlyPolicyDecisionEngine, true);
  assert.equal(semantics.shadowAdmitCreatesExecutionAuthority, false);
  assert.equal(semantics.w09BProductionRunAuthorized, false);
  assert.equal(semantics.w10ActivationAuthorized, false);

  assert.equal(capability.databaseReadPerformed, false);
  assert.equal(capability.databaseWritePerformed, false);
  assert.equal(capability.persistencePerformed, false);
  assert.equal(capability.providerNetworkReadPerformed, false);
  assert.equal(capability.providerWritePerformed, false);
  assert.equal(capability.publicSiteWritePerformed, false);
  assert.equal(capability.w03AuthorizationCreated, false);
  assert.equal(capability.w04ReservationCreatedOrMutated, false);
  assert.equal(capability.w05ClaimOrControlMutated, false);
  assert.equal(capability.w06ProviderPreflightPerformed, false);
  assert.equal(capability.w07DispatchOrRollbackPerformed, false);
  assert.equal(capability.task51ExecutionPerformed, false);
  assert.equal(capability.task53ExecutionPerformed, false);
  assert.equal(capability.task54ExecutionPerformed, false);
  assert.equal(capability.routeBound, false);
  assert.equal(capability.startupBound, false);
  assert.equal(capability.schedulerActivated, false);
  assert.equal(capability.workerActivated, false);
  assert.equal(capability.liveExecutionAuthorized, false);
  assert.equal(capability.autonomousExecutionAuthorized, false);
  assert.equal(capability.deploymentPerformed, false);
  assert.equal(capability.publicationPerformed, false);
});
