import postgres from "postgres";
import {
  P8_8_W07_EVENT_VERSION,
  P8_8_W07_VERSION,
  assertP88W07Transition,
  p88W07StableHash,
  type P88W07DispatchIntent,
  type P88W07DispatchState,
  type P88W07PublicWriteOccurrence,
} from "./p8-8-policy-single-action-apply.js";

export const P8_8_W07_EXPECTED_TABLE_COUNT = 43 as const;

type Sql = ReturnType<typeof postgres>;
type Tx = Parameters<Parameters<Sql["begin"]>[0]>[0];

export type P88W07DispatchRecord = Readonly<{
  dispatchId: string;
  dispatchFingerprint: string;
  executionId: string;
  siteId: string;
  state: P88W07DispatchState;
  rowRevision: number;
  forwardAttemptCount: 0 | 1;
  rollbackAttemptCount: 0 | 1;
  publicWriteOccurrence: P88W07PublicWriteOccurrence;
  rollbackOccurrence: P88W07PublicWriteOccurrence;
  providerRequestId: string | null;
  providerRequestFingerprint: string | null;
  providerResponseFingerprint: string | null;
  verificationFingerprint: string | null;
  reservedAt: string;
  dispatchStartedAt: string | null;
  rollbackStartedAt: string | null;
  terminalAt: string | null;
  terminalReason: string | null;
}>;

type DispatchRow = {
  dispatch_id: string;
  dispatch_fingerprint: string;
  execution_id: string;
  site_id: string;
  state: P88W07DispatchState;
  row_revision: number;
  forward_attempt_count: number;
  rollback_attempt_count: number;
  public_write_occurrence: P88W07PublicWriteOccurrence;
  rollback_occurrence: P88W07PublicWriteOccurrence;
  provider_request_id: string | null;
  provider_request_fingerprint: string | null;
  provider_response_fingerprint: string | null;
  verification_fingerprint: string | null;
  reserved_at: Date;
  dispatch_started_at: Date | null;
  rollback_started_at: Date | null;
  terminal_at: Date | null;
  terminal_reason: string | null;
};

type ControlRow = {
  site_id: string;
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

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function record(row: DispatchRow): P88W07DispatchRecord {
  const forward = Number(row.forward_attempt_count);
  const rollback = Number(row.rollback_attempt_count);
  if ((forward !== 0 && forward !== 1) || (rollback !== 0 && rollback !== 1)) {
    throw new Error("p88_w07_dispatch_attempt_count_invalid");
  }
  return Object.freeze({
    dispatchId: row.dispatch_id,
    dispatchFingerprint: row.dispatch_fingerprint,
    executionId: row.execution_id,
    siteId: row.site_id,
    state: row.state,
    rowRevision: Number(row.row_revision),
    forwardAttemptCount: forward as 0 | 1,
    rollbackAttemptCount: rollback as 0 | 1,
    publicWriteOccurrence: row.public_write_occurrence,
    rollbackOccurrence: row.rollback_occurrence,
    providerRequestId: row.provider_request_id,
    providerRequestFingerprint: row.provider_request_fingerprint,
    providerResponseFingerprint: row.provider_response_fingerprint,
    verificationFingerprint: row.verification_fingerprint,
    reservedAt: row.reserved_at.toISOString(),
    dispatchStartedAt: iso(row.dispatch_started_at),
    rollbackStartedAt: iso(row.rollback_started_at),
    terminalAt: iso(row.terminal_at),
    terminalReason: row.terminal_reason,
  });
}

const DISPATCH_SELECT =
  "SELECT dispatch_id,dispatch_fingerprint,execution_id,"
  + "site_id::text AS site_id,state,row_revision,forward_attempt_count,"
  + "rollback_attempt_count,public_write_occurrence,rollback_occurrence,"
  + "provider_request_id,provider_request_fingerprint,"
  + "provider_response_fingerprint,verification_fingerprint,reserved_at,"
  + "dispatch_started_at,rollback_started_at,terminal_at,terminal_reason "
  + "FROM policy_mutation_dispatches";

function intentMatchesRows(
  intent: P88W07DispatchIntent,
  control: ControlRow,
  reservation: ReservationRow,
  claim: ClaimRow,
): boolean {
  return (
    control.site_id === intent.siteId
    && Number(control.revision) === intent.control.revision
    && control.control_fingerprint === intent.control.fingerprint
    && reservation.reservation_id === intent.lineage.reservationId
    && reservation.reservation_fingerprint === intent.lineage.reservationFingerprint
    && reservation.site_id === intent.siteId
    && reservation.w03_authorization_id === intent.lineage.w03AuthorizationId
    && reservation.w03_authorization_fingerprint === intent.lineage.w03AuthorizationFingerprint
    && reservation.policy_action_id === intent.lineage.policyActionId
    && reservation.resource_gid === intent.target.resourceGid
    && reservation.target_url === intent.target.targetUrl
    && reservation.field === intent.target.field
    && reservation.before_fingerprint === intent.state.beforeFingerprint
    && reservation.after_fingerprint === intent.state.afterFingerprint
    && claim.claim_id === intent.lineage.claimId
    && claim.claim_fingerprint === intent.lineage.claimFingerprint
    && claim.reservation_id === intent.lineage.reservationId
    && claim.reservation_fingerprint === intent.lineage.reservationFingerprint
    && claim.w03_authorization_id === intent.lineage.w03AuthorizationId
    && claim.w03_authorization_fingerprint === intent.lineage.w03AuthorizationFingerprint
    && claim.policy_action_id === intent.lineage.policyActionId
    && claim.site_id === intent.siteId
    && Number(claim.control_revision) === intent.control.revision
    && claim.control_fingerprint === intent.control.fingerprint
    && claim.resource_gid === intent.target.resourceGid
    && claim.target_url === intent.target.targetUrl
    && claim.field === intent.target.field
    && claim.before_fingerprint === intent.state.beforeFingerprint
    && claim.after_fingerprint === intent.state.afterFingerprint
  );
}

function dispatchIdentityMatches(
  row: DispatchRow,
  intent: P88W07DispatchIntent,
): boolean {
  return row.dispatch_id === intent.dispatchId
    && row.dispatch_fingerprint === intent.dispatchFingerprint
    && row.execution_id === intent.executionId
    && row.site_id === intent.siteId;
}

function eventIdentity(input: {
  dispatchId: string;
  fromRevision: number | null;
  fromState: P88W07DispatchState | null;
  toRevision: number;
  toState: P88W07DispatchState;
  transitionReason: string;
  providerRequestFingerprint: string | null;
  publicWriteOccurrence: P88W07PublicWriteOccurrence;
  rollbackOccurrence: P88W07PublicWriteOccurrence;
  effectiveAt: string;
}) {
  const eventFingerprint = p88W07StableHash({
    version: P8_8_W07_EVENT_VERSION,
    purpose: "p8.8_w07_dispatch_event",
    ...input,
  });
  return {
    eventId: "p88w07-event-" + eventFingerprint.slice(0, 24),
    eventFingerprint,
  };
}

export type P88W07DispatchStoreOptions = {
  databaseUrl: string;
  sqlFactory?: (databaseUrl: string) => Sql;
};

export class P88W07DispatchStore {
  private readonly databaseUrl: string;
  private readonly sqlFactory: (databaseUrl: string) => Sql;

  constructor(options: P88W07DispatchStoreOptions) {
    this.databaseUrl = options.databaseUrl?.trim() ?? "";
    if (!this.databaseUrl) throw new Error("p88_w07_database_url_required");
    this.sqlFactory = options.sqlFactory ?? ((databaseUrl) =>
      postgres(databaseUrl, {
        max: 4,
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
    const sites = await sql.unsafe<{ id: string }[]>(
      "SELECT id::text AS id FROM sites WHERE id=$1::uuid "
        + "AND lower(domain)='diamondshelf.us' "
        + "AND canonical_origin='https://diamondshelf.us' "
        + "AND platform='shopify' AND is_active=true LIMIT 1",
      [siteId],
    );
    if (sites[0]?.id !== siteId) throw new Error("p88_w07_site_identity_mismatch");
  }

  private async lockLineage(
    tx: Tx,
    intent: P88W07DispatchIntent,
  ): Promise<{ control: ControlRow; reservation: ReservationRow; claim: ClaimRow; now: Date }> {
    const controls = await tx.unsafe<ControlRow[]>(
      "SELECT site_id::text AS site_id,revision,mode,control_fingerprint "
        + "FROM policy_mutation_control_state WHERE site_id=$1::uuid FOR UPDATE",
      [intent.siteId],
    );
    const control = controls[0];
    if (!control) throw new Error("p88_w07_control_missing");

    const reservations = await tx.unsafe<ReservationRow[]>(
      "SELECT reservation_id,reservation_fingerprint,site_id::text AS site_id,"
        + "w03_authorization_id,w03_authorization_fingerprint,policy_action_id,"
        + "status,resource_gid,target_url,field,before_fingerprint,after_fingerprint "
        + "FROM policy_mutation_reservations WHERE reservation_id=$1 FOR UPDATE",
      [intent.lineage.reservationId],
    );
    const reservation = reservations[0];
    if (!reservation) throw new Error("p88_w07_reservation_missing");

    const claims = await tx.unsafe<ClaimRow[]>(
      "SELECT claim_id,claim_fingerprint,reservation_id,reservation_fingerprint,"
        + "w03_authorization_id,w03_authorization_fingerprint,policy_action_id,"
        + "site_id::text AS site_id,control_revision,control_fingerprint,"
        + "resource_gid,target_url,field,before_fingerprint,after_fingerprint "
        + "FROM policy_mutation_claims WHERE claim_id=$1 FOR UPDATE",
      [intent.lineage.claimId],
    );
    const claim = claims[0];
    if (!claim) throw new Error("p88_w07_claim_missing");

    if (!intentMatchesRows(intent, control, reservation, claim)) {
      throw new Error("p88_w07_durable_lineage_mismatch");
    }

    const clocks = await tx.unsafe<{ now: Date }[]>(
      "SELECT transaction_timestamp() AS now",
    );
    const now = clocks[0]?.now;
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
      throw new Error("p88_w07_database_clock_unavailable");
    }
    return { control, reservation, claim, now };
  }

  private async insertEvent(tx: Tx, input: {
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
  }): Promise<void> {
    const identity = eventIdentity({
      dispatchId: input.dispatchId,
      fromRevision: input.fromRevision,
      fromState: input.fromState,
      toRevision: input.toRevision,
      toState: input.toState,
      transitionReason: input.transitionReason,
      providerRequestFingerprint: input.providerRequestFingerprint,
      publicWriteOccurrence: input.publicWriteOccurrence,
      rollbackOccurrence: input.rollbackOccurrence,
      effectiveAt: input.effectiveAt,
    });
    await tx.unsafe(
      "INSERT INTO policy_mutation_dispatch_events ("
        + "event_id,event_version,event_fingerprint,dispatch_id,site_id,"
        + "from_revision,from_state,to_revision,to_state,transition_reason,"
        + "provider_request_fingerprint,public_write_occurrence,"
        + "rollback_occurrence,effective_at"
        + ") VALUES ($1,$2,$3,$4,$5::uuid,$6,$7,$8,$9,$10,$11,$12,$13,$14::timestamptz)",
      [
        identity.eventId,
        P8_8_W07_EVENT_VERSION,
        identity.eventFingerprint,
        input.dispatchId,
        input.siteId,
        input.fromRevision,
        input.fromState,
        input.toRevision,
        input.toState,
        input.transitionReason,
        input.providerRequestFingerprint,
        input.publicWriteOccurrence,
        input.rollbackOccurrence,
        input.effectiveAt,
      ],
    );
  }

  async read(dispatchId: string): Promise<P88W07DispatchRecord | null> {
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      const rows = await sql.unsafe<DispatchRow[]>(
        DISPATCH_SELECT + " WHERE dispatch_id=$1",
        [dispatchId],
      );
      return rows[0] ? record(rows[0]) : null;
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  async reservePrewrite(intent: P88W07DispatchIntent): Promise<Readonly<{
    kind: "created" | "existing";
    record: P88W07DispatchRecord;
  }>> {
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, intent.siteId);
      return await sql.begin(async (tx) => {
        const { control, reservation, now } = await this.lockLineage(tx, intent);
        if (control.mode !== "running") throw new Error("p88_w07_control_not_running");
        if (reservation.status !== "claimed") {
          throw new Error("p88_w07_reservation_not_claimed");
        }
        const nowMs = now.getTime();
        if (
          Date.parse(intent.w03ExpiresAt) <= nowMs
          || Date.parse(intent.w06PreflightExpiresAt) <= nowMs
        ) {
          throw new Error("p88_w07_authority_expired");
        }

        const existing = await tx.unsafe<DispatchRow[]>(
          DISPATCH_SELECT
            + " WHERE claim_id=$1 OR reservation_id=$2 OR policy_action_id=$3 "
            + "ORDER BY created_at LIMIT 1 FOR UPDATE",
          [
            intent.lineage.claimId,
            intent.lineage.reservationId,
            intent.lineage.policyActionId,
          ],
        );
        if (existing[0]) {
          if (!dispatchIdentityMatches(existing[0], intent)) {
            throw new Error("p88_w07_dispatch_identity_collision");
          }
          return Object.freeze({
            kind: "existing" as const,
            record: record(existing[0]),
          });
        }

        const manual = await tx.unsafe<{ count: number }[]>(
          "SELECT COUNT(*)::int AS count FROM policy_mutation_reservations "
            + "WHERE site_id=$1::uuid AND status='manual_intervention'",
          [intent.siteId],
        );
        if (Number(manual[0]?.count ?? 0) > 0) {
          throw new Error("p88_w07_manual_intervention_blocked");
        }

        const quota = await tx.unsafe<{ count: number }[]>(
          "SELECT COUNT(*)::int AS count FROM policy_mutation_dispatches "
            + "WHERE site_id=$1::uuid AND forward_attempt_count=1 "
            + "AND dispatch_started_at >= $2::timestamptz - interval '24 hours'",
          [intent.siteId, now.toISOString()],
        );
        if (Number(quota[0]?.count ?? 0) >= 1) {
          throw new Error("p88_w07_mutation_quota_exhausted");
        }

        const cooldownHours = 336;
        const cooldown = await tx.unsafe<{ count: number }[]>(
          "SELECT COUNT(*)::int AS count FROM policy_mutation_dispatches "
            + "WHERE site_id=$1::uuid AND resource_gid=$2 AND field=$3 "
            + "AND forward_attempt_count=1 "
            + "AND dispatch_started_at >= $4::timestamptz "
            + "- ($5::text || ' hours')::interval",
          [
            intent.siteId,
            intent.target.resourceGid,
            intent.target.field,
            now.toISOString(),
            String(cooldownHours),
          ],
        );
        if (Number(cooldown[0]?.count ?? 0) > 0) {
          throw new Error("p88_w07_same_target_cooldown_blocked");
        }

        const human = await tx.unsafe<{ count: number }[]>(
          "SELECT COUNT(*)::int AS count FROM deployments d "
            + "JOIN action_plans ap ON ap.id=d.action_plan_id "
            + "WHERE ap.site_id=$1::uuid AND d.provider='shopify' "
            + "AND d.status IN ('pending','active')",
          [intent.siteId],
        );
        if (Number(human[0]?.count ?? 0) > 0) {
          throw new Error("p88_w07_human_execution_conflict");
        }

        const inserted = await tx.unsafe<DispatchRow[]>(
          "INSERT INTO policy_mutation_dispatches ("
            + "dispatch_id,dispatch_version,dispatch_fingerprint,execution_id,"
            + "execution_provenance,site_id,policy_id,policy_version,"
            + "policy_fingerprint,evaluation_id,evaluation_fingerprint,"
            + "materialization_id,materialization_fingerprint,proposal_id,"
            + "proposal_fingerprint,w03_authorization_id,"
            + "w03_authorization_fingerprint,policy_action_id,reservation_id,"
            + "reservation_fingerprint,claim_id,claim_fingerprint,"
            + "w06_preflight_id,w06_preflight_fingerprint,"
            + "credential_profile_id,control_revision,control_fingerprint,"
            + "provider,domain,resource_kind,resource_gid,target_url,"
            + "action_type,field,required_provider_scope,before_fingerprint,"
            + "after_fingerprint,state,reserved_at"
            + ") VALUES ($1,$2,$3,$4,$5,$6::uuid,$7,$8,$9,$10,$11,$12,$13,"
            + "$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,"
            + "$29,$30,$31,$32,$33,$34,$35,$36,$37,'reserved_prewrite',$38::timestamptz) "
            + "RETURNING dispatch_id,dispatch_fingerprint,execution_id,"
            + "site_id::text AS site_id,state,row_revision,forward_attempt_count,"
            + "rollback_attempt_count,public_write_occurrence,rollback_occurrence,"
            + "provider_request_id,provider_request_fingerprint,"
            + "provider_response_fingerprint,verification_fingerprint,reserved_at,"
            + "dispatch_started_at,rollback_started_at,terminal_at,terminal_reason",
          [
            intent.dispatchId,
            P8_8_W07_VERSION,
            intent.dispatchFingerprint,
            intent.executionId,
            intent.executionProvenance,
            intent.siteId,
            intent.policy.policyId,
            intent.policy.policyVersion,
            intent.policy.policyFingerprint,
            intent.lineage.evaluationId,
            intent.lineage.evaluationFingerprint,
            intent.lineage.materializationId,
            intent.lineage.materializationFingerprint,
            intent.lineage.proposalId,
            intent.lineage.proposalFingerprint,
            intent.lineage.w03AuthorizationId,
            intent.lineage.w03AuthorizationFingerprint,
            intent.lineage.policyActionId,
            intent.lineage.reservationId,
            intent.lineage.reservationFingerprint,
            intent.lineage.claimId,
            intent.lineage.claimFingerprint,
            intent.lineage.w06PreflightId,
            intent.lineage.w06PreflightFingerprint,
            intent.policy.credentialProfileId,
            intent.control.revision,
            intent.control.fingerprint,
            intent.target.provider,
            intent.target.domain,
            intent.target.resourceKind,
            intent.target.resourceGid,
            intent.target.targetUrl,
            intent.target.actionType,
            intent.target.field,
            intent.target.requiredProviderScope,
            intent.state.beforeFingerprint,
            intent.state.afterFingerprint,
            now.toISOString(),
          ],
        );
        const row = inserted[0];
        if (!row) throw new Error("p88_w07_dispatch_insert_failed");
        await this.insertEvent(tx, {
          dispatchId: intent.dispatchId,
          siteId: intent.siteId,
          fromRevision: null,
          fromState: null,
          toRevision: 1,
          toState: "reserved_prewrite",
          transitionReason: "w07_reserved_prewrite",
          providerRequestFingerprint: null,
          publicWriteOccurrence: "none",
          rollbackOccurrence: "none",
          effectiveAt: now.toISOString(),
        });
        return Object.freeze({ kind: "created" as const, record: record(row) });
      });
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  async startDispatch(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
    observedBeforeValue: string | null;
    observedBeforeFingerprint: string;
    publicSiteWritesEnabled: boolean;
    policyMutationExecutionEnabled: boolean;
    credentialProfileId: string;
    credentialScopes: readonly string[];
  }): Promise<P88W07DispatchRecord> {
    if (
      !input.publicSiteWritesEnabled
      || !input.policyMutationExecutionEnabled
    ) throw new Error("p88_w07_execution_gate_disabled");
    if (
      input.credentialProfileId !== input.intent.policy.credentialProfileId
      || !input.credentialScopes.includes("write_products")
    ) throw new Error("p88_w07_write_credential_binding_invalid");
    if (
      input.observedBeforeValue !== input.intent.state.beforeValue
      || input.observedBeforeFingerprint !== input.intent.state.beforeFingerprint
    ) throw new Error("p88_w07_final_before_state_mismatch");

    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, input.intent.siteId);
      return await sql.begin(async (tx) => {
        const { control, reservation, now } = await this.lockLineage(
          tx,
          input.intent,
        );
        if (
          control.mode !== "running"
          || Number(control.revision) !== input.intent.control.revision
          || control.control_fingerprint !== input.intent.control.fingerprint
        ) throw new Error("p88_w07_control_epoch_not_forward_eligible");
        if (reservation.status !== "claimed") {
          throw new Error("p88_w07_reservation_not_claimed");
        }
        if (
          Date.parse(input.intent.w03ExpiresAt) <= now.getTime()
          || Date.parse(input.intent.w06PreflightExpiresAt) <= now.getTime()
        ) throw new Error("p88_w07_authority_expired");

        const rows = await tx.unsafe<DispatchRow[]>(
          DISPATCH_SELECT + " WHERE dispatch_id=$1 FOR UPDATE",
          [input.intent.dispatchId],
        );
        const current = rows[0];
        if (!current || !dispatchIdentityMatches(current, input.intent)) {
          throw new Error("p88_w07_dispatch_state_uncertain");
        }
        if (
          current.state !== "reserved_prewrite"
          || Number(current.row_revision) !== input.expectedRowRevision
          || Number(current.forward_attempt_count) !== 0
        ) throw new Error("p88_w07_forward_dispatch_already_spent");

        assertP88W07Transition(current.state, "dispatch_started");
        const nextRevision = Number(current.row_revision) + 1;
        const updated = await tx.unsafe<DispatchRow[]>(
          "UPDATE policy_mutation_dispatches SET state='dispatch_started',"
            + "row_revision=$2,forward_attempt_count=1,"
            + "public_write_occurrence='possible',dispatch_started_at=$3::timestamptz,"
            + "updated_at=$3::timestamptz WHERE dispatch_id=$1 "
            + "AND state='reserved_prewrite' AND row_revision=$4 "
            + "AND forward_attempt_count=0 RETURNING dispatch_id,"
            + "dispatch_fingerprint,execution_id,site_id::text AS site_id,state,"
            + "row_revision,forward_attempt_count,rollback_attempt_count,"
            + "public_write_occurrence,rollback_occurrence,provider_request_id,"
            + "provider_request_fingerprint,provider_response_fingerprint,"
            + "verification_fingerprint,reserved_at,dispatch_started_at,"
            + "rollback_started_at,terminal_at,terminal_reason",
          [
            input.intent.dispatchId,
            nextRevision,
            now.toISOString(),
            input.expectedRowRevision,
          ],
        );
        if (!updated[0]) throw new Error("p88_w07_dispatch_start_race");
        await this.insertEvent(tx, {
          dispatchId: input.intent.dispatchId,
          siteId: input.intent.siteId,
          fromRevision: input.expectedRowRevision,
          fromState: "reserved_prewrite",
          toRevision: nextRevision,
          toState: "dispatch_started",
          transitionReason: "w07_forward_attempt_spent",
          providerRequestFingerprint: null,
          publicWriteOccurrence: "possible",
          rollbackOccurrence: "none",
          effectiveAt: now.toISOString(),
        });
        return record(updated[0]);
      });
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  private async terminalReservation(
    tx: Tx,
    intent: P88W07DispatchIntent,
    status: "released" | "consumed" | "manual_intervention",
    reason: string,
    now: string,
  ): Promise<void> {
    const setTerminal = status === "manual_intervention"
      ? "terminal_at=NULL"
      : "terminal_at=$4::timestamptz";
    const updated = await tx.unsafe<{ reservation_id: string }[]>(
      "UPDATE policy_mutation_reservations SET status=$2,"
        + setTerminal + ",terminal_reason=$3,updated_at=$4::timestamptz "
        + "WHERE reservation_id=$1 AND status='claimed' RETURNING reservation_id",
      [intent.lineage.reservationId, status, reason, now],
    );
    if (updated[0]?.reservation_id !== intent.lineage.reservationId) {
      throw new Error("p88_w07_reservation_terminal_transition_failed");
    }
  }

  private async transition(input: {
    intent: P88W07DispatchIntent;
    expectedState: P88W07DispatchState;
    expectedRowRevision: number;
    toState: P88W07DispatchState;
    reason: string;
    publicWriteOccurrence: P88W07PublicWriteOccurrence;
    rollbackOccurrence: P88W07PublicWriteOccurrence;
    providerRequestId?: string | null;
    providerRequestFingerprint?: string | null;
    providerResponseFingerprint?: string | null;
    verificationFingerprint?: string | null;
    startRollback?: boolean;
    terminalReservationStatus?: "released" | "consumed" | "manual_intervention";
  }): Promise<P88W07DispatchRecord> {
    assertP88W07Transition(input.expectedState, input.toState);
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, input.intent.siteId);
      return await sql.begin(async (tx) => {
        const { reservation, now } = await this.lockLineage(tx, input.intent);
        if (
          reservation.status !== "claimed"
          && !(
            input.expectedState === "manual_intervention_required"
            && reservation.status === "manual_intervention"
          )
        ) throw new Error("p88_w07_reservation_not_claimed");

        const rows = await tx.unsafe<DispatchRow[]>(
          DISPATCH_SELECT + " WHERE dispatch_id=$1 FOR UPDATE",
          [input.intent.dispatchId],
        );
        const current = rows[0];
        if (!current || !dispatchIdentityMatches(current, input.intent)) {
          throw new Error("p88_w07_dispatch_state_uncertain");
        }
        if (
          current.state !== input.expectedState
          || Number(current.row_revision) !== input.expectedRowRevision
        ) throw new Error("p88_w07_dispatch_revision_conflict");
        if (input.startRollback && Number(current.rollback_attempt_count) !== 0) {
          throw new Error("p88_w07_rollback_attempt_already_spent");
        }

        const nextRevision = input.expectedRowRevision + 1;
        const terminal = [
          "forward_rejected_no_write",
          "forward_verified_live",
          "rollback_verified_closed",
          "cancelled_before_dispatch",
          "manual_intervention_required",
        ].includes(input.toState);
        const sets = [
          "state=$2",
          "row_revision=$3",
          "public_write_occurrence=$4",
          "rollback_occurrence=$5",
          "provider_request_id=$6",
          "provider_request_fingerprint=$7",
          "provider_response_fingerprint=$8",
          "verification_fingerprint=$9",
          "updated_at=$10::timestamptz",
          input.startRollback
            ? "rollback_attempt_count=1"
            : "rollback_attempt_count=rollback_attempt_count",
          input.startRollback
            ? "rollback_started_at=$10::timestamptz"
            : "rollback_started_at=rollback_started_at",
          terminal
            ? "terminal_at=$10::timestamptz"
            : "terminal_at=terminal_at",
          terminal
            ? "terminal_reason=$11"
            : "terminal_reason=terminal_reason",
        ];
        const updated = await tx.unsafe<DispatchRow[]>(
          "UPDATE policy_mutation_dispatches SET " + sets.join(",")
            + " WHERE dispatch_id=$1 AND state=$12 AND row_revision=$13 "
            + "RETURNING dispatch_id,dispatch_fingerprint,execution_id,"
            + "site_id::text AS site_id,state,row_revision,forward_attempt_count,"
            + "rollback_attempt_count,public_write_occurrence,rollback_occurrence,"
            + "provider_request_id,provider_request_fingerprint,"
            + "provider_response_fingerprint,verification_fingerprint,reserved_at,"
            + "dispatch_started_at,rollback_started_at,terminal_at,terminal_reason",
          [
            input.intent.dispatchId,
            input.toState,
            nextRevision,
            input.publicWriteOccurrence,
            input.rollbackOccurrence,
            input.providerRequestId ?? current.provider_request_id,
            input.providerRequestFingerprint ?? current.provider_request_fingerprint,
            input.providerResponseFingerprint ?? current.provider_response_fingerprint,
            input.verificationFingerprint ?? current.verification_fingerprint,
            now.toISOString(),
            input.reason,
            input.expectedState,
            input.expectedRowRevision,
          ],
        );
        if (!updated[0]) throw new Error("p88_w07_dispatch_transition_race");

        if (input.terminalReservationStatus) {
          await this.terminalReservation(
            tx,
            input.intent,
            input.terminalReservationStatus,
            input.reason,
            now.toISOString(),
          );
        }

        await this.insertEvent(tx, {
          dispatchId: input.intent.dispatchId,
          siteId: input.intent.siteId,
          fromRevision: input.expectedRowRevision,
          fromState: input.expectedState,
          toRevision: nextRevision,
          toState: input.toState,
          transitionReason: input.reason,
          providerRequestFingerprint:
            input.providerRequestFingerprint ?? current.provider_request_fingerprint,
          publicWriteOccurrence: input.publicWriteOccurrence,
          rollbackOccurrence: input.rollbackOccurrence,
          effectiveAt: now.toISOString(),
        });
        return record(updated[0]);
      });
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  cancelBeforeDispatch(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
    reason?: string;
  }) {
    return this.transition({
      intent: input.intent,
      expectedState: "reserved_prewrite",
      expectedRowRevision: input.expectedRowRevision,
      toState: "cancelled_before_dispatch",
      reason: input.reason ?? "w07_cancelled_before_dispatch",
      publicWriteOccurrence: "none",
      rollbackOccurrence: "none",
      terminalReservationStatus: "released",
    });
  }

  markForwardRejectedNoWrite(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
    providerRequestId: string | null;
    providerRequestFingerprint: string | null;
    providerResponseFingerprint: string;
  }) {
    return this.transition({
      intent: input.intent,
      expectedState: "dispatch_started",
      expectedRowRevision: input.expectedRowRevision,
      toState: "forward_rejected_no_write",
      reason: "w07_forward_rejected_exact_before_proven",
      publicWriteOccurrence: "none",
      rollbackOccurrence: "none",
      providerRequestId: input.providerRequestId,
      providerRequestFingerprint: input.providerRequestFingerprint,
      providerResponseFingerprint: input.providerResponseFingerprint,
      terminalReservationStatus: "consumed",
    });
  }

  markForwardAccepted(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
    providerRequestId: string | null;
    providerRequestFingerprint: string | null;
    providerResponseFingerprint: string;
  }) {
    return this.transition({
      intent: input.intent,
      expectedState: "dispatch_started",
      expectedRowRevision: input.expectedRowRevision,
      toState: "forward_verification_pending",
      reason: "w07_forward_accepted_pending_verification",
      publicWriteOccurrence: "confirmed",
      rollbackOccurrence: "none",
      providerRequestId: input.providerRequestId,
      providerRequestFingerprint: input.providerRequestFingerprint,
      providerResponseFingerprint: input.providerResponseFingerprint,
    });
  }

  markForwardVerifiedLive(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
    verificationFingerprint: string;
  }) {
    return this.transition({
      intent: input.intent,
      expectedState: "forward_verification_pending",
      expectedRowRevision: input.expectedRowRevision,
      toState: "forward_verified_live",
      reason: "w07_forward_verified_live",
      publicWriteOccurrence: "confirmed",
      rollbackOccurrence: "none",
      verificationFingerprint: input.verificationFingerprint,
      terminalReservationStatus: "consumed",
    });
  }

  markRollbackRequired(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
    verificationFingerprint: string;
    reason?: string;
  }) {
    return this.transition({
      intent: input.intent,
      expectedState: "forward_verification_pending",
      expectedRowRevision: input.expectedRowRevision,
      toState: "rollback_required",
      reason: input.reason ?? "w07_forward_verification_failed",
      publicWriteOccurrence: "confirmed",
      rollbackOccurrence: "none",
      verificationFingerprint: input.verificationFingerprint,
    });
  }

  startRollback(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
  }) {
    return this.transition({
      intent: input.intent,
      expectedState: "rollback_required",
      expectedRowRevision: input.expectedRowRevision,
      toState: "rollback_started",
      reason: "w07_rollback_attempt_spent",
      publicWriteOccurrence: "confirmed",
      rollbackOccurrence: "possible",
      startRollback: true,
    });
  }

  markRollbackAccepted(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
    providerRequestId: string | null;
    providerRequestFingerprint: string | null;
    providerResponseFingerprint: string;
  }) {
    return this.transition({
      intent: input.intent,
      expectedState: "rollback_started",
      expectedRowRevision: input.expectedRowRevision,
      toState: "rollback_verification_pending",
      reason: "w07_rollback_accepted_pending_verification",
      publicWriteOccurrence: "confirmed",
      rollbackOccurrence: "confirmed",
      providerRequestId: input.providerRequestId,
      providerRequestFingerprint: input.providerRequestFingerprint,
      providerResponseFingerprint: input.providerResponseFingerprint,
    });
  }

  markRollbackVerifiedClosed(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
    verificationFingerprint: string;
  }) {
    return this.transition({
      intent: input.intent,
      expectedState: "rollback_verification_pending",
      expectedRowRevision: input.expectedRowRevision,
      toState: "rollback_verified_closed",
      reason: "w07_rollback_verified_closed",
      publicWriteOccurrence: "confirmed",
      rollbackOccurrence: "confirmed",
      verificationFingerprint: input.verificationFingerprint,
      terminalReservationStatus: "consumed",
    });
  }

  markManualIntervention(input: {
    intent: P88W07DispatchIntent;
    expectedState:
      | "dispatch_started"
      | "forward_verification_pending"
      | "rollback_required"
      | "rollback_started"
      | "rollback_verification_pending";
    expectedRowRevision: number;
    reason: string;
    publicWriteOccurrence: "possible" | "confirmed";
    rollbackOccurrence: P88W07PublicWriteOccurrence;
    verificationFingerprint?: string | null;
  }) {
    return this.transition({
      intent: input.intent,
      expectedState: input.expectedState,
      expectedRowRevision: input.expectedRowRevision,
      toState: "manual_intervention_required",
      reason: input.reason,
      publicWriteOccurrence: input.publicWriteOccurrence,
      rollbackOccurrence: input.rollbackOccurrence,
      verificationFingerprint: input.verificationFingerprint,
      terminalReservationStatus: "manual_intervention",
    });
  }
}
