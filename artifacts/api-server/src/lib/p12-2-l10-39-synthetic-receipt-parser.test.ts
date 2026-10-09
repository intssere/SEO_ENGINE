import assert from "node:assert/strict";
import test from "node:test";
import { parseSyntheticReceipt } from "./p12-2-l10-39-synthetic-receipt-parser.js";

const image = "ghcr.io/intssere/seo-engine@sha256:" + "a".repeat(64);
const other = "ghcr.io/intssere/seo-engine@sha256:" + "b".repeat(64);
const lines = [
  "BEGIN_SYNTHETIC_RELEASE_RECEIPT_V1",
  "source_sha=" + "1".repeat(40),
  "source_tree=" + "2".repeat(40),
  "image=" + image,
  "platform=linux/amd64",
  "target=runtime",
  "END_SYNTHETIC_RELEASE_RECEIPT_V1",
];
const parse = (l: string[], digest=image) => parseSyntheticReceipt(l.join("\n"), digest);
test("L10.39 parses exact synthetic match without side effects", () => {
  assert.deepEqual(parse(lines), {ok:true,source_sha:"1".repeat(40),source_tree:"2".repeat(40),image,platform:"linux/amd64",target:"runtime",digest_match:true});
  assert.deepEqual(parse(lines,other), {...parse(lines), digest_match:false});
});
test("L10.39 rejects missing and duplicate envelope boundaries", () => {
  assert.deepEqual(parse(lines.slice(1)), {ok:false,code:"INVALID_ENVELOPE"});
  assert.deepEqual(parse([...lines,lines.at(-1)!]), {ok:false,code:"INVALID_ENVELOPE"});
});
test("L10.39 rejects ambiguity and unknown/redacted fields without exposing them", () => {
  assert.deepEqual(parse([...lines.slice(0,-1),lines[1]!,lines.at(-1)!]), {ok:false,code:"AMBIGUOUS_RECEIPT"});
  assert.deepEqual(parse(lines.map(s => s.startsWith("image=") ? "image=[REDACTED]" : s)), {ok:false,code:"INVALID_RECEIPT"});
  assert.deepEqual(parse(lines.map(s => s.startsWith("target=") ? "authorization=synthetic-placeholder" : s)), {ok:false,code:"INVALID_RECEIPT"});
});
test("L10.39 rejects mismatched namespace, hashes, platform, target, and control bytes", () => {
  for (const sample of [
    lines.map(s=>s.replace("ghcr.io/intssere/seo-engine@","ghcr.io/intssere/other@")),
    lines.map(s=>s.replace("1".repeat(40),"f".repeat(39))),
    lines.map(s=>s.replace("linux/amd64","linux/arm64")),
    lines.map(s=>s.replace("target=runtime","target=builder")),
    lines.map(s=>s.replace("target=runtime","target=runtime\x1b")),
  ]) assert.equal(parse(sample).ok,false);
  assert.deepEqual(parse(lines,"sha256:"+"a".repeat(64)),{ok:false,code:"INVALID_ENVELOPE"});
});
