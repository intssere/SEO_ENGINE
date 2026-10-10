import { buildSanitizedReceiptArtifact } from "./p12-2-l10-40-sanitized-receipt-artifact.js";

/** Offline-only adapter for explicitly supplied, trusted build-step outputs.
 * Not wired to any workflow and cannot access logs, registry, or credentials.
 */
export type DryRunReceipt =
  | { ok:true; json:string }
  | { ok:false; code:"INVALID_BUILD_IDENTITY" };

export function produceDryRunReleaseReceipt(input: unknown): DryRunReceipt {
  const result=buildSanitizedReceiptArtifact(input);
  if(!result.ok) return {ok:false,code:"INVALID_BUILD_IDENTITY"};
  return {ok:true,json:JSON.stringify(result.artifact)+"\n"};
}
