/** UGP-11.1D16 offline detached revocation evidence fixture; NO trusted root. */
import {createHash,createPublicKey,verify as verifySignature} from "node:crypto";
export type RevocationEvent=Readonly<{
 issuer:string;tenantId:string;siteId:string;keyId:string;
 eventId:string;sequence:number;previousFingerprint:string;
 action:"revoke"|"rotate"|"retire";effectiveAt:string;
}>;
export type SignedRevocation=Readonly<{event:RevocationEvent;fingerprint:string;signature:string}>;
export type RevocationReview=Readonly<{
 signatureValid:boolean;lineageValid:boolean;keyTrusted:false;
 issuanceAllowed:false;claimAllowed:false;dispatchAllowed:false;
 reason:"invalid_event"|"invalid_signature"|"invalid_lineage"|"fixture_signer_untrusted";
}>;
const ID=/^[A-Za-z0-9._:-]{1,128}$/;
const HEX=/^[0-9a-f]{64}$/;
const TIME=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const deny=(reason:RevocationReview["reason"],signatureValid=false,lineageValid=false):RevocationReview=>
 Object.freeze({reason,signatureValid,lineageValid,keyTrusted:false,issuanceAllowed:false,claimAllowed:false,dispatchAllowed:false});
export function revocationFingerprint(event:RevocationEvent):string{
 if(!event||![event.issuer,event.tenantId,event.siteId,event.keyId,event.eventId]
 .every(v=>typeof v==="string"&&ID.test(v))||!Number.isSafeInteger(event.sequence)||
 event.sequence<1||typeof event.previousFingerprint!=="string"||!HEX.test(event.previousFingerprint)||
 !["revoke","rotate","retire"].includes(event.action)||
 typeof event.effectiveAt!=="string"||!TIME.test(event.effectiveAt)||
 !Number.isFinite(Date.parse(event.effectiveAt))||
 new Date(Date.parse(event.effectiveAt)).toISOString()!==event.effectiveAt)
 throw Error("invalid_revocation_event");
 return createHash("sha256").update("ugp11-d16-fixture-event-v1:").update(JSON.stringify(
 ["issuer","tenantId","siteId","keyId","eventId","sequence","previousFingerprint","action","effectiveAt"]
 .map(k=>[k,event[k as keyof RevocationEvent]]))).digest("hex");
}
export function reviewOfflineRevocation(
 signed:SignedRevocation,publicKeyPem:string,
 prior:{issuer:string;tenantId:string;siteId:string;keyId:string;sequence:number;fingerprint:string}|null
):RevocationReview{
 let fingerprint:string;
 try{fingerprint=revocationFingerprint(signed.event);
 if(typeof signed.fingerprint!=="string"||!HEX.test(signed.fingerprint)||
 fingerprint!==signed.fingerprint||typeof signed.signature!=="string"||
 !/^[A-Za-z0-9_-]+$/.test(signed.signature))return deny("invalid_event");
 }catch{return deny("invalid_event");}
 let valid=false;
 try{
 const key=createPublicKey(publicKeyPem);
 if(key.asymmetricKeyType!=="rsa"||(key.asymmetricKeyDetails?.modulusLength??0)<2048)
 return deny("invalid_signature");
 valid=verifySignature("RSA-SHA256",Buffer.from("ugp11-d16-revocation:"+fingerprint),
 key,Buffer.from(signed.signature,"base64url"));
 }catch{return deny("invalid_signature");}
 if(!valid)return deny("invalid_signature");
 const d=signed.event;
 const lineage=prior?prior.issuer===d.issuer&&prior.tenantId===d.tenantId&&
 prior.siteId===d.siteId&&prior.keyId===d.keyId&&d.sequence===prior.sequence+1&&
 d.previousFingerprint===prior.fingerprint:
 d.sequence===1&&d.previousFingerprint==="0".repeat(64);
 if(!lineage)return deny("invalid_lineage",true);
 return deny("fixture_signer_untrusted",true,true);
}
