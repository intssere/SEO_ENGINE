import assert from "node:assert/strict";
import test from "node:test";
import {OfflineFencingReference,type LeaseClaim} from "./pilot-01-offline-fencing-reference.js";

/** PILOT-01 source-only surrogate for generation-fenced effect acceptance.
 * No outbox, network, PostgreSQL, providers, live workers or external effects.
 * The simulation deliberately checks a lease on EACH effect acceptance instead
 * of relying on authorization checked only when a job was first claimed.
 */
function makeRehearsal(){
 const leases=new OfflineFencingReference();
 const receipts=new Set<string>();
 const accepted:string[]=[];
 const authorize=(lease:LeaseClaim,nowMs:number,key:string)=>{
  if(!key||receipts.has(key))return false;
  // This is a synthetic one-shot completion gate, NOT a real transactional outbox.
  if(!leases.commit(lease,nowMs,key))return false;
  receipts.add(key);
  accepted.push(key);
  return true;
 };
 return {leases,authorize,accepted,receipts};
}
test("PILOT-01 offline effect boundary: late A cannot emit after B takeover",()=>{
 const r=makeRehearsal();
 assert.equal(r.leases.register("j"),true);
 const a=r.leases.claim("j","A",100,10);
 assert.ok(a);
 const b=r.leases.claim("j","B",111,10);
 assert.ok(b);
 assert.equal(b.generation,a.generation+1);
 assert.equal(r.authorize(a,112,"effect-a"),false);
 assert.equal(r.authorize(b,112,"effect-b"),true);
 assert.deepEqual(r.accepted,["effect-b"]);
 assert.equal(r.authorize(b,113,"effect-b"),false);
 assert.equal(r.authorize(a,113,"effect-a"),false);
});
test("PILOT-01 offline effect boundary: expired lease and wrong owner are denied",()=>{
 const r=makeRehearsal();
 r.leases.register("j");
 const a=r.leases.claim("j","A",100,5);
 assert.ok(a);
 assert.equal(r.authorize(a,105,"expired"),false);
 assert.equal(r.authorize({...a,owner:"spoofed"},101,"forged"),false);
 assert.deepEqual(r.accepted,[]);
});
test("PILOT-01 offline effect boundary: duplicate key cannot create second receipt",()=>{
 const r=makeRehearsal();
 r.leases.register("one");
 r.leases.register("two");
 const one=r.leases.claim("one","A",100,20);
 const two=r.leases.claim("two","B",100,20);
 assert.ok(one);assert.ok(two);
 assert.equal(r.authorize(one,110,"same-key"),true);
 assert.equal(r.authorize(two,110,"same-key"),false);
 assert.deepEqual(r.accepted,["same-key"]);
});
