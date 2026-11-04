/**
 * PILOT-01 RT01-A11.1 — DISCONNECTED, MOCK-BACKED authorization boundary.
 *
 * This model can compare a server-supplied authenticated principal against
 * separately injected session, membership, site and issuer evidence.
 * No HTTP handlers, DB connections, migrations, worker dispatch, providers,
 * operational flags or live session store are implemented or invoked here.
 *
 * A principal object passed by an arbitrary caller is not cryptographic proof
 * of authentication. Only a future independently reviewed server-owned
 * adapter may construct it from an actually enforced session.
 */
import type { AuthPrincipal } from "./auth-foundation.js";
import {
  resolveTrustedPilotContext, type PilotTrustedEvidencePorts,
  type PilotTrustedContextResult,
} from "./pilot-01-trusted-site-context.js";
import type { ReadOnlyPilotOperation } from "./pilot-01-trusted-grant-contract.js";

export type PilotRuntimeBoundaryCandidate = Readonly<{
  /** Strictly from the server's verified auth session, never req.body/query. */
  principal: Readonly<Pick<AuthPrincipal, "sessionId" | "subject" | "role" | "expiresAt">> | null;
  /** Must describe an actively enforcing middleware, not a desired mode. */
  authEnforced: boolean;
  /** Candidate identifiers are lookup keys, NOT proof of site/issuer authority. */
  intent: Readonly<{ siteId: string; issuerId: string; operation: ReadOnlyPilotOperation }>;
}>;
const valid = (v:unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.trim() === v;

/**
 * Rejects disabled auth before any source lookup. Correlates the supplied
 * server principal to an independently sourced live session by subject,
 * session ID, role and expiry; the existing verifier then checks membership,
 * site, issuer, expiry and operation. This is only source-level modeling.
 */
export async function rehearseAuthenticatedPilotBoundary(
  input: PilotRuntimeBoundaryCandidate,
  ports: PilotTrustedEvidencePorts,
): Promise<PilotTrustedContextResult> {
  if (!input || input.authEnforced !== true || !input.principal ||
      !valid(input.principal.sessionId) || !valid(input.principal.subject) ||
      !valid(input.principal.expiresAt) ||
      (input.principal.role !== "admin" && input.principal.role !== "operator"))
    return { status: "denied" };
  const trustedPrincipal = Object.freeze({ ...input.principal });
  const originalResolve = ports.session.resolve.bind(ports.session);
  return resolveTrustedPilotContext(input.intent, {
    ...ports,
    session: {
      async resolve() {
        const session = await originalResolve();
        if (!session || session.sessionId !== trustedPrincipal.sessionId ||
            session.subject !== trustedPrincipal.subject ||
            session.role !== trustedPrincipal.role ||
            session.expiresAt !== trustedPrincipal.expiresAt)
          return null;
        return session;
      },
    },
  });
}
