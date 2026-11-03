/**
 * PILOT-01 RT01-A3b — disposable PostgreSQL grant adapter, NOT runtime authority.
 * Only the guarded .ephemeral.test.ts harness may instantiate this class.
 * No credential lookup, connection creation, route, queue or provider integration.
 * Caller context is synthetic; a source marker does NOT authenticate an actor.
 */
import type postgres from "postgres";
import type {
  AtomicGrantReceiptStore, DurableGrantResult, GrantConsumeIntent,
  VerifiedGrantContext,
} from "./pilot-01-trusted-grant-contract.js";

export type GrantRevocationResult = "revoked" | "denied" | "unavailable";
const text = (x: unknown): x is string =>
  typeof x === "string" && x.length > 0 && x.trim() === x;
function verified(c: VerifiedGrantContext): boolean {
  return !!c && c.source === "server_verified_session" &&
    (c.role === "admin" || c.role === "analyst") &&
    [c.actorId, c.tenantId, c.siteId, c.issuerId, c.sessionId].every(text);
}
function safeSchema(schema: string): string {
  if (!/^pilot01_test_[a-f0-9]{32}$/.test(schema)) throw Error("DISPOSABLE_TEST_SCHEMA_REQUIRED");
  return '"' + schema + '"';
}

/** SQL client and random test-schema name must be created by the guarded harness. */
export class DisposablePgGrantAdapter implements AtomicGrantReceiptStore {
  private readonly schema: string;
  constructor(private readonly sql: ReturnType<typeof postgres>, schema: string) {
    this.schema = safeSchema(schema);
  }

  async consume(input: Readonly<{
    context: VerifiedGrantContext; intent: GrantConsumeIntent;
  }>): Promise<DurableGrantResult> {
    const c = input?.context;
    const i = input?.intent;
    if (!verified(c) || !i || !text(i.grantId) ||
        (i.operation !== "analyze" && i.operation !== "recommend")) {
      return { status: "denied" };
    }
    try {
      return await this.sql.begin(async tx => {
        const updated = await tx.unsafe(
          `UPDATE ${this.schema}.grants SET state='consumed', consumed_at=clock_timestamp()
           WHERE grant_id=$1 AND tenant_id=$2 AND site_id=$3 AND actor_id=$4
             AND issuer_id=$5 AND operation=$6 AND state='issued'
             AND expires_at>clock_timestamp()
           RETURNING grant_id`,
          [i.grantId, c.tenantId, c.siteId, c.actorId, c.issuerId, i.operation],
        );
        if (updated.length !== 1) return { status: "denied" } as const;
        const receipts = await tx.unsafe(
          `INSERT INTO ${this.schema}.audit(grant_id,event,actor_id,tenant_id,site_id,issuer_id,operation,transaction_id,committed_at)
           VALUES ($1,'consumed',$2,$3,$4,$5,$6,txid_current()::text,clock_timestamp())
           RETURNING receipt_id, grant_id, actor_id, tenant_id, site_id, issuer_id, operation, transaction_id, committed_at`,
          [i.grantId, c.actorId, c.tenantId, c.siteId, c.issuerId, i.operation],
        );
        if (receipts.length !== 1) throw Error("AUDIT_RECEIPT_NOT_COMMITTED");
        const r = receipts[0];
        return {
          status: "consumed" as const,
          receipt: {
            receiptId: String(r.receipt_id),
            grantId: String(r.grant_id),
            actorId: String(r.actor_id),
            tenantId: String(r.tenant_id),
            siteId: String(r.site_id),
            issuerId: String(r.issuer_id),
            operation: i.operation,
            transactionId: String(r.transaction_id),
            committedAt: new Date(r.committed_at).toISOString(),
          },
        };
      });
    } catch {
      return { status: "unavailable" };
    }
  }

  /** Separate role-gated synthetic revoke; never used for production cancellation. */
  async revoke(grantId: string, c: VerifiedGrantContext): Promise<GrantRevocationResult> {
    if (!text(grantId) || !verified(c) || c.role !== "admin") return "denied";
    try {
      return await this.sql.begin(async tx => {
        const updated = await tx.unsafe(
          `UPDATE ${this.schema}.grants SET state='revoked', revoked_at=clock_timestamp()
           WHERE grant_id=$1 AND tenant_id=$2 AND site_id=$3 AND actor_id=$4
             AND issuer_id=$5 AND state='issued'
           RETURNING operation`,
          [grantId, c.tenantId, c.siteId, c.actorId, c.issuerId],
        );
        if (updated.length !== 1) return "denied" as const;
        const receipts = await tx.unsafe(
          `INSERT INTO ${this.schema}.audit(grant_id,event,actor_id,tenant_id,site_id,issuer_id,operation,transaction_id,committed_at)
           VALUES ($1,'revoked',$2,$3,$4,$5,$6,txid_current()::text,clock_timestamp()) RETURNING receipt_id`,
          [grantId, c.actorId, c.tenantId, c.siteId, c.issuerId, updated[0].operation],
        );
        if (receipts.length !== 1) throw Error("AUDIT_RECEIPT_NOT_COMMITTED");
        return "revoked" as const;
      });
    } catch {
      return "unavailable";
    }
  }
}
