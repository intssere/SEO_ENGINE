BEGIN;

CREATE TABLE seo_observation (
  observation_id char(64) PRIMARY KEY,
  schema_version varchar(32) NOT NULL,
  semantic_key char(64) NOT NULL,
  subject_kind varchar(16) NOT NULL,
  site_id varchar(160) NOT NULL,
  canonical_origin text NOT NULL,
  url_id char(64),
  canonical_url text,
  observation_kind varchar(180) NOT NULL,
  material_value jsonb NOT NULL,
  value_fingerprint char(64) NOT NULL,
  evidence_set_fingerprint char(64) NOT NULL,
  source_kind varchar(120) NOT NULL,
  source_fingerprint char(64) NOT NULL,
  collector_id varchar(160) NOT NULL,
  provenance_fingerprint char(64) NOT NULL,
  confidence varchar(16) NOT NULL,
  observed_at timestamptz NOT NULL,
  fresh_for_ms bigint NOT NULL,
  stale_after timestamptz NOT NULL,
  retention_class varchar(32) NOT NULL,
  record_fingerprint char(64) NOT NULL,

  CONSTRAINT seo_observation_observation_id_hex
    CHECK (observation_id ~ '^[a-f0-9]{64}$'),
  CONSTRAINT seo_observation_semantic_key_hex
    CHECK (semantic_key ~ '^[a-f0-9]{64}$'),
  CONSTRAINT seo_observation_url_id_hex
    CHECK (url_id IS NULL OR url_id ~ '^[a-f0-9]{64}$'),
  CONSTRAINT seo_observation_value_fingerprint_hex
    CHECK (value_fingerprint ~ '^[a-f0-9]{64}$'),
  CONSTRAINT seo_observation_evidence_set_fingerprint_hex
    CHECK (evidence_set_fingerprint ~ '^[a-f0-9]{64}$'),
  CONSTRAINT seo_observation_source_fingerprint_hex
    CHECK (source_fingerprint ~ '^[a-f0-9]{64}$'),
  CONSTRAINT seo_observation_provenance_fingerprint_hex
    CHECK (provenance_fingerprint ~ '^[a-f0-9]{64}$'),
  CONSTRAINT seo_observation_record_fingerprint_hex
    CHECK (record_fingerprint ~ '^[a-f0-9]{64}$'),
  CONSTRAINT seo_observation_subject_kind_allowed
    CHECK (subject_kind IN ('site', 'url')),
  CONSTRAINT seo_observation_confidence_allowed
    CHECK (confidence IN ('unknown', 'low', 'medium', 'high', 'verified')),
  CONSTRAINT seo_observation_retention_class_allowed
    CHECK (retention_class IN ('operational_history', 'evidence_lineage', 'audit_history')),
  CONSTRAINT seo_observation_subject_url_pair
    CHECK (
      (subject_kind = 'site' AND url_id IS NULL AND canonical_url IS NULL)
      OR
      (subject_kind = 'url' AND url_id IS NOT NULL AND canonical_url IS NOT NULL)
    ),
  CONSTRAINT seo_observation_fresh_for_ms_bounds
    CHECK (fresh_for_ms BETWEEN 60000 AND 2592000000),
  CONSTRAINT seo_observation_freshness_consistency
    CHECK (stale_after = observed_at + (fresh_for_ms * interval '1 millisecond'))
);

CREATE TABLE seo_evidence (
  reference_fingerprint char(64) PRIMARY KEY,
  evidence_id char(64) NOT NULL,
  evidence_fingerprint char(64) NOT NULL,
  source_kind varchar(120) NOT NULL,
  source_fingerprint char(64) NOT NULL,
  dimension varchar(120) NOT NULL,
  quality varchar(40) NOT NULL,
  availability varchar(16) NOT NULL,

  CONSTRAINT seo_evidence_reference_fingerprint_hex
    CHECK (reference_fingerprint ~ '^[a-f0-9]{64}$'),
  CONSTRAINT seo_evidence_evidence_id_hex
    CHECK (evidence_id ~ '^[a-f0-9]{64}$'),
  CONSTRAINT seo_evidence_evidence_fingerprint_hex
    CHECK (evidence_fingerprint ~ '^[a-f0-9]{64}$'),
  CONSTRAINT seo_evidence_source_fingerprint_hex
    CHECK (source_fingerprint ~ '^[a-f0-9]{64}$'),
  CONSTRAINT seo_evidence_availability_allowed
    CHECK (availability IN ('available', 'unavailable'))
);

CREATE TABLE seo_observation_evidence (
  observation_id char(64) NOT NULL,
  reference_fingerprint char(64) NOT NULL,

  CONSTRAINT seo_observation_evidence_pkey
    PRIMARY KEY (observation_id, reference_fingerprint),
  CONSTRAINT seo_observation_evidence_observation_fk
    FOREIGN KEY (observation_id)
    REFERENCES seo_observation (observation_id)
    ON DELETE RESTRICT,
  CONSTRAINT seo_observation_evidence_evidence_fk
    FOREIGN KEY (reference_fingerprint)
    REFERENCES seo_evidence (reference_fingerprint)
    ON DELETE RESTRICT,
  CONSTRAINT seo_observation_evidence_observation_id_hex
    CHECK (observation_id ~ '^[a-f0-9]{64}$'),
  CONSTRAINT seo_observation_evidence_reference_fingerprint_hex
    CHECK (reference_fingerprint ~ '^[a-f0-9]{64}$')
);

CREATE INDEX idx_seo_observation_semantic_provenance_observed
  ON seo_observation (semantic_key, provenance_fingerprint, observed_at, observation_id);
CREATE INDEX idx_seo_observation_semantic_value
  ON seo_observation (semantic_key, value_fingerprint);
CREATE INDEX idx_seo_observation_site_kind_source_observed
  ON seo_observation (site_id, observation_kind, source_kind, observed_at);
CREATE INDEX idx_seo_observation_url_kind_observed
  ON seo_observation (url_id, observation_kind, observed_at);
CREATE INDEX idx_seo_observation_stale_after_site
  ON seo_observation (stale_after, site_id);

CREATE INDEX idx_seo_evidence_evidence_id
  ON seo_evidence (evidence_id);
CREATE INDEX idx_seo_evidence_source
  ON seo_evidence (source_kind, source_fingerprint);
CREATE INDEX idx_seo_observation_evidence_reference
  ON seo_observation_evidence (reference_fingerprint, observation_id);

CREATE INDEX idx_seo_observation_history_observed
  ON seo_observation (site_id, observed_at);
CREATE INDEX idx_seo_observation_history_site_semantic_observed
  ON seo_observation (site_id, canonical_origin, semantic_key, observed_at, observation_id);
CREATE INDEX idx_seo_observation_history_semantic_provenance_observed
  ON seo_observation (site_id, semantic_key, provenance_fingerprint, observed_at, observation_id);
CREATE INDEX idx_seo_observation_history_kind_source_observed
  ON seo_observation (site_id, observation_kind, source_kind, observed_at, observation_id);

COMMIT;
