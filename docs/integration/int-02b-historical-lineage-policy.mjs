import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
const map=JSON.parse(readFileSync(new URL("./int-02a-ugp-migration-source-map.json",import.meta.url)));
const hash=(value)=>createHash("sha256").update(value).digest("hex");
export const MAIN_HISTORY_REQUIRED=Object.freeze(Array.from({length:11},(_,i)=>String(i+1).padStart(4,"0")));
export const INTEGRATION_HISTORY_REQUIRED=Object.freeze(map.entries.map(e=>e.candidate));
/** Non-executing policy. Receipt arrays are untrusted unless backed by an independently verified source. */
export function classifyMigrationHistory({receipts,verifiedOrigin,kind}={}){
 if(verifiedOrigin!==true)return {accepted:false,reason:"history_origin_unverified"};
 if(!Array.isArray(receipts)||receipts.length===0)return {accepted:false,reason:"history_missing"};
 if(receipts.some(r=>!r||typeof r!=="object"||typeof r.filename!=="string"||typeof r.sha256!=="string"||!/^[0-9a-f]{64}$/.test(r.sha256)))return {accepted:false,reason:"malformed_receipt"};
 const names=receipts.map(r=>r.filename);
 if(new Set(names).size!==names.length)return {accepted:false,reason:"duplicate_receipt_identity"};
 if(kind!=="main_only"&&kind!=="combined")return {accepted:false,reason:"unknown_lineage_kind"};
 const originalUgp=/^00(?:08|09|10|11)_ugp_/;
 if(names.some(n=>originalUgp.test(n)))return {accepted:false,reason:"legacy_ugp_number_collision"};
 const integration=receipts.filter(r=>INTEGRATION_HISTORY_REQUIRED.includes(r.filename));
 if(kind==="main_only"&&integration.length)return {accepted:false,reason:"unexpected_integration_receipts"};
 if(kind==="combined"){
  if(integration.length!==map.entries.length)return {accepted:false,reason:"incomplete_integration_history"};
  for(const entry of map.entries){
   const actual=integration.find(r=>r.filename===entry.candidate);
   if(!actual||actual.sha256!==entry.rawSha256)return {accepted:false,reason:"integration_checksum_mismatch"};
  }
 }
 return {accepted:false,reason:"historical_main_receipts_not_yet_independently_certified"};
}

/**
 * Observation-only migration inventory. Reports shape, never certifies provenance.
 * Distinguishes original UGP numbering from the renumbered integration series.
 * A missing/ambiguous receipt must never be silently interpreted as unapplied.
 */
export function describeHistoricalLineage(receipts){
 if(!Array.isArray(receipts)||receipts.length===0)return {classification:"unknown",reason:"history_missing",admitted:false};
 if(receipts.some(r=>!r||typeof r.filename!=="string"||typeof r.sha256!=="string"||!/^[0-9a-f]{64}$/.test(r.sha256)))
  return {classification:"inconsistent",reason:"malformed_receipt",admitted:false};
 const byName=new Map();
 for(const receipt of receipts){
  if(byName.has(receipt.filename))return {classification:"inconsistent",reason:"duplicate_receipt_identity",admitted:false};
  byName.set(receipt.filename,receipt.sha256);
 }
 const original=map.entries.filter(e=>byName.has(e.original));
 const integrated=map.entries.filter(e=>byName.has(e.candidate));
 if(original.length && integrated.length)return {classification:"inconsistent",reason:"mixed_ugp_namespace",admitted:false};
 for(const entry of map.entries){
  const originalSha=byName.get(entry.original), integratedSha=byName.get(entry.candidate);
  if((originalSha&&originalSha!==entry.rawSha256)||(integratedSha&&integratedSha!==entry.rawSha256))
   return {classification:"inconsistent",reason:"ugp_checksum_mismatch",admitted:false};
 }
 if(original.length)return {classification:original.length===map.entries.length?"legacy_ugp_only":"partial",reason:"original_ugp_namespace_requires_independent_history",admitted:false};
 if(integrated.length)return {classification:integrated.length===map.entries.length?"combined_candidate":"partial",reason:"integration_history_requires_independent_main_receipts",admitted:false};
 return {classification:"main_candidate_or_unknown",reason:"main_history_requires_independent_provenance",admitted:false};
}
