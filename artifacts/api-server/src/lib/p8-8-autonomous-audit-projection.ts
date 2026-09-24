import { createHash } from "node:crypto";
import type { P88W05ControlEvent } from "./p8-8-mutation-control.js";
import { assertP88W05ControlEventIntegrity } from "./p8-8-mutation-control.js";
import type {
  P88W06ReservationSnapshot,
} from "./p8-8-policy-preflight.js";
import {
  P8_8_W07_EVENT_VERSION,
  assertP88W07Transition,
  p88W07StableHash,
  projectP88W07DispatchIntent,
  type P88W07DispatchIntent,
  type P88W07DispatchState,
  type P88W07LineageBundle,
  type P88W07PublicWriteOccurrence,
} from "./p8-8-policy-single-action-apply.js";
import type { P88W07DispatchRecord } from "./p8-8-policy-single-action-store.js";
import type { P88W07ProviderReadEvidence } from "./p8-8-policy-single-action-executor.js";
import type { P88W07StorefrontEvidence } from "./p8-8-policy-single-action-shopify.js";

export const P8_8_W08_VERSION = "p8-8-w08-autonomous-audit-projection-v1" as const;
export const P8_8_W08_MAX_ENTRIES = 4096 as const;

export type P88W08EventClass =
  | "policy"
  | "proposal"
  | "authorization"
  | "reservation"
  | "control"
  | "preflight"
  | "dispatch"
  | "verification"
  | "rollback"
  | "closure";

export type P88W08EventKind =
  | "policy_grant_effective"
  | "policy_evaluation_admitted"
  | "policy_evaluation_rejected"
  | "governed_proposal_materialized"
  | "policy_authorization_created"
  | "reservation_authorized"
  | "reservation_claimed"
  | "reservation_consumed"
  | "reservation_released"
  | "reservation_expired"
  | "reservation_manual_intervention"
  | "control_epoch_claimed"
  | "control_transition_observed"
  | "preflight_ready_for_w07"
  | "preflight_blocked_no_dispatch"
  | "preflight_provider_unavailable_no_dispatch"
  | "preflight_state_uncertain"
  | "dispatch_reserved_prewrite"
  | "dispatch_started"
  | "forward_rejected_no_write"
  | "forward_verification_pending"
  | "forward_verified_live"
  | "rollback_required"
  | "rollback_started"
  | "rollback_verification_pending"
  | "rollback_verified_closed"
  | "cancelled_before_dispatch"
  | "manual_intervention_required";

export type P88W08Target = Readonly<{
  siteId: string;
  provider: "shopify";
  domain: "diamondshelf.us";
  resourceKind: "product";
  resourceGid: string;
  targetUrl: string;
  actionType: "update_meta_description";
  field: "meta_description";
  beforeFingerprint: string;
  afterFingerprint: string;
}>;

export type P88W08Lineage = Readonly<{
  policyId: string;
  policyVersion: string;
  policyFingerprint: string;
  evaluationId: string;
  evaluationFingerprint: string;
  materializationId: string;
  materializationFingerprint: string;
  proposalId: string;
  proposalFingerprint: string;
  policyAuthorizationId: string;
  policyAuthorizationFingerprint: string;
  policyActionId: string;
  reservationId: string;
  reservationFingerprint: string;
  claimId: string;
  claimFingerprint: string;
  preflightId: string;
  preflightFingerprint: string;
  executionId: string;
  dispatchId: string;
  dispatchFingerprint: string;
}>;

export type P88W08DispatchEventEvidence = Readonly<{
  eventId: string;
  eventVersion: typeof P8_8_W07_EVENT_VERSION;
  eventFingerprint: string;
  dispatchId: string;
  siteId: string;
  fromRevision: number | null;
  fromState: P88W07DispatchState | null;
  toRevision: number;
  toState: P88W07DispatchState;
  transitionReason: string;
  providerRequestFingerprint: string | null;
  publicWriteOccurrence: P88W07PublicWriteOccurrence;
  rollbackOccurrence: P88W07PublicWriteOccurrence;
  effectiveAt: string;
}>;

export type P88W08VerificationEvidence = Readonly<{
  evidenceId: string;
  phase: "forward" | "rollback";
  occurredAt: string;
  verificationFingerprint: string;
  expectedFingerprint: string;
  provider: P88W07ProviderReadEvidence;
  storefront: P88W07StorefrontEvidence;
}>;

export type P88W08Input = Readonly<{
  referenceTime: string;
  w07DatabaseNow: string;
  w07Bundle: P88W07LineageBundle;
  w07Intent: P88W07DispatchIntent;
  reservationFinal: P88W06ReservationSnapshot;
  controlEvents?: readonly P88W05ControlEvent[];
  dispatch: P88W07DispatchRecord;
  dispatchEvents: readonly P88W08DispatchEventEvidence[];
  verificationEvidence?: readonly P88W08VerificationEvidence[];
}>;

export type P88W08AuditEntry = Readonly<{
  version: typeof P8_8_W08_VERSION;
  sequence: number;
  occurredAt: string;
  eventClass: P88W08EventClass;
  eventKind: P88W08EventKind;
  source: Readonly<{
    system: string;
    version: string;
    sourceId: string;
    sourceFingerprint: string | null;
  }>;
  sourceRevision: number | null;
  lineage: P88W08Lineage;
  target: P88W08Target;
  evidence: Readonly<Record<string, unknown>>;
  previousEntryFingerprint: string | null;
  entryFingerprint: string;
}>;

export type P88W08Summary = Readonly<{
  total: number;
  policy: number;
  proposal: number;
  authorization: number;
  reservation: number;
  control: number;
  preflight: number;
  dispatch: number;
  verification: number;
  rollback: number;
  closure: number;
  forwardAttemptCount: 0 | 1;
  rollbackAttemptCount: 0 | 1;
  manualInterventionCount: number;
  uncertainWriteCount: number;
  finalW07State: P88W07DispatchState;
}>;

export type P88W08AuditLedger = Readonly<{
  version: typeof P8_8_W08_VERSION;
  ledgerId: string;
  ledgerFingerprint: string;
  policyActionId: string;
  referenceTime: string;
  target: P88W08Target;
  lineage: P88W08Lineage;
  summary: P88W08Summary;
  firstEntryFingerprint: string | null;
  finalEntryFingerprint: string | null;
  entries: readonly P88W08AuditEntry[];
  semantics: ReturnType<typeof p88W08AuditSemantics>;
  safety: ReturnType<typeof p88W08AuditCapability>;
}>;

type Candidate = Omit<
  P88W08AuditEntry,
  "version" | "sequence" | "previousEntryFingerprint" | "entryFingerprint"
>;

const SHA256 = /^[0-9a-f]{64}$/;
const EXACT_ID = /^[A-Za-z0-9][A-Za-z0-9._:+\/-]{0,511}$/;

const CLASS_PRECEDENCE: Readonly<Record<P88W08EventClass, number>> = Object.freeze({
  policy: 10,
  proposal: 20,
  authorization: 30,
  reservation: 40,
  control: 50,
  preflight: 60,
  dispatch: 70,
  verification: 80,
  rollback: 90,
  closure: 100,
});

const KIND_PRECEDENCE: Readonly<Record<P88W08EventKind, number>> = Object.freeze({
  policy_grant_effective: 10,
  policy_evaluation_admitted: 20,
  policy_evaluation_rejected: 30,
  governed_proposal_materialized: 40,
  policy_authorization_created: 50,
  reservation_authorized: 60,
  reservation_claimed: 70,
  reservation_consumed: 80,
  reservation_released: 90,
  reservation_expired: 100,
  reservation_manual_intervention: 110,
  control_epoch_claimed: 120,
  control_transition_observed: 130,
  preflight_ready_for_w07: 140,
  preflight_blocked_no_dispatch: 150,
  preflight_provider_unavailable_no_dispatch: 160,
  preflight_state_uncertain: 170,
  dispatch_reserved_prewrite: 180,
  dispatch_started: 190,
  forward_rejected_no_write: 200,
  forward_verification_pending: 210,
  forward_verified_live: 220,
  rollback_required: 230,
  rollback_started: 240,
  rollback_verification_pending: 250,
  rollback_verified_closed: 260,
  cancelled_before_dispatch: 270,
  manual_intervention_required: 280,
});

const TERMINAL_W07 = new Set<P88W07DispatchState>([
  "forward_rejected_no_write",
  "forward_verified_live",
  "rollback_verified_closed",
  "cancelled_before_dispatch",
  "manual_intervention_required",
]);

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

function stableJson(value: unknown): string {
  return JSON.stringify(stable(value));
}

function hash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function canonicalIso(value: unknown, code: string): string {
  if (typeof value !== "string") throw new Error(code);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(code);
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) throw new Error(code);
  return canonical;
}

function exactId(value: unknown, code: string): string {
  if (typeof value !== "string" || value.trim() !== value || !EXACT_ID.test(value)) {
    throw new Error(code);
  }
  return value;
}

function fingerprint(value: unknown, code: string): string {
  if (typeof value !== "string" || !SHA256.test(value)) throw new Error(code);
  return value;
}

function nullableFingerprint(value: unknown, code: string): string | null {
  if (value === null) return null;
  return fingerprint(value, code);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function exactObjectEqual(left: unknown, right: unknown): boolean {
  return stableJson(left) === stableJson(right);
}

function lineageFor(intent: P88W07DispatchIntent): P88W08Lineage {
  return deepFreeze({
    policyId: intent.policy.policyId,
    policyVersion: intent.policy.policyVersion,
    policyFingerprint: intent.policy.policyFingerprint,
    evaluationId: intent.lineage.evaluationId,
    evaluationFingerprint: intent.lineage.evaluationFingerprint,
    materializationId: intent.lineage.materializationId,
    materializationFingerprint: intent.lineage.materializationFingerprint,
    proposalId: intent.lineage.proposalId,
    proposalFingerprint: intent.lineage.proposalFingerprint,
    policyAuthorizationId: intent.lineage.w03AuthorizationId,
    policyAuthorizationFingerprint: intent.lineage.w03AuthorizationFingerprint,
    policyActionId: intent.lineage.policyActionId,
    reservationId: intent.lineage.reservationId,
    reservationFingerprint: intent.lineage.reservationFingerprint,
    claimId: intent.lineage.claimId,
    claimFingerprint: intent.lineage.claimFingerprint,
    preflightId: intent.lineage.w06PreflightId,
    preflightFingerprint: intent.lineage.w06PreflightFingerprint,
    executionId: intent.executionId,
    dispatchId: intent.dispatchId,
    dispatchFingerprint: intent.dispatchFingerprint,
  });
}

function targetFor(intent: P88W07DispatchIntent): P88W08Target {
  return deepFreeze({
    siteId: intent.siteId,
    provider: intent.target.provider,
    domain: intent.target.domain,
    resourceKind: intent.target.resourceKind,
    resourceGid: intent.target.resourceGid,
    targetUrl: intent.target.targetUrl,
    actionType: intent.target.actionType,
    field: intent.target.field,
    beforeFingerprint: intent.state.beforeFingerprint,
    afterFingerprint: intent.state.afterFingerprint,
  });
}

function assertReservationBinding(
  reservation: P88W06ReservationSnapshot,
  intent: P88W07DispatchIntent,
): void {
  if (
    reservation.reservationId !== intent.lineage.reservationId
    || reservation.reservationFingerprint !== intent.lineage.reservationFingerprint
    || reservation.siteId !== intent.siteId
    || reservation.policyId !== intent.policy.policyId
    || reservation.policyVersion !== intent.policy.policyVersion
    || reservation.policyFingerprint !== intent.policy.policyFingerprint
    || reservation.evaluationId !== intent.lineage.evaluationId
    || reservation.evaluationFingerprint !== intent.lineage.evaluationFingerprint
    || reservation.materializationId !== intent.lineage.materializationId
    || reservation.materializationFingerprint !== intent.lineage.materializationFingerprint
    || reservation.proposalId !== intent.lineage.proposalId
    || reservation.proposalFingerprint !== intent.lineage.proposalFingerprint
    || reservation.w03AuthorizationId !== intent.lineage.w03AuthorizationId
    || reservation.w03AuthorizationFingerprint !== intent.lineage.w03AuthorizationFingerprint
    || reservation.policyActionId !== intent.lineage.policyActionId
    || reservation.resourceGid !== intent.target.resourceGid
    || reservation.targetUrl !== intent.target.targetUrl
    || reservation.field !== intent.target.field
    || reservation.beforeFingerprint !== intent.state.beforeFingerprint
    || reservation.afterFingerprint !== intent.state.afterFingerprint
  ) {
    throw new Error("p88_w08_reservation_lineage_mismatch");
  }
  canonicalIso(reservation.authorizedAt, "p88_w08_reservation_authorized_at_invalid");
  canonicalIso(reservation.expiresAt, "p88_w08_reservation_expires_at_invalid");
  if (reservation.claimedAt !== null) {
    canonicalIso(reservation.claimedAt, "p88_w08_reservation_claimed_at_invalid");
  }
  if (reservation.terminalAt !== null) {
    canonicalIso(reservation.terminalAt, "p88_w08_reservation_terminal_at_invalid");
  }
}

function expectedReservationStatus(state: P88W07DispatchState) {
  if (state === "cancelled_before_dispatch") return "released" as const;
  if (
    state === "forward_rejected_no_write"
    || state === "forward_verified_live"
    || state === "rollback_verified_closed"
  ) return "consumed" as const;
  if (state === "manual_intervention_required") return "manual_intervention" as const;
  return "claimed" as const;
}

function assertReservationClosure(
  reservation: P88W06ReservationSnapshot,
  dispatch: P88W07DispatchRecord,
): void {
  const expected = expectedReservationStatus(dispatch.state);
  if (reservation.status !== expected) {
    throw new Error("p88_w08_reservation_status_mismatch");
  }
  if (expected === "manual_intervention") {
    if (reservation.terminalAt !== null) {
      throw new Error("p88_w08_manual_reservation_terminal_timestamp_forbidden");
    }
  } else if (expected === "released" || expected === "consumed") {
    if (reservation.terminalAt === null || dispatch.terminalAt !== reservation.terminalAt) {
      throw new Error("p88_w08_reservation_terminal_timestamp_mismatch");
    }
  } else if (reservation.terminalAt !== null) {
    throw new Error("p88_w08_nonterminal_reservation_terminal_timestamp");
  }
}

function dispatchEventFingerprint(event: Omit<P88W08DispatchEventEvidence, "eventFingerprint">): string {
  return p88W07StableHash({
    version: P8_8_W07_EVENT_VERSION,
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
}

function normalizeDispatchEvent(event: P88W08DispatchEventEvidence): P88W08DispatchEventEvidence {
  if (event.eventVersion !== P8_8_W07_EVENT_VERSION) {
    throw new Error("p88_w08_dispatch_event_version_mismatch");
  }
  const eventFingerprint = fingerprint(
    event.eventFingerprint,
    "p88_w08_dispatch_event_fingerprint_invalid",
  );
  const normalized: Omit<P88W08DispatchEventEvidence, "eventFingerprint"> = {
    eventId: exactId(event.eventId, "p88_w08_dispatch_event_id_invalid"),
    eventVersion: event.eventVersion,
    dispatchId: exactId(event.dispatchId, "p88_w08_dispatch_id_invalid"),
    siteId: exactId(event.siteId, "p88_w08_dispatch_event_site_invalid"),
    fromRevision: event.fromRevision,
    fromState: event.fromState,
    toRevision: event.toRevision,
    toState: event.toState,
    transitionReason: exactId(event.transitionReason, "p88_w08_dispatch_transition_reason_invalid"),
    providerRequestFingerprint: nullableFingerprint(
      event.providerRequestFingerprint,
      "p88_w08_dispatch_request_fingerprint_invalid",
    ),
    publicWriteOccurrence: event.publicWriteOccurrence,
    rollbackOccurrence: event.rollbackOccurrence,
    effectiveAt: canonicalIso(event.effectiveAt, "p88_w08_dispatch_event_timestamp_invalid"),
  };

  const expected = dispatchEventFingerprint(normalized);
  if (expected !== eventFingerprint) {
    throw new Error("p88_w08_dispatch_event_fingerprint_mismatch");
  }
  return deepFreeze({ ...normalized, eventFingerprint });
}

function dedupeDispatchEvents(
  events: readonly P88W08DispatchEventEvidence[],
): P88W08DispatchEventEvidence[] {
  const byId = new Map<string, P88W08DispatchEventEvidence>();
  for (const supplied of events) {
    const event = normalizeDispatchEvent(supplied);
    const existing = byId.get(event.eventId);
    if (existing && !exactObjectEqual(existing, event)) {
      throw new Error("p88_w08_source_replay_conflict");
    }
    byId.set(event.eventId, event);
  }
  return [...byId.values()].sort((left, right) =>
    left.toRevision - right.toRevision || left.eventFingerprint.localeCompare(right.eventFingerprint)
  );
}

function assertDispatchChain(
  intent: P88W07DispatchIntent,
  dispatch: P88W07DispatchRecord,
  events: readonly P88W08DispatchEventEvidence[],
): void {
  if (
    dispatch.dispatchId !== intent.dispatchId
    || dispatch.dispatchFingerprint !== intent.dispatchFingerprint
    || dispatch.executionId !== intent.executionId
    || dispatch.siteId !== intent.siteId
  ) {
    throw new Error("p88_w08_dispatch_identity_mismatch");
  }
  if (
    !Number.isInteger(dispatch.rowRevision)
    || dispatch.rowRevision < 1
    || (dispatch.forwardAttemptCount !== 0 && dispatch.forwardAttemptCount !== 1)
    || (dispatch.rollbackAttemptCount !== 0 && dispatch.rollbackAttemptCount !== 1)
  ) {
    throw new Error("p88_w08_dispatch_attempt_or_revision_invalid");
  }
  canonicalIso(dispatch.reservedAt, "p88_w08_dispatch_reserved_at_invalid");
  if (dispatch.dispatchStartedAt !== null) {
    canonicalIso(dispatch.dispatchStartedAt, "p88_w08_dispatch_started_at_invalid");
  }
  if (dispatch.rollbackStartedAt !== null) {
    canonicalIso(dispatch.rollbackStartedAt, "p88_w08_rollback_started_at_invalid");
  }
  if (dispatch.terminalAt !== null) {
    canonicalIso(dispatch.terminalAt, "p88_w08_dispatch_terminal_at_invalid");
  }
  if (events.length === 0) throw new Error("p88_w08_dispatch_events_required");

  const first = events[0]!;
  if (
    first.dispatchId !== intent.dispatchId
    || first.siteId !== intent.siteId
    || first.fromRevision !== null
    || first.fromState !== null
    || first.toRevision !== 1
    || first.toState !== "reserved_prewrite"
    || first.effectiveAt !== dispatch.reservedAt
  ) {
    throw new Error("p88_w08_dispatch_initial_event_mismatch");
  }

  for (let index = 1; index < events.length; index += 1) {
    const prior = events[index - 1]!;
    const event = events[index]!;
    if (
      event.dispatchId !== intent.dispatchId
      || event.siteId !== intent.siteId
      || event.fromRevision !== prior.toRevision
      || event.fromState !== prior.toState
      || event.toRevision !== prior.toRevision + 1
    ) {
      throw new Error("p88_w08_dispatch_revision_chain_mismatch");
    }
    assertP88W07Transition(prior.toState, event.toState);
  }

  const last = events.at(-1)!;
  if (dispatch.rowRevision !== last.toRevision || dispatch.state !== last.toState) {
    throw new Error("p88_w08_dispatch_terminal_projection_mismatch");
  }

  const forwardStarted = events.find((event) => event.toState === "dispatch_started") ?? null;
  const rollbackStarted = events.find((event) => event.toState === "rollback_started") ?? null;
  if (dispatch.forwardAttemptCount !== (forwardStarted ? 1 : 0)) {
    throw new Error("p88_w08_forward_attempt_count_mismatch");
  }
  if (dispatch.rollbackAttemptCount !== (rollbackStarted ? 1 : 0)) {
    throw new Error("p88_w08_rollback_attempt_count_mismatch");
  }
  if ((dispatch.dispatchStartedAt ?? null) !== (forwardStarted?.effectiveAt ?? null)) {
    throw new Error("p88_w08_dispatch_started_timestamp_mismatch");
  }
  if ((dispatch.rollbackStartedAt ?? null) !== (rollbackStarted?.effectiveAt ?? null)) {
    throw new Error("p88_w08_rollback_started_timestamp_mismatch");
  }
  if (
    dispatch.publicWriteOccurrence !== last.publicWriteOccurrence
    || dispatch.rollbackOccurrence !== last.rollbackOccurrence
  ) {
    throw new Error("p88_w08_dispatch_occurrence_mismatch");
  }
  const terminalEvent = TERMINAL_W07.has(last.toState) ? last : null;
  if ((dispatch.terminalAt ?? null) !== (terminalEvent?.effectiveAt ?? null)) {
    throw new Error("p88_w08_dispatch_terminal_timestamp_mismatch");
  }
  if (
    (dispatch.state === "forward_verified_live" || dispatch.state === "rollback_verified_closed")
    && dispatch.verificationFingerprint === null
  ) {
    throw new Error("p88_w08_verified_state_without_verification_fingerprint");
  }
}

function controlEventsBoundToClaim(
  input: P88W08Input,
): P88W05ControlEvent[] {
  const claim = input.w07Bundle.w06Lineage.w05ClaimReceipt;
  const byId = new Map<string, P88W05ControlEvent>();
  for (const supplied of input.controlEvents ?? []) {
    assertP88W05ControlEventIntegrity(supplied);
    const bound =
      supplied.siteId === claim.siteId
      && (
        (
          supplied.toRevision === claim.controlRevision
          && supplied.toControlFingerprint === claim.controlFingerprint
        )
        || (
          supplied.fromRevision === claim.controlRevision
          && supplied.fromControlFingerprint === claim.controlFingerprint
        )
      );
    if (!bound) throw new Error("p88_w08_unbound_control_event");
    const existing = byId.get(supplied.eventId);
    if (existing && !exactObjectEqual(existing, supplied)) {
      throw new Error("p88_w08_source_replay_conflict");
    }
    byId.set(supplied.eventId, supplied);
  }
  return [...byId.values()];
}

function eventClassForW07(state: P88W07DispatchState): P88W08EventClass {
  if (state === "reserved_prewrite" || state === "dispatch_started") return "dispatch";
  if (state === "forward_verification_pending" || state === "forward_verified_live") {
    return "verification";
  }
  if (
    state === "rollback_required"
    || state === "rollback_started"
    || state === "rollback_verification_pending"
    || state === "rollback_verified_closed"
  ) return "rollback";
  return "closure";
}

function kindForW07(state: P88W07DispatchState): P88W08EventKind {
  if (state === "reserved_prewrite") return "dispatch_reserved_prewrite";
  return state;
}

function preflightKind(
  disposition: P88W07LineageBundle["w06Preflight"]["disposition"],
): P88W08EventKind {
  if (disposition === "ready_for_w07") return "preflight_ready_for_w07";
  if (disposition === "blocked_no_dispatch") return "preflight_blocked_no_dispatch";
  if (disposition === "provider_read_unavailable_no_dispatch") {
    return "preflight_provider_unavailable_no_dispatch";
  }
  return "preflight_state_uncertain";
}

function candidate(
  base: Candidate,
  referenceTime: string,
): Candidate {
  if (canonicalIso(base.occurredAt, "p88_w08_event_timestamp_invalid") > referenceTime) {
    throw new Error("p88_w08_event_after_reference_time");
  }
  return deepFreeze(base);
}

function buildCandidates(
  input: P88W08Input,
  intent: P88W07DispatchIntent,
  dispatchEvents: readonly P88W08DispatchEventEvidence[],
  controls: readonly P88W05ControlEvent[],
  lineage: P88W08Lineage,
  target: P88W08Target,
  referenceTime: string,
): Candidate[] {
  const source = input.w07Bundle.w06Lineage;
  const w01Input = source.w01EvaluationInput;
  const w01 = source.w01Evaluation;
  const w02 = source.w02Materialization;
  const w03 = source.w03Authorization;
  const w05 = source.w05ClaimReceipt;
  const w06 = input.w07Bundle.w06Preflight;
  const reservation = input.reservationFinal;
  const candidates: Candidate[] = [];

  const add = (entry: Omit<Candidate, "lineage" | "target">) =>
    candidates.push(candidate({ ...entry, lineage, target }, referenceTime));

  add({
    occurredAt: w01Input.grant.activationTime,
    eventClass: "policy",
    eventKind: "policy_grant_effective",
    source: {
      system: "p8.8_w01_policy_grant",
      version: w01Input.grant.version,
      sourceId: w01Input.grant.policyId + ":" + w01Input.grant.policyVersion,
      sourceFingerprint: w01Input.grant.policyFingerprint,
    },
    sourceRevision: null,
    evidence: {
      policyClass: w01Input.grant.policyClass,
      policyStage: w01Input.grant.policyStage,
      expiryTime: w01Input.grant.expiryTime,
      revoked: w01Input.grant.revoked,
    },
  });

  add({
    occurredAt: w01.referenceTime,
    eventClass: "policy",
    eventKind: w01.decision === "admit" ? "policy_evaluation_admitted" : "policy_evaluation_rejected",
    source: {
      system: "p8.8_w01_policy_evaluation",
      version: w01.version,
      sourceId: w01.evaluationId,
      sourceFingerprint: w01.evaluationFingerprint,
    },
    sourceRevision: null,
    evidence: {
      decision: w01.decision,
      rejectionReasons: [...w01.rejectionReasons],
      evaluationExpiresAt: w01.evaluationExpiresAt,
      recommendationFingerprint: w01.recommendation.recommendationFingerprint,
      proposalFingerprint: w01.proposal.proposalFingerprint,
    },
  });

  add({
    occurredAt: w02.referenceTime,
    eventClass: "proposal",
    eventKind: "governed_proposal_materialized",
    source: {
      system: "p8.8_w02_governed_proposal",
      version: w02.version,
      sourceId: w02.materializationId,
      sourceFingerprint: w02.materializationFingerprint,
    },
    sourceRevision: null,
    evidence: {
      materializationIdempotencyFingerprint: w02.materializationIdempotencyFingerprint,
      proposalId: w02.proposalId,
      proposalFingerprint: w02.proposalFingerprint,
      recommendationId: w02.recommendation.recommendationId,
      recommendationFingerprint: w02.recommendation.recommendationFingerprint,
      previewId: w02.preview.previewId,
      previewFingerprint: w02.preview.previewFingerprint,
      targetBindingFingerprint: w02.target.targetBindingFingerprint,
      beforeFingerprint: w02.before.fingerprint,
      afterFingerprint: w02.after.fingerprint,
    },
  });

  add({
    occurredAt: w03.issuedAt,
    eventClass: "authorization",
    eventKind: "policy_authorization_created",
    source: {
      system: "p8.8_w03_policy_authorization",
      version: w03.version,
      sourceId: w03.policyAuthorizationId,
      sourceFingerprint: w03.policyAuthorizationFingerprint,
    },
    sourceRevision: null,
    evidence: {
      authorizationProvenance: w03.authorizationProvenance,
      expiresAt: w03.expiresAt,
      reservationDescriptorFingerprint: w03.reservation.descriptorFingerprint,
      persistedActionId: w03.persistedActionId,
      persistedActionCreated: w03.persistedActionCreated,
    },
  });

  add({
    occurredAt: reservation.authorizedAt,
    eventClass: "reservation",
    eventKind: "reservation_authorized",
    source: {
      system: "p8.8_w04_reservation",
      version: reservation.reservationVersion,
      sourceId: reservation.reservationId + ":authorized",
      sourceFingerprint: reservation.reservationFingerprint,
    },
    sourceRevision: null,
    evidence: {
      status: "authorized",
      expiresAt: reservation.expiresAt,
    },
  });

  if (reservation.claimedAt !== null) {
    add({
      occurredAt: reservation.claimedAt,
      eventClass: "reservation",
      eventKind: "reservation_claimed",
      source: {
        system: "p8.8_w04_reservation",
        version: reservation.reservationVersion,
        sourceId: reservation.reservationId + ":claimed",
        sourceFingerprint: reservation.reservationFingerprint,
      },
      sourceRevision: null,
      evidence: { status: "claimed" },
    });
  }

  if (reservation.terminalAt !== null) {
    const kindByStatus = {
      consumed: "reservation_consumed",
      released: "reservation_released",
      expired: "reservation_expired",
    } as const;
    if (reservation.status in kindByStatus) {
      add({
        occurredAt: reservation.terminalAt,
        eventClass: "reservation",
        eventKind: kindByStatus[reservation.status as keyof typeof kindByStatus],
        source: {
          system: "p8.8_w04_reservation",
          version: reservation.reservationVersion,
          sourceId: reservation.reservationId + ":" + reservation.status,
          sourceFingerprint: reservation.reservationFingerprint,
        },
        sourceRevision: null,
        evidence: {
          status: reservation.status,
          terminalReason: reservation.terminalReason,
        },
      });
    }
  }

  add({
    occurredAt: w05.claimedAt,
    eventClass: "control",
    eventKind: "control_epoch_claimed",
    source: {
      system: "p8.8_w05_claim",
      version: w05.version,
      sourceId: w05.claimId,
      sourceFingerprint: w05.claimFingerprint,
    },
    sourceRevision: w05.controlRevision,
    evidence: {
      controlRevision: w05.controlRevision,
      controlFingerprint: w05.controlFingerprint,
      receiptFingerprint: w05.receiptFingerprint,
    },
  });

  for (const control of controls) {
    add({
      occurredAt: control.effectiveAt,
      eventClass: "control",
      eventKind: "control_transition_observed",
      source: {
        system: "p8.8_w05_control_event",
        version: control.version,
        sourceId: control.eventId,
        sourceFingerprint: control.eventFingerprint,
      },
      sourceRevision: control.toRevision,
      evidence: {
        fromRevision: control.fromRevision,
        fromControlFingerprint: control.fromControlFingerprint,
        fromMode: control.fromMode,
        action: control.action,
        toRevision: control.toRevision,
        toControlFingerprint: control.toControlFingerprint,
        toMode: control.toMode,
      },
    });
  }

  add({
    occurredAt: w06.validatedAt,
    eventClass: "preflight",
    eventKind: preflightKind(w06.disposition),
    source: {
      system: "p8.8_w06_policy_preflight",
      version: w06.version,
      sourceId: w06.preflightId,
      sourceFingerprint: w06.preflightFingerprint,
    },
    sourceRevision: w06.claimedControl.revision,
    evidence: {
      disposition: w06.disposition,
      blockers: [...w06.blockers],
      preflightExpiresAt: w06.preflightExpiresAt,
      providerObservationStatus: w06.providerObservation.status,
      providerObservationFingerprint: w06.providerObservation.observationFingerprint,
      noDispatchProofFingerprint: w06.noDispatchProof.proofFingerprint,
      claimReleaseEligibility: w06.claimReleaseEligibility,
    },
  });

  for (const event of dispatchEvents) {
    add({
      occurredAt: event.effectiveAt,
      eventClass: eventClassForW07(event.toState),
      eventKind: kindForW07(event.toState),
      source: {
        system: "p8.8_w07_dispatch_event",
        version: event.eventVersion,
        sourceId: event.eventId,
        sourceFingerprint: event.eventFingerprint,
      },
      sourceRevision: event.toRevision,
      evidence: {
        dispatchId: event.dispatchId,
        fromRevision: event.fromRevision,
        fromState: event.fromState,
        toRevision: event.toRevision,
        toState: event.toState,
        transitionReason: event.transitionReason,
        providerRequestFingerprint: event.providerRequestFingerprint,
        publicWriteOccurrence: event.publicWriteOccurrence,
        rollbackOccurrence: event.rollbackOccurrence,
        dispatchVerificationFingerprint: input.dispatch.verificationFingerprint,
        providerResponseFingerprint: input.dispatch.providerResponseFingerprint,
      },
    });
  }

  return candidates;
}

function sourceIdentity(candidate: Pick<Candidate, "source">): string {
  return [
    candidate.source.system,
    candidate.source.version,
    candidate.source.sourceId,
  ].join("\u0000");
}

function dedupeCandidates(candidates: readonly Candidate[]): Candidate[] {
  const map = new Map<string, Candidate>();
  for (const candidate of candidates) {
    const identity = sourceIdentity(candidate);
    const existing = map.get(identity);
    if (existing && !exactObjectEqual(existing, candidate)) {
      throw new Error("p88_w08_source_replay_conflict");
    }
    map.set(identity, candidate);
  }
  return [...map.values()];
}

function compareCandidates(left: Candidate, right: Candidate): number {
  const byTime = left.occurredAt.localeCompare(right.occurredAt);
  if (byTime !== 0) return byTime;

  const leftW07 = left.source.system === "p8.8_w07_dispatch_event";
  const rightW07 = right.source.system === "p8.8_w07_dispatch_event";
  if (leftW07 && rightW07) {
    const byRevision = (left.sourceRevision ?? 0) - (right.sourceRevision ?? 0);
    if (byRevision !== 0) return byRevision;
  }

  return CLASS_PRECEDENCE[left.eventClass] - CLASS_PRECEDENCE[right.eventClass]
    || KIND_PRECEDENCE[left.eventKind] - KIND_PRECEDENCE[right.eventKind]
    || (left.sourceRevision ?? 0) - (right.sourceRevision ?? 0)
    || (left.source.sourceFingerprint ?? "").localeCompare(
      right.source.sourceFingerprint ?? "",
    )
    || left.source.sourceId.localeCompare(right.source.sourceId);
}

function entryFingerprintPayload(
  entry: Omit<P88W08AuditEntry, "entryFingerprint">,
): unknown {
  return entry;
}

function materializeEntry(
  candidateValue: Candidate,
  sequence: number,
  previousEntryFingerprint: string | null,
): P88W08AuditEntry {
  const withoutFingerprint = {
    version: P8_8_W08_VERSION,
    sequence,
    ...candidateValue,
    previousEntryFingerprint,
  } as const;
  return deepFreeze({
    ...withoutFingerprint,
    entryFingerprint: hash(entryFingerprintPayload(withoutFingerprint)),
  });
}

function summaryFor(entries: readonly P88W08AuditEntry[]): P88W08Summary {
  const w07 = entries.filter((entry) => entry.source.system === "p8.8_w07_dispatch_event");
  const final = w07.at(-1);
  if (!final) throw new Error("p88_w08_dispatch_projection_missing");
  const finalState = final.evidence.toState as P88W07DispatchState;
  const forwardAttemptCount = w07.some((entry) => entry.eventKind === "dispatch_started") ? 1 : 0;
  const rollbackAttemptCount = w07.some((entry) => entry.eventKind === "rollback_started") ? 1 : 0;
  const uncertainWriteCount = entries.filter((entry) =>
    entry.evidence.publicWriteOccurrence === "possible"
    || entry.evidence.disposition === "state_uncertain"
    || entry.evidence.providerObservationStatus === "unavailable"
  ).length;
  return deepFreeze({
    total: entries.length,
    policy: entries.filter((entry) => entry.eventClass === "policy").length,
    proposal: entries.filter((entry) => entry.eventClass === "proposal").length,
    authorization: entries.filter((entry) => entry.eventClass === "authorization").length,
    reservation: entries.filter((entry) => entry.eventClass === "reservation").length,
    control: entries.filter((entry) => entry.eventClass === "control").length,
    preflight: entries.filter((entry) => entry.eventClass === "preflight").length,
    dispatch: entries.filter((entry) => entry.eventClass === "dispatch").length,
    verification: entries.filter((entry) => entry.eventClass === "verification").length,
    rollback: entries.filter((entry) => entry.eventClass === "rollback").length,
    closure: entries.filter((entry) => entry.eventClass === "closure").length,
    forwardAttemptCount: forwardAttemptCount as 0 | 1,
    rollbackAttemptCount: rollbackAttemptCount as 0 | 1,
    manualInterventionCount: entries.filter(
      (entry) => entry.eventKind === "manual_intervention_required",
    ).length,
    uncertainWriteCount,
    finalW07State: finalState,
  });
}

export function p88W08AuditSemantics() {
  return Object.freeze({
    callerSuppliedProjectionOnly: true,
    exactPolicyActionLineageOnly: true,
    policySpecificAuthorityNamespacesPreserved: true,
    exactReplayCollapsed: true,
    conflictingReplayFailsClosed: true,
    deterministicChronology: true,
    appendOnlyProjection: true,
    hashChainedEntries: true,
    neighboringEventsDoNotFillGaps: true,
    unavailableAndUncertainPreserved: true,
    manualInterventionPreserved: true,
    w04TransitionsInvented: false,
    siteTimeProximityCreatesControlLineage: false,
    chronologyCreatesAuthority: false,
    chronologyCreatesCausality: false,
    chronologyCreatesPriority: false,
    chronologyCreatesRisk: false,
    chronologyCreatesExecutionPreference: false,
    currentProviderStateInferred: false,
    executionSuccessInferred: false,
    recommendationQualityInferred: false,
    causalImpactInferred: false,
    humanApprovalFabricated: false,
    humanActionFabricated: false,
    humanDeploymentFabricated: false,
  });
}

export function p88W08AuditCapability() {
  return Object.freeze({
    version: P8_8_W08_VERSION,
    deterministicProjectionOnly: true,
    readOnlyArchitectureOnly: true,
    databaseReadPerformed: false,
    databaseWritePerformed: false,
    schemaMutationPerformed: false,
    persistencePerformed: false,
    providerNetworkReadPerformed: false,
    providerWritePerformed: false,
    publicSiteWritePerformed: false,
    rollbackWritePerformed: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    routeBound: false,
    startupBound: false,
    schedulerActivated: false,
    workerActivated: false,
    policyActivated: false,
    autonomousExecutionAuthorized: false,
    liveExecutionAuthorized: false,
    credentialScopeChanged: false,
    publicWriteGateChanged: false,
    policyExecutionGateChanged: false,
    deploymentPerformed: false,
    publicationPerformed: false,
  });
}

function ledgerFingerprintPayload(
  ledger: Omit<P88W08AuditLedger, "ledgerId" | "ledgerFingerprint">,
): unknown {
  return ledger;
}

export function buildP88W08AutonomousAuditProjection(
  input: P88W08Input,
): P88W08AuditLedger {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("p88_w08_invalid_input");
  }
  const referenceTime = canonicalIso(input.referenceTime, "p88_w08_reference_time_invalid");

  const rebuiltIntent = projectP88W07DispatchIntent({
    bundle: input.w07Bundle,
    databaseNow: canonicalIso(
      input.w07DatabaseNow,
      "p88_w08_w07_database_now_invalid",
    ),
  });
  if (!exactObjectEqual(rebuiltIntent, input.w07Intent)) {
    throw new Error("p88_w08_w07_intent_integrity_mismatch");
  }

  const intent = rebuiltIntent;
  const lineage = lineageFor(intent);
  const target = targetFor(intent);

  assertReservationBinding(input.reservationFinal, intent);
  const dispatchEvents = dedupeDispatchEvents(input.dispatchEvents);
  assertDispatchChain(intent, input.dispatch, dispatchEvents);
  assertReservationClosure(input.reservationFinal, input.dispatch);
  const controls = controlEventsBoundToClaim(input);

  const candidates = dedupeCandidates(
    buildCandidates(
      input,
      intent,
      dispatchEvents,
      controls,
      lineage,
      target,
      referenceTime,
    ),
  );
  if (candidates.length > P8_8_W08_MAX_ENTRIES) {
    throw new Error("p88_w08_entry_limit_exceeded");
  }
  candidates.sort(compareCandidates);

  const entries: P88W08AuditEntry[] = [];
  let previousEntryFingerprint: string | null = null;
  for (let index = 0; index < candidates.length; index += 1) {
    const entry = materializeEntry(candidates[index]!, index + 1, previousEntryFingerprint);
    entries.push(entry);
    previousEntryFingerprint = entry.entryFingerprint;
  }

  const summary = summaryFor(entries);
  if (
    summary.forwardAttemptCount !== input.dispatch.forwardAttemptCount
    || summary.rollbackAttemptCount !== input.dispatch.rollbackAttemptCount
    || summary.finalW07State !== input.dispatch.state
  ) {
    throw new Error("p88_w08_summary_dispatch_mismatch");
  }

  const semantics = p88W08AuditSemantics();
  const safety = p88W08AuditCapability();
  const withoutIdentity = {
    version: P8_8_W08_VERSION,
    policyActionId: lineage.policyActionId,
    referenceTime,
    target,
    lineage,
    summary,
    firstEntryFingerprint: entries[0]?.entryFingerprint ?? null,
    finalEntryFingerprint: entries.at(-1)?.entryFingerprint ?? null,
    entries: deepFreeze(entries),
    semantics,
    safety,
  } as const;
  const ledgerFingerprint = hash(ledgerFingerprintPayload(withoutIdentity));
  return deepFreeze({
    ...withoutIdentity,
    ledgerId: "p88w08-ledger-" + ledgerFingerprint.slice(0, 24),
    ledgerFingerprint,
  });
}

function compareEntries(left: P88W08AuditEntry, right: P88W08AuditEntry): number {
  return compareCandidates({
    occurredAt: left.occurredAt,
    eventClass: left.eventClass,
    eventKind: left.eventKind,
    source: left.source,
    sourceRevision: left.sourceRevision,
    lineage: left.lineage,
    target: left.target,
    evidence: left.evidence,
  }, {
    occurredAt: right.occurredAt,
    eventClass: right.eventClass,
    eventKind: right.eventKind,
    source: right.source,
    sourceRevision: right.sourceRevision,
    lineage: right.lineage,
    target: right.target,
    evidence: right.evidence,
  });
}

export function p88W08AuditIntegrityIssues(
  ledger: P88W08AuditLedger,
): string[] {
  const issues: string[] = [];
  if (ledger.version !== P8_8_W08_VERSION) issues.push("p88_w08_version_mismatch");
  if (!SHA256.test(ledger.ledgerFingerprint)) issues.push("p88_w08_ledger_fingerprint_invalid");
  if (ledger.ledgerId !== "p88w08-ledger-" + ledger.ledgerFingerprint.slice(0, 24)) {
    issues.push("p88_w08_ledger_id_mismatch");
  }
  if (ledger.policyActionId !== ledger.lineage.policyActionId) {
    issues.push("p88_w08_policy_action_lineage_mismatch");
  }

  let previous: string | null = null;
  for (let index = 0; index < ledger.entries.length; index += 1) {
    const entry = ledger.entries[index]!;
    if (entry.sequence !== index + 1) issues.push("p88_w08_entry_sequence_mismatch");
    if (entry.previousEntryFingerprint !== previous) {
      issues.push("p88_w08_entry_chain_link_mismatch");
    }
    if (!exactObjectEqual(entry.lineage, ledger.lineage)) {
      issues.push("p88_w08_entry_lineage_mismatch");
    }
    if (!exactObjectEqual(entry.target, ledger.target)) {
      issues.push("p88_w08_entry_target_mismatch");
    }
    const { entryFingerprint, ...withoutFingerprint } = entry;
    if (hash(entryFingerprintPayload(withoutFingerprint)) !== entryFingerprint) {
      issues.push("p88_w08_entry_fingerprint_mismatch");
    }
    if (index > 0 && compareEntries(ledger.entries[index - 1]!, entry) > 0) {
      issues.push("p88_w08_entry_order_mismatch");
    }
    previous = entry.entryFingerprint;
  }

  if ((ledger.entries[0]?.entryFingerprint ?? null) !== ledger.firstEntryFingerprint) {
    issues.push("p88_w08_first_entry_fingerprint_mismatch");
  }
  if ((ledger.entries.at(-1)?.entryFingerprint ?? null) !== ledger.finalEntryFingerprint) {
    issues.push("p88_w08_final_entry_fingerprint_mismatch");
  }

  try {
    if (!exactObjectEqual(summaryFor(ledger.entries), ledger.summary)) {
      issues.push("p88_w08_summary_mismatch");
    }
  } catch {
    issues.push("p88_w08_summary_invalid");
  }

  const dispatchEntries = ledger.entries
    .filter((entry) => entry.source.system === "p8.8_w07_dispatch_event")
    .sort((left, right) => (left.sourceRevision ?? 0) - (right.sourceRevision ?? 0));
  for (let index = 0; index < dispatchEntries.length; index += 1) {
    const entry = dispatchEntries[index]!;
    const toRevision = entry.evidence.toRevision;
    const toState = entry.evidence.toState as P88W07DispatchState;
    if (toRevision !== index + 1) issues.push("p88_w08_dispatch_revision_chain_mismatch");
    if (index === 0) {
      if (
        entry.evidence.fromRevision !== null
        || entry.evidence.fromState !== null
        || toState !== "reserved_prewrite"
      ) issues.push("p88_w08_dispatch_initial_event_mismatch");
    } else {
      const prior = dispatchEntries[index - 1]!;
      if (
        entry.evidence.fromRevision !== prior.evidence.toRevision
        || entry.evidence.fromState !== prior.evidence.toState
      ) {
        issues.push("p88_w08_dispatch_revision_chain_mismatch");
      } else {
        try {
          assertP88W07Transition(
            prior.evidence.toState as P88W07DispatchState,
            toState,
          );
        } catch {
          issues.push("p88_w08_dispatch_transition_invalid");
        }
      }
    }
  }

  if (!exactObjectEqual(ledger.semantics, p88W08AuditSemantics())) {
    issues.push("p88_w08_semantics_marker_mismatch");
  }
  if (!exactObjectEqual(ledger.safety, p88W08AuditCapability())) {
    issues.push("p88_w08_safety_marker_mismatch");
  }

  const { ledgerId: _ledgerId, ledgerFingerprint: _ledgerFingerprint, ...withoutIdentity } = ledger;
  const expectedLedgerFingerprint = hash(ledgerFingerprintPayload(withoutIdentity));
  if (expectedLedgerFingerprint !== ledger.ledgerFingerprint) {
    issues.push("p88_w08_ledger_fingerprint_mismatch");
  }

  return [...new Set(issues)].sort();
}

export function assertP88W08AuditIntegrity(
  ledger: P88W08AuditLedger,
): void {
  const issues = p88W08AuditIntegrityIssues(ledger);
  if (issues.length > 0) {
    throw new Error("p88_w08_audit_integrity_failure:" + issues.join(","));
  }
}
