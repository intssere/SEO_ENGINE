/** INT-02B read-only historical receipt intake. Never authorizes SQL. */
import {readFileSync} from "node:fs";
const mapped=JSON.parse(readFileSync(new URL("./int-02a-ugp-migration-source-map.json",import.meta.url)));
const canonical=new Set([
 "0001_core.sql",
 "0002_auth.sql",
 "0003_observation_evidence_schema.sql",
 "0004_first_party_crawl_execution_state.sql",
 "0005_p8_8_policy_mutation_reservations.sql",
 "0006_p8_8_policy_mutation_controls.sql",
 "0007_p8_8_policy_mutation_dispatch.sql",
 "0008_first_party_crawl_l2_invocations.sql",
 "0009_first_party_crawl_l2_bounded_pilot_phase.sql",
 "0010_first_party_crawl_terminal_failure_recovery.sql",
 "0011_first_party_crawl_expected_absence_disposition.sql",
 ...mapped.entries.map(e=>e.candidate)
]);

const HEX=/^[0-9a-f]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/;
const validUtc=value=>typeof value==="string"&&UTC.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,19)===value.slice(0,19);
const deny=(reason)=>({reviewEligible:false,executionAuthorized:false,reason});
export function inspectHistoricalReceiptBundle(bundle){
 if(!bundle||typeof bundle!=="object"||Array.isArray(bundle))return deny("bundle_missing");
 if(bundle.schemaVersion!=="int02b-historical-receipts-v1")return deny("bundle_schema_unsupported");
 if(!Array.isArray(bundle.receipts)||bundle.receipts.length===0)return deny("receipts_missing");
 if(typeof bundle.sourceCommit!=="string"||!/^[0-9a-f]{40}$/.test(bundle.sourceCommit))return deny("source_commit_missing");
 if(!bundle.target||typeof bundle.target!=="object"||!["projectId","environmentId","serviceId","database"].every(k=>typeof bundle.target[k]==="string"&&bundle.target[k].trim()))return deny("target_identity_incomplete");
 const seen=new Set();
 const sequence=new Set();
 let preceding=0;
 for(const r of bundle.receipts){
  if(!r||typeof r.filename!=="string"||!/^[0-9]{4}_[a-z0-9_]+\.sql$/.test(r.filename)||seen.has(r.filename))return deny("receipt_identity_invalid");
  seen.add(r.filename);
  if(!canonical.has(r.filename))return deny("receipt_not_canonical_integration_migration");
  const ordinal=Number(r.filename.slice(0,4));
  if(ordinal<1||ordinal>15||ordinal<=preceding||sequence.has(ordinal))return deny("receipt_sequence_invalid");
  preceding=ordinal;
  sequence.add(ordinal);
  if(typeof r.sha256!=="string"||!HEX.test(r.sha256)||typeof r.appliedAtUtc!=="string"||!validUtc(r.appliedAtUtc))return deny("receipt_evidence_incomplete");
 }
 if(bundle.receipts.some(r=>/^00(?:08|09|10|11)_ugp_/.test(r.filename)))return deny("legacy_ugp_namespace_collision");
 if(!bundle.witness||typeof bundle.witness.immutableReference!=="string"||!bundle.witness.immutableReference.trim()||typeof bundle.witness.attestor!=="string"||!bundle.witness.attestor.trim())return deny("independent_witness_not_supplied");
 // The bundle is untrusted input; this module has no witness-key, DB, or provider access.
 return deny("independent_witness_not_authenticated");
}
