import { createHash } from "node:crypto";
import { mkdtempSync, openSync, writeFileSync, closeSync, realpathSync } from "node:fs";
import { join, resolve, sep } from "node:path";

export function projectReceipt({sourceSha,sourceTree,digest,image,runId,attempt}) {
  if (!/^[0-9a-f]{40}$/.test(sourceSha) || !/^[0-9a-f]{40}$/.test(sourceTree) ||
      !/^sha256:[0-9a-f]{64}$/.test(digest) || image !== "ghcr.io/intssere/seo-engine" ||
      !/^[1-9][0-9]*$/.test(runId) || attempt !== "1") throw new Error("INVALID_VERIFIED_BUILD_IDENTITY");
  const artifact={schema:"p12-2-l10-40-sanitized-receipt-v1",source_sha:sourceSha,source_tree:sourceTree,
    image:image+"@"+digest,platform:"linux/amd64",target:"runtime"};
  const bytes=Buffer.from(JSON.stringify(artifact)+"\n","utf8");
  return {bytes,sha256:createHash("sha256").update(bytes).digest("hex")};
}
export function writeReceipt(env) {
  const {bytes,sha256}=projectReceipt({sourceSha:env.RECEIPT_SOURCE_SHA,sourceTree:env.RECEIPT_SOURCE_TREE,
    digest:env.RECEIPT_VERIFIED_DIGEST,image:env.RECEIPT_IMAGE,runId:env.GITHUB_RUN_ID,attempt:env.GITHUB_RUN_ATTEMPT});
  if (!env.RUNNER_TEMP || !env.GITHUB_OUTPUT) throw new Error("MISSING_RUNNER_PATHS");
  const root=realpathSync(env.RUNNER_TEMP);
  const dir=mkdtempSync(join(root,"p12-2-l10-50-receipt-"));
  if (!resolve(dir).startsWith(root+sep)) throw new Error("INVALID_OUTPUT_LOCATION");
  for(const [name,data] of [["receipt.json",bytes],["receipt.sha256",Buffer.from(sha256+"  receipt.json\n")]]) {
    const fd=openSync(join(dir,name),"wx",0o600);
    try { writeFileSync(fd,data); } finally { closeSync(fd); }
  }
  const fd=openSync(env.GITHUB_OUTPUT,"a");
  try { writeFileSync(fd,"receipt_dir="+dir+"\nreceipt_sha256="+sha256+"\n"); } finally { closeSync(fd); }
  return {dir,sha256};
}
if(process.argv[1] && import.meta.url===new URL("file://"+resolve(process.argv[1])).href) writeReceipt(process.env);
