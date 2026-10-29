/**
 * UGP-4.7 provider-free cross-check between the full Git claim chain and
 * independently hashed captured read bytes. No provider authenticity inferred.
 */
import { createHash } from "node:crypto";
import { reviewUGP47GitEvidence } from "./ugp-4-7-offline-git-evidence.js";
import { attestUGP47CapturedBlob } from "./ugp-4-7-offline-blob-read-proof.js";

const MAX_CHAIN_CHARS = 262144;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const deny = (issue: string) => Object.freeze({
  status: "INCOMPLETE_OR_UNSAFE" as const,
  issues: Object.freeze([issue]),
  gitReadAuthorized: false as const,
  gitWriteAuthorized: false as const,
  mergeAuthorized: false as const,
  deploymentAuthorized: false as const,
  independentlyCertified: false as const
});

/** Strings only; each parser performs its own bounded validation. */
export function reviewUGP47ReadChainWithBlob(chainJSON: unknown, blobReceiptJSON: unknown) {
  try {
    const chain = reviewUGP47GitEvidence(chainJSON);
    const blob = attestUGP47CapturedBlob(blobReceiptJSON);
    if (chain.status !== "STRUCTURALLY_CONSISTENT_UNVERIFIED")
      return deny("invalid_git_evidence_chain");
    if (blob.status !== "STRUCTURALLY_CONSISTENT_UNVERIFIED")
      return deny("invalid_blob_read_receipt");
    // The original chain preflight has already verified the exact shape of
    // 'read', all relevant IDs, and the patch's expected blob/digest linkage.
    if (typeof chainJSON !== "string" || chainJSON.length > MAX_CHAIN_CHARS)
      return deny("invalid_git_evidence_chain");
    const parsed = JSON.parse(chainJSON) as {read: {
      repositoryId: number; baseSha: string; path: string;
      mode: string; blobSha: string; contentDigest: string;
    }};
    const read = parsed.read;
    if (read.repositoryId !== blob.repositoryId ||
        read.baseSha !== blob.baseSha ||
        read.path !== blob.path ||
        read.mode !== blob.mode ||
        read.blobSha !== blob.blobSha ||
        read.contentDigest !== blob.contentSha256)
      return deny("read_blob_cross_evidence_mismatch");
    const receiptDigest = sha256(JSON.stringify({
      chainDigest: chain.evidenceDigest,
      repositoryId: blob.repositoryId, baseSha: blob.baseSha,
      path: blob.path, mode: blob.mode,
      blobSha: blob.blobSha, contentSha256: blob.contentSha256,
      byteLength: blob.byteLength
    }));
    return Object.freeze({
      status: "STRUCTURALLY_CONSISTENT_UNVERIFIED" as const,
      issues: Object.freeze([] as string[]),
      evidenceDigest: receiptDigest,
      gitReadAuthorized: false as const, gitWriteAuthorized: false as const,
      mergeAuthorized: false as const, deploymentAuthorized: false as const,
      independentlyCertified: false as const
    });
  } catch {
    return deny("uninspectable_git_blob_cross_evidence");
  }
}
