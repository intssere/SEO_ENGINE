import { createHash } from "node:crypto";
import { produceDryRunReleaseReceipt } from "./p12-2-l10-42-release-receipt-dry-run.js";

/** Offline-only deterministic payload. No file writes, uploads, registry or release actions. */
export type OfflineReceiptPayload =
  | { ok: true; bytes: Uint8Array; sha256: string }
  | { ok: false; code: "INVALID_BUILD_IDENTITY" };

export function buildOfflineReleaseReceiptPayload(input: unknown): OfflineReceiptPayload {
  const receipt = produceDryRunReleaseReceipt(input);
  if (!receipt.ok) return { ok: false, code: "INVALID_BUILD_IDENTITY" };
  const bytes = Buffer.from(receipt.json, "utf8");
  return { ok: true, bytes, sha256: createHash("sha256").update(bytes).digest("hex") };
}
