export type P122L1AE9PsqlConnectionEnv = Readonly<{
  PGHOST: string;
  PGPORT: string;
  PGUSER: string;
  PGPASSWORD: string;
  PGDATABASE: string;
  PGCONNECT_TIMEOUT: string;
  PGSSLMODE?: string;
}>;

const DEFAULT_POSTGRES_PORT = "5432";
const DEFAULT_CONNECT_TIMEOUT_SECONDS = "10";

function requiredDecoded(value: string, field: string): string {
  if (!value) throw new Error(`p12_2_l1a_e9_database_url_${field}_missing`);
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`p12_2_l1a_e9_database_url_${field}_encoding_invalid`);
  }
}

export function buildP122L1AE9PsqlConnectionEnv(
  databaseUrl: string,
): P122L1AE9PsqlConnectionEnv {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("p12_2_l1a_e9_database_url_invalid");
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("p12_2_l1a_e9_database_url_scheme_invalid");
  }

  const host = parsed.hostname;
  if (!host) throw new Error("p12_2_l1a_e9_database_url_host_missing");

  const databasePath = parsed.pathname.replace(/^\/+/, "");
  const connectionEnv: {
    PGHOST: string;
    PGPORT: string;
    PGUSER: string;
    PGPASSWORD: string;
    PGDATABASE: string;
    PGCONNECT_TIMEOUT: string;
    PGSSLMODE?: string;
  } = {
    PGHOST: host,
    PGPORT: parsed.port || DEFAULT_POSTGRES_PORT,
    PGUSER: requiredDecoded(parsed.username, "user"),
    PGPASSWORD: requiredDecoded(parsed.password, "password"),
    PGDATABASE: requiredDecoded(databasePath, "database"),
    PGCONNECT_TIMEOUT: DEFAULT_CONNECT_TIMEOUT_SECONDS,
  };

  const sslMode = parsed.searchParams.get("sslmode");
  if (sslMode) {
    connectionEnv.PGSSLMODE = sslMode;
  }

  return Object.freeze(connectionEnv);
}

export function assertP122L1AE9NoCredentialArgv(
  argv: readonly string[],
  databaseUrl: string,
): void {
  const parsed = new URL(databaseUrl);
  const secretFragments = [
    databaseUrl,
    parsed.password ? decodeURIComponent(parsed.password) : "",
  ].filter(Boolean);

  const rendered = argv.join("\n");
  for (const fragment of secretFragments) {
    if (rendered.includes(fragment)) {
      throw new Error("p12_2_l1a_e9_credential_in_argv_forbidden");
    }
  }
}
