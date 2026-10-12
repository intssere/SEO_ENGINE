import {test} from "node:test";
import assert from "node:assert/strict";
import {compareCatalogEvidence,normalizeCatalogEvidence,refuseCatalogExecution} from "./int-02b-catalog-evidence.mjs";
const baseline={
 columns:[{table:"sites",column:"id",definition:"uuid NOT NULL"},{table:"sites",column:"name",definition:"text NOT NULL"}],
 constraints:[{table:"sites",name:"sites_pkey",definition:"PRIMARY KEY (id)"}],
 indexes:[{table:"sites",name:"sites_pkey",definition:"CREATE UNIQUE INDEX sites_pkey ON public.sites USING btree (id)"}],
 triggers:[{table:"authority_outreach_review_events",name:"immutable",definition:"CREATE TRIGGER immutable ...",enabled:"O"}]
};
const verify=(observed,reference=baseline,referenceProvenance="pinned_disposable_sql_installation")=>compareCatalogEvidence({observed,reference,referenceProvenance});
test("canonical equivalent order insensitive catalog passes for disposable comparison",()=>{
 const reordered={...baseline,columns:[...baseline.columns].reverse()};
 assert.equal(verify(reordered).verified,true);
 assert.equal(verify(reordered).fingerprint,verify(baseline).fingerprint);
});
for(const [kind,changed] of [
 ["columns",{table:"sites",column:"id",definition:"text NOT NULL"}],
 ["constraints",{table:"sites",name:"sites_pkey",definition:"UNIQUE (id)"}],
 ["indexes",{table:"sites",name:"sites_pkey",definition:"CREATE INDEX sites_pkey ON public.sites USING btree (id)"}],
 ["triggers",{table:"authority_outreach_review_events",name:"immutable",definition:"CREATE TRIGGER immutable ...",enabled:"D"}]
]){
 test("reject structurally altered "+kind,()=>{
  const observed={...baseline,[kind]:[changed,...baseline[kind].slice(1)]};
  assert.deepEqual(verify(observed),{verified:false,reason:"catalog_"+kind+"_mismatch"});
 });
}
test("reject unknown reference provenance",()=>assert.equal(verify(baseline,baseline,"caller_asserted").verified,false));
test("reject empty or incomplete evidence",()=>{
 assert.deepEqual(verify({...baseline,indexes:[]}),{verified:false,reason:"catalog_evidence_invalid"});
 assert.deepEqual(verify({...baseline,triggers:undefined}),{verified:false,reason:"catalog_evidence_invalid"});
});
test("reject duplicate and malformed definitions",()=>{
 assert.throws(()=>normalizeCatalogEvidence({...baseline,indexes:[baseline.indexes[0],baseline.indexes[0]]}),/duplicate_catalog_indexes/);
 assert.equal(verify({...baseline,columns:[{table:"sites",column:"id",definition:null}]}).verified,false);
});
test("no catalog evidence grants SQL execution",()=>assert.deepEqual(refuseCatalogExecution(),{admitted:false,reason:"catalog_observation_only"}));
