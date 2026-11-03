/**
 * PILOT-01 RT01-A1: source-only default-deny admission rehearsal.
 *
 * NOT a live authorization endpoint. This module does not authenticate callers,
 * verify database grant custody, acquire a lease, enqueue work, or dispatch an
 * external operation. Do not wire to routes, startup, workers or providers.
 * The caller must someday supply a separately verified principal and durable
 * grant consumer. A result of "admitted_for_rehearsal" is never execution authority.
 */
import {
  evaluatePilotGrant,
  type PilotRequest,
  type ScopedGrant,
} from "./pilot-01-scoped-grant-model.js";

export type TrustedPilotPrincipal = Readonly<{
  actorId: string;
  tenantId: string;
  siteId: string;
  // A marker for synthetic validation, NOT proof of server authentication.
  sessionVerified: boolean;
  role: "viewer" | "analyst" | "admin";
}>;

export type PilotAdmissionInput = Readonly<{
  principal: TrustedPilotPrincipal | null;
  authEnforced: boolean;
  siteVerified: boolean;
  runGateEnabled: boolean;
  publicSiteWritesEnabled: boolean;
  aiProposalGenerationEnabled: boolean;
  operation: "analyze" | "recommend";
  grant: ScopedGrant | null;
  nowMs: number;
}>;

export type PilotAdmissionOutcome =
  | "admitted_for_rehearsal"
  | "denied"
  | "unavailable";

export interface SyntheticGrantConsumer {
  /** Disposable mock only; never use an in-memory result as durable authority. */
  consume(grant: ScopedGrant, request: PilotRequest, nowMs: number): Promise<boolean>;
}

function nonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}

/** Pure preflight. It cannot authorize a production pilot by itself. */
export function checkPilotAdmission(input: PilotAdmissionInput): "matched" | "denied" {
  const p = input.principal;
  if (
    !input.authEnforced ||
    !input.siteVerified ||
    !input.runGateEnabled ||
    input.publicSiteWritesEnabled ||
    input.aiProposalGenerationEnabled ||
    !p?.sessionVerified ||
    !nonEmpty(p.actorId) ||
    !nonEmpty(p.tenantId) ||
    !nonEmpty(p.siteId) ||
    !Number.isFinite(input.nowMs) ||
    (p.role !== "analyst" && p.role !== "admin") ||
    (input.operation !== "analyze" && input.operation !== "recommend")
  ) return "denied";

  const request: PilotRequest = {
    actorId: p.actorId,
    tenantId: p.tenantId,
    siteId: p.siteId,
    operation: input.operation,
  };
  return evaluatePilotGrant(input.grant, request, input.nowMs);
}

/**
 * Synthetic consent consumption with no queue or dispatch callback.
 * Failure, exception and ambiguous consumer response deny by default.
 */
export async function rehearsePilotAdmission(
  input: PilotAdmissionInput,
  consumer: SyntheticGrantConsumer,
): Promise<PilotAdmissionOutcome> {
  if (checkPilotAdmission(input) !== "matched") return "denied";
  const principal = input.principal!;
  const grant = input.grant!;
  try {
    const consumed = await consumer.consume(grant, {
      actorId: principal.actorId,
      tenantId: principal.tenantId,
      siteId: principal.siteId,
      operation: input.operation,
    }, input.nowMs);
    return consumed === true ? "admitted_for_rehearsal" : "denied";
  } catch {
    return "unavailable";
  }
}
