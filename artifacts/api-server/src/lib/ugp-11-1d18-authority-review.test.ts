import assert from "node:assert/strict";
import test from "node:test";
import {generateKeyPairSync,sign} from "node:crypto";
import {revocationFingerprint,type RevocationEvent} from "./ugp-11-1d16-revocation-evidence.js";
import {reviewRevocationAuthorityCandidate} from "./ugp-11-1d18-authority-review.js";
const {privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const key=publicKey.export({type:"spki",format:"pem"}).toString();
const event:RevocationEvent={issuer:"issuer-d18",tenantId:"tenant-d18",siteId:"site-d18",
 keyId:"key-d18",eventId:"event-d18",sequence:1,previousFingerprint:"0".repeat(64),
 action:"revoke",effectiveAt:"2026-10-10T10:00:00.000Z"};
const fingerprint=revocationFingerprint(event);
const signed={event,fingerprint,signature:sign("RSA-SHA256",Buffer.from("ugp11-d16-revocation:"+fingerprint),privateKey).toString("base64url")};
const candidate={signed,fixturePublicKeyPem:key,prior:null,assertedTrustAnchorId:"anchor",
 assertedIssuerAuthorized:true,assertedSignerActive:true,assertedPolicyVersion:"policy-v1",
 assertedRevocationRegistryCurrent:true};
test("D18 signed fixture and all self-attested trust claims still deny authority",()=>{
 const r=reviewRevocationAuthorityCandidate(candidate);
 assert.equal(r.reason,"independent_revocation_authority_unavailable");
 assert.equal(r.signatureValid,true);assert.equal(r.lineageValid,true);
 assert.deepEqual([r.issuerTrusted,r.signerTrusted,r.revocationAuthoritative,r.issuanceAllowed,r.claimAllowed,r.dispatchAllowed],
 [false,false,false,false,false,false]);
});
test("D18 forged assertions, key substitutions and lineage mismatch fail closed",()=>{
 assert.equal(reviewRevocationAuthorityCandidate({...candidate,assertedSignerActive:false}).reason,"untrusted_issuer_or_signer");
 assert.equal(reviewRevocationAuthorityCandidate({...candidate,assertedIssuerAuthorized:false}).reason,"untrusted_issuer_or_signer");
 assert.equal(reviewRevocationAuthorityCandidate({...candidate,assertedRevocationRegistryCurrent:false}).reason,"untrusted_issuer_or_signer");
 const other=generateKeyPairSync("rsa",{modulusLength:2048}).publicKey.export({type:"spki",format:"pem"}).toString();
 assert.equal(reviewRevocationAuthorityCandidate({...candidate,fixturePublicKeyPem:other}).reason,"unverified_signature_or_lineage");
 assert.equal(reviewRevocationAuthorityCandidate({...candidate,prior:{issuer:event.issuer,tenantId:event.tenantId,siteId:event.siteId,keyId:event.keyId,sequence:1,fingerprint}}).reason,"unverified_signature_or_lineage");
 assert.equal(reviewRevocationAuthorityCandidate({...candidate,assertedTrustAnchorId:"invalid anchor"}).reason,"invalid_evidence");
});
