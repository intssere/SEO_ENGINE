import {createHash} from "node:crypto";

/**
 * INT-02B read-only disposable catalog comparison.
 * The reference must be captured from an independently installed, pinned SQL fixture.
 * Never use the target snapshot as its own reference, or treat this as historical
 * migration provenance, database authorization, or permission to execute SQL.
 */
const KINDS=Object.freeze(["columns","constraints","indexes","triggers"]);
const canonical=(value)=>JSON.stringify(value);
export function fingerprintCatalog(snapshot){
  return createHash("sha256").update(canonical(snapshot)).digest("hex");
}
export function normalizeCatalogEvidence(raw){
  if(!raw || typeof raw!=="object" || Array.isArray(raw))throw new TypeError("invalid_catalog");
  const result={};
  for(const kind of KINDS){
    if(!Array.isArray(raw[kind])||raw[kind].length===0)throw new TypeError("missing_catalog_"+kind);
    const entries=raw[kind].map(item=>{
      if(!item||typeof item!=="object"||Array.isArray(item))throw new TypeError("malformed_catalog_"+kind);
      const keys=Object.keys(item).sort();
      if(keys.length===0||keys.some(key=>typeof item[key]!=="string"||item[key].length===0))throw new TypeError("malformed_catalog_"+kind);
      return Object.fromEntries(keys.map(key=>[key,item[key]]));
    });
    const serialized=entries.map(canonical).sort();
    if(new Set(serialized).size!==serialized.length)throw new TypeError("duplicate_catalog_"+kind);
    result[kind]=serialized;
  }
  return result;
}
export function compareCatalogEvidence({observed,reference,referenceProvenance}={}){
  if(referenceProvenance!=="pinned_disposable_sql_installation")return {verified:false,reason:"reference_provenance_unverified"};
  let actual,expected;
  try{
    actual=normalizeCatalogEvidence(observed);
    expected=normalizeCatalogEvidence(reference);
  }catch{return {verified:false,reason:"catalog_evidence_invalid"};}
  for(const kind of KINDS){
    if(canonical(actual[kind])!==canonical(expected[kind]))
      return {verified:false,reason:"catalog_"+kind+"_mismatch"};
  }
  return {verified:true,reason:"disposable_catalog_equivalent",fingerprint:fingerprintCatalog(actual)};
}
export function refuseCatalogExecution(){return {admitted:false,reason:"catalog_observation_only"};}
