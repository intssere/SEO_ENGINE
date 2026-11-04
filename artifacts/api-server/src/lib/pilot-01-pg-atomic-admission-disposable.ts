/**
 * RT01-A7: disposable PostgreSQL transaction adapter. TEST-ONLY.
 * No URL lookup, connection creation, migrations, routes, or worker dispatch.
 * Only the armed, localhost, newly isolated .ephemeral.test.ts harness may
 * instantiate this class. Injected context is SYNTHETIC, not authentication.
 */
import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import type {
  AtomicAdmissionPort, AtomicAdmissionPortOutcome,
} from "./pilot-01-atomic-job-admission.js";

type Sql = ReturnType<typeof postgres>;
export type SyntheticFault = "after_grant" | "after_job" | "after_audit";
const clean = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.trim() === value;
function quotedTestSchema(name: string): string {
  if (!/^pilot01_test_[0-9a-f]{32}$/.test(name))
    throw Error("DISPOSABLE_TEST_SCHEMA_REQUIRED");
  return '"' + name + '"';
}

/** Only a separate test harness may inject a pre-verified disposable client. */
export class DisposablePgAtomicAdmissionAdapter implements AtomicAdmissionPort {
  private readonly schema: string;
  constructor(
    private readonly sql: Sql,
    testSchema: string,
    private readonly fault?: SyntheticFault,
  ) {
    this.schema = quotedTestSchema(testSchema);
  }

  async admit(input: Parameters<AtomicAdmissionPort["admit"]>[0]): Promise<AtomicAdmissionPortOutcome> {
    const c = input?.context;
    const r = input?.request;
    if (!c || c.source !== "server_verified_session" ||
        (c.role !== "admin" && c.role !== "analyst") ||
        ![c.actorId,c.tenantId,c.siteId,c.issuerId,c.sessionId].every(clean) ||
        !r || ![r.grantId,r.siteId,r.idempotencyKey].every(clean) ||
        r.siteId !== c.siteId ||
        (r.operation !== "analyze" && r.operation !== "recommend"))
      return { status: "denied" };

    try {
      return await this.sql.begin(async tx => {
        // Lock the grant even for retries: second session cannot observe an
        // uncommitted job. DB-authoritative time checks occur under this lock.
        const rows = await tx.unsafe(
          `SELECT grant_id, tenant_id, site_id, actor_id, issuer_id, operation, state,
                  expires_at > clock_timestamp() AS unexpired
             FROM ${this.schema}.grants WHERE grant_id=$1 FOR UPDATE`,
          [r.grantId],
        );
        if (rows.length !== 1) return { status: "denied" } as const;
        const g = rows[0];
        if (g.tenant_id !== c.tenantId || g.site_id !== c.siteId ||
            g.actor_id !== c.actorId || g.issuer_id !== c.issuerId ||
            g.operation !== r.operation) return { status: "denied" } as const;

        const existing = await tx.unsafe(
          `SELECT a.admission_id, a.job_id, a.grant_id, a.idempotency_key,
                  a.actor_id,a.tenant_id,a.site_id,a.issuer_id,a.operation,
                  a.transaction_id,a.committed_at
             FROM ${this.schema}.admissions a
             WHERE a.grant_id=$1 OR a.idempotency_key=$2`,
          [r.grantId, r.idempotencyKey],
        );
        if (existing.length) {
          const a=existing[0];
          if (existing.length !== 1 || a.grant_id !== r.grantId ||
              a.idempotency_key !== r.idempotencyKey ||
              a.actor_id !== c.actorId || a.tenant_id !== c.tenantId ||
              a.site_id !== c.siteId || a.issuer_id !== c.issuerId ||
              a.operation !== r.operation || g.state !== "consumed")
            return { status: "denied" } as const;
          return { status: "already_committed", receipt: this.receipt(a) } as const;
        }
        if (g.state !== "issued" || g.unexpired !== true)
          return { status: "denied" } as const;

        // Conditional update, job creation and audit are ONE transaction.
        const changed = await tx.unsafe(
          `UPDATE ${this.schema}.grants SET state='consumed', consumed_at=clock_timestamp()
             WHERE grant_id=$1 AND state='issued' AND expires_at>clock_timestamp()
             RETURNING grant_id`,
          [r.grantId],
        );
        if (changed.length !== 1) return { status: "denied" } as const;
        if (this.fault === "after_grant") throw Error("SYNTHETIC_AFTER_GRANT");

        const jobId = randomUUID();
        await tx.unsafe(
          `INSERT INTO ${this.schema}.jobs
             (job_id,grant_id,tenant_id,site_id,actor_id,operation,state)
             VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
          [jobId,r.grantId,c.tenantId,c.siteId,c.actorId,r.operation],
        );
        if (this.fault === "after_job") throw Error("SYNTHETIC_AFTER_JOB");

        const admissionId = randomUUID();
        const inserted = await tx.unsafe(
          `INSERT INTO ${this.schema}.admissions
             (admission_id,job_id,grant_id,idempotency_key,actor_id,tenant_id,
              site_id,issuer_id,operation,transaction_id,committed_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,txid_current()::text,clock_timestamp())
             RETURNING admission_id,job_id,grant_id,idempotency_key,actor_id,
                       tenant_id,site_id,issuer_id,operation,transaction_id,committed_at`,
          [admissionId,jobId,r.grantId,r.idempotencyKey,c.actorId,
            c.tenantId,c.siteId,c.issuerId,r.operation],
        );
        if (inserted.length !== 1) throw Error("SYNTHETIC_RECEIPT_INSERT_FAILURE");
        if (this.fault === "after_audit") throw Error("SYNTHETIC_AFTER_AUDIT");
        return { status: "committed", receipt: this.receipt(inserted[0]) } as const;
      });
    } catch {
      // An ambiguous database exception must NEVER masquerade as success.
      return { status: "unavailable" };
    }
  }

  private receipt(row: Record<string, unknown>) {
    return {
      admissionId: String(row.admission_id), jobId: String(row.job_id),
      grantId: String(row.grant_id), idempotencyKey: String(row.idempotency_key),
      actorId: String(row.actor_id), tenantId: String(row.tenant_id),
      siteId: String(row.site_id), issuerId: String(row.issuer_id),
      operation: row.operation as "analyze" | "recommend",
      transactionId: String(row.transaction_id),
      committedAt: new Date(row.committed_at as string).toISOString(),
    };
  }
}
