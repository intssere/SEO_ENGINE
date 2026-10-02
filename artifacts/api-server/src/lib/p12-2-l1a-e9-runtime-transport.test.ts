import assert from "node:assert/strict";
import test from "node:test";
import {
  assertP122L1AE9NoCredentialArgv,
  buildP122L1AE9PsqlConnectionEnv,
} from "./p12-2-l1a-e9-runtime-transport.js";

test("maps DATABASE_URL into explicit libpq connection environment without URI argv", () => {
  const databaseUrl =
    "postgresql://railway_user:s%40cret@postgres.railway.internal:5433/railway_db?sslmode=require";

  const env = buildP122L1AE9PsqlConnectionEnv(databaseUrl);

  assert.deepEqual(env, {
    PGHOST: "postgres.railway.internal",
    PGPORT: "5433",
    PGUSER: "railway_user",
    PGPASSWORD: "s@cret",
    PGDATABASE: "railway_db",
    PGCONNECT_TIMEOUT: "10",
    PGSSLMODE: "require",
  });

  const argv = [
    "--no-psqlrc",
    "--set",
    "ON_ERROR_STOP=1",
    "--tuples-only",
    "--csv",
    "--command",
    "SELECT 1",
  ];

  assert.doesNotThrow(() => assertP122L1AE9NoCredentialArgv(argv, databaseUrl));
  assert.equal(argv.some((value) => value.includes("s@cret")), false);
  assert.equal(argv.some((value) => value.includes(databaseUrl)), false);
});

test("defaults PostgreSQL port and leaves SSL mode unset when absent", () => {
  const env = buildP122L1AE9PsqlConnectionEnv(
    "postgres://user:password@db.internal/app",
  );

  assert.equal(env.PGPORT, "5432");
  assert.equal(env.PGSSLMODE, undefined);
});

test("fails closed for malformed or incomplete database URLs", () => {
  for (const value of [
    "",
    "https://example.invalid/db",
    "postgresql://user:password@/db",
    "postgresql://:password@example.invalid/db",
    "postgresql://user:@example.invalid/db",
    "postgresql://user:password@example.invalid/",
  ]) {
    assert.throws(() => buildP122L1AE9PsqlConnectionEnv(value), /p12_2_l1a_e9_database_url_/);
  }
});

test("rejects credential-bearing psql argv", () => {
  const databaseUrl = "postgresql://user:secret@example.invalid/db";

  assert.throws(
    () => assertP122L1AE9NoCredentialArgv(["--dbname", databaseUrl], databaseUrl),
    /p12_2_l1a_e9_credential_in_argv_forbidden/,
  );

  assert.throws(
    () => assertP122L1AE9NoCredentialArgv(["--set", "PASSWORD=secret"], databaseUrl),
    /p12_2_l1a_e9_credential_in_argv_forbidden/,
  );
});
