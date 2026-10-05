BEGIN;

CREATE TABLE authority_outreach_review_events (
  event_id text PRIMARY KEY,
  event_version text NOT NULL,
  event_fingerprint char(64) NOT NULL UNIQUE,
  request_fingerprint char(64) NOT NULL UNIQUE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  sequence bigint NOT NULL,
  previous_event_fingerprint char(64),
  workspace_version text NOT NULL,
  workspace_fingerprint char(64) NOT NULL,
  workspace_item_id text NOT NULL,
  workspace_item_fingerprint char(64) NOT NULL,
  qualification_fingerprint char(64) NOT NULL,
  prospect_fingerprint char(64) NOT NULL,
  opportunity_fingerprint char(64) NOT NULL,
  target_domain text NOT NULL,
  source_domain text NOT NULL,
  target_url text,
  qualification_status text NOT NULL,
  decision text NOT NULL,
  reason_code text NOT NULL,
  reviewer_id text NOT NULL,
  reviewed_at timestamptz NOT NULL,
  review_fingerprint char(64) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),

  UNIQUE (site_id, qualification_fingerprint, prospect_fingerprint, sequence),

  CHECK (event_version = 'ugp-10-3-outreach-review-persistence-contract-v1'),
  CHECK (workspace_version = 'ugp-10-1-outreach-review-workspace-v1'),
  CHECK (event_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (
    previous_event_fingerprint IS NULL
    OR previous_event_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CHECK (workspace_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (workspace_item_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (qualification_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (prospect_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (opportunity_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (review_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (sequence >= 1),
  CHECK (
    (sequence = 1 AND previous_event_fingerprint IS NULL)
    OR
    (sequence > 1 AND previous_event_fingerprint IS NOT NULL)
  ),
  CHECK (workspace_item_id ~ '^uaow-[0-9a-f]{24}
  CHECK (target_domain = lower(target_domain) AND length(target_domain) BETWEEN 1 AND 253),
  CHECK (source_domain = lower(source_domain) AND length(source_domain) BETWEEN 1 AND 253),
  CHECK (target_url IS NULL OR target_url ~ '^https://'),
  CHECK (
    qualification_status IN (
      'qualified_for_review',
      'needs_review',
      'insufficient_evidence',
      'disqualified'
    )
  ),
  CHECK (decision IN ('approved_for_draft','rejected','deferred')),
  CHECK (
    reason_code IN (
      'editorial_fit_confirmed',
      'needs_more_context',
      'relationship_conflict',
      'target_not_appropriate',
      'timing_not_right',
      'policy_or_reputation_risk'
    )
  ),
  CHECK (reviewer_id ~ '^[A-Za-z0-9_.:@-]{1,120}$')
);

CREATE INDEX idx_authority_outreach_review_events_site_target_history
  ON authority_outreach_review_events (
    site_id,
    target_domain,
    reviewed_at DESC,
    sequence DESC
  );

CREATE INDEX idx_authority_outreach_review_events_prospect_history
  ON authority_outreach_review_events (
    site_id,
    prospect_fingerprint,
    sequence
  );

CREATE INDEX idx_authority_outreach_review_events_qualification_history
  ON authority_outreach_review_events (
    site_id,
    qualification_fingerprint,
    prospect_fingerprint,
    sequence
  );

CREATE FUNCTION reject_authority_outreach_review_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'authority_outreach_review_events_are_immutable'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER authority_outreach_review_events_reject_update_delete
  BEFORE UPDATE OR DELETE ON authority_outreach_review_events
  FOR EACH ROW
  EXECUTE FUNCTION reject_authority_outreach_review_event_mutation();

CREATE TRIGGER authority_outreach_review_events_reject_truncate
  BEFORE TRUNCATE ON authority_outreach_review_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION reject_authority_outreach_review_event_mutation();

COMMIT;
),
  CHECK (substring(workspace_item_id from 6) = substring(workspace_item_fingerprint from 1 for 24)),
  CHECK (event_id ~ '^uaoe-[0-9a-f]{24}
  CHECK (target_domain = lower(target_domain) AND length(target_domain) BETWEEN 1 AND 253),
  CHECK (source_domain = lower(source_domain) AND length(source_domain) BETWEEN 1 AND 253),
  CHECK (target_url IS NULL OR target_url ~ '^https://'),
  CHECK (
    qualification_status IN (
      'qualified_for_review',
      'needs_review',
      'insufficient_evidence',
      'disqualified'
    )
  ),
  CHECK (decision IN ('approved_for_draft','rejected','deferred')),
  CHECK (
    reason_code IN (
      'editorial_fit_confirmed',
      'needs_more_context',
      'relationship_conflict',
      'target_not_appropriate',
      'timing_not_right',
      'policy_or_reputation_risk'
    )
  ),
  CHECK (reviewer_id ~ '^[A-Za-z0-9_.:@-]{1,120}$')
);

CREATE INDEX idx_authority_outreach_review_events_site_target_history
  ON authority_outreach_review_events (
    site_id,
    target_domain,
    reviewed_at DESC,
    sequence DESC
  );

CREATE INDEX idx_authority_outreach_review_events_prospect_history
  ON authority_outreach_review_events (
    site_id,
    prospect_fingerprint,
    sequence
  );

CREATE INDEX idx_authority_outreach_review_events_qualification_history
  ON authority_outreach_review_events (
    site_id,
    qualification_fingerprint,
    prospect_fingerprint,
    sequence
  );

CREATE FUNCTION reject_authority_outreach_review_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'authority_outreach_review_events_are_immutable'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER authority_outreach_review_events_reject_update_delete
  BEFORE UPDATE OR DELETE ON authority_outreach_review_events
  FOR EACH ROW
  EXECUTE FUNCTION reject_authority_outreach_review_event_mutation();

CREATE TRIGGER authority_outreach_review_events_reject_truncate
  BEFORE TRUNCATE ON authority_outreach_review_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION reject_authority_outreach_review_event_mutation();

COMMIT;
),
  CHECK (substring(event_id from 6) = substring(event_fingerprint from 1 for 24)),
  CHECK (target_domain = lower(target_domain) AND length(target_domain) BETWEEN 1 AND 253),
  CHECK (source_domain = lower(source_domain) AND length(source_domain) BETWEEN 1 AND 253),
  CHECK (target_url IS NULL OR target_url ~ '^https://'),
  CHECK (
    qualification_status IN (
      'qualified_for_review',
      'needs_review',
      'insufficient_evidence',
      'disqualified'
    )
  ),
  CHECK (decision IN ('approved_for_draft','rejected','deferred')),
  CHECK (
    reason_code IN (
      'editorial_fit_confirmed',
      'needs_more_context',
      'relationship_conflict',
      'target_not_appropriate',
      'timing_not_right',
      'policy_or_reputation_risk'
    )
  ),
  CHECK (reviewer_id ~ '^[A-Za-z0-9_.:@-]{1,120}$')
);

CREATE INDEX idx_authority_outreach_review_events_site_target_history
  ON authority_outreach_review_events (
    site_id,
    target_domain,
    reviewed_at DESC,
    sequence DESC
  );

CREATE INDEX idx_authority_outreach_review_events_prospect_history
  ON authority_outreach_review_events (
    site_id,
    prospect_fingerprint,
    sequence
  );

CREATE INDEX idx_authority_outreach_review_events_qualification_history
  ON authority_outreach_review_events (
    site_id,
    qualification_fingerprint,
    prospect_fingerprint,
    sequence
  );

CREATE FUNCTION reject_authority_outreach_review_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'authority_outreach_review_events_are_immutable'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER authority_outreach_review_events_reject_update_delete
  BEFORE UPDATE OR DELETE ON authority_outreach_review_events
  FOR EACH ROW
  EXECUTE FUNCTION reject_authority_outreach_review_event_mutation();

CREATE TRIGGER authority_outreach_review_events_reject_truncate
  BEFORE TRUNCATE ON authority_outreach_review_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION reject_authority_outreach_review_event_mutation();

COMMIT;
