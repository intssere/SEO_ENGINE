/** RT01-A12.4: disconnected mock tests; no DB client, SQL, network or runtime wiring. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  DisconnectedAdmissionContract, sameReceipt, validLease, validPrincipal,
  type AdmissionIntent, type AdmissionReceipt, type DurableAdmissionPort,
  type FencedMutation, type ServerVerifiedPrincipal,
} from "./pilot-01-rt01a12-4-disconnected-admission-contract.js";

const hash = "a".repeat(64);
const principal: ServerVerifiedPrincipal = {
  source:"server_verified_principal",authenticated:true,sessionActive:true,
  membershipVerified:true,issuerVerified:true,organizationId:"org-a",
  siteId:"site-a",actorSubject:"actor-a",sessionId:"session-a",
  issuerId:"issuer-a",issuerProvenanceSha256:hash,operation:"analyze",
};
const intent: AdmissionIntent = {grantId:"grant-a",idempotencyKey:"key-a",requestSha256:"b".repeat(64)};
const receipt: AdmissionReceipt = {
  ...principal,...intent,jobId:"job-a",admissionId:"admission-a",
  transactionId:"tx-a",committedAt:"2026-11-05T00:00:00.000Z",
};
const token = {
  jobId:"job-a",organizationId:"org-a",siteId:"site-a",
  workerOwner:"worker-a",generation:2,leaseExpiresAt:"2026-11-05T23:00:00.000Z",
};
function mock(override: Partial<DurableAdmissionPort> = {}) {
  const calls = {admit:0,reconcile:0,mutate:0};
  const port: DurableAdmissionPort = {
    admitAtomically:async () => { calls.admit++;return {status:"committed",receipt}; },
    reconcileAdmission:async () => { calls.reconcile++;return {status:"committed",receipt}; },
    mutateWithFence:async () => { calls.mutate++;return {status:"applied",generation:2,evidenceId:"event-a"}; },
    ...override,
  };
  return {service:new DisconnectedAdmissionContract(port),calls};
}

test("A12.4 only structurally accepts a fully marked server principal",async()=>{
  assert.equal(validPrincipal(principal),true);
  const corrupted: unknown[] = [
    undefined,{}, {...principal,source:"browser_signed_cookie"},
    {...principal,authenticated:false},{...principal,sessionActive:false},
    {...principal,membershipVerified:false},{...principal,issuerVerified:false},
    {...principal,organizationId:"org-b "},{...principal,siteId:""},
    {...principal,issuerProvenanceSha256:"bad"},{...principal,operation:"site_write"},
  ];
  for(const actor of corrupted){
    const m=mock();
    assert.deepEqual(await m.service.admit(actor,intent),{status:"denied"});
    assert.equal(m.calls.admit,0);
  }
});

test("A12.4 rejects malformed fingerprints or idempotency before adapter I/O",async()=>{
  for(const i of [{...intent,grantId:""}, {...intent,idempotencyKey:" key"},
    {...intent,requestSha256:"0"}, {...intent,idempotencyKey:""}]){
    const m=mock();
    assert.deepEqual(await m.service.admit(principal,i),{status:"denied"});
    assert.deepEqual(await m.service.reconcile(principal,i),{status:"denied"});
    assert.equal(m.calls.admit+m.calls.reconcile,0);
  }
});

test("A12.4 cannot certify a receipt from wrong grant, tenant, actor, site, or fingerprint",async()=>{
  for(const mismatch of [
    {organizationId:"org-b"},{siteId:"site-b"},{actorSubject:"actor-b"},
    {sessionId:"session-b"},{issuerId:"issuer-b"},{operation:"recommend" as const},
    {grantId:"grant-b"},{requestSha256:"c".repeat(64)},{idempotencyKey:"key-b"},
    {transactionId:""},{jobId:""},{committedAt:"not a date"},
  ]){
    const m=mock({admitAtomically:async()=>({status:"committed",receipt:{...receipt,...mismatch}})});
    assert.deepEqual(await m.service.admit(principal,intent),{status:"unavailable"});
  }
  assert.equal(sameReceipt(receipt,principal,intent),true);
});

test("A12.4 commit ambiguity never produces success or automatic replay",async()=>{
  const m=mock({
    admitAtomically:async()=>{throw Error("connection lost after COMMIT");},
    reconcileAdmission:async()=>({status:"commit_unknown"}),
  });
  assert.deepEqual(await m.service.admit(principal,intent),{status:"commit_unknown"});
  assert.equal(m.calls.reconcile,0);
  assert.deepEqual(await m.service.reconcile(principal,intent),{status:"commit_unknown"});
  assert.equal(m.calls.admit,0);
});

test("A12.4 read-only reconciliation can certify only an exact matching receipt",async()=>{
  const m=mock({reconcileAdmission:async()=>({status:"committed",receipt:{...receipt,siteId:"site-b"}})});
  assert.deepEqual(await m.service.reconcile(principal,intent),{status:"unavailable"});
  const good=mock();
  assert.deepEqual(await good.service.reconcile(principal,intent),{status:"committed",receipt});
  assert.equal(good.calls.admit,0);
  assert.equal(good.calls.reconcile,1);
});

test("A12.4 explicit denial, conflict, unavailable and unknown results cannot be upgraded",async()=>{
  for(const status of ["denied","conflict","unavailable","commit_unknown"] as const){
    const m=mock({admitAtomically:async()=>({status})});
    assert.deepEqual(await m.service.admit(principal,intent),{status});
  }
});

test("A12.4 lease shapes and permitted read-only state transitions are enforced",async()=>{
  assert.equal(validLease(token),true);
  for(const corrupt of [
    {...token,workerOwner:""},{...token,generation:0},{...token,generation:1.1},
    {...token,siteId:"site-a "},{...token,leaseExpiresAt:"not a timestamp"},
  ])assert.equal(validLease(corrupt),false);
  for(const mutation of [
    {token:{...token,workerOwner:""},intentSha256:hash,kind:"complete"},
    {token:{...token,generation:0},intentSha256:hash,kind:"complete"},
    {token,intentSha256:"wrong",kind:"renew"},
    {token,intentSha256:hash,kind:"provider_dispatch"},
  ]){
    const m=mock();
    assert.deepEqual(await m.service.fenced(mutation),{status:"denied"});
    assert.equal(m.calls.mutate,0);
  }
});

test("A12.4 mock fenced mutation cannot accept wrong generation or missing audit evidence",async()=>{
  const input: FencedMutation={token,intentSha256:hash,kind:"complete"};
  for(const result of [
    {status:"applied" as const,generation:1,evidenceId:"event-a"},
    {status:"applied" as const,generation:2,evidenceId:""},
  ]){
    const m=mock({mutateWithFence:async()=>result});
    assert.deepEqual(await m.service.fenced(input),{status:"unavailable"});
  }
  const fenced=mock({mutateWithFence:async()=>({status:"fenced"})});
  assert.deepEqual(await fenced.service.fenced(input),{status:"fenced"});
  const lost=mock({mutateWithFence:async()=>{throw Error("unknown commit");}});
  assert.deepEqual(await lost.service.fenced(input),{status:"commit_unknown"});
});
