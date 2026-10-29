/**
 * UGP-4.7 offline captured GitHub read receipt; no provider/network activity.
 * Computes Git blob OID and SHA-256 from bounded caller-supplied bytes.
 * A matching hash does not authenticate repository ownership or the acquisition.
 */
import { createHash } from "node:crypto";

const MAX_FILE_BYTES = 65536;
const MAX_RECEIPT_CHARS = 131072;
const oid = /^[0-9a-f]{40}$/;
const sha256 = /^[0-9a-f]{64}$/;
const seg = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
type Dict = Record<string, unknown>;
const obj = (v: unknown): v is Dict => v !== null && typeof v === "object" && !Array.isArray(v);
const exact = (v: unknown, keys: readonly string[]): v is Dict =>
  obj(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v,k));
const pathOK = (p: unknown): p is string =>
  typeof p === "string" && p.length > 0 && p.length <= 240 &&
  !p.includes("\\") && !p.includes("%") && !p.startsWith("/") &&
  p !== ".git" && !p.startsWith(".git/") &&
  p.split("/").every(s => s !== "." && s !== ".." && seg.test(s));
const hash = (alg: "sha1" | "sha256", bytes: Buffer) => createHash(alg).update(bytes).digest("hex");
const deny = (issue: string) => Object.freeze({
  status: "INCOMPLETE_OR_UNSAFE" as const,
  issues: Object.freeze([issue]),
  gitReadAuthorized: false as const,
  gitWriteAuthorized: false as const,
  independentlyCertified: false as const
});

export function attestUGP47CapturedBlob(input: unknown) {
  try {
    if (typeof input !== "string" || input.length === 0 || input.length > MAX_RECEIPT_CHARS)
      return deny("invalid_receipt_input");
    const evidence: unknown = JSON.parse(input);
    if (!exact(evidence,["repositoryId","baseSha","path","mode","blobSha","contentSha256","contentBase64"]))
      return deny("invalid_receipt_fields");
    if (!Number.isSafeInteger(evidence.repositoryId) || (evidence.repositoryId as number) <= 0 ||
        typeof evidence.baseSha !== "string" || !oid.test(evidence.baseSha) ||
        !pathOK(evidence.path) || evidence.mode !== "100644" ||
        typeof evidence.blobSha !== "string" || !oid.test(evidence.blobSha) ||
        typeof evidence.contentSha256 !== "string" || !sha256.test(evidence.contentSha256) ||
        typeof evidence.contentBase64 !== "string" ||
        evidence.contentBase64.length > Math.ceil(MAX_FILE_BYTES / 3) * 4)
      return deny("invalid_receipt_metadata");
    const b64 = evidence.contentBase64;
    if (b64.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b64))
      return deny("noncanonical_base64");
    const bytes = Buffer.from(b64, "base64");
    if (bytes.length > MAX_FILE_BYTES || bytes.toString("base64") !== b64)
      return deny("oversized_or_noncanonical_blob");
    const computedContentDigest = hash("sha256", bytes);
    const prefix = Buffer.from("blob " + bytes.length + "\0", "utf8");
    const computedBlobSha = hash("sha1", Buffer.concat([prefix,bytes]));
    if (evidence.contentSha256 !== computedContentDigest || evidence.blobSha !== computedBlobSha)
      return deny("blob_content_digest_mismatch");
    return Object.freeze({
      status: "STRUCTURALLY_CONSISTENT_UNVERIFIED" as const,
      issues: Object.freeze([] as string[]),
      repositoryId: evidence.repositoryId as number,
      baseSha: evidence.baseSha as string,
      path: evidence.path as string,
      mode: "100644" as const,
      blobSha: computedBlobSha,
      contentSha256: computedContentDigest,
      byteLength: bytes.length,
      gitReadAuthorized: false as const,
      gitWriteAuthorized: false as const,
      independentlyCertified: false as const
    });
  } catch {
    return deny("invalid_or_uninspectable_receipt");
  }
}
