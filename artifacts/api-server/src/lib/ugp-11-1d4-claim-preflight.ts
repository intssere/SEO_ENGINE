/** UGP-11.1D4: inspection-only P9 control preflight. NEVER grants a claim. */
import { canonicalJobIdentity, type AdmittedJob, type ControlSnapshot } from "./ugp-11-1b-transport.js";

export const UGP_11_D4_CAPABILITIES = Object.freeze({
  durableP9ControlRead: false,
  claim: false,
  worker: false,
  scheduler: false,
  providerDispatch: false,
  productionMigration: false
});
export type ClaimDenial =
  | "identity_invalid" | "control_closed_or_stale" | "work_window_closed"
  | "invalid_worker" | "durable_p9_control_not_integrated";
export type ClaimPreflight = Readonly<{
  authorized: false;
  claimAllowed: false;
  dispatchAllowed: false;
  reason: ClaimDenial;
  identity: string | null;
}>;
const ID=/^[a-zA-Z0-9._:-]{1,128}$/;
const HEX=/^[0-9a-f]{64}$/;
function stamp(value:string):number {
  if(typeof value!=="string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
    throw new Error("invalid_timestamp");
  const t=Date.parse(value);
  if(!Number.isFinite(t) || new Date(t).toISOString()!==value)throw new Error("invalid_timestamp");
  return t;
}
function denied(reason:ClaimDenial,identity:string|null):ClaimPreflight {
  return Object.freeze({authorized:false,claimAllowed:false,dispatchAllowed:false,reason,identity});
}
/**
 * Only an advisory preview. A future transactional claim must acquire and check
 * an independently durable, authoritative P9 control record INSIDE the same
 * database transaction as its fenced claim update. Caller snapshots alone are
 * never sufficient to authorize work.
 */
export function inspectClaimPreflight(
  job:AdmittedJob,workerId:string,control:ControlSnapshot,at:string
):ClaimPreflight {
  let identity:string|null=null;
  try {
    identity=canonicalJobIdentity(job.envelope);
    if(job.identity!==identity) return denied("identity_invalid",identity);
  } catch { return denied("identity_invalid",null); }
  if(typeof workerId!=="string" || !ID.test(workerId))return denied("invalid_worker",identity);
  if(!control || control.mode!=="running" || !Number.isSafeInteger(control.revision) ||
     control.revision!==job.envelope.controlRevision ||
     typeof control.fingerprint!=="string" || !HEX.test(control.fingerprint) ||
     control.fingerprint!==job.envelope.controlFingerprint)
    return denied("control_closed_or_stale",identity);
  try {
    const now=stamp(at);
    if(now<stamp(job.envelope.slotAt) || now>=stamp(job.envelope.expiresAt) ||
       now>=stamp(job.envelope.admissionExpiresAt))
      return denied("work_window_closed",identity);
  } catch {return denied("work_window_closed",identity);}
  return denied("durable_p9_control_not_integrated",identity);
}
