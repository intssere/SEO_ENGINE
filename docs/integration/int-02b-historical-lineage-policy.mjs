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
