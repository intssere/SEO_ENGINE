/** PILOT-01 offline reference model for fencing invariants, NOT persistent storage.
 * No database, worker startup, network, provider, route or publication integration.
 * The durable PostgreSQL implementation remains separately gated by #1256.
 */
export type LeaseClaim = Readonly<{ jobId:string; owner:string; generation:number; expiresAtMs:number }>;
type Job = {generation:number; owner:string|null; expiresAtMs:number; status:"pending"|"active"|"completed"; result:string|null};
export class OfflineFencingReference {
 private readonly jobs=new Map<string,Job>();
 register(jobId:string):boolean {
  if(!jobId||this.jobs.has(jobId))return false;
  this.jobs.set(jobId,{generation:0,owner:null,expiresAtMs:0,status:"pending",result:null});
  return true;
 }
 claim(jobId:string,owner:string,nowMs:number,ttlMs:number):LeaseClaim|null {
  const job=this.jobs.get(jobId);
  if(!job||!owner||!Number.isFinite(nowMs)||!Number.isFinite(ttlMs)||ttlMs<=0||
    !Number.isFinite(nowMs+ttlMs)||job.status==="completed"||
    (job.status==="active"&&job.expiresAtMs>nowMs))return null;
  job.generation+=1;job.owner=owner;job.expiresAtMs=nowMs+ttlMs;job.status="active";
  return Object.freeze({jobId,owner,generation:job.generation,expiresAtMs:job.expiresAtMs});
 }
 private valid(lease:LeaseClaim,nowMs:number):Job|null {
  const job=this.jobs.get(lease.jobId);
  return job&&job.status==="active"&&job.owner===lease.owner&&
   job.generation===lease.generation&&Number.isFinite(nowMs)&&
   job.expiresAtMs>nowMs?job:null;
 }
 renew(lease:LeaseClaim,nowMs:number,ttlMs:number):LeaseClaim|null {
  const job=this.valid(lease,nowMs);
  if(!job||!Number.isFinite(ttlMs)||ttlMs<=0||!Number.isFinite(nowMs+ttlMs))return null;
  job.expiresAtMs=nowMs+ttlMs;
  return Object.freeze({...lease,expiresAtMs:job.expiresAtMs});
 }
 commit(lease:LeaseClaim,nowMs:number,result:string):boolean {
  const job=this.valid(lease,nowMs);
  if(!job||!result)return false;
  job.status="completed";job.result=result;return true;
 }
 snapshot(jobId:string):Readonly<Job>|null {
  const job=this.jobs.get(jobId);
  return job?Object.freeze({...job}):null;
 }
}
