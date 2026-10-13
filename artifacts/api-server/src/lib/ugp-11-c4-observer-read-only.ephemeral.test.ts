/** Disposable PostgreSQL assertion of a hard SQL-level observation-only boundary. */
import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";

test("REPEATABLE READ independent observer transaction rejects SQL writes",async t=>{
 const raw=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!raw){t.skip("disposable PostgreSQL unavailable");return;}
 let url:URL;
 try{url=new URL(raw)}catch{throw Error("disposable_database_only")}
 if(!["postgres:","postgresql:"].includes(url.protocol)||
 !["localhost","127.0.0.1"].includes(url.hostname)||
 url.port!=="5432"||url.pathname!=="/seo_engine_test")throw Error("disposable_database_only");
 const db=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 try{
  await assert.rejects(db.begin("isolation level repeatable read",async tx=>{
   await tx`SET TRANSACTION READ ONLY`;
   const [mode]=await tx`SELECT current_setting('transaction_read_only') AS enabled`;
   assert.equal(mode!.enabled,"on");
   // WHERE FALSE would change no records, but PostgreSQL must still deny the UPDATE.
   await tx`UPDATE ugp11_transport_fixture.jobs SET fence=fence+1 WHERE FALSE`;
  }),/read.only transaction/i);
 }finally{await db.end({timeout:2}).catch(()=>{})}
});
