import assert from "node:assert/strict";
import test from "node:test";
import {generateKeyPairSync} from "node:crypto";
import {reviewFixtureJwksKeyLifecycle,type FixtureKeyLifecycle} from "./ugp-11-1d15-jwks-lifecycle.js";
const {publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const jwk=publicKey.export({format:"jwk"}) as {kty:string;n:string;e:string};
const valid:FixtureKeyLifecycle={
 issuer:"issuer-a",tenantId:"tenant-a",siteId:"site-a",keyId:"key-a",
 state:"active",epoch:1,validFrom:"2026-10-09T10:00:00.000Z",
 validUntil:"2026-10-12T10:00:00.000Z",observedAt:"2026-10-10T10:00:00.000Z",
 provenance:"fixture_only",jwk:{kty:"RSA",alg:"RS256",use:"sig",kid:"key-a",n:jwk.n,e:jwk.e}
};
test("D15 active valid-looking fixture RSA key remains untrusted",()=>{
 const r=reviewFixtureJwksKeyLifecycle(valid);
 assert.equal(r.reason,"untrusted_key_provenance");
 assert.match(r.fingerprint??"",/^[0-9a-f]{64}$/);
 assert.equal(r.keyMaterialWellFormed,true);
 assert.deepEqual([r.keyTrusted,r.issuanceAllowed,r.claimAllowed,r.dispatchAllowed],[false,false,false,false]);
});
test("D15 revocation, rotation and retirement fail closed",()=>{
 for(const state of ["revoked","retired","rotating"] as const){
  const r=reviewFixtureJwksKeyLifecycle({...valid,state});
  assert.equal(r.reason,"revoked_or_inactive");
  assert.equal(r.keyTrusted,false);
 }
});
test("D15 rejects key substitutions, malformed RSA, expiration and invalid epoch",()=>{
 assert.equal(reviewFixtureJwksKeyLifecycle({...valid,jwk:{...valid.jwk,kid:"wrong"}}).reason,"scope_or_key_mismatch");
 assert.equal(reviewFixtureJwksKeyLifecycle({...valid,jwk:{...valid.jwk,n:"broken"}}).reason,"invalid_key_material");
 assert.equal(reviewFixtureJwksKeyLifecycle({...valid,validUntil:valid.observedAt}).reason,"expired_or_not_yet_active");
 assert.equal(reviewFixtureJwksKeyLifecycle({...valid,validFrom:"2026-10-11T00:00:00.000Z"}).reason,"expired_or_not_yet_active");
 assert.equal(reviewFixtureJwksKeyLifecycle({...valid,epoch:-1}).reason,"invalid_record");
 assert.equal(reviewFixtureJwksKeyLifecycle({...valid,provenance:"trusted" as "fixture_only"}).reason,"invalid_record");
});
test("D15 rotation epoch is included in fingerprint without granting authority",()=>{
 const a=reviewFixtureJwksKeyLifecycle(valid);
 const b=reviewFixtureJwksKeyLifecycle({...valid,epoch:2});
 assert.notEqual(a.fingerprint,b.fingerprint);
 assert.equal(b.issuanceAllowed,false);
});
