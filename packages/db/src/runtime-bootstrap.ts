import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

export const EXPECTED_CORE_TABLE_COUNT = 29;
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

export type RuntimeSchemaState = "empty" | "ready" | "partial";

export interface BootstrapPlan {
  schemaState: RuntimeSchemaState;
  tableCount: number;
  applyCoreMigration: boolean;
  upsertDiamondShelf: boolean;
  blocked: boolean;
  reason: string | null;
}

export interface BootstrapResult {
  status: "ready" | "blocked";
  migrationApplied: boolean;
  tableCount: number;
  organizationId?: string;
  siteId?: string;
  domain?: string;
  reason?: string;
}

export function planRuntimeBootstrap(tableCount: number): BootstrapPlan {
  if (!Number.isInteger(tableCount) || tableCount < 0) {
    return { schemaState: "partial", tableCount, applyCoreMigration: false, upsertDiamondShelf: false, blocked: true, reason: "Invalid public schema table count." };
  }
  if (tableCount === 0) {
    return { schemaState: "empty", tableCount, applyCoreMigration: true, upsertDiamondShelf: true, blocked: false, reason: null };
  }
  if (tableCount === EXPECTED_CORE_TABLE_COUNT) {
    return { schemaState: "ready", tableCount, applyCoreMigration: false, upsertDiamondShelf: true, blocked: false, reason: null };
  }
  return {
    schemaState: "partial",
    tableCount,
    applyCoreMigration: false,
    upsertDiamondShelf: false,
    blocked: true,
    reason: `Refusing automatic migration because public schema is partial (${tableCount}/${EXPECTED_CORE_TABLE_COUNT} expected tables).`,
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

async function applyCoreMigration(sql: postgres.Sql): Promise<void> {
  const migrationPath = fileURLToPath(new URL("../migrations/0001_core.sql", import.meta.url));
  const migration = await readFile(migrationPath, "utf8");
  await sql.unsafe(migration);
}

async function upsertDiamondShelf(sql: postgres.Sql): Promise<{ organizationId: string; siteId: string }> {
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
    if (!organizationId) throw new Error("Failed to resolve Diamond Shelf organization id.");

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

export async function bootstrapRuntimeDatabase(databaseUrl = process.env.DATABASE_URL?.trim()): Promise<BootstrapResult> {
  if (!databaseUrl) return { status: "blocked", migrationApplied: false, tableCount: 0, reason: "DATABASE_URL is not configured." };

  const sql = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  try {
    let tableCount = await publicTableCount(sql);
    const plan = planRuntimeBootstrap(tableCount);
    if (plan.blocked) return { status: "blocked", migrationApplied: false, tableCount, reason: plan.reason ?? "Bootstrap blocked." };

    let migrationApplied = false;
    if (plan.applyCoreMigration) {
      await applyCoreMigration(sql);
      migrationApplied = true;
      tableCount = await publicTableCount(sql);
      if (tableCount !== EXPECTED_CORE_TABLE_COUNT) {
        return { status: "blocked", migrationApplied, tableCount, reason: `Core migration did not produce the expected ${EXPECTED_CORE_TABLE_COUNT} tables.` };
      }
    }

    const ids = await upsertDiamondShelf(sql);
    return { status: "ready", migrationApplied, tableCount, organizationId: ids.organizationId, siteId: ids.siteId, domain: DIAMOND_SHELF_SITE.domain };
  } catch (error) {
    return { status: "blocked", migrationApplied: false, tableCount: 0, reason: error instanceof Error ? error.message : "Unknown database bootstrap error." };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}
