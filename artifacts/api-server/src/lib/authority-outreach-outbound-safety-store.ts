import { createHash } from "node:crypto";
import postgres from "postgres";
import {
  UGP_10_31_CONTACT_RATE_LIMIT,
  UGP_10_31_DOMAIN_RATE_LIMIT,
  UGP_10_31_RESERVATION_TTL_SECONDS,
  UGP_AUTHORITY_OUTREACH_OUTBOUND_SAFETY_EVENT_VERSION,
  UGP_AUTHORITY_OUTREACH_OUTBOUND_SAFETY_RESERVATION_VERSION,
  UGP_AUTHORITY_OUTREACH_OUTBOUND_SUPPRESSION_VERSION,
  assertAuthorityOutreachOutboundSafetyIntentIntegrity,
  type AuthorityOutreachOutboundSafetyIntent,
} from "./authority-outreach-outbound-safety-intent.js";

export const UGP_10_31_EXPECTED_TABLE_COUNT = 47 as const;
export const UGP_10_31_COMPATIBLE_TABLE_COUNTS = Object.freeze([47,49] as const);

export type AuthorityOutreachSuppressionReason =
  | "explicit_opt_out"
  | "manual_suppression"
  | "compliance_hold"
  | "reputation_risk";

export type AuthorityOutreachOutboundReservationStatus =
  | "reserved"
  | "released"
  | "consumed"
  | "uncertain";

export type AuthorityOutreachOutboundSafetyTransition =
  | "release"
  | "consume"
  | "mark_uncertain";

type Sql = ReturnType<typeof postgres>;
type SqlLike = any;

type ReservationRow = {
  reservation_id: string;
  reservation_version: string;
  reservation_fingerprint: string;
  logical_send_key: string;
  site_id: string;
  delivery_binding_authorization_decision_fingerprint: string;
  delivery_binding_authorization_review_spec_fingerprint: string;
  prospect_fingerprint: string;
  opportunity_fingerprint: string;
  candidate_fingerprint: string;
  selected_role_candidate_fingerprint: string;
  selected_contact_point_fingerprint: string;
  send_review_fingerprint: string;
  quality_gate_fingerprint: string;
  recipient_domain: string;
  status: AuthorityOutreachOutboundReservationStatus;
  reserved_at: Date;
  expires_at: Date;
  terminal_at: Date | null;
  terminal_reason: string | null;
};

type EventRow = {
  event_id: string;
  event_version: string;
  event_fingerprint: string;
  reservation_id: string;
  reservation_fingerprint: string;
  site_id: string;
  sequence: number;
  previous_event_fingerprint: string | null;
  event_type: "reserved" | "released" | "consumed" | "marked_uncertain";
  event_reason:
    | "safety_preflight_passed"
    | "operator_release"
    | "reservation_expired"
    | "single_send_consumed"
    | "provider_result_uncertain";
  actor_id: string;
  occurred_at: Date;
};

export type AuthorityOutreachOutboundSafetyReceipt = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_OUTBOUND_SAFETY_RESERVATION_VERSION;
  reservationId: string;
  reservationFingerprint: string;
  logicalSendKey: string;
  deliveryBindingAuthorizationDecisionFingerprint: string;
  prospectFingerprint: string;
  opportunityFingerprint: string;
  candidateFingerprint: string;
  selectedRoleCandidateFingerprint: string;
  selectedContactPointFingerprint: string;
  sendReviewFingerprint: string;
  qualityGateFingerprint: string;
  recipientDomain: string;
  status: AuthorityOutreachOutboundReservationStatus;
  reservedAt: string;
  expiresAt: string;
  terminalAt: string | null;
  terminalReason: string | null;
  durable: true;
  providerDispatchAuthorized: false;
  messageTransmissionAuthorized: false;
  sendAuthorizationGranted: false;
  receiptFingerprint: string;
}>;

export type AuthorityOutreachOutboundReserveResult =
  | Readonly<{
      kind:
        | "created"
        | "existing_reserved"
        | "already_released"
        | "already_consumed";
      receipt: AuthorityOutreachOutboundSafetyReceipt;
      singleSendExecutionReservationReady: boolean;
      providerDispatchAuthorized: false;
      messageTransmissionAuthorized: false;
    }>
  | Readonly<{
      kind:
        | "suppressed_contact"
        | "duplicate_logical_send_conflict"
        | "contact_reservation_conflict"
        | "uncertain_previous_attempt"
        | "contact_rate_limited"
        | "domain_rate_limited"
        | "reservation_state_uncertain";
      conflictingReservationId: string | null;
      singleSendExecutionReservationReady: false;
      providerDispatchAuthorized: false;
      messageTransmissionAuthorized: false;
    }>;

export type AuthorityOutreachSuppressionReceipt = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_OUTBOUND_SUPPRESSION_VERSION;
  suppressionId: string;
  suppressionFingerprint: string;
  siteId: string;
  ownedSiteDomain: string;
  recipientDomain: string;
  contactPointFingerprint: string;
  reasonCode: AuthorityOutreachSuppressionReason;
  suppressedBy: string;
  suppressedAt: string;
  durable: true;
}>;

export type AuthorityOutreachOutboundTransitionResult = Readonly<{
  status: "transitioned" | "idempotent";
  receipt: AuthorityOutreachOutboundSafetyReceipt;
  eventFingerprint: string;
  providerDispatchAuthorized: false;
  messageTransmissionAuthorized: false;
}>;

const ACTOR = /^[A-Za-z0-9_.:@-]{1,120}$/;
const HEX64 = /^[0-9a-f]{64}$/;

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

function hash(value: unknown): string {
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

function actor(value: string): string {
  if (!ACTOR.test(value) || value.trim() !== value) {
    throw new Error("ugp10_31_invalid_actor_id");
  }
  return value;
}

function fingerprint(value: string, name: string): string {
  if (!HEX64.test(value)) throw new Error("ugp10_31_invalid_" + name);
  return value;
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

const RESERVATION_COLUMNS = [
  "reservation_id",
  "reservation_version",
  "reservation_fingerprint",
  "logical_send_key",
  "site_id::text AS site_id",
  "delivery_binding_authorization_decision_fingerprint",
  "delivery_binding_authorization_review_spec_fingerprint",
  "prospect_fingerprint",
  "opportunity_fingerprint",
  "candidate_fingerprint",
  "selected_role_candidate_fingerprint",
  "selected_contact_point_fingerprint",
  "send_review_fingerprint",
  "quality_gate_fingerprint",
  "recipient_domain",
  "status",
  "reserved_at",
  "expires_at",
  "terminal_at",
  "terminal_reason",
].join(",");

function projectReceipt(
  row: ReservationRow,
): AuthorityOutreachOutboundSafetyReceipt {
  if (
    row.reservation_version
      !== UGP_AUTHORITY_OUTREACH_OUTBOUND_SAFETY_RESERVATION_VERSION
    || !HEX64.test(row.reservation_fingerprint)
    || !HEX64.test(row.logical_send_key)
  ) {
    throw new Error("ugp10_31_persisted_reservation_invalid");
  }
  const base = {
    version: UGP_AUTHORITY_OUTREACH_OUTBOUND_SAFETY_RESERVATION_VERSION,
    reservationId: row.reservation_id,
    reservationFingerprint: row.reservation_fingerprint,
    logicalSendKey: row.logical_send_key,
    deliveryBindingAuthorizationDecisionFingerprint:
      row.delivery_binding_authorization_decision_fingerprint,
    prospectFingerprint: row.prospect_fingerprint,
    opportunityFingerprint: row.opportunity_fingerprint,
    candidateFingerprint: row.candidate_fingerprint,
    selectedRoleCandidateFingerprint: row.selected_role_candidate_fingerprint,
    selectedContactPointFingerprint: row.selected_contact_point_fingerprint,
    sendReviewFingerprint: row.send_review_fingerprint,
    qualityGateFingerprint: row.quality_gate_fingerprint,
    recipientDomain: row.recipient_domain,
    status: row.status,
    reservedAt: row.reserved_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    terminalAt: iso(row.terminal_at),
    terminalReason: row.terminal_reason,
    durable: true as const,
    providerDispatchAuthorized: false as const,
    messageTransmissionAuthorized: false as const,
    sendAuthorizationGranted: false as const,
  };
  return deepFreeze({
    ...base,
    receiptFingerprint: hash({
      purpose: "ugp10_31_outbound_safety_receipt",
      ...base,
    }),
  });
}

function rowMatchesIntent(
  row: ReservationRow,
  intent: AuthorityOutreachOutboundSafetyIntent,
): boolean {
  return (
    row.reservation_id === intent.reservationId
    && row.reservation_fingerprint === intent.reservationFingerprint
    && row.logical_send_key === intent.logicalSendKey
    && row.delivery_binding_authorization_decision_fingerprint
      === intent.deliveryBindingAuthorizationDecisionFingerprint
    && row.delivery_binding_authorization_review_spec_fingerprint
      === intent.deliveryBindingAuthorizationReviewSpecFingerprint
    && row.prospect_fingerprint === intent.prospectFingerprint
    && row.opportunity_fingerprint === intent.opportunityFingerprint
    && row.candidate_fingerprint === intent.candidateFingerprint
    && row.selected_role_candidate_fingerprint
      === intent.selectedRoleCandidateFingerprint
    && row.selected_contact_point_fingerprint
      === intent.selectedContactPointFingerprint
    && row.send_review_fingerprint === intent.sendReviewFingerprint
    && row.quality_gate_fingerprint === intent.qualityGateFingerprint
    && row.recipient_domain === intent.recipientDomain
  );
}

function blocked(
  kind:
    | "suppressed_contact"
    | "duplicate_logical_send_conflict"
    | "contact_reservation_conflict"
    | "uncertain_previous_attempt"
    | "contact_rate_limited"
    | "domain_rate_limited"
    | "reservation_state_uncertain",
  conflictingReservationId: string | null = null,
): AuthorityOutreachOutboundReserveResult {
  return deepFreeze({
    kind,
    conflictingReservationId,
    singleSendExecutionReservationReady: false as const,
    providerDispatchAuthorized: false as const,
    messageTransmissionAuthorized: false as const,
  });
}

async function assertSchema(sql: Sql): Promise<void> {
  const counts = await sql.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  const tableCount=Number(counts[0]?.count ?? 0);
  if(!UGP_10_31_COMPATIBLE_TABLE_COUNTS.includes(tableCount as 47|49)){
    throw new Error("ugp10_31_schema_table_count_mismatch");
  }
  for (const table of [
    "authority_outreach_suppressions",
    "authority_outreach_send_reservations",
    "authority_outreach_send_safety_events",
  ]) {
    const rows = await sql.unsafe<{ relation: string | null }[]>(
      "SELECT to_regclass($1)::text AS relation",
      ["public." + table],
    );
    if (rows[0]?.relation !== table) {
      throw new Error("ugp10_31_schema_relation_missing:" + table);
    }
  }
}

async function resolveOwnedSite(
  tx: SqlLike,
  ownedSiteDomain: string,
): Promise<string> {
  const rows = await tx.unsafe(
    "SELECT id::text AS id FROM sites WHERE lower(domain)=$1 AND is_active=true ORDER BY updated_at DESC,id LIMIT 2 FOR UPDATE",
    [ownedSiteDomain.toLowerCase()],
  ) as { id: string }[];
  if (rows.length !== 1 || !rows[0]?.id) {
    throw new Error(
      rows.length === 0
        ? "ugp10_31_owned_site_not_found"
        : "ugp10_31_owned_site_ambiguous",
    );
  }
  return rows[0].id;
}

function projectEvent(input: {
  reservation: ReservationRow;
  sequence: number;
  previousEventFingerprint: string | null;
  eventType: EventRow["event_type"];
  eventReason: EventRow["event_reason"];
  actorId: string;
  occurredAt: Date;
}) {
  const base = {
    eventVersion: UGP_AUTHORITY_OUTREACH_OUTBOUND_SAFETY_EVENT_VERSION,
    reservationId: input.reservation.reservation_id,
    reservationFingerprint: input.reservation.reservation_fingerprint,
    siteId: input.reservation.site_id,
    sequence: input.sequence,
    previousEventFingerprint: input.previousEventFingerprint,
    eventType: input.eventType,
    eventReason: input.eventReason,
    actorId: input.actorId,
    occurredAt: input.occurredAt.toISOString(),
  };
  const eventFingerprint = hash({
    purpose: "ugp10_31_outbound_safety_event",
    ...base,
  });
  return {
    eventId: "uaose-" + eventFingerprint.slice(0, 24),
    eventFingerprint,
    ...base,
  };
}

async function appendEvent(
  tx: SqlLike,
  row: ReservationRow,
  eventType: EventRow["event_type"],
  eventReason: EventRow["event_reason"],
  actorId: string,
  occurredAt: Date,
): Promise<EventRow> {
  const prior = await tx.unsafe(
    "SELECT event_id,event_version,event_fingerprint,reservation_id,reservation_fingerprint,site_id::text AS site_id,sequence::int AS sequence,previous_event_fingerprint,event_type,event_reason,actor_id,occurred_at FROM authority_outreach_send_safety_events WHERE reservation_id=$1 ORDER BY sequence DESC,event_id DESC LIMIT 1 FOR UPDATE",
    [row.reservation_id],
  ) as EventRow[];
  const projected = projectEvent({
    reservation: row,
    sequence: (prior[0]?.sequence ?? 0) + 1,
    previousEventFingerprint: prior[0]?.event_fingerprint ?? null,
    eventType,
    eventReason,
    actorId,
    occurredAt,
  });
  const inserted = await tx.unsafe(
    "INSERT INTO authority_outreach_send_safety_events(event_id,event_version,event_fingerprint,reservation_id,reservation_fingerprint,site_id,sequence,previous_event_fingerprint,event_type,event_reason,actor_id,occurred_at) VALUES($1,$2,$3,$4,$5,$6::uuid,$7,$8,$9,$10,$11,$12::timestamptz) RETURNING event_id,event_version,event_fingerprint,reservation_id,reservation_fingerprint,site_id::text AS site_id,sequence::int AS sequence,previous_event_fingerprint,event_type,event_reason,actor_id,occurred_at",
    [
      projected.eventId,
      projected.eventVersion,
      projected.eventFingerprint,
      projected.reservationId,
      projected.reservationFingerprint,
      projected.siteId,
      projected.sequence,
      projected.previousEventFingerprint,
      projected.eventType,
      projected.eventReason,
      projected.actorId,
      projected.occurredAt,
    ],
  ) as EventRow[];
  if (
    !inserted[0]
    || inserted[0].event_fingerprint !== projected.eventFingerprint
  ) {
    throw new Error("ugp10_31_safety_event_write_verification_failed");
  }
  return inserted[0];
}

async function reconcileExpired(
  tx: SqlLike,
  siteId: string,
  now: Date,
): Promise<void> {
  const expired = await tx.unsafe(
    "SELECT " + RESERVATION_COLUMNS
      + " FROM authority_outreach_send_reservations"
      + " WHERE site_id=$1::uuid AND status='reserved'"
      + " AND expires_at<=$2::timestamptz"
      + " ORDER BY reserved_at,reservation_id FOR UPDATE",
    [siteId, now.toISOString()],
  ) as ReservationRow[];
  for (const row of expired) {
    const updated = await tx.unsafe(
      "UPDATE authority_outreach_send_reservations"
        + " SET status='released',terminal_at=$2::timestamptz,"
        + " terminal_reason='reservation_expired',updated_at=$2::timestamptz"
        + " WHERE reservation_id=$1 AND status='reserved'"
        + " RETURNING " + RESERVATION_COLUMNS,
      [row.reservation_id, now.toISOString()],
    ) as ReservationRow[];
    if (updated[0]) {
      await appendEvent(
        tx,
        updated[0],
        "released",
        "reservation_expired",
        "system:reservation-expiry",
        now,
      );
    }
  }
}

export class AuthorityOutreachOutboundSafetyStore {
  private readonly databaseUrl: string;
  private readonly sqlFactory: (databaseUrl: string) => Sql;

  constructor(options: {
    databaseUrl: string;
    sqlFactory?: (databaseUrl: string) => Sql;
  }) {
    this.databaseUrl = options.databaseUrl?.trim() ?? "";
    if (!this.databaseUrl) throw new Error("ugp10_31_database_url_required");
    this.sqlFactory = options.sqlFactory ?? ((databaseUrl) =>
      postgres(databaseUrl, {
        max: 4,
        prepare: false,
        connect_timeout: 8,
        idle_timeout: 2,
      }));
  }

  async readReservation(input:{
    reservationId:string;
    reservationFingerprint:string;
  }):Promise<AuthorityOutreachOutboundSafetyReceipt>{
    fingerprint(input.reservationFingerprint,"reservation_fingerprint");
    const sql=this.sqlFactory(this.databaseUrl);
    try{
      await assertSchema(sql);
      const rows=await sql.unsafe<ReservationRow[]>(
        "SELECT "+RESERVATION_COLUMNS
          +" FROM authority_outreach_send_reservations"
          +" WHERE reservation_id=$1 LIMIT 1",
        [input.reservationId],
      );
      const row=rows[0];
      if(!row) throw new Error("ugp10_31_reservation_not_found");
      if(row.reservation_fingerprint!==input.reservationFingerprint){
        throw new Error("ugp10_31_reservation_identity_collision");
      }
      return projectReceipt(row);
    }finally{
      await sql.end({timeout:1}).catch(()=>undefined);
    }
  }

  async suppress(input: {
    ownedSiteDomain: string;
    recipientDomain: string;
    contactPointFingerprint: string;
    reasonCode: AuthorityOutreachSuppressionReason;
    actorId: string;
  }): Promise<AuthorityOutreachSuppressionReceipt> {
    fingerprint(input.contactPointFingerprint, "contact_point_fingerprint");
    const actorId = actor(input.actorId);
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await assertSchema(sql);
      return await sql.begin(async (tx) => {
        const siteId = await resolveOwnedSite(tx, input.ownedSiteDomain);
        const nowRows = await tx.unsafe(
          "SELECT transaction_timestamp() AS now",
        ) as { now: Date }[];
        const now = nowRows[0]?.now;
        if (!(now instanceof Date)) {
          throw new Error("ugp10_31_database_clock_unavailable");
        }

        const suppressionFingerprint = hash({
          purpose: "ugp10_31_monotonic_contact_suppression",
          siteId,
          recipientDomain: input.recipientDomain.toLowerCase(),
          contactPointFingerprint: input.contactPointFingerprint,
        });
        const suppressionId =
          "uaos-" + suppressionFingerprint.slice(0, 24);

        await tx.unsafe(
          "INSERT INTO authority_outreach_suppressions"
            + "(suppression_id,suppression_version,suppression_fingerprint,"
            + "site_id,recipient_domain,contact_point_fingerprint,reason_code,"
            + "suppressed_by,suppressed_at)"
            + " VALUES($1,$2,$3,$4::uuid,$5,$6,$7,$8,$9::timestamptz)"
            + " ON CONFLICT(site_id,contact_point_fingerprint) DO NOTHING",
          [
            suppressionId,
            UGP_AUTHORITY_OUTREACH_OUTBOUND_SUPPRESSION_VERSION,
            suppressionFingerprint,
            siteId,
            input.recipientDomain.toLowerCase(),
            input.contactPointFingerprint,
            input.reasonCode,
            actorId,
            now.toISOString(),
          ],
        );

        const rows = await tx.unsafe(
          "SELECT suppression_id,suppression_version,suppression_fingerprint,"
            + "site_id::text AS site_id,recipient_domain,"
            + "contact_point_fingerprint,reason_code,suppressed_by,suppressed_at"
            + " FROM authority_outreach_suppressions"
            + " WHERE site_id=$1::uuid AND contact_point_fingerprint=$2",
          [siteId, input.contactPointFingerprint],
        ) as Array<{
          suppression_id: string;
          suppression_version: string;
          suppression_fingerprint: string;
          site_id: string;
          recipient_domain: string;
          contact_point_fingerprint: string;
          reason_code: AuthorityOutreachSuppressionReason;
          suppressed_by: string;
          suppressed_at: Date;
        }>;
        const row = rows[0];
        if (!row) {
          throw new Error("ugp10_31_suppression_write_verification_failed");
        }
        return deepFreeze({
          version: UGP_AUTHORITY_OUTREACH_OUTBOUND_SUPPRESSION_VERSION,
          suppressionId: row.suppression_id,
          suppressionFingerprint: row.suppression_fingerprint,
          siteId: row.site_id,
          ownedSiteDomain: input.ownedSiteDomain.toLowerCase(),
          recipientDomain: row.recipient_domain,
          contactPointFingerprint: row.contact_point_fingerprint,
          reasonCode: row.reason_code,
          suppressedBy: row.suppressed_by,
          suppressedAt: row.suppressed_at.toISOString(),
          durable: true as const,
        });
      });
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  async reserve(input: {
    intent: AuthorityOutreachOutboundSafetyIntent;
    intentInput:
      Parameters<typeof assertAuthorityOutreachOutboundSafetyIntentIntegrity>[1];
    actorId: string;
  }): Promise<AuthorityOutreachOutboundReserveResult> {
    assertAuthorityOutreachOutboundSafetyIntentIntegrity(
      input.intent,
      input.intentInput,
    );
    const actorId = actor(input.actorId);
    const intent = input.intent;
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await assertSchema(sql);
      return await sql.begin(async (tx) => {
        const siteId = await resolveOwnedSite(tx, intent.ownedSiteDomain);
        const nowRows = await tx.unsafe(
          "SELECT transaction_timestamp() AS now",
        ) as { now: Date }[];
        const now = nowRows[0]?.now;
        if (!(now instanceof Date)) {
          throw new Error("ugp10_31_database_clock_unavailable");
        }

        await reconcileExpired(tx, siteId, now);

        const suppressed = await tx.unsafe(
          "SELECT suppression_id FROM authority_outreach_suppressions"
            + " WHERE site_id=$1::uuid AND contact_point_fingerprint=$2 LIMIT 1",
          [siteId, intent.selectedContactPointFingerprint],
        ) as { suppression_id: string }[];
        if (suppressed[0]) return blocked("suppressed_contact");

        const existing = await tx.unsafe(
          "SELECT " + RESERVATION_COLUMNS
            + " FROM authority_outreach_send_reservations"
            + " WHERE logical_send_key=$1 LIMIT 1 FOR UPDATE",
          [intent.logicalSendKey],
        ) as ReservationRow[];
        if (existing[0]) {
          if (!rowMatchesIntent(existing[0], intent)) {
            return blocked(
              "duplicate_logical_send_conflict",
              existing[0].reservation_id,
            );
          }
          const existingReceipt = projectReceipt(existing[0]);
          if (existing[0].status === "reserved") {
            return deepFreeze({
              kind: "existing_reserved" as const,
              receipt: existingReceipt,
              singleSendExecutionReservationReady: true,
              providerDispatchAuthorized: false as const,
              messageTransmissionAuthorized: false as const,
            });
          }
          if (existing[0].status === "consumed") {
            return deepFreeze({
              kind: "already_consumed" as const,
              receipt: existingReceipt,
              singleSendExecutionReservationReady: false,
              providerDispatchAuthorized: false as const,
              messageTransmissionAuthorized: false as const,
            });
          }
          if (existing[0].status === "released") {
            return deepFreeze({
              kind: "already_released" as const,
              receipt: existingReceipt,
              singleSendExecutionReservationReady: false,
              providerDispatchAuthorized: false as const,
              messageTransmissionAuthorized: false as const,
            });
          }
          return blocked(
            "uncertain_previous_attempt",
            existing[0].reservation_id,
          );
        }

        const active = await tx.unsafe(
          "SELECT reservation_id,status"
            + " FROM authority_outreach_send_reservations"
            + " WHERE site_id=$1::uuid AND selected_contact_point_fingerprint=$2"
            + " AND status IN ('reserved','uncertain')"
            + " ORDER BY reserved_at,reservation_id LIMIT 1 FOR UPDATE",
          [siteId, intent.selectedContactPointFingerprint],
        ) as Array<{
          reservation_id: string;
          status: AuthorityOutreachOutboundReservationStatus;
        }>;
        if (active[0]) {
          return blocked(
            active[0].status === "uncertain"
              ? "uncertain_previous_attempt"
              : "contact_reservation_conflict",
            active[0].reservation_id,
          );
        }

        const contactWindowStart = new Date(
          now.getTime()
            - UGP_10_31_CONTACT_RATE_LIMIT.windowSeconds * 1000,
        ).toISOString();
        const contactCounts = await tx.unsafe(
          "SELECT COUNT(*)::int AS count"
            + " FROM authority_outreach_send_reservations"
            + " WHERE site_id=$1::uuid AND selected_contact_point_fingerprint=$2"
            + " AND reserved_at>$3::timestamptz",
          [
            siteId,
            intent.selectedContactPointFingerprint,
            contactWindowStart,
          ],
        ) as { count: number }[];
        if (
          Number(contactCounts[0]?.count ?? 0)
          >= UGP_10_31_CONTACT_RATE_LIMIT.maximumReservations
        ) {
          return blocked("contact_rate_limited");
        }

        const domainWindowStart = new Date(
          now.getTime()
            - UGP_10_31_DOMAIN_RATE_LIMIT.windowSeconds * 1000,
        ).toISOString();
        const domainCounts = await tx.unsafe(
          "SELECT COUNT(*)::int AS count"
            + " FROM authority_outreach_send_reservations"
            + " WHERE site_id=$1::uuid AND recipient_domain=$2"
            + " AND reserved_at>$3::timestamptz",
          [siteId, intent.recipientDomain, domainWindowStart],
        ) as { count: number }[];
        if (
          Number(domainCounts[0]?.count ?? 0)
          >= UGP_10_31_DOMAIN_RATE_LIMIT.maximumReservations
        ) {
          return blocked("domain_rate_limited");
        }

        const expiresAt = new Date(
          now.getTime() + UGP_10_31_RESERVATION_TTL_SECONDS * 1000,
        );
        const inserted = await tx.unsafe(
          "INSERT INTO authority_outreach_send_reservations"
            + "(reservation_id,reservation_version,reservation_fingerprint,"
            + "logical_send_key,site_id,"
            + "delivery_binding_authorization_decision_fingerprint,"
            + "delivery_binding_authorization_review_spec_fingerprint,"
            + "prospect_fingerprint,opportunity_fingerprint,candidate_fingerprint,"
            + "selected_role_candidate_fingerprint,"
            + "selected_contact_point_fingerprint,send_review_fingerprint,"
            + "quality_gate_fingerprint,recipient_domain,status,reserved_at,expires_at)"
            + " VALUES($1,$2,$3,$4,$5::uuid,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,"
            + "'reserved',$16::timestamptz,$17::timestamptz)"
            + " ON CONFLICT DO NOTHING RETURNING " + RESERVATION_COLUMNS,
          [
            intent.reservationId,
            UGP_AUTHORITY_OUTREACH_OUTBOUND_SAFETY_RESERVATION_VERSION,
            intent.reservationFingerprint,
            intent.logicalSendKey,
            siteId,
            intent.deliveryBindingAuthorizationDecisionFingerprint,
            intent.deliveryBindingAuthorizationReviewSpecFingerprint,
            intent.prospectFingerprint,
            intent.opportunityFingerprint,
            intent.candidateFingerprint,
            intent.selectedRoleCandidateFingerprint,
            intent.selectedContactPointFingerprint,
            intent.sendReviewFingerprint,
            intent.qualityGateFingerprint,
            intent.recipientDomain,
            now.toISOString(),
            expiresAt.toISOString(),
          ],
        ) as ReservationRow[];
        if (!inserted[0]) return blocked("reservation_state_uncertain");

        await appendEvent(
          tx,
          inserted[0],
          "reserved",
          "safety_preflight_passed",
          actorId,
          now,
        );

        return deepFreeze({
          kind: "created" as const,
          receipt: projectReceipt(inserted[0]),
          singleSendExecutionReservationReady: true,
          providerDispatchAuthorized: false as const,
          messageTransmissionAuthorized: false as const,
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("ugp10_31_")) {
        throw error;
      }
      throw new Error("ugp10_31_reservation_state_uncertain");
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  async transition(input: {
    reservationId: string;
    reservationFingerprint: string;
    transition: AuthorityOutreachOutboundSafetyTransition;
    actorId: string;
  }): Promise<AuthorityOutreachOutboundTransitionResult> {
    fingerprint(input.reservationFingerprint, "reservation_fingerprint");
    const actorId = actor(input.actorId);
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      await assertSchema(sql);
      return await sql.begin(async (tx) => {
        const rows = await tx.unsafe(
          "SELECT " + RESERVATION_COLUMNS
            + " FROM authority_outreach_send_reservations"
            + " WHERE reservation_id=$1 FOR UPDATE",
          [input.reservationId],
        ) as ReservationRow[];
        const row = rows[0];
        if (!row) throw new Error("ugp10_31_reservation_not_found");
        if (row.reservation_fingerprint !== input.reservationFingerprint) {
          throw new Error("ugp10_31_reservation_identity_collision");
        }

        const targetStatus: AuthorityOutreachOutboundReservationStatus =
          input.transition === "release"
            ? "released"
            : input.transition === "consume"
              ? "consumed"
              : "uncertain";
        const eventType: EventRow["event_type"] =
          input.transition === "release"
            ? "released"
            : input.transition === "consume"
              ? "consumed"
              : "marked_uncertain";
        const eventReason: EventRow["event_reason"] =
          input.transition === "release"
            ? "operator_release"
            : input.transition === "consume"
              ? "single_send_consumed"
              : "provider_result_uncertain";

        if (row.status === targetStatus) {
          const events = await tx.unsafe(
            "SELECT event_id,event_version,event_fingerprint,reservation_id,"
              + "reservation_fingerprint,site_id::text AS site_id,"
              + "sequence::int AS sequence,previous_event_fingerprint,"
              + "event_type,event_reason,actor_id,occurred_at"
              + " FROM authority_outreach_send_safety_events"
              + " WHERE reservation_id=$1 AND event_type=$2"
              + " ORDER BY sequence DESC LIMIT 1",
            [row.reservation_id, eventType],
          ) as EventRow[];
          if (!events[0]) throw new Error("ugp10_31_terminal_event_missing");
          return deepFreeze({
            status: "idempotent" as const,
            receipt: projectReceipt(row),
            eventFingerprint: events[0].event_fingerprint,
            providerDispatchAuthorized: false as const,
            messageTransmissionAuthorized: false as const,
          });
        }

        if (row.status !== "reserved") {
          throw new Error("ugp10_31_reservation_transition_not_allowed");
        }

        const nowRows = await tx.unsafe(
          "SELECT transaction_timestamp() AS now",
        ) as { now: Date }[];
        const now = nowRows[0]?.now;
        if (!(now instanceof Date)) {
          throw new Error("ugp10_31_database_clock_unavailable");
        }

        const updated = await tx.unsafe(
          "UPDATE authority_outreach_send_reservations"
            + " SET status=$2,terminal_at=$3::timestamptz,"
            + "terminal_reason=$4,updated_at=$3::timestamptz"
            + " WHERE reservation_id=$1 AND status='reserved'"
            + " RETURNING " + RESERVATION_COLUMNS,
          [row.reservation_id, targetStatus, now.toISOString(), eventReason],
        ) as ReservationRow[];
        if (!updated[0]) {
          throw new Error("ugp10_31_reservation_transition_race");
        }

        const event = await appendEvent(
          tx,
          updated[0],
          eventType,
          eventReason,
          actorId,
          now,
        );
        return deepFreeze({
          status: "transitioned" as const,
          receipt: projectReceipt(updated[0]),
          eventFingerprint: event.event_fingerprint,
          providerDispatchAuthorized: false as const,
          messageTransmissionAuthorized: false as const,
        });
      });
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }
}

export function authorityOutreachOutboundSafetyStoreCapability() {
  return deepFreeze({
    version: UGP_AUTHORITY_OUTREACH_OUTBOUND_SAFETY_RESERVATION_VERSION,
    expectedPublicTableCount: UGP_10_31_EXPECTED_TABLE_COUNT,
    compatiblePublicTableCounts: UGP_10_31_COMPATIBLE_TABLE_COUNTS,
    explicitDatabaseUrlOnly: true,
    databaseTransactionClockAuthoritative: true,
    siteRowSerializesReservations: true,
    monotonicSuppression: true,
    permanentLogicalSendIdempotency: true,
    activeContactReservationExclusion: true,
    uncertainAttemptFenceSticky: true,
    contactRateMaximumReservations: 1,
    contactRateWindowSeconds: 604800,
    domainRateMaximumReservations: 5,
    domainRateWindowSeconds: 86400,
    immutableSafetyEventHistory: true,
    rawContactValueStored: false,
    messageBodyStored: false,
    providerCredentialStored: false,
    providerNetworkCallPerformed: false,
    messageTransmissionPerformed: false,
    sendAuthorizationGranted: false,
    outreachSendingAuthorized: false,
    schedulerActivated: false,
    workerActivated: false,
    productionDdlAuthorized: false,
  });
}
