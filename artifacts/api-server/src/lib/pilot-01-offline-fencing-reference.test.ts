import assert from "node:assert/strict";
import test from "node:test";
import {OfflineFencingReference} from "./pilot-01-offline-fencing-reference.js";
/** All scenarios are synchronous synthetic characterizations; NOT PostgreSQL race evidence. */
test("F01: only one active claim; takeover increments generation",()=>{
 const m=new OfflineFencingReference();assert.equal(m.register("job"),true);
 const a=m.claim("job","A",100,10)!;
 assert.equal(a.generation,1);assert.equal(m.claim("job","B",101,10),null);
 const b=m.claim("job","B",110,10)!;assert.equal(b.generation,2);
 assert.equal(m.snapshot("job")?.owner,"B");
});
test("F02/F03: late worker cannot commit; newer worker completes once",()=>{
 const m=new OfflineFencingReference();m.register("job");
 const a=m.claim("job","A",100,10)!;const b=m.claim("job","B",110,10)!;
 assert.equal(m.commit(a,111,"stale"),false);
 assert.equal(m.commit(b,111,"valid"),true);
 assert.equal(m.commit(a,111,"overwrite"),false);
 assert.equal(m.commit(b,111,"again"),false);
 assert.equal(m.snapshot("job")?.result,"valid");
});
test("R02: lease renewal rejects expired or superseded owner",()=>{
 const m=new OfflineFencingReference();m.register("job");
 const a=m.claim("job","A",100,10)!;
 const renewed=m.renew(a,105,15)!;
 assert.equal(renewed.expiresAtMs,120);
 assert.equal(m.claim("job","B",115,10),null);
 const b=m.claim("job","B",120,10)!;
 assert.equal(m.renew(a,121,10),null);
 assert.equal(m.commit(a,121,"stale"),false);
 assert.equal(m.commit(b,121,"ok"),true);
});
test("fail closed for invalid clocks, ttl, owner, and terminal job",()=>{
 const m=new OfflineFencingReference();
 assert.equal(m.register(""),false);assert.equal(m.register("x"),true);assert.equal(m.register("x"),false);
 assert.equal(m.claim("x","",0,1),null);
 assert.equal(m.claim("x","A",NaN,1),null);
 assert.equal(m.claim("x","A",0,0),null);
 assert.equal(m.claim("x","A",0,Infinity),null);
 const a=m.claim("x","A",0,10)!;
 assert.equal(m.commit(a,10,"expired"),false);
 assert.equal(m.commit(a,9,"valid"),true);
 assert.equal(m.claim("x","B",11,10),null);
});
