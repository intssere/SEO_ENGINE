/**
 * L10.39: pure offline parser. Caller must supply a trusted, already isolated
 * synthetic envelope. This module neither retrieves nor logs job content.
 */
export type ReceiptDecision =
  | { ok: true; source_sha: string; source_tree: string; image: string; platform: "linux/amd64"; target: "runtime"; digest_match: boolean }
  | { ok: false; code: "INVALID_ENVELOPE" | "INVALID_RECEIPT" | "AMBIGUOUS_RECEIPT" };
const exactImage = /^ghcr\.io\/intssere\/seo-engine@sha256:[0-9a-f]{64}$/;
const exactSha = /^[0-9a-f]{40}$/;
const FIELDS = ["source_sha", "source_tree", "image", "platform", "target"] as const;

/** Deliberately synthetic strict envelope; no GitHub log format is assumed. */
export function parseSyntheticReceipt(envelope: unknown, targetDigest: string): ReceiptDecision {
  const deny = (code: "INVALID_ENVELOPE" | "INVALID_RECEIPT" | "AMBIGUOUS_RECEIPT"): ReceiptDecision => ({ ok: false, code });
  if (typeof envelope !== "string" || envelope.length > 8192 || envelope.includes("\r") ||
      /[\x00-\x08\x0b-\x1f\x7f\x1b]/.test(envelope) ||
      !exactImage.test(targetDigest)) return deny("INVALID_ENVELOPE");
  const lines = envelope.split("\n");
  if (lines[0] !== "BEGIN_SYNTHETIC_RELEASE_RECEIPT_V1" ||
      lines.at(-1) !== "END_SYNTHETIC_RELEASE_RECEIPT_V1") return deny("INVALID_ENVELOPE");
  const inner = lines.slice(1, -1);
  if (inner.length !== FIELDS.length) return deny("AMBIGUOUS_RECEIPT");
  const values = new Map<string, string>();
  for (const line of inner) {
    const separator = line.indexOf("=");
    if (separator < 1) return deny("INVALID_RECEIPT");
    const key = line.slice(0, separator);
    const value = line.slice(separator + 1);
    if (!FIELDS.some(field => field === key)) return deny("INVALID_RECEIPT");
    if (values.has(key)) return deny("AMBIGUOUS_RECEIPT");
    values.set(key, value);
  }
  const source_sha = values.get("source_sha") ?? "";
  const source_tree = values.get("source_tree") ?? "";
  const image = values.get("image") ?? "";
  if (!exactSha.test(source_sha) || !exactSha.test(source_tree) ||
      !exactImage.test(image) || values.get("platform") !== "linux/amd64" ||
      values.get("target") !== "runtime") return deny("INVALID_RECEIPT");
  return { ok: true, source_sha, source_tree, image, platform: "linux/amd64", target: "runtime", digest_match: image === targetDigest };
}
