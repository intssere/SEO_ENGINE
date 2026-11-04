import assert from "node:assert/strict";
import test from "node:test";
import {
  rehearseAuthenticatedPilotBoundary,
  type PilotRuntimeBoundaryCandidate,
} from "./pilot-01-rt01a11-trusted-runtime-boundary.js";
import type {
  PilotTrustedEvidencePorts, PilotSessionEvidence,
  PilotSiteEvidence, PilotMembershipEvidence, PilotIssuerEvidence,
} from "./pilot-01-trusted-site-context.js";

const now=Date.parse("2026-11-04T12:00:00.000Z");
const expires="2026-11-04T13:00:00.000Z";
const session: PilotSessionEvidence={
  sessionId:"session-fixture",subject:"actor-fixture",
  role:"admin",expiresAt:expires,revoked:false,
};
const site: PilotSiteEvidence={
  siteId:"site-fixture",organizationId:"tenant-fixture",active:true,
};
const membership: PilotMembershipEvidence={
  organizationId:"tenant-fixture",subject:"actor-fixture",
  status:"active",role:"admin",
};
const issuer: PilotIssuerEvidence={
  issuerId:"issuer-fixture",organizationId:"tenant-fixture",
  siteId:"site-fixture",actorSubject:"actor-fixture",
  operation:"analyze",status:"active",expiresAt:expires,
};
const input:PilotRuntimeBoundaryCandidate={
  authEnforced:true,
  principal:{
    sessionId:session.sessionId,subject:session.subject,role:session.role,
    expiresAt:session.expiresAt,
  },
  intent:{siteId:site.siteId,issuerId:issuer.issuerId,operation:"analyze"},
};
type Overrides=Partial<{
  session:PilotSessionEvidence|null;
  site:PilotSiteEvidence|null;
  membership:PilotMembershipEvidence|null;
  issuer:PilotIssuerEvidence|null;
  clock:number;
}>;
function ports(overrides:Overrides={},calls:string[]=[]):PilotTrustedEvidencePorts{
  return {
    now(){calls.push("clock");return overrides.clock ?? now;},
    session:{async resolve(){calls.push("session");return overrides.session===undefined?session:overrides.session;}},
    site:{async find(id){calls.push("site:"+id);return overrides.site===undefined?site:overrides.site;}},
    membership:{async find(subject,tenant){
      calls.push("membership:"+subject+":"+tenant);
      return overrides.membership===undefined?membership:overrides.membership;
    }},
    issuer:{async find(id){calls.push("issuer:"+id);return overrides.issuer===undefined?issuer:overrides.issuer;}},
  };
}
test("RT01-A11.1 source-only: authenticated and scope-matched synthetic evidence yields immutable context",async()=>{
  const calls:string[]=[];
  const out=await rehearseAuthenticatedPilotBoundary(input,ports({},calls));
  assert.equal(out.status,"verified");
  if(out.status==="verified"){
    assert.deepEqual(out.context,{
      actorId:"actor-fixture",tenantId:"tenant-fixture",siteId:"site-fixture",
      issuerId:"issuer-fixture",sessionId:"session-fixture",
      role:"admin",source:"server_verified_session",
    });
    assert.equal(Object.isFrozen(out.context),true);
  }
  assert.deepEqual(calls,[
    "clock","session","site:site-fixture",
    "membership:actor-fixture:tenant-fixture","issuer:issuer-fixture",
  ]);
});
test("RT01-A11.1: disabled auth, missing principal and viewer deny before reading evidence",async()=>{
  for(const candidate of [
    {...input,authEnforced:false}, {...input,principal:null},
    {...input,principal:{...input.principal!,role:"viewer" as const}},
    {...input,principal:{...input.principal!,subject:""}},
    {...input,principal:{...input.principal!,sessionId:" "}},
  ]){
    const calls:string[]=[];
    assert.deepEqual(await rehearseAuthenticatedPilotBoundary(
      candidate as PilotRuntimeBoundaryCandidate,ports({},calls)),{status:"denied"});
    assert.deepEqual(calls,[]);
  }
});
test("RT01-A11.1: forged actor, session ID, role or expiry cannot cross session boundary",async()=>{
  for(const candidate of [
    {...input,principal:{...input.principal!,subject:"forged-actor"}},
    {...input,principal:{...input.principal!,sessionId:"forged-session"}},
    {...input,principal:{...input.principal!,role:"operator" as const}},
    {...input,principal:{...input.principal!,expiresAt:"2026-11-04T14:00:00.000Z"}},
  ]){
    const calls:string[]=[];
    assert.deepEqual(await rehearseAuthenticatedPilotBoundary(candidate,ports({},calls)),
      {status:"denied"});
    assert.deepEqual(calls,["clock","session"]);
  }
});
test("RT01-A11.1: revoked and expired authentic session deny",async()=>{
  for(const override of [
    {session:{...session,revoked:true}},
    {session:{...session,expiresAt:now.toString()}},
    {clock:Date.parse(expires)},
  ]){
    const out=await rehearseAuthenticatedPilotBoundary(input,ports(override));
    assert.deepEqual(out,{status:"denied"});
  }
});
test("RT01-A11.1: cross-tenant membership, site spoofing, forged issuer and revoked issuer deny",async()=>{
  for(const overrides of [
    {site:{...site,organizationId:"different-tenant"}},
    {site:{...site,siteId:"different-site"}},
    {membership:{...membership,organizationId:"different-tenant"}},
    {membership:{...membership,subject:"different-actor"}},
    {membership:{...membership,status:"revoked" as const}},
    {issuer:{...issuer,organizationId:"different-tenant"}},
    {issuer:{...issuer,actorSubject:"different-actor"}},
    {issuer:{...issuer,siteId:"different-site"}},
    {issuer:{...issuer,status:"revoked" as const}},
  ]){
    assert.deepEqual(await rehearseAuthenticatedPilotBoundary(input,ports(overrides)),
      {status:"denied"});
  }
});
test("RT01-A11.1: unrelated site, mismatched operation, unsupported write intent are denied",async()=>{
  for(const intent of [
    {...input.intent,siteId:"other-site"},
    {...input.intent,issuerId:"other-issuer"},
    {...input.intent,operation:"recommend" as const},
    {...input.intent,operation:"site_write" as "analyze"},
  ]){
    assert.deepEqual(await rehearseAuthenticatedPilotBoundary({...input,intent},ports()),
      {status:"denied"});
  }
});
test("RT01-A11.1: unavailable trusted evidence fails closed and does not dispatch",async()=>{
  const broken=ports();
  broken.membership.find=async()=>{throw Error("synthetic store unavailable");};
  assert.deepEqual(await rehearseAuthenticatedPilotBoundary(input,broken),
    {status:"unavailable"});
  const calls:string[]=[];
  const invalid=await rehearseAuthenticatedPilotBoundary(
    {...input,authEnforced:false},ports({},calls));
  assert.deepEqual(invalid,{status:"denied"});
  assert.deepEqual(calls,[]);
});
