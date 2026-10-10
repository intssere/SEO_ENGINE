/** UGP-11.1D13: offline JWT signature test fixture, NOT trusted production OIDC. */
import {createPublicKey,verify as verifySignature,type KeyObject} from "node:crypto";
export type OfflineIdentityReview=Readonly<{
 cryptographicSignatureValid:boolean;issuerAudienceValid:boolean;
 identityTrusted:false;permissionGranted:false;issuanceAllowed:false;
 claimAllowed:false;dispatchAllowed:false;
 reason:"malformed_token"|"untrusted_algorithm"|"untrusted_fixture_key"|"invalid_signature"|
 "issuer_audience_mismatch"|"invalid_time"|"offline_fixture_not_authoritative";
}>;
export type FixtureVerifierConfig=Readonly<{
 issuer:string;audience:string;publicKeyPem:string;expectedKeyId:string;observedAt:string;
}>;
const deny=(reason:OfflineIdentityReview["reason"],sig=false,scope=false):OfflineIdentityReview=>
 Object.freeze({cryptographicSignatureValid:sig,issuerAudienceValid:scope,
 identityTrusted:false,permissionGranted:false,issuanceAllowed:false,
 claimAllowed:false,dispatchAllowed:false,reason});
const ID=/^[a-zA-Z0-9._:-]{1,128}$/;
function decodeJson(value:string):Record<string,unknown>{
 if(!/^[A-Za-z0-9_-]+$/.test(value)||value.length>12000)throw Error("invalid_base64url");
 const bytes=Buffer.from(value,"base64url");
 if(bytes.toString("base64url")!==value)throw Error("noncanonical_base64url");
 const parsed:unknown=JSON.parse(bytes.toString("utf8"));
 if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw Error("invalid_json");
 return parsed as Record<string,unknown>;
}
export function reviewOfflineOidcIdentityFixture(token:string,config:FixtureVerifierConfig):OfflineIdentityReview {
 if(typeof token!=="string"||token.length>16000||typeof config?.publicKeyPem!=="string")
  return deny("malformed_token");
 if(!ID.test(config.expectedKeyId)||!ID.test(config.issuer)||
    !ID.test(config.audience)||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(config.observedAt))
  return deny("malformed_token");
 const at=Date.parse(config.observedAt);
 if(!Number.isFinite(at)||new Date(at).toISOString()!==config.observedAt)
  return deny("invalid_time");
 const segments=token.split(".");
 if(segments.length!==3)return deny("malformed_token");
 let header:Record<string,unknown>,payload:Record<string,unknown>,key:KeyObject;
 try{
  header=decodeJson(segments[0]);payload=decodeJson(segments[1]);
  if(!/^[A-Za-z0-9_-]+$/.test(segments[2]))return deny("malformed_token");
  key=createPublicKey(config.publicKeyPem);
 }catch{return deny("malformed_token");}
 if(header.alg!=="RS256"||header.typ!=="JWT"||header.kid!==config.expectedKeyId||
    header.jku!==undefined||header.jwk!==undefined||header.x5u!==undefined||
    header.crit!==undefined||header.b64!==undefined)
  return deny("untrusted_algorithm");
 if(key.asymmetricKeyType!=="rsa"||((key.asymmetricKeyDetails?.modulusLength??0)<2048))
  return deny("untrusted_fixture_key");
 let valid=false;
 try{valid=verifySignature("RSA-SHA256",Buffer.from(segments[0]+"."+segments[1]),
   key,Buffer.from(segments[2],"base64url"));}catch{return deny("invalid_signature");}
 if(!valid)return deny("invalid_signature");
 if(payload.iss!==config.issuer||payload.aud!==config.audience||typeof payload.sub!=="string"||
   !ID.test(payload.sub))return deny("issuer_audience_mismatch",true);
 const now=Math.floor(at/1000);
 if(typeof payload.iat!=="number"||typeof payload.exp!=="number"||\n   !Number.isSafeInteger(payload.iat)||!Number.isSafeInteger(payload.exp)||
   payload.iat>now||payload.exp<=now||payload.exp<=payload.iat||
   (payload.nbf!==undefined&&(typeof payload.nbf!=="number"||!Number.isSafeInteger(payload.nbf)||payload.nbf>now)))
  return deny("invalid_time",true,true);
 // Offline caller-supplied public key is NEVER a verified IDP trust anchor.
 return deny("offline_fixture_not_authoritative",true,true);
}
