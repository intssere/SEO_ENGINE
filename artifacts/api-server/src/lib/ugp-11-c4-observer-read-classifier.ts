/** UGP-11.C4 isolated observer read-result classifier.
 * A database error or incomplete read must never become "available" evidence.
 * No SQL execution, retry, provider dispatch, or production authority.
 */
import type {EvidenceSnapshot} from "./ugp-11-c4-fenced-evidence-reconcile.js";

type Marker=Extract<EvidenceSnapshot,{kind:"available"}>["markers"][number];
type Job=NonNullable<Extract<EvidenceSnapshot,{kind:"available"}>["job"]>;
export type ObserverReadResult=
 | Readonly<{kind:"complete";markers:readonly Marker[];job:Job|null;transactionClosed:true}>
 | Readonly<{kind:"failed";error:unknown}>
 | Readonly<{kind:"incomplete";reason:string}>
 | Readonly<{kind:"complete";markers:readonly Marker[];job:Job|null;transactionClosed:false}>;

/** Deliberately conservative: zero markers or missing row is incomplete, not proof of absence. */
export function classifyIndependentObserverResult(read:ObserverReadResult):EvidenceSnapshot {
 if(read.kind==="failed") return {kind:"unavailable"};
 if(read.kind==="incomplete") return {kind:"partial"};
 if(!read.transactionClosed || !read.job || read.markers.length===0) return {kind:"partial"};
 if(read.markers.length!==1) return {kind:"conflicting"};
 return {kind:"available",markers:read.markers,job:read.job};
}
