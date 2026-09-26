import { createHash } from "node:crypto";

export const BUILD_PROVENANCE_SCHEMA_VERSION = "p8-8-w09c2f-build-provenance-v1" as const;

const SHA1_RE = /^[0-9a-f]{40}$/;
const BRANCH_RE = /^[A-Za-z0-9][A-Za-z0-9._\/-]{0,127}$/;

export type BuildProvenanceArtifact = {
  schema_version: typeof BUILD_PROVENANCE_SCHEMA_VERSION;
  canonical_commit_sha: string;
  canonical_tree_sha: string;
  source_branch: string;
  generated_at_build: string;
  provenance_fingerprint: string;
};

export type BuildProvenanceFailure = {
  result: "fail_closed";
  code:
    | "missing_identity"
    | "invalid_commit_sha"
    | "invalid_tree_sha"
    | "invalid_source_branch"
    | "invalid_generated_at_build";
};

export type BuildProvenanceResult =
  | { result: "pass"; code: "ok"; artifact: BuildProvenanceArtifact }
  | BuildProvenanceFailure;

function identityProjection(input: {
  canonical_commit_sha: string;
  canonical_tree_sha: string;
  source_branch: string;
}): string {
  return JSON.stringify({
    schema_version: BUILD_PROVENANCE_SCHEMA_VERSION,
    canonical_commit_sha: input.canonical_commit_sha,
    canonical_tree_sha: input.canonical_tree_sha,
    source_branch: input.source_branch,
  });
}

export function createBuildProvenance(input: {
  canonical_commit_sha?: string;
  canonical_tree_sha?: string;
  source_branch?: string;
  generated_at_build?: string;
}): BuildProvenanceResult {
  if (!input.canonical_commit_sha || !input.canonical_tree_sha || !input.source_branch || !input.generated_at_build) {
    return { result: "fail_closed", code: "missing_identity" };
  }
  if (!SHA1_RE.test(input.canonical_commit_sha)) {
    return { result: "fail_closed", code: "invalid_commit_sha" };
  }
  if (!SHA1_RE.test(input.canonical_tree_sha)) {
    return { result: "fail_closed", code: "invalid_tree_sha" };
  }
  if (!BRANCH_RE.test(input.source_branch) || input.source_branch.includes("..") || input.source_branch.endsWith("/")) {
    return { result: "fail_closed", code: "invalid_source_branch" };
  }
  const generated = new Date(input.generated_at_build);
  if (Number.isNaN(generated.valueOf()) || generated.toISOString() !== input.generated_at_build) {
    return { result: "fail_closed", code: "invalid_generated_at_build" };
  }

  const provenance_fingerprint = createHash("sha256")
    .update(identityProjection({
      canonical_commit_sha: input.canonical_commit_sha,
      canonical_tree_sha: input.canonical_tree_sha,
      source_branch: input.source_branch,
    }))
    .digest("hex");

  return {
    result: "pass",
    code: "ok",
    artifact: {
      schema_version: BUILD_PROVENANCE_SCHEMA_VERSION,
      canonical_commit_sha: input.canonical_commit_sha,
      canonical_tree_sha: input.canonical_tree_sha,
      source_branch: input.source_branch,
      generated_at_build: input.generated_at_build,
      provenance_fingerprint,
    },
  };
}

export function serializeBuildProvenance(artifact: BuildProvenanceArtifact): string {
  return JSON.stringify({
    schema_version: artifact.schema_version,
    canonical_commit_sha: artifact.canonical_commit_sha,
    canonical_tree_sha: artifact.canonical_tree_sha,
    source_branch: artifact.source_branch,
    generated_at_build: artifact.generated_at_build,
    provenance_fingerprint: artifact.provenance_fingerprint,
  });
}

export function parseBuildProvenance(serialized: string): BuildProvenanceResult {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return { result: "fail_closed", code: "missing_identity" };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "missing_identity" };
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  const expected = ["schema_version","canonical_commit_sha","canonical_tree_sha","source_branch","generated_at_build","provenance_fingerprint"];
  if (keys.length !== expected.length || expected.some((key) => !keys.includes(key))) {
    return { result: "fail_closed", code: "missing_identity" };
  }
  if (record.schema_version !== BUILD_PROVENANCE_SCHEMA_VERSION || typeof record.provenance_fingerprint !== "string") {
    return { result: "fail_closed", code: "missing_identity" };
  }
  const rebuilt = createBuildProvenance({
    canonical_commit_sha: typeof record.canonical_commit_sha === "string" ? record.canonical_commit_sha : undefined,
    canonical_tree_sha: typeof record.canonical_tree_sha === "string" ? record.canonical_tree_sha : undefined,
    source_branch: typeof record.source_branch === "string" ? record.source_branch : undefined,
    generated_at_build: typeof record.generated_at_build === "string" ? record.generated_at_build : undefined,
  });
  if (rebuilt.result !== "pass" || rebuilt.artifact.provenance_fingerprint !== record.provenance_fingerprint) {
    return { result: "fail_closed", code: "missing_identity" };
  }
  return rebuilt;
}
