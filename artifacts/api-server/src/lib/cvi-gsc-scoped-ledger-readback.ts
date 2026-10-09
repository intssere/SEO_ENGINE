import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import {
  CVI_GSC_ACQUISITION_LINEAGE_VERSION,
  type CviGscAcquisitionLineage,
} from "./cvi-gsc-acquisition-lineage.js";
import type { CviGscLedgerRow } from "./cvi-gsc-ledger-receipt-readback.js";

export const CVI_GSC_SCOPED_READBACK_VERSION = "cvi-1c16-scoped-ledger-readback-v1" as const;

/** PostgreSQL READ COMMITTED single-statement current-authorization guard.
 * Tenant, session, site, connection and subject are supplied by trusted
 * server-side authentication, NEVER copied from an HTTP request.
 * FOR SHARE serializes the selected authorization rows with UPDATE/revoke.
 * A row is merely historical evidence of a nonce admission, not a capability.
 */
export const CVI_GSC_SCOPED_READBACK_SQL = [
  'SELECT a.acquisition_id AS "acquisitionId",a.tenant_id::text AS "tenantId",',
  'a.site_id::text AS "siteId",a.connection_id::text AS "connectionId",',
  'a.auth_subject AS "authSubject",a.auth_session_id::text AS "authSessionId",',
  'a.request_nonce AS "requestNonce",a.requested_resource AS "requestedResource",',
  'a.observation_fingerprint AS "observationFingerprint",a.disposition',
  'FROM cvi_acquisition_nonce_ledger a',
  'JOIN sites s ON s.id=a.site_id AND s.organization_id=a.tenant_id',
  'JOIN connections c ON c.id=a.connection_id AND c.site_id=s.id',
  'JOIN auth_sessions se ON se.id=a.auth_session_id AND se.subject=a.auth_subject',
  'JOIN cvi_organization_memberships m ON m.organization_id=a.tenant_id',
  'AND m.auth_subject=a.auth_subject',
  'JOIN cvi_site_read_grants g ON g.organization_membership_id=m.id',
  'AND g.organization_id=a.tenant_id AND g.site_id=a.site_id',
  'WHERE a.acquisition_id=$1 AND a.tenant_id=$2::uuid',
  'AND a.site_id=$3::uuid AND a.connection_id=$4::uuid',
  'AND a.auth_subject=$5 AND a.auth_session_id=$6::uuid',
  'AND a.disposition=\'recorded_untrusted\'',
  'AND s.is_active=true AND c.status=\'connected\'',
  'AND ((c.provider=\'google\' AND',
  '\'https://www.googleapis.com/auth/webmasters.readonly\'=ANY(c.scopes))',
  'OR (c.provider=\'shopify\' AND \'read_content\'=ANY(c.scopes)))',
  'AND se.revoked_at IS NULL AND se.expires_at>clock_timestamp()',
  'AND m.status=\'active\' AND m.revoked_at IS NULL',
  'AND m.effective_at<=clock_timestamp()',
  'AND (m.expires_at IS NULL OR m.expires_at>clock_timestamp())',
  'AND g.permission=\'read_evidence\' AND g.status=\'active\'',
  'AND g.revoked_at IS NULL AND g.effective_at<=clock_timestamp()',
  'AND (g.expires_at IS NULL OR g.expires_at>clock_timestamp())',
  'FOR SHARE OF s,c,se,m,g LIMIT 2',
].join(" ");

export interface CviScopedReadbackStore {
  /** Implement ONLY in trusted server process with parameterized SQL above.
   * Must return null on no visible row, and error on ambiguous/multiple rows.
   */
  fetchScoped(input: Readonly<{
    acquisitionId: string;
    tenantId: string;
    siteId: string;
    connectionId: string;
    authSubject: string;
    authSessionId: string;
  }>): Promise<CviGscLedgerRow | null>;
}
export type CviGscScopedReadbackResult = Readonly<{
  version: typeof CVI_GSC_SCOPED_READBACK_VERSION;
  status: "DENY" | "SCOPED_HISTORICAL_REVIEW_ONLY";
  reasons: readonly string[];
  acquisitionId: string;
  scopedHistoricalRowMatched: boolean;
  providerOriginAuthenticated: false;
  currentAuthorizationForLaterOperations: false;
  sourceFactsVerified: false;
  executionAuthorized: false;
  publicationAuthorized: false;
  resultFingerprint: string;
}>;

const ID=/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;
export async function reconcileCviGscScopedReadback(input: Readonly<{
  lineage: CviGscAcquisitionLineage;
  authenticated: Readonly<{
    acquisitionId: string;
    tenantId: string;
    siteId: string;
    connectionId: string;
    authSubject: string;
    authSessionId: string;
  }>;
  store: CviScopedReadbackStore;
}>): Promise<CviGscScopedReadbackResult> {
  const reasons:string[]=[];
  const l=input.lineage,a=input.authenticated;
  if (!a || Object.values(a).some(v=>typeof v!=="string"||!ID.test(v)))
    reasons.push("authenticated_scope_invalid");
  if (!l || l.version!==CVI_GSC_ACQUISITION_LINEAGE_VERSION ||
      l.status!=="UNTRUSTED_CAPTURE_REVIEW_ONLY" ||
      !Array.isArray(l.reasons)||l.reasons.length!==0 ||
      l.requestIdentityConsistent!==true ||
      l.independentProviderOriginVerified!==false ||
      l.independentOAuthCustodyVerified!==false ||
      l.durableReplayVerified!==false ||
      l.executionAuthorized!==false || l.publicationAuthorized!==false)
    reasons.push("lineage_unsafe");
  if (!l || !a || l.acquisitionId!==a.acquisitionId || l.tenantId!==a.tenantId ||
      l.siteId!==a.siteId || l.connectionId!==a.connectionId ||
      l.authSubject!==a.authSubject || l.authSessionId!==a.authSessionId)
    reasons.push("lineage_authenticated_scope_mismatch");
  let row:CviGscLedgerRow|null=null;
  if(!reasons.length) {
    try {row=await input.store.fetchScoped(a);}
    catch {reasons.push("scoped_readback_failed");}
  }
  if (!reasons.length && (!row ||
      row.acquisitionId!==a.acquisitionId ||
      row.tenantId!==a.tenantId || row.siteId!==a.siteId ||
      row.connectionId!==a.connectionId || row.authSubject!==a.authSubject ||
      row.authSessionId!==a.authSessionId ||
      row.requestNonce!==l.requestNonce ||
      row.requestedResource!==l.requestedResource ||
      row.observationFingerprint!==l.observationFingerprint ||
      row.disposition!=="recorded_untrusted"))
    reasons.push("scoped_tombstone_missing_or_mismatched");
  const unique=[...new Set(reasons)].sort();
  const base={
    version:CVI_GSC_SCOPED_READBACK_VERSION,
    status:unique.length?"DENY" as const:"SCOPED_HISTORICAL_REVIEW_ONLY" as const,
    reasons:unique,acquisitionId:a?.acquisitionId??"",
    scopedHistoricalRowMatched:unique.length===0,
    providerOriginAuthenticated:false as const,
    currentAuthorizationForLaterOperations:false as const,
    sourceFactsVerified:false as const,
    executionAuthorized:false as const,
    publicationAuthorized:false as const,
  };
  return {...base,resultFingerprint:stableEvidenceHash({
    purpose:CVI_GSC_SCOPED_READBACK_VERSION,...base,
  })};
}
