import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  initializeP88W05ControlState,
  projectP88W05ClaimIntent,
  projectP88W05ControlDecision,
  projectP88W05ControlTransition,
  p88W05MutationControlCapability,
} from "./p8-8-mutation-control.js";
import {
  projectP88W04DurableReceipt,
} from "./p8-8-reservation-store.js";
import { buildP88W04TestScenario } from "./p8-8-w04-test-fixture.js";

function durableReceipt(
  scenario: ReturnType<typeof buildP88W04TestScenario>,
) {
  const intent = scenario.input.intent;
  const w03 = scenario.input.w03Authorization;
  const row: Parameters<typeof projectP88W04DurableReceipt>[0] = {
    reservation_id: intent.reservationId,
    reservation_version: "p8-8-w04-durable-reservation-v1",
    reservation_class: "shopify.product.seo.meta_description",
    reservation_fingerprint: intent.reservationFingerprint,
    site_id: intent.siteId,
    policy_id: intent.policy.policyId,
    policy_version: intent.policy.policyVersion,
    policy_fingerprint: intent.policy.policyFingerprint,
    evaluation_id: intent.evaluation.evaluationId,
    evaluation_fingerprint: intent.evaluation.evaluationFingerprint,
    materialization_id: intent.materialization.materializationId,
    materialization_fingerprint: intent.materialization.materializationFingerprint,
    materialization_idempotency_fingerprint:
      intent.materialization.materializationIdempotencyFingerprint,
    proposal_id: intent.proposal.proposalId,
    proposal_fingerprint: intent.proposal.proposalFingerprint,
    recommendation_fingerprint:
      intent.recommendation.recommendationFingerprint,
    recommendation_idempotency_key:
      intent.recommendation.recommendationIdempotencyKey,
    target_binding_fingerprint: intent.target.targetBindingFingerprint,
    provider: intent.target.provider,
    domain: intent.target.domain,
    resource_kind: intent.target.resourceKind,
    resource_gid: intent.target.resourceGid,
    target_url: intent.target.targetUrl,
    action_type: intent.target.actionType,
    field: intent.target.field,
    required_provider_scope: intent.target.requiredProviderScope,
    before_fingerprint: intent.state.beforeFingerprint,
    after_fingerprint: intent.state.afterFingerprint,
    w03_authorization_id: w03.policyAuthorizationId,
    w03_authorization_fingerprint: w03.policyAuthorizationFingerprint,
    policy_action_id: w03.policyActionId,
    w03_reservation_descriptor_fingerprint:
      w03.reservation.descriptorFingerprint,
    status: "authorized",
    authorized_at: new Date(w03.issuedAt),
    expires_at: new Date(w03.expiresAt),
    claimed_at: null,
    terminal_at: null,
    terminal_reason: null,
  };
  return projectP88W04DurableReceipt(row);
}

test("W05 durable control initialization is deterministic and non-dispatchable", () => {
  const input = {
    siteId: "eb1da9ee-539c-4200-8f04-f64ccaea7768",
    mode: "running" as const,
    effectiveAt: "2026-09-23T13:30:00.000Z",
  };
  const left = initializeP88W05ControlState(input);
  const right = initializeP88W05ControlState(input);
  assert.deepEqual(left, right);
  assert.equal(left.state.revision, 1);
  assert.equal(left.state.previousControlFingerprint, null);
  assert.equal(left.event.action, "initialize");
  assert.equal(left.state.providerDispatchAuthorized, false);
  assert.equal(left.state.publicSiteWrites, false);
});

test("W05 preserves kill > drain > pause > running transition semantics", () => {
  const initial = initializeP88W05ControlState({
    siteId: "eb1da9ee-539c-4200-8f04-f64ccaea7768",
    mode: "running",
    effectiveAt: "2026-09-23T13:30:00.000Z",
  }).state;

  const paused = projectP88W05ControlTransition({
    current: initial,
    action: "pause",
    effectiveAt: "2026-09-23T13:31:00.000Z",
    unresolvedBlockingCount: 0,
  }).state;
  assert.equal(paused.mode, "paused");

  const draining = projectP88W05ControlTransition({
    current: paused,
    action: "drain",
    effectiveAt: "2026-09-23T13:32:00.000Z",
    unresolvedBlockingCount: 1,
  }).state;
  assert.equal(draining.mode, "draining");

  assert.throws(
    () =>
      projectP88W05ControlTransition({
        current: draining,
        action: "pause",
        effectiveAt: "2026-09-23T13:33:00.000Z",
        unresolvedBlockingCount: 1,
      }),
    /p88_w05_drain_precedence_blocks_pause/,
  );

  const killed = projectP88W05ControlTransition({
    current: draining,
    action: "kill",
    effectiveAt: "2026-09-23T13:34:00.000Z",
    unresolvedBlockingCount: 1,
  }).state;
  assert.equal(killed.mode, "killed");
  assert.throws(
    () =>
      projectP88W05ControlTransition({
        current: killed,
        action: "resume",
        effectiveAt: "2026-09-23T13:35:00.000Z",
        unresolvedBlockingCount: 0,
      }),
    /p88_w05_killed_requires_recovery_review/,
  );
});

test("W05 resume requires zero unresolved mutation blockers", () => {
  const paused = initializeP88W05ControlState({
    siteId: "eb1da9ee-539c-4200-8f04-f64ccaea7768",
    mode: "paused",
    effectiveAt: "2026-09-23T13:30:00.000Z",
  }).state;

  assert.throws(
    () =>
      projectP88W05ControlTransition({
        current: paused,
        action: "resume",
        effectiveAt: "2026-09-23T13:31:00.000Z",
        unresolvedBlockingCount: 1,
      }),
    /p88_w05_resume_blocked_by_unresolved_mutation/,
  );

  const resumed = projectP88W05ControlTransition({
    current: paused,
    action: "resume",
    effectiveAt: "2026-09-23T13:31:00.000Z",
    unresolvedBlockingCount: 0,
  });
  assert.equal(resumed.state.mode, "running");
});

test("W05 claim identity binds exact W03/W04 pair and control revision", () => {
  const scenario = buildP88W04TestScenario({
    productId: "200000001",
    handle: "w05-product-one",
    subjectSuffix: "w05-pure-claim",
  });
  const receipt = durableReceipt(scenario);
  const control = initializeP88W05ControlState({
    siteId: scenario.input.intent.siteId,
    mode: "running",
    effectiveAt: "2026-09-23T12:01:00.000Z",
  }).state;

  const left = projectP88W05ClaimIntent({
    w03Authorization: scenario.input.w03Authorization,
    w04Receipt: receipt,
    control,
  });
  const right = projectP88W05ClaimIntent({
    w03Authorization: scenario.input.w03Authorization,
    w04Receipt: receipt,
    control,
  });
  assert.deepEqual(left, right);
  assert.equal(left.reservationId, scenario.input.intent.reservationId);
  assert.equal(left.controlRevision, 1);
  assert.equal(left.providerDispatchAuthorized, false);
  assert.equal(left.providerWriteAllowed, false);
  assert.equal(left.task51Authorized, false);
  assert.equal(left.task54ExecutionAuthorized, false);

  const paused = projectP88W05ControlTransition({
    current: control,
    action: "pause",
    effectiveAt: "2026-09-23T12:02:00.000Z",
    unresolvedBlockingCount: 0,
  }).state;
  assert.throws(
    () =>
      projectP88W05ClaimIntent({
        w03Authorization: scenario.input.w03Authorization,
        w04Receipt: receipt,
        control: paused,
      }),
    /p88_w05_control_not_running/,
  );
});

test("W05 separates new forward mutation from mandatory safety closure", () => {
  const running = initializeP88W05ControlState({
    siteId: "eb1da9ee-539c-4200-8f04-f64ccaea7768",
    mode: "running",
    effectiveAt: "2026-09-23T13:30:00.000Z",
  }).state;
  const killed = projectP88W05ControlTransition({
    current: running,
    action: "kill",
    effectiveAt: "2026-09-23T13:31:00.000Z",
    unresolvedBlockingCount: 1,
  }).state;

  const preDispatch = projectP88W05ControlDecision({
    control: killed,
    executionPhase: "pre_dispatch_proven",
  });
  assert.equal(preDispatch.claimEligible, false);
  assert.equal(preDispatch.newForwardMutationBlocked, true);
  assert.equal(preDispatch.safetyClosureRequired, false);

  const closure = projectP88W05ControlDecision({
    control: killed,
    executionPhase: "side_effect_possible",
  });
  assert.equal(closure.claimEligible, false);
  assert.equal(closure.newForwardMutationBlocked, true);
  assert.equal(closure.safetyClosureRequired, true);
  assert.equal(closure.providerDispatchAuthorized, false);
  assert.equal(closure.providerWriteAllowed, false);
  assert.equal(closure.publicSiteWrites, false);
  assert.equal(closure.automaticTransition, false);
});

test("W05 capability remains default-off and human-path distinct", () => {
  const capability = p88W05MutationControlCapability();
  assert.equal(capability.exactW03W04PairRequired, true);
  assert.equal(capability.providerNetworkReadPerformed, false);
  assert.equal(capability.providerWritePerformed, false);
  assert.equal(capability.task51ExecutionPerformed, false);
  assert.equal(capability.task53ExecutionPerformed, false);
  assert.equal(capability.task54ExecutionPerformed, false);
  assert.equal(capability.approvalsRowCreated, false);
  assert.equal(capability.humanActionRowCreated, false);
  assert.equal(capability.schedulerActivated, false);
  assert.equal(capability.workerActivated, false);
  assert.equal(capability.productionDdlAuthorized, false);
});

test("W05 source has no provider, Task #51/#54, timer, scheduler or ambient database binding", async () => {
  const controlSource = await readFile(
    fileURLToPath(new URL("./p8-8-mutation-control.ts", import.meta.url)),
    "utf8",
  );
  const storeSource = await readFile(
    fileURLToPath(
      new URL("./p8-8-mutation-control-store.ts", import.meta.url),
    ),
    "utf8",
  );
  const source = controlSource + "\n" + storeSource;

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /task54-persistent-apply/);
  assert.doesNotMatch(source, /execution-store/);
  assert.doesNotMatch(source, /\bsetInterval\s*\(|\bsetTimeout\s*\(/);
  assert.doesNotMatch(source, /process\.env\.DATABASE_URL/);
  assert.doesNotMatch(source, /APPLY_AND_VERIFY_TASK54/);
  assert.doesNotMatch(source, /controlled_execution_foundation_v1/);
});
