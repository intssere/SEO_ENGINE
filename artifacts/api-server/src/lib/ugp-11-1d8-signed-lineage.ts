/** UGP-11.1D8 isolated HMAC lineage prototype, never an authority grant. */
import {createHash,createHmac,timingSafeEqual} from "node:crypto";
const ID=/^[A-Za-z0-9._:-]{1,128}$/;
const HEX=/^[0-9a-f]{64}$/;
const MODES=new Set(["running","paused","draining","drained","killed"]);
export type P9FixtureDecision=Readonly<{
 tenantId:string;siteId:string;decisionId:string;principalId:string;
 revision:number;priorRevision:number;priorFingerprint:string;
 mode:"running"|"paused"|"draining"|"drained"|"killed";
 effectiveAt:string;expiresAt:string;nonce:string
}>;
export type P9FixtureSignedDecision=Readonly<{
 decision:P9FixtureDecision;fingerprint:string;mac:string
}>;
export type P9FixtureReview=Readonly<{
 signatureValid:boolean;lineageValid:boolean;authorityGranted:false;claimAllowed:false;dispatchAllowed:false;
 reason:"invalid_decision"|"invalid_signature"|"invalid_lineage"|"fixture_signature_not_authoritative";
}>;
function canonicalTime(s:string):number{
 if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s))throw Error("noncanonical_time");
 const n=Date.parse(s);if(!Number.isFinite(n)||new Date(n).toISOString()!==s)throw Error("noncanonical_time");
 return n;
}
function validate(d:P9FixtureDecision):void{
 if(!d||typeof d!=="object"||Object.keys(d).sort().join("|")!==
  ["tenantId","siteId","decisionId","principalId","revision","priorRevision","priorFingerprint","mode","effectiveAt","expiresAt","nonce"].sort().join("|"))
   throw Error("invalid_decision_shape");
 if(![d.tenantId,d.siteId,d.decisionId,d.principalId,d.nonce].every(v=>typeof v==="string"&&ID.test(v)) ||
   !MODES.has(d.mode) || !Number.isSafeInteger(d.revision)||d.revision<1 ||
   !Number.isSafeInteger(d.priorRevision)||d.priorRevision<0||
   d.revision!==d.priorRevision+1||!HEX.test(d.priorFingerprint))throw Error("invalid_decision_fields");
 if(canonicalTime(d.effectiveAt)>=canonicalTime(d.expiresAt))throw Error("invalid_decision_window");
}
export function fixtureDecisionFingerprint(d:P9FixtureDecision):string{
 validate(d);return createHash("sha256").update(JSON.stringify(Object.keys(d).sort().map(k=>[k,d[k as keyof P9FixtureDecision]]))).digest("hex");
}
function safeKey(key:Uint8Array):void{if(!(key instanceof Uint8Array)||key.byteLength<32)throw Error("fixture_key_invalid");}
export function signP9FixtureDecision(d:P9FixtureDecision,key:Uint8Array):P9FixtureSignedDecision{
 safeKey(key);const fingerprint=fixtureDecisionFingerprint(d);
 const mac=createHmac("sha256",key).update("ugp11-d8-fixture-v1:").update(fingerprint).digest("hex");
 return {decision:Object.freeze({...d}),fingerprint,mac};
}
export function reviewP9FixtureDecision(
 signed:P9FixtureSignedDecision,key:Uint8Array,
 prior:{revision:number;fingerprint:string;tenantId:string;siteId:string}|null
):P9FixtureReview{
 const denied=(reason:P9FixtureReview["reason"],signatureValid=false,lineageValid=false):P9FixtureReview=>
  Object.freeze({reason,signatureValid,lineageValid,authorityGranted:false,claimAllowed:false,dispatchAllowed:false});
 let fingerprint:string;
 try{safeKey(key);fingerprint=fixtureDecisionFingerprint(signed.decision);
  if(!HEX.test(signed.fingerprint)||!HEX.test(signed.mac)||signed.fingerprint!==fingerprint)return denied("invalid_decision");
 }catch{return denied("invalid_decision");}
 const expected=createHmac("sha256",key).update("ugp11-d8-fixture-v1:").update(fingerprint).digest();
 const provided=Buffer.from(signed.mac,"hex");
 if(!timingSafeEqual(expected,provided))return denied("invalid_signature");
 const d=signed.decision;
 const expectedRevision=prior?.revision??0;
 const expectedFingerprint=prior?.fingerprint??"0".repeat(64);
 if(d.priorRevision!==expectedRevision||d.priorFingerprint!==expectedFingerprint||
   (prior!==null&&(prior.tenantId!==d.tenantId||prior.siteId!==d.siteId)))
   return denied("invalid_lineage",true);
 return denied("fixture_signature_not_authoritative",true,true);
}
