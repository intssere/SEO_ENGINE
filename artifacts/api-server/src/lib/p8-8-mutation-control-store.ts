import { createHash } from "node:crypto";
import postgres from "postgres";
import {
  assertP88W04DurableReceiptIntegrity,
  pairP88W03W04DurableReservation,
  type P88W04DurableReservationReceipt,
} from "./p8-8-reservation-store.js";
import type {
  P88W03PolicyAuthorizationArtifact,
} from "./p8-8-policy-authorization.js";
import {
  P8_8_W05_CLAIM_VERSION,
  P8_8_W05_CONTROL_EVENT_VERSION,
  P8_8_W05_CONTROL_VERSION,
  assertP88W05ControlEventIntegrity,
  assertP88W05ControlStateIntegrity,
  initializeP88W05ControlState,
  projectP88W05ClaimIntent,
  projectP88W05ControlTransition,
  type P88W05ClaimIntent,
  type P88W05ControlAction,
  type P88W05ControlEvent,
  type P88W05ControlMode,
  type P88W05ControlProjection,
  type P88W05ControlState,
} from "./p8-8-mutation-control.js";

export const P8_8_W05_EXPECTED_TABLE_COUNT = 41 as const;
export const P8_8_W05_CONTROL_SOURCE =
  "policy_mutation_control_state" as const;
export const P8_8_W05_CLAIM_RECEIPT_VERSION =
  "p8-8-w05-control-claim-receipt-v1" as const;

export type P88W05ClaimReceipt = Readonly<{
  version: typeof P8_8_W05_CLAIM_RECEIPT_VERSION;
  claimId: string;
  claimFingerprint: string;
  reservationId: string;
  reservationFingerprint: string;
  w03AuthorizationId: string;
  w03AuthorizationFingerprint: string;
  policyActionId: string;
  siteId: string;
  controlRevision: number;
  controlFingerprint: string;
  target: Readonly<{
    resourceGid: string;
    targetUrl: string;
    field: "meta_description";
  }>;
  state: Readonly<{
    beforeFingerprint: string;
    afterFingerprint: string;
  }>;
  claimedAt: string;
  durable: true;
  providerDispatchAuthorized: false;
  providerWriteAllowed: false;
  publicSiteWrites: false;
  receiptFingerprint: string;
}>;

export type P88W05ClaimResult =
  | Readonly<{
      kind: "claimed_new" | "existing_claimed";
      receipt: P88W05ClaimReceipt;
      providerDispatchAuthorized: false;
      publicSiteWrites: false;
    }>
  | Readonly<{
      kind:
        | "control_not_initialized"
        | "control_not_running"
        | "control_revision_conflict"
        | "authorization_expired"
        | "reservation_not_claimable"
        | "claim_identity_collision"
        | "claim_binding_conflict"
        | "manual_intervention_blocked"
        | "claim_state_uncertain";
      providerDispatchAuthorized: false;
      publicSiteWrites: false;
    }>;

export type P88W05ControlTransitionInput = {
  siteId: string;
  expectedRevision: number;
  expectedControlFingerprint: string;
  action: P88W05ControlAction;
  releaseBinding?: Readonly<{
    w03Authorization: P88W03PolicyAuthorizationArtifact;
    w04Receipt: P88W04DurableReservationReceipt;
  }> | null;
};

export type P88W05ClaimInput = Readonly<{
  w03Authorization: P88W03PolicyAuthorizationArtifact;
  w04Receipt: P88W04DurableReservationReceipt;
  expectedControlRevision: number;
  expectedControlFingerprint: string;
}>;

type Sql = ReturnType<typeof postgres>;
type SqlExecutor = Pick<Sql, "unsafe">;

type ControlStateRow = {
  site_id: string;
  control_version: string;
  revision: number;
  previous_control_fingerprint: string | null;
  mode: P88W05ControlMode;
  effective_at: Date;
  control_fingerprint: string;
};

type ControlEventRow = {
  event_id: string;
  event_version: string;
  event_fingerprint: string;
  site_id: string;
  from_revision: number | null;
  from_control_fingerprint: string | null;
  from_mode: P88W05ControlMode | null;
  transition_action: P88W05ControlAction | "initialize";
  to_revision: number;
  to_control_fingerprint: string;
  to_mode: P88W05ControlMode;
  effective_at: Date;
};

type ReservationControlRow = {
  reservation_id: string;
  reservation_fingerprint: string;
  site_id: string;
  w03_authorization_id: string;
  w03_authorization_fingerprint: string;
  policy_action_id: string;
  status:
    | "authorized"
    | "claimed"
    | "consumed"
    | "released"
    | "expired"
    | "manual_intervention";
  resource_gid: string;
  target_url: string;
  field: string;
  before_fingerprint: string;
  after_fingerprint: string;
  authorized_at: Date;
  expires_at: Date;
};

type ClaimRow = {
  claim_id: string;
  claim_version: string;
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
  claimed_at: Date;
};

const CONTROL_STATE_COLUMNS = Object.freeze([
  "site_id",
  "control_version",
  "revision",
  "previous_control_fingerprint",
  "mode",
  "effective_at",
  "control_fingerprint",
  "created_at",
  "updated_at",
]);
const CONTROL_EVENT_COLUMNS = Object.freeze([
  "event_id",
  "event_version",
  "event_fingerprint",
  "site_id",
  "from_revision",
  "from_control_fingerprint",
  "from_mode",
  "transition_action",
  "to_revision",
  "to_control_fingerprint",
  "to_mode",
  "effective_at",
  "created_at",
]);
const CLAIM_COLUMNS = Object.freeze([
  "claim_id",
  "claim_version",
  "claim_fingerprint",
  "reservation_id",
  "reservation_fingerprint",
  "w03_authorization_id",
  "w03_authorization_fingerprint",
  "policy_action_id",
  "site_id",
  "control_revision",
  "control_fingerprint",
  "resource_gid",
  "target_url",
  "field",
  "before_fingerprint",
  "after_fingerprint",
  "claimed_at",
  "created_at",
]);

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

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function canonicalIso(value: Date | string, code: string): string {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(code);
  return parsed.toISOString();
}

function claimFailure(
  kind: Exclude<P88W05ClaimResult["kind"], "claimed_new" | "existing_claimed">,
): P88W05ClaimResult {
  return deepFreeze({
    kind,
    providerDispatchAuthorized: false as const,
    publicSiteWrites: false as const,
  });
}

function controlStateFromRow(row: ControlStateRow): P88W05ControlState {
  if (row.control_version !== P8_8_W05_CONTROL_VERSION) {
    throw new Error("p88_w05_control_version_mismatch");
  }
  const state: P88W05ControlState = {
    version: P8_8_W05_CONTROL_VERSION,
    siteId: row.site_id,
    revision: Number(row.revision),
    previousControlFingerprint: row.previous_control_fingerprint,
    mode: row.mode,
    effectiveAt: canonicalIso(
      row.effective_at,
      "p88_w05_control_effective_at_invalid",
    ),
    controlFingerprint: row.control_fingerprint,
    durable: true,
    providerDispatchAuthorized: false,
    publicSiteWrites: false,
  };
  assertP88W05ControlStateIntegrity(state);
  return deepFreeze(state);
}

function controlEventFromRow(row: ControlEventRow): P88W05ControlEvent {
  if (row.event_version !== P8_8_W05_CONTROL_EVENT_VERSION) {
    throw new Error("p88_w05_control_event_version_mismatch");
  }
  const event: P88W05ControlEvent = {
    version: P8_8_W05_CONTROL_EVENT_VERSION,
    eventId: row.event_id,
    eventFingerprint: row.event_fingerprint,
    siteId: row.site_id,
    fromRevision:
      row.from_revision === null ? null : Number(row.from_revision),
    fromControlFingerprint: row.from_control_fingerprint,
    fromMode: row.from_mode,
    action: row.transition_action,
    toRevision: Number(row.to_revision),
    toControlFingerprint: row.to_control_fingerprint,
    toMode: row.to_mode,
    effectiveAt: canonicalIso(
      row.effective_at,
      "p88_w05_control_event_effective_at_invalid",
    ),
    providerDispatchAuthorized: false,
    publicSiteWrites: false,
  };
  assertP88W05ControlEventIntegrity(event);
  return deepFreeze(event);
}

function reservationMatchesBinding(
  row: ReservationControlRow,
  w03: P88W03PolicyAuthorizationArtifact,
  receipt: P88W04DurableReservationReceipt,
): boolean {
  return (
    row.reservation_id === receipt.reservationId
    && row.reservation_fingerprint === receipt.reservationFingerprint
    && row.site_id === receipt.siteId
    && row.w03_authorization_id === receipt.w03AuthorizationId
    && row.w03_authorization_fingerprint
      === receipt.w03AuthorizationFingerprint
    && row.policy_action_id === receipt.policyActionId
    && row.resource_gid === receipt.target.resourceGid
    && row.target_url === receipt.target.targetUrl
    && row.field === receipt.target.field
    && row.before_fingerprint === receipt.state.beforeFingerprint
    && row.after_fingerprint === receipt.state.afterFingerprint
    && canonicalIso(
      row.authorized_at,
      "p88_w05_reservation_authorized_at_invalid",
    ) === receipt.authorizedAt
    && canonicalIso(
      row.expires_at,
      "p88_w05_reservation_expires_at_invalid",
    ) === receipt.expiresAt
    && row.w03_authorization_id === w03.policyAuthorizationId
    && row.w03_authorization_fingerprint
      === w03.policyAuthorizationFingerprint
    && row.policy_action_id === w03.policyActionId
  );
}

function claimRowMatchesIntent(
  row: ClaimRow,
  intent: P88W05ClaimIntent,
): boolean {
  return (
    row.claim_id === intent.claimId
    && row.claim_version === P8_8_W05_CLAIM_VERSION
    && row.claim_fingerprint === intent.claimFingerprint
    && row.reservation_id === intent.reservationId
    && row.reservation_fingerprint === intent.reservationFingerprint
    && row.w03_authorization_id === intent.w03AuthorizationId
    && row.w03_authorization_fingerprint
      === intent.w03AuthorizationFingerprint
    && row.policy_action_id === intent.policyActionId
    && row.site_id === intent.siteId
    && Number(row.control_revision) === intent.controlRevision
    && row.control_fingerprint === intent.controlFingerprint
    && row.resource_gid === intent.target.resourceGid
    && row.target_url === intent.target.targetUrl
    && row.field === intent.target.field
    && row.before_fingerprint === intent.state.beforeFingerprint
    && row.after_fingerprint === intent.state.afterFingerprint
  );
}

function claimReceipt(row: ClaimRow): P88W05ClaimReceipt {
  if (
    row.claim_version !== P8_8_W05_CLAIM_VERSION
    || row.field !== "meta_description"
  ) {
    throw new Error("p88_w05_claim_row_scope_invalid");
  }
  const base = {
    version: P8_8_W05_CLAIM_RECEIPT_VERSION,
    claimId: row.claim_id,
    claimFingerprint: row.claim_fingerprint,
    reservationId: row.reservation_id,
    reservationFingerprint: row.reservation_fingerprint,
    w03AuthorizationId: row.w03_authorization_id,
    w03AuthorizationFingerprint: row.w03_authorization_fingerprint,
    policyActionId: row.policy_action_id,
    siteId: row.site_id,
    controlRevision: Number(row.control_revision),
    controlFingerprint: row.control_fingerprint,
    target: {
      resourceGid: row.resource_gid,
      targetUrl: row.target_url,
      field: "meta_description" as const,
    },
    state: {
      beforeFingerprint: row.before_fingerprint,
      afterFingerprint: row.after_fingerprint,
    },
    claimedAt: canonicalIso(row.claimed_at, "p88_w05_claimed_at_invalid"),
    durable: true as const,
    providerDispatchAuthorized: false as const,
    providerWriteAllowed: false as const,
    publicSiteWrites: false as const,
  };
  return deepFreeze({
    ...base,
    receiptFingerprint: stableHash({
      purpose: "p8.8_w05_claim_receipt",
      ...base,
    }),
  });
}

function claimSuccess(
  kind: "claimed_new" | "existing_claimed",
  row: ClaimRow,
): P88W05ClaimResult {
  return deepFreeze({
    kind,
    receipt: claimReceipt(row),
    providerDispatchAuthorized: false as const,
    publicSiteWrites: false as const,
  });
}

export type P88W05MutationControlStoreOptions = {
  databaseUrl: string;
  sqlFactory?: (databaseUrl: string) => Sql;
};

export class P88W05MutationControlStore {
  private readonly databaseUrl: string;
  private readonly sqlFactory: (databaseUrl: string) => Sql;

  constructor(options: P88W05MutationControlStoreOptions) {
    this.databaseUrl = options.databaseUrl?.trim() ?? "";
    if (!this.databaseUrl) {
      throw new Error("p88_w05_database_url_required");
    }
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

  private async assertSchemaAndIdentity(
    sql: Sql,
    siteId: string,
  ): Promise<void> {
    const counts = await sql.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM information_schema.tables "
        + "WHERE table_schema='public' AND table_type='BASE TABLE'",
    );
    if (Number(counts[0]?.count ?? 0) !== P8_8_W05_EXPECTED_TABLE_COUNT) {
      throw new Error("p88_w05_schema_table_count_mismatch");
    }

    for (const [table, expected] of [
      ["policy_mutation_control_state", CONTROL_STATE_COLUMNS],
      ["policy_mutation_control_events", CONTROL_EVENT_COLUMNS],
      ["policy_mutation_claims", CLAIM_COLUMNS],
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
        throw new Error("p88_w05_schema_columns_mismatch:" + table);
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
      throw new Error("p88_w05_site_identity_mismatch");
    }
  }

  async readControl(siteId: string): Promise<P88W05ControlState | null> {
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, siteId);
      const rows = await sql.unsafe<ControlStateRow[]>(
        "SELECT site_id::text AS site_id,control_version,revision,"
          + "previous_control_fingerprint,mode,effective_at,"
          + "control_fingerprint FROM policy_mutation_control_state "
          + "WHERE site_id=$1::uuid",
        [siteId],
      );
      return rows[0] ? controlStateFromRow(rows[0]) : null;
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  async initializeControl(input: {
    siteId: string;
    mode: P88W05ControlMode;
  }): Promise<Readonly<{
    kind: "initialized" | "existing";
    projection: P88W05ControlProjection;
  }>> {
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, input.siteId);
      return await sql.begin(async (tx) => {
        await tx.unsafe(
          "SELECT pg_advisory_xact_lock(hashtext($1))",
          ["p88_w05_control_init:" + input.siteId],
        );
        const existing = await tx.unsafe<ControlStateRow[]>(
          "SELECT site_id::text AS site_id,control_version,revision,"
            + "previous_control_fingerprint,mode,effective_at,"
            + "control_fingerprint FROM policy_mutation_control_state "
            + "WHERE site_id=$1::uuid FOR UPDATE",
          [input.siteId],
        );
        if (existing[0]) {
          const state = controlStateFromRow(existing[0]);
          const events = await tx.unsafe<ControlEventRow[]>(
            "SELECT event_id,event_version,event_fingerprint,"
              + "site_id::text AS site_id,from_revision,"
              + "from_control_fingerprint,from_mode,transition_action,"
              + "to_revision,to_control_fingerprint,to_mode,effective_at "
              + "FROM policy_mutation_control_events "
              + "WHERE site_id=$1::uuid AND to_revision=$2 "
              + "AND to_control_fingerprint=$3 ORDER BY created_at LIMIT 1",
            [input.siteId, state.revision, state.controlFingerprint],
          );
          if (!events[0]) {
            throw new Error("p88_w05_control_event_missing");
          }
          return deepFreeze({
            kind: "existing" as const,
            projection: {
              state,
              event: controlEventFromRow(events[0]),
            },
          });
        }

        const nowRows = await tx.unsafe<{ now: Date }[]>(
          "SELECT transaction_timestamp() AS now",
        );
        const now = nowRows[0]?.now;
        if (!(now instanceof Date)) {
          throw new Error("p88_w05_database_clock_unavailable");
        }
        const projection = initializeP88W05ControlState({
          siteId: input.siteId,
          mode: input.mode,
          effectiveAt: now.toISOString(),
        });
        await tx.unsafe(
          "INSERT INTO policy_mutation_control_state ("
            + "site_id,control_version,revision,"
            + "previous_control_fingerprint,mode,effective_at,"
            + "control_fingerprint,created_at,updated_at"
            + ") VALUES ($1::uuid,$2,$3,$4,$5,$6::timestamptz,$7,"
            + "$6::timestamptz,$6::timestamptz)",
          [
            projection.state.siteId,
            projection.state.version,
            projection.state.revision,
            projection.state.previousControlFingerprint,
            projection.state.mode,
            projection.state.effectiveAt,
            projection.state.controlFingerprint,
          ],
        );
        await this.insertEvent(tx, projection.event);
        return deepFreeze({
          kind: "initialized" as const,
          projection,
        });
      });
    } catch (error) {
      if (
        error instanceof Error
        && error.message.startsWith("p88_w05_")
      ) throw error;
      throw new Error("p88_w05_control_state_uncertain");
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  private async insertEvent(
    sql: SqlExecutor,
    event: P88W05ControlEvent,
  ) {
    assertP88W05ControlEventIntegrity(event);
    await sql.unsafe(
      "INSERT INTO policy_mutation_control_events ("
        + "event_id,event_version,event_fingerprint,site_id,"
        + "from_revision,from_control_fingerprint,from_mode,"
        + "transition_action,to_revision,to_control_fingerprint,to_mode,"
        + "effective_at,created_at"
        + ") VALUES ($1,$2,$3,$4::uuid,$5,$6,$7,$8,$9,$10,$11,"
        + "$12::timestamptz,$12::timestamptz)",
      [
        event.eventId,
        event.version,
        event.eventFingerprint,
        event.siteId,
        event.fromRevision,
        event.fromControlFingerprint,
        event.fromMode,
        event.action,
        event.toRevision,
        event.toControlFingerprint,
        event.toMode,
        event.effectiveAt,
      ],
    );
  }

  async transitionControl(
    input: P88W05ControlTransitionInput,
  ): Promise<P88W05ControlProjection & Readonly<{
    releasedReservationId: string | null;
  }>> {
    if (input.releaseBinding) {
      assertP88W04DurableReceiptIntegrity(input.releaseBinding.w04Receipt);
      pairP88W03W04DurableReservation(
        input.releaseBinding.w03Authorization,
        input.releaseBinding.w04Receipt,
      );
      if (input.releaseBinding.w04Receipt.siteId !== input.siteId) {
        throw new Error("p88_w05_release_pair_site_mismatch");
      }
    }

    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, input.siteId);
      return await sql.begin(async (tx) => {
        const stateRows = await tx.unsafe<ControlStateRow[]>(
          "SELECT site_id::text AS site_id,control_version,revision,"
            + "previous_control_fingerprint,mode,effective_at,"
            + "control_fingerprint FROM policy_mutation_control_state "
            + "WHERE site_id=$1::uuid FOR UPDATE",
          [input.siteId],
        );
        if (!stateRows[0]) {
          throw new Error("p88_w05_control_not_initialized");
        }
        const current = controlStateFromRow(stateRows[0]);
        if (
          current.revision !== input.expectedRevision
          || current.controlFingerprint !== input.expectedControlFingerprint
        ) {
          throw new Error("p88_w05_control_revision_conflict");
        }

        const nowRows = await tx.unsafe<{ now: Date }[]>(
          "SELECT transaction_timestamp() AS now",
        );
        const now = nowRows[0]?.now;
        if (!(now instanceof Date)) {
          throw new Error("p88_w05_database_clock_unavailable");
        }

        const authorized = await tx.unsafe<ReservationControlRow[]>(
          "SELECT reservation_id,reservation_fingerprint,"
            + "site_id::text AS site_id,w03_authorization_id,"
            + "w03_authorization_fingerprint,policy_action_id,status,"
            + "resource_gid,target_url,field,before_fingerprint,"
            + "after_fingerprint,authorized_at,expires_at "
            + "FROM policy_mutation_reservations "
            + "WHERE site_id=$1::uuid AND status='authorized' "
            + "ORDER BY created_at,reservation_id LIMIT 1 FOR UPDATE",
          [input.siteId],
        );

        let releasedReservationId: string | null = null;
        if (
          authorized[0]
          && (
            input.action === "pause"
            || input.action === "drain"
            || input.action === "kill"
          )
        ) {
          if (!input.releaseBinding) {
            throw new Error("p88_w05_release_pair_required");
          }
          if (
            !reservationMatchesBinding(
              authorized[0],
              input.releaseBinding.w03Authorization,
              input.releaseBinding.w04Receipt,
            )
          ) {
            throw new Error("p88_w05_release_pair_mismatch");
          }
          const released = await tx.unsafe<{ reservation_id: string }[]>(
            "UPDATE policy_mutation_reservations SET status='released',"
              + "terminal_at=$2::timestamptz,"
              + "terminal_reason=$3,updated_at=$2::timestamptz "
              + "WHERE reservation_id=$1 AND status='authorized' "
              + "RETURNING reservation_id",
            [
              authorized[0].reservation_id,
              now.toISOString(),
              "control_" + input.action + "_before_claim",
            ],
          );
          if (released[0]?.reservation_id !== authorized[0].reservation_id) {
            throw new Error("p88_w05_release_state_uncertain");
          }
          releasedReservationId = authorized[0].reservation_id;
        } else if (authorized[0] && input.action === "resume") {
          throw new Error(
            "p88_w05_resume_authorized_reservation_unexpected",
          );
        }

        const blockers = await tx.unsafe<{ count: number }[]>(
          "SELECT COUNT(*)::int AS count "
            + "FROM policy_mutation_reservations "
            + "WHERE site_id=$1::uuid "
            + "AND status IN ('claimed','manual_intervention')",
          [input.siteId],
        );
        const unresolvedBlockingCount = Number(blockers[0]?.count ?? 0);
        const projection = projectP88W05ControlTransition({
          current,
          action: input.action,
          effectiveAt: now.toISOString(),
          unresolvedBlockingCount,
        });

        const updated = await tx.unsafe<{ site_id: string }[]>(
          "UPDATE policy_mutation_control_state SET "
            + "control_version=$4,revision=$5,"
            + "previous_control_fingerprint=$6,mode=$7,"
            + "effective_at=$8::timestamptz,control_fingerprint=$9,"
            + "updated_at=$8::timestamptz "
            + "WHERE site_id=$1::uuid AND revision=$2 "
            + "AND control_fingerprint=$3 RETURNING site_id::text AS site_id",
          [
            input.siteId,
            current.revision,
            current.controlFingerprint,
            projection.state.version,
            projection.state.revision,
            projection.state.previousControlFingerprint,
            projection.state.mode,
            projection.state.effectiveAt,
            projection.state.controlFingerprint,
          ],
        );
        if (updated[0]?.site_id !== input.siteId) {
          throw new Error("p88_w05_control_revision_conflict");
        }
        await this.insertEvent(tx, projection.event);
        return deepFreeze({
          ...projection,
          releasedReservationId,
        });
      });
    } catch (error) {
      if (
        error instanceof Error
        && error.message.startsWith("p88_w05_")
      ) throw error;
      throw new Error("p88_w05_control_state_uncertain");
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  async claim(input: P88W05ClaimInput): Promise<P88W05ClaimResult> {
    assertP88W04DurableReceiptIntegrity(input.w04Receipt);
    pairP88W03W04DurableReservation(
      input.w03Authorization,
      input.w04Receipt,
    );
    const siteId = input.w04Receipt.siteId;

    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, siteId);
      return await sql.begin(async (tx) => {
        const stateRows = await tx.unsafe<ControlStateRow[]>(
          "SELECT site_id::text AS site_id,control_version,revision,"
            + "previous_control_fingerprint,mode,effective_at,"
            + "control_fingerprint FROM policy_mutation_control_state "
            + "WHERE site_id=$1::uuid FOR UPDATE",
          [siteId],
        );
        if (!stateRows[0]) return claimFailure("control_not_initialized");
        const current = controlStateFromRow(stateRows[0]);

        const reservationRows = await tx.unsafe<ReservationControlRow[]>(
          "SELECT reservation_id,reservation_fingerprint,"
            + "site_id::text AS site_id,w03_authorization_id,"
            + "w03_authorization_fingerprint,policy_action_id,status,"
            + "resource_gid,target_url,field,before_fingerprint,"
            + "after_fingerprint,authorized_at,expires_at "
            + "FROM policy_mutation_reservations "
            + "WHERE reservation_id=$1 FOR UPDATE",
          [input.w04Receipt.reservationId],
        );
        const reservation = reservationRows[0];
        if (!reservation) return claimFailure("reservation_not_claimable");
        if (
          !reservationMatchesBinding(
            reservation,
            input.w03Authorization,
            input.w04Receipt,
          )
        ) return claimFailure("claim_binding_conflict");

        if (reservation.status === "manual_intervention") {
          return claimFailure("manual_intervention_blocked");
        }

        if (reservation.status === "claimed") {
          const existingRows = await tx.unsafe<ClaimRow[]>(
            "SELECT claim_id,claim_version,claim_fingerprint,"
              + "reservation_id,reservation_fingerprint,"
              + "w03_authorization_id,w03_authorization_fingerprint,"
              + "policy_action_id,site_id::text AS site_id,"
              + "control_revision,control_fingerprint,resource_gid,"
              + "target_url,field,before_fingerprint,after_fingerprint,"
              + "claimed_at FROM policy_mutation_claims "
              + "WHERE reservation_id=$1 FOR UPDATE",
            [reservation.reservation_id],
          );
          if (!existingRows[0]) return claimFailure("claim_state_uncertain");
          if (
            Number(existingRows[0].control_revision)
              !== input.expectedControlRevision
            || existingRows[0].control_fingerprint
              !== input.expectedControlFingerprint
          ) {
            return claimFailure("claim_binding_conflict");
          }

          const eventRows = await tx.unsafe<ControlEventRow[]>(
            "SELECT event_id,event_version,event_fingerprint,"
              + "site_id::text AS site_id,from_revision,"
              + "from_control_fingerprint,from_mode,transition_action,"
              + "to_revision,to_control_fingerprint,to_mode,effective_at "
              + "FROM policy_mutation_control_events "
              + "WHERE site_id=$1::uuid AND to_revision=$2 "
              + "AND to_control_fingerprint=$3 "
              + "ORDER BY created_at LIMIT 1",
            [
              siteId,
              existingRows[0].control_revision,
              existingRows[0].control_fingerprint,
            ],
          );
          if (!eventRows[0]) return claimFailure("claim_state_uncertain");
          const event = controlEventFromRow(eventRows[0]);
          const historicalControl: P88W05ControlState = {
            version: P8_8_W05_CONTROL_VERSION,
            siteId,
            revision: event.toRevision,
            previousControlFingerprint: event.fromControlFingerprint,
            mode: event.toMode,
            effectiveAt: event.effectiveAt,
            controlFingerprint: event.toControlFingerprint,
            durable: true,
            providerDispatchAuthorized: false,
            publicSiteWrites: false,
          };
          assertP88W05ControlStateIntegrity(historicalControl);
          const replayIntent = projectP88W05ClaimIntent({
            w03Authorization: input.w03Authorization,
            w04Receipt: input.w04Receipt,
            control: historicalControl,
          });
          if (!claimRowMatchesIntent(existingRows[0], replayIntent)) {
            return claimFailure("claim_identity_collision");
          }
          return claimSuccess("existing_claimed", existingRows[0]);
        }

        if (reservation.status !== "authorized") {
          return claimFailure("reservation_not_claimable");
        }

        if (
          current.revision !== input.expectedControlRevision
          || current.controlFingerprint !== input.expectedControlFingerprint
        ) return claimFailure("control_revision_conflict");
        if (current.mode !== "running") {
          return claimFailure("control_not_running");
        }

        const nowRows = await tx.unsafe<{ now: Date }[]>(
          "SELECT transaction_timestamp() AS now",
        );
        const now = nowRows[0]?.now;
        if (!(now instanceof Date)) {
          return claimFailure("claim_state_uncertain");
        }
        const nowMs = now.getTime();
        if (Date.parse(input.w03Authorization.issuedAt) > nowMs) {
          return claimFailure("claim_state_uncertain");
        }
        if (Date.parse(input.w03Authorization.expiresAt) <= nowMs) {
          await tx.unsafe(
            "UPDATE policy_mutation_reservations SET status='expired',"
              + "terminal_at=$2::timestamptz,"
              + "terminal_reason='authorization_window_elapsed',"
              + "updated_at=$2::timestamptz "
              + "WHERE reservation_id=$1 AND status='authorized'",
            [reservation.reservation_id, now.toISOString()],
          );
          return claimFailure("authorization_expired");
        }

        const intent = projectP88W05ClaimIntent({
          w03Authorization: input.w03Authorization,
          w04Receipt: input.w04Receipt,
          control: current,
        });

        const inserted = await tx.unsafe<ClaimRow[]>(
          "INSERT INTO policy_mutation_claims ("
            + "claim_id,claim_version,claim_fingerprint,reservation_id,"
            + "reservation_fingerprint,w03_authorization_id,"
            + "w03_authorization_fingerprint,policy_action_id,site_id,"
            + "control_revision,control_fingerprint,resource_gid,target_url,"
            + "field,before_fingerprint,after_fingerprint,claimed_at"
            + ") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::uuid,$10,$11,$12,"
            + "$13,$14,$15,$16,$17::timestamptz) "
            + "ON CONFLICT DO NOTHING RETURNING claim_id,claim_version,"
            + "claim_fingerprint,reservation_id,reservation_fingerprint,"
            + "w03_authorization_id,w03_authorization_fingerprint,"
            + "policy_action_id,site_id::text AS site_id,control_revision,"
            + "control_fingerprint,resource_gid,target_url,field,"
            + "before_fingerprint,after_fingerprint,claimed_at",
          [
            intent.claimId,
            intent.version,
            intent.claimFingerprint,
            intent.reservationId,
            intent.reservationFingerprint,
            intent.w03AuthorizationId,
            intent.w03AuthorizationFingerprint,
            intent.policyActionId,
            intent.siteId,
            intent.controlRevision,
            intent.controlFingerprint,
            intent.target.resourceGid,
            intent.target.targetUrl,
            intent.target.field,
            intent.state.beforeFingerprint,
            intent.state.afterFingerprint,
            now.toISOString(),
          ],
        );

        if (!inserted[0]) {
          const existingRows = await tx.unsafe<ClaimRow[]>(
            "SELECT claim_id,claim_version,claim_fingerprint,"
              + "reservation_id,reservation_fingerprint,"
              + "w03_authorization_id,w03_authorization_fingerprint,"
              + "policy_action_id,site_id::text AS site_id,"
              + "control_revision,control_fingerprint,resource_gid,"
              + "target_url,field,before_fingerprint,after_fingerprint,"
              + "claimed_at FROM policy_mutation_claims "
              + "WHERE reservation_id=$1 OR claim_id=$2 FOR UPDATE",
            [reservation.reservation_id, intent.claimId],
          );
          if (!existingRows[0]) return claimFailure("claim_state_uncertain");
          if (!claimRowMatchesIntent(existingRows[0], intent)) {
            return claimFailure("claim_identity_collision");
          }
          return claimFailure("claim_state_uncertain");
        }

        const updated = await tx.unsafe<{ reservation_id: string }[]>(
          "UPDATE policy_mutation_reservations SET status='claimed',"
            + "claimed_at=$2::timestamptz,updated_at=$2::timestamptz "
            + "WHERE reservation_id=$1 AND status='authorized' "
            + "RETURNING reservation_id",
          [reservation.reservation_id, now.toISOString()],
        );
        if (updated[0]?.reservation_id !== reservation.reservation_id) {
          throw new Error("p88_w05_claim_state_uncertain");
        }
        return claimSuccess("claimed_new", inserted[0]);
      });
    } catch (error) {
      if (
        error instanceof Error
        && error.message.startsWith("p88_w05_")
      ) throw error;
      return claimFailure("claim_state_uncertain");
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }
}

export function p88W05MutationControlStoreCapability() {
  return deepFreeze({
    version: P8_8_W05_CONTROL_VERSION,
    expectedPublicTableCount: P8_8_W05_EXPECTED_TABLE_COUNT,
    explicitDatabaseUrlOnly: true,
    databaseTransactionClockAuthoritative: true,
    controlRowLockedBeforeReservationRow: true,
    missingControlFailsClosed: true,
    onlyRunningClaims: true,
    exactReplaySupported: true,
    safeAuthorizedReleaseOnly: true,
    claimedAutoRelease: false,
    manualInterventionAutoRelease: false,
    killedOrdinaryResume: false,
    providerNetworkReadPerformed: false,
    providerWritePerformed: false,
    providerDispatchAuthorized: false,
    publicSiteWritePerformed: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    schedulerActivated: false,
    workerActivated: false,
    productionDdlAuthorized: false,
  });
}
