/**
 * RT01-A9 synthetic subprocess fixture ONLY; NEVER a runtime/CLI entrypoint.
 * A second, independent guard rejects non-loopback databases and non-test schemas.
 * Can only run with the existing disposable PG arming sentinel.
 */
import postgres from "postgres";
import { DisposablePgAtomicAdmissionAdapter } from "./pilot-01-pg-atomic-admission-disposable.js";
import type { VerifiedGrantContext } from "./pilot-01-trusted-grant-contract.js";

const [mode, schema, key] = process.argv.slice(2);
const raw=process.env.PILOT01_DISPOSABLE_DATABASE_URL;
if (process.env.PILOT01_DISPOSABLE_PG !== "I_ACKNOWLEDGE_DISPOSABLE_ONLY" ||
    !raw || !/^pilot01_test_[0-9a-f]{32}$/.test(schema ?? "") ||
    !["compete","hold_uncommitted","commit_no_ack"].includes(mode ?? "") ||
    !["same-key","other-key"].includes(key ?? "")) {
  process.stderr.write("RT01A9_DISPOSABLE_GUARD_DENIED\n");
  process.exit(91);
}
const url=new URL(raw);
if (!["postgres:","postgresql:"].includes(url.protocol) ||
    !["127.0.0.1","localhost","[::1]","::1"].includes(url.hostname) ||
    !/^pilot01_disposable_[a-z0-9_]+$/.test(url.pathname.slice(1)) ||
    url.username !== "postgres" ||
    /railway|neon|production|diamondshelf|supabase/i.test(url.host+" "+url.pathname)) {
  process.stderr.write("RT01A9_NON_DISPOSABLE_DENIED\n");
  process.exit(92);
}
const ctx:VerifiedGrantContext={
  actorId:"synthetic-actor",tenantId:"synthetic-tenant",siteId:"synthetic-site",
  issuerId:"synthetic-issuer",sessionId:"synthetic-session",
  role:"admin",source:"server_verified_session",
};
const sql=postgres(url.toString(),{max:1,prepare:false,connect_timeout:3});
const request={
  grantId:"synthetic-grant",siteId:ctx.siteId,operation:"analyze" as const,
  idempotencyKey:key==="same-key" ? "stable-key" : "conflict-key",
};
async function run(){
  if(mode==="hold_uncommitted"){
    // The parent kills this OS process while the transaction is OPEN.
    // PostgreSQL MUST roll back the uncommitted grant/job on disconnect.
    await sql.begin(async tx=>{
      const changed=await tx.unsafe(
        `UPDATE "${schema}".grants SET state='consumed'
         WHERE grant_id=$1 AND state='issued' RETURNING grant_id`,
        [request.grantId],
      );
      if(changed.length!==1)throw Error("EXPECTED_ISSUED_GRANT");
      await tx.unsafe(
        `INSERT INTO "${schema}".jobs
           (job_id,grant_id,tenant_id,site_id,actor_id,operation,state)
           VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,'pending')`,
        [request.grantId,ctx.tenantId,ctx.siteId,ctx.actorId,request.operation],
      );
      process.stdout.write("OPEN\n");
      await new Promise<void>(()=>{});
    });
    return;
  }
  const adapter=new DisposablePgAtomicAdmissionAdapter(sql,schema);
  const result=await adapter.admit({context:ctx,request});
  if(mode==="commit_no_ack"){
    // A deliberate *client acknowledgement loss simulation*: the client
    // receives no receipt from this short-lived process, but COMMIT completed.
    // This is NOT a true on-wire lost-COMMIT transport fault injection.
    if(result.status!=="committed")throw Error("EXPECTED_COMMIT");
    process.stdout.write("COMMITTED_WITHHELD_RECEIPT\n");
  } else {
    process.stdout.write(JSON.stringify({status:result.status,
      receipt: "receipt" in result ? result.receipt : null})+"\n");
  }
}
run().then(async()=>{await sql.end({timeout:3});process.exit(0);})
  .catch(async()=>{process.stderr.write("RT01A9_CHILD_FAILURE\n");
    try{await sql.end({timeout:2});}catch{}
    process.exit(2);});
