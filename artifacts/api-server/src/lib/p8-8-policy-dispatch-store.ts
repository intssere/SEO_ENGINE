import postgres from "postgres";
import {
  assertP88W06ProviderObservationIntegrity,
  type P88W06ProviderObservation,
} from "./p8-8-policy-preflight.js";
import { p88W02StateFingerprint } from "./p8-8-governed-proposal-materialization.js";
import {
  P8_8_W07_DISPATCH_EVENT_VERSION,
  P8_8_W07_DISPATCH_VERSION,
  assertP88W07ExecutionIntentIntegrity,
  assertP88W07TransitionAllowed,
  p88W07DispatchEligibilityIssues,
  p88W07ReservationTerminalStatus,
  p88W07StableHash,
  type P88W07DispatchEligibility,
  type P88W07DispatchState,
  type P88W07ExecutionIntent,
  type P88W07PublicWriteOccurrence,
  type P88W07RollbackWriteOccurrence,
  type P88W07W06Handoff,
} from "./p8-8-policy-single-action-apply.js";

export const P8_8_W07_EXPECTED_TABLE_COUNT = 43 as const;

type Sql = ReturnType<typeof postgres>;
type SqlExecutor = Pick<Sql, "unsafe">;

type ControlRow = {
  site_id: string;
  control_version: string;
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

type DispatchRow = {
  dispatch_id: string;
  dispatch_version: string;
  execution_id: string;
  execution_fingerprint: string;
  dispatch_fingerprint: string;
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
  state: P88W07DispatchState;
  revision: number;
  forward_attempt_count: number;
  rollback_attempt_count: number;
  public_write_occurrence: P88W07PublicWriteOccurrence;
  provider_request_id: string | null;
  provider_operation_fingerprint: string | null;
  provider_response_fingerprint: string | null;
  final_closure_reason: string | null;
  created_at: Date;
  updated_at: Date;
};

export type P88W07DispatchReceipt = Readonly<{
  version: typeof P8_8_W07_DISPATCH_VERSION;
  dispatchId: string;
  dispatchFingerprint: string;
  executionId: string;
  executionFingerprint: string;
  siteId: string;
  reservationId: string;
  reservationFingerprint: string;
  claimId: string;
  claimFingerprint: string;
  policyActionId: string;
  w06PreflightId: string;
  w06PreflightFingerprint: string;
  state: P88W07DispatchState;
  revision: number;
  forwardAttemptCount: 0 | 1;
  rollbackAttemptCount: 0 | 1;
  publicWriteOccurrence: P88W07PublicWriteOccurrence;
  providerRequestId: string | null;
  providerOperationFingerprint: string | null;
  providerResponseFingerprint: string | null;
  finalClosureReason: string | null;
  updatedAt: string;
  durable: true;
  forwardRetryAllowed: false;
  rollbackRetryAllowed: false;
}>;

export type P88W07ReserveResult = Readonly<{
  kind: "reserved_new" | "existing_exact";
  receipt: P88W07DispatchReceipt;
}>;

export type P88W07StartResult = Readonly<{
  kind: "started_new" | "already_started_or_terminal";
  receipt: P88W07DispatchReceipt;
}>;

export type P88W07RollbackStartResult = Readonly<{
  kind: "started_new" | "already_started_or_terminal";
  receipt: P88W07DispatchReceipt;
}>;

const DISPATCH_COLUMNS = [
  "dispatch_id",
  "dispatch_version",
  "execution_id",
  "execution_fingerprint",
  "dispatch_fingerprint",
  "site_id",
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
  "provider",
  "domain",
  "resource_kind",
  "resource_gid",
  "target_url",
  "action_type",
  "field",
  "required_provider_scope",
  "before_fingerprint",
  "after_fingerprint",
  "state",
  "revision",
  "forward_attempt_count",
  "rollback_attempt_count",
  "public_write_occurrence",
  "provider_request_id",
  "provider_operation_fingerprint",
  "provider_response_fingerprint",
  "final_closure_reason",
  "created_at",
  "updated_at",
] as const;

const EVENT_COLUMNS = [
  "event_id",
  "event_version",
  "event_fingerprint",
  "dispatch_id",
  "site_id",
  "from_revision",
  "from_state",
  "to_revision",
  "to_state",
  "transition_reason",
  "provider_request_fingerprint",
  "public_write_occurrence",
  "rollback_write_occurrence",
  "effective_at",
  "created_at",
] as const;

function canonicalIso(value: Date, code: string): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(code);
  }
  return value.toISOString();
}

function receipt(row: DispatchRow): P88W07DispatchReceipt {
  if (
    row.dispatch_version !== P8_8_W07_DISPATCH_VERSION
    || ![0, 1].includes(Number(row.forward_attempt_count))
    || ![0, 1].includes(Number(row.rollback_attempt_count))
  ) {
    throw new Error("p88_w07_dispatch_row_invalid");
  }
  return Object.freeze({
    version: P8_8_W07_DISPATCH_VERSION,
    dispatchId: row.dispatch_id,
    dispatchFingerprint: row.dispatch_fingerprint,
    executionId: row.execution_id,
    executionFingerprint: row.execution_fingerprint,
    siteId: row.site_id,
    reservationId: row.reservation_id,
    reservationFingerprint: row.reservation_fingerprint,
    claimId: row.claim_id,
    claimFingerprint: row.claim_fingerprint,
    policyActionId: row.policy_action_id,
    w06PreflightId: row.w06_preflight_id,
    w06PreflightFingerprint: row.w06_preflight_fingerprint,
    state: row.state,
    revision: Number(row.revision),
    forwardAttemptCount: Number(row.forward_attempt_count) as 0 | 1,
    rollbackAttemptCount: Number(row.rollback_attempt_count) as 0 | 1,
    publicWriteOccurrence: row.public_write_occurrence,
    providerRequestId: row.provider_request_id,
    providerOperationFingerprint: row.provider_operation_fingerprint,
    providerResponseFingerprint: row.provider_response_fingerprint,
    finalClosureReason: row.final_closure_reason,
    updatedAt: canonicalIso(row.updated_at, "p88_w07_dispatch_updated_at_invalid"),
    durable: true as const,
    forwardRetryAllowed: false as const,
    rollbackRetryAllowed: false as const,
  });
}

function dispatchMatchesIntent(
  row: DispatchRow,
  intent: P88W07ExecutionIntent,
): boolean {
  return (
    row.dispatch_id === intent.dispatchId
    && row.dispatch_version === P8_8_W07_DISPATCH_VERSION
    && row.execution_id === intent.executionId
    && row.execution_fingerprint === intent.executionFingerprint
    && row.dispatch_fingerprint === intent.dispatchFingerprint
    && row.site_id === intent.siteId
    && row.policy_id === intent.policy.policyId
    && row.policy_version === intent.policy.policyVersion
    && row.policy_fingerprint === intent.policy.policyFingerprint
    && row.evaluation_id === intent.evaluation.evaluationId
    && row.evaluation_fingerprint === intent.evaluation.evaluationFingerprint
    && row.materialization_id === intent.materialization.materializationId
    && row.materialization_fingerprint
      === intent.materialization.materializationFingerprint
    && row.proposal_id === intent.proposal.proposalId
    && row.proposal_fingerprint === intent.proposal.proposalFingerprint
    && row.w03_authorization_id === intent.authorization.w03AuthorizationId
    && row.w03_authorization_fingerprint
      === intent.authorization.w03AuthorizationFingerprint
    && row.policy_action_id === intent.authorization.policyActionId
    && row.reservation_id === intent.reservation.reservationId
    && row.reservation_fingerprint === intent.reservation.reservationFingerprint
    && row.claim_id === intent.claim.claimId
    && row.claim_fingerprint === intent.claim.claimFingerprint
    && row.w06_preflight_id === intent.preflight.preflightId
    && row.w06_preflight_fingerprint === intent.preflight.preflightFingerprint
    && row.credential_profile_id === intent.credentialProfileId
    && Number(row.claimed_control_revision) === intent.claim.controlRevision
    && row.claimed_control_fingerprint === intent.claim.controlFingerprint
    && row.provider === intent.target.provider
    && row.domain === intent.target.domain
    && row.resource_kind === intent.target.resourceKind
    && row.resource_gid === intent.target.resourceGid
    && row.target_url === intent.target.targetUrl
    && row.action_type === intent.target.actionType
    && row.field === intent.target.field
    && row.required_provider_scope === intent.target.requiredProviderScope
    && row.before_fingerprint === intent.state.beforeFingerprint
    && row.after_fingerprint === intent.state.afterFingerprint
  );
}

function reservationMatches(
  row: ReservationRow,
  intent: P88W07ExecutionIntent,
): boolean {
  return (
    row.reservation_id === intent.reservation.reservationId
    && row.reservation_fingerprint === intent.reservation.reservationFingerprint
    && row.site_id === intent.siteId
    && row.w03_authorization_id === intent.authorization.w03AuthorizationId
    && row.w03_authorization_fingerprint
      === intent.authorization.w03AuthorizationFingerprint
    && row.policy_action_id === intent.authorization.policyActionId
    && row.resource_gid === intent.target.resourceGid
    && row.target_url === intent.target.targetUrl
    && row.field === intent.target.field
    && row.before_fingerprint === intent.state.beforeFingerprint
    && row.after_fingerprint === intent.state.afterFingerprint
  );
}

function claimMatches(row: ClaimRow, intent: P88W07ExecutionIntent): boolean {
  return (
    row.claim_id === intent.claim.claimId
    && row.claim_fingerprint === intent.claim.claimFingerprint
    && row.reservation_id === intent.reservation.reservationId
    && row.reservation_fingerprint === intent.reservation.reservationFingerprint
    && row.w03_authorization_id === intent.authorization.w03AuthorizationId
    && row.w03_authorization_fingerprint
      === intent.authorization.w03AuthorizationFingerprint
    && row.policy_action_id === intent.authorization.policyActionId
    && row.site_id === intent.siteId
    && Number(row.control_revision) === intent.claim.controlRevision
    && row.control_fingerprint === intent.claim.controlFingerprint
    && row.resource_gid === intent.target.resourceGid
    && row.target_url === intent.target.targetUrl
    && row.field === intent.target.field
    && row.before_fingerprint === intent.state.beforeFingerprint
    && row.after_fingerprint === intent.state.afterFingerprint
  );
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

    for (const [table, expected] of [
      ["policy_mutation_dispatches", DISPATCH_COLUMNS],
      ["policy_mutation_dispatch_events", EVENT_COLUMNS],
    ] as const) {
      const rows = await sql.unsafe<{ column_name: string }[]>(
        "SELECT column_name FROM information_schema.columns "
          + "WHERE table_schema='public' AND table_name=$1 "
          + "ORDER BY ordinal_position",
        [table],
      );
      const actual = rows.map((row) => row.column_name);
      if (
        actual.length !== expected.length
        || actual.some((name, index) => name !== expected[index])
      ) {
        throw new Error("p88_w07_schema_columns_mismatch:" + table);
      }
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

  private async readLockedAuthority(
    tx: SqlExecutor,
    intent: P88W07ExecutionIntent,
  ): Promise<{
    control: ControlRow;
    reservation: ReservationRow;
    claim: ClaimRow;
  }> {
    const controlRows = await tx.unsafe<ControlRow[]>(
      "SELECT site_id::text AS site_id,control_version,revision,mode,"
        + "control_fingerprint FROM policy_mutation_control_state "
        + "WHERE site_id=$1::uuid FOR UPDATE",
      [intent.siteId],
    );
    const control = controlRows[0];
    if (!control) throw new Error("p88_w07_control_missing");

    const reservationRows = await tx.unsafe<ReservationRow[]>(
      "SELECT reservation_id,reservation_fingerprint,"
        + "site_id::text AS site_id,w03_authorization_id,"
        + "w03_authorization_fingerprint,policy_action_id,status,"
        + "resource_gid,target_url,field,before_fingerprint,after_fingerprint "
        + "FROM policy_mutation_reservations WHERE reservation_id=$1 FOR UPDATE",
      [intent.reservation.reservationId],
    );
    const reservation = reservationRows[0];
    if (!reservation || !reservationMatches(reservation, intent)) {
      throw new Error("p88_w07_reservation_binding_mismatch");
    }

    const claimRows = await tx.unsafe<ClaimRow[]>(
      "SELECT claim_id,claim_fingerprint,reservation_id,"
        + "reservation_fingerprint,w03_authorization_id,"
        + "w03_authorization_fingerprint,policy_action_id,"
        + "site_id::text AS site_id,control_revision,control_fingerprint,"
        + "resource_gid,target_url,field,before_fingerprint,after_fingerprint "
        + "FROM policy_mutation_claims WHERE claim_id=$1 FOR UPDATE",
      [intent.claim.claimId],
    );
    const claim = claimRows[0];
    if (!claim || !claimMatches(claim, intent)) {
      throw new Error("p88_w07_claim_binding_mismatch");
    }
    return { control, reservation, claim };
  }

  private assertCurrentForwardAuthority(
    authority: { control: ControlRow; reservation: ReservationRow; claim: ClaimRow },
    intent: P88W07ExecutionIntent,
  ): void {
    if (authority.reservation.status !== "claimed") {
      throw new Error("p88_w07_reservation_not_claimed");
    }
    if (
      Number(authority.control.revision) !== intent.claim.controlRevision
      || authority.control.control_fingerprint !== intent.claim.controlFingerprint
      || authority.control.mode !== "running"
    ) {
      throw new Error("p88_w07_control_epoch_not_forward_eligible");
    }
  }

  private async databaseNow(tx: SqlExecutor): Promise<Date> {
    const rows = await tx.unsafe<{ now: Date }[]>(
      "SELECT transaction_timestamp() AS now",
    );
    const now = rows[0]?.now;
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
      throw new Error("p88_w07_database_clock_unavailable");
    }
    return now;
  }

  private assertFresh(
    intent: P88W07ExecutionIntent,
    now: Date,
  ): void {
    const nowMs = now.getTime();
    if (Date.parse(intent.authorization.issuedAt) > nowMs) {
      throw new Error("p88_w07_authorization_not_yet_issued");
    }
    if (Date.parse(intent.authorization.expiresAt) <= nowMs) {
      throw new Error("p88_w07_authorization_expired");
    }
    if (Date.parse(intent.preflight.expiresAt) <= nowMs) {
      throw new Error("p88_w07_preflight_expired");
    }
  }

  private async selectDispatch(
    tx: SqlExecutor,
    intent: P88W07ExecutionIntent,
    forUpdate = true,
  ): Promise<DispatchRow | null> {
    const rows = await tx.unsafe<DispatchRow[]>(
      "SELECT dispatch_id,dispatch_version,execution_id,"
        + "execution_fingerprint,dispatch_fingerprint,site_id::text AS site_id,"
        + "policy_id,policy_version,policy_fingerprint,evaluation_id,"
        + "evaluation_fingerprint,materialization_id,materialization_fingerprint,"
        + "proposal_id,proposal_fingerprint,w03_authorization_id,"
        + "w03_authorization_fingerprint,policy_action_id,reservation_id,"
        + "reservation_fingerprint,claim_id,claim_fingerprint,"
        + "w06_preflight_id,w06_preflight_fingerprint,credential_profile_id,"
        + "claimed_control_revision,claimed_control_fingerprint,provider,domain,"
        + "resource_kind,resource_gid,target_url,action_type,field,"
        + "required_provider_scope,before_fingerprint,after_fingerprint,state,"
        + "revision,forward_attempt_count,rollback_attempt_count,"
        + "public_write_occurrence,provider_request_id,"
        + "provider_operation_fingerprint,provider_response_fingerprint,"
        + "final_closure_reason,created_at,updated_at "
        + "FROM policy_mutation_dispatches "
        + "WHERE dispatch_id=$1 OR claim_id=$2 OR reservation_id=$3 "
        + (forUpdate ? "FOR UPDATE" : ""),
      [
        intent.dispatchId,
        intent.claim.claimId,
        intent.reservation.reservationId,
      ],
    );
    if (rows.length > 1) {
      throw new Error("p88_w07_dispatch_identity_collision");
    }
    return rows[0] ?? null;
  }

  private async insertEvent(
    tx: SqlExecutor,
    input: {
      intent: P88W07ExecutionIntent;
      fromRevision: number | null;
      fromState: P88W07DispatchState | null;
      toRevision: number;
      toState: P88W07DispatchState;
      reason: string;
      providerRequestFingerprint?: string | null;
      publicWriteOccurrence: P88W07PublicWriteOccurrence;
      rollbackWriteOccurrence: P88W07RollbackWriteOccurrence;
      effectiveAt: string;
    },
  ): Promise<void> {
    const eventBase = {
      version: P8_8_W07_DISPATCH_EVENT_VERSION,
      dispatchId: input.intent.dispatchId,
      siteId: input.intent.siteId,
      fromRevision: input.fromRevision,
      fromState: input.fromState,
      toRevision: input.toRevision,
      toState: input.toState,
      transitionReason: input.reason,
      providerRequestFingerprint: input.providerRequestFingerprint ?? null,
      publicWriteOccurrence: input.publicWriteOccurrence,
      rollbackWriteOccurrence: input.rollbackWriteOccurrence,
      effectiveAt: input.effectiveAt,
    };
    const eventFingerprint = p88W07StableHash({
      purpose: "p8.8_w07_dispatch_event",
      ...eventBase,
    });
    const eventId = "p88w07-event-" + eventFingerprint.slice(0, 24);
    await tx.unsafe(
      "INSERT INTO policy_mutation_dispatch_events ("
        + "event_id,event_version,event_fingerprint,dispatch_id,site_id,"
        + "from_revision,from_state,to_revision,to_state,transition_reason,"
        + "provider_request_fingerprint,public_write_occurrence,"
        + "rollback_write_occurrence,effective_at,created_at"
        + ") VALUES ($1,$2,$3,$4,$5::uuid,$6,$7,$8,$9,$10,$11,$12,$13,"
        + "$14::timestamptz,$14::timestamptz)",
      [
        eventId,
        eventBase.version,
        eventFingerprint,
        eventBase.dispatchId,
        eventBase.siteId,
        eventBase.fromRevision,
        eventBase.fromState,
        eventBase.toRevision,
        eventBase.toState,
        eventBase.transitionReason,
        eventBase.providerRequestFingerprint,
        eventBase.publicWriteOccurrence,
        eventBase.rollbackWriteOccurrence,
        eventBase.effectiveAt,
      ],
    );
  }

  async reservePrewrite(input: {
    handoff: P88W07W06Handoff;
    intent: P88W07ExecutionIntent;
  }): Promise<P88W07ReserveResult> {
    const intent = assertP88W07ExecutionIntentIntegrity(
      input.handoff,
      input.intent,
    );
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, intent.siteId);
      return await sql.begin(async (tx) => {
        const authority = await this.readLockedAuthority(tx, intent);
        const existing = await this.selectDispatch(tx, intent);
        if (existing) {
          if (!dispatchMatchesIntent(existing, intent)) {
            throw new Error("p88_w07_dispatch_identity_collision");
          }
          return Object.freeze({
            kind: "existing_exact" as const,
            receipt: receipt(existing),
          });
        }

        this.assertCurrentForwardAuthority(authority, intent);
        const now = await this.databaseNow(tx);
        this.assertFresh(intent, now);

        const inserted = await tx.unsafe<DispatchRow[]>(
          "INSERT INTO policy_mutation_dispatches ("
            + "dispatch_id,dispatch_version,execution_id,execution_fingerprint,"
            + "dispatch_fingerprint,site_id,policy_id,policy_version,"
            + "policy_fingerprint,evaluation_id,evaluation_fingerprint,"
            + "materialization_id,materialization_fingerprint,proposal_id,"
            + "proposal_fingerprint,w03_authorization_id,"
            + "w03_authorization_fingerprint,policy_action_id,reservation_id,"
            + "reservation_fingerprint,claim_id,claim_fingerprint,"
            + "w06_preflight_id,w06_preflight_fingerprint,"
            + "credential_profile_id,claimed_control_revision,"
            + "claimed_control_fingerprint,provider,domain,resource_kind,"
            + "resource_gid,target_url,action_type,field,required_provider_scope,"
            + "before_fingerprint,after_fingerprint,state,revision,"
            + "forward_attempt_count,rollback_attempt_count,"
            + "public_write_occurrence,created_at,updated_at"
            + ") VALUES ("
            + "$1,$2,$3,$4,$5,$6::uuid,$7,$8,$9,$10,$11,$12,$13,$14,$15,"
            + "$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,"
            + "$30,$31,$32,$33,$34,$35,$36,$37,'reserved_prewrite',1,0,0,"
            + "'none',$38::timestamptz,$38::timestamptz"
            + ") RETURNING dispatch_id,dispatch_version,execution_id,"
            + "execution_fingerprint,dispatch_fingerprint,site_id::text AS site_id,"
            + "policy_id,policy_version,policy_fingerprint,evaluation_id,"
            + "evaluation_fingerprint,materialization_id,materialization_fingerprint,"
            + "proposal_id,proposal_fingerprint,w03_authorization_id,"
            + "w03_authorization_fingerprint,policy_action_id,reservation_id,"
            + "reservation_fingerprint,claim_id,claim_fingerprint,"
            + "w06_preflight_id,w06_preflight_fingerprint,credential_profile_id,"
            + "claimed_control_revision,claimed_control_fingerprint,provider,domain,"
            + "resource_kind,resource_gid,target_url,action_type,field,"
            + "required_provider_scope,before_fingerprint,after_fingerprint,state,"
            + "revision,forward_attempt_count,rollback_attempt_count,"
            + "public_write_occurrence,provider_request_id,"
            + "provider_operation_fingerprint,provider_response_fingerprint,"
            + "final_closure_reason,created_at,updated_at",
          [
            intent.dispatchId,
            P8_8_W07_DISPATCH_VERSION,
            intent.executionId,
            intent.executionFingerprint,
            intent.dispatchFingerprint,
            intent.siteId,
            intent.policy.policyId,
            intent.policy.policyVersion,
            intent.policy.policyFingerprint,
            intent.evaluation.evaluationId,
            intent.evaluation.evaluationFingerprint,
            intent.materialization.materializationId,
            intent.materialization.materializationFingerprint,
            intent.proposal.proposalId,
            intent.proposal.proposalFingerprint,
            intent.authorization.w03AuthorizationId,
            intent.authorization.w03AuthorizationFingerprint,
            intent.authorization.policyActionId,
            intent.reservation.reservationId,
            intent.reservation.reservationFingerprint,
            intent.claim.claimId,
            intent.claim.claimFingerprint,
            intent.preflight.preflightId,
            intent.preflight.preflightFingerprint,
            intent.credentialProfileId,
            intent.claim.controlRevision,
            intent.claim.controlFingerprint,
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
        if (!inserted[0]) throw new Error("p88_w07_dispatch_insert_uncertain");
        await this.insertEvent(tx, {
          intent,
          fromRevision: null,
          fromState: null,
          toRevision: 1,
          toState: "reserved_prewrite",
          reason: "w06_ready_prewrite_reserved",
          publicWriteOccurrence: "none",
          rollbackWriteOccurrence: "none",
          effectiveAt: now.toISOString(),
        });
        return Object.freeze({
          kind: "reserved_new" as const,
          receipt: receipt(inserted[0]),
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("p88_w07_")) {
        throw error;
      }
      throw new Error("p88_w07_reserve_state_uncertain");
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  async startDispatch(input: {
    handoff: P88W07W06Handoff;
    intent: P88W07ExecutionIntent;
    eligibility: P88W07DispatchEligibility;
    finalBeforeObservation: P88W06ProviderObservation;
  }): Promise<P88W07StartResult> {
    const intent = assertP88W07ExecutionIntentIntegrity(
      input.handoff,
      input.intent,
    );
    assertP88W06ProviderObservationIntegrity(input.finalBeforeObservation);
    const issues = p88W07DispatchEligibilityIssues(intent, input.eligibility);
    if (issues.length > 0) {
      throw new Error("p88_w07_dispatch_ineligible:" + issues.join(","));
    }

    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, intent.siteId);
      return await sql.begin(async (tx) => {
        const authority = await this.readLockedAuthority(tx, intent);
        const dispatch = await this.selectDispatch(tx, intent);
        if (!dispatch || !dispatchMatchesIntent(dispatch, intent)) {
          throw new Error("p88_w07_dispatch_missing_or_mismatched");
        }
        if (dispatch.state !== "reserved_prewrite") {
          if (Number(dispatch.forward_attempt_count) === 1) {
            return Object.freeze({
              kind: "already_started_or_terminal" as const,
              receipt: receipt(dispatch),
            });
          }
          throw new Error("p88_w07_dispatch_state_uncertain");
        }

        this.assertCurrentForwardAuthority(authority, intent);
        const now = await this.databaseNow(tx);
        this.assertFresh(intent, now);

        const observed = input.finalBeforeObservation;
        const exactBefore = p88W02StateFingerprint({
          target: input.handoff.lineage.w02Materialization.target,
          value: observed.rawValue,
          purpose: "before",
        });
        if (
          observed.status !== "observed"
          || observed.siteId !== intent.siteId
          || observed.resourceGid !== intent.target.resourceGid
          || observed.rawValue !== intent.state.beforeValue
          || observed.observedBeforeFingerprint !== exactBefore
          || exactBefore !== intent.state.beforeFingerprint
        ) {
          throw new Error("p88_w07_final_before_state_mismatch");
        }

        const historyQuota = await tx.unsafe<{ count: number }[]>(
          "SELECT COUNT(*)::int AS count FROM policy_mutation_dispatches "
            + "WHERE site_id=$1::uuid AND dispatch_id<>$2 "
            + "AND forward_attempt_count=1 "
            + "AND updated_at > $3::timestamptz - interval '24 hours'",
          [intent.siteId, intent.dispatchId, now.toISOString()],
        );
        if (Number(historyQuota[0]?.count ?? 0) >= 1) {
          throw new Error("p88_w07_mutation_quota_exhausted");
        }

        const cooldown = await tx.unsafe<{ count: number }[]>(
          "SELECT COUNT(*)::int AS count FROM policy_mutation_dispatches "
            + "WHERE site_id=$1::uuid AND dispatch_id<>$2 "
            + "AND resource_gid=$3 AND field=$4 AND forward_attempt_count=1 "
            + "AND updated_at > $5::timestamptz - interval '14 days'",
          [
            intent.siteId,
            intent.dispatchId,
            intent.target.resourceGid,
            intent.target.field,
            now.toISOString(),
          ],
        );
        if (Number(cooldown[0]?.count ?? 0) >= 1) {
          throw new Error("p88_w07_same_target_cooldown_not_satisfied");
        }

        const manual = await tx.unsafe<{ count: number }[]>(
          "SELECT COUNT(*)::int AS count FROM policy_mutation_reservations "
            + "WHERE site_id=$1::uuid AND reservation_id<>$2 "
            + "AND status='manual_intervention'",
          [intent.siteId, intent.reservation.reservationId],
        );
        if (Number(manual[0]?.count ?? 0) > 0) {
          throw new Error("p88_w07_manual_intervention_unresolved");
        }

        const nextRevision = Number(dispatch.revision) + 1;
        const updated = await tx.unsafe<DispatchRow[]>(
          "UPDATE policy_mutation_dispatches SET state='dispatch_started',"
            + "revision=$2,forward_attempt_count=1,"
            + "public_write_occurrence='possible',"
            + "updated_at=$3::timestamptz "
            + "WHERE dispatch_id=$1 AND state='reserved_prewrite' "
            + "AND forward_attempt_count=0 "
            + "RETURNING dispatch_id,dispatch_version,execution_id,"
            + "execution_fingerprint,dispatch_fingerprint,site_id::text AS site_id,"
            + "policy_id,policy_version,policy_fingerprint,evaluation_id,"
            + "evaluation_fingerprint,materialization_id,materialization_fingerprint,"
            + "proposal_id,proposal_fingerprint,w03_authorization_id,"
            + "w03_authorization_fingerprint,policy_action_id,reservation_id,"
            + "reservation_fingerprint,claim_id,claim_fingerprint,w06_preflight_id,"
            + "w06_preflight_fingerprint,credential_profile_id,"
            + "claimed_control_revision,claimed_control_fingerprint,provider,domain,"
            + "resource_kind,resource_gid,target_url,action_type,field,"
            + "required_provider_scope,before_fingerprint,after_fingerprint,state,"
            + "revision,forward_attempt_count,rollback_attempt_count,"
            + "public_write_occurrence,provider_request_id,"
            + "provider_operation_fingerprint,provider_response_fingerprint,"
            + "final_closure_reason,created_at,updated_at",
          [intent.dispatchId, nextRevision, now.toISOString()],
        );
        if (!updated[0]) throw new Error("p88_w07_dispatch_start_race");
        await this.insertEvent(tx, {
          intent,
          fromRevision: Number(dispatch.revision),
          fromState: dispatch.state,
          toRevision: nextRevision,
          toState: "dispatch_started",
          reason: "provider_forward_attempt_point_of_no_return",
          publicWriteOccurrence: "possible",
          rollbackWriteOccurrence: "none",
          effectiveAt: now.toISOString(),
        });
        return Object.freeze({
          kind: "started_new" as const,
          receipt: receipt(updated[0]),
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("p88_w07_")) {
        throw error;
      }
      throw new Error("p88_w07_dispatch_start_state_uncertain");
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  async startRollback(input: {
    intent: P88W07ExecutionIntent;
    reason: string;
  }): Promise<P88W07RollbackStartResult> {
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, input.intent.siteId);
      return await sql.begin(async (tx) => {
        const authority = await this.readLockedAuthority(tx, input.intent);
        if (authority.reservation.status !== "claimed") {
          throw new Error("p88_w07_reservation_not_claimed");
        }

        const dispatch = await this.selectDispatch(tx, input.intent);
        if (!dispatch || !dispatchMatchesIntent(dispatch, input.intent)) {
          throw new Error("p88_w07_dispatch_missing_or_mismatched");
        }

        if (dispatch.state !== "rollback_required") {
          if (Number(dispatch.rollback_attempt_count) === 1) {
            return Object.freeze({
              kind: "already_started_or_terminal" as const,
              receipt: receipt(dispatch),
            });
          }
          throw new Error("p88_w07_rollback_not_startable");
        }
        if (
          Number(dispatch.forward_attempt_count) !== 1
          || Number(dispatch.rollback_attempt_count) !== 0
        ) {
          throw new Error("p88_w07_rollback_attempt_state_invalid");
        }

        const now = await this.databaseNow(tx);
        const nextRevision = Number(dispatch.revision) + 1;
        const updated = await tx.unsafe<DispatchRow[]>(
          "UPDATE policy_mutation_dispatches SET state='rollback_started',"
            + "revision=$2,rollback_attempt_count=1,"
            + "updated_at=$3::timestamptz "
            + "WHERE dispatch_id=$1 AND state='rollback_required' "
            + "AND forward_attempt_count=1 AND rollback_attempt_count=0 "
            + "AND revision=$4 "
            + "RETURNING dispatch_id,dispatch_version,execution_id,"
            + "execution_fingerprint,dispatch_fingerprint,site_id::text AS site_id,"
            + "policy_id,policy_version,policy_fingerprint,evaluation_id,"
            + "evaluation_fingerprint,materialization_id,materialization_fingerprint,"
            + "proposal_id,proposal_fingerprint,w03_authorization_id,"
            + "w03_authorization_fingerprint,policy_action_id,reservation_id,"
            + "reservation_fingerprint,claim_id,claim_fingerprint,w06_preflight_id,"
            + "w06_preflight_fingerprint,credential_profile_id,"
            + "claimed_control_revision,claimed_control_fingerprint,provider,domain,"
            + "resource_kind,resource_gid,target_url,action_type,field,"
            + "required_provider_scope,before_fingerprint,after_fingerprint,state,"
            + "revision,forward_attempt_count,rollback_attempt_count,"
            + "public_write_occurrence,provider_request_id,"
            + "provider_operation_fingerprint,provider_response_fingerprint,"
            + "final_closure_reason,created_at,updated_at",
          [
            input.intent.dispatchId,
            nextRevision,
            now.toISOString(),
            Number(dispatch.revision),
          ],
        );
        if (!updated[0]) throw new Error("p88_w07_rollback_start_race");

        await this.insertEvent(tx, {
          intent: input.intent,
          fromRevision: Number(dispatch.revision),
          fromState: dispatch.state,
          toRevision: nextRevision,
          toState: "rollback_started",
          reason: input.reason,
          publicWriteOccurrence: dispatch.public_write_occurrence,
          rollbackWriteOccurrence: "possible",
          effectiveAt: now.toISOString(),
        });
        return Object.freeze({
          kind: "started_new" as const,
          receipt: receipt(updated[0]),
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("p88_w07_")) {
        throw error;
      }
      throw new Error("p88_w07_rollback_start_state_uncertain");
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  async transition(input: {
    intent: P88W07ExecutionIntent;
    expectedStates: readonly P88W07DispatchState[];
    toState: P88W07DispatchState;
    reason: string;
    publicWriteOccurrence: P88W07PublicWriteOccurrence;
    rollbackWriteOccurrence?: P88W07RollbackWriteOccurrence;
    providerRequestId?: string | null;
    providerOperationFingerprint?: string | null;
    providerResponseFingerprint?: string | null;
    eventEvidenceFingerprint?: string | null;
  }): Promise<P88W07DispatchReceipt> {
    if (input.expectedStates.length < 1) {
      throw new Error("p88_w07_transition_expected_state_required");
    }
    for (const state of input.expectedStates) {
      assertP88W07TransitionAllowed(state, input.toState);
    }

    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, input.intent.siteId);
      return await sql.begin(async (tx) => {
        const authority = await this.readLockedAuthority(tx, input.intent);
        if (authority.reservation.status !== "claimed") {
          throw new Error("p88_w07_reservation_not_claimed");
        }
        const dispatch = await this.selectDispatch(tx, input.intent);
        if (!dispatch || !dispatchMatchesIntent(dispatch, input.intent)) {
          throw new Error("p88_w07_dispatch_missing_or_mismatched");
        }

        if (dispatch.state === input.toState) {
          throw new Error("p88_w07_transition_already_applied");
        }
        if (!input.expectedStates.includes(dispatch.state)) {
          throw new Error("p88_w07_transition_state_conflict");
        }
        assertP88W07TransitionAllowed(dispatch.state, input.toState);

        const forwardAttemptCount = Number(dispatch.forward_attempt_count);
        const rollbackAttemptCount = Number(dispatch.rollback_attempt_count);
        if (input.toState === "rollback_started") {
          throw new Error("p88_w07_rollback_start_requires_dedicated_fence");
        }

        const terminalStatus = p88W07ReservationTerminalStatus(input.toState);
        const now = await this.databaseNow(tx);
        const nextRevision = Number(dispatch.revision) + 1;

        const updated = await tx.unsafe<DispatchRow[]>(
          "UPDATE policy_mutation_dispatches SET state=$2,revision=$3,"
            + "forward_attempt_count=$4,rollback_attempt_count=$5,"
            + "public_write_occurrence=$6,provider_request_id=COALESCE($7,provider_request_id),"
            + "provider_operation_fingerprint=COALESCE($8,provider_operation_fingerprint),"
            + "provider_response_fingerprint=COALESCE($9,provider_response_fingerprint),"
            + "final_closure_reason=$10,updated_at=$11::timestamptz "
            + "WHERE dispatch_id=$1 AND revision=$12 "
            + "RETURNING dispatch_id,dispatch_version,execution_id,"
            + "execution_fingerprint,dispatch_fingerprint,site_id::text AS site_id,"
            + "policy_id,policy_version,policy_fingerprint,evaluation_id,"
            + "evaluation_fingerprint,materialization_id,materialization_fingerprint,"
            + "proposal_id,proposal_fingerprint,w03_authorization_id,"
            + "w03_authorization_fingerprint,policy_action_id,reservation_id,"
            + "reservation_fingerprint,claim_id,claim_fingerprint,w06_preflight_id,"
            + "w06_preflight_fingerprint,credential_profile_id,"
            + "claimed_control_revision,claimed_control_fingerprint,provider,domain,"
            + "resource_kind,resource_gid,target_url,action_type,field,"
            + "required_provider_scope,before_fingerprint,after_fingerprint,state,"
            + "revision,forward_attempt_count,rollback_attempt_count,"
            + "public_write_occurrence,provider_request_id,"
            + "provider_operation_fingerprint,provider_response_fingerprint,"
            + "final_closure_reason,created_at,updated_at",
          [
            input.intent.dispatchId,
            input.toState,
            nextRevision,
            forwardAttemptCount,
            rollbackAttemptCount,
            input.publicWriteOccurrence,
            input.providerRequestId ?? null,
            input.providerOperationFingerprint ?? null,
            input.providerResponseFingerprint ?? null,
            terminalStatus ? input.reason : null,
            now.toISOString(),
            Number(dispatch.revision),
          ],
        );
        if (!updated[0]) throw new Error("p88_w07_transition_race");

        if (terminalStatus) {
          if (terminalStatus === "manual_intervention") {
            const terminal = await tx.unsafe<{ reservation_id: string }[]>(
              "UPDATE policy_mutation_reservations SET status='manual_intervention',"
                + "terminal_at=NULL,terminal_reason=$2,updated_at=$3::timestamptz "
                + "WHERE reservation_id=$1 AND status='claimed' "
                + "RETURNING reservation_id",
              [input.intent.reservation.reservationId, input.reason, now.toISOString()],
            );
            if (!terminal[0]) throw new Error("p88_w07_w04_terminal_race");
          } else {
            const terminal = await tx.unsafe<{ reservation_id: string }[]>(
              "UPDATE policy_mutation_reservations SET status=$2,"
                + "terminal_at=$3::timestamptz,terminal_reason=$4,"
                + "updated_at=$3::timestamptz "
                + "WHERE reservation_id=$1 AND status='claimed' "
                + "RETURNING reservation_id",
              [
                input.intent.reservation.reservationId,
                terminalStatus,
                now.toISOString(),
                input.reason,
              ],
            );
            if (!terminal[0]) throw new Error("p88_w07_w04_terminal_race");
          }
        }

        await this.insertEvent(tx, {
          intent: input.intent,
          fromRevision: Number(dispatch.revision),
          fromState: dispatch.state,
          toRevision: nextRevision,
          toState: input.toState,
          reason: input.reason,
          providerRequestFingerprint:
            input.eventEvidenceFingerprint
            ?? input.providerOperationFingerprint
            ?? null,
          publicWriteOccurrence: input.publicWriteOccurrence,
          rollbackWriteOccurrence: input.rollbackWriteOccurrence ?? "none",
          effectiveAt: now.toISOString(),
        });
        return receipt(updated[0]);
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("p88_w07_")) {
        throw error;
      }
      throw new Error("p88_w07_transition_state_uncertain");
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  async readDispatch(
    intent: P88W07ExecutionIntent,
  ): Promise<P88W07DispatchReceipt | null> {
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, intent.siteId);
      return await sql.begin(async (tx) => {
        const row = await this.selectDispatch(tx, intent, false);
        if (!row) return null;
        if (!dispatchMatchesIntent(row, intent)) {
          throw new Error("p88_w07_dispatch_identity_collision");
        }
        return receipt(row);
      });
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
    databaseTransactionClockAuthoritative: true,
    controlReservationClaimDispatchLockOrder: true,
    reservationRemainsClaimedUntilTerminalClosure: true,
    w05ClaimImmutable: true,
    forwardAttemptMaximum: 1,
    rollbackAttemptMaximum: 1,
    forwardRetryAllowed: false,
    rollbackRetryAllowed: false,
    liveProviderAccessPerformedByStore: false,
    providerWritePerformedByStore: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    schedulerActivated: false,
    workerActivated: false,
    productionDdlAuthorized: false,
  });
}
