/** PILOT-01 persistence boundary (source-only, zero I/O).
 * This is an interface contract, NOT a PostgreSQL implementation.
 * No runtime route, database connection, migration, or deployment wiring.
 * The adapter must implement atomic checks with DB-authoritative time;
 * these types do not prove any transaction or security property.
 */
export type FenceScope=Readonly<{tenantId:string;siteId:string;jobId:string}>;
export type FenceToken=FenceScope&Readonly<{ownerId:string;generation:bigint}>;
export type DurableClaim=FenceToken&Readonly<{leaseUntil:string}>;
export type CommitOutcome="committed"|"fenced"|"unavailable";
export type GrantScope=Readonly<{tenantId:string;siteId:string;actorId:string;operation:"analyze"|"recommend"|"site_write";diffHash?:string}>;
export type GrantOutcome="consumed"|"denied"|"unavailable";
export interface Pilot01DurableFencingPort {
 /** Must atomically claim pending/expired job, increment generation and audit in same transaction. */
 claim(scope:FenceScope,ownerId:string):Promise<DurableClaim|null>;
 /** Must atomically enforce owner, generation, unexpired DB-clock lease and audit. */
 renew(token:FenceToken):Promise<DurableClaim|null>;
 /** Must reject an expired, superseded or wrong-scope token; commit result and audit together. */
 complete(token:FenceToken,resultDigest:string):Promise<CommitOutcome>;
 /** Must serialize revoke/consume, bind trusted scope, and commit receipt atomically. */
 consumeGrant(grantId:string,scope:GrantScope):Promise<GrantOutcome>;
 /** Must serialize with consumption, revoke once, and emit immutable audit receipt. */
 revokeGrant(grantId:string,scope:Pick<GrantScope,"tenantId"|"siteId">):Promise<"revoked"|"denied"|"unavailable">;
}
/** Caller-visible fail-closed adapter for synthetic injected ports only.
 * It denies unavailable/exceptional persistence, never substitutes in-memory success.
 */
export async function guardedComplete(port:Pilot01DurableFencingPort,token:FenceToken,digest:string):Promise<CommitOutcome>{
 if(!token.tenantId||!token.siteId||!token.jobId||!token.ownerId||
    token.generation<=0n||!digest)return "fenced";
 try {const result=await port.complete(token,digest);return result==="committed"||result==="fenced"?result:"unavailable";}
 catch{return "unavailable";}
}
export async function guardedConsume(port:Pilot01DurableFencingPort,id:string,scope:GrantScope):Promise<GrantOutcome>{
 if(!id||!scope.actorId||!scope.tenantId||!scope.siteId||
    !["analyze","recommend","site_write"].includes(scope.operation)||
    (scope.operation==="site_write"&&!scope.diffHash))return "denied";
 try {const result=await port.consumeGrant(id,scope);return result==="consumed"||result==="denied"?result:"unavailable";}
 catch{return "unavailable";}
}
