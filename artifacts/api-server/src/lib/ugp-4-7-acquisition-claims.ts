/**
 * UGP-4.7 offline acquisition-metadata correlation.
 * These are self-reported metadata, NOT authenticated GitHub observations.
 * No network, filesystem, Git, credentials or runtime admission.
 */
import { createHash } from "node:crypto";
import { reviewUGP47ReadChainWithBlob } from "./ugp-4-7-read-blob-cross-evidence.js";

type Obj = Record<string, unknown>;
const shape = (x: unknown, keys: readonly string[]): x is Obj =>
  x !== null && typeof x === "object" && !Array.isArray(x) &&
  Object.keys(x).length === keys.length && keys.every(k => Object.hasOwn(x, k));
const hex40 = /^[0-9a-f]{40}$/;
const safeText = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const fail = (reason: string) => Object.freeze({
  status: "INCOMPLETE_OR_UNSAFE" as const,
  issues: Object.freeze([reason]),
  gitReadAuthorized: false as const, gitWriteAuthorized: false as const,
  mergeAuthorized: false as const, deploymentAuthorized: false as const,
  independentlyCertified: false as const
});
function boundedJson(value: unknown): Obj {
  if (typeof value !== "string" || !value.length || value.length > 262144)
    throw Error("invalid_serialized_evidence");
  const parsed: unknown = JSON.parse(value);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
    throw Error("invalid_evidence_root");
  return parsed as Obj;
}
function acquisition(raw: unknown): Obj | null {
  if (!shape(raw, ["host","repositoryId","owner","repo","installationId",
    "baseRef","baseSha","path","requestMethod","httpStatus","redirected",
    "contentType","observedAt","sourceKind"])) return null;
  if (raw.host !== "github.com" || raw.requestMethod !== "GET" ||
      raw.httpStatus !== 200 || raw.redirected !== false ||
      raw.contentType !== "application/vnd.github+json" ||
      raw.sourceKind !== "captured_provider_claim" ||
      !Number.isSafeInteger(raw.repositoryId) || (raw.repositoryId as number) <= 0 ||
      !Number.isSafeInteger(raw.installationId) || (raw.installationId as number) <= 0 ||
      typeof raw.owner !== "string" || !safeText.test(raw.owner) ||
      typeof raw.repo !== "string" || !safeText.test(raw.repo) ||
      typeof raw.baseRef !== "string" || !safeText.test(raw.baseRef) ||
      typeof raw.baseSha !== "string" || !hex40.test(raw.baseSha) ||
      typeof raw.path !== "string" || raw.path.length > 240 ||
      typeof raw.observedAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(raw.observedAt) ||
      !Number.isFinite(Date.parse(raw.observedAt)) ||
      new Date(raw.observedAt).toISOString() !== raw.observedAt) return null;
  return raw;
}
/** No trust is granted even when three sets of caller-provided claims agree. */
export function reviewUGP47AcquisitionClaims(chainJSON: unknown, blobJSON: unknown, acquisitionJSON: unknown) {
  try {
    const joined = reviewUGP47ReadChainWithBlob(chainJSON, blobJSON);
    if (joined.status !== "STRUCTURALLY_CONSISTENT_UNVERIFIED")
      return fail("invalid_cross_evidence");
    const chain = boundedJson(chainJSON);
    const acq = acquisition(boundedJson(acquisitionJSON));
    if (!acq || !shape(chain.target,["host","repositoryId","owner","repo","installationId","defaultBranch","allowedPath"]) ||
        !shape(chain.read,["repositoryId","baseRef","baseSha","path","mode","blobSha","contentDigest"]))
      return fail("invalid_acquisition_claim");
    const target = chain.target, read = chain.read;
    if (acq.host !== target.host || acq.repositoryId !== target.repositoryId ||
        acq.installationId !== target.installationId ||
        acq.owner !== target.owner || acq.repo !== target.repo ||
        acq.baseRef !== read.baseRef || acq.baseRef !== target.defaultBranch ||
        acq.baseSha !== read.baseSha || acq.path !== read.path ||
        acq.path !== target.allowedPath)
      return fail("acquisition_target_or_read_mismatch");
    const evidenceDigest = createHash("sha256").update(JSON.stringify({
      previous: joined.evidenceDigest,
      acquisition: acq
    })).digest("hex");
    return Object.freeze({
      status: "STRUCTURALLY_CONSISTENT_UNVERIFIED" as const,
      issues: Object.freeze([] as string[]),
      evidenceDigest,
      gitReadAuthorized: false as const, gitWriteAuthorized: false as const,
      mergeAuthorized: false as const, deploymentAuthorized: false as const,
      independentlyCertified: false as const
    });
  } catch {
    return fail("uninspectable_acquisition_evidence");
  }
}
