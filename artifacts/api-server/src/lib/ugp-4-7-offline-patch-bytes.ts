/**
 * UGP-4.7 offline single-file proposed patch proof.
 * No Git provider observation, actual Git patch application or permission to write.
 */
import { createHash } from "node:crypto";
import { reviewUGP47ReadChainWithBlob } from "./ugp-4-7-read-blob-cross-evidence.js";

const MAX_JSON = 262144;
const MAX_BYTES = 65536;
const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const sha1 = (b: Buffer) => createHash("sha1").update(b).digest("hex");
const deny = (reason: string) => Object.freeze({
  status: "INCOMPLETE_OR_UNSAFE" as const, issues: Object.freeze([reason]),
  gitReadAuthorized: false as const, gitWriteAuthorized: false as const,
  mergeAuthorized: false as const, deploymentAuthorized: false as const,
  independentlyCertified: false as const
});
type Obj = Record<string,unknown>;
const exact = (x: unknown, keys: readonly string[]): x is Obj =>
  x !== null && typeof x === "object" && !Array.isArray(x) &&
  Object.keys(x).length === keys.length && keys.every(k => Object.hasOwn(x,k));
function parse(input: unknown): Obj {
  if (typeof input !== "string" || input.length === 0 || input.length > MAX_JSON ||
      Buffer.byteLength(input,"utf8") > MAX_JSON) throw Error("oversized_or_unserialized");
  const x: unknown = JSON.parse(input);
  if (!exact(x, Object.keys(x && typeof x === "object" && !Array.isArray(x) ? x : {})))
    throw Error("invalid_object");
  if (JSON.stringify(x) !== input) throw Error("ambiguous_serialization");
  return x;
}
function decode(x: unknown): Buffer {
  if (typeof x !== "string" || x.length > Math.ceil(MAX_BYTES/3)*4 ||
      x.length % 4 !== 0 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(x))
    throw Error("invalid_base64");
  const bytes=Buffer.from(x,"base64");
  if (bytes.length>MAX_BYTES || bytes.toString("base64")!==x) throw Error("invalid_content_bytes");
  return bytes;
}
const blobOid=(bytes: Buffer) => sha1(Buffer.concat([
  Buffer.from("blob "+bytes.length+"\u0000"),bytes
]));

/**
 * Proposed content is complete replacement bytes, NOT a unified diff.
 * Patch digest protocol: SHA-256 over JSON.stringify of exactly this ordered record:
 * {repositoryId,baseSha,path,expectedBlobSha,beforeDigest,afterDigest,workingBranch}.
 */
export function reviewUGP47OfflinePatchBytes(chainJSON: unknown, blobJSON: unknown, proposalJSON: unknown) {
  try {
    const joined=reviewUGP47ReadChainWithBlob(chainJSON,blobJSON);
    if(joined.status!=="STRUCTURALLY_CONSISTENT_UNVERIFIED")
      return deny("invalid_baseline_chain_and_blob");
    const chain=parse(chainJSON), blob=parse(blobJSON), proposal=parse(proposalJSON);
    if(!exact(proposal,["repositoryId","baseSha","path","workingBranch","beforeBase64","afterBase64"]) ||
       !exact(chain.patch,["repositoryId","expectedBaseSha","path","expectedBlobSha",
         "beforeDigest","afterDigest","patchDigest","workingBranch"]) ||
       !exact(chain.read,["repositoryId","baseRef","baseSha","path","mode","blobSha","contentDigest"]) ||
       !exact(blob,["repositoryId","baseSha","path","mode","blobSha","contentSha256","contentBase64"]))
      return deny("unexpected_patch_or_evidence_shape");
    const patch=chain.patch,read=chain.read;
    if(proposal.repositoryId!==read.repositoryId || proposal.baseSha!==read.baseSha ||
       proposal.path!==read.path || proposal.workingBranch!==patch.workingBranch ||
       patch.expectedBaseSha!==proposal.baseSha || patch.expectedBlobSha!==read.blobSha ||
       patch.beforeDigest!==read.contentDigest)
      return deny("patch_identity_or_expected_baseline_drift");
    const before=decode(proposal.beforeBase64),after=decode(proposal.afterBase64);
    if(proposal.beforeBase64!==blob.contentBase64 ||
       sha256(before)!==read.contentDigest || blobOid(before)!==read.blobSha)
      return deny("baseline_bytes_do_not_match_read");
    if(after.equals(before) || sha256(after)!==patch.afterDigest)
      return deny("missing_or_mismatched_proposed_change");
    const digest=sha256(JSON.stringify({
      repositoryId:proposal.repositoryId,baseSha:proposal.baseSha,path:proposal.path,
      expectedBlobSha:read.blobSha,beforeDigest:read.contentDigest,
      afterDigest:sha256(after),workingBranch:proposal.workingBranch
    }));
    if(digest!==patch.patchDigest)
      return deny("deterministic_patch_fingerprint_mismatch");
    return Object.freeze({
      status:"STRUCTURALLY_CONSISTENT_UNVERIFIED" as const,
      issues:Object.freeze([] as string[]),
      proposedPatchDigest:digest, proposedAfterBlobSha:blobOid(after),
      beforeBytes:before.length, afterBytes:after.length,
      gitReadAuthorized:false as const, gitWriteAuthorized:false as const,
      mergeAuthorized:false as const, deploymentAuthorized:false as const,
      independentlyCertified:false as const
    });
  } catch {
    return deny("uninspectable_or_ambiguous_patch_input");
  }
}
