import { createHash } from "node:crypto";

export const P8_8_W09C2D_PARSER_VERSION = "p8-8-w09c2d-binding-parser-v1" as const;

export type P88W09C2DResultCode =
  | "ok"
  | "missing_binding"
  | "binding_too_large"
  | "unsupported_scheme"
  | "malformed_binding"
  | "missing_host"
  | "invalid_host"
  | "missing_database_name"
  | "invalid_database_name"
  | "unsupported_provider_shape"
  | "sanitization_failure";

export type P88W09C2DBindingAttestation = Readonly<{
  parser_version: typeof P8_8_W09C2D_PARSER_VERSION;
  scheme_family: "postgresql" | null;
  host: string | null;
  port: number | null;
  database_name: string | null;
  provider_hint: "neon" | "unknown" | null;
  endpoint_or_compute_hint: string | null;
  project_hint: null;
  branch_hint: null;
  timeline_or_equivalent_hint: null;
  binding_fingerprint: string | null;
  secret_material_exposed: false;
  network_access_performed: false;
  database_session_opened: false;
  state_mutated: false;
  result: "pass" | "fail_closed";
  code: P88W09C2DResultCode;
}>;

const MAX_BINDING_LENGTH = 8192;
const HOST_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const DATABASE_RE = /^[A-Za-z0-9_.-]{1,128}$/;
const NEON_HOST_RE = /^(?<endpoint>ep-[a-z0-9-]+)(?:-pooler)?\.[a-z0-9-]+\.aws\.neon\.tech$/;

function base(code: P88W09C2DResultCode): P88W09C2DBindingAttestation {
  return {
    parser_version: P8_8_W09C2D_PARSER_VERSION,
    scheme_family: null,
    host: null,
    port: null,
    database_name: null,
    provider_hint: null,
    endpoint_or_compute_hint: null,
    project_hint: null,
    branch_hint: null,
    timeline_or_equivalent_hint: null,
    binding_fingerprint: null,
    secret_material_exposed: false,
    network_access_performed: false,
    database_session_opened: false,
    state_mutated: false,
    result: "fail_closed",
    code,
  };
}

function fingerprint(input: {
  scheme_family: "postgresql";
  host: string;
  port: number | null;
  database_name: string;
  provider_hint: "neon" | "unknown";
  endpoint_or_compute_hint: string | null;
}): string {
  const projection = JSON.stringify({
    scheme_family: input.scheme_family,
    host: input.host,
    port: input.port,
    database_name: input.database_name,
    provider_hint: input.provider_hint,
    endpoint_or_compute_hint: input.endpoint_or_compute_hint,
    project_hint: null,
    branch_hint: null,
    timeline_or_equivalent_hint: null,
  });
  return createHash("sha256").update(projection, "utf8").digest("hex");
}

export function attestDatabaseBinding(binding: string): P88W09C2DBindingAttestation {
  if (typeof binding !== "string" || binding.length === 0) return base("missing_binding");
  if (binding.length > MAX_BINDING_LENGTH) return base("binding_too_large");

  let parsed: URL;
  try {
    parsed = new URL(binding);
  } catch {
    return base("malformed_binding");
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    return base("unsupported_scheme");
  }

  const host = parsed.hostname.toLowerCase();
  if (!host) return base("missing_host");
  if (!HOST_RE.test(host)) return base("invalid_host");

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  } catch {
    return base("invalid_database_name");
  }
  if (!databaseName) return base("missing_database_name");
  if (!DATABASE_RE.test(databaseName)) return base("invalid_database_name");

  let port: number | null = null;
  if (parsed.port) {
    const parsedPort = Number(parsed.port);
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      return base("malformed_binding");
    }
    port = parsedPort;
  }

  const neon = NEON_HOST_RE.exec(host);
  const providerHint: "neon" | "unknown" = neon ? "neon" : "unknown";
  const endpointHint = neon?.groups?.endpoint ?? null;

  try {
    const identity = {
      scheme_family: "postgresql" as const,
      host,
      port,
      database_name: databaseName,
      provider_hint: providerHint,
      endpoint_or_compute_hint: endpointHint,
    };
    return {
      parser_version: P8_8_W09C2D_PARSER_VERSION,
      ...identity,
      project_hint: null,
      branch_hint: null,
      timeline_or_equivalent_hint: null,
      binding_fingerprint: fingerprint(identity),
      secret_material_exposed: false,
      network_access_performed: false,
      database_session_opened: false,
      state_mutated: false,
      result: "pass",
      code: "ok",
    };
  } catch {
    return base("sanitization_failure");
  }
}
