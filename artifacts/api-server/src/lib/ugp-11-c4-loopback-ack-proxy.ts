/** Local disposable PostgreSQL v3 loopback transport experiment only.
 * No TLS/GSS, multi-client pooling, extended query protocol, production use or retry authority.
 */
import net, {type Socket} from "node:net";
import {PgWireFrameDecoder, classifyPlaintextStartup, isExactSimpleCommit, isCommitCommandComplete, isIdleReadyForQuery} from "./ugp-11-c4-pgwire-framing.js";

export interface LoopbackFaultProxy {
  port: number;
  close(): Promise<void>;
  completion: Promise<"commit_ack_dropped">;
}
export async function startDisposableCommitAckProxy(upstreamPort: number): Promise<LoopbackFaultProxy> {
  if (!Number.isInteger(upstreamPort) || upstreamPort < 1 || upstreamPort > 65535) throw Error("invalid_upstream_port");
  const server = net.createServer();
  const sockets = new Set<Socket>();
  let connections = 0;
  let finished = false;
  let resolveCompletion!: (v:"commit_ack_dropped")=>void;
  let rejectCompletion!: (e:Error)=>void;
  const completion = new Promise<"commit_ack_dropped">((resolve,reject)=>{resolveCompletion=resolve;rejectCompletion=reject;});
  // A caller must always observe completion rejection. Do not leave an unhandled rejection.
  void completion.catch(()=>{});
  let guard: ReturnType<typeof setTimeout> | undefined;
  const stop = (why:Error | null) => {
    if(finished) return;
    finished=true;
    if(guard) clearTimeout(guard);
    for(const socket of sockets) socket.destroy();
    server.close();
    if(why) rejectCompletion(why);
    else resolveCompletion("commit_ack_dropped");
  };
  server.on("connection",(client)=>{
    if(++connections!==1){client.destroy();stop(Error("proxy_multiple_clients"));return;}
    sockets.add(client);
    const upstream=net.connect({host:"127.0.0.1",port:upstreamPort});
    sockets.add(upstream);
    let startup=Buffer.alloc(0);
    let startupDone=false;
    let idle=false;
    let waitingForCommit=false;
    let commitCommandSeen=false;
    const frontend=new PgWireFrameDecoder("frontend");
    const backend=new PgWireFrameDecoder("backend");
    client.on("error",()=>stop(Error("proxy_client_disconnect")));
    upstream.on("error",()=>stop(Error("proxy_upstream_disconnect")));
    client.on("close",()=>{if(!finished) stop(Error("proxy_client_closed"));});
    upstream.on("close",()=>{if(!finished) stop(Error("proxy_upstream_closed"));});
    client.on("data", chunk=>{
      if(finished)return;
      if(!Buffer.isBuffer(chunk)){stop(Error("proxy_nonbinary_client_chunk"));return;}
      try {
        let data=chunk;
        if(!startupDone){
          startup=Buffer.concat([startup,chunk]);
          if(startup.length>65536) throw Error("proxy_startup_too_large");
          if(startup.length<4)return;
          const n=startup.readInt32BE(0);
          if(n<9||n>65536) throw Error("proxy_invalid_startup_length");
          if(startup.length<n)return;
          classifyPlaintextStartup(startup.subarray(0,n));
          upstream.write(startup.subarray(0,n));
          data=startup.subarray(n);startup=Buffer.alloc(0);startupDone=true;
        }
        if(!data.length)return;
        const frames=frontend.push(data);
        for(const frame of frames){
          // Limit the experiment to simple-query messages; never pass pipelining,
          // extended protocol, terminate or an unrecognized frontend operation.
          if(frame.type!=="Q") throw Error("proxy_unsupported_frontend_frame");
          if(!idle||waitingForCommit) throw Error("proxy_query_while_busy");
          if(isExactSimpleCommit(frame)){
            waitingForCommit=true;commitCommandSeen=false;idle=false;
          } else idle=false;
          upstream.write(frame.raw);
        }
      } catch(e){stop(e instanceof Error?e:Error("proxy_frontend_fault"));}
    });
    upstream.on("data", chunk=>{
      if(finished)return;
      if(!Buffer.isBuffer(chunk)){stop(Error("proxy_nonbinary_upstream_chunk"));return;}
      try {
        if(!startupDone) throw Error("proxy_server_before_startup");
        for(const frame of backend.push(chunk)){
          if(waitingForCommit){
            // Never forward a response in the COMMIT acknowledgement window.
            if(!commitCommandSeen && isCommitCommandComplete(frame)){
              commitCommandSeen=true;continue;
            }
            if(commitCommandSeen && isIdleReadyForQuery(frame)){
              stop(null);return;
            }
            throw Error("proxy_commit_reply_unproven");
          }
          // Authentication and ordinary results are forwarded but the first
          // ReadyForQuery marks the session as able to receive one simple query.
          if(frame.type==="Z"){
            if(frame.payload.length!==1) throw Error("proxy_invalid_ready");
            idle=frame.payload[0]===73;
          } else if(!"RSEKZNTA DC123GHIVntsv".replace(/ /g,"").includes(frame.type)){
            throw Error("proxy_unsupported_backend_frame");
          }
          client.write(frame.raw);
        }
      }catch(e){stop(e instanceof Error?e:Error("proxy_backend_fault"));}
    });
  });
  server.on("error",(err)=>stop(err));
  try {
    await new Promise<void>((resolve,reject)=>{
      server.once("error",reject);
      server.listen(0,"127.0.0.1",()=>{server.off("error",reject);resolve();});
    });
  }catch(e){stop(e instanceof Error?e:Error("proxy_listen_failed"));throw e;}
  guard=setTimeout(()=>stop(Error("proxy_watchdog_expired")),15000);
  guard.unref();
  const addr=server.address();
  if(!addr||typeof addr==="string"){stop(Error("proxy_unexpected_address"));throw Error("proxy_unexpected_address");}
  return {port:addr.port,completion,close:async()=>{stop(Error("proxy_closed_by_caller"));}};
}
