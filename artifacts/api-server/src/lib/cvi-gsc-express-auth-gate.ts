import type { Request } from "express";
import { loadAuthConfig, type AuthPrincipal, type AuthConfig } from "./auth-foundation.js";
import {
  createCviServerPrincipalReadback,
  type CviServerAuthenticatedReadbackDependencies,
} from "./cvi-gsc-server-principal-readback.js";

/** CVI-1C.20 is a dedicated private preflight, NOT an HTTP route.
 * It MUST NOT inherit the generic application's optional auth bypass.
 * Caller must run attachAuthSession first and must never populate req.auth
 * using headers, body, query, JWT decoding in this boundary, or a mock in production.
 */
export const CVI_GSC_EXPRESS_AUTH_GATE_VERSION =
  "cvi-1c20-express-auth-gate-v1" as const;
export type CviCviAuthGateResult =
  | Readonly<{status:"DENY";reason:string;principal:null}>
  | Readonly<{status:"AUTH_CONTEXT_PRESENT_REVIEW_ONLY";reason:null;principal:AuthPrincipal}>;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function canonicalTime(value:unknown):number|null {
  if(typeof value!=="string"||!ISO.test(value))return null;
  const ms=Date.parse(value);
  return Number.isFinite(ms)&&new Date(ms).toISOString()===value?ms:null;
}
export function reviewCviExpressAuthenticatedPrincipal(input:Readonly<{
  req:Pick<Request,"auth">;
  config:Pick<AuthConfig,"enabled"|"configured">;
  evaluatedAt:string;
}>):CviCviAuthGateResult {
  if(input.config.enabled!==true||input.config.configured!==true)
    return {status:"DENY",reason:"cvi_auth_must_be_enabled_and_configured",principal:null};
  const principal=input.req.auth;
  const now=canonicalTime(input.evaluatedAt);
  if(!principal||now===null||!UUID.test(principal.sessionId)||
    typeof principal.subject!=="string"||!principal.subject.trim()||
    !["viewer","operator","admin"].includes(principal.role)||
    typeof principal.email!=="string"||!principal.email.trim())
    return {status:"DENY",reason:"cvi_verified_principal_missing_or_malformed",principal:null};
  const issued=canonicalTime(principal.issuedAt);
  const seen=canonicalTime(principal.lastSeenAt);
  const expires=canonicalTime(principal.expiresAt);
  if(issued===null||seen===null||expires===null||
    issued>seen||seen>now||expires<=now||expires<=issued)
    return {status:"DENY",reason:"cvi_principal_not_current",principal:null};
  return {status:"AUTH_CONTEXT_PRESENT_REVIEW_ONLY",reason:null,principal};
}
/** Offline private dependency bridge:
 * - Does not add a route or bypass middleware.
 * - Session is obtained only from req.auth after attachAuthSession.
 * - Explicit auth enforcement check is required even if app allows auth-disabled mode.
 * - Site/connection resolver is a separate trusted server dependency.
 * - This does not prove the resolver is trustworthy or authorize publication.
 */
export function bindCviPrincipalReadbackToExpressRequest(input:Readonly<{
  req:Pick<Request,"auth">;
  config?:Pick<AuthConfig,"enabled"|"configured">;
  now:()=>string;
  resolveServerSiteConnection:CviServerAuthenticatedReadbackDependencies["getServerBoundSiteConnection"];
  store:CviServerAuthenticatedReadbackDependencies["store"];
}>) {
  return createCviServerPrincipalReadback({
    getAuthenticatedPrincipal:async()=>{
      let at:string;
      try{at=input.now();}catch{return null;}
      const gate=reviewCviExpressAuthenticatedPrincipal({
        req:input.req,config:input.config??loadAuthConfig(),evaluatedAt:at,
      });
      return gate.status==="AUTH_CONTEXT_PRESENT_REVIEW_ONLY"?gate.principal:null;
    },
    getServerBoundSiteConnection:input.resolveServerSiteConnection,
    store:input.store,
    now:input.now,
  });
}
