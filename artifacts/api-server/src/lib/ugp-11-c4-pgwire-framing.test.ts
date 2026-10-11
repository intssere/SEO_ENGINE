import assert from "node:assert/strict";
import test from "node:test";
import {
 PgWireFrameDecoder,classifyPlaintextStartup,
 isExactSimpleCommit,assertSafeCommitCompletion,
} from "./ugp-11-c4-pgwire-framing.js";
const frame=(type:string,payload:Buffer):Buffer=>{
 const raw=Buffer.alloc(5+payload.length);
 raw.write(type,0,"ascii");raw.writeInt32BE(payload.length+4,1);payload.copy(raw,5);return raw;
};
const commit=()=>frame("Q",Buffer.from("COMMIT\0"));
const done=()=>frame("C",Buffer.from("COMMIT\0"));
const ready=()=>frame("Z",Buffer.from("I"));
test("pgwire handles fragmented and coalesced frames",()=>{
 const decoder=new PgWireFrameDecoder("backend");
 const wire=Buffer.concat([done(),ready()]);
 assert.equal(decoder.push(wire.subarray(0,3)).length,0);
 assert.equal(decoder.push(wire.subarray(3,8)).length,0);
 const result=decoder.push(wire.subarray(8));
 assert.deepEqual(result.map(x=>x.type),["C","Z"]);decoder.finish();
 const frontend=new PgWireFrameDecoder("frontend");
 assert.equal(isExactSimpleCommit(frontend.push(commit())[0]!),true);
 frontend.finish();
});
test("pgwire rejects malformed, oversized and truncated frames",()=>{
 assert.throws(()=>new PgWireFrameDecoder("backend").push(Buffer.from([67,0,0,0,3])),/invalid_length/);
 assert.throws(()=>new PgWireFrameDecoder("backend").push(Buffer.from([0,0,0,0,4])),/unexpected_type/);
 assert.throws(()=>new PgWireFrameDecoder("backend").push(Buffer.from([67,127,127,127,127])),/invalid_length/);
 const dec=new PgWireFrameDecoder("backend");dec.push(done().subarray(0,4));
 assert.throws(()=>dec.finish(),/truncated_frame/);
});
test("pgwire requires exact COMMIT and idle ReadyForQuery",()=>{
 const frontend=new PgWireFrameDecoder("frontend").push(commit())[0]!;
 const backend=new PgWireFrameDecoder("backend").push(Buffer.concat([done(),ready()]));
 assert.doesNotThrow(()=>assertSafeCommitCompletion(frontend,backend));
 const wrong=new PgWireFrameDecoder("frontend").push(frame("Q",Buffer.from("ROLLBACK\0")))[0]!;
 assert.throws(()=>assertSafeCommitCompletion(wrong,backend),/not_unambiguous/);
 assert.throws(()=>assertSafeCommitCompletion(frontend,backend.slice(0,1)),/response_unproven/);
 const transaction=new PgWireFrameDecoder("backend").push(Buffer.concat([done(),frame("Z",Buffer.from("T"))]));
 assert.throws(()=>assertSafeCommitCompletion(frontend,transaction),/response_unproven/);
});
test("pgwire refuses SSL/GSS startup and invalid v3 framing",()=>{
 const startup=(code:number)=>{const b=Buffer.alloc(9);b.writeInt32BE(9,0);b.writeInt32BE(code,4);return b;};
 assert.equal(classifyPlaintextStartup(startup(196608)),"protocol_v3");
 assert.throws(()=>classifyPlaintextStartup(startup(80877103)),/tls_or_gss_unsupported/);
 assert.throws(()=>classifyPlaintextStartup(startup(80877104)),/tls_or_gss_unsupported/);
 assert.throws(()=>classifyPlaintextStartup(startup(12345)),/protocol_unsupported/);
 assert.throws(()=>classifyPlaintextStartup(startup(196608).subarray(0,8)),/length_mismatch/);
});
