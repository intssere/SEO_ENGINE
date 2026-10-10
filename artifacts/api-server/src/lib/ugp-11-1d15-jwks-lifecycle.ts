/** UGP-11.1D15: offline JWKS lifecycle review only; caller-supplied sources are untrusted. */
import {createHash,createPublicKey} from "node:crypto";
export type FixtureJwk=Readonly<{kty:"RSA";kid:string;alg:"RS256";use:"sig";n:string;e:string}>;
export type FixtureKeyLifecycle=Readonly<{
 issuer:string;tenantId:string;siteId:string;keyId:string;
 state:"active"|"revoked"|"retired"|"rotating";epoch:number;
 validFrom:string;validUntil:string;observedAt:string;
 provenance:"fixture_only";jwk:FixtureJwk;
}>;
export type KeyLifecycleReview=Readonly<{
 fingerprint:string|null;keyMaterialWellFormed:boolean;keyTrusted:false;
 issuanceAllowed:false;claimAllowed:false;dispatchAllowed:false;
 reason:"invalid_record"|"invalid_key_material"|"scope_or_key_mismatch"|
 "revoked_or_inactive"|"expired_or_not_yet_active"|"untrusted_key_provenance";
}>;
const ID=/^[A-Za-z0-9._:-]{1,128}$/;
const TIME=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const validTime=(s:unknown):s is string=>typeof s==="string"&&TIME.test(s)&&
 Number.isFinite(Date.parse(s))&&new Date(Date.parse(s)).toISOString()===s;
const deny=(reason:KeyLifecycleReview["reason"],fingerprint:string|null=null,
 keyMaterialWellFormed=false):KeyLifecycleReview=>Object.freeze({
 reason,fingerprint,keyMaterialWellFormed,keyTrusted:false,
 issuanceAllowed:false,claimAllowed:false,dispatchAllowed:false
});
export function reviewFixtureJwksKeyLifecycle(record:FixtureKeyLifecycle):KeyLifecycleReview{
 if(!record||!record.jwk||![record.issuer,record.tenantId,record.siteId,record.keyId].every(x=>typeof x==="string"&&ID.test(x))||
 record.provenance!=="fixture_only"||!Number.isSafeInteger(record.epoch)||record.epoch<0||
 ![record.validFrom,record.validUntil,record.observedAt].every(validTime)||
 !["active","revoked","retired","rotating"].includes(record.state))
 return deny("invalid_record");
 const k=record.jwk;
 if(k.kid!==record.keyId)return deny("scope_or_key_mismatch");
 if(k.kty!=="RSA"||k.alg!=="RS256"||k.use!=="sig"||
 typeof k.n!=="string"||typeof k.e!=="string"||
 !/^[A-Za-z0-9_-]+$/.test(k.n)||!/^[A-Za-z0-9_-]+$/.test(k.e))
 return deny("invalid_key_material");
 try{
  const key=createPublicKey({key:{kty:"RSA",n:k.n,e:k.e},format:"jwk"});
  if(key.asymmetricKeyType!=="rsa"||(key.asymmetricKeyDetails?.modulusLength??0)<2048)
   return deny("invalid_key_material");
 }catch{return deny("invalid_key_material");}
 if(record.state!=="active")return deny("revoked_or_inactive");
 if(Date.parse(record.validFrom)>=Date.parse(record.validUntil)||
 Date.parse(record.validFrom)>Date.parse(record.observedAt)||
 Date.parse(record.validUntil)<=Date.parse(record.observedAt))
 return deny("expired_or_not_yet_active");
 const fingerprint=createHash("sha256").update(JSON.stringify({
 issuer:record.issuer,tenantId:record.tenantId,siteId:record.siteId,
 keyId:record.keyId,epoch:record.epoch,state:record.state,
 validFrom:record.validFrom,validUntil:record.validUntil,
 jwk:{kty:k.kty,alg:k.alg,use:k.use,kid:k.kid,n:k.n,e:k.e},
 provenance:record.provenance
 })).digest("hex");
 return deny("untrusted_key_provenance",fingerprint,true);
}
