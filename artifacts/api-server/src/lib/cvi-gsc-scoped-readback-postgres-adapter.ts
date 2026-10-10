import type postgres from "postgres";
import { CVI_GSC_SCOPED_READBACK_SQL, type CviScopedReadbackStore } from "./cvi-gsc-scoped-ledger-readback.js";
import type { CviGscLedgerRow } from "./cvi-gsc-ledger-receipt-readback.js";

export const CVI_GSC_SCOPED_POSTGRES_ADAPTER_VERSION = "cvi-1c17-scoped-postgres-adapter-v1" as const;

/** Low-level server-only driver adapter. Never construct from HTTP input:
 * the Sql connection and authenticated identifiers must come from trusted
 * server request authentication and reviewed database configuration.
 * This adapter makes no network connection on its own and offers no routes.
 */
export function createCviScopedPostgresReadbackStore(
  sql: postgres.Sql,
): CviScopedReadbackStore {
  return {
    async fetchScoped(input) {
      const params = [
        input.acquisitionId, input.tenantId, input.siteId,
        input.connectionId, input.authSubject, input.authSessionId,
      ];
      if (params.some(value => typeof value !== "string" || value.length < 1 ||
          value.length > 255 || value !== value.trim() ||
          /[\u0000-\u001f\u007f]/.test(value)))
        throw new Error("cvi_1c17_scope_parameters_invalid");
      const rows = await sql.unsafe<Record<string, unknown>[]>(
        CVI_GSC_SCOPED_READBACK_SQL,
        params,
      );
      if (rows.length === 0) return null;
      if (rows.length !== 1) throw new Error("cvi_1c17_ambiguous_readback");
      const row = rows[0]!;
      const names = [
        "acquisitionId", "tenantId", "siteId", "connectionId",
        "authSubject", "authSessionId", "requestNonce", "requestedResource",
        "observationFingerprint", "disposition",
      ] as const;
      if (names.some(name => typeof row[name] !== "string"))
        throw new Error("cvi_1c17_readback_row_invalid");
      if (row.disposition !== "recorded_untrusted" ||
          !/^[0-9a-f]{64}$/.test(row.observationFingerprint as string))
        throw new Error("cvi_1c17_disposition_or_fingerprint_invalid");
      return Object.fromEntries(names.map(name => [name, row[name]])) as CviGscLedgerRow;
    },
  };
}
