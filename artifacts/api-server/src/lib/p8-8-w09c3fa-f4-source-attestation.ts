import { createHash } from "node:crypto";

const SHA40 = /^[0-9a-f]{40}$/;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BRANCH = /^(?!\/)(?!.*\.\.)(?!.*(?:^|\/)\.)(?!.*[~^:?*\\\[\]\s])(?!.+\/$).+$/;
const ALLOWED = new Set(["schema", "repository", "commitSha", "treeSha", "sourceBranch", "issuedFrom"]);
const CREDENTIAL_KEY = /(password|passwd|secret|token|authorization|cookie|private.?key|connection.?string|database.?url)/i;
const CREDENTIAL_VALUE = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:bearer|basic)\s+[A-Za-z0-9._~+\/-]+=*|(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s]+|gh[pousr]_[A-Za-z0-9_]+)/i;

export const SOURCE_ATTESTATION_SCHEMA = "p8-8-w09c3fa-f4-v1" as const;
export const SOURCE_ATTESTATION_ISSUER = "github_git_commit_object" as const;

export type SourceAttestation = {
  schema: typeof SOURCE_ATTESTATION_SCHEMA;
  repository: string;
  commitSha: string;
  treeSha: string;
  sourceBranch: string;
  issuedFrom: typeof SOURCE_ATTESTATION_ISSUER;
};

export type SourceAttestationContext = {
  expectedRepository: string;
  railwayCommitSha: string;
  railwaySourceBranch: string;
};

export type SourceAttestationResult =
  | { result: "pass"; code: "ok"; attestationId: string; identity: SourceAttestation }
  | { result: "fail_closed"; code: "invalid_shape" | "credential_shaped_material" | "invalid_identity" | "repository_mismatch" | "commit_mismatch" | "branch_mismatch" };

function canonical(record: SourceAttestation): string {
  return JSON.stringify({
    schema: record.schema,
    repository: record.repository,
    commitSha: record.commitSha,
    treeSha: record.treeSha,
    sourceBranch: record.sourceBranch,
    issuedFrom: record.issuedFrom,
  });
}

export function sourceAttestationId(record: SourceAttestation): string {
  return "f4-" + createHash("sha256").update(canonical(record), "utf8").digest("hex");
}

export function verifySourceAttestation(
  input: unknown,
  context: SourceAttestationContext,
): SourceAttestationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  const raw = input as Record<string, unknown>;
  if (Object.keys(raw).some((key) => !ALLOWED.has(key))) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  if (Object.entries(raw).some(([key, value]) =>
    CREDENTIAL_KEY.test(key) || (typeof value === "string" && CREDENTIAL_VALUE.test(value)))) {
    return { result: "fail_closed", code: "credential_shaped_material" };
  }

  const required = ["schema", "repository", "commitSha", "treeSha", "sourceBranch", "issuedFrom"] as const;
  if (required.some((key) => typeof raw[key] !== "string" || raw[key] === "")) {
    return { result: "fail_closed", code: "invalid_shape" };
  }

  const record = raw as SourceAttestation;
  if (
    record.schema !== SOURCE_ATTESTATION_SCHEMA ||
    record.issuedFrom !== SOURCE_ATTESTATION_ISSUER ||
    !REPOSITORY.test(record.repository) ||
    !SHA40.test(record.commitSha) ||
    !SHA40.test(record.treeSha) ||
    !BRANCH.test(record.sourceBranch)
  ) {
    return { result: "fail_closed", code: "invalid_identity" };
  }
  if (record.repository !== context.expectedRepository) {
    return { result: "fail_closed", code: "repository_mismatch" };
  }
  if (record.commitSha !== context.railwayCommitSha) {
    return { result: "fail_closed", code: "commit_mismatch" };
  }
  if (record.sourceBranch !== context.railwaySourceBranch) {
    return { result: "fail_closed", code: "branch_mismatch" };
  }

  return { result: "pass", code: "ok", attestationId: sourceAttestationId(record), identity: record };
}
