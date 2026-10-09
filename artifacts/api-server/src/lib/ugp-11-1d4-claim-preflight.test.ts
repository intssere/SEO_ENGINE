import assert from "node:assert/strict";
import test from "node:test";
import { prepareAdmittedJob, type JobEnvelope, type ControlSnapshot } from "./ugp-11-1b-transport.js";
import { inspectClaimPreflight, UGP_11_D4_CAPABILITIES } from "./ugp-11-1d4-claim-preflight.js";
const hash="a".repeat(64);
const e:JobEnvelope={
 version:"ugp-11-1b-transport-v1",siteId:"site-a",tenantId:"tenant-a",
 jobClass:"signal_refresh",upstreamId:"upstream-a",upstreamFingerprint:hash,
 scopeFingerprint:hash,idempotencyKey:"key-a",slotAt:"2026-10-09T12:00:00.000Z",
 expiresAt:"2026-10-09T14:00:00.000Z",admissionId:"admit-a",
 admissionFingerprint:hash,admissionExpiresAt:"2026-10-09T13:00:00.000Z",
 controlRevision:2,controlFingerprint:hash
};
const running:ControlSnapshot={mode:"running",revision:2,fingerprint:hash};
const at="2026-10-09T12:30:00.000Z";
const job=prepareAdmittedJob(e);
test("UGP-11.1D4 never grants a claim even with fresh running snapshot",()=>{
 const result=inspectClaimPreflight(job,"worker-a",running,at);
 assert.deepEqual(result,{authorized:false,claimAllowed:false,dispatchAllowed:false,
  reason:"durable_p9_control_not_integrated",identity:job.identity});
 assert.equal(UGP_11_D4_CAPABILITIES.claim,false);
 assert.equal(UGP_11_D4_CAPABILITIES.durableP9ControlRead,false);
});
test("UGP-11.1D4 closes stale, paused, killed, draining and changed controls",()=>{
 for(const mode of ["paused","draining","drained","killed"] as const){
  assert.equal(inspectClaimPreflight(job,"worker-a",{...running,mode},at).reason,"control_closed_or_stale");
 }
 assert.equal(inspectClaimPreflight(job,"worker-a",{...running,revision:3},at).reason,"control_closed_or_stale");
 assert.equal(inspectClaimPreflight(job,"worker-a",{...running,fingerprint:"b".repeat(64)},at).reason,"control_closed_or_stale");
});
test("UGP-11.1D4 closes expiry, premature slots, invalid worker and identity",()=>{
 for(const now of ["2026-10-09T11:59:59.999Z","2026-10-09T13:00:00.000Z","bad-time"]){
  assert.equal(inspectClaimPreflight(job,"worker-a",running,now).reason,"work_window_closed");
 }
 assert.equal(inspectClaimPreflight(job,"worker space",running,at).reason,"invalid_worker");
 assert.equal(inspectClaimPreflight({...job,identity:"b".repeat(64)},"worker-a",running,at).reason,"identity_invalid");
});
