import assert from "node:assert/strict";
import test from "node:test";
import {generateKeyPairSync,sign} from "node:crypto";
import postgres from "postgres";
import {revocationFingerprint,type RevocationEvent} from "./ugp-11-1d16-revocation-evidence.js";
import {Ugp11RevocationFixtureJournal} from "./ugp-11-1d17-revocation-journal.js";
const {publicKey,privateKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const pem=publicKey.export({type:"spki",format:"pem"}).toString();
const base:RevocationEvent={issuer:"d17-issuer",tenantId:"d17-tenant",siteId:"d17-site",
 keyId:"d17-key",eventId:"d17-first",sequence:1,previousFingerprint:"0".repeat(64),
 action:"revoke",effectiveAt:"2026-10-10T10:00:00.000Z"};
function signed(event:RevocationEvent){
 const fingerprint=revocationFingerprint(event);
 return {event,fingerprint,signature:sign("RSA-SHA256",
  Buffer.from("ugp11-d16-revocation:"+fingerprint),privateKey).toString("base64url")};
}
test("D17 refuses non-disposable database",()=>{
 assert.throws(()=>new Ugp11RevocationFixtureJournal("postgres://root:pwd@example.org/production"),/disposable_database_only/);
});
test("D17 concurrent duplicate submissions and exact replay fail closed",async t=>{
 const url=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!url){t.skip("disposable database URL not present");return;}
 const store=new Ugp11RevocationFixtureJournal(url),db=postgres(url,{max:2,prepare:false});
 t.after(async()=>{await store.close();await db.end({timeout:2});});
 const first=signed(base);
 const outcomes=await Promise.all([store.append(first,pem),store.append(first,pem)]);
 assert.deepEqual(outcomes.map(x=>x.kind).sort(),["appended","exact_replay"]);
 assert.ok(outcomes.every(x=>!x.keyTrusted&&!x.issuanceAllowed&&!x.claimAllowed&&!x.dispatchAllowed));
 assert.equal((await store.append(first,pem)).kind,"exact_replay");
 const next=signed({...base,eventId:"d17-second",sequence:2,
  previousFingerprint:first.fingerprint,action:"retire"});
 assert.equal((await store.append(next,pem)).kind,"appended");
 assert.equal((await store.append(next,pem)).kind,"exact_replay");
 const fork=signed({...base,eventId:"d17-fork",sequence:2,
  previousFingerprint:first.fingerprint,action:"rotate"});
 assert.equal((await store.append(fork,pem)).kind,"conflict");
 assert.equal((await store.append({...first,signature:"abc"},pem)).kind,"invalid_signature");
 const rows=await db`SELECT COUNT(*)::int AS n FROM ugp11_transport_fixture.revocation_events
   WHERE issuer='d17-issuer' AND tenant_id='d17-tenant'`;
 assert.equal(rows[0]?.n,2);
 await assert.rejects(db`UPDATE ugp11_transport_fixture.revocation_events SET action='rotate'
   WHERE issuer='d17-issuer'`,/revocation_events_append_only/);
 await assert.rejects(db`DELETE FROM ugp11_transport_fixture.revocation_events
   WHERE issuer='d17-issuer'`,/revocation_events_append_only/);
 const controls=await db`SELECT COUNT(*)::int AS n FROM ugp11_transport_fixture.controls
  WHERE tenant_id='d17-tenant'`;
 assert.equal(controls[0]?.n,0);
});
