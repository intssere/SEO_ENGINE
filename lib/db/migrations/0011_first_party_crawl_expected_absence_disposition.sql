BEGIN;

CREATE TABLE first_party_crawl_terminal_failure_dispositions (
  disposition_id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  run_id text NOT NULL,
  canonical_origin text NOT NULL,
  execution_plan_fingerprint char(64) NOT NULL,
  source_event_fingerprint char(64) NOT NULL
    REFERENCES first_party_crawl_terminal_failure_events(event_fingerprint),
  canonical_url text NOT NULL,
  disposition_type text NOT NULL CHECK (
    disposition_type IN ('stale_inventory_absence', 'sitemap_orphan_absence')
  ),
  absence_http_status integer NOT NULL CHECK (absence_http_status IN (404, 410)),
  fresh_inventory_fingerprint char(64) NOT NULL,
  present_in_fresh_inventory boolean NOT NULL,
  verifier_image text NOT NULL,
  verifier_deployment_id uuid NOT NULL,
  observed_at timestamptz NOT NULL,
  disposition_fingerprint char(64) NOT NULL UNIQUE,
  disposition_payload jsonb NOT NULL,
  UNIQUE (source_event_fingerprint),
  UNIQUE (
    site_id,
    run_id,
    execution_plan_fingerprint,
    canonical_url
  ),
  CHECK (canonical_origin = 'https://diamondshelf.us'),
  CHECK (canonical_url LIKE 'https://diamondshelf.us/%'),
  CHECK (execution_plan_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (fresh_inventory_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (disposition_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (verifier_image ~ '^ghcr\.io/intssere/[a-z0-9._/-]+@sha256:[0-9a-f]{64}$'),
  CHECK (
    (disposition_type = 'stale_inventory_absence' AND NOT present_in_fresh_inventory)
    OR
    (disposition_type = 'sitemap_orphan_absence' AND present_in_fresh_inventory)
  ),
  CHECK (jsonb_typeof(disposition_payload) = 'object')
);

CREATE INDEX idx_first_party_crawl_terminal_failure_dispositions
  ON first_party_crawl_terminal_failure_dispositions (
    site_id,
    run_id,
    execution_plan_fingerprint,
    observed_at DESC,
    disposition_id DESC
  );

CREATE TABLE first_party_crawl_terminal_failure_reconciliation_receipts (
  reconciliation_receipt_id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  run_id text NOT NULL,
  canonical_origin text NOT NULL,
  execution_plan_fingerprint char(64) NOT NULL,
  source_accounting_snapshot_fingerprint char(64) NOT NULL
    REFERENCES first_party_crawl_accounting_snapshots(snapshot_fingerprint),
  disposition_fingerprint char(64) NOT NULL
    REFERENCES first_party_crawl_terminal_failure_dispositions(disposition_fingerprint),
  raw_terminal_failure_count integer NOT NULL CHECK (raw_terminal_failure_count >= 1),
  expected_absence_count integer NOT NULL CHECK (expected_absence_count >= 1),
  effective_unresolved_terminal_failure_count integer NOT NULL
    CHECK (effective_unresolved_terminal_failure_count >= 0),
  status text NOT NULL CHECK (status = 'certified_with_expected_absence'),
  observed_at timestamptz NOT NULL,
  receipt_fingerprint char(64) NOT NULL UNIQUE,
  receipt_payload jsonb NOT NULL,
  UNIQUE (
    site_id,
    run_id,
    execution_plan_fingerprint,
    source_accounting_snapshot_fingerprint
  ),
  CHECK (canonical_origin = 'https://diamondshelf.us'),
  CHECK (execution_plan_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (source_accounting_snapshot_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (disposition_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (receipt_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (expected_absence_count <= raw_terminal_failure_count),
  CHECK (
    effective_unresolved_terminal_failure_count =
      raw_terminal_failure_count - expected_absence_count
  ),
  CHECK (effective_unresolved_terminal_failure_count = 0),
  CHECK (jsonb_typeof(receipt_payload) = 'object')
);

CREATE INDEX idx_first_party_crawl_terminal_failure_reconciliation
  ON first_party_crawl_terminal_failure_reconciliation_receipts (
    site_id,
    run_id,
    execution_plan_fingerprint,
    observed_at DESC,
    reconciliation_receipt_id DESC
  );

CREATE TRIGGER trg_first_party_crawl_terminal_failure_dispositions_immutable
  BEFORE UPDATE OR DELETE ON first_party_crawl_terminal_failure_dispositions
  FOR EACH ROW EXECUTE FUNCTION reject_p12_2_l10_13b_immutable_mutation();

CREATE TRIGGER trg_first_party_crawl_terminal_failure_reconciliation_immutable
  BEFORE UPDATE OR DELETE ON first_party_crawl_terminal_failure_reconciliation_receipts
  FOR EACH ROW EXECUTE FUNCTION reject_p12_2_l10_13b_immutable_mutation();

COMMIT;
