import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {classifyMigrationHistory,describeHistoricalLineage} from "./int-02b-historical-lineage-policy.mjs";
const map=JSON.parse(readFileSync(new URL("./int-02a-ugp-migration-source-map.json",import.meta.url)));
const receipts=map.entries.map(e=>({filename:e.candidate,sha256:e.rawSha256}));
const check=(input,reason)=>assert.deepEqual(classifyMigrationHistory(input),{accepted:false,reason});
test("history source must be independently verified",()=>check({receipts,kind:"combined"},"history_origin_unverified"));
test("missing receipts reject",()=>check({receipts:[],verifiedOrigin:true,kind:"combined"},"history_missing"));
test("historical UGP 0008 collision refuses",()=>check({receipts:[{filename:map.entries[0].original,sha256:map.entries[0].rawSha256}],verifiedOrigin:true,kind:"combined"},"legacy_ugp_number_collision"));
test("duplicate receipt rejects",()=>check({receipts:[receipts[0],receipts[0]],verifiedOrigin:true,kind:"combined"},"duplicate_receipt_identity"));
test("checksum mismatch refuses",()=>check({receipts:receipts.map((r,i)=>i===2?{...r,sha256:"0".repeat(64)}:r),verifiedOrigin:true,kind:"combined"},"integration_checksum_mismatch"));
test("partial sequence refuses",()=>check({receipts:receipts.slice(0,3),verifiedOrigin:true,kind:"combined"},"incomplete_integration_history"));
test("even valid UGP source receipts cannot certify historical main lineage",()=>check({receipts,verifiedOrigin:true,kind:"combined"},"historical_main_receipts_not_yet_independently_certified"));

test("legacy UGP original receipts remain observable but never admitted",()=>{
 const originals=map.entries.map(e=>({filename:e.original,sha256:e.rawSha256}));
 assert.deepEqual(describeHistoricalLineage(originals),{classification:"legacy_ugp_only",reason:"original_ugp_namespace_requires_independent_history",admitted:false});
});
test("mixed original and integration namespace refuses",()=>{
 const mix=[{filename:map.entries[0].original,sha256:map.entries[0].rawSha256},receipts[1]];
 assert.equal(describeHistoricalLineage(mix).reason,"mixed_ugp_namespace");
});
test("partial integration and legacy histories cannot admit",()=>{
 assert.equal(describeHistoricalLineage(receipts.slice(0,2)).classification,"partial");
 assert.equal(describeHistoricalLineage([{filename:map.entries[0].original,sha256:map.entries[0].rawSha256}]).classification,"partial");
});
test("valid integration receipts remain only a candidate",()=>{
 assert.deepEqual(describeHistoricalLineage(receipts),{classification:"combined_candidate",reason:"integration_history_requires_independent_main_receipts",admitted:false});
});
test("checksum substitution and duplicate filenames reject",()=>{
 assert.equal(describeHistoricalLineage([{filename:map.entries[0].original,sha256:"0".repeat(64)}]).reason,"ugp_checksum_mismatch");
 assert.equal(describeHistoricalLineage([receipts[0],receipts[0]]).reason,"duplicate_receipt_identity");
});
test("unknown main-only receipts do not imply history authority",()=>{
 assert.equal(describeHistoricalLineage([{filename:"0001_core.sql",sha256:"1".repeat(64)}]).classification,"main_candidate_or_unknown");
 assert.equal(describeHistoricalLineage([]).classification,"unknown");
});
