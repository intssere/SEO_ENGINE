import assert from "node:assert/strict";
import test from "node:test";
import { DeterministicTransportFake, prepareAdmittedJob, transportRuntimeCapability, type JobEnvelope } from "./ugp-11-1b-transport.js";

const h = "a".repeat(64), other = "b".repeat(64);
const envelope: JobEnvelope = {
  version:"ugp-11-1b-transport-v1",siteId:"site-1",tenantId:"tenant-1",jobClass:"signal_refresh",
  upstreamId:"intent-1",upstreamFingerprint:h,scopeFingerprint:h,idempotencyKey:"idk-1",
  slotAt:"2026-10-08T10:00:00.000Z",expiresAt:"2026-10-08T11:00:00.000Z",
  admissionId:"adm-1",admissionFingerprint:h,admissionExpiresAt:"2026-10-08T10:30:00.000Z",
  controlRevision:2,controlFingerprint:h
};
const running = {mode:"running" as const,revision:2,fingerprint:h};
test("exact replay enqueues once; conflicting identity fails closed",()=>{
  const fake=new DeterministicTransportFake(),job=prepareAdmittedJob(envelope);
  assert.deepEqual(fake.enqueue(job),fake.enqueue(job));
  assert.throws(()=>fake.enqueue(prepareAdmittedJob({...envelope,upstreamFingerprint:other})),/conflicting_idempotency_replay/);
});
test("no claims when paused, killed, stale, early or expired",()=>{
  const fake=new DeterministicTransportFake(),job=prepareAdmittedJob(envelope);
  fake.enqueue(job);
  assert.throws(()=>fake.claim(job.identity,"worker-1",{...running,mode:"paused"},"2026-10-08T10:05:00.000Z"),/control_closed_or_stale/);
  assert.throws(()=>fake.claim(job.identity,"worker-1",{...running,mode:"killed"},"2026-10-08T10:05:00.000Z"),/control_closed_or_stale/);
  assert.throws(()=>fake.claim(job.identity,"worker-1",{...running,revision:3},"2026-10-08T10:05:00.000Z"),/control_closed_or_stale/);
  assert.throws(()=>fake.claim(job.identity,"worker-1",running,"2026-10-08T09:59:00.000Z"),/work_expired_or_not_due/);
  assert.throws(()=>fake.claim(job.identity,"worker-1",running,"2026-10-08T10:30:00.000Z"),/work_expired_or_not_due/);
});
test("claim is exclusive and completion requires exact fence and worker",()=>{
  const fake=new DeterministicTransportFake(),job=prepareAdmittedJob(envelope);
  fake.enqueue(job);const claim=fake.claim(job.identity,"worker-1",running,"2026-10-08T10:01:00.000Z");
  assert.equal(claim.fence,1);assert.equal(claim.attempts,1);
  assert.throws(()=>fake.claim(job.identity,"worker-2",running,"2026-10-08T10:02:00.000Z"),/claim_not_available/);
  assert.throws(()=>fake.complete(job.identity,"worker-2",1,h),/stale_or_unowned_claim/);
  assert.throws(()=>fake.complete(job.identity,"worker-1",0,h),/stale_or_unowned_claim/);
  assert.equal(fake.complete(job.identity,"worker-1",1,h).state,"completed");
  assert.throws(()=>fake.complete(job.identity,"worker-1",1,h),/stale_or_unowned_claim/);
});
test("uncertain attempt is quarantined and not reclaimed",()=>{
  const fake=new DeterministicTransportFake(),job=prepareAdmittedJob(envelope);
  fake.enqueue(job);const claim=fake.claim(job.identity,"worker-1",running,"2026-10-08T10:01:00.000Z");
  assert.equal(fake.reconcileUnknown(job.identity,"worker-1",claim.fence).state,"manual_intervention");
  assert.throws(()=>fake.claim(job.identity,"worker-2",running,"2026-10-08T10:02:00.000Z"),/claim_not_available/);
});
test("tampered envelope and noncanonical time rejected",()=>{
  assert.throws(()=>prepareAdmittedJob({...envelope,scopeFingerprint:other,admissionExpiresAt:"2026-10-08T10:00:00.000Z"}),/invalid_work_window/);
  assert.throws(()=>prepareAdmittedJob({...envelope,slotAt:"2026-10-08T10:00:00Z"}),/noncanonical_time/);
  assert.throws(()=>prepareAdmittedJob({...envelope,jobClass:"outreach_send" as JobEnvelope["jobClass"]}),/unsupported_job_class/);
});
test("runtime capabilities permanently default off",()=>{
  assert.deepEqual(Object.values(transportRuntimeCapability),Array(7).fill(false));
});
