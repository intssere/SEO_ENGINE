import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

export const EXPECTED_CORE_TABLE_COUNT = 29;
export const EXPECTED_AUTH_TABLE_COUNT = 2;
export const EXPECTED_RUNTIME_TABLE_COUNT =
  EXPECTED_CORE_TABLE_COUNT + EXPECTED_AUTH_TABLE_COUNT;
export const EXPECTED_OBSERVATION_EVIDENCE_TABLE_COUNT = 3;
export const EXPECTED_CURRENT_TABLE_COUNT =
  EXPECTED_RUNTIME_TABLE_COUNT + EXPECTED_OBSERVATION_EVIDENCE_TABLE_COUNT;
export const EXPECTED_CRAWL_EXECUTION_STATE_TABLE_COUNT = 3;
export const EXPECTED_P12_2_TABLE_COUNT =
  EXPECTED_CURRENT_TABLE_COUNT + EXPECTED_CRAWL_EXECUTION_STATE_TABLE_COUNT;
export const EXPECTED_P8_8_W04_RESERVATION_TABLE_COUNT = 1;
export const EXPECTED_P8_8_W04_TABLE_COUNT =
  EXPECTED_P12_2_TABLE_COUNT + EXPECTED_P8_8_W04_RESERVATION_TABLE_COUNT;
export const EXPECTED_P8_8_W05_CONTROL_TABLE_COUNT = 3;
export const EXPECTED_P8_8_W05_TABLE_COUNT =
  EXPECTED_P8_8_W04_TABLE_COUNT + EXPECTED_P8_8_W05_CONTROL_TABLE_COUNT;
export const EXPECTED_P8_8_W07_DISPATCH_TABLE_COUNT = 2;
export const EXPECTED_P8_8_W07_TABLE_COUNT =
  EXPECTED_P8_8_W05_TABLE_COUNT + EXPECTED_P8_8_W07_DISPATCH_TABLE_COUNT;
export const DIAMOND_SHELF_SITE = {
  organizationName: "Diamond Shelf Trading LLC",
  organizationSlug: "diamond-shelf-trading",
  siteName: "Diamond Shelf",
  domain: "diamondshelf.us",
  canonicalOrigin: "https://diamondshelf.us",
  platform: "shopify",
  locale: "en-US",
  timezone: "America/Chicago",
} as const;

export type RuntimeSchemaState =
  | "empty"
  | "core_ready"
  | "ready"
  | "p12_2_ready"
  | "p8_8_w04_ready"
  | "p8_8_w05_ready"
  | "p8_8_w07_ready"
  | "partial";

export interface BootstrapPlan {
  schemaState: RuntimeSchemaState;
  tableCount: number;
  applyCoreMigration: boolean;
  applyAuthMigration: boolean;
  upsertDiamondShelf: boolean;
  blocked: boolean;
  reason: string | null;
}

export interface BootstrapResult {
  status: "ready" | "blocked";
  migrationApplied: boolean;
  coreMigrationApplied?: boolean;
  authMigrationApplied?: boolean;
  tableCount: number;
  organizationId?: string;
  siteId?: string;
  domain?: string;
  reason?: string;
}

export function planRuntimeBootstrap(tableCount: number): BootstrapPlan {
  if (!Number.isInteger(tableCount) || tableCount < 0) {
    return {
      schemaState: "partial",
      tableCount,
      applyCoreMigration: false,
      applyAuthMigration: false,
      upsertDiamondShelf: false,
      blocked: true,
      reason: "Invalid public schema table count.",
    };
  }

  if (tableCount === 0) {
    return {
      schemaState: "empty",
      tableCount,
      applyCoreMigration: true,
      applyAuthMigration: true,
      upsertDiamondShelf: true,
      blocked: false,
      reason: null,
    };
  }

  if (tableCount === EXPECTED_CORE_TABLE_COUNT) {
    return {
      schemaState: "core_ready",
      tableCount,
      applyCoreMigration: false,
      applyAuthMigration: true,
      upsertDiamondShelf: true,
      blocked: false,
      reason: null,
    };
  }

  if (
    tableCount === EXPECTED_RUNTIME_TABLE_COUNT ||
    tableCount === EXPECTED_CURRENT_TABLE_COUNT
  ) {
    return {
      schemaState: "ready",
      tableCount,
      applyCoreMigration: false,
      applyAuthMigration: false,
      upsertDiamondShelf: true,
      blocked: false,
      reason: null,
    };
  }

  if (tableCount === EXPECTED_P12_2_TABLE_COUNT) {
    return {
      schemaState: "p12_2_ready",
      tableCount,
      applyCoreMigration: false,
      applyAuthMigration: false,
      upsertDiamondShelf: true,
      blocked: false,
      reason: null,
    };
  }

  if (tableCount === EXPECTED_P8_8_W04_TABLE_COUNT) {
    return {
      schemaState: "p8_8_w04_ready",
      tableCount,
      applyCoreMigration: false,
      applyAuthMigration: false,
      upsertDiamondShelf: true,
      blocked: false,
      reason: null,
    };
  }

  if (tableCount === EXPECTED_P8_8_W05_TABLE_COUNT) {
    return {
      schemaState: "p8_8_w05_ready",
      tableCount,
      applyCoreMigration: false,
      applyAuthMigration: false,
      upsertDiamondShelf: true,
      blocked: false,
      reason: null,
    };
  }

  if (tableCount === EXPECTED_P8_8_W07_TABLE_COUNT) {
    return {
      schemaState: "p8_8_w07_ready",
      tableCount,
      applyCoreMigration: false,
      applyAuthMigration: false,
      upsertDiamondShelf: true,
      blocked: false,
      reason: null,
    };
  }

  return {
    schemaState: "partial",
    tableCount,
    applyCoreMigration: false,
    applyAuthMigration: false,
    upsertDiamondShelf: false,
    blocked: true,
    reason: `Refusing automatic migration because public schema is not a recognized state (${tableCount} tables; expected 0, ${EXPECTED_CORE_TABLE_COUNT}, ${EXPECTED_RUNTIME_TABLE_COUNT}, ${EXPECTED_CURRENT_TABLE_COUNT}, ${EXPECTED_P12_2_TABLE_COUNT}, ${EXPECTED_P8_8_W04_TABLE_COUNT}, ${EXPECTED_P8_8_W05_TABLE_COUNT}, or ${EXPECTED_P8_8_W07_TABLE_COUNT}).`,
  };
}

async function publicTableCount(sql: postgres.Sql): Promise<number> {
  const rows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  return Number(rows[0]?.count ?? 0);
}

async function applyMigration(
  sql: postgres.Sql,
  filename: string,
): Promise<void> {
  const migrationPath = fileURLToPath(
    new URL(`../migrations/${filename}`, import.meta.url),
  );
  const migration = await readFile(migrationPath, "utf8");
  await sql.unsafe(migration);
}

async function upsertDiamondShelf(
  sql: postgres.Sql,
): Promise<{ organizationId: string; siteId: string }> {
  return sql.begin(async (tx) => {
    const organizations = await tx<{ id: string }[]>`
      INSERT INTO organizations (name, slug)
      VALUES (${DIAMOND_SHELF_SITE.organizationName}, ${DIAMOND_SHELF_SITE.organizationSlug})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = now()
      RETURNING id::text
    `;
    const organizationId = organizations[0]?.id;
    if (!organizationId)
      throw new Error("Failed to resolve Diamond Shelf organization id.");

    const sites = await tx<{ id: string }[]>`
      INSERT INTO sites (organization_id, name, domain, canonical_origin, platform, locale, timezone, is_active)
      VALUES (${organizationId}::uuid, ${DIAMOND_SHELF_SITE.siteName}, ${DIAMOND_SHELF_SITE.domain}, ${DIAMOND_SHELF_SITE.canonicalOrigin}, ${DIAMOND_SHELF_SITE.platform}, ${DIAMOND_SHELF_SITE.locale}, ${DIAMOND_SHELF_SITE.timezone}, true)
      ON CONFLICT (organization_id, domain) DO UPDATE SET
        name = EXCLUDED.name,
        canonical_origin = EXCLUDED.canonical_origin,
        platform = EXCLUDED.platform,
        locale = EXCLUDED.locale,
        timezone = EXCLUDED.timezone,
        is_active = true,
        updated_at = now()
      RETURNING id::text
    `;
    const siteId = sites[0]?.id;
    if (!siteId) throw new Error("Failed to resolve Diamond Shelf site id.");
    return { organizationId, siteId };
  });
}

export async function bootstrapRuntimeDatabase(
  databaseUrl = process.env.DATABASE_URL?.trim(),
): Promise<BootstrapResult> {
  if (!databaseUrl) {
    return {
      status: "blocked",
      migrationApplied: false,
      tableCount: 0,
      reason: "DATABASE_URL is not configured.",
    };
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 8,
    idle_timeout: 2,
  });
  let lockHeld = false;
  let coreMigrationApplied = false;
  let authMigrationApplied = false;
  try {
    await sql`SELECT pg_advisory_lock(hashtext('seo_engine_runtime_bootstrap_v2'))`;
    lockHeld = true;

    let tableCount = await publicTableCount(sql);
    const plan = planRuntimeBootstrap(tableCount);
    if (plan.blocked) {
      return {
        status: "blocked",
        migrationApplied: false,
        tableCount,
        reason: plan.reason ?? "Bootstrap blocked.",
      };
    }

    if (plan.applyCoreMigration) {
      await applyMigration(sql, "0001_core.sql");
      coreMigrationApplied = true;
      tableCount = await publicTableCount(sql);
      if (tableCount !== EXPECTED_CORE_TABLE_COUNT) {
        return {
          status: "blocked",
          migrationApplied: true,
          coreMigrationApplied,
          authMigrationApplied,
          tableCount,
          reason: `Core migration did not produce the expected ${EXPECTED_CORE_TABLE_COUNT} tables.`,
        };
      }
    }

    if (plan.applyAuthMigration) {
      await applyMigration(sql, "0002_auth.sql");
      authMigrationApplied = true;
      tableCount = await publicTableCount(sql);
      if (tableCount !== EXPECTED_RUNTIME_TABLE_COUNT) {
        return {
          status: "blocked",
          migrationApplied: true,
          coreMigrationApplied,
          authMigrationApplied,
          tableCount,
          reason: `Auth migration did not produce the expected ${EXPECTED_RUNTIME_TABLE_COUNT} runtime tables.`,
        };
      }
    }

    const ids = await upsertDiamondShelf(sql);
    return {
      status: "ready",
      migrationApplied: coreMigrationApplied || authMigrationApplied,
      coreMigrationApplied,
      authMigrationApplied,
      tableCount,
      organizationId: ids.organizationId,
      siteId: ids.siteId,
      domain: DIAMOND_SHELF_SITE.domain,
    };
  } catch (error) {
    return {
      status: "blocked",
      migrationApplied: coreMigrationApplied || authMigrationApplied,
      coreMigrationApplied,
      authMigrationApplied,
      tableCount: 0,
      reason:
        error instanceof Error
          ? error.message
          : "Unknown database bootstrap error.",
    };
  } finally {
    if (lockHeld) {
      await sql`SELECT pg_advisory_unlock(hashtext('seo_engine_runtime_bootstrap_v2'))`.catch(
        () => undefined,
      );
    }
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

/** Verifies the current schema and canonical site identity without DDL or DML. */
export async function ensureDiamondShelfIdentity(
  databaseUrl = process.env.DATABASE_URL?.trim(),
): Promise<BootstrapResult> {
  if (!databaseUrl) {
    return {
      status: "blocked",
      migrationApplied: false,
      tableCount: 0,
      reason: "DATABASE_URL is not configured.",
    };
  }
  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 8,
    idle_timeout: 2,
  });
  try {
    const tableCount = await publicTableCount(sql);
    if (
      tableCount !== EXPECTED_CURRENT_TABLE_COUNT &&
      tableCount !== EXPECTED_P12_2_TABLE_COUNT &&
      tableCount !== EXPECTED_P8_8_W04_TABLE_COUNT &&
      tableCount !== EXPECTED_P8_8_W05_TABLE_COUNT &&
      tableCount !== EXPECTED_P8_8_W07_TABLE_COUNT
    ) {
      return {
        status: "blocked",
        migrationApplied: false,
        tableCount,
        reason:
          tableCount === 0
            ? "Public schema is empty; apply runtime migrations explicitly."
            : `Public schema is not a recognized current/future engineering state (${tableCount} tables; expected ${EXPECTED_CURRENT_TABLE_COUNT}, ${EXPECTED_P12_2_TABLE_COUNT}, ${EXPECTED_P8_8_W04_TABLE_COUNT}, ${EXPECTED_P8_8_W05_TABLE_COUNT}, or ${EXPECTED_P8_8_W07_TABLE_COUNT}).`,
      };
    }
    const identities = await sql<
      { organization_id: string; site_id: string }[]
    >`
      SELECT o.id::text AS organization_id,s.id::text AS site_id
      FROM organizations o
      JOIN sites s ON s.organization_id=o.id
      WHERE o.slug=${DIAMOND_SHELF_SITE.organizationSlug}
        AND lower(s.domain)=${DIAMOND_SHELF_SITE.domain}
        AND s.canonical_origin=${DIAMOND_SHELF_SITE.canonicalOrigin}
        AND s.platform=${DIAMOND_SHELF_SITE.platform}
        AND s.is_active=true
      ORDER BY s.created_at
      LIMIT 1
    `;
    const identity = identities[0];
    if (!identity) {
      return {
        status: "blocked",
        migrationApplied: false,
        tableCount,
        reason:
          "Canonical Diamond Shelf identity is unavailable or mismatched.",
      };
    }
    return {
      status: "ready",
      migrationApplied: false,
      tableCount,
      organizationId: identity.organization_id,
      siteId: identity.site_id,
      domain: DIAMOND_SHELF_SITE.domain,
    };
  } catch (error) {
    return {
      status: "blocked",
      migrationApplied: false,
      tableCount: 0,
      reason: error instanceof Error ? error.message : "Identity check failed.",
    };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}
