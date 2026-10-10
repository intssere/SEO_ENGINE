import { createHash, timingSafeEqual } from "node:crypto";
import { buildOfflineReleaseReceiptPayload } from "./p12-2-l10-44-offline-receipt-payload.js";

/** Offline-only byte integrity check; no provenance or signature assertions. */
export function verifyOfflineReleaseReceiptPayload(bytes: Uint8Array, expectedSha256: string): boolean {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > 2048 || bytes.byteLength === 0 ||
      !/^[0-9a-f]{64}$/.test(expectedSha256)) return false;
  const actual = createHash("sha256").update(bytes).digest();
  const expected = Buffer.from(expectedSha256, "hex");
  if (!timingSafeEqual(actual, expected)) return false;
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const receipt = JSON.parse(decoded) as unknown;
    if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) return false;
    const x = receipt as Record<string, unknown>;
    if (JSON.stringify(Object.keys(x)) !== JSON.stringify(["schema","source_sha","source_tree","image","platform","target"]) ||
        x.schema !== "p12-2-l10-40-sanitized-receipt-v1" || x.platform !== "linux/amd64" || x.target !== "runtime") return false;
    const canonical = buildOfflineReleaseReceiptPayload({source_sha:x.source_sha,source_tree:x.source_tree,image:x.image});
    return canonical.ok && Buffer.from(canonical.bytes).equals(Buffer.from(bytes));
  } catch { return false; }
}
