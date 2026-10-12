import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const manifest=JSON.parse(readFileSync(new URL("./int-02a-ugp-migration-source-map.json",import.meta.url)));
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
export function verifyDisposableApplyTrace({trace,sourceResolver}={}){
 const deny=reason=>({verified:false,reason});
 if(!Array.isArray(trace)||trace.length!==15||typeof sourceResolver!=="function")return deny("trace_missing_or_incomplete");
 const names=new Set();
 for(let i=0;i<trace.length;i++){
  const r=trace[i],number=String(i+1).padStart(4,"0");
  if(!r||r.sequence!==i+1||typeof r.filename!=="string"||!r.filename.startsWith(number+"_")||names.has(r.filename))return deny("trace_order_or_identity_invalid");
  names.add(r.filename);
  if(r.database!=="seo_engine_test"||r.status!=="psql_completed"||!/^[0-9a-f]{64}$/.test(r.sha256??""))return deny("trace_disposable_scope_invalid");
  let bytes;
  try{bytes=sourceResolver(r.filename)}catch{return deny("trace_source_unavailable");}
  if(!Buffer.isBuffer(bytes)||digest(bytes)!==r.sha256)return deny("trace_source_hash_mismatch");
  if(i>=11){
   const pinned=manifest.entries[i-11];
   if(r.filename!==pinned.candidate||r.sha256!==pinned.rawSha256)return deny("trace_integration_manifest_mismatch");
  }else if(i>=7&&r.filename.includes("_ugp_"))return deny("trace_main_namespace_collision");
 }
 return {verified:true,reason:"disposable_apply_trace_consistent_not_historical_provenance"};
}
