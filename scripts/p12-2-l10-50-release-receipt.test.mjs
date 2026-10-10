import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { projectReceipt, writeReceipt } from "./p12-2-l10-50-release-receipt.mjs";
const valid={sourceSha:"a".repeat(40),sourceTree:"b".repeat(40),digest:"sha256:"+"c".repeat(64),image:"ghcr.io/intssere/seo-engine",runId:"123",attempt:"1"};
test("L10.50 deterministic six-field sanitized receipt",()=>{
 const p=projectReceipt(valid),v=JSON.parse(p.bytes.toString());
 assert.deepEqual(Object.keys(v),["schema","source_sha","source_tree","image","platform","target"]);
 assert.equal(p.sha256,createHash("sha256").update(p.bytes).digest("hex"));
 assert.deepEqual(p.bytes,projectReceipt(valid).bytes);
 assert.equal(p.bytes.toString().includes("authorization"),false);
});
test("L10.50 reject invalid digest, source and run identity",()=>{
 for(const patch of [{sourceSha:"BAD"},{sourceTree:"bad"},{digest:"sha256:"+"f".repeat(63)},{image:"ghcr.io/intssere/other"},{runId:"0"},{attempt:"2"}]) assert.throws(()=>projectReceipt({...valid,...patch}),/INVALID_VERIFIED_BUILD_IDENTITY/);
});
test("L10.50 emit checked private files and only path/hash outputs",()=>{
 const root=mkdtempSync(join(tmpdir(),"l10-50-test-")),output=join(root,"github-output");
 writeFileSync(output,"");
 const {dir,sha256}=writeReceipt({RUNNER_TEMP:root,GITHUB_OUTPUT:output,RECEIPT_SOURCE_SHA:valid.sourceSha,RECEIPT_SOURCE_TREE:valid.sourceTree,RECEIPT_VERIFIED_DIGEST:valid.digest,RECEIPT_IMAGE:valid.image,GITHUB_RUN_ID:valid.runId,GITHUB_RUN_ATTEMPT:valid.attempt});
 assert.equal(JSON.parse(readFileSync(join(dir,"receipt.json"),"utf8")).source_sha,valid.sourceSha);
 assert.equal(readFileSync(join(dir,"receipt.sha256"),"utf8"),sha256+"  receipt.json\n");
 assert.match(readFileSync(output,"utf8"),/receipt_sha256=[0-9a-f]{64}/);
});
