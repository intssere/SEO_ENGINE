BEGIN;

CREATE TABLE first_party_crawl_checkpoint_revisions (
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  run_id varchar(128) NOT NULL,
  bridge_version varchar(64) NOT NULL,
  canonical_origin text NOT NULL,
  observed_at timestamptz NOT NULL,
  execution_plan_fingerprint char(64) NOT NULL,
  checkpoint_sequence integer NOT NULL CHECK (checkpoint_sequence >= 0),
  checkpoint_fingerprint char(64) NOT NULL,
  checkpoint_status varchar(16) NOT NULL CHECK (checkpoint_status IN ('pending','completed')),
  checkpoint_payload jsonb NOT NULL,
  PRIMARY KEY (site_id, run_id, checkpoint_sequence),
  UNIQUE (site_id, run_id, checkpoint_fingerprint),
  CHECK (canonical_origin = 'https://diamondshelf.us'),
  CHECK (execution_plan_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (checkpoint_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (jsonb_typeof(checkpoint_payload) = 'object')
);

CREATE TABLE first_party_crawl_completed_runs (
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  run_id varchar(128) NOT NULL,
  bridge_version varchar(64) NOT NULL,
  canonical_origin text NOT NULL,
  observed_at timestamptz NOT NULL,
  execution_plan_fingerprint char(64) NOT NULL,
  inventory_fingerprint char(64) NOT NULL,
  checkpoint_fingerprint char(64) NOT NULL,
  certification_fingerprint char(64) NOT NULL,
  snapshot_fingerprint char(64) NOT NULL,
  whole_site_certified boolean NOT NULL,
  snapshot_payload jsonb NOT NULL,
  PRIMARY KEY (site_id, run_id),
  UNIQUE (site_id, snapshot_fingerprint),
  CHECK (canonical_origin = 'https://diamondshelf.us'),
  CHECK (execution_plan_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (inventory_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (checkpoint_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (certification_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (snapshot_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (whole_site_certified = true),
  CHECK (jsonb_typeof(snapshot_payload) = 'object')
);

CREATE TABLE first_party_crawl_incremental_receipts (
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  run_id varchar(128) NOT NULL,
  bridge_version varchar(64) NOT NULL,
  canonical_origin text NOT NULL,
  observed_at timestamptz NOT NULL,
  incremental_plan_fingerprint char(64) NOT NULL,
  execution_plan_fingerprint char(64) NOT NULL,
  receipt_fingerprint char(64) NOT NULL,
  selected_urls integer NOT NULL CHECK (selected_urls >= 0 AND selected_urls <= 25000),
  receipt_payload jsonb NOT NULL,
  PRIMARY KEY (site_id, run_id),
  UNIQUE (site_id, receipt_fingerprint),
  CHECK (canonical_origin = 'https://diamondshelf.us'),
  CHECK (incremental_plan_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (execution_plan_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (receipt_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (jsonb_typeof(receipt_payload) = 'object')
);

CREATE INDEX idx_first_party_crawl_checkpoint_latest
  ON first_party_crawl_checkpoint_revisions (site_id, run_id, checkpoint_sequence DESC);

CREATE INDEX idx_first_party_crawl_checkpoint_plan
  ON first_party_crawl_checkpoint_revisions (site_id, canonical_origin, execution_plan_fingerprint, run_id);

CREATE INDEX idx_first_party_crawl_completed_latest
  ON first_party_crawl_completed_runs (site_id, canonical_origin, observed_at DESC, run_id DESC);

CREATE INDEX idx_first_party_crawl_completed_plan
  ON first_party_crawl_completed_runs (site_id, execution_plan_fingerprint, observed_at DESC);

CREATE INDEX idx_first_party_crawl_incremental_latest
  ON first_party_crawl_incremental_receipts (site_id, canonical_origin, observed_at DESC, run_id DESC);

CREATE INDEX idx_first_party_crawl_incremental_lineage
  ON first_party_crawl_incremental_receipts (site_id, incremental_plan_fingerprint, execution_plan_fingerprint);

COMMIT;
