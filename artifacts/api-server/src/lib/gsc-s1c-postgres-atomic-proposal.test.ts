import assert from "node:assert/strict";
import test from "node:test";
import {
  GSC_S1C_SCHEMA_PROPOSAL, GSC_S1C_INSERT_PROPOSAL,
  GSC_S1C_CONSUME_PROPOSAL, GSC_S1C_REVIEW_STATE,
} from "./gsc-s1c-postgres-atomic-proposal.js";

const DDL = GSC_S1C_SCHEMA_PROPOSAL;
const ISSUE = GSC_S1C_INSERT_PROPOSAL;
const CONSUME = GSC_S1C_CONSUME_PROPOSAL;
const allSql = [DDL, ISSUE, CONSUME];
const syntheticParams = [1,2,3,4,5,6,7,8];

function placeholders(sql: string) {
  return [...new Set([...sql.matchAll(/\$(\d+)::(?:uuid|bytea)/gi)].map(m => Number(m[1])))]
    .sort((a,b) => a-b);
}

test("all proposed statements are isolated in a deliberately missing schema", () => {
  for (const sql of allSql) {
    assert.match(sql, /gsc_s1c_proposal_only\.gsc_state_transactions/);
    assert.doesNotMatch(sql, /\b(?:public\.connections|oauth_tokens|generic_google_accounts)\b/i);
  }
  assert.doesNotMatch(allSql.join("\n"), /(?:CREATE SCHEMA|DROP TABLE|ALTER TABLE|GRANT |REVOKE |TRUNCATE |DELETE FROM|SELECT \*)/i);
});

test("schema requires exact readonly GSC purpose, scope, and isolated provider", () => {
  assert.match(DDL, /purpose TEXT NOT NULL CHECK \(purpose = 'gsc_read_only_v1'\)/);
  assert.match(DDL, /scope TEXT NOT NULL CHECK \(scope = 'https:\/\/www\.googleapis\.com\/auth\/webmasters\.readonly'\)/);
  assert.match(DDL, /authorization_server TEXT NOT NULL CHECK \(authorization_server = 'google_gsc_oauth_v1'\)/);
  assert.doesNotMatch(DDL, /analytics\.readonly|webmasters'\)|GA4|legacy_google/i);
});

test("state digest uniqueness and fixed-length trusted binding digests are required", () => {
  assert.match(DDL, /state_digest BYTEA PRIMARY KEY CHECK \(octet_length\(state_digest\) = 32\)/);
  for (const key of ["session_digest","client_generation_digest","redirect_digest","pkce_challenge_digest"])
    assert.match(DDL, new RegExp(key + " BYTEA NOT NULL CHECK \\(octet_length\\(" + key + "\\) = 32\\)"));
  for (const id of ["organization_id","site_id","principal_id"])
    assert.match(DDL, new RegExp(id + " UUID NOT NULL"));
});

test("the bounded expiry is a DB timestamp, not supplied by a callback", () => {
  assert.match(DDL, /CHECK \(\s*expires_at > issued_at AND expires_at <= issued_at \+ INTERVAL '10 minutes'\s*\)/);
  assert.match(ISSUE, /statement_timestamp\(\), statement_timestamp\(\) \+ INTERVAL '10 minutes', NULL/);
  assert.doesNotMatch(ISSUE, /\$9|\bnowFromClient\b|Date\.now/);
});

test("state is inserted once and cannot silently reset an existing consumption record", () => {
  assert.match(ISSUE, /^INSERT INTO gsc_s1c_proposal_only\.gsc_state_transactions/m);
  assert.match(ISSUE, /ON CONFLICT \(state_digest\) DO NOTHING/);
  assert.doesNotMatch(ISSUE, /DO UPDATE|SET consumed_at = NULL|ON CONFLICT DO REPLACE/i);
  assert.match(ISSUE, /RETURNING 1 AS inserted/);
  assert.deepEqual(placeholders(ISSUE), syntheticParams);
});

test("single conditional update with durable-null guard, not read then write", () => {
  assert.match(CONSUME, /^\s*UPDATE gsc_s1c_proposal_only\.gsc_state_transactions/m);
  assert.equal((CONSUME.match(/\bUPDATE\b/g)??[]).length,1);
  assert.doesNotMatch(CONSUME, /\bSELECT\b|\bINSERT\b|\bDELETE\b/i);
  assert.match(CONSUME, /AND consumed_at IS NULL/);
  assert.match(CONSUME, /SET consumed_at = clock_timestamp\(\)/);
  assert.match(CONSUME, /RETURNING 1 AS consumed/);
  assert.deepEqual(placeholders(CONSUME), syntheticParams);
});

test("consumption restricts every trusted actor and generation binding", () => {
  for (const [field,index,type] of [
    ["state_digest",1,"bytea"],["organization_id",2,"uuid"],
    ["site_id",3,"uuid"],["principal_id",4,"uuid"],
    ["session_digest",5,"bytea"],["client_generation_digest",6,"bytea"],
    ["redirect_digest",7,"bytea"],["pkce_challenge_digest",8,"bytea"],
  ] as const)
    assert.ok(CONSUME.includes(field + " = $" + index + "::" + type), field);
  assert.match(CONSUME, /AND purpose = 'gsc_read_only_v1'/);
  assert.match(CONSUME, /AND authorization_server = 'google_gsc_oauth_v1'/);
  assert.match(CONSUME, /AND scope = 'https:\/\/www\.googleapis\.com\/auth\/webmasters\.readonly'/);
});

test("expiry is evaluated using database clock at consume, not a caller timestamp", () => {
  assert.match(CONSUME, /AND issued_at < clock_timestamp\(\)/);
  assert.match(CONSUME, /AND expires_at > clock_timestamp\(\)/);
  assert.doesNotMatch(CONSUME, /statement_timestamp\(\)|transaction_timestamp\(\)|CURRENT_TIMESTAMP|\$9/i);
});

test("no secret, verifier, token, authorization code or historical site UUID is embedded", () => {
  const sql = allSql.join("\n");
  assert.doesNotMatch(sql, /access_token|refresh_token|client_secret|code_verifier|authorization_code/i);
  assert.doesNotMatch(sql, /eb1da9ee-539c-4200-8f04-f64ccaea7768/i);
  assert.doesNotMatch(sql, /DATABASE_URL|GOOGLE_OAUTH_|GSC_OAUTH_CLIENT_SECRET/i);
});

test("proposal flags cannot be mistaken for actual database or OAuth certification", () => {
  assert.equal(GSC_S1C_REVIEW_STATE.kind, "offline_untrusted_sql_proposal_only");
  for (const key of [
    "schemaCreated", "migrationAuthorized", "databaseAccessAuthorized",
    "atomicityVerified", "recoveryVerified", "oauthEnabled",
    "tokenExchangeAuthorized", "credentialPersistenceAuthorized",
    "providerReadAuthorized",
  ] as const) assert.equal(GSC_S1C_REVIEW_STATE[key], false, key);
  assert.equal(Object.isFrozen(GSC_S1C_REVIEW_STATE), true);
});

test("no secret-like fields or harmful live execution commands are part of statements", () => {
  const sql = allSql.join("\n");
  assert.doesNotMatch(sql, /(?:pg_sleep|dblink|postgres_fdw|http_post|COPY\s|VACUUM|CREATE EXTENSION|pg_read_file|RAISE NOTICE)/i);
  assert.doesNotMatch(sql, /(?:GRANT\s+ALL|SECURITY DEFINER|BYPASSRLS)/i);
});
