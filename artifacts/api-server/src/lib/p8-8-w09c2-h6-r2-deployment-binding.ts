import type { ServingProvenanceAttestation } from "./p8-8-w09c2-h6-r1-serving-provenance.js";

export const H6_R2_DEPLOYMENT_BINDING_VERSION =
  "p8-8-w09c2-h6-r2-deployment-binding-v1" as const;

const SHA1_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ReplitPublicationObservation = {
  deployment_publication_identity: string;
  status: "success";
  url: string;
};

export type H6R2ExpectedIdentity = {
  canonical_application_sha: string;
  canonical_tree_sha: string;
  source_branch: string;
  serving_provenance_fingerprint: string;
  deployment_publication_identity: string;
  production_url: string;
};

export type H6R2DeploymentBindingResult =
  | {
      result: "pass";
      code: "ok";
      attestation_version: typeof H6_R2_DEPLOYMENT_BINDING_VERSION;
      canonical_application_sha: string;
      canonical_tree_sha: string;
      source_branch: string;
      serving_provenance_fingerprint: string;
      deployment_publication_identity: string;
      production_url: string;
      publication_status: "success";
    }
  | {
      result: "fail_closed";
      code:
        | "invalid_expected_identity"
        | "serving_provenance_unavailable"
        | "publication_observation_invalid"
        | "publication_not_successful"
        | "identity_mismatch";
      attestation_version: typeof H6_R2_DEPLOYMENT_BINDING_VERSION;
    };

function validUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.username === "" && parsed.password === "" &&
      parsed.search === "" && parsed.hash === "" && parsed.pathname === "/";
  } catch {
    return false;
  }
}

export function bindServingProvenanceToDeployment(input: {
  expected: H6R2ExpectedIdentity;
  serving: ServingProvenanceAttestation;
  publication: unknown;
}): H6R2DeploymentBindingResult {
  const { expected, serving, publication } = input;
  if (
    !SHA1_RE.test(expected.canonical_application_sha) ||
    !SHA1_RE.test(expected.canonical_tree_sha) ||
    expected.source_branch !== "main" ||
    !SHA256_RE.test(expected.serving_provenance_fingerprint) ||
    !UUID_RE.test(expected.deployment_publication_identity) ||
    !validUrl(expected.production_url)
  ) {
    return { result: "fail_closed", code: "invalid_expected_identity", attestation_version: H6_R2_DEPLOYMENT_BINDING_VERSION };
  }

  if (serving.result !== "pass") {
    return { result: "fail_closed", code: "serving_provenance_unavailable", attestation_version: H6_R2_DEPLOYMENT_BINDING_VERSION };
  }

  if (!publication || typeof publication !== "object" || Array.isArray(publication)) {
    return { result: "fail_closed", code: "publication_observation_invalid", attestation_version: H6_R2_DEPLOYMENT_BINDING_VERSION };
  }
  const observed = publication as Record<string, unknown>;
  const keys = Object.keys(observed);
  const allowed = ["deployment_publication_identity", "status", "url"];
  if (keys.length !== allowed.length || allowed.some((key) => !keys.includes(key)) ||
      typeof observed.deployment_publication_identity !== "string" ||
      typeof observed.status !== "string" ||
      typeof observed.url !== "string" ||
      !UUID_RE.test(observed.deployment_publication_identity) ||
      !validUrl(observed.url)) {
    return { result: "fail_closed", code: "publication_observation_invalid", attestation_version: H6_R2_DEPLOYMENT_BINDING_VERSION };
  }
  if (observed.status !== "success") {
    return { result: "fail_closed", code: "publication_not_successful", attestation_version: H6_R2_DEPLOYMENT_BINDING_VERSION };
  }

  const provenance = serving.provenance;
  if (
    provenance.canonical_commit_sha !== expected.canonical_application_sha ||
    provenance.canonical_tree_sha !== expected.canonical_tree_sha ||
    provenance.source_branch !== expected.source_branch ||
    provenance.provenance_fingerprint !== expected.serving_provenance_fingerprint ||
    observed.deployment_publication_identity !== expected.deployment_publication_identity ||
    observed.url !== expected.production_url
  ) {
    return { result: "fail_closed", code: "identity_mismatch", attestation_version: H6_R2_DEPLOYMENT_BINDING_VERSION };
  }

  return {
    result: "pass",
    code: "ok",
    attestation_version: H6_R2_DEPLOYMENT_BINDING_VERSION,
    canonical_application_sha: provenance.canonical_commit_sha,
    canonical_tree_sha: provenance.canonical_tree_sha,
    source_branch: provenance.source_branch,
    serving_provenance_fingerprint: provenance.provenance_fingerprint,
    deployment_publication_identity: observed.deployment_publication_identity,
    production_url: observed.url,
    publication_status: "success",
  };
}
