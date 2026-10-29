/**
 * UGP-4.7 provider-free Git evidence chain normalizer.
 * Caller-supplied JSON is NEVER provider-authenticated evidence or permission to act.
 */
import { createHash } from "node:crypto";

type Obj = Record<string, unknown>;
const sha1 = /^[0-9a-f]{40}$/;
const sha256 = /^[0-9a-f]{64}$/;
const segment = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const branch = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/;
const MAX_BYTES = 262144;
const encoder = new TextEncoder();
const own = (x: Obj, k: string): unknown => x[k];
const isObj = (x: unknown): x is Obj => x !== null && typeof x === "object" && !Array.isArray(x);
const same = (a: unknown, b: unknown) => a === b;
function exact(value: unknown, keys: readonly string[]): value is Obj {
  return isObj(value) && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
}
function s(x: unknown, rule: RegExp): x is string { return typeof x === "string" && rule.test(x); }
function safePath(x: unknown): x is string {
  return typeof x === "string" && x.length <= 240 && x.length > 0 &&
    !x.startsWith("/") && !x.includes("\\") && !x.includes("%") &&
    x.split("/").every(part => part !== "." && part !== ".." && segment.test(part)) &&
    !x.startsWith(".git/");
}
const digest = (x: string) => createHash("sha256").update(x).digest("hex");
const deny = (issue: string) => Object.freeze({
  status: "INCOMPLETE_OR_UNSAFE" as const,
  issues: Object.freeze([issue]),
  gitReadAuthorized: false as const, gitWriteAuthorized: false as const,
  mergeAuthorized: false as const, deploymentAuthorized: false as const,
  independentlyCertified: false as const
});
function parse(input: unknown): Obj {
  if (typeof input !== "string" || !input.length || input.length > MAX_BYTES)
    throw Error("evidence_json_size_or_type");
  if (encoder.encode(input).length > MAX_BYTES) throw Error("evidence_json_oversize");
  const value: unknown = JSON.parse(input);
  if (!isObj(value)) throw Error("evidence_not_object");
  return value;
}

/** The only entrypoint accepts bounded serialized JSON, not object graphs. */
export function reviewUGP47GitEvidence(input: unknown) {
  try {
    const x = parse(input);
    if (!exact(x, ["target", "read", "patch", "commit", "pr", "ci"])) return deny("unexpected_evidence_fields");
    const target = own(x,"target"), read = own(x,"read"), patch = own(x,"patch");
    const commit = own(x,"commit"), pr = own(x,"pr"), ci = own(x,"ci");
    if (!exact(target,["host","repositoryId","owner","repo","installationId","defaultBranch","allowedPath"]) ||
        target.host !== "github.com" || !Number.isSafeInteger(target.repositoryId) ||
        (target.repositoryId as number) <= 0 || !Number.isSafeInteger(target.installationId) ||
        (target.installationId as number) <= 0 || !s(target.owner,segment) ||
        !s(target.repo,segment) || !s(target.defaultBranch,branch) || !safePath(target.allowedPath))
      return deny("invalid_target");
    if (!exact(read,["repositoryId","baseRef","baseSha","path","mode","blobSha","contentDigest"]) ||
        !same(read.repositoryId,target.repositoryId) || !same(read.baseRef,target.defaultBranch) ||
        !s(read.baseSha,sha1) || !same(read.path,target.allowedPath) ||
        read.mode !== "100644" || !s(read.blobSha,sha1) || !s(read.contentDigest,sha256))
      return deny("invalid_or_drifted_read");
    if (!exact(patch,["repositoryId","expectedBaseSha","path","expectedBlobSha","beforeDigest","afterDigest","patchDigest","workingBranch"]) ||
        !same(patch.repositoryId,target.repositoryId) || !same(patch.expectedBaseSha,read.baseSha) ||
        !same(patch.path,read.path) || !same(patch.expectedBlobSha,read.blobSha) ||
        !same(patch.beforeDigest,read.contentDigest) || !s(patch.afterDigest,sha256) ||
        !s(patch.patchDigest,sha256) || !s(patch.workingBranch,branch) ||
        patch.workingBranch === target.defaultBranch ||
        !patch.workingBranch.startsWith("ugp47/") || patch.workingBranch.endsWith("/") ||
        patch.workingBranch.includes("//") || patch.workingBranch.includes(".."))
      return deny("invalid_or_drifted_patch");
    if (!exact(commit,["repositoryId","branch","sha","parentSha","treeSha","path","beforeBlobSha","afterBlobSha","afterDigest"]) ||
        !same(commit.repositoryId,target.repositoryId) || !same(commit.branch,patch.workingBranch) ||
        !s(commit.sha,sha1) || !same(commit.parentSha,read.baseSha) || !s(commit.treeSha,sha1) ||
        !same(commit.path,read.path) || !same(commit.beforeBlobSha,read.blobSha) ||
        !s(commit.afterBlobSha,sha1) || !same(commit.afterDigest,patch.afterDigest) ||
        commit.sha === read.baseSha || commit.afterBlobSha === read.blobSha)
      return deny("invalid_or_drifted_commit");
    if (!exact(pr,["repositoryId","number","baseRef","baseSha","headRef","headSha","merged","autoMergeEnabled"]) ||
        !same(pr.repositoryId,target.repositoryId) || !Number.isSafeInteger(pr.number) ||
        (pr.number as number) <= 0 || !same(pr.baseRef,read.baseRef) ||
        !same(pr.baseSha,read.baseSha) || !same(pr.headRef,commit.branch) ||
        !same(pr.headSha,commit.sha) || pr.merged !== false || pr.autoMergeEnabled !== false)
      return deny("invalid_or_drifted_pr");
    if (!exact(ci,["repositoryId","headSha","workflowId","runId","status","conclusion","requiredChecks"]) ||
        !same(ci.repositoryId,target.repositoryId) || !same(ci.headSha,commit.sha) ||
        !Number.isSafeInteger(ci.workflowId) || (ci.workflowId as number) <= 0 ||
        !Number.isSafeInteger(ci.runId) || (ci.runId as number) <= 0 ||
        ci.status !== "completed" || ci.conclusion !== "success" ||
        !Array.isArray(ci.requiredChecks) || ci.requiredChecks.length === 0 ||
        ci.requiredChecks.length > 20 || ci.requiredChecks.some(c => !exact(c,["name","headSha","conclusion"]) ||
          !s(c.name,/^[A-Za-z0-9][A-Za-z0-9._ -]{0,100}$/) ||
          c.headSha !== commit.sha || c.conclusion !== "success") ||
        new Set(ci.requiredChecks.map(c => (c as Obj).name)).size !== ci.requiredChecks.length)
      return deny("invalid_or_drifted_ci");
    // The fingerprint represents only normalized self-reported claims; no provider authenticity.
    const normalized = JSON.stringify({target,read,patch,commit,pr,ci});
    return Object.freeze({
      status: "STRUCTURALLY_CONSISTENT_UNVERIFIED" as const,
      issues: Object.freeze([] as string[]),
      evidenceDigest: digest(normalized),
      gitReadAuthorized: false as const, gitWriteAuthorized: false as const,
      mergeAuthorized: false as const, deploymentAuthorized: false as const,
      independentlyCertified: false as const
    });
  } catch {
    return deny("invalid_or_uninspectable_serialized_evidence");
  }
}
