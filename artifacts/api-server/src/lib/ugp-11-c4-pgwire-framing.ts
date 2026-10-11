/** Disposable PostgreSQL v3 wire framing only. Not a production proxy or a COMMIT outcome oracle.
 * Fail-closed parser for the future loopback-only lost-ACK test apparatus.
 */
const MAX_FRAME = 1024 * 1024;
export type PgWireFrame = { type: string; raw: Buffer; payload: Buffer };
export class PgWireFrameDecoder {
  private pending = Buffer.alloc(0);
  constructor(private readonly direction: "frontend" | "backend") {}
  push(chunk: Buffer): PgWireFrame[] {
    if (!Buffer.isBuffer(chunk) || chunk.length > MAX_FRAME) throw Error("pgwire_invalid_chunk");
    if (this.pending.length + chunk.length > MAX_FRAME) throw Error("pgwire_buffer_limit");
    this.pending = Buffer.concat([this.pending, chunk]);
    const frames: PgWireFrame[] = [];
    while (this.pending.length >= 5) {
      const typeByte = this.pending[0]!;
      // Normal protocol frames only. Startup/SSL/GSS negotiation must be
      // classified separately rather than interpreted as a typed frame.
      if (typeByte < 65 || typeByte > 122 || (typeByte > 90 && typeByte < 97))
        throw Error("pgwire_unexpected_type");
      const type = String.fromCharCode(typeByte);
      const length = this.pending.readInt32BE(1);
      if (length < 4 || length > MAX_FRAME - 1) throw Error("pgwire_invalid_length");
      const total = length + 1;
      if (this.pending.length < total) break;
      const raw = Buffer.from(this.pending.subarray(0,total));
      this.pending = this.pending.subarray(total);
      frames.push({type,raw,payload:raw.subarray(5)});
    }
    return frames;
  }
  finish(): void { if(this.pending.length) throw Error("pgwire_truncated_frame"); }
}
export function classifyPlaintextStartup(bytes: Buffer): "protocol_v3" {
  if (!Buffer.isBuffer(bytes) || bytes.length < 8 || bytes.length > MAX_FRAME)
    throw Error("pgwire_startup_invalid");
  if (bytes.readInt32BE(0) !== bytes.length) throw Error("pgwire_startup_length_mismatch");
  const code = bytes.readInt32BE(4);
  if (code === 80877103 || code === 80877104) throw Error("pgwire_tls_or_gss_unsupported");
  if (code !== 196608) throw Error("pgwire_protocol_unsupported");
  if (bytes[bytes.length - 1] !== 0) throw Error("pgwire_startup_unterminated");
  return "protocol_v3";
}
export function isExactSimpleCommit(frame: PgWireFrame): boolean {
  return frame.type === "Q" && frame.payload.equals(Buffer.from("COMMIT\0","ascii"));
}
export function isCommitCommandComplete(frame: PgWireFrame): boolean {
  return frame.type === "C" && frame.payload.equals(Buffer.from("COMMIT\0","ascii"));
}
export function isIdleReadyForQuery(frame: PgWireFrame): boolean {
  return frame.type === "Z" && frame.payload.equals(Buffer.from("I","ascii"));
}
export function assertSafeCommitCompletion(
  sent: PgWireFrame,
  received: PgWireFrame[],
): void {
  if (!isExactSimpleCommit(sent)) throw Error("pgwire_commit_not_unambiguous");
  if (received.length !== 2 ||
      !isCommitCommandComplete(received[0]!) ||
      !isIdleReadyForQuery(received[1]!))
    throw Error("pgwire_commit_response_unproven");
}
