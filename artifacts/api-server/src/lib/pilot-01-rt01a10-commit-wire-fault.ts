/**
 * RT01-A10 disposable-only PostgreSQL wire proxy for deterministic COMMIT
 * acknowledgement loss. NEVER instantiate outside the armed ephemeral test.
 * Pure local TCP forwarding; no SQL modification or runtime import.
 *
 * Pre-COMMIT: terminate when the client sends COMMIT, before forwarding it.
 * Post-COMMIT: forward COMMIT; suppress backend response and disconnect only
 * after PostgreSQL sends a ReadyForQuery('I') following COMMIT.
 */
import { createServer, connect, type Socket, type Server } from "node:net";

export type CommitFaultPoint = "before_commit_send" | "after_backend_commit_ready";
const readyIdle = Buffer.from([0x5a, 0, 0, 0, 5, 0x49]);
const commitPattern = /\bCOMMIT\x00/i;
const cleanHost = (host: string): boolean => host === "127.0.0.1" || host === "::1" || host === "localhost";

export class DisposableCommitWireFault {
  private readonly server: Server;
  private readonly sockets = new Set<Socket>();
  private seenCommit = false;
  private fired = false;
  private pending = Buffer.alloc(0);
  private readonly firedPromise: Promise<void>;
  private signal!: () => void;
  private readonly targetPort: number;
  readonly point: CommitFaultPoint;

  private constructor(point: CommitFaultPoint, targetPort: number) {
    if (process.env.PILOT01_DISPOSABLE_PG !== "I_ACKNOWLEDGE_DISPOSABLE_ONLY" ||
        !process.env.PILOT01_DISPOSABLE_DATABASE_URL)
      throw Error("RT01A10_DISPOSABLE_SENTINEL_REQUIRED");
    const u = new URL(process.env.PILOT01_DISPOSABLE_DATABASE_URL);
    if (!["postgres:", "postgresql:"].includes(u.protocol) ||
        !cleanHost(u.hostname) || u.username !== "postgres" ||
        !/^pilot01_disposable_[a-z0-9_]+$/.test(u.pathname.slice(1)) ||
        /railway|production|staging|neon|supabase|diamondshelf/i.test(u.host + u.pathname) ||
        !Number.isInteger(targetPort) || targetPort < 1 || targetPort > 65535)
      throw Error("RT01A10_REFUSE_NONLOCAL_OR_NONDISPOSABLE");
    this.targetPort = targetPort;
    this.point = point;
    this.firedPromise = new Promise(resolve => { this.signal = resolve; });
    this.server = createServer(client => this.accept(client));
  }

  static async open(point: CommitFaultPoint, targetPort: number): Promise<DisposableCommitWireFault> {
    const proxy = new DisposableCommitWireFault(point, targetPort);
    await new Promise<void>((resolve, reject) => {
      proxy.server.once("error", reject);
      proxy.server.listen(0, "127.0.0.1", () => {
        proxy.server.off("error", reject);
        resolve();
      });
    });
    return proxy;
  }

  get port(): number {
    const addr = this.server.address();
    if (!addr || typeof addr === "string") throw Error("RT01A10_PROXY_NOT_LISTENING");
    return addr.port;
  }
  get faultFired(): boolean { return this.fired; }

  private cut(client: Socket, backend: Socket): void {
    if (this.fired) return;
    this.fired = true;
    client.destroy();
    backend.destroy();
    this.signal();
  }

  private accept(client: Socket): void {
    if (this.seenCommit || this.fired) { client.destroy(); return; }
    const backend = connect({ host: "127.0.0.1", port: this.targetPort });
    this.sockets.add(client);
    this.sockets.add(backend);
    const close = (socket: Socket) => {
      this.sockets.delete(socket);
    };
    client.on("close", () => close(client));
    backend.on("close", () => close(backend));
    client.on("error", () => { backend.destroy(); });
    backend.on("error", () => { client.destroy(); });

    // postgres.js sends COMMIT as a simple protocol query with a terminating
    // NUL byte. Limit recognition to the query text; no production proxying.
    let queryTail = "";
    client.on("data", (data: Buffer) => {
      if (this.fired) return;
      const candidate = queryTail + data.toString("latin1");
      queryTail = candidate.slice(-64);
      if (!this.seenCommit && commitPattern.test(candidate)) {
        this.seenCommit = true;
        if (this.point === "before_commit_send") {
          this.cut(client, backend);
          return;
        }
      }
      backend.write(data);
    });

    backend.on("data", (data: Buffer) => {
      if (this.fired) return;
      if (!this.seenCommit || this.point === "before_commit_send") {
        client.write(data);
        return;
      }
      // Do not forward even one byte of the COMMIT response to the client.
      this.pending = Buffer.concat([this.pending, data]);
      if (this.pending.indexOf(readyIdle) !== -1) {
        // Backend has sent an idle ReadyForQuery after committing.
        this.cut(client, backend);
      } else if (this.pending.length > 1024 * 1024) {
        this.cut(client, backend); // bounded, fail closed
      }
    });
  }

  async observed(timeoutMs = 8000): Promise<void> {
    await Promise.race([
      this.firedPromise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(Error("RT01A10_WIRE_FAULT_NOT_OBSERVED")), timeoutMs).unref();
      }),
    ]);
  }

  async close(): Promise<void> {
    for (const socket of this.sockets) socket.destroy();
    if (!this.server.listening) return;
    await new Promise<void>(resolve => this.server.close(() => resolve()));
  }
}
