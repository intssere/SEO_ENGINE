import { createHash } from "node:crypto";
import postgres from "postgres";
import {
  P8_8_W04_DURABLE_RESERVATION_VERSION,
  P8_8_W04_RESERVATION_CLASS,
  bindP88W04IntentToW03,
  projectP88W04ReservationIntent,
  type P88W04ReservationIntent,
  type P88W04ReservationIntentInput,
} from "./p8-8-reservation-intent.js";
import {
  type P88W03PolicyAuthorizationArtifact,
  type P88W03PolicyAuthorizationInput,
} from "./p8-8-policy-authorization.js";

export const P8_8_W04_EXPECTED_TABLE_COUNT = 38 as const;
export const P8_8_W04_RESERVATION_SOURCE =
  "policy_mutation_reservations" as const;
export const P8_8_W04_DURABLE_RECEIPT_VERSION =
  "p8-8-w04-durable-reservation-v1" as const;
export const P8_8_W04_PAIRING_VERSION =
  "p8-8-w04-w03-durable-pairing-v1" as const;

export type P88W04DurableReservationStatus =
  | "authorized"
  | "claimed"
  | "consumed"
  | "released"
  | "expired"
  | "manual_intervention";

export type P88W04DurableReservationInput = {
  intentInput: P88W04ReservationIntentInput;
  intent: P88W04ReservationIntent;
  w03Input: P88W03PolicyAuthorizationInput;
  w03Authorization: P88W03PolicyAuthorizationArtifact;
};

export type P88W04DurableReservationReceipt = Readonly<{
  version: typeof P8_8_W04_DURABLE_RECEIPT_VERSION;
  reservationId: string;
  reservationFingerprint: string;
  reservationClass: typeof P8_8_W04_RESERVATION_CLASS;
  siteId: string;
  w03AuthorizationId: string;
  w03AuthorizationFingerprint: string;
  policyActionId: string;
  status: P88W04DurableReservationStatus;
  target: Readonly<{
    resourceGid: string;
    targetUrl: string;
    field: "meta_description";
  }>;
  state: Readonly<{
    beforeFingerprint: string;
    afterFingerprint: string;
  }>;
  authorizedAt: string;
  expiresAt: string;
  durable: true;
  source: typeof P8_8_W04_RESERVATION_SOURCE;
  receiptFingerprint: string;
}>;

export type P88W04ReserveResult =
  | Readonly<{
      kind:
        | "created"
        | "existing_authorized"
        | "already_claimed"
        | "already_consumed"
        | "already_released"
        | "already_expired"
        | "manual_intervention_required";
      receipt: P88W04DurableReservationReceipt;
      providerDispatchAuthorized: false;
    }>
  | Readonly<{
      kind:
        | "identity_collision"
        | "site_concurrency_conflict"
        | "target_reservation_conflict"
        | "reservation_state_uncertain";
      conflictingReservationId: string | null;
      providerDispatchAuthorized: false;
    }>;

export type P88W04W03DurablePairing = Readonly<{
  version: typeof P8_8_W04_PAIRING_VERSION;
  paired: true;
  reservationId: string;
  reservationFingerprint: string;
  w03AuthorizationId: string;
  w03AuthorizationFingerprint: string;
  policyActionId: string;
  receiptFingerprint: string;
  pairingFingerprint: string;
  policyAwareControlEligible: true;
  providerDispatchAuthorized: false;
  publicSiteWrites: false;
}>;

type ReservationRow = {
  reservation_id: string;
  reservation_version: string;
  reservation_class: string;
  reservation_fingerprint: string;
  site_id: string;
  policy_id: string;
  policy_version: string;
  policy_fingerprint: string;
  evaluation_id: string;
  evaluation_fingerprint: string;
  materialization_id: string;
  materialization_fingerprint: string;
  materialization_idempotency_fingerprint: string;
  proposal_id: string;
  proposal_fingerprint: string;
  recommendation_fingerprint: string;
  recommendation_idempotency_key: string;
  target_binding_fingerprint: string;
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
  w03_authorization_id: string;
  w03_authorization_fingerprint: string;
  policy_action_id: string;
  w03_reservation_descriptor_fingerprint: string;
  status: P88W04DurableReservationStatus;
  authorized_at: Date;
  expires_at: Date;
  claimed_at: Date | null;
  terminal_at: Date | null;
  terminal_reason: string | null;
};

type Sql = ReturnType<typeof postgres>;

const ROW_COLUMNS = [
  "reservation_id",
  "reservation_version",
  "reservation_class",
  "reservation_fingerprint",
  "site_id::text AS site_id",
  "policy_id",
  "policy_version",
  "policy_fingerprint",
  "evaluation_id",
  "evaluation_fingerprint",
  "materialization_id",
  "materialization_fingerprint",
  "materialization_idempotency_fingerprint",
  "proposal_id",
  "proposal_fingerprint",
  "recommendation_fingerprint",
  "recommendation_idempotency_key",
  "target_binding_fingerprint",
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
  "w03_authorization_id",
  "w03_authorization_fingerprint",
  "policy_action_id",
  "w03_reservation_descriptor_fingerprint",
  "status",
  "authorized_at",
  "expires_at",
  "claimed_at",
  "terminal_at",
  "terminal_reason",
].join(", ");

const EXPECTED_COLUMNS = Object.freeze([
  "reservation_id",
  "reservation_version",
  "reservation_class",
  "reservation_fingerprint",
  "site_id",
  "policy_id",
  "policy_version",
  "policy_fingerprint",
  "evaluation_id",
  "evaluation_fingerprint",
  "materialization_id",
  "materialization_fingerprint",
  "materialization_idempotency_fingerprint",
  "proposal_id",
  "proposal_fingerprint",
  "recommendation_fingerprint",
  "recommendation_idempotency_key",
  "target_binding_fingerprint",
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
  "w03_authorization_id",
  "w03_authorization_fingerprint",
  "policy_action_id",
  "w03_reservation_descriptor_fingerprint",
  "status",
  "authorized_at",
  "expires_at",
  "claimed_at",
  "terminal_at",
  "terminal_reason",
  "created_at",
  "updated_at",
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

function canonicalIntent(
  input: P88W04ReservationIntentInput,
  supplied: P88W04ReservationIntent,
): P88W04ReservationIntent {
  const rebuilt = projectP88W04ReservationIntent(input);
  if (stableJson(rebuilt) !== stableJson(supplied)) {
    throw new Error("p88_w04_reservation_intent_integrity_mismatch");
  }
  return rebuilt;
}

function receiptBase(row: ReservationRow) {
  return {
    version: P8_8_W04_DURABLE_RECEIPT_VERSION,
    reservationId: row.reservation_id,
    reservationFingerprint: row.reservation_fingerprint,
    reservationClass: P8_8_W04_RESERVATION_CLASS,
    siteId: row.site_id,
    w03AuthorizationId: row.w03_authorization_id,
    w03AuthorizationFingerprint: row.w03_authorization_fingerprint,
    policyActionId: row.policy_action_id,
    status: row.status,
    target: {
      resourceGid: row.resource_gid,
      targetUrl: row.target_url,
      field: "meta_description" as const,
    },
    state: {
      beforeFingerprint: row.before_fingerprint,
      afterFingerprint: row.after_fingerprint,
    },
    authorizedAt: canonicalIso(
      row.authorized_at,
      "p88_w04_row_authorized_at_invalid",
    ),
    expiresAt: canonicalIso(
      row.expires_at,
      "p88_w04_row_expires_at_invalid",
    ),
    durable: true as const,
    source: P8_8_W04_RESERVATION_SOURCE,
  };
}

export function projectP88W04DurableReceipt(
  row: ReservationRow,
): P88W04DurableReservationReceipt {
  if (
    row.reservation_version !== P8_8_W04_DURABLE_RESERVATION_VERSION
    || row.reservation_class !== P8_8_W04_RESERVATION_CLASS
    || row.provider !== "shopify"
    || row.domain !== "diamondshelf.us"
    || row.resource_kind !== "product"
    || row.action_type !== "update_meta_description"
    || row.field !== "meta_description"
    || row.required_provider_scope !== "write_products"
  ) {
    throw new Error("p88_w04_persisted_row_scope_invalid");
  }
  const base = receiptBase(row);
  return deepFreeze({
    ...base,
    receiptFingerprint: stableHash({
      purpose: "p8.8_w04_durable_receipt",
      ...base,
    }),
  });
}

export function assertP88W04DurableReceiptIntegrity(
  receipt: P88W04DurableReservationReceipt,
): void {
  const base = {
    version: receipt.version,
    reservationId: receipt.reservationId,
    reservationFingerprint: receipt.reservationFingerprint,
    reservationClass: receipt.reservationClass,
    siteId: receipt.siteId,
    w03AuthorizationId: receipt.w03AuthorizationId,
    w03AuthorizationFingerprint: receipt.w03AuthorizationFingerprint,
    policyActionId: receipt.policyActionId,
    status: receipt.status,
    target: receipt.target,
    state: receipt.state,
    authorizedAt: receipt.authorizedAt,
    expiresAt: receipt.expiresAt,
    durable: receipt.durable,
    source: receipt.source,
  };
  const expected = stableHash({
    purpose: "p8.8_w04_durable_receipt",
    ...base,
  });
  if (expected !== receipt.receiptFingerprint) {
    throw new Error("p88_w04_durable_receipt_integrity_mismatch");
  }
}

function rowMatches(
  row: ReservationRow,
  intent: P88W04ReservationIntent,
  w03: P88W03PolicyAuthorizationArtifact,
): boolean {
  return (
    row.reservation_id === intent.reservationId
    && row.reservation_version === P8_8_W04_DURABLE_RESERVATION_VERSION
    && row.reservation_class === P8_8_W04_RESERVATION_CLASS
    && row.reservation_fingerprint === intent.reservationFingerprint
    && row.site_id === intent.siteId
    && row.policy_id === intent.policy.policyId
    && row.policy_version === intent.policy.policyVersion
    && row.policy_fingerprint === intent.policy.policyFingerprint
    && row.evaluation_id === intent.evaluation.evaluationId
    && row.evaluation_fingerprint === intent.evaluation.evaluationFingerprint
    && row.materialization_id === intent.materialization.materializationId
    && row.materialization_fingerprint
      === intent.materialization.materializationFingerprint
    && row.materialization_idempotency_fingerprint
      === intent.materialization.materializationIdempotencyFingerprint
    && row.proposal_id === intent.proposal.proposalId
    && row.proposal_fingerprint === intent.proposal.proposalFingerprint
    && row.recommendation_fingerprint
      === intent.recommendation.recommendationFingerprint
    && row.recommendation_idempotency_key
      === intent.recommendation.recommendationIdempotencyKey
    && row.target_binding_fingerprint === intent.target.targetBindingFingerprint
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
    && row.w03_authorization_id === w03.policyAuthorizationId
    && row.w03_authorization_fingerprint === w03.policyAuthorizationFingerprint
    && row.policy_action_id === w03.policyActionId
    && row.w03_reservation_descriptor_fingerprint
      === w03.reservation.descriptorFingerprint
    && canonicalIso(row.authorized_at, "p88_w04_row_authorized_at_invalid")
      === w03.issuedAt
    && canonicalIso(row.expires_at, "p88_w04_row_expires_at_invalid")
      === w03.expiresAt
  );
}

type P88W04ExactReplayKind =
  | "existing_authorized"
  | "already_claimed"
  | "already_consumed"
  | "already_released"
  | "already_expired"
  | "manual_intervention_required";

function exactReplayKind(
  status: P88W04DurableReservationStatus,
): P88W04ExactReplayKind {
  if (status === "authorized") return "existing_authorized";
  if (status === "claimed") return "already_claimed";
  if (status === "consumed") return "already_consumed";
  if (status === "released") return "already_released";
  if (status === "expired") return "already_expired";
  return "manual_intervention_required";
}

function conflict(
  kind:
    | "identity_collision"
    | "site_concurrency_conflict"
    | "target_reservation_conflict"
    | "reservation_state_uncertain",
  reservationId: string | null,
): P88W04ReserveResult {
  return deepFreeze({
    kind,
    conflictingReservationId: reservationId,
    providerDispatchAuthorized: false as const,
  });
}

export type P88W04ReservationStoreOptions = {
  databaseUrl: string;
  sqlFactory?: (databaseUrl: string) => Sql;
};

export class P88W04ReservationStore {
  private readonly databaseUrl: string;
  private readonly sqlFactory: (databaseUrl: string) => Sql;

  constructor(options: P88W04ReservationStoreOptions) {
    this.databaseUrl = options.databaseUrl?.trim() ?? "";
    if (!this.databaseUrl) {
      throw new Error("p88_w04_database_url_required");
    }
    this.sqlFactory =
      options.sqlFactory
      ?? ((databaseUrl) =>
        postgres(databaseUrl, {
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
    if (
      ![P8_8_W04_EXPECTED_TABLE_COUNT, 43].includes(
        Number(counts[0]?.count ?? 0),
      )
    ) {
      throw new Error("p88_w04_schema_table_count_mismatch");
    }

    const columns = await sql.unsafe<{ column_name: string }[]>(
      "SELECT column_name FROM information_schema.columns "
        + "WHERE table_schema='public' "
        + "AND table_name='policy_mutation_reservations' "
        + "ORDER BY ordinal_position",
    );
    const actual = columns.map((row) => row.column_name);
    if (
      actual.length !== EXPECTED_COLUMNS.length
      || actual.some((name, index) => name !== EXPECTED_COLUMNS[index])
    ) {
      throw new Error("p88_w04_schema_columns_mismatch");
    }

    const identities = await sql.unsafe<{ id: string }[]>(
      "SELECT id::text AS id FROM sites "
        + "WHERE id=$1::uuid AND lower(domain)='diamondshelf.us' "
        + "AND canonical_origin='https://diamondshelf.us' "
        + "AND platform='shopify' AND is_active=true LIMIT 1",
      [siteId],
    );
    if (identities[0]?.id !== siteId) {
      throw new Error("p88_w04_site_identity_mismatch");
    }
  }

  async reserve(
    input: P88W04DurableReservationInput,
  ): Promise<P88W04ReserveResult> {
    const intent = canonicalIntent(input.intentInput, input.intent);
    const binding = bindP88W04IntentToW03(
      intent,
      input.w03Input,
      input.w03Authorization,
    );
    if (
      binding.reservationId !== intent.reservationId
      || binding.reservationFingerprint !== intent.reservationFingerprint
    ) {
      throw new Error("p88_w04_w03_precommit_binding_mismatch");
    }

    const w03 = input.w03Authorization;
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await this.assertSchemaAndIdentity(sql, intent.siteId);

      return await sql.begin(async (tx) => {
        const nowRows = await tx.unsafe<{ now: Date }[]>(
          "SELECT transaction_timestamp() AS now",
        );
        const now = nowRows[0]?.now;
        if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
          throw new Error("p88_w04_database_clock_unavailable");
        }
        const nowMs = now.getTime();
        const issuedMs = Date.parse(w03.issuedAt);
        const expiresMs = Date.parse(w03.expiresAt);
        if (issuedMs > nowMs) {
          throw new Error("p88_w04_authorization_not_yet_issued");
        }
        if (expiresMs <= nowMs) {
          throw new Error("p88_w04_authorization_expired");
        }

        await tx.unsafe(
          "UPDATE policy_mutation_reservations "
            + "SET status='expired', terminal_at=$2::timestamptz, "
            + "terminal_reason='authorization_window_elapsed', "
            + "updated_at=$2::timestamptz "
            + "WHERE site_id=$1::uuid AND status='authorized' "
            + "AND expires_at <= $2::timestamptz",
          [intent.siteId, now.toISOString()],
        );

        const insertSql =
          "INSERT INTO policy_mutation_reservations ("
          + "reservation_id,reservation_version,reservation_class,"
          + "reservation_fingerprint,site_id,policy_id,policy_version,"
          + "policy_fingerprint,evaluation_id,evaluation_fingerprint,"
          + "materialization_id,materialization_fingerprint,"
          + "materialization_idempotency_fingerprint,proposal_id,"
          + "proposal_fingerprint,recommendation_fingerprint,"
          + "recommendation_idempotency_key,target_binding_fingerprint,"
          + "provider,domain,resource_kind,resource_gid,target_url,action_type,"
          + "field,required_provider_scope,before_fingerprint,after_fingerprint,"
          + "w03_authorization_id,w03_authorization_fingerprint,policy_action_id,"
          + "w03_reservation_descriptor_fingerprint,status,authorized_at,expires_at"
          + ") VALUES ("
          + "$1,$2,$3,$4,$5::uuid,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,"
          + "$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,"
          + "'authorized',$33::timestamptz,$34::timestamptz"
          + ") ON CONFLICT DO NOTHING RETURNING " + ROW_COLUMNS;

        const params = [
          intent.reservationId,
          P8_8_W04_DURABLE_RESERVATION_VERSION,
          P8_8_W04_RESERVATION_CLASS,
          intent.reservationFingerprint,
          intent.siteId,
          intent.policy.policyId,
          intent.policy.policyVersion,
          intent.policy.policyFingerprint,
          intent.evaluation.evaluationId,
          intent.evaluation.evaluationFingerprint,
          intent.materialization.materializationId,
          intent.materialization.materializationFingerprint,
          intent.materialization.materializationIdempotencyFingerprint,
          intent.proposal.proposalId,
          intent.proposal.proposalFingerprint,
          intent.recommendation.recommendationFingerprint,
          intent.recommendation.recommendationIdempotencyKey,
          intent.target.targetBindingFingerprint,
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
          w03.policyAuthorizationId,
          w03.policyAuthorizationFingerprint,
          w03.policyActionId,
          w03.reservation.descriptorFingerprint,
          w03.issuedAt,
          w03.expiresAt,
        ];

        const inserted = await tx.unsafe<ReservationRow[]>(
          insertSql,
          params,
        );
        if (inserted[0]) {
          return deepFreeze({
            kind: "created" as const,
            receipt: projectP88W04DurableReceipt(inserted[0]),
            providerDispatchAuthorized: false as const,
          });
        }

        const byId = await tx.unsafe<ReservationRow[]>(
          "SELECT " + ROW_COLUMNS
            + " FROM policy_mutation_reservations "
            + "WHERE reservation_id=$1 FOR UPDATE",
          [intent.reservationId],
        );
        if (byId[0]) {
          if (!rowMatches(byId[0], intent, w03)) {
            return conflict(
              "identity_collision",
              byId[0].reservation_id,
            );
          }
          return deepFreeze({
            kind: exactReplayKind(byId[0].status),
            receipt: projectP88W04DurableReceipt(byId[0]),
            providerDispatchAuthorized: false as const,
          });
        }

        const targetRows = await tx.unsafe<{ reservation_id: string }[]>(
          "SELECT reservation_id FROM policy_mutation_reservations "
            + "WHERE site_id=$1::uuid AND provider=$2 "
            + "AND resource_kind=$3 AND resource_gid=$4 AND field=$5 "
            + "AND status IN ('authorized','claimed','manual_intervention') "
            + "ORDER BY created_at, reservation_id LIMIT 1 FOR UPDATE",
          [
            intent.siteId,
            intent.target.provider,
            intent.target.resourceKind,
            intent.target.resourceGid,
            intent.target.field,
          ],
        );
        if (targetRows[0]) {
          return conflict(
            "target_reservation_conflict",
            targetRows[0].reservation_id,
          );
        }

        const siteRows = await tx.unsafe<{ reservation_id: string }[]>(
          "SELECT reservation_id FROM policy_mutation_reservations "
            + "WHERE site_id=$1::uuid "
            + "AND status IN ('authorized','claimed','manual_intervention') "
            + "ORDER BY created_at, reservation_id LIMIT 1 FOR UPDATE",
          [intent.siteId],
        );
        if (siteRows[0]) {
          return conflict(
            "site_concurrency_conflict",
            siteRows[0].reservation_id,
          );
        }

        return conflict("reservation_state_uncertain", null);
      });
    } catch (error) {
      if (
        error instanceof Error
        && error.message.startsWith("p88_w04_")
      ) {
        throw error;
      }
      throw new Error("p88_w04_reservation_state_uncertain");
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }
}

export function pairP88W03W04DurableReservation(
  w03: P88W03PolicyAuthorizationArtifact,
  receipt: P88W04DurableReservationReceipt,
): P88W04W03DurablePairing {
  assertP88W04DurableReceiptIntegrity(receipt);

  const comparisons: Array<[unknown, unknown, string]> = [
    [w03.reservation.reservationId, receipt.reservationId, "reservation_id"],
    [
      w03.reservation.reservationFingerprint,
      receipt.reservationFingerprint,
      "reservation_fingerprint",
    ],
    [
      w03.policyAuthorizationId,
      receipt.w03AuthorizationId,
      "w03_authorization_id",
    ],
    [
      w03.policyAuthorizationFingerprint,
      receipt.w03AuthorizationFingerprint,
      "w03_authorization_fingerprint",
    ],
    [w03.policyActionId, receipt.policyActionId, "policy_action_id"],
    [w03.target.resourceGid, receipt.target.resourceGid, "resource_gid"],
    [w03.target.targetUrl, receipt.target.targetUrl, "target_url"],
    [w03.target.field, receipt.target.field, "field"],
    [
      w03.state.beforeFingerprint,
      receipt.state.beforeFingerprint,
      "before_fingerprint",
    ],
    [
      w03.state.afterFingerprint,
      receipt.state.afterFingerprint,
      "after_fingerprint",
    ],
    [w03.issuedAt, receipt.authorizedAt, "authorized_at"],
    [w03.expiresAt, receipt.expiresAt, "expires_at"],
  ];

  for (const [left, right, name] of comparisons) {
    if (left !== right) {
      throw new Error("p88_w04_pairing_mismatch:" + name);
    }
  }

  if (
    receipt.status !== "authorized"
    || w03.authorization.providerDispatchAuthorized !== false
    || w03.authorization.publicSiteWrites !== false
  ) {
    throw new Error("p88_w04_pairing_not_control_eligible");
  }

  const base = {
    version: P8_8_W04_PAIRING_VERSION,
    paired: true as const,
    reservationId: receipt.reservationId,
    reservationFingerprint: receipt.reservationFingerprint,
    w03AuthorizationId: receipt.w03AuthorizationId,
    w03AuthorizationFingerprint: receipt.w03AuthorizationFingerprint,
    policyActionId: receipt.policyActionId,
    receiptFingerprint: receipt.receiptFingerprint,
    policyAwareControlEligible: true as const,
    providerDispatchAuthorized: false as const,
    publicSiteWrites: false as const,
  };

  return deepFreeze({
    ...base,
    pairingFingerprint: stableHash({
      purpose: "p8.8_w04_w03_durable_pairing",
      ...base,
    }),
  });
}

export function p88W04ReservationStoreCapability() {
  return deepFreeze({
    version: P8_8_W04_DURABLE_RESERVATION_VERSION,
    explicitDatabaseUrlOnly: true,
    expectedPublicTableCount: P8_8_W04_EXPECTED_TABLE_COUNT,
    dedicatedReservationTable: true,
    databaseTransactionClockAuthoritative: true,
    exactReplaySupported: true,
    siteConcurrencyEnforcedByDatabase: true,
    targetConcurrencyEnforcedByDatabase: true,
    authorizedOnlyExpiryReconciliation: true,
    claimedAutoExpiry: false,
    manualInterventionAutoExpiry: false,
    providerNetworkReadPerformed: false,
    providerWritePerformed: false,
    publicSiteWritePerformed: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    schedulerActivated: false,
    workerActivated: false,
    providerDispatchAuthorized: false,
    productionDdlAuthorized: false,
  });
}
