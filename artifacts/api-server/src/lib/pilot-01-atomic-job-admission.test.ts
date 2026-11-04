import assert from "node:assert/strict";
import test from "node:test";
import {
  rehearseAtomicGrantJobAdmission,
  type AtomicAdmissionPort,
  type AtomicAdmissionPolicy,
  type AtomicAdmissionReceipt,
  type AtomicAdmissionRequest,
  type AtomicAdmissionContextProvider,
} from "./pilot-01-atomic-job-admission.js";
import type { VerifiedGrantContext } from "./pilot-01-trusted-grant-contract.js";

const context: VerifiedGrantContext = {
  actorId:"actor-test", tenantId:"tenant-test", siteId:"site-test",
  issuerId:"issuer-test", sessionId:"session-test", role:"admin",
  source:"server_verified_session",
};
const request: AtomicAdmissionRequest = {
  grantId:"grant-test", siteId:"site-test", operation:"analyze", idempotencyKey:"key-test",
};
const policy: AtomicAdmissionPolicy = {
  authEnforced:true, siteVerified:true, runGateEnabled:true,
  publicSiteWritesEnabled:false, aiProposalGenerationEnabled:false,
};
const receipt: AtomicAdmissionReceipt = {
  admissionId:"admission-test", jobId:"job-test", grantId:"grant-test",
  idempotencyKey:"key-test", actorId:"actor-test", tenantId:"tenant-test",
  siteId:"site-test", issuerId:"issuer-test", operation:"analyze",
  transactionId:"tx-test", committedAt:"2026-11-04T11:00:00.000Z",
};
const provider = (c: VerifiedGrantContext | null=context): AtomicAdmissionContextProvider =>
  ({ async resolve(){ return c; } });
const port = (calls:string[], output:unknown={status:"committed",receipt}): AtomicAdmissionPort =>
  ({ async admit(input){
    calls.push(input.request.idempotencyKey);
    return output as Awaited<ReturnType<AtomicAdmissionPort["admit"]>>;
  }});

test("RT01-A6: single injected atomic port and scoped receipt produces synthetic result", async () => {
  const calls:string[]=[];
  const result=await rehearseAtomicGrantJobAdmission(request,policy,provider(),port(calls));
  assert.equal(result.status,"recorded_for_rehearsal");
  if(result.status==="recorded_for_rehearsal"){
    assert.deepEqual(result.receipt,receipt);
    assert.equal(result.replay,false);
    assert.equal(Object.isFrozen(result.receipt),true);
  }
  assert.deepEqual(calls,["key-test"]);
});

test("RT01-A6: disabled gate or enabled write proposal denies before any dependencies", async () => {
  for(const change of [
    {authEnforced:false},{siteVerified:false},{runGateEnabled:false},
    {publicSiteWritesEnabled:true},{aiProposalGenerationEnabled:true},
  ]){
    const calls:string[]=[];
    const identity:AtomicAdmissionContextProvider={async resolve(){calls.push("session");return context;}};
    const result=await rehearseAtomicGrantJobAdmission(request,{...policy,...change},identity,port(calls));
    assert.deepEqual(result,{status:"denied"});
    assert.deepEqual(calls,[]);
  }
});

test("RT01-A6: no idempotency key, invalid scope and unsupported write operation deny", async () => {
  for(const invalid of [
    { ...request, idempotencyKey:"" },{ ...request, grantId:"" },
    { ...request,siteId:"" },{ ...request,operation:"site_write" },
    { ...request,operation:"recommend_write" },
  ]){
    const calls:string[]=[];
    const result=await rehearseAtomicGrantJobAdmission(
      invalid as AtomicAdmissionRequest,policy,provider(),port(calls));
    assert.deepEqual(result,{status:"denied"});
    assert.deepEqual(calls,[]);
  }
});

test("RT01-A6: mismatched, viewer, missing or forged identity denies without port call", async () => {
  for(const invalid of [
    null,{...context,siteId:"different"},{...context,source:"request_body"},
    {...context,role:"viewer"},{...context,sessionId:""},
    {...context,actorId:""},{...context,tenantId:""},
    {...context,issuerId:""},
  ]){
    const calls:string[]=[];
    const result=await rehearseAtomicGrantJobAdmission(
      request,policy,provider(invalid as VerifiedGrantContext|null),port(calls));
    assert.deepEqual(result,{status:"denied"});
    assert.deepEqual(calls,[]);
  }
});

test("RT01-A6: receipt mismatches and malformed response fail closed", async () => {
  for(const malformed of [
    null,true,{status:"committed"},{status:"unexpected"},
    ...([
      {admissionId:""},{jobId:""},{grantId:"other"},{idempotencyKey:"other"},
      {actorId:"other"},{tenantId:"other"},{siteId:"other"},
      {issuerId:"other"},{operation:"site_write"},{transactionId:""},
      {committedAt:"not-date"},
    ].map(change=>({status:"committed",receipt:{...receipt,...change}}))),
  ]){
    const calls:string[]=[];
    const result=await rehearseAtomicGrantJobAdmission(
      request,policy,provider(),port(calls,malformed));
    assert.deepEqual(result,{status:"unavailable"});
    assert.deepEqual(calls,["key-test"]);
  }
});

test("RT01-A6: identical retry may return same receipt, conflict must deny", async () => {
  const calls:string[]=[];
  const fixture=new Map<string,{request:AtomicAdmissionRequest;receipt:AtomicAdmissionReceipt}>();
  const atomic:AtomicAdmissionPort={
    async admit({request:input}){
      calls.push(input.idempotencyKey);
      const existing=fixture.get(input.idempotencyKey);
      if(existing){
        if(existing.request.grantId!==input.grantId ||
           existing.request.siteId!==input.siteId ||
           existing.request.operation!==input.operation)
          return {status:"denied"};
        return {status:"already_committed",receipt:existing.receipt};
      }
      fixture.set(input.idempotencyKey,{request:input,receipt});
      return {status:"committed",receipt};
    },
  };
  const first=await rehearseAtomicGrantJobAdmission(request,policy,provider(),atomic);
  const retry=await rehearseAtomicGrantJobAdmission(request,policy,provider(),atomic);
  const conflict=await rehearseAtomicGrantJobAdmission({...request,grantId:"other"},policy,provider(),atomic);
  assert.equal(first.status,"recorded_for_rehearsal");
  assert.equal(retry.status,"recorded_for_rehearsal");
  if(retry.status==="recorded_for_rehearsal") assert.equal(retry.replay,true);
  assert.deepEqual(conflict,{status:"denied"});
  assert.deepEqual(calls,["key-test","key-test","key-test"]);
});

test("RT01-A6: lost commit acknowledgement stays unavailable, never guesses success", async () => {
  let calls=0;
  const lostAck:AtomicAdmissionPort={
    async admit(){
      calls+=1;
      throw Error("commit acknowledged to database but connection lost");
    },
  };
  const result=await rehearseAtomicGrantJobAdmission(request,policy,provider(),lostAck);
  assert.deepEqual(result,{status:"unavailable"});
  assert.equal(calls,1);
});

test("RT01-A6: port denial and outage distinct; missing context infrastructure unavailable", async () => {
  for(const status of ["denied","unavailable"] as const){
    assert.deepEqual(await rehearseAtomicGrantJobAdmission(
      request,policy,provider(),port([],{status})),{status});
  }
  const broken:AtomicAdmissionContextProvider={
    async resolve(){throw Error("session service offline");},
  };
  assert.deepEqual(await rehearseAtomicGrantJobAdmission(
    request,policy,broken,port([])),{status:"unavailable"});
});
