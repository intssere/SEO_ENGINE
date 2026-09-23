import postgres from "postgres";
import {
  P8_8_W07_DISPATCH_VERSION,
  P8_8_W07_EVENT_VERSION,
  p88W07IsTerminalState,
  p88W07StableHash,
  p88W07W04TerminalStatus,
  projectP88W07ExecutionIntent,
  projectP88W07Transition,
  type P88W07DispatchState,
  type P88W07ExecutionInput,
  type P88W07ExecutionIntent,
  type P88W07PublicWriteOccurrence,
  type P88W07RollbackOccurrence,
} from "./p8-8-policy-single-action-apply.js";

export const P8_8_W07_EXPECTED_TABLE_COUNT = 43 as const;

export type P88W07DispatchRecord = Readonly<{
  dispatchId: string;
  dispatchVersion: string;
  dispatchFingerprint: string;
  executionId: string;
  executionFingerprint: string;
  siteId: string;
  policyId: string;
  policyVersion: string;
  policyFingerprint: string;
  evaluationId: string;
  evaluationFingerprint: string;
  materializationId: string;
  materializationFingerprint: string;
  proposalId: string;
  proposalFingerprint: string;
  w03AuthorizationId: string;
  w03AuthorizationFingerprint: string;
  policyActionId: string;
  reservationId: string;
  reservationFingerprint: string;
  claimId: string;
  claimFingerprint: string;
  w06PreflightId: string;
  w06PreflightFingerprint: string;
  credentialProfileId: string;
  claimedControlRevision: number;
  claimedControlFingerprint: string;
  resourceGid: string;
  targetUrl: string;
  beforeFingerprint: string;
  afterFingerprint: string;
  state: P88W07DispatchState;
  rowRevision: number;
  forwardAttemptCount: 0 | 1;
  rollbackAttemptCount: 0 | 1;
  publicWriteOccurrence: P88W07PublicWriteOccurrence;
  rollbackOccurrence: P88W07RollbackOccurrence;
  providerRequestId: string | null;
  providerRequestFingerprint: string | null;
  providerResponseFingerprint: string | null;
  rollbackRequestId: string | null;
  rollbackRequestFingerprint: string | null;
  rollbackResponseFingerprint: string | null;
  finalClosureReason: string | null;
  reservedAt: string;
  dispatchStartedAt: string | null;
  forwardResultAt: string | null;
  rollbackStartedAt: string | null;
  terminalAt: string | null;
  updatedAt: string;
}>;

export type P88W07ReserveResult =
  | Readonly<{ kind: "created" | "existing"; record: P88W07DispatchRecord }>
  | Readonly<{
      kind: "blocked";
      reason:
        | "control_missing"
        | "control_not_running"
        | "control_epoch_changed"
        | "reservation_not_claimed"
        | "reservation_binding_mismatch"
        | "claim_missing"
        | "claim_binding_mismatch"
        | "authorization_not_current"
        | "preflight_expired"
        | "manual_intervention_blocked"
        | "mutation_quota_exhausted"
        | "same_target_cooldown_not_satisfied"
        | "human_execution_conflict"
        | "dispatch_identity_collision";
    }>;

export type P88W07StartDispatchResult =
  | Readonly<{ kind: "started" | "existing_started"; record: P88W07DispatchRecord }>
  | Readonly<{
      kind: "blocked";
      reason:
        | "execution_gate_closed"
        | "credential_profile_mismatch"
        | "write_scope_missing"
        | "provider_before_state_mismatch"
        | "control_missing"
        | "control_not_running"
        | "control_epoch_changed"
        | "reservation_not_claimed"
        | "claim_binding_mismatch"
        | "authorization_not_current"
        | "preflight_expired"
        | "mutation_quota_exhausted"
        | "same_target_cooldown_not_satisfied"
        | "human_execution_conflict"
        | "dispatch_not_reserved"
        | "dispatch_state_uncertain";
    }>;

export type P88W07AdvanceInput = Readonly<{
  executionInput: P88W07ExecutionInput;
  dispatchId: string;
  expectedRevision: number;
  expectedState: P88W07DispatchState;
  toState: P88W07DispatchState;
  transitionReason: string;
  providerRequestId?: string | null;
  providerRequestFingerprint?: string | null;
  providerResponseFingerprint?: string | null;
  rollbackRequestId?: string | null;
  rollbackRequestFingerprint?: string | null;
  rollbackResponseFingerprint?: string | null;
}>;

export type P88W07AdvanceResult = Readonly<{
  record: P88W07DispatchRecord;
  w04TerminalStatus: "released" | "consumed" | "manual_intervention" | null;
}>;

type Sql = ReturnType<typeof postgres>;
type SqlExecutor = Pick<Sql, "unsafe">;

type DispatchRow = {
  dispatch_id: string;
  dispatch_version: string;
  dispatch_fingerprint: string;
  execution_id: string;
  execution_fingerprint: string;
  site_id: string;
  policy_id: string;
  policy_version: string;
  policy_fingerprint: string;
  evaluation_id: string;
  evaluation_fingerprint: string;
  materialization_id: string;
  materialization_fingerprint: string;
  proposal_id: string;
  proposal_fingerprint: string;
  w03_authorization_id: string;
  w03_authorization_fingerprint: string;
  policy_action_id: string;
  reservation_id: string;
  reservation_fingerprint: string;
  claim_id: string;
  claim_fingerprint: string;
  w06_preflight_id: string;
  w06_preflight_fingerprint: string;
  credential_profile_id: string;
  claimed_control_revision: number;
  claimed_control_fingerprint: string;
  resource_gid: string;
  target_url: string;
  before_fingerprint: string;
  after_fingerprint: string;
  state: P88W07DispatchState;
  row_revision: number;
  forward_attempt_count: 0 | 1;
  rollback_attempt_count: 0 | 1;
  public_write_occurrence: P88W07PublicWriteOccurrence;
  rollback_occurrence: P88W07RollbackOccurrence;
  provider_request_id: string | null;
  provider_request_fingerprint: string | null;
  provider_response_fingerprint: string | null;
  rollback_request_id: string | null;
  rollback_request_fingerprint: string | null;
  rollback_response_fingerprint: string | null;
  final_closure_reason: string | null;
  reserved_at: Date;
  dispatch_started_at: Date | null;
  forward_result_at: Date | null;
  rollback_started_at: Date | null;
  terminal_at: Date | null;
  updated_at: Date;
};

type ControlRow = {
  revision: number;
  control_fingerprint: string;
  mode: string;
};

type ReservationRow = {
  reservation_id: string;
  reservation_fingerprint: string;
  site_id: string;
  w03_authorization_id: string;
  w03_authorization_fingerprint: string;
  policy_action_id: string;
  status: string;
  resource_gid: string;
  target_url: string;
  field: string;
  before_fingerprint: string;
  after_fingerprint: string;
};

type ClaimRow = {
  claim_id: string;
  claim_fingerprint: string;
  reservation_id: string;
  reservation_fingerprint: string;
  w03_authorization_id: string;
  w03_authorization_fingerprint: string;
  policy_action_id: string;
  site_id: string;
  control_revision: number;
  control_fingerprint: string;
  resource_gid: string;
  target_url: string;
  field: string;
  before_fingerprint: string;
  after_fingerprint: string;
};

const DISPATCH_COLUMNS = [
  "dispatch_id",
  "dispatch_version",
  "dispatch_fingerprint",
  "execution_id",
  "execution_fingerprint",
  "site_id::text AS site_id",
  "policy_id",
  "policy_version",
  "policy_fingerprint",
  "evaluation_id",
  "evaluation_fingerprint",
  "materialization_id",
  "materialization_fingerprint",
  "proposal_id",
  "proposal_fingerprint",
  "w03_authorization_id",
  "w03_authorization_fingerprint",
  "policy_action_id",
  "reservation_id",
  "reservation_fingerprint",
  "claim_id",
  "claim_fingerprint",
  "w06_preflight_id",
  "w06_preflight_fingerprint",
  "credential_profile_id",
  "claimed_control_revision",
  "claimed_control_fingerprint",
  "resource_gid",
  "target_url",
  "before_fingerprint",
  "after_fingerprint",
  "state",
  "row_revision",
  "forward_attempt_count",
  "rollback_attempt_count",
  "public_write_occurrence",
  "rollback_occurrence",
  "provider_request_id",
  "provider_request_fingerprint",
  "provider_response_fingerprint",
  "rollback_request_id",
  "rollback_request_fingerprint",
  "rollback_response_fingerprint",
  "final_closure_reason",
  "reserved_at",
  "dispatch_started_at",
  "forward_result_at",
  "rollback_started_at",
  "terminal_at",
  "updated_at",
].join(", ");

function iso(value: Date | null): string | null {
  if (value === null) return null;
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error("p88_w07_database_timestamp_invalid");
  }
  return value.toISOString();
}

function recordFromRow(row: DispatchRow): P88W07DispatchRecord {
  return Object.freeze({
    dispatchId: row.dispatch_id,
    dispatchVersion: row.dispatch_version,
    dispatchFingerprint: row.dispatch_fingerprint,
    executionId: row.execution_id,
    executionFingerprint: row.execution_fingerprint,
    siteId: row.site_id,
    policyId: row.policy_id,
    policyVersion: row.policy_version,
    policyFingerprint: row.policy_fingerprint,
    evaluationId: row.evaluation_id,
    evaluationFingerprint: row.evaluation_fingerprint,
    materializationId: row.materialization_id,
    materializationFingerprint: row.materialization_fingerprint,
    proposalId: row.proposal_id,
    proposalFingerprint: row.proposal_fingerprint,
    w03AuthorizationId: row.w03_authorization_id,
    w03AuthorizationFingerprint: row.w03_authorization_fingerprint,
    policyActionId: row.policy_action_id,
    reservationId: row.reservation_id,
    reservationFingerprint: row.reservation_fingerprint,
    claimId: row.claim_id,
    claimFingerprint: row.claim_fingerprint,
    w06PreflightId: row.w06_preflight_id,
    w06PreflightFingerprint: row.w06_preflight_fingerprint,
    credentialProfileId: row.credential_profile_id,
    claimedControlRevision: Number(row.claimed_control_revision),
    claimedControlFingerprint: row.claimed_control_fingerprint,
    resourceGid: row.resource_gid,
    targetUrl: row.target_url,
    beforeFingerprint: row.before_fingerprint,
    afterFingerprint: row.after_fingerprint,
    state: row.state,
    rowRevision: Number(row.row_revision),
    forwardAttemptCount: Number(row.forward_attempt_count) as 0 | 1,
    rollbackAttemptCount: Number(row.rollback_attempt_count) as 0 | 1,
    publicWriteOccurrence: row.public_write_occurrence,
    rollbackOccurrence: row.rollback_occurrence,
    providerRequestId: row.provider_request_id,
    providerRequestFingerprint: row.provider_request_fingerprint,
    providerResponseFingerprint: row.provider_response_fingerprint,
    rollbackRequestId: row.rollback_request_id,
    rollbackRequestFingerprint: row.rollback_request_fingerprint,
    rollbackResponseFingerprint: row.rollback_response_fingerprint,
    finalClosureReason: row.final_closure_reason,
    reservedAt: iso(row.reserved_at)!,
    dispatchStartedAt: iso(row.dispatch_started_at),
    forwardResultAt: iso(row.forward_result_at),
    rollbackStartedAt: iso(row.rollback_started_at),
    terminalAt: iso(row.terminal_at),
    updatedAt: iso(row.updated_at)!,
  });
}

function rowMatchesIntent(
  row: DispatchRow,
  intent: P88W07ExecutionIntent,
): boolean {
  return (
    row.dispatch_id === intent.dispatchId
    && row.dispatch_version === P8_8_W07_DISPATCH_VERSION
    && row.dispatch_fingerprint === intent.dispatchFingerprint
    && row.execution_id === intent.policyExecutionId
    && row.execution_fingerprint === intent.executionFingerprint
    && row.site_id === intent.siteId
    && row.policy_id === intent.policyId
    && row.policy_version === intent.policyVersion
    && row.policy_fingerprint === intent.policyFingerprint
    && row.evaluation_id === intent.evaluationId
    && row.evaluation_fingerprint === intent.evaluationFingerprint
    && row.materialization_id === intent.materializationId
    && row.materialization_fingerprint === intent.materializationFingerprint
    && row.proposal_id === intent.proposalId
    && row.proposal_fingerprint === intent.proposalFingerprint
    && row.w03_authorization_id === intent.w03AuthorizationId
    && row.w03_authorization_fingerprint === intent.w03AuthorizationFingerprint
    && row.policy_action_id === intent.policyActionId
    && row.reservation_id === intent.reservationId
    && row.reservation_fingerprint === intent.reservationFingerprint
    && row.claim_id === intent.claimId
    && row.claim_fingerprint === intent.claimFingerprint
    && row.w06_preflight_id === intent.w06PreflightId
    && row.w06_preflight_fingerprint === intent.w06PreflightFingerprint
    && row.credential_profile_id === intent.credentialProfileId
    && Number(row.claimed_control_revision) === intent.claimedControlRevision
    && row.claimed_control_fingerprint === intent.claimedControlFingerprint
    && row.resource_gid === intent.target.resourceGid
    && row.target_url === intent.target.targetUrl
    && row.before_fingerprint === intent.state.beforeFingerprint
    && row.after_fingerprint === intent.state.afterFingerprint
  );
}

function reservationMatches(
  row: ReservationRow | undefined,
  intent: P88W07ExecutionIntent,
): boolean {
  return !!row
    && row.reservation_id === intent.reservationId
    && row.reservation_fingerprint === intent.reservationFingerprint
    && row.site_id === intent.siteId
    && row.w03_authorization_id === intent.w03AuthorizationId
    && row.w03_authorization_fingerprint === intent.w03AuthorizationFingerprint
    && row.policy_action_id === intent.policyActionId
    && row.resource_gid === intent.target.resourceGid
    && row.target_url === intent.target.targetUrl
    && row.field === intent.target.field
    && row.before_fingerprint === intent.state.beforeFingerprint
    && row.after_fingerprint === intent.state.afterFingerprint;
}

function claimMatches(
  row: ClaimRow | undefined,
  intent: P88W07ExecutionIntent,
): boolean {
  return !!row
    && row.claim_id === intent.claimId
    && row.claim_fingerprint === intent.claimFingerprint
    && row.reservation_id === intent.reservationId
    && row.reservation_fingerprint === intent.reservationFingerprint
    && row.w03_authorization_id === intent.w03AuthorizationId
    && row.w03_authorization_fingerprint === intent.w03AuthorizationFingerprint
    && row.policy_action_id === intent.policyActionId
    && row.site_id === intent.siteId
    && Number(row.control_revision) === intent.claimedControlRevision
    && row.control_fingerprint === intent.claimedControlFingerprint
    && row.resource_gid === intent.target.resourceGid
    && row.target_url === intent.target.targetUrl
    && row.field === intent.target.field
    && row.before_fingerprint === intent.state.beforeFingerprint
    && row.after_fingerprint === intent.state.afterFingerprint;
}

function eventFingerprint(input: {
  dispatchId: string;
  siteId: string;
  fromRevision: number | null;
  fromState: P88W07DispatchState | null;
  toRevision: number;
  toState: P88W07DispatchState;
  transitionReason: string;
  publicWriteOccurrence: P88W07PublicWriteOccurrence;
  rollbackOccurrence: P88W07RollbackOccurrence;
  providerRequestFingerprint: string | null;
  effectiveAt: string;
}): { eventId: string; fingerprint: string } {
  const fingerprint = p88W07StableHash({
    version: P8_8_W07_EVENT_VERSION,
    purpose: "p8.8_w07_dispatch_event",
    ...input,
  });
  return {
    eventId: "p88w07-event-" + fingerprint.slice(0, 24),
    fingerprint,
  };
}

function freshnessReason(
  intent: P88W07ExecutionIntent,
  now: Date,
): "authorization_not_current" | "preflight_expired" | null {
  const ms = now.getTime();
  if (
    Date.parse(intent.authorizationIssuedAt) > ms
    || Date.parse(intent.authorizationExpiresAt) <= ms
  ) return "authorization_not_current";
  if (Date.parse(intent.w06PreflightExpiresAt) <= ms) {
    return "preflight_expired";
  }
  return null;
}

export class P88W07DispatchStore {
  private readonly databaseUrl: string;
  private readonly sqlFactory: (databaseUrl: string) => Sql;

  constructor(options: {
    databaseUrl: string;
    sqlFactory?: (databaseUrl: string) => Sql;
  }) {
    this.databaseUrl = options.databaseUrl?.trim() ?? "";
    if (!this.databaseUrl) throw new Error("p88_w07_database_url_required");
    this.sqlFactory = options.sqlFactory
      ?? ((databaseUrl) => postgres(databaseUrl, {
        max: 4,
        prepare: false,
        connect_timeout: 8,
        idle_timeout: 2,
      }));
  }

  private async assertSchemaAndIdentity(
    sql: Sql,
    siteId: string,
  ): Promise<void> {
    const counts = await sql.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM information_schema.tables "
        + "WHERE table_schema='public' AND table_type='BASE TABLE'",
    );
    if (Number(counts[0]?.count ?? 0) !== P8_8_W07_EXPECTED_TABLE_COUNT) {
      throw new Error("p88_w07_schema_table_count_mismatch");
    }
    const sites = await sql.unsafe<{ id: string }[]>(
      "SELECT id::text AS id FROM sites WHERE id=$1::uuid "
        + "AND lower(domain)='diamondshelf.us' "
        + "AND canonical_origin='https://diamondshelf.us' "
        + "AND platform='shopify' AND is_active=true LIMIT 1",
      [siteId],
    );
    if (sites[0]?.id !== siteId) {
      throw new Error("p88_w07_site_identity_mismatch");
    }
  }

  private async lockLineage(
    tx: SqlExecutor,
    intent: P88W07ExecutionIntent,
  ): Promise<{
    control: ControlRow | undefined;
    reservation: ReservationRow | undefined;
    claim: ClaimRow | undefined;
  }> {
    const controls = await tx.unsafe<ControlRow[]>(
      "SELECT revision,control_fingerprint,mode "
        + "FROM policy_mutation_control_state "
        + "WHERE site_id=$1::uuid FOR UPDATE",
      [intent.siteId],
    );
    const reservations = await tx.unsafe<ReservationRow[]>(
      "SELECT reservation_id,reservation_fingerprint,"
        + "site_id::text AS site_id,w03_authorization_id,"
        + "w03_authorization_fingerprint,policy_action_id,status,"
        + "resource_gid,target_url,field,before_fingerprint,after_fingerprint "
        + "FROM policy_mutation_reservations "
        + "WHERE reservation_id=$1 FOR UPDATE",
      [intent.reservationId],
    );
    const claims = await tx.unsafe<ClaimRow[]>(
      "SELECT claim_id,claim_fingerprint,reservation_id,"
        + "reservation_fingerprint,w03_authorization_id,"
        + "w03_authorization_fingerprint,policy_action_id,"
        + "site_id::text AS site_id,control_revision,control_fingerprint,"
        + "resource_gid,target_url,field,before_fingerprint,after_fingerprint "
        + "FROM policy_mutation_claims WHERE claim_id=$1 FOR UPDATE",
      [intent.claimId],
    );
    return {
      control: controls[0],
      reservation: reservations[0],
      claim: claims[0],
    };
  }

  private async now(tx: SqlExecutor): Promise<Date> {
    const rows = await tx.unsafe<{ now: Date }[]>(
      "SELECT transaction_timestamp() AS now",
    );
    const now = rows[0]?.now;
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
      throw new Error("p88_w07_database_clock_unavailable");
    }
    return now;
  }

  private async policyBlocker(
    tx: SqlExecutor,
    intent: P88W07ExecutionIntent,
    now: Date,
    excludeDispatchId: string | null,
  ): Promise<
    | "manual_intervention_blocked"
    | "mutation_quota_exhausted"
    | "same_target_cooldown_not_satisfied"
    | "human_execution_conflict"
    | null
  > {
    const manual = await tx.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM policy_mutation_dispatches "
        + "WHERE site_id=$1::uuid AND state='manual_intervention_required' "
        + (excludeDispatchId ? "AND dispatch_id<>$2 " : ""),
      excludeDispatchId ? [intent.siteId, excludeDispatchId] : [intent.siteId],
    );
    if (Number(manual[0]?.count ?? 0) > 0) {
      return "manual_intervention_blocked";
    }

    const quotaSince = new Date(
      now.getTime() - intent.mutationQuotaWindowHours * 60 * 60 * 1000,
    ).toISOString();
    const quota = await tx.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM policy_mutation_dispatches "
        + "WHERE site_id=$1::uuid AND forward_attempt_count=1 "
        + "AND dispatch_started_at >= $2::timestamptz "
        + (excludeDispatchId ? "AND dispatch_id<>$3 " : ""),
      excludeDispatchId
        ? [intent.siteId, quotaSince, excludeDispatchId]
        : [intent.siteId, quotaSince],
    );
    if (Number(quota[0]?.count ?? 0) >= intent.mutationQuotaMaxActions) {
      return "mutation_quota_exhausted";
    }

    const cooldownSince = new Date(
      now.getTime() - intent.sameTargetCooldownHours * 60 * 60 * 1000,
    ).toISOString();
    const cooldown = await tx.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM policy_mutation_dispatches "
        + "WHERE site_id=$1::uuid AND resource_gid=$2 AND field='meta_description' "
        + "AND forward_attempt_count=1 "
        + "AND dispatch_started_at >= $3::timestamptz "
        + (excludeDispatchId ? "AND dispatch_id<>$4 " : ""),
      excludeDispatchId
        ? [intent.siteId, intent.target.resourceGid, cooldownSince, excludeDispatchId]
        : [intent.siteId, intent.target.resourceGid, cooldownSince],
    );
    if (Number(cooldown[0]?.count ?? 0) > 0) {
      return "same_target_cooldown_not_satisfied";
    }

    const human = await tx.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM deployments d "
        + "JOIN action_plans p ON p.id=d.action_plan_id "
        + "WHERE p.site_id=$1::uuid AND lower(d.provider)='shopify' "
        + "AND d.status IN ('pending','active')",
      [intent.siteId],
    );
    if (Number(human[0]?.count ?? 0) > 0) {
      return "human_execution_conflict";
    }
    return null;
  }

  private async insertEvent(
    tx: SqlExecutor,
    input: {
      dispatchId: string;
      siteId: string;
      fromRevision: number | null;
      fromState: P88W07DispatchState | null;
      toRevision: number;
      toState: P88W07DispatchState;
      transitionReason: string;
      publicWriteOccurrence: P88W07PublicWriteOccurrence;
      rollbackOccurrence: P88W07RollbackOccurrence;
      providerRequestFingerprint: string | null;
      effectiveAt: string;
    },
  ): Promise<void> {
    const event = eventFingerprint(input);
    await tx.unsafe(
      "INSERT INTO policy_mutation_dispatch_events ("
        + "event_id,event_version,event_fingerprint,dispatch_id,site_id,"
        + "from_revision,from_state,to_revision,to_state,transition_reason,"
        + "public_write_occurrence,rollback_occurrence,"
        + "provider_request_fingerprint,effective_at"
        + ") VALUES ($1,$2,$3,$4,$5::uuid,$6,$7,$8,$9,$10,$11,$12,$13,$14::timestamptz)",
      [
        event.eventId,
        P8_8_W07_EVENT_VERSION,
        event.fingerprint,
        input.dispatchId,
        input.siteId,
        input.fromRevision,
        input.fromState,
        input.toRevision,
        input.toState,
        input.transitionReason,
        input.publicWriteOccurrence,
        input.rollbackOccurrence,
        input.providerRequestFingerprint,
        input.effectiveAt,
      ],
    );
  }

  async reservePrewrite(
    executionInput: P88W07ExecutionInput,
  ): Promise<P88W07ReserveResult> {
    const intent = projectP88W07ExecutionIntent(executionInput);
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, intent.siteId);
      return await sql.begin(async (tx) => {
        const { control, reservation, claim } =
          await this.lockLineage(tx, intent);

        const existingRows = await tx.unsafe<DispatchRow[]>(
          "SELECT " + DISPATCH_COLUMNS
            + " FROM policy_mutation_dispatches "
            + "WHERE claim_id=$1 OR dispatch_id=$2 FOR UPDATE",
          [intent.claimId, intent.dispatchId],
        );
        if (existingRows[0]) {
          if (!rowMatchesIntent(existingRows[0], intent)) {
            return { kind: "blocked", reason: "dispatch_identity_collision" };
          }
          return {
            kind: "existing",
            record: recordFromRow(existingRows[0]),
          };
        }

        if (!control) return { kind: "blocked", reason: "control_missing" };
        if (control.mode !== "running") {
          return { kind: "blocked", reason: "control_not_running" };
        }
        if (
          Number(control.revision) !== intent.claimedControlRevision
          || control.control_fingerprint !== intent.claimedControlFingerprint
        ) {
          return { kind: "blocked", reason: "control_epoch_changed" };
        }
        if (!reservationMatches(reservation, intent)) {
          return { kind: "blocked", reason: "reservation_binding_mismatch" };
        }
        if (reservation!.status !== "claimed") {
          return { kind: "blocked", reason: "reservation_not_claimed" };
        }
        if (!claim) return { kind: "blocked", reason: "claim_missing" };
        if (!claimMatches(claim, intent)) {
          return { kind: "blocked", reason: "claim_binding_mismatch" };
        }

        const now = await this.now(tx);
        const freshness = freshnessReason(intent, now);
        if (freshness) return { kind: "blocked", reason: freshness };
        const blocker = await this.policyBlocker(tx, intent, now, null);
        if (blocker) return { kind: "blocked", reason: blocker };

        const inserted = await tx.unsafe<DispatchRow[]>(
          "INSERT INTO policy_mutation_dispatches ("
            + "dispatch_id,dispatch_version,dispatch_fingerprint,"
            + "execution_id,execution_fingerprint,site_id,policy_id,"
            + "policy_version,policy_fingerprint,evaluation_id,"
            + "evaluation_fingerprint,materialization_id,"
            + "materialization_fingerprint,proposal_id,proposal_fingerprint,"
            + "w03_authorization_id,w03_authorization_fingerprint,"
            + "policy_action_id,reservation_id,reservation_fingerprint,"
            + "claim_id,claim_fingerprint,w06_preflight_id,"
            + "w06_preflight_fingerprint,credential_profile_id,"
            + "claimed_control_revision,claimed_control_fingerprint,"
            + "provider,domain,resource_kind,resource_gid,target_url,"
            + "action_type,field,required_provider_scope,before_fingerprint,"
            + "after_fingerprint,state,row_revision,forward_attempt_count,"
            + "rollback_attempt_count,public_write_occurrence,"
            + "rollback_occurrence,reserved_at"
            + ") VALUES ("
            + "$1,$2,$3,$4,$5,$6::uuid,$7,$8,$9,$10,$11,$12,$13,$14,$15,"
            + "$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,"
            + "'shopify','diamondshelf.us','product',$28,$29,"
            + "'update_meta_description','meta_description','write_products',"
            + "$30,$31,'reserved_prewrite',1,0,0,'none','none',$32::timestamptz"
            + ") RETURNING " + DISPATCH_COLUMNS,
          [
            intent.dispatchId,
            P8_8_W07_DISPATCH_VERSION,
            intent.dispatchFingerprint,
            intent.policyExecutionId,
            intent.executionFingerprint,
            intent.siteId,
            intent.policyId,
            intent.policyVersion,
            intent.policyFingerprint,
            intent.evaluationId,
            intent.evaluationFingerprint,
            intent.materializationId,
            intent.materializationFingerprint,
            intent.proposalId,
            intent.proposalFingerprint,
            intent.w03AuthorizationId,
            intent.w03AuthorizationFingerprint,
            intent.policyActionId,
            intent.reservationId,
            intent.reservationFingerprint,
            intent.claimId,
            intent.claimFingerprint,
            intent.w06PreflightId,
            intent.w06PreflightFingerprint,
            intent.credentialProfileId,
            intent.claimedControlRevision,
            intent.claimedControlFingerprint,
            intent.target.resourceGid,
            intent.target.targetUrl,
            intent.state.beforeFingerprint,
            intent.state.afterFingerprint,
            now.toISOString(),
          ],
        );
        if (!inserted[0]) {
          throw new Error("p88_w07_dispatch_insert_uncertain");
        }
        await this.insertEvent(tx, {
          dispatchId: intent.dispatchId,
          siteId: intent.siteId,
          fromRevision: null,
          fromState: null,
          toRevision: 1,
          toState: "reserved_prewrite",
          transitionReason: "reserve_prewrite",
          publicWriteOccurrence: "none",
          rollbackOccurrence: "none",
          providerRequestFingerprint: null,
          effectiveAt: now.toISOString(),
        });
        return { kind: "created", record: recordFromRow(inserted[0]) };
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("p88_w07_")) {
        throw error;
      }
      throw new Error("p88_w07_dispatch_state_uncertain");
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  async startDispatch(input: {
    executionInput: P88W07ExecutionInput;
    dispatchId: string;
    expectedRevision: number;
    publicSiteWritesEnabled: boolean;
    policyMutationExecutionEnabled: boolean;
    credentialProfileId: string;
    credentialScopes: readonly string[];
    providerBeforeValue: string | null;
    providerBeforeFingerprint: string;
    providerRequestFingerprint: string;
  }): Promise<P88W07StartDispatchResult> {
    const intent = projectP88W07ExecutionIntent(input.executionInput);
    if (
      !input.publicSiteWritesEnabled
      || !input.policyMutationExecutionEnabled
    ) {
      return { kind: "blocked", reason: "execution_gate_closed" };
    }
    if (input.credentialProfileId !== intent.credentialProfileId) {
      return { kind: "blocked", reason: "credential_profile_mismatch" };
    }
    if (!input.credentialScopes.includes("write_products")) {
      return { kind: "blocked", reason: "write_scope_missing" };
    }
    if (
      input.providerBeforeValue !== intent.state.beforeValue
      || input.providerBeforeFingerprint !== intent.state.beforeFingerprint
    ) {
      return { kind: "blocked", reason: "provider_before_state_mismatch" };
    }

    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, intent.siteId);
      return await sql.begin(async (tx) => {
        const { control, reservation, claim } =
          await this.lockLineage(tx, intent);
        const rows = await tx.unsafe<DispatchRow[]>(
          "SELECT " + DISPATCH_COLUMNS
            + " FROM policy_mutation_dispatches WHERE dispatch_id=$1 FOR UPDATE",
          [input.dispatchId],
        );
        const row = rows[0];
        if (!row || !rowMatchesIntent(row, intent)) {
          return { kind: "blocked", reason: "dispatch_state_uncertain" };
        }
        if (row.state === "dispatch_started" && row.forward_attempt_count === 1) {
          return {
            kind: "existing_started",
            record: recordFromRow(row),
          };
        }
        if (
          row.state !== "reserved_prewrite"
          || Number(row.row_revision) !== input.expectedRevision
          || row.forward_attempt_count !== 0
        ) {
          return { kind: "blocked", reason: "dispatch_not_reserved" };
        }

        if (!control) return { kind: "blocked", reason: "control_missing" };
        if (control.mode !== "running") {
          return { kind: "blocked", reason: "control_not_running" };
        }
        if (
          Number(control.revision) !== intent.claimedControlRevision
          || control.control_fingerprint !== intent.claimedControlFingerprint
        ) {
          return { kind: "blocked", reason: "control_epoch_changed" };
        }
        if (!reservationMatches(reservation, intent) || reservation!.status !== "claimed") {
          return { kind: "blocked", reason: "reservation_not_claimed" };
        }
        if (!claimMatches(claim, intent)) {
          return { kind: "blocked", reason: "claim_binding_mismatch" };
        }

        const now = await this.now(tx);
        const freshness = freshnessReason(intent, now);
        if (freshness) return { kind: "blocked", reason: freshness };
        const blocker = await this.policyBlocker(
          tx,
          intent,
          now,
          intent.dispatchId,
        );
        if (blocker && blocker !== "manual_intervention_blocked") {
          return { kind: "blocked", reason: blocker };
        }
        if (blocker === "manual_intervention_blocked") {
          return { kind: "blocked", reason: "dispatch_state_uncertain" };
        }

        const projection = projectP88W07Transition({
          fromState: row.state,
          toState: "dispatch_started",
          forwardAttemptCount: row.forward_attempt_count,
          rollbackAttemptCount: row.rollback_attempt_count,
          publicWriteOccurrence: row.public_write_occurrence,
          rollbackOccurrence: row.rollback_occurrence,
        });
        const nextRevision = Number(row.row_revision) + 1;
        const updated = await tx.unsafe<DispatchRow[]>(
          "UPDATE policy_mutation_dispatches SET "
            + "state=$4,row_revision=$5,forward_attempt_count=$6,"
            + "rollback_attempt_count=$7,public_write_occurrence=$8,"
            + "rollback_occurrence=$9,provider_request_fingerprint=$10,"
            + "dispatch_started_at=$11::timestamptz,updated_at=$11::timestamptz "
            + "WHERE dispatch_id=$1 AND row_revision=$2 AND state=$3 "
            + "RETURNING " + DISPATCH_COLUMNS,
          [
            row.dispatch_id,
            row.row_revision,
            row.state,
            projection.toState,
            nextRevision,
            projection.forwardAttemptCount,
            projection.rollbackAttemptCount,
            projection.publicWriteOccurrence,
            projection.rollbackOccurrence,
            input.providerRequestFingerprint,
            now.toISOString(),
          ],
        );
        if (!updated[0]) {
          return { kind: "blocked", reason: "dispatch_state_uncertain" };
        }
        await this.insertEvent(tx, {
          dispatchId: row.dispatch_id,
          siteId: intent.siteId,
          fromRevision: Number(row.row_revision),
          fromState: row.state,
          toRevision: nextRevision,
          toState: projection.toState,
          transitionReason: "dispatch_point_of_no_return",
          publicWriteOccurrence: projection.publicWriteOccurrence,
          rollbackOccurrence: projection.rollbackOccurrence,
          providerRequestFingerprint: input.providerRequestFingerprint,
          effectiveAt: now.toISOString(),
        });
        return { kind: "started", record: recordFromRow(updated[0]) };
      });
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  async advance(input: P88W07AdvanceInput): Promise<P88W07AdvanceResult> {
    const intent = projectP88W07ExecutionIntent(input.executionInput);
    if (input.dispatchId !== intent.dispatchId) {
      throw new Error("p88_w07_dispatch_identity_mismatch");
    }
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, intent.siteId);
      return await sql.begin(async (tx) => {
        const { reservation, claim } = await this.lockLineage(tx, intent);
        if (!reservationMatches(reservation, intent) || reservation!.status !== "claimed") {
          throw new Error("p88_w07_reservation_not_claimed");
        }
        if (!claimMatches(claim, intent)) {
          throw new Error("p88_w07_claim_binding_mismatch");
        }
        const rows = await tx.unsafe<DispatchRow[]>(
          "SELECT " + DISPATCH_COLUMNS
            + " FROM policy_mutation_dispatches WHERE dispatch_id=$1 FOR UPDATE",
          [intent.dispatchId],
        );
        const row = rows[0];
        if (
          !row
          || !rowMatchesIntent(row, intent)
          || Number(row.row_revision) !== input.expectedRevision
          || row.state !== input.expectedState
        ) {
          throw new Error("p88_w07_dispatch_revision_conflict");
        }

        const projection = projectP88W07Transition({
          fromState: row.state,
          toState: input.toState,
          forwardAttemptCount: row.forward_attempt_count,
          rollbackAttemptCount: row.rollback_attempt_count,
          publicWriteOccurrence: row.public_write_occurrence,
          rollbackOccurrence: row.rollback_occurrence,
        });
        const now = await this.now(tx);
        const nextRevision = Number(row.row_revision) + 1;
        const w04Status = p88W07W04TerminalStatus(projection.toState);
        const terminalAt = p88W07IsTerminalState(projection.toState)
          ? now.toISOString()
          : null;
        const forwardResultAt = (
          projection.toState === "forward_rejected_no_write"
          || projection.toState === "forward_verification_pending"
          || projection.toState === "manual_intervention_required"
        ) && row.forward_attempt_count === 1
          ? now.toISOString()
          : iso(row.forward_result_at);
        const rollbackStartedAt =
          projection.toState === "rollback_started"
            ? now.toISOString()
            : iso(row.rollback_started_at);

        const updated = await tx.unsafe<DispatchRow[]>(
          "UPDATE policy_mutation_dispatches SET "
            + "state=$4,row_revision=$5,forward_attempt_count=$6,"
            + "rollback_attempt_count=$7,public_write_occurrence=$8,"
            + "rollback_occurrence=$9,"
            + "provider_request_id=COALESCE($10,provider_request_id),"
            + "provider_request_fingerprint=COALESCE($11,provider_request_fingerprint),"
            + "provider_response_fingerprint=COALESCE($12,provider_response_fingerprint),"
            + "rollback_request_id=COALESCE($13,rollback_request_id),"
            + "rollback_request_fingerprint=COALESCE($14,rollback_request_fingerprint),"
            + "rollback_response_fingerprint=COALESCE($15,rollback_response_fingerprint),"
            + "final_closure_reason=$16,"
            + "forward_result_at=$17::timestamptz,"
            + "rollback_started_at=$18::timestamptz,"
            + "terminal_at=$19::timestamptz,updated_at=$20::timestamptz "
            + "WHERE dispatch_id=$1 AND row_revision=$2 AND state=$3 "
            + "RETURNING " + DISPATCH_COLUMNS,
          [
            row.dispatch_id,
            row.row_revision,
            row.state,
            projection.toState,
            nextRevision,
            projection.forwardAttemptCount,
            projection.rollbackAttemptCount,
            projection.publicWriteOccurrence,
            projection.rollbackOccurrence,
            input.providerRequestId ?? null,
            input.providerRequestFingerprint ?? null,
            input.providerResponseFingerprint ?? null,
            input.rollbackRequestId ?? null,
            input.rollbackRequestFingerprint ?? null,
            input.rollbackResponseFingerprint ?? null,
            p88W07IsTerminalState(projection.toState)
              ? input.transitionReason
              : null,
            forwardResultAt,
            rollbackStartedAt,
            terminalAt,
            now.toISOString(),
          ],
        );
        if (!updated[0]) {
          throw new Error("p88_w07_dispatch_revision_conflict");
        }

        if (w04Status) {
          if (w04Status === "manual_intervention") {
            const closed = await tx.unsafe<{ reservation_id: string }[]>(
              "UPDATE policy_mutation_reservations SET "
                + "status='manual_intervention',terminal_at=NULL,"
                + "terminal_reason=$2,updated_at=$3::timestamptz "
                + "WHERE reservation_id=$1 AND status='claimed' "
                + "RETURNING reservation_id",
              [intent.reservationId, input.transitionReason, now.toISOString()],
            );
            if (closed[0]?.reservation_id !== intent.reservationId) {
              throw new Error("p88_w07_w04_manual_intervention_uncertain");
            }
          } else {
            const closed = await tx.unsafe<{ reservation_id: string }[]>(
              "UPDATE policy_mutation_reservations SET "
                + "status=$2,terminal_at=$3::timestamptz,"
                + "terminal_reason=$4,updated_at=$3::timestamptz "
                + "WHERE reservation_id=$1 AND status='claimed' "
                + "RETURNING reservation_id",
              [
                intent.reservationId,
                w04Status,
                now.toISOString(),
                input.transitionReason,
              ],
            );
            if (closed[0]?.reservation_id !== intent.reservationId) {
              throw new Error("p88_w07_w04_terminal_transition_uncertain");
            }
          }
        }

        await this.insertEvent(tx, {
          dispatchId: row.dispatch_id,
          siteId: intent.siteId,
          fromRevision: Number(row.row_revision),
          fromState: row.state,
          toRevision: nextRevision,
          toState: projection.toState,
          transitionReason: input.transitionReason,
          publicWriteOccurrence: projection.publicWriteOccurrence,
          rollbackOccurrence: projection.rollbackOccurrence,
          providerRequestFingerprint:
            input.rollbackRequestFingerprint
            ?? input.providerRequestFingerprint
            ?? row.provider_request_fingerprint,
          effectiveAt: now.toISOString(),
        });

        return {
          record: recordFromRow(updated[0]),
          w04TerminalStatus: w04Status,
        };
      });
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  async getDispatch(
    dispatchId: string,
  ): Promise<P88W07DispatchRecord | null> {
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      const rows = await sql.unsafe<DispatchRow[]>(
        "SELECT " + DISPATCH_COLUMNS
          + " FROM policy_mutation_dispatches WHERE dispatch_id=$1",
        [dispatchId],
      );
      return rows[0] ? recordFromRow(rows[0]) : null;
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }
}

export function p88W07DispatchStoreCapability() {
  return Object.freeze({
    version: P8_8_W07_DISPATCH_VERSION,
    expectedPublicTableCount: P8_8_W07_EXPECTED_TABLE_COUNT,
    explicitDatabaseUrlOnly: true,
    genericDatabaseUrlFallback: false,
    canonicalLockOrder: Object.freeze([
      "policy_mutation_control_state",
      "policy_mutation_reservations",
      "policy_mutation_claims",
      "policy_mutation_dispatches",
    ]),
    maximumForwardAttempts: 1,
    maximumRollbackAttempts: 1,
    providerNetworkAccessPerformed: false,
    providerWritePerformed: false,
    rollbackWritePerformed: false,
    schedulerBinding: false,
    workerBinding: false,
    productionDatabaseAuthorized: false,
  });
}
