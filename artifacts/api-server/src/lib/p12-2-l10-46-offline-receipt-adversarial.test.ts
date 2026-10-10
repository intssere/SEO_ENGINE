import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { buildOfflineReleaseReceiptPayload } from "./p12-2-l10-44-offline-receipt-payload.js";
import { verifyOfflineReleaseReceiptPayload } from "./p12-2-l10-45-offline-receipt-integrity.js";

const identity = {source_sha:"a".repeat(40),source_tree:"b".repeat(40),image:"ghcr.io/intssere/seo-engine@sha256:"+"c".repeat(64)};
const sha = (raw: Uint8Array) => createHash("sha256").update(raw).digest("hex");
const checked = (raw: Uint8Array) => verifyOfflineReleaseReceiptPayload(raw,sha(raw));
test("L10.46 adversarial receipt mutation matrix fails closed with matching checksum", () => {
  const result=buildOfflineReleaseReceiptPayload(identity);
  assert.equal(result.ok,true);
  if (!result.ok) return;
  const original=Buffer.from(result.bytes).toString("utf8");
  const value=JSON.parse(original);
  const variants = [
    original.replace('"schema":','"schema":"fake","schema":'),
    JSON.stringify({...value, authorization:"AUTHORIZE:SECRET"})+"\n",
    JSON.stringify({...value, source_sha:"A".repeat(40)})+"\n",
    JSON.stringify({...value, source_tree:"b".repeat(39)})+"\n",
    JSON.stringify({...value, image:"ghcr.io/intssere/other@sha256:"+"c".repeat(64)})+"\n",
    JSON.stringify({...value, target:"builder"})+"\n",
    JSON.stringify({...value, platform:"linux/arm64"})+"\n",
    JSON.stringify({...value, schema:"p12-2-l10-40-sanitized-receipt-v2"})+"\n",
    JSON.stringify({...value, unexpected:null})+"\n",
    JSON.stringify({source_sha:value.source_sha,schema:value.schema,source_tree:value.source_tree,image:value.image,platform:value.platform,target:value.target})+"\n",
    original+"\n",
    original.trimEnd(),
    "\ufeff"+original,
    " "+original,
    original+"trailing",
    "x".repeat(2049),
  ];
  for(const variant of variants) assert.equal(checked(Buffer.from(variant,"utf8")),false,variant.slice(0,80));
  assert.equal(checked(Buffer.from([0xc3,0x28])),false,"invalid UTF-8");
  assert.equal(checked(Buffer.from([0xff,0xfe])),false,"binary input");
  assert.equal(verifyOfflineReleaseReceiptPayload(result.bytes,result.sha256.toUpperCase()),false);
  const mutated=Buffer.from(result.bytes);
  mutated[5]^=1;
  assert.equal(verifyOfflineReleaseReceiptPayload(mutated,result.sha256),false);
  assert.equal(checked(result.bytes),true);
});
