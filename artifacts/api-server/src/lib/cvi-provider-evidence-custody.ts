import { createHash } from "node:crypto";
import type { UniversalConnectionIdentity, UniversalSiteIdentity } from "./universal-site-resource-identity.js";

export const CVI_PROVIDER_EVIDENCE_CUSTODY_VERSION = "cvi-1b4n-provider-evidence-custody-v1" as const;

export type CviProviderCustodyEnvelope = Readonly<{
  tenantId: string;
  siteId: string;
  siteIdentityFingerprint: string;
  connectionId: string;
  connectionIdentityFingerprint: string;
  provider: "google" | "shopify";
  principalSubject: string;
  authSessionId: string;
  acquisitionId: string;
  requestNonce: string;
  requestedAt: string;
  observedAt: string;
  requestedResource: string;
  observationFingerprint: string;
  observationStatus: "accepted" | "rejected" | "uncertain";
  transportOrigin: "server";
}>;

export type CviProviderCustodyReview = Readonly<{
  version: typeof CVI_PROVIDER_EVIDENCE_CUSTODY_VERSION;
  outcome: "DENY" | "PENDING_TRUSTED_CUSTODY_AND_REPLAY_CERTIFICATION";
  reasons: readonly string[];
  envelopeFingerprint: string;
  independentlyAuthenticated: false;
  replayIndependentlyChecked: false;
  authorizationGranted: false;
  executionAuthorized: false;
  publicationAuthorized: false;
}>;

const ID = /^[a-zA-Z0-9][a-zA-Z0-9._:@/-]{0,255}$/;
const HEX = /^[a-f0-9]{64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function validInstant(value: string): number {
  if (typeof value !== "string" || !ISO.test(value)) throw new Error("cvi_1b4n_invalid_time");
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value)
    throw new Error("cvi_1b4n_invalid_time");
  return ms;
}
function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort().map(k => JSON.stringify(k) + ":" + stable(object[k])).join(",") + "}";
}
function digest(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex");
}

/** Advisory review of a declared evidence custody envelope.
 * A hash is not a signature, and transportOrigin='server' is caller-spoofable.
 * Only authenticated private transport, first-party persisted nonce/replay
 * state, and independently checked tenant membership can establish custody.
 * No outcome from this function is an access capability.
 */
export function reviewCviProviderEvidenceCustody(input: Readonly<{
  envelope: CviProviderCustodyEnvelope;
  site: UniversalSiteIdentity;
  connection: UniversalConnectionIdentity;
  expectedTenantId: string;
  expectedPrincipalSubject: string;
  expectedAuthSessionId: string;
  expectedResource: string;
  evaluatedAt: string;
  maxObservationAgeSeconds: number;
  maxRequestDurationSeconds: number;
}>): CviProviderCustodyReview {
  const now = validInstant(input.evaluatedAt);
  const e = input.envelope;
  const requested = validInstant(e.requestedAt);
  const observed = validInstant(e.observedAt);
  if (!Number.isSafeInteger(input.maxObservationAgeSeconds) ||
    input.maxObservationAgeSeconds < 1 || input.maxObservationAgeSeconds > 3600 ||
    !Number.isSafeInteger(input.maxRequestDurationSeconds) ||
    input.maxRequestDurationSeconds < 1 || input.maxRequestDurationSeconds > 60)
    throw new Error("cvi_1b4n_invalid_freshness_policy");

  const reasons: string[] = [];
  for (const value of [
    e.tenantId, e.siteId, e.connectionId, e.principalSubject, e.authSessionId,
    e.acquisitionId, e.requestNonce, input.expectedTenantId,
    input.expectedPrincipalSubject, input.expectedAuthSessionId,
  ]) if (typeof value !== "string" || !ID.test(value)) reasons.push("identity_malformed");
  if (!HEX.test(e.siteIdentityFingerprint) ||
    !HEX.test(e.connectionIdentityFingerprint) || !HEX.test(e.observationFingerprint))
    reasons.push("fingerprint_malformed");
  if (e.tenantId !== input.expectedTenantId ||
    e.principalSubject !== input.expectedPrincipalSubject ||
    e.authSessionId !== input.expectedAuthSessionId) reasons.push("tenant_principal_session_mismatch");

  if (e.siteId !== input.site.siteId ||
    e.siteIdentityFingerprint !== input.site.siteIdentityFingerprint ||
    e.connectionId !== input.connection.connectionId ||
    e.connectionIdentityFingerprint !== input.connection.connectionIdentityFingerprint ||
    e.siteId !== input.connection.siteId ||
    e.siteIdentityFingerprint !== input.connection.siteIdentityFingerprint ||
    e.provider !== input.connection.provider) reasons.push("site_connection_identity_mismatch");
  if (e.requestedResource !== input.expectedResource ||
    !e.requestedResource || e.requestedResource.length > 2048)
    reasons.push("resource_mismatch");

  if (e.observationStatus !== "accepted") reasons.push("observation_not_accepted");
  if (e.transportOrigin !== "server") reasons.push("origin_not_declared_server");
  if (requested > observed || observed > now ||
    observed - requested > input.maxRequestDurationSeconds * 1000 ||
    now - observed > input.maxObservationAgeSeconds * 1000)
    reasons.push("freshness_or_duration_invalid");

  const envelopeFingerprint = digest({
    purpose: CVI_PROVIDER_EVIDENCE_CUSTODY_VERSION, envelope: e,
    site: input.site.siteIdentityFingerprint,
    connection: input.connection.connectionIdentityFingerprint,
  });
  return {
    version: CVI_PROVIDER_EVIDENCE_CUSTODY_VERSION,
    outcome: reasons.length ? "DENY" : "PENDING_TRUSTED_CUSTODY_AND_REPLAY_CERTIFICATION",
    reasons: [...new Set(reasons)].sort(),
    envelopeFingerprint,
    independentlyAuthenticated: false,
    replayIndependentlyChecked: false,
    authorizationGranted: false,
    executionAuthorized: false,
    publicationAuthorized: false,
  };
}
