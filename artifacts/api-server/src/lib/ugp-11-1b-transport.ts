/**
 * UGP-11.1B: inert transport contract and deterministic fake.
 * Not connected to any runtime, database, provider, or scheduler.
 */
import { createHash } from "node:crypto";

export const TRANSPORT_CONTRACT_VERSION = "ugp-11-1b-transport-v1" as const;
export type TransportJobClass = "signal_refresh" | "crawl_refresh" | "content_research" | "decay_analysis" | "backlink_refresh";
export type TransportState = "queued" | "claimed" | "completed" | "dead_letter" | "manual_intervention";
export type JobEnvelope = Readonly<{
  version: typeof TRANSPORT_CONTRACT_VERSION;
  siteId: string;
  tenantId: string;
  jobClass: TransportJobClass;
  upstreamId: string;
  upstreamFingerprint: string;
  scopeFingerprint: string;
  idempotencyKey: string;
  slotAt: string;
  expiresAt: string;
  admissionId: string;
  admissionFingerprint: string;
  admissionExpiresAt: string;
  controlRevision: number;
  controlFingerprint: string;
}>;
export type AdmittedJob = Readonly<{ envelope: JobEnvelope; identity: string }>;
export type TransportRecord = Readonly<{ job: AdmittedJob; state: TransportState; fence: number; workerId: string | null; attempts: number; receiptFingerprint: string | null }>;
export interface JobTransport {
  enqueue(job: AdmittedJob): TransportRecord;
  claim(identity: string, workerId: string, control: ControlSnapshot, at: string): TransportRecord;
  complete(identity: string, workerId: string, fence: number, receiptFingerprint: string): TransportRecord;
  reconcileUnknown(identity: string, workerId: string, fence: number): TransportRecord;
  inspect(identity: string): TransportRecord | null;
}
export type ControlSnapshot = Readonly<{ mode: "running" | "paused" | "draining" | "drained" | "killed"; revision: number; fingerprint: string }>;

const HEX = /^[0-9a-f]{64}$/;
const ID = /^[a-zA-Z0-9._:-]{1,128}$/;
const JOB_CLASSES = new Set<TransportJobClass>(["signal_refresh","crawl_refresh","content_research","decay_analysis","backlink_refresh"]);
const KEYS = ["version","siteId","tenantId","jobClass","upstreamId","upstreamFingerprint","scopeFingerprint","idempotencyKey","slotAt","expiresAt","admissionId","admissionFingerprint","admissionExpiresAt","controlRevision","controlFingerprint"];
function fail(reason: string): never { throw new Error(reason); }
function timestamp(s: string): number {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s)) return fail("noncanonical_time");
  const t=Date.parse(s); if (!Number.isFinite(t) || new Date(t).toISOString()!==s) return fail("invalid_time"); return t;
}
function checkEnvelope(e: JobEnvelope): void {
  if (!e || typeof e!=="object" || Array.isArray(e) || JSON.stringify(Object.keys(e).sort())!==JSON.stringify([...KEYS].sort())) fail("invalid_envelope_shape");
  if (e.version!==TRANSPORT_CONTRACT_VERSION) fail("invalid_version");
  if (![e.siteId,e.tenantId,e.upstreamId,e.idempotencyKey,e.admissionId].every(x=>typeof x==="string" && ID.test(x))) fail("invalid_identity");
  if (!JOB_CLASSES.has(e.jobClass)) fail("unsupported_job_class");
  if (![e.upstreamFingerprint,e.scopeFingerprint,e.admissionFingerprint,e.controlFingerprint].every(x=>typeof x==="string" && HEX.test(x))) fail("invalid_fingerprint");
  if (!Number.isSafeInteger(e.controlRevision) || e.controlRevision<1) fail("invalid_control_revision");
  const start=timestamp(e.slotAt), expires=timestamp(e.expiresAt), admitExpires=timestamp(e.admissionExpiresAt);
  if (start>=expires || admitExpires<=start) fail("invalid_work_window");
}
export function canonicalJobIdentity(e: JobEnvelope): string {
  checkEnvelope(e);
  const fields=KEYS.slice().sort().map(k=>[k,e[k as keyof JobEnvelope]]);
  return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}
export function prepareAdmittedJob(envelope: JobEnvelope): AdmittedJob {
  const identity=canonicalJobIdentity(envelope);
  return {envelope:Object.freeze({...envelope}),identity};
}
export class DeterministicTransportFake implements JobTransport {
  private readonly records=new Map<string,TransportRecord>();
  private readonly idempotency=new Map<string,string>();
  enqueue(job: AdmittedJob): TransportRecord {
    if (canonicalJobIdentity(job.envelope)!==job.identity) fail("identity_mismatch");
    const key=job.envelope.tenantId+"|"+job.envelope.siteId+"|"+job.envelope.idempotencyKey;
    const previous=this.idempotency.get(key);
    if (previous && previous!==job.identity) fail("conflicting_idempotency_replay");
    const prior=this.records.get(job.identity);
    if (prior) return prior;
    const record: TransportRecord=Object.freeze({job,state:"queued",fence:0,workerId:null,attempts:0,receiptFingerprint:null});
    this.records.set(job.identity,record); this.idempotency.set(key,job.identity); return record;
  }
  claim(identity: string, workerId: string, control: ControlSnapshot, at: string): TransportRecord {
    const previous=this.required(identity);
    if (previous.state!=="queued") fail("claim_not_available");
    if (!ID.test(workerId)) fail("invalid_worker");
    if (!control || control.mode!=="running" || control.revision!==previous.job.envelope.controlRevision || control.fingerprint!==previous.job.envelope.controlFingerprint) fail("control_closed_or_stale");
    const now=timestamp(at), e=previous.job.envelope;
    if (now<timestamp(e.slotAt) || now>=timestamp(e.expiresAt) || now>=timestamp(e.admissionExpiresAt)) fail("work_expired_or_not_due");
    const next:TransportRecord=Object.freeze({...previous,state:"claimed",workerId,fence:previous.fence+1,attempts:previous.attempts+1});
    this.records.set(identity,next); return next;
  }
  complete(identity: string, workerId: string, fence: number, receiptFingerprint: string): TransportRecord {
    const previous=this.owned(identity,workerId,fence);
    if (!HEX.test(receiptFingerprint)) fail("invalid_receipt");
    const next:TransportRecord=Object.freeze({...previous,state:"completed",receiptFingerprint});
    this.records.set(identity,next); return next;
  }
  reconcileUnknown(identity: string, workerId: string, fence: number): TransportRecord {
    const previous=this.owned(identity,workerId,fence);
    const next:TransportRecord=Object.freeze({...previous,state:"manual_intervention"});
    this.records.set(identity,next); return next;
  }
  inspect(identity: string): TransportRecord|null {return this.records.get(identity)??null;}
  private required(identity:string):TransportRecord {return this.records.get(identity)??fail("job_not_found");}
  private owned(identity:string,workerId:string,fence:number):TransportRecord {
    const record=this.required(identity);
    if (record.state!=="claimed" || record.workerId!==workerId || record.fence!==fence) fail("stale_or_unowned_claim");
    return record;
  }
}
export const transportRuntimeCapability=Object.freeze({persistent:false,worker:false,scheduler:false,providerNetwork:false,productionDdl:false,externalSend:false,publication:false,publicSiteWrite:false});
