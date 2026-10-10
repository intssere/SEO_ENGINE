import assert from "node:assert/strict";
import test from "node:test";
import {C2C_PROBES,reviewUnconfiguredTrustProbe} from "./ugp-11-c2c-offline-trust-vectors.js";
test("C2-C offline matrix denies every proposed trust scenario",()=>{
 assert.equal(C2C_PROBES.length,12);
 assert.equal(new Set(C2C_PROBES.map(p=>p.id)).size,12);
 for(const probe of C2C_PROBES){
  const r=reviewUnconfiguredTrustProbe(probe);
  assert.equal(r.probeId,probe.id);
  assert.equal(r.reason,"independent_trust_unavailable");
  assert.deepEqual([r.admitted,r.issuanceAllowed,r.claimAllowed,r.dispatchAllowed],[false,false,false,false]);
 }
});
test("C2-C unknown or mutated vectors cannot become evidence",()=>{
 assert.throws(()=>reviewUnconfiguredTrustProbe({...C2C_PROBES[0]!,scenario:"outage"}),/unknown_trust_probe/);
 assert.throws(()=>reviewUnconfiguredTrustProbe({id:"malicious",domain:"runtime",scenario:"valid_assertion"}),/unknown_trust_probe/);
});
