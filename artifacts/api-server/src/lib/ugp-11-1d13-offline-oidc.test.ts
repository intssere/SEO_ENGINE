import assert from "node:assert/strict";
import test from "node:test";
import {generateKeyPairSync,sign} from "node:crypto";
import {reviewOfflineOidcIdentityFixture} from "./ugp-11-1d13-offline-oidc.js";
const {publicKey,privateKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const pem=publicKey.export({type:"spki",format:"pem"}).toString();
const observedAt="2026-10-10T12:00:00.000Z";
const now=Math.floor(Date.parse(observedAt)/1000);
const config={issuer:"issuer-a",audience:"audience-a",publicKeyPem:pem,expectedKeyId:"key-a",observedAt};
const b64=(v:object)=>Buffer.from(JSON.stringify(v)).toString("base64url");
function token(payload:Record<string,unknown>,header:Record<string,unknown>={alg:"RS256",typ:"JWT",kid:"key-a"}){
 const body=b64(header)+"."+b64(payload);
 return body+"."+sign("RSA-SHA256",Buffer.from(body),privateKey).toString("base64url");
}
const claims={iss:"issuer-a",aud:"audience-a",sub:"principal-a",iat:now-60,exp:now+600};
test("D13 valid RSA JWT still lacks independently established identity authority",()=>{
 const result=reviewOfflineOidcIdentityFixture(token(claims),config);
 assert.equal(result.cryptographicSignatureValid,true);
 assert.equal(result.issuerAudienceValid,true);
 assert.equal(result.reason,"offline_fixture_not_authoritative");
 assert.equal(result.identityTrusted,false);
 assert.equal(result.permissionGranted,false);
 assert.equal(result.issuanceAllowed,false);
 assert.equal(result.claimAllowed,false);
 assert.equal(result.dispatchAllowed,false);
});
test("D13 rejects invalid signature, missing signature, and unsigned or header-selected keys",()=>{
 const signed=token(claims);
 assert.equal(reviewOfflineOidcIdentityFixture(signed.slice(0,-3)+"xyz",config).reason,"invalid_signature");
 assert.equal(reviewOfflineOidcIdentityFixture("abc.def.",config).reason,"malformed_token");
 assert.equal(reviewOfflineOidcIdentityFixture(token(claims,{alg:"none",typ:"JWT",kid:"key-a"}),config).reason,"untrusted_algorithm");
 assert.equal(reviewOfflineOidcIdentityFixture(token(claims,{alg:"RS256",typ:"JWT",kid:"key-a",jku:"https://attacker.invalid/keys"}),config).reason,"untrusted_algorithm");
 assert.equal(reviewOfflineOidcIdentityFixture(token(claims,{alg:"RS256",typ:"JWT",kid:"other"}),config).reason,"untrusted_algorithm");
});
test("D13 rejects incorrect issuer audience expired nbf and future iat",()=>{
 assert.equal(reviewOfflineOidcIdentityFixture(token({...claims,iss:"other"}),config).reason,"issuer_audience_mismatch");
 assert.equal(reviewOfflineOidcIdentityFixture(token({...claims,aud:"other"}),config).reason,"issuer_audience_mismatch");
 assert.equal(reviewOfflineOidcIdentityFixture(token({...claims,exp:now}),config).reason,"invalid_time");
 assert.equal(reviewOfflineOidcIdentityFixture(token({...claims,nbf:now+1}),config).reason,"invalid_time");
 assert.equal(reviewOfflineOidcIdentityFixture(token({...claims,iat:now+1}),config).reason,"invalid_time");
});
