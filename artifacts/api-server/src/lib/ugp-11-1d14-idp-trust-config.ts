/** UGP-11.1D14: isolated IDP trust configuration review, never an authority grant. */
import {createHash} from "node:crypto";
export type TrustConfig=Readonly<{
 issuer:string;audience:string;jwksUri:string;tenantId:string;siteId:string;
 version:number;activeFrom:string;activeUntil:string;
 revokedKeyIds:readonly string[];allowedKeyIds:readonly string[];
 provenance:"fixture_only";approvedBy:string|null;
}>;
export type TrustConfigReview=Readonly<{
 configFingerprint:string|null;configurationTrusted:false;
 identityTrusted:false;issuanceAllowed:false;claimAllowed:false;dispatchAllowed:false;
 reason:"invalid_configuration"|"unsafe_jwks_location"|"key_conflict"|"expired_configuration"|"independent_governance_unavailable";
}>;
const ID=/^[A-Za-z0-9._:-]{1,128}$/;
const deny=(reason:TrustConfigReview["reason"],configFingerprint:string|null=null):TrustConfigReview=>
 Object.freeze({reason,configFingerprint,configurationTrusted:false,identityTrusted:false,
 issuanceAllowed:false,claimAllowed:false,dispatchAllowed:false});
const time=(s:string)=>typeof s==="string"&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s)&&
 Number.isFinite(Date.parse(s))&&new Date(Date.parse(s)).toISOString()===s;
export function reviewIdpTrustConfiguration(c:TrustConfig,observedAt:string):TrustConfigReview{
 if(!c||typeof c!=="object"||!time(observedAt)||!time(c.activeFrom)||!time(c.activeUntil)||
 ![c.issuer,c.audience,c.tenantId,c.siteId].every(x=>typeof x==="string"&&ID.test(x))||
 !Number.isSafeInteger(c.version)||c.version<1||
 !Array.isArray(c.allowedKeyIds)||!Array.isArray(c.revokedKeyIds)||
 c.allowedKeyIds.length===0||c.allowedKeyIds.length>64||c.revokedKeyIds.length>64||
 ![...c.allowedKeyIds,...c.revokedKeyIds].every(x=>typeof x==="string"&&ID.test(x))||
 c.provenance!=="fixture_only"||(c.approvedBy!==null&&(typeof c.approvedBy!=="string"||!ID.test(c.approvedBy))))
 return deny("invalid_configuration");
 let url:URL;
 try{url=new URL(c.jwksUri);}catch{return deny("unsafe_jwks_location");}
 if(url.protocol!=="https:"||url.username||url.password||url.hash||
 !url.hostname.includes(".")||url.hostname==="localhost"||
 /^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname)||
 url.hostname.endsWith(".local")||url.hostname.endsWith(".internal"))
 return deny("unsafe_jwks_location");
 if(new Set(c.allowedKeyIds).size!==c.allowedKeyIds.length||
 new Set(c.revokedKeyIds).size!==c.revokedKeyIds.length||
 c.allowedKeyIds.some(k=>c.revokedKeyIds.includes(k)))return deny("key_conflict");
 if(Date.parse(c.activeFrom)>=Date.parse(c.activeUntil)||
 Date.parse(c.activeFrom)>Date.parse(observedAt)||Date.parse(c.activeUntil)<=Date.parse(observedAt))
 return deny("expired_configuration");
 const fingerprint=createHash("sha256").update(JSON.stringify({
 issuer:c.issuer,audience:c.audience,jwksUri:c.jwksUri,
 tenantId:c.tenantId,siteId:c.siteId,version:c.version,
 activeFrom:c.activeFrom,activeUntil:c.activeUntil,
 allowedKeyIds:[...c.allowedKeyIds].sort(),revokedKeyIds:[...c.revokedKeyIds].sort(),
 provenance:c.provenance,approvedBy:c.approvedBy
 })).digest("hex");
 // A caller-supplied config remains untrusted despite syntactic acceptance.
 return deny("independent_governance_unavailable",fingerprint);
}
