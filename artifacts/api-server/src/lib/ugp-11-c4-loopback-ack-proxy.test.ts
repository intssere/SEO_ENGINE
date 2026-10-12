import assert from "node:assert/strict";
import test from "node:test";
import net from "node:net";
import {startDisposableCommitAckProxy} from "./ugp-11-c4-loopback-ack-proxy.js";

const frame=(type:string,payload:Buffer)=>{const b=Buffer.alloc(payload.length+5);b.write(type,0,"ascii");b.writeInt32BE(payload.length+4,1);payload.copy(b,5);return b;};
const startup=()=>{const b=Buffer.alloc(9);b.writeInt32BE(9,0);b.writeInt32BE(196608,4);return b;};
const query=(q:string)=>frame("Q",Buffer.from(q+"\0","ascii"));
const ready=()=>frame("Z",Buffer.from("I"));
const complete=()=>frame("C",Buffer.from("COMMIT\0"));
const connect=(port:number)=>net.connect({host:"127.0.0.1",port});
test("loopback proxy observes COMMIT completion and drops its successful ACK",async()=>{
 let sawCommit=false;
 const upstream=net.createServer(socket=>{
   let phase=0;
   socket.on("data",chunk=>{
     assert.ok(Buffer.isBuffer(chunk),"mock_upstream_requires_binary");
     if(phase===0){
       assert.equal(chunk.readInt32BE(4),196608);
       phase=1;
       socket.write(ready());
     }else{
       assert.deepEqual(chunk,query("COMMIT"));
       sawCommit=true;
       socket.write(Buffer.concat([complete(),ready()]));
     }
   });
 });
 await new Promise<void>(resolve=>upstream.listen(0,"127.0.0.1",resolve));
 const addr=upstream.address();assert.ok(addr&&typeof addr!=="string");
 const proxy=await startDisposableCommitAckProxy(addr.port);
 const client=connect(proxy.port);
 let received=Buffer.alloc(0);
 client.on("data",c=>{if(!Buffer.isBuffer(c)) throw Error("nonbinary_client_chunk");received=Buffer.concat([received,c]);});
 try{
   await new Promise<void>((resolve,reject)=>{
     client.once("error",reject);
     client.once("connect",()=>{client.write(startup());resolve();});
   });
   await new Promise<void>((resolve,reject)=>{
     client.once("data",()=>resolve());client.once("error",reject);
   });
   client.write(query("COMMIT"));
   assert.equal(await proxy.completion,"commit_ack_dropped");
   assert.equal(sawCommit,true);
   assert.deepEqual(received,ready()); // No CommandComplete or second ReadyForQuery escapes.
 }finally{
   client.destroy();await proxy.close();await new Promise<void>(resolve=>upstream.close(()=>resolve()));
 }
});
test("loopback proxy fails closed on SSL startup request",async()=>{
 const upstream=net.createServer(socket=>socket.destroy());
 await new Promise<void>(resolve=>upstream.listen(0,"127.0.0.1",resolve));
 const addr=upstream.address();assert.ok(addr&&typeof addr!=="string");
 const proxy=await startDisposableCommitAckProxy(addr.port);
 const client=connect(proxy.port);
 try{
   await new Promise<void>(resolve=>client.once("connect",resolve));
   const ssl=Buffer.alloc(8);ssl.writeInt32BE(8,0);ssl.writeInt32BE(80877103,4);
   client.write(ssl);
   await assert.rejects(proxy.completion,/invalid_startup_length|tls_or_gss_unsupported/);
 }finally{
   client.destroy();await proxy.close();await new Promise<void>(resolve=>upstream.close(()=>resolve()));
 }
});
