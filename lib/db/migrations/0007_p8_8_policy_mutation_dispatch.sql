BEGIN;

CREATE TABLE policy_mutation_dispatches (
  dispatch_id text PRIMARY KEY,
  dispatch_version text NOT NULL,
  execution_id text NOT NULL UNIQUE,
  execution_fingerprint char(64) NOT NULL UNIQUE,
  dispatch_fingerprint char(64) NOT NULL UNIQUE,
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
  claimed_control_revision bigint NOT NULL,
  claimed_control_fingerprint char(64) NOT NULL,
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
  revision bigint NOT NULL,
  forward_attempt_count smallint NOT NULL DEFAULT 0,
  rollback_attempt_count smallint NOT NULL DEFAULT 0,
  public_write_occurrence text NOT NULL DEFAULT 'none',
  provider_request_id text,
  provider_operation_fingerprint char(64),
  provider_response_fingerprint char(64),
  final_closure_reason text,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),

  CHECK (dispatch_version = 'p8-8-w07-policy-dispatch-v1'),
  CHECK (execution_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (dispatch_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (policy_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (evaluation_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (materialization_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (proposal_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (w03_authorization_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (reservation_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (claim_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (w06_preflight_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (claimed_control_revision >= 1),
  CHECK (claimed_control_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (provider = 'shopify'),
  CHECK (domain = 'diamondshelf.us'),
  CHECK (resource_kind = 'product'),
  CHECK (resource_gid ~ '^gid://shopify/Product/[1-9][0-9]*$'),
  CHECK (
    target_url ~ '^https://diamondshelf[.]us/products/[a-z0-9][a-z0-9-]*$'
  ),
  CHECK (action_type = 'update_meta_description'),
  CHECK (field = 'meta_description'),
  CHECK (required_provider_scope = 'write_products'),
  CHECK (before_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (after_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (before_fingerprint <> after_fingerprint),
  CHECK (revision >= 1),
  CHECK (forward_attempt_count IN (0, 1)),
  CHECK (rollback_attempt_count IN (0, 1)),
  CHECK (rollback_attempt_count <= forward_attempt_count),
  CHECK (
    public_write_occurrence IN ('none', 'possible', 'confirmed')
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
    (
      state IN ('reserved_prewrite', 'cancelled_before_dispatch')
      AND forward_attempt_count = 0
      AND rollback_attempt_count = 0
      AND public_write_occurrence = 'none'
    )
    OR
    (
      state = 'forward_rejected_no_write'
      AND forward_attempt_count = 1
      AND rollback_attempt_count = 0
      AND public_write_occurrence = 'none'
    )
    OR
    (
      state IN (
        'dispatch_started',
        'forward_verification_pending',
        'forward_verified_live',
        'rollback_required'
      )
      AND forward_attempt_count = 1
      AND rollback_attempt_count = 0
    )
    OR
    (
      state IN (
        'rollback_started',
        'rollback_verification_pending',
        'rollback_verified_closed'
      )
      AND forward_attempt_count = 1
      AND rollback_attempt_count = 1
    )
    OR
    (
      state = 'manual_intervention_required'
      AND forward_attempt_count = 1
      AND rollback_attempt_count IN (0, 1)
    )
  ),
  CHECK (
    provider_operation_fingerprint IS NULL
    OR provider_operation_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CHECK (
    provider_response_fingerprint IS NULL
    OR provider_response_fingerprint ~ '^[0-9a-f]{64}$'
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
  rollback_write_occurrence text NOT NULL,
  effective_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),

  CHECK (event_version = 'p8-8-w07-policy-dispatch-event-v1'),
  CHECK (event_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (
    provider_request_fingerprint IS NULL
    OR provider_request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CHECK (
    public_write_occurrence IN ('none', 'possible', 'confirmed')
  ),
  CHECK (
    rollback_write_occurrence IN ('none', 'possible', 'confirmed')
  ),
  CHECK (
    to_state IN (
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
    from_state IS NULL
    OR from_state IN (
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
    (
      from_revision IS NULL
      AND from_state IS NULL
      AND to_revision = 1
      AND to_state = 'reserved_prewrite'
    )
    OR
    (
      from_revision IS NOT NULL
      AND from_state IS NOT NULL
      AND from_revision >= 1
      AND to_revision = from_revision + 1
    )
  )
);

CREATE UNIQUE INDEX ux_policy_mutation_dispatches_active_site
  ON policy_mutation_dispatches (site_id)
  WHERE state IN (
    'reserved_prewrite',
    'dispatch_started',
    'forward_verification_pending',
    'rollback_required',
    'rollback_started',
    'rollback_verification_pending',
    'manual_intervention_required'
  );

CREATE UNIQUE INDEX ux_policy_mutation_dispatches_active_target
  ON policy_mutation_dispatches (
    site_id,
    provider,
    resource_kind,
    resource_gid,
    field
  )
  WHERE state IN (
    'reserved_prewrite',
    'dispatch_started',
    'forward_verification_pending',
    'rollback_required',
    'rollback_started',
    'rollback_verification_pending',
    'manual_intervention_required'
  );

CREATE INDEX idx_policy_mutation_dispatch_events_history
  ON policy_mutation_dispatch_events (
    dispatch_id,
    to_revision DESC,
    event_id DESC
  );

CREATE INDEX idx_policy_mutation_dispatches_site_history
  ON policy_mutation_dispatches (
    site_id,
    created_at DESC,
    dispatch_id DESC
  );

COMMIT;
