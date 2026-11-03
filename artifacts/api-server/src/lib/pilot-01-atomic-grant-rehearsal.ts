/**
 * RT01-A2 synthetic transactional grant-replay rehearsal.
 *
 * NO PostgreSQL, network, routes, live sessions, worker launch or provider I/O.
 * Process-local fixture ONLY. Serial execution in a single JS event loop is not
 * evidence of multi-process concurrency or durable grant consumption.
 * It models the conditional grant-state + immutable receipt atomicity obligation.
 */
import { evaluatePilotGrant, type PilotRequest, type ScopedGrant } from "./pilot-01-scoped-grant-model.js";

export type RehearsalGrant = Readonly<ScopedGrant & { grantId: string; issuer: string }>;
export type RehearsalReceipt = Readonly<{
  sequence: number;
  grantId: string;
  kind: "consumed" | "revoked";
  actorId: string;
  tenantId: string;
  siteId: string;
}>;
export type RehearsalResult = "consumed" | "revoked" | "denied" | "unavailable";
type Entry = { grant: RehearsalGrant; status: "active" | "consumed" | "revoked" };

const valid = (v: string): boolean => typeof v === "string" && v.length > 0 && v === v.trim();
const clone = <T>(value: T): T => Object.freeze({ ...value });

export class SyntheticAtomicGrantLedger {
  private readonly entries = new Map<string, Entry>();
  private readonly receipts: RehearsalReceipt[] = [];
  private rejectNextReceipt = false;

  register(grant: RehearsalGrant): boolean {
    if (!valid(grant.grantId) || !valid(grant.issuer) ||
      !valid(grant.actorId) || !valid(grant.tenantId) || !valid(grant.siteId) ||
      !valid(grant.nonce) || !Number.isFinite(grant.expiresAtMs) ||
      !["analyze", "recommend"].includes(grant.operation) ||
      this.entries.has(grant.grantId)) return false;
    this.entries.set(grant.grantId, { grant: clone(grant), status: "active" });
    return true;
  }

  /** Fixture fault injection: the next successful transition's audit insert fails. */
  failNextReceipt(): void { this.rejectNextReceipt = true; }

  private transition(id: string, next: "consumed" | "revoked", actorId: string): RehearsalResult {
    const entry = this.entries.get(id);
    if (!entry || entry.status !== "active") return "denied";
    if (this.rejectNextReceipt) {
      this.rejectNextReceipt = false;
      return "unavailable"; // atomic rollback: neither state nor receipt changes
    }
    const receipt = clone({
      sequence: this.receipts.length + 1,
      grantId: id,
      kind: next,
      actorId,
      tenantId: entry.grant.tenantId,
      siteId: entry.grant.siteId,
    });
    entry.status = next;
    this.receipts.push(receipt);
    return next;
  }

  /**
   * All identity fields must be trusted by an eventual adapter. Here they are
   * synthetic test inputs and must not be accepted from an HTTP caller.
   */
  consume(grantId: string, request: PilotRequest, nowMs: number): RehearsalResult {
    const entry = this.entries.get(grantId);
    if (!entry || entry.status !== "active" ||
      !valid(request.actorId) || !valid(request.tenantId) || !valid(request.siteId) ||
      !Number.isFinite(nowMs) || !["analyze", "recommend"].includes(request.operation) ||
      evaluatePilotGrant(entry.grant, request, nowMs) !== "matched") return "denied";
    return this.transition(grantId, "consumed", request.actorId);
  }

  revoke(grantId: string, scope: Readonly<{ tenantId: string; siteId: string; actorId: string }>): RehearsalResult {
    const entry = this.entries.get(grantId);
    if (!entry || !valid(scope.actorId) ||
      !valid(scope.tenantId) || !valid(scope.siteId) ||
      entry.grant.actorId !== scope.actorId ||
      entry.grant.tenantId !== scope.tenantId ||
      entry.grant.siteId !== scope.siteId) return "denied";
    return this.transition(grantId, "revoked", scope.actorId);
  }

  status(grantId: string): "active" | "consumed" | "revoked" | "missing" {
    return this.entries.get(grantId)?.status ?? "missing";
  }
  auditSnapshot(): readonly RehearsalReceipt[] {
    return Object.freeze(this.receipts.map(receipt => clone(receipt)));
  }
}
