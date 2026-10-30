/**
 * UGP-4.7 G0 provider-free proposed-scope preflight.
 * This is a completeness check, never an approval, authenticator, or permission.
 */
import { createHash } from "node:crypto";

type RecordValue = Record<string, unknown>;
const MAX_INPUT_BYTES = 16384;
const oid = /^[0-9a-f]{40}$/;
const segment = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const gitRef = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/;
const keys = ["host","repositoryId","owner","repo","installationId","baseRef","baseSha",
  "allowedPaths","approvedGetPaths","operator","independentReviewer","assetClassification",
  "credentialScope","dataHandlingReview","sideEffectReview","securityReviewReference"] as const;
const deny = (reason: string) => Object.freeze({
  status: "INCOMPLETE_OR_UNSAFE" as const, issues: Object.freeze([reason]),
  g0Approved: false as const, g1Authorized: false as const,
  gitReadAuthorized: false as const, gitWriteAuthorized: false as const,
  mergeAuthorized: false as const, deploymentAuthorized: false as const,
  independentlyCertified: false as const
});
const isRecord = (x: unknown): x is RecordValue =>
  x !== null && typeof x === "object" && !Array.isArray(x);
const exact = (x: unknown, fields: readonly string[]): x is RecordValue =>
  isRecord(x) && Object.keys(x).length === fields.length &&
  fields.every(k => Object.hasOwn(x,k));
const identifier = (x: unknown): x is string =>
  typeof x === "string" && segment.test(x);
const path = (x: unknown): x is string =>
  typeof x === "string" && x.length > 0 && x.length <= 240 &&
  !x.startsWith("/") && !x.includes("%") && !x.includes("\\") &&
  x !== ".git" && !x.startsWith(".git/") &&
  x.split("/").every(p => p !== "." && p !== ".." && segment.test(p));

/** Only a bounded serialized JSON proposal is accepted; never inspect caller object getters. */
export function assessUGP47G0ProposedIntake(input: unknown) {
  try {
    if (typeof input !== "string" || !input.length || input.length > MAX_INPUT_BYTES ||
        Buffer.byteLength(input,"utf8") > MAX_INPUT_BYTES)
      return deny("invalid_or_oversized_intake");
    const value: unknown = JSON.parse(input);
    // Accept only the JSON.stringify representation. This denies duplicate object keys,
    // escaped-key aliases, noncanonical numbers and ambiguous whitespace serializations.
    // It is a strict local format requirement, NOT an interoperable canonical JSON standard.
    if (JSON.stringify(value) !== input) return deny("ambiguous_or_noncanonical_json");
    if (!exact(value,keys)) return deny("missing_or_unexpected_intake_field");
    if (value.host !== "github.com" ||
        !Number.isSafeInteger(value.repositoryId) || (value.repositoryId as number) <= 0 ||
        !Number.isSafeInteger(value.installationId) || (value.installationId as number) <= 0 ||
        !identifier(value.owner) || !identifier(value.repo) ||
        !identifier(value.operator) || !identifier(value.independentReviewer) ||
        value.operator === value.independentReviewer ||
        typeof value.baseRef !== "string" || !gitRef.test(value.baseRef) ||
        value.baseRef.includes("..") || value.baseRef.includes("//") || value.baseRef.endsWith("/") ||
        typeof value.baseSha !== "string" || !oid.test(value.baseSha) ||
        value.assetClassification !== "isolated_nonproduction_test_only" ||
        value.credentialScope !== "read_only_minimal" ||
        value.dataHandlingReview !== "review_required" ||
        value.sideEffectReview !== "review_required" ||
        !identifier(value.securityReviewReference))
      return deny("invalid_or_unreviewed_g0_identity");
    if (!Array.isArray(value.allowedPaths) || value.allowedPaths.length < 1 ||
        value.allowedPaths.length > 10 || !value.allowedPaths.every(path) ||
        new Set(value.allowedPaths).size !== value.allowedPaths.length ||
        new Set((value.allowedPaths as string[]).map(p => p.toLowerCase())).size !== value.allowedPaths.length)
      return deny("invalid_allowlisted_paths");
    // At G0 the only independently bound Git object is the immutable base commit.
    // A proposed tree/blob OID has no provenance here and cannot be allowlisted yet.
    // Future G1 object reads require a separately reviewed, exact-object scope.
    const commitEndpoint = "/repos/" + value.owner + "/" + value.repo +
      "/git/commits/" + value.baseSha;
    if (!Array.isArray(value.approvedGetPaths) ||
        value.approvedGetPaths.length !== 1 ||
        value.approvedGetPaths[0] !== commitEndpoint)
      return deny("unbound_or_unapproved_git_object_endpoint");
    const digest = createHash("sha256").update(JSON.stringify(value)).digest("hex");
    return Object.freeze({
      status: "REVIEW_REQUIRED_UNAUTHORIZED" as const,
      issues: Object.freeze(["independent_G0_verification_and_explicit_owner_authorization_required"]),
      proposalDigest: digest,
      g0Approved: false as const, g1Authorized: false as const,
      gitReadAuthorized: false as const, gitWriteAuthorized: false as const,
      mergeAuthorized: false as const, deploymentAuthorized: false as const,
      independentlyCertified: false as const
    });
  } catch {
    return deny("malformed_or_uninspectable_intake");
  }
}
