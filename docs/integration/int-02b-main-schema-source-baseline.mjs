import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const files=[
"0001_core.sql","0002_auth.sql","0003_observation_evidence_schema.sql",
"0004_first_party_crawl_execution_state.sql","0005_p8_8_policy_mutation_reservations.sql",
"0006_p8_8_policy_mutation_controls.sql","0007_p8_8_policy_mutation_dispatch.sql",
"0008_first_party_crawl_l2_invocations.sql","0009_first_party_crawl_l2_bounded_pilot_phase.sql",
"0010_first_party_crawl_terminal_failure_recovery.sql",
"0011_first_party_crawl_expected_absence_disposition.sql"];
const names=[];
for(const filename of files){
 const sql=readFileSync(new URL("../../lib/db/migrations/"+filename,import.meta.url),"utf8");
 for(const match of sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z_0-9]*)\s*\(/gi))names.push(match[1]);
}
assert.equal(names.length,49,"pinned main migration source must define exactly 49 tables");
assert.equal(new Set(names).size,49,"duplicate table names in migration source");
export const PINNED_MAIN_TABLES=Object.freeze([...names].sort());
