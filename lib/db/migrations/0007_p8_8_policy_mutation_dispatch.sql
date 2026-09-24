BEGIN;

CREATE TABLE policy_mutation_dispatches (
  dispatch_id text PRIMARY KEY,
  dispatch_version text NOT NULL,
  dispatch_fingerprint char(64) NOT NULL UNIQUE,
  execution_id text NOT NULL UNIQUE,
  execution_provenance text NOT NULL,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  policy_id text NOT NULL,
  policy_version text NOT NULL,
  policy_fingerprint char(64) NOT NULL,
  evaluation_id text NOT NULL,
  evaluation_fingerprint char(64) NOT NULL,
  materialization_id text NOT NULL,
  materialization_fingerprint char(64) NOT NULL,
  proposal_id text NOT NULL,
  proposal_fingerprint char(64) NOT NULL,
  w03_authorization_id text NOT NULL,
  w03_authorization_fingerprint char(64) NOT NULL,
  policy_action_id text NOT NULL UNIQUE,
  reservation_id text NOT NULL UNIQUE
    REFERENCES policy_mutation_reservations(reservation_id) ON DELETE RESTRICT,
  reservation_fingerprint char(64) NOT NULL,
  claim_id text NOT NULL UNIQUE
    REFERENCES policy_mutation_claims(claim_id) ON DELETE RESTRICT,
  claim_fingerprint char(64) NOT NULL,
  w06_preflight_id text NOT NULL,
  w06_preflight_fingerprint char(64) NOT NULL,
  credential_profile_id text NOT NULL,
  control_revision bigint NOT NULL,
  control_fingerprint char(64) NOT NULL,
  provider text NOT NULL,
  domain text NOT NULL,
  resource_kind text NOT NULL,
  resource_gid text NOT NULL,
  target_url text NOT NULL,
  action_type text NOT NULL,
  field text NOT NULL,
  required_provider_scope text NOT NULL,
  before_fingerprint char(64) NOT NULL,
  after_fingerprint char(64) NOT NULL,
  state text NOT NULL,
  row_revision bigint NOT NULL DEFAULT 1,
  forward_attempt_count integer NOT NULL DEFAULT 0,
  rollback_attempt_count integer NOT NULL DEFAULT 0,
  public_write_occurrence text NOT NULL DEFAULT 'none',
  rollback_occurrence text NOT NULL DEFAULT 'none',
  provider_request_id text,
  provider_request_fingerprint char(64),
  provider_response_fingerprint char(64),
  verification_fingerprint char(64),
  reserved_at timestamptz NOT NULL,
  dispatch_started_at timestamptz,
  rollback_started_at timestamptz,
  terminal_at timestamptz,
  terminal_reason text,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),

  CHECK (dispatch_version = 'p8-8-w07-policy-single-action-apply-v1'),
  CHECK (execution_provenance = 'policy_single_action_apply'),
  CHECK (dispatch_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (policy_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (evaluation_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (materialization_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (proposal_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (w03_authorization_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (reservation_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (claim_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (w06_preflight_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (control_revision >= 1),
  CHECK (control_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (provider = 'shopify'),
  CHECK (domain = 'diamondshelf.us'),
  CHECK (resource_kind = 'product'),
  CHECK (resource_gid ~ '^gid://shopify/Product/[1-9][0-9]*$'),
  CHECK (target_url ~ '^https://diamondshelf[.]us/products/[a-z0-9][a-z0-9-]*$'),
  CHECK (action_type = 'update_meta_description'),
  CHECK (field = 'meta_description'),
  CHECK (required_provider_scope = 'write_products'),
  CHECK (before_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (after_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (before_fingerprint <> after_fingerprint),
  CHECK (row_revision >= 1),
  CHECK (forward_attempt_count BETWEEN 0 AND 1),
  CHECK (rollback_attempt_count BETWEEN 0 AND 1),
  CHECK (public_write_occurrence IN ('none','possible','confirmed')),
  CHECK (rollback_occurrence IN ('none','possible','confirmed')),
  CHECK (
    provider_request_fingerprint IS NULL
    OR provider_request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CHECK (
    provider_response_fingerprint IS NULL
    OR provider_response_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CHECK (
    verification_fingerprint IS NULL
    OR verification_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CHECK (
    state IN (
      'reserved_prewrite',
      'dispatch_started',
      'forward_rejected_no_write',
      'forward_verification_pending',
      'forward_verified_live',
      'rollback_required',
      'rollback_started',
      'rollback_verification_pending',
      'rollback_verified_closed',
      'cancelled_before_dispatch',
      'manual_intervention_required'
    )
  ),
  CHECK (
    (state = 'reserved_prewrite' AND forward_attempt_count = 0)
    OR
    (state <> 'reserved_prewrite' AND state <> 'cancelled_before_dispatch'
      AND forward_attempt_count = 1)
    OR
    (state = 'cancelled_before_dispatch' AND forward_attempt_count = 0)
  ),
  CHECK (
    rollback_attempt_count = 0
    OR state IN (
      'rollback_started',
      'rollback_verification_pending',
      'rollback_verified_closed',
      'manual_intervention_required'
    )
  ),
  CHECK (
    (forward_attempt_count = 0 AND dispatch_started_at IS NULL)
    OR
    (forward_attempt_count = 1 AND dispatch_started_at IS NOT NULL)
  ),
  CHECK (
    (rollback_attempt_count = 0 AND rollback_started_at IS NULL)
    OR
    (rollback_attempt_count = 1 AND rollback_started_at IS NOT NULL)
  ),
  CHECK (
    (
      state IN (
        'forward_rejected_no_write',
        'forward_verified_live',
        'rollback_verified_closed',
        'cancelled_before_dispatch',
        'manual_intervention_required'
      )
      AND terminal_at IS NOT NULL
    )
    OR
    (
      state NOT IN (
        'forward_rejected_no_write',
        'forward_verified_live',
        'rollback_verified_closed',
        'cancelled_before_dispatch',
        'manual_intervention_required'
      )
      AND terminal_at IS NULL
    )
  )
);

CREATE TABLE policy_mutation_dispatch_events (
  event_id text PRIMARY KEY,
  event_version text NOT NULL,
  event_fingerprint char(64) NOT NULL UNIQUE,
  dispatch_id text NOT NULL
    REFERENCES policy_mutation_dispatches(dispatch_id) ON DELETE RESTRICT,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  from_revision bigint,
  from_state text,
  to_revision bigint NOT NULL,
  to_state text NOT NULL,
  transition_reason text NOT NULL,
  provider_request_fingerprint char(64),
  public_write_occurrence text NOT NULL,
  rollback_occurrence text NOT NULL,
  effective_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),

  CHECK (event_version = 'p8-8-w07-policy-dispatch-event-v1'),
  CHECK (event_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (from_revision IS NULL OR from_revision >= 1),
  CHECK (to_revision >= 1),
  CHECK (
    (from_revision IS NULL AND from_state IS NULL AND to_revision = 1)
    OR
    (from_revision IS NOT NULL AND from_state IS NOT NULL
      AND to_revision = from_revision + 1)
  ),
  CHECK (
    from_state IS NULL
    OR from_state IN (
      'reserved_prewrite','dispatch_started','forward_rejected_no_write',
      'forward_verification_pending','forward_verified_live','rollback_required',
      'rollback_started','rollback_verification_pending',
      'rollback_verified_closed','cancelled_before_dispatch',
      'manual_intervention_required'
    )
  ),
  CHECK (
    to_state IN (
      'reserved_prewrite','dispatch_started','forward_rejected_no_write',
      'forward_verification_pending','forward_verified_live','rollback_required',
      'rollback_started','rollback_verification_pending',
      'rollback_verified_closed','cancelled_before_dispatch',
      'manual_intervention_required'
    )
  ),
  CHECK (
    provider_request_fingerprint IS NULL
    OR provider_request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CHECK (public_write_occurrence IN ('none','possible','confirmed')),
  CHECK (rollback_occurrence IN ('none','possible','confirmed'))
);

CREATE UNIQUE INDEX ux_policy_mutation_dispatches_blocking_site
  ON policy_mutation_dispatches (site_id)
  WHERE state IN (
    'reserved_prewrite','dispatch_started','forward_verification_pending',
    'rollback_required','rollback_started','rollback_verification_pending',
    'manual_intervention_required'
  );

CREATE UNIQUE INDEX ux_policy_mutation_dispatches_blocking_target
  ON policy_mutation_dispatches (
    site_id,provider,resource_kind,resource_gid,field
  )
  WHERE state IN (
    'reserved_prewrite','dispatch_started','forward_verification_pending',
    'rollback_required','rollback_started','rollback_verification_pending',
    'manual_intervention_required'
  );

CREATE INDEX idx_policy_mutation_dispatches_site_history
  ON policy_mutation_dispatches (
    site_id,
    reserved_at DESC,
    dispatch_id DESC
  );

CREATE INDEX idx_policy_mutation_dispatch_events_history
  ON policy_mutation_dispatch_events (
    dispatch_id,
    to_revision DESC,
    event_id DESC
  );

COMMIT;
