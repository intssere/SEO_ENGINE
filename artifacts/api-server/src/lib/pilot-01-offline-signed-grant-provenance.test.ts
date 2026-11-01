import assert from "node:assert/strict";
import test from "node:test";
import {createHmac,randomBytes,timingSafeEqual} from "node:crypto";

/** PILOT-01 offline-only signed-grant characterization.
 * This is a synthetic issuer/verifier harness, NOT an application credential,
 * production token format, authenticated user identity, or runtime integration.
 * No token issued here may authorize real activity.
 */
type Claims=Readonly<{
 issuer:string;actorId:string;tenantId:string;siteId:string;
 operation:"analyze"|"recommend"|"site_write";expiresAtMs:number;
 nonce:string;diffHash?:string;
}>;
const key=randomBytes(32); // ephemeral fixture secret, never loaded from deployment env
const sign=(c:Claims)=>{
 const payload=Buffer.from(JSON.stringify(c)).toString("base64url");
 const mac=createHmac("sha256",key).update(payload).digest("base64url");
 return payload+"."+mac;
};
const verify=(value:string,expected:Claims,nowMs:number)=>{
 const parts=value.split(".");
 if(parts.length!==2||!parts[0]||!parts[1])return false;
 const mac=createHmac("sha256",key).update(parts[0]).digest();
 let supplied:Buffer;
 try{supplied=Buffer.from(parts[1],"base64url");}catch{return false;}
 if(supplied.length!==mac.length||!timingSafeEqual(supplied,mac))return false;
 let claims:Claims;
 try{claims=JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8")) as Claims;}catch{return false;}
 if(!Number.isFinite(nowMs)||!Number.isFinite(claims.expiresAtMs)||claims.expiresAtMs<=nowMs)return false;
 if(!claims.nonce||!claims.issuer||!claims.actorId||!claims.tenantId||!claims.siteId)return false;
 return claims.issuer===expected.issuer&&claims.actorId===expected.actorId&&
  claims.tenantId===expected.tenantId&&claims.siteId===expected.siteId&&
  claims.operation===expected.operation&&claims.nonce===expected.nonce&&
  claims.diffHash===expected.diffHash&&
  (claims.operation!=="site_write"||Boolean(claims.diffHash));
};
const now=1_800_000_000_000;
const grant:Claims={issuer:"offline-issuer",actorId:"actor-A",tenantId:"tenant-A",
 siteId:"site-A",operation:"analyze",expiresAtMs:now+60000,nonce:"offline-once"};
test("PILOT-01 offline signed claims: exact issuer actor tenant site operation and nonce match",()=>{
 const token=sign(grant);
 assert.equal(verify(token,grant,now),true);
 for(const mismatch of [
  {issuer:"forged"},{actorId:"actor-B"},{tenantId:"tenant-B"},
  {siteId:"site-B"},{operation:"recommend" as const},{nonce:"other"}
 ])assert.equal(verify(token,{...grant,...mismatch},now),false);
});
test("PILOT-01 offline signed claims: tampering, missing signature and expiry denied",()=>{
 const token=sign(grant);
 const [payload,mac]=token.split(".");
 const edited=Buffer.from(JSON.stringify({...grant,operation:"site_write",diffHash:"write"})).toString("base64url");
 assert.equal(verify(edited+"."+mac,grant,now),false);
 assert.equal(verify(payload+".",grant,now),false);
 assert.equal(verify("not-a-token",grant,now),false);
 assert.equal(verify(token,grant,now+60000),false);
});
test("PILOT-01 offline signed claims: analysis grant cannot become a site-write grant",()=>{
 const request:Claims={...grant,operation:"site_write",diffHash:"exact-diff"};
 assert.equal(verify(sign(grant),request,now),false);
 assert.equal(verify(sign({...request,diffHash:undefined}),{...request,diffHash:undefined},now),false);
 assert.equal(verify(sign(request),request,now),true);
});
test("PILOT-01 signed claim verification alone is replayable and NOT durable authorization",()=>{
 const token=sign(grant);
 assert.equal(verify(token,grant,now),true);
 assert.equal(verify(token,grant,now),true);
 // Real replay denial requires a separately audited durable, single-use grant ledger.
});
