import type postgres from "postgres";
import type { AuthPrincipal } from "./auth-foundation.js";

export const CVI_GSC_SERVER_SCOPE_RESOLVER_VERSION =
  "cvi-1c21-server-scope-resolver-v1" as const;

/** The acquisition ID is only a lookup key, never authorization. Membership,
 * selected connection, and current session must all match authenticated
 * server-owned identity in a single locked SQL statement. The caller must
 * NEVER obtain subject/session ID from request headers, body or URL query.
 *
 * This query requires dormant CVI migrations 0012-0016, is NOT mounted in a
 * live runtime, and returns only a historical scope candidate.
 */
export const CVI_GSC_SERVER_SCOPE_RESOLVER_SQL = [
 'SELECT a.tenant_id::text AS "tenantId",a.site_id::text AS "siteId",',
 'a.connection_id::text AS "connectionId"',
 'FROM cvi_acquisition_nonce_ledger a',
 'JOIN sites s ON s.id=a.site_id AND s.organization_id=a.tenant_id',
 'JOIN connections c ON c.id=a.connection_id AND c.site_id=s.id',
 'JOIN auth_sessions se ON se.id=a.auth_session_id AND se.subject=a.auth_subject',
 'JOIN cvi_organization_memberships m ON m.organization_id=a.tenant_id',
 'AND m.auth_subject=a.auth_subject',
 'JOIN cvi_site_read_grants g ON g.organization_membership_id=m.id',
 'AND g.organization_id=a.tenant_id AND g.site_id=a.site_id',
 'WHERE a.acquisition_id=$1 AND a.auth_subject=$2',
 'AND a.auth_session_id=$3::uuid',
 "AND a.disposition='recorded_untrusted'",
 'AND s.is_active=true AND c.status=\'connected\'',
 'AND c.provider=\'google\'',
 "AND 'https://www.googleapis.com/auth/webmasters.readonly'=ANY(c.scopes)",
 'AND se.revoked_at IS NULL AND se.expires_at>clock_timestamp()',
 "AND m.status='active' AND m.revoked_at IS NULL",
 'AND m.effective_at<=clock_timestamp()',
 'AND (m.expires_at IS NULL OR m.expires_at>clock_timestamp())',
 "AND g.permission='read_evidence' AND g.status='active'",
 'AND g.revoked_at IS NULL AND g.effective_at<=clock_timestamp()',
 'AND (g.expires_at IS NULL OR g.expires_at>clock_timestamp())',
 'LIMIT 2 FOR SHARE OF s,c,se,m,g',
].join(" ");
export type CviGscServerScope = Readonly<{
 tenantId:string;siteId:string;connectionId:string;
}>;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ID=/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\.\d{3}Z$/;
function instant(value:unknown):number|null {
 if(typeof value!=="string"||!ISO.test(value))return null;
 const ms=Date.parse(value);
 return Number.isFinite(ms)&&new Date(ms).toISOString()===value?ms:null;
}

/** Private, read-only candidate resolver. No session authentication is done
 * by this function. The principal MUST have come from protected server auth.
 * A returned scope does not permit future reads without a new DB ACL check.
 */
export function createCviGscServerScopeResolver(sql:postgres.Sql) {
 return async (input:Readonly<{
  acquisitionId:string;principal:AuthPrincipal;now:string;
 }>):Promise<CviGscServerScope|null>=>{
  const p=input?.principal;
  const checkedAt=instant(input?.now);
  const expires=instant(p?.expiresAt);
  if(!p||!ID.test(input.acquisitionId)||!ID.test(p.subject)||!UUID.test(p.sessionId)||
    checkedAt===null||expires===null||expires<=checkedAt)
   return null;
  const rows=await sql.unsafe<Record<string,unknown>[]>(
   CVI_GSC_SERVER_SCOPE_RESOLVER_SQL,[input.acquisitionId,p.subject,p.sessionId],
  );
  if(rows.length===0)return null;
  if(rows.length!==1)throw Error("cvi_1c21_ambiguous_scope");
  const row=rows[0]!;
  if(typeof row.tenantId!=="string"||!UUID.test(row.tenantId)||
    typeof row.siteId!=="string"||!UUID.test(row.siteId)||
    typeof row.connectionId!=="string"||!UUID.test(row.connectionId))
    throw Error("cvi_1c21_invalid_scope_row");
  return {tenantId:row.tenantId,siteId:row.siteId,connectionId:row.connectionId};
 };
}
