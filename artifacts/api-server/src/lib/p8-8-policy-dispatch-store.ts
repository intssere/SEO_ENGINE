import { createHash } from "node:crypto";
import postgres from "postgres";
import {
  P8_8_W07_DISPATCH_EVENT_VERSION,
  P8_8_W07_DISPATCH_VERSION,
  projectP88W07Transition,
  type P88W07DispatchIntent,
  type P88W07DispatchProjection,
  type P88W07DispatchState,
  type P88W07PublicWriteOccurrence,
  type P88W07RollbackOccurrence,
} from "./p8-8-policy-single-action-apply.js";

export const P8_8_W07_EXPECTED_TABLE_COUNT = 43 as const;

type Sql = ReturnType<typeof postgres>;
type SqlExecutor = Pick<Sql, "unsafe">;

type DispatchRow = {
  dispatch_id: string;
  dispatch_version: string;
  dispatch_fingerprint: string;
  policy_execution_id: string;
  execution_provenance: string;
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
  provider: string;
  domain: string;
  resource_kind: string;
  resource_gid: string;
  target_url: string;
  action_type: string;
  field: string;
  required_provider_scope: string;
  before_fingerprint: string;
  after_fingerprint: string;
  credential_profile_id: string;
  claimed_control_revision: number;
  claimed_control_fingerprint: string;
  w03_expires_at: Date;
  w06_preflight_expires_at: Date;
  state: P88W07DispatchState;
  revision: number;
  forward_attempt_count: number;
  rollback_attempt_count: number;
  provider_request_id: string | null;
  provider_request_fingerprint: string | null;
  provider_response_fingerprint: string | null;
  public_write_occurrence: P88W07PublicWriteOccurrence;
  rollback_occurrence: P88W07RollbackOccurrence;
  terminal_reason: string | null;
  reserved_at: Date;
  dispatch_started_at: Date | null;
  forward_response_at: Date | null;
  rollback_started_at: Date | null;
  terminal_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type ControlRow = {
  revision: number;
  mode: string;
  control_fingerprint: string;
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

export type P88W07DispatchRecord = Readonly<{
  dispatchId: string;
  dispatchFingerprint: string;
  policyExecutionId: string;
  state: P88W07DispatchState;
  revision: number;
  siteId: string;
  reservationId: string;
  claimId: string;
  policyActionId: string;
  resourceGid: string;
  targetUrl: string;
  field: "meta_description";
  beforeFingerprint: string;
  afterFingerprint: string;
  credentialProfileId: string;
  claimedControlRevision: number;
  claimedControlFingerprint: string;
  forwardAttemptCount: 0 | 1;
  rollbackAttemptCount: 0 | 1;
  providerRequestId: string | null;
  providerRequestFingerprint: string | null;
  providerResponseFingerprint: string | null;
  publicWriteOccurrence: P88W07PublicWriteOccurrence;
  rollbackOccurrence: P88W07RollbackOccurrence;
  terminalReason: string | null;
  reservedAt: string;
  dispatchStartedAt: string | null;
  rollbackStartedAt: string | null;
  terminalAt: string | null;
}>;

export type P88W07ReserveResult =
  | Readonly<{ kind: "reserved_new" | "existing_reserved"; record: P88W07DispatchRecord }>
  | Readonly<{
      kind:
        | "control_not_running"
        | "control_epoch_changed"
        | "reservation_not_claimed"
        | "claim_binding_mismatch"
        | "authorization_expired"
        | "preflight_expired"
        | "mutation_quota_exhausted"
        | "same_target_cooldown_blocked"
        | "human_execution_conflict"
        | "dispatch_identity_collision"
        | "state_uncertain";
    }>;

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function record(row: DispatchRow): P88W07DispatchRecord {
  return Object.freeze({
    dispatchId: row.dispatch_id,
    dispatchFingerprint: row.dispatch_fingerprint,
    policyExecutionId: row.policy_execution_id,
    state: row.state,
    revision: Number(row.revision),
    siteId: row.site_id,
    reservationId: row.reservation_id,
    claimId: row.claim_id,
    policyActionId: row.policy_action_id,
    resourceGid: row.resource_gid,
    targetUrl: row.target_url,
    field: "meta_description" as const,
    beforeFingerprint: row.before_fingerprint,
    afterFingerprint: row.after_fingerprint,
    credentialProfileId: row.credential_profile_id,
    claimedControlRevision: Number(row.claimed_control_revision),
    claimedControlFingerprint: row.claimed_control_fingerprint,
    forwardAttemptCount: Number(row.forward_attempt_count) as 0 | 1,
    rollbackAttemptCount: Number(row.rollback_attempt_count) as 0 | 1,
    providerRequestId: row.provider_request_id,
    providerRequestFingerprint: row.provider_request_fingerprint,
    providerResponseFingerprint: row.provider_response_fingerprint,
    publicWriteOccurrence: row.public_write_occurrence,
    rollbackOccurrence: row.rollback_occurrence,
    terminalReason: row.terminal_reason,
    reservedAt: row.reserved_at.toISOString(),
    dispatchStartedAt: iso(row.dispatch_started_at),
    rollbackStartedAt: iso(row.rollback_started_at),
    terminalAt: iso(row.terminal_at),
  });
}

function projection(row: DispatchRow): P88W07DispatchProjection {
  return {
    dispatchId: row.dispatch_id,
    state: row.state,
    revision: Number(row.revision),
    forwardAttemptCount: Number(row.forward_attempt_count) as 0 | 1,
    rollbackAttemptCount: Number(row.rollback_attempt_count) as 0 | 1,
    publicWriteOccurrence: row.public_write_occurrence,
    rollbackOccurrence: row.rollback_occurrence,
    terminal: row.terminal_at !== null,
  };
}

function rowMatchesIntent(row: DispatchRow, intent: P88W07DispatchIntent): boolean {
  return (
    row.dispatch_id === intent.dispatchId
    && row.dispatch_version === intent.version
    && row.dispatch_fingerprint === intent.dispatchFingerprint
    && row.policy_execution_id === intent.policyExecutionId
    && row.execution_provenance === intent.executionProvenance
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
    && row.provider === intent.provider
    && row.domain === intent.domain
    && row.resource_kind === intent.resourceKind
    && row.resource_gid === intent.resourceGid
    && row.target_url === intent.targetUrl
    && row.action_type === intent.actionType
    && row.field === intent.field
    && row.required_provider_scope === intent.requiredProviderScope
    && row.before_fingerprint === intent.beforeFingerprint
    && row.after_fingerprint === intent.afterFingerprint
    && row.credential_profile_id === intent.credentialProfileId
    && Number(row.claimed_control_revision) === intent.claimedControlRevision
    && row.claimed_control_fingerprint === intent.claimedControlFingerprint
    && row.w03_expires_at.toISOString() === intent.w03ExpiresAt
    && row.w06_preflight_expires_at.toISOString() === intent.w06PreflightExpiresAt
  );
}

const SELECT_DISPATCH =
  "SELECT dispatch_id,dispatch_version,dispatch_fingerprint,policy_execution_id,"
  + "execution_provenance,site_id::text AS site_id,policy_id,policy_version,"
  + "policy_fingerprint,evaluation_id,evaluation_fingerprint,materialization_id,"
  + "materialization_fingerprint,proposal_id,proposal_fingerprint,"
  + "w03_authorization_id,w03_authorization_fingerprint,policy_action_id,"
  + "reservation_id,reservation_fingerprint,claim_id,claim_fingerprint,"
  + "w06_preflight_id,w06_preflight_fingerprint,provider,domain,resource_kind,"
  + "resource_gid,target_url,action_type,field,required_provider_scope,"
  + "before_fingerprint,after_fingerprint,credential_profile_id,"
  + "claimed_control_revision,claimed_control_fingerprint,w03_expires_at,"
  + "w06_preflight_expires_at,state,revision,forward_attempt_count,"
  + "rollback_attempt_count,provider_request_id,provider_request_fingerprint,"
  + "provider_response_fingerprint,public_write_occurrence,rollback_occurrence,"
  + "terminal_reason,reserved_at,dispatch_started_at,forward_response_at,"
  + "rollback_started_at,terminal_at,created_at,updated_at "
  + "FROM policy_mutation_dispatches ";

export class P88W07DispatchStore {
  private readonly databaseUrl: string;
  private readonly sqlFactory: (databaseUrl: string) => Sql;

  constructor(options: {
    databaseUrl: string;
    sqlFactory?: (databaseUrl: string) => Sql;
  }) {
    this.databaseUrl = options.databaseUrl?.trim() ?? "";
    if (!this.databaseUrl) throw new Error("p88_w07_database_url_required");
    this.sqlFactory =
      options.sqlFactory
      ?? ((databaseUrl) =>
        postgres(databaseUrl, {
          max: 6,
          prepare: false,
          connect_timeout: 8,
          idle_timeout: 2,
        }));
  }

  private async assertSchemaAndIdentity(sql: Sql, siteId: string): Promise<void> {
    const counts = await sql.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM information_schema.tables "
        + "WHERE table_schema='public' AND table_type='BASE TABLE'",
    );
    if (Number(counts[0]?.count ?? 0) !== P8_8_W07_EXPECTED_TABLE_COUNT) {
      throw new Error("p88_w07_schema_table_count_mismatch");
    }
    const identities = await sql.unsafe<{ id: string }[]>(
      "SELECT id::text AS id FROM sites "
        + "WHERE id=$1::uuid AND lower(domain)='diamondshelf.us' "
        + "AND canonical_origin='https://diamondshelf.us' "
        + "AND platform='shopify' AND is_active=true LIMIT 1",
      [siteId],
    );
    if (identities[0]?.id !== siteId) {
      throw new Error("p88_w07_site_identity_mismatch");
    }
  }

  private async insertEvent(
    tx: SqlExecutor,
    input: {
      dispatchId: string;
      siteId: string;
      priorRevision: number | null;
      priorState: P88W07DispatchState | null;
      nextRevision: number;
      nextState: P88W07DispatchState;
      transitionReason: string;
      providerRequestFingerprint: string | null;
      publicWriteOccurrence: P88W07PublicWriteOccurrence;
      rollbackOccurrence: P88W07RollbackOccurrence;
      effectiveAt: string;
    },
  ): Promise<void> {
    const eventBase = {
      version: P8_8_W07_DISPATCH_EVENT_VERSION,
      ...input,
    };
    const eventFingerprint = stableHash({
      purpose: "p8.8_w07_policy_dispatch_event",
      ...eventBase,
    });
    const eventId = "p88w07-event-" + eventFingerprint.slice(0, 24);
    await tx.unsafe(
      "INSERT INTO policy_mutation_dispatch_events ("
        + "event_id,event_version,event_fingerprint,dispatch_id,site_id,"
        + "prior_revision,prior_state,next_revision,next_state,"
        + "transition_reason,provider_request_fingerprint,"
        + "public_write_occurrence,rollback_occurrence,effective_at,created_at"
        + ") VALUES ($1,$2,$3,$4,$5::uuid,$6,$7,$8,$9,$10,$11,$12,$13,"
        + "$14::timestamptz,$14::timestamptz)",
      [
        eventId,
        P8_8_W07_DISPATCH_EVENT_VERSION,
        eventFingerprint,
        input.dispatchId,
        input.siteId,
        input.priorRevision,
        input.priorState,
        input.nextRevision,
        input.nextState,
        input.transitionReason,
        input.providerRequestFingerprint,
        input.publicWriteOccurrence,
        input.rollbackOccurrence,
        input.effectiveAt,
      ],
    );
  }

  async readDispatch(dispatchId: string): Promise<P88W07DispatchRecord | null> {
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      const rows = await sql.unsafe<DispatchRow[]>(
        SELECT_DISPATCH + "WHERE dispatch_id=$1",
        [dispatchId],
      );
      return rows[0] ? record(rows[0]) : null;
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  async reservePrewrite(intent: P88W07DispatchIntent): Promise<P88W07ReserveResult> {
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, intent.siteId);
      return await sql.begin(async (tx) => {
        const controls = await tx.unsafe<ControlRow[]>(
          "SELECT revision,mode,control_fingerprint "
            + "FROM policy_mutation_control_state WHERE site_id=$1::uuid FOR UPDATE",
          [intent.siteId],
        );
        const control = controls[0];
        if (!control || control.mode !== "running") {
          return { kind: "control_not_running" as const };
        }
        if (
          Number(control.revision) !== intent.claimedControlRevision
          || control.control_fingerprint !== intent.claimedControlFingerprint
        ) {
          return { kind: "control_epoch_changed" as const };
        }

        const reservations = await tx.unsafe<ReservationRow[]>(
          "SELECT reservation_id,reservation_fingerprint,site_id::text AS site_id,"
            + "w03_authorization_id,w03_authorization_fingerprint,policy_action_id,"
            + "status,resource_gid,target_url,field,before_fingerprint,after_fingerprint "
            + "FROM policy_mutation_reservations WHERE reservation_id=$1 FOR UPDATE",
          [intent.reservationId],
        );
        const reservation = reservations[0];
        if (!reservation || reservation.status !== "claimed") {
          return { kind: "reservation_not_claimed" as const };
        }

        const claims = await tx.unsafe<ClaimRow[]>(
          "SELECT claim_id,claim_fingerprint,reservation_id,"
            + "reservation_fingerprint,w03_authorization_id,"
            + "w03_authorization_fingerprint,policy_action_id,"
            + "site_id::text AS site_id,control_revision,control_fingerprint,"
            + "resource_gid,target_url,field,before_fingerprint,after_fingerprint "
            + "FROM policy_mutation_claims WHERE claim_id=$1 FOR UPDATE",
          [intent.claimId],
        );
        const claim = claims[0];
        const bindingOk = !!claim
          && claim.claim_fingerprint === intent.claimFingerprint
          && claim.reservation_id === intent.reservationId
          && claim.reservation_fingerprint === intent.reservationFingerprint
          && claim.w03_authorization_id === intent.w03AuthorizationId
          && claim.w03_authorization_fingerprint === intent.w03AuthorizationFingerprint
          && claim.policy_action_id === intent.policyActionId
          && claim.site_id === intent.siteId
          && Number(claim.control_revision) === intent.claimedControlRevision
          && claim.control_fingerprint === intent.claimedControlFingerprint
          && claim.resource_gid === intent.resourceGid
          && claim.target_url === intent.targetUrl
          && claim.field === intent.field
          && claim.before_fingerprint === intent.beforeFingerprint
          && claim.after_fingerprint === intent.afterFingerprint
          && reservation.reservation_fingerprint === intent.reservationFingerprint
          && reservation.w03_authorization_id === intent.w03AuthorizationId
          && reservation.w03_authorization_fingerprint === intent.w03AuthorizationFingerprint
          && reservation.policy_action_id === intent.policyActionId
          && reservation.resource_gid === intent.resourceGid
          && reservation.target_url === intent.targetUrl
          && reservation.field === intent.field
          && reservation.before_fingerprint === intent.beforeFingerprint
          && reservation.after_fingerprint === intent.afterFingerprint;
        if (!bindingOk) return { kind: "claim_binding_mismatch" as const };

        const existing = await tx.unsafe<DispatchRow[]>(
          SELECT_DISPATCH + "WHERE claim_id=$1 FOR UPDATE",
          [intent.claimId],
        );
        if (existing[0]) {
          if (!rowMatchesIntent(existing[0], intent)) {
            return { kind: "dispatch_identity_collision" as const };
          }
          return {
            kind: "existing_reserved" as const,
            record: record(existing[0]),
          };
        }

        const clock = await tx.unsafe<{ now: Date }[]>(
          "SELECT transaction_timestamp() AS now",
        );
        const now = clock[0]?.now;
        if (!(now instanceof Date)) return { kind: "state_uncertain" as const };
        if (now.getTime() >= Date.parse(intent.w03ExpiresAt)) {
          return { kind: "authorization_expired" as const };
        }
        if (now.getTime() >= Date.parse(intent.w06PreflightExpiresAt)) {
          return { kind: "preflight_expired" as const };
        }

        const quota = await tx.unsafe<{ count: number }[]>(
          "SELECT COUNT(*)::int AS count FROM policy_mutation_dispatches "
            + "WHERE site_id=$1::uuid AND forward_attempt_count=1 "
            + "AND reserved_at >= transaction_timestamp() - interval '24 hours'",
          [intent.siteId],
        );
        if (Number(quota[0]?.count ?? 0) >= 1) {
          return { kind: "mutation_quota_exhausted" as const };
        }

        const cooldown = await tx.unsafe<{ count: number }[]>(
          "SELECT COUNT(*)::int AS count FROM policy_mutation_dispatches "
            + "WHERE site_id=$1::uuid AND resource_gid=$2 AND field=$3 "
            + "AND forward_attempt_count=1 "
            + "AND reserved_at >= transaction_timestamp() - interval '14 days'",
          [intent.siteId, intent.resourceGid, intent.field],
        );
        if (Number(cooldown[0]?.count ?? 0) >= 1) {
          return { kind: "same_target_cooldown_blocked" as const };
        }

        const human = await tx.unsafe<{ count: number }[]>(
          "SELECT COUNT(*)::int AS count FROM deployments d "
            + "JOIN action_plans ap ON ap.id=d.action_plan_id "
            + "WHERE ap.site_id=$1::uuid AND d.provider='shopify' "
            + "AND d.status IN ('pending','active')",
          [intent.siteId],
        );
        if (Number(human[0]?.count ?? 0) > 0) {
          return { kind: "human_execution_conflict" as const };
        }

        const nowIso = now.toISOString();
        const inserted = await tx.unsafe<DispatchRow[]>(
          "INSERT INTO policy_mutation_dispatches ("
            + "dispatch_id,dispatch_version,dispatch_fingerprint,"
            + "policy_execution_id,execution_provenance,site_id,policy_id,"
            + "policy_version,policy_fingerprint,evaluation_id,"
            + "evaluation_fingerprint,materialization_id,"
            + "materialization_fingerprint,proposal_id,proposal_fingerprint,"
            + "w03_authorization_id,w03_authorization_fingerprint,"
            + "policy_action_id,reservation_id,reservation_fingerprint,"
            + "claim_id,claim_fingerprint,w06_preflight_id,"
            + "w06_preflight_fingerprint,provider,domain,resource_kind,"
            + "resource_gid,target_url,action_type,field,required_provider_scope,"
            + "before_fingerprint,after_fingerprint,credential_profile_id,"
            + "claimed_control_revision,claimed_control_fingerprint,"
            + "w03_expires_at,w06_preflight_expires_at,state,revision,"
            + "forward_attempt_count,rollback_attempt_count,"
            + "public_write_occurrence,rollback_occurrence,reserved_at"
            + ") VALUES ("
            + "$1,$2,$3,$4,$5,$6::uuid,$7,$8,$9,$10,$11,$12,$13,$14,$15,"
            + "$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,"
            + "$31,$32,$33,$34,$35,$36,$37,$38::timestamptz,$39::timestamptz,"
            + "'reserved_prewrite',1,0,0,'none','none',$40::timestamptz"
            + ") RETURNING " + SELECT_DISPATCH.replace(/^SELECT /, "").replace(/ FROM policy_mutation_dispatches $/, ""),
          [
            intent.dispatchId,
            intent.version,
            intent.dispatchFingerprint,
            intent.policyExecutionId,
            intent.executionProvenance,
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
            intent.provider,
            intent.domain,
            intent.resourceKind,
            intent.resourceGid,
            intent.targetUrl,
            intent.actionType,
            intent.field,
            intent.requiredProviderScope,
            intent.beforeFingerprint,
            intent.afterFingerprint,
            intent.credentialProfileId,
            intent.claimedControlRevision,
            intent.claimedControlFingerprint,
            intent.w03ExpiresAt,
            intent.w06PreflightExpiresAt,
            nowIso,
          ],
        );
        const row = inserted[0];
        if (!row) return { kind: "state_uncertain" as const };
        await this.insertEvent(tx, {
          dispatchId: intent.dispatchId,
          siteId: intent.siteId,
          priorRevision: null,
          priorState: null,
          nextRevision: 1,
          nextState: "reserved_prewrite",
          transitionReason: "w07_prewrite_reserved",
          providerRequestFingerprint: null,
          publicWriteOccurrence: "none",
          rollbackOccurrence: "none",
          effectiveAt: nowIso,
        });
        return { kind: "reserved_new" as const, record: record(row) };
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("p88_w07_")) throw error;
      throw new Error("p88_w07_reserve_state_uncertain");
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  private async transition(input: {
    dispatchId: string;
    expectedRevision: number;
    nextState: P88W07DispatchState;
    reason: string;
    providerRequestId?: string | null;
    providerRequestFingerprint?: string | null;
    providerResponseFingerprint?: string | null;
    publicWriteOccurrence?: P88W07PublicWriteOccurrence;
    rollbackOccurrence?: P88W07RollbackOccurrence;
    requireRunningClaimEpoch?: boolean;
    requireFreshAuthority?: boolean;
    requireBeforeFingerprint?: string | null;
    requireExecutionGates?: boolean;
    publicSiteWritesEnabled?: boolean;
    policyMutationExecutionEnabled?: boolean;
    credentialProfileId?: string | null;
    writeProductsScopePresent?: boolean;
    terminalReservationStatus?: "released" | "consumed" | "manual_intervention" | null;
  }): Promise<P88W07DispatchRecord> {
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      return await sql.begin(async (tx) => {
        const dispatchRows = await tx.unsafe<DispatchRow[]>(
          SELECT_DISPATCH + "WHERE dispatch_id=$1 FOR UPDATE",
          [input.dispatchId],
        );
        const current = dispatchRows[0];
        if (!current) throw new Error("p88_w07_dispatch_missing");
        await this.assertSchemaAndIdentity(sql, current.site_id);

        const controls = await tx.unsafe<ControlRow[]>(
          "SELECT revision,mode,control_fingerprint "
            + "FROM policy_mutation_control_state WHERE site_id=$1::uuid FOR UPDATE",
          [current.site_id],
        );
        const reservations = await tx.unsafe<ReservationRow[]>(
          "SELECT reservation_id,reservation_fingerprint,site_id::text AS site_id,"
            + "w03_authorization_id,w03_authorization_fingerprint,policy_action_id,"
            + "status,resource_gid,target_url,field,before_fingerprint,after_fingerprint "
            + "FROM policy_mutation_reservations WHERE reservation_id=$1 FOR UPDATE",
          [current.reservation_id],
        );
        const claims = await tx.unsafe<ClaimRow[]>(
          "SELECT claim_id,claim_fingerprint,reservation_id,"
            + "reservation_fingerprint,w03_authorization_id,"
            + "w03_authorization_fingerprint,policy_action_id,"
            + "site_id::text AS site_id,control_revision,control_fingerprint,"
            + "resource_gid,target_url,field,before_fingerprint,after_fingerprint "
            + "FROM policy_mutation_claims WHERE claim_id=$1 FOR UPDATE",
          [current.claim_id],
        );
        const control = controls[0];
        const reservation = reservations[0];
        const claim = claims[0];
        if (!control || !reservation || !claim) {
          throw new Error("p88_w07_dispatch_lineage_missing");
        }
        if (
          reservation.status !== "claimed"
          || claim.claim_fingerprint !== current.claim_fingerprint
          || claim.reservation_id !== current.reservation_id
          || claim.reservation_fingerprint !== current.reservation_fingerprint
          || claim.site_id !== current.site_id
          || claim.resource_gid !== current.resource_gid
          || claim.target_url !== current.target_url
          || claim.field !== current.field
          || claim.before_fingerprint !== current.before_fingerprint
          || claim.after_fingerprint !== current.after_fingerprint
        ) {
          throw new Error("p88_w07_dispatch_lineage_mismatch");
        }
        if (Number(current.revision) !== input.expectedRevision) {
          throw new Error("p88_w07_dispatch_revision_conflict");
        }

        if (input.requireRunningClaimEpoch) {
          if (
            control.mode !== "running"
            || Number(control.revision) !== Number(current.claimed_control_revision)
            || control.control_fingerprint !== current.claimed_control_fingerprint
          ) {
            throw new Error("p88_w07_control_epoch_not_forward_eligible");
          }
        }

        const nowRows = await tx.unsafe<{ now: Date }[]>(
          "SELECT transaction_timestamp() AS now",
        );
        const now = nowRows[0]?.now;
        if (!(now instanceof Date)) throw new Error("p88_w07_database_clock_unavailable");
        if (input.requireFreshAuthority) {
          if (now.getTime() >= current.w03_expires_at.getTime()) {
            throw new Error("p88_w07_authorization_expired");
          }
          if (now.getTime() >= current.w06_preflight_expires_at.getTime()) {
            throw new Error("p88_w07_preflight_expired");
          }
        }
        if (
          input.requireBeforeFingerprint !== undefined
          && input.requireBeforeFingerprint !== null
          && input.requireBeforeFingerprint !== current.before_fingerprint
        ) {
          throw new Error("p88_w07_final_before_state_mismatch");
        }
        if (input.requireExecutionGates) {
          if (
            input.publicSiteWritesEnabled !== true
            || input.policyMutationExecutionEnabled !== true
          ) {
            throw new Error("p88_w07_execution_gate_closed");
          }
          if (
            input.credentialProfileId !== current.credential_profile_id
            || input.writeProductsScopePresent !== true
          ) {
            throw new Error("p88_w07_write_credential_binding_invalid");
          }
        }

        const next = projectP88W07Transition({
          current: projection(current),
          nextState: input.nextState,
          publicWriteOccurrence: input.publicWriteOccurrence,
          rollbackOccurrence: input.rollbackOccurrence,
        });

        const terminalAt = next.terminal ? now.toISOString() : null;
        const dispatchStartedAt =
          input.nextState === "dispatch_started"
            ? now.toISOString()
            : current.dispatch_started_at?.toISOString() ?? null;
        const forwardResponseAt =
          (
            input.nextState === "forward_rejected_no_write"
            || input.nextState === "forward_verification_pending"
          )
            ? now.toISOString()
            : current.forward_response_at?.toISOString() ?? null;
        const rollbackStartedAt =
          input.nextState === "rollback_started"
            ? now.toISOString()
            : current.rollback_started_at?.toISOString() ?? null;

        const updated = await tx.unsafe<DispatchRow[]>(
          "UPDATE policy_mutation_dispatches SET state=$3,revision=$4,"
            + "forward_attempt_count=$5,rollback_attempt_count=$6,"
            + "provider_request_id=COALESCE($7,provider_request_id),"
            + "provider_request_fingerprint=COALESCE($8,provider_request_fingerprint),"
            + "provider_response_fingerprint=COALESCE($9,provider_response_fingerprint),"
            + "public_write_occurrence=$10,rollback_occurrence=$11,"
            + "terminal_reason=$12,dispatch_started_at=$13::timestamptz,"
            + "forward_response_at=$14::timestamptz,"
            + "rollback_started_at=$15::timestamptz,terminal_at=$16::timestamptz,"
            + "updated_at=$17::timestamptz "
            + "WHERE dispatch_id=$1 AND revision=$2 RETURNING "
            + SELECT_DISPATCH.replace(/^SELECT /, "").replace(/ FROM policy_mutation_dispatches $/, ""),
          [
            input.dispatchId,
            input.expectedRevision,
            next.toState,
            next.nextRevision,
            next.forwardAttemptCount,
            next.rollbackAttemptCount,
            input.providerRequestId ?? null,
            input.providerRequestFingerprint ?? null,
            input.providerResponseFingerprint ?? null,
            next.publicWriteOccurrence,
            next.rollbackOccurrence,
            next.terminal ? input.reason : null,
            dispatchStartedAt,
            forwardResponseAt,
            rollbackStartedAt,
            terminalAt,
            now.toISOString(),
          ],
        );
        const row = updated[0];
        if (!row) throw new Error("p88_w07_dispatch_update_uncertain");

        if (input.terminalReservationStatus) {
          let terminalSql: string;
          let params: unknown[];
          if (input.terminalReservationStatus === "manual_intervention") {
            terminalSql =
              "UPDATE policy_mutation_reservations SET status='manual_intervention',"
              + "terminal_at=NULL,terminal_reason=$3,updated_at=$2::timestamptz "
              + "WHERE reservation_id=$1 AND status='claimed' RETURNING reservation_id";
            params = [current.reservation_id, now.toISOString(), input.reason];
          } else {
            terminalSql =
              "UPDATE policy_mutation_reservations SET status=$3,"
              + "terminal_at=$2::timestamptz,terminal_reason=$4,"
              + "updated_at=$2::timestamptz "
              + "WHERE reservation_id=$1 AND status='claimed' RETURNING reservation_id";
            params = [
              current.reservation_id,
              now.toISOString(),
              input.terminalReservationStatus,
              input.reason,
            ];
          }
          const closed = await tx.unsafe<{ reservation_id: string }[]>(
            terminalSql,
            params,
          );
          if (closed[0]?.reservation_id !== current.reservation_id) {
            throw new Error("p88_w07_reservation_terminal_update_uncertain");
          }
        } else if (next.terminal) {
          throw new Error("p88_w07_terminal_state_requires_reservation_closure");
        }

        await this.insertEvent(tx, {
          dispatchId: current.dispatch_id,
          siteId: current.site_id,
          priorRevision: Number(current.revision),
          priorState: current.state,
          nextRevision: next.nextRevision,
          nextState: next.toState,
          transitionReason: input.reason,
          providerRequestFingerprint: input.providerRequestFingerprint ?? null,
          publicWriteOccurrence: next.publicWriteOccurrence,
          rollbackOccurrence: next.rollbackOccurrence,
          effectiveAt: now.toISOString(),
        });
        return record(row);
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("p88_w07_")) throw error;
      throw new Error("p88_w07_transition_state_uncertain");
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  startDispatch(input: {
    dispatchId: string;
    expectedRevision: number;
    finalBeforeFingerprint: string;
    publicSiteWritesEnabled: boolean;
    policyMutationExecutionEnabled: boolean;
    credentialProfileId: string;
    writeProductsScopePresent: boolean;
  }) {
    return this.transition({
      ...input,
      nextState: "dispatch_started",
      reason: "w07_dispatch_started",
      publicWriteOccurrence: "possible",
      rollbackOccurrence: "none",
      requireRunningClaimEpoch: true,
      requireFreshAuthority: true,
      requireBeforeFingerprint: input.finalBeforeFingerprint,
      requireExecutionGates: true,
    });
  }

  forwardAccepted(input: {
    dispatchId: string;
    expectedRevision: number;
    providerRequestId: string | null;
    providerRequestFingerprint: string;
    providerResponseFingerprint: string;
  }) {
    return this.transition({
      ...input,
      nextState: "forward_verification_pending",
      reason: "w07_forward_provider_accepted",
      publicWriteOccurrence: "confirmed",
      rollbackOccurrence: "none",
    });
  }

  forwardRejectedNoWrite(input: {
    dispatchId: string;
    expectedRevision: number;
    providerRequestId: string | null;
    providerRequestFingerprint: string;
    providerResponseFingerprint: string;
    exactBeforeStateProven: boolean;
  }) {
    if (!input.exactBeforeStateProven) {
      throw new Error("p88_w07_rejection_before_state_not_proven");
    }
    return this.transition({
      ...input,
      nextState: "forward_rejected_no_write",
      reason: "w07_forward_rejected_exact_before_proven",
      publicWriteOccurrence: "none",
      rollbackOccurrence: "none",
      terminalReservationStatus: "consumed",
    });
  }

  closeForwardVerifiedLive(input: {
    dispatchId: string;
    expectedRevision: number;
  }) {
    return this.transition({
      ...input,
      nextState: "forward_verified_live",
      reason: "w07_forward_verified_live",
      publicWriteOccurrence: "confirmed",
      rollbackOccurrence: "none",
      terminalReservationStatus: "consumed",
    });
  }

  requireRollback(input: {
    dispatchId: string;
    expectedRevision: number;
  }) {
    return this.transition({
      ...input,
      nextState: "rollback_required",
      reason: "w07_forward_verification_failed_rollback_required",
      publicWriteOccurrence: "confirmed",
      rollbackOccurrence: "none",
    });
  }

  startRollback(input: {
    dispatchId: string;
    expectedRevision: number;
  }) {
    return this.transition({
      ...input,
      nextState: "rollback_started",
      reason: "w07_rollback_started",
      publicWriteOccurrence: "confirmed",
      rollbackOccurrence: "possible",
    });
  }

  rollbackAccepted(input: {
    dispatchId: string;
    expectedRevision: number;
    providerRequestId: string | null;
    providerRequestFingerprint: string;
    providerResponseFingerprint: string;
  }) {
    return this.transition({
      ...input,
      nextState: "rollback_verification_pending",
      reason: "w07_rollback_provider_accepted",
      publicWriteOccurrence: "confirmed",
      rollbackOccurrence: "confirmed",
    });
  }

  closeRollbackVerified(input: {
    dispatchId: string;
    expectedRevision: number;
  }) {
    return this.transition({
      ...input,
      nextState: "rollback_verified_closed",
      reason: "w07_rollback_verified_closed",
      publicWriteOccurrence: "confirmed",
      rollbackOccurrence: "confirmed",
      terminalReservationStatus: "consumed",
    });
  }

  cancelBeforeDispatch(input: {
    dispatchId: string;
    expectedRevision: number;
    reason?: string;
  }) {
    return this.transition({
      dispatchId: input.dispatchId,
      expectedRevision: input.expectedRevision,
      nextState: "cancelled_before_dispatch",
      reason: input.reason ?? "w07_cancelled_before_dispatch",
      publicWriteOccurrence: "none",
      rollbackOccurrence: "none",
      terminalReservationStatus: "released",
    });
  }

  async readControlMode(siteId: string): Promise<string | null> {
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, siteId);
      const rows = await sql.unsafe<{ mode: string }[]>(
        "SELECT mode FROM policy_mutation_control_state WHERE site_id=$1::uuid",
        [siteId],
      );
      return rows[0]?.mode ?? null;
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  markManualIntervention(input: {
    dispatchId: string;
    expectedRevision: number;
    reason: string;
    publicWriteOccurrence?: P88W07PublicWriteOccurrence;
    rollbackOccurrence?: P88W07RollbackOccurrence;
  }) {
    return this.transition({
      dispatchId: input.dispatchId,
      expectedRevision: input.expectedRevision,
      nextState: "manual_intervention_required",
      reason: input.reason,
      publicWriteOccurrence: input.publicWriteOccurrence,
      rollbackOccurrence: input.rollbackOccurrence,
      terminalReservationStatus: "manual_intervention",
    });
  }
}

export function p88W07DispatchStoreCapability() {
  return Object.freeze({
    version: P8_8_W07_DISPATCH_VERSION,
    expectedPublicTableCount: P8_8_W07_EXPECTED_TABLE_COUNT,
    explicitDatabaseUrlOnly: true,
    databaseClockAuthoritative: true,
    canonicalLockOrder: [
      "policy_mutation_control_state",
      "policy_mutation_reservations",
      "policy_mutation_claims",
      "policy_mutation_dispatches",
    ] as const,
    forwardAttemptMaximum: 1 as const,
    rollbackAttemptMaximum: 1 as const,
    w04RemainsClaimedWhileNonterminal: true,
    providerNetworkPerformedInsideTransaction: false,
    task51MutationPerformed: false,
    task53MutationPerformed: false,
    task54MutationPerformed: false,
  });
}
