import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const EXPECTED_ENVIRONMENT = "86150bfb-2149-4c69-ba71-e9488c81c1e3";
const EXPECTED_PROJECT = "52265e29-921b-4652-ac0d-9da4e5e69936";
const EXPECTED_DB_SERVICE = "6e58c3f2-0a14-4cca-b3ac-b93c1e82e937";
const EXPECTED_DB_NAME = "railway";
const FILENAMES = [
  "0001_core.sql",
  "0002_auth.sql",
  "0003_observation_evidence_schema.sql",
  "0004_first_party_crawl_execution_state.sql",
  "0005_p8_8_policy_mutation_reservations.sql",
  "0006_p8_8_policy_mutation_controls.sql",
  "0007_p8_8_policy_mutation_dispatch.sql",
  "0008_first_party_crawl_l2_invocations.sql",
  "0009_first_party_crawl_l2_bounded_pilot_phase.sql",
  "0010_first_party_crawl_terminal_failure_recovery.sql",
  "0011_first_party_crawl_expected_absence_disposition.sql",
];
const COUNTS = [29,31,34,37,38,41,43,44,44,47,49];
const fail = (message) => { throw new Error(message); };
const token = process.env.STAGE03D02A_AUTHORIZATION;
if (token !== "AUTHORIZE-STAGE-03D-02A-RAILWAY-ONLY-20261012") fail("execution_authorization_missing");
if (process.env.RAILWAY_PROJECT_ID !== EXPECTED_PROJECT ||
    process.env.RAILWAY_ENVIRONMENT_ID !== EXPECTED_ENVIRONMENT ||
    process.env.STAGE03D02A_EXPECTED_DATABASE_SERVICE_ID !== EXPECTED_DB_SERVICE)
  fail("railway_scope_mismatch");
const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) fail("database_url_missing");
const url = new URL(rawUrl);
if (!["postgresql:","postgres:"].includes(url.protocol)) fail("database_protocol_invalid");
if (!url.hostname.endsWith(".railway.internal")) fail("public_or_nonrailway_database_refused");
if (url.pathname !== "/" + EXPECTED_DB_NAME) fail("unexpected_database_name");
if (!url.hostname.startsWith("Postgres-R84i.".toLowerCase()) && !url.hostname.startsWith("postgres-r84i."))
  fail("unexpected_database_host");
const sql = postgres(rawUrl, {max:1,prepare:false,connect_timeout:8,idle_timeout:2});
const countTables = async () => {
  const rows = await sql`SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`;
  return rows[0].n;
};
const receipt = {schema:"stage03d02a_v1",project:EXPECTED_PROJECT,environment:EXPECTED_ENVIRONMENT,
  targetService:EXPECTED_DB_SERVICE,sourceCommit:"47ba001ce217e7742bf5121cf56f0f937e0515c9",
  migrations:[],identity:"not_checked",authLifecycle:"not_checked",result:"blocked"};
try {
  if ((await countTables()) !== 0) fail("nonempty_database_refused_no_reapply");
  const migrationDir = fileURLToPath(new URL("../../lib/db/migrations/", import.meta.url));
  for (let i=0;i<FILENAMES.length;i++) {
    const name=FILENAMES[i];
    const source=await readFile(new URL(name, "file://" + migrationDir + "/"),"utf8");
    await sql.unsafe(source);
    const n=await countTables();
    receipt.migrations.push({name,tables:n,expected:COUNTS[i],pass:n===COUNTS[i]});
    if (n!==COUNTS[i]) fail("unexpected_table_count_after_"+name);
  }
  // Insert staging-only canonical identity required by the API's read-only identity guard.
  const org = await sql`INSERT INTO organizations(name,slug)
    VALUES('Diamond Shelf Trading LLC','diamond-shelf-trading') RETURNING id`;
  await sql`INSERT INTO sites(organization_id,name,domain,canonical_origin,platform,locale,timezone,is_active)
    VALUES(${org[0].id},'Diamond Shelf','diamondshelf.us','https://diamondshelf.us','shopify','en-US','America/Chicago',true)`;
  const identity = await sql`SELECT s.id FROM sites s JOIN organizations o ON o.id=s.organization_id
    WHERE o.slug='diamond-shelf-trading' AND s.domain='diamondshelf.us'
    AND s.canonical_origin='https://diamondshelf.us' AND s.platform='shopify' AND s.is_active=true LIMIT 1`;
  if (identity.length!==1) fail("identity_missing");
  receipt.identity="pass";
  // Session CRUD with synthetic noncustomer test subject only, then remove.
  const hash = "stage03d02a_synthetic_token_hash_nonsecret";
  const rows=await sql`INSERT INTO auth_sessions
    (token_hash,subject,email,role,csrf_token_hash,expires_at)
    VALUES(${hash},'stage03d02a-synthetic','stage03d02a@example.invalid','viewer',
      'stage03d02a-synthetic-csrf',NOW()+INTERVAL '10 minutes') RETURNING id`;
  const active=await sql`SELECT id FROM auth_sessions WHERE id=${rows[0].id} AND revoked_at IS NULL AND expires_at>NOW()`;
  if(active.length!==1) fail("session_read_failed");
  await sql`UPDATE auth_sessions SET revoked_at=NOW() WHERE id=${rows[0].id}`;
  const revoked=await sql`SELECT id FROM auth_sessions WHERE id=${rows[0].id} AND revoked_at IS NULL`;
  if(revoked.length) fail("session_revocation_failed");
  await sql`DELETE FROM auth_sessions WHERE id=${rows[0].id}`;
  receipt.authLifecycle="pass";
  receipt.result="pass";
} catch (error) {
  receipt.reason=String(error?.message??error).replace(/postgres(ql)?:\/\/[^ ]+/g,"[redacted]");
  process.exitCode=1;
} finally {
  await sql.end({timeout:1}).catch(()=>{});
  console.log("STAGE03D02A_RECEIPT "+JSON.stringify(receipt));
}
