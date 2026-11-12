import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {verifyDisposableApplyTrace} from "./int-02b-disposable-apply-trace.mjs";
const map=JSON.parse(readFileSync(new URL("./int-02a-ugp-migration-source-map.json",import.meta.url)));
const files=["0001_core.sql","0002_auth.sql","0003_observation_evidence_schema.sql","0004_first_party_crawl_execution_state.sql","0005_p8_8_policy_mutation_reservations.sql","0006_p8_8_policy_mutation_controls.sql","0007_p8_8_policy_mutation_dispatch.sql","0008_first_party_crawl_l2_invocations.sql","0009_first_party_crawl_l2_bounded_pilot_phase.sql","0010_first_party_crawl_terminal_failure_recovery.sql","0011_first_party_crawl_expected_absence_disposition.sql",...map.entries.map(e=>e.candidate)];
const bytes=name=>readFileSync(new URL("../../lib/db/migrations/"+name,import.meta.url));
const trace=files.map((filename,i)=>({sequence:i+1,filename,database:"seo_engine_test",status:"psql_completed",sha256:createHash("sha256").update(bytes(filename)).digest("hex")}));
const check=t=>verifyDisposableApplyTrace({trace:t,sourceResolver:bytes});
test("source-bound disposable trace accepted, not historical provenance",()=>assert.deepEqual(check(trace),{verified:true,reason:"disposable_apply_trace_consistent_not_historical_provenance"}));
test("refuse missing and reordered application entries",()=>{
 assert.equal(check(trace.slice(0,-1)).verified,false);
 assert.equal(check([trace[1],trace[0],...trace.slice(2)]).verified,false);
});
test("refuse tampered hash and unknown source",()=>{
 assert.equal(check(trace.map((r,i)=>i===1?{...r,sha256:"0".repeat(64)}:r)).verified,false);
 assert.equal(check(trace.map((r,i)=>i===1?{...r,filename:"0002_absent.sql"}:r)).verified,false);
});
test("refuse forged production target and uncompleted SQL",()=>{
 assert.equal(check(trace.map((r,i)=>i===1?{...r,database:"production"}:r)).verified,false);
 assert.equal(check(trace.map((r,i)=>i===1?{...r,status:"started"}:r)).verified,false);
});
test("refuse integration original namespace replay",()=>{
 assert.equal(check(trace.map((r,i)=>i===11?{...r,filename:map.entries[0].original}:r)).verified,false);
});
