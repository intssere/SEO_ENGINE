/** PILOT-01 — PostgreSQL query candidates for independently reviewed disposable tests.
 * NEVER import these into production routes or execute without separate owner approval.
 * Table names are conceptual: pilot01_jobs / pilot01_grants / pilot01_audit.
 * Requires a separately reviewed schema, trusted bound parameters and explicit
 * transaction envelopes for each claim/commit/revoke/consume+audit pair.
 * These text fixtures are NOT a database adapter or evidence of isolation safety.
 */
export const PILOT01_PG_QUERY_CANDIDATES = Object.freeze({
  claim: `
UPDATE pilot01_jobs SET
 status = 'active', owner_id = $4,
 generation = generation + 1,
 lease_until = clock_timestamp() + ($5::int * interval '1 millisecond')
WHERE job_id = $1 AND tenant_id = $2 AND site_id = $3
 AND (status = 'pending' OR (status = 'active' AND lease_until <= clock_timestamp()))
 AND $5::int > 0
RETURNING job_id, tenant_id, site_id, owner_id, generation, lease_until`,
  renew: `
UPDATE pilot01_jobs SET lease_until = clock_timestamp() + ($6::int * interval '1 millisecond')
WHERE job_id = $1 AND tenant_id = $2 AND site_id = $3
 AND owner_id = $4 AND generation = $5::bigint
 AND status = 'active' AND lease_until > clock_timestamp()
 AND $6::int > 0
RETURNING job_id, generation, lease_until`,
  complete: `
UPDATE pilot01_jobs SET status = 'completed', result_digest = $6, updated_at = clock_timestamp()
WHERE job_id = $1 AND tenant_id = $2 AND site_id = $3
 AND owner_id = $4 AND generation = $5::bigint
 AND status = 'active' AND lease_until > clock_timestamp()
 AND $6 <> ''
RETURNING job_id, generation, result_digest`,
  consumeGrant: `
UPDATE pilot01_grants SET state = 'consumed', consumed_at = clock_timestamp()
WHERE grant_id = $1 AND tenant_id = $2 AND site_id = $3 AND actor_id = $4
 AND operation = $5 AND state = 'issued' AND expires_at > clock_timestamp()
 AND ($5 <> 'site_write' OR (diff_hash IS NOT NULL AND diff_hash = $6 AND $6 IS NOT NULL))
RETURNING grant_id, operation`,
  revokeGrant: `
UPDATE pilot01_grants SET state = 'revoked', revoked_at = clock_timestamp()
WHERE grant_id = $1 AND tenant_id = $2 AND site_id = $3
 AND state = 'issued'
RETURNING grant_id`,
});
/** All successful state changes MUST be followed by an append-only audit insert
 * within the SAME transaction. The caller must ROLLBACK if no row returns or
 * the audit insert fails; this fixture intentionally cannot run any transaction.
 * Client-supplied actor/site/tenant values must not be trusted authentication.
 */
