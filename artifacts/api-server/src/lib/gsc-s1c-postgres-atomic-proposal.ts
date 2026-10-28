/**
 * GSC-02 S1C — POSTGRESQL SQL DESIGN ARTIFACTS ONLY.
 *
 * Never import these into routes, workers, migration runners, or the active DB
 * client. The gsc_s1c_proposal_only schema is intentionally NOT created.
 * These strings are NOT approved migrations, executable Production queries,
 * or evidence of database-enforced atomicity. No DB access occurs here.
 *
 * Exact site/organization/principal/client/redirect/PKCE binding values MUST
 * originate from a separately certified trusted server boundary, not from the
 * callback, cookies, caller-provided hashes, or our S0/S1 simulations.
 *
 * Future review must independently prove real PostgreSQL row-lock/recheck
 * behavior, grants, ledger identity, retention, recovery, isolation, RLS and
 * exact deployed client generation before any execution authority is granted.
 */
export const GSC_S1C_SCHEMA_PROPOSAL = String.raw`
-- NOT A MIGRATION. Requires a separately authorized, schema-qualified design.
-- Schema gsc_s1c_proposal_only is intentionally absent from the repository.
CREATE TABLE gsc_s1c_proposal_only.gsc_state_transactions (
  state_digest BYTEA PRIMARY KEY CHECK (octet_length(state_digest) = 32),
  purpose TEXT NOT NULL CHECK (purpose = 'gsc_read_only_v1'),
  scope TEXT NOT NULL CHECK (scope = 'https://www.googleapis.com/auth/webmasters.readonly'),
  authorization_server TEXT NOT NULL CHECK (authorization_server = 'google_gsc_oauth_v1'),
  organization_id UUID NOT NULL,
  site_id UUID NOT NULL,
  principal_id UUID NOT NULL,
  session_digest BYTEA NOT NULL CHECK (octet_length(session_digest) = 32),
  client_generation_digest BYTEA NOT NULL CHECK (octet_length(client_generation_digest) = 32),
  redirect_digest BYTEA NOT NULL CHECK (octet_length(redirect_digest) = 32),
  pkce_challenge_digest BYTEA NOT NULL CHECK (octet_length(pkce_challenge_digest) = 32),
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  CONSTRAINT gsc_s1c_bounded_ttl CHECK (
    expires_at > issued_at AND expires_at <= issued_at + INTERVAL '10 minutes'
  )
);
`;

/**
 * Proposed bind-order contract:
 * $1 state_digest (SHA-256 over server-issued unpredictable OAuth state bytes)
 * $2 organization_id (trusted UUID), $3 site_id (trusted UUID)
 * $4 principal_id (trusted UUID), $5 session_digest (trusted, 32 bytes)
 * $6 client_generation_digest (trusted, 32 bytes)
 * $7 redirect_digest (trusted, 32 bytes)
 * $8 pkce_challenge_digest (trusted, 32 bytes)
 *
 * A future issuer must also securely handle state entropy and PKCE verifier
 * custody; these fields are only digests and cannot serve as verifier storage.
 * DB-owned time avoids caller-supplied expiry, though this is only a proposal.
 */
export const GSC_S1C_INSERT_PROPOSAL = String.raw`
INSERT INTO gsc_s1c_proposal_only.gsc_state_transactions (
  state_digest, purpose, scope, authorization_server,
  organization_id, site_id, principal_id, session_digest,
  client_generation_digest, redirect_digest, pkce_challenge_digest,
  issued_at, expires_at, consumed_at
)
VALUES (
  $1::bytea, 'gsc_read_only_v1',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'google_gsc_oauth_v1', $2::uuid, $3::uuid, $4::uuid, $5::bytea,
  $6::bytea, $7::bytea, $8::bytea,
  statement_timestamp(), statement_timestamp() + INTERVAL '10 minutes', NULL
)
ON CONFLICT (state_digest) DO NOTHING
RETURNING 1 AS inserted;
`;

/**
 * Proposed bind-order contract:
 * $1 state_digest; $2 org UUID; $3 site UUID; $4 principal UUID;
 * $5 session digest; $6 client generation digest; $7 redirect digest;
 * $8 PKCE challenge digest.
 *
 * This ONE conditional UPDATE is essential: a separate SELECT then UPDATE
 * would be race-prone. clock_timestamp() is evaluated after any row-lock wait
 * during qualification rather than using a stale caller timestamp. Actual
 * PostgreSQL concurrency semantics still require disposable DB certification.
 *
 * Zero returned rows is an indistinguishable negative result externally:
 * do not reveal whether the state was missing, used, expired or mismatched.
 */
export const GSC_S1C_CONSUME_PROPOSAL = String.raw`
UPDATE gsc_s1c_proposal_only.gsc_state_transactions
SET consumed_at = clock_timestamp()
WHERE state_digest = $1::bytea
  AND purpose = 'gsc_read_only_v1'
  AND scope = 'https://www.googleapis.com/auth/webmasters.readonly'
  AND authorization_server = 'google_gsc_oauth_v1'
  AND organization_id = $2::uuid
  AND site_id = $3::uuid
  AND principal_id = $4::uuid
  AND session_digest = $5::bytea
  AND client_generation_digest = $6::bytea
  AND redirect_digest = $7::bytea
  AND pkce_challenge_digest = $8::bytea
  AND consumed_at IS NULL
  AND issued_at < clock_timestamp()
  AND expires_at > clock_timestamp()
RETURNING 1 AS consumed;
`;

/** Non-executable review metadata; no permission or runtime authorization. */
export const GSC_S1C_REVIEW_STATE = Object.freeze({
  kind: "offline_untrusted_sql_proposal_only" as const,
  schemaCreated: false as const,
  migrationAuthorized: false as const,
  databaseAccessAuthorized: false as const,
  atomicityVerified: false as const,
  recoveryVerified: false as const,
  oauthEnabled: false as const,
  tokenExchangeAuthorized: false as const,
  credentialPersistenceAuthorized: false as const,
  providerReadAuthorized: false as const,
});
