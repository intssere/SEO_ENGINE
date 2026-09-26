import {
  attestDatabaseBinding,
  type P88W09C2DBindingAttestation,
} from "./p8-8-w09c2d-binding-attestation.js";
import type { ServingProvenanceAttestation } from "./p8-8-w09c2-h6-r1-serving-provenance.js";

export const P8_8_W09C2E_R1_RESOLVER_VERSION =
  "p8-8-w09c2e-r1-binding-resolver-v1" as const;

export type P88W09C2ER1Code =
  | "ok"
  | "missing_expected_publication_identity"
  | "serving_provenance_unavailable"
  | "serving_provenance_mismatch"
  | "production_binding_source_unbound"
  | "production_binding_missing"
  | "parser_fail_closed"
  | "safety_invariant_violation";

export type P88W09C2ER1ExpectedIdentity = Readonly<{
  deployment_publication_identity: string;
  canonical_application_sha: string;
  canonical_tree_sha: string;
  serving_provenance_fingerprint: string;
}>;

type BindingSupplier = () => string | undefined;
type Parser = (binding: string) => P88W09C2DBindingAttestation;
type ProvenanceLoader = () => Promise<ServingProvenanceAttestation>;

export type P88W09C2ER1Result = Readonly<{
  resolver_version: typeof P8_8_W09C2E_R1_RESOLVER_VERSION;
  expected_deployment_publication_identity: string | null;
  canonical_application_sha: string;
  canonical_tree_sha: string;
  serving_provenance_fingerprint: string;
  binding_resolution_attempt_count: 0 | 1;
  parser_invocation_count: 0 | 1;
  parser_version: P88W09C2DBindingAttestation["parser_version"] | null;
  scheme_family: P88W09C2DBindingAttestation["scheme_family"];
  host: string | null;
  port: number | null;
  database_name: string | null;
  provider_hint: P88W09C2DBindingAttestation["provider_hint"];
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
  code: P88W09C2ER1Code;
}>;

const PUBLICATION_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;

function fail(
  expected: P88W09C2ER1ExpectedIdentity,
  code: Exclude<P88W09C2ER1Code, "ok">,
  bindingAttempts: 0 | 1 = 0,
  parserInvocations: 0 | 1 = 0,
  parser?: P88W09C2DBindingAttestation,
): P88W09C2ER1Result {
  return {
    resolver_version: P8_8_W09C2E_R1_RESOLVER_VERSION,
    expected_deployment_publication_identity:
      expected.deployment_publication_identity || null,
    canonical_application_sha: expected.canonical_application_sha,
    canonical_tree_sha: expected.canonical_tree_sha,
    serving_provenance_fingerprint: expected.serving_provenance_fingerprint,
    binding_resolution_attempt_count: bindingAttempts,
    parser_invocation_count: parserInvocations,
    parser_version: parser?.parser_version ?? null,
    scheme_family: parser?.scheme_family ?? null,
    host: parser?.host ?? null,
    port: parser?.port ?? null,
    database_name: parser?.database_name ?? null,
    provider_hint: parser?.provider_hint ?? null,
    endpoint_or_compute_hint: parser?.endpoint_or_compute_hint ?? null,
    project_hint: null,
    branch_hint: null,
    timeline_or_equivalent_hint: null,
    binding_fingerprint: parser?.binding_fingerprint ?? null,
    secret_material_exposed: false,
    network_access_performed: false,
    database_session_opened: false,
    state_mutated: false,
    result: "fail_closed",
    code,
  };
}

export async function resolveProductionBindingAttestation(
  expected: P88W09C2ER1ExpectedIdentity,
  loadProvenance: ProvenanceLoader,
  bindingSupplier?: BindingSupplier,
  parser: Parser = attestDatabaseBinding,
): Promise<P88W09C2ER1Result> {
  if (!PUBLICATION_ID_RE.test(expected.deployment_publication_identity)) {
    return fail(expected, "missing_expected_publication_identity");
  }

  let serving: ServingProvenanceAttestation;
  try {
    serving = await loadProvenance();
  } catch {
    return fail(expected, "serving_provenance_unavailable");
  }
  if (serving.result !== "pass") {
    return fail(expected, "serving_provenance_unavailable");
  }

  const provenance = serving.provenance;
  if (
    provenance.canonical_commit_sha !== expected.canonical_application_sha ||
    provenance.canonical_tree_sha !== expected.canonical_tree_sha ||
    provenance.provenance_fingerprint !== expected.serving_provenance_fingerprint
  ) {
    return fail(expected, "serving_provenance_mismatch");
  }

  if (!bindingSupplier) {
    return fail(expected, "production_binding_source_unbound");
  }

  let binding: string | undefined;
  try {
    binding = bindingSupplier();
  } catch {
    return fail(expected, "production_binding_missing", 1);
  }
  if (typeof binding !== "string" || binding.length === 0) {
    return fail(expected, "production_binding_missing", 1);
  }

  let parsed: P88W09C2DBindingAttestation;
  try {
    parsed = parser(binding);
  } catch {
    return fail(expected, "parser_fail_closed", 1, 1);
  }

  if (
    parsed.secret_material_exposed !== false ||
    parsed.network_access_performed !== false ||
    parsed.database_session_opened !== false ||
    parsed.state_mutated !== false
  ) {
    return fail(expected, "safety_invariant_violation", 1, 1);
  }

  if (parsed.result !== "pass" || parsed.code !== "ok") {
    return fail(expected, "parser_fail_closed", 1, 1, parsed);
  }

  return {
    resolver_version: P8_8_W09C2E_R1_RESOLVER_VERSION,
    expected_deployment_publication_identity: expected.deployment_publication_identity,
    canonical_application_sha: expected.canonical_application_sha,
    canonical_tree_sha: expected.canonical_tree_sha,
    serving_provenance_fingerprint: expected.serving_provenance_fingerprint,
    binding_resolution_attempt_count: 1,
    parser_invocation_count: 1,
    parser_version: parsed.parser_version,
    scheme_family: parsed.scheme_family,
    host: parsed.host,
    port: parsed.port,
    database_name: parsed.database_name,
    provider_hint: parsed.provider_hint,
    endpoint_or_compute_hint: parsed.endpoint_or_compute_hint,
    project_hint: null,
    branch_hint: null,
    timeline_or_equivalent_hint: null,
    binding_fingerprint: parsed.binding_fingerprint,
    secret_material_exposed: false,
    network_access_performed: false,
    database_session_opened: false,
    state_mutated: false,
    result: "pass",
    code: "ok",
  };
}
