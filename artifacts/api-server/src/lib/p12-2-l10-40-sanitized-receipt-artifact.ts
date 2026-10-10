import { parseSyntheticReceipt } from "./p12-2-l10-39-synthetic-receipt-parser.js";

/** Offline only. Never accepts raw GitHub job logs or credentials. */
export type SanitizedArtifactResult =
  | { ok: true; artifact: Readonly<{schema: "p12-2-l10-40-sanitized-receipt-v1";source_sha:string;source_tree:string;image:string;platform:"linux/amd64";target:"runtime"}> }
  | { ok: false; code: "INVALID_INPUT" | "INVALID_RECEIPT" };

const digestPattern = /^ghcr\.io\/intssere\/seo-engine@sha256:[0-9a-f]{64}$/;
export function buildSanitizedReceiptArtifact(input: unknown): SanitizedArtifactResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {ok:false,code:"INVALID_INPUT"};
  const x = input as Record<string,unknown>;
  const keys=Object.keys(x).sort();
  if (JSON.stringify(keys)!==JSON.stringify(["image","source_sha","source_tree"].sort()) ||
      typeof x.image!=="string" || typeof x.source_sha!=="string" || typeof x.source_tree!=="string" ||
      !digestPattern.test(x.image)) return {ok:false,code:"INVALID_INPUT"};
  const synthetic=[
    "BEGIN_SYNTHETIC_RELEASE_RECEIPT_V1",
    "source_sha="+x.source_sha,
    "source_tree="+x.source_tree,
    "image="+x.image,
    "platform=linux/amd64",
    "target=runtime",
    "END_SYNTHETIC_RELEASE_RECEIPT_V1",
  ].join("\n");
  const parsed=parseSyntheticReceipt(synthetic,x.image);
  if (!parsed.ok || !parsed.digest_match) return {ok:false,code:"INVALID_RECEIPT"};
  return {ok:true,artifact:Object.freeze({schema:"p12-2-l10-40-sanitized-receipt-v1",source_sha:parsed.source_sha,source_tree:parsed.source_tree,image:parsed.image,platform:parsed.platform,target:parsed.target})};
}
