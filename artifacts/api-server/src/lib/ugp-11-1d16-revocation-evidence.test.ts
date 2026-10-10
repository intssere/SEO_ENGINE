import assert from "node:assert/strict";
import test from "node:test";
import {generateKeyPairSync,sign} from "node:crypto";
import {revocationFingerprint,reviewOfflineRevocation,type RevocationEvent} from "./ugp-11-1d16-revocation-evidence.js";
const {publicKey,privateKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const pub=publicKey.export({type:"spki",format:"pem"}).toString();
const genesis="0".repeat(64);
const base:RevocationEvent={issuer:"fixture-issuer",tenantId:"tenant-a",siteId:"site-a",
 keyId:"key-a",eventId:"event-one",sequence:1,previousFingerprint:genesis,
 action:"revoke",effectiveAt:"2026-10-10T10:00:00.000Z"};
function signed(event:RevocationEvent){
 const fingerprint=revocationFingerprint(event);
 const signature=sign("RSA-SHA256",Buffer.from("ugp11-d16-revocation:"+fingerprint),privateKey).toString("base64url");
 return {event,fingerprint,signature};
}
test("D16 authentic RSA fixture signature still does not grant trusted revocation authority",()=>{
 const r=reviewOfflineRevocation(signed(base),pub,null);
 assert.equal(r.reason,"fixture_signer_untrusted");
 assert.equal(r.signatureValid,true);assert.equal(r.lineageValid,true);
 assert.equal(r.keyTrusted,false);assert.equal(r.issuanceAllowed,false);
 assert.equal(r.claimAllowed,false);assert.equal(r.dispatchAllowed,false);
});
test("D16 rejects modification, wrong signer, and sequence replay",()=>{
 const first=signed(base);
 assert.equal(reviewOfflineRevocation({...first,event:{...base,action:"rotate"}},pub,null).reason,"invalid_event");
 const wrong=generateKeyPairSync("rsa",{modulusLength:2048}).publicKey.export({type:"spki",format:"pem"}).toString();
 assert.equal(reviewOfflineRevocation(first,wrong,null).reason,"invalid_signature");
 const prior={issuer:base.issuer,tenantId:base.tenantId,siteId:base.siteId,keyId:base.keyId,sequence:1,fingerprint:first.fingerprint};
 assert.equal(reviewOfflineRevocation(first,pub,prior).reason,"invalid_lineage");
 const next=signed({...base,eventId:"event-two",sequence:2,previousFingerprint:first.fingerprint,action:"retire"});
 assert.equal(reviewOfflineRevocation(next,pub,prior).reason,"fixture_signer_untrusted");
 assert.equal(reviewOfflineRevocation(next,pub,{...prior,siteId:"other"}).reason,"invalid_lineage");
 assert.equal(reviewOfflineRevocation(next,pub,{...prior,fingerprint:genesis}).reason,"invalid_lineage");
});
test("D16 invalid event fields always fail closed",()=>{
 assert.throws(()=>revocationFingerprint({...base,sequence:0}),/invalid_revocation_event/);
 assert.throws(()=>revocationFingerprint({...base,effectiveAt:"not-a-time"}),/invalid_revocation_event/);
 assert.equal(reviewOfflineRevocation({...signed(base),fingerprint:"a".repeat(64)},pub,null).keyTrusted,false);
});
