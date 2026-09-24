import assert from "node:assert/strict";
import test from "node:test";
import {
  assertP88W08AuditIntegrity,
  buildP88W08AutonomousAuditProjection,
  p88W08AuditCapability,
  p88W08AuditIntegrityIssues,
  p88W08AuditSemantics,
} from "./p8-8-autonomous-audit-projection.js";
import { initializeP88W05ControlState } from "./p8-8-mutation-control.js";
import { p88W07StableHash } from "./p8-8-policy-single-action-apply.js";
import { buildP88W08TestFixture } from "./p8-8-w08-test-fixture.js";

function cloneInput() {
  return structuredClone(buildP88W08TestFixture().input) as any;
}

function rehashDispatchEvent(event: any) {
  event.eventFingerprint = p88W07StableHash({
    version: event.eventVersion,
    purpose: "p8.8_w07_dispatch_event",
    dispatchId: event.dispatchId,
    fromRevision: event.fromRevision,
    fromState: event.fromState,
    toRevision: event.toRevision,
    toState: event.toState,
    transitionReason: event.transitionReason,
    providerRequestFingerprint: event.providerRequestFingerprint,
    publicWriteOccurrence: event.publicWriteOccurrence,
    rollbackOccurrence: event.rollbackOccurrence,
    effectiveAt: event.effectiveAt,
  });
  event.eventId = "p88w07-event-" + event.eventFingerprint.slice(0, 24);
}

function makeOneSidedVerification(input: any) {
  const evidence = structuredClone(input.verificationEvidence[0]);
  evidence.storefront.outcome = "mismatch";
  evidence.storefront.observedValue = "different-storefront-value";
  evidence.storefront.errorCategory = "storefront_state_mismatch";
  evidence.storefront.evidenceFingerprint = p88W07StableHash({
    purpose: "w08-one-sided-storefront",
    observedValue: evidence.storefront.observedValue,
  });
  evidence.verificationFingerprint = p88W07StableHash({
    version: "p8-8-w07-policy-single-action-apply-v1",
    purpose: "p8.8_w07_verification",
    dispatchId: input.w07Intent.dispatchId,
    phase: evidence.phase,
    providerEvidenceFingerprint: evidence.provider.evidenceFingerprint,
    storefrontEvidenceFingerprint: evidence.storefront.evidenceFingerprint,
    expectedFingerprint: evidence.expectedFingerprint,
  });
  evidence.evidenceId = "p88w08-verification-" + evidence.verificationFingerprint.slice(0, 24);
  input.dispatch.verificationFingerprint = evidence.verificationFingerprint;
  input.verificationEvidence = [evidence];
  return evidence;
}

test("W08 builds one deterministic exact-policy-action ledger and passes independent integrity verification", () => {
  const fixture = buildP88W08TestFixture();
  const first = buildP88W08AutonomousAuditProjection(fixture.input);
  const second = buildP88W08AutonomousAuditProjection(structuredClone(fixture.input));

  assert.deepEqual(first, second);
  assert.equal(first.policyActionId, fixture.intent.lineage.policyActionId);
  assert.equal(first.lineage.dispatchId, fixture.intent.dispatchId);
  assert.equal(first.summary.finalW07State, "forward_verified_live");
  assert.equal(first.summary.forwardAttemptCount, 1);
  assert.equal(first.summary.rollbackAttemptCount, 0);
  assert.match(first.ledgerFingerprint, /^[0-9a-f]{64}$/);
  assert.match(first.ledgerId, /^p88w08-ledger-[0-9a-f]{24}$/);
  assert.deepEqual(p88W08AuditIntegrityIssues(first), []);
  assert.doesNotThrow(() => assertP88W08AuditIntegrity(first));
});

test("W08 input ordering is canonical and exact replay collapses", () => {
  const fixture = buildP88W08TestFixture({ path: "rollback_verified_closed" });
  const first = buildP88W08AutonomousAuditProjection(fixture.input);
  const replay = structuredClone(fixture.input) as any;
  replay.dispatchEvents = [
    ...replay.dispatchEvents.slice().reverse(),
    structuredClone(replay.dispatchEvents[0]),
  ];
  replay.verificationEvidence = [
    ...replay.verificationEvidence.slice().reverse(),
    structuredClone(replay.verificationEvidence[0]),
  ];
  const second = buildP88W08AutonomousAuditProjection(replay);
  assert.deepEqual(first, second);
});

test("conflicting replay for one verification source identity fails closed", () => {
  const input = cloneInput();
  const duplicate = structuredClone(input.verificationEvidence[0]);
  duplicate.occurredAt = "2026-09-23T12:00:06.000Z";
  input.verificationEvidence.push(duplicate);
  assert.throws(
    () => buildP88W08AutonomousAuditProjection(input),
    /p88_w08_source_replay_conflict/,
  );
});

test("wrong policy action, target, reservation status, or durable reservation lineage fails closed", () => {
  for (const mutate of [
    (input: any) => { input.reservationFinal.policyActionId = "p88w03-action-foreign"; },
    (input: any) => { input.reservationFinal.resourceGid = "gid://shopify/Product/999999999"; },
    (input: any) => { input.reservationFinal.status = "claimed"; },
    (input: any) => { input.reservationFinal.targetBindingFingerprint = "f".repeat(64); },
  ]) {
    const input = cloneInput();
    mutate(input);
    assert.throws(() => buildP88W08AutonomousAuditProjection(input), /p88_w08_/);
  }
});

test("tampered W01, W02, W03, W05 and W06 artifacts are rejected through certified upstream rebuilds", () => {
  const mutations = [
    (input: any) => { input.w07Bundle.w06Lineage.w01Evaluation.evaluationFingerprint = "a".repeat(64); },
    (input: any) => { input.w07Bundle.w06Lineage.w02Materialization.materializationFingerprint = "b".repeat(64); },
    (input: any) => { input.w07Bundle.w06Lineage.w03Authorization.authorizationProvenance = "human_approval"; },
    (input: any) => { input.w07Bundle.w06Lineage.w05ClaimReceipt.controlRevision += 1; },
    (input: any) => { input.w07Bundle.w06Preflight.preflightFingerprint = "c".repeat(64); },
  ];
  for (const mutate of mutations) {
    const input = cloneInput();
    mutate(input);
    assert.throws(() => buildP88W08AutonomousAuditProjection(input));
  }
});

test("supplied W07 intent and dispatch identity cannot drift from rebuilt W01-W07 lineage", () => {
  const intentDrift = cloneInput();
  intentDrift.w07Intent.dispatchFingerprint = "d".repeat(64);
  assert.throws(
    () => buildP88W08AutonomousAuditProjection(intentDrift),
    /p88_w08_w07_intent_integrity_mismatch/,
  );

  const dispatchDrift = cloneInput();
  dispatchDrift.dispatch.dispatchId = "p88w07-dispatch-foreign";
  assert.throws(
    () => buildP88W08AutonomousAuditProjection(dispatchDrift),
    /p88_w08_dispatch_identity_mismatch/,
  );
});

test("tampered W07 event fingerprint and noncanonical event ID fail closed", () => {
  const fingerprintInput = cloneInput();
  fingerprintInput.dispatchEvents[1].eventFingerprint = "e".repeat(64);
  assert.throws(
    () => buildP88W08AutonomousAuditProjection(fingerprintInput),
    /p88_w08_dispatch_event_fingerprint_mismatch/,
  );

  const idInput = cloneInput();
  idInput.dispatchEvents[1].eventId = "p88w07-event-aaaaaaaaaaaaaaaaaaaaaaaa";
  assert.throws(
    () => buildP88W08AutonomousAuditProjection(idInput),
    /p88_w08_dispatch_event_id_mismatch/,
  );
});

test("broken W07 revision chain and impossible state transition fail closed", () => {
  const revision = cloneInput();
  revision.dispatchEvents[2].fromRevision = 1;
  rehashDispatchEvent(revision.dispatchEvents[2]);
  assert.throws(
    () => buildP88W08AutonomousAuditProjection(revision),
    /p88_w08_dispatch_revision_chain_mismatch/,
  );

  const transition = cloneInput();
  transition.dispatchEvents[2].fromRevision = 2;
  transition.dispatchEvents[2].fromState = "dispatch_started";
  transition.dispatchEvents[2].toRevision = 3;
  transition.dispatchEvents[2].toState = "rollback_verified_closed";
  rehashDispatchEvent(transition.dispatchEvents[2]);
  transition.dispatchEvents.splice(3);
  transition.dispatch.rowRevision = 3;
  transition.dispatch.state = "rollback_verified_closed";
  transition.dispatch.rollbackAttemptCount = 0;
  transition.dispatch.rollbackOccurrence = "confirmed";
  transition.dispatch.terminalAt = transition.dispatchEvents[2].effectiveAt;
  transition.reservationFinal.status = "consumed";
  transition.reservationFinal.terminalAt = transition.dispatch.terminalAt;
  assert.throws(() => buildP88W08AutonomousAuditProjection(transition));
});

test("forward and rollback attempt counts are bounded to one and must match event history", () => {
  const forward = cloneInput();
  forward.dispatch.forwardAttemptCount = 2;
  assert.throws(
    () => buildP88W08AutonomousAuditProjection(forward),
    /p88_w08_dispatch_attempt_or_revision_invalid/,
  );

  const rollback = structuredClone(
    buildP88W08TestFixture({ path: "rollback_verified_closed" }).input,
  ) as any;
  rollback.dispatch.rollbackAttemptCount = 2;
  assert.throws(
    () => buildP88W08AutonomousAuditProjection(rollback),
    /p88_w08_dispatch_attempt_or_revision_invalid/,
  );
});

test("accepted/terminal dispatch state alone cannot create verification success", () => {
  const input = cloneInput();
  input.verificationEvidence = [];
  assert.throws(
    () => buildP88W08AutonomousAuditProjection(input),
    /p88_w08_forward_verification_evidence_required/,
  );
});

test("one-sided provider success plus storefront mismatch is not verification success", () => {
  const input = cloneInput();
  const evidence = makeOneSidedVerification(input);
  assert.equal(evidence.provider.status, "observed");
  assert.equal(evidence.storefront.outcome, "mismatch");
  assert.throws(
    () => buildP88W08AutonomousAuditProjection(input),
    /p88_w08_forward_verification_evidence_required/,
  );
});

test("unavailable provider/storefront evidence remains explicit and manual intervention remains blocking", () => {
  const fixture = buildP88W08TestFixture({ path: "manual_intervention_required" });
  const ledger = buildP88W08AutonomousAuditProjection(fixture.input);
  const verification = ledger.entries.find(
    (entry) => entry.source.system === "p8.8_w07_verification_evidence",
  )!;
  assert.equal(verification.evidence.providerStatus, "unavailable");
  assert.equal(verification.evidence.storefrontOutcome, "unavailable");
  assert.equal(verification.evidence.exactProviderAndStorefrontMatch, false);
  assert.equal(ledger.summary.manualInterventionCount, 1);
  assert.ok(ledger.summary.uncertainWriteCount > 0);
  assert.equal(ledger.summary.finalW07State, "manual_intervention_required");
  assert.equal(ledger.semantics.unavailableAndUncertainPreserved, true);
  assert.equal(ledger.semantics.manualInterventionPreserved, true);
});

test("manual-intervention W04 transition is not invented without an authoritative terminal timestamp", () => {
  const fixture = buildP88W08TestFixture({ path: "manual_intervention_required" });
  const ledger = buildP88W08AutonomousAuditProjection(fixture.input);
  assert.equal(fixture.reservationFinal.terminalAt, null);
  assert.equal(
    ledger.entries.some((entry) => entry.eventKind === "reservation_manual_intervention"),
    false,
  );
  assert.equal(ledger.semantics.w04TransitionsInvented, false);
});

test("authoritative W04 claimed and terminal timestamps project exact reservation events", () => {
  const fixture = buildP88W08TestFixture({ path: "forward_verified_live" });
  const ledger = buildP88W08AutonomousAuditProjection(fixture.input);
  const reservationKinds = ledger.entries
    .filter((entry) => entry.eventClass === "reservation")
    .map((entry) => entry.eventKind);
  assert.deepEqual(
    reservationKinds,
    ["reservation_authorized", "reservation_claimed", "reservation_consumed"],
  );
});

test("site/time proximity cannot attach an unrelated valid W05 control event", () => {
  const input = cloneInput();
  const unrelated = initializeP88W05ControlState({
    siteId: "11111111-1111-4111-8111-111111111111",
    mode: "running",
    effectiveAt: "2026-09-23T11:59:59.000Z",
  }).event;
  input.controlEvents = [unrelated];
  assert.throws(
    () => buildP88W08AutonomousAuditProjection(input),
    /p88_w08_unbound_control_event/,
  );
});

test("same-time W07 dispatch events honor exact revision order before lexical source identity", () => {
  const input = cloneInput();
  const sameTime = "2026-09-23T12:00:05.000Z";
  input.dispatchEvents[2].effectiveAt = sameTime;
  input.dispatchEvents[3].effectiveAt = sameTime;
  rehashDispatchEvent(input.dispatchEvents[2]);
  rehashDispatchEvent(input.dispatchEvents[3]);
  input.dispatch.terminalAt = sameTime;
  input.reservationFinal.terminalAt = sameTime;
  input.verificationEvidence[0].occurredAt = sameTime;
  const ledger = buildP88W08AutonomousAuditProjection(input);
  const revisions = ledger.entries
    .filter((entry) => entry.source.system === "p8.8_w07_dispatch_event")
    .map((entry) => entry.sourceRevision);
  assert.deepEqual(revisions, [1, 2, 3, 4]);
});

test("events after reference time fail closed", () => {
  const input = cloneInput();
  input.referenceTime = "2026-09-23T12:00:04.000Z";
  assert.throws(
    () => buildP88W08AutonomousAuditProjection(input),
    /p88_w08_event_after_reference_time/,
  );
});

test("rollback-verified closure requires exact rollback evidence and preserves one rollback maximum", () => {
  const fixture = buildP88W08TestFixture({ path: "rollback_verified_closed" });
  const ledger = buildP88W08AutonomousAuditProjection(fixture.input);
  assert.equal(ledger.summary.finalW07State, "rollback_verified_closed");
  assert.equal(ledger.summary.forwardAttemptCount, 1);
  assert.equal(ledger.summary.rollbackAttemptCount, 1);
  const rollbackVerification = ledger.entries.find(
    (entry) =>
      entry.source.system === "p8.8_w07_verification_evidence"
      && entry.evidence.phase === "rollback",
  )!;
  assert.equal(rollbackVerification.evidence.exactProviderAndStorefrontMatch, true);

  const missing = structuredClone(fixture.input) as any;
  missing.verificationEvidence = missing.verificationEvidence.filter(
    (evidence: any) => evidence.phase !== "rollback",
  );
  assert.throws(
    () => buildP88W08AutonomousAuditProjection(missing),
    /p88_w08_rollback_verification_evidence_required/,
  );
});

test("cancel-before-dispatch projects no forward attempt and exact released reservation closure", () => {
  const fixture = buildP88W08TestFixture({ path: "cancelled_before_dispatch" });
  const ledger = buildP88W08AutonomousAuditProjection(fixture.input);
  assert.equal(ledger.summary.finalW07State, "cancelled_before_dispatch");
  assert.equal(ledger.summary.forwardAttemptCount, 0);
  assert.equal(ledger.summary.rollbackAttemptCount, 0);
  assert.equal(fixture.reservationFinal.status, "released");
  assert.equal(
    ledger.entries.some((entry) => entry.eventKind === "reservation_released"),
    true,
  );
});

test("W08 ledger does not fabricate human approval/action/deployment or Task #54 identity", () => {
  const ledger = buildP88W08AutonomousAuditProjection(buildP88W08TestFixture().input);
  const serialized = JSON.stringify(ledger);
  assert.equal(serialized.includes('"approvalId"'), false);
  assert.equal(serialized.includes('"actionId"'), false);
  assert.equal(serialized.includes('"deploymentId"'), false);
  assert.equal(serialized.includes("APPLY_AND_VERIFY_TASK54"), false);
  assert.equal(ledger.semantics.humanApprovalFabricated, false);
  assert.equal(ledger.semantics.humanActionFabricated, false);
  assert.equal(ledger.semantics.humanDeploymentFabricated, false);
});

test("chronology is descriptive only and never infers current provider state, success, quality or causal impact", () => {
  const ledger = buildP88W08AutonomousAuditProjection(buildP88W08TestFixture().input);
  assert.equal(ledger.semantics.currentProviderStateInferred, false);
  assert.equal(ledger.semantics.executionSuccessInferred, false);
  assert.equal(ledger.semantics.recommendationQualityInferred, false);
  assert.equal(ledger.semantics.causalImpactInferred, false);
  assert.equal(ledger.semantics.chronologyCreatesCausality, false);
  assert.equal(ledger.semantics.chronologyCreatesAuthority, false);
});

test("entry mutation, removal, reorder and lineage/target tampering are detected independently", () => {
  const ledger = buildP88W08AutonomousAuditProjection(buildP88W08TestFixture().input);

  const mutated = structuredClone(ledger) as any;
  mutated.entries[2].evidence.proposalFingerprint = "0".repeat(64);
  assert.ok(p88W08AuditIntegrityIssues(mutated).includes("p88_w08_entry_fingerprint_mismatch"));

  const removed = structuredClone(ledger) as any;
  removed.entries.splice(2, 1);
  assert.ok(p88W08AuditIntegrityIssues(removed).length > 0);

  const reordered = structuredClone(ledger) as any;
  [reordered.entries[0], reordered.entries[1]] = [reordered.entries[1], reordered.entries[0]];
  const reorderIssues = p88W08AuditIntegrityIssues(reordered);
  assert.ok(
    reorderIssues.includes("p88_w08_entry_sequence_mismatch")
    || reorderIssues.includes("p88_w08_entry_chain_link_mismatch")
    || reorderIssues.includes("p88_w08_entry_order_mismatch"),
  );

  const lineage = structuredClone(ledger) as any;
  lineage.entries[0].lineage.policyActionId = "p88w03-action-foreign";
  assert.ok(p88W08AuditIntegrityIssues(lineage).includes("p88_w08_entry_lineage_mismatch"));

  const target = structuredClone(ledger) as any;
  target.entries[0].target.resourceGid = "gid://shopify/Product/999";
  assert.ok(p88W08AuditIntegrityIssues(target).includes("p88_w08_entry_target_mismatch"));
});

test("safety and semantics markers are integrity-bound", () => {
  const ledger = buildP88W08AutonomousAuditProjection(buildP88W08TestFixture().input);
  const safety = structuredClone(ledger) as any;
  safety.safety.providerWritePerformed = true;
  assert.ok(p88W08AuditIntegrityIssues(safety).includes("p88_w08_safety_marker_mismatch"));

  const semantics = structuredClone(ledger) as any;
  semantics.semantics.currentProviderStateInferred = true;
  assert.ok(p88W08AuditIntegrityIssues(semantics).includes("p88_w08_semantics_marker_mismatch"));
});

test("W08 capability is pure/default-off and authorizes no persistence, provider activity, execution, automation or publication", () => {
  const capability = p88W08AuditCapability();
  assert.equal(capability.databaseReadPerformed, false);
  assert.equal(capability.databaseWritePerformed, false);
  assert.equal(capability.schemaMutationPerformed, false);
  assert.equal(capability.persistencePerformed, false);
  assert.equal(capability.providerNetworkReadPerformed, false);
  assert.equal(capability.providerWritePerformed, false);
  assert.equal(capability.publicSiteWritePerformed, false);
  assert.equal(capability.rollbackWritePerformed, false);
  assert.equal(capability.task51ExecutionPerformed, false);
  assert.equal(capability.task53ExecutionPerformed, false);
  assert.equal(capability.task54ExecutionPerformed, false);
  assert.equal(capability.routeBound, false);
  assert.equal(capability.startupBound, false);
  assert.equal(capability.schedulerActivated, false);
  assert.equal(capability.workerActivated, false);
  assert.equal(capability.policyActivated, false);
  assert.equal(capability.autonomousExecutionAuthorized, false);
  assert.equal(capability.liveExecutionAuthorized, false);
  assert.equal(capability.credentialScopeChanged, false);
  assert.equal(capability.publicWriteGateChanged, false);
  assert.equal(capability.policyExecutionGateChanged, false);
  assert.equal(capability.deploymentPerformed, false);
  assert.equal(capability.publicationPerformed, false);
});

test("unsupported target drift cannot be normalized into the certified Product meta-description class", () => {
  const input = cloneInput();
  input.w07Intent.target.resourceKind = "collection";
  assert.throws(
    () => buildP88W08AutonomousAuditProjection(input),
    /p88_w08_w07_intent_integrity_mismatch/,
  );
});

test("W08 preserves exact W02-domain byte-sensitive verification values", () => {
  const fixture = buildP88W08TestFixture();
  assert.equal(fixture.intent.state.beforeValue, "Before  W07\nbytes");
  assert.equal(fixture.intent.state.afterValue, "After  W07\nbytes");
  const ledger = buildP88W08AutonomousAuditProjection(fixture.input);
  const verification = ledger.entries.find(
    (entry) => entry.source.system === "p8.8_w07_verification_evidence",
  )!;
  assert.equal(verification.evidence.providerObservedValue, "After  W07\nbytes");
  assert.equal(verification.evidence.storefrontObservedValue, "After  W07\nbytes");
});

test("invalid ledger fingerprint, missing chain links and duplicate sequence are detected", () => {
  const ledger = buildP88W08AutonomousAuditProjection(buildP88W08TestFixture().input);

  const fingerprint = structuredClone(ledger) as any;
  fingerprint.ledgerFingerprint = "f".repeat(64);
  assert.ok(p88W08AuditIntegrityIssues(fingerprint).includes("p88_w08_ledger_fingerprint_mismatch"));

  const link = structuredClone(ledger) as any;
  link.entries[1].previousEntryFingerprint = null;
  assert.ok(p88W08AuditIntegrityIssues(link).includes("p88_w08_entry_chain_link_mismatch"));

  const sequence = structuredClone(ledger) as any;
  sequence.entries[1].sequence = 1;
  assert.ok(p88W08AuditIntegrityIssues(sequence).includes("p88_w08_entry_sequence_mismatch"));
});

test("W08 semantics explicitly preserve replay and non-authority guarantees", () => {
  const semantics = p88W08AuditSemantics();
  assert.equal(semantics.exactPolicyActionLineageOnly, true);
  assert.equal(semantics.exactReplayCollapsed, true);
  assert.equal(semantics.conflictingReplayFailsClosed, true);
  assert.equal(semantics.siteTimeProximityCreatesControlLineage, false);
  assert.equal(semantics.chronologyCreatesExecutionPreference, false);
});
