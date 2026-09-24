import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";
import {
  P8_8_W09B_QUERY_SET_FINGERPRINT,
  p88W09BRequestForGrant,
  p88W09BStableHash,
} from "./p8-8-w09b-evidence-contract.js";
import {
  acquireP88W09BEvidence,
} from "./p8-8-w09b-readonly-acquisition.js";
import {
  translateP88W09BAcquisitionPackage,
} from "./p8-8-w09b-offline-translator.js";
import { buildP88W07TestFixture } from "./p8-8-w07-test-fixture.js";

function dedicatedEphemeralUrl(): string | null {
  const raw = process.env.P8_8_W09B_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("p88_w09b_ephemeral_database_must_be_localhost");
  }
  if (parsed.pathname.replace(/^\//, "") !== "seo_engine_test") {
    throw new Error("p88_w09b_ephemeral_database_name_invalid");
  }
  return raw;
}

function withDatabase(baseUrl: string, name: string): string {
  const parsed = new URL(baseUrl);
  parsed.pathname = "/" + name;
  return parsed.toString();
}

async function migration(name: string): Promise<string> {
  return readFile(
    new URL("../../../../lib/db/migrations/" + name, import.meta.url),
    "utf8",
  );
}

async function rowCounts(sql: ReturnType<typeof postgres>) {
  const rows = await sql.unsafe<Record<string, number>[]>(
    "SELECT "
      + "(SELECT COUNT(*)::int FROM sites) AS sites,"
      + "(SELECT COUNT(*)::int FROM pages) AS pages,"
      + "(SELECT COUNT(*)::int FROM evidence) AS evidence,"
      + "(SELECT COUNT(*)::int FROM opportunities) AS opportunities,"
      + "(SELECT COUNT(*)::int FROM seo_observation) AS observations,"
      + "(SELECT COUNT(*)::int FROM policy_mutation_control_state) AS controls,"
      + "(SELECT COUNT(*)::int FROM policy_mutation_reservations) AS reservations,"
      + "(SELECT COUNT(*)::int FROM policy_mutation_claims) AS claims,"
      + "(SELECT COUNT(*)::int FROM policy_mutation_dispatches) AS dispatches,"
      + "(SELECT COUNT(*)::int FROM actions) AS actions,"
      + "(SELECT COUNT(*)::int FROM deployments) AS deployments",
  );
  return rows[0]!;
}

test("W09-BE4 full 43-table localhost acquisition is read-only and translates offline", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("P8_8_W09B_EPHEMERAL_DATABASE_URL is not configured");
    return;
  }

  const admin = postgres(databaseUrl, {
    max: 4,
    prepare: false,
    connect_timeout: 5,
    idle_timeout: 2,
  });
  t.after(async () => {
    await admin.end({ timeout: 1 }).catch(() => undefined);
  });

  const tableCounts = await admin.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables "
      + "WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(Number(tableCounts[0]?.count ?? 0), 43);

  const sites = await admin.unsafe<{ id: string }[]>(
    "SELECT id::text AS id FROM sites "
      + "WHERE lower(domain)='diamondshelf.us' "
      + "AND canonical_origin='https://diamondshelf.us' "
      + "AND platform='shopify' AND is_active=true ORDER BY id LIMIT 1",
  );
  const siteId = sites[0]?.id;
  assert.ok(siteId);

  const cleanup = async () => {
    await admin.unsafe("DELETE FROM policy_mutation_dispatch_events");
    await admin.unsafe("DELETE FROM policy_mutation_dispatches");
    await admin.unsafe("DELETE FROM policy_mutation_claims");
    await admin.unsafe("DELETE FROM policy_mutation_control_events");
    await admin.unsafe("DELETE FROM policy_mutation_control_state");
    await admin.unsafe("DELETE FROM policy_mutation_reservations");
    await admin.unsafe("DELETE FROM verifications");
    await admin.unsafe("DELETE FROM rollbacks");
    await admin.unsafe("DELETE FROM deployments");
    await admin.unsafe("DELETE FROM approvals");
    await admin.unsafe("DELETE FROM actions");
    await admin.unsafe("DELETE FROM action_plans");
    await admin.unsafe(
      "DELETE FROM seo_observation_evidence WHERE observation_id IN "
        + "(SELECT observation_id FROM seo_observation WHERE collector_id='p88-w09b-be4')",
    );
    await admin.unsafe(
      "DELETE FROM seo_observation WHERE collector_id='p88-w09b-be4'",
    );
    await admin.unsafe(
      "DELETE FROM seo_evidence WHERE source_kind='p88_w09b_be4'",
    );
    await admin.unsafe(
      "DELETE FROM opportunities WHERE rationale LIKE 'p88-w09b-be4:%'",
    );
    await admin.unsafe(
      "DELETE FROM evidence WHERE source='p88-w09b-be4'",
    );
    await admin.unsafe(
      "DELETE FROM page_snapshots WHERE page_id IN "
        + "(SELECT id FROM pages WHERE path LIKE '/products/w09b-be4-%')",
    );
    await admin.unsafe(
      "DELETE FROM pages WHERE path LIKE '/products/w09b-be4-%'",
    );
  };
  await cleanup();
  t.after(cleanup);

  const clockRows = await admin.unsafe<{ now: Date; role: string }[]>(
    "SELECT transaction_timestamp() AS now,current_user AS role",
  );
  const base = clockRows[0]?.now;
  const role = clockRows[0]?.role;
  assert.ok(base instanceof Date);
  assert.ok(role);
  const baseTime = base.toISOString();

  const w07 = buildP88W07TestFixture({
    baseTime,
    siteId,
    productId: "660000001",
    handle: "w09b-be4-happy",
    before: "Before W09-BE4 bytes",
    after: "After W09-BE4 bytes",
    policyStage: "shadow",
  });
  const grant = w07.scenario.intentInput.w01EvaluationInput.grant;
  const w02Input = w07.scenario.intentInput.w02MaterializationInput;
  const w02 = w07.scenario.intentInput.w02Materialization;
  const observedAt = new Date(Date.parse(baseTime) - 60_000).toISOString();
  const freshForMs = 3_600_000;
  const staleAfter = new Date(Date.parse(observedAt) + freshForMs).toISOString();
  const sourceFingerprint = "c".repeat(64);

  const pageRows = await admin.unsafe<{ id: string }[]>(
    "INSERT INTO pages (site_id,url,normalized_url,path,page_type,indexable) "
      + "VALUES ($1::uuid,$2,$2,$3,'product',true) RETURNING id::text AS id",
    [
      siteId,
      w02.w01Facts.targetUrl,
      new URL(w02.w01Facts.targetUrl).pathname,
    ],
  );
  const pageId = pageRows[0]?.id;
  assert.ok(pageId);

  const payload = {
    resourceGid: w02.w01Facts.resourceGid,
    reconstruction: {
      w02Input,
      w02Materialization: w02,
      evidenceIds: ["evidence-a", "evidence-b"],
      missingEvidence: [],
      quality: {
        status: "pass",
        approvalEligible: true,
        score: 100,
        blockingReasons: [],
        warnings: [],
      },
      risk: { classification: "low" },
    },
  };
  const evidenceRows = await admin.unsafe<{ id: string }[]>(
    "INSERT INTO evidence (site_id,page_id,source,kind,observed_at,confidence,payload,provenance) "
      + "VALUES ($1::uuid,$2::uuid,'p88-w09b-be4','p8_8_w09b_reconstruction',"
      + "$3::timestamptz,1,$4::jsonb,$5::jsonb) RETURNING id::text AS id",
    [
      siteId,
      pageId,
      observedAt,
      JSON.stringify(payload),
      JSON.stringify({ sourceFingerprint }),
    ],
  );
  const evidenceId = evidenceRows[0]?.id;
  assert.ok(evidenceId);

  await admin.unsafe(
    "INSERT INTO opportunities (site_id,page_id,opportunity_type,status,score,"
      + "impact_estimate,effort_estimate,rationale,evidence_ids,created_at,updated_at) "
      + "VALUES ($1::uuid,$2::uuid,'query_gap','new',95,'{}'::jsonb,'{}'::jsonb,"
      + "$3,$4::uuid[],$5::timestamptz,$5::timestamptz)",
    [
      siteId,
      pageId,
      "p88-w09b-be4:happy",
      [evidenceId],
      observedAt,
    ],
  );

  const observationId = p88W09BStableHash({
    purpose: "p88-w09b-be4-observation",
    target: w02.w01Facts.targetUrl,
  });
  await admin.unsafe(
    "INSERT INTO seo_observation ("
      + "observation_id,schema_version,semantic_key,subject_kind,site_id,"
      + "canonical_origin,url_id,canonical_url,observation_kind,material_value,"
      + "value_fingerprint,evidence_set_fingerprint,source_kind,source_fingerprint,"
      + "collector_id,provenance_fingerprint,confidence,observed_at,fresh_for_ms,"
      + "stale_after,retention_class,record_fingerprint"
      + ") VALUES ($1,'v1',$2,'url',$3,'https://diamondshelf.us',$4,$5,"
      + "'provider_product_meta_description',$6::jsonb,$7,$8,"
      + "'p88_w09b_be4',$9,'p88-w09b-be4',$10,'verified',$11::timestamptz,"
      + "$12,$13::timestamptz,'evidence_lineage',$14)",
    [
      observationId,
      "2".repeat(64),
      siteId,
      "3".repeat(64),
      w02.w01Facts.targetUrl,
      JSON.stringify({ providerObservation: w07.providerObservation }),
      "4".repeat(64),
      "5".repeat(64),
      "6".repeat(64),
      "7".repeat(64),
      observedAt,
      freshForMs,
      staleAfter,
      "8".repeat(64),
    ],
  );

  await admin.unsafe(
    "INSERT INTO policy_mutation_control_state ("
      + "site_id,control_version,revision,previous_control_fingerprint,"
      + "mode,effective_at,control_fingerprint"
      + ") VALUES ($1::uuid,$2,$3,$4,$5,$6::timestamptz,$7)",
    [
      siteId,
      w07.control.version,
      w07.control.revision,
      w07.control.previousControlFingerprint,
      w07.control.mode,
      w07.control.effectiveAt,
      w07.control.controlFingerprint,
    ],
  );

  const beforeCounts = await rowCounts(admin);
  const request = p88W09BRequestForGrant({
    applicationSha: "a".repeat(40),
    applicationTree: "b".repeat(40),
    databaseName: "seo_engine_test",
    roleIdentity: role,
    grant,
    referenceTime: baseTime,
  });
  assert.equal(request.expectedQuerySetFingerprint, P8_8_W09B_QUERY_SET_FINGERPRINT);

  const pkg = await acquireP88W09BEvidence({
    databaseUrl,
    request,
    requireLocalhost: true,
  });

  assert.equal(pkg.transaction.transactionReadOnly, true);
  assert.equal(pkg.transaction.transactionIsolation, "repeatable_read");
  assert.equal(pkg.schemaState, "full_w07_schema");
  assert.equal(pkg.candidates.length, 1);
  const legacyResult = pkg.queryResults.find(
    (result) => result.queryId === "w09b.legacy_evidence.v1",
  );
  assert.equal(legacyResult?.rowCount, 1, JSON.stringify(legacyResult?.rows));
  assert.equal(
    pkg.candidates[0]!.legacyEvidence.length,
    1,
    JSON.stringify(pkg.candidates[0]!.incompleteReasons),
  );
  assert.ok(
    pkg.candidates[0]!.productGidWitness,
    JSON.stringify(pkg.candidates[0]!.legacyEvidence),
  );
  assert.ok(
    pkg.candidates[0]!.reconstruction,
    JSON.stringify(pkg.candidates[0]!.legacyEvidence),
  );
  assert.ok(
    pkg.candidates[0]!.providerBeforeWitness,
    JSON.stringify(pkg.candidates[0]!.normalizedObservations),
  );
  assert.equal(
    pkg.candidates[0]!.completeness,
    "complete_for_w09a",
    JSON.stringify(pkg.candidates[0]!.incompleteReasons),
  );
  assert.equal(pkg.candidates[0]!.productGidWitness?.resourceGid, w02.w01Facts.resourceGid);
  assert.equal(
    pkg.candidates[0]!.providerBeforeWitness?.observation.observationFingerprint,
    w07.providerObservation.observationFingerprint,
  );
  assert.equal(pkg.safety.providerNetworkReadPerformed, false);
  assert.equal(pkg.safety.persistencePerformed, false);

  const translated = translateP88W09BAcquisitionPackage({
    acquisitionPackage: pkg,
    grant,
    evaluationExpiresAt: new Date(Date.parse(baseTime) + 10 * 60_000).toISOString(),
  });
  assert.equal(translated.translated.length, 1);
  assert.equal(translated.translated[0]!.w09Input.source.provenance, "supplied_real_snapshot");
  assert.equal(translated.translated[0]!.shadowDecision.decision, "admit");

  const afterCounts = await rowCounts(admin);
  assert.deepEqual(afterCounts, beforeCounts);
  const afterTableCounts = await admin.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables "
      + "WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(Number(afterTableCounts[0]?.count ?? 0), 43);
});

test("W09-BE4 rejects non-localhost database URL before connecting", async () => {
  const fixture = buildP88W07TestFixture({
    policyStage: "shadow",
    productId: "660000002",
    handle: "w09b-be4-nonlocal",
  });
  const request = p88W09BRequestForGrant({
    applicationSha: "a".repeat(40),
    applicationTree: "b".repeat(40),
    databaseName: "seo_engine_test",
    roleIdentity: "postgres",
    grant: fixture.scenario.intentInput.w01EvaluationInput.grant,
    referenceTime: "2026-09-23T12:00:00.000Z",
  });
  await assert.rejects(
    acquireP88W09BEvidence({
      databaseUrl: "postgres://postgres:postgres@example.com:5432/seo_engine_test",
      request,
      requireLocalhost: true,
    }),
    /p88_w09b_ephemeral_database_url_not_localhost/,
  );
});

test("W09-BE4 detects missing core/W04/W05/W07 schemas without applying migrations", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("P8_8_W09B_EPHEMERAL_DATABASE_URL is not configured");
    return;
  }

  const adminUrl = withDatabase(databaseUrl, "postgres");
  const admin = postgres(adminUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 5,
    idle_timeout: 2,
  });
  t.after(async () => {
    await admin.end({ timeout: 1 }).catch(() => undefined);
  });

  const migrationSql = {
    core: await migration("0001_core.sql"),
    observation: await migration("0003_observation_evidence_schema.sql"),
    w04: await migration("0005_p8_8_policy_mutation_reservations.sql"),
    w05: await migration("0006_p8_8_policy_mutation_controls.sql"),
  };

  const cases = [
    {
      name: "seo_engine_w09b_core_only",
      migrations: ["core"] as const,
      expected: /p88_w09b_schema_core_or_observation_missing/,
    },
    {
      name: "seo_engine_w09b_missing_w04",
      migrations: ["core", "observation"] as const,
      expected: /p88_w09b_schema_missing_w04/,
    },
    {
      name: "seo_engine_w09b_missing_w05",
      migrations: ["core", "observation", "w04"] as const,
      expected: /p88_w09b_schema_missing_w05/,
    },
    {
      name: "seo_engine_w09b_missing_w07",
      migrations: ["core", "observation", "w04", "w05"] as const,
      expected: /p88_w09b_schema_missing_w07/,
    },
  ];

  for (const item of cases) {
    if (!/^seo_engine_w09b_[a-z0-9_]+$/.test(item.name)) {
      throw new Error("invalid synthetic database name");
    }
    await admin.unsafe("DROP DATABASE IF EXISTS " + item.name + " WITH (FORCE)");
    await admin.unsafe("CREATE DATABASE " + item.name);
    t.after(async () => {
      await admin.unsafe("DROP DATABASE IF EXISTS " + item.name + " WITH (FORCE)")
        .catch(() => undefined);
    });

    const url = withDatabase(databaseUrl, item.name);
    const db = postgres(url, {
      max: 1,
      prepare: false,
      connect_timeout: 5,
      idle_timeout: 2,
    });
    try {
      for (const key of item.migrations) {
        await db.unsafe(migrationSql[key]);
      }
      const before = await db.unsafe<{ count: number }[]>(
        "SELECT COUNT(*)::int AS count FROM information_schema.tables "
          + "WHERE table_schema='public' AND table_type='BASE TABLE'",
      );

      const fixture = buildP88W07TestFixture({
        policyStage: "shadow",
        productId: "660000003",
        handle: "w09b-be4-schema",
      });
      const request = p88W09BRequestForGrant({
        applicationSha: "a".repeat(40),
        applicationTree: "b".repeat(40),
        databaseName: item.name,
        roleIdentity: "postgres",
        grant: fixture.scenario.intentInput.w01EvaluationInput.grant,
        referenceTime: "2026-09-23T12:00:00.000Z",
      });
      await assert.rejects(
        acquireP88W09BEvidence({
          databaseUrl: url,
          request,
          requireLocalhost: true,
        }),
        item.expected,
      );

      const after = await db.unsafe<{ count: number }[]>(
        "SELECT COUNT(*)::int AS count FROM information_schema.tables "
          + "WHERE table_schema='public' AND table_type='BASE TABLE'",
      );
      assert.equal(after[0]?.count, before[0]?.count);
    } finally {
      await db.end({ timeout: 1 }).catch(() => undefined);
    }
  }
});
