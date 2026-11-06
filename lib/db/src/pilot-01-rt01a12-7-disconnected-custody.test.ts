/** A12.7 offline/mocked tests only: no IO, DB, SQL or credential access. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveDisconnectedCustody,
  type TrustedCustodyPorts,type SessionEvidence,type SiteEvidence,
  type MembershipEvidence,type IssuerEvidence,
} from "./pilot-01-rt01a12-7-disconnected-custody.js";
import {validPrincipal} from "./pilot-01-rt01a12-4-disconnected-admission-contract.js";

const NOW=Date.parse("2026-11-06T00:00:00.000Z");
const future="2026-11-07T00:00:00.000Z";
const old="2026-11-05T00:00:00.000Z";
const session:SessionEvidence={sessionId:"session-a",subject:"subject-a",role:"operator",
  active:true,revokedAt:null,expiresAt:future};
const site:SiteEvidence={organizationId:"org-a",siteId:"site-a",active:true};
const membership:MembershipEvidence={organizationId:"org-a",subject:"subject-a",
  role:"operator",active:true,revokedAt:null,expiresAt:future,revision:4};
const issuer:IssuerEvidence={issuerId:"issuer-a",organizationId:"org-a",
  siteId:"site-a",actorSubject:"subject-a",operation:"analyze",active:true,
  revokedAt:null,expiresAt:future,provenanceSha256:"a".repeat(64),revision:8};
const intent={siteId:"site-a",issuerId:"issuer-a",operation:"analyze" as const};

function fixture(overrides:Partial<{
  session:SessionEvidence|null;site:SiteEvidence|null;
  membership:MembershipEvidence|null;issuer:IssuerEvidence|null;
  now:number;failure:"session"|"site"|"membership"|"issuer";
}>={}){
  const seen:string[]=[];
  const call=async <T>(name:"session"|"site"|"membership"|"issuer",value:T):Promise<T>=>{
    seen.push(name);
    if(overrides.failure===name)throw Error("synthetic lookup failure");
    return value;
  };
  const ports:TrustedCustodyPorts={
    now:()=>overrides.now??NOW,
    session:{current:()=>call("session",overrides.session===undefined?session:overrides.session)},
    site:{get:(id)=>{assert.equal(id,intent.siteId);return call("site",overrides.site===undefined?site:overrides.site);}},
    membership:{get:(subject,organizationId)=>{
      assert.equal(subject,session.subject);assert.equal(organizationId,site.organizationId);
      return call("membership",overrides.membership===undefined?membership:overrides.membership);
    }},
    issuer:{get:(id)=>{assert.equal(id,intent.issuerId);return call("issuer",overrides.issuer===undefined?issuer:overrides.issuer);}},
  };
  return {ports,seen};
}
test("A12.7 positive case binds only independently resolved tenant/site/issuer scope",async()=>{
  const {ports,seen}=fixture();
  const r=await resolveDisconnectedCustody(intent,ports);
  assert.equal(r.status,"verified");
  if(r.status!=="verified")return;
  assert.equal(validPrincipal(r.principal),true);
  assert.deepEqual([r.principal.organizationId,r.principal.siteId,r.principal.actorSubject,
    r.principal.sessionId,r.principal.issuerId,r.principal.operation,r.principal.issuerProvenanceSha256],
    ["org-a","site-a","subject-a","session-a","issuer-a","analyze","a".repeat(64)]);
  assert.equal(r.membershipRevision,4);assert.equal(r.issuerRevision,8);
  assert.ok(Object.isFrozen(r.principal));
  assert.deepEqual(seen,["session","site","membership","issuer"]);
});
test("A12.7 disallows malformed and write-operation intents before source lookup",async()=>{
  for(const bad of [null,{}, {siteId:"",issuerId:"issuer-a",operation:"analyze"},
    {siteId:"site-a ",issuerId:"issuer-a",operation:"analyze"},
    {siteId:"site-a",issuerId:"issuer-a",operation:"site_write"},
    {siteId:"site-a",issuerId:"",operation:"analyze"}]){
    const {ports,seen}=fixture();
    assert.deepEqual(await resolveDisconnectedCustody(bad as any,ports),{status:"denied"});
    assert.deepEqual(seen,[]);
  }
});
test("A12.7 invalid, revoked, expired and viewer sessions fail before other ports",async()=>{
  for(const s of [null,{...session,active:false},{...session,revokedAt:old},
    {...session,expiresAt:old},{...session,expiresAt:new Date(NOW).toISOString()},
    {...session,role:"viewer" as const},{...session,sessionId:""},
    {...session,subject:""},{...session,expiresAt:"invalid"}]){
    const f=fixture({session:s});
    assert.deepEqual(await resolveDisconnectedCustody(intent,f.ports),{status:"denied"});
    assert.deepEqual(f.seen,["session"]);
  }
});
test("A12.7 cross-organization or inactive sites are rejected",async()=>{
  for(const s of [null,{...site,siteId:"site-b"},{...site,organizationId:""},
    {...site,active:false}]){
    const f=fixture({site:s});
    assert.deepEqual(await resolveDisconnectedCustody(intent,f.ports),{status:"denied"});
    assert.deepEqual(f.seen,["session","site"]);
  }
});
test("A12.7 membership status, role, subject, tenant, revision and expiry are checked",async()=>{
  for(const m of [null,{...membership,subject:"other"},
    {...membership,organizationId:"org-b"},{...membership,active:false},
    {...membership,revokedAt:old},{...membership,expiresAt:old},
    {...membership,role:"viewer" as const},{...membership,revision:0},
    {...membership,revision:1.4}]){
    const f=fixture({membership:m});
    assert.deepEqual(await resolveDisconnectedCustody(intent,f.ports),{status:"denied"});
    assert.deepEqual(f.seen,["session","site","membership"]);
  }
});
test("A12.7 rejects forged, cross-tenant, revoked or stale issuer evidence",async()=>{
  for(const i of [null,{...issuer,issuerId:"issuer-b"},
    {...issuer,organizationId:"org-b"},{...issuer,siteId:"site-b"},
    {...issuer,actorSubject:"subject-b"},{...issuer,operation:"recommend" as const},
    {...issuer,active:false},{...issuer,revokedAt:old},{...issuer,expiresAt:old},
    {...issuer,provenanceSha256:"not-a-digest"},{...issuer,revision:0}]){
    const f=fixture({issuer:i});
    assert.deepEqual(await resolveDisconnectedCustody(intent,f.ports),{status:"denied"});
    assert.deepEqual(f.seen,["session","site","membership","issuer"]);
  }
});
test("A12.7 indeterminate clocks and upstream outages fail closed",async()=>{
  const c=fixture({now:NaN});
  assert.deepEqual(await resolveDisconnectedCustody(intent,c.ports),{status:"unavailable"});
  assert.deepEqual(c.seen,[]);
  for(const failure of ["session","site","membership","issuer"] as const){
    const f=fixture({failure});
    assert.deepEqual(await resolveDisconnectedCustody(intent,f.ports),{status:"unavailable"});
  }
});
test("A12.7 revocation between mock resolutions denies on independently returned state",async()=>{
  const revoked={...issuer,revokedAt:old};
  const f=fixture({issuer:revoked});
  assert.equal((await resolveDisconnectedCustody(intent,f.ports)).status,"denied");
  const g=fixture({membership:{...membership,active:false}});
  assert.equal((await resolveDisconnectedCustody(intent,g.ports)).status,"denied");
});
