import postgres from "postgres";
import {
  p88W06DurableSnapshotFingerprint,
  type P88W06ClaimSnapshot,
  type P88W06ControlSnapshot,
  type P88W06DurableSnapshot,
  type P88W06ReservationSnapshot,
} from "./p8-8-policy-preflight.js";

export const P8_8_W06_EXPECTED_TABLE_COUNT = 41 as const;

type Sql = ReturnType<typeof postgres>;

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
  status: P88W06ReservationSnapshot["status"];
  authorized_at: Date;
  expires_at: Date;
  claimed_at: Date | null;
  terminal_at: Date | null;
  terminal_reason: string | null;
  updated_at: Date;
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
  created_at: Date;
};

type ControlRow = {
  control_version: string;
  site_id: string;
  revision: number;
  previous_control_fingerprint: string | null;
  mode: P88W06ControlSnapshot["mode"];
  effective_at: Date;
  control_fingerprint: string;
  updated_at: Date;
};

function canonicalIso(value: Date | null, code: string): string | null {
  if (value === null) return null;
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(code);
  }
  return value.toISOString();
}

function reservationFromRow(row: ReservationRow): P88W06ReservationSnapshot {
  return Object.freeze({
    reservationId: row.reservation_id,
    reservationVersion: row.reservation_version,
    reservationClass: row.reservation_class,
    reservationFingerprint: row.reservation_fingerprint,
    siteId: row.site_id,
    policyId: row.policy_id,
    policyVersion: row.policy_version,
    policyFingerprint: row.policy_fingerprint,
    evaluationId: row.evaluation_id,
    evaluationFingerprint: row.evaluation_fingerprint,
    materializationId: row.materialization_id,
    materializationFingerprint: row.materialization_fingerprint,
    materializationIdempotencyFingerprint:
      row.materialization_idempotency_fingerprint,
    proposalId: row.proposal_id,
    proposalFingerprint: row.proposal_fingerprint,
    recommendationFingerprint: row.recommendation_fingerprint,
    recommendationIdempotencyKey: row.recommendation_idempotency_key,
    targetBindingFingerprint: row.target_binding_fingerprint,
    provider: row.provider,
    domain: row.domain,
    resourceKind: row.resource_kind,
    resourceGid: row.resource_gid,
    targetUrl: row.target_url,
    actionType: row.action_type,
    field: row.field,
    requiredProviderScope: row.required_provider_scope,
    beforeFingerprint: row.before_fingerprint,
    afterFingerprint: row.after_fingerprint,
    w03AuthorizationId: row.w03_authorization_id,
    w03AuthorizationFingerprint: row.w03_authorization_fingerprint,
    policyActionId: row.policy_action_id,
    w03ReservationDescriptorFingerprint:
      row.w03_reservation_descriptor_fingerprint,
    status: row.status,
    authorizedAt:
      canonicalIso(row.authorized_at, "p88_w06_authorized_at_invalid")!,
    expiresAt:
      canonicalIso(row.expires_at, "p88_w06_reservation_expires_at_invalid")!,
    claimedAt:
      canonicalIso(row.claimed_at, "p88_w06_reservation_claimed_at_invalid"),
    terminalAt:
      canonicalIso(row.terminal_at, "p88_w06_reservation_terminal_at_invalid"),
    terminalReason: row.terminal_reason,
    updatedAt:
      canonicalIso(row.updated_at, "p88_w06_reservation_updated_at_invalid")!,
  });
}

function claimFromRow(row: ClaimRow): P88W06ClaimSnapshot {
  return Object.freeze({
    claimId: row.claim_id,
    claimVersion: row.claim_version,
    claimFingerprint: row.claim_fingerprint,
    reservationId: row.reservation_id,
    reservationFingerprint: row.reservation_fingerprint,
    w03AuthorizationId: row.w03_authorization_id,
    w03AuthorizationFingerprint: row.w03_authorization_fingerprint,
    policyActionId: row.policy_action_id,
    siteId: row.site_id,
    controlRevision: Number(row.control_revision),
    controlFingerprint: row.control_fingerprint,
    resourceGid: row.resource_gid,
    targetUrl: row.target_url,
    field: row.field,
    beforeFingerprint: row.before_fingerprint,
    afterFingerprint: row.after_fingerprint,
    claimedAt: canonicalIso(row.claimed_at, "p88_w06_claimed_at_invalid")!,
    createdAt:
      canonicalIso(row.created_at, "p88_w06_claim_created_at_invalid")!,
  });
}

function controlFromRow(row: ControlRow): P88W06ControlSnapshot {
  return Object.freeze({
    version: row.control_version,
    siteId: row.site_id,
    revision: Number(row.revision),
    previousControlFingerprint: row.previous_control_fingerprint,
    mode: row.mode,
    effectiveAt:
      canonicalIso(row.effective_at, "p88_w06_control_effective_at_invalid")!,
    controlFingerprint: row.control_fingerprint,
    updatedAt:
      canonicalIso(row.updated_at, "p88_w06_control_updated_at_invalid")!,
  });
}

export type P88W06SnapshotStoreOptions = {
  databaseUrl: string;
  sqlFactory?: (databaseUrl: string) => Sql;
};

export class P88W06SnapshotStore {
  private readonly databaseUrl: string;
  private readonly sqlFactory: (databaseUrl: string) => Sql;

  constructor(options: P88W06SnapshotStoreOptions) {
    this.databaseUrl = options.databaseUrl?.trim() ?? "";
    if (!this.databaseUrl) throw new Error("p88_w06_database_url_required");
    this.sqlFactory =
      options.sqlFactory
      ?? ((databaseUrl) =>
        postgres(databaseUrl, {
          max: 3,
          prepare: false,
          connect_timeout: 8,
          idle_timeout: 2,
        }));
  }

  async readSnapshot(input: {
    siteId: string;
    reservationId: string;
  }): Promise<P88W06DurableSnapshot> {
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      return await sql.begin(async (tx) => {
        await tx.unsafe("SET TRANSACTION READ ONLY");

        const counts = await tx.unsafe<{ count: number }[]>(
          "SELECT COUNT(*)::int AS count FROM information_schema.tables "
            + "WHERE table_schema='public' AND table_type='BASE TABLE'",
        );
        if (
          ![P8_8_W06_EXPECTED_TABLE_COUNT, 43].includes(
            Number(counts[0]?.count ?? 0),
          )
        ) {
          throw new Error("p88_w06_schema_table_count_mismatch");
        }

        const sites = await tx.unsafe<{ id: string }[]>(
          "SELECT id::text AS id FROM sites "
            + "WHERE id=$1::uuid AND lower(domain)='diamondshelf.us' "
            + "AND canonical_origin='https://diamondshelf.us' "
            + "AND platform='shopify' AND is_active=true LIMIT 1",
          [input.siteId],
        );
        if (sites[0]?.id !== input.siteId) {
          throw new Error("p88_w06_site_identity_mismatch");
        }

        const reservationRows = await tx.unsafe<ReservationRow[]>(
          "SELECT reservation_id,reservation_version,reservation_class,"
            + "reservation_fingerprint,site_id::text AS site_id,policy_id,"
            + "policy_version,policy_fingerprint,evaluation_id,"
            + "evaluation_fingerprint,materialization_id,"
            + "materialization_fingerprint,"
            + "materialization_idempotency_fingerprint,proposal_id,"
            + "proposal_fingerprint,recommendation_fingerprint,"
            + "recommendation_idempotency_key,target_binding_fingerprint,"
            + "provider,domain,resource_kind,resource_gid,target_url,"
            + "action_type,field,required_provider_scope,before_fingerprint,"
            + "after_fingerprint,w03_authorization_id,"
            + "w03_authorization_fingerprint,policy_action_id,"
            + "w03_reservation_descriptor_fingerprint,status,authorized_at,"
            + "expires_at,claimed_at,terminal_at,terminal_reason,updated_at "
            + "FROM policy_mutation_reservations WHERE reservation_id=$1 "
            + "AND site_id=$2::uuid",
          [input.reservationId, input.siteId],
        );

        const claimRows = await tx.unsafe<ClaimRow[]>(
          "SELECT claim_id,claim_version,claim_fingerprint,reservation_id,"
            + "reservation_fingerprint,w03_authorization_id,"
            + "w03_authorization_fingerprint,policy_action_id,"
            + "site_id::text AS site_id,control_revision,control_fingerprint,"
            + "resource_gid,target_url,field,before_fingerprint,"
            + "after_fingerprint,claimed_at,created_at "
            + "FROM policy_mutation_claims WHERE reservation_id=$1 "
            + "AND site_id=$2::uuid",
          [input.reservationId, input.siteId],
        );
        if (claimRows.length > 1) {
          throw new Error("p88_w06_multiple_claim_rows_uncertain");
        }

        const controlRows = await tx.unsafe<ControlRow[]>(
          "SELECT control_version,site_id::text AS site_id,revision,"
            + "previous_control_fingerprint,mode,effective_at,"
            + "control_fingerprint,updated_at "
            + "FROM policy_mutation_control_state WHERE site_id=$1::uuid",
          [input.siteId],
        );
        if (controlRows.length > 1) {
          throw new Error("p88_w06_multiple_control_rows_uncertain");
        }

        const clockRows = await tx.unsafe<{ now: Date }[]>(
          "SELECT transaction_timestamp() AS now",
        );
        const now = clockRows[0]?.now;
        if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
          throw new Error("p88_w06_database_clock_unavailable");
        }

        const state = {
          siteId: input.siteId,
          reservation: reservationRows[0]
            ? reservationFromRow(reservationRows[0])
            : null,
          claim: claimRows[0] ? claimFromRow(claimRows[0]) : null,
          control: controlRows[0] ? controlFromRow(controlRows[0]) : null,
        };
        return Object.freeze({
          ...state,
          databaseNow: now.toISOString(),
          snapshotFingerprint: p88W06DurableSnapshotFingerprint(state),
        });
      });
    } catch (error) {
      if (
        error instanceof Error
        && error.message.startsWith("p88_w06_")
      ) {
        throw error;
      }
      throw new Error("p88_w06_snapshot_state_uncertain");
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }
}

export function p88W06SnapshotStoreCapability() {
  return Object.freeze({
    version: "p8-8-w06-read-only-snapshot-store-v1" as const,
    expectedPublicTableCount: P8_8_W06_EXPECTED_TABLE_COUNT,
    explicitDatabaseUrlOnly: true,
    databaseTransactionClockAuthoritative: true,
    databaseReadPerformed: true,
    databaseWritePerformed: false,
    schemaMutationPerformed: false,
    rowLockPerformed: false,
    providerNetworkReadPerformed: false,
    providerWritePerformed: false,
    publicSiteWritePerformed: false,
    providerDispatchAuthorized: false,
  });
}
